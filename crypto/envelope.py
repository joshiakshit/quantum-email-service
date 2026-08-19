import json
import base64

from crypto.pqc import kem_encapsulate, kem_decapsulate, sign_message, verify_signature
from crypto.symmetric import encrypt, decrypt


ENVELOPE_VERSION = 1


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def _unb64(data: str) -> bytes:
    return base64.b64decode(data)


def _build_signed_payload(kem_ciphertext: bytes, nonce: bytes, ciphertext: bytes, tag: bytes) -> bytes:
    return kem_ciphertext + nonce + ciphertext + tag


def seal_envelope(
    plaintext: bytes,
    recipient_kem_public_key: bytes,
    sender_signing_secret_key: bytes,
    sender_signing_public_key: bytes,
) -> str:
    kem_ciphertext, shared_secret = kem_encapsulate(recipient_kem_public_key)
    nonce, ciphertext, tag = encrypt(shared_secret, plaintext)

    signed_payload = _build_signed_payload(kem_ciphertext, nonce, ciphertext, tag)
    signature = sign_message(sender_signing_secret_key, signed_payload)

    envelope = {
        "version": ENVELOPE_VERSION,
        "kem_algorithm": "ML-KEM-768",
        "sig_algorithm": "ML-DSA-65",
        "sym_algorithm": "AES-256-GCM",
        "kem_ciphertext": _b64(kem_ciphertext),
        "nonce": _b64(nonce),
        "ciphertext": _b64(ciphertext),
        "tag": _b64(tag),
        "signature": _b64(signature),
        "sender_verify_key": _b64(sender_signing_public_key),
    }

    return json.dumps(envelope)


def open_envelope(
    envelope_json: str,
    recipient_kem_secret_key: bytes,
) -> bytes:
    envelope = json.loads(envelope_json)

    if envelope["version"] != ENVELOPE_VERSION:
        raise ValueError(f"Unsupported envelope version: {envelope['version']}")

    kem_ciphertext = _unb64(envelope["kem_ciphertext"])
    nonce = _unb64(envelope["nonce"])
    ciphertext = _unb64(envelope["ciphertext"])
    tag = _unb64(envelope["tag"])
    signature = _unb64(envelope["signature"])
    sender_verify_key = _unb64(envelope["sender_verify_key"])

    signed_payload = _build_signed_payload(kem_ciphertext, nonce, ciphertext, tag)
    if not verify_signature(sender_verify_key, signed_payload, signature):
        raise ValueError("Signature verification failed — message may be tampered")

    shared_secret = kem_decapsulate(recipient_kem_secret_key, kem_ciphertext)
    plaintext = decrypt(shared_secret, nonce, ciphertext, tag)

    return plaintext
