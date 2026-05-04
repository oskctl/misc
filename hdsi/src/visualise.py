"""
Visualisation entry point. Produces five charts:
    1. country_fans.png — per-country composite + pillar range
    2. pillar_decomposition.png — small multiples per pillar
    3. cross_country.png — both composites overlaid
    4. stress_flavour.png — 2D quadrant (debt-driven vs inflation-driven)
    5. overlaid_smoothed.png — both fans on one chart, 4q smoothed

Run with:
    python -m src.visualise
"""
from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "output"

COLOR_US = "#2c5e8b"
COLOR_UK = "#a83e3e"

PLOT_STYLE = {
    "figure.facecolor": "#fafaf7",
    "axes.facecolor": "#fafaf7",
    "savefig.facecolor": "#fafaf7",
    "axes.edgecolor": "#333",
    "axes.labelcolor": "#222",
    "xtick.color": "#444",
    "ytick.color": "#444",
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "axes.titlesize": 12,
    "axes.titleweight": "bold",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "grid.color": "#ddd",
    "grid.linewidth": 0.5,
}


def add_threshold_zones(ax, alpha_scale: float = 1.0):
    """Add the green/yellow/orange/red threshold zones as horizontal bands."""
    ax.axhspan(0, 30, color="#cde7c9", alpha=0.25 * alpha_scale, zorder=0)
    ax.axhspan(30, 50, color="#e6e8b8", alpha=0.25 * alpha_scale, zorder=0)
    ax.axhspan(50, 75, color="#f0c9a4", alpha=0.30 * alpha_scale, zorder=0)
    ax.axhspan(75, 100, color="#e08c8c", alpha=0.35 * alpha_scale, zorder=0)


def add_zone_labels(ax):
    """Right-edge annotations for the threshold zones."""
    xmax = ax.get_xlim()[1]
    for y, label in [(15, "Low"), (40, "Normal"), (62, "Elevated"), (87, "Vulnerable")]:
        ax.text(xmax, y, label, ha="right", va="center", fontsize=9, alpha=0.6)


def plot_country_fan(ax, df, label, color, show_legend=True):
    add_threshold_zones(ax)
    pillars = df[["p1", "p2", "p3"]].values
    p_min, p_max = np.min(pillars, axis=1), np.max(pillars, axis=1)
    
    ax.fill_between(
        df.index, p_min, p_max,
        color=color, alpha=0.20, zorder=2,
        label="Pillar range" if show_legend else None,
    )
    ax.plot(
        df.index, df["composite"], color=color, lw=2.5, zorder=4,
        label=f"{label} composite" if show_legend else None,
    )
    
    ax.set_ylim(0, 100)
    ax.set_ylabel("Stress score (0–100)")
    ax.grid(axis="y", alpha=0.4)
    ax.set_title(f"{label} — Household Debt Stress Index", loc="left", pad=12)
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))


def chart_country_fans(us, uk):
    fig, axes = plt.subplots(2, 1, figsize=(12, 9))
    plot_country_fan(axes[0], us, "United States", COLOR_US)
    plot_country_fan(axes[1], uk, "United Kingdom", COLOR_UK)
    
    axes[0].axvline(pd.Timestamp("2008-09-15"), color="#444", ls="--", lw=0.8, alpha=0.6)
    axes[0].text(pd.Timestamp("2008-09-15"), 95, " Lehman", fontsize=8, va="top", alpha=0.8)
    axes[0].axvline(pd.Timestamp("2022-06-01"), color="#444", ls="--", lw=0.8, alpha=0.6)
    axes[0].text(pd.Timestamp("2022-06-01"), 95, " Inflation peak", fontsize=8, va="top", alpha=0.8)
    
    axes[1].axvline(pd.Timestamp("2022-09-23"), color="#444", ls="--", lw=0.8, alpha=0.6)
    axes[1].text(pd.Timestamp("2022-09-23"), 95, " Mini-budget /", fontsize=8, va="top", alpha=0.8)
    axes[1].text(pd.Timestamp("2022-09-23"), 90, " rate spike", fontsize=8, va="top", alpha=0.8)
    
    for ax in axes:
        add_zone_labels(ax)
        ax.legend(loc="upper right", framealpha=0.9, fontsize=9)
    
    fig.suptitle("Household Debt Stress Index — POC v1", fontsize=14, fontweight="bold", y=0.995)
    fig.text(
        0.5, 0.01,
        "Composite of three pillars (stock 25%, flow 45%, inflation-lag 30%). "
        "Shaded band shows range across pillars (proxy for distributional dispersion).",
        ha="center", fontsize=8.5, alpha=0.7,
    )
    plt.tight_layout(rect=[0, 0.03, 1, 0.97])
    plt.savefig(OUTPUT / "01_country_fans.png", dpi=140, bbox_inches="tight")
    plt.close()


