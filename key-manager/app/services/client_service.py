import secrets
import hashlib
import logging
from datetime import datetime, timezone

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.config import get_settings
from app.database.schema import Client
from app.models.client import ClientRegisterRequest

logger = logging.getLogger(__name__)
settings = get_settings()


def _generate_client_id() -> str:
    hex_part = secrets.token_hex(settings.client_id_length // 2).upper()
    return f"{settings.client_id_prefix}-{hex_part}"


def _generate_registration_secret() -> str:
    return secrets.token_urlsafe(32)


def _prehash_secret(secret: str) -> bytes:
    # SHA-256 pre-hash keeps input within bcrypt's 72-byte limit
    return hashlib.sha256(secret.encode("utf-8")).digest()


def _hash_secret(secret: str) -> str:
    pre = _prehash_secret(secret)
    hashed = bcrypt.hashpw(pre, bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def _verify_secret(secret: str, hashed: str) -> bool:
    pre = _prehash_secret(secret)
    return bcrypt.checkpw(pre, hashed.encode("utf-8"))


async def register_client(
    db: AsyncSession, request: ClientRegisterRequest
) -> tuple[Client, str]:
    result = await db.execute(select(Client).where(Client.name == request.name))
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A client with name '{request.name}' is already registered. "
                   f"Use client_id '{existing.client_id}'.",
        )

    for _ in range(5):
        candidate_id = _generate_client_id()
        id_result = await db.execute(
            select(Client).where(Client.client_id == candidate_id)
        )
        if id_result.scalar_one_or_none() is None:
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate unique client ID. Please retry.",
        )

    plaintext_secret = _generate_registration_secret()
    hashed_secret = _hash_secret(plaintext_secret)

    client = Client(
        client_id=candidate_id,
        name=request.name,
        ml_kem_public_key=request.ml_kem_public_key,
        ml_dsa_public_key=request.ml_dsa_public_key,
        hashed_secret=hashed_secret,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(client)
    await db.flush()

    logger.info("Registered new client: id=%s name=%s", candidate_id, request.name)

    return client, plaintext_secret


async def get_client_by_id(db: AsyncSession, client_id: str) -> Client:
    result = await db.execute(select(Client).where(Client.client_id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return client


async def verify_client_secret(db: AsyncSession, client_id: str, secret: str) -> Client:
    invalid_creds = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid client_id or registration_secret.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    result = await db.execute(select(Client).where(Client.client_id == client_id))
    client = result.scalar_one_or_none()

    if client is None:
        _hash_secret("dummy-constant-time-placeholder")
        raise invalid_creds

    if not _verify_secret(secret, client.hashed_secret):
        raise invalid_creds

    logger.info("Authenticated client: id=%s", client_id)
    return client
