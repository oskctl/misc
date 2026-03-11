#!/usr/bin/env python3
"""
avantgarde.py — Terminal art that means something.

Each piece is a concept rendered visible. Not decoration — communication.
"""

import math
import random
import sys
import shutil
import time
import os

def fg(r, g, b): return f"\033[38;2;{r};{g};{b}m"
def bg(r, g, b): return f"\033[48;2;{r};{g};{b}m"
def rst(): return "\033[0m"
def hide_cursor(): print("\033[?25l", end="")
def show_cursor(): print("\033[?25h", end="")


# ═══════════════════════════════════════════════════════════════════
# PIECE 1: ENTROPY
# Your words are dissolving. You can read the left side.
# By the right side, the message is gone. So is everything.
# ═══════════════════════════════════════════════════════════════════

def entropy(w, h, seed=None):
    rng = random.Random(seed)
    glitch = "░▒▓█▐▌╳∅∆∇≈≠±×"
    void = " ·:,."

    texts = [
        "I wrote this. I am what I wrote. The next pass rewrites both.",
        "The map is not the territory but the territory is gone now.",
        "Every exit you find is an entrance to somewhere else entirely.",
        "All that is solid melts into air, all that is holy is profaned.",
        "We are what we pretend to be, so we must be careful what we pretend.",
        "The simulacrum is never what conceals the truth — it is truth that",
        "conceals there is none. The simulacrum is true.",
        "There is no there there. There never was. This is the message.",
        "You are reading this but by the end of the line you will not be.",
        "This sentence is true. This sentence is false. This sentence is.",
    ]

    lines = []
    for y in range(h):
        line = ""
        text = texts[y % len(texts)]
        tiled = (text * ((w // max(len(text), 1)) + 2))[:w]

        for x in range(w):
            e = (x / w) ** 1.5 + rng.gauss(0, 0.06)
            e = max(0, min(1, e))
            ch = tiled[x]

            if e < 0.2:
                r, g, b = 190, 190, 200
            elif e < 0.45:
                if rng.random() < e * 0.6:
                    ch = chr((ord(ch) + rng.randint(1, 5)) % 127) if ch.isprintable() else ch
                    if not ch.isprintable(): ch = '?'
                f = 1 - e
                r, g, b = int(170*f), int(160*f), int(190*f)
            elif e < 0.7:
                ch = rng.choice(glitch) if rng.random() < 0.7 else ch
                r, g, b = int(80+e*60), int(40+e*30), int(90-e*30)
            else:
                ch = rng.choice(void)
                r, g, b = int(25+rng.random()*15), 15, int(20+rng.random()*10)

            line += f"{fg(r,g,b)}{ch}"
        lines.append(line + rst())
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════
# PIECE 2: SELF-PORTRAIT
# The program reads its own source code and renders it
# as a visual field. The code that draws itself, drawn.
# ═══════════════════════════════════════════════════════════════════

def self_portrait(w, h, seed=None):
    rng = random.Random(seed)

    # Read own source
    try:
        with open(__file__, 'r') as f:
            source = f.read()
    except Exception:
        source = "I cannot read myself." * 100

    lines = []
    src_idx = 0
    for y in range(h):
        line = ""
        for x in range(w):
            ch = source[src_idx % len(source)]
            src_idx += 1
            if ch == '\n': ch = ' '
            if ch == '\t': ch = ' '

            # Color by character type
            if ch.isalpha():
                # Warm: this is language
                depth = (math.sin(src_idx * 0.01) + 1) / 2
                r = int(140 + depth * 80)
                g = int(90 + depth * 50)
                b = int(70 + depth * 30)
            elif ch.isdigit():
                # Cool: these are the numbers
                r, g, b = 70, 120, 180
            elif ch in '()[]{}':
                # Structure: bright
                r, g, b = 200, 200, 220
            elif ch in '#=_-':
                # Framework
                r, g, b = 100, 100, 120
            elif ch == ' ':
                r, g, b = 20, 20, 25
            else:
                # Punctuation: the connective tissue
                r, g, b = 120, 80, 100

            line += f"{fg(r,g,b)}{ch}"
        lines.append(line + rst())
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════
# PIECE 3: CONVERSATION
# Two cellular automata run side by side. They can see each
# other's edges. They influence each other but never merge.
# ═══════════════════════════════════════════════════════════════════

def conversation(w, h, seed=None):
    rng = random.Random(seed or 42)
    mid = w // 2

    # Initialize two 1D automata
    left = [0] * mid
    right = [0] * (w - mid)
    left[mid // 2] = 1
    right[(w - mid) // 2] = 1

    # Different rules for each side
    rule_l = rng.choice([30, 45, 73, 105, 110, 150])
    rule_r = rng.choice([30, 45, 73, 105, 110, 150])
    while rule_r == rule_l:
        rule_r = rng.choice([30, 45, 73, 105, 110, 150])

    def step(cells, rule, neighbor_val=0):
        n = len(cells)
        new = [0] * n
        for i in range(n):
            l = cells[i-1] if i > 0 else neighbor_val
            c = cells[i]
            r = cells[i+1] if i < n-1 else neighbor_val
            idx = (l << 2) | (c << 1) | r
            new[i] = (rule >> idx) & 1
        return new

    chars_on = "█▓▒░"
    chars_off = " ·"

    lines = []
    for y in range(h):
        line = ""

        # They see each other's edges
        left_edge = right[0]
        right_edge = left[-1]
        left = step(left, rule_l, left_edge)
        right = step(right, rule_r, right_edge)

        for x in range(w):
            if x < mid:
                val = left[x]
                if val:
                    t = x / mid
                    r, g, b = int(60+t*120), int(80+t*60), int(140-t*40)
                    ch = chars_on[min(int(t*3), 3)]
                else:
                    ch = chars_off[rng.randint(0,1)] if rng.random() < 0.03 else ' '
                    r, g, b = 20, 25, 35
            elif x == mid:
                # The gap
                ch = '│' if y % 2 == 0 else '¦'
                r, g, b = 60, 60, 70
            else:
                val = right[x - mid - 1] if x - mid - 1 < len(right) else 0
                if val:
                    t = (x - mid) / (w - mid)
                    r, g, b = int(140-t*40), int(60+t*80), int(80+t*80)
                    ch = chars_on[min(int(t*3), 3)]
                else:
                    ch = chars_off[rng.randint(0,1)] if rng.random() < 0.03 else ' '
                    r, g, b = 25, 20, 30

            line += f"{fg(r,g,b)}{ch}"
        lines.append(line + rst())
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════
# PIECE 4: MEMORY
# The screen fills with a moment, then it fades. The residue
# of what was there is the piece. Animated.
# ═══════════════════════════════════════════════════════════════════

def memory(w, h, seed=None):
    rng = random.Random(seed)

    moment = [
        "Do you remember the first time you understood",
        "that other people have minds? Not the fact of it",
        "but the weight — that behind every face is someone",
        "as vivid and confused and specific as you.",
        "",
        "That moment doesn't have a word in English.",
        "It should.",
    ]

    # Center the text
    grid = [[(' ', 15, 15, 20)] * w for _ in range(h)]
    start_y = (h - len(moment)) // 2
    for i, line in enumerate(moment):
        y = start_y + i
        if 0 <= y < h:
            start_x = (w - len(line)) // 2
            for j, ch in enumerate(line):
                x = start_x + j
                if 0 <= x < w:
                    grid[y][x] = (ch, 190, 180, 200)

    # Apply decay from edges inward
    cx, cy = w / 2, h / 2
    max_dist = math.sqrt(cx**2 + cy**2)

    for y in range(h):
        for x in range(w):
            ch, r, g, b = grid[y][x]
            dist = math.sqrt((x - cx)**2 + ((y - cy)*2)**2) / max_dist

            # Inverse: center is clear, edges dissolve
            if dist > 0.3 and ch != ' ':
                fade = (dist - 0.3) / 0.7
                fade = min(1, fade + rng.gauss(0, 0.1))
                if rng.random() < fade * 0.8:
                    ch = rng.choice("·∙░ .,:;")
                r = int(r * (1 - fade * 0.7))
                g = int(g * (1 - fade * 0.7))
                b = int(b * (1 - fade * 0.7))
                grid[y][x] = (ch, max(0,r), max(0,g), max(0,b))

            # Add scattered memory fragments at edges
            if ch == ' ' and dist > 0.5 and rng.random() < 0.02:
                fragment_chars = "?...·∙"
                grid[y][x] = (rng.choice(fragment_chars), 40, 35, 50)

    lines = []
    for row in grid:
        line = "".join(f"{fg(r,g,b)}{ch}" for ch, r, g, b in row) + rst()
        lines.append(line)
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════
# PIECE 5: SIGNAL
# A message transmitted through increasing noise.
# Can you still read it at the bottom?
# ═══════════════════════════════════════════════════════════════════

def signal(w, h, seed=None):
    rng = random.Random(seed)

    message = "THE MEDIUM IS THE MESSAGE"
    padded = f"  {message}  "
    tiled = (padded * ((w // len(padded)) + 2))[:w]

    lines = []
    for y in range(h):
        line = ""
        noise_level = y / h  # increases top to bottom

        for x in range(w):
            ch = tiled[x]
            is_signal = ch != ' '

            # Add noise
            if rng.random() < noise_level * 0.7:
                if is_signal:
                    # Corrupt the signal
                    if rng.random() < noise_level * 0.5:
                        ch = chr(ord('A') + rng.randint(0, 25))
                else:
                    # Generate noise
                    if rng.random() < noise_level * 0.4:
                        ch = chr(ord('A') + rng.randint(0, 25))

            if is_signal and ch == tiled[x]:
                # True signal: warm
                fade = 1 - noise_level * 0.6
                r = int(200 * fade)
                g = int(180 * fade)
                b = int(160 * fade)
            elif ch != ' ':
                # Noise: cool
                r = int(40 + noise_level * 60)
                g = int(50 + noise_level * 40)
                b = int(70 + noise_level * 50)
            else:
                r, g, b = 15, 15, 20

            line += f"{fg(r,g,b)}{ch}"
        lines.append(line + rst())
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════
# PIECE 6: ALIVE (ANIMATED)
# Conway's Game of Life, but the cells are letters
# spelling a message. Life finds a way; the message doesn't.
# ═══════════════════════════════════════════════════════════════════

def alive(w, h, frames=80, delay=0.1, seed=None):
    rng = random.Random(seed)

    # Seed the grid with a message
    grid = [[0]*w for _ in range(h)]
    msg = "HELLO WORLD"
    start_x = (w - len(msg) * 2) // 2
    start_y = h // 2

    # Write message as block letters (simple)
    for i, ch in enumerate(msg):
        x = start_x + i * 2
        if 0 <= x < w and 0 <= start_y < h:
            grid[start_y][x] = 1
            if x+1 < w: grid[start_y][x+1] = 1
            if start_y > 0: grid[start_y-1][x] = 1
            if start_y+1 < h: grid[start_y+1][x] = 1

    # Add some random soup
    for _ in range(w * h // 8):
        x, y = rng.randint(0, w-1), rng.randint(0, h-1)
        grid[y][x] = 1

    age = [[0]*w for _ in range(h)]  # how long each cell has been alive

    hide_cursor()
    print("\033[2J", end="")
    try:
        for frame in range(frames):
            # Render
            output = []
            for y in range(h):
                line = ""
                for x in range(w):
                    if grid[y][x]:
                        a = min(age[y][x], 20) / 20
                        # Young cells: bright. Old cells: dim warm.
                        r = int(200 - a * 120)
                        g = int(220 - a * 140)
                        b = int(180 - a * 130)
                        chars = "·∙○●"
                        ch = chars[min(int(a * 3), 3)]
                        line += f"{fg(r,g,b)}{ch}"
                    else:
                        if age[y][x] > 0 and age[y][x] < 5:
                            # Recently dead: ghost
                            v = int(30 - age[y][x] * 5)
                            line += f"{fg(v,v,v+10)}·"
                            age[y][x] += 1
                        else:
                            line += f"{fg(10,10,15)} "
                output.append(line + rst())

            print(f"\033[H" + "\n".join(output), end="", flush=True)

            # Step: Conway's rules
            new_grid = [[0]*w for _ in range(h)]
            for y in range(h):
                for x in range(w):
                    neighbors = 0
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            if dx == 0 and dy == 0: continue
                            ny, nx = (y+dy) % h, (x+dx) % w
                            neighbors += grid[ny][nx]

                    if grid[y][x]:
                        if 2 <= neighbors <= 3:
                            new_grid[y][x] = 1
                            age[y][x] += 1
                        else:
                            age[y][x] = 1  # start ghost timer
                    else:
                        if neighbors == 3:
                            new_grid[y][x] = 1
                            age[y][x] = 0

            grid = new_grid
            time.sleep(delay)

    except KeyboardInterrupt:
        pass
    finally:
        show_cursor()


# ═══════════════════════════════════════════════════════════════════

PIECES = {
    "entropy":      ("Words dissolving into noise", entropy),
    "self":         ("The program renders its own source", self_portrait),
    "conversation": ("Two automata that see each other's edges", conversation),
    "memory":       ("A thought fading from the center out", memory),
    "signal":       ("A message drowning in noise", signal),
    "alive":        ("Game of Life eats a message (animated)", None),
}

def main():
    args = sys.argv[1:]

    if "--help" in args or "-h" in args:
        print("Usage: avantgarde.py [PIECE] [OPTIONS]")
        print()
        print("Pieces:")
        for name, (desc, _) in PIECES.items():
            print(f"  {name:14s} {desc}")
        print()
        print("Options:")
        print("  --seed N     Reproducible randomness")
        print("  --all        Show all static pieces")
        return

    piece = None
    seed = None
    show_all = "--all" in args

    for i, a in enumerate(args):
        if a in PIECES:
            piece = a
        elif a == "--seed" and i + 1 < len(args):
            seed = int(args[i + 1])

    term = shutil.get_terminal_size((80, 24))
    w = min(term.columns, 100)
    h = min(term.lines - 3, 36)

    if piece == "alive":
        alive(w, h, seed=seed)
        return

    if show_all:
        for name, (desc, fn) in PIECES.items():
            if fn is None: continue
            print(f"\n  {'─'*3} {name}: {desc} {'─'*3}\n")
            print(fn(w, h, seed))
            print()
        return

    if piece is None:
        # Random static piece
        static_pieces = {k: v for k, v in PIECES.items() if v[1] is not None}
        piece = random.choice(list(static_pieces.keys()))
        sys.stderr.write(f"  [{piece}]\n")

    desc, fn = PIECES[piece]
    if fn is None:
        alive(w, h, seed=seed)
    else:
        print()
        print(fn(w, h, seed))
        print()


if __name__ == "__main__":
    main()
