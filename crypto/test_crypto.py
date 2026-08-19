import sys
import os
import json
import tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto.pqc import (
    generate_kem_keypair,
    generate_signing_keypair,
    kem_encapsulate,
    kem_decapsulate,
    sign_message,
    verify_signature,
    KEM_PUBLIC_KEY_SIZE,
    KEM_SECRET_KEY_SIZE,
    SIGNING_PUBLIC_KEY_SIZE,
)
from crypto.symmetric import encrypt, decrypt
from crypto.envelope import seal_envelope, open_envelope
from crypto.keys import encode_key, decode_key, export_keypair, save_keypair, load_keypair
from crypto.email_helpers import envelope_to_mime, mime_to_envelope, extract_metadata
from crypto.qkd import QKDSimulator


def test_kem_roundtrip():
    pk, sk = generate_kem_keypair()
    ct, shared_secret_sender = kem_encapsulate(pk)
    shared_secret_recipient = kem_decapsulate(sk, ct)
    assert shared_secret_sender == shared_secret_recipient
    assert len(shared_secret_sender) == 32
    print(f"[PASS] KEM round-trip: {len(pk)}B pk, {len(sk)}B sk, 32B shared secret")


def test_signing_roundtrip():
    pk, sk = generate_signing_keypair()
    message = b"test message for signing"
    sig = sign_message(sk, message)
    assert verify_signature(pk, message, sig) is True
    assert verify_signature(pk, b"tampered message", sig) is False
    print(f"[PASS] Signing round-trip: valid signature accepted, tampered rejected")


def test_symmetric_roundtrip():
    key = os.urandom(32)
    plaintext = b"hello quantum world"
    nonce, ciphertext, tag = encrypt(key, plaintext)
    recovered = decrypt(key, nonce, ciphertext, tag)
    assert recovered == plaintext
    print(f"[PASS] AES-256-GCM round-trip: encryption and decryption match")


def test_envelope_roundtrip():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    message = b"Quantum-secured message from Alice to Bob"
    sealed = seal_envelope(message, bob_kem_pk, alice_sig_sk, alice_sig_pk)
    recovered = open_envelope(sealed, bob_kem_sk)
    assert recovered == message
    print(f"[PASS] Envelope round-trip: {len(sealed)}B envelope, message recovered")


def test_envelope_tamper_detection():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    sealed = seal_envelope(b"Original message", bob_kem_pk, alice_sig_sk, alice_sig_pk)

    envelope = json.loads(sealed)
    envelope["ciphertext"] = encode_key(b"tampered")
    tampered_json = json.dumps(envelope)

    try:
        open_envelope(tampered_json, bob_kem_sk)
        assert False, "Should have raised on tampered envelope"
    except ValueError as e:
        assert "tampered" in str(e).lower()
    print(f"[PASS] Tamper detection: rejected tampered envelope")


def test_wrong_key_decryption():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    _, eve_kem_sk = generate_kem_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    sealed = seal_envelope(b"Secret message", bob_kem_pk, alice_sig_sk, alice_sig_pk)

    try:
        open_envelope(sealed, eve_kem_sk)
        assert False, "Should have failed with wrong key"
    except Exception:
        pass
    print(f"[PASS] Wrong key decryption: rejected with Eve's key")


def test_key_serialization():
    pk, sk = generate_kem_keypair()
    encoded = encode_key(pk)
    decoded = decode_key(encoded)
    assert decoded == pk

    keypair = export_keypair(pk, sk)
    assert "public_key" in keypair
    assert "secret_key" in keypair
    print(f"[PASS] Key serialization: encode/decode round-trip OK")


def test_key_file_persistence():
    pk, sk = generate_kem_keypair()
    keypair = export_keypair(pk, sk)

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
        filepath = f.name

    try:
        save_keypair(keypair, filepath)
        loaded = load_keypair(filepath)
        assert loaded["public_key"] == keypair["public_key"]
        assert loaded["secret_key"] == keypair["secret_key"]
    finally:
        os.unlink(filepath)
    print(f"[PASS] Key file persistence: save and load match")


def test_input_validation():
    try:
        kem_encapsulate(b"too short")
        assert False, "Should reject wrong-size key"
    except ValueError:
        pass

    try:
        sign_message(b"bad key", b"data")
        assert False, "Should reject wrong-size signing key"
    except ValueError:
        pass

    try:
        encrypt(b"short key", b"data")
        assert False, "Should reject wrong-size AES key"
    except ValueError:
        pass

    print(f"[PASS] Input validation: bad key sizes rejected")


def test_mime_roundtrip():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    message = b"MIME round-trip test message"
    sealed = seal_envelope(message, bob_kem_pk, alice_sig_sk, alice_sig_pk)

    mime_msg = envelope_to_mime(sealed, "alice@qumail.local", "bob@qumail.local", "Test Subject")
    raw_email = mime_msg.as_string()

    metadata = extract_metadata(raw_email)
    assert metadata["is_qumail"] is True
    assert metadata["from"] == "alice@qumail.local"
    assert metadata["to"] == "bob@qumail.local"
    assert metadata["subject"] == "Test Subject"

    recovered_envelope = mime_to_envelope(raw_email)
    recovered_message = open_envelope(recovered_envelope, bob_kem_sk)
    assert recovered_message == message
    print(f"[PASS] MIME round-trip: envelope survives MIME encode/decode")


def test_qkd_simulator():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
        store_path = f.name

    try:
        qkd = QKDSimulator(store_path)
        session_id, key = qkd.generate_shared_key("alice@qumail.local", "bob@qumail.local")
        assert len(key) == 32
        assert qkd.has_shared_key("alice@qumail.local", "bob@qumail.local")
        assert qkd.has_shared_key("bob@qumail.local", "alice@qumail.local")

        retrieved = qkd.get_shared_key("alice@qumail.local", "bob@qumail.local")
        assert retrieved == key

        qkd2 = QKDSimulator(store_path)
        assert qkd2.get_shared_key("alice@qumail.local", "bob@qumail.local") == key

        qkd.revoke_key("alice@qumail.local", "bob@qumail.local")
        assert not qkd.has_shared_key("alice@qumail.local", "bob@qumail.local")
    finally:
        os.unlink(store_path)
    print(f"[PASS] QKD simulator: generate, retrieve, persist, revoke all work")


def test_envelope_with_large_payload():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    large_message = b"A" * 100_000
    sealed = seal_envelope(large_message, bob_kem_pk, alice_sig_sk, alice_sig_pk)
    recovered = open_envelope(sealed, bob_kem_sk)
    assert recovered == large_message
    print(f"[PASS] Large payload: 100KB message encrypted and recovered")


if __name__ == "__main__":
    test_kem_roundtrip()
    test_signing_roundtrip()
    test_symmetric_roundtrip()
    test_envelope_roundtrip()
    test_envelope_tamper_detection()
    test_wrong_key_decryption()
    test_key_serialization()
    test_key_file_persistence()
    test_input_validation()
    test_mime_roundtrip()
    test_qkd_simulator()
    test_envelope_with_large_payload()
    print("\nAll tests passed.")
