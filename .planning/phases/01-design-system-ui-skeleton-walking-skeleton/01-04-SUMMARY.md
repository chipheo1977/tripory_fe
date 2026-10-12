---
phase: 01-design-system-ui-skeleton-walking-skeleton
plan: 04
subsystem: ui
tags: [react, base-ui, accessibility, forms, navigation, semantic-tokens, tdd]

requires:
  - phase: 01-03
    provides: accessible ui-web atoms, public barrel, semantic token guard, and DOM test setup
provides:
  - Accessible FormField and keyboard-clearable SearchInput molecules
  - Single Select and line/contained Tabs with complete keyboard navigation
  - DropdownMenu normal/checkbox/radio/danger groups and supplementary Tooltip
  - Named compound exports safe across React server/client boundaries
affects: [ui-web-molecules, web-organisms, itinerary-forms, phase-1-ui]

tech-stack:
  added: []
  patterns: [base-ui-compound-wrappers, named-molecule-exports, accessible-field-association, keyboard-popup-focus-management, tdd-red-green]

key-files:
  created:
    - packages/ui-web/src/molecules/form-field.tsx
    - packages/ui-web/src/molecules/search-input.tsx
    - packages/ui-web/src/molecules/select.tsx
    - packages/ui-web/src/molecules/tabs.tsx
    - packages/ui-web/src/molecules/dropdown-menu.tsx
    - packages/ui-web/src/molecules/tooltip.tsx
  modified:
    - packages/ui-web/src/index.ts
    - packages/ui-web/src/atoms/input.tsx

key-decisions:
  - "Delegate roving focus, popup dismissal, and trigger focus restoration to Base UI 1.8 primitives while keeping wrappers presentation-only."
  - "Make SearchInput controlled or uncontrolled with explicit onValueChange, but keep debounce and business search behavior outside ui-web."
  - "Give Tooltip content an explicit tooltip role and aria-describedby link while still requiring an independently accessible trigger name."

patterns-established:
  - "Compound molecule children are exported as standalone named exports rather than static properties."
  - "Popup and field wrappers add semantic-token styling without replacing Base UI keyboard or focus behavior."

requirements-completed: [DS-04, FND-06, DS-06, DS-07]

duration: 8 min
completed: 2026-10-12
---

# Phase 1 Plan 4: Form and Navigation Molecules Summary

**Six Base UI-backed form and navigation molecules with linked field semantics, keyboard-complete selection and menus, focus restoration, and semantic-token styling**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-12T03:03:19Z
- **Completed:** 2026-10-12T03:10:55Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Added FormField named parts that automatically associate labels, descriptions, invalid controls, required text, and polite live errors.
- Added SearchInput with a required accessible label, controlled/uncontrolled value support, keyboard and button clearing, focus retention, and loading status.
- Added single Select and line/contained Tabs with Arrow/Home/End/Enter/Escape coverage, selected-state semantics, focus restoration, and non-color active indicators.
- Added DropdownMenu normal, checkbox, radio, and danger parts plus Tooltip with four placements, 400ms hover delay, focus/hover opening, Escape dismissal, and explicit description linkage.
- Exported all compound parts by name and passed the existing semantic-token production source guard.

## Task Commits

1. **Task 1 RED: FormField and SearchInput contracts** - `dd1d5bb` (test)
2. **Task 1 GREEN: Accessible form and search molecules** - `23604a2` (feat)
3. **Task 2 RED: Select and Tabs contracts** - `d5467c3` (test)
4. **Task 2 GREEN: Keyboard-complete Select and Tabs** - `a70a5a6` (feat)
5. **Task 3 RED: DropdownMenu and Tooltip contracts** - `d99099a` (test)
6. **Task 3 GREEN: Accessible DropdownMenu and Tooltip** - `7676fda` (feat)

## Files Created/Modified

