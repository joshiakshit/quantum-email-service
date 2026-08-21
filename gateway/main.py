import os
import sys
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Depends, HTTPException, Header, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json

from crypto.pqc import generate_kem_keypair, generate_signing_keypair, generate_x25519_keypair
from crypto.envelope import seal_envelope, open_envelope
from crypto.email_helpers import envelope_to_mime, mime_to_envelope, extract_metadata

from storage.database import init_db, get_db, close_db
from storage.sessions import SessionStore
from storage import repositories as repo

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

session_store = SessionStore()
http_client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(application: FastAPI):
    global http_client
    await init_db()
    await session_store.connect()
    http_client = httpx.AsyncClient(timeout=10.0)
    logger.info("Storage layer initialised")
    yield
    await http_client.aclose()
    await session_store.close()
    await close_db()


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="QMail Gateway", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

ENFORCE_HTTPS = os.environ.get("ENFORCE_HTTPS", "false").lower() == "true"
if ENFORCE_HTTPS:
    app.add_middleware(HTTPSRedirectMiddleware)


class HSTSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        if ENFORCE_HTTPS:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        return response


app.add_middleware(HSTSMiddleware)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    messages = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        messages.append(f"{field}: {error['msg']}" if field else error["msg"])
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})


KM_URL = os.environ.get("QMAIL_KM_URL", "http://localhost:8000")
KM_VERIFY_SSL = os.environ.get("QMAIL_KM_VERIFY_SSL", "true").lower() == "true"
AUTH_SERVICE_URL = os.environ.get("QMAIL_AUTH_URL", "https://auth.joshiakshit.live")

EMAIL_DOMAIN = "qmail.secure"


class LoginReq(BaseModel):
    username: str
    password: str


class RegisterReq(BaseModel):
    first_name: str
    last_name: str
    username: str
    password: str


def _to_email(username: str) -> str:
    if "@" in username:
        return username
    return f"{username}@{EMAIL_DOMAIN}"


class SendReq(BaseModel):
    to_email: str
    subject: str
    body: str


