"""
QMail Key Manager — QKD Service Unit Tests

Tests the QKDService class in isolation (no HTTP layer).
"""

import base64
import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.database.database import Base
from app.database.schema import SessionKey, KeyStatus
from app.services.qkd_service import QKDService

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def qkd_db():
    """In-memory DB session for QKD service unit tests."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )
    async with SessionLocal() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
def qkd():
    return QKDService()


# ── Test 1: Key generation returns valid structure ────────────────────────────
async def test_generate_key_structure(qkd: QKDService, qkd_db: AsyncSession):
    key = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    assert key.key_id.startswith("KEY-")
    assert key.sender_id == "QM-ALICE001"
    assert key.recipient_id == "QM-BOB00001"
    assert key.algorithm == "BB84-QKD-SIM"
    assert key.status == KeyStatus.ACTIVE


# ── Test 2: Key material is valid 256-bit base64 ──────────────────────────────
async def test_generate_key_material_length(qkd: QKDService, qkd_db: AsyncSession):
    key = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    raw = base64.b64decode(key.key_material, validate=True)
    assert len(raw) == 32  # 256-bit


# ── Test 3: Each call generates unique key material ───────────────────────────
async def test_generate_key_uniqueness(qkd: QKDService, qkd_db: AsyncSession):
    key1 = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    key2 = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    assert key1.key_material != key2.key_material
    assert key1.key_id != key2.key_id


# ── Test 4: Key expiry is set correctly ───────────────────────────────────────
async def test_generate_key_expiry(qkd: QKDService, qkd_db: AsyncSession):
    key = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    assert key.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
    expected = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=24)
    delta = abs((key.expires_at - expected).total_seconds())
    assert delta < 10


# ── Test 5: Retrieve key as sender ───────────────────────────────────────────
async def test_retrieve_key_as_sender(qkd: QKDService, qkd_db: AsyncSession):
    key = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    await qkd_db.commit()
    retrieved = await qkd.retrieve_key(qkd_db, key.key_id, "QM-ALICE001")
    assert retrieved.key_id == key.key_id
    assert retrieved.key_material == key.key_material


# ── Test 6: Retrieve key as recipient ────────────────────────────────────────
async def test_retrieve_key_as_recipient(qkd: QKDService, qkd_db: AsyncSession):
    key = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    await qkd_db.commit()
    retrieved = await qkd.retrieve_key(qkd_db, key.key_id, "QM-BOB00001")
    assert retrieved.key_id == key.key_id


# ── Test 7: Third party cannot retrieve key → 403 ────────────────────────────
async def test_retrieve_key_unauthorized(qkd: QKDService, qkd_db: AsyncSession):
    from fastapi import HTTPException
    key = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    await qkd_db.commit()
    with pytest.raises(HTTPException) as exc_info:
        await qkd.retrieve_key(qkd_db, key.key_id, "QM-CHARLIE1")
    assert exc_info.value.status_code == 403


# ── Test 8: Non-existent key → 404 ───────────────────────────────────────────
async def test_retrieve_nonexistent_key(qkd: QKDService, qkd_db: AsyncSession):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await qkd.retrieve_key(qkd_db, "KEY-NOTEXIST", "QM-ALICE001")
    assert exc_info.value.status_code == 404


# ── Test 9: Expired key → 410 ────────────────────────────────────────────────
async def test_retrieve_expired_key(qkd: QKDService, qkd_db: AsyncSession):
    from fastapi import HTTPException
    key = await qkd.generate_key(qkd_db, "QM-ALICE001", "QM-BOB00001")
    key.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
    key.status = KeyStatus.EXPIRED
    await qkd_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await qkd.retrieve_key(qkd_db, key.key_id, "QM-ALICE001")
    assert exc_info.value.status_code == 410


# ── Test 10: expire_keys batch operation ──────────────────────────────────────
async def test_expire_keys_batch(qkd: QKDService, qkd_db: AsyncSession):
    # Generate 3 keys and manually push their expiry into the past
    for i in range(3):
        k = await qkd.generate_key(qkd_db, f"QM-S{i:07d}", f"QM-R{i:07d}")
        k.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1)
    await qkd_db.commit()

    expired_count = await qkd.expire_keys(qkd_db)
    assert expired_count == 3