- `packages/ui-web/src/molecules/form-field.tsx` - Field root, label, description, and polite live error wrappers.
- `packages/ui-web/src/molecules/search-input.tsx` - Accessible searchbox with clear controls and loading state.
- `packages/ui-web/src/molecules/select.tsx` - Single-select named parts with semantic trigger, popup, groups, and items.
- `packages/ui-web/src/molecules/tabs.tsx` - Line/contained tab variants with roving focus and visible active indicators.
- `packages/ui-web/src/molecules/dropdown-menu.tsx` - Menu compound parts for action, checkbox, radio, group, separator, and danger states.
- `packages/ui-web/src/molecules/tooltip.tsx` - Provider/root/trigger/content parts with delay and accessible relation.
- `packages/ui-web/src/molecules/*.test.tsx` - Render, role/state, label, keyboard, focus, and public-export coverage for all six molecules.
- `packages/ui-web/src/index.ts` - Public named exports for every new molecule and compound part.
- `packages/ui-web/src/atoms/input.tsx` - Corrected native `size` prop collision so molecule size variants remain type-safe.

## Decisions Made

- Used Base UI behavior rather than hand-written focus managers for Select, Tabs, DropdownMenu, and Tooltip.
- Kept SearchInput generic and synchronous: it reports value changes but contains no debounce, query, or business behavior.
- Added an explicit Tooltip description ID because the Base UI popup is visual-only by default; the trigger still requires its own accessible name so tooltip content is supplementary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Input size prop type collision**
- **Found during:** Task 1 (FormField and SearchInput)
- **Issue:** `InputProps` intersected native numeric `size` with the `md | lg` variant, making composed size values resolve to an unusable type.
- **Fix:** Omitted the native `size` attribute before adding the component variant type.
- **Files modified:** `packages/ui-web/src/atoms/input.tsx`
- **Verification:** Input, FormField, and SearchInput tests plus package typecheck passed.
- **Committed in:** `23604a2`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** The fix was required for type-safe composition and changed no runtime contract outside the approved Input size variants.

## Issues Encountered

- Base UI Tooltip intentionally renders visual popup content without `role="tooltip"`; the wrapper adds the role and `aria-describedby` relation required by this phase's testing contract.

## Known Stubs

None. SearchInput's empty default value is intentional uncontrolled-form state, and the empty `data-tabs-indicator` value is a marker attribute used by behavior tests.

## Threat Model Verification

- **T-01-07 (form labels):** Mitigated by Base UI Field association plus role/name, required, `aria-invalid`, `aria-describedby`, and live-error tests.
- **T-01-08 (popup focus denial):** Mitigated by Base UI focus management and tests for open/close, Arrow/Home/End, Enter/Space, Escape, roving focus, and trigger focus restoration.
- No endpoint, authentication path, file access, schema, or other production trust-boundary surface was introduced.

## Verification

- `pnpm --filter @tripory/ui-web test -- form-field search-input` — PASS (5/5 tests at task gate).
- `pnpm --filter @tripory/ui-web test -- select tabs` — PASS (5/5 tests at task gate).
- `pnpm --filter @tripory/ui-web test -- dropdown-menu tooltip` — PASS (6/6 tests at final task gate).
- `pnpm --filter @tripory/ui-web test` — PASS (21 files, 72/72 tests; includes token guard).
- `pnpm --filter @tripory/ui-web lint` — PASS.
- `pnpm --filter @tripory/ui-web typecheck` — PASS.
- `pnpm lint` — PASS (7/7 tasks).
- `pnpm typecheck` — PASS (7/7 tasks; Next route types generated).
- `pnpm test` — PASS (7/7 tasks; ui-web 72, config 76, design-tokens 8, web 1).
- `pnpm build` — PASS (Next.js 16.4 production build, 1/1 task).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Form and navigation primitives are ready for the remaining generic molecules in Plan 01-05 and later web organisms.
- No unresolved high-severity threat, test failure, or boundary violation remains.

---
*Phase: 01-design-system-ui-skeleton-walking-skeleton*
*Completed: 2026-10-12*

## Self-Check: PASSED

Verified all six production molecule files, the summary, and all six TDD task commits exist.