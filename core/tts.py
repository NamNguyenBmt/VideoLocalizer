"""Text-to-speech dubbing + voice cloning.

Engines:
  - edge  : edge-tts (free, online) — default
  - piper : Piper (offline neural)  — needs a .onnx voice model
  - clone : F5-TTS (clone from a reference sample) — needs the f5-tts package

A dubbed track is built by synthesizing each cue separately and placing it on a
silent timeline at the cue's start time (kept in sync via ffmpeg adelay+amix).
"""
from __future__ import annotations

from pathlib import Path

from . import tools
from .subtitle import Cue

VIET_VOICES = [
    {"id": "vi-VN-HoaiMyNeural", "label": "Hoài My (Nữ)", "engine": "edge"},
    {"id": "vi-VN-NamMinhNeural", "label": "Nam Minh (Nam)", "engine": "edge"},
]

_VOICES_CACHE = None


def list_voices_full(log=print) -> list[dict]:
    """Full edge-tts catalogue (hundreds of voices, all languages)."""
    global _VOICES_CACHE
    if _VOICES_CACHE is None:
        import asyncio
        import edge_tts
        try:
            vs = asyncio.run(edge_tts.list_voices())
        except Exception as e:
            log(f"[TTS] list_voices lỗi: {e}")
            return VIET_VOICES
        _VOICES_CACHE = [{
            "id": v["ShortName"],
            "label": v.get("FriendlyName", v["ShortName"]).replace("Microsoft ", "")
                     .replace(" Online (Natural)", ""),
            "locale": v.get("Locale", ""),
            "gender": v.get("Gender", ""),
        } for v in vs]
        _VOICES_CACHE.sort(key=lambda x: (x["locale"], x["label"]))
    return _VOICES_CACHE


def synth_text(text: str, voice="vi-VN-HoaiMyNeural", rate="+0%",
               out_path: str | None = None, log=print) -> str:
    """Standalone text-to-speech (Voice Studio). Returns an mp3 path."""
    import asyncio
    import edge_tts
    import time as _t
    out = Path(out_path or (tools.OUTPUT_DIR / f"tts_{int(_t.time())}.mp3"))
    asyncio.run(edge_tts.Communicate(text, voice, rate=rate).save(str(out)))
    log(f"[TTS] Xuất giọng nói: {out.name}")
    return str(out)


def clone_test(ref_audio: str, ref_text: str, text: str, out_path: str | None = None,
               log=print) -> str | None:
    """Synthesize a short sample with a cloned voice (F5-TTS)."""
    import time as _t
    out = Path(out_path or (tools.OUTPUT_DIR / f"clone_{int(_t.time())}.wav"))
    _clone_one(text, ref_audio, ref_text, out, log)
    return str(out) if out.exists() else None


# ---- per-cue synthesis for each engine --------------------------------------
def _edge_one(text: str, voice: str, rate: str, out: Path, pitch: str = "+0Hz"):
    import asyncio
    import edge_tts
    asyncio.run(edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(out)))


_PIPER_CACHE = {}
_PIPER_DIR = tools.ROOT / "models" / "piper"

# Named offline Vietnamese Piper voices (model + optional speaker id).
PIPER_PRESETS = {
    "vi_female": {"model": "vi_VN-vais1000-medium.onnx", "speaker": None,
                  "label": "Piper Việt — Nữ (vais1000)"},
    "vi_male":   {"model": "vi_VN-vivos-x_low.onnx", "speaker": 56,
                  "label": "Piper Việt — Nam (vivos)"},
}


def default_piper_vn() -> str:
    """Path to the default offline Vietnamese Piper model (female), if present."""
    p = _PIPER_DIR / "vi_VN-vais1000-medium.onnx"
    return str(p) if p.is_file() else ""


def piper_presets() -> list[dict]:
    """Available Piper voices (only those whose model file is downloaded)."""
    out = []
    for k, v in PIPER_PRESETS.items():
        if (_PIPER_DIR / v["model"]).is_file():
            out.append({"id": k, "label": v["label"]})
    return out


