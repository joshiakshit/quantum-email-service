import os
import sys
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Hash import SHA256

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
import base64

from crypto.email_helpers import envelope_to_mime, mime_to_envelope, extract_metadata

from storage.database import init_db, get_db, close_db
from storage.sessions import SessionStore
from storage import repositories as repo

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ephemeral RSA-OAEP key pair — generated once per process, never persisted.
# The public key is served to clients so they can encrypt the login password
# before sending it. The private key decrypts it here before forwarding to
# the auth service. This prevents plaintext passwords from appearing in
# network payloads (DevTools, proxy logs, etc.).
# ---------------------------------------------------------------------------
_rsa_key = RSA.generate(2048)
_rsa_private_key = _rsa_key
_rsa_public_key_b64 = _rsa_key.publickey().export_key("DER")
import base64 as _b64mod
_rsa_public_key_b64 = _b64mod.b64encode(_rsa_public_key_b64).decode("ascii")
logger.info("Ephemeral RSA-2048 OAEP key pair generated")


def _decrypt_password(encrypted_password: str) -> str:
    """Decrypt a Base64-encoded RSA-OAEP ciphertext from the frontend."""
    try:
        ciphertext = _b64mod.b64decode(encrypted_password)
        cipher = PKCS1_OAEP.new(_rsa_private_key, hashAlgo=SHA256)
        return cipher.decrypt(ciphertext).decode("utf-8")
    except Exception:
        raise HTTPException(400, "Invalid encrypted_password")


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
    encrypted_password: str  # RSA-OAEP encrypted by the client; decrypted here


class RegisterReq(BaseModel):
    first_name: str
    last_name: str
    username: str
    encrypted_password: str  # RSA-OAEP encrypted by the client; decrypted here


def _to_email(username: str) -> str:
    if "@" in username:
        return username
    return f"{username}@{EMAIL_DOMAIN}"


class SendReq(BaseModel):
    to_email: str
    subject: str
    recipient_envelope: str
    self_envelope: str


class RegisterKeysReq(BaseModel):
    kem_pk: str
    sign_pk: str
    x25519_pk: str


class VaultBlobReq(BaseModel):
    salt: str
    iv: str
    ciphertext: str


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    return authorization.removeprefix("Bearer ").strip()


async def _get_session(authorization: str | None) -> dict:
    s = await session_store.get(_bearer_token(authorization))
    if not s:
        raise HTTPException(401, "Invalid session")
    return s


def _fingerprint(key_bytes: bytes) -> str:
    h = hashlib.sha256(key_bytes).hexdigest().upper()
    return ":".join(h[i:i+2] for i in range(0, 16, 2))


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


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


async def _store_session(token: str, email: str, name: str, cred: dict | None) -> None:
    data: dict = {"email": email, "name": name}
    if cred:
        data.update({
            "client_id": cred["client_id"],
            "name": cred["name"],
            "kem_pk": cred["kem_pk"],
            "sign_pk": cred["sign_pk"],
            "x25519_pk": cred.get("x25519_pk"),
            "reg_secret": cred["reg_secret"],
            "registered_at": cred["registered_at"],
        })
    await session_store.set(token, data)


def _session_response(token: str, email: str, name: str, cred: dict | None) -> dict:
    registered = cred is not None
    return {
        "token": token,
        "client_id": cred["client_id"] if registered else "",
        "name": cred["name"] if registered else name,
        "email": email,
        "keys_registered": registered,
        "kem_fingerprint": _fingerprint(cred["kem_pk"]) if registered else "",
        "signing_fingerprint": _fingerprint(cred["sign_pk"]) if registered else "",
    }


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

    # Secret keys never touch the server; the client generates them and posts only
    # its public keys via /api/keys/register on first use.
    cred = await repo.get_credential_by_email(db, email)

    token = secrets.token_hex(32)
    await _store_session(token, email, name, cred)
    return _session_response(token, email, name, cred)


@app.get("/api/auth/public-key")
async def get_auth_public_key():
    """
    Returns the gateway's ephemeral RSA-2048 public key (SPKI DER, Base64-encoded).
    The frontend imports this with SubtleCrypto and uses it to encrypt the login
    password before sending. The key changes on every server restart.
    """
    return {"public_key": _rsa_public_key_b64}


