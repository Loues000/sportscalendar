from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from hashlib import sha1
from pathlib import Path
import re

from icalendar import Calendar, Event

_DATE_PATTERN = re.compile(r"(\d{1,2}\.\d{1,2}\.\d{4})")
_SPORT_PREFIX_EXCEPTIONS = {"diverse", "multisportveranstaltung", "marathon"}


@dataclass(frozen=True, slots=True)
class SportEvent:
    start_date: date
    end_date_exclusive: date
    title: str
    sport: str
    location: str

    @property
    def summary(self) -> str:
        if not self.sport:
            return self.title
        if self.sport.casefold() in _SPORT_PREFIX_EXCEPTIONS:
            return self.title
        return f"{self.sport} - {self.title}"


def parse_date_range(raw_value: str) -> tuple[date, date] | None:
    normalized = raw_value.replace("\xa0", " ").strip()
    matches = _DATE_PATTERN.findall(normalized)
    if not matches:
        return None

    start = datetime.strptime(matches[0], "%d.%m.%Y").date()
    if len(matches) >= 2:
        end = datetime.strptime(matches[1], "%d.%m.%Y").date()
    else:
        end = start

    return start, end + timedelta(days=1)


def load_events_from_tsv(
    input_path: Path, include_sports: set[str] | None = None
) -> list[SportEvent]:
    normalized_filters = None
    if include_sports:
        normalized_filters = {item.strip().casefold() for item in include_sports if item.strip()}

    events: list[SportEvent] = []
    seen: set[tuple[date, date, str, str, str]] = set()

    with input_path.open("r", encoding="utf-8-sig") as source:
        for raw_line in source:
            line = raw_line.strip()
            if not line or line.startswith("###"):
                continue

            columns = [col.strip() for col in raw_line.split("\t")]
            if len(columns) < 3:
                continue
            if columns[0].casefold() == "datum":
                continue

            parsed_dates = parse_date_range(columns[0])
            if not parsed_dates:
                continue
            start_date, end_date_exclusive = parsed_dates

            title = columns[1]
            sport = columns[2]
            location = " ".join(part for part in columns[3:] if part)

            if normalized_filters and sport.casefold() not in normalized_filters:
                continue

            key = (start_date, end_date_exclusive, title, sport, location)
            if key in seen:
                continue
            seen.add(key)

            events.append(
                SportEvent(
                    start_date=start_date,
                    end_date_exclusive=end_date_exclusive,
                    title=title,
                    sport=sport,
                    location=location,
                )
            )

    events.sort(
        key=lambda event: (
            event.start_date,
            event.end_date_exclusive,
            event.summary.casefold(),
            event.location.casefold(),
        )
    )
    return events


def available_sports(events: list[SportEvent]) -> list[str]:
    return sorted({event.sport for event in events if event.sport}, key=str.casefold)


def write_ics(events: list[SportEvent], output_path: Path) -> None:
    calendar = Calendar()
    calendar.add("prodid", "-//Sportkalender//Calendar Export//DE")
    calendar.add("version", "2.0")
    calendar.add("calscale", "GREGORIAN")
    calendar.add("x-wr-calname", "Sportkalender")

    dtstamp = datetime.combine(date(2000, 1, 1), time.min, timezone.utc)

    for event in events:
        ics_event = Event()
        ics_event.add("summary", event.summary)
        ics_event.add("dtstart", event.start_date)
        ics_event.add("dtend", event.end_date_exclusive)
        if event.location:
            ics_event.add("location", event.location)

        uid_source = "|".join(
            (
                event.start_date.isoformat(),
                event.end_date_exclusive.isoformat(),
                event.title,
                event.sport,
                event.location,
            )
        )
        uid = f"{sha1(uid_source.encode('utf-8')).hexdigest()}@sportkalender"
        ics_event.add("uid", uid)
        ics_event.add("dtstamp", dtstamp)

        calendar.add_component(ics_event)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as target:
        target.write(calendar.to_ical())
