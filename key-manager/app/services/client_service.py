"""
QuMail Key Manager — Client Service

Business logic for:
  - Client registration with unique ID generation
  - Duplicate detection
  - Public-key format validation
  - Client retrieval
"""

import secrets
import hashlib
import logging
from datetime import datetime

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
    """
    Generate a unique client ID in the format QM-XXXXXXXX.
    Uses cryptographically-secure random hex.
    """
    hex_part = secrets.token_hex(settings.client_id_length // 2).upper()
    return f"{settings.client_id_prefix}-{hex_part}"


def _generate_registration_secret() -> str:
    """
    Generate a cryptographically-secure registration secret.
    Returned ONCE to the client — never stored in plaintext.
    """
    return secrets.token_urlsafe(32)


def _prehash_secret(secret: str) -> bytes:
    """
    SHA-256 pre-hash the secret before bcrypt.

    bcrypt has a hard 72-byte input limit. Pre-hashing with SHA-256 produces
    a fixed 32-byte digest, well within the limit, and does not weaken security
    (SHA-256 is a one-way function).
    """
    return hashlib.sha256(secret.encode("utf-8")).digest()


def _hash_secret(secret: str) -> str:
    """Hash a registration secret using bcrypt with SHA-256 pre-hashing."""
    pre = _prehash_secret(secret)
    hashed = bcrypt.hashpw(pre, bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def _verify_secret(secret: str, hashed: str) -> bool:
    """Verify a registration secret against its bcrypt hash."""
    pre = _prehash_secret(secret)
    return bcrypt.checkpw(pre, hashed.encode("utf-8"))


async def register_client(
    db: AsyncSession, request: ClientRegisterRequest
) -> tuple[Client, str]:
    """
    Register a new QuMail client.

    Returns:
        (Client ORM object, plaintext_registration_secret)

    Raises:
        HTTPException 409 if a client with the same name already exists.

    Note: The plaintext secret is returned ONCE and never stored.
    """
    # Check for duplicate name
    result = await db.execute(select(Client).where(Client.name == request.name))
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A client with name '{request.name}' is already registered. "
                   f"Use client_id '{existing.client_id}'.",
        )

    # Generate unique client_id (retry on collision — astronomically unlikely)
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

    # Generate and hash registration secret
    plaintext_secret = _generate_registration_secret()
    hashed_secret = _hash_secret(plaintext_secret)

    client = Client(
        client_id=candidate_id,
        name=request.name,
        ml_kem_public_key=request.ml_kem_public_key,
        ml_dsa_public_key=request.ml_dsa_public_key,
        hashed_secret=hashed_secret,
        created_at=datetime.utcnow(),
    )
    db.add(client)
    await db.flush()

    # SECURITY: Never log the client secret or key material.
    logger.info("Registered new client: id=%s name=%s", candidate_id, request.name)

    return client, plaintext_secret


async def get_client_by_id(db: AsyncSession, client_id: str) -> Client:
    """
    Retrieve a client by their client_id.

    Raises:
        HTTPException 404 if the client does not exist.
    """
    result = await db.execute(select(Client).where(Client.client_id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return client


async def verify_client_secret(db: AsyncSession, client_id: str, secret: str) -> Client:
    """
    Verify a client's registration secret and return the client.

    Raises:
        HTTPException 401 on invalid credentials.
    """
    invalid_creds = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid client_id or registration_secret.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    result = await db.execute(select(Client).where(Client.client_id == client_id))
    client = result.scalar_one_or_none()

    if client is None:
        # Constant-time dummy verification to prevent timing attacks
        _hash_secret("dummy-constant-time-placeholder")
        raise invalid_creds

    if not _verify_secret(secret, client.hashed_secret):
        raise invalid_creds

    logger.info("Authenticated client: id=%s", client_id)
    return client