async def _get_session(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.removeprefix("Bearer ").strip()
    s = await session_store.get(token)
    if not s:
        raise HTTPException(401, "Invalid session")
    return s


def _fingerprint(key_bytes: bytes) -> str:
    h = hashlib.sha256(key_bytes).hexdigest().upper()
    return ":".join(h[i:i+2] for i in range(0, 16, 2))


async def _resolve_verify_key(db: AsyncSession, env_json: str) -> bytes | None:
    try:
        sender_id = json.loads(env_json).get("sender_id")
    except Exception:
        return None
    if not sender_id:
        return None
    reg = await repo.get_registered_user(db, sender_id)
    if reg and reg.get("sign_pk"):
        return reg["sign_pk"]
    from crypto.km_client import KeyManagerClient
    km = KeyManagerClient(base_url=KM_URL, verify_ssl=KM_VERIFY_SSL)
    try:
        keys = await run_in_threadpool(km.get_public_keys, sender_id)
        return keys["signing_public_key"]
    except Exception:
        return None


async def _create_session(auth_token: str, db: AsyncSession):
    try:
        resp = await http_client.get(
            f"{AUTH_SERVICE_URL}/api/v1/users/me",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    except httpx.RequestError:
        raise HTTPException(502, "Auth service unreachable")
    if resp.status_code != 200:
        raise HTTPException(401, "Invalid or expired auth token")
    user_info = resp.json()

    email = user_info.get("email", "")
    name = user_info.get("name") or user_info.get("username") or email.split("@")[0]

    cred = await repo.get_credential_by_email(db, email)

    if not cred:
        kem_pk, kem_sk = await run_in_threadpool(generate_kem_keypair)
        sign_pk, sign_sk = await run_in_threadpool(generate_signing_keypair)
        x25519_pk, x25519_sk = await run_in_threadpool(generate_x25519_keypair)

        from crypto.km_client import KeyManagerClient
        km = KeyManagerClient(base_url=KM_URL, verify_ssl=KM_VERIFY_SSL)
        registered = None
        try:
            registered = await run_in_threadpool(km.register, name, email, kem_pk, sign_pk, x25519_pk)
            await run_in_threadpool(km.authenticate, registered["client_id"], registered["registration_secret"])
        except Exception as e:
            # a concurrent first-login may have registered this email; reuse it
            cred = await repo.get_credential_by_email(db, email)
            if not cred:
                raise HTTPException(502, f"Key Manager error: {e}")

        if registered:
            client_id = registered["client_id"]
            cred = {
                "client_id": client_id,
                "name": name,
                "kem_pk": kem_pk,
                "kem_sk": kem_sk,
                "sign_pk": sign_pk,
                "sign_sk": sign_sk,
                "x25519_pk": x25519_pk,
                "x25519_sk": x25519_sk,
                "reg_secret": registered["registration_secret"],
                "registered_at": datetime.now(timezone.utc).isoformat(),
            }
            await repo.save_credential(db, email, cred)
            await repo.save_registered_user(db, client_id, {
                "name": name, "email": email,
                "kem_pk": kem_pk, "sign_pk": sign_pk, "x25519_pk": x25519_pk,
            })
            await repo.save_email_mapping(db, email, client_id)

    token = secrets.token_hex(32)
    await session_store.set(token, {
        "client_id": cred["client_id"],
        "name": cred["name"],
        "email": email,
        "kem_pk": cred["kem_pk"],
        "kem_sk": cred["kem_sk"],
        "sign_pk": cred["sign_pk"],
        "sign_sk": cred["sign_sk"],
        "x25519_pk": cred.get("x25519_pk"),
        "x25519_sk": cred.get("x25519_sk"),
        "reg_secret": cred["reg_secret"],
        "registered_at": cred["registered_at"],
    })

    return {
        "token": token,
        "client_id": cred["client_id"],
        "name": cred["name"],
        "email": email,
        "kem_fingerprint": _fingerprint(cred["kem_pk"]),
        "signing_fingerprint": _fingerprint(cred["sign_pk"]),
    }


@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def auth_login(request: Request, req: LoginReq, db: AsyncSession = Depends(get_db)):
    email = _to_email(req.username)
    try:
        resp = await http_client.post(
            f"{AUTH_SERVICE_URL}/api/v1/auth/login",
            json={"email": email, "password": req.password},
        )
    except httpx.RequestError:
        raise HTTPException(502, "Auth service unreachable")

    if resp.status_code != 200:
        detail = resp.json().get("detail", "Invalid username or password")
        if not isinstance(detail, str):
            detail = "; ".join(str(e.get("msg", e)) if isinstance(e, dict) else str(e) for e in detail) if isinstance(detail, list) else str(detail)
        raise HTTPException(resp.status_code, detail)

    auth_token = resp.json().get("access_token")
    return await _create_session(auth_token, db)


@app.post("/api/auth/register")
@limiter.limit("3/minute")
async def auth_register(request: Request, req: RegisterReq, db: AsyncSession = Depends(get_db)):
    email = _to_email(req.username)
    name = f"{req.first_name} {req.last_name}".strip()
    try:
        resp = await http_client.post(
            f"{AUTH_SERVICE_URL}/api/v1/auth/register",
            json={"email": email, "password": req.password, "name": name},
        )
    except httpx.RequestError:
        raise HTTPException(502, "Auth service unreachable")

    if resp.status_code not in (200, 201):
        detail = resp.json().get("detail", "Registration failed")
        if not isinstance(detail, str):
            detail = "; ".join(str(e.get("msg", e)) if isinstance(e, dict) else str(e) for e in detail) if isinstance(detail, list) else str(detail)
        raise HTTPException(resp.status_code, detail)

    try:
        login_resp = await http_client.post(
            f"{AUTH_SERVICE_URL}/api/v1/auth/login",
            json={"email": email, "password": req.password},
        )
    except httpx.RequestError:
        raise HTTPException(502, "Auth service unreachable")
    if login_resp.status_code != 200:
        raise HTTPException(500, "Account created but auto-login failed")

    auth_token = login_resp.json().get("access_token")
    return await _create_session(auth_token, db)


@app.get("/api/auth/status")
async def auth_status(authorization: str = Header(None)):
    s = await _get_session(authorization)
    return {
        "client_id": s["client_id"],
        "name": s["name"],
        "email": s["email"],
        "kem_fingerprint": _fingerprint(s["kem_pk"]),
        "signing_fingerprint": _fingerprint(s["sign_pk"]),
        "registered_at": s["registered_at"],
    }


@app.post("/api/auth/logout")
async def logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        await session_store.delete(token)
    return {"status": "ok"}


@app.get("/api/emails")
async def get_emails(
    folder: str = Query("inbox"),
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    s = await _get_session(authorization)
    result = []

    if folder == "inbox":
        messages = await repo.get_inbox(db, s["email"])
        for i, msg in enumerate(messages):
            raw = msg.raw_mime or ""
            meta = extract_metadata(raw)
            try:
                env_json = mime_to_envelope(raw)
                sender_verify_key = await _resolve_verify_key(db, env_json)
                plaintext = await run_in_threadpool(
                    open_envelope, env_json, s["kem_sk"], s.get("x25519_sk"), sender_verify_key,
                )
                body = plaintext.decode("utf-8", errors="replace")
                encrypted = True
                fp = _fingerprint(s["kem_pk"])
            except Exception:
                body = "(decryption failed)"
                encrypted = False
                fp = ""

            sender_full = meta.get("from", "Unknown")
            sender_name = sender_full.split("<")[0].strip() if "<" in sender_full else sender_full
            sender_email = sender_full.split("<")[1].rstrip(">") if "<" in sender_full else sender_full

            ts = msg.created_at or datetime.now(timezone.utc)
            result.append({
                "id": msg.id,
                "folder": "inbox",
                "sender": sender_name,
                "senderEmail": sender_email,
                "subject": meta.get("subject", "(no subject)"),
                "preview": body[:80] + ("…" if len(body) > 80 else ""),
                "body": body,
                "time": ts.strftime("%H:%M"),
                "fullDate": ts.strftime("%d %b %Y at %H:%M UTC"),
                "encrypted": encrypted,
                "fingerprint": fp,
                "unread": not msg.is_read,
                "avatarIdx": i % 4,
                "label": "", "labelBg": "", "labelColor": "",
            })
    elif folder == "sent":
        messages = await repo.get_sent(db, s["email"])
        for i, msg in enumerate(messages):
            ts = msg.created_at or datetime.now(timezone.utc)
            result.append({
                "id": msg.id,
                "folder": "sent",
                "sender": "You",
                "senderEmail": s["email"],
                "subject": msg.subject,
                "preview": (msg.body or "")[:80],
                "body": msg.body or "",
                "time": ts.strftime("%H:%M"),
                "fullDate": ts.strftime("%d %b %Y at %H:%M UTC"),
                "encrypted": True,
                "fingerprint": _fingerprint(s["sign_pk"]),
                "unread": False,
                "avatarIdx": 0,
                "label": "", "labelBg": "", "labelColor": "",
            })

    return {"emails": result}


@app.post("/api/emails/send")
async def send_email(
    req: SendReq,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    s = await _get_session(authorization)

    recipient_client_id = await repo.get_client_id_by_email(db, req.to_email)
    if not recipient_client_id:
        raise HTTPException(404, "Recipient not registered")

    recipient_kem_pk = None
    recipient_x25519_pk = None

    reg_user = await repo.get_registered_user(db, recipient_client_id)
    if reg_user:
        recipient_kem_pk = reg_user["kem_pk"]
        recipient_x25519_pk = reg_user.get("x25519_pk")

    if not (recipient_kem_pk and recipient_x25519_pk):
        from crypto.km_client import KeyManagerClient
        km = KeyManagerClient(base_url=KM_URL, verify_ssl=KM_VERIFY_SSL)
        try:
            keys = await run_in_threadpool(km.get_public_keys, recipient_client_id)
            recipient_kem_pk = keys["kem_public_key"]
            recipient_x25519_pk = keys.get("x25519_public_key")
        except Exception:
            pass

    if not recipient_kem_pk or not recipient_x25519_pk:
        raise HTTPException(404, "Recipient not registered or missing hybrid KEM keys")

    env_json = await run_in_threadpool(
        seal_envelope,
        req.body.encode("utf-8"),
        recipient_kem_pk,
        s["sign_sk"],
        s["client_id"],
        recipient_client_id,
        recipient_x25519_pk=recipient_x25519_pk,
        subject=req.subject,
    )
    mime_msg = envelope_to_mime(env_json, s["email"], req.to_email, req.subject)

    smtp_host = os.environ.get("QMAIL_SMTP_HOST")
    if smtp_host:
        from email_pipeline.Smtp_sender import send_mime_message
        from email_pipeline.config import SMTPConfig
        await run_in_threadpool(send_mime_message, mime_msg, SMTPConfig.from_env())

    await repo.append_to_inbox(db, req.to_email, mime_msg.as_string())
    await repo.append_to_sent(db, s["email"], req.to_email, req.subject, req.body)

    return {
        "status": "sent",
        "encrypted": True,
        "algorithm": "ML-KEM-768 + ML-DSA-65 + AES-256-GCM",
        "fingerprint": _fingerprint(s["sign_pk"]),
    }


@app.get("/api/keys/info")
async def keys_info(authorization: str = Header(None)):
    s = await _get_session(authorization)
    return {
        "client_id": s["client_id"],
        "kem_algorithm": "ML-KEM-768",
        "signing_algorithm": "ML-DSA-65",
        "kem_fingerprint": _fingerprint(s["kem_pk"]),
        "signing_fingerprint": _fingerprint(s["sign_pk"]),
        "registered_at": s["registered_at"],
        "km_url": KM_URL,
        "km_status": "connected",
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "QMail Gateway"}


frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend-build")
if os.path.isdir(frontend_dir):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