def _resolve_piper(ref: str):
    """Return (model_path, speaker_id) from a preset id, a file path, or default."""
    if ref in PIPER_PRESETS:
        p = PIPER_PRESETS[ref]
        return str(_PIPER_DIR / p["model"]), p["speaker"]
    if ref and Path(ref).is_file():
        return ref, None
    return default_piper_vn(), None


def _piper_one(text: str, model_ref: str, out: Path, log=print):
    """Offline neural TTS via the piper-tts Python API (no network)."""
    import wave
    from piper import PiperVoice, SynthesisConfig
    model_onnx, speaker = _resolve_piper(model_ref)
    if not model_onnx or not Path(model_onnx).is_file():
        log("[PIPER] Thiếu model .onnx — tải model Piper vào models/piper/.")
        return
    if model_onnx not in _PIPER_CACHE:
        _PIPER_CACHE[model_onnx] = PiperVoice.load(model_onnx)
    voice = _PIPER_CACHE[model_onnx]
    syn = SynthesisConfig(speaker_id=speaker) if speaker is not None else None
    with wave.open(str(out), "wb") as wf:
        voice.synthesize_wav(text, wf, syn_config=syn)


def _clone_one(text: str, ref_audio: str, ref_text: str, out: Path, log=print):
    """F5-TTS zero-shot clone. Requires `pip install f5-tts`."""
    import subprocess, sys
    cmd = [sys.executable, "-m", "f5_tts.infer.infer_cli",
           "--ref_audio", ref_audio, "--ref_text", ref_text or "",
           "--gen_text", text, "--output_dir", str(out.parent),
           "--output_file", out.name]
    if tools.run(cmd, log) != 0:
        log("[CLONE] F5-TTS thất bại (đã `pip install f5-tts`?).")


def assign_voices_by_pitch(video: str, cues: list[Cue], voice_female: str,
                           voice_male: str, thresh_hz=165.0, log=print) -> dict:
    """Classify each cue's speaker as male/female by median pitch (F0) and map
    it to a voice. Used for '1 video 2 voices'. Needs librosa (comes with f5-tts)."""
    import numpy as np
    import librosa
    wav = tools.WORK_DIR / (Path(video).stem + "_pitch.wav")
    tools.run([tools.ffmpeg(), "-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000",
               str(wav)], lambda m: None)
    y, sr = librosa.load(str(wav), sr=16000, mono=True)
    vmap = {}
    for c in cues:
        s = int(c.start * sr)
        e = int(min(c.end, c.start + 3.0) * sr)
        seg = y[s:e]
        med = 200.0
        if len(seg) >= sr * 0.2:
            try:
                f0 = librosa.yin(seg, fmin=70, fmax=400, sr=sr)
                m = float(np.nanmedian(f0))
                if m == m:      # not NaN
                    med = m
            except Exception:
                pass
        vmap[c.index] = voice_male if med < thresh_hz else voice_female
    n_m = sum(1 for v in vmap.values() if v == voice_male)
    log(f"[2GIỌNG] Nam: {n_m} câu · Nữ: {len(vmap) - n_m} câu")
    return vmap


def _atempo_chain(factor: float) -> str:
    """ffmpeg atempo only accepts 0.5..2.0 per filter, so chain for larger factors."""
    parts = []
    while factor > 2.0:
        parts.append("atempo=2.0")
        factor /= 2.0
    parts.append(f"atempo={factor:.4f}")
    return ",".join(parts)


def fit_to_window(path: str, window: float, max_speed=1.6, log=print) -> tuple[str, float]:
    """Speed a clip up (pitch kept) so it fits in `window` seconds.

    Never speeds up more than `max_speed`; returns (path, speed_applied).
    """
    dur = tools.probe(path)["duration"]
    if window <= 0 or dur <= window + 0.02:
        return path, 1.0
    factor = min(dur / window, max_speed)
    out = str(Path(path).with_name(Path(path).stem + "_fit" + Path(path).suffix))
    cmd = [tools.ffmpeg(), "-y", "-v", "error", "-i", path,
           "-filter:a", _atempo_chain(factor), out]
    if tools.run(cmd, log) != 0 or not Path(out).exists():
        return path, 1.0
    return out, factor


