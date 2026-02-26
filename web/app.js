const DATA_URL = "../data/sample_events_2025.tsv";
const DATE_PATTERN = /(\d{1,2}\.\d{1,2}\.\d{4})/g;
const FIXED_DTSTAMP = "20000101T000000Z";

const elements = {
  sports: document.querySelector("#sports"),
  sportsMeta: document.querySelector("#sports-meta"),
  events: document.querySelector("#events"),
  stats: document.querySelector("#stats"),
  exportStatus: document.querySelector("#export-status"),
  metricLoaded: document.querySelector("#metric-loaded"),
  metricShowing: document.querySelector("#metric-showing"),
  metricSelected: document.querySelector("#metric-selected"),
  query: document.querySelector("#query"),
  titleFormat: document.querySelector("#title-format"),
  calendarName: document.querySelector("#calendar-name"),
  sportsAll: document.querySelector("#sports-all"),
  sportsNone: document.querySelector("#sports-none"),
  selectVisible: document.querySelector("#select-visible"),
  clearVisible: document.querySelector("#clear-visible"),
  exportButton: document.querySelector("#export"),
};

const state = {
  events: [],
  visibleEvents: [],
  sports: [],
  selectedSports: new Set(),
  selectedEventIds: new Set(),
  query: "",
  titleFormat: "sport_event",
};

boot().catch((error) => {
  console.error(error);
  elements.stats.textContent = "Could not load events. Please try again.";
});

async function boot() {
  state.events = await loadEventsFromTsv(DATA_URL);
  state.sports = [...new Set(state.events.map((event) => event.sport).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  state.selectedSports = new Set(state.sports);
  for (const event of state.events) {
    state.selectedEventIds.add(event.id);
  }

  bindEvents();
  renderSports();
  applyFilters();
  elements.exportStatus.textContent = "No export yet.";
  document.body.classList.add("is-ready");
}

function bindEvents() {
  elements.query.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase();
    applyFilters();
  });

  elements.titleFormat.addEventListener("change", (event) => {
    state.titleFormat = event.target.value;
    renderEvents();
  });

  elements.sportsAll.addEventListener("click", () => {
    state.selectedSports = new Set(state.sports);
    renderSports();
    applyFilters();
  });

  elements.sportsNone.addEventListener("click", () => {
    state.selectedSports = new Set();
    renderSports();
    applyFilters();
  });

  elements.sports.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const sport = event.target.dataset.sport;
    if (!sport) {
      return;
    }

    if (event.target.checked) {
      state.selectedSports.add(sport);
    } else {
      state.selectedSports.delete(sport);
    }
    renderSports();
    applyFilters();
  });

  elements.events.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const eventId = event.target.dataset.eventId;
    if (!eventId) {
      return;
    }

    if (event.target.checked) {
      state.selectedEventIds.add(eventId);
    } else {
      state.selectedEventIds.delete(eventId);
    }
    renderStats();
  });

  elements.selectVisible.addEventListener("click", () => {
    for (const event of state.visibleEvents) {
      state.selectedEventIds.add(event.id);
    }
    renderEvents();
    renderStats();
  });

  elements.clearVisible.addEventListener("click", () => {
    for (const event of state.visibleEvents) {
      state.selectedEventIds.delete(event.id);
    }
    renderEvents();
    renderStats();
  });

  elements.exportButton.addEventListener("click", () => {
    exportIcs();
  });
}

function applyFilters() {
  const query = state.query;
  state.visibleEvents = state.events.filter((event) => {
    if (state.selectedSports.size === 0) {
      return false;
    }
    if (!state.selectedSports.has(event.sport)) {
      return false;
    }
    if (!query) {
      return true;
    }
    const text = `${event.title} ${event.sport} ${event.location}`.toLocaleLowerCase();
    return text.includes(query);
  });

  renderEvents();
  renderStats();
}

function renderSports() {
  elements.sports.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const sport of state.sports) {
    const label = document.createElement("label");
    label.className = "sport-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.selectedSports.has(sport);
    checkbox.dataset.sport = sport;

    const text = document.createElement("span");
    text.textContent = sport;

    label.append(checkbox, text);
    fragment.append(label);
  }

  elements.sports.append(fragment);
  elements.sportsMeta.textContent = `${state.selectedSports.size}/${state.sports.length} sports active`;
}

function renderEvents() {
  elements.events.innerHTML = "";

  if (state.visibleEvents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No events match the current filter.";
    elements.events.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const event of state.visibleEvents) {
    const row = document.createElement("label");
    row.className = "event-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.eventId = event.id;
    checkbox.checked = state.selectedEventIds.has(event.id);

    const summary = document.createElement("div");
    summary.className = "event-summary";
    summary.textContent = buildSummary(event, state.titleFormat);

    const meta = document.createElement("div");
    meta.className = "event-meta";
    meta.textContent = `${formatDateRange(event.startDate, event.endDateExclusive)} • ${event.location || "No location"}`;

    const content = document.createElement("div");
    content.className = "event-content";
    content.append(summary, meta);

    row.append(checkbox, content);
    fragment.append(row);
  }

  elements.events.append(fragment);
}

