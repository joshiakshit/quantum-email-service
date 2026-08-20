from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class PublicKeyResponse(BaseModel):
    client_id: str
    name: str
    ml_kem_public_key: str = Field(
        ..., description="Base64-encoded ML-KEM public key for this recipient.",
    )
    ml_dsa_public_key: str = Field(
        ..., description="Base64-encoded ML-DSA public key for this recipient.",
    )

    model_config = {"from_attributes": True}


class SessionKeyRequest(BaseModel):
    sender_id: str = Field(..., description="client_id of the sender.", examples=["QM-ALICE001"])
    recipient_id: str = Field(..., description="client_id of the recipient.", examples=["QM-BOB00001"])


class SessionKeyResponse(BaseModel):
    key_id: str = Field(..., description="Unique session key identifier.")
    sender_id: str
    recipient_id: str
    key_material: str = Field(
        ..., description="Base64-encoded session key material for AES-256-GCM encryption.",
    )
    algorithm: str = Field(
        ..., description="Key generation algorithm used (e.g. BB84-QKD-SIM).",
    )
    created_at: datetime
    expires_at: datetime
    status: str
    qber: float | None = Field(None, description="Quantum bit error rate from BB84 simulation.")

    model_config = {"from_attributes": True}


class TokenRequest(BaseModel):
    client_id: str = Field(..., description="Your QMail client_id.")
    registration_secret: str = Field(..., description="The secret returned at registration.")


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(..., description="Token lifetime in seconds.")