def chart_pillar_decomposition(us, uk):
    fig, axes = plt.subplots(3, 2, figsize=(12, 10), sharex="col", sharey=True)
    titles = [
        "Pillar 1: Stock burden\n(debt levels)",
        "Pillar 2: Flow burden\n(debt service)",
        "Pillar 3: Inflation-lag\n(real income drag)",
    ]
    
    for i, (key, title) in enumerate(zip(["p1", "p2", "p3"], titles)):
        for j, (df, color, country_label) in enumerate([
            (us, COLOR_US, "United States"),
            (uk, COLOR_UK, "United Kingdom"),
        ]):
            ax = axes[i, j]
            ax.fill_between(df.index, 0, df[key], color=color, alpha=0.25)
            ax.plot(df.index, df[key], color=color, lw=1.8)
            ax.axhline(50, color="#888", ls=":", lw=0.8, alpha=0.7)
            ax.axhline(75, color="#c74", ls=":", lw=0.8, alpha=0.7)
            ax.set_ylim(0, 100)
            if i == 0:
                ax.set_title(country_label, fontweight="bold", loc="left", color=color)
            if j == 0:
                ax.set_ylabel(title, fontsize=9)
            ax.grid(axis="y", alpha=0.3)
    
    for ax in axes[2]:
        ax.xaxis.set_major_locator(mdates.YearLocator(2))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    
    fig.suptitle(
        "Pillar Decomposition — different stress signatures by episode",
        fontsize=13, fontweight="bold", y=0.995,
    )
    fig.text(
        0.5, 0.005,
        "Dotted lines: 50 = country-historical median, 75 = vulnerability threshold. "
        "2008 stress was stock+flow; 2022-23 stress is inflation-led.",
        ha="center", fontsize=8.5, alpha=0.7,
    )
    plt.tight_layout(rect=[0, 0.02, 1, 0.97])
    plt.savefig(OUTPUT / "02_pillar_decomposition.png", dpi=140, bbox_inches="tight")
    plt.close()


def chart_cross_country(us, uk):
    fig, ax = plt.subplots(figsize=(11, 6))
    add_threshold_zones(ax)
    
    ax.plot(us.index, us["composite"], color=COLOR_US, lw=2.5, label="United States", zorder=4)
    ax.plot(uk.index, uk["composite"], color=COLOR_UK, lw=2.5, label="United Kingdom", zorder=4)
    
    for ts, label in [
        ("2008-09-15", "Lehman"),
        ("2020-03-01", "Covid"),
        ("2022-09-23", "UK rate spike"),
    ]:
        ax.axvline(pd.Timestamp(ts), color="#444", ls="--", lw=0.8, alpha=0.5)
        ax.text(pd.Timestamp(ts), 95, " " + label, fontsize=8.5, va="top", alpha=0.7)
    
    ax.set_ylim(0, 100)
    ax.set_ylabel("Composite stress score (0–100)")
    ax.set_title("Household Debt Stress: US vs UK (2009–2025)", loc="left", pad=10)
    ax.grid(axis="y", alpha=0.4)
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax.legend(loc="upper left", framealpha=0.9)
    add_zone_labels(ax)
    
    plt.tight_layout()
    plt.savefig(OUTPUT / "03_cross_country.png", dpi=140, bbox_inches="tight")
    plt.close()