function renderStats() {
  elements.stats.textContent = `Loaded ${state.events.length} events • Showing ${state.visibleEvents.length} • Selected ${state.selectedEventIds.size}`;
  elements.metricLoaded.textContent = String(state.events.length);
  elements.metricShowing.textContent = String(state.visibleEvents.length);
  elements.metricSelected.textContent = String(state.selectedEventIds.size);
  elements.exportButton.textContent = `Export selected ICS (${state.selectedEventIds.size})`;
}

function exportIcs() {
  const selectedEvents = state.events.filter((event) => state.selectedEventIds.has(event.id));
  if (selectedEvents.length === 0) {
    elements.exportStatus.textContent = "Select at least one event before exporting.";
    return;
  }

  const calendarName = elements.calendarName.value.trim() || "Sportkalender Selection";
  const icsContent = createIcs(selectedEvents, calendarName, state.titleFormat);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "sportkalender-selection.ics";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  elements.exportStatus.textContent = `Exported ${selectedEvents.length} events.`;
}

async function loadEventsFromTsv(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load event data: ${response.status}`);
  }

  const text = await response.text();
  const seen = new Set();
  const events = [];

  for (const line of text.split(/\r?\n/)) {
    const rawLine = line.trim();
    if (!rawLine || rawLine.startsWith("###")) {
      continue;
    }

    const columns = line.split("\t").map((value) => value.trim());
    if (columns.length < 3) {
      continue;
    }
    if (columns[0].toLocaleLowerCase() === "datum") {
      continue;
    }

    const parsedRange = parseDateRange(columns[0]);
    if (!parsedRange) {
      continue;
    }

    const title = columns[1];
    const sport = columns[2];
    const location = columns.slice(3).filter(Boolean).join(" ");
    const key = `${parsedRange.startDate}|${parsedRange.endDateExclusive}|${title}|${sport}|${location}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    events.push({
      id: hashHex(key),
      startDate: parsedRange.startDate,
      endDateExclusive: parsedRange.endDateExclusive,
      title,
      sport,
      location,
    });
  }

  events.sort((left, right) => {
    const leftSummary = buildSummary(left, "sport_event");
    const rightSummary = buildSummary(right, "sport_event");
    return (
      left.startDate.localeCompare(right.startDate) ||
      left.endDateExclusive.localeCompare(right.endDateExclusive) ||
      leftSummary.localeCompare(rightSummary, undefined, { sensitivity: "base" }) ||
      left.location.localeCompare(right.location, undefined, { sensitivity: "base" })
    );
  });

  return events;
}

function parseDateRange(raw) {
  const matches = [...raw.matchAll(DATE_PATTERN)].map((match) => match[1]);
  if (matches.length === 0) {
    return null;
  }

  const startDate = toIsoDate(parseGermanDate(matches[0]));
  const endValue = matches[1] ? parseGermanDate(matches[1]) : parseGermanDate(matches[0]);
  const endDateExclusive = toIsoDate(addDays(endValue, 1));

  return { startDate, endDateExclusive };
}

function parseGermanDate(value) {
  const [day, month, year] = value.split(".").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateRange(startDate, endDateExclusive) {
  const start = isoDateToDate(startDate);
  const endInclusive = addDays(isoDateToDate(endDateExclusive), -1);
  const startLabel = start.toLocaleDateString("de-DE");
  const endLabel = endInclusive.toLocaleDateString("de-DE");
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function buildSummary(event, titleFormat) {
  if (titleFormat === "event_only") {
    return event.title;
  }

  const noPrefixSports = new Set(["diverse", "multisportveranstaltung", "marathon"]);
  if (!event.sport || noPrefixSports.has(event.sport.toLocaleLowerCase())) {
    return event.title;
  }
  return `${event.sport} - ${event.title}`;
}

function createIcs(events, calendarName, titleFormat) {
  const sorted = [...events].sort((left, right) => {
    const leftSummary = buildSummary(left, titleFormat);
    const rightSummary = buildSummary(right, titleFormat);
    return (
      left.startDate.localeCompare(right.startDate) ||
      left.endDateExclusive.localeCompare(right.endDateExclusive) ||
      leftSummary.localeCompare(rightSummary, undefined, { sensitivity: "base" }) ||
      left.location.localeCompare(right.location, undefined, { sensitivity: "base" })
    );
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//Sportkalender Web//Calendar Export//EN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const event of sorted) {
    const summary = buildSummary(event, titleFormat);
    const uidSource = `${event.startDate}|${event.endDateExclusive}|${event.title}|${event.sport}|${event.location}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${hashHex(uidSource)}@sportkalender-web`);
    lines.push(`DTSTAMP:${FIXED_DTSTAMP}`);
    lines.push(`DTSTART;VALUE=DATE:${toBasicDate(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${toBasicDate(event.endDateExclusive)}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.flatMap((line) => foldLine(line)).join("\r\n") + "\r\n";
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function isoDateToDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function addDays(date, amount) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}

function toBasicDate(isoDate) {
  return isoDate.replaceAll("-", "");
}

function escapeIcsText(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function foldLine(line) {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return [line];
  }

  const folded = [];
  let remaining = line;
  while (remaining.length > maxLength) {
    folded.push(remaining.slice(0, maxLength));
    remaining = ` ${remaining.slice(maxLength)}`;
  }
  folded.push(remaining);
  return folded;
}

function hashHex(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
