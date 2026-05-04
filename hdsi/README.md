# Household Debt Stress Index (HDSI)

A proof-of-concept aggregate index measuring household debt stress across countries, designed to capture the *flavour* of stress (debt-led vs inflation-led) not just the magnitude.

## Why this exists

Standard household debt indicators measure single dimensions in isolation: debt-to-GDP for stock burden, debt service ratio for flow burden, real wages for income drag. Each of these can be misleading on its own. The 2022-23 UK episode is the case in point — debt-to-GDP fell to multi-year lows while utility arrears hit record highs and County Court claims rose double-digits. The headline ratio was flattering; the underlying stress was real.

HDSI combines three dimensions into a single 0-100 score, normalised against each country's own history, with a fan visualisation showing how concentrated stress is across dimensions. A wide fan with a high mean means stress is concentrated in one channel (e.g. inflation drag while debt is fine); a narrow fan means uniform stress across all channels (e.g. 2008-style crisis).

## What it shows

The four primary visualisations cover (1) per-country fan over time, (2) pillar decomposition showing which dimension drives each episode, (3) cross-country comparison, and (4) a 2D quadrant separating debt-driven from inflation-driven stress. The 2008 GFC and 2022-23 inflation episode appear as fundamentally different signatures despite producing similar composite peaks.

US 2008 reading: composite 70.5, with stock and flow pillars at 65+, inflation at 51, and the new essentials pillar at 67. UK 2023 peak reading: composite 79.2, with flow pillar at 95 and inflation pillar at 73 but stock pillar at 29. Same range, different stories.

## Methodology

Up to four pillars at the country-aggregate level. The 4-pillar form is the v1.1 default for the US; UK runs on the legacy 3-pillar form until UK essentials data is acquired (see ADR-019).

- **Pillar 1 (25% / 20%): Stock burden** — BIS-style credit gap (debt-to-GDP minus HP-filtered trend) and its 5-year change
- **Pillar 2 (45% / 35%): Flow burden** — debt service ratio and deviation from 10-year trend
- **Pillar 3 (30% / 25%): Inflation-lag stress** — CPI YoY and cumulative excess CPI above target
- **Pillar 4 (— / 20%): Essentials / residual income** — share of households unable to cover essential outgoings (US: SPM)

