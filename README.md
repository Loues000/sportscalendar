# Sportkalender

Generate deterministic `.ics` files from tab-separated sports event data.

## Quick start

```bash
python -m pip install -e .
python -m sportkalender --input data/sample_events_2025.tsv --output output/events.ics
```

## CLI usage

```bash
sportkalender --input <input.tsv> --output <events.ics> [--sport "<Sport>"] [--list-sports]
```

- `--sport` can be used multiple times to include only selected sports.
- `--list-sports` prints all recognized sports and exits.

## Input format

See `docs/input-format.md`.

## Web roadmap

MVP plan is documented in `docs/mvp.md`.

## Optional data fetch script

To fetch the current year from Wikipedia:

```bash
python -m pip install -e ".[fetch]"
python scripts/fetch_wikipedia_tables.py
```

This writes `data/sportkalender_<year>.tsv`.

## Deterministic output

For identical input + filters, output is stable by:

- deterministic event sorting
- stable event UID hashing
- fixed `DTSTAMP`
