# Lessons Learned

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
