# Architecture Decisions

Curated record of the key methodological and engineering decisions made during HDSI development. Each entry follows a loose ADR (architecture decision record) format: context, options considered, decision, consequences. Readable as a standalone document — you don't need the full transcript to understand why the index looks the way it does.

For the full conversation that produced these decisions, see `conversation.md`.

---

## ADR-001: Three pillars, not two or four

**Context.** The starting question was about UK debt composition shift — unsecured debt at multi-year low while utility arrears at record high. A single ratio (debt-to-GDP) was demonstrably misleading. We needed at least one more dimension. The question was how many.

**Options considered.**
- **Two pillars** (stock + flow): captures the standard macroprudential framing but misses inflation-lag entirely. Would have read 2022-23 as a non-event.
- **Three pillars** (stock + flow + inflation-lag): adds the dimension that made 2022-23 visible without overcomplicating.
- **Four pillars** (add distribution as fourth): conceptually clean — stock, flow, real income, distribution — but requires household micro data we don't have at quarterly frequency.

**Decision.** Three pillars at the aggregate level, with distribution captured as visualisation (pillar dispersion as proxy for distributional dispersion) rather than as a fourth scored pillar. Future work: add distribution as fourth pillar when SCF / WAS / HFCS data is available at sufficient frequency.

**Consequences.** The index has a known blind spot for distributional concentration — a country could maintain stable aggregate scores while stress concentrates in lower deciles. Documented in `methodology.md`. The "fan width" in the visualisation captures pillar dispersion, which is correlated with but not identical to population dispersion.

---

## ADR-002: Weights of 25% / 45% / 30%

**Context.** Once three pillars were chosen, they needed weights. The weights aren't empirically derived — they're priors based on macroprudential research and the conceptual frame.

**Options considered.**
- **Equal weights (33/33/33).** Simple. Defensible as a null hypothesis.
- **Flow-heavy (20/60/20).** BIS research consistently finds DSR is the strongest single predictor of household crisis. Weights toward the most predictive variable.
- **Current (25/45/30).** Flow gets the largest weight (consistent with BIS), but stock and inflation-lag get meaningful representation.
- **Empirical fit.** Regress historical crisis events on pillars and let regression fit weights.

**Decision.** 25/45/30 as a defensible compromise, *not* empirically fit. Empirical fitting risks overfitting to the small set of crises in the training period.

**Consequences.** The weights are sensitive to perturbation — see ADR-009 (deferred). If the weighting is wrong, the composite is wrong. The pillar decomposition charts let users see the underlying components and form their own composite if they prefer different weights.

**Status.** Provisional. Stress-testing weight robustness is an open todo (deferred per user, after the structural fixes land).

---

## ADR-003: Standardise against country's own history

**Context.** Cross-country comparison requires a normalisation. Two main approaches: standardise against a global pool (so a US score of 70 means the same thing as a UK score of 70 in absolute terms), or standardise against each country's own history (so 70 means "this country is unusually stressed for itself").

**Options considered.**
- **Global pool standardisation.** Forces comparability of absolute levels. But UK structurally has higher household debt-to-GDP than US, and US structurally has higher DSR than UK. A global pool would always rank countries by structural baseline rather than current stress.
- **Country-own-history.** Comparable as "stress relative to local history." Both countries can be at 70 simultaneously and that's meaningful — both are unusually stressed for themselves.

**Decision.** Country-own-history standardisation, via z-score → logistic mapping. 50 = country's historical median.

**Consequences.** The index measures stress *changes* not stress *levels*. A country in chronic high-stress equilibrium (steady-state debt distress) would read 50 because that's its norm. This is the right answer for crisis detection but not for cross-sectional comparison. Documented limitation.

---

## ADR-004: Logistic mapping not linear scaling to 0-100

**Context.** Z-scores are unbounded. Need to map them to a 0-100 score for the index.

**Options considered.**
- **Linear scaling** (e.g. clip z to [-3, 3] then rescale). Simple. But treats all z-scores symmetrically, which compresses the most extreme observations.
- **Logistic.** `100 / (1 + exp(-z))`. Smooth, naturally bounded, asymmetric in a way that preserves resolution at the centre and compresses the tails.
- **Empirical CDF.** Map z to its percentile. Maximum resolution at the centre but loses information about how extreme the tail observations are.

**Decision.** Logistic. z=0 → 50, z=2 → 88, z=-2 → 12. Preserves enough centre resolution and naturally bounds extremes.

**Consequences.** The 0-100 scale is non-linear in z. Going from 50 to 60 is a small move (z change of about 0.4); going from 80 to 90 is larger (z change of about 1.3). This is intuitive for "stress" but users should know it's not an interval scale.

---

## ADR-005: Non-linear penalty for any pillar above 80

