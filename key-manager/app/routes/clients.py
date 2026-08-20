from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.database.schema import Client
from app.models.client import (
    ClientRegisterRequest,
    ClientRegisterResponse,
    ClientInfoResponse,
)
from app.security.jwt import get_current_client
from app.services.client_service import register_client, get_client_by_id

router = APIRouter(prefix="/api/v1/clients", tags=["Clients"])


@router.post(
    "/register",
    response_model=ClientRegisterResponse,
    status_code=201,
    summary="Register a new QMail client",
    description=(
        "Register a new client by providing a name and ML-KEM / ML-DSA public keys. "
        "Returns a unique `client_id` and a `registration_secret`. "
        "Save the secret immediately — it is shown once and never stored in plaintext."
    ),
)
async def register(
    body: ClientRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> ClientRegisterResponse:
    client, plaintext_secret = await register_client(db, body)
    return ClientRegisterResponse(
        client_id=client.client_id,
        registration_secret=plaintext_secret,
        status="registered",
    )


@router.get(
    "/{client_id}",
    response_model=ClientInfoResponse,
    summary="Get client information",
    description=(
        "Retrieve public information about a registered QMail client. "
        "Only public keys are returned. Requires a valid JWT Bearer token."
    ),
)
async def get_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    _current: Client = Depends(get_current_client),
) -> ClientInfoResponse:
    client = await get_client_by_id(db, client_id)
    return ClientInfoResponse(
        client_id=client.client_id,
        name=client.name,
        ml_kem_public_key=client.ml_kem_public_key,
        ml_dsa_public_key=client.ml_dsa_public_key,
        created_at=client.created_at,
    )
