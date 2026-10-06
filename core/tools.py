"""Shared helpers: binary discovery, subprocess runner, media probing."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output"
DOWNLOAD_DIR = ROOT / "downloads"
WORK_DIR = ROOT / "work"
for _d in (OUTPUT_DIR, DOWNLOAD_DIR, WORK_DIR):
    _d.mkdir(exist_ok=True)

# Optional places to look for bundled ffmpeg (reuse whatever is on the machine).
_FFMPEG_HINTS = [
    ROOT / "bin",
    Path(r"E:/AutoSub/CFLOW 1.2.5/CFLOW/resources/vendor/ffmpeg/bin"),
    Path(r"E:/AutoSub/CFLOW 1.2.5/CFLOW/resources/vendor/ffmpeg"),
]


def find_binary(name: str, hints: list[Path] | None = None) -> str:
    exe = name + (".exe" if os.name == "nt" else "")
    for d in (hints or []):
        c = d / exe
        if c.is_file():
            return str(c)
    return shutil.which(name) or name


def ffmpeg() -> str:
    return find_binary("ffmpeg", _FFMPEG_HINTS)


def ffprobe() -> str:
    return find_binary("ffprobe", _FFMPEG_HINTS)


def run(cmd: list, log=print, cwd=None) -> int:
    log("$ " + " ".join(str(c) for c in cmd))
    p = subprocess.Popen([str(c) for c in cmd], stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True,
                         encoding="utf-8", errors="replace", cwd=cwd)
    for line in p.stdout:
        line = line.rstrip()
        if line:
            log(line)
    p.wait()
    return p.returncode


def run_capture(cmd: list, timeout=None) -> tuple[int, str, str]:
    p = subprocess.run([str(c) for c in cmd], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout)
    return p.returncode, p.stdout, p.stderr


def probe(path: str) -> dict:
    """Return {width,height,duration,fps,has_audio} for a media file."""
    code, out, _ = run_capture([ffprobe(), "-v", "quiet", "-print_format", "json",
                                "-show_format", "-show_streams", path])
    info = {"width": 0, "height": 0, "duration": 0.0, "fps": 0.0, "has_audio": False}
    if code != 0:
        return info
    data = json.loads(out or "{}")
    for s in data.get("streams", []):
        if s.get("codec_type") == "video" and not info["width"]:
            info["width"] = int(s.get("width") or 0)
            info["height"] = int(s.get("height") or 0)
            fr = s.get("r_frame_rate", "0/1")
            try:
                n, d = fr.split("/")
                info["fps"] = round(int(n) / max(int(d), 1), 3)
            except Exception:
                pass
        if s.get("codec_type") == "audio":
            info["has_audio"] = True
    try:
        info["duration"] = float(data.get("format", {}).get("duration") or 0)
    except Exception:
        pass
    return info


def has_cuda() -> bool:
    try:
        import torch
        return bool(torch.cuda.is_available())
    except Exception:
        return False


def module_available(mod: str) -> bool:
    import importlib.util
    return importlib.util.find_spec(mod) is not None
