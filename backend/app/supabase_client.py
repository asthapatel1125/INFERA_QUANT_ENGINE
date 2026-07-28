from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class Repository:
    """Best-effort persistence. The application remains usable without Supabase."""

    def __init__(self, url: str = "", key: str = "") -> None:
        self.client = None
        if url and key:
            try:
                from supabase import create_client

                self.client = create_client(url, key)
            except Exception:
                logger.exception("Supabase initialization failed")

    @property
    def enabled(self) -> bool:
        return self.client is not None

    def insert(self, table: str, payload: dict[str, Any]) -> None:
        if not self.client:
            return
        try:
            self.client.table(table).insert(payload).execute()
        except Exception:
            logger.exception("Failed to persist %s snapshot", table)

