"""Video download via yt-dlp (YouTube/TikTok/Instagram/X/Reddit/Facebook...)."""
from __future__ import annotations

from pathlib import Path

from . import tools


def _ytdlp_cmd() -> list:
    # Prefer the yt-dlp python module (works even without the standalone exe).
    if tools.module_available("yt_dlp"):
        import sys
        return [sys.executable, "-m", "yt_dlp"]
    return [tools.find_binary("yt-dlp", [tools.ROOT / "bin"])]


def download(url: str, out_dir: str | None = None, audio_only=False,
             cookies_from_browser: str | None = None, log=print) -> dict:
    dst = Path(out_dir or tools.DOWNLOAD_DIR)
    dst.mkdir(parents=True, exist_ok=True)
    tmpl = str(dst / "%(title).80s_%(id)s.%(ext)s")
    cmd = _ytdlp_cmd() + [
        "-o", tmpl, "--no-playlist", "--restrict-filenames",
        "--print", "after_move:filepath",
    ]
    if audio_only:
        cmd += ["-x", "--audio-format", "mp3"]
    else:
        cmd += ["-f", "bv*+ba/b", "--merge-output-format", "mp4"]
    if cookies_from_browser:
        cmd += ["--cookies-from-browser", cookies_from_browser]
    cmd.append(url)

    code, out, err = tools.run_capture(cmd, timeout=1800)
    for line in (out + err).splitlines():
        log(line.rstrip())
    files = [l.strip() for l in out.splitlines()
             if l.strip() and Path(l.strip()).exists()]
    return {"ok": code == 0 and bool(files), "files": files,
            "file": files[-1] if files else None}


def list_channel(url: str, limit=15, log=print) -> list[dict]:
    """List latest videos of a channel/playlist/user (no download)."""
    cmd = _ytdlp_cmd() + ["--flat-playlist", "-J", "--playlist-end", str(limit), url]
    code, out, err = tools.run_capture(cmd, timeout=120)
    if code != 0:
        for l in err.splitlines()[-4:]:
            log(l)
        return []
    import json as _j
    data = _j.loads(out or "{}")
    entries = data.get("entries", []) or []
    items = []
    for e in entries[:limit]:
        vid = e.get("id", "")
        items.append({
            "id": vid,
            "title": e.get("title") or vid,
            "url": e.get("url") or (f"https://youtu.be/{vid}" if vid else ""),
            "duration": e.get("duration") or 0,
        })
    return items


def list_downloads() -> list[dict]:
    exts = {".mp4", ".mkv", ".webm", ".mov", ".avi", ".mp3", ".m4a"}
    items = []
    for p in sorted(tools.DOWNLOAD_DIR.glob("*"), key=lambda x: -x.stat().st_mtime):
        if p.suffix.lower() in exts:
            items.append({"path": str(p), "name": p.name,
                          "size_mb": round(p.stat().st_size / 1048576, 1)})
    return items
