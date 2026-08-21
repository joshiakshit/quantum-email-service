from datetime import datetime
from pydantic import BaseModel, Field, field_validator, EmailStr
import base64


def _is_valid_base64(value: str) -> bool:
    try:
        base64.b64decode(value, validate=True)
        return True
    except Exception:
        return False


class ClientRegisterRequest(BaseModel):
    name: str = Field(
        ..., min_length=1, max_length=255,
        description="Human-readable name for the QMail client.",
        examples=["Alice"],
    )
    email: EmailStr = Field(
        ..., description="Email address — the canonical identity for directory lookup.",
        examples=["alice@qmail.local"],
    )
    ml_kem_public_key: str = Field(
        ..., min_length=10,
        description="Base64-encoded ML-KEM public key.",
    )
    ml_dsa_public_key: str = Field(
        ..., min_length=10,
        description="Base64-encoded ML-DSA public key.",
    )
    x25519_public_key: str | None = Field(
        None, min_length=10,
        description="Base64-encoded X25519 public key (required for envelope v2).",
    )

    @field_validator("ml_kem_public_key", "ml_dsa_public_key", "x25519_public_key")
    @classmethod
    def validate_base64(cls, v: str | None, info) -> str | None:
        if v is None:
            return v
        if not _is_valid_base64(v):
            raise ValueError(f"{info.field_name} must be valid base64-encoded data.")
        return v


class ClientRegisterResponse(BaseModel):
    client_id: str = Field(
        ..., description="Unique QMail client identifier (format: QM-XXXXXXXX).",
        examples=["QM-A1B2C3D4"],
    )
    registration_secret: str | None = Field(
        None,
        description=(
            "One-time registration secret. Present only on first registration; "
            "null when the email was already registered."
        ),
    )
    status: str = Field(default="registered")


class ClientInfoResponse(BaseModel):
    client_id: str
    email: str
    name: str
    ml_kem_public_key: str
    ml_dsa_public_key: str
    x25519_public_key: str | None = None
    key_version: int = 1
    created_at: datetime

    model_config = {"from_attributes": True}


class KeyRotateRequest(BaseModel):
    ml_kem_public_key: str = Field(..., min_length=10)
    ml_dsa_public_key: str = Field(..., min_length=10)
    x25519_public_key: str | None = Field(None, min_length=10)

    @field_validator("ml_kem_public_key", "ml_dsa_public_key", "x25519_public_key")
    @classmethod
    def validate_base64(cls, v: str | None, info) -> str | None:
        if v is None:
            return v
        if not _is_valid_base64(v):
            raise ValueError(f"{info.field_name} must be valid base64-encoded data.")
        return v


class KeyRotateResponse(BaseModel):
    client_id: str
    key_version: int
    status: str = "rotated"
