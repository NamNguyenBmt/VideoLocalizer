"""VideoLocalizer desktop launcher.

Opens the app in its own native window (like an Electron shell) instead of a
browser tab, and starts the Python backend hidden in the background. Works both
when run directly (python desktop.py) and when frozen into VideoLocalizer.exe.
The heavy backend keeps living in .venv — this launcher just hosts the window.
"""
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

PORT = 8899
URL = f"http://127.0.0.1:{PORT}"

# Directory that holds server.py + .venv. When frozen, look next to the exe,
# then one level up (so the exe works whether it sits in the project root or in
# a subfolder like dist/).
def _find_app_dir() -> Path:
    if getattr(sys, "frozen", False):
        here = Path(sys.executable).resolve().parent
    else:
        here = Path(__file__).resolve().parent
    for cand in (here, here.parent):
        if (cand / "server.py").is_file():
            return cand
    return here


APP_DIR = _find_app_dir()

_backend = None


def _venv_pythonw() -> str:
    for name in ("pythonw.exe", "python.exe"):
        p = APP_DIR / ".venv" / "Scripts" / name
        if p.exists():
            return str(p)
    return "pythonw"


def _port_up() -> bool:
    s = socket.socket()
    s.settimeout(0.4)
    try:
        s.connect(("127.0.0.1", PORT))
        return True
    except OSError:
        return False
    finally:
        s.close()


def start_backend():
    global _backend
    if _port_up():
        return
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    flags = 0x08000000 if os.name == "nt" else 0        # CREATE_NO_WINDOW
    _backend = subprocess.Popen(
        [_venv_pythonw(), str(APP_DIR / "server.py"), "--noopen"],
        cwd=str(APP_DIR), env=env, creationflags=flags,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def stop_backend():
    if _backend is not None:
        try:
            _backend.terminate()
        except Exception:
            pass


def main():
    start_backend()
    for _ in range(80):          # wait up to ~40s for the server
        if _port_up():
            break
        time.sleep(0.5)

    import webview
    icon = APP_DIR / "web" / "favicon.ico"
    webview.create_window(
        "VideoLocalizer", URL, width=1280, height=860,
        min_size=(1000, 700), background_color="#0b0f1a",
    )
    try:
        webview.start(icon=str(icon) if icon.exists() else None)
    except TypeError:
        webview.start()          # older pywebview without icon kwarg
    finally:
        stop_backend()


if __name__ == "__main__":
    main()
