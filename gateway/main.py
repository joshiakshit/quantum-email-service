import os
import sys
import secrets
import hashlib
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto.pqc import generate_kem_keypair, generate_signing_keypair
from crypto.envelope import seal_envelope, open_envelope
from crypto.email_helpers import envelope_to_mime, mime_to_envelope, extract_metadata

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="QuMail Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

KM_URL = os.environ.get("QUMAIL_KM_URL", "http://localhost:8000")

sessions: dict = {}
demo_mailbox: dict = {}
demo_sent: dict = {}
registered_users: dict = {}
email_to_client: dict = {}


class RegisterReq(BaseModel):
    name: str
    email: str


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


def _seed_inbox(email: str, kem_pk: bytes):
    sign_pk, sign_sk = generate_signing_keypair()

    demos = [
        ("Dr. Ananya Rao", "ananya.rao@isro.gov.in",
         "Cryogenic Stage Test Report — Q3",
         "Team,\n\nAttached is the final report following the hot test at Mahendragiri. "
         "All parameters were nominal within the expected envelope; chamber pressure held "
         "steady across the full 640s burn.\n\nPlease review section 4 before the design "
         "review on Thursday. The thermal margins on the injector face are tighter than "
         "modelled — see page 12 for the revised analysis.\n\n— Ananya"),
        ("Mission Control — VSSC", "missioncontrol@vssc.isro.gov.in",
         "Launch Window Confirmation: PSLV-C61",
         "The revised launch window has been confirmed by range safety for 05:58 IST, "
         "23 Aug 2026. All stage clearances are logged. Weather advisory attached "
         "separately.\n\nFinal readiness review at 18:00 today. All division heads to "
         "attend via secure channel."),
        ("ISTRAC Network Ops", "netops@istrac.isro.gov.in",
         "QKD backbone maintenance — 22 Aug",
         "The quantum key distribution backbone between Bengaluru and Thiruvananthapuram "
         "will undergo planned maintenance on 22 Aug, 02:00–06:00 IST.\n\nDuring this "
         "window, emails will fall back to classical hybrid encryption (X25519 + "
         "AES-256-GCM). Full PQC coverage resumes automatically once the QKD link is "
         "restored."),
        ("Key Manager Service", "noreply@keymanager.gov.in",
         "Signing key rotation due in 5 days",
         "This is an automated notice from the QuMail Key Manager.\n\nYour ML-DSA-65 "
         "signing key will expire on schedule in 5 days (2026-08-24). Regenerate your "
         "keys from Settings → Key Management to avoid interruption to signed mail "
         "delivery.\n\nNo action is needed for your KEM key at this time."),
    ]

    demo_mailbox[email] = []
    for name, sender_email, subject, body in demos:
        env_json = seal_envelope(body.encode("utf-8"), kem_pk, sign_sk, sign_pk)
        mime_msg = envelope_to_mime(
            env_json, f"{name} <{sender_email}>", email, subject,
        )
        demo_mailbox[email].append(mime_msg.as_string())


@app.post("/api/auth/register")
async def register(req: RegisterReq):
    kem_pk, kem_sk = generate_kem_keypair()
    sign_pk, sign_sk = generate_signing_keypair()

    from crypto.km_client import KeyManagerClient
    km = KeyManagerClient(base_url=KM_URL, verify_ssl=False)
    try:
        result = km.register(req.name, kem_pk, sign_pk)
        client_id = result["client_id"]
        reg_secret = result["registration_secret"]
        km.authenticate(client_id, reg_secret)
    except Exception as e:
        raise HTTPException(502, f"Key Manager error: {e}")

    token = secrets.token_hex(32)
    sessions[token] = {
        "client_id": client_id,
        "name": req.name,
        "email": req.email,
        "kem_pk": kem_pk,
        "kem_sk": kem_sk,
        "sign_pk": sign_pk,
        "sign_sk": sign_sk,
        "reg_secret": reg_secret,
        "km": km,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }

    registered_users[client_id] = {
        "name": req.name, "email": req.email,
        "kem_pk": kem_pk, "sign_pk": sign_pk,
    }
    email_to_client[req.email] = client_id

    _seed_inbox(req.email, kem_pk)

    return {
        "token": token,
        "client_id": client_id,
        "name": req.name,
        "email": req.email,
        "kem_fingerprint": _fingerprint(kem_pk),
        "signing_fingerprint": _fingerprint(sign_pk),
    }


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

    smtp_host = os.environ.get("QUMAIL_SMTP_HOST")
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
    return {"status": "ok", "service": "QuMail Gateway"}
