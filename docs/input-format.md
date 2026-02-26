# Input format (`.tsv`)

`sportkalender` expects a UTF-8 tab-separated file with at least these columns:

1. `Datum` (`dd.mm.yyyy` or `dd.mm.yyyy – dd.mm.yyyy`)
2. `Ereignis`
3. `Sportart`
4. `Ort` (optional)

Example:

```text
6.1.2025 – 12.1.2025	PDC Q-School	Darts	Milton Keynes Kalkar
12.1.2025 – 26.1.2025	Australian Open	Tennis	Melbourne
```

Notes:

- Lines beginning with `###` are ignored.
- Blank lines are ignored.
- Duplicate rows are removed automatically.
- Single-day dates become one all-day event (`DTEND = DTSTART + 1 day`).
