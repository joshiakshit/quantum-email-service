from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Float, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database.database import Base
import enum


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class KeyStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class Client(Base):
    __tablename__ = "clients"

    client_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ml_kem_public_key: Mapped[str] = mapped_column(Text, nullable=False)
    ml_dsa_public_key: Mapped[str] = mapped_column(Text, nullable=False)
    hashed_secret: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<Client id={self.client_id} name={self.name}>"


class SessionKey(Base):
    __tablename__ = "session_keys"

    key_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    sender_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    recipient_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    key_material: Mapped[str] = mapped_column(Text, nullable=False)
    algorithm: Mapped[str] = mapped_column(String(50), nullable=False, default="BB84-QKD-SIM")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[KeyStatus] = mapped_column(
        SAEnum(KeyStatus), default=KeyStatus.ACTIVE, nullable=False,
    )
    qber: Mapped[float] = mapped_column(Float, nullable=True, default=None)

    def __repr__(self) -> str:
        return (
            f"<SessionKey id={self.key_id} "
            f"sender={self.sender_id} recipient={self.recipient_id} "
            f"status={self.status}>"
        )
