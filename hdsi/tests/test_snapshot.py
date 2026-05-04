"""Snapshot tests locking the composite scores at the four reference points.

Two of these episodes (US 2008-Q4 Lehman, UK 2023-Q2) are the validation
anchors for the methodology — if they move, something substantive changed.
The 2025-Q1 readings catch silent drift in current-period output.

Three test classes:
- TestDefault4Pillar: current default (credit-gap P1, US has Pillar 4
  essentials/SPM, 4-pillar weights 20/35/25/20). Added in v1.1 (ADR-019).
- TestNoP4: --no-p4 should reproduce v1's 3-pillar credit-gap snapshot
  for US (UK is unaffected, always 3-pillar in v1.1).
- TestOriginalPOC: --level --no-p4 reproduces the v0 POC numbers exactly.
  This is the byte-for-byte reproducibility anchor for the original
  publication.

Tolerance is 0.1 because the reference values are reported to one decimal
in docs/CLAUDE.md and the ADRs.

Run with:
    cd hdsi && python -m unittest tests.test_snapshot
    cd hdsi && python -m unittest tests.test_snapshot.TestDefault4Pillar.test_us_2008_lehman
"""
from __future__ import annotations

import unittest

from src.build_index import build_uk, build_us


TOL = 0.1


def _row(df, date_str):
    return df.loc[date_str]


class TestDefault4Pillar(unittest.TestCase):
    """Default form: credit-gap P1, US 4-pillar with essentials, UK 3-pillar.
    See ADR-017 (credit-gap default) and ADR-019 (Pillar 4)."""

    @classmethod
    def setUpClass(cls):
        cls.us = build_us(use_credit_gap=True, use_p4=True)
        cls.uk = build_uk(use_credit_gap=True)

    def test_us_2008_lehman(self):
        r = _row(self.us, "2008-10-01")
        self.assertAlmostEqual(r["composite"], 70.5, delta=TOL)
        self.assertAlmostEqual(r["p1"], 64.7, delta=TOL)
        self.assertAlmostEqual(r["p2"], 83.8, delta=TOL)
        self.assertAlmostEqual(r["p3"], 51.4, delta=TOL)
        self.assertAlmostEqual(r["p4"], 67.2, delta=TOL)

    def test_uk_2023_q2_peak(self):
        r = _row(self.uk, "2023-04-01")
        self.assertAlmostEqual(r["composite"], 79.2, delta=TOL)
        self.assertAlmostEqual(r["p1"], 29.1, delta=TOL)
        self.assertAlmostEqual(r["p2"], 94.7, delta=TOL)
        self.assertAlmostEqual(r["p3"], 73.1, delta=TOL)

    def test_us_2025_q1_latest(self):
        r = _row(self.us, "2025-04-01")
        self.assertAlmostEqual(r["composite"], 55.5, delta=TOL)
        self.assertAlmostEqual(r["p1"], 36.8, delta=TOL)
        self.assertAlmostEqual(r["p2"], 54.7, delta=TOL)
        self.assertAlmostEqual(r["p3"], 63.1, delta=TOL)
        self.assertAlmostEqual(r["p4"], 65.9, delta=TOL)

    def test_uk_2025_q1_latest(self):
        r = _row(self.uk, "2025-04-01")
        self.assertAlmostEqual(r["composite"], 50.4, delta=TOL)
        self.assertAlmostEqual(r["p1"], 30.2, delta=TOL)
        self.assertAlmostEqual(r["p2"], 53.5, delta=TOL)
        self.assertAlmostEqual(r["p3"], 62.8, delta=TOL)


class TestNoP4(unittest.TestCase):
    """--no-p4: credit-gap P1, both countries on legacy 3-pillar form.
    Reproduces the v1 snapshot (before Pillar 4 was added)."""

    @classmethod
    def setUpClass(cls):
        cls.us = build_us(use_credit_gap=True, use_p4=False)
        cls.uk = build_uk(use_credit_gap=True)

    def test_us_2008_lehman(self):
        r = _row(self.us, "2008-10-01")
        self.assertAlmostEqual(r["composite"], 71.2, delta=TOL)
        self.assertAlmostEqual(r["p1"], 64.7, delta=TOL)
        self.assertAlmostEqual(r["p2"], 83.8, delta=TOL)
        self.assertAlmostEqual(r["p3"], 51.4, delta=TOL)

    def test_us_2025_q1_latest(self):
        r = _row(self.us, "2025-04-01")
        self.assertAlmostEqual(r["composite"], 52.8, delta=TOL)
        self.assertAlmostEqual(r["p1"], 36.8, delta=TOL)
        self.assertAlmostEqual(r["p2"], 54.7, delta=TOL)
        self.assertAlmostEqual(r["p3"], 63.1, delta=TOL)


class TestOriginalPOC(unittest.TestCase):
    """--level --no-p4: legacy P1 + 3-pillar form. Byte-for-byte
    reproduction of the v0 POC numbers. Documented in ADR-007/011/017."""

    @classmethod
    def setUpClass(cls):
        cls.us = build_us(use_credit_gap=False, use_p4=False)
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
