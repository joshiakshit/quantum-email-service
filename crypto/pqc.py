from pqcrypto.kem import ml_kem_768
from pqcrypto.sign import ml_dsa_65

KEM_PUBLIC_KEY_SIZE = ml_kem_768.PUBLIC_KEY_SIZE
KEM_SECRET_KEY_SIZE = ml_kem_768.SECRET_KEY_SIZE
KEM_CIPHERTEXT_SIZE = ml_kem_768.CIPHERTEXT_SIZE
KEM_SHARED_SECRET_SIZE = ml_kem_768.SHARED_SECRET_SIZE

SIGNING_PUBLIC_KEY_SIZE = ml_dsa_65.PUBLIC_KEY_SIZE
SIGNING_SECRET_KEY_SIZE = ml_dsa_65.SECRET_KEY_SIZE


def _validate_key_size(key: bytes, expected: int, label: str):
    if not isinstance(key, bytes):
        raise TypeError(f"{label} must be bytes, got {type(key).__name__}")
    if len(key) != expected:
        raise ValueError(f"{label} must be {expected} bytes, got {len(key)}")


def generate_kem_keypair():
    public_key, secret_key = ml_kem_768.keygen()
    return public_key, secret_key


def kem_encapsulate(recipient_public_key):
    _validate_key_size(recipient_public_key, KEM_PUBLIC_KEY_SIZE, "KEM public key")
    ciphertext, shared_secret = ml_kem_768.encaps(recipient_public_key)
    return ciphertext, shared_secret


def kem_decapsulate(recipient_secret_key, ciphertext):
    _validate_key_size(recipient_secret_key, KEM_SECRET_KEY_SIZE, "KEM secret key")
    _validate_key_size(ciphertext, KEM_CIPHERTEXT_SIZE, "KEM ciphertext")
    shared_secret = ml_kem_768.decaps(recipient_secret_key, ciphertext)
    return shared_secret


def generate_signing_keypair():
    public_key, secret_key = ml_dsa_65.keygen()
    return public_key, secret_key


def sign_message(signing_secret_key, data: bytes) -> bytes:
    _validate_key_size(signing_secret_key, SIGNING_SECRET_KEY_SIZE, "Signing secret key")
    if not isinstance(data, bytes):
        raise TypeError(f"Data to sign must be bytes, got {type(data).__name__}")
    signature = ml_dsa_65.sign(signing_secret_key, data)
    return signature


def verify_signature(signing_public_key, data: bytes, signature: bytes) -> bool:
    _validate_key_size(signing_public_key, SIGNING_PUBLIC_KEY_SIZE, "Signing public key")
    try:
        ml_dsa_65.verify(signing_public_key, data, signature)
        return True
    except Exception:
        return False
