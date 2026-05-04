"""
Pillar construction for the HDSI.

Each pillar produces a 0-100 stress score per quarter:
    P1: Stock burden (debt levels)
    P2: Flow burden (debt service ratio)
    P3: Inflation-lag stress (real income drag)

All pillars are normalised against the country's own history via z-score
then mapped to 0-100 via logistic transform. 50 = country's historical median.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def z_to_logistic(z: pd.Series, k: float = 1.0) -> pd.Series:
    """Map z-score to 0-100. z=0 -> 50, z=2 -> ~88, z=-2 -> ~12."""
    return 100 / (1 + np.exp(-k * z))


def standardise(series: pd.Series) -> pd.Series:
    """Z-score against series' own non-null history, then logistic to 0-100."""
    s = series.dropna()
    if len(s) < 4:
        return pd.Series(50.0, index=series.index)
    mean, std = s.mean(), s.std()
    if std == 0 or pd.isna(std):
        return pd.Series(50.0, index=series.index)
    z = (series - mean) / std
    return z_to_logistic(z)


def hp_filter(series: pd.Series, lam: float = 1600) -> pd.Series:
    """Hodrick-Prescott filter. lam=1600 is BIS standard for quarterly data.
    
    Returns the trend component. The "credit gap" is series - trend.
    """
    s = series.dropna()
    n = len(s)
    if n < 4:
        return pd.Series(np.nan, index=series.index)
    K = np.zeros((n - 2, n))
    for i in range(n - 2):
        K[i, i] = 1
        K[i, i + 1] = -2
        K[i, i + 2] = 1
    A = np.eye(n) + lam * K.T @ K
    trend = np.linalg.solve(A, s.values)
    out = pd.Series(np.nan, index=series.index, dtype=float)
    out.loc[s.index] = trend
    return out


def build_pillar_1(
    debt_to_gdp: pd.Series,
    use_credit_gap: bool = False,
) -> pd.DataFrame:
    """Pillar 1: Stock burden.
    
    Two components:
        - debt level (or BIS-style credit gap if use_credit_gap=True)
        - 5-year change in debt-to-GDP
    
    The debt level inverts in inflation regimes (nominal GDP outpaces nominal
    debt, ratio falls, but real debt service rises). Setting use_credit_gap=True
    swaps in the deviation from the HP-filtered trend, which is structurally
    more robust across regimes. See docs/methodology.md for the diagnostic.
    """
    df = pd.DataFrame(index=debt_to_gdp.index)
    
    if use_credit_gap:
        trend = hp_filter(debt_to_gdp)
        primary = debt_to_gdp - trend
    else:
        primary = debt_to_gdp
    
    change_5y = debt_to_gdp.pct_change(20) * 100
    
    df["primary_score"] = standardise(primary)
    df["change_score"] = standardise(change_5y)
    df["p1"] = df[["primary_score", "change_score"]].mean(axis=1)
    return df


def build_pillar_2(
    dsr: pd.Series | None = None,
    debt_to_gdp: pd.Series | None = None,
    cpi_yoy: pd.Series | None = None,
    cpi_lag: int = 2,
) -> pd.DataFrame:
    """Pillar 2: Flow burden.
    
    Preferred: pass dsr (a directly measured debt service ratio).
    Fallback proxy: pass debt_to_gdp + cpi_yoy. The proxy is over-responsive
    to CPI normalisation and should be flagged as B-grade data quality.
    """
    if dsr is not None:
        trend = dsr.rolling(40, min_periods=10).mean()
        deviation = dsr - trend
        df = pd.DataFrame(index=dsr.index)
        df["dsr_score"] = standardise(dsr)
        df["dsr_dev_score"] = standardise(deviation)
        df["p2"] = df[["dsr_score", "dsr_dev_score"]].mean(axis=1)
        df.attrs["data_quality"] = "A"
        return df
    
    if debt_to_gdp is None or cpi_yoy is None:
        raise ValueError("Pillar 2 requires either dsr or (debt_to_gdp, cpi_yoy)")
    
    cpi_aligned = cpi_yoy.reindex(debt_to_gdp.index, method="ffill").shift(cpi_lag)
    proxy = debt_to_gdp * cpi_aligned / 100
    df = pd.DataFrame(index=debt_to_gdp.index)
    df["dsr_proxy"] = proxy
    df["p2"] = standardise(proxy)
    df.attrs["data_quality"] = "B"
    return df


def build_pillar_3(
    cpi_yoy: pd.Series,
    target: float = 2.0,
    excess_window: int = 12,
) -> pd.DataFrame:
    """Pillar 3: Inflation-lag stress.
    
    Two components:
        - CPI YoY (current inflation pressure)
        - Cumulative excess CPI over rolling window (persistence of overshoot)
    """
    df = pd.DataFrame(index=cpi_yoy.index)
    df["cpi_score"] = standardise(cpi_yoy)
    
    excess = (cpi_yoy - target).rolling(excess_window, min_periods=4).sum()
    df["excess_cpi_score"] = standardise(excess)
    df["p3"] = df[["cpi_score", "excess_cpi_score"]].mean(axis=1)
    return df
