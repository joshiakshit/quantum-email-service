"""
QuMail Key Manager — Pydantic Models for Clients

Request/response schemas for client registration and retrieval.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import base64


def _is_valid_base64(value: str) -> bool:
    """Return True if the string is valid base64."""
    try:
        base64.b64decode(value, validate=True)
        return True
    except Exception:
        return False


class ClientRegisterRequest(BaseModel):
    """Request body for POST /api/v1/clients/register"""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Human-readable name for the QuMail client.",
        examples=["Alice"],
    )
    ml_kem_public_key: str = Field(
        ...,
        min_length=10,
        description="Base64-encoded ML-KEM public key (provided by M1 Crypto Module).",
    )
    ml_dsa_public_key: str = Field(
        ...,
        min_length=10,
        description="Base64-encoded ML-DSA public key (provided by M1 Crypto Module).",
    )

    @field_validator("ml_kem_public_key", "ml_dsa_public_key")
    @classmethod
    def validate_base64(cls, v: str, info) -> str:
        if not _is_valid_base64(v):
            raise ValueError(f"{info.field_name} must be valid base64-encoded data.")
        return v


class ClientRegisterResponse(BaseModel):
    """Response body for POST /api/v1/clients/register"""

    client_id: str = Field(
        ...,
        description="Unique QuMail client identifier (format: QM-XXXXXXXX).",
        examples=["QM-A1B2C3D4"],
    )
    registration_secret: str = Field(
        ...,
        description=(
            "One-time registration secret. Use this to obtain JWT tokens. "
            "This value is shown ONCE and never stored in plaintext. "
            "Store it securely on your client device."
        ),
    )
    status: str = Field(default="registered")


class ClientInfoResponse(BaseModel):
    """Response body for GET /api/v1/clients/{client_id}"""

    client_id: str
    name: str
    ml_kem_public_key: str
    ml_dsa_public_key: str
    created_at: datetime

    model_config = {"from_attributes": True}
