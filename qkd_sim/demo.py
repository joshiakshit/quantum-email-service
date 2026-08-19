from __future__ import annotations

from .bb84 import BB84Simulator


def main() -> None:
    simulator = BB84Simulator()
    print("=" * 40)
    print("        QuMail QKD DEMONSTRATION")
    print("=" * 40)
    for title, eve_enabled in (("Scenario 1: No Eavesdropper", False), ("Scenario 2: Eve Present", True)):
        result = simulator.simulate(256, eve_enabled=eve_enabled)
        print(f"\n{title}\n")
        print("Alice -> Eve -> Bob" if eve_enabled else "Alice -> Quantum Channel -> Bob")
        print(f"Generated bits:        {len(result.alice_bits)}")
        print(f"Sifted bits:           {len(result.sifted_key)}")
        print(f"Test bits:             {len(result.test_positions)}")
        print(f"QBER:                  {result.qber:.2%}")
        print(f"Protocol status:       {'SUCCESS' if result.success else 'ABORTED'}")
        print("Shared key established." if result.success else "Eavesdropping/channel disturbance detected.")
        print("-" * 40)


if __name__ == "__main__":
    main()
