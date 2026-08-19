from __future__ import annotations

import hashlib


def bits_to_bytes(bits: str) -> bytes:
    if not bits or any(bit not in "01" for bit in bits):
        raise ValueError("bits must be a non-empty binary string")
    padding = (-len(bits)) % 8
    return int(bits + ("0" * padding), 2).to_bytes((len(bits) + padding) // 8, "big")


def derive_key(sifted_key: str) -> bytes:
    return hashlib.sha256(bits_to_bytes(sifted_key)).digest()
