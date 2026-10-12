---
phase: 01-design-system-ui-skeleton-walking-skeleton
plan: 05
subsystem: ui
tags: [react, base-ui, sonner, accessibility, semantic-tokens, tdd]

requires:
  - phase: 01-02
    provides: semantic design tokens and Tailwind mappings
  - phase: 01-03
    provides: accessible atoms and ui-web public entry
provides:
  - Sonner Toast adapter with severity live regions, fixed durations, and keyboard actions
  - Base UI Dialog with tokenized sizes, focus trapping, dismissal, and focus restoration
  - Server-safe Card and EmptyState content molecules
  - Redacted ErrorState with optional onRetry action
affects: [web-route-states, walking-skeleton, phase-2-feedback]

tech-stack:
  added: []
  patterns: [base-ui-modal-composition, sonner-semantic-adapter, server-safe-content-states, tdd-red-green]

key-files:
  created:
    - packages/ui-web/src/molecules/toast.tsx
    - packages/ui-web/src/molecules/dialog.tsx
    - packages/ui-web/src/molecules/card.tsx
    - packages/ui-web/src/molecules/empty-state.tsx
    - packages/ui-web/src/molecules/error-state.tsx
  modified:
    - packages/ui-web/src/index.ts
    - packages/ui-web/src/styles.css

key-decisions:
  - "Delegate modal focus trapping, Escape/outside dismissal, scroll isolation, and focus restoration to Base UI 1.8 Dialog."
  - "Expose Card interaction only through a native button contract; default Card and EmptyState remain server-safe."
  - "Keep ErrorState copy fixed and accept only onRetry, never technical error objects or details."
  - "Disable Sonner's opinionated toast presentation and apply only approved semantic-token classes."

patterns-established:
  - "Interactive content surfaces use native semantics rather than div-based button emulation."
  - "Feedback adapters own accessibility defaults, durations, and semantic styling while delegating queue/timer behavior to the library."

requirements-completed: [DS-04, FND-04, FND-06, DS-06, DS-07]

duration: 9 min
completed: 2026-10-12
---

# Phase 1 Plan 5: Feedback and Content Molecules Summary

**Keyboard-complete Base UI Dialog, semantic Sonner feedback, server-safe content states, and redacted retry errors for the walking skeleton**

## Performance

- **Duration:** 9 min
- **Started:** 2026-10-12T03:12:52Z
- **Completed:** 2026-10-12T03:21:30Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Added Toast severity announcements, 5-second default and 8-second actionable/error durations, a three-toast limit, and keyboard-operable action/dismiss controls.
- Added Base UI Dialog sizes 400/560/720 with named compound exports, initial focus, Tab/Shift+Tab trapping, Escape/scrim/close dismissal, and trigger focus restoration.
- Added static Card and EmptyState variants, with native button semantics required for interactive/selected Cards and no fabricated EmptyState action.
- Added ErrorState inline/card/page variants with fixed neutral copy and an optional `onRetry` button whose click and Enter paths each invoke once.
- Expanded the complete ui-web suite to 26 files and 110 passing tests.

## Task Commits

1. **Task 1 RED: Toast and Dialog contracts** - `2203418` (test)
2. **Task 1 GREEN: Accessible Toast and Dialog** - `6e13b52` (feat)
3. **Task 2 RED: Card and EmptyState contracts** - `714e5a8` (test)
4. **Task 2 GREEN: Card and EmptyState molecules** - `4199705` (feat)
5. **Task 3 RED: ErrorState contract and redaction** - `b25b5f5` (test)
6. **Task 3 GREEN: Recoverable ErrorState** - `fb6b17a` (feat)
7. **Rule 2 fix: Semantic Toast presentation** - `840035a` (fix)

## Files Created/Modified

