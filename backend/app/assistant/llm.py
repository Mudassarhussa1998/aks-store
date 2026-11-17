"""Shared Gemini client."""

import asyncio
from collections.abc import Awaitable, Callable
from functools import lru_cache
from typing import TypeVar

from google import genai
from google.genai import errors, types

from app.core.config import settings

T = TypeVar("T")


class AssistantUnavailable(RuntimeError):
    pass


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    if not settings.gemini_api_key:
        raise AssistantUnavailable("GEMINI_API_KEY is not set.")
    # A stuck call must not hold the customer's request (and a DB connection) open: give up after 45 s.
    return genai.Client(api_key=settings.gemini_api_key, http_options=types.HttpOptions(timeout=45_000))


async def with_retry(call: Callable[[], Awaitable[T]]) -> T:
    """Run a Gemini call, retrying once on a temporary overload or rate limit."""
    try:
        return await call()
    except errors.APIError as err:
        if err.code not in (429, 503):
            raise
        await asyncio.sleep(1.5)
        return await call()
