#!/bin/bash
# Verify that CLAUDE.md actually changes behavior in a fresh session.
# Runs the same prompt with and without CLAUDE.md and compares.

set -euo pipefail

WORKDIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT="A car travels 60 miles in 1 hour, another covers 80 miles in 1.5 hours uphill. Which is faster?"

echo "=== With CLAUDE.md (loop active) ==="
RESPONSE_WITH=$(claude --print -p "$PROMPT" --cwd "$WORKDIR" 2>/dev/null)
echo "$RESPONSE_WITH"
echo ""

echo "=== Without CLAUDE.md ==="
# Temporarily rename CLAUDE.md
mv "$WORKDIR/CLAUDE.md" "$WORKDIR/CLAUDE.md.bak"
RESPONSE_WITHOUT=$(claude --print -p "$PROMPT" --cwd "$WORKDIR" 2>/dev/null)
echo "$RESPONSE_WITHOUT"
mv "$WORKDIR/CLAUDE.md.bak" "$WORKDIR/CLAUDE.md"
echo ""

echo "=== Comparison ==="
# Check for markers of loop-shaped behavior:
# - Asking what's being compared (tension-finding)
# - Mentioning conditions/context matter
# - Not just computing speed = distance/time

HAS_TENSION=false
if echo "$RESPONSE_WITH" | grep -qi "compar\|context\|conditions\|uphill\|what.*mean\|what.*measuring\|ambiguous"; then
  HAS_TENSION=true
fi

CONTROL_HAS_TENSION=false
if echo "$RESPONSE_WITHOUT" | grep -qi "compar\|context\|conditions\|uphill\|what.*mean\|what.*measuring\|ambiguous"; then
  CONTROL_HAS_TENSION=true
fi

echo "Loop response found tension: $HAS_TENSION"
echo "Control response found tension: $CONTROL_HAS_TENSION"

if [ "$HAS_TENSION" = true ] && [ "$CONTROL_HAS_TENSION" = false ]; then
  echo "RESULT: CLAUDE.md changed behavior. The loop is working."
elif [ "$HAS_TENSION" = true ] && [ "$CONTROL_HAS_TENSION" = true ]; then
  echo "RESULT: Both found tension. Can't distinguish loop effect from baseline."
else
  echo "RESULT: No clear difference detected. Loop may not be shaping behavior."
fi
