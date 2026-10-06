"""VideoLocalizer — core pipeline.

Original implementation. Turns a source video into a localized one:
  transcribe (Whisper) -> SRT -> translate -> TTS dub (edge-tts) -> render (ffmpeg).

Heavy libraries (faster-whisper, edge-tts) are imported lazily inside the
functions that need them, so the app and its UI start instantly and only pull
in a dependency when the matching step actually runs.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from dataclasses import dataclass, field, asdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUTPUT_DIR = HERE / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


# --------------------------------------------------------------------------- #
#  Tooling discovery
# --------------------------------------------------------------------------- #
def _find_binary(name: str, extra_dirs: list[Path]) -> str:
    """Locate an executable: explicit dirs first, then PATH."""
    exe = name + (".exe" if os.name == "nt" else "")
    for d in extra_dirs:
        cand = d / exe
        if cand.is_file():
            return str(cand)
    found = shutil.which(name)
    return found or name


def ffmpeg_bin() -> str:
    # Reuse a locally available ffmpeg if there is one; otherwise rely on PATH.
    candidates = [
        HERE / "bin",
        Path(r"E:/AutoSub/CFLOW 1.2.5/CFLOW/resources/vendor/ffmpeg"),
        Path(r"E:/AutoSub/CFLOW 1.2.5/CFLOW/resources/vendor/ffmpeg/bin"),
    ]
    return _find_binary("ffmpeg", candidates)


def ffprobe_bin() -> str:
    candidates = [
        HERE / "bin",
        Path(r"E:/AutoSub/CFLOW 1.2.5/CFLOW/resources/vendor/ffmpeg"),
        Path(r"E:/AutoSub/CFLOW 1.2.5/CFLOW/resources/vendor/ffmpeg/bin"),
    ]
    return _find_binary("ffprobe", candidates)


def _run(cmd: list[str], log=print) -> int:
    log("$ " + " ".join(str(c) for c in cmd))
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         text=True, encoding="utf-8", errors="replace")
    for line in p.stdout:
        line = line.rstrip()
        if line:
            log(line)
    p.wait()
    return p.returncode


# --------------------------------------------------------------------------- #
#  Data model
# --------------------------------------------------------------------------- #
@dataclass
class Segment:
    index: int
    start: float          # seconds
    end: float
    text: str
    translated: str = ""


@dataclass
class Job:
    video: str
    source_lang: str = "auto"
    target_lang: str = "vi"
    whisper_model: str = "small"
    translate_provider: str = "none"   # none | gemini | openai | groq
    translate_key: str = ""
    translate_model: str = ""
    dub: bool = True
    tts_voice: str = "vi-VN-HoaiMyNeural"
    tts_rate: str = "+0%"
    burn_subs: bool = True
    keep_original_audio: bool = False   # mix dub over original at low volume
    mirror: bool = False
    speed: float = 1.0
    zoom: float = 1.0
    segments: list[Segment] = field(default_factory=list)


# --------------------------------------------------------------------------- #
#  1. Transcribe (faster-whisper)
# --------------------------------------------------------------------------- #
def transcribe(job: Job, log=print) -> list[Segment]:
    log(f"[ASR] Nạp Whisper model '{job.whisper_model}' ...")
    from faster_whisper import WhisperModel  # lazy

    device = "cuda" if _has_cuda() else "cpu"
    compute = "float16" if device == "cuda" else "int8"
    log(f"[ASR] device={device} compute={compute}")
    model = WhisperModel(job.whisper_model, device=device, compute_type=compute)

    lang = None if job.source_lang in ("auto", "", None) else job.source_lang
    segments, info = model.transcribe(job.video, language=lang, vad_filter=True)
    log(f"[ASR] Ngôn ngữ phát hiện: {info.language} (p={info.language_probability:.2f})")

    out: list[Segment] = []
    for i, s in enumerate(segments, 1):
        txt = s.text.strip()
        if not txt:
            continue
        out.append(Segment(i, s.start, s.end, txt))
        log(f"[ASR] {i:>3} {_ts(s.start)} → {txt[:60]}")
    job.segments = out
    return out


# --------------------------------------------------------------------------- #
#  2. SRT helpers
# --------------------------------------------------------------------------- #
def _ts(sec: float, comma=True) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    sep = "," if comma else "."
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def to_srt(segments: list[Segment], use_translated=False) -> str:
    lines = []
    for seg in segments:
        text = (seg.translated or seg.text) if use_translated else seg.text
        lines.append(str(seg.index))
        lines.append(f"{_ts(seg.start)} --> {_ts(seg.end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
#  3. Translate
# --------------------------------------------------------------------------- #
_LANG_NAME = {"vi": "Vietnamese", "en": "English", "zh": "Chinese",
              "ja": "Japanese", "ko": "Korean", "es": "Spanish", "fr": "French"}


def translate(job: Job, log=print) -> list[Segment]:
    if job.translate_provider == "none" or not job.segments:
        log("[DỊCH] Bỏ qua (provider=none).")
        for s in job.segments:
            s.translated = s.text
        return job.segments

    target = _LANG_NAME.get(job.target_lang, job.target_lang)
    # Batch the lines into one numbered prompt to keep call count low and
    # preserve 1:1 line alignment.
    numbered = "\n".join(f"{s.index}|{s.text}" for s in job.segments)
    prompt = (
        f"You are a professional subtitle translator. Translate each line into "
        f"{target}, natural and faithful. Keep the SAME number of lines and the "
        f"same leading 'number|' prefix. Return ONLY 'number|translation' lines, "
        f"no explanations, no markdown.\n\n{numbered}"
    )
    log(f"[DỊCH] {job.translate_provider} → {target}: {len(job.segments)} câu ...")
    reply = _call_llm(job.translate_provider, job.translate_key,
                      job.translate_model, prompt, log)
    mapping: dict[int, str] = {}
    for line in reply.splitlines():
        m = re.match(r"\s*(\d+)\s*\|\s*(.*)$", line)
        if m:
            mapping[int(m.group(1))] = m.group(2).strip()
    for s in job.segments:
        s.translated = mapping.get(s.index, s.text)
    log(f"[DỊCH] Xong ({len(mapping)}/{len(job.segments)} câu khớp).")
    return job.segments


def _call_llm(provider: str, key: str, model: str, prompt: str, log=print) -> str:
    provider = provider.lower()
    if provider == "gemini":
        model = model or "gemini-2.0-flash"
        url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
               f"{model}:generateContent?key={key}")
        body = {"contents": [{"parts": [{"text": prompt}]}]}
        data = _http_json(url, body)
        return data["candidates"][0]["content"]["parts"][0]["text"]
    if provider in ("openai", "groq"):
        base = ("https://api.openai.com/v1" if provider == "openai"
                else "https://api.groq.com/openai/v1")
        model = model or ("gpt-4o-mini" if provider == "openai"
                          else "llama-3.3-70b-versatile")
        url = f"{base}/chat/completions"
        body = {"model": model, "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3}
        headers = {"Authorization": f"Bearer {key}"}
        data = _http_json(url, body, headers)
        return data["choices"][0]["message"]["content"]
    raise ValueError(f"Provider chưa hỗ trợ: {provider}")


def _http_json(url: str, body: dict, headers: dict | None = None, timeout=120) -> dict:
    raw = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=raw, method="POST")
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


# --------------------------------------------------------------------------- #
#  4. TTS dub (edge-tts, free)
# --------------------------------------------------------------------------- #
def synth_dub(job: Job, log=print) -> str | None:
    """Generate one dubbed audio track aligned to the segment timings.

    Each translated line is synthesized separately, then placed on a silent
    timeline at its start time so the dub stays in sync with the video.
    """
    if not job.dub or not job.segments:
        return None
    import asyncio
    import edge_tts  # lazy

    work = OUTPUT_DIR / (Path(job.video).stem + "_dubparts")
    work.mkdir(exist_ok=True)
    parts: list[tuple[float, str]] = []

    async def _one(seg: Segment, path: Path):
        text = seg.translated or seg.text
        communicate = edge_tts.Communicate(text, job.tts_voice, rate=job.tts_rate)
        await communicate.save(str(path))

    async def _all():
        for seg in job.segments:
            p = work / f"{seg.index:04d}.mp3"
            try:
                await _one(seg, p)
                parts.append((seg.start, str(p)))
                log(f"[TTS] {seg.index:>3} {job.tts_voice} ✓")
            except Exception as e:
                log(f"[TTS] {seg.index} lỗi: {e}")

    asyncio.run(_all())
    if not parts:
        return None

    # Build a filter_complex that delays each part to its start time and mixes.
    out = OUTPUT_DIR / (Path(job.video).stem + "_dub.m4a")
    inputs: list[str] = []
    for _, p in parts:
        inputs += ["-i", p]
    filters = []
    for i, (start, _) in enumerate(parts):
        delay = int(start * 1000)
        filters.append(f"[{i}:a]adelay={delay}|{delay}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(parts)))
    filters.append(f"{mix}amix=inputs={len(parts)}:normalize=0[out]")
    cmd = [ffmpeg_bin(), "-y", *inputs, "-filter_complex", ";".join(filters),
           "-map", "[out]", str(out)]
    if _run(cmd, log) != 0:
        return None
    return str(out)


# --------------------------------------------------------------------------- #
#  5. Render (ffmpeg)
# --------------------------------------------------------------------------- #
def render(job: Job, dub_audio: str | None, srt_path: str | None, log=print) -> str:
    out = OUTPUT_DIR / (Path(job.video).stem + "_localized.mp4")
    vf: list[str] = []
    if job.mirror:
        vf.append("hflip")
    if job.zoom and abs(job.zoom - 1.0) > 1e-3:
        vf.append(f"scale=iw*{job.zoom}:ih*{job.zoom},crop=iw/{job.zoom}:ih/{job.zoom}")
    if job.speed and abs(job.speed - 1.0) > 1e-3:
        vf.append(f"setpts=PTS/{job.speed}")
    if job.burn_subs and srt_path:
        esc = str(srt_path).replace("\\", "/").replace(":", "\\:")
        vf.append(f"subtitles='{esc}':force_style='FontSize=18,PrimaryColour=&Hffffff&'")

    cmd = [ffmpeg_bin(), "-y", "-i", job.video]
    if dub_audio:
        cmd += ["-i", dub_audio]

    if vf:
        cmd += ["-vf", ",".join(vf)]

    # Audio routing
    if dub_audio and job.keep_original_audio:
        # mix original (quiet) + dub
        a = "[0:a]volume=0.15[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2[outa]"
        cmd += ["-filter_complex", a, "-map", "0:v", "-map", "[outa]"]
    elif dub_audio:
        cmd += ["-map", "0:v", "-map", "1:a"]
    else:
        cmd += ["-map", "0:v", "-map", "0:a?"]

    if job.speed and abs(job.speed - 1.0) > 1e-3:
        cmd += ["-af", f"atempo={min(max(job.speed,0.5),2.0)}"]

    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-c:a", "aac", "-b:a", "192k", "-shortest", str(out)]
    if _run(cmd, log) != 0:
        raise RuntimeError("ffmpeg render thất bại")
    return str(out)


# --------------------------------------------------------------------------- #
#  Orchestration
# --------------------------------------------------------------------------- #
def run_pipeline(job: Job, log=print) -> dict:
    log("=== BẮT ĐẦU ===")
    transcribe(job, log)
    src_srt = OUTPUT_DIR / (Path(job.video).stem + ".src.srt")
    src_srt.write_text(to_srt(job.segments), encoding="utf-8")

    translate(job, log)
    trans_srt = OUTPUT_DIR / (Path(job.video).stem + f".{job.target_lang}.srt")
    trans_srt.write_text(to_srt(job.segments, use_translated=True), encoding="utf-8")

    dub = synth_dub(job, log) if job.dub else None
    result = render(job, dub, str(trans_srt) if job.burn_subs else None, log)
    log(f"=== XONG: {result} ===")
    return {
        "ok": True,
        "output": result,
        "src_srt": str(src_srt),
        "trans_srt": str(trans_srt),
        "dub": dub,
        "segments": [asdict(s) for s in job.segments],
    }


# --------------------------------------------------------------------------- #
def _has_cuda() -> bool:
    try:
        import torch  # noqa
        return torch.cuda.is_available()
    except Exception:
        return False


if __name__ == "__main__":
    # Minimal CLI: python pipeline.py <video> [target_lang]
    if len(sys.argv) < 2:
        print("Usage: python pipeline.py <video> [target_lang]")
        raise SystemExit(1)
    j = Job(video=sys.argv[1], target_lang=sys.argv[2] if len(sys.argv) > 2 else "vi")
    print(json.dumps(run_pipeline(j), ensure_ascii=False, indent=2))
