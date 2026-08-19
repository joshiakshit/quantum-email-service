"""
QuMail Key Manager — Key Service

Business logic for:
  - Public-key retrieval (for encryption by Integration Lead)
  - Session-key request (delegates to QKDService)
  - Session-key retrieval
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.services.client_service import get_client_by_id
from app.services.qkd_service import qkd_service
from app.database.schema import Client, SessionKey

logger = logging.getLogger(__name__)


async def get_public_keys(db: AsyncSession, client_id: str) -> Client:
    """
    Return the public keys for a given client.

    Raises:
        HTTPException 404 if the client does not exist.
    """
    return await get_client_by_id(db, client_id)


async def request_session_key(
    db: AsyncSession,
    sender_id: str,
    recipient_id: str,
    requester: Client,
) -> SessionKey:
    """
    Request simulated QKD session-key material for a sender/recipient pair.

    The requester must be either the sender or recipient.

    Raises:
        HTTPException 403 if the requester is not part of the key pair.
        HTTPException 404 if sender or recipient do not exist.
    """
    # Validate that the requesting client is involved in this key exchange
    if requester.client_id not in (sender_id, recipient_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only request session keys where you are the sender or recipient.",
        )

    # Validate that both sender and recipient are registered clients
    await get_client_by_id(db, sender_id)
    await get_client_by_id(db, recipient_id)

    # Sender and recipient must be different
    if sender_id == recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sender and recipient must be different clients.",
        )

    return await qkd_service.generate_key(db, sender_id, recipient_id)


async def retrieve_session_key(
    db: AsyncSession, key_id: str, requester: Client
) -> SessionKey:
    """
    Retrieve an existing session key by key_id.

    Only the sender or recipient of the key may retrieve it.
    """
    return await qkd_service.retrieve_key(db, key_id, requester.client_id)
