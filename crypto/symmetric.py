from Crypto.Cipher import AES
import os

NONCE_SIZE = 12
AES_KEY_SIZE = 32


def encrypt(key: bytes, plaintext: bytes) -> tuple[bytes, bytes, bytes]:
    if len(key) != AES_KEY_SIZE:
        raise ValueError(f"AES key must be {AES_KEY_SIZE} bytes, got {len(key)}")
    if not isinstance(plaintext, bytes):
        raise TypeError(f"Plaintext must be bytes, got {type(plaintext).__name__}")
    nonce = os.urandom(NONCE_SIZE)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    return nonce, ciphertext, tag


def decrypt(key: bytes, nonce: bytes, ciphertext: bytes, tag: bytes) -> bytes:
    if len(key) != AES_KEY_SIZE:
        raise ValueError(f"AES key must be {AES_KEY_SIZE} bytes, got {len(key)}")
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    return plaintext
