#!/usr/bin/env python3
"""Opinionated Python formatter: trailing whitespace, consistent blank lines, EOF newline."""

import sys
from pathlib import Path

def fmt(text):
    """Format Python source text."""
    lines = text.split("\n")
    result = []
    prev_blank = False
    in_docstring = False

    for line in lines:
        stripped_right = line.rstrip()

        # Track docstrings (crude but sufficient)
        if '"""' in stripped_right or "'''" in stripped_right:
            count = stripped_right.count('"""') + stripped_right.count("'''")
            if count % 2 == 1:
                in_docstring = not in_docstring

        # Collapse runs of blank lines to max 2
        is_blank = stripped_right == ""
        if is_blank and prev_blank:
            continue
        prev_blank = is_blank

        result.append(stripped_right)

    # Ensure single trailing newline
    while result and result[-1] == "":
        result.pop()
    result.append("")

    return "\n".join(result)

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: fmt.py <file> [file...]")
        print("  Formats Python files in place.")
        print("  --check  Report but don't fix.")
        return

    check_only = "--check" in sys.argv
    files = [f for f in sys.argv[1:] if f != "--check"]

    changed = 0
    for path in files:
        try:
            original = Path(path).read_text()
        except FileNotFoundError:
            print(f"  Not found: {path}")
            continue

        formatted = fmt(original)
        if original != formatted:
            changed += 1
            if check_only:
                print(f"  Would change: {path}")
            else:
                Path(path).write_text(formatted)
                print(f"  Fixed: {path}")
        else:
            print(f"  OK: {path}")

    if check_only and changed:
        sys.exit(1)

if __name__ == "__main__":
    main()
