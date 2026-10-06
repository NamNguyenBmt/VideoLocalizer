"""Subtitle data model + SRT/ASS generation (styling & word-pop karaoke)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class Cue:
    index: int
    start: float          # seconds
    end: float
    text: str
    translated: str = ""
    words: list = field(default_factory=list)   # optional [(w, t0, t1)] for karaoke


def ts(sec: float, comma=True) -> str:
    ms = max(0, int(round(sec * 1000)))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{',' if comma else '.'}{ms:03d}"


def parse_ts(s: str) -> float:
    s = s.strip().replace(",", ".")
    h, m, rest = s.split(":")
    return int(h) * 3600 + int(m) * 60 + float(rest)


def apply_glossary(cues: list[Cue], glossary_text: str) -> list[Cue]:
    """Enforce consistent term translations. Rules: one 'source=target' per line."""
    rules = []
    for line in (glossary_text or "").splitlines():
        if "=" in line:
            a, b = line.split("=", 1)
            if a.strip():
                rules.append((a.strip(), b.strip()))
    if not rules:
        return cues
    for c in cues:
        t = c.translated or c.text
        for a, b in rules:
            t = re.sub(re.escape(a), b, t, flags=re.IGNORECASE)
        c.translated = t
    return cues


def to_srt(cues: list[Cue], translated=False) -> str:
    out = []
    for c in cues:
        text = (c.translated or c.text) if translated else c.text
        out += [str(c.index), f"{ts(c.start)} --> {ts(c.end)}", text, ""]
    return "\n".join(out)


def parse_srt(data: str) -> list[Cue]:
    cues, blocks = [], re.split(r"\n\s*\n", data.strip())
    for i, b in enumerate(blocks, 1):
        lines = [l for l in b.splitlines() if l.strip()]
        if len(lines) < 2:
            continue
        tl = next((l for l in lines if "-->" in l), None)
        if not tl:
            continue
        a, bb = tl.split("-->")
        txt = " ".join(lines[lines.index(tl) + 1:])
        cues.append(Cue(i, parse_ts(a), parse_ts(bb), txt))
    return cues


# --------------------------------------------------------------------------- #
#  ASS generation for styled / karaoke subtitles (burned by ffmpeg)
# --------------------------------------------------------------------------- #
def _ass_color(hex_rgb: str) -> str:
    hex_rgb = hex_rgb.lstrip("#")
    r, g, b = hex_rgb[0:2], hex_rgb[2:4], hex_rgb[4:6]
    return f"&H00{b}{g}{r}".upper()   # ASS = &HAABBGGRR


def to_ass(cues: list[Cue], style: dict | None = None, translated=True,
           karaoke=False, bilingual=False) -> str:
    st = {"font": "Arial", "size": 18, "color": "FFFFFF", "outline_color": "000000",
          "outline": 2, "bold": 1, "align": 2, "margin_v": 40,
          "karaoke_col": "FFD400"}
    st.update(style or {})
    second = _ass_color(st["karaoke_col"])   # SecondaryColour = karaoke highlight
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, Bold, Italic, Alignment, MarginL, MarginR, MarginV, Outline
Style: Def,{st['font']},{st['size']},{_ass_color(st['color'])},{second},{_ass_color(st['outline_color'])},{st['bold']},0,{st['align']},20,20,{st['margin_v']},{st['outline']}

[Events]
Format: Layer, Start, End, Style, Text
"""
    small = max(10, int(st["size"] * 0.72))
    lines = []
    for c in cues:
        text = (c.translated or c.text) if translated else c.text
        if bilingual and c.text and (c.translated and c.translated != c.text):
            # translated on top, original (smaller, dimmer) below
            text = f"{c.translated}\\N{{\\fs{small}\\alpha&H40&}}{c.text}"
            lines.append(f"Dialogue: 0,{ts(c.start, False)},{ts(c.end, False)},Def,,{text}")
            continue
        if karaoke and c.words:
            # word-pop: highlight each word for its slice of the cue
            parts = []
            for (w, t0, t1) in c.words:
                cs = max(1, int(round((t1 - t0) * 100)))   # centiseconds
                parts.append(f"{{\\k{cs}}}{w} ")
            text = "".join(parts).strip()
        elif karaoke:
            # split evenly if no per-word times
            ws = text.split()
            per = max(1, int(round((c.end - c.start) * 100 / max(len(ws), 1))))
            text = "".join(f"{{\\k{per}}}{w} " for w in ws).strip()
        text = text.replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{ts(c.start, False)},{ts(c.end, False)},Def,,{text}")
    return head + "\n".join(lines) + "\n"
