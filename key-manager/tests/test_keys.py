"""
QMail Key Manager — Key & QKD Tests

Tests:
  1.  Public-key retrieval
  2.  Session-key generation (simulated QKD)
  3.  Session-key retrieval by key_id
  4.  Two different clients receive appropriate key material
  5.  Expired key handling (HTTP 410)
  6.  Unauthorized third-party cannot retrieve key → 403
  7.  Sender ≠ recipient validation → 400
  8.  No private-key leakage in key responses
  9.  Non-existent key_id → 404
  10. Non-existent sender/recipient → 404
"""

import base64
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.schema import SessionKey, KeyStatus

pytestmark = pytest.mark.asyncio


# ── Test 1: Public-key retrieval ──────────────────────────────────────────────
async def test_get_public_keys(client: AsyncClient, alice: dict, bob: dict):
    resp = await client.get(
        f"/api/v1/keys/public/{bob['client_id']}",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["client_id"] == bob["client_id"]
    assert data["email"] == "bob@example.com"
    assert "ml_kem_public_key" in data
    assert "ml_dsa_public_key" in data
    assert "x25519_public_key" in data
    assert data["key_version"] == 1
    base64.b64decode(data["ml_kem_public_key"], validate=True)
    base64.b64decode(data["ml_dsa_public_key"], validate=True)


# ── Test 2: Public key endpoint unauthenticated → 401 ─────────────────────────
async def test_public_keys_unauthenticated(client: AsyncClient, bob: dict):
    resp = await client.get(f"/api/v1/keys/public/{bob['client_id']}")
    assert resp.status_code == 401


# ── Test 3: Session-key generation ───────────────────────────────────────────
async def test_session_key_generation(client: AsyncClient, alice: dict, bob: dict):
    resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": bob["client_id"]},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["sender_id"] == alice["client_id"]
    assert data["recipient_id"] == bob["client_id"]
    assert data["algorithm"] == "BB84-QKD-SIM"
    assert data["status"] == "active"
    assert data["key_id"].startswith("KEY-")
    # Key material should be valid base64 of 32 bytes (256-bit)
    raw = base64.b64decode(data["key_material"], validate=True)
    assert len(raw) == 32
    # Expiry should be in the future
    expires = datetime.fromisoformat(data["expires_at"]).replace(tzinfo=None)
    assert expires > datetime.now(timezone.utc).replace(tzinfo=None)


# ── Test 4: Session-key retrieval by key_id ───────────────────────────────────
async def test_session_key_retrieval(client: AsyncClient, alice: dict, bob: dict):
    # Generate a key
    gen_resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": bob["client_id"]},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert gen_resp.status_code == 201
    key_id = gen_resp.json()["key_id"]
    original_material = gen_resp.json()["key_material"]

    # Retrieve by key_id
    get_resp = await client.get(
        f"/api/v1/keys/{key_id}",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["key_material"] == original_material


# ── Test 5: Recipient can also retrieve the key ────────────────────────────────
async def test_recipient_can_retrieve_key(client: AsyncClient, alice: dict, bob: dict):
    gen_resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": bob["client_id"]},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert gen_resp.status_code == 201
    key_id = gen_resp.json()["key_id"]

    # Bob retrieves the shared key
    get_resp = await client.get(
        f"/api/v1/keys/{key_id}",
        headers={"Authorization": f"Bearer {bob['token']}"},
    )
    assert get_resp.status_code == 200
    # Alice and Bob get the same key material
    assert get_resp.json()["key_material"] == gen_resp.json()["key_material"]


# ── Test 6: Unauthorized third-party cannot retrieve key ──────────────────────
async def test_third_party_cannot_retrieve_key(
    client: AsyncClient, alice: dict, bob: dict
):
    # Register a third party
    from tests.conftest import _register_and_login
    charlie = await _register_and_login(client, "Charlie", "charlie@example.com")

    gen_resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": bob["client_id"]},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert gen_resp.status_code == 201
    key_id = gen_resp.json()["key_id"]

    # Charlie should NOT be able to retrieve Alice-Bob's key
    resp = await client.get(
        f"/api/v1/keys/{key_id}",
        headers={"Authorization": f"Bearer {charlie['token']}"},
    )
    assert resp.status_code == 403


# ── Test 7: Expired key returns 410 ──────────────────────────────────────────
async def test_expired_key_returns_410(
    client: AsyncClient, alice: dict, bob: dict, db_session: AsyncSession
):
    gen_resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": bob["client_id"]},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert gen_resp.status_code == 201
    key_id = gen_resp.json()["key_id"]

    # Manually expire the key in DB
    result = await db_session.execute(
        select(SessionKey).where(SessionKey.key_id == key_id)
    )
    key = result.scalar_one()
    key.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
    key.status = KeyStatus.EXPIRED
    await db_session.commit()

    resp = await client.get(
        f"/api/v1/keys/{key_id}",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 410


# ── Test 8: Sender ≠ recipient validation ─────────────────────────────────────
async def test_sender_recipient_same_client(client: AsyncClient, alice: dict):
    resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": alice["client_id"]},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 400


# ── Test 9: Non-existent key_id → 404 ────────────────────────────────────────
async def test_nonexistent_key_id(client: AsyncClient, alice: dict):
    resp = await client.get(
        "/api/v1/keys/KEY-NOTEXIST",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 404


# ── Test 10: Non-existent recipient in key request → 404 ─────────────────────
async def test_nonexistent_recipient_in_key_request(client: AsyncClient, alice: dict):
    resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": "QM-GHOST123"},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 404


# ── Test 11: No private key in key responses ──────────────────────────────────
async def test_no_private_key_in_key_response(client: AsyncClient, alice: dict, bob: dict):
    resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": bob["client_id"]},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    for field in ("private_key", "ml_kem_private_key", "ml_dsa_private_key"):
        assert field not in data


# ── Test 12: End-to-end smoke test (Alice → Key Manager → Bob's public keys) ──
async def test_full_alice_bob_flow(client: AsyncClient, alice: dict, bob: dict):
    """
    Full smoke test matching the required test scenario:
    Alice registers → gets client_id
    Bob registers → gets client_id
    Alice requests Bob's public key
    Alice requests session-key material
    """
    # Alice gets Bob's public keys
    pk_resp = await client.get(
        f"/api/v1/keys/public/{bob['client_id']}",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert pk_resp.status_code == 200
    pk_data = pk_resp.json()
    assert pk_data["client_id"] == bob["client_id"]

    # Alice requests session-key material
    sk_resp = await client.post(
        "/api/v1/keys/request",
        json={"sender_id": alice["client_id"], "recipient_id": bob["client_id"]},
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert sk_resp.status_code == 201
    sk_data = sk_resp.json()
    assert sk_data["algorithm"] == "BB84-QKD-SIM"
    assert sk_data["sender_id"] == alice["client_id"]
    assert sk_data["recipient_id"] == bob["client_id"]


async def test_directory_lookup_by_email(client: AsyncClient, alice: dict, bob: dict):
    resp = await client.get(
        "/api/v1/keys/directory/bob@example.com",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["client_id"] == bob["client_id"]
    assert data["email"] == "bob@example.com"
    assert "ml_kem_public_key" in data
    assert "x25519_public_key" in data
    assert data["key_version"] == 1


async def test_directory_lookup_not_found(client: AsyncClient, alice: dict):
    resp = await client.get(
        "/api/v1/keys/directory/nobody@example.com",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert resp.status_code == 404


async def test_directory_lookup_unauthenticated(client: AsyncClient, bob: dict):
    resp = await client.get("/api/v1/keys/directory/bob@example.com")
    assert resp.status_code == 401
