"""Video download via yt-dlp (YouTube/TikTok/Instagram/X/Reddit/Facebook...)."""
from __future__ import annotations

import os
from pathlib import Path

from . import tools


def _is_cookie_file(val: str) -> bool:
    return bool(val) and (val.lower().endswith(".txt") or os.path.isfile(val))


def _cookie_cli(val: str | None) -> list:
    """yt-dlp CLI cookie args — a cookies.txt path OR a browser name."""
    if not val:
        return []
    return ["--cookies", val] if _is_cookie_file(val) else ["--cookies-from-browser", val]


def _cookie_opts(val: str | None) -> dict:
    """yt-dlp Python-API cookie options — cookies.txt path OR browser name."""
    if not val:
        return {}
    return {"cookiefile": val} if _is_cookie_file(val) else {"cookiesfrombrowser": (val,)}


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
    cmd += _cookie_cli(cookies_from_browser)
    cmd.append(url)

    code, out, err = tools.run_capture(cmd, timeout=1800)
    for line in (out + err).splitlines():
        log(line.rstrip())
    files = [l.strip() for l in out.splitlines()
             if l.strip() and Path(l.strip()).exists()]
    return {"ok": code == 0 and bool(files), "files": files,
            "file": files[-1] if files else None}


def _fmt_views(n) -> str:
    n = int(n or 0)
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K"
    return str(n)


def suggest_hot(query: str, limit=20, sort="views", cookies_from_browser: str | None = None,
                log=print) -> list[dict]:
    """Rank candidate videos by popularity for content sourcing.

    `query` can be a URL (channel / hashtag / playlist page) or plain keywords
    (→ YouTube search). Returns items sorted by view count (hottest first) when
    the platform exposes view counts, else in the platform's own order.
    """
    import yt_dlp

    q = (query or "").strip()
    if not q:
        return []
    target = q if q.startswith("http") else f"ytsearch{max(limit, 20)}:{q}"

    opts = {
        "quiet": True, "no_warnings": True, "skip_download": True,
        "extract_flat": True, "ignoreerrors": True,
        "playlistend": max(limit * 2, 40),
    }
    opts.update(_cookie_opts(cookies_from_browser))

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(target, download=False)
    except Exception as e:
        log(f"[HOT] Lỗi lấy danh sách: {e}")
        return []

    entries = (info or {}).get("entries") or []
    items = []
    for e in entries:
        if not e:
            continue
        vid = e.get("id", "")
        views = e.get("view_count") or 0
        items.append({
            "title": e.get("title") or vid,
            "url": e.get("url") or e.get("webpage_url") or (f"https://youtu.be/{vid}" if vid else ""),
            "views": views, "views_h": _fmt_views(views),
            "duration": int(e.get("duration") or 0),
            "uploader": e.get("uploader") or e.get("channel") or "",
            "thumb": e.get("thumbnail") or "",
        })
    if sort == "views" and any(it["views"] for it in items):
        items.sort(key=lambda x: -(x["views"] or 0))
    log(f"[HOT] {len(items)} video (sắp theo {sort}).")
    return items[:limit]


def list_channel(url: str, limit=15, cookies_from_browser: str | None = None,
                 log=print) -> list[dict]:
    """List latest videos of a channel/playlist/user (no download)."""
    cmd = _ytdlp_cmd() + ["--flat-playlist", "-J", "--playlist-end", str(limit)]
    cmd += _cookie_cli(cookies_from_browser)
    cmd.append(url)
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
