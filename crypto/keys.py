import base64
import json
import os


def encode_key(key_bytes: bytes) -> str:
    return base64.b64encode(key_bytes).decode("ascii")


def decode_key(key_string: str) -> bytes:
    return base64.b64decode(key_string)


def export_keypair(public_key: bytes, secret_key: bytes) -> dict:
    return {
        "public_key": encode_key(public_key),
        "secret_key": encode_key(secret_key),
    }


def import_public_key(keypair_data: dict) -> bytes:
    return decode_key(keypair_data["public_key"])


def import_secret_key(keypair_data: dict) -> bytes:
    return decode_key(keypair_data["secret_key"])


def save_keypair(keypair_data: dict, filepath: str):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(keypair_data, f, indent=2)


def load_keypair(filepath: str) -> dict:
    with open(filepath, "r") as f:
        return json.load(f)
