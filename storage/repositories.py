from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from storage.models import UserCredential, RegisteredUser, EmailToClient, Message


async def get_credential_by_email(db: AsyncSession, email: str) -> dict | None:
    row = await db.get(UserCredential, email)
    if not row:
        return None
    return {
        "client_id": row.client_id,
        "name": row.name,
        "kem_pk": row.kem_pk,
        "kem_sk": row.kem_sk,
        "sign_pk": row.sign_pk,
        "sign_sk": row.sign_sk,
        "x25519_pk": row.x25519_pk,
        "x25519_sk": row.x25519_sk,
        "reg_secret": row.reg_secret,
        "registered_at": row.registered_at.isoformat() if row.registered_at else None,
    }


async def save_credential(db: AsyncSession, email: str, data: dict) -> None:
    existing = await db.get(UserCredential, email)
    if existing:
        return
    row = UserCredential(
        email=email,
        client_id=data["client_id"],
        name=data["name"],
        kem_pk=data["kem_pk"],
        kem_sk=data["kem_sk"],
        sign_pk=data["sign_pk"],
        sign_sk=data["sign_sk"],
        x25519_pk=data.get("x25519_pk"),
        x25519_sk=data.get("x25519_sk"),
        reg_secret=data["reg_secret"],
    )
    db.add(row)
    await db.flush()


async def get_registered_user(db: AsyncSession, client_id: str) -> dict | None:
    row = await db.get(RegisteredUser, client_id)
    if not row:
        return None
    return {
        "name": row.name,
        "email": row.email,
        "kem_pk": row.kem_pk,
        "sign_pk": row.sign_pk,
        "x25519_pk": row.x25519_pk,
    }


async def save_registered_user(db: AsyncSession, client_id: str, data: dict) -> None:
    existing = await db.get(RegisteredUser, client_id)
    if existing:
        return
    row = RegisteredUser(
        client_id=client_id,
        name=data["name"],
        email=data["email"],
        kem_pk=data["kem_pk"],
        sign_pk=data["sign_pk"],
        x25519_pk=data.get("x25519_pk"),
    )
    db.add(row)
    await db.flush()


async def get_client_id_by_email(db: AsyncSession, email: str) -> str | None:
    row = await db.get(EmailToClient, email)
    return row.client_id if row else None


async def save_email_mapping(db: AsyncSession, email: str, client_id: str) -> None:
    existing = await db.get(EmailToClient, email)
    if existing:
        return
    db.add(EmailToClient(email=email, client_id=client_id))
    await db.flush()


async def get_inbox(db: AsyncSession, email: str) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.owner_email == email, Message.folder == "inbox")
        .order_by(Message.created_at.desc())
    )
    return list(result.scalars().all())


async def append_to_inbox(db: AsyncSession, email: str, raw_mime: str) -> Message:
    msg = Message(
        owner_email=email,
        folder="inbox",
        peer_email="",
        raw_mime=raw_mime,
    )
    db.add(msg)
    await db.flush()
    return msg


async def get_sent(db: AsyncSession, email: str) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.owner_email == email, Message.folder == "sent")
        .order_by(Message.created_at.desc())
    )
    return list(result.scalars().all())


async def append_to_sent(
    db: AsyncSession, email: str, to_email: str, subject: str, body: str,
) -> Message:
    msg = Message(
        owner_email=email,
        folder="sent",
        peer_email=to_email,
        subject=subject,
        body=body,
    )
    db.add(msg)
    await db.flush()
    return msg
