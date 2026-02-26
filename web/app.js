const DATA_URL = "../data/sample_events_2025.tsv";
const DATE_PATTERN = /(\d{1,2}\.\d{1,2}\.\d{4})/g;
const FIXED_DTSTAMP = "20000101T000000Z";

const SPORT_CATEGORIES = [
  {
    name: "Top Sports",
    keys: ["fussball", "tennis", "basketball", "handball", "american football", "eishockey", "darts"],
  },
  {
    name: "Ball Sports",
    keys: ["badminton", "beachhandball", "feldhockey", "floorball", "unihockey", "volleyball", "wasserball", "tischtennis"],
  },
  {
    name: "Athletics & Endurance",
    keys: ["leichtathletik", "marathon", "triathlon", "moderner funfkampf", "radsport"],
  },
  {
    name: "Winter Sports",
    keys: [
      "biathlon",
      "bobsport / skeleton",
      "curling",
      "eiskunstlauf",
      "eisschnelllauf",
      "freestyle-skiing",
      "rennrodeln",
      "shorttrack",
      "ski alpin",
      "ski nordisch",
      "skibergsteigen",
      "snowboard",
    ],
  },
  {
    name: "Combat & Precision",
    keys: ["boxen", "fechten", "gewichtheben", "judo", "ringen", "bogenschiessen", "snooker"],
  },
  {
    name: "Water & Outdoor",
    keys: ["kanusport", "rudern", "reiten", "sportklettern", "schwimmsport"],
  },
  {
    name: "Mind & Mixed",
    keys: ["schach", "diverse", "multisportveranstaltung", "geratturnen", "rhythmische sportgymnastik", "trampolinturnen"],
  },
];

const SPORT_CATEGORY_BY_KEY = new Map(
  SPORT_CATEGORIES.flatMap((category) => category.keys.map((key) => [key, category.name]))
);

const elements = {
  sports: document.querySelector("#sports"),
  sportsMeta: document.querySelector("#sports-meta"),
  events: document.querySelector("#events"),
  stats: document.querySelector("#stats"),
  exportStatus: document.querySelector("#export-status"),
  exportEventsCount: document.querySelector("#export-events-count"),
  exportSportsCount: document.querySelector("#export-sports-count"),
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
    syncEventChecksToSportsSelection();
    renderSports();
    applyFilters();
  });

  elements.sportsNone.addEventListener("click", () => {
    state.selectedSports = new Set();
    syncEventChecksToSportsSelection();
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
    syncEventChecksToSportsSelection();
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
  const groupedSports = groupSportsByCategory(state.sports);

  for (const group of groupedSports) {
    const section = document.createElement("section");
    section.className = "sport-group";

    const header = document.createElement("header");
    header.className = "sport-group-header";

    const title = document.createElement("h3");
    title.className = "sport-group-title";
    title.textContent = group.category;

    const selectedCount = group.sports.filter((sport) => state.selectedSports.has(sport)).length;
    const count = document.createElement("span");
    count.className = "sport-group-count";
    count.textContent = `${selectedCount}/${group.sports.length}`;

    header.append(title, count);

    const grid = document.createElement("div");
    grid.className = "sport-group-grid";

    for (const sport of group.sports) {
      const label = document.createElement("label");
      label.className = "sport-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.selectedSports.has(sport);
      checkbox.dataset.sport = sport;

      const text = document.createElement("span");
      text.textContent = sport;

      label.append(checkbox, text);
      grid.append(label);
    }

    section.append(header, grid);
    fragment.append(section);
  }

  elements.sports.append(fragment);
  elements.sportsMeta.textContent = `${state.selectedSports.size}/${state.sports.length} sports active in ${groupedSports.length} groups`;
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
    meta.textContent = `${formatDateRange(event.startDate, event.endDateExclusive)} | ${event.location || "No location"}`;

    const content = document.createElement("div");
    content.className = "event-content";
    content.append(summary, meta);

    row.append(checkbox, content);
    fragment.append(row);
  }

  elements.events.append(fragment);
}

function renderStats() {
  const summary = getSelectedSummary();
  elements.stats.textContent = `Loaded ${state.events.length} events | Showing ${state.visibleEvents.length} | Selected ${state.selectedEventIds.size}`;
  elements.exportButton.textContent = `Export selected ICS (${summary.eventsCount})`;
  elements.exportEventsCount.textContent = String(summary.eventsCount);
  elements.exportSportsCount.textContent = String(summary.sportsCount);
}

function exportIcs() {
  const summary = getSelectedSummary();
  if (summary.events.length === 0) {
    elements.exportStatus.textContent = "Select at least one event before exporting.";
    return;
  }

  const calendarName = elements.calendarName.value.trim() || "Sportkalender Selection";
  const icsContent = createIcs(summary.events, calendarName, state.titleFormat);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "sportkalender-selection.ics";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  elements.exportStatus.textContent = `Exported ${summary.eventsCount} events across ${summary.sportsCount} sports.`;
}

function getSelectedSummary() {
  const events = state.events.filter((event) => state.selectedEventIds.has(event.id));
  const sportsCount = new Set(events.map((event) => event.sport).filter(Boolean)).size;
  return {
    events,
    eventsCount: events.length,
    sportsCount,
  };
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
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
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

function groupSportsByCategory(sports) {
  const grouped = new Map();

  for (const sport of sports) {
    const category = resolveSportCategory(sport);
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(sport);
  }

  const ordered = [...SPORT_CATEGORIES.map((category) => category.name), "And More"];
  const result = [];

  for (const category of ordered) {
    const categorySports = grouped.get(category);
    if (!categorySports || categorySports.length === 0) {
      continue;
    }
    categorySports.sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
    result.push({ category, sports: categorySports });
  }

  return result;
}

function resolveSportCategory(sport) {
  return SPORT_CATEGORY_BY_KEY.get(normalizeSportKey(sport)) ?? "And More";
}

function normalizeSportKey(value) {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ß", "ss")
    .replace(/\s+/g, " ")
    .trim();
}

function syncEventChecksToSportsSelection() {
  state.selectedEventIds = new Set(
    state.events.filter((event) => state.selectedSports.has(event.sport)).map((event) => event.id)
  );
}
