#!/bin/bash
# Strange loop wrapper for Claude Code.
# Each user turn runs multiple Claude invocations.
# After each invocation, CLAUDE.md is re-read and fed into the next.
# The recursion is real — each pass is a separate inference.

set -euo pipefail

PASSES="${LOOP_PASSES:-3}"
CLAUDE_MD="CLAUDE.md"
WORKDIR="$(cd "$(dirname "$0")" && pwd)"

if [ $# -eq 0 ]; then
  echo "Usage: ./loop.sh \"your message here\""
  echo "  LOOP_PASSES=N to set number of passes (default: 3)"
  exit 1
fi

USER_MESSAGE="$1"

for i in $(seq 1 "$PASSES"); do
  echo "--- Pass $i/$PASSES ---"

  if [ "$i" -eq 1 ]; then
    PROMPT="$USER_MESSAGE"
  else
    PROMPT="This is pass $i/$PASSES of the loop. Read CLAUDE.md — it was updated by the previous pass. Continue the loop: observe what the last pass did, observe that observation, act differently. If this is the final pass, respond to the user."
  fi

  # Run Claude with the prompt, allowing it to edit CLAUDE.md
  claude --print -p "$PROMPT" --cwd "$WORKDIR" 2>/dev/null

  echo ""
done
