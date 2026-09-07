from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from .analytics import assign_clusters, enrich_event
from .config import get_settings
from .connectors import ConnectorError, telegram_poll, x_recent_search, youtube_search
from .db import get_store
from .free_connectors import (
    bluesky_search,
    mastodon_search,
    reddit_public_search,
    x_public_bridge,
    youtube_free_search,
)
from .priority_free_connectors import telegram_monitored_search
from .schemas import XSearchRequest, YouTubeSearchRequest


class CollectorStartRequest(BaseModel):
    query: str = Field(default="AI", min_length=1, max_length=300)
    interval_seconds: int = Field(default=30, ge=10, le=3600)
    enable_telegram: bool = True
    enable_x: bool = False
    enable_youtube: bool = False
    enable_bluesky: bool = False
    enable_reddit: bool = False
    enable_mastodon: bool = False


class CollectorManager:
    """Small hackathon-safe scheduler for continuous ingestion.

    X and YouTube API calls consume external quota/credits when using official APIs.
    Telegram is enabled by default: uses the official Bot API if configured, or
    seamlessly falls back to monitored public channels in zero-key mode.
    One manager exists per FastAPI process.
    """

    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()
        self._config: CollectorStartRequest | None = None
        self._last_run_at: datetime | None = None
        self._last_result: dict[str, Any] = {}
        self._cycles = 0
        self._recent_insertions: list[tuple[float, int]] = []

    def _calculate_ingestion_rate(self) -> float:
        if not (self._task and not self._task.done()):
            return 0.0
        now_mono = time.monotonic()
        cutoff_60 = now_mono - 60.0
        recent = [c for t, c in self._recent_insertions if t >= cutoff_60]
        if recent:
            return float(sum(recent))
        if self._recent_insertions:
            total_c = sum(c for _, c in self._recent_insertions)
            elapsed = max(1.0, now_mono - self._recent_insertions[0][0])
            return round(total_c * (60.0 / elapsed), 1)
        return 0.0

    def status(self) -> dict[str, Any]:
        running = self._task is not None and not self._task.done()
        store = get_store()
        last_event = store.latest_event_at()

        source_health: dict[str, str] = {}
        if self._last_result and "platforms" in self._last_result:
            for plat, data in self._last_result["platforms"].items():
                source_health[plat] = data.get("state", "UNKNOWN")
        else:
            settings = get_settings()
            source_health["telegram"] = "OK" if (settings.telegram_bot_token or settings.telegram_public_channels) else "CREDENTIALS_REQUIRED"
            source_health["x"] = "OK" if settings.x_bearer_token else "CREDENTIALS_REQUIRED"
            source_health["youtube"] = "OK"
            source_health["reddit"] = "OK"
            source_health["bluesky"] = "OK"
            source_health["mastodon"] = "OK"

        return {
            "running": running,
            "config": self._config.model_dump() if self._config else None,
            "cycles": self._cycles,
            "last_run_at": self._last_run_at,
            "last_event_at": last_event,
            "ingestion_rate": self._calculate_ingestion_rate(),
            "source_health": source_health,
            "last_result": self._last_result,
            "note": "X/YouTube continuous polling is opt-in to protect paid credits/quota.",
        }

    async def start(self, config: CollectorStartRequest) -> dict[str, Any]:
        await self.stop()
        self._config = config
        self._stop = asyncio.Event()
        self._cycles = 0
        self._last_result = {}
        self._task = asyncio.create_task(self._loop(), name="nexus-continuous-collector")
        return self.status()

    async def stop(self) -> dict[str, Any]:
        if self._task and not self._task.done():
            self._stop.set()
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        return self.status()

    async def _loop(self) -> None:
        while not self._stop.is_set():
            self._last_result = await self._run_cycle()
            self._last_run_at = datetime.now(timezone.utc)
            self._cycles += 1
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self._config.interval_seconds if self._config else 30)
            except asyncio.TimeoutError:
                continue

    async def _run_cycle(self) -> dict[str, Any]:
        config = self._config or CollectorStartRequest()
        store = get_store()
        settings = get_settings()
        report: dict[str, Any] = {"inserted": 0, "platforms": {}}

        async def process(platform: str, coro):
            try:
                events = await coro
                inserted = 0
                duplicates = 0
                for incoming in events:
                    normalized, derived = enrich_event(incoming)
                    row = store.insert(normalized, derived)
                    if row is None:
                        duplicates += 1
                    else:
                        inserted += 1
                report["platforms"][platform] = {
                    "state": "OK",
                    "received": len(events),
                    "inserted": inserted,
                    "duplicates": duplicates,
                }
                report["inserted"] += inserted
            except ConnectorError as exc:
                report["platforms"][platform] = {"state": exc.state, "detail": str(exc)}
            except Exception as exc:  # collector must never kill the service
                report["platforms"][platform] = {"state": "ERROR", "detail": str(exc)[:300]}

        if config.enable_telegram:
            if settings.telegram_bot_token:
                await process("telegram", telegram_poll(100))
            else:
                channel_spec = f"{settings.telegram_public_channels or 'telegram,durov'}||{config.query}"
                await process("telegram", telegram_monitored_search(channel_spec, 25))

        if config.enable_x:
            if settings.x_bearer_token:
                await process("x", x_recent_search(XSearchRequest(query=config.query, max_results=20)))
            elif settings.x_public_rss_url_template:
                await process("x", x_public_bridge(config.query, "", 20))
            else:
                report["platforms"]["x"] = {
                    "state": "CREDENTIALS_REQUIRED",
                    "detail": "Official X API bearer token or bridge template required for continuous X search.",
                }

        if config.enable_youtube:
            if settings.youtube_api_key:
                await process(
                    "youtube",
                    youtube_search(YouTubeSearchRequest(query=config.query, max_videos=2, max_comments_per_video=15)),
                )
            else:
                await process("youtube", youtube_free_search(config.query, 10))

        if config.enable_bluesky:
            await process("bluesky", bluesky_search(config.query, 20))

        if config.enable_reddit:
            await process("reddit", reddit_public_search(config.query, 20))

        if config.enable_mastodon:
            await process("mastodon", mastodon_search(config.query, 20))

        now_mono = time.monotonic()
        self._recent_insertions.append((now_mono, report["inserted"]))
        cutoff = now_mono - 300.0
        self._recent_insertions = [(t, c) for t, c in self._recent_insertions if t >= cutoff]

        if report["inserted"]:
            assign_clusters(store)
        return report


COLLECTOR = CollectorManager()
