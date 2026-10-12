"""CLI: kịch bản (.json/.srt/.txt) -> voice.m4a + timeline.json + captions.srt.

  python scripts/script_to_voice.py kichban.json --copy-to ..\\remotion-template\\public
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core import script_voice  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("script")
    ap.add_argument("--out", default="", help="thư mục xuất (mặc định output/<tên>_voice)")
    ap.add_argument("--engine", choices=["edge", "piper", "clone"])
    ap.add_argument("--voice")
    ap.add_argument("--rate")
    ap.add_argument("--ref-audio", default="")
    ap.add_argument("--ref-text", default="")
    ap.add_argument("--copy-to", default="", help="chép kết quả vào public/ của Remotion")
    a = ap.parse_args()
    script_voice.build_from_file(a.script, a.out, engine=a.engine, voice=a.voice, rate=a.rate,
                                 ref_audio=a.ref_audio, ref_text=a.ref_text, copy_to=a.copy_to)


if __name__ == "__main__":
    main()
