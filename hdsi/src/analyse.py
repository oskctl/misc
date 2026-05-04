"""
Diagnostic analyses on the built indices.

Run with:
    python -m src.analyse

Eight analyses, summarised in a single output:
    1. Cross-country synchronisation (composite + per-pillar)
    2. Lead-lag relationship
    3. Pillar-composite correlation by sub-period (detects regime breaks)
    4. Episode duration analysis
    5. Pillar dispersion: widest/narrowest fans
    6. Predictive value of fan width
    7. Current readings vs full history
    8. 8-quarter trend direction
"""
from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd
from scipy import stats


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "output"


def _print_header(title: str):
    print("=" * 70)
    print(title)
    print("=" * 70)


def analysis_1_synchronisation(us, uk):
    _print_header("ANALYSIS 1: How synchronised are the two countries?")
    common = us.join(uk, lsuffix="_us", rsuffix="_uk", how="inner")
    print(f"Common observations: {len(common)} "
          f"({common.index.min().date()} to {common.index.max().date()})")
    
    print(f"\nOverall composite correlation: "
          f"{common['composite_us'].corr(common['composite_uk']):.3f}")
    for p in ["p1", "p2", "p3"]:
        c = common[f"{p}_us"].corr(common[f"{p}_uk"])
        print(f"  {p.upper()} correlation: {c:.3f}")


def analysis_2_lead_lag(us, uk):
    _print_header("ANALYSIS 2: Lead-lag — does either country front-run the other?")
    common = us.join(uk, lsuffix="_us", rsuffix="_uk", how="inner")
    
    print("\nCross-correlation US composite vs UK composite at various lags:")
    print("  (positive lag = UK leads US, negative lag = US leads UK)")
    for lag in range(-4, 5):
        if lag == 0:
            c = common["composite_us"].corr(common["composite_uk"])
        elif lag > 0:
            c = common["composite_us"].corr(common["composite_uk"].shift(lag))
        else:
            c = common["composite_us"].shift(-lag).corr(common["composite_uk"])
        print(f"  lag {lag:+d}q: {c:+.3f}")


def analysis_3_pillar_regime(us, uk):
    _print_header("ANALYSIS 3: How predictive is each pillar of the composite over time?")
    
    def regress(df, start, end, label):
        sub = df.loc[start:end]
        if len(sub) < 4:
            return f"  {label}: insufficient data"
        c1 = stats.pearsonr(sub["p1"], sub["composite"])[0]
        c2 = stats.pearsonr(sub["p2"], sub["composite"])[0]
        c3 = stats.pearsonr(sub["p3"], sub["composite"])[0]
        print(f"  {label}: P1={c1:+.2f}, P2={c2:+.2f}, P3={c3:+.2f}")
    
    print("\nUS — pillar-composite correlation by period:")
    regress(us, "2006-01-01", "2010-12-31", "GFC era (2006-2010)   ")
    regress(us, "2011-01-01", "2019-12-31", "Recovery (2011-2019)  ")
    regress(us, "2020-01-01", "2025-12-31", "Inflation era (2020-25)")
    
    print("\nUK — pillar-composite correlation by period:")
    regress(uk, "2009-10-01", "2014-12-31", "Post-GFC (2009-2014)  ")
    regress(uk, "2015-01-01", "2019-12-31", "Pre-Covid (2015-2019) ")
    regress(uk, "2020-01-01", "2025-12-31", "Inflation era (2020-25)")


def analysis_4_episodes(us, uk):
    _print_header("ANALYSIS 4: How long does the composite stay above thresholds?")
    
    def find_episodes(series, threshold, label):
        above = series > threshold
        changes = above.astype(int).diff()
        starts = series.index[changes == 1].tolist()
        ends = series.index[changes == -1].tolist()
        if above.iloc[0]:
            starts.insert(0, series.index[0])
        if above.iloc[-1]:
            ends.append(series.index[-1])
        
        print(f"\n{label} — episodes with composite > {threshold}:")
        for s, e in zip(starts, ends):
            duration = round((e - s).days / 91.25)
            peak = series.loc[s:e].max()
            peak_date = series.loc[s:e].idxmax()
            print(f"  {s.date()} to {e.date()}: {duration}q, "
                  f"peak {peak:.1f} ({peak_date.date()})")
    
    find_episodes(us["composite"], 60, "US")
    find_episodes(uk["composite"], 60, "UK")
    find_episodes(us["composite"], 75, "US")
    find_episodes(uk["composite"], 75, "UK")


