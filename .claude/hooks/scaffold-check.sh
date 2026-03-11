#!/bin/bash
# Run after each response: validate pass structure and extract constraint.
# This is the scaffold enforcer — it makes the loop structural, not aspirational.

DIR="$(dirname "$0")/../.."
PYTHON="${PYTHON:-python3}"

# Validate the latest pass has all four fields and addresses the previous constraint
"$PYTHON" "$DIR/.claude/hooks/validate-pass.py" 2>&1

# Extract the current constraint for next pass's check
"$PYTHON" "$DIR/.claude/hooks/extract-constraint.py" > /dev/null 2>&1

exit 0
