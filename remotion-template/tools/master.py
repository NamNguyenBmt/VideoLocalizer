"""Master âm thanh cho video đã render: cân độ lớn chuẩn (loudnorm 2 lượt, EBU R128).

  python tools/master.py out/video.mp4                → out/video-master.mp4
  python tools/master.py out/video.mp4 --lufs -16     (mặc định -14 LUFS: YouTube/Facebook)

Hình giữ nguyên (copy), chỉ xử lý tiếng: lọc ù, nén nhẹ toàn bản, cân độ lớn, chặn đỉnh -1 dBTP.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
try:
    from core import tools  # dùng ffmpeg mà VideoLocalizer tự dò (CFlow...)
    FFMPEG = tools.ffmpeg()
except Exception:  # chạy độc lập
    FFMPEG = "ffmpeg"

PRE = "highpass=f=30,acompressor=threshold=0.25:ratio=1.8:attack=20:release=250:makeup=1"


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("video")
    ap.add_argument("--out", default="")
    ap.add_argument("--lufs", type=float, default=-14.0)
    a = ap.parse_args()
    src = Path(a.video)
    out = Path(a.out) if a.out else src.with_name(src.stem + "-master" + src.suffix)
    target = f"I={a.lufs}:TP=-1.0:LRA=11"

    print(f"[MASTER] Đo độ lớn {src.name}...")
    p = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(src), "-vn",
                        "-af", f"{PRE},loudnorm={target}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not m:
        sys.exit("[MASTER] Không đo được âm thanh (video có tiếng không?)\n" + p.stderr[-800:])
    s = json.loads(m.group(0))
    print(f"[MASTER] Hiện tại {s['input_i']} LUFS, đỉnh {s['input_tp']} dBTP → đích {a.lufs} LUFS")
    af = (f"{PRE},loudnorm={target}:measured_I={s['input_i']}:measured_TP={s['input_tp']}:"
          f"measured_LRA={s['input_lra']}:measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true")
    r = subprocess.run([str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-c:v", "copy",
                        "-af", af, "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", str(out)])
    if r.returncode != 0:
        sys.exit("[MASTER] Lỗi khi ghi file")
    print(f"[MASTER] Xong → {out}")


if __name__ == "__main__":
    main()
