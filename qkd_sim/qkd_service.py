from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from .bb84 import BB84Simulator
from .config import DEFAULT_KEY_LENGTH, DEFAULT_KEY_TTL_SECONDS
from .models import QKDKeyMetadata


class QKDKeyStore:
    def __init__(self) -> None:
        self._keys: Dict[str, Tuple[QKDKeyMetadata, bytes]] = {}
        self._pair_index: Dict[Tuple[str, str], str] = {}

    @staticmethod
    def pair_key(sender_id: str, receiver_id: str) -> Tuple[str, str]:
        if not sender_id or not receiver_id or sender_id == receiver_id:
            raise ValueError("sender_id and receiver_id must be distinct and non-empty")
        return tuple(sorted((sender_id, receiver_id)))

    def put(self, metadata: QKDKeyMetadata, secret_key: bytes) -> None:
        self._keys[metadata.key_id] = (metadata, secret_key)
        self._pair_index[self.pair_key(metadata.sender_id, metadata.receiver_id)] = metadata.key_id

    def metadata(self, key_id: str) -> Optional[QKDKeyMetadata]:
        entry = self._keys.get(key_id)
        if entry is None:
            return None
        metadata, _ = entry
        if metadata.status == "active" and metadata.expires_at <= datetime.now(timezone.utc):
            metadata.status = "expired"
        return metadata

    def get_active(self, sender_id: str, receiver_id: str) -> Optional[bytes]:
        key_id = self._pair_index.get(self.pair_key(sender_id, receiver_id))
        if key_id is None:
            return None
        metadata, secret_key = self._keys[key_id]
        if metadata.status == "active" and metadata.expires_at > datetime.now(timezone.utc):
            return secret_key
        metadata.status = "expired"
        return None

    def mark_used(self, key_id: str) -> None:
        metadata = self.metadata(key_id)
        if metadata is None:
            raise KeyError("QKD key metadata not found")
        if metadata.status != "active":
            raise ValueError("only active QKD keys can be marked used")
        metadata.status = "used"

    def get_metadata_for_pair(self, sender_id: str, receiver_id: str) -> Optional[QKDKeyMetadata]:
        key_id = self._pair_index.get(self.pair_key(sender_id, receiver_id))
        return self.metadata(key_id) if key_id else None


class QKDService:
    def __init__(
        self,
        key_store: Optional[QKDKeyStore] = None,
        ttl_seconds: int = DEFAULT_KEY_TTL_SECONDS,
    ) -> None:
        self.key_store = key_store or QKDKeyStore()
        self.ttl_seconds = ttl_seconds
        self.simulator = BB84Simulator()

    def generate_shared_key(
        self,
        sender_id: str,
        receiver_id: str,
        key_length: int = DEFAULT_KEY_LENGTH,
    ) -> QKDKeyMetadata:
        result = self.simulator.simulate(key_length=key_length)
        if not result.success or result.final_key is None:
            raise RuntimeError(result.message)
        now = datetime.now(timezone.utc)
        metadata = QKDKeyMetadata(
            key_id=f"qkd-{secrets.token_urlsafe(12)}",
            sender_id=sender_id,
            receiver_id=receiver_id,
            created_at=now,
            expires_at=now + timedelta(seconds=self.ttl_seconds),
            status="active",
            qber=result.qber,
        )
        self.key_store.put(metadata, result.final_key)
        return metadata

    def get_key(self, client_id: str, peer_id: str) -> Optional[bytes]:
        return self.key_store.get_active(client_id, peer_id)
