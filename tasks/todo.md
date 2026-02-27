# Selection + Mobile Export Improvements

## Spec

- Goal: Improve event selection flow and reduce friction exporting `.ics` on mobile (especially iPhone) without adding live update feeds.
- In scope:
  - Add `Selected only` filter toggle.
  - Add `Invert visible` action.
  - Add smart export that uses native share when supported and falls back to download.
  - Persist selection/settings with storage size guardrail.
- Out of scope:
  - Live-updating feed URLs.
  - Presets/favorites.
  - Conflict detection.

## Acceptance Criteria

- Users can quickly refine picks with `Select visible`, `Clear visible`, `Invert visible`, and `Selected only`.
- Export button shares `.ics` on supported mobile browsers and downloads `.ics` elsewhere.
- Export remains deterministic (same selection -> same ICS content).
- State persistence works:
  - Use `localStorage` when serialized payload is <= 200 KB.
  - Fallback to `sessionStorage` when payload is > 200 KB.

## Checklist

- [x] Add events-panel controls and styles for `Invert visible` and `Selected only`.
- [x] Update filter/selection logic in `web/app.js` for selected-only and invert-visible behavior.
- [x] Replace download-only export with smart share-first export fallback.
- [x] Implement guarded persistence (localStorage/sessionStorage) and restore on boot.
- [x] Verify behavior with static checks (`node --check web/app.js`) and code-path review for deterministic ICS logic.

## Slice: Collapsible Sport Categories

### Acceptance Criteria

- Each sport category can be collapsed/expanded from its header.
- Category actions (`All` / `None`) remain available.
- Collapsed state persists with existing client-side state persistence.

### Checklist

- [x] Add collapse/expand toggle controls in each sport category header.
- [x] Implement collapsed state logic in `web/app.js`.
- [x] Persist and restore collapsed category state.
- [x] Style collapsed/expanded headers clearly in `web/styles.css`.
- [x] Verify behavior and run static syntax check.

## Slice: Collapse UX Bugfix

### Acceptance Criteria

- Category collapse works reliably on tap/click.
- No text label is shown on collapse control; icon-only interaction remains clear.
- Collapsed groups are visually obvious and their grid is hidden.

### Checklist

- [x] Make category heading area toggle collapse/expand.
- [x] Replace text collapse control with icon-only control.
- [x] Add explicit CSS rule to hide collapsed group grid.
- [x] Verify behavior with syntax check and manual smoke path review.

## Slice: Collapse Default State

### Acceptance Criteria

- On initial load, only the first 3 sport categories are expanded.
- Remaining categories start collapsed.
- Persisted user collapse state still overrides default.

### Checklist

- [x] Set default collapsed categories after grouping sports in boot flow.
- [x] Keep restore logic compatible with persisted states.
- [x] Verify via syntax check and state path review.
