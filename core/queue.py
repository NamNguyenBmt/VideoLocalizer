"""Batch job queue: run the pipeline over many videos sequentially in a thread."""
from __future__ import annotations

import threading
import time
from dataclasses import asdict

from . import pipeline
from .pipeline import JobConfig


class JobQueue:
    def __init__(self):
        self._items = []          # list of dicts: {id, cfg, status, log, result}
        self._lock = threading.Lock()
        self._thread = None
        self._running = False
        self._seq = 0

    def add(self, cfg: JobConfig) -> int:
        with self._lock:
            self._seq += 1
            jid = self._seq
            self._items.append({"id": jid, "cfg": cfg, "status": "queued",
                                "log": [], "result": None, "error": None,
                                "name": cfg.proj_name or cfg.video or cfg.url})
        self._ensure_worker()
        return jid

    def _ensure_worker(self):
        with self._lock:
            if self._running:
                return
            self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self):
        while True:
            with self._lock:
                job = next((j for j in self._items if j["status"] == "queued"), None)
                if not job:
                    self._running = False
                    return
                job["status"] = "running"

            def log(line, _j=job):
                with self._lock:
                    _j["log"].append(f"[{time.strftime('%H:%M:%S')}] {line}")

            try:
                res = pipeline.run(job["cfg"], log)
                with self._lock:
                    job["result"] = res
                    job["status"] = "done"
            except Exception as e:
                import traceback
                log("LỖI: " + str(e))
                log(traceback.format_exc())
                with self._lock:
                    job["error"] = str(e)
                    job["status"] = "error"

    def snapshot(self) -> list[dict]:
        with self._lock:
            return [{"id": j["id"], "name": j["name"], "status": j["status"],
                     "error": j["error"],
                     "result": j["result"],
                     "log_tail": j["log"][-400:]} for j in self._items]

    def clear_done(self):
        with self._lock:
            self._items = [j for j in self._items
                           if j["status"] in ("queued", "running")]


QUEUE = JobQueue()
