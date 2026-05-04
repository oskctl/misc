# Pillar 4 data — methodology note

Companion to `us_essentials.csv` and `uk_essentials.csv`. Documents source, conventions, splices, conversions, and data quality grades. Read alongside `_p4_sources_raw.md` (raw research notes — has the URL trail per row).

---

## Date convention

Annual values are stamped at the **start of the period they describe**, matching the `YYYY-MM-01` convention used by every other CSV in this directory (e.g. `us_cpi.csv`, `uk_debt_gdp.csv`).

- **US**: calendar year. SPM for 2019 → `2019-01-01`. Census publishes the value in September of the following year, but the value *describes* the calendar year, so it is stamped at the start of that year. Pillar code is expected to interpolate annual → quarterly forward.
- **UK**: financial year (April–March). FY2019/20 → `2019-04-01`. Citizens Advice National Red Index reports by financial year; stamping at FY start preserves the reporting cadence and keeps the value aligned with the underlying ONS LCFS reference period.

This is "valid from period start" — interpolation should treat each annual value as the realised average for its period and smooth between annual stamps.

---

## US: Supplemental Poverty Measure

**Source**: Census Bureau Supplemental Poverty Measure (Census P60 reports). Annual, 2009–2024 complete. **A-grade**.

**Coverage**: 2009–2024 (16 annual observations). All values taken from the Census P60 series cited per-row in `_p4_sources_raw.md`.

**2018 revision**: original release reported 13.1; revised to 12.8 after a tax-model processing error correction. Used revised value.

**2016 caveat**: search snippets cited both 14.0 and 14.5; locked at 14.0 as the headline value pending a primary-source re-pull. Worth re-verifying when next refreshing the data.

