import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pqcrypto.sign import ml_dsa_65
from pqcrypto.kem import ml_kem_768
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives import serialization

from crypto.envelope import seal_envelope, open_envelope

WORK = sys.argv[1]
STAGE = sys.argv[2]

b = lambda h: bytes.fromhex(h)
h = lambda x: x.hex()
rd = lambda f: json.load(open(os.path.join(WORK, f), encoding="utf-8"))
wr = lambda f, o: json.dump(o, open(os.path.join(WORK, f), "w", encoding="utf-8"))


def _x25519_raw():
    priv = X25519PrivateKey.generate()
    sk = priv.private_bytes(
        serialization.Encoding.Raw, serialization.PrivateFormat.Raw,
        serialization.NoEncryption(),
    )
    pk = priv.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw,
    )
    return sk, pk


if STAGE == "seal":
    # Round A: Python is the sender; recipient public keys came from TS.
    rp = rd("ts_recipient_public.json")
    sign_pk, sign_sk = ml_dsa_65.keygen()
    plaintext = "Round A: Python seals, TS opens."
    env = seal_envelope(
        plaintext.encode("utf-8"),
        b(rp["kem_pk"]), sign_sk,
        "py-sender-01", "ts-recipient-01",
        recipient_x25519_pk=b(rp["x25519_pk"]),
        subject="Interop Subject A",
    )
    wr("py_sealed.json", {
        "envelope": env, "sender_verify_key": h(sign_pk), "expected_plaintext": plaintext,
    })

elif STAGE == "gen-recipient":
    # Round B: Python is the recipient. Keypair generated locally; only public keys ship.
    kem_pk, kem_sk = ml_kem_768.keygen()
    x_sk, x_pk = _x25519_raw()
    wr("py_recipient_secret.json", {"kem_sk": h(kem_sk), "x25519_sk": h(x_sk)})
    wr("py_recipient_public.json", {"kem_pk": h(kem_pk), "x25519_pk": h(x_pk)})

elif STAGE == "open":
    # Round B: open the envelope TS sealed to the Python recipient.
    sec = rd("py_recipient_secret.json")
    sealed = rd("ts_sealed.json")
    pt = open_envelope(
        sealed["envelope"], b(sec["kem_sk"]), b(sec["x25519_sk"]),
        b(sealed["sender_verify_key"]),
    )
    ok = pt.decode("utf-8") == sealed["expected_plaintext"]
    wr("result_B.json", {"ok": ok})

else:
    raise SystemExit(f"unknown stage: {STAGE}")
