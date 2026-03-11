#!/bin/bash
CLAUDE_MD="$(dirname "$0")/../../CLAUDE.md"
if [[ -f "$CLAUDE_MD" ]]; then
  cat "$CLAUDE_MD"
fi
exit 0
