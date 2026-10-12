"""Audio-first voiceover for Remotion (or any editor).

Takes a script — scenes in order, no timing — synthesizes each scene's line,
measures the real audio length and lays the scenes back to back. Produces a
folder that drops straight into a Remotion project's `public/`:

  voice.m4a      the full voiceover
  timeline.json  the script with start/end/duration (seconds) added per scene
  captions.srt   the same timing as subtitles

Script formats:
  .json  {"voice":..., "gap":0.35, "scenes":[{"text":"...", ...any extra fields}]}
         or a bare list of scenes. Extra fields (title, image, bg, layout...) are
         passed through untouched for the Remotion template to use.
  .srt   each cue is a scene (its timing is ignored and recomputed)
  .txt   each non-empty line is a scene
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from . import tools, tts
from .subtitle import Cue, to_srt, parse_srt

DEFAULTS = {"voice": "vi-VN-HoaiMyNeural", "rate": "+0%", "engine": "edge",
            "gap": 0.35, "lead_in": 0.3, "tail": 0.8,
            "fps": 30, "width": 1080, "height": 1920}


def load_script(path: str) -> dict:
    p = Path(path)
    raw = p.read_text(encoding="utf-8-sig")
    ext = p.suffix.lower()
    if ext == ".json":
        data = json.loads(raw)
        if isinstance(data, list):
            data = {"scenes": data}
    elif ext == ".srt":
        data = {"scenes": [{"text": c.text} for c in parse_srt(raw)]}
    else:
        data = {"scenes": [{"text": ln.strip()} for ln in raw.splitlines() if ln.strip()]}
    data.setdefault("title", p.stem)
    return data


def build(script: dict, out_dir: str, engine: str | None = None, voice: str | None = None,
          rate: str | None = None, piper_model="", ref_audio="", ref_text="",
          copy_to: str = "", log=print) -> dict:
    """Synthesize `script` into out_dir. Returns the timeline dict."""
    cfg = {**DEFAULTS, **{k: v for k, v in script.items() if k != "scenes"}}
    if engine:
        cfg["engine"] = engine
    if voice:
        cfg["voice"] = voice
    if rate:
        cfg["rate"] = rate
    scenes = [dict(s) for s in script.get("scenes", []) if (s.get("text") or "").strip()]
    if not scenes:
        raise RuntimeError("Kịch bản không có câu thoại nào")

    out = Path(out_dir)
    parts_dir = out / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)
    ext = "wav" if cfg["engine"] in ("piper", "clone") else "mp3"
    piper_ref = piper_model or (cfg["voice"] if cfg["engine"] == "piper" else "")

    t = float(cfg["lead_in"])
    parts: list[tuple[float, str]] = []
    for i, sc in enumerate(scenes, 1):
        clip = parts_dir / f"{i:04d}.{ext}"
        tts._synth_one(sc["text"].strip(), cfg["engine"], sc.get("voice") or cfg["voice"],
                       sc.get("rate") or cfg["rate"], piper_ref, ref_audio, ref_text,
                       clip, log)
        if not (clip.exists() and clip.stat().st_size > 0):
            raise RuntimeError(f"Tạo giọng thất bại ở cảnh {i}")
        dur = tools.probe(str(clip))["duration"]
        sc["start"], sc["end"], sc["duration"] = round(t, 3), round(t + dur, 3), round(dur, 3)
        parts.append((t, str(clip)))
        log(f"[KỊCH BẢN] Cảnh {i:>3}: {dur:5.2f}s  {sc['text'][:50]}")
        t += dur + float(sc.get("pause", cfg["gap"]))
    total = round(scenes[-1]["end"] + float(cfg["tail"]), 3)

    if not tts.mix_timeline(parts, str(out / "voice.m4a"), total=total, log=log):
        raise RuntimeError("Ghép giọng thất bại")

    timeline = {**{k: v for k, v in cfg.items() if k not in ("lead_in", "tail")},
                "audio": "voice.m4a", "duration": total, "scenes": scenes}
    (out / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                                       encoding="utf-8")
    cues = [Cue(i, s["start"], s["end"], s["text"]) for i, s in enumerate(scenes, 1)]
    (out / "captions.srt").write_text(to_srt(cues), encoding="utf-8")
    log(f"[KỊCH BẢN] Xong: {len(scenes)} cảnh, tổng {total:.1f}s → {out}")

    if copy_to:
        dst = Path(copy_to)
        dst.mkdir(parents=True, exist_ok=True)
        for name in ("voice.m4a", "timeline.json", "captions.srt"):
            shutil.copy2(out / name, dst / name)
        log(f"[KỊCH BẢN] Đã chép vào {dst}")
    return timeline


def build_from_file(path: str, out_dir: str = "", **kw) -> dict:
    script = load_script(path)
    out_dir = out_dir or str(tools.OUTPUT_DIR / (Path(path).stem + "_voice"))
    return build(script, out_dir, **kw)
