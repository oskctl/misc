#!/usr/bin/env python3
"""RDSI."""

import argparse
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(prog="rdsi", description="RDSI.")
    parser.parse_args(argv)
    return 0


if __name__ == "__main__":
    sys.exit(main())
