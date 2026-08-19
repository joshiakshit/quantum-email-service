"""
QuMail Key Manager — ORM Schema

Tables:
  - clients    : Registered QuMail clients with public-key material only.
  - session_keys : Simulated QKD session keys distributed between clients.

IMPORTANT: Private ML-KEM / ML-DSA keys are NEVER stored here.
           Private keys remain exclusively on the respective client device.
"""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, Float, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database.database import Base
import enum


class KeyStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class Client(Base):
    """
    Registered QuMail client.

    Stores only PUBLIC key material.
    Private keys MUST remain on the client device.
    """
    __tablename__ = "clients"

    client_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Base64-encoded public keys supplied by the client at registration.
    # These are ML-KEM and ML-DSA public keys managed by M1.
    ml_kem_public_key: Mapped[str] = mapped_column(Text, nullable=False)
    ml_dsa_public_key: Mapped[str] = mapped_column(Text, nullable=False)

    # Bcrypt-hashed registration secret for JWT issuance.
    # The plaintext secret is returned ONCE at registration and never stored.
    hashed_secret: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Client id={self.client_id} name={self.name}>"


class SessionKey(Base):
    """
    Simulated QKD session key distributed between two QuMail clients.

    DISCLAIMER: This is SIMULATED-QKD for MVP purposes only.
    It does NOT provide true quantum-key-distribution security.
    The key material is generated using a CSPRNG (secrets.token_bytes).
    Replace this service with a real QKD simulator when available.
    """
    __tablename__ = "session_keys"

    key_id: Mapped[str] = mapped_column(String(20), primary_key=True, index=True)
    sender_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    recipient_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Base64-encoded key material (NEVER logged)
    key_material: Mapped[str] = mapped_column(Text, nullable=False)

    algorithm: Mapped[str] = mapped_column(
        String(50), nullable=False, default="SIMULATED-QKD"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    status: Mapped[KeyStatus] = mapped_column(
        SAEnum(KeyStatus), default=KeyStatus.ACTIVE, nullable=False
    )

    qber: Mapped[float] = mapped_column(
        Float, nullable=True, default=None
    )

    def __repr__(self) -> str:
        # Do NOT include key_material in repr — security requirement.
        return (
            f"<SessionKey id={self.key_id} "
            f"sender={self.sender_id} recipient={self.recipient_id} "
            f"status={self.status}>"
        )
