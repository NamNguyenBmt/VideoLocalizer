"""VideoLocalizer — local web server (full feature set).

Serves the single-page UI and a JSON API over 127.0.0.1. Long tasks run through
core.queue in a background thread; the UI polls /api/queue for progress.
"""
from __future__ import annotations

import json
import os
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent))
from core import tools, download, tts, capcut, render   # noqa: E402
from core.pipeline import JobConfig                     # noqa: E402
from core.queue import QUEUE                             # noqa: E402

HERE = Path(__file__).resolve().parent
WEB = HERE / "web"
PORT = 8899


import urllib.parse                                    # noqa: E402

_MEDIA_TYPES = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4",
                ".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png",
                ".srt": "text/plain", ".ass": "text/plain"}
_ALLOWED_ROOTS = [tools.OUTPUT_DIR.resolve(), tools.WORK_DIR.resolve(),
                  tools.DOWNLOAD_DIR.resolve()]


def _q(s: str) -> str:
    return urllib.parse.quote(s)


def _cfg_from(body: dict) -> JobConfig:
    c = JobConfig()
    for k, v in body.items():
        if hasattr(c, k):
            setattr(c, k, v)
    c.speed = float(body.get("speed", 1.0) or 1.0)
    c.zoom = float(body.get("zoom", 1.0) or 1.0)
    return c


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False)
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ---- GET ----
    def do_GET(self):
        p = self.path.split("?")[0]
        if p in ("/", "/index.html"):
            self._send(200, (WEB / "index.html").read_text(encoding="utf-8"), "text/html")
        elif p == "/api/voices":
            self._send(200, {"voices": tts.VIET_VOICES})
        elif p == "/api/piper_voices":
            self._send(200, {"voices": tts.piper_presets()})
        elif p == "/api/voices_full":
            try:
                self._send(200, {"voices": tts.list_voices_full()})
            except Exception as e:
                self._send(200, {"voices": tts.VIET_VOICES, "error": str(e)})
        elif p == "/api/media":
            self._serve_media()
        elif p == "/api/downloads":
            self._send(200, {"items": download.list_downloads()})
        elif p == "/api/queue":
            self._send(200, {"jobs": QUEUE.snapshot()})
        elif p == "/api/env":
            self._send(200, self._env_status())
        elif p == "/api/outputs":
            self._send(200, {"items": self._list_outputs()})
        elif p == "/api/glossary_get":
            gf = tools.WORK_DIR / "glossary.txt"
            self._send(200, {"text": gf.read_text(encoding="utf-8") if gf.exists() else ""})
        elif p == "/api/srt_get":
            self._srt_get()
        elif p == "/api/open_output":
            self._try_open(tools.OUTPUT_DIR)
            self._send(200, {"ok": True})
        elif p == "/api/open_downloads":
            self._try_open(tools.DOWNLOAD_DIR)
            self._send(200, {"ok": True})
        else:
            self._send(404, {"error": "not found"})

    # ---- POST ----
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n) or b"{}")
        p = self.path.split("?")[0]
        if p == "/api/download":
            url = (body.get("url") or "").strip()
            if not url:
                self._send(400, {"ok": False, "msg": "Thiếu URL."}); return
            r = download.download(url, audio_only=bool(body.get("audio_only")))
            self._send(200, r)
        elif p == "/api/process":
            cfg = _cfg_from(body)
            if not cfg.url and (not cfg.video or not Path(cfg.video).is_file()):
                self._send(400, {"ok": False, "msg": "Không tìm thấy video."}); return
            jid = QUEUE.add(cfg)
            self._send(200, {"ok": True, "job_id": jid})
        elif p == "/api/queue_clear":
            QUEUE.clear_done()
            self._send(200, {"ok": True})
        elif p == "/api/capcut_launch":
            self._launch_capcut()
            self._send(200, {"ok": True})
        elif p == "/api/tts_studio":
            text = (body.get("text") or "").strip()
            if not text:
                self._send(400, {"ok": False, "msg": "Nhập văn bản."}); return
            try:
                out = tts.synth_text(text, body.get("voice", "vi-VN-HoaiMyNeural"),
                                     body.get("rate", "+0%"))
                self._send(200, {"ok": True, "file": out,
                                 "media": "/api/media?path=" + _q(out)})
            except Exception as e:
                self._send(200, {"ok": False, "msg": str(e)})
        elif p == "/api/channel_list":
            items = download.list_channel((body.get("url") or "").strip(),
                                          int(body.get("limit", 15)))
            self._send(200, {"items": items})
        elif p == "/api/clone_prepare":
            ref = (body.get("ref_audio") or "").strip()
            if not Path(ref).is_file():
                self._send(400, {"ok": False, "msg": "Không thấy file giọng mẫu."}); return
            try:
                info = tts.prepare_reference(ref)
                self._send(200, {"ok": True, **info})
            except Exception as e:
                self._send(200, {"ok": False, "msg": str(e)})
        elif p == "/api/clone_test":
            try:
                out = tts.clone_test(body.get("ref_audio", ""), body.get("ref_text", ""),
                                     body.get("text", "Xin chào, đây là giọng nói được nhân bản."))
                if not out:
                    self._send(200, {"ok": False, "msg": "Clone thất bại (cần f5-tts + GPU khuyến nghị)."}); return
                self._send(200, {"ok": True, "file": out, "media": "/api/media?path=" + _q(out)})
            except Exception as e:
                self._send(200, {"ok": False, "msg": str(e)})
        elif p == "/api/preview":
            video = (body.get("video") or "").strip('"')
            if not Path(video).is_file():
                self._send(400, {"ok": False, "msg": "Không thấy video."}); return
            try:
                out = str(tools.WORK_DIR / "preview.mp4")
                render.render(video, out, ass_or_srt=None, dub_audio=None,
                              mirror=bool(body.get("mirror")),
                              speed=float(body.get("speed", 1.0) or 1.0),
                              zoom=float(body.get("zoom", 1.0) or 1.0),
                              reframe_ratio=body.get("reframe", ""),
                              watermark_text=body.get("watermark_text", ""),
                              logo_path=body.get("logo_path", ""),
                              erase_band=bool(body.get("erase_old_sub")),
                              erase_mode=body.get("erase_mode", "blur"),
                              duration=6, log=lambda m: None)
                self._send(200, {"ok": True, "media": "/api/media?path=" + _q(out)})
            except Exception as e:
                self._send(200, {"ok": False, "msg": str(e)})
        elif p == "/api/glossary_save":
            (tools.WORK_DIR / "glossary.txt").write_text(body.get("text", ""), encoding="utf-8")
            self._send(200, {"ok": True})
        elif p == "/api/srt_save":
            try:
                fp = Path(body.get("path", "")).resolve()
                if not str(fp).startswith(str(tools.OUTPUT_DIR.resolve())) or fp.suffix.lower() != ".srt":
                    self._send(400, {"ok": False, "msg": "Đường dẫn SRT không hợp lệ."}); return
                fp.write_text(body.get("text", ""), encoding="utf-8")
                self._send(200, {"ok": True})
            except Exception as e:
                self._send(200, {"ok": False, "msg": str(e)})
        elif p == "/api/output_delete":
            name = Path(body.get("name", "")).name
            fp = (tools.OUTPUT_DIR / name).resolve()
            if str(fp).startswith(str(tools.OUTPUT_DIR.resolve())) and fp.is_file():
                try: fp.unlink()
                except Exception: pass
            self._send(200, {"ok": True})
        else:
            self._send(404, {"error": "not found"})

    # ---- helpers ----
    def _srt_get(self):
        qs = urllib.parse.urlparse(self.path).query
        raw = urllib.parse.parse_qs(qs).get("path", [""])[0]
        try:
            fp = Path(raw).resolve()
        except Exception:
            self._send(400, {"ok": False}); return
        if not str(fp).startswith(str(tools.OUTPUT_DIR.resolve())) or not fp.is_file():
            self._send(404, {"ok": False, "text": ""}); return
        self._send(200, {"ok": True, "text": fp.read_text(encoding="utf-8", errors="replace"),
                         "path": str(fp)})

    def _list_outputs(self):
        exts = {".mp4", ".mp3", ".wav", ".m4a", ".jpg", ".srt", ".ass"}
        items = []
        for p in sorted(tools.OUTPUT_DIR.glob("*"), key=lambda x: -x.stat().st_mtime):
            if p.suffix.lower() in exts:
                items.append({"name": p.name,
                              "size_mb": round(p.stat().st_size / 1048576, 2),
                              "media": "/api/media?path=" + _q(str(p)),
                              "is_video": p.suffix.lower() == ".mp4"})
        return items[:100]
    def _env_status(self):
        return {
            "ffmpeg": tools.ffmpeg(),
            "cuda": tools.has_cuda(),
            "faster_whisper": tools.module_available("faster_whisper"),
            "edge_tts": tools.module_available("edge_tts"),
            "yt_dlp": tools.module_available("yt_dlp"),
            "rapidocr": tools.module_available("rapidocr_onnxruntime"),
            "demucs": tools.module_available("demucs"),
            "f5_tts": tools.module_available("f5_tts"),
            "playwright": tools.module_available("playwright"),
            "piper_vn": bool(tts.default_piper_vn()) and tools.module_available("piper"),
        }

    def _serve_media(self):
        qs = urllib.parse.urlparse(self.path).query
        raw = urllib.parse.parse_qs(qs).get("path", [""])[0]
        try:
            fp = Path(raw).resolve()
        except Exception:
            self._send(400, {"error": "bad path"}); return
        if not any(str(fp).startswith(str(r)) for r in _ALLOWED_ROOTS) or not fp.is_file():
            self._send(404, {"error": "not found"}); return
        ctype = _MEDIA_TYPES.get(fp.suffix.lower(), "application/octet-stream")
        data = fp.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        self.wfile.write(data)

    def _try_open(self, path):
        try:
            os.startfile(str(path))  # type: ignore[attr-defined]
        except Exception:
            pass

    def _launch_capcut(self):
        for env in ("LOCALAPPDATA", "PROGRAMFILES"):
            base = os.environ.get(env, "")
            for name in ("CapCut/CapCut.exe", "JianyingPro/JianyingPro.exe"):
                exe = Path(base) / name
                if exe.exists():
                    try:
                        os.startfile(str(exe))  # type: ignore[attr-defined]
                        return
                    except Exception:
                        pass


def main():
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://127.0.0.1:{PORT}/"
    print(f"VideoLocalizer running at {url}")
    if "--noopen" not in sys.argv:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    srv.serve_forever()


if __name__ == "__main__":
    main()
