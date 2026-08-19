from pqcrypto.kem import ml_kem_768
from pqcrypto.sign import ml_dsa_65


def generate_kem_keypair():
    public_key, secret_key = ml_kem_768.keygen()
    return public_key, secret_key


def kem_encapsulate(recipient_public_key):
    ciphertext, shared_secret = ml_kem_768.encaps(recipient_public_key)
    return ciphertext, shared_secret


def kem_decapsulate(recipient_secret_key, ciphertext):
    shared_secret = ml_kem_768.decaps(recipient_secret_key, ciphertext)
    return shared_secret


def generate_signing_keypair():
    public_key, secret_key = ml_dsa_65.keygen()
    return public_key, secret_key


def sign_message(signing_secret_key, data: bytes) -> bytes:
    signature = ml_dsa_65.sign(signing_secret_key, data)
    return signature


def verify_signature(signing_public_key, data: bytes, signature: bytes) -> bool:
    try:
        ml_dsa_65.verify(signing_public_key, data, signature)
        return True
    except Exception:
        return False
