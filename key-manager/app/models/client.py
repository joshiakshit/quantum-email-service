from datetime import datetime
from pydantic import BaseModel, Field, field_validator
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
    ml_kem_public_key: str = Field(
        ..., min_length=10,
        description="Base64-encoded ML-KEM public key.",
    )
    ml_dsa_public_key: str = Field(
        ..., min_length=10,
        description="Base64-encoded ML-DSA public key.",
    )

    @field_validator("ml_kem_public_key", "ml_dsa_public_key")
    @classmethod
    def validate_base64(cls, v: str, info) -> str:
        if not _is_valid_base64(v):
            raise ValueError(f"{info.field_name} must be valid base64-encoded data.")
        return v


class ClientRegisterResponse(BaseModel):
    client_id: str = Field(
        ..., description="Unique QMail client identifier (format: QM-XXXXXXXX).",
        examples=["QM-A1B2C3D4"],
    )
    registration_secret: str = Field(
        ..., description=(
            "One-time registration secret. Store it securely — "
            "this value is shown once and never stored in plaintext."
        ),
    )
    status: str = Field(default="registered")


class ClientInfoResponse(BaseModel):
    client_id: str
    name: str
    ml_kem_public_key: str
    ml_dsa_public_key: str
    created_at: datetime

    model_config = {"from_attributes": True}
