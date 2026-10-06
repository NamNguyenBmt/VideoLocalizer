"""Music/vocal separation via Demucs (keep vocals, drop background music)."""
from __future__ import annotations

import sys
from pathlib import Path

from . import tools


def separate(video_or_audio: str, want="vocals", model="htdemucs", log=print) -> str | None:
    """Return path to the requested stem ('vocals' or 'no_vocals').

    Extracts audio to wav, runs demucs (two-stem), returns the chosen stem wav.
    """
    src = Path(video_or_audio)
    wav = tools.WORK_DIR / (src.stem + "_audio.wav")
    if tools.run([tools.ffmpeg(), "-y", "-i", str(src), "-vn", "-ac", "2",
                  "-ar", "44100", str(wav)], log) != 0:
        return None

    out_root = tools.WORK_DIR / "demucs"
    out_root.mkdir(exist_ok=True)
    cmd = [sys.executable, "-m", "demucs", "--two-stems", "vocals",
           "-n", model, "-o", str(out_root), str(wav)]
    if tools.has_cuda():
        cmd += ["-d", "cuda"]
    if tools.run(cmd, log) != 0:
        log("[DEMUCS] Thất bại (đã cài `demucs` chưa?).")
        return None

    stem = "vocals.wav" if want == "vocals" else "no_vocals.wav"
    hit = list((out_root / model).rglob(stem))
    if not hit:
        return None
    log(f"[DEMUCS] {want} -> {hit[0]}")
    return str(hit[0])
