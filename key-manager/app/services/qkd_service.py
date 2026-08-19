"""
QuMail Key Manager — Simulated QKD Service

DISCLAIMER ─────────────────────────────────────────────────────────────────────
This module simulates Quantum Key Distribution (QKD) for the QuMail MVP.

It does NOT provide real quantum-key-distribution security.
Real QKD requires physical quantum channels (e.g., BB84 over optical fiber).

What this implementation does:
  - Generates cryptographically-secure random key material via secrets.token_bytes()
    (CSPRNG, not a quantum source).
  - Labels all keys with algorithm = "SIMULATED-QKD" for transparency.
  - Stores key material in the local SQLite database.
  - Enforces key expiry and status management.

How to replace with real QKD:
  1. Implement a subclass of QKDService.
  2. Override generate_key() to call your QKD hardware/simulator API.
  3. Override retrieve_key() to fetch from the QKD network node.
  4. Swap the dependency in key_service.py.
─────────────────────────────────────────────────────────────────────────────────
"""

import secrets
import base64
import logging
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.config import get_settings
from app.database.schema import SessionKey, KeyStatus

logger = logging.getLogger(__name__)
settings = get_settings()

# Key ID prefix
KEY_ID_PREFIX = "KEY"
KEY_ID_HEX_LENGTH = 8  # characters


def _generate_key_id() -> str:
    """Generate a unique session key ID in the format KEY-XXXXXXXX."""
    return f"{KEY_ID_PREFIX}-{secrets.token_hex(KEY_ID_HEX_LENGTH // 2).upper()}"


class QKDService:
    """
    Simulated QKD key distribution interface.

    This class is deliberately designed to be subclassed and replaced
    with a real QKD implementation without changing the Key Manager API.

    Interface:
        generate_key(db, sender_id, recipient_id) -> SessionKey
        retrieve_key(db, key_id, requester_id) -> SessionKey
        expire_keys(db)                          -> int  (expired count)
    """

    ALGORITHM = "SIMULATED-QKD"

    async def generate_key(
        self,
        db: AsyncSession,
        sender_id: str,
        recipient_id: str,
    ) -> SessionKey:
        """
        Generate simulated QKD session key material for a sender/recipient pair.

        The key material is produced by secrets.token_bytes() — a CSPRNG.
        In a real QKD system this would come from a quantum channel.

        Returns:
            SessionKey ORM object (key_material is base64-encoded).
        """
        # Expire any stale keys for this pair first
        await self._expire_stale_keys(db, sender_id, recipient_id)

        # Generate key material — CSPRNG, 256 bits
        raw_key = secrets.token_bytes(settings.session_key_length_bytes)
        key_material_b64 = base64.b64encode(raw_key).decode("utf-8")

        key_id = _generate_key_id()
        now = datetime.utcnow()
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
        )
        db.add(session_key)
        await db.flush()

        # SECURITY: Never log key_material
        logger.info(
            "[SIMULATED-QKD] Generated key: id=%s sender=%s recipient=%s expires=%s",
            key_id,
            sender_id,
            recipient_id,
            expires_at.isoformat(),
        )
        return session_key

    async def retrieve_key(
        self,
        db: AsyncSession,
        key_id: str,
        requester_id: str,
    ) -> SessionKey:
        """
        Retrieve an existing session key by key_id.

        Only the sender or recipient of the key may retrieve it.

        Raises:
            HTTPException 404 if the key does not exist.
            HTTPException 403 if the requester is not authorized.
            HTTPException 410 if the key is expired or revoked.
        """
        result = await db.execute(
            select(SessionKey).where(SessionKey.key_id == key_id)
        )
        key = result.scalar_one_or_none()

        if key is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session key '{key_id}' not found.",
            )

        # Authorization: only sender or recipient may access the key
        if requester_id not in (key.sender_id, key.recipient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this session key.",
            )

        # Check expiry
        await self._check_and_expire(db, key)

        if key.status != KeyStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=f"Session key '{key_id}' is {key.status.value}.",
            )

        return key

    async def expire_keys(self, db: AsyncSession) -> int:
        """
        Mark all past-deadline ACTIVE keys as EXPIRED.

        Returns the number of keys expired.
        """
        now = datetime.utcnow()
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
            logger.info("[SIMULATED-QKD] Expired %d stale session keys.", count)
        return count

    # ── Private helpers ──────────────────────────────────────────────────────

    async def _expire_stale_keys(
        self, db: AsyncSession, sender_id: str, recipient_id: str
    ) -> None:
        """Expire any active-but-past-deadline keys for this pair."""
        now = datetime.utcnow()
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
        """Expire a single key if it has passed its deadline."""
        if key.status == KeyStatus.ACTIVE and datetime.utcnow() > key.expires_at:
            key.status = KeyStatus.EXPIRED


# ── Module-level singleton ────────────────────────────────────────────────────
# Replace this with a real QKD implementation by swapping this instance.
qkd_service = QKDService()
