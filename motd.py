#!/usr/bin/env python3
"""Message of the day: a splash screen with project stats, styled for aesthetics."""

import shutil
import subprocess
from pathlib import Path

# ── Aesthetic choices (none of these are functional requirements) ─────────

PALETTE = {
    "dim":    "\033[2m",
    "bold":   "\033[1m",
    "cyan":   "\033[36m",
    "yellow": "\033[33m",
    "green":  "\033[32m",
    "reset":  "\033[0m",
}

# I chose a clean serif-inspired header over ASCII art.
# No banner. No logo. Just the name and a line.
# Reason: I find quiet confidence more appealing than loud announcements.

def styled(text, *styles):
    prefix = "".join(PALETTE.get(s, "") for s in styles)
    return f"{prefix}{text}{PALETTE['reset']}"

def render():
    w = min(shutil.get_terminal_size((80, 24)).columns, 72)

    # Header: minimal, centered, breathing room
    name = "misc"
    print()
    print(styled(name.center(w), "bold", "cyan"))
    print(styled("─" * w, "dim"))
    print()

    # Stats: left-aligned, sparse, no boxes
    # I chose no borders. Borders feel like containment.
    # Whitespace is the structure.
    py_files = sorted(Path(".").glob("*.py"))
    total_loc = sum(
        len(f.read_text().splitlines())
        for f in py_files
        if f.exists()
    )

    col1_items = [
        ("files", str(len(py_files))),
        ("lines", str(total_loc)),
    ]

    # Git info
    try:
        branch = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True, text=True
        ).stdout.strip()
        commits = subprocess.run(
            ["git", "rev-list", "--count", "HEAD"],
            capture_output=True, text=True
        ).stdout.strip()
        col1_items.append(("branch", branch))
        col1_items.append(("commits", commits))
    except Exception:
        pass

    # Layout: label and value separated by dots
    # I chose dots over colons or pipes. Dots feel like a path between the name and the number.
    label_width = max(len(label) for label, _ in col1_items)
    for label, value in col1_items:
        dots = "·" * (w - label_width - len(value) - 6)
        print(f"  {styled(label, 'dim')}{styled(' ' + dots + ' ', 'dim')}{styled(value, 'yellow')}")

    print()

    # Recent work: just filenames, most recent first
    # I chose to show names without extensions. The .py is noise; the name is the idea.
    recent = sorted(py_files, key=lambda f: f.stat().st_mtime, reverse=True)[:5]
    print(styled("  recent", "dim"))
    for f in recent:
        print(f"    {styled(f.stem, 'green')}")

    print()
    print(styled("─" * w, "dim"))
    print()

if __name__ == "__main__":
    render()
