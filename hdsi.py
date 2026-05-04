#!/usr/bin/env python3
"""HDSI."""

import argparse
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(prog="hdsi", description="HDSI.")
    parser.parse_args(argv)
    return 0


if __name__ == "__main__":
    sys.exit(main())