def _synth_one(text: str, engine: str, voice: str, rate: str, model_onnx: str,
               ref_audio: str, ref_text: str, out: Path, log=print, pitch: str = "+0Hz"):
    if engine == "edge":
        _edge_one(text, voice, rate, out, pitch)
    elif engine == "piper":
        _piper_one(text, model_onnx, out, log)
    elif engine == "clone":
        _clone_one(text, ref_audio, ref_text, out, log)


def synth_dub(cues: list[Cue], engine="edge", voice="vi-VN-HoaiMyNeural",
              rate="+0%", model_onnx="", ref_audio="", ref_text="",
              voice_map=None, stem="dub", fit=True, fit_max_speed=1.6,
              log=print) -> str | None:
    """Dub every cue at its start time.

    With `fit`, a clip longer than the time until the next cue starts (or the
    cue's own end for the last one) is sped up so it doesn't overlap the next.
    Also writes output/<stem>.durations.json (per-cue audio length, speed).
    """
    if not cues:
        return None
    work = tools.WORK_DIR / (stem + "_parts")
    work.mkdir(parents=True, exist_ok=True)
    parts: list[tuple[float, str]] = []
    report = []
    ordered = sorted(cues, key=lambda c: c.start)
    for i, c in enumerate(ordered):
        text = (c.translated or c.text).strip()
        if not text:
            continue
        ext = "wav" if engine in ("piper", "clone") else "mp3"
        p = work / f"{c.index:04d}.{ext}"
        cue_voice = (voice_map or {}).get(c.index, voice)
        try:
            _synth_one(text, engine, cue_voice, rate, model_onnx, ref_audio, ref_text, p, log)
            if not (p.exists() and p.stat().st_size > 0):
                continue
            raw = tools.probe(str(p))["duration"]
            nxt = ordered[i + 1].start if i + 1 < len(ordered) else None
            window = (nxt if nxt is not None else max(c.end, c.start + raw)) - c.start
            clip, speed = str(p), 1.0
            if fit:
                clip, speed = fit_to_window(str(p), window, fit_max_speed, log)
            final = tools.probe(clip)["duration"] if speed != 1.0 else raw
            parts.append((c.start, clip))
            report.append({"index": c.index, "start": round(c.start, 3),
                           "end": round(c.end, 3), "window": round(window, 3),
                           "audio": round(raw, 3), "fitted": round(final, 3),
                           "speed": round(speed, 3), "overflow": round(max(0.0, final - window), 3),
                           "text": text})
            note = f" (x{speed:.2f})" if speed != 1.0 else ""
            if final > window + 0.05:
                note += f" ⚠ vẫn dài hơn khung {final - window:.2f}s"
            log(f"[TTS:{engine}] {c.index:>3} ✓{note}")
        except Exception as e:
            log(f"[TTS:{engine}] {c.index} lỗi: {e}")
    if not parts:
        return None

    import json
    (tools.OUTPUT_DIR / f"{stem}.durations.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    return mix_timeline(parts, str(tools.WORK_DIR / (stem + ".m4a")), log=log)


def mix_timeline(parts: list[tuple[float, str]], out: str, total: float | None = None,
                 log=print) -> str | None:
    """Place each (start_seconds, clip) on a silent timeline and mix to `out`.

    `total` pads/trims the result to an exact length (seconds)."""
    inputs, filt = [], []
    for i, (start, p) in enumerate(parts):
        inputs += ["-i", p]
        d = int(start * 1000)
        filt.append(f"[{i}:a]adelay={d}|{d}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(parts)))
    tail = f",apad=whole_dur={total:.3f},atrim=0:{total:.3f}" if total else ""
    filt.append(f"{mix}amix=inputs={len(parts)}:normalize=0{tail}[out]")
    cmd = [tools.ffmpeg(), "-y", *inputs, "-filter_complex", ";".join(filt),
           "-map", "[out]", str(out)]
    if tools.run(cmd, log) != 0:
        return None
    return str(out)


# ---- voice-clone training helpers ------------------------------------------
def prepare_reference(ref_audio: str, language=None, log=print) -> dict:
    """Auto-transcribe a reference sample so clone engines have ref_text."""
    from . import asr
    cues = asr.transcribe(ref_audio, model_size="small", language=language, log=log)
    text = " ".join(c.text for c in cues).strip()
    return {"ref_audio": ref_audio, "ref_text": text}
