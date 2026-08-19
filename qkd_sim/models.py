from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional


@dataclass
class BB84Result:
    success: bool
    raw_key: str
    final_key: Optional[bytes]
    sifted_key: str
    qber: float
    alice_bases: List[int]
    bob_bases: List[int]
    alice_bits: List[int]
    bob_bits: List[int]
    matching_positions: List[int]
    eve_detected: bool
    test_positions: List[int]
    message: str


@dataclass
class QKDKeyMetadata:
    key_id: str
    sender_id: str
    receiver_id: str
    created_at: datetime
    expires_at: datetime
    status: str
    qber: float

    def as_dict(self) -> dict:
        return {
            "key_id": self.key_id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "status": self.status,
            "qber": self.qber,
        }
