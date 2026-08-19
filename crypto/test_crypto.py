import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto.pqc import (
    generate_kem_keypair,
    generate_signing_keypair,
    kem_encapsulate,
    kem_decapsulate,
    sign_message,
    verify_signature,
)
from crypto.symmetric import encrypt, decrypt
from crypto.envelope import seal_envelope, open_envelope
from crypto.keys import encode_key, decode_key, export_keypair


def test_kem_roundtrip():
    pk, sk = generate_kem_keypair()
    ct, shared_secret_sender = kem_encapsulate(pk)
    shared_secret_recipient = kem_decapsulate(sk, ct)
    assert shared_secret_sender == shared_secret_recipient
    assert len(shared_secret_sender) == 32
    print(f"[PASS] KEM round-trip: {len(pk)}B pk, {len(sk)}B sk, {len(shared_secret_sender)}B shared secret")


def test_signing_roundtrip():
    pk, sk = generate_signing_keypair()
    message = b"test message for signing"
    sig = sign_message(sk, message)
    assert verify_signature(pk, message, sig) is True
    assert verify_signature(pk, b"tampered message", sig) is False
    print(f"[PASS] Signing round-trip: {len(pk)}B pk, {len(sig)}B signature, tamper detection works")


def test_symmetric_roundtrip():
    key = os.urandom(32)
    plaintext = b"hello quantum world"
    nonce, ciphertext, tag = encrypt(key, plaintext)
    recovered = decrypt(key, nonce, ciphertext, tag)
    assert recovered == plaintext
    print(f"[PASS] AES-256-GCM round-trip: {len(ciphertext)}B ciphertext, {len(tag)}B tag")


def test_envelope_roundtrip():
    alice_kem_pk, alice_kem_sk = generate_kem_keypair()
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    message = b"Quantum-secured message from Alice to Bob"

    sealed = seal_envelope(message, bob_kem_pk, alice_sig_sk, alice_sig_pk)
    recovered = open_envelope(sealed, bob_kem_sk)
    assert recovered == message
    print(f"[PASS] Envelope round-trip: {len(sealed)}B envelope, message recovered correctly")


def test_envelope_tamper_detection():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    message = b"Original message"
    sealed = seal_envelope(message, bob_kem_pk, alice_sig_sk, alice_sig_pk)

    import json
    envelope = json.loads(sealed)
    envelope["ciphertext"] = encode_key(b"tampered")
    tampered_json = json.dumps(envelope)

    try:
        open_envelope(tampered_json, bob_kem_sk)
        assert False, "Should have raised on tampered envelope"
    except ValueError as e:
        assert "tampered" in str(e).lower()
        print(f"[PASS] Tamper detection: rejected tampered envelope")


def test_key_serialization():
    pk, sk = generate_kem_keypair()
    encoded = encode_key(pk)
    decoded = decode_key(encoded)
    assert decoded == pk

    keypair = export_keypair(pk, sk)
    assert "public_key" in keypair
    assert "secret_key" in keypair
    print(f"[PASS] Key serialization: encode/decode round-trip OK")


if __name__ == "__main__":
    test_kem_roundtrip()
    test_signing_roundtrip()
    test_symmetric_roundtrip()
    test_envelope_roundtrip()
    test_envelope_tamper_detection()
    test_key_serialization()
    print("\nAll tests passed.")
