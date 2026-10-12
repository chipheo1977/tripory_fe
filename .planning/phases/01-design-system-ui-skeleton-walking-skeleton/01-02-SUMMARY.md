---
phase: 01-design-system-ui-skeleton-walking-skeleton
plan: 02
subsystem: design-tokens
tags: [tailwind-4, css-variables, semantic-tokens, design-system, tdd]

requires:
  - phase: 01-01
    provides: pnpm workspace, token package skeleton, UI boundaries, and Vitest setup
provides:
  - Three-layer primitive, semantic, and component token system
  - Tailwind 4 semantic utility mapping with default palette namespaces reset
  - Inactive complete dark-theme slot
  - Typed Sheet snap-point constants synchronized with CSS contracts
affects: [ui-web, web-styling, sheet, phase-1-ui]

tech-stack:
  added: []
  patterns: [semantic-css-indirection, tailwind-theme-inline, compile-time-token-guards]

key-files:
  created:
    - packages/design-tokens/src/primitives.css
    - packages/design-tokens/src/semantic.css
    - packages/design-tokens/src/components.css
    - packages/design-tokens/src/dark.css
    - packages/design-tokens/src/theme.css
    - packages/design-tokens/src/index.css
    - packages/design-tokens/src/tokens.test.ts
  modified:
    - packages/design-tokens/src/index.ts
    - packages/design-tokens/package.json

key-decisions:
  - "Use internal --semantic-* variables so Tailwind public namespaces never self-reference."
  - "Keep dark.css complete but outside the public CSS import chain until runtime dark mode is implemented."
  - "Expose Sheet viewport ratios in TypeScript because Base UI Drawer cannot consume dvh or CSS var snap points."

patterns-established:
  - "Components consume Tailwind semantic utilities; primitive palette variables stay behind semantic mappings."
  - "Real Tailwind compilation guards utility generation and prevents default palette regressions."

requirements-completed: [DS-01, DS-06]

duration: 3 min
completed: 2026-10-12
---

# Phase 1 Plan 2: Design Tokens Summary

**Three-layer semantic token system with Tailwind 4 `@theme inline`, an inactive dark slot, and compile-verified Sheet CSS/TypeScript contracts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-10-12T02:47:44Z
- **Completed:** 2026-10-12T02:51:07Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added the approved color, typography, spacing, sizing, radius, shadow, z-index, motion, and breakpoint inventories.
- Mapped every component-facing style through internal semantic variables and Tailwind 4 namespaces while removing default palette/radius/shadow/font/text/breakpoint utilities.
- Added a full `[data-theme="dark"]` override slot without importing or activating it.
- Added real Tailwind compilation tests proving `.bg-primary` resolves through `--semantic-color-primary` and `.text-zinc-600` is absent.
- Synchronized Sheet CSS contracts with typed `0.25`, `0.6`, `0.92`, and `160px` constants.

## Task Commits

1. **Task 1 RED: Token inventory guards** - `806fb48` (test)
2. **Task 1 GREEN: Primitive, semantic, component, and dark tokens** - `ccb274e` (feat)
3. **Task 2 RED: Tailwind compile and Sheet parity guards** - `54c1f22` (test)
4. **Task 2 GREEN: Tailwind theme and public exports** - `dd1980e` (feat)

## Files Created/Modified

- `packages/design-tokens/src/primitives.css` - Approved raw palette, spacing, and typography scales.
- `packages/design-tokens/src/semantic.css` - Light semantic mappings used by the design system.
- `packages/design-tokens/src/components.css` - Stable Sheet dimensions and viewport snap contracts.
- `packages/design-tokens/src/dark.css` - Complete, inactive dark semantic override slot.
- `packages/design-tokens/src/theme.css` - Tailwind 4 namespace reset and semantic utility exposure.
- `packages/design-tokens/src/index.css` - Ordered public CSS composition without dark mode.
- `packages/design-tokens/src/index.ts` - Base UI-compatible Sheet ratios and peek minimum.
- `packages/design-tokens/src/tokens.test.ts` - Inventory, self-reference, compile, palette, and CSS/TS parity guards.
- `packages/design-tokens/package.json` - CSS-aware package export and non-empty test command.

## Decisions Made

- Used separate internal `--semantic-*` names and public Tailwind namespace names to eliminate CSS self-reference.
- Kept breakpoint values literal in `@theme` because media queries cannot resolve breakpoints through `var()`.
- Kept spacing's built-in namespace available for structural zero utilities; component-level hard-coded spacing remains guarded by the UI package tests in later plans.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a CSS-aware package export**
- **Found during:** Task 2 (Tailwind theme export)
- **Issue:** The Wave 0 skeleton exported only `src/index.ts`, so consumers could not resolve the required public CSS entry through `@tripory/design-tokens`.
- **Fix:** Added `style`, `types`, and `default` export conditions and removed `--passWithNoTests` now that the package owns tests.
- **Files modified:** `packages/design-tokens/package.json`
- **Verification:** Tailwind compiled `@import "./index.css"`; package lint, typecheck, tests, and repository build passed.
- **Committed in:** `dd1980e`

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality).
**Impact on plan:** The export condition is required for the planned public CSS package contract; no feature scope was added.

## Issues Encountered

None. The expected TDD RED failures were resolved by the planned implementations.

## Known Stubs

None. The scan matched only the legitimate `placeholder` color token name.

## Threat Model Verification

- **T-01-03 (token mapping):** Mitigated by compiling candidate utilities with `@tailwindcss/node` and checking CSS-to-TypeScript Sheet parity.
- **T-01-04 (CSS self-reference):** Mitigated by separate semantic/public namespaces plus an explicit self-reference guard.
- No new network, authentication, file-access, schema, or other trust-boundary surface was introduced.

## Verification

- `pnpm --filter @tripory/design-tokens test` — PASS (8/8 tests; real Tailwind compilation included)
- `pnpm --filter @tripory/design-tokens lint` — PASS
- `pnpm --filter @tripory/design-tokens typecheck` — PASS
- `pnpm lint` — PASS (7/7 tasks)
- `pnpm typecheck` — PASS (7/7 tasks)
- `pnpm test` — PASS (7/7 tasks; design-tokens 8, config 76, ui-web 1, web 1)
- `pnpm build` — PASS (Next.js 16.4 production build)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Semantic utilities and Sheet constants are ready for Plan 01-03 atoms and subsequent molecule work.
- No blockers or unresolved high-severity threats remain.

---
*Phase: 01-design-system-ui-skeleton-walking-skeleton*
*Completed: 2026-10-12*

## Self-Check: PASSED

Verified all nine key files and all four TDD task commits exist.
