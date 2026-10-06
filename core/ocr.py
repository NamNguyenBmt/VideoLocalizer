"""Hard-subtitle OCR (RapidOCR) + erasing/blurring the original subtitle band.

Reads burned-in subtitles by sampling frames, OCR-ing the lower band, and
merging consecutive identical texts into timed cues. Also provides an ffmpeg
filter to blur/cover that band so a translated subtitle can replace it.
"""
from __future__ import annotations

from pathlib import Path

from . import tools
from .subtitle import Cue

_OCR = None


def _engine():
    global _OCR
    if _OCR is None:
        from rapidocr_onnxruntime import RapidOCR  # lazy
        _OCR = RapidOCR()
    return _OCR


def extract_hardsub(video: str, sample_fps=2.0, band_top=0.72, band_bottom=1.0,
                    min_conf=0.5, log=print) -> list[Cue]:
    """Sample frames at `sample_fps`, OCR the bottom band, merge into cues."""
    import cv2  # opencv, lazy

    ocr = _engine()
    cap = cv2.VideoCapture(video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, int(round(fps / sample_fps)))
    h_idx = 0
    raw: list[tuple[float, str]] = []
    log(f"[OCR] fps={fps:.1f} frames={total} step={step}")
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if h_idx % step == 0:
            H = frame.shape[0]
            band = frame[int(H * band_top):int(H * band_bottom), :]
            res, _ = ocr(band)
            text = ""
            if res:
                parts = [t for (_box, t, c) in res if c >= min_conf]
                text = " ".join(parts).strip()
            raw.append((h_idx / fps, text))
        h_idx += 1
    cap.release()

    # merge consecutive identical (or empty) samples
    cues, cur_text, cur_start = [], "", None
    idx = 1
    for t, text in raw:
        if text != cur_text:
            if cur_text and cur_start is not None:
                cues.append(Cue(idx, cur_start, t, cur_text)); idx += 1
            cur_text, cur_start = text, t
    if cur_text and cur_start is not None:
        cues.append(Cue(idx, cur_start, raw[-1][0] + 1.0, cur_text))
    log(f"[OCR] {len(cues)} câu phụ đề cứng.")
    return cues


def erase_graph(inl: str, outl: str, band_top=0.78, band_bottom=0.98, mode="blur") -> str:
    """Labelled filter_complex segment that hides the original subtitle band.

    Note: crop uses iw/ih (its own input), but overlay's y offset must use H
    (main-input height) — overlay does not expose ih/iw.
    """
    ch = f"ih*{band_bottom - band_top}"          # crop height (fraction of input)
    cy = f"ih*{band_top}"                          # crop y  (crop knows ih)
    oy = f"H*{band_top}"                           # overlay y (overlay uses H)
    if mode == "box":
        return f"[{inl}]drawbox=x=0:y={cy}:w=iw:h={ch}:color=black@1.0:t=fill[{outl}]"
    if mode == "stretch":
        sy = f"ih*{max(0.0, band_top - (band_bottom - band_top))}"
        return (f"[{inl}]split=2[es0][es1];"
                f"[es1]crop=iw:{ch}:0:{sy},scale=iw:{ch}[espatch];"
                f"[es0][espatch]overlay=0:{oy}[{outl}]")
    return (f"[{inl}]split=2[eb0][eb1];"
            f"[eb1]crop=iw:{ch}:0:{cy},boxblur=20:2[ebb];"
            f"[eb0][ebb]overlay=0:{oy}[{outl}]")


def erase_band_filter(band_top=0.78, band_bottom=0.98, mode="blur") -> str:
    """Return an ffmpeg -vf snippet that hides the original subtitle band.

    mode: 'blur' (boxblur) | 'box' (solid black) | 'stretch' handled elsewhere.
    Coordinates are fractions of height, converted to ih expressions.
    """
    y = f"ih*{band_top}"
    h = f"ih*{band_bottom - band_top}"
    if mode == "box":
        return f"drawbox=x=0:y={y}:w=iw:h={h}:color=black@1.0:t=fill"
    if mode == "stretch":
        # "kéo mép": copy a clean strip just ABOVE the band and stretch it down
        # over the band, hiding the old subtitle without blur.
        sy = f"ih*{max(0.0, band_top - (band_bottom - band_top))}"
        return (f"split=2[s0][s1];"
                f"[s1]crop=iw:{h}:0:{sy},scale=iw:{h}[patch];"
                f"[s0][patch]overlay=0:{y}")
    # blur just the band via crop->boxblur->overlay
    return (f"split=2[b0][b1];[b1]crop=iw:{h}:0:{y},boxblur=20:2[bb];"
            f"[b0][bb]overlay=0:{y}")
