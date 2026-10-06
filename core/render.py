"""Final ffmpeg render: build a labelled filter_complex graph, then encode.

Some effects (aspect reframe, subtitle-band blur/stretch) are themselves multi-node
graphs using split/overlay, which cannot be comma-chained with simple filters.
So the whole video pipeline is composed as a single filter_complex with explicit
[labels], each effect feeding the next. Audio (dub / keep-original / bgm / denoise /
tempo) is composed the same way.
"""
from __future__ import annotations

from pathlib import Path

from . import tools, ocr as ocr_mod, video as video_mod


def render(video: str, out_path: str, ass_or_srt: str | None = None,
           dub_audio: str | None = None, keep_original=False,
           mirror=False, speed=1.0, zoom=1.0, reframe_ratio: str = "",
           erase_band=False, band=(0.78, 0.98), erase_mode="blur", watermark_text="",
           logo_path="", bg_music="", bg_volume=0.12, denoise=False,
           duration=None, log=print) -> str:
    # ---- inputs (order fixes stream indices) ----
    cmd = [tools.ffmpeg(), "-y", "-i", video]
    i = 1
    dub_idx = logo_idx = bg_idx = None
    if dub_audio:
        dub_idx = i; i += 1; cmd += ["-i", dub_audio]
    if logo_path:
        logo_idx = i; i += 1; cmd += ["-i", logo_path]
    if bg_music:
        bg_idx = i; i += 1; cmd += ["-stream_loop", "-1", "-i", bg_music]

    fc = []                      # filter_complex segments
    _n = [0]

    def _lbl():
        _n[0] += 1
        return f"vv{_n[0]}"

    cur = "0:v"

    def _simple(filters):
        nonlocal cur
        if filters:
            o = _lbl()
            fc.append(f"[{cur}]{','.join(filters)}[{o}]")
            cur = o

    # 1) reframe (graph) → 2) mirror/zoom (simple) → 3) erase band (graph)
    #    → 4) speed/watermark/subtitles (simple) → 5) logo overlay (graph)
    if reframe_ratio:
        o = _lbl(); fc.append(video_mod.reframe_graph(cur, o, reframe_ratio)); cur = o

    pre = []
    if mirror:
        pre.append("hflip")
    if zoom and abs(zoom - 1.0) > 1e-3:
        pre.append(f"scale=iw*{zoom}:ih*{zoom},crop=iw/{zoom}:ih/{zoom}")
    _simple(pre)

    if erase_band:
        o = _lbl(); fc.append(ocr_mod.erase_graph(cur, o, band[0], band[1], erase_mode)); cur = o

    post = []
    if speed and abs(speed - 1.0) > 1e-3:
        post.append(f"setpts=PTS/{speed}")
    if watermark_text:
        safe = watermark_text.replace(":", "\\:").replace("'", "’")
        post.append(f"drawtext=text='{safe}':x=W-tw-20:y=20:fontsize=28:"
                    f"fontcolor=white@0.85:borderw=2:bordercolor=black@0.6")
    if ass_or_srt:
        esc = str(ass_or_srt).replace("\\", "/").replace(":", "\\:")
        if str(ass_or_srt).lower().endswith(".ass"):
            post.append(f"subtitles='{esc}'")
        else:
            post.append(f"subtitles='{esc}':force_style='FontSize=18,"
                        f"PrimaryColour=&Hffffff&,Outline=2'")
    _simple(post)

    if logo_idx is not None:
        o = _lbl()
        fc.append(f"[{logo_idx}:v]scale=iw*0.14:-1[lg];[{cur}][lg]overlay=W-w-20:20[{o}]")
        cur = o

    vmap = f"[{cur}]" if cur != "0:v" else "0:v"

    # ---- audio graph ----
    atempo = f"atempo={min(max(speed, 0.5), 2.0)}" if (speed and abs(speed - 1.0) > 1e-3) else None
    need_afc = bool(denoise or bg_idx is not None or (dub_audio and keep_original) or atempo)
    if not need_afc:
        amap = f"{dub_idx}:a" if dub_audio else "0:a?"
    else:
        voice = f"[{dub_idx}:a]" if dub_audio else "[0:a]"
        fc.append(voice + ("afftdn=nf=-25" if denoise else "anull") + "[voice]")
        cur_a = "[voice]"
        if dub_audio and keep_original:
            fc.append("[0:a]volume=0.2[og];[voice][og]amix=inputs=2:normalize=0[mix1]")
            cur_a = "[mix1]"
        if bg_idx is not None:
            fc.append(f"[{bg_idx}:a]volume={bg_volume}[bg];"
                      f"{cur_a}[bg]amix=inputs=2:duration=first:normalize=0[mix2]")
            cur_a = "[mix2]"
        if atempo:
            fc.append(f"{cur_a}{atempo}[aout]")
            cur_a = "[aout]"
        amap = cur_a

    if fc:
        cmd += ["-filter_complex", ";".join(fc)]
    cmd += ["-map", vmap, "-map", amap]
    if duration:
        cmd += ["-t", str(duration)]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
            "-shortest", str(out_path)]
    if tools.run(cmd, log) != 0:
        raise RuntimeError("ffmpeg render thất bại")
    return str(out_path)
