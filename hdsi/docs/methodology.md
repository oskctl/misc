# Methodology

## Conceptual frame

Household debt stress is not a single quantity. The 2008 GFC and the 2022-23 inflation episode produced similar levels of household pain through completely different mechanisms — debt over-accumulation in the first case, real-income drag in the second. An index that measures only one dimension will read both episodes wrong: a debt-to-GDP based measure will think 2022-23 was mild; a real-wage based measure will think 2008 was fine.

HDSI is structured around three pillars that capture independent stress channels. Each pillar can move in its own direction at its own speed; the composite score weights them together but the pillar decomposition preserves the *flavour* information.

## The three pillars

### Pillar 1: Stock burden (25% weight)

The level of household debt relative to economic capacity. Two components:
- BIS-style credit gap: debt-to-GDP minus its HP-filtered trend (default)
- 5-year change in debt-to-GDP (captures velocity of accumulation)

**Why the credit gap and not the level.** Using the debt-to-GDP level directly inverts in inflation regimes: when nominal GDP outpaces nominal debt during inflation, the ratio falls — but real debt service can simultaneously rise. Same number, opposite meaning depending on regime.

Diagnostic: correlation of the level form with P3 (the inflation pillar) by sub-period:

| Period | US | UK |
|---|---|---|
| GFC era (2006-2010) | +0.05 | −0.07 |
| Recovery (2011-2019) | +0.42 | −0.72 |
| Inflation era (2020-2025) | **−0.45** | **−0.87** |

The credit gap stabilises this correlation:

| Period | US gap | UK gap |
|---|---|---|
| GFC era | −0.27 | −0.42 |
| Recovery | −0.17 | −0.69 |
| Inflation era | −0.26 | −0.74 |

Range of correlations narrows from 0.50 (level) to 0.09 (gap) for the US, and from 0.80 to 0.32 for the UK. Still some regime sensitivity but no sign-flipping. See ADR-011 for the full diagnostic and ADR-017 for the decision to make the gap the default.

The legacy level form is preserved as opt-in: `python -m src.build_index --level` writes `*_composite_level.csv` outputs. Only useful for reproducing the original POC numbers.

### Pillar 2: Flow burden (45% weight)

Debt service as a share of disposable income. Two components:
- DSR level
- DSR deviation from 10-year trend (captures cycle vs structural)

**US**: uses Federal Reserve's TDSP (total household DSR). A-grade data.

**UK**: no published equivalent at quarterly frequency. Current proxy is `debt_to_gdp × cpi_yoy(t-2) / 100`. This is structurally over-responsive to CPI normalisation. Decomposition test on UK 2023-Q2 to 2025-Q2:
- Total proxy change: −4.97 points
- Contribution from CPI lag falling: −4.87 points (98%)
- Contribution from debt-to-GDP falling: −0.28 points (2%)

Almost the entire apparent UK improvement is the proxy responding to CPI mechanics, not to real debt service relief. A proper implementation would use Bank of England base rate × debt-to-income directly. The data quality grade for UK P2 is B.

### Pillar 3: Inflation-lag stress (30% weight)

The drag on real income from inflation outpacing wages. Two components:
- CPI YoY (current pressure)
- Cumulative excess CPI above 2% target over rolling 12-quarter window (persistence)

This pillar captures something that neither stock nor flow ratios pick up directly: the situation where formal debt is fine but every paycheck buys less. The 2022-23 episode was almost entirely a P3 story.

## Standardisation

Each pillar input is z-scored against the country's own historical distribution, then mapped to [0, 100] via logistic transform: `100 / (1 + exp(-z))`. This means:
- 50 = country's historical median for that pillar
- 75 ≈ 1 standard deviation above median
- 88 ≈ 2 standard deviations above median

Standardising against own history (not cross-country) means scores are comparable across countries even when underlying levels differ. The US has structurally higher household DSR than the UK, but a US DSR score of 80 and a UK DSR score of 80 both mean "this country is unusually stressed for its history."

