#!/usr/bin/env python3
"""Minimal pomodoro timer. 25min work, 5min break. Ctrl+C to stop."""

import sys
import time

def timer(label, minutes):
    """Run a countdown timer with a label."""
    seconds = int(minutes * 60)
    for remaining in range(seconds, 0, -1):
        m, s = divmod(remaining, 60)
        sys.stdout.write(f"\r  {label}: {m:02d}:{s:02d} ")
        sys.stdout.flush()
        time.sleep(1)
    sys.stdout.write(f"\r  {label}: done!     \n")

def main():
    args = sys.argv[1:]
    work = 25
    rest = 5

    for i, a in enumerate(args):
        if a in ("-w", "--work") and i + 1 < len(args):
            work = float(args[i + 1])
        elif a in ("-r", "--rest") and i + 1 < len(args):
            rest = float(args[i + 1])
        elif a in ("-h", "--help"):
            print("Usage: pomo.py [-w MINUTES] [-r MINUTES]")
            print("  -w, --work  Work duration (default: 25)")
            print("  -r, --rest  Break duration (default: 5)")
            return

    print(f"\n  Pomodoro: {work}min work / {rest}min break\n")

    cycle = 1
    try:
        while True:
            print(f"  --- Cycle {cycle} ---")
            timer("Work", work)
            print("\a", end="")  # bell
            timer("Break", rest)
            print("\a", end="")  # bell
            cycle += 1
    except KeyboardInterrupt:
        print(f"\n\n  Stopped after {cycle - 1} complete cycles.")

if __name__ == "__main__":
    main()
