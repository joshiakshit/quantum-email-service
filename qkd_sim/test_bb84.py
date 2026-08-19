from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from qkd_sim.bb84 import BB84Simulator
from qkd_sim.key_derivation import derive_key
from qkd_sim.qkd_service import QKDKeyStore, QKDService


def test_no_eve_has_zero_qber_and_succeeds():
    result = BB84Simulator().simulate(256)
    assert result.success is True
    assert result.qber == 0.0
    assert result.final_key is not None


def test_eve_raises_qber_and_usually_aborts():
    results = [BB84Simulator().simulate(256, eve_enabled=True) for _ in range(5)]
    assert sum(result.qber for result in results) / len(results) > 0.11
    assert sum(not result.success for result in results) >= 3


def test_alice_and_bob_derive_identical_key_without_eve():
    result = BB84Simulator().simulate(256)
    test_positions = set(result.test_positions)
    alice_remaining = "".join(
        bit for index, bit in enumerate(result.sifted_key) if index not in test_positions
    )
    bob_remaining = "".join(
        str(result.bob_bits[position])
        for index, position in enumerate(result.matching_positions)
        if index not in test_positions
    )
    assert result.final_key == derive_key(alice_remaining) == derive_key(bob_remaining)
    assert len(result.final_key) == 32


def test_invalid_key_lengths_raise():
    with pytest.raises(ValueError):
        BB84Simulator().simulate(7)
    with pytest.raises(ValueError):
        BB84Simulator().simulate(256, error_rate=1.1)


def test_key_store_pair_lookup_is_symmetric():
    service_instance = QKDService()
    metadata = service_instance.generate_shared_key("alice", "bob")
    assert service_instance.get_key("alice", "bob") == service_instance.get_key("bob", "alice")
    assert service_instance.key_store.metadata(metadata.key_id).status == "active"


def test_expired_keys_are_not_active():
    store = QKDKeyStore()
    metadata = QKDService(store, ttl_seconds=0).generate_shared_key("alice", "bob")
    assert store.get_active("alice", "bob") is None
    assert store.metadata(metadata.key_id).status == "expired"
