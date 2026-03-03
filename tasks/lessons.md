# Lessons Learned

## 2026-03-03 - Sport group collapse toggle ignored SVG taps

- What went wrong (pattern):
  - Delegated click handling in `#sports` accepted only `HTMLElement` targets.
  - Taps on inline SVG/path inside the collapse button can produce `SVGElement` targets, so the handler returned early.
- The fix:
  - Switched target guard from `HTMLElement` to `Element` in delegated click handling.
  - Added `pointer-events: none` on `.sport-group-toggle-icon` so taps resolve to the button reliably.
- Prevention rule:
  - For delegated click handlers that use `closest(...)`, guard with `Element`, not `HTMLElement`.
  - For icon-only controls, disable pointer events on decorative SVG icons by default.

## 2026-02-27 - Collapsible sports categories first implementation was not robust enough

- What went wrong (pattern):
  - Collapse interaction was attached mainly to a small text button, and visibility relied on `hidden` only.
  - This made the UX unclear and increased risk that user taps did not hit the expected target.
- The fix:
  - Made the whole category heading area toggle collapse/expand.
  - Switched to an icon-only chevron control with clear visual direction.
  - Added explicit CSS hiding for collapsed grids (`.is-collapsed .sport-group-grid { display: none; }`).
- Prevention rule:
  - For mobile-first interactions, never rely on tiny hit targets for primary actions.
  - Add explicit CSS state rules (not only HTML attributes) for visibility-critical UI behavior.
