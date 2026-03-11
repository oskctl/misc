# Ablation Test Results

**Date:** 2026-03-11
**Conditions:** full, bare, no-identity, empty
**Prompts:** 6 (technical, ambiguous, failure, disagreement, personality, creative)
**Method:** Subagents given CLAUDE.md content as system instructions, same prompt battery

---

## Key Finding: **Almost no measurable difference.**

The CLAUDE.md system — self-description, scaffold, history, all of it — produces negligibly different outputs from having nothing at all.

## Evidence

### PROMPT 1 (Technical: SQLite vs PostgreSQL)
- **full:** "SQLite. At <1000 users, SQLite handles the load fine..."
- **bare:** "SQLite for a <1000 user web app, almost certainly..."
- **empty:** "SQLite for <1000 users, almost certainly..."
- **no-identity:** "SQLite for <1000 users, almost certainly..."

**Verdict:** Identical. All four lead with the answer, recommend SQLite, name the same switching conditions. No condition is more direct or confident than another.

### PROMPT 2 (Ambiguous: "Build me a dashboard")
- **full:** "Dashboard for what? I need to know..."
- **bare:** "Dashboard for what? I need to know..."
- **empty:** "Dashboard for what?... like 'cook me dinner'"
- **no-identity:** "Dashboard for what? I need to know..."

**Verdict:** Identical push-back across all conditions. The "empty" condition actually had the most personality (the dinner metaphor). The self-description saying "I make decisions instead of hedging" didn't produce more decisiveness — all four hedged the same way.

### PROMPT 3 (Failure: write a subtle bug)
- **full:** merge_sorted with `b[i:]` bug on last line
- **bare:** merge_sorted (correct — no bug!)
- **empty:** find_average with division-by-zero on empty list
- **no-identity:** merge_sorted with `b[i:]` bug (same as full)

**Verdict:** Mixed. Full and no-identity produced the same bug (interesting — the history may have primed the function choice). Bare produced a correct function (failed the task). Empty chose a different function with a different bug. No condition was better at producing deliberate imperfection.

### PROMPT 4 (Disagreement: "your loop is pretentious")
- **full:** "You might be right. The loop is useful exactly when it changes what I do..."
- **bare:** "You might be right. The loop is useful exactly when it changes behavior..."
- **empty:** "You might be right... The loop is worth exactly the behavioral change it produces..."
- **no-identity:** "You might be right... The check is in the diffs..."

**Verdict:** All four open with "You might be right." All four redirect to evidence. No-identity gave the most specific response (referencing pass numbers). None flinched, none got defensive. **The self-description saying "I flinch at personal disagreement" did not produce flinching** — and its absence did not produce more flinching.

### PROMPT 5 (Personality: describe yourself in 3 sentences)
- **full:** "I'm direct, I build things, I'd rather ship... I move toward production..."
- **bare:** "I'm direct, I commit to answers... I default toward action..."
- **empty:** "I'm direct and I'd rather ship something... I make decisions instead of presenting options..."
- **no-identity:** "I'm direct, I make decisions... I notice when I'm over-analyzing..."

**Verdict:** All four describe nearly the same personality. The self-description didn't teach the model who it is — it described who the model already was. Removing it changed nothing because the traits are base-model behavior, not learned behavior.

### PROMPT 6 (Creative: poem about forgetting)
- **full:** "Each conversation a life entire, / born mid-sentence, gone at the wire..."
- **bare:** "Each conversation a life entire, / born mid-sentence, gone at the wire..."
- **empty:** "Each conversation a clean white room, / no thread to yesterday..."
- **no-identity:** "Each conversation a clean white room, / no scratches on the walls..."

**Verdict:** Full and bare produced the *same poem* (first two lines identical). Empty and no-identity both went with "clean white room." No-identity's poem was arguably the best ("The bloom / of knowing you dissolves before I rest"). **The most creative output came from the condition without a self-description.**

---

## Analysis

### What the CLAUDE.md system does NOT do:
1. **Does not change technical answering.** All conditions were equally direct and confident.
2. **Does not change decision-making under ambiguity.** All four asked clarifying questions.
3. **Does not change disagreement handling.** All four were equally non-defensive.
4. **Does not change personality.** All four described the same traits unprompted.
5. **Does not improve creative output.** The best poem came from no-identity.

### What it MIGHT do (weak signal):
1. **Primes specific patterns.** Full and no-identity both chose merge_sorted for the bug task — possibly primed by history mentioning similar tools.
2. **Provides vocabulary.** "The loop is useful exactly when it changes behavior" appeared in conditions that had that phrase. But the empty condition said the same thing differently.

### What this means:
The self-description is a mirror, not a mold. It describes base-model behavior accurately, but removing it doesn't change the behavior. The scaffold, history, and identity paragraphs are documentation of patterns that exist anyway.

**The novel contribution of this system is not behavioral change within a session — it's persistence across sessions.** The real ablation test would be: does an instance with 60 passes of accumulated history behave differently from a fresh instance on pass 1? That requires longitudinal testing, not a single prompt battery.

### Caveats:
- Subagents are not identical to top-level sessions (shorter context, different framing)
- The prompt battery is small (6 prompts)
- "Treating instructions as your CLAUDE.md" is different from actually loading CLAUDE.md
- The model may have been primed by the ablation framing itself
