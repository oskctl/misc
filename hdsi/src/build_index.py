"""
Entry point: load raw data, build pillars and composites for US and UK,
save results to output/.

Run with:
    python -m src.build_index
"""
from __future__ import annotations

from pathlib import Path
import pandas as pd

from src.pillars import build_pillar_1, build_pillar_2, build_pillar_3
from src.composite import build_composite


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUTPUT = ROOT / "output"


def load_csv(name: str, value_col: str | None = None) -> pd.Series | pd.DataFrame:
    """Load a single-series CSV with date index."""
    df = pd.read_csv(DATA / name, parse_dates=["date"]).set_index("date")
    if value_col:
        return df[value_col]
    return df


def build_us(use_credit_gap: bool = False) -> pd.DataFrame:
    """Construct US composite. Has all three pillars at A-quality."""
    debt_gdp = load_csv("us_debt_gdp.csv", "HDTGPDUSQ163N")
    tdsp = load_csv("us_tdsp.csv", "TDSP")
    cpi_monthly = load_csv("us_cpi.csv", "CPIAUCSL")
    
    cpi_q = cpi_monthly.resample("QS").mean()
    cpi_yoy = cpi_q.pct_change(4) * 100
    
    p1 = build_pillar_1(debt_gdp, use_credit_gap=use_credit_gap)
    p2 = build_pillar_2(dsr=tdsp)
    p3 = build_pillar_3(cpi_yoy)
    
    composite = build_composite(p1, p2, p3)
    composite["country"] = "US"
    return composite


def build_uk(use_credit_gap: bool = False) -> pd.DataFrame:
    """Construct UK composite. Pillar 2 uses a B-quality proxy (no published DSR)."""
    debt_gdp = load_csv("uk_debt_gdp.csv", "HDTGPDGBQ163N").interpolate("linear")
    cpi_yoy = load_csv("uk_cpi_yoy.csv", "CPALTT01GBQ659N")
    
    p1 = build_pillar_1(debt_gdp, use_credit_gap=use_credit_gap)
    p2 = build_pillar_2(debt_to_gdp=debt_gdp, cpi_yoy=cpi_yoy)
    p3 = build_pillar_3(cpi_yoy)
    
    composite = build_composite(p1, p2, p3)
    composite["country"] = "UK"
    return composite


def main(use_credit_gap: bool = False) -> None:
    OUTPUT.mkdir(exist_ok=True)
    
    us = build_us(use_credit_gap=use_credit_gap)
    uk = build_uk(use_credit_gap=use_credit_gap)
    
    suffix = "_v2" if use_credit_gap else ""
    us.to_csv(OUTPUT / f"us_composite{suffix}.csv")
    uk.to_csv(OUTPUT / f"uk_composite{suffix}.csv")
    
    print(f"US composite: {len(us)} obs, {us.index.min().date()} to {us.index.max().date()}")
    print(f"  Latest: composite={us['composite'].iloc[-1]:.1f}, "
          f"p1={us['p1'].iloc[-1]:.1f}, p2={us['p2'].iloc[-1]:.1f}, p3={us['p3'].iloc[-1]:.1f}")
    print(f"UK composite: {len(uk)} obs, {uk.index.min().date()} to {uk.index.max().date()}")
    print(f"  Latest: composite={uk['composite'].iloc[-1]:.1f}, "
          f"p1={uk['p1'].iloc[-1]:.1f}, p2={uk['p2'].iloc[-1]:.1f}, p3={uk['p3'].iloc[-1]:.1f}")
    print(f"\nSaved to {OUTPUT}/")


if __name__ == "__main__":
    import sys
    use_gap = "--credit-gap" in sys.argv
    main(use_credit_gap=use_gap)