def chart_stress_flavour(us, uk):
    fig, ax = plt.subplots(figsize=(10, 8))
    
    us = us.copy()
    uk = uk.copy()
    us["debt_stress"] = (us["p1"] + us["p2"]) / 2
    uk["debt_stress"] = (uk["p1"] + uk["p2"]) / 2
    
    ax.plot(us["debt_stress"], us["p3"], color=COLOR_US, alpha=0.3, lw=1)
    ax.plot(uk["debt_stress"], uk["p3"], color=COLOR_UK, alpha=0.3, lw=1)
    
    us_episodes = {
        "2007-Q4 (pre-GFC)": us.loc["2007-10-01"] if "2007-10-01" in us.index.astype(str) else None,
        "2009-Q1 (GFC peak)": us.loc["2009-01-01"] if "2009-01-01" in us.index.astype(str) else None,
        "2015 (recovery)": us.loc["2015-01-01"] if "2015-01-01" in us.index.astype(str) else None,
        "2022-Q3 (inflation)": us.loc["2022-07-01"] if "2022-07-01" in us.index.astype(str) else None,
        "2025-Q1 (now)": us.loc["2025-01-01"] if "2025-01-01" in us.index.astype(str) else None,
    }
    uk_episodes = {
        "2010 (post-GFC)": uk.loc["2010-04-01"] if "2010-04-01" in uk.index.astype(str) else None,
        "2016-Q1": uk.loc["2016-01-01"] if "2016-01-01" in uk.index.astype(str) else None,
        "2022-Q4 (inflation+rates)": uk.loc["2022-10-01"] if "2022-10-01" in uk.index.astype(str) else None,
        "2025-Q1 (now)": uk.loc["2025-01-01"] if "2025-01-01" in uk.index.astype(str) else None,
    }
    
    for label, row in us_episodes.items():
        if row is None:
            continue
        ax.scatter(row["debt_stress"], row["p3"], s=80, color=COLOR_US, edgecolor="white", lw=1.5, zorder=5)
        ax.annotate(f"US {label}", (row["debt_stress"], row["p3"]),
                    xytext=(7, 5), textcoords="offset points", fontsize=8, color=COLOR_US)
    for label, row in uk_episodes.items():
        if row is None:
            continue
        ax.scatter(row["debt_stress"], row["p3"], s=80, color=COLOR_UK, edgecolor="white", lw=1.5, zorder=5)
        ax.annotate(f"UK {label}", (row["debt_stress"], row["p3"]),
                    xytext=(7, 5), textcoords="offset points", fontsize=8, color=COLOR_UK)
    
    ax.axhline(50, color="#888", ls=":", lw=1, alpha=0.7)
    ax.axvline(50, color="#888", ls=":", lw=1, alpha=0.7)
    
    ax.text(15, 92, "Inflation-led stress\n(2022-23)", ha="center", va="top", fontsize=9, alpha=0.6, style="italic")
    ax.text(85, 92, "Both — crisis territory", ha="center", va="top", fontsize=9, alpha=0.6, style="italic")
    ax.text(15, 8, "Calm", ha="center", va="bottom", fontsize=9, alpha=0.6, style="italic")
    ax.text(85, 8, "Debt-led stress\n(2008 GFC)", ha="center", va="bottom", fontsize=9, alpha=0.6, style="italic")
    
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_xlabel("Debt-driven stress (Pillar 1 + Pillar 2 avg)")
    ax.set_ylabel("Inflation-lag stress (Pillar 3)")
    ax.set_title("Stress signatures: 2008 vs 2022-23 are different crises", loc="left", pad=10)
    ax.grid(alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT / "04_stress_flavour.png", dpi=140, bbox_inches="tight")
    plt.close()


