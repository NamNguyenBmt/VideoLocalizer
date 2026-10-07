"""Crawl all video links from a Douyin / TikTok creator page via Playwright.

yt-dlp can't enumerate a Douyin channel, so we drive a real browser: open the
user page (sign in once — the profile persists), scroll until the video grid
stops growing, and collect every /video/ link. Returned URLs can then be fed
one by one into the normal download + localize pipeline.

Douyin has anti-bot (login wall, occasional slider captcha) — this runs headed
so the user can sign in / pass a captcha the first time. Best-effort.
"""
from __future__ import annotations

import time
from pathlib import Path

from . import tools

PROFILE_DIR = tools.ROOT / "work" / "crawl_profile"


def _norm(href: str) -> str:
    return (href or "").split("?")[0].rstrip("/")


def crawl_user_videos(url: str, limit=50, headless=False, max_scrolls=120,
                      log=print) -> list[str]:
    """Return up to `limit` video URLs from a creator/user page."""
    from playwright.sync_api import sync_playwright

    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    found: list[str] = []
    seen: set[str] = set()

    with sync_playwright() as pw:
        ctx = pw.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR), headless=headless,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1240, "height": 880},
        )
        pg = ctx.pages[0] if ctx.pages else ctx.new_page()
        pg.set_default_timeout(45000)
        log(f"[CRAWL] Mở {url} ...")
        try:
            pg.goto(url, wait_until="domcontentloaded")
        except Exception as e:
            log(f"[CRAWL] Lỗi mở trang: {e}")
            ctx.close()
            return []

        # Give time for login / captcha the first run.
        log("[CRAWL] Nếu bị chặn, ĐĂNG NHẬP / qua captcha trong cửa sổ (chờ 30s)...")
        time.sleep(6)

        stable = 0
        for i in range(max_scrolls):
            try:
                links = pg.eval_on_selector_all(
                    "a[href*='/video/'], a[href*='/@']",
                    "els => els.map(e => e.href)")
            except Exception:
                links = []
            new = 0
            for h in links:
                if "/video/" not in h:
                    continue
                b = _norm(h)
                if b not in seen:
                    seen.add(b)
                    found.append(b)
                    new += 1
            if len(found) >= limit:
                break
            # scroll to load more
            try:
                pg.mouse.wheel(0, 3200)
            except Exception:
                pass
            time.sleep(1.4)
            if new == 0:
                stable += 1
                if stable >= 5:          # ~7s with no new items -> end
                    break
            else:
                stable = 0
            if i % 10 == 0:
                log(f"[CRAWL] đã thấy {len(found)} video...")
        ctx.close()

    log(f"[CRAWL] Tổng {len(found)} video.")
    return found[:limit]
