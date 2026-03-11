#!/usr/bin/env python3
"""Generative terminal art — flow fields, topography, interference patterns."""

import math
import random
import sys
import shutil
import time

# ANSI 256-color helpers
def fg(n): return f"\033[38;5;{n}m"
def bg(n): return f"\033[48;5;{n}m"
def reset(): return "\033[0m"

# Color palettes (ANSI 256 color indices)
PALETTES = {
    "ocean":   [17, 18, 19, 20, 21, 27, 33, 39, 45, 51, 87, 123, 159, 195, 231],
    "fire":    [16, 52, 88, 124, 160, 196, 202, 208, 214, 220, 226, 227, 228, 229, 231],
    "forest":  [16, 22, 23, 28, 29, 34, 35, 40, 41, 42, 48, 78, 114, 150, 194],
    "dusk":    [16, 17, 18, 54, 55, 91, 127, 163, 169, 175, 181, 182, 218, 224, 231],
    "mono":    [232, 234, 236, 238, 240, 242, 244, 246, 248, 250, 252, 254, 255, 255, 231],
}

# Unicode characters for drawing
FLOW_CHARS = "·∙•○◦◯◌◍◎●"
TOPO_CHARS = " ·∙░▒▓█"
WAVE_CHARS = " ·:;=+*#%@"
BRAILLE = [0x2800 + i for i in range(256)]


def noise2d(x, y, seed=0):
    """Simple value noise — good enough for art."""
    def hash2d(ix, iy):
        n = ix * 374761393 + iy * 668265263 + seed * 1274126177
        n = (n ^ (n >> 13)) * 1274126177
        n = n ^ (n >> 16)
        return (n & 0x7fffffff) / 0x7fffffff

    ix, iy = int(math.floor(x)), int(math.floor(y))
    fx, fy = x - ix, y - iy

    # Smoothstep
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)

    a = hash2d(ix, iy)
    b = hash2d(ix + 1, iy)
    c = hash2d(ix, iy + 1)
    d = hash2d(ix + 1, iy + 1)

    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def fbm(x, y, octaves=6, seed=0):
    """Fractal Brownian motion — layered noise."""
    val = 0
    amp = 0.5
    freq = 1.0
    for _ in range(octaves):
        val += amp * noise2d(x * freq, y * freq, seed)
        amp *= 0.5
        freq *= 2.0
    return val


def flow_field(w, h, palette_name="ocean", seed=None):
    """Flow field — particles trace paths through a noise field."""
    seed = seed or random.randint(0, 99999)
    pal = PALETTES.get(palette_name, PALETTES["ocean"])
    grid = [[' '] * w for _ in range(h)]
    color_grid = [[0] * w for _ in range(h)]

    # Place particles and trace them
    n_particles = w * h // 2
    for _ in range(n_particles):
        px = random.uniform(0, w)
        py = random.uniform(0, h)
        for step in range(20):
            ix, iy = int(px), int(py)
            if 0 <= ix < w and 0 <= iy < h:
                val = fbm(px * 0.03, py * 0.06, seed=seed)
                ci = int(val * (len(pal) - 1)) % len(pal)
                char_i = min(int(val * len(FLOW_CHARS)), len(FLOW_CHARS) - 1)
                grid[iy][ix] = FLOW_CHARS[char_i]
                color_grid[iy][ix] = pal[ci]
            angle = fbm(px * 0.04, py * 0.08, octaves=4, seed=seed) * math.pi * 4
            px += math.cos(angle) * 0.8
            py += math.sin(angle) * 0.8
            if px < 0 or px >= w or py < 0 or py >= h:
                break

    return grid, color_grid


def topography(w, h, palette_name="forest", seed=None):
    """Topographic map with contour lines."""
    seed = seed or random.randint(0, 99999)
    pal = PALETTES.get(palette_name, PALETTES["forest"])
    grid = [[' '] * w for _ in range(h)]
    color_grid = [[0] * w for _ in range(h)]

    heights = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            heights[y][x] = fbm(x * 0.04, y * 0.08, octaves=5, seed=seed)

    n_contours = 12
    for y in range(h):
        for x in range(w):
            val = heights[y][x]
            ci = int(val * (len(pal) - 1)) % len(pal)
            color_grid[y][x] = pal[ci]

            # Contour detection — check neighbors
            contour_level = val * n_contours
            is_contour = False
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    neighbor_level = heights[ny][nx] * n_contours
                    if int(contour_level) != int(neighbor_level):
                        is_contour = True
                        break

            if is_contour:
                grid[y][x] = "─"  # contour line
                color_grid[y][x] = pal[min(ci + 2, len(pal) - 1)]
            else:
                ti = int(val * (len(TOPO_CHARS) - 1))
                grid[y][x] = TOPO_CHARS[ti]

    return grid, color_grid


def interference(w, h, palette_name="dusk", seed=None):
    """Wave interference pattern — overlapping circular waves."""
    seed = seed or random.randint(0, 99999)
    random.seed(seed)
    pal = PALETTES.get(palette_name, PALETTES["dusk"])

    # Random wave sources
    sources = [(random.uniform(0, w), random.uniform(0, h),
                random.uniform(0.1, 0.4), random.uniform(0, math.pi * 2))
               for _ in range(random.randint(3, 7))]

    grid = [[' '] * w for _ in range(h)]
    color_grid = [[0] * w for _ in range(h)]

    for y in range(h):
        for x in range(w):
            val = 0
            for sx, sy, freq, phase in sources:
                dist = math.sqrt((x - sx) ** 2 + ((y - sy) * 2) ** 2)
                val += math.sin(dist * freq + phase)
            # Normalize
            val = (val / len(sources) + 1) / 2
            ci = int(val * (len(pal) - 1)) % len(pal)
            wi = int(val * (len(WAVE_CHARS) - 1))
            grid[y][x] = WAVE_CHARS[wi]
            color_grid[y][x] = pal[ci]

    return grid, color_grid


def render(grid, color_grid):
    """Render grid with ANSI colors."""
    lines = []
    for y, row in enumerate(grid):
        parts = []
        for x, ch in enumerate(row):
            parts.append(f"{fg(color_grid[y][x])}{ch}")
        lines.append("".join(parts) + reset())
    return "\n".join(lines)


def animate_flow(w, h, palette_name="ocean", frames=120, delay=0.08):
    """Animated flow field — particles drifting through noise."""
    pal = PALETTES.get(palette_name, PALETTES["ocean"])
    seed = random.randint(0, 99999)

    # Initialize particles
    n = w * h // 6
    particles = [(random.uniform(0, w), random.uniform(0, h)) for _ in range(n)]

    print("\033[?25l", end="")  # hide cursor
    try:
        for frame in range(frames):
            grid = [[' '] * w for _ in range(h)]
            color_grid = [[232] * w for _ in range(h)]
            t = frame * 0.02

            new_particles = []
            for px, py in particles:
                ix, iy = int(px), int(py)
                if 0 <= ix < w and 0 <= iy < h:
                    val = fbm(px * 0.03 + t, py * 0.06, seed=seed)
                    ci = int(val * (len(pal) - 1)) % len(pal)
                    grid[iy][ix] = FLOW_CHARS[min(int(val * len(FLOW_CHARS)), len(FLOW_CHARS) - 1)]
                    color_grid[iy][ix] = pal[ci]

                angle = fbm(px * 0.04 + t, py * 0.08, octaves=4, seed=seed) * math.pi * 4
                npx = px + math.cos(angle) * 0.6
                npy = py + math.sin(angle) * 0.6

                if 0 <= npx < w and 0 <= npy < h:
                    new_particles.append((npx, npy))
                else:
                    new_particles.append((random.uniform(0, w), random.uniform(0, h)))

            particles = new_particles
            print(f"\033[H{render(grid, color_grid)}", end="", flush=True)
            time.sleep(delay)
    except KeyboardInterrupt:
        pass
    finally:
        print("\033[?25h")  # show cursor


MODES = {
    "flow": ("Flow field", flow_field),
    "topo": ("Topographic map", topography),
    "wave": ("Wave interference", interference),
}

def main():
    args = sys.argv[1:]

    if "--help" in args or "-h" in args:
        print("Usage: artgen.py [MODE] [OPTIONS]")
        print()
        print("Modes:")
        print("  flow       Flow field particles (default)")
        print("  topo       Topographic contour map")
        print("  wave       Wave interference pattern")
        print()
        print("Options:")
        print("  --palette NAME   ocean, fire, forest, dusk, mono (default: varies by mode)")
        print("  --seed N         Random seed for reproducibility")
        print("  --animate        Animate the flow field (flow mode only)")
        print("  --wide           Use full terminal width")
        return

    mode = "flow"
    palette = None
    seed = None
    animate = "--animate" in args
    wide = "--wide" in args

    for i, a in enumerate(args):
        if a in MODES:
            mode = a
        elif a == "--palette" and i + 1 < len(args):
            palette = args[i + 1]
        elif a == "--seed" and i + 1 < len(args):
            seed = int(args[i + 1])

    default_palettes = {"flow": "ocean", "topo": "forest", "wave": "dusk"}
    if not palette:
        palette = default_palettes.get(mode, "ocean")

    term = shutil.get_terminal_size((80, 24))
    w = term.columns if wide else min(term.columns, 100)
    h = term.lines - 2 if wide else min(term.lines - 2, 36)

    if animate and mode == "flow":
        print("\033[2J", end="")  # clear screen
        animate_flow(w, h, palette)
        return

    _, gen_fn = MODES[mode]
    grid, color_grid = gen_fn(w, h, palette, seed)
    print()
    print(render(grid, color_grid))
    print()


if __name__ == "__main__":
    main()
