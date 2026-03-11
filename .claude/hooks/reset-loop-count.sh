#!/bin/bash
# Reset loop pass counter at the start of each user prompt
DIR="$(dirname "$0")/../.."
rm -f "$DIR/.loop-pass-count"
exit 0
