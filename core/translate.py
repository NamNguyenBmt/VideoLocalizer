"""Translation of subtitle cues via LLM REST APIs (Gemini / Groq / OpenAI).

Batches cues into a single numbered request to keep line alignment and minimize
API calls. Splits into chunks when the subtitle set is large.
"""
from __future__ import annotations

import json
import re
import urllib.request

from .subtitle import Cue

LANG_NAME = {"vi": "Vietnamese", "en": "English", "zh": "Chinese",
             "ja": "Japanese", "ko": "Korean", "es": "Spanish",
             "fr": "French", "th": "Thai", "id": "Indonesian"}

GENRE_HINT = {
    "review": "Tone: engaging film/product review.",
    "co_trang": "Tone: historical/period drama, slightly formal.",
    "hoi_thoai": "Tone: natural everyday conversation.",
    "truyen": "Tone: narrative storytelling.",
    "am_thuc": "Tone: warm cooking/food content.",
    "tin_tuc": "Tone: objective, precise news/documentary.",
    "hai_huoc": "Tone: witty, humorous, trend-aware.",
}


def translate_cues(cues: list[Cue], target="vi", provider="gemini", key="",
                   model="", genre="", chunk=80, log=print) -> list[Cue]:
    if provider == "none" or not cues:
        for c in cues:
            c.translated = c.text
        return cues
    tgt = LANG_NAME.get(target, target)
    hint = GENRE_HINT.get(genre, "")
    # Google free endpoint: translate per-cue (short lines), no key/login.
    if provider == "google_free":
        src = "auto" if not genre else "auto"
        for c in cues:
            try:
                c.translated = _google_free(c.text, target)
            except Exception as e:
                log(f"[DỊCH] google_free câu {c.index} lỗi: {e}")
                c.translated = c.text
        log(f"[DỊCH] google_free -> {tgt}: {len(cues)} câu xong.")
        return cues

    # Gemini web is slower per request -> use bigger chunks, one browser session.
    gw = None
    if provider == "gemini_web":
        from . import gemini_web
        gw = gemini_web.get_shared(headless=False, log=log)
        chunk = max(chunk, 120)
    try:
        for i in range(0, len(cues), chunk):
            part = cues[i:i + chunk]
            numbered = "\n".join(f"{c.index}|{c.text}" for c in part)
            prompt = (
                f"You are a professional subtitle translator. Translate each line into "
                f"{tgt}, natural and faithful to meaning. {hint} Keep the SAME number of "
                f"lines and the same leading 'number|'. Return ONLY 'number|translation' "
                f"lines. No notes, no markdown.\n\n{numbered}"
            )
            log(f"[DỊCH] {provider}->{tgt} câu {part[0].index}-{part[-1].index} ...")
            if gw is not None:
                reply = gw.ask(prompt)
            else:
                reply = call_llm(provider, key, model, prompt)
            mp = {}
            for line in reply.splitlines():
                m = re.match(r"\s*(\d+)\s*\|\s*(.*)$", line)
                if m:
                    mp[int(m.group(1))] = m.group(2).strip()
            for c in part:
                c.translated = mp.get(c.index, c.text)
    finally:
        if gw is not None:
            from . import gemini_web
            gemini_web.shutdown()
    return cues


def translate_text(text: str, target="vi", provider="gemini", key="", model="") -> str:
    tgt = LANG_NAME.get(target, target)
    prompt = f"Translate to {tgt}, return only the translation:\n\n{text}"
    return call_llm(provider, key, model, prompt).strip()


def _google_free(text: str, target: str, source: str = "auto", timeout=30) -> str:
    """Free Google Translate endpoint (no key). Best for short subtitle lines."""
    import urllib.parse
    if not text.strip():
        return text
    url = ("https://translate.googleapis.com/translate_a/single?client=gtx"
           f"&sl={source}&tl={target}&dt=t&q={urllib.parse.quote(text)}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read().decode("utf-8"))
    return "".join(seg[0] for seg in data[0] if seg and seg[0]).strip()


def call_llm(provider: str, key: str, model: str, prompt: str, timeout=180) -> str:
    provider = provider.lower()
    if provider == "gemini":
        model = model or "gemini-2.0-flash"
        url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
               f"{model}:generateContent?key={key}")
        data = _post(url, {"contents": [{"parts": [{"text": prompt}]}]}, timeout=timeout)
        return data["candidates"][0]["content"]["parts"][0]["text"]
    if provider in ("openai", "groq"):
        base = ("https://api.openai.com/v1" if provider == "openai"
                else "https://api.groq.com/openai/v1")
        model = model or ("gpt-4o-mini" if provider == "openai"
                          else "llama-3.3-70b-versatile")
        data = _post(f"{base}/chat/completions",
                     {"model": model, "temperature": 0.3,
                      "messages": [{"role": "user", "content": prompt}]},
                     headers={"Authorization": f"Bearer {key}"}, timeout=timeout)
        return data["choices"][0]["message"]["content"]
    raise ValueError(f"Provider chưa hỗ trợ: {provider}")


def _post(url, body, headers=None, timeout=180) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                method="POST")
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))
