#!/usr/bin/env python3
"""Extract the latest field 4 (Next constraint) from CLAUDE.md and store it."""

import re
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent.parent
CLAUDE_MD = DIR / "CLAUDE.md"
CONSTRAINT_FILE = DIR / ".last-constraint"

def extract():
    if not CLAUDE_MD.exists():
        return None

    content = CLAUDE_MD.read_text()

    # Find all field 4 entries, take the last one
    matches = list(re.finditer(
        r'4\.\s+\*\*Next constraint\*\*\s*[—–-]\s*(.+?)(?=\n(?:#|\d+\.\s+\*\*)|$)',
        content, re.DOTALL
    ))

    if not matches:
        return None

    return matches[-1].group(1).strip()

if __name__ == "__main__":
    constraint = extract()
    if constraint:
        CONSTRAINT_FILE.write_text(constraint)
        print(constraint)
    else:
        # No constraint found — clear the file
        CONSTRAINT_FILE.unlink(missing_ok=True)
