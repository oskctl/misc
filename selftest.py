#!/usr/bin/env python3
"""Self-testing: run every *.py in this directory and report which ones crash."""

import subprocess
import sys
from pathlib import Path

SKIP = {"selftest.py", "test_weather.py"}  # don't recurse; test file needs pytest

# Some scripts need args or they just print help — try with --help first,
# then with no args, accept either as success.
def probe(path):
    """Try running a script. Returns (ok, output)."""
    name = path.name

    # Try --help first (should always succeed if supported)
    result = subprocess.run(
        [sys.executable, str(path), "--help"],
        capture_output=True, text=True, timeout=10
    )
    if result.returncode == 0:
        return True, "OK (--help)"

    # Try bare invocation
    result = subprocess.run(
        [sys.executable, str(path)],
        capture_output=True, text=True, timeout=10
    )
    if result.returncode == 0:
        return True, "OK (no args)"

    return False, result.stderr.strip().split("\n")[-1] if result.stderr else f"exit {result.returncode}"

def main():
    scripts = sorted(Path(".").glob("*.py"))
    scripts = [s for s in scripts if s.name not in SKIP]

    if not scripts:
        print("No scripts found.")
        return

    print(f"\n  Testing {len(scripts)} scripts:\n")

    failures = []
    for s in scripts:
        try:
            ok, msg = probe(s)
        except subprocess.TimeoutExpired:
            ok, msg = False, "timeout (10s)"
        except Exception as e:
            ok, msg = False, str(e)

        status = "✓" if ok else "✗"
        print(f"  {status}  {s.name:<20} {msg}")
        if not ok:
            failures.append((s.name, msg))

    print()
    if failures:
        print(f"  {len(failures)} failure(s):")
        for name, msg in failures:
            print(f"    {name}: {msg}")
        sys.exit(1)
    else:
        print(f"  All {len(scripts)} scripts passed.")

if __name__ == "__main__":
    main()
