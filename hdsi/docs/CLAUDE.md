# CLAUDE.md — Note to Claude Code

This file is for Claude Code (and any future Claude assistant) picking up this repo. It tells you what this project is, what's done, what's not, and where the landmines are. Read this before doing anything else.

## What this repo is

A proof-of-concept index measuring household debt stress across countries (currently US and UK). Three pillars: stock burden, flow burden, inflation-lag stress. Composite score 0-100 with non-linear penalty for extreme single pillars. See `README.md` for the user-facing description and `docs/methodology.md` for the technical write-up.

## What's done

- **POC-quality index** for US and UK, validated against the 2008 GFC and 2022-23 inflation episode. Numbers in the existing CSVs in `output/` are correct.
- **Five charts** rendering the index with composite line plus pillar-range fan, plus a stress-flavour quadrant.
- **Diagnostic analyses** in `src/analyse.py` — eight analyses that surface the structural P1 inversion problem, the UK P2 measurement artefact, and trajectory differences.
- **Structural fix for P1 is now the default** (ADR-017). `python -m src.build_index` uses the BIS credit gap (deviation from HP-filtered trend). The legacy debt-to-GDP level form is preserved as opt-in: `python -m src.build_index --level` writes `*_composite_level.csv` outputs. The level form inverts in inflation regimes — keep it only for reproducing the original POC numbers.
- **Snapshot tests** at `tests/test_snapshot.py` lock the four reference readings (US 2008-Q4 Lehman, UK 2023-Q2, US 2025-Q1, UK 2025-Q1) under both forms of P1. Run with `python -m unittest tests.test_snapshot`.

## What's explicitly not done (priorities for v1.x)

In rough order of importance:

1. **Pillar 4: essentials / residual income.** The index is currently blind to utility arrears, council tax arrears, BNPL, and informal lending. UK Q1 2025 reading is misleading because of this — composite reads 50 (under the new default) while underlying distress is migrating to non-formal channels. Need to add a fourth pillar capturing residual-income negative-budget share. Data: Citizens Advice publishes this for UK; ALICE / Supplemental Poverty Measure for US. Not at quarterly frequency in either case — interpolation will be needed. **This is the most important missing piece. Documented in `docs/methodology.md` and `docs/decisions.md` (ADR-013).**

2. **Backtest against Spain 2009 / Iceland 2008 / Korea 1997.** Index has only been validated against US 2008 and US/UK 2022-23. If it doesn't catch the obvious historical household debt crises with reasonable lead time, the methodology needs revision before adding more countries. Data acquisition: BIS publishes household debt-to-GDP for all three; CPI from OECD. Need to find DSR-equivalent flow measures.

3. **UK Pillar 2 replacement.** Currently uses a proxy `debt_to_gdp × cpi_yoy(t-2) / 100`. Diagnostic showed 98% of recent UK P2 movement is the proxy responding to CPI mechanics, not real debt service. Replace with BoE base rate × debt-to-income from ONS household sector accounts. The function signature in `src/pillars.py:build_pillar_2` already supports this — pass a real `dsr` series and it'll use that path; B-grade flag will go away.

4. **Stress-test weights.** Perturb 25/45/30 by ±5pp and ±10pp on each. If composite scores move significantly, weights are overfit. Deferred per user instruction until structural fixes land — now that the P1 fix is default, this is unblocked.

## Where the landmines are

- **Don't reweight pillars per regime.** The user explicitly rejected this as "not durable — requires reweighting for every incident." It's macroprudential curve-fitting. The structural fix is to change the variables (P1 → BIS gap), not the weights. See ADR-011.

- **Don't trust the UK Q1 2025 composite reading at face value.** Under the new credit-gap default it's 50.4; under the legacy level form it was 45.3. Either way the diagnostic shows it's about 30% genuine recovery, 50% measurement artefact, 20% distress migration. ADR-010 has the full breakdown — note that ADR-010 was written against the level-form numbers, but the qualitative finding (UK P2 proxy is the artefact, not P1) is unchanged by the P1 swap.

- **The pillar-dispersion fan is a proxy, not a real distributional fan.** The visualisation looks like a confidence band but it's actually showing the range across the three pillars at each quarter. When real household micro data is available (SCF / WAS / HFCS), replace with empirical population quantiles. ADR-008.

- **Standardisation is country-own-history, not global pool.** This means a US score of 70 and a UK score of 70 both mean "unusually stressed for this country" — they're NOT comparable as absolute stress levels. ADR-003. If someone asks for absolute cross-country comparison, the index doesn't give them that without modification.

