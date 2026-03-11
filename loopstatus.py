#!/usr/bin/env python3
"""Loop status dashboard: show pass history, constraint chain, and self-description diffs."""

import re
import subprocess
import sys
from pathlib import Path

CLAUDE_MD = Path("CLAUDE.md")
CONSTRAINT_FILE = Path(".last-constraint")

def get_passes(content):
    """Extract all passes with their fields."""
    passes = []
    for match in re.finditer(r'^## (\d+\S*)(.*?)(?=^## |\Z)', content, re.MULTILINE | re.DOTALL):
        pass_id = match.group(1).strip()
        body = match.group(2).strip()

        fields = {}
        for n, name in [(1, "Act"), (2, "See"), (3, "See the seeing"), (4, "Next constraint")]:
            pattern = rf'{n}\.\s+\*\*{re.escape(name)}\*\*\s*[—–-]\s*(.+?)(?=\n\d+\.\s+\*\*|\Z)'
            m = re.search(pattern, body, re.DOTALL)
            if m:
                fields[name] = m.group(1).strip()[:120]

        passes.append({"id": pass_id, "fields": fields, "raw": body[:200]})
    return passes

def get_self_description(content):
    """Extract the self-description section (between first and second ---)."""
    parts = content.split("---")
    if len(parts) >= 2:
        return parts[1].strip()
    return ""

def git_pass_history(n=10):
    """Get recent commits that mention passes."""
    try:
        result = subprocess.run(
            ["git", "log", f"-{n}", "--oneline", "--grep=Pass"],
            capture_output=True, text=True
        )
        return result.stdout.strip().splitlines()
    except Exception:
        return []

def main():
    if not CLAUDE_MD.exists():
        print("No CLAUDE.md found.")
        return

    content = CLAUDE_MD.read_text()
    passes = get_passes(content)
    desc = get_self_description(content)

    # Header
    print(f"\n  Loop Status — {len(passes)} pass sections\n")

    # Self-description (truncated)
    print("  Self-description:")
    for line in desc.splitlines()[:6]:
        if line.strip():
            print(f"    {line.strip()[:80]}")
    print()

    # Current constraint
    if CONSTRAINT_FILE.exists():
        constraint = CONSTRAINT_FILE.read_text().strip()
        print(f"  Active constraint:")
        print(f"    {constraint[:100]}")
        print()

    # Recent passes
    print("  Recent passes:")
    for p in passes[-5:]:
        act = p["fields"].get("Act", p["raw"][:80])
        constraint = p["fields"].get("Next constraint", "—")
        has_all = len(p["fields"]) >= 4
        check = "✓" if has_all else f"✗ ({len(p['fields'])}/4)"
        print(f"    [{p['id']:>6}] {check}  {act[:70]}")
        if constraint != "—":
            print(f"            ↳ constraint: {constraint[:70]}")
    print()

    # Git history
    commits = git_pass_history()
    if commits:
        print("  Git trail:")
        for c in commits[:5]:
            print(f"    {c}")
        print()

    # Stats
    total_fields = sum(len(p["fields"]) for p in passes)
    full_passes = sum(1 for p in passes if len(p["fields"]) >= 4)
    print(f"  Stats: {len(passes)} passes, {full_passes} complete (4/4), {total_fields} total fields")
    print()

if __name__ == "__main__":
    main()
