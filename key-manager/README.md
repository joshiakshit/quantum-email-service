# QuMail Key Manager — M2

> **Quantum-Resistant Key Distribution Service**  
> Part of the QuMail PQC + Simulated QKD Email Client Architecture.

---

## Overview

The **Key Manager** is the M2 component of QuMail. It provides:

- ✅ **Client registration** with ML-KEM / ML-DSA public-key storage  
- ✅ **Public-key retrieval** for recipient lookup by the Integration Lead  
- ✅ **Simulated QKD session keys** for secure communication bootstrap  
- ✅ **JWT authentication** for all protected endpoints  
- ✅ **SQLite database** (PostgreSQL-ready via a single env-var change)  
- ✅ **Independently runnable** — clone, install, run `uvicorn`  

> ⚠️ **QKD DISCLAIMER**: Session keys use `SIMULATED-QKD` (CSPRNG). This does **not** provide real quantum key distribution security. Replace `QKDService` with a real QKD interface when available.

---

## Installation

### Prerequisites

- Python 3.11+
- pip

### Steps

```bash
# 1. Clone / copy the key-manager folder
cd "D:\Quantum Computing\qumail-key-manager"

# 2. (Optional but recommended) Create a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
copy .env.example .env
# Edit .env — at minimum, set a strong JWT_SECRET_KEY

# 5. Run the server
uvicorn app.main:app --reload
```

The server starts at **http://localhost:8000**.

---

## Running the Server

```bash
# Development (auto-reload)
uvicorn app.main:app --reload

# Production (multiple workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Interactive API docs are available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## API Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Service health check |

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/token` | None | Get JWT from client_id + secret |

### Clients

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/clients/register` | None | Register new client |
| GET | `/api/v1/clients/{client_id}` | JWT | Get client info |

### Keys

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/keys/public/{client_id}` | JWT | Get recipient public keys |
| POST | `/api/v1/keys/request` | JWT | Request session key material |
| GET | `/api/v1/keys/{key_id}` | JWT | Retrieve session key by ID |

---

## Request / Response Examples

### 1. Register a Client

```http
POST /api/v1/clients/register
Content-Type: application/json

{
  "name": "Alice",
  "ml_kem_public_key": "<base64-encoded-ML-KEM-public-key>",
  "ml_dsa_public_key": "<base64-encoded-ML-DSA-public-key>"
}
```

```json
{
  "client_id": "QM-A1B2C3D4",
  "registration_secret": "very-long-random-secret-string",
  "status": "registered"
}
```

> ⚠️ **Save `registration_secret` immediately.** It is shown **once** and never stored in plaintext.

---

### 2. Obtain JWT Token

```http
POST /api/v1/auth/token
Content-Type: application/json

{
  "client_id": "QM-A1B2C3D4",
  "registration_secret": "very-long-random-secret-string"
}
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

All subsequent requests must include:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. Get Recipient Public Keys

```http
GET /api/v1/keys/public/QM-B5C6D7E8
Authorization: Bearer <token>
```

```json
{
  "client_id": "QM-B5C6D7E8",
  "name": "Bob",
  "ml_kem_public_key": "<base64-ML-KEM-public-key>",
  "ml_dsa_public_key": "<base64-ML-DSA-public-key>"
}
```

---

### 4. Request Session Key Material

```http
POST /api/v1/keys/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "sender_id": "QM-A1B2C3D4",
  "recipient_id": "QM-B5C6D7E8"
}
```

```json
{
  "key_id": "KEY-F1E2D3C4",
  "sender_id": "QM-A1B2C3D4",
  "recipient_id": "QM-B5C6D7E8",
  "key_material": "<base64-encoded-32-byte-key>",
  "algorithm": "SIMULATED-QKD",
  "created_at": "2026-08-19T12:00:00",
  "expires_at": "2026-08-20T12:00:00",
  "status": "active"
}
```

---

### 5. Retrieve Session Key (by Bob)

```http
GET /api/v1/keys/KEY-F1E2D3C4
Authorization: Bearer <bob-token>
```

```json
{
  "key_id": "KEY-F1E2D3C4",
  "sender_id": "QM-A1B2C3D4",
  "recipient_id": "QM-B5C6D7E8",
  "key_material": "<same-base64-key-material>",
  "algorithm": "SIMULATED-QKD",
  "created_at": "2026-08-19T12:00:00",
  "expires_at": "2026-08-20T12:00:00",
  "status": "active"
}
```

---

## Authentication

The Key Manager uses **JWT Bearer tokens** (`HS256`).

### Flow

```
Client → POST /api/v1/clients/register
       ← { client_id, registration_secret }

Client → POST /api/v1/auth/token  { client_id, registration_secret }
       ← { access_token }

Client → GET /api/v1/keys/public/{id}
         Authorization: Bearer <access_token>
