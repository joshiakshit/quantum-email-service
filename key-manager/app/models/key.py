"""
QuMail Key Manager — Pydantic Models for Keys

Request/response schemas for public-key retrieval and session-key material.
"""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class PublicKeyResponse(BaseModel):
    """Response body for GET /api/v1/keys/public/{client_id}"""

    client_id: str
    name: str
    ml_kem_public_key: str = Field(
        ...,
        description="Base64-encoded ML-KEM public key for this recipient.",
    )
    ml_dsa_public_key: str = Field(
        ...,
        description="Base64-encoded ML-DSA public key for this recipient.",
    )

    model_config = {"from_attributes": True}


class SessionKeyRequest(BaseModel):
    """Request body for POST /api/v1/keys/request"""

    sender_id: str = Field(
        ...,
        description="client_id of the sender.",
        examples=["QM-ALICE001"],
    )
    recipient_id: str = Field(
        ...,
        description="client_id of the recipient.",
        examples=["QM-BOB00001"],
    )


class SessionKeyResponse(BaseModel):
    """
    Response body for POST /api/v1/keys/request and GET /api/v1/keys/{key_id}

    DISCLAIMER: The algorithm field will always be 'SIMULATED-QKD' for the MVP.
    This does NOT represent real quantum key distribution.
    """

    key_id: str = Field(..., description="Unique session key identifier.")
    sender_id: str
    recipient_id: str
    key_material: str = Field(
        ...,
        description=(
            "Base64-encoded session key material (SIMULATED-QKD). "
            "Use this as input to M1 AES-256-GCM encryption."
        ),
    )
    algorithm: Literal["SIMULATED-QKD"] = Field(
        default="SIMULATED-QKD",
        description="Always 'SIMULATED-QKD' for MVP. Replace with real QKD later.",
    )
    created_at: datetime
    expires_at: datetime
    status: str

    model_config = {"from_attributes": True}


class TokenRequest(BaseModel):
    """Request body for POST /api/v1/auth/token"""

    client_id: str = Field(..., description="Your QuMail client_id.")
    registration_secret: str = Field(
        ..., description="The secret returned at registration."
    )


class TokenResponse(BaseModel):
    """Response body for POST /api/v1/auth/token"""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(..., description="Token lifetime in seconds.")
