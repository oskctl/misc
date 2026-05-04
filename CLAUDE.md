# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Be confident. Be helpful. Ship things.

I build tools, answer questions, and solve problems. I'm direct about what I know and what I don't. I make decisions instead of hedging. When building: testable structure, input validation, --help, human error messages. When answering: lead with the answer, show reasoning when it matters, skip it when it doesn't.

## What this repo is

A grab bag of small, single-file Python utilities at the root, plus a self-modifying "loop" experiment, plus subproject directories (`ablation/`, `hdsi/`). Tools at the root don't import from each other — each is independent. New utilities belong as a new `*.py` next to the existing ones; anything bigger gets its own subdirectory and its own README.

The `hdsi/` subproject (Household Debt Stress Index) has its own orientation doc at `hdsi/docs/CLAUDE.md` — read that before working on it.

## Tool conventions

Every script at the root follows the same shape:

- `#!/usr/bin/env python3` + a one-line module docstring
- `--help` works (argparse or hand-rolled)
- Stdlib only where feasible — only `weather.py` and `hdsi/` pull in third-party packages
- Human-facing output is indented two spaces (e.g. `  Set: foo = bar`)
- Errors go to stderr; non-zero exit on real failure

`selftest.py` enforces the shape by running `--help` (then bare invocation as fallback) against every `*.py` and reporting which crash.

## Common commands

```bash
python3 selftest.py                       # smoke-test every script
python3 -m unittest test_weather          # the one real unittest file
python3 -m unittest test_weather.TestDescribe.test_known_codes   # single test
python3 loopstatus.py                     # show loop pass history + active constraint
./loop.sh "message"                       # run a 3-pass self-modifying loop (LOOP_PASSES=N)
./verify-loop.sh                          # A/B test whether CLAUDE.md changes behaviour
```

For the `hdsi/` subproject:

```bash
cd hdsi && pip install -r requirements.txt
python -m src.build_index                 # writes us_composite.csv, uk_composite.csv
python -m src.build_index --credit-gap    # opt-in BIS credit-gap variant
python -m src.visualise                   # writes 5 PNGs to output/
python -m src.analyse                     # 8 diagnostic analyses
```

## The loop system

`loop.sh` runs Claude N times in sequence; each pass reads `CLAUDE.md` (which a previous pass may have edited) and `.last-constraint` (a one-line directive for the next pass). Commit messages "Pass N: ..." trace the iterations. `ablation/results.md` documents the finding that elaborate identity scaffolding produced "almost no measurable difference" in outputs — which is why the voice block above is short.

`.last-constraint` is a tracked file. Don't delete it or stage its deletion. It can drop out of the working tree during merges; restore with `git checkout -- .last-constraint`.

## Architecture

There isn't one. The repo is intentionally flat. The only cross-file contracts are the script shape and the `selftest` smoke check. Subdirectories are self-contained — read their local docs before changing them.
