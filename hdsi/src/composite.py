"""
Composite stress index construction.

Weighted sum of three pillars plus non-linear penalty when any pillar
exceeds the 80th percentile (reflecting that household debt crises don't
compensate across dimensions — one pillar in extreme territory is a
real signal regardless of where the others sit).
"""
from __future__ import annotations

import numpy as np
import pandas as pd


DEFAULT_WEIGHTS = (0.25, 0.45, 0.30)
PENALTY_THRESHOLD = 80.0
PENALTY_COEFFICIENT = 0.5


def build_composite(
    p1: pd.DataFrame,
    p2: pd.DataFrame,
    p3: pd.DataFrame,
    weights: tuple[float, float, float] = DEFAULT_WEIGHTS,
) -> pd.DataFrame:
    """Combine three pillars into a composite stress score.
    
    Args:
        p1, p2, p3: Pillar dataframes each containing a 'p' column with 0-100 score
        weights: tuple of (w1, w2, w3), should sum to 1.0
    
    Returns:
        DataFrame with columns p1, p2, p3, composite — all 0-100
    """
    if not np.isclose(sum(weights), 1.0):
        raise ValueError(f"Weights must sum to 1.0, got {sum(weights)}")
    
    df = pd.concat(
        [p1[["p1"]], p2[["p2"]], p3[["p3"]]],
        axis=1,
    ).dropna()
    
    w1, w2, w3 = weights
    base = w1 * df["p1"] + w2 * df["p2"] + w3 * df["p3"]
    
    max_p = df[["p1", "p2", "p3"]].max(axis=1)
    penalty = np.where(
        max_p > PENALTY_THRESHOLD,
        PENALTY_COEFFICIENT * (max_p - PENALTY_THRESHOLD),
        0.0,
    )
    
    df["composite"] = (base + penalty).clip(0, 100)
    return df
