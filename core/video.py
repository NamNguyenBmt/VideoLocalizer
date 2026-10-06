"""Video transforms: reframe (aspect), watermark, thumbnail, band cover."""
from __future__ import annotations

from pathlib import Path

from . import tools


def reframe_graph(inl: str, outl: str, target_ratio: str) -> str:
    """Labelled filter_complex segment: fit to a target aspect with blurred pad."""
    try:
        rw, rh = (int(x) for x in target_ratio.split(":"))
    except Exception:
        return f"[{inl}]null[{outl}]"
    tw, th = rw * 120, rh * 120
    return (f"[{inl}]split=2[rbg][rfg];"
            f"[rbg]scale={tw}:{th}:force_original_aspect_ratio=increase,"
            f"crop={tw}:{th},boxblur=30:2[rbgb];"
            f"[rfg]scale={tw}:{th}:force_original_aspect_ratio=decrease[rfgb];"
            f"[rbgb][rfgb]overlay=(W-w)/2:(H-h)/2[{outl}]")


def reframe_filter(target_ratio: str, src_w: int, src_h: int) -> str:
    """Build a -vf to convert to a target aspect (e.g. '9:16') with blurred
    padding (fill) so nothing is cropped hard."""
    try:
        rw, rh = (int(x) for x in target_ratio.split(":"))
    except Exception:
        return ""
    # scale to fit, then pad to exact target with a blurred background copy
    tw, th = rw, rh
    return (f"split=2[bg][fg];"
            f"[bg]scale={tw*120}:{th*120}:force_original_aspect_ratio=increase,"
            f"crop={tw*120}:{th*120},boxblur=30:2[bgb];"
            f"[fg]scale={tw*120}:{th*120}:force_original_aspect_ratio=decrease[fgb];"
            f"[bgb][fgb]overlay=(W-w)/2:(H-h)/2")


def watermark_filters(logo_path: str = "", text: str = "",
                      x="W-w-20", y="20", fontsize=28) -> list[str]:
    out = []
    if text:
        safe = text.replace(":", "\\:").replace("'", "’")
        out.append(f"drawtext=text='{safe}':x={x}:y={y}:fontsize={fontsize}:"
                   f"fontcolor=white@0.85:borderw=2:bordercolor=black@0.6")
    return out  # logo overlay handled as an extra input in render()


def make_thumbnail(video: str, at=1.0, out: str | None = None, log=print) -> str | None:
    dst = Path(out or (tools.OUTPUT_DIR / (Path(video).stem + "_thumb.jpg")))
    cmd = [tools.ffmpeg(), "-y", "-ss", str(at), "-i", video, "-frames:v", "1",
           "-update", "1", "-q:v", "3", str(dst)]
    if tools.run(cmd, log) != 0:
        return None
    return str(dst)
