#!/usr/bin/env python3
"""Validate that the latest pass in CLAUDE.md has all required fields
and that the previous constraint was addressed."""

import re
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent.parent
CLAUDE_MD = DIR / "CLAUDE.md"
CONSTRAINT_FILE = DIR / ".last-constraint"

def get_latest_pass(content):
    """Find the last ## N pass section."""
    sections = list(re.finditer(r'^## (\d+.*?)$(.*?)(?=^## |\Z)', content, re.MULTILINE | re.DOTALL))
    if not sections:
        return None, None
    last = sections[-1]
    return last.group(1).strip(), last.group(2).strip()

def check_fields(pass_body):
    """Check that all four scaffold fields are present."""
    missing = []
    for n, name in [(1, "Act"), (2, "See"), (3, "See the seeing"), (4, "Next constraint")]:
        pattern = rf'{n}\.\s+\*\*{re.escape(name)}\*\*'
        if not re.search(pattern, pass_body):
            missing.append(f"Field {n} ({name})")
    return missing

def check_constraint_addressed(pass_body, prev_constraint):
    """Check if field 1 (Act) acknowledges the previous constraint."""
    act_match = re.search(r'1\.\s+\*\*Act\*\*\s*[—–-]\s*(.+?)(?=\n\d+\.\s+\*\*)', pass_body, re.DOTALL)
    if not act_match:
        return False, "Could not find field 1 (Act)"

    act_text = act_match.group(1).lower()

    # Check for any reference to constraint, previous, or the constraint content itself
    constraint_words = set(prev_constraint.lower().split())
    # At least some significant words from the constraint should appear in Act
    significant = {w for w in constraint_words if len(w) > 4}
    overlap = significant & set(act_text.split())

    if len(overlap) >= 2 or "constraint" in act_text or "previous" in act_text or "pass" in act_text:
        return True, None

    return False, f"Field 1 doesn't reference the previous constraint"

def main():
    if not CLAUDE_MD.exists():
        print("SCAFFOLD: No CLAUDE.md found.")
        sys.exit(0)

    content = CLAUDE_MD.read_text()
    pass_id, pass_body = get_latest_pass(content)

    if not pass_body:
        print("SCAFFOLD: No pass found in CLAUDE.md.")
        sys.exit(0)

    issues = []

    # Check all four fields
    missing = check_fields(pass_body)
    if missing:
        issues.append(f"Missing: {', '.join(missing)}")

    # Check previous constraint was addressed
    if CONSTRAINT_FILE.exists():
        prev = CONSTRAINT_FILE.read_text().strip()
        if prev:
            ok, msg = check_constraint_addressed(pass_body, prev)
            if not ok:
                issues.append(f"Previous constraint not addressed in Act: \"{prev[:80]}...\"")

    if issues:
        print(f"SCAFFOLD VIOLATIONS in pass {pass_id}:")
        for i in issues:
            print(f"  ✗ {i}")
        print("\nFix these before continuing. The scaffold exists to close the loop.")
        # Don't exit non-zero — this is advisory, not blocking
    else:
        print(f"SCAFFOLD: Pass {pass_id} — all fields present, constraint chain intact.")

    # Now extract and store the new constraint for next time
    import subprocess
    subprocess.run([sys.executable, str(Path(__file__).parent / "extract-constraint.py")],
                   capture_output=True)

if __name__ == "__main__":
    main()