def chart_overlaid_smoothed(us, uk, window: int = 4):
    us, uk = us.copy(), uk.copy()
    for df in [us, uk]:
        pillars = df[["p1", "p2", "p3"]].values
        df["p_min_raw"] = np.min(pillars, axis=1)
        df["p_max_raw"] = np.max(pillars, axis=1)
        df["p_min"] = df["p_min_raw"].rolling(window, min_periods=2, center=True).mean()
        df["p_max"] = df["p_max_raw"].rolling(window, min_periods=2, center=True).mean()
        df["composite_smooth"] = df["composite"].rolling(window, min_periods=2, center=True).mean()
    
    fig, ax = plt.subplots(figsize=(13, 7))
    add_threshold_zones(ax, alpha_scale=0.7)
    
    ax.fill_between(uk.index, uk["p_min"], uk["p_max"], color=COLOR_UK, alpha=0.25,
                    zorder=2, label="UK — pillar range")
    ax.fill_between(us.index, us["p_min"], us["p_max"], color=COLOR_US, alpha=0.25,
                    zorder=2, label="US — pillar range")
    
    ax.plot(us.index, us["composite_smooth"], color=COLOR_US, lw=2.6,
            label="US — composite", zorder=5)
    ax.plot(uk.index, uk["composite_smooth"], color=COLOR_UK, lw=2.6,
            label="UK — composite", zorder=5)
    
    ax.plot(us.index, us["composite"], color=COLOR_US, lw=0.8, alpha=0.25, zorder=3)
    ax.plot(uk.index, uk["composite"], color=COLOR_UK, lw=0.8, alpha=0.25, zorder=3)
    
    for ts, label in [
        ("2008-09-15", "Lehman"),
        ("2020-03-01", "Covid"),
        ("2022-09-23", "UK rate spike"),
    ]:
        ax.axvline(pd.Timestamp(ts), color="#444", ls="--", lw=0.7, alpha=0.5, zorder=1)
        ax.text(pd.Timestamp(ts), 96, " " + label, fontsize=8.5, va="top", alpha=0.7)
    
    ax.set_ylim(0, 100)
    ax.set_xlim(pd.Timestamp("2005-10-01"), pd.Timestamp("2026-01-01"))
    ax.set_ylabel("Stress score (0–100, country-historical)")
    ax.set_title(f"Household Debt Stress — overlaid fans, US vs UK ({window}-quarter smoothed)",
                 loc="left", pad=10)
    ax.grid(axis="y", alpha=0.4)
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    add_zone_labels(ax)
    
    handles, labels = ax.get_legend_handles_labels()
    order = [
        labels.index("US — composite"), labels.index("UK — composite"),
        labels.index("US — pillar range"), labels.index("UK — pillar range"),
    ]
    ax.legend([handles[i] for i in order], [labels[i] for i in order],
              loc="upper left", framealpha=0.92, fontsize=9, ncol=2)
    
    fig.text(0.5, 0.01,
             f"Solid lines: {window}-quarter rolling mean of composite. "
             "Faint thin lines: raw quarterly. Bands: smoothed pillar range.",
             ha="center", fontsize=8.5, alpha=0.7)
    plt.tight_layout(rect=[0, 0.03, 1, 0.99])
    plt.savefig(OUTPUT / "05_overlaid_smoothed.png", dpi=140, bbox_inches="tight")
    plt.close()


def main(suffix: str = ""):
    plt.rcParams.update(PLOT_STYLE)
    OUTPUT.mkdir(exist_ok=True)
    
    us = pd.read_csv(OUTPUT / f"us_composite{suffix}.csv", parse_dates=["date"]).set_index("date")
    uk = pd.read_csv(OUTPUT / f"uk_composite{suffix}.csv", parse_dates=["date"]).set_index("date")
    
    chart_country_fans(us, uk)
    chart_pillar_decomposition(us, uk)
    chart_cross_country(us, uk)
    chart_stress_flavour(us, uk)
    chart_overlaid_smoothed(us, uk)
    
    print(f"Charts saved to {OUTPUT}/")
    for p in sorted(OUTPUT.glob("*.png")):
        print(f"  {p.name}")


if __name__ == "__main__":
    main()
