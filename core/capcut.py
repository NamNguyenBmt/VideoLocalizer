"""Export a CapCut draft folder (original, minimal generator).

Produces a `draft_content.json` + `draft_meta_info.json` in a new draft folder
containing: the source video track, an optional dubbed-audio track, and a text
track built from the translated cues. The schema here is a compact, structurally
valid subset of CapCut's draft format (microsecond timings). CapCut versions
differ, so treat this as a starting point and adjust fields if a build rejects it.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path

from . import tools
from .subtitle import Cue


def _uid() -> str:
    return str(uuid.uuid4()).upper()


def default_draft_root() -> Path:
    """Best-effort location of CapCut's drafts folder on Windows."""
    for env in ("LOCALAPPDATA", "APPDATA"):
        base = os.environ.get(env)
        if not base:
            continue
        for name in ("CapCut", "JianyingPro"):
            p = Path(base) / name / "User Data" / "Projects" / "com.lveditor.draft"
            if p.parent.parent.exists():
                return p
    return tools.OUTPUT_DIR / "capcut_drafts"


def export(video: str, cues: list[Cue], proj_name: str, audio: str | None = None,
           include_translated=True, draft_root: str | None = None, log=print) -> str:
    info = tools.probe(video)
    dur_us = int(info["duration"] * 1_000_000) or 1
    W, H = info["width"] or 1920, info["height"] or 1080

    root = Path(draft_root or default_draft_root())
    root.mkdir(parents=True, exist_ok=True)
    folder = root / proj_name
    folder.mkdir(parents=True, exist_ok=True)

    vid_id, aud_id = _uid(), _uid()
    materials = {
        "videos": [{"id": vid_id, "path": str(video), "type": "video",
                    "material_name": Path(video).name, "width": W, "height": H,
                    "duration": dur_us}],
        "audios": [], "texts": [], "stickers": [], "effects": [],
    }
    tracks = []

    # main video track
    tracks.append({
        "id": _uid(), "type": "video", "attribute": 0,
        "segments": [{
            "id": _uid(), "material_id": vid_id,
            "source_timerange": {"start": 0, "duration": dur_us},
            "target_timerange": {"start": 0, "duration": dur_us},
            "speed": 1.0, "volume": 1.0, "visible": True,
        }],
    })

    # dubbed audio track
    if audio:
        materials["audios"].append({"id": aud_id, "path": str(audio),
                                    "type": "extract_music",
                                    "material_name": Path(audio).name,
                                    "duration": dur_us})
        tracks.append({
            "id": _uid(), "type": "audio", "attribute": 0,
            "segments": [{
                "id": _uid(), "material_id": aud_id,
                "source_timerange": {"start": 0, "duration": dur_us},
                "target_timerange": {"start": 0, "duration": dur_us},
                "speed": 1.0, "volume": 1.0,
            }],
        })

    # text (subtitle) track
    text_segments = []
    for c in cues:
        content = (c.translated or c.text) if include_translated else c.text
        if not content.strip():
            continue
        tid = _uid()
        materials["texts"].append({
            "id": tid, "type": "text", "content": content,
            "font_size": 8.0, "text_color": "#FFFFFF",
            "border_color": "#000000", "has_shadow": True,
            "alignment": 1,
        })
        st = int(c.start * 1_000_000)
        du = max(1, int((c.end - c.start) * 1_000_000))
        text_segments.append({
            "id": _uid(), "material_id": tid,
            "source_timerange": {"start": 0, "duration": du},
            "target_timerange": {"start": st, "duration": du},
            "clip": {"transform": {"x": 0.0, "y": -0.72}, "scale": {"x": 1.0, "y": 1.0}},
        })
    if text_segments:
        tracks.append({"id": _uid(), "type": "text", "attribute": 0,
                       "segments": text_segments})

    now_us = int(time.time() * 1_000_000)
    draft_content = {
        "canvas_config": {"width": W, "height": H, "ratio": "original"},
        "duration": dur_us, "fps": info["fps"] or 30.0,
        "id": _uid(), "materials": materials, "tracks": tracks,
        "create_time": now_us, "update_time": now_us,
        "version": "13.0.0", "app_version": "13.0.0", "platform": "windows",
    }
    meta = {
        "draft_id": _uid(), "draft_name": proj_name,
        "draft_root_path": str(root), "tm_draft_create": now_us,
        "tm_draft_modified": now_us, "draft_fold_path": str(folder),
        "draft_timeline_materials_size": os.path.getsize(video),
    }
    (folder / "draft_content.json").write_text(
        json.dumps(draft_content, ensure_ascii=False, indent=2), encoding="utf-8")
    (folder / "draft_meta_info.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"[CAPCUT] Draft: {folder}")
    return str(folder)