```

### Configuration

Set `JWT_SECRET_KEY` in your `.env` file. Generate a secure key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Extending to mTLS

The `get_current_client` dependency in `app/security/jwt.py` is the single integration point. Add mTLS certificate verification before the JWT check without touching any route handlers.

---

## Database Structure

SQLite by default. Switch to PostgreSQL by changing `DATABASE_URL` in `.env`.

### `clients` Table

| Column | Type | Description |
|--------|------|-------------|
| `client_id` | TEXT (PK) | Unique identifier (QM-XXXXXXXX) |
| `name` | TEXT | Client display name |
| `ml_kem_public_key` | TEXT | Base64 ML-KEM public key |
| `ml_dsa_public_key` | TEXT | Base64 ML-DSA public key |
| `hashed_secret` | TEXT | Bcrypt hash of registration secret |
| `created_at` | DATETIME | Registration timestamp |

> ⚠️ Private keys are **never** stored. They remain exclusively on client devices.

### `session_keys` Table

| Column | Type | Description |
|--------|------|-------------|
| `key_id` | TEXT (PK) | Unique key identifier (KEY-XXXXXXXX) |
| `sender_id` | TEXT | Sender's client_id |
| `recipient_id` | TEXT | Recipient's client_id |
| `key_material` | TEXT | Base64 session key (CSPRNG-generated) |
| `algorithm` | TEXT | Always `SIMULATED-QKD` for MVP |
| `created_at` | DATETIME | Creation timestamp |
| `expires_at` | DATETIME | Expiry timestamp |
| `status` | ENUM | `active`, `expired`, `revoked` |

---

## Simulated QKD Explanation

### What it is

For the MVP, the Key Manager simulates Quantum Key Distribution using a **CSPRNG** (`secrets.token_bytes(32)`). This produces cryptographically-secure 256-bit random keys that are distributed over the secure REST API channel.

### What it is NOT

This is **not real QKD**. Real QKD requires:
- Physical quantum channels (e.g., optical fiber, free-space optics)
- BB84 or E91 quantum protocols
- Quantum hardware at both endpoints

### Conceptual model

```
Alice
  │
  │ HTTPS REST
  ▼
Key Manager (this service)
  │
  │ HTTPS REST
  ▼
Bob
```

Keys are labeled `SIMULATED-QKD` throughout all responses and logs.

### How to swap in a real QKD simulator

1. Create a subclass of `QKDService` in `app/services/qkd_service.py`
2. Override `generate_key()` to call your QKD hardware/simulator API
3. Override `retrieve_key()` to fetch from the QKD network node
4. Replace the `qkd_service` singleton at the bottom of `qkd_service.py`
5. No API changes required — the REST contract remains identical

---

## Integration Instructions for the Integration Lead

### Step 1 — Start the server

```bash
uvicorn app.main:app --reload
```

### Step 2 — Register your clients

```bash
curl -X POST http://localhost:8000/api/v1/clients/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","ml_kem_public_key":"<b64>","ml_dsa_public_key":"<b64>"}'
```

Save the returned `client_id` and `registration_secret`.

### Step 3 — Obtain a JWT

```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"QM-XXXX","registration_secret":"<secret>"}'
```

### Step 4 — Use the APIs

All protected endpoints accept `Authorization: Bearer <token>`.

### Integration into the QuMail Flow

```
Compose Email
      ↓
Integration Layer
      ↓  GET /api/v1/keys/public/{recipient_id}
Key Manager ──────────────────────────────────→ Recipient ML-KEM / ML-DSA public keys
      ↓  POST /api/v1/keys/request
Key Manager ──────────────────────────────────→ SIMULATED-QKD session key material
      ↓
M1 Crypto Module (AES-256-GCM + ML-DSA signature)
      ↓
M3 SMTP → Recipient → M3 IMAP → M1 Decrypt → Inbox
```

### Postman Collection

Import `postman_collection.json` into Postman. Run requests in order:
1. Register Alice → saves `alice_client_id` + `alice_secret` automatically
2. Register Bob
3. Get Token (Alice)
4. Get Token (Bob)
5. Get Bob's Public Keys (as Alice)
6. Request Session Key Material
7. Retrieve Session Key (as Bob)

---

## Running Tests

```bash
pytest tests/ -v
```

Expected: **28+ tests passing**.

---

## Security Notes

- Private keys are **never stored** in the Key Manager
- Session keys are **never logged** (only key_id and metadata are logged)
- Registration secrets are **bcrypt-hashed** — only verified, never retrievable
- All randomness uses Python's `secrets` module (CSPRNG)
- Environment variables control all secrets — nothing is hard-coded
- JWT tokens expire after `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (default: 60)
- Session keys expire after `SESSION_KEY_EXPIRY_HOURS` (default: 24)

---

## Component Ownership (QuMail Architecture)

| Module | Owner | Responsibility |
|--------|-------|----------------|
| M1 | Crypto Developer | ML-KEM, ML-DSA, AES-256-GCM |
| **M2** | **Key Manager (this service)** | **Key distribution, client registry** |
| M3 | SMTP/IMAP Developer | Email transport |
| M4 | UI Developer | Frontend interface |
| M5 | QKD Specialist | Real QKD simulation |
| IL | Integration Lead | Connects M1–M5 |
