"""
QMail Key Manager — Client Tests

Tests:
  1.  Client registration success
  2.  Duplicate client registration is idempotent
  3.  Get client info (authenticated)
  4.  Get client info without JWT → 401
  5.  Invalid client ID → 404
  6.  No private-key leakage in any response
  7.  client_id format validation (QM-XXXXXXXX)
  8.  Registration secret is returned once
"""

import pytest
from httpx import AsyncClient

from tests.conftest import FAKE_ML_KEM_KEY, FAKE_ML_DSA_KEY, FAKE_X25519_KEY

pytestmark = pytest.mark.asyncio


# ── Test 1: Successful registration ───────────────────────────────────────────
async def test_client_registration_success(client: AsyncClient):
    resp = await client.post(
        "/api/v1/clients/register",
        json={
            "name": "TestUser",
            "email": "testuser@example.com",
            "ml_kem_public_key": FAKE_ML_KEM_KEY,
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
            "x25519_public_key": FAKE_X25519_KEY,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "registered"
    assert data["client_id"].startswith("QM-")
    assert len(data["client_id"]) == 11
    assert "registration_secret" in data
    assert len(data["registration_secret"]) > 10


# ── Test 2: Duplicate registration is idempotent ──────────────────────────────
async def test_duplicate_registration(client: AsyncClient):
    payload = {
        "name": "DuplicateUser",
        "email": "duplicate@example.com",
        "ml_kem_public_key": FAKE_ML_KEM_KEY,
        "ml_dsa_public_key": FAKE_ML_DSA_KEY,
    }
    first = await client.post("/api/v1/clients/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/clients/register", json=payload)
    assert second.status_code == 200
    data = second.json()
    assert data["status"] == "already_registered"
    assert data["client_id"] == first.json()["client_id"]
    assert data["registration_secret"] is None


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
    assert data["email"] == "alice@example.com"
    assert "ml_kem_public_key" in data
    assert "ml_dsa_public_key" in data
    assert "x25519_public_key" in data
    assert data["key_version"] == 1


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
            "email": "secure@example.com",
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
            "email": "format@example.com",
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
            "email": "badkey@example.com",
            "ml_kem_public_key": "not-valid-base64!!!",
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
        },
    )
    assert resp.status_code == 422


async def test_health_endpoint(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_duplicate_email_registration(client: AsyncClient):
    base = {
        "ml_kem_public_key": FAKE_ML_KEM_KEY,
        "ml_dsa_public_key": FAKE_ML_DSA_KEY,
    }
    first = await client.post(
        "/api/v1/clients/register",
        json={"name": "UserA", "email": "shared@example.com", **base},
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/clients/register",
        json={"name": "UserB", "email": "shared@example.com", **base},
    )
    assert second.status_code == 200
    data = second.json()
    assert data["status"] == "already_registered"
    assert data["client_id"] == first.json()["client_id"]
    assert data["registration_secret"] is None


async def test_key_rotation(client: AsyncClient, alice: dict):
    new_kem = FAKE_ML_KEM_KEY
    new_dsa = FAKE_ML_DSA_KEY
    new_x25519 = FAKE_X25519_KEY

    resp = await client.put(
        "/api/v1/clients/keys/rotate",
        json={
            "ml_kem_public_key": new_kem,
            "ml_dsa_public_key": new_dsa,
            "x25519_public_key": new_x25519,
        },
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["client_id"] == alice["client_id"]
    assert data["key_version"] == 2
    assert data["status"] == "rotated"


async def test_key_rotation_increments_version(client: AsyncClient, alice: dict):
    payload = {
        "ml_kem_public_key": FAKE_ML_KEM_KEY,
        "ml_dsa_public_key": FAKE_ML_DSA_KEY,
    }
    headers = {"Authorization": f"Bearer {alice['token']}"}

    r1 = await client.put("/api/v1/clients/keys/rotate", json=payload, headers=headers)
    assert r1.json()["key_version"] == 2

    r2 = await client.put("/api/v1/clients/keys/rotate", json=payload, headers=headers)
    assert r2.json()["key_version"] == 3


async def test_key_rotation_unauthenticated(client: AsyncClient):
    resp = await client.put(
        "/api/v1/clients/keys/rotate",
        json={
            "ml_kem_public_key": FAKE_ML_KEM_KEY,
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
        },
    )
    assert resp.status_code == 401
