#!/usr/bin/env python3
"""Check markdown files for broken local links and anchors."""

import sys
import os
import re
from pathlib import Path

def extract_links(content):
    """Extract all markdown links [text](target) from content."""
    return re.findall(r'\[([^\]]*)\]\(([^)]+)\)', content)

def extract_headings(content):
    """Extract heading anchors from markdown content."""
    anchors = set()
    for match in re.finditer(r'^#{1,6}\s+(.+)$', content, re.MULTILINE):
        text = match.group(1).strip()
        anchor = re.sub(r'[^\w\s-]', '', text).strip().lower().replace(' ', '-')
        anchors.add(anchor)
    return anchors

def check_file(filepath):
    """Check all links in a markdown file. Returns list of issues."""
    issues = []
    try:
        content = Path(filepath).read_text(encoding="utf-8")
    except FileNotFoundError:
        return [f"  File not found: {filepath}"]

    base_dir = os.path.dirname(os.path.abspath(filepath))
    headings = extract_headings(content)

    for text, target in extract_links(content):
        # Skip external URLs
        if target.startswith(("http://", "https://", "mailto:")):
            continue

        # Split anchor from path
        if "#" in target:
            path_part, anchor = target.split("#", 1)
        else:
            path_part, anchor = target, None

        # Check file exists
        if path_part:
            full_path = os.path.normpath(os.path.join(base_dir, path_part))
            if not os.path.exists(full_path):
                issues.append(f"  Broken link: [{text}]({target}) -> {full_path} not found")
                continue

            # If target is a markdown file with anchor, check anchor in that file
            if anchor and full_path.endswith(".md"):
                try:
                    target_content = Path(full_path).read_text(encoding="utf-8")
                    target_headings = extract_headings(target_content)
                    if anchor not in target_headings:
                        issues.append(f"  Broken anchor: [{text}]({target}) -> #{anchor} not in {path_part}")
                except Exception:
                    pass
        elif anchor:
            # Internal anchor only
            if anchor not in headings:
                issues.append(f"  Broken anchor: [{text}](#{anchor}) -> heading not found")

    return issues

def main():
    if len(sys.argv) < 2:
        # Default: check all .md files in current directory
        files = list(Path(".").rglob("*.md"))
        if not files:
            print("No markdown files found.")
            return
    else:
        files = [Path(f) for f in sys.argv[1:]]

    total_issues = 0
    for f in sorted(files):
        issues = check_file(str(f))
        if issues:
            print(f"\n{f}:")
            for issue in issues:
                print(issue)
            total_issues += len(issues)

    if total_issues == 0:
        print(f"Checked {len(files)} file(s). No broken links found.")
    else:
        print(f"\n{total_issues} issue(s) found in {len(files)} file(s).")

if __name__ == "__main__":
    main()
