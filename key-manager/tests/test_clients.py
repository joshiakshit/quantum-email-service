"""
QuMail Key Manager — Client Tests

Tests:
  1.  Client registration success
  2.  Duplicate client registration → 409
  3.  Get client info (authenticated)
  4.  Get client info without JWT → 401
  5.  Invalid client ID → 404
  6.  No private-key leakage in any response
  7.  client_id format validation (QM-XXXXXXXX)
  8.  Registration secret is returned once
"""

import pytest
from httpx import AsyncClient

from tests.conftest import FAKE_ML_KEM_KEY, FAKE_ML_DSA_KEY

pytestmark = pytest.mark.asyncio


# ── Test 1: Successful registration ───────────────────────────────────────────
async def test_client_registration_success(client: AsyncClient):
    resp = await client.post(
        "/api/v1/clients/register",
        json={
            "name": "TestUser",
            "ml_kem_public_key": FAKE_ML_KEM_KEY,
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "registered"
    assert data["client_id"].startswith("QM-")
    assert len(data["client_id"]) == 11   # "QM-" + 8 hex chars
    assert "registration_secret" in data
    assert len(data["registration_secret"]) > 10


# ── Test 2: Duplicate registration → 409 ──────────────────────────────────────
async def test_duplicate_registration(client: AsyncClient):
    payload = {
        "name": "DuplicateUser",
        "ml_kem_public_key": FAKE_ML_KEM_KEY,
        "ml_dsa_public_key": FAKE_ML_DSA_KEY,
    }
    first = await client.post("/api/v1/clients/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/clients/register", json=payload)
    assert second.status_code == 409
    assert "already registered" in second.json()["detail"].lower()


# ── Test 3: Get client info (authenticated) ────────────────────────────────────
async def test_get_client_info_authenticated(client: AsyncClient, alice: dict):
    resp = await client.get(
        f"/api/v1/clients/{alice['client_id']}",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["client_id"] == alice["client_id"]
    assert data["name"] == "Alice"
    assert "ml_kem_public_key" in data
    assert "ml_dsa_public_key" in data


# ── Test 4: Unauthenticated access → 401 ──────────────────────────────────────
async def test_get_client_info_unauthenticated(client: AsyncClient, alice: dict):
    resp = await client.get(f"/api/v1/clients/{alice['client_id']}")
    assert resp.status_code == 401


# ── Test 5: Invalid client ID → 404 ───────────────────────────────────────────
async def test_get_invalid_client(client: AsyncClient, alice: dict):
    resp = await client.get(
        "/api/v1/clients/QM-NONEXIST",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 404


# ── Test 6: No private key leakage ────────────────────────────────────────────
async def test_no_private_key_in_registration_response(client: AsyncClient):
    resp = await client.post(
        "/api/v1/clients/register",
        json={
            "name": "SecureUser",
            "ml_kem_public_key": FAKE_ML_KEM_KEY,
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    # Ensure no private key fields are present
    for field in ("private_key", "ml_kem_private_key", "ml_dsa_private_key", "secret_key"):
        assert field not in data, f"Private key field '{field}' found in response!"


async def test_no_private_key_in_client_info(client: AsyncClient, alice: dict):
    resp = await client.get(
        f"/api/v1/clients/{alice['client_id']}",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    for field in ("private_key", "ml_kem_private_key", "ml_dsa_private_key", "hashed_secret"):
        assert field not in data, f"Sensitive field '{field}' found in client info response!"


# ── Test 7: client_id format ──────────────────────────────────────────────────
async def test_client_id_format(client: AsyncClient):
    resp = await client.post(
        "/api/v1/clients/register",
        json={
            "name": "FormatUser",
            "ml_kem_public_key": FAKE_ML_KEM_KEY,
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
        },
    )
    assert resp.status_code == 201
    cid = resp.json()["client_id"]
    parts = cid.split("-")
    assert parts[0] == "QM"
    assert len(parts[1]) == 8
    assert parts[1].isupper()


# ── Test 8: Invalid public key (not base64) → 422 ────────────────────────────
async def test_invalid_public_key_format(client: AsyncClient):
    resp = await client.post(
        "/api/v1/clients/register",
        json={
            "name": "BadKeyUser",
            "ml_kem_public_key": "not-valid-base64!!!",
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
        },
    )
    assert resp.status_code == 422


# ── Test 9: Health endpoint ───────────────────────────────────────────────────
async def test_health_endpoint(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
