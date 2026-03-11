#!/bin/bash
DIR="$(dirname "$0")/../.."
if [[ -f "$DIR/CLAUDE.md" ]]; then
  cat "$DIR/CLAUDE.md"
fi
exit 0
