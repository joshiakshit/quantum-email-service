import json
import logging
from typing import Any

import redis.asyncio as aioredis

from storage.config import get_storage_settings

logger = logging.getLogger(__name__)

_KEY_PREFIX = "qmail:session:"


class SessionStore:
    def __init__(self):
        self._redis: aioredis.Redis | None = None
        self._fallback: dict[str, str] = {}
        self._ttl = get_storage_settings().session_ttl_seconds

    async def connect(self) -> None:
        settings = get_storage_settings()
        try:
            self._redis = aioredis.from_url(
                settings.redis_url, decode_responses=True,
            )
            await self._redis.ping()
            logger.info("Session store connected to Redis")
        except Exception:
            logger.warning("Redis unavailable — falling back to in-memory sessions")
            self._redis = None

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    def _serialise(self, data: dict) -> str:
        clean = {}
        for k, v in data.items():
            if k == "km":
                continue
            if isinstance(v, bytes):
                clean[k] = v.hex()
                clean[f"_bin_{k}"] = True
            else:
                clean[k] = v
        return json.dumps(clean)

    def _deserialise(self, raw: str) -> dict:
        data = json.loads(raw)
        restored = {}
        for k, v in data.items():
            if k.startswith("_bin_"):
                continue
            if data.get(f"_bin_{k}"):
                restored[k] = bytes.fromhex(v)
            else:
                restored[k] = v
        return restored

    async def set(self, token: str, session_data: dict) -> None:
        payload = self._serialise(session_data)
        if self._redis:
            await self._redis.setex(f"{_KEY_PREFIX}{token}", self._ttl, payload)
        else:
            self._fallback[token] = payload

    async def get(self, token: str) -> dict | None:
        if self._redis:
            raw = await self._redis.get(f"{_KEY_PREFIX}{token}")
        else:
            raw = self._fallback.get(token)
        if raw is None:
            return None
        return self._deserialise(raw)

    async def delete(self, token: str) -> None:
        if self._redis:
            await self._redis.delete(f"{_KEY_PREFIX}{token}")
        else:
            self._fallback.pop(token, None)