**Pre-2009 backfill**: not included. The raw notes recommended Columbia Center on Poverty and Social Policy "anchored SPM" series (https://povertycenter.columbia.edu/historical-spm-data) for 2006-2008. Direct WebFetch returned 403 in this session; the raw research notes were also unable to extract specific 2006/2007/2008 values. **Gap: 2006-2008 not in the CSV.** Pillar code consuming this series should either (a) accept that US P4 starts at 2009-01-01 and back-fill upstream by extending the earliest value, or (b) fetch Columbia anchored-SPM in a follow-up data refresh and prepend rows tagged `source=Columbia_anchored_SPM`.

**2025 carry-forward**: Census 2025 SPM publishes ~Sep 2026 (not yet available). The pillar code's existing forward-fill convention should carry the 2024 value to 2025-Q1; do not add a synthetic 2025-01-01 row to this CSV.

**2020-21 stimulus trough caveat** (real signal, not artefact): SPM dropped from 11.7 (2019) → 9.1 (2020) → 7.8 (2021) → bounced to 12.4 (2022). The 2020-21 trough is a real reduction in essentials-stress driven by pandemic stimulus + expanded Child Tax Credit; the 2022 rebound is the policy expiration. **Both moves are real.** When this series feeds the composite, P4 will register a large pillar movement during the 2020-2022 transition. Flag in any commentary that uses these years — this is a genuine policy-driven swing, not a measurement artefact.

**Source-confirmation status**: All 2009-2024 values are search-extracted from snippets that quote the primary Census P60 reports — direct WebFetch was blocked (403). The values are widely-reproduced and consistent across snippets, but a clean primary-source re-pull is recommended before locking the index.

---

## UK: spliced JRF MIS + CitA National Red Index

**Source**: Spliced — Joseph Rowntree Foundation Minimum Income Standard "below MIS" share for 2009-2018, Citizens Advice National Red Index for 2019/20 onwards. **B-grade.**

**Coverage in this CSV**: 3 observations only — `2019-04-01`, `2023-04-01`, `2024-04-01`. **Major gaps: 2009-2018 entirely absent; 2020/21, 2021/22, 2022/23 missing within the CitA period.**

### Why the JRF backfill is missing

The raw research notes flagged JRF MIS as the recommended pre-2019 backfill source but explicitly did not extract specific annual "below MIS" values. WebFetch on https://www.jrf.org.uk/cost-of-living/a-minimum-income-standard-for-the-united-kingdom-2024 returned 403 in this session. **Per the "don't fabricate values" constraint, no JRF values were imputed.** The 2009-2018 portion of the UK series is left as a gap. To close it: download the JRF MIS PDFs annually (2009 onward) and extract the headline "below MIS" share each year, then add rows with `source=JRF_MIS, data_quality=B`. Splice point would be at FY2018/19 → FY2019/20.

### Why the within-NRI gaps exist

The 2025 CitA National Red Index publication back-calculates 2020/21, 2021/22, 2022/23 — but the raw research notes did not isolate specific values for those years from search snippets. Closing this gap requires downloading the 2025 NRI dashboard / underlying tables from Citizens Advice. Direct WebFetch on the CitA URL returned 403 in this session.

### Person → household conversion (applied)

CitA NRI publishes person-counts ("X million people in negative-budget households in E&W"). HDSI's other UK pillars are household/macro-level. **Conversion applied: person_share × 0.8 = household_share.**

Derivation: avg household size in E&W population ≈ 2.4 persons. Avg household size in negative-budget households ≈ 3.0 persons (CitA reports "households with on average 2 children-or-more in the deepest deficit cohort" — implies ≥2 children + 1 adult ≈ 3 persons, before single-parent corrections). Conversion factor = 2.4 / 3.0 = 0.8.

| FY | CitA person-share of E&W pop | × 0.8 | Stored value |
|---|---|---|---|
| 2019/20 | 5.5% | 4.4% | 4.4 |
| 2023/24 | 8.4% | 6.7% | 6.7 |
| 2024/25 | 6.7% | 5.4% | 5.4 |

This is a defensible-but-rough conversion. Raw notes propose ~5.1% for 2024/25 via a slightly different path (4.0M people / 3 / 25.5M E&W households = 5.2%); the 0.8-multiplier path gives 5.4%. The discrepancy is rounding noise (≈0.3pp). Re-derive from CitA's own household-level table if/when it becomes accessible.

### England & Wales vs UK total

All NRI figures are E&W only (population ~61.8M; UK is ~67M). Stored values are not uplifted to UK total. Per Trussell Trust food-bank distribution, Scotland and NI essentials-stress is similar to or somewhat higher than E&W — uplift to UK would be small (≤0.3pp). Accepted as E&W-as-UK-proxy for B-grade tolerance.

### Splice handling

Currently no splice — only the CitA portion exists in the CSV. When JRF MIS values are added (next data refresh), the splice quarter will be FY2018/19 (last JRF point) → FY2019/20 (first CitA point). The two series measure different things (JRF MIS = below-MIS-budget income share; CitA NRI = negative-budget after essential outgoings) so a level-shift at the join is expected. Recommended approach: store both raw series in the CSV with `source` distinguishing them, and let the pillar code apply a join-quarter level-correction (e.g. anchor the JRF series to the CitA 2019/20 level and back-cast the JRF deltas).

### Source-confirmation status

All three CitA values are search-extracted from snippets quoting CitA NRI press releases and the 2025 NRI publication — direct WebFetch was blocked (403). Values are internally consistent across multiple snippets. Re-pull from Citizens Advice when the dashboard becomes accessible.

---

## Data quality grades

| Country | Grade | Rationale |
|---|---|---|
| US | A | Single consistent source (Census SPM), 16 years complete, well-documented methodology revisions captured. Only weakness is the 2006-2008 backfill gap, which is recoverable from a known dataset. |
| UK | B | Splice across two non-identically-defined sources (JRF MIS + CitA NRI), JRF portion not yet extracted, within-CitA gaps for 2020/21-2022/23, person→household conversion applied with a rough 0.8 factor, E&W used as UK proxy. Series is implementable but every choice should be flagged in any output that surfaces UK P4. |

The asymmetry in grade matches the existing UK Pillar 2 B-grade flag pattern documented in `docs/CLAUDE.md` — the UK side of HDSI is consistently more data-constrained than the US side.

---

## TODO before locking into the index

1. Refetch all values from primary URLs once 403-blocking lifts (Census P60s, Columbia CPSP, JRF MIS PDFs, CitA NRI 2025 dashboard).
2. Backfill US 2006-2008 from Columbia anchored-SPM.
3. Backfill UK 2009-2018 from JRF MIS annual reports.
4. Fill UK 2020/21, 2021/22, 2022/23 from CitA 2025 NRI underlying tables.
5. Re-verify US 2016 SPM (14.0 vs 14.5 ambiguity in snippets).
6. Re-derive UK person→household conversion if CitA publish a household-level table.
