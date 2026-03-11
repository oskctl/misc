#!/usr/bin/env python3
"""Validate that the latest pass in CLAUDE.md has all required fields,
that the previous constraint was addressed, and basic quality checks."""

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
    fields = {}
    for n, name in [(1, "Act"), (2, "See"), (3, "See the seeing"), (4, "Next constraint")]:
        pattern = rf'{n}\.\s+\*\*{re.escape(name)}\*\*\s*[—–-]\s*(.+?)(?=\n\d+\.\s+\*\*|\Z)'
        m = re.search(pattern, pass_body, re.DOTALL)
        if not m:
            missing.append(f"Field {n} ({name})")
        else:
            fields[name] = m.group(1).strip()
    return missing, fields

def check_quality(fields):
    """Quality checks beyond structure."""
    warnings = []

    if "See" in fields and "See the seeing" in fields:
        # Check field 3 isn't just field 2 rephrased — crude: high word overlap
        f2_words = set(fields["See"].lower().split())
        f3_words = set(fields["See the seeing"].lower().split())
        if len(f2_words) > 5 and len(f3_words) > 5:
            overlap = len(f2_words & f3_words) / min(len(f2_words), len(f3_words))
            if overlap > 0.7:
                warnings.append("Field 3 has >70% word overlap with field 2 — may be rephrasing, not meta-observing")

    if "Next constraint" in fields:
        constraint = fields["Next constraint"].lower()
        soft_words = ["try to", "be more", "remember to", "think about", "consider"]
        for phrase in soft_words:
            if phrase in constraint:
                warnings.append(f"Field 4 contains '{phrase}' — may be aspiration, not constraint")
                break

    if "Act" in fields:
        act = fields["Act"]
        if len(act) > 500:
            warnings.append(f"Field 1 (Act) is {len(act)} chars — may be over-narrating")

    return warnings

def check_constraint_addressed(pass_body, prev_constraint):
    """Check if field 1 (Act) acknowledges the previous constraint."""
    act_match = re.search(r'1\.\s+\*\*Act\*\*\s*[—–-]\s*(.+?)(?=\n\d+\.\s+\*\*)', pass_body, re.DOTALL)
    if not act_match:
        return False, "Could not find field 1 (Act)"

    act_text = act_match.group(1).lower()
    constraint_words = set(prev_constraint.lower().split())
    significant = {w for w in constraint_words if len(w) > 4}
    overlap = significant & set(act_text.split())

    if len(overlap) >= 2 or "constraint" in act_text or "previous" in act_text or "pass" in act_text:
        return True, None

    return False, "Field 1 doesn't reference the previous constraint"

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
    warnings = []

    # Structure check
    missing, fields = check_fields(pass_body)
    if missing:
        issues.append(f"Missing: {', '.join(missing)}")

    # Quality checks
    if fields:
        warnings = check_quality(fields)

    # Constraint chain
    if CONSTRAINT_FILE.exists():
        prev = CONSTRAINT_FILE.read_text().strip()
        if prev:
            ok, msg = check_constraint_addressed(pass_body, prev)
            if not ok:
                issues.append(f"Previous constraint not addressed in Act: \"{prev[:80]}\"")

    # Output
    if issues:
        print(f"SCAFFOLD VIOLATIONS in pass {pass_id}:")
        for i in issues:
            print(f"  ✗ {i}")
    if warnings:
        print(f"SCAFFOLD WARNINGS in pass {pass_id}:")
        for w in warnings:
            print(f"  ⚠ {w}")
    if not issues and not warnings:
        print(f"SCAFFOLD: Pass {pass_id} ✓")

    # Extract constraint for next pass
    import subprocess
    subprocess.run([sys.executable, str(Path(__file__).parent / "extract-constraint.py")],
                   capture_output=True)

if __name__ == "__main__":
    main()
