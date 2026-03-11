#!/usr/bin/env python3
"""Minimal static site generator. Converts markdown files to HTML with a template."""

import sys
import os
import re
from pathlib import Path

def md_to_html(md):
    """Minimal markdown to HTML — headings, paragraphs, bold, italic, code, links, lists."""
    lines = md.split("\n")
    html_lines = []
    in_list = False
    in_code = False

    for line in lines:
        # Fenced code blocks
        if line.strip().startswith("```"):
            if in_code:
                html_lines.append("</code></pre>")
                in_code = False
            else:
                lang = line.strip()[3:].strip()
                html_lines.append(f'<pre><code class="language-{lang}">' if lang else "<pre><code>")
                in_code = True
            continue

        if in_code:
            html_lines.append(line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
            continue

        # Close list if needed
        if in_list and not line.strip().startswith(("- ", "* ")):
            html_lines.append("</ul>")
            in_list = False

        # Headings
        heading = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading:
            level = len(heading.group(1))
            text = inline(heading.group(2))
            anchor = re.sub(r'[^\w\s-]', '', heading.group(2)).strip().lower().replace(' ', '-')
            html_lines.append(f'<h{level} id="{anchor}">{text}</h{level}>')
            continue

        # List items
        list_match = re.match(r'^\s*[-*]\s+(.+)$', line)
        if list_match:
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            html_lines.append(f"<li>{inline(list_match.group(1))}</li>")
            continue

        # Horizontal rule
        if re.match(r'^---+$', line.strip()):
            html_lines.append("<hr>")
            continue

        # Paragraph
        stripped = line.strip()
        if stripped:
            html_lines.append(f"<p>{inline(stripped)}</p>")

    if in_list:
        html_lines.append("</ul>")
    if in_code:
        html_lines.append("</code></pre>")

    return "\n".join(html_lines)

def inline(text):
    """Handle inline markdown: bold, italic, code, links."""
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    return text

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  body {{ max-width: 700px; margin: 2em auto; padding: 0 1em; font-family: system-ui, sans-serif; line-height: 1.6; color: #333; }}
  pre {{ background: #f5f5f5; padding: 1em; overflow-x: auto; border-radius: 4px; }}
  code {{ font-size: 0.9em; }}
  a {{ color: #0066cc; }}
  hr {{ border: none; border-top: 1px solid #ddd; margin: 2em 0; }}
</style>
</head>
<body>
{content}
</body>
</html>"""

def build(src_dir=".", out_dir="_site"):
    """Convert all .md files in src_dir to HTML in out_dir."""
    src = Path(src_dir)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    files = sorted(src.glob("*.md"))
    if not files:
        print("No markdown files found.")
        return

    for md_file in files:
        content = md_file.read_text(encoding="utf-8")
        # Extract title from first heading or filename
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        title = title_match.group(1) if title_match else md_file.stem

        html_content = md_to_html(content)
        html = TEMPLATE.format(title=title, content=html_content)

        out_file = out / md_file.with_suffix(".html").name
        out_file.write_text(html, encoding="utf-8")
        print(f"  {md_file} -> {out_file}")

    print(f"\nBuilt {len(files)} page(s) to {out}/")

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "."
    out = sys.argv[2] if len(sys.argv) > 2 else "_site"
    build(src, out)

if __name__ == "__main__":
    main()
