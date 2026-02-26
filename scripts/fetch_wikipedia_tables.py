from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd


def main() -> None:
    year = datetime.now().year
    url = f"https://de.wikipedia.org/wiki/Portal:Sport/Sportkalender_{year}"
    output_path = Path("data") / f"sportkalender_{year}.tsv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    tables = pd.read_html(url)
    with output_path.open("w", encoding="utf-8") as target:
        for table in tables:
            table.to_csv(target, sep="\t", index=False)
            target.write("\n")

    print(f"Saved {len(tables)} tables to {output_path}")


if __name__ == "__main__":
    main()
