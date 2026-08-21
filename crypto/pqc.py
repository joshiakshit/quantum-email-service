from pqcrypto.kem import ml_kem_768
from pqcrypto.sign import ml_dsa_65
from cryptography.hazmat.primitives.asymmetric.x25519 import (
    X25519PrivateKey,
    X25519PublicKey,
)
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

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


X25519_KEY_SIZE = 32


def generate_x25519_keypair() -> tuple[bytes, bytes]:
    sk = X25519PrivateKey.generate()
    pk = sk.public_key()
    sk_bytes = sk.private_bytes_raw()
    pk_bytes = pk.public_bytes_raw()
    return pk_bytes, sk_bytes


def _x25519_exchange(secret_key_bytes: bytes, peer_public_key_bytes: bytes) -> bytes:
    sk = X25519PrivateKey.from_private_bytes(secret_key_bytes)
    pk = X25519PublicKey.from_public_bytes(peer_public_key_bytes)
    return sk.exchange(pk)


def _hkdf_derive(ikm: bytes, length: int = 32) -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(),
        length=length,
        salt=None,
        info=b"qmail-hybrid-kem-v2",
    ).derive(ikm)


def hybrid_kem_encapsulate(
    recipient_kem_pk: bytes,
    recipient_x25519_pk: bytes,
) -> tuple[bytes, bytes, bytes]:
    _validate_key_size(recipient_kem_pk, KEM_PUBLIC_KEY_SIZE, "KEM public key")
    if len(recipient_x25519_pk) != X25519_KEY_SIZE:
        raise ValueError(f"X25519 public key must be {X25519_KEY_SIZE} bytes")

    kem_ct, kem_ss = ml_kem_768.encaps(recipient_kem_pk)

    ephem_pk, ephem_sk = generate_x25519_keypair()
    x25519_ss = _x25519_exchange(ephem_sk, recipient_x25519_pk)

    session_key = _hkdf_derive(x25519_ss + kem_ss)
    return kem_ct, ephem_pk, session_key


def hybrid_kem_decapsulate(
    recipient_kem_sk: bytes,
    recipient_x25519_sk: bytes,
    kem_ct: bytes,
    x25519_ephemeral_pk: bytes,
) -> bytes:
    _validate_key_size(recipient_kem_sk, KEM_SECRET_KEY_SIZE, "KEM secret key")
    _validate_key_size(kem_ct, KEM_CIPHERTEXT_SIZE, "KEM ciphertext")
    if len(recipient_x25519_sk) != X25519_KEY_SIZE:
        raise ValueError(f"X25519 secret key must be {X25519_KEY_SIZE} bytes")
    if len(x25519_ephemeral_pk) != X25519_KEY_SIZE:
        raise ValueError(f"X25519 ephemeral public key must be {X25519_KEY_SIZE} bytes")

    kem_ss = ml_kem_768.decaps(recipient_kem_sk, kem_ct)
    x25519_ss = _x25519_exchange(recipient_x25519_sk, x25519_ephemeral_pk)

    return _hkdf_derive(x25519_ss + kem_ss)
