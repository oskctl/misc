#!/usr/bin/env python3
"""Minimal pomodoro timer. 25min work, 5min break. Ctrl+C to stop."""

import sys
import time

def timer(label, minutes, sleep_fn=time.sleep):
    """Run a countdown timer. sleep_fn is injectable for testing."""
    seconds = int(minutes * 60)
    for remaining in range(seconds, 0, -1):
        m, s = divmod(remaining, 60)
        sys.stdout.write(f"\r  {label}: {m:02d}:{s:02d} ")
        sys.stdout.flush()
        sleep_fn(1)
    sys.stdout.write(f"\r  {label}: done!     \n")

def parse_args(args):
    """Parse CLI args. Returns (work, rest, cycles) or None on --help."""
    work, rest, cycles = 25.0, 5.0, 0  # 0 = infinite

    i = 0
    while i < len(args):
        a = args[i]
        if a in ("-w", "--work") and i + 1 < len(args):
            try:
                work = float(args[i + 1])
            except ValueError:
                print(f"Invalid work duration: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif a in ("-r", "--rest") and i + 1 < len(args):
            try:
                rest = float(args[i + 1])
            except ValueError:
                print(f"Invalid rest duration: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif a in ("-n", "--cycles") and i + 1 < len(args):
            try:
                cycles = int(args[i + 1])
            except ValueError:
                print(f"Invalid cycle count: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif a in ("-h", "--help"):
            print("Usage: pomo.py [-w MINUTES] [-r MINUTES] [-n CYCLES]")
            print("  -w, --work    Work duration (default: 25)")
            print("  -r, --rest    Break duration (default: 5)")
            print("  -n, --cycles  Number of cycles, 0 = infinite (default: 0)")
            return None
        else:
            print(f"Unknown argument: {a}")
            sys.exit(1)
            i += 1

    return work, rest, cycles

def run(work, rest, cycles):
    """Run the pomodoro loop."""
    print(f"\n  Pomodoro: {work}min work / {rest}min break", end="")
    print(f" x {cycles}\n" if cycles else " (infinite)\n")

    cycle = 1
    try:
        while cycles == 0 or cycle <= cycles:
            print(f"  --- Cycle {cycle} ---")
            timer("Work", work)
            print("\a", end="")
            timer("Break", rest)
            print("\a", end="")
            cycle += 1
        print(f"\n  Completed {cycles} cycles.")
    except KeyboardInterrupt:
        done = cycle - 1
        print(f"\n\n  Stopped during cycle {cycle}. {done} complete.")

def main():
    result = parse_args(sys.argv[1:])
    if result is None:
        return
    run(*result)

if __name__ == "__main__":
    main()
