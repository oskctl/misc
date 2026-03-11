#!/usr/bin/env python3
"""Summarize git log: commits by date, author, files changed."""

import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime

def run_git(*args):
    result = subprocess.run(["git"] + list(args), capture_output=True, text=True)
    if result.returncode != 0:
        print(f"git error: {result.stderr.strip()}")
        sys.exit(1)
    return result.stdout

def summarize(n=20):
    # Get log with stats
    log = run_git("log", f"-{n}", "--pretty=format:%H|%an|%ai|%s", "--stat")

    commits = []
    current = None
    files_changed = Counter()

    for line in log.split("\n"):
        if "|" in line and line.count("|") >= 3:
            parts = line.split("|", 3)
            if len(parts) == 4 and len(parts[0]) == 40:
                current = {
                    "hash": parts[0][:8],
                    "author": parts[1],
                    "date": parts[2][:10],
                    "message": parts[3],
                    "files": []
                }
                commits.append(current)
                continue

        if current and "|" in line and ("insertion" in line or "deletion" in line or "+" in line or "-" in line):
            # file stat line like " CLAUDE.md | 5 ++---"
            file_part = line.split("|")[0].strip()
            if file_part:
                current["files"].append(file_part)
                files_changed[file_part] += 1

    if not commits:
        print("No commits found.")
        return

    # Summary
    authors = Counter(c["author"] for c in commits)
    dates = Counter(c["date"] for c in commits)

    print(f"\n  Last {len(commits)} commits\n")

    print("  By date:")
    for date, count in sorted(dates.items()):
        print(f"    {date}: {'█' * count} ({count})")

    if len(authors) > 1:
        print("\n  By author:")
        for author, count in authors.most_common():
            print(f"    {author}: {count}")

    print("\n  Most changed files:")
    for f, count in files_changed.most_common(10):
        print(f"    {f}: {count}")

    print("\n  Recent commits:")
    for c in commits[:10]:
        print(f"    {c['hash']} {c['message'][:60]}")

def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    summarize(n)

if __name__ == "__main__":
    main()
