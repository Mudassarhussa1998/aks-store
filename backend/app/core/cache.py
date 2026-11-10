"""Small Redis JSON cache for hot catalog reads. Every call degrades to a no-op if Redis is down."""

import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from redis.asyncio import Redis

from app.core.config import settings

log = logging.getLogger(__name__)
_redis: Redis | None = Redis.from_url(settings.redis_url, decode_responses=True) if settings.redis_url else None

PREFIX = "rawaj:"


async def cached(key: str, loader: Callable[[], Awaitable[Any]], ttl: int | None = None) -> Any:
    full_key = PREFIX + key
    if _redis is not None:
        try:
            hit = await _redis.get(full_key)
            if hit is not None:
                return json.loads(hit)
        except Exception as exc:  # noqa: BLE001 - cache must never break a request
            log.warning("cache read failed: %s", exc)
    value = await loader()
    if _redis is not None:
        try:
            await _redis.set(full_key, json.dumps(value, default=str), ex=ttl or settings.catalog_cache_seconds)
        except Exception as exc:  # noqa: BLE001
            log.warning("cache write failed: %s", exc)
    return value


async def invalidate(*patterns: str) -> None:
    """Delete keys matching each glob pattern, e.g. invalidate("product:*", "products:*")."""
    if _redis is None:
        return
    try:
        for pattern in patterns:
            async for key in _redis.scan_iter(PREFIX + pattern, count=500):
                await _redis.delete(key)
    except Exception as exc:  # noqa: BLE001
        log.warning("cache invalidate failed: %s", exc)


async def count(key: str) -> int:
    """Current value of a rate-limit counter (0 when Redis is unavailable)."""
    if _redis is None:
        return 0
    try:
        return int(await _redis.get(PREFIX + key) or 0)
    except Exception as exc:  # noqa: BLE001
        log.warning("rate limit read failed: %s", exc)
        return 0


async def bump(key: str, window_seconds: int) -> None:
    """Add one to a counter that resets `window_seconds` after its first hit."""
    if _redis is None:
        return
    try:
        full_key = PREFIX + key
        if await _redis.incr(full_key) == 1:
            await _redis.expire(full_key, window_seconds)
    except Exception as exc:  # noqa: BLE001
        log.warning("rate limit write failed: %s", exc)


async def reset(key: str) -> None:
    if _redis is not None:
        try:
            await _redis.delete(PREFIX + key)
        except Exception as exc:  # noqa: BLE001
            log.warning("rate limit reset failed: %s", exc)
