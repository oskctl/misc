# Pillar 4 source data — raw research notes

Research conducted 2026-05-04 for ADR-013 (Pillar 4: essentials / residual income). Sources gathered via WebSearch; direct WebFetch to the primary source PDFs/pages was returning HTTP 403 on this run, so values below are taken from search-result excerpts of the primary sources rather than from a clean parse of the source document. Every value is annotated with the URL where the underlying primary source lives — re-pull and audit before locking into the index.

---

## UK: Citizens Advice negative-budget share

Citizens Advice publishes two related quantities:

1. **Share of CitA debt clients in a negative budget** (operational / case-mix measure — known back to 2016, used in their internal reporting).
2. **National Red Index estimate** — a population-extrapolated estimate of how many people in England & Wales are in a negative budget. Constructed by combining CitA debt-client expenditure data with ONS Living Costs and Food Survey (LCFS) income & expenditure data. Published 2023 (first National Red Index) and 2025 (second edition). Back-calculated for 2019/20, 2020/21, 2021/22, 2022/23 in the publications.

Definition of "negative budget": after expert advice, the household's monthly income is still insufficient to cover essential outgoings (food, rent/mortgage, energy, council tax, water, basic transport, basic communications). Discretionary spend is excluded — it's a structural deficit, not a lifestyle deficit.

| Year (financial year) | Value | Type | Source URL | Access date | Methodology note |
|---|---|---|---|---|---|
| 2016 | 32% | Share of CitA debt clients in neg budget | https://www.citizensadvice.org.uk/policy/publications/negative-budgets-data/ | 2026-05-04 | Operational measure on CitA caseload, not nationally representative |
| 2019 | <30% | Share of CitA debt clients in neg budget | https://www.citizensadvice.org.uk/policy/publications/negative-budgets-data/ | 2026-05-04 | Operational, pre-Covid baseline |
| 2019/20 | ~3.25M people (≈5.5% of E&W pop) | National Red Index estimate | https://www.citizensadvice.org.uk/policy/publications/the-national-red-index-2025-negative-budget-households-face-a-debt-crisis/ | 2026-05-04 | Population estimate, back-calculated. Press release: "number of people in the red has jumped from 3.25 million since the start of 2020." |
| 2020/21 | ~3.25M people (start-of-period) → growing | National Red Index estimate | https://www.citizensadvice.org.uk/policy/publications/negative-budgets-data/ | 2026-05-04 | NRI methodology applied to 2020/21 LCFS + CitA data |
| 2021/22 | (gap — value not isolated in search snippet) | National Red Index estimate | https://www.citizensadvice.org.uk/policy/publications/negative-budgets-data/ | 2026-05-04 | NRI back-calculation exists but specific value not extracted in this round |
| 2022/23 | (gap — value not isolated in search snippet) | National Red Index estimate | https://www.citizensadvice.org.uk/policy/publications/the-national-red-index-how-to-turn-the-tide-on-falling-living-standards/ | 2026-05-04 | First NRI publication (2023) covered this period |
| 2023/24 | 5.0M people (≈8.4% of E&W pop, 1.5M children) | National Red Index estimate | https://www.citizensadvice.org.uk/about-us/media-centre/press-releases/politicians-burying-their-heads-in-the-sand-as-new-research-finds-millions-are-in-the-red/ | 2026-05-04 | "+54% since 2020-21." Half of CitA debt clients in negative budget in this year (operational measure: >50%, up from <30% in 2019). |
| 2024/25 | 4.0M people in E&W (≈6.7% of E&W pop), avg deficit £343/mo | National Red Index 2025 estimate | https://www.citizensadvice.org.uk/policy/publications/the-national-red-index-2025-negative-budget-households-face-a-debt-crisis/ | 2026-05-04 | 4M figure is for E&W only (population ~61.8M); excludes Scotland and NI. Methodology revised slightly between 2023 and 2025 NRI editions. |
| 2025/26 (forecast) | 4.58M people | NRI 2025 forward projection | https://www.citizensadvice.org.uk/about-us/media-centre/press-releases/four-million-people-in-the-red-and-half-a-million-more-on-the-cusp-of-crisis/ | 2026-05-04 | Forecast not historical. 320k were within £50 of negative budget in 2024/25; expected to rise to 580k in 2025/26. |

