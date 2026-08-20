from __future__ import annotations

import sys
import os
import secrets
import base64
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.config import get_settings
from app.database.schema import SessionKey, KeyStatus


def _utcnow() -> datetime:
    """Naive UTC now — SQLite strips tzinfo on round-trip."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
from qkd_sim.bb84 import BB84Simulator

logger = logging.getLogger(__name__)
settings = get_settings()

KEY_ID_PREFIX = "KEY"
KEY_ID_HEX_LENGTH = 8

_simulator = BB84Simulator()


def _generate_key_id() -> str:
    return f"{KEY_ID_PREFIX}-{secrets.token_hex(KEY_ID_HEX_LENGTH // 2).upper()}"


class QKDService:
    ALGORITHM = "BB84-QKD-SIM"

    async def generate_key(
        self,
        db: AsyncSession,
        sender_id: str,
        recipient_id: str,
    ) -> SessionKey:
        await self._expire_stale_keys(db, sender_id, recipient_id)

        result = _simulator.simulate(key_length=settings.session_key_length_bytes * 8)
        if not result.success or result.final_key is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=result.message,
            )

        key_material_b64 = base64.b64encode(result.final_key).decode("utf-8")

        key_id = _generate_key_id()
        now = _utcnow()
        expires_at = now + timedelta(hours=settings.session_key_expiry_hours)

        session_key = SessionKey(
            key_id=key_id,
            sender_id=sender_id,
            recipient_id=recipient_id,
            key_material=key_material_b64,
            algorithm=self.ALGORITHM,
            created_at=now,
            expires_at=expires_at,
            status=KeyStatus.ACTIVE,
            qber=result.qber,
        )
        db.add(session_key)
        await db.flush()

        logger.info(
            "[BB84-QKD-SIM] Generated key: id=%s sender=%s recipient=%s qber=%.4f expires=%s",
            key_id, sender_id, recipient_id, result.qber, expires_at.isoformat(),
        )
        return session_key

    async def retrieve_key(
        self,
        db: AsyncSession,
        key_id: str,
        requester_id: str,
    ) -> SessionKey:
        result = await db.execute(
            select(SessionKey).where(SessionKey.key_id == key_id)
        )
        key = result.scalar_one_or_none()

        if key is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session key '{key_id}' not found.",
            )

        if requester_id not in (key.sender_id, key.recipient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this session key.",
            )

        await self._check_and_expire(db, key)

        if key.status != KeyStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=f"Session key '{key_id}' is {key.status.value}.",
            )

        return key

    async def expire_keys(self, db: AsyncSession) -> int:
        now = _utcnow()
        result = await db.execute(
            select(SessionKey).where(
                SessionKey.status == KeyStatus.ACTIVE,
                SessionKey.expires_at <= now,
            )
        )
        stale = result.scalars().all()
        count = 0
        for key in stale:
            key.status = KeyStatus.EXPIRED
            count += 1
        if count:
            logger.info("[BB84-QKD-SIM] Expired %d stale session keys.", count)
        return count

    async def _expire_stale_keys(
        self, db: AsyncSession, sender_id: str, recipient_id: str
    ) -> None:
        now = _utcnow()
        result = await db.execute(
            select(SessionKey).where(
                SessionKey.sender_id == sender_id,
                SessionKey.recipient_id == recipient_id,
                SessionKey.status == KeyStatus.ACTIVE,
                SessionKey.expires_at <= now,
            )
        )
        for key in result.scalars().all():
            key.status = KeyStatus.EXPIRED

    async def _check_and_expire(self, db: AsyncSession, key: SessionKey) -> None:
        if key.status == KeyStatus.ACTIVE and _utcnow() > key.expires_at:
            key.status = KeyStatus.EXPIRED


qkd_service = QKDService()
