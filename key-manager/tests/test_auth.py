"""
QuMail Key Manager — Auth Tests

Tests:
  1.  Obtain JWT token with valid credentials
  2.  Reject token with wrong secret → 401
  3.  Reject token with wrong client_id → 401
  4.  Access protected endpoint without token → 401
  5.  Access protected endpoint with expired/invalid JWT → 401
  6.  Token format is valid (Bearer JWT structure)
"""

import pytest
from httpx import AsyncClient

from tests.conftest import FAKE_ML_KEM_KEY, FAKE_ML_DSA_KEY

pytestmark = pytest.mark.asyncio


# ── Test 1: Successful token issuance ─────────────────────────────────────────
async def test_get_token_success(client: AsyncClient, alice: dict):
    # alice fixture already tested this — just verify structure
    assert len(alice["token"]) > 20
    parts = alice["token"].split(".")
    assert len(parts) == 3  # JWT has header.payload.signature


# ── Test 2: Wrong secret → 401 ────────────────────────────────────────────────
async def test_token_wrong_secret(client: AsyncClient, alice: dict):
    resp = await client.post(
        "/api/v1/auth/token",
        json={"client_id": alice["client_id"], "registration_secret": "wrong-secret"},
    )
    assert resp.status_code == 401


# ── Test 3: Wrong client_id → 401 ─────────────────────────────────────────────
async def test_token_wrong_client_id(client: AsyncClient, alice: dict):
    resp = await client.post(
        "/api/v1/auth/token",
        json={
            "client_id": "QM-NOTEXIST",
            "registration_secret": alice["registration_secret"],
        },
    )
    assert resp.status_code == 401


# ── Test 4: Missing Authorization header → 401 ────────────────────────────────
async def test_protected_endpoint_no_token(client: AsyncClient, alice: dict):
    resp = await client.get(f"/api/v1/clients/{alice['client_id']}")
    assert resp.status_code == 401


# ── Test 5: Invalid/tampered JWT → 401 ────────────────────────────────────────
async def test_protected_endpoint_invalid_jwt(client: AsyncClient, alice: dict):
    resp = await client.get(
        f"/api/v1/clients/{alice['client_id']}",
        headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
    )
    assert resp.status_code == 401


# ── Test 6: Token expires_in field is present and positive ────────────────────
async def test_token_expires_in_field(client: AsyncClient):
    # Register a fresh user
    reg_resp = await client.post(
        "/api/v1/clients/register",
        json={
            "name": "TokenTester",
            "ml_kem_public_key": FAKE_ML_KEM_KEY,
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
        },
    )
    assert reg_resp.status_code == 201
    data = reg_resp.json()

    token_resp = await client.post(
        "/api/v1/auth/token",
        json={
            "client_id": data["client_id"],
            "registration_secret": data["registration_secret"],
        },
    )
    assert token_resp.status_code == 200
    token_data = token_resp.json()
    assert token_data["token_type"] == "bearer"
    assert token_data["expires_in"] > 0
