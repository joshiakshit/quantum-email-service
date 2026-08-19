"""
QuMail Key Manager — FastAPI Application Entry Point

Startup sequence:
  1. Load configuration from environment variables.
  2. Initialize SQLite database (create tables).
  3. Register all API routers.
  4. Expose /health endpoint.

Run with:
    uvicorn app.main:app --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database.database import init_db
from app.routes import auth, clients, keys

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    await init_db()
    logger.info("Database initialised.")
    yield
    logger.info("Shutting down %s.", settings.app_name)


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "## QuMail Key Manager\n\n"
        "A quantum-resistant key distribution service providing:\n"
        "- **Client registration** with ML-KEM / ML-DSA public-key storage\n"
        "- **Public-key retrieval** for recipient lookup\n"
        "- **Simulated QKD session keys** for secure communication bootstrap\n"
        "- **JWT authentication** for all protected endpoints\n\n"
        "> ⚠️ **QKD DISCLAIMER**: Session keys use `SIMULATED-QKD` (CSPRNG). "
        "This does not provide real quantum-key-distribution security."
    ),
    contact={
        "name": "QuMail M2 — Key Manager",
    },
    license_info={"name": "MIT"},
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Adjust origins for production — do not use "*" in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(keys.router)


# ── Health Endpoint ───────────────────────────────────────────────────────────
@app.get(
    "/health",
    tags=["Health"],
    summary="Service health check",
    description="Returns the service name, version, and status. No authentication required.",
)
async def health() -> JSONResponse:
    return JSONResponse(
        content={
            "status": "ok",
            "service": settings.app_name,
            "version": settings.app_version,
        }
    )


# ── Root redirect to docs ─────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")
