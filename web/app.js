const DATA_URL = "../data/sample_events_2025.tsv";
const DATE_PATTERN = /(\d{1,2}\.\d{1,2}\.\d{4})/g;
const FIXED_DTSTAMP = "20000101T000000Z";
const EXPORT_FILE_NAME = "sportkalender-selection.ics";
const LOCAL_STORAGE_KEY = "sportkalender:web-state:v1";
const SESSION_STORAGE_KEY = "sportkalender:web-state:session:v1";
const MAX_PERSISTED_STATE_BYTES = 200 * 1024;

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
  eventsPanel: document.querySelector("#events-panel"),
  sports: document.querySelector("#sports"),
  sportsMeta: document.querySelector("#sports-meta"),
  events: document.querySelector("#events"),
  statsText: document.querySelector("#stats-text"),
  eventSearch: document.querySelector("#event-search"),
  collapseEventSearch: document.querySelector("#collapse-event-search"),
  expandEventSearch: document.querySelector("#expand-event-search"),
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
  invertVisible: document.querySelector("#invert-visible"),
  selectedOnlyToggle: document.querySelector("#selected-only-toggle"),
  exportButton: document.querySelector("#export"),
};

const state = {
  events: [],
  visibleEvents: [],
  sports: [],
  selectedSports: new Set(),
  selectedEventIds: new Set(),
  collapsedSportCategories: new Set(),
  query: "",
  titleFormat: "sport_event",
  showSelectedOnly: false,
};

boot().catch((error) => {
  console.error(error);
  elements.statsText.textContent = "Could not load events. Please try again.";
});

async function boot() {
  state.events = await loadEventsFromTsv(DATA_URL);
  state.sports = [...new Set(state.events.map((event) => event.sport).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  state.selectedSports = new Set(state.sports);
  state.selectedEventIds = new Set(state.events.map((event) => event.id));
  state.collapsedSportCategories = getDefaultCollapsedSportCategories(state.sports);
  hydrateStateFromStorage();

  setEventSearchCollapsed(false);
  bindEvents();
  renderSports();
  applyFilters();
  elements.exportStatus.textContent = "No export yet.";
  persistState();
}

function bindEvents() {
  elements.query.addEventListener("input", (event) => {
    state.query = event.target.value;
    applyFilters();
    persistState();
  });

  elements.collapseEventSearch.addEventListener("click", () => {
    setEventSearchCollapsed(true);
  });

  elements.expandEventSearch.addEventListener("click", () => {
    setEventSearchCollapsed(false);
  });

  elements.titleFormat.addEventListener("change", (event) => {
    state.titleFormat = event.target.value;
    renderEvents();
    renderStats();
    persistState();
  });

  elements.calendarName.addEventListener("input", () => {
    persistState();
  });

  elements.sportsAll.addEventListener("click", () => {
    state.selectedSports = new Set(state.sports);
    syncEventChecksToSportsSelection();
    renderSports();
    applyFilters();
    persistState();
  });

  elements.sportsNone.addEventListener("click", () => {
    state.selectedSports = new Set();
    syncEventChecksToSportsSelection();
    renderSports();
    applyFilters();
    persistState();
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
    persistState();
  });

  elements.sports.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const toggleButton = event.target.closest("button[data-group-toggle='collapse']");
    if (toggleButton instanceof HTMLButtonElement) {
      const category = toggleButton.dataset.groupName;
      if (!category) {
        return;
      }
      toggleSportCategory(category);
      return;
    }

    const actionButton = event.target.closest("button[data-group-action]");
    if (!(actionButton instanceof HTMLButtonElement)) {
      return;
    }

    const category = actionButton.dataset.groupName;
    const action = actionButton.dataset.groupAction;
    if (!category || !action) {
      return;
    }

    const categorySports = getSportsForCategory(category);
    if (action === "all") {
      for (const sport of categorySports) {
        state.selectedSports.add(sport);
      }
    } else if (action === "none") {
      for (const sport of categorySports) {
        state.selectedSports.delete(sport);
      }
    }

    syncEventChecksToSportsSelection();
    renderSports();
    applyFilters();
    persistState();
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
    persistState();
  });

  elements.selectVisible.addEventListener("click", () => {
    for (const event of state.visibleEvents) {
      state.selectedEventIds.add(event.id);
    }
    renderEvents();
    renderStats();
    persistState();
  });

  elements.clearVisible.addEventListener("click", () => {
    for (const event of state.visibleEvents) {
      state.selectedEventIds.delete(event.id);
    }
    renderEvents();
    renderStats();
    persistState();
  });

  elements.invertVisible.addEventListener("click", () => {
    for (const event of state.visibleEvents) {
      if (state.selectedEventIds.has(event.id)) {
        state.selectedEventIds.delete(event.id);
      } else {
        state.selectedEventIds.add(event.id);
      }
    }
    renderEvents();
    renderStats();
    persistState();
  });

  elements.selectedOnlyToggle.addEventListener("click", () => {
    state.showSelectedOnly = !state.showSelectedOnly;
    applyFilters();
    persistState();
  });

  elements.exportButton.addEventListener("click", async () => {
    await exportIcs();
  });
}

