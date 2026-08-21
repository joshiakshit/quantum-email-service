from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database.database import get_db
from app.database.schema import Client
from app.models.key import PublicKeyResponse, SessionKeyRequest, SessionKeyResponse
from app.security.jwt import get_current_client
from app.services.key_service import get_public_keys, get_public_keys_by_email, request_session_key, retrieve_session_key

router = APIRouter(prefix="/api/v1/keys", tags=["Keys"])

limiter = Limiter(key_func=get_remote_address)


@router.get(
    "/public/{client_id}",
    response_model=PublicKeyResponse,
    summary="Get recipient public keys by client_id",
)
async def get_public_key(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    _current: Client = Depends(get_current_client),
) -> PublicKeyResponse:
    client = await get_public_keys(db, client_id)
    return PublicKeyResponse(
        client_id=client.client_id,
        name=client.name,
        email=client.email,
        ml_kem_public_key=client.ml_kem_public_key,
        ml_dsa_public_key=client.ml_dsa_public_key,
        x25519_public_key=client.x25519_public_key,
        key_version=client.key_version,
    )


@router.get(
    "/directory/{email:path}",
    response_model=PublicKeyResponse,
    summary="Directory lookup by email",
    description="Look up a client's public keys by their email address.",
)
async def directory_lookup(
    email: str,
    db: AsyncSession = Depends(get_db),
    _current: Client = Depends(get_current_client),
) -> PublicKeyResponse:
    client = await get_public_keys_by_email(db, email)
    return PublicKeyResponse(
        client_id=client.client_id,
        name=client.name,
        email=client.email,
        ml_kem_public_key=client.ml_kem_public_key,
        ml_dsa_public_key=client.ml_dsa_public_key,
        x25519_public_key=client.x25519_public_key,
        key_version=client.key_version,
    )


@router.post(
    "/request",
    response_model=SessionKeyResponse,
    status_code=201,
    summary="Request BB84-simulated QKD session key material",
)
@limiter.limit("20/minute")
async def request_key(
    request: Request,
    body: SessionKeyRequest,
    db: AsyncSession = Depends(get_db),
    current: Client = Depends(get_current_client),
) -> SessionKeyResponse:
    key = await request_session_key(db, body.sender_id, body.recipient_id, current)
    return SessionKeyResponse(
        key_id=key.key_id,
        sender_id=key.sender_id,
        recipient_id=key.recipient_id,
        key_material=key.key_material,
        algorithm=key.algorithm,
        created_at=key.created_at,
        expires_at=key.expires_at,
        status=key.status,
        qber=key.qber,
    )


@router.get(
    "/{key_id}",
    response_model=SessionKeyResponse,
    summary="Retrieve a session key by ID",
)
async def get_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current: Client = Depends(get_current_client),
) -> SessionKeyResponse:
    key = await retrieve_session_key(db, key_id, current)
    return SessionKeyResponse(
        key_id=key.key_id,
        sender_id=key.sender_id,
        recipient_id=key.recipient_id,
        key_material=key.key_material,
        algorithm=key.algorithm,
        created_at=key.created_at,
        expires_at=key.expires_at,
        status=key.status,
        qber=key.qber,
    )
