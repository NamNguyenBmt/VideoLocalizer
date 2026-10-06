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
def _edge_one(text: str, voice: str, rate: str, out: Path):
    import asyncio
    import edge_tts
    asyncio.run(edge_tts.Communicate(text, voice, rate=rate).save(str(out)))


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


def synth_dub(cues: list[Cue], engine="edge", voice="vi-VN-HoaiMyNeural",
              rate="+0%", model_onnx="", ref_audio="", ref_text="",
              voice_map=None, stem="dub", log=print) -> str | None:
    if not cues:
        return None
    work = tools.WORK_DIR / (stem + "_parts")
    work.mkdir(parents=True, exist_ok=True)
    parts: list[tuple[float, str]] = []
    for c in cues:
        text = (c.translated or c.text).strip()
        if not text:
            continue
        ext = "wav" if engine in ("piper", "clone") else "mp3"
        p = work / f"{c.index:04d}.{ext}"
        cue_voice = (voice_map or {}).get(c.index, voice)
        try:
            if engine == "edge":
                _edge_one(text, cue_voice, rate, p)
            elif engine == "piper":
                _piper_one(text, model_onnx, p, log)
            elif engine == "clone":
                _clone_one(text, ref_audio, ref_text, p, log)
            if p.exists() and p.stat().st_size > 0:
                parts.append((c.start, str(p)))
                log(f"[TTS:{engine}] {c.index:>3} ✓")
        except Exception as e:
            log(f"[TTS:{engine}] {c.index} lỗi: {e}")
    if not parts:
        return None

    out = tools.WORK_DIR / (stem + ".m4a")
    inputs, filt = [], []
    for i, (start, p) in enumerate(parts):
        inputs += ["-i", p]
        d = int(start * 1000)
        filt.append(f"[{i}:a]adelay={d}|{d}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(parts)))
    filt.append(f"{mix}amix=inputs={len(parts)}:normalize=0[out]")
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
