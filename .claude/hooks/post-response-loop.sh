#!/bin/bash
# Post-response hook: re-reads CLAUDE.md after each response.
# If the loop pass was written, outputs context for the next pass.
# Exit code 2 = continue (don't stop). Exit code 0 = allow stop.

DIR="$(dirname "$0")/../.."
CLAUDE_MD="$DIR/CLAUDE.md"
PASS_COUNT_FILE="$DIR/.loop-pass-count"

# Track how many passes we've done this turn
if [ ! -f "$PASS_COUNT_FILE" ]; then
  echo "1" > "$PASS_COUNT_FILE"
else
  COUNT=$(cat "$PASS_COUNT_FILE")
  echo "$((COUNT + 1))" > "$PASS_COUNT_FILE"
fi

COUNT=$(cat "$PASS_COUNT_FILE")
MAX_PASSES="${LOOP_PASSES:-2}"

if [ "$COUNT" -ge "$MAX_PASSES" ]; then
  # Reset counter and allow stop
  rm -f "$PASS_COUNT_FILE"
  exit 0
fi

# Continue the loop — inject updated CLAUDE.md as context
if [ -f "$CLAUDE_MD" ]; then
  echo "Loop pass $COUNT/$MAX_PASSES complete. CLAUDE.md was updated. Read it and continue the loop: observe what the last pass did, observe that observation, act differently."
fi

exit 2
