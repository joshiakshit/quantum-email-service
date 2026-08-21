import json
import base64
import uuid
import time

from crypto.pqc import (
    kem_encapsulate, kem_decapsulate,
    sign_message, verify_signature,
    hybrid_kem_encapsulate, hybrid_kem_decapsulate,
)
from crypto.symmetric import encrypt, decrypt


ENVELOPE_VERSION = 2


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def _unb64(data: str) -> bytes:
    return base64.b64decode(data)


def _lp(data: bytes) -> bytes:
    return len(data).to_bytes(4, "big") + data


def _lp_str(s: str) -> bytes:
    return _lp(s.encode("utf-8"))


def _build_context_aad(sender_id: str, recipient_id: str, subject: str,
                       message_id: str, timestamp: int) -> bytes:
    return (
        _lp_str(sender_id)
        + _lp_str(recipient_id)
        + _lp_str(subject)
        + _lp_str(message_id)
        + _lp(timestamp.to_bytes(8, "big"))
    )


def _build_signed_payload_v2(
    sender_id: str, recipient_id: str, subject: str,
    message_id: str, timestamp: int,
    x25519_ephem_pk: bytes, kem_ct: bytes,
    nonce: bytes, ciphertext: bytes, tag: bytes,
) -> bytes:
    return (
        _lp_str(sender_id)
        + _lp_str(recipient_id)
        + _lp_str(subject)
        + _lp_str(message_id)
        + _lp(timestamp.to_bytes(8, "big"))
        + _lp(x25519_ephem_pk)
        + _lp(kem_ct)
        + _lp(nonce)
        + _lp(ciphertext)
        + _lp(tag)
    )


def _build_signed_payload_v1(kem_ciphertext: bytes, nonce: bytes,
                             ciphertext: bytes, tag: bytes) -> bytes:
    return kem_ciphertext + nonce + ciphertext + tag


def seal_envelope(
    plaintext: bytes,
    recipient_kem_pk: bytes,
    sender_sign_sk: bytes,
    sender_id: str,
    recipient_id: str,
    *,
    recipient_x25519_pk: bytes,
    subject: str = "",
    message_id: str | None = None,
) -> str:
    if message_id is None:
        message_id = str(uuid.uuid4())
    timestamp = int(time.time())

    kem_ct, x25519_ephem_pk, session_key = hybrid_kem_encapsulate(
        recipient_kem_pk, recipient_x25519_pk,
    )

    aad = _build_context_aad(sender_id, recipient_id, subject, message_id, timestamp)
    nonce, ciphertext, tag = encrypt(session_key, plaintext, aad=aad)

    signed_payload = _build_signed_payload_v2(
        sender_id, recipient_id, subject, message_id, timestamp,
        x25519_ephem_pk, kem_ct, nonce, ciphertext, tag,
    )
    signature = sign_message(sender_sign_sk, signed_payload)

    envelope = {
        "version": ENVELOPE_VERSION,
        "kem": "X25519+ML-KEM-768",
        "sig": "ML-DSA-65",
        "sym": "AES-256-GCM",
        "kdf": "HKDF-SHA256",
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "message_id": message_id,
        "timestamp": timestamp,
        "subject": subject,
        "x25519_ephemeral_pk": _b64(x25519_ephem_pk),
        "kem_ciphertext": _b64(kem_ct),
        "nonce": _b64(nonce),
        "ciphertext": _b64(ciphertext),
        "tag": _b64(tag),
        "signature": _b64(signature),
    }

    return json.dumps(envelope)


def open_envelope(
    envelope_json: str,
    recipient_kem_sk: bytes,
    recipient_x25519_sk: bytes | None = None,
    sender_verify_key: bytes | None = None,
) -> bytes:
    envelope = json.loads(envelope_json)
    version = envelope.get("version", 1)

    if version == 1:
        return _open_v1(envelope, recipient_kem_sk)
    if version == 2:
        if recipient_x25519_sk is None or sender_verify_key is None:
            raise ValueError("V2 envelopes require recipient_x25519_sk and sender_verify_key")
        return _open_v2(envelope, recipient_kem_sk, recipient_x25519_sk, sender_verify_key)

    raise ValueError(f"Unsupported envelope version: {version}")


def _open_v2(envelope: dict, recipient_kem_sk: bytes,
             recipient_x25519_sk: bytes, sender_verify_key: bytes) -> bytes:
    kem_ct = _unb64(envelope["kem_ciphertext"])
    x25519_ephem_pk = _unb64(envelope["x25519_ephemeral_pk"])
    nonce = _unb64(envelope["nonce"])
    ciphertext = _unb64(envelope["ciphertext"])
    tag = _unb64(envelope["tag"])
    signature = _unb64(envelope["signature"])

    sender_id = envelope["sender_id"]
    recipient_id = envelope["recipient_id"]
    subject = envelope.get("subject", "")
    message_id = envelope["message_id"]
    timestamp = envelope["timestamp"]

    signed_payload = _build_signed_payload_v2(
        sender_id, recipient_id, subject, message_id, timestamp,
        x25519_ephem_pk, kem_ct, nonce, ciphertext, tag,
    )
    if not verify_signature(sender_verify_key, signed_payload, signature):
        raise ValueError("Signature verification failed")

    session_key = hybrid_kem_decapsulate(
        recipient_kem_sk, recipient_x25519_sk, kem_ct, x25519_ephem_pk,
    )

    aad = _build_context_aad(sender_id, recipient_id, subject, message_id, timestamp)
    return decrypt(session_key, nonce, ciphertext, tag, aad=aad)


def _open_v1(envelope: dict, recipient_kem_sk: bytes) -> bytes:
    kem_ciphertext = _unb64(envelope["kem_ciphertext"])
    nonce = _unb64(envelope["nonce"])
    ciphertext = _unb64(envelope["ciphertext"])
    tag = _unb64(envelope["tag"])
    signature = _unb64(envelope["signature"])
    sender_verify_key = _unb64(envelope["sender_verify_key"])

    signed_payload = _build_signed_payload_v1(kem_ciphertext, nonce, ciphertext, tag)
    if not verify_signature(sender_verify_key, signed_payload, signature):
        raise ValueError("Signature verification failed — message may be tampered")

    shared_secret = kem_decapsulate(recipient_kem_sk, kem_ciphertext)
    return decrypt(shared_secret, nonce, ciphertext, tag)