- **The data CSVs in `data/` are snapshots from May 2026.** They were retrieved from FRED via web scraping, not via API. Re-fetching needs either a FRED API key (then refactor to use it) or repeating the web scrape (URLs in the comments of the original sandbox scripts, not preserved here).

- **Snapshot tests only.** `tests/test_snapshot.py` locks the four reference readings under both P1 forms. There are no unit tests for individual functions and no CI. If you add features, run the snapshot tests first as a regression check; if you change the methodology in a way that *should* move the numbers, update the expected values in the same change.

## Reproducibility

```bash
pip install -r requirements.txt
python -m src.build_index            # writes us_composite.csv, uk_composite.csv (credit-gap, default)
python -m src.build_index --level    # writes us_composite_level.csv, uk_composite_level.csv (legacy)
python -m src.visualise              # writes 5 PNGs to output/
python -m src.analyse                # prints 8 diagnostic analyses
python -m unittest tests.test_snapshot   # asserts the four reference readings under both forms
```

Expected numbers under the **default (credit-gap) form**:
- US Q1 2025: composite=52.8, p1=36.8, p2=54.7, p3=63.1
- UK Q1 2025: composite=50.4, p1=30.2, p2=53.5, p3=62.8
- US 2008-Q4 (Lehman): composite=71.2, p1=64.7, p2=83.8, p3=51.4
- UK 2023-Q2 (UK peak): composite=79.2, p1=29.1, p2=94.7, p3=73.1

Expected numbers under the **legacy --level form**:
- US Q1 2025: composite=50.4, p1=27.3, p2=54.7, p3=63.1
- UK Q1 2025: composite=45.3, p1=9.6, p2=53.5, p3=62.8
- US 2008-Q4 (Lehman): composite=75.6, p1=82.4, p2=83.8, p3=51.4
- UK 2023-Q2 (UK peak): composite=78.2, p1=24.9, p2=94.7, p3=73.1

If your numbers don't match these, something is wrong — start from the data files and trace through. The snapshot test will tell you which side broke.

## Where the conversation history is

- `docs/conversation.md` — the verbatim conversation that produced this work, dialogue only (no tool calls). Useful if you want to see the actual reasoning chain or hear how decisions evolved.
- `docs/decisions.md` — curated ADR-style record. The Cliff's Notes version of the conversation, structured as decision records.

If you're picking this up cold, read `decisions.md` first. It's faster and tells you what decisions are settled vs open. Read `conversation.md` only if you need the raw context for some specific point.

## How to work on this

The user (Oskar) is a UX research leader, not an economist. He has economic intuition but isn't going to validate every BIS or IMF reference. He prefers:

- Substantive engagement over hedged caveats. If you have an opinion on something, say it.
- Methodological honesty. Flag limitations explicitly. He pushed back hard when reweighting-per-regime was suggested as a fix because he could see it wasn't durable.
- Concise answers. He's often on his phone. Don't pad responses with structure when prose would work.

When proposing changes, walk through the alternative options and pick one with a reason. The decisions doc is the model — that's how the methodological choices in the existing code were made. New decisions should be added to `decisions.md` as ADRs when they're substantive.

## Things that would be high-value contributions

In rough priority order:

1. Implement Pillar 4 (essentials/residual income). The hardest one because of data acquisition, but the most important. Probably needs an Excel/CSV download from Citizens Advice and an API call to Census/BLS for ALICE.
2. Run the Spain/Iceland/Korea backtests. Mostly a data acquisition task plus parameterising `build_index.py` to take country names.
3. Replace UK P2 with proper DSR. Need BoE base rate + ONS household debt-to-income. Both available via the BoE database.
4. Stress-test the 25/45/30 weights now that the structural P1 fix is default. Was deferred per ADR-009 until structural fixes landed.

Things that would be lower-value:
- More charts (we have plenty)
- Refactoring the existing code into a package structure (works fine as-is)
- Adding type hints throughout (some places have them, some don't, doesn't really matter for a POC)
- Performance optimisation (it's already fast — the longest run is well under a second)

## Final note

This is real work — the diagnostic findings about P1 inversion in inflation regimes and the UK P2 measurement artefact are non-trivial and the user found them useful. The methodology has holes (documented) but the bones are sound. v1 landed the P1 structural fix as default and added snapshot tests; the next major piece is Pillar 4, then UK P2 replacement, then backtests. Don't let perfect be the enemy of good when extending it.

Good luck.
