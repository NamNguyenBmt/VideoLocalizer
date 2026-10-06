"""Download the offline Vietnamese Piper TTS models into models/piper/.

Run after cloning:  python scripts/download_models.py
Models are open-source (rhasspy/piper-voices on Hugging Face).
"""
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DST = ROOT / "models" / "piper"
DST.mkdir(parents=True, exist_ok=True)

BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/"
FILES = [
    # female, medium quality (default)
    "vais1000/medium/vi_VN-vais1000-medium.onnx",
    "vais1000/medium/vi_VN-vais1000-medium.onnx.json",
    # multi-speaker (used for the male voice, speaker 56)
    "vivos/x_low/vi_VN-vivos-x_low.onnx",
    "vivos/x_low/vi_VN-vivos-x_low.onnx.json",
]


def main():
    for rel in FILES:
        name = rel.split("/")[-1]
        out = DST / name
        if out.exists() and out.stat().st_size > 1000:
            print("đã có:", name)
            continue
        url = BASE + rel + "?download=true"
        print("tải:", name, "...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=180) as r, open(out, "wb") as w:
            w.write(r.read())
        print("  xong:", round(out.stat().st_size / 1048576, 1), "MB")
    print("Hoàn tất. Model Piper tiếng Việt đã sẵn ở models/piper/")


if __name__ == "__main__":
    main()
