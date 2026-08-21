# Envelope interop guard

Proves the Python and browser envelope v2 implementations are byte-compatible, so
mail sealed on one side opens on the other. This is the contract behind client-side
key custody — if it breaks, encrypted mail becomes unreadable across ends.

Covers: ML-KEM-768 encaps/decaps, ML-DSA-65 sign/verify, hybrid X25519+ML-KEM HKDF,
AES-256-GCM with context AAD, subject binding, and the length-prefix framing — end
to end through `seal_envelope` / `open_envelope` in both directions.

## Run

```bash
venv/Scripts/python.exe interop/run.py
```

Requires the frontend dependencies installed (`cd frontend && npm install`) — the
guard bundles `frontend/src/crypto/envelope.ts` with Vite and runs it under Node.

## Layout

- `entry.ts` — re-exports the client crypto surface the guard exercises.
- `build.mjs` — Vite lib build of `entry.ts` into `dist/envelope_bundle.mjs`.
- `py_side.py` / `node_side.mjs` — the two sides; each stage exchanges JSON in a temp dir.
- `run.py` — builds the bundle and runs both rounds; non-zero exit on mismatch.
