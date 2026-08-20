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

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(client_id: str) -> tuple[str, int]:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {
        "sub": client_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": "qmail-key-manager",
    }
    token = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return token, settings.jwt_access_token_expire_minutes * 60


def decode_token(token: str) -> Optional[str]:
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
