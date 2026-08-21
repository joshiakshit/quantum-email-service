import sys
import os
import json
import tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto.pqc import (
    generate_kem_keypair,
    generate_signing_keypair,
    generate_x25519_keypair,
    kem_encapsulate,
    kem_decapsulate,
    sign_message,
    verify_signature,
    hybrid_kem_encapsulate,
    hybrid_kem_decapsulate,
    KEM_PUBLIC_KEY_SIZE,
    KEM_SECRET_KEY_SIZE,
    SIGNING_PUBLIC_KEY_SIZE,
    X25519_KEY_SIZE,
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


def test_symmetric_aad():
    key = os.urandom(32)
    plaintext = b"hello with aad"
    aad = b"context-binding-data"
    nonce, ciphertext, tag = encrypt(key, plaintext, aad=aad)
    recovered = decrypt(key, nonce, ciphertext, tag, aad=aad)
    assert recovered == plaintext

    try:
        decrypt(key, nonce, ciphertext, tag, aad=b"wrong-aad")
        assert False, "Should reject mismatched AAD"
    except ValueError:
        pass

    try:
        decrypt(key, nonce, ciphertext, tag)
        assert False, "Should reject missing AAD when AAD was used"
    except ValueError:
        pass
    print(f"[PASS] AES-256-GCM AAD: correct AAD passes, wrong/missing AAD rejected")


def test_x25519_roundtrip():
    pk_a, sk_a = generate_x25519_keypair()
    pk_b, sk_b = generate_x25519_keypair()
    assert len(pk_a) == X25519_KEY_SIZE
    assert len(sk_a) == X25519_KEY_SIZE
    from crypto.pqc import _x25519_exchange
    ss_ab = _x25519_exchange(sk_a, pk_b)
    ss_ba = _x25519_exchange(sk_b, pk_a)
    assert ss_ab == ss_ba
    print(f"[PASS] X25519 key exchange: shared secrets match")


def test_hybrid_kem_roundtrip():
    kem_pk, kem_sk = generate_kem_keypair()
    x25519_pk, x25519_sk = generate_x25519_keypair()

    kem_ct, ephem_pk, session_key_sender = hybrid_kem_encapsulate(kem_pk, x25519_pk)
    session_key_recipient = hybrid_kem_decapsulate(kem_sk, x25519_sk, kem_ct, ephem_pk)
    assert session_key_sender == session_key_recipient
    assert len(session_key_sender) == 32
    print(f"[PASS] Hybrid KEM round-trip: X25519+ML-KEM-768 session keys match")


def test_envelope_v2_roundtrip():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    bob_x25519_pk, bob_x25519_sk = generate_x25519_keypair()
    _, alice_sig_sk = generate_signing_keypair()

    message = b"Quantum-secured message from Alice to Bob"
    sealed = seal_envelope(
        message, bob_kem_pk, alice_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
        subject="Test Subject",
    )

    envelope = json.loads(sealed)
    assert envelope["version"] == 2
    assert envelope["kem"] == "X25519+ML-KEM-768"
    assert "sender_verify_key" not in envelope
    assert "message_id" in envelope
    assert "timestamp" in envelope

    alice_sig_pk, _ = generate_signing_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    sealed = seal_envelope(
        message, bob_kem_pk, alice_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
        subject="Test Subject",
    )

    recovered = open_envelope(sealed, bob_kem_sk, bob_x25519_sk, alice_sig_pk)
    assert recovered == message
    print(f"[PASS] Envelope v2 round-trip: {len(sealed)}B envelope, message recovered")


def test_envelope_v2_forgery_rejected():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    bob_x25519_pk, bob_x25519_sk = generate_x25519_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()
    _, eve_sig_sk = generate_signing_keypair()

    sealed = seal_envelope(
        b"Legit message", bob_kem_pk, eve_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
    )

    try:
        open_envelope(sealed, bob_kem_sk, bob_x25519_sk, alice_sig_pk)
        assert False, "Should reject envelope signed by Eve when verifying with Alice's key"
    except ValueError as e:
        assert "Signature verification failed" in str(e)
    print(f"[PASS] Forgery rejected: Eve's signature fails against Alice's verify key")


def test_envelope_v2_context_binding():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    bob_x25519_pk, bob_x25519_sk = generate_x25519_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    sealed = seal_envelope(
        b"Context bound message", bob_kem_pk, alice_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
        subject="Original Subject",
    )

    envelope = json.loads(sealed)
    envelope["sender_id"] = "eve@evil.local"
    tampered = json.dumps(envelope)
    try:
        open_envelope(tampered, bob_kem_sk, bob_x25519_sk, alice_sig_pk)
        assert False, "Should reject tampered sender_id"
    except ValueError:
        pass

    envelope = json.loads(sealed)
    envelope["subject"] = "Phishing Subject"
    tampered = json.dumps(envelope)
    try:
        open_envelope(tampered, bob_kem_sk, bob_x25519_sk, alice_sig_pk)
        assert False, "Should reject tampered subject"
    except ValueError:
        pass
    print(f"[PASS] Context binding: tampered sender_id and subject both rejected")


def test_envelope_v2_replay_has_message_id():
    bob_kem_pk, _ = generate_kem_keypair()
    bob_x25519_pk, _ = generate_x25519_keypair()
    _, alice_sig_sk = generate_signing_keypair()

    sealed = seal_envelope(
        b"Check replay fields", bob_kem_pk, alice_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
    )
    envelope = json.loads(sealed)
    assert len(envelope["message_id"]) == 36
    assert isinstance(envelope["timestamp"], int)
    assert envelope["timestamp"] > 0
    print(f"[PASS] Replay defence: message_id and timestamp present")


def test_envelope_v1_compat():
    from crypto.pqc import kem_encapsulate as _enc
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    kem_ct, shared_secret = _enc(bob_kem_pk)
    nonce, ciphertext, tag = encrypt(shared_secret, b"V1 legacy message")
    signed_payload = kem_ct + nonce + ciphertext + tag
    signature = sign_message(alice_sig_sk, signed_payload)

    import base64
    def b64(data): return base64.b64encode(data).decode("ascii")
    v1_envelope = json.dumps({
        "version": 1,
        "kem_algorithm": "ML-KEM-768",
        "sig_algorithm": "ML-DSA-65",
        "sym_algorithm": "AES-256-GCM",
        "kem_ciphertext": b64(kem_ct),
        "nonce": b64(nonce),
        "ciphertext": b64(ciphertext),
        "tag": b64(tag),
        "signature": b64(signature),
        "sender_verify_key": b64(alice_sig_pk),
    })

    recovered = open_envelope(v1_envelope, bob_kem_sk)
    assert recovered == b"V1 legacy message"
    print(f"[PASS] V1 compat: legacy envelope opens correctly")


def test_envelope_tamper_detection():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    bob_x25519_pk, bob_x25519_sk = generate_x25519_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    sealed = seal_envelope(
        b"Original message", bob_kem_pk, alice_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
    )

    envelope = json.loads(sealed)
    envelope["ciphertext"] = encode_key(b"tampered")
    tampered_json = json.dumps(envelope)

    try:
        open_envelope(tampered_json, bob_kem_sk, bob_x25519_sk, alice_sig_pk)
        assert False, "Should have raised on tampered envelope"
    except ValueError:
        pass
    print(f"[PASS] Tamper detection: rejected tampered envelope")


def test_wrong_key_decryption():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    bob_x25519_pk, bob_x25519_sk = generate_x25519_keypair()
    _, eve_kem_sk = generate_kem_keypair()
    _, eve_x25519_sk = generate_x25519_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    sealed = seal_envelope(
        b"Secret message", bob_kem_pk, alice_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
    )

    try:
        open_envelope(sealed, eve_kem_sk, eve_x25519_sk, alice_sig_pk)
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
    bob_x25519_pk, bob_x25519_sk = generate_x25519_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    message = b"MIME round-trip test message"
    sealed = seal_envelope(
        message, bob_kem_pk, alice_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
        subject="Test Subject",
    )

    mime_msg = envelope_to_mime(sealed, "alice@qmail.local", "bob@qmail.local", "Test Subject")
    raw_email = mime_msg.as_string()

    metadata = extract_metadata(raw_email)
    assert metadata["is_qmail"] is True
    assert metadata["from"] == "alice@qmail.local"
    assert metadata["to"] == "bob@qmail.local"
    assert metadata["subject"] == "Test Subject"

    recovered_envelope = mime_to_envelope(raw_email)
    recovered_message = open_envelope(recovered_envelope, bob_kem_sk, bob_x25519_sk, alice_sig_pk)
    assert recovered_message == message
    print(f"[PASS] MIME round-trip: envelope survives MIME encode/decode")


def test_qkd_simulator():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
        store_path = f.name

    try:
        qkd = QKDSimulator(store_path)
        session_id, key = qkd.generate_shared_key("alice@qmail.local", "bob@qmail.local")
        assert len(key) == 32
        assert qkd.has_shared_key("alice@qmail.local", "bob@qmail.local")
        assert qkd.has_shared_key("bob@qmail.local", "alice@qmail.local")

        retrieved = qkd.get_shared_key("alice@qmail.local", "bob@qmail.local")
        assert retrieved == key

        qkd2 = QKDSimulator(store_path)
        assert qkd2.get_shared_key("alice@qmail.local", "bob@qmail.local") == key

        qkd.revoke_key("alice@qmail.local", "bob@qmail.local")
        assert not qkd.has_shared_key("alice@qmail.local", "bob@qmail.local")
    finally:
        os.unlink(store_path)
    print(f"[PASS] QKD simulator: generate, retrieve, persist, revoke all work")


def test_envelope_with_large_payload():
    bob_kem_pk, bob_kem_sk = generate_kem_keypair()
    bob_x25519_pk, bob_x25519_sk = generate_x25519_keypair()
    alice_sig_pk, alice_sig_sk = generate_signing_keypair()

    large_message = b"A" * 100_000
    sealed = seal_envelope(
        large_message, bob_kem_pk, alice_sig_sk,
        "alice@qmail.local", "bob@qmail.local",
        recipient_x25519_pk=bob_x25519_pk,
    )
    recovered = open_envelope(sealed, bob_kem_sk, bob_x25519_sk, alice_sig_pk)
    assert recovered == large_message
    print(f"[PASS] Large payload: 100KB message encrypted and recovered")


if __name__ == "__main__":
    test_kem_roundtrip()
    test_signing_roundtrip()
    test_symmetric_roundtrip()
    test_symmetric_aad()
    test_x25519_roundtrip()
    test_hybrid_kem_roundtrip()
    test_envelope_v2_roundtrip()
    test_envelope_v2_forgery_rejected()
    test_envelope_v2_context_binding()
    test_envelope_v2_replay_has_message_id()
    test_envelope_v1_compat()
    test_envelope_tamper_detection()
    test_wrong_key_decryption()
    test_key_serialization()
    test_key_file_persistence()
    test_input_validation()
    test_mime_roundtrip()
    test_qkd_simulator()
    test_envelope_with_large_payload()
    print("\nAll tests passed.")
