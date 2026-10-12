"""Full localization pipeline orchestration.

Given a JobConfig, runs the enabled steps end to end:
  (download) -> transcribe|OCR -> (separate) -> translate -> dub -> render|capcut
Each step logs progress via the injected `log` callback.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from pathlib import Path

from . import tools, asr, ocr, translate as tr, tts, separate, subtitle, render, capcut, video
from .subtitle import Cue, to_srt, to_ass


@dataclass
class JobConfig:
    video: str = ""
    url: str = ""                       # if set, download first
    cookies: str = ""                   # browser for yt-dlp cookies (chrome/edge/...)
    # source
    source_lang: str = "auto"
    target_lang: str = "vi"
    sub_source: str = "whisper"         # whisper | ocr | srt
    srt_path: str = ""                  # dùng khi sub_source='srt'
    whisper_model: str = "small"
    # translate
    translate_provider: str = "gemini"  # none|google_free|gemini_web|gemini|groq|openai
    translate_key: str = ""
    translate_model: str = ""
    genre: str = ""
    glossary: str = ""                  # 'nguồn=đích' mỗi dòng
    # audio
    remove_bgm: bool = False            # demucs: keep vocals, drop music
    dub: bool = True
    dub_engine: str = "edge"            # edge|piper|clone
    tts_voice: str = "vi-VN-HoaiMyNeural"
    tts_voice2: str = "vi-VN-NamMinhNeural"   # giọng thứ 2 (nam) khi dual_voice
    dual_voice: bool = False            # 1 video 2 giọng (tách Nam/Nữ theo cao độ)
    tts_rate: str = "+0%"
    fit_dub: bool = True                # tăng tốc câu đọc dài để không đè câu sau
    fit_max_speed: float = 1.6
    piper_model: str = ""
    clone_ref_audio: str = ""
    clone_ref_text: str = ""
    keep_original_audio: bool = False
    # subtitle render
    burn_subs: bool = True
    karaoke: bool = False
    bilingual: bool = False             # phụ đề song ngữ (dịch trên, gốc dưới)
    sub_style: dict = field(default_factory=dict)
    erase_old_sub: bool = False
    erase_mode: str = "blur"            # blur | box | stretch
    denoise: bool = False               # khử ồn giọng
    bg_music: str = ""                  # đường dẫn nhạc nền
    bg_volume: float = 0.12
    # video
    mirror: bool = False
    speed: float = 1.0
    zoom: float = 1.0
    reframe: str = ""                   # "" | "9:16" | "1:1" | "16:9"
    watermark_text: str = ""
    logo_path: str = ""
    make_thumb: bool = True
    # output
    output: str = "render"             # render | capcut | both
    proj_name: str = ""


def run(cfg: JobConfig, log=print) -> dict:
    log("=== BẮT ĐẦU ===")

    # 0) download
    if cfg.url and not cfg.video:
        from . import download
        r = download.download(cfg.url, cookies_from_browser=cfg.cookies or None, log=log)
        if not r["ok"]:
            raise RuntimeError("Tải video thất bại")
        cfg.video = r["file"]

    if not cfg.video or not Path(cfg.video).is_file():
        raise RuntimeError("Không có file video hợp lệ")
    stem = Path(cfg.video).stem
    cfg.proj_name = cfg.proj_name or stem
    info = tools.probe(cfg.video)
    log(f"[VIDEO] {info['width']}x{info['height']} {info['duration']:.1f}s fps={info['fps']}")

    # 1) get source cues
    if cfg.sub_source == "srt" and cfg.srt_path and Path(cfg.srt_path).is_file():
        from .subtitle import parse_srt
        cues = parse_srt(Path(cfg.srt_path).read_text(encoding="utf-8"))
        log(f"[SRT] Dùng phụ đề có sẵn: {len(cues)} câu ({Path(cfg.srt_path).name})")
    elif cfg.sub_source == "ocr":
        cues = ocr.extract_hardsub(cfg.video, log=log)
        if not cues:
            log("[OCR] Không thấy sub cứng → fallback Whisper.")
            cues = asr.transcribe(cfg.video, cfg.whisper_model, cfg.source_lang, log=log)
    else:
        cues = asr.transcribe(cfg.video, cfg.whisper_model, cfg.source_lang, log=log)
    if not cues:
        raise RuntimeError("Không lấy được lời thoại")
    Path(tools.OUTPUT_DIR / f"{stem}.src.srt").write_text(to_srt(cues), encoding="utf-8")

    # 2) optional BGM removal (affects dub base only; render keeps video)
    voice_track = None
    if cfg.remove_bgm:
        voice_track = separate.separate(cfg.video, want="vocals", log=log)

    # 3) translate (+ glossary)
    tr.translate_cues(cues, cfg.target_lang, cfg.translate_provider,
                      cfg.translate_key, cfg.translate_model, cfg.genre, log=log)
    if cfg.glossary.strip():
        subtitle.apply_glossary(cues, cfg.glossary)
        log("[DỊCH] Đã áp glossary (thuật ngữ cố định).")
    trans_srt = tools.OUTPUT_DIR / f"{stem}.{cfg.target_lang}.srt"
    trans_srt.write_text(to_srt(cues, translated=True), encoding="utf-8")

    # 4) subtitle file to burn (ASS if styled/karaoke, else SRT)
    sub_file = None
    if cfg.burn_subs:
        if cfg.karaoke or cfg.sub_style or cfg.bilingual:
            ass = tools.OUTPUT_DIR / f"{stem}.{cfg.target_lang}.ass"
            ass.write_text(to_ass(cues, cfg.sub_style, translated=True,
                                  karaoke=cfg.karaoke, bilingual=cfg.bilingual),
                           encoding="utf-8")
            sub_file = str(ass)
        else:
            sub_file = str(trans_srt)

    # 5) dub
    dub_audio = None
    if cfg.dub:
        voice_map = None
        if cfg.dual_voice and cfg.dub_engine == "edge":
            try:
                voice_map = tts.assign_voices_by_pitch(cfg.video, cues, cfg.tts_voice,
                                                       cfg.tts_voice2, log=log)
            except Exception as e:
                log(f"[2GIỌNG] Bỏ qua (lỗi phân tích cao độ): {e}")
        # For piper, the voice selector carries the preset id (vi_male/vi_female).
        piper_ref = cfg.tts_voice if cfg.dub_engine == "piper" else cfg.piper_model
        dub_audio = tts.synth_dub(cues, engine=cfg.dub_engine, voice=cfg.tts_voice,
                                  rate=cfg.tts_rate, model_onnx=piper_ref,
                                  ref_audio=cfg.clone_ref_audio,
                                  ref_text=cfg.clone_ref_text, voice_map=voice_map,
                                  stem=stem, fit=cfg.fit_dub,
                                  fit_max_speed=cfg.fit_max_speed, log=log)

    result = {"ok": True, "src_srt": str(tools.OUTPUT_DIR / f"{stem}.src.srt"),
              "trans_srt": str(trans_srt), "dub": dub_audio,
              "segments": [asdict(c) for c in cues]}

    # 7) render and/or capcut
    if cfg.output in ("render", "both"):
        out = tools.OUTPUT_DIR / f"{stem}_localized.mp4"
        render.render(cfg.video, str(out), ass_or_srt=sub_file, dub_audio=dub_audio,
                      keep_original=cfg.keep_original_audio, mirror=cfg.mirror,
                      speed=cfg.speed, zoom=cfg.zoom, reframe_ratio=cfg.reframe,
                      erase_band=cfg.erase_old_sub, erase_mode=cfg.erase_mode,
                      watermark_text=cfg.watermark_text, logo_path=cfg.logo_path,
                      bg_music=cfg.bg_music, bg_volume=cfg.bg_volume,
                      denoise=cfg.denoise, log=log)
        result["output"] = str(out)
    if cfg.output in ("capcut", "both"):
        result["capcut"] = capcut.export(cfg.video, cues, cfg.proj_name,
                                         audio=dub_audio, include_translated=True, log=log)

    if cfg.make_thumb:
        result["thumb"] = video.make_thumbnail(cfg.video, at=min(1.0, info["duration"] / 2),
                                               log=log)

    log("=== XONG ===")
    return result
