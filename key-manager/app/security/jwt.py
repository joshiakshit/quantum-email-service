"""
QuMail Key Manager — JWT Security Module

Handles:
  - JWT token creation
  - JWT token verification
  - FastAPI dependency for protected routes

Designed to be extended with mTLS later without touching route logic.
Just swap out the `get_current_client` dependency implementation.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.database.database import get_db
from app.database.schema import Client

settings = get_settings()

# HTTPBearer scheme — reads Authorization: Bearer <token>
bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(client_id: str) -> tuple[str, int]:
    """
    Create a signed JWT for the given client_id.

    Returns:
        (token_string, expires_in_seconds)
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {
        "sub": client_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": "qumail-key-manager",
    }
    token = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return token, settings.jwt_access_token_expire_minutes * 60


def decode_token(token: str) -> Optional[str]:
    """
    Decode and validate a JWT.  Returns the client_id (sub) or None.
    Does NOT raise — callers decide how to handle None.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        client_id: Optional[str] = payload.get("sub")
        return client_id
    except JWTError:
        return None


async def get_current_client(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Client:
    """
    FastAPI dependency — resolves the currently authenticated client.

    Raises HTTP 401 if:
      - No Authorization header is present.
      - The JWT is invalid or expired.
      - The client_id in the JWT no longer exists in the database.

    To extend with mTLS: add certificate verification here before the JWT check.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    client_id = decode_token(credentials.credentials)
    if client_id is None:
        raise unauthorized

    result = await db.execute(select(Client).where(Client.client_id == client_id))
    client = result.scalar_one_or_none()

    if client is None:
        raise unauthorized

    return client
