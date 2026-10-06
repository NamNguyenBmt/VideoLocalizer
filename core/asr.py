"""Speech-to-text via faster-whisper, producing timed cues (with word times)."""
from __future__ import annotations

from . import tools
from .subtitle import Cue

_MODEL_CACHE = {}


def transcribe(video: str, model_size="small", language=None, word_timestamps=True,
               log=print) -> list[Cue]:
    from faster_whisper import WhisperModel  # lazy

    device = "cuda" if tools.has_cuda() else "cpu"
    compute = "float16" if device == "cuda" else "int8"
    key = (model_size, device, compute)
    if key not in _MODEL_CACHE:
        log(f"[ASR] Nạp model {model_size} ({device}/{compute}) ...")
        _MODEL_CACHE[key] = WhisperModel(model_size, device=device, compute_type=compute)
    model = _MODEL_CACHE[key]

    lang = None if language in ("auto", "", None) else language
    segments, info = model.transcribe(video, language=lang, vad_filter=True,
                                      word_timestamps=word_timestamps)
    log(f"[ASR] Ngôn ngữ: {info.language} (p={info.language_probability:.2f})")

    cues: list[Cue] = []
    for i, s in enumerate(segments, 1):
        txt = (s.text or "").strip()
        if not txt:
            continue
        words = []
        if word_timestamps and getattr(s, "words", None):
            words = [(w.word.strip(), w.start, w.end) for w in s.words if w.word.strip()]
        cues.append(Cue(i, s.start, s.end, txt, words=words))
        log(f"[ASR] {i:>3} {int(s.start//60):02d}:{int(s.start%60):02d} {txt[:60]}")
    return cues


def detect_language(video: str, model_size="tiny") -> str:
    from faster_whisper import WhisperModel
    m = WhisperModel(model_size, device="cpu", compute_type="int8")
    _segs, info = m.transcribe(video, vad_filter=True)
    return info.language
