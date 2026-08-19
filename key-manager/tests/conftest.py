"""
QuMail Key Manager — Test Fixtures (conftest.py)

Provides:
  - In-memory SQLite test database (isolated per test)
  - Async test client
  - Pre-registered Alice and Bob clients
  - Valid JWT tokens for Alice and Bob
"""

import base64
import secrets
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.main import app
from app.database.database import Base, get_db
from app.config import get_settings

settings = get_settings()

# ── Fake ML-KEM / ML-DSA public keys (random base64 for test purposes) ────────
FAKE_ML_KEM_KEY = base64.b64encode(secrets.token_bytes(64)).decode()
FAKE_ML_DSA_KEY = base64.b64encode(secrets.token_bytes(64)).decode()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create a fresh in-memory SQLite engine for each test."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    """Yield an async session for the in-memory test DB."""
    SessionLocal = async_sessionmaker(
        bind=db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """
    Async HTTP test client with the in-memory DB injected.
    All requests go through the real FastAPI app but with an isolated DB.
    """
    async def override_get_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Helper: register a client and get JWT ─────────────────────────────────────

async def _register_and_login(http_client: AsyncClient, name: str) -> dict:
    """Register a client and return {client_id, token, registration_secret}."""
    reg_resp = await http_client.post(
        "/api/v1/clients/register",
        json={
            "name": name,
            "ml_kem_public_key": FAKE_ML_KEM_KEY,
            "ml_dsa_public_key": FAKE_ML_DSA_KEY,
        },
    )
    assert reg_resp.status_code == 201, reg_resp.text
    data = reg_resp.json()
    client_id = data["client_id"]
    secret = data["registration_secret"]

    token_resp = await http_client.post(
        "/api/v1/auth/token",
        json={"client_id": client_id, "registration_secret": secret},
    )
    assert token_resp.status_code == 200, token_resp.text
    token = token_resp.json()["access_token"]

    return {"client_id": client_id, "token": token, "registration_secret": secret}


@pytest_asyncio.fixture
async def alice(client):
    """Pre-registered Alice client with JWT token."""
    return await _register_and_login(client, "Alice")


@pytest_asyncio.fixture
async def bob(client):
    """Pre-registered Bob client with JWT token."""
    return await _register_and_login(client, "Bob")
