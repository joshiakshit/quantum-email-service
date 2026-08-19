from __future__ import annotations

import secrets

from .config import DEFAULT_KEY_LENGTH, QBER_THRESHOLD, MIN_KEY_LENGTH
from .key_derivation import derive_key
from .models import BB84Result


class BB84Simulator:
    def __init__(self, qber_threshold: float = QBER_THRESHOLD) -> None:
        if not 0 <= qber_threshold <= 1:
            raise ValueError("qber_threshold must be between 0 and 1")
        self.qber_threshold = qber_threshold

    def simulate(
        self,
        key_length: int = DEFAULT_KEY_LENGTH,
        eve_enabled: bool = False,
        error_rate: float = 0.0,
    ) -> BB84Result:
        self._validate_inputs(key_length, error_rate)
        alice_bits = [secrets.randbits(1) for _ in range(key_length)]
        alice_bases = [secrets.randbits(1) for _ in range(key_length)]
        bob_bases = [secrets.randbits(1) for _ in range(key_length)]

        transmitted_bits = alice_bits[:]
        transmitted_bases = alice_bases[:]
        if eve_enabled:
            eve_bases = [secrets.randbits(1) for _ in range(key_length)]
            transmitted_bits = [
                bit if eve_basis == alice_basis else secrets.randbits(1)
                for bit, alice_basis, eve_basis in zip(alice_bits, alice_bases, eve_bases)
            ]
            transmitted_bases = eve_bases

        bob_bits = []
        for bit, state_basis, bob_basis in zip(transmitted_bits, transmitted_bases, bob_bases):
            measured_bit = bit if state_basis == bob_basis else secrets.randbits(1)
            if error_rate and secrets.randbelow(10_000) < int(error_rate * 10_000):
                measured_bit ^= 1
            bob_bits.append(measured_bit)

        matching_positions = [
            index for index, (alice_basis, bob_basis) in enumerate(zip(alice_bases, bob_bases))
            if alice_basis == bob_basis
        ]
        sifted_key = "".join(str(alice_bits[index]) for index in matching_positions)
        sifted_bob_key = "".join(str(bob_bits[index]) for index in matching_positions)

        test_count = min(max(1, len(matching_positions) // 4), len(matching_positions))
        test_positions = (
            sorted(secrets.SystemRandom().sample(range(len(matching_positions)), test_count))
            if test_count
            else []
        )
        mismatches = sum(sifted_key[index] != sifted_bob_key[index] for index in test_positions)
        qber = mismatches / test_count if test_count else 0.0
        eve_detected = qber > self.qber_threshold
        success = not eve_detected and len(matching_positions) > test_count

        if success:
            disclosed_positions = set(test_positions)
            retained_bits = "".join(
                bit for index, bit in enumerate(sifted_key) if index not in disclosed_positions
            )
            final_key = derive_key(retained_bits)
            message = "QKD key established successfully."
        else:
            final_key = None
            message = (
                "QKD protocol aborted because the observed QBER exceeds the security threshold. "
                "Possible eavesdropping or noisy quantum channel detected."
                if eve_detected
                else "QKD protocol did not produce enough sifted bits for a key."
            )

        return BB84Result(
            success=success,
            raw_key="".join(map(str, alice_bits)),
            final_key=final_key,
            sifted_key=sifted_key,
            qber=qber,
            alice_bases=alice_bases,
            bob_bases=bob_bases,
            alice_bits=alice_bits,
            bob_bits=bob_bits,
            matching_positions=matching_positions,
            eve_detected=eve_detected,
            test_positions=test_positions,
            message=message,
        )

    @staticmethod
    def _validate_inputs(key_length: int, error_rate: float) -> None:
        if not isinstance(key_length, int) or isinstance(key_length, bool) or key_length < MIN_KEY_LENGTH:
            raise ValueError(f"key_length must be an integer >= {MIN_KEY_LENGTH}")
        if not 0 <= error_rate <= 1:
            raise ValueError("error_rate must be between 0 and 1")
