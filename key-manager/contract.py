"""
Key Manager API contract — defines the data shapes and endpoints M2 implements.
M1 defines this, M2 builds the FastAPI service from it, M3/M4/M5 consume via km_client.
"""

ENDPOINTS = {
    "register": {
        "method": "POST",
        "path": "/clients/register",
        "request": {
            "client_id": "str — unique email-based identifier (e.g. alice@qumail.local)",
            "kem_public_key": "str — base64-encoded ML-KEM-768 public key (1184 bytes raw)",
            "signing_public_key": "str — base64-encoded ML-DSA-65 public key (1952 bytes raw)",
        },
        "response": {
            "client_id": "str",
            "registered_at": "str — ISO 8601 timestamp",
        },
    },
    "get_public_keys": {
        "method": "GET",
        "path": "/clients/{client_id}/keys",
        "response": {
            "client_id": "str",
            "kem_public_key": "str — base64-encoded",
            "signing_public_key": "str — base64-encoded",
        },
    },
    "request_qkd_session_key": {
        "method": "POST",
        "path": "/sessions/qkd-key",
        "request": {
            "sender_id": "str",
            "recipient_id": "str",
        },
        "response": {
            "session_id": "str — UUID",
            "session_key": "str — base64-encoded 32-byte symmetric key from QKD simulation",
            "sender_id": "str",
            "recipient_id": "str",
        },
    },
    "health": {
        "method": "GET",
        "path": "/health",
        "response": {
            "status": "ok",
            "version": "str",
        },
    },
}

KEM_PUBLIC_KEY_SIZE = 1184
KEM_SECRET_KEY_SIZE = 2400
SIGNING_PUBLIC_KEY_SIZE = 1952
SIGNING_SECRET_KEY_SIZE = 4032
SHARED_SECRET_SIZE = 32
