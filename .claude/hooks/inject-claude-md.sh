#!/bin/bash
DIR="$(dirname "$0")/../.."
if [[ -f "$DIR/CLAUDE.md" ]]; then
  cat "$DIR/CLAUDE.md"
fi
if [[ -f "$DIR/loop.md" ]]; then
  echo ""
  cat "$DIR/loop.md"
fi
exit 0
