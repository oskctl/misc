"""Snapshot tests locking the composite scores at the four reference points.

Two of these episodes (US 2008-Q4 Lehman, UK 2023-Q2) are the validation
anchors for the methodology — if they move, something substantive changed.
The 2025-Q1 readings catch silent drift in current-period output. Both
forms of Pillar 1 are checked so swapping the default again later won't
silently break the legacy form.

Tolerance is 0.1 because the reference values are reported to one decimal
in docs/CLAUDE.md and ADR-011 / ADR-017.

Run with:
    cd hdsi && python -m unittest tests.test_snapshot
    cd hdsi && python -m unittest tests.test_snapshot.TestDefaultCreditGap.test_us_2008_lehman
"""
from __future__ import annotations

import unittest

from src.build_index import build_uk, build_us


TOL = 0.1


def _row(df, date_str):
    return df.loc[date_str]


class TestDefaultCreditGap(unittest.TestCase):
    """Default Pillar 1 form (BIS credit gap, ADR-017)."""

    @classmethod
    def setUpClass(cls):
        cls.us = build_us(use_credit_gap=True)
        cls.uk = build_uk(use_credit_gap=True)

    def test_us_2008_lehman(self):
        r = _row(self.us, "2008-10-01")
        self.assertAlmostEqual(r["composite"], 71.2, delta=TOL)
        self.assertAlmostEqual(r["p1"], 64.7, delta=TOL)
        self.assertAlmostEqual(r["p2"], 83.8, delta=TOL)
        self.assertAlmostEqual(r["p3"], 51.4, delta=TOL)

    def test_uk_2023_q2_peak(self):
        r = _row(self.uk, "2023-04-01")
        self.assertAlmostEqual(r["composite"], 79.2, delta=TOL)
        self.assertAlmostEqual(r["p1"], 29.1, delta=TOL)
        self.assertAlmostEqual(r["p2"], 94.7, delta=TOL)
        self.assertAlmostEqual(r["p3"], 73.1, delta=TOL)

    def test_us_2025_q1_latest(self):
        r = _row(self.us, "2025-04-01")
        self.assertAlmostEqual(r["composite"], 52.8, delta=TOL)
        self.assertAlmostEqual(r["p1"], 36.8, delta=TOL)
        self.assertAlmostEqual(r["p2"], 54.7, delta=TOL)
        self.assertAlmostEqual(r["p3"], 63.1, delta=TOL)

    def test_uk_2025_q1_latest(self):
        r = _row(self.uk, "2025-04-01")
        self.assertAlmostEqual(r["composite"], 50.4, delta=TOL)
        self.assertAlmostEqual(r["p1"], 30.2, delta=TOL)
        self.assertAlmostEqual(r["p2"], 53.5, delta=TOL)
        self.assertAlmostEqual(r["p3"], 62.8, delta=TOL)


class TestLegacyLevel(unittest.TestCase):
    """Legacy Pillar 1 form (debt-to-GDP level, ADR-007/011). Inverts in
    inflation regimes — preserved as opt-in for reproducibility against the
    original POC. These numbers are what docs/CLAUDE.md previously reported."""

    @classmethod
    def setUpClass(cls):
        cls.us = build_us(use_credit_gap=False)
        cls.uk = build_uk(use_credit_gap=False)

    def test_us_2008_lehman(self):
        r = _row(self.us, "2008-10-01")
        self.assertAlmostEqual(r["composite"], 75.6, delta=TOL)
        self.assertAlmostEqual(r["p1"], 82.4, delta=TOL)
        self.assertAlmostEqual(r["p2"], 83.8, delta=TOL)
        self.assertAlmostEqual(r["p3"], 51.4, delta=TOL)

    def test_uk_2023_q2_peak(self):
        r = _row(self.uk, "2023-04-01")
        self.assertAlmostEqual(r["composite"], 78.2, delta=TOL)
        self.assertAlmostEqual(r["p1"], 24.9, delta=TOL)
        self.assertAlmostEqual(r["p2"], 94.7, delta=TOL)
        self.assertAlmostEqual(r["p3"], 73.1, delta=TOL)

    def test_us_2025_q1_latest(self):
        r = _row(self.us, "2025-04-01")
        self.assertAlmostEqual(r["composite"], 50.4, delta=TOL)
        self.assertAlmostEqual(r["p1"], 27.3, delta=TOL)
        self.assertAlmostEqual(r["p2"], 54.7, delta=TOL)
        self.assertAlmostEqual(r["p3"], 63.1, delta=TOL)

    def test_uk_2025_q1_latest(self):
        r = _row(self.uk, "2025-04-01")
        self.assertAlmostEqual(r["composite"], 45.3, delta=TOL)
        self.assertAlmostEqual(r["p1"], 9.6, delta=TOL)
        self.assertAlmostEqual(r["p2"], 53.5, delta=TOL)
        self.assertAlmostEqual(r["p3"], 62.8, delta=TOL)


if __name__ == "__main__":
    unittest.main()
