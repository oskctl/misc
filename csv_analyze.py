#!/usr/bin/env python3
"""Analyze a CSV file: column stats, missing values, type inference."""

import csv
import sys
from collections import Counter

def infer_type(values):
    """Guess column type from non-empty values."""
    nums = 0
    for v in values:
        try:
            float(v)
            nums += 1
        except ValueError:
            pass
    if not values:
        return "empty"
    if nums == len(values):
        return "numeric"
    if nums > len(values) * 0.8:
        return "mostly numeric"
    return "text"

def analyze(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            print("Error: could not read CSV headers.")
            return

        rows = list(reader)

    if not rows:
        print("Empty CSV (headers only).")
        return

    print(f"\n  {path}: {len(rows)} rows, {len(reader.fieldnames)} columns\n")

    for col in reader.fieldnames:
        values = [r[col].strip() for r in rows]
        non_empty = [v for v in values if v]
        missing = len(values) - len(non_empty)
        col_type = infer_type(non_empty)

        print(f"  {col}")
        print(f"    Type: {col_type} | Missing: {missing}/{len(values)}")

        if col_type in ("numeric", "mostly numeric"):
            nums = []
            for v in non_empty:
                try:
                    nums.append(float(v))
                except ValueError:
                    pass
            if nums:
                print(f"    Min: {min(nums):.2f} | Max: {max(nums):.2f} | Mean: {sum(nums)/len(nums):.2f}")
        else:
            freq = Counter(non_empty).most_common(5)
            if len(freq) <= 5:
                top = ", ".join(f"{v} ({c})" for v, c in freq)
            else:
                top = ", ".join(f"{v} ({c})" for v, c in freq[:5]) + "..."
            unique = len(set(non_empty))
            print(f"    Unique: {unique} | Top: {top}")
        print()

def main():
    if len(sys.argv) < 2:
        print("Usage: csv_analyze.py <file.csv>")
        sys.exit(1)
    for path in sys.argv[1:]:
        try:
            analyze(path)
        except FileNotFoundError:
            print(f"File not found: {path}")
        except csv.Error as e:
            print(f"CSV error in {path}: {e}")

if __name__ == "__main__":
    main()
