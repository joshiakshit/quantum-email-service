import os
import sys
import secrets
import hashlib
import logging
from datetime import datetime, timezone

import requests as http_requests
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto.pqc import generate_kem_keypair, generate_signing_keypair
from crypto.envelope import seal_envelope, open_envelope
from crypto.email_helpers import envelope_to_mime, mime_to_envelope, extract_metadata

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="QMail Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    messages = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        messages.append(f"{field}: {error['msg']}" if field else error["msg"])
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})


KM_URL = os.environ.get("QMAIL_KM_URL", "http://localhost:8000")
AUTH_SERVICE_URL = os.environ.get("QMAIL_AUTH_URL", "https://auth.joshiakshit.live")

sessions: dict = {}
demo_mailbox: dict = {}
demo_sent: dict = {}
registered_users: dict = {}
email_to_client: dict = {}
user_credentials: dict = {}


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


def _get_session(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.removeprefix("Bearer ").strip()
    s = sessions.get(token)
    if not s:
        raise HTTPException(401, "Invalid session")
    return s


def _fingerprint(key_bytes: bytes) -> str:
    h = hashlib.sha256(key_bytes).hexdigest().upper()
    return ":".join(h[i:i+2] for i in range(0, 16, 2))


def _create_session(auth_token: str):
    try:
        resp = http_requests.get(
            f"{AUTH_SERVICE_URL}/api/v1/users/me",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=10,
        )
        if resp.status_code != 200:
            raise HTTPException(401, "Invalid or expired auth token")
        user_info = resp.json()
    except http_requests.RequestException:
        raise HTTPException(502, "Auth service unreachable")

    email = user_info.get("email", "")
    name = user_info.get("name") or user_info.get("username") or email.split("@")[0]

    if email in user_credentials:
        cred = user_credentials[email]
    else:
        kem_pk, kem_sk = generate_kem_keypair()
        sign_pk, sign_sk = generate_signing_keypair()

        from crypto.km_client import KeyManagerClient
        km = KeyManagerClient(base_url=KM_URL, verify_ssl=False)
        try:
            result = km.register(name, kem_pk, sign_pk)
            client_id = result["client_id"]
            reg_secret = result["registration_secret"]
            km.authenticate(client_id, reg_secret)
        except Exception as e:
            raise HTTPException(502, f"Key Manager error: {e}")

        cred = {
            "client_id": client_id,
            "name": name,
            "kem_pk": kem_pk,
            "kem_sk": kem_sk,
            "sign_pk": sign_pk,
            "sign_sk": sign_sk,
            "reg_secret": reg_secret,
            "km": km,
            "registered_at": datetime.now(timezone.utc).isoformat(),
        }
        user_credentials[email] = cred

        registered_users[client_id] = {
            "name": name, "email": email,
            "kem_pk": kem_pk, "sign_pk": sign_pk,
        }
        email_to_client[email] = client_id

    token = secrets.token_hex(32)
    sessions[token] = {
        "client_id": cred["client_id"],
        "name": cred["name"],
        "email": email,
        "kem_pk": cred["kem_pk"],
        "kem_sk": cred["kem_sk"],
        "sign_pk": cred["sign_pk"],
        "sign_sk": cred["sign_sk"],
        "reg_secret": cred["reg_secret"],
        "km": cred["km"],
        "registered_at": cred["registered_at"],
    }

    return {
        "token": token,
        "client_id": cred["client_id"],
        "name": cred["name"],
        "email": email,
        "kem_fingerprint": _fingerprint(cred["kem_pk"]),
        "signing_fingerprint": _fingerprint(cred["sign_pk"]),
    }


@app.post("/api/auth/login")
async def auth_login(req: LoginReq):
    email = _to_email(req.username)
    try:
        resp = http_requests.post(
            f"{AUTH_SERVICE_URL}/api/v1/auth/login",
            json={"email": email, "password": req.password},
            timeout=10,
        )
    except http_requests.RequestException:
        raise HTTPException(502, "Auth service unreachable")

    if resp.status_code != 200:
        detail = resp.json().get("detail", "Invalid username or password")
        if not isinstance(detail, str):
            detail = "; ".join(str(e.get("msg", e)) if isinstance(e, dict) else str(e) for e in detail) if isinstance(detail, list) else str(detail)
        raise HTTPException(resp.status_code, detail)

    auth_token = resp.json().get("access_token")
    return _create_session(auth_token)


@app.post("/api/auth/register")
async def auth_register(req: RegisterReq):
    email = _to_email(req.username)
    name = f"{req.first_name} {req.last_name}".strip()
    try:
        resp = http_requests.post(
            f"{AUTH_SERVICE_URL}/api/v1/auth/register",
            json={"email": email, "password": req.password, "name": name},
            timeout=10,
        )
    except http_requests.RequestException:
        raise HTTPException(502, "Auth service unreachable")

    if resp.status_code not in (200, 201):
        detail = resp.json().get("detail", "Registration failed")
        if not isinstance(detail, str):
            detail = "; ".join(str(e.get("msg", e)) if isinstance(e, dict) else str(e) for e in detail) if isinstance(detail, list) else str(detail)
        raise HTTPException(resp.status_code, detail)

    login_resp = http_requests.post(
        f"{AUTH_SERVICE_URL}/api/v1/auth/login",
        json={"email": email, "password": req.password},
        timeout=10,
    )
    if login_resp.status_code != 200:
        raise HTTPException(500, "Account created but auto-login failed")

    auth_token = login_resp.json().get("access_token")
    return _create_session(auth_token)


@app.get("/api/auth/status")
async def auth_status(authorization: str = Header(None)):
    s = _get_session(authorization)
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
        sessions.pop(token, None)
    return {"status": "ok"}


@app.get("/api/emails")
async def get_emails(folder: str = Query("inbox"), authorization: str = Header(None)):
    s = _get_session(authorization)
    result = []

    if folder == "inbox":
        raw_list = demo_mailbox.get(s["email"], [])
        for i, raw in enumerate(raw_list):
            meta = extract_metadata(raw)
            try:
                env_json = mime_to_envelope(raw)
                plaintext = open_envelope(env_json, s["kem_sk"])
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

            labels = [
                ("Mission Critical", "rgba(111,168,220,0.15)", "#6fa8dc"),
                ("Classified", "rgba(224,102,102,0.15)", "#e06666"),
                ("", "", ""),
                ("", "", ""),
            ]
            lb = labels[i % len(labels)] if encrypted else ("", "", "")

            result.append({
                "id": i + 1,
                "folder": "inbox",
                "sender": sender_name,
                "senderEmail": sender_email,
                "subject": meta.get("subject", "(no subject)"),
                "preview": body[:80] + ("…" if len(body) > 80 else ""),
                "body": body,
                "time": ["09:42", "08:15", "Yesterday", "Yesterday"][i % 4],
                "fullDate": datetime.now(timezone.utc).strftime("%d %b %Y at %H:%M UTC"),
                "encrypted": encrypted,
                "fingerprint": fp,
                "unread": i < 2,
                "avatarIdx": i % 4,
                "label": lb[0],
                "labelBg": lb[1],
                "labelColor": lb[2],
            })
    elif folder == "sent":
        for i, item in enumerate(demo_sent.get(s["email"], [])):
            result.append({
                "id": 1000 + i,
                "folder": "sent",
                "sender": "You",
                "senderEmail": s["email"],
                "subject": item["subject"],
                "preview": item["body"][:80],
                "body": item["body"],
                "time": "Just now",
                "fullDate": datetime.now(timezone.utc).strftime("%d %b %Y at %H:%M UTC"),
                "encrypted": True,
                "fingerprint": _fingerprint(s["sign_pk"]),
                "unread": False,
                "avatarIdx": 0,
                "label": "", "labelBg": "", "labelColor": "",
            })

    return {"emails": result}


@app.post("/api/emails/send")
async def send_email(req: SendReq, authorization: str = Header(None)):
    s = _get_session(authorization)

    recipient_client_id = email_to_client.get(req.to_email)
    recipient_kem_pk = None

    if recipient_client_id and recipient_client_id in registered_users:
        recipient_kem_pk = registered_users[recipient_client_id]["kem_pk"]
    elif recipient_client_id:
        try:
            keys = s["km"].get_public_keys(recipient_client_id)
            recipient_kem_pk = keys["kem_public_key"]
        except Exception:
            pass

    if not recipient_kem_pk:
        raise HTTPException(404, "Recipient not registered or KEM key unavailable")

    env_json = seal_envelope(
        req.body.encode("utf-8"), recipient_kem_pk, s["sign_sk"], s["sign_pk"],
    )
    mime_msg = envelope_to_mime(env_json, s["email"], req.to_email, req.subject)

    smtp_host = os.environ.get("QMAIL_SMTP_HOST")
    if smtp_host:
        from email_pipeline.Smtp_sender import send_mime_message
        from email_pipeline.config import SMTPConfig
        send_mime_message(mime_msg, SMTPConfig.from_env())

    if req.to_email not in demo_mailbox:
        demo_mailbox[req.to_email] = []
    demo_mailbox[req.to_email].append(mime_msg.as_string())

    if s["email"] not in demo_sent:
        demo_sent[s["email"]] = []
    demo_sent[s["email"]].append({
        "to": req.to_email, "subject": req.subject, "body": req.body,
    })

    return {
        "status": "sent",
        "encrypted": True,
        "algorithm": "ML-KEM-768 + ML-DSA-65 + AES-256-GCM",
        "fingerprint": _fingerprint(s["sign_pk"]),
    }


@app.get("/api/keys/info")
async def keys_info(authorization: str = Header(None)):
    s = _get_session(authorization)
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