**Conversion to share of households for HDSI use.** The headcount figures above are people, not households. ONS reports 28.6M UK households in 2024 (≈25.5M in England & Wales, applying England-share of UK ~88%). Using person-based shares of E&W population (≈61.8M in 2024) gives the percentages shown. If we want a household-share series, we need to either (a) multiply by avg persons per negative-budget household — CitA reports households with on average 2 children-or-more in the deepest deficit cohort, suggesting ~3 persons/household, which would give 4M/3 ≈ 1.3M households ≈ 5.1% of E&W households for 2024/25, or (b) re-derive from CitA's own household-level files if they publish them. The 2025 NRI publication reportedly contains the underlying household-level table; that download is the right next step.

**Pre-2019 coverage.** CitA negative-budget data appears to start at 2016 as an operational measure, with the population-extrapolated National Red Index series first back-calculated to 2019/20. There is **no published Citizens Advice negative-budget series covering 2009–2015**. For the HDSI 2009 start point, this is a hard gap — would need either (a) a proxy series (e.g. StepChange or Money Advice Trust client deficit-budget shares, or DWP Households Below Average Income (HBAI) "below MIS" share from Joseph Rowntree Foundation's Minimum Income Standard work), or (b) accept that the UK P4 series only starts 2019 and back-flag earlier quarters as missing/imputed.

---

## US: ALICE / SPM

Two candidate series. SPM is the better match for HDSI's quarterly cadence and longer history; ALICE is conceptually closer to the "essentials" framing but only published biennially with some lag.

### Option A: Supplemental Poverty Measure (SPM) — primary recommendation

Annual, published by Census Bureau (with BLS thresholds). Definition: share of population (not households — Census also publishes household-level breakdowns) whose post-tax, post-transfer resources fall below an essentials threshold (food, clothing, shelter, utilities + a small "other" margin), where the threshold is anchored to the 33rd percentile of national consumer expenditure on those categories. Includes SNAP, housing subsidies, EITC; subtracts work-related expenses, child support paid, out-of-pocket medical. Substantively the same conceptual variable as Citizens Advice's "essential outgoings exceed income."

| Year | SPM rate (%) | Source URL | Access date | Methodology note |
|---|---|---|---|---|
| 2009 | 15.3 | https://aspe.hhs.gov/reports/supplemental-poverty-measure-brief-2009-2012-0 | 2026-05-04 | First year SPM was published. |
| 2010 | 16.0 | https://cps.ipums.org/cps/resources/spm/p60-241.pdf | 2026-05-04 | First major recession increase. |
| 2011 | 16.1 | https://www.census.gov/library/publications/2013/demo/p60-247.html | 2026-05-04 | 49.7M people. |
| 2012 | 16.0 | https://www.census.gov/library/publications/2013/demo/p60-247.html | 2026-05-04 | |
| 2013 | 15.5 | https://www.census.gov/library/publications/2014/demo/p60-251.html | 2026-05-04 | -0.5pp YoY. |
| 2014 | 15.3 | https://www.census.gov/content/dam/Census/library/publications/2015/demo/p60-254.pdf | 2026-05-04 | |
| 2015 | 14.3 | https://www.census.gov/library/publications/2016/demo/p60-258.html | 2026-05-04 | -1.0pp YoY. |
| 2016 | 14.0 | https://www.census.gov/library/publications/2017/demo/p60-261.html | 2026-05-04 | (Search result also mentions 14.5 — there was a corrected/revised release; lock final value when re-pulling.) |
| 2017 | 13.9 | https://www.census.gov/library/publications/2018/demo/p60-265.html | 2026-05-04 | Not statistically different from 2016. |
| 2018 | 12.8 | https://www.census.gov/library/publications/2019/demo/p60-268.html | 2026-05-04 | Originally reported 13.1, revised to 12.8 (tax-model processing error). Use revised figure. |
| 2019 | 11.7 | https://www.census.gov/library/publications/2020/demo/p60-272.html | 2026-05-04 | Lowest since series began. 11.8 also widely cited as the pre-pandemic baseline; 11.7 is the headline SPM for 2019. |
| 2020 | 9.1 | https://www.census.gov/library/publications/2021/demo/p60-275.html | 2026-05-04 | -2.6pp YoY — pandemic stimulus / EITC expansion / stimulus checks pushed SPM well below trend. |
| 2021 | 7.8 | https://www.census.gov/library/stories/2023/09/supplemental-poverty-measure.html | 2026-05-04 | Series-low. Expanded CTC (Child Tax Credit) drove much of the drop. |
| 2022 | 12.4 | https://www.census.gov/library/stories/2023/09/supplemental-poverty-measure.html | 2026-05-04 | +4.6pp YoY — expiration of expanded CTC, higher inflation. |
| 2023 | 12.9 | https://www.census.gov/library/stories/2024/09/supplemental-poverty-measure.html | 2026-05-04 | +0.5pp YoY. Above pre-pandemic 11.8. |
| 2024 | 12.9 | https://www.census.gov/library/publications/2025/demo/p60-287.html | 2026-05-04 | Statistically unchanged from 2023. |

For 2025 Q1: Census 2024 SPM (12.9%) released Sep 2025 is the most recent published value. 2025 annual SPM will not be published until ~Sep 2026. For HDSI's 2025 Q1 reading, use 2024 SPM as the carry-forward value with a flag.

**Coverage: 2009–2024 complete annual.** This is the cleanest available US series for the conceptual variable. **Pre-2009 data does not exist in the SPM framework** — but the Center on Poverty and Social Policy (Columbia) publishes a back-cast "anchored SPM" series that goes back to 1967 using consistent thresholds (https://povertycenter.columbia.edu/historical-spm-data). For the 2006–2008 portion of the HDSI window, the anchored-SPM series is the right backfill source. Was unable to extract specific 2006/2007/2008 values from search snippets in this session — the Columbia page returned 403 on direct fetch — but the dataset exists and is downloadable.

### Option B: ALICE (United Way) — secondary recommendation

Annual point-in-time data, published by United For ALICE roughly every 2 years (2018 update, 2020, 2022, 2024 update covering 2022 data, 2025 update covering 2023 data). Definition: share of households below the "ALICE Threshold," which is the household budget needed to afford a bare-bones survival budget (housing, child care, food, transportation, healthcare, smartphone, taxes) — calculated county-by-county using local cost data, then aggregated. ALICE Threshold is consistently higher than the federal poverty line.

| Year | Below-ALICE-Threshold share of US households (%) | Source URL | Access date | Methodology note |
|---|---|---|---|---|
| 2007 | (gap — series start) | https://www.unitedforalice.org/national-overview | 2026-05-04 | ALICE methodology developed by United Way NJ ~2010-2012, originally as a single-state pilot. National rollout came later. |
| 2010 | (gap — only state-level data found in this round; e.g. Washington 32%) | https://www.unitedforalice.org/national-overview | 2026-05-04 | National figure was not extracted in this round; available in the 2024 ALICE Update PDF. |
| 2014 | (gap — state data only in search snippets) | https://www.unitedforalice.org/Attachments/AllReports/2024-ALICE-Update-US-FINAL.pdf | 2026-05-04 | National figure exists in the 2024 Update appendix tables; not extracted here. |
| 2018 | ~40% (35M households "ALICE" + ~13% in poverty ≈ ~42% combined; older ALICE Overview cites ">40% earn below the household survival budget") | https://www.unitedforalice.org/Attachments/Consequences/Overview-UnitedForALICE-all-sections-01-2020.pdf | 2026-05-04 | Approximate — clean 2018 figure was not isolated. ALICE-only and poverty-included variants both circulate; need to standardise on one. |
| 2019 | 50.4M households below ALICE threshold (≈40%) | https://www.unitedforalice.org/national-overview | 2026-05-04 | Pre-pandemic baseline. |
| 2022 | 42% of US households below ALICE threshold (29% ALICE + 13% poverty) | https://www.unitedforalice.org/Attachments/AllReports/2024-ALICE-Update-US-FINAL.pdf | 2026-05-04 | "2024 ALICE Update" report published 2024 covering 2022 point-in-time data. |
| 2023 | 42% (29% ALICE + 13% poverty); 55.5M households | https://www.unitedforalice.org/national-overview | 2026-05-04 | "2025 Update" report published 2025 covering 2023 point-in-time data. |

**Coverage gap.** ALICE national time series is sparse (point-in-time updates every 2 years), and the consolidated national-level historical figures for 2010, 2012, 2014, 2016, 2018 were not isolated in this round. The 2024 and 2025 Update PDFs almost certainly contain the back-series in an appendix table — direct fetch of those PDFs returned 403 in this session but they would resolve the gap on a manual download.

---

## Coverage gaps and caveats

### UK
- **Hard gap 2009–2018.** Citizens Advice's National Red Index does not back-cast before 2019/20. The earliest CitA data point of any kind is the 2016 operational measure for debt clients (32%). For the HDSI 2009 start, options are:
  - **(a) Accept truncation:** UK P4 series starts 2019 Q1, NaN before that. Affects standardisation badly — country-own-history z-scoring needs ≥10 years of data ideally; six years (2019–2025) is thin.
  - **(b) Proxy backfill:** Use Joseph Rowntree Foundation MIS (Minimum Income Standard) shortfall share, or DWP Households Below Average Income (HBAI) below-60%-of-median-after-housing-costs share. JRF's "below MIS" is published annually back to 2008/9 and is the closest conceptual analogue to negative budget. This is the recommended backfill — flag as B-grade with a methodology note. URL: https://www.jrf.org.uk/cost-of-living/a-minimum-income-standard-for-the-united-kingdom-2024 (and prior annual reports).
  - **(c) StepChange or Money Advice Trust client deficit-budget shares** also exist back to ~2010 but are operational not population — same caveat as the CitA 2016 figure.
- **Households vs persons.** CitA reports headcounts of people; HDSI's other UK pillars are household/macro-level. Will need a person→household conversion factor (currently estimated ~3 persons per negative-budget household based on CitA's child-presence data) or a re-pull of the household-level NRI tables if CitA publish them in the 2025 dashboard download.
- **E&W vs UK.** All NRI figures are England & Wales only. Adjusting to UK total requires either uplift assumption (Scotland and NI have similar or somewhat worse essentials stress per capita per Trussell Trust food-bank distribution data) or accepting E&W as the UK proxy.
- **Annual not quarterly.** Will need to interpolate to quarterly. Linear interpolation through annual data is fine for a slow-moving stock variable like negative-budget share. Caveat that the quarterly series will not show within-year shocks (e.g. winter fuel cap changes).

### US
- **SPM 2006–2008 backfill required.** SPM begins 2009. For HDSI's 2006 start point, use Columbia CPSP anchored-SPM back-cast. Direct values not extracted this round but the dataset is well-known and publicly downloadable. Flag the 2006-2008 portion as backfilled-from-anchored-SPM in the methodology doc.
- **2025 carry-forward.** Census 2024 SPM (12.9%) is the most recent published value. 2025 SPM publishes ~Sep 2026. For HDSI 2025 Q1 reading, carry forward 2024 with a flag.
- **2020-2021 anomaly.** SPM dropped to 7.8% in 2021 (expanded CTC + stimulus) then jumped to 12.4% in 2022. This is a *real* signal of essentials-stress relief and re-emergence, but it will register as a large pillar movement that's policy-driven not market-driven. Worth a methodology footnote noting that P4 will spike in policy-transition quarters.
- **Annual not quarterly.** Same interpolation comment as UK.

### Both countries
- **Definitional asymmetry.** SPM measures population poverty (resource-based); CitA negative-budget measures households unable to afford essentials after debt service. They are conceptually close but the SPM threshold is anchored to 33rd-percentile expenditure, while CitA's is a budget-line construction. Cross-country comparison of absolute levels is not meaningful (consistent with HDSI's existing ADR-003 country-own-history standardisation, so this isn't a problem — both series will be z-scored against own history before composite).
- **Direct fetch blocked in this session.** All values above are taken from search-result excerpts that quote the primary sources, not from a clean parse of the source documents themselves. Before locking these into the index, **re-fetch each row from the cited URL** to confirm the value and capture any recent revisions (especially 2016 SPM, which appears to have a published revision).

---

## Recommended primary source per country

- **US: Supplemental Poverty Measure (Census Bureau).** Annual coverage 2009–2024 is complete and consistently methodology'd. ALICE is conceptually closer to the "essentials" framing but published only biennially with sparse back-history at the national level — too gappy for a quarterly index. Use SPM as primary; cite ALICE in the methodology doc as a corroborating series and use it for sense-checks. Backfill 2006–2008 from Columbia CPSP anchored-SPM.

- **UK: Citizens Advice National Red Index from 2019/20 onward, JRF Minimum Income Standard "below MIS" share for 2009–2018 backfill.** The CitA NRI is the cleanest conceptual match (it explicitly measures the "income below essentials" definition we want for P4) but it only goes back to 2019/20. JRF MIS is published annually back to 2008 and is the closest substantive analogue for the pre-NRI period. Splice with a clearly documented join, flag the join quarter, and accept B-grade quality on the pre-2019 portion. Do not use the operational CitA "share of debt clients in negative budget" figure for population-wide stress — it's a caseload measure, not a population estimate.

The combined picture: US gets an A-grade, country-historically-standardised P4 covering 2009–2024 with a defensible backfill to 2006. UK gets a B-grade spliced series (JRF 2009-2018, CitA NRI 2019-2024), with an explicit methodology note about the splice. Both countries interpolated linearly to quarterly. Pillar 4 is implementable with this data; the limiting factor on UK quality is the absence of a pre-2019 CitA back-cast, not anything about the HDSI methodology.
