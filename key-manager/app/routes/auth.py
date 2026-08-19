"""
QuMail Key Manager — Auth Routes

POST /api/v1/auth/token  — exchange client_id + registration_secret for a JWT
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.models.key import TokenRequest, TokenResponse
from app.security.jwt import create_access_token
from app.services.client_service import verify_client_secret

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="Obtain JWT access token",
    description=(
        "Exchange your `client_id` and `registration_secret` (returned once at "
        "registration) for a JWT Bearer token. Include this token in the "
        "`Authorization: Bearer <token>` header for all protected endpoints."
    ),
)
async def get_token(
    body: TokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    client = await verify_client_secret(db, body.client_id, body.registration_secret)
    token, expires_in = create_access_token(client.client_id)
    return TokenResponse(access_token=token, expires_in=expires_in)