- `packages/ui-web/src/molecules/toast.tsx` - Sonner adapter, notify API, severity announcements, duration policy, and semantic styles.
- `packages/ui-web/src/molecules/dialog.tsx` - Base UI modal composition with tokenized sizes and named children.
- `packages/ui-web/src/molecules/card.tsx` - Static and native-button interactive/selected card variants.
- `packages/ui-web/src/molecules/empty-state.tsx` - Compact/page empty presentation with neutral defaults and optional real action.
- `packages/ui-web/src/molecules/error-state.tsx` - Fixed-copy recoverable error presentation with optional retry.
- `packages/ui-web/src/molecules/*.test.tsx` - Render, role/ARIA, keyboard, callback, dismissal, and redaction coverage.
- `packages/ui-web/src/index.ts` - Public named exports for all five molecules.
- `packages/ui-web/src/styles.css` - Stable Dialog width component tokens.

## Decisions Made

- Base UI remains the sole owner of Dialog focus management and modal behavior; no custom focus trap or scroll-lock implementation was introduced.
- Toast uses a small `notify` adapter to enforce accessibility and lifetime policy consistently while Sonner owns queueing, pause, and dismissal behavior.
- Static Card and EmptyState have no client directive; Card becomes interactive only when its typed variant renders a real button.
- ErrorState deliberately exposes no error object/message/digest/stack input, preventing technical details from reaching the UI.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Disabled Sonner's non-token presentation**
- **Found during:** Overall DS-06 source and threat review after Task 3
- **Issue:** Sonner's default styled mode supplied its own presentation values instead of guaranteeing the approved semantic-token contract.
- **Fix:** Enabled Sonner's unstyled toast mode and supplied semantic classes for the toast, content, severity, action, and close control.
- **Files modified:** `packages/ui-web/src/molecules/toast.tsx`
- **Verification:** Targeted Toast tests, ui-web lint/typecheck, and all four root gates passed.
- **Committed in:** `840035a`

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality).
**Impact on plan:** The fix enforces DS-06 without changing component scope or public behavior.

## Issues Encountered

- jsdom exposes Base UI focus guards during Tab wrapping and does not apply a visible body overflow style when no scrollbar exists. Tests assert the focus remains trapped after guard redirection and verify the modal viewport/backdrop contract rather than testing browser layout internals.
- The source redaction guard was narrowed from the generic word `stack` to technical property access `.stack`, avoiding a false positive on approved `gap-stack-*` semantic utilities without weakening the disclosure check.

## Known Stubs

None. Empty-string values are intentional marker data attributes, and the empty default Toast options object is a functional API default rather than UI placeholder data.

## Threat Model Verification

- **T-01-09 (ErrorState disclosure):** Mitigated by the narrow `onRetry` API, fixed copy, no Error input, and source-level guards for message/digest/stack detail access.
- **T-01-10 (Dialog denial/focus):** Mitigated by Base UI Dialog plus initial focus, Tab/Shift+Tab trap, Escape, scrim, close, and restore-focus tests.
- No endpoint, authentication path, file-access path, schema, or other production trust boundary was introduced.

## Verification

- `pnpm --filter @tripory/ui-web test -- toast dialog` — PASS (15/15)
- `pnpm --filter @tripory/ui-web test -- card empty-state` — PASS (11/11)
- `pnpm --filter @tripory/ui-web test -- error-state` — PASS (7/7)
- `pnpm --filter @tripory/ui-web lint` — PASS
- `pnpm --filter @tripory/ui-web typecheck` — PASS
- `pnpm lint` — PASS (7/7 tasks)
- `pnpm typecheck` — PASS (7/7 tasks)
- `pnpm test` — PASS (7/7 tasks; ui-web 26 files, 110 tests)
- `pnpm build` — PASS (Next.js 16.4 production build)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All feedback/content molecules required by Plan 01-05 are exported for route-state and walking-skeleton composition.
- Ready for Plan 01-06; no unresolved blocker or high-severity threat remains.

---
*Phase: 01-design-system-ui-skeleton-walking-skeleton*
*Completed: 2026-10-12*

## Self-Check: PASSED

Verified all five production molecule files, the summary, and all seven task/deviation commits exist.