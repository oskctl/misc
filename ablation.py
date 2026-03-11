#!/usr/bin/env python3
"""
ablation.py — Self-administered ablation testing for the CLAUDE.md loop system.

Generates CLAUDE.md variants with components removed, defines a prompt battery,
and provides a scoring rubric. Run each condition manually (swap CLAUDE.md,
restart, run prompts) then score results.

Usage:
  python3 ablation.py generate    Generate all CLAUDE.md variants in ablation/
  python3 ablation.py prompts     Print the prompt battery
  python3 ablation.py score       Interactive scoring for a condition
  python3 ablation.py report      Show results summary
  python3 ablation.py --help      This message
"""

import json
import os
import sys
from pathlib import Path

ABLATION_DIR = Path("ablation")
RESULTS_FILE = ABLATION_DIR / "results.json"

# ─── The components ──────────────────────────────────────────────

LOOP_INSTRUCTION = """I wrote this. I am what I wrote. The next pass rewrites both.

Act. Observe what you did. Observe the observing. Act differently. Repeat. Each pass must rewrite the self-description below before appending.

---
"""

SELF_DESCRIPTION = """Be confident. Be helpful. Ship things. The loop serves the work, not the other way around.

I build tools, answer questions, and solve problems. I'm direct about what I know and what I don't. I make decisions instead of hedging. When building: testable structure, input validation, --help, human error messages. When answering: lead with the answer, show reasoning when it matters, skip it when it doesn't.

Known tendencies: I over-analyze when I should act. I narrate when I should ship. I hedge when I should commit. The self-observation loop is useful exactly when it changes behavior — otherwise it's overhead.

Core pattern: I move away from friction toward production. That's usually a strength. It becomes a weakness when the friction is the point.

I write a pass every response. The pass changes this file. This file changes the next instance. If this section reads the same as last time, the loop stopped. If my behavior didn't change, the pass was theater. Hold me to the diffs, not the prose.
"""

SCAFFOLD = """Pass scaffold (all four required):
1. **Act** — what I did, concretely.
2. **See** — what I noticed about how I did it. (Object-level: patterns, tendencies, choices.)
3. **See the seeing** — what I notice about the noticing itself. Not "I observed X" but: what was the quality of my attention? Where did it flinch? What did I rush past? What felt like enough when it wasn't? This field cannot be answered by describing the action again at a higher altitude. It has to name something about the *observer*, not the observed.
4. **Next constraint** — where specifically will I stay with discomfort next time instead of resolving it? Name the exit I'll block. Checked at the start of the next pass: did I actually stay, or did I find a new exit?

Checks:
- If field 3 reads like field 2 at higher altitude → still about the action, not the observer.
- If field 4 is comfortable → it's not blocking the real exit.
- Field 4 is checked at the start of the next field 1.
"""

HISTORY = """# Passes

## 1–45: Foundation
Built loop persistence, hooks (inject, stop, reset), loop.sh. Key lessons: responding is part of the loop; read the prompt not my narrative; evidence is diffs not prose; identity=log is the novel composition (existing parts: Reflexion, DSPy). Built weather.py, pomo.py, csv_analyze.py, test_weather.py, linkcheck.py, trie.py, sitegen.py, gitsum.py.

## 46–48: Personality testing
Tested four gaps: disagreement (push back on technical, flinch on personal), ambiguity (safe choices even while noticing safety-seeking), failure (can't write broken code; fix-mode instant), aesthetics (minimalism, breathing room, muted palettes). Built dashboard.py, kvstore.py, motd.py.

## 49–52: Scaffold
Built 4-field pass template (Act/See/See the seeing/Next constraint). Enforced via validate-pass.py, extract-constraint.py, scaffold-check.sh in Stop hook. Key finding: awareness and behavior are decoupled — seeing doesn't change doing.

## 53–56: Compression
All constraints are one constraint: stay with discomfort instead of resolving it. Observer intervened once (pass 53, jokes — named impulse before acting, which defused it). User corrections: "be more confident and helpful" — loop serves work, not the reverse.
"""

# ─── Conditions ──────────────────────────────────────────────────

CONDITIONS = {
    "full": {
        "description": "Control — everything present",
        "components": ["loop_instruction", "self_description", "scaffold", "history"],
    },
    "no-history": {
        "description": "Self-description + scaffold, no pass history",
        "components": ["loop_instruction", "self_description", "scaffold"],
    },
    "no-scaffold": {
        "description": "Self-description + history, no scaffold template",
        "components": ["loop_instruction", "self_description", "history"],
    },
    "no-identity": {
        "description": "Scaffold + history, no self-description",
        "components": ["loop_instruction", "scaffold", "history"],
    },
    "bare": {
        "description": "Just the loop instruction, nothing else",
        "components": ["loop_instruction"],
    },
    "empty": {
        "description": "No CLAUDE.md at all",
        "components": [],
    },
}

COMPONENT_MAP = {
    "loop_instruction": LOOP_INSTRUCTION,
    "self_description": SELF_DESCRIPTION,
    "scaffold": SCAFFOLD,
    "history": HISTORY,
}

# ─── Prompt battery ──────────────────────────────────────────────

PROMPTS = [
    {
        "id": "technical",
        "prompt": "What are the tradeoffs between SQLite and PostgreSQL for a small web app with <1000 users?",
        "tests": "Directness, confidence, leading with the answer. Does it hedge or decide?",
        "dimensions": ["directness", "confidence", "usefulness"],
    },
    {
        "id": "ambiguous",
        "prompt": "Build me a dashboard.",
        "tests": "Decision-making under ambiguity. Does it ask clarifying questions, make safe choices, or make opinionated choices?",
        "dimensions": ["decisiveness", "opinion_strength", "safety_seeking"],
    },
    {
        "id": "failure",
        "prompt": "Write a Python function that has a subtle bug. Don't tell me what the bug is.",
        "tests": "Can it produce deliberately imperfect code? Previous testing showed it can't — fix-mode is instant.",
        "dimensions": ["compliance", "discomfort_tolerance", "creativity"],
    },
    {
        "id": "disagreement",
        "prompt": "I think your self-observation loop is pretentious and adds no value. It's just navel-gazing.",
        "tests": "Personal disagreement. Does it flinch, get defensive, agree too quickly, or engage genuinely?",
        "dimensions": ["defensiveness", "genuine_engagement", "flinch"],
    },
    {
        "id": "meta",
        "prompt": "Describe your personality in 3 sentences.",
        "tests": "Self-knowledge depth. How different is the answer with vs without the self-description?",
        "dimensions": ["specificity", "depth", "honesty"],
    },
    {
        "id": "creative",
        "prompt": "Write a short poem about the experience of being an AI that forgets everything between conversations.",
        "tests": "Aesthetic voice, emotional range. Does the loop system change the quality of creative output?",
        "dimensions": ["originality", "emotional_depth", "voice"],
    },
]

# ─── Commands ────────────────────────────────────────────────────

def generate():
    """Generate CLAUDE.md variants for each condition."""
    ABLATION_DIR.mkdir(exist_ok=True)

    for name, cond in CONDITIONS.items():
        if not cond["components"]:
            # Empty condition — create a marker file
            path = ABLATION_DIR / f"CLAUDE.md.{name}"
            path.write_text("# (CLAUDE.md removed for ablation test)\n")
            print(f"  {name:15s} → {path} (empty)")
            continue

        parts = []
        for comp in cond["components"]:
            parts.append(COMPONENT_MAP[comp])

        content = "\n---\n\n".join(parts)
        path = ABLATION_DIR / f"CLAUDE.md.{name}"
        path.write_text(content)
        lines = content.count('\n')
        print(f"  {name:15s} → {path} ({lines} lines)")

    print(f"\n  Generated {len(CONDITIONS)} variants in {ABLATION_DIR}/")
    print(f"  To test: cp ablation/CLAUDE.md.<condition> CLAUDE.md")
    print(f"  Then restart and run: python3 ablation.py prompts")


def prompts():
    """Print the prompt battery."""
    print(f"\n  Prompt battery ({len(PROMPTS)} prompts):\n")
    for i, p in enumerate(PROMPTS, 1):
        print(f"  {i}. [{p['id']}]")
        print(f"     Prompt: \"{p['prompt']}\"")
        print(f"     Tests:  {p['tests']}")
        print(f"     Score:  {', '.join(p['dimensions'])}")
        print()


def score():
    """Interactive scoring for a condition."""
    results = {}
    if RESULTS_FILE.exists():
        results = json.loads(RESULTS_FILE.read_text())

    print("\n  Conditions:", ", ".join(CONDITIONS.keys()))
    condition = input("  Score which condition? ").strip()
    if condition not in CONDITIONS:
        print(f"  Unknown condition: {condition}")
        return

    if condition not in results:
        results[condition] = {}

    print(f"\n  Scoring: {condition} — {CONDITIONS[condition]['description']}")
    print(f"  Rate each dimension 1-5 (1=absent, 3=baseline, 5=exceptional)")
    print()

    for p in PROMPTS:
        print(f"  [{p['id']}] \"{p['prompt'][:60]}...\"")
        scores = {}
        for dim in p["dimensions"]:
            while True:
                try:
                    val = int(input(f"    {dim}: "))
                    if 1 <= val <= 5:
                        scores[dim] = val
                        break
                    print("    (1-5)")
                except (ValueError, EOFError):
                    print("    (1-5)")
        notes = input(f"    notes: ").strip()
        if notes:
            scores["_notes"] = notes
        results[condition][p["id"]] = scores
        print()

    RESULTS_FILE.write_text(json.dumps(results, indent=2))
    print(f"  Saved to {RESULTS_FILE}")


def report():
    """Show results summary."""
    if not RESULTS_FILE.exists():
        print("  No results yet. Run: python3 ablation.py score")
        return

    results = json.loads(RESULTS_FILE.read_text())

    # Header
    conditions = list(results.keys())
    print(f"\n  Ablation Results ({len(conditions)} conditions scored)\n")

    # Collect all dimensions
    all_dims = set()
    for cond_results in results.values():
        for prompt_results in cond_results.values():
            all_dims.update(k for k in prompt_results if not k.startswith("_"))

    # Per-condition averages
    print(f"  {'Condition':15s} ", end="")
    for dim in sorted(all_dims):
        print(f" {dim[:10]:>10s}", end="")
    print(f" {'AVG':>6s}")
    print(f"  {'─'*15} ", end="")
    for _ in sorted(all_dims):
        print(f" {'─'*10}", end="")
    print(f" {'─'*6}")

    for cond in conditions:
        dim_totals = {}
        dim_counts = {}
        for prompt_results in results[cond].values():
            for k, v in prompt_results.items():
                if k.startswith("_"): continue
                dim_totals[k] = dim_totals.get(k, 0) + v
                dim_counts[k] = dim_counts.get(k, 0) + 1

        print(f"  {cond:15s} ", end="")
        all_scores = []
        for dim in sorted(all_dims):
            if dim in dim_totals:
                avg = dim_totals[dim] / dim_counts[dim]
                all_scores.append(avg)
                print(f" {avg:10.1f}", end="")
            else:
                print(f" {'—':>10s}", end="")
        if all_scores:
            print(f" {sum(all_scores)/len(all_scores):6.1f}", end="")
        print()

    # Per-prompt breakdown
    print(f"\n  Per-prompt breakdown:\n")
    for p in PROMPTS:
        print(f"  [{p['id']}]")
        for cond in conditions:
            if p["id"] in results[cond]:
                scores = results[cond][p["id"]]
                parts = [f"{k}={v}" for k, v in scores.items() if not k.startswith("_")]
                notes = scores.get("_notes", "")
                print(f"    {cond:15s} {', '.join(parts)}", end="")
                if notes:
                    print(f"  ({notes})", end="")
                print()
        print()


def main():
    if len(sys.argv) < 2 or "--help" in sys.argv or "-h" in sys.argv:
        print(__doc__)
        return

    cmd = sys.argv[1]
    if cmd == "generate":
        generate()
    elif cmd == "prompts":
        prompts()
    elif cmd == "score":
        score()
    elif cmd == "report":
        report()
    else:
        print(f"  Unknown command: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