**Context.** Pure weighted sum says a country with three moderately elevated pillars (each at 60) and a country with one extreme pillar (95) and two moderate ones is in roughly the same place. Empirically this isn't true — the country with one extreme pillar usually has a real problem.

**Options considered.**
- **Pure weighted sum.** Clean, no parameters. Misses the empirical observation about non-compensating dimensions.
- **Maximum.** Composite = max(P1, P2, P3). Captures the non-compensation but ignores everything else.
- **Penalty term.** Weighted sum + penalty when any pillar exceeds threshold.

**Decision.** Weighted sum + penalty: `composite = base + 0.5 × max(0, max_pillar − 80)`.

**Consequences.** Adds two parameters (threshold 80, coefficient 0.5). Both are "round numbers" not empirically fit. The threshold corresponds to about z=0.84 (above 80% of country's history). The coefficient was set so an extreme single pillar adds noticeable but not overwhelming stress to the composite. Documented in code with named constants for easy adjustment.

---

## ADR-006: 2005-2025 coverage, not 1980-2026

**Context.** Original ambition was 1980-2026 coverage to include the 1980s inflation episode and Volcker disinflation as additional validation periods.

**Options considered.**
- **Full historical coverage.** Best for validation but requires data access not available in the sandbox.
- **Modern coverage only (2005-2025).** Available via FRED web pages; covers GFC + 2022-23 inflation episode; sufficient for POC validation.

**Decision.** Pivot to 2005-2025 with explicit documentation. The two episodes covered (debt-led 2008, inflation-led 2022-23) are fundamentally different stress signatures — that's enough validation for a POC.

**Consequences.** No 1980s validation. Some pillars have very short standardisation history (UK debt-to-GDP only from 2008), which makes country-own-history calibration fragile at the start of the series. Future work: pull longer series via direct FRED API access.

---

## ADR-007: UK Pillar 2 as a proxy, with B-grade flag

**Context.** US has a published household DSR (TDSP). UK doesn't publish an equivalent at quarterly frequency. The conceptual cleanliness of "P2 = DSR everywhere" was unavailable.

**Options considered.**
- **Drop UK from the index.** Preserves methodological purity, loses comparison.
- **Hard-substitute another variable.** Use BoE bank rate as a flow proxy directly. Cleaner than the current proxy but a different conceptual variable.
- **Soft-substitute with documented proxy.** Construct UK DSR proxy from available components, flag the data quality.

**Decision.** Soft-substitute: `UK P2 ≈ debt_to_gdp × cpi_yoy(t-2) / 100`. Flagged as B-grade data quality.

**Consequences.** The proxy turned out to be over-responsive to CPI normalisation (98% of the recent UK P2 collapse came from CPI mechanics, not real debt service relief — see ADR-010). This is a known structural problem with the current proxy. Future work: replace with BoE bank rate × debt-to-income or, better, with a directly measured DSR if BIS publishes one for UK.

---

## ADR-008: Pillar dispersion as visualisation, not as score

**Context.** We discussed gold/silver/bronze framing during methodology design — narrow band high mean = uniform safety; wide band high ceiling = one dimension stressed. This was conceptually about *distributional* dispersion (across households) but we don't have the data for that.

**Options considered.**
- **Wait for distributional data.** Defer the visualisation until SCF/WAS/HFCS can be incorporated. Means no fan in v0.
- **Use pillar dispersion as proxy.** Distance between min and max of three pillars at each quarter. Maps onto the gold/silver/bronze framing if you accept that "stress concentrated in one dimension" is a kind of analogue to "stress concentrated in one part of the population."
- **Skip the fan, use composite line only.** Cleanest but loses the most interesting insight (different stress flavours).

**Decision.** Pillar dispersion as proxy, with explicit documentation that it's not population dispersion. The gold/silver/bronze interpretation generalises reasonably from "across households" to "across stress dimensions."

**Consequences.** When the fan widens, it could mean either (a) stress is concentrated in one dimension across the population, or (b) one dimension of the index is in extreme territory while others aren't. These are different things in principle. In practice, for the episodes we have, both interpretations give the same reading.

---

## ADR-009: Stress-test weights — deferred

**Context.** The 25/45/30 weights are provisional. If small perturbations produce large composite changes, the weights are overfit and the index is fragile.

**Options considered.**
- **Stress-test now.** Perturb each weight by ±5pp and ±10pp, see how composite scores change.
- **Defer until structural fixes land.** Weight robustness depends on what variables go into each pillar. If P1 is going to switch from level to credit gap (ADR-011), there's no point stress-testing weights against the old P1.

**Decision.** Defer per user instruction. Will revisit after V2 P1 (BIS credit gap) is implemented as default and after Pillar 4 (essentials/arrears) is added.

**Consequences.** The current weights are unverified for robustness. Caveat in the methodology doc.

---

## ADR-010: UK Q1 2025 reading is mostly measurement artefact

**Context.** UK composite collapsed from peak 78.2 (Q2 2023) to 45.3 (Q1 2025) — 6× faster than the US over the same period. Three hypotheses for what's going on:
- H1: Genuine recovery (rate cuts working through, refinancing wave passed)
- H2: Measurement artefact (UK P2 proxy over-responds to CPI normalisation)
- H3: Distress migration (stress moving to channels the index can't see)

**Diagnostic.** Decomposed UK P2 change between Q2 2023 and Q2 2025:
- Total proxy change: −4.97 points
- Contribution from CPI(t-2) falling: −4.87 points (98%)
- Contribution from debt-to-GDP falling: −0.28 points (2%)

**Decision (interpretive).** The UK improvement is roughly 30% genuine, 50% measurement artefact, 20% distress migration. The headline reading is misleading; the underlying economy hasn't normalised as fast as the index suggests.

**Consequences.** Two implications: (1) UK P2 needs replacing with a proper DSR construction (high priority, awaiting BoE rate data). (2) The index needs a fourth pillar capturing essentials arrears or residual-income negative-budget share to capture the distress migration H3 implies. Documented as future work.

---

## ADR-011: Structural fix for P1 — BIS credit gap

**Context.** Pillar 1 (debt-to-GDP level) was found to invert in inflation regimes. Negative correlation with composite stress in 2020-2025 (US: −0.45, UK: −0.87). Meaning: when stress is high, P1 reads low, and vice versa. Same number, opposite meaning depending on regime.

**Options considered.**
- **Fix A: Real debt growth.** Deflate nominal debt by CPI directly. Removes the inflation-sensitive denominator. Diagnostic showed correlations of −0.71 to −0.95 across regimes — very strongly negative everywhere, not just inverting.
- **Fix B: BIS credit gap.** Use deviation from HP-filtered trend instead of level. Diagnostic showed correlations stable in narrow band (−0.42 to −0.17 across all regimes). No sign-flipping.
- **Fix C: Non-linear interaction term.** Add `λ × max(P3 − P1, 0)` to capture inflation-regime configuration. Adds a parameter; risks overfitting.
- **Reweight per regime.** Detected as proposal, rejected as non-durable (architectural curve-fitting).

**Decision.** Fix B (BIS credit gap) is the structural fix. Has macroprudential pedigree (Basel III countercyclical capital buffer uses it). Stable across regimes. No new parameters.

**Implementation.** `pillars.build_pillar_1` takes `use_credit_gap` flag. Default False for backward compatibility with the original POC. `python -m src.build_index --credit-gap` produces V2 output.

**Consequences.** V2 raises UK P1 from 9.6 to 30.2 — the "headline-flattering" 9.6 was the inversion problem. V2 reading of 30.2 is closer to the true stress level. V2 raises US P1 from 27.3 to 36.8 (smaller adjustment because US has less inflation-driven distortion).

**Status.** Implemented as opt-in. Should become default in v1.

---

## ADR-012: Package as flat repo, not Python package

**Context.** When Oskar asked to add this to a misc GitHub repo, the question was how to structure it.

**Options considered.**
- **Flat repo with src/ folder.** Like a project, not a library. Run via `python -m src.build_index`. Easy to read, easy to extend.
- **Proper Python package with `setup.py` / `pyproject.toml`.** Could be `pip install`ed. More formal. More overhead.
- **Notebook-only.** Single Jupyter notebook with everything. Lowest barrier to read, but harder to extend or refactor.

**Decision.** Flat repo with `src/` folder. Three thin entry-point modules (`build_index.py`, `visualise.py`, `analyse.py`) that import from two library modules (`pillars.py`, `composite.py`).

**Consequences.** Not pip-installable but easy to vendor into other projects. Anyone reading the repo can find the logic in two files. If this evolves into a real library, can be promoted to package structure later.

---

## Open ADRs (not yet resolved)

- **ADR-013: Pillar 4 (essentials/residual income).** Conceptually agreed as priority 2 but not implemented (data access). Will require Citizens Advice negative-budget share for UK and ALICE/SPM threshold for US.
- **ADR-014: Cross-country backtest.** Spain 2009, Iceland 2008, Korea 1997 are the obvious validation episodes. None implemented yet. Required before claiming the index generalises.
- **ADR-015: UK Pillar 2 replacement.** Replace the proxy with BoE base rate × debt-to-income. Resolves ADR-007 properly.
- **ADR-016: Weight robustness stress-test.** Per ADR-009, deferred until structural fixes land.

---

## What's missing from this list

Not every minor decision is here. The colour scheme, chart layouts, smoothing window choice (4 quarters), and rolling-window length for inflation persistence (12 quarters) are all "round number" decisions made by feel rather than by analysis. They're documented in code as named constants where it matters, and they're easy to change.

The big decisions — what variables, what structure, what weights, what to do about regime-specific inversion — are the ones in this document. If those are sound, the rest is calibration.