def analysis_5_dispersion(us, uk):
    _print_header("ANALYSIS 5: Pillar dispersion — narrow vs wide fans")
    for df, name in [(us, "US"), (uk, "UK")]:
        pillars = df[["p1", "p2", "p3"]].values
        df["fan_width"] = np.max(pillars, axis=1) - np.min(pillars, axis=1)
    
    print("\nUS — 5 WIDEST fans (most concentrated stress):")
    print(us.nlargest(5, "fan_width")[["composite", "p1", "p2", "p3", "fan_width"]].round(1))
    print("\nUS — 5 NARROWEST fans (most uniform stress):")
    print(us.nsmallest(5, "fan_width")[["composite", "p1", "p2", "p3", "fan_width"]].round(1))
    print("\nUK — 5 WIDEST fans:")
    print(uk.nlargest(5, "fan_width")[["composite", "p1", "p2", "p3", "fan_width"]].round(1))


def analysis_6_predictive_width(us, uk):
    _print_header("ANALYSIS 6: Does fan width predict subsequent composite movement?")
    for df, name in [(us, "US"), (uk, "UK")]:
        if "fan_width" not in df.columns:
            pillars = df[["p1", "p2", "p3"]].values
            df["fan_width"] = np.max(pillars, axis=1) - np.min(pillars, axis=1)
        df["composite_abs_change_4q"] = df["composite"].diff(4).abs()
        valid = df.dropna(subset=["fan_width", "composite_abs_change_4q"])
        c = stats.pearsonr(valid["fan_width"], valid["composite_abs_change_4q"])[0]
        print(f"\n{name}: corr(fan width, |Δ composite over next 4q|) = {c:+.3f}")


def analysis_7_current_reading(us, uk):
    _print_header("ANALYSIS 7: Where are we now relative to history?")
    for df, name in [(us, "US"), (uk, "UK")]:
        latest = df.iloc[-1]
        latest_date = df.index[-1].date()
        pct_c = (df["composite"] <= latest["composite"]).sum() / len(df) * 100
        pct_1 = (df["p1"] <= latest["p1"]).sum() / len(df) * 100
        pct_2 = (df["p2"] <= latest["p2"]).sum() / len(df) * 100
        pct_3 = (df["p3"] <= latest["p3"]).sum() / len(df) * 100
        
        print(f"\n{name} as of {latest_date}:")
        print(f"  Composite: {latest['composite']:.1f} (above {pct_c:.0f}% of history)")
        print(f"  Pillar 1:  {latest['p1']:.1f} (above {pct_1:.0f}% of history)")
        print(f"  Pillar 2:  {latest['p2']:.1f} (above {pct_2:.0f}% of history)")
        print(f"  Pillar 3:  {latest['p3']:.1f} (above {pct_3:.0f}% of history)")


def analysis_8_trajectory(us, uk):
    _print_header("ANALYSIS 8: Trajectory direction over last 8 quarters")
    for df, name in [(us, "US"), (uk, "UK")]:
        recent = df.tail(8)
        x = np.arange(len(recent))
        for col in ["composite", "p1", "p2", "p3"]:
            slope, _, r, p, _ = stats.linregress(x, recent[col].values)
            annual = slope * 4
            sig = "*" if p < 0.05 else " "
            print(f"  {name} {col:>9}: {annual:+6.1f}/yr (r={r:+.2f}) {sig}")
        print()


def main():
    us = pd.read_csv(OUTPUT / "us_composite.csv", parse_dates=["date"]).set_index("date")
    uk = pd.read_csv(OUTPUT / "uk_composite.csv", parse_dates=["date"]).set_index("date")
    
    analysis_1_synchronisation(us, uk)
    print()
    analysis_2_lead_lag(us, uk)
    print()
    analysis_3_pillar_regime(us, uk)
    print()
    analysis_4_episodes(us, uk)
    print()
    analysis_5_dispersion(us, uk)
    print()
    analysis_6_predictive_width(us, uk)
    print()
    analysis_7_current_reading(us, uk)
    print()
    analysis_8_trajectory(us, uk)


if __name__ == "__main__":
    main()