Each pillar is z-scored against country's own history then mapped to 0-100 via logistic transform, so 50 is the country's historical median. Composite is the weighted sum plus a non-linear penalty when any pillar exceeds the 80th percentile (reflects that household crises don't compensate across dimensions).

## Known limitations

This is a POC, not a production index. Three structural limitations remain in v1.1:

1. **UK Pillar 4 is deferred.** The UK index runs on the legacy 3-pillar form. Citizens Advice National Red Index back-calculates only to FY2019/20, giving 3 usable observations — below the standardisation minimum. Closing this gap requires Joseph Rowntree Foundation Minimum Income Standard 2009-2018 backfill spliced to CitA. See ADR-019b and `data/_p4_methodology_note.md`.

2. **UK Pillar 2 is a proxy.** The UK doesn't publish a household DSR equivalent at quarterly frequency. The current proxy (debt-to-GDP × lagged CPI) is over-responsive to CPI normalisation — about 98% of the apparent recovery in 2024-25 comes from CPI mechanics, not from real debt service relief. A proper implementation would use Bank of England base rate × debt-to-income.

3. **US 2006-2008 essentials use a flat backfill.** The Census SPM series begins in 2009; pre-2009 quarters are back-filled with the 2009 value as a conservative imputation that preserves the 2008-Q4 Lehman validation episode. Replacing this with the Columbia CPSP "anchored SPM" back-cast is documented as ADR-020.

A fourth structural issue — Pillar 1 (debt-to-GDP level) inverting in inflation regimes — was resolved in v1 by switching the default to the BIS credit gap. The legacy level form is still available via `python -m src.build_index --level` for reproducing the original POC numbers. See ADR-011 and ADR-017.

## Coverage

US 2006-Q1 to 2025-Q2. UK 2009-Q4 to 2025-Q1. Period chosen because the FRED-published primary series only go back to 2005, and we wanted to cover both the 2008 GFC (debt-led validation episode) and the 2022-23 inflation episode (inflation-led validation episode).

## Running it

```bash
pip install -r requirements.txt
python -m src.build_index             # default: credit-gap P1, US 4-pillar, UK 3-pillar
python -m src.build_index --no-p4     # US 3-pillar (reproduces v1)
python -m src.build_index --level     # legacy P1 (writes *_level.csv)
python -m src.build_index --level --no-p4   # original POC byte-for-byte
python -m src.visualise               # five chart PNGs
python -m src.analyse                 # eight diagnostic analyses
python -m unittest tests.test_snapshot   # locks reference numbers across all three configurations
```

Charts and CSVs land in `output/`. Raw data is in `data/`.

## Repository layout

```
.
├── README.md                  # this file
├── requirements.txt           # pandas, numpy, matplotlib, scipy
├── data/                      # raw FRED time series + Pillar 4 sources
│   ├── us_debt_gdp.csv
│   ├── us_tdsp.csv
│   ├── us_cdsp.csv
│   ├── us_cpi.csv
│   ├── uk_debt_gdp.csv
│   ├── uk_cpi_yoy.csv
│   ├── us_essentials.csv      # Census SPM (Pillar 4 source)
│   ├── uk_essentials.csv      # CitA NRI partial — UK P4 deferred to v1.2
│   ├── _p4_sources_raw.md     # data-acquisition research notes
│   └── _p4_methodology_note.md   # P4 source methodology, conversions, caveats
├── src/
│   ├── __init__.py
│   ├── pillars.py             # pillar construction
│   ├── composite.py           # weighted composite + penalty
│   ├── build_index.py         # entry point: builds and saves indices
│   ├── visualise.py           # entry point: produces all charts
│   └── analyse.py             # diagnostic analyses
├── tests/
│   └── test_snapshot.py       # locks the four reference numbers
├── output/                    # generated charts and final CSVs
└── docs/
    ├── methodology.md         # full methodology including limitations
    ├── decisions.md           # ADR-style record of design decisions
    ├── conversation.md        # verbatim conversation that produced this work
    └── CLAUDE.md              # note to future Claude assistants working on this
```

## Data sources

| Series | Description | Source |
|---|---|---|
| HDTGPDUSQ163N | US household debt-to-GDP | IMF (via FRED) |
| TDSP | US household debt service ratio | Federal Reserve |
| CDSP | US consumer (unsecured) DSR | Federal Reserve |
| CPIAUCSL | US CPI all urban consumers | BLS (via FRED) |
| HDTGPDGBQ163N | UK household debt-to-GDP | IMF (via FRED) |
| CPALTT01GBQ659N | UK CPI YoY | OECD (via FRED) |
| SPM (P60 series) | US essentials / residual income | Census Bureau |
| Citizens Advice National Red Index | UK essentials (deferred — see ADR-019b) | Citizens Advice |
| JRF Minimum Income Standard | UK pre-2019 backfill (deferred) | Joseph Rowntree Foundation |

All data was retrieved from FRED via web scraping in 2026. Refresh strategy: re-fetch via FRED API if you have a key; the CSVs in `data/` are the snapshots used for the POC.

## Status

This is v1.1: the v1 POC + structural fixes, plus the US-side of Pillar 4 (essentials/residual income, SPM-based) and an expanded snapshot-test harness. Validated against two episodes (US 2008, US/UK 2022-23). Not validated against historical international episodes (Spain 2009, Iceland 2008, Korea 1997 are obvious next backtests). Not built for production — there's no error handling around missing data, no automated data refresh, no CI. The next major piece of work is closing out UK Pillar 4 (ADR-019b) — the placeholder is in place, just needs JRF MIS data acquisition.

## License

MIT for code. Underlying data has its own redistribution terms — IMF and OECD series are "Copyrighted: Citation Required"; Federal Reserve and BLS series are public domain. See individual source notes if redistributing.
