# Sportkalender Web MVP

## Product goal

A simple web app where users pick from ready-made sports events and export a personal `.ics` calendar.

## Target users

- sports fans following multiple competitions
- users who want a calendar feed without manual event entry

## Core v1 scope

1. Preloaded event catalog (season/year dataset).
2. Filters:
   - sport
   - competition
   - country/region (when available)
3. Event list with checkbox selection.
4. Export selected events as `.ics`.
5. Basic settings:
   - timezone
   - event title format (`Sport - Event` vs `Event`)

## Data + architecture

- `core` parser/export logic stays deterministic and reusable.
- Store curated events as versioned JSON (`data/events-<year>.json`).
- Web frontend (Next.js) uses:
  - static catalog for fast load
  - client-side filtering
  - API route or shared util for ICS generation

## Deployment

- Preferred: Vercel (easy Next.js hosting + optional API routes).
- Alternative: GitHub Pages only if ICS generation is fully in-browser.

## v1.1 (after launch)

1. “Import from URL/text” advanced mode.
2. Team/athlete favorites.
3. Saved filter presets.
4. One-click “download updates” for new yearly data.

## Success criteria

- user can export a filtered calendar in under 60 seconds
- exported ICS is deterministic for same inputs
- at least 3 curated sports categories available at launch
