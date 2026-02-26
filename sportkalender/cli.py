from __future__ import annotations

import argparse
from pathlib import Path

from sportkalender.core import available_sports, load_events_from_tsv, write_ics


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sportkalender",
        description="Convert tab-separated sports events to a deterministic ICS calendar.",
    )
    parser.add_argument("--input", required=True, type=Path, help="Path to the input TSV file.")
    parser.add_argument(
        "--output",
        default=Path("output/events.ics"),
        type=Path,
        help="Target path for the generated ICS file.",
    )
    parser.add_argument(
        "--sport",
        action="append",
        default=[],
        help="Filter by sport. Can be passed multiple times.",
    )
    parser.add_argument(
        "--list-sports",
        action="store_true",
        help="Print available sports from the input file and exit.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    all_events = load_events_from_tsv(args.input)
    if args.list_sports:
        for sport in available_sports(all_events):
            print(sport)
        return

    include_sports = set(args.sport) if args.sport else None
    filtered_events = load_events_from_tsv(args.input, include_sports=include_sports)
    if not filtered_events:
        parser.error("No matching events found for the selected input/filter.")

    write_ics(filtered_events, args.output)
    print(f"Created {args.output} with {len(filtered_events)} events.")


if __name__ == "__main__":
    main()