function setEventSearchCollapsed(collapsed) {
  elements.eventsPanel.classList.toggle("search-collapsed", collapsed);
  elements.collapseEventSearch.setAttribute("aria-expanded", String(!collapsed));
  elements.expandEventSearch.setAttribute("aria-expanded", String(!collapsed));
  elements.collapseEventSearch.setAttribute("aria-label", "Collapse search");
  elements.expandEventSearch.setAttribute("aria-label", "Expand search");
  if (!collapsed) {
    elements.query.focus();
  } else {
    elements.expandEventSearch.focus();
  }
}

function applyFilters() {
  const query = state.query.trim().toLocaleLowerCase();
  state.visibleEvents = state.events.filter((event) => {
    if (!state.selectedSports.has(event.sport)) {
      return false;
    }

    if (state.showSelectedOnly && !state.selectedEventIds.has(event.id)) {
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
  const groupedSports = groupSportsByCategory(state.sports);

  for (const group of groupedSports) {
    const isCollapsed = state.collapsedSportCategories.has(group.category);
    const section = document.createElement("section");
    section.className = "sport-group";
    section.classList.toggle("is-collapsed", isCollapsed);

    const header = document.createElement("header");
    header.className = "sport-group-header";

    const heading = document.createElement("div");
    heading.className = "sport-group-heading";

    const title = document.createElement("h3");
    title.className = "sport-group-title";
    title.textContent = group.category;

    const selectedCount = group.sports.filter((sport) => state.selectedSports.has(sport)).length;
    const meta = document.createElement("div");
    meta.className = "sport-group-meta";

    const count = document.createElement("span");
    count.className = "sport-group-count";
    count.textContent = `${selectedCount}/${group.sports.length}`;

    const actions = document.createElement("div");
    actions.className = "sport-group-actions";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sport-group-toggle";
    toggle.dataset.groupToggle = "collapse";
    toggle.dataset.groupName = group.category;
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
    toggle.setAttribute("aria-label", isCollapsed ? `Expand ${group.category}` : `Collapse ${group.category}`);
    toggle.innerHTML =
      '<svg class="sport-group-toggle-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

    const selectAll = document.createElement("button");
    selectAll.type = "button";
    selectAll.className = "sport-group-action";
    selectAll.dataset.groupAction = "all";
    selectAll.dataset.groupName = group.category;
    selectAll.textContent = "All";

    const selectNone = document.createElement("button");
    selectNone.type = "button";
    selectNone.className = "sport-group-action";
    selectNone.dataset.groupAction = "none";
    selectNone.dataset.groupName = group.category;
    selectNone.textContent = "None";

    actions.append(toggle, selectAll, selectNone);
    heading.append(title);
    meta.append(count, actions);
    header.append(heading, meta);

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
    empty.textContent = state.showSelectedOnly
      ? "No selected events match the current filter."
      : "No events match the current filter.";
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
  const selectedOnlyLabel = state.showSelectedOnly ? " | View: selected only" : "";
  elements.statsText.textContent = `Loaded ${state.events.length} events | Showing ${state.visibleEvents.length} | Selected ${summary.eventsCount}${selectedOnlyLabel}`;
  elements.selectedOnlyToggle.setAttribute("aria-pressed", String(state.showSelectedOnly));
  elements.exportButton.textContent = getExportButtonLabel(summary.eventsCount);
  elements.exportEventsCount.textContent = String(summary.eventsCount);
  elements.exportSportsCount.textContent = String(summary.sportsCount);
}

async function exportIcs() {
  const summary = getSelectedSummary();
  if (summary.events.length === 0) {
    elements.exportStatus.textContent = "Select at least one event before exporting.";
    return;
  }

  const calendarName = elements.calendarName.value.trim() || "Sportkalender Selection";
  const icsContent = createIcs(summary.events, calendarName, state.titleFormat);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const icsFile = createIcsFile(blob);

  if (icsFile && canShareIcsFile(icsFile)) {
    try {
      await navigator.share({
        files: [icsFile],
        title: calendarName,
        text: `Sportkalender export (${summary.eventsCount} events)`,
      });
      elements.exportStatus.textContent = `Shared ${summary.eventsCount} events across ${summary.sportsCount} sports.`;
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        elements.exportStatus.textContent = "Share canceled. You can try again or download instead.";
        return;
      }
    }
  }

  triggerIcsDownload(blob, EXPORT_FILE_NAME);
  elements.exportStatus.textContent = `Downloaded ${summary.eventsCount} events across ${summary.sportsCount} sports.`;
}

function getSelectedSummary() {
  const events = state.events.filter(
    (event) => state.selectedSports.has(event.sport) && state.selectedEventIds.has(event.id)
  );
  const sportsCount = new Set(events.map((event) => event.sport).filter(Boolean)).size;
  return {
    events,
    eventsCount: events.length,
    sportsCount,
  };
}

function getExportButtonLabel(eventsCount) {
  return canAttemptNativeShare() ? `Share or download ICS (${eventsCount})` : `Download ICS (${eventsCount})`;
}

function canAttemptNativeShare() {
  return typeof navigator.share === "function" && typeof navigator.canShare === "function" && typeof File === "function";
}

function createIcsFile(blob) {
  if (typeof File !== "function") {
    return null;
  }
  return new File([blob], EXPORT_FILE_NAME, { type: "text/calendar;charset=utf-8" });
}

function canShareIcsFile(file) {
  if (!canAttemptNativeShare()) {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function triggerIcsDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function hydrateStateFromStorage() {
  const stored = readStoredState();
  if (!stored || typeof stored !== "object") {
    elements.query.value = state.query;
    elements.titleFormat.value = state.titleFormat;
    return;
  }

  const eventsById = new Map(state.events.map((event) => [event.id, event]));

  if (Array.isArray(stored.selectedSports)) {
    state.selectedSports = new Set(stored.selectedSports.filter((sport) => state.sports.includes(sport)));
  }

  const availableCategories = new Set(groupSportsByCategory(state.sports).map((group) => group.category));
  if (Array.isArray(stored.collapsedSportCategories)) {
    state.collapsedSportCategories = new Set(
      stored.collapsedSportCategories.filter((category) => availableCategories.has(category))
    );
  }

  if (Array.isArray(stored.selectedEventIds)) {
    state.selectedEventIds = new Set(
      stored.selectedEventIds.filter((id) => {
        const event = eventsById.get(id);
        return Boolean(event && state.selectedSports.has(event.sport));
      })
    );
  } else {
    syncEventChecksToSportsSelection();
  }

  if (typeof stored.query === "string") {
    state.query = stored.query;
  }

  if (stored.titleFormat === "sport_event" || stored.titleFormat === "event_only") {
    state.titleFormat = stored.titleFormat;
  }

  if (typeof stored.calendarName === "string" && stored.calendarName.trim()) {
    elements.calendarName.value = stored.calendarName.trim();
  }

  if (typeof stored.showSelectedOnly === "boolean") {
    state.showSelectedOnly = stored.showSelectedOnly;
  }

  elements.query.value = state.query;
  elements.titleFormat.value = state.titleFormat;
}

function persistState() {
  const payload = {
    selectedEventIds: [...state.selectedEventIds],
    selectedSports: [...state.selectedSports],
    collapsedSportCategories: [...state.collapsedSportCategories],
    query: state.query,
    titleFormat: state.titleFormat,
    calendarName: elements.calendarName.value.trim(),
    showSelectedOnly: state.showSelectedOnly,
  };

  const serialized = JSON.stringify(payload);
  const bytes = getUtf8ByteLength(serialized);

  if (bytes <= MAX_PERSISTED_STATE_BYTES) {
    safeStorageWrite(localStorage, LOCAL_STORAGE_KEY, serialized);
    safeStorageRemove(sessionStorage, SESSION_STORAGE_KEY);
    return;
  }

  safeStorageWrite(sessionStorage, SESSION_STORAGE_KEY, serialized);
  safeStorageRemove(localStorage, LOCAL_STORAGE_KEY);
}

function readStoredState() {
  const localValue = safeStorageRead(localStorage, LOCAL_STORAGE_KEY);
  if (localValue) {
    const parsedLocal = safeJsonParse(localValue);
    if (parsedLocal && typeof parsedLocal === "object") {
      return parsedLocal;
    }
  }

  const sessionValue = safeStorageRead(sessionStorage, SESSION_STORAGE_KEY);
  if (!sessionValue) {
    return null;
  }

  const parsedSession = safeJsonParse(sessionValue);
  return parsedSession && typeof parsedSession === "object" ? parsedSession : null;
}

function safeStorageRead(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageWrite(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage failures (private mode/quota/user settings).
  }
}

function safeStorageRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getUtf8ByteLength(value) {
  if (typeof TextEncoder === "function") {
    return new TextEncoder().encode(value).length;
  }
  return value.length * 2;
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

function getSportsForCategory(categoryName) {
  const groupedSports = groupSportsByCategory(state.sports);
  const match = groupedSports.find((group) => group.category === categoryName);
  return match ? match.sports : [];
}

function getDefaultCollapsedSportCategories(sports) {
  const groupedSports = groupSportsByCategory(sports);
  return new Set(groupedSports.slice(3).map((group) => group.category));
}

function toggleSportCategory(category) {
  if (state.collapsedSportCategories.has(category)) {
    state.collapsedSportCategories.delete(category);
  } else {
    state.collapsedSportCategories.add(category);
  }
  renderSports();
  persistState();
}

function syncEventChecksToSportsSelection() {
  state.selectedEventIds = new Set(
    state.events.filter((event) => state.selectedSports.has(event.sport)).map((event) => event.id)
  );
}
