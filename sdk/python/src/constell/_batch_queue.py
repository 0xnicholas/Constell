from __future__ import annotations
import threading
import time
from queue import Queue, Empty
from typing import Any
import httpx


class BatchQueue:
    def __init__(
        self,
        base_url: str,
        public_key: str,
        secret_key: str,
        flush_interval: float = 5.0,
        max_batch_size: int = 100,
    ):
        self.base_url = base_url.rstrip("/")
        self.auth = (public_key, secret_key)
        self.flush_interval = flush_interval
        self.max_batch_size = max_batch_size
        self._queue: Queue[dict[str, Any]] = Queue()
        self._lock = threading.Lock()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._stopped = threading.Event()
        self._thread.start()

    def enqueue(self, event: dict[str, Any]) -> None:
        with self._lock:
            self._queue.put(event)

    def _loop(self) -> None:
        while not self._stopped.is_set():
            time.sleep(self.flush_interval)
            self._flush()

    def _flush(self) -> None:
        batch: list[dict[str, Any]] = []
        with self._lock:
            while len(batch) < self.max_batch_size:
                try:
                    batch.append(self._queue.get_nowait())
                except Empty:
                    break
        if not batch:
            return
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    f"{self.base_url}/api/public/ingestion",
                    json={"batch": batch},
                    auth=self.auth,
                )
                resp.raise_for_status()
        except Exception as exc:
            # v0.3.0: log and drop; v0.4.0: retry / dead-letter
            print(f"[constell] flush failed: {exc}")

    def flush_and_stop(self) -> None:
        self._stopped.set()
        self._thread.join(timeout=self.flush_interval + 1)
        self._flush()
