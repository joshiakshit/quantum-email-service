"""Cross-language envelope interop guard.

Proves crypto/envelope.py (Python, pqcrypto) and frontend/src/crypto/envelope.ts
(browser, @noble) produce and consume byte-identical envelope v2. Runs two rounds:
Python seals -> TS opens, and TS seals -> Python opens, using the real custody split
(each recipient generates its own keypair and ships only public keys). Exits non-zero
on any mismatch. See README.md.
"""
import os
import sys
import json
import shutil
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
NODE = shutil.which("node")


def run(cmd):
    subprocess.run(cmd, cwd=HERE, check=True)


def stage_py(work, name):
    run([PY, os.path.join(HERE, "py_side.py"), work, name])


def stage_node(work, name):
    run([NODE, os.path.join(HERE, "node_side.mjs"), work, name])


def result(work, name):
    with open(os.path.join(work, name), encoding="utf-8") as f:
        return json.load(f)["ok"]


def main():
    if NODE is None:
        print("FAIL: node not found on PATH")
        return 1

    print("building interop bundle...")
    run([NODE, os.path.join(HERE, "build.mjs")])

    work = tempfile.mkdtemp(prefix="qmail-interop-")
    try:
        # Round A: Python seals -> TS opens.
        stage_node(work, "gen-recipient")
        stage_py(work, "seal")
        stage_node(work, "open")
        a = result(work, "result_A.json")

        # Round B: TS seals -> Python opens.
        stage_py(work, "gen-recipient")
        stage_node(work, "seal")
        stage_py(work, "open")
        b = result(work, "result_B.json")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    print(f"  round A (python seal -> ts open): {'PASS' if a else 'FAIL'}")
    print(f"  round B (ts seal -> python open): {'PASS' if b else 'FAIL'}")
    ok = a and b
    print("interop:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
