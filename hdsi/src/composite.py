"""
Composite stress index construction.

Weighted sum of pillars plus non-linear penalty when any pillar
exceeds the 80th percentile (reflecting that household debt crises don't
compensate across dimensions — one pillar in extreme territory is a
real signal regardless of where the others sit).

Two entry points:
    build_composite     — 3-pillar form (legacy, used for UK)
    build_composite_4   — 4-pillar form (US, with essentials pillar)
"""
from __future__ import annotations

import numpy as np
import pandas as pd


DEFAULT_WEIGHTS_3 = (0.25, 0.45, 0.30)
DEFAULT_WEIGHTS_4 = (0.20, 0.35, 0.25, 0.20)
DEFAULT_WEIGHTS = DEFAULT_WEIGHTS_3  # backward-compatible alias
PENALTY_THRESHOLD = 80.0
PENALTY_COEFFICIENT = 0.5


def _apply_penalty(pillar_cols: pd.DataFrame, base: pd.Series) -> pd.Series:
    max_p = pillar_cols.max(axis=1)
    penalty = np.where(
        max_p > PENALTY_THRESHOLD,
        PENALTY_COEFFICIENT * (max_p - PENALTY_THRESHOLD),
        0.0,
    )
    return (base + penalty).clip(0, 100)


def build_composite(
    p1: pd.DataFrame,
    p2: pd.DataFrame,
    p3: pd.DataFrame,
    weights: tuple[float, float, float] = DEFAULT_WEIGHTS_3,
) -> pd.DataFrame:
    """Combine three pillars into a composite stress score.

    Args:
        p1, p2, p3: Pillar dataframes each containing a 'pN' column with 0-100 score
        weights: tuple of (w1, w2, w3), should sum to 1.0

    Returns:
        DataFrame with columns p1, p2, p3, composite — all 0-100
    """
    if not np.isclose(sum(weights), 1.0):
        raise ValueError(f"Weights must sum to 1.0, got {sum(weights)}")

    df = pd.concat(
        [p1[["p1"]], p2[["p2"]], p3[["p3"]]],
        axis=1, sort=False,
    ).dropna()

    w1, w2, w3 = weights
    base = w1 * df["p1"] + w2 * df["p2"] + w3 * df["p3"]
    df["composite"] = _apply_penalty(df[["p1", "p2", "p3"]], base)
    return df


def build_composite_4(
    p1: pd.DataFrame,
    p2: pd.DataFrame,
    p3: pd.DataFrame,
    p4: pd.DataFrame,
    weights: tuple[float, float, float, float] = DEFAULT_WEIGHTS_4,
) -> pd.DataFrame:
    """Combine four pillars (incl. essentials) into a composite stress score.

    See ADR-019 for the rationale on adding Pillar 4 and on the weight
    rebalancing from the legacy 25/45/30 to 20/35/25/20.

    Args:
        p1, p2, p3, p4: Pillar dataframes each containing a 'pN' column with 0-100 score
        weights: tuple of (w1, w2, w3, w4), should sum to 1.0

    Returns:
        DataFrame with columns p1, p2, p3, p4, composite — all 0-100
    """
    if not np.isclose(sum(weights), 1.0):
        raise ValueError(f"Weights must sum to 1.0, got {sum(weights)}")

    df = pd.concat(
        [p1[["p1"]], p2[["p2"]], p3[["p3"]], p4[["p4"]]],
        axis=1, sort=False,
    ).dropna()

    w1, w2, w3, w4 = weights
    base = w1 * df["p1"] + w2 * df["p2"] + w3 * df["p3"] + w4 * df["p4"]
    df["composite"] = _apply_penalty(df[["p1", "p2", "p3", "p4"]], base)
    return df
