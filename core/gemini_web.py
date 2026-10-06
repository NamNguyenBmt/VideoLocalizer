"""Free translation by driving the Gemini web UI with Playwright.

No API key / no cost: it automates a real browser signed into the user's Google
account. Login persists in a local profile folder, so you sign in once. Selectors
are kept flexible with several fallbacks because the Gemini UI changes over time.

Usage:
    gw = GeminiWeb(headless=False, log=print)
    gw.start()          # opens browser; first run: sign in when prompted
    text = gw.ask("Translate ...")
    gw.close()
"""
from __future__ import annotations

import time
from pathlib import Path

from . import tools

PROFILE_DIR = tools.ROOT / "work" / "gemini_profile"
GEMINI_URL = "https://gemini.google.com/app"

# Candidate selectors (first that matches wins) — resilient to UI drift.
INPUT_SELECTORS = [
    "div.ql-editor[contenteditable='true']",
    "rich-textarea div[contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
    "textarea",
]
RESPONSE_SELECTORS = [
    "message-content .markdown",
    ".model-response-text .markdown",
    "message-content",
    ".response-container .markdown",
]


class GeminiWeb:
    def __init__(self, headless=False, profile_dir: str | None = None, log=print):
        self.headless = headless
        self.profile_dir = Path(profile_dir or PROFILE_DIR)
        self.log = log
        self._pw = None
        self._ctx = None
        self._page = None

    # -- lifecycle ---------------------------------------------------------
    def start(self, login_timeout=240):
        from playwright.sync_api import sync_playwright  # lazy
        self.profile_dir.mkdir(parents=True, exist_ok=True)
        self._pw = sync_playwright().start()
        self._ctx = self._pw.chromium.launch_persistent_context(
            user_data_dir=str(self.profile_dir),
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1200, "height": 860},
        )
        self._page = self._ctx.pages[0] if self._ctx.pages else self._ctx.new_page()
        self._page.set_default_timeout(30000)
        self.log("[GEMINI] Mở trình duyệt ...")
        self._page.goto(GEMINI_URL, wait_until="domcontentloaded")
        self._wait_ready(login_timeout)

    def _find_input(self):
        for sel in INPUT_SELECTORS:
            el = self._page.query_selector(sel)
            if el and el.is_visible():
                return el
        return None

    def _wait_ready(self, timeout):
        """Wait until the message input is present (user may need to log in)."""
        end = time.time() + timeout
        warned = False
        while time.time() < end:
            if self._find_input():
                self.log("[GEMINI] Sẵn sàng (đã đăng nhập).")
                return True
            if not warned:
                self.log("[GEMINI] ⚠ Hãy ĐĂNG NHẬP Google trong cửa sổ trình duyệt "
                         "(chỉ lần đầu). Đang chờ ...")
                warned = True
            time.sleep(2)
        raise RuntimeError("Gemini web: chưa đăng nhập / không thấy ô nhập.")

    # -- one request -------------------------------------------------------
    def ask(self, prompt: str, timeout=180, fresh=True) -> str:
        if fresh:
            # Fresh chat each time -> no context bleed between batches.
            self._page.goto(GEMINI_URL, wait_until="domcontentloaded")
            self._wait_ready(60)

        box = self._find_input()
        if not box:
            raise RuntimeError("Gemini web: không tìm thấy ô nhập.")
        prev = self._response_count()
        box.click()
        # Type via keyboard so newlines don't submit early; send with Ctrl+Enter/Enter.
        self._page.keyboard.insert_text(prompt)
        time.sleep(0.3)
        self._page.keyboard.press("Enter")

        return self._wait_response(prev, timeout)

    def _response_count(self) -> int:
        for sel in RESPONSE_SELECTORS:
            els = self._page.query_selector_all(sel)
            if els:
                return len(els)
        return 0

    def _latest_text(self) -> str:
        for sel in RESPONSE_SELECTORS:
            els = self._page.query_selector_all(sel)
            if els:
                return (els[-1].inner_text() or "").strip()
        return ""

    def _wait_response(self, prev_count, timeout) -> str:
        """Wait for a new response, then for its text to stop growing."""
        end = time.time() + timeout
        # 1) wait for a new response block
        while time.time() < end:
            if self._response_count() > prev_count:
                break
            time.sleep(0.5)
        # 2) wait for text to stabilize (streaming finished)
        last, stable = "", 0
        while time.time() < end:
            cur = self._latest_text()
            if cur and cur == last:
                stable += 1
                if stable >= 4:      # ~2s unchanged
                    return cur
            else:
                stable = 0
            last = cur
            time.sleep(0.5)
        return last

    def close(self):
        try:
            if self._ctx:
                self._ctx.close()
        finally:
            if self._pw:
                self._pw.stop()
            self._ctx = self._page = self._pw = None


_SHARED: GeminiWeb | None = None


def get_shared(headless=False, log=print) -> GeminiWeb:
    """Reuse one browser across a whole batch/job."""
    global _SHARED
    if _SHARED is None:
        _SHARED = GeminiWeb(headless=headless, log=log)
        _SHARED.start()
    else:
        _SHARED.log = log
    return _SHARED


def shutdown():
    global _SHARED
    if _SHARED:
        _SHARED.close()
        _SHARED = None
