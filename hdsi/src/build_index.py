"""
Entry point: load raw data, build pillars and composites for US and UK,
save results to output/.

Run with:
    python -m src.build_index           # BIS credit-gap form (default)
    python -m src.build_index --level    # legacy debt-to-GDP level form
"""
from __future__ import annotations

import argparse
from pathlib import Path
import pandas as pd

from src.pillars import build_pillar_1, build_pillar_2, build_pillar_3, build_pillar_4
from src.composite import build_composite, build_composite_4


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUTPUT = ROOT / "output"


def load_csv(name: str, value_col: str | None = None) -> pd.Series | pd.DataFrame:
    """Load a single-series CSV with date index."""
    df = pd.read_csv(DATA / name, parse_dates=["date"]).set_index("date")
    if value_col:
        return df[value_col]
    return df


def build_us(use_credit_gap: bool = True, use_p4: bool = True) -> pd.DataFrame:
    """Construct US composite.

    With use_p4=True (default since v1.1), uses the 4-pillar form including
    essentials/residual-income stress (Pillar 4, SPM-derived). Composite
    weights are 20/35/25/20 — see ADR-019.

    With use_p4=False, falls back to the 3-pillar form (legacy 25/45/30).
    """
    debt_gdp = load_csv("us_debt_gdp.csv", "HDTGPDUSQ163N")
    tdsp = load_csv("us_tdsp.csv", "TDSP")
    cpi_monthly = load_csv("us_cpi.csv", "CPIAUCSL")

    cpi_q = cpi_monthly.resample("QS").mean()
    cpi_yoy = cpi_q.pct_change(4) * 100

    p1 = build_pillar_1(debt_gdp, use_credit_gap=use_credit_gap)
    p2 = build_pillar_2(dsr=tdsp)
    p3 = build_pillar_3(cpi_yoy)

    if use_p4:
        essentials = load_csv("us_essentials.csv", "spm_pct")
        p4 = build_pillar_4(essentials, target_index=p2.index)
        composite = build_composite_4(p1, p2, p3, p4)
    else:
        composite = build_composite(p1, p2, p3)
    composite["country"] = "US"
    return composite


def build_uk(use_credit_gap: bool = True, use_p4: bool = False) -> pd.DataFrame:
    """Construct UK composite. Pillar 2 uses a B-quality proxy (no published DSR).

    UK Pillar 4 is currently unavailable — only 3 Citizens Advice National
    Red Index data points are extractable (FY2019/20, 2023/24, 2024/25),
    below the minimum needed for country-historical standardisation. See
    ADR-019 and `data/_p4_methodology_note.md`. UK stays on the 3-pillar
    form until JRF MIS backfill data is acquired.

    The use_p4 parameter is reserved for when UK P4 becomes available.
    """
    if use_p4:
        raise NotImplementedError(
            "UK Pillar 4 is not yet available — see ADR-019 / "
            "data/_p4_methodology_note.md. Acquire JRF MIS 2009-2018 + "
            "fill CitA NRI gaps 2020/21-2022/23 first."
        )
    debt_gdp = load_csv("uk_debt_gdp.csv", "HDTGPDGBQ163N").interpolate("linear")
    cpi_yoy = load_csv("uk_cpi_yoy.csv", "CPALTT01GBQ659N")

    p1 = build_pillar_1(debt_gdp, use_credit_gap=use_credit_gap)
    p2 = build_pillar_2(debt_to_gdp=debt_gdp, cpi_yoy=cpi_yoy)
    p3 = build_pillar_3(cpi_yoy)

    composite = build_composite(p1, p2, p3)
    composite["country"] = "UK"
    return composite


def _format_latest(df: pd.DataFrame) -> str:
    parts = [f"composite={df['composite'].iloc[-1]:.1f}"]
    for col in ["p1", "p2", "p3", "p4"]:
        if col in df.columns:
            parts.append(f"{col}={df[col].iloc[-1]:.1f}")
    return ", ".join(parts)


def main(use_credit_gap: bool = True, us_use_p4: bool = True) -> None:
    OUTPUT.mkdir(exist_ok=True)

    us = build_us(use_credit_gap=use_credit_gap, use_p4=us_use_p4)
    uk = build_uk(use_credit_gap=use_credit_gap)

    suffix = "" if use_credit_gap else "_level"
    us.to_csv(OUTPUT / f"us_composite{suffix}.csv")
    uk.to_csv(OUTPUT / f"uk_composite{suffix}.csv")

    form = "credit-gap" if use_credit_gap else "level (legacy)"
    us_pillar_count = "4-pillar (incl. essentials)" if us_use_p4 else "3-pillar (legacy)"
    print(f"Pillar 1 form: {form}")
    print(f"US: {us_pillar_count}")
    print(f"US composite: {len(us)} obs, {us.index.min().date()} to {us.index.max().date()}")
    print(f"  Latest: {_format_latest(us)}")
    print(f"UK composite: {len(uk)} obs, {uk.index.min().date()} to {uk.index.max().date()} "
          f"(3-pillar; UK P4 deferred — see ADR-019)")
    print(f"  Latest: {_format_latest(uk)}")
    print(f"\nSaved to {OUTPUT}/")


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m src.build_index",
        description="Build the HDSI composite for US and UK.",
    )
    parser.add_argument(
        "--level",
        action="store_true",
        help="Use legacy debt-to-GDP level form for Pillar 1 instead of the "
             "BIS credit gap (default). Writes *_level.csv outputs. The level "
             "form inverts in inflation regimes — kept available for "
             "reproducibility against the original POC. See ADR-011 / ADR-017.",
    )
    parser.add_argument(
        "--no-p4",
        action="store_true",
        help="Build US composite with the legacy 3-pillar form (no essentials "
             "pillar). UK is always 3-pillar in v1.1 — P4 data acquisition is "
             "blocked. See ADR-019.",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    args = _parse_args()
    main(use_credit_gap=not args.level, us_use_p4=not args.no_p4)
