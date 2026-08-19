from __future__ import annotations

import os
import hashlib
import json

from crypto.keys import encode_key, decode_key
from qkd_sim.bb84 import BB84Simulator

QKD_KEY_SIZE = 32

_simulator = BB84Simulator()


class QKDSimulator:

    def __init__(self, key_store_path: str = None):
        self.key_store_path = key_store_path
        self._keys = {}
        if key_store_path and os.path.exists(key_store_path) and os.path.getsize(key_store_path) > 0:
            self._load_store()

    def _session_id(self, party_a: str, party_b: str) -> str:
        pair = tuple(sorted([party_a, party_b]))
        return hashlib.sha256(f"{pair[0]}:{pair[1]}".encode()).hexdigest()[:16]

    def generate_shared_key(self, party_a: str, party_b: str) -> tuple:
        session_id = self._session_id(party_a, party_b)
        result = _simulator.simulate(key_length=QKD_KEY_SIZE * 8)
        if not result.success or result.final_key is None:
            raise RuntimeError(result.message)
        key = result.final_key
        self._keys[session_id] = encode_key(key)
        if self.key_store_path:
            self._save_store()
        return session_id, key

    def get_shared_key(self, party_a: str, party_b: str) -> bytes:
        session_id = self._session_id(party_a, party_b)
        if session_id not in self._keys:
            raise KeyError(f"No QKD session key for {party_a} <-> {party_b}")
        return decode_key(self._keys[session_id])

    def has_shared_key(self, party_a: str, party_b: str) -> bool:
        session_id = self._session_id(party_a, party_b)
        return session_id in self._keys

    def revoke_key(self, party_a: str, party_b: str):
        session_id = self._session_id(party_a, party_b)
        self._keys.pop(session_id, None)
        if self.key_store_path:
            self._save_store()

    def _save_store(self):
        os.makedirs(os.path.dirname(self.key_store_path), exist_ok=True)
        with open(self.key_store_path, "w") as f:
            json.dump(self._keys, f, indent=2)

    def _load_store(self):
        with open(self.key_store_path, "r") as f:
            self._keys = json.load(f)
