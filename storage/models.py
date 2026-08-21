from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Integer, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column

from storage.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UserCredential(Base):
    __tablename__ = "gw_user_credentials"

    email: Mapped[str] = mapped_column(String(255), primary_key=True)
    client_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    kem_pk: Mapped[bytes] = mapped_column(LargeBinary)
    kem_sk: Mapped[bytes] = mapped_column(LargeBinary)
    sign_pk: Mapped[bytes] = mapped_column(LargeBinary)
    sign_sk: Mapped[bytes] = mapped_column(LargeBinary)
    x25519_pk: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    x25519_sk: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    reg_secret: Mapped[str] = mapped_column(String(255))
    registered_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class RegisteredUser(Base):
    __tablename__ = "gw_registered_users"

    client_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    kem_pk: Mapped[bytes] = mapped_column(LargeBinary)
    sign_pk: Mapped[bytes] = mapped_column(LargeBinary)
    x25519_pk: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)


class EmailToClient(Base):
    __tablename__ = "gw_email_to_client"

    email: Mapped[str] = mapped_column(String(255), primary_key=True)
    client_id: Mapped[str] = mapped_column(String(20), index=True)


class Message(Base):
    __tablename__ = "gw_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_email: Mapped[str] = mapped_column(String(255), index=True)
    folder: Mapped[str] = mapped_column(String(20), index=True)
    peer_email: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(Text, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    raw_mime: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, index=True)
    is_read: Mapped[bool] = mapped_column(default=False)