## Composite construction

Weighted sum of the three pillars, plus a non-linear penalty when any pillar exceeds the 80th percentile (z > 0.84):

```
base = 0.25·P1 + 0.45·P2 + 0.30·P3
penalty = 0.5 × max(0, max(P1, P2, P3) − 80)
composite = clip(base + penalty, 0, 100)
```

The penalty reflects an empirical observation: household debt crises don't compensate across dimensions. A country with three moderately elevated pillars is in different territory from a country with one extreme pillar and two normal ones, even if the linear sum is similar. The penalty makes single-dimension extremes register more strongly than the linear combination would.

## Validation episodes

The POC is validated against two known stress episodes:

Numbers below are under the default (credit-gap) Pillar 1.

| Episode | Composite | P1 | P2 | P3 | Reading |
|---|---|---|---|---|---|
| US 2008-Q4 (Lehman) | 71.2 | 65 | 84 | 51 | Debt-led ✓ |
| UK 2023-Q2 (UK peak) | 79.2 | 29 | 95 | 73 | Flow + inflation combo ✓ |
| US 2025-Q1 (latest) | 52.8 | 37 | 55 | 63 | Mid-range, inflation-tilted |
| UK 2025-Q1 (latest) | 50.4 | 30 | 53 | 63 | Mid-range, inflation-tilted (but see ADR-010 caveat) |

The composite correctly identifies the historical episodes as stress events, and the pillar decomposition correctly identifies the dominant channel in each. These four readings are locked in `tests/test_snapshot.py`.

## Limitations

### What the index sees

- Formal household credit (mortgages, consumer debt, credit cards)
- Aggregate debt service ratios
- Macro price levels and CPI growth

### What the index does not see

- **Utility arrears** (UK 2025: ~£4.43B in energy arrears, record high)
- **Council tax arrears** (record highs reported by Local Government Association)
- **BNPL outstanding** (~10% of UK adults using, often unrecorded in formal credit data)
- **Informal lending** (definitionally invisible)
- **Distributional concentration** — index measures aggregates; a country could have stable aggregate scores while concentration of stress in lower deciles increases dramatically

### When this matters

In regimes where stress migrates to non-formal channels (UK 2024-25 being the worked example), the headline composite under-reads actual stress. The index reading goes down because the dimensions it can measure are improving, while the dimensions it cannot measure are filling up.

The methodological response is to add a fourth pillar capturing essentials arrears or residual-income negative-budget share (Citizens Advice publishes the latter for UK; ALICE/SPM provides analogues for the US). Not implemented in v0 due to data access constraints.

## What would change next

The structural P1 fix and a snapshot-test harness landed in v1. Remaining priorities, in order:

1. **Add Pillar 4: essentials/residual income.** Substantive fix for the migration blind spot. Citizens Advice (UK negative-budget share) and ALICE/SPM (US) are the data routes.
2. **Replace UK P2 proxy with BoE base rate × debt-to-income.** Removes the measurement artefact documented in ADR-010.
3. **Backtest against Spain 2009 / Iceland 2008 / Korea 1997.** Test generalisation to non-Anglo crises.
4. **Stress-test weight robustness.** Perturb the 25/45/30 weights by ±5 points each. If small perturbations produce large composite changes, weights are overfit.
5. **Distributional fan from household micro data.** Replace pillar-dispersion proxy with empirical quantiles from SCF (US) and WAS (UK).

## Citation

If you use this index in published work, cite the underlying data sources directly:

- Federal Reserve household DSR series: Board of Governors of the Federal Reserve System (US)
- IMF debt-to-GDP series: International Monetary Fund, Financial Soundness Indicators
- BLS CPI: U.S. Bureau of Labor Statistics
- OECD UK CPI: Organization for Economic Co-operation and Development, Main Economic Indicators

The methodology and code are MIT-licensed.
