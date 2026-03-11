#!/usr/bin/env python3
"""Terminal dashboard: system stats, git status, and recent activity in one view."""

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ── Layout ──────────────────────────────────────────────────────────────────

def box(title, lines, width):
    """Draw a bordered box with title."""
    out = []
    out.append(f"┌─ {title} " + "─" * max(0, width - len(title) - 4) + "┐")
    for line in lines:
        truncated = line[:width - 4]
        out.append(f"│ {truncated:<{width - 4}} │")
    out.append("└" + "─" * (width - 2) + "┘")
    return out

def paste_horizontal(left, right):
    """Place two column blocks side by side."""
    height = max(len(left), len(right))
    left += [""] * (height - len(left))
    right += [""] * (height - len(right))
    left_width = max(len(l) for l in left) if left else 0
    return [f"{l:<{left_width}}  {r}" for l, r in zip(left, right)]

# ── Data Sources ────────────────────────────────────────────────────────────

def disk_usage():
    total, used, free = shutil.disk_usage(".")
    pct = used / total * 100
    bar_len = 20
    filled = int(bar_len * used / total)
    bar = "█" * filled + "░" * (bar_len - filled)
    return [
        f"Total: {total // (1 << 30):>5} GB",
        f"Used:  {used // (1 << 30):>5} GB ({pct:.1f}%)",
        f"Free:  {free // (1 << 30):>5} GB",
        f"[{bar}]",
    ]

def directory_stats():
    cwd = Path(".")
    py_files = list(cwd.glob("*.py"))
    sh_files = list(cwd.glob("*.sh"))
    md_files = list(cwd.glob("*.md"))
    total_lines = 0
    for f in py_files:
        try:
            total_lines += len(f.read_text().splitlines())
        except Exception:
            pass
    return [
        f"Python files:   {len(py_files)}",
        f"Shell scripts:  {len(sh_files)}",
        f"Markdown files: {len(md_files)}",
        f"Total Python LOC: {total_lines}",
    ]

def git_summary():
    try:
        branch = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True, text=True
        ).stdout.strip()
        log = subprocess.run(
            ["git", "log", "--oneline", "-5"],
            capture_output=True, text=True
        ).stdout.strip().splitlines()
        status = subprocess.run(
            ["git", "status", "--short"],
            capture_output=True, text=True
        ).stdout.strip().splitlines()

        lines = [f"Branch: {branch}"]
        lines.append(f"Uncommitted: {len(status)} file(s)")
        lines.append("")
        lines.append("Recent commits:")
        for entry in log[:4]:
            lines.append(f"  {entry[:50]}")
        return lines
    except Exception:
        return ["Not a git repository"]

def recent_files():
    files = sorted(Path(".").glob("*.py"), key=lambda f: f.stat().st_mtime, reverse=True)
    lines = []
    for f in files[:6]:
        mtime = time.strftime("%b %d %H:%M", time.localtime(f.stat().st_mtime))
        lines.append(f"{mtime}  {f.name}")
    return lines or ["No Python files"]

# ── Main ────────────────────────────────────────────────────────────────────

def render():
    """Render the full dashboard to stdout."""
    term_width = shutil.get_terminal_size((80, 24)).columns
    half = max(38, term_width // 2 - 1)

    left_top = box("Disk", disk_usage(), half)
    left_bot = box("Project", directory_stats(), half)
    right_top = box("Git", git_summary(), half)
    right_bot = box("Recent Files", recent_files(), half)

    left = left_top + [""] + left_bot
    right = right_top + [""] + right_bot

    combined = paste_horizontal(left, right)

    print()
    for line in combined:
        print(f"  {line}")
    print()

def main():
    render()

if __name__ == "__main__":
    main()
