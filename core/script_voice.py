"""Audio-first voiceover for Remotion (or any editor).

Takes a script — scenes in order, no timing — synthesizes each scene's line,
measures the real audio length and lays the scenes back to back. Produces a
folder that drops straight into a Remotion project's `public/`:

  voice.m4a      the full voiceover
  timeline.json  the script with start/end/duration (seconds) added per scene
  captions.srt   the same timing as subtitles

Script formats:
  .json  {"voice":..., "gap":0.35, "scenes":[{"text":"...", ...any extra fields}]}
         or a bare list of scenes. Extra fields (title, image, bg, layout...) are
         passed through untouched for the Remotion template to use.
  .srt   each cue is a scene (its timing is ignored and recomputed)
  .txt   each non-empty line is a scene

JSON extras:
  "speakers": {"vy": {"name": "...", "voice": "...", "rate": "+0%", "pitch": "+0Hz"}}
      a scene with "speaker": "vy" is read with that speaker's voice/rate/pitch
      (a scene's own voice/rate/pitch still win).
  scene "hold": seconds — a scene without text is a silent scene of that length
      (music / stage action); a scene with text lasts at least `hold` seconds.

Long scripts (hundreds of scenes) are assembled with the stdlib `wave` module
instead of one giant ffmpeg filter graph, and every synthesized line is cached
in out/parts/, so a run interrupted by a network error resumes where it stopped.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import time
import wave
from pathlib import Path

from . import tools, tts
from .subtitle import Cue, to_srt, parse_srt

DEFAULTS = {"voice": "vi-VN-HoaiMyNeural", "rate": "+0%", "pitch": "+0Hz", "engine": "edge",
            "gap": 0.35, "lead_in": 0.3, "tail": 0.8,
            "fps": 30, "width": 1080, "height": 1920}

SAMPLE_RATE = 24000


def load_script(path: str) -> dict:
    p = Path(path)
    raw = p.read_text(encoding="utf-8-sig")
    ext = p.suffix.lower()
    if ext == ".json":
        data = json.loads(raw)
        if isinstance(data, list):
            data = {"scenes": data}
    elif ext == ".srt":
        data = {"scenes": [{"text": c.text} for c in parse_srt(raw)]}
    else:
        data = {"scenes": [{"text": ln.strip()} for ln in raw.splitlines() if ln.strip()]}
    data.setdefault("title", p.stem)
    return data


def _resolve(sc: dict, cfg: dict, key: str) -> str:
    spk = (cfg.get("speakers") or {}).get(sc.get("speaker") or "", {})
    return sc.get(key) or spk.get(key) or cfg[key]


def _estimate(text: str, rate: str) -> float:
    """Rough spoken length for --dry-run: ~4 Vietnamese syllables per second."""
    m = re.match(r"([+-]\d+)%", rate or "")
    speed = 1 + (int(m.group(1)) / 100 if m else 0)
    words = len(text.split())
    pauses = len(re.findall(r"[,.;:!?…—–]", text))
    return round(0.25 + words / (4.0 * speed) + pauses * 0.18, 3)


def _to_wav(src: Path, dst: Path, log=print) -> float:
    """Decode a clip to 24 kHz mono 16-bit WAV; return its length in seconds."""
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        cmd = [tools.ffmpeg(), "-y", "-loglevel", "error", "-i", str(src),
               "-ac", "1", "-ar", str(SAMPLE_RATE), "-sample_fmt", "s16", str(dst)]
        if tools.run(cmd, log) != 0:
            raise RuntimeError(f"Không đọc được {src.name}")
    with wave.open(str(dst), "rb") as w:
        return w.getnframes() / w.getframerate()


def _synth_cached(sc: dict, cfg: dict, idx: int, parts_dir: Path, piper_ref: str,
                  ref_audio: str, ref_text: str, log=print) -> Path:
    text = sc["text"].strip()
    voice, rate, pitch = (_resolve(sc, cfg, k) for k in ("voice", "rate", "pitch"))
    ext = "wav" if cfg["engine"] in ("piper", "clone") else "mp3"
    key = hashlib.sha1(f"{cfg['engine']}|{voice}|{rate}|{pitch}|{text}".encode()).hexdigest()[:10]
    clip = parts_dir / f"{key}.{ext}"  # theo nội dung: sửa/chèn câu chỉ tạo lại câu đó
    if clip.exists() and clip.stat().st_size > 0:
        return clip
    for attempt in range(1, 4):
        try:
            tts._synth_one(text, cfg["engine"], voice, rate, piper_ref, ref_audio, ref_text,
                           clip, log, pitch=pitch)
        except Exception as e:  # mạng chập chờn → thử lại
            log(f"[KỊCH BẢN] Cảnh {idx}: lỗi lần {attempt}: {e}")
        if clip.exists() and clip.stat().st_size > 0:
            return clip
        time.sleep(2 * attempt)
    raise RuntimeError(f"Tạo giọng thất bại ở cảnh {idx}: {text[:60]}")


def _write_voice(placed: list[tuple[float, Path]], total: float, out_m4a: Path, log=print):
    """Lay WAV clips on a silent track of `total` seconds and encode to m4a."""
    wav_path = out_m4a.with_suffix(".wav")
    n_total = int(round(total * SAMPLE_RATE))
    with wave.open(str(wav_path), "wb") as dst:
        dst.setnchannels(1)
        dst.setsampwidth(2)
        dst.setframerate(SAMPLE_RATE)
        pos = 0
        for start, clip in placed:
            at = int(round(start * SAMPLE_RATE))
            if at > pos:
                dst.writeframes(b"\x00\x00" * (at - pos))
                pos = at
            with wave.open(str(clip), "rb") as src:
                frames = src.readframes(src.getnframes())
            dst.writeframes(frames)
            pos += len(frames) // 2
        if n_total > pos:
            dst.writeframes(b"\x00\x00" * (n_total - pos))
    cmd = [tools.ffmpeg(), "-y", "-loglevel", "error", "-i", str(wav_path),
           "-c:a", "aac", "-b:a", "160k", str(out_m4a)]
    if tools.run(cmd, log) != 0:
        raise RuntimeError("Ghép giọng thất bại")
    wav_path.unlink(missing_ok=True)


def build(script: dict, out_dir: str, engine: str | None = None, voice: str | None = None,
          rate: str | None = None, piper_model="", ref_audio="", ref_text="",
          copy_to: str = "", dry_run: bool = False, log=print) -> dict:
    """Synthesize `script` into out_dir. Returns the timeline dict.

    dry_run: skip TTS, estimate each line's length and write no audio — for
    previewing the visuals (Remotion studio) before generating the real voice."""
    cfg = {**DEFAULTS, **{k: v for k, v in script.items() if k != "scenes"}}
    if engine:
        cfg["engine"] = engine
    if voice:
        cfg["voice"] = voice
    if rate:
        cfg["rate"] = rate
    scenes = [dict(s) for s in script.get("scenes", [])
              if (s.get("text") or "").strip() or float(s.get("hold") or 0) > 0]
    if not scenes:
        raise RuntimeError("Kịch bản không có câu thoại nào")

    out = Path(out_dir)
    parts_dir = out / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)
    piper_ref = piper_model or (cfg["voice"] if cfg["engine"] == "piper" else "")

    t = float(cfg["lead_in"])
    placed: list[tuple[float, Path]] = []
    spoken = sum(1 for s in scenes if (s.get("text") or "").strip())
    n_spoken = 0
    for i, sc in enumerate(scenes, 1):
        text = (sc.get("text") or "").strip()
        speech = 0.0
        if text:
            n_spoken += 1
            if dry_run:
                speech = _estimate(text, _resolve(sc, cfg, "rate"))
            else:
                clip = _synth_cached(sc, cfg, i, parts_dir, piper_ref, ref_audio, ref_text, log)
                wav = clip.with_name(clip.stem + "_pcm.wav")
                speech = _to_wav(clip, wav, log)
                placed.append((t, wav))
        dur = max(speech, float(sc.get("hold") or 0))
        sc["start"], sc["end"] = round(t, 3), round(t + dur, 3)
        sc["duration"], sc["speech"] = round(dur, 3), round(speech, 3)
        who = f"{sc['speaker']}: " if sc.get("speaker") else ""
        log(f"[KỊCH BẢN] Cảnh {i:>3} ({n_spoken}/{spoken}): {dur:6.2f}s  "
            f"{who}{text[:50] or '(không lời)'}")
        t += dur + float(sc.get("pause", cfg["gap"]))
    total = round(scenes[-1]["end"] + float(cfg["tail"]), 3)

    if not dry_run:
        _write_voice(placed, total, out / "voice.m4a", log)

    timeline = {**{k: v for k, v in cfg.items() if k not in ("lead_in", "tail")},
                "audio": None if dry_run else "voice.m4a", "duration": total, "scenes": scenes}
    (out / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                                       encoding="utf-8")
    talk = [s for s in scenes if s["speech"] > 0]
    cues = [Cue(i, s["start"], round(s["start"] + s["speech"], 3), s["text"])
            for i, s in enumerate(talk, 1)]
    (out / "captions.srt").write_text(to_srt(cues), encoding="utf-8")
    log(f"[KỊCH BẢN] Xong: {len(scenes)} cảnh, tổng {total:.1f}s "
        f"({int(total // 60)} phút {total % 60:.0f} giây){' — chạy thử, chưa có giọng' if dry_run else ''} → {out}")

    if copy_to:
        dst = Path(copy_to)
        dst.mkdir(parents=True, exist_ok=True)
        names = ["timeline.json", "captions.srt"] + ([] if dry_run else ["voice.m4a"])
        for name in names:
            shutil.copy2(out / name, dst / name)
        log(f"[KỊCH BẢN] Đã chép vào {dst}")
    return timeline


def build_from_file(path: str, out_dir: str = "", **kw) -> dict:
    script = load_script(path)
    out_dir = out_dir or str(tools.OUTPUT_DIR / (Path(path).stem + "_voice"))
    return build(script, out_dir, **kw)