@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def auth_login(request: Request, req: LoginReq, db: AsyncSession = Depends(get_db)):
    email = _to_email(req.username)
    password = _decrypt_password(req.encrypted_password)
    try:
        resp = await http_client.post(
            f"{AUTH_SERVICE_URL}/api/v1/auth/login",
            json={"email": email, "password": password},
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
    password = _decrypt_password(req.encrypted_password)
    try:
        resp = await http_client.post(
            f"{AUTH_SERVICE_URL}/api/v1/auth/register",
            json={"email": email, "password": password, "name": name},
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
            json={"email": email, "password": password},
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
    registered = bool(s.get("client_id"))
    return {
        "client_id": s.get("client_id", ""),
        "name": s["name"],
        "email": s["email"],
        "keys_registered": registered,
        "kem_fingerprint": _fingerprint(s["kem_pk"]) if registered else "",
        "signing_fingerprint": _fingerprint(s["sign_pk"]) if registered else "",
        "registered_at": s.get("registered_at", ""),
    }


@app.post("/api/auth/logout")
async def logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        await session_store.delete(token)
    return {"status": "ok"}


def _registered_response(cred: dict) -> dict:
    return {
        "client_id": cred["client_id"],
        "name": cred["name"],
        "keys_registered": True,
        "kem_fingerprint": _fingerprint(cred["kem_pk"]),
        "signing_fingerprint": _fingerprint(cred["sign_pk"]),
        "registered_at": cred["registered_at"],
    }


@app.post("/api/keys/register")
async def register_keys(
    req: RegisterKeysReq,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    token = _bearer_token(authorization)
    s = await _get_session(authorization)
    email, name = s["email"], s["name"]

    existing = await repo.get_credential_by_email(db, email)
    if existing:
        # keys already registered (this or another device did it first) — adopt them
        await _store_session(token, email, name, existing)
        return _registered_response(existing)

    try:
        kem_pk = base64.b64decode(req.kem_pk)
        sign_pk = base64.b64decode(req.sign_pk)
        x25519_pk = base64.b64decode(req.x25519_pk)
    except Exception:
        raise HTTPException(422, "Invalid key encoding")

    from crypto.km_client import KeyManagerClient
    km = KeyManagerClient(base_url=KM_URL, verify_ssl=KM_VERIFY_SSL)
    registered = None
    km_error = None
    try:
        registered = await run_in_threadpool(km.register, name, email, kem_pk, sign_pk, x25519_pk)
        secret = registered.get("registration_secret")
        if secret:
            await run_in_threadpool(km.authenticate, registered["client_id"], secret)
    except Exception as e:
        km_error = e

    if registered:
        client_id = registered["client_id"]
        existing = {
            "client_id": client_id,
            "name": name,
            "kem_pk": kem_pk,
            "sign_pk": sign_pk,
            "x25519_pk": x25519_pk,
            "reg_secret": registered.get("registration_secret") or "",
            "registered_at": datetime.now(timezone.utc).isoformat(),
        }
        await repo.save_credential(db, email, existing)
        await repo.save_registered_user(db, client_id, {
            "name": name, "email": email,
            "kem_pk": kem_pk, "sign_pk": sign_pk, "x25519_pk": x25519_pk,
        })
        await repo.save_email_mapping(db, email, client_id)
    else:
        existing = await repo.get_credential_by_email(db, email)
        if not existing:
            raise HTTPException(502, f"Key Manager error: {km_error}")

    await _store_session(token, email, name, existing)
    return _registered_response(existing)


@app.get("/api/keys/lookup")
async def lookup_recipient(
    email: str = Query(...),
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    s = await _get_session(authorization)

    client_id = await repo.get_client_id_by_email(db, email)
    kem_pk = sign_pk = x25519_pk = None
    if client_id:
        reg = await repo.get_registered_user(db, client_id)
        if reg:
            kem_pk, sign_pk, x25519_pk = reg["kem_pk"], reg["sign_pk"], reg.get("x25519_pk")

    if not (client_id and kem_pk and sign_pk and x25519_pk) and s.get("client_id"):
        # fall back to the Key Manager directory, authenticating as the caller
        from crypto.km_client import KeyManagerClient
        km = KeyManagerClient(base_url=KM_URL, verify_ssl=KM_VERIFY_SSL)
        try:
            await run_in_threadpool(km.authenticate, s["client_id"], s["reg_secret"])
            keys = await run_in_threadpool(km.directory_lookup, email)
            client_id = keys["client_id"]
            kem_pk = keys["kem_public_key"]
            sign_pk = keys["signing_public_key"]
            x25519_pk = keys.get("x25519_public_key")
        except Exception:
            pass

    if not (client_id and kem_pk and sign_pk and x25519_pk):
        raise HTTPException(404, "Recipient not registered or missing hybrid KEM keys")

    return {
        "client_id": client_id,
        "kem_pk": _b64(kem_pk),
        "sign_pk": _b64(sign_pk),
        "x25519_pk": _b64(x25519_pk),
    }


@app.put("/api/vault")
async def put_vault(
    req: VaultBlobReq,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    s = await _get_session(authorization)
    try:
        salt = base64.b64decode(req.salt)
        iv = base64.b64decode(req.iv)
        ciphertext = base64.b64decode(req.ciphertext)
    except Exception:
        raise HTTPException(422, "Invalid blob encoding")
    # Blob is passphrase-encrypted client-side; the server stores it but cannot read it.
    await repo.save_vault_blob(db, s["email"], salt, iv, ciphertext)
    return {"status": "ok"}


@app.get("/api/vault")
async def get_vault(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    s = await _get_session(authorization)
    blob = await repo.get_vault_blob(db, s["email"])
    if not blob:
        raise HTTPException(404, "No vault stored")
    return {
        "salt": _b64(blob["salt"]),
        "iv": _b64(blob["iv"]),
        "ciphertext": _b64(blob["ciphertext"]),
    }


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
            except Exception:
                env_json = ""
            verify_key = await _resolve_verify_key(db, env_json) if env_json else None

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
                "envelope": env_json,
                "senderVerifyKey": _b64(verify_key) if verify_key else "",
                "time": ts.strftime("%H:%M"),
                "fullDate": ts.strftime("%d %b %Y at %H:%M UTC"),
                "unread": not msg.is_read,
                "avatarIdx": i % 4,
                "label": "", "labelBg": "", "labelColor": "",
            })
    elif folder == "sent":
        messages = await repo.get_sent(db, s["email"])
        self_verify_key = _b64(s["sign_pk"]) if s.get("sign_pk") else ""
        for msg in messages:
            raw = msg.raw_mime or ""
            try:
                env_json = mime_to_envelope(raw)
            except Exception:
                env_json = ""
            ts = msg.created_at or datetime.now(timezone.utc)
            result.append({
                "id": msg.id,
                "folder": "sent",
                "sender": "You",
                "senderEmail": s["email"],
                "subject": msg.subject or "(no subject)",
                "envelope": env_json,
                "senderVerifyKey": self_verify_key,
                "time": ts.strftime("%H:%M"),
                "fullDate": ts.strftime("%d %b %Y at %H:%M UTC"),
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
    if not s.get("client_id"):
        raise HTTPException(400, "Register your keys before sending")

    # Envelopes arrive sealed from the client; the server never sees plaintext or
    # secret keys. It only wraps them in MIME for storage and relay.
    recipient_mime = envelope_to_mime(req.recipient_envelope, s["email"], req.to_email, req.subject)
    self_mime = envelope_to_mime(req.self_envelope, s["email"], req.to_email, req.subject)

    smtp_host = os.environ.get("QMAIL_SMTP_HOST")
    if smtp_host:
        from email_pipeline.Smtp_sender import send_mime_message
        from email_pipeline.config import SMTPConfig
        await run_in_threadpool(send_mime_message, recipient_mime, SMTPConfig.from_env())

    await repo.append_to_inbox(db, req.to_email, recipient_mime.as_string())
    await repo.append_to_sent(db, s["email"], req.to_email, req.subject, self_mime.as_string())

    return {
        "status": "sent",
        "encrypted": True,
        "algorithm": "X25519+ML-KEM-768 / ML-DSA-65 / AES-256-GCM",
        "fingerprint": _fingerprint(s["sign_pk"]),
    }


@app.get("/api/keys/info")
async def keys_info(authorization: str = Header(None)):
    s = await _get_session(authorization)
    registered = bool(s.get("client_id"))
    return {
        "client_id": s.get("client_id", ""),
        "kem_algorithm": "X25519 + ML-KEM-768",
        "signing_algorithm": "ML-DSA-65",
        "keys_registered": registered,
        "kem_fingerprint": _fingerprint(s["kem_pk"]) if registered else "",
        "signing_fingerprint": _fingerprint(s["sign_pk"]) if registered else "",
        "registered_at": s.get("registered_at", ""),
        "km_url": KM_URL,
        "km_status": "connected",
        "custody": "client",
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "QMail Gateway"}


frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend-build")
if os.path.isdir(frontend_dir):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
