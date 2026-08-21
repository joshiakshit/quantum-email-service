import logging
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.services.client_service import get_client_by_id, get_client_by_email
from app.services.qkd_service import qkd_service
from app.database.schema import Client, SessionKey

logger = logging.getLogger(__name__)


async def get_public_keys(db: AsyncSession, client_id: str) -> Client:
    return await get_client_by_id(db, client_id)


async def get_public_keys_by_email(db: AsyncSession, email: str) -> Client:
    return await get_client_by_email(db, email)


async def request_session_key(
    db: AsyncSession,
    sender_id: str,
    recipient_id: str,
    requester: Client,
) -> SessionKey:
    if requester.client_id not in (sender_id, recipient_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only request session keys where you are the sender or recipient.",
        )

    await get_client_by_id(db, sender_id)
    await get_client_by_id(db, recipient_id)

    if sender_id == recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sender and recipient must be different clients.",
        )

    return await qkd_service.generate_key(db, sender_id, recipient_id)


async def retrieve_session_key(
    db: AsyncSession, key_id: str, requester: Client
) -> SessionKey:
    return await qkd_service.retrieve_key(db, key_id, requester.client_id)
