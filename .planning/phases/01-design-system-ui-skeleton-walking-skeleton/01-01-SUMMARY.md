---
phase: 01-design-system-ui-skeleton-walking-skeleton
plan: 01
subsystem: ui-toolchain
tags: [pnpm, turborepo, eslint, vitest, jsdom, atomic-design]

requires: []
provides:
  - pnpm 10.34.6 workspace with exact shared catalog versions
  - Default-deny uiPackage ESLint preset for component and token packages
  - Shared jsdom Vitest preset and UI package skeletons
affects: [design-tokens, ui-web, web-testing, phase-1-ui]

tech-stack:
  added: ["@base-ui/react 1.8.0", "jsdom 29.1.1", "Testing Library 16.3.3", "user-event 14.6.7"]
  patterns: [catalog-pinned-dependencies, atomic-ui-boundaries, shared-jsdom-preset]

key-files:
  created:
    - packages/config/vitest/ui-preset.mjs
    - packages/design-tokens/package.json
    - packages/ui-web/package.json
    - apps/web/vitest.config.ts
  modified:
    - package.json
    - pnpm-workspace.yaml
    - turbo.json
    - packages/config/eslint/boundaries.mjs
    - packages/config/test/boundaries.test.ts
    - ai-memories/tripory-fe--ddd-architecture.md

key-decisions:
  - "Keep allowBuilds with unrs-resolver disabled because pnpm 10.34.6 supports the map."
  - "Use one uiPackage preset with components and tokens roles; both remain default-deny."
  - "Keep React as a peer plus development dependency in ui-web and centralize every external version in the workspace catalog."

patterns-established:
  - "UI package boundaries: atoms cannot import molecules; design tokens cannot import React."
  - "DOM test packages merge @tripory/config/vitest/ui and own their setup/dependencies."

requirements-completed: [FND-01, FND-02, DS-02, DS-07]

duration: 1h 14m
completed: 2026-10-12
---

# Phase 1 Plan 1: Wave 0 UI Toolchain Summary

**Pinned pnpm 10 workspace with self-tested atomic UI boundaries, shared jsdom testing, and ready-to-fill design-token/UI package skeletons**

## Performance

- **Duration:** 1h 14m
- **Started:** 2026-10-12T01:31:07Z
- **Completed:** 2026-10-12T02:45:26Z
- **Tasks:** 3
- **Files modified:** 30

## Accomplishments

- Locked pnpm to 10.34.6, regenerated the lockfile from a clean install, preserved `allowBuilds`, and added `transit` to build inputs.
- Added `uiPackage({ role: 'components' | 'tokens' })` with 76 real-ESLint self-tests covering default-deny imports, atomic direction, DOM globals, and approved test setup imports.
- Added the shared jsdom Vitest preset, `design-tokens` and `ui-web` skeletons, aligned shadcn Base UI configs, and app-level testing setup.
- Restored and verified 472 local Next.js documentation files; read the installed Next 16.4 Vitest and workspace transpilation guides.

## Task Commits

1. **Task 1: Khóa pnpm 10 và cài lại workspace sạch** - `4f15d8a` (chore)
2. **Task 2 RED: Thêm failing UI boundary cases** - `d0c0376` (test)
3. **Task 2 GREEN: Thêm uiPackage() và self-test boundaries** - `744e555` (feat)
4. **Task 3: Tạo preset Vitest UI và package skeletons** - `b57e7d2` (feat)

## Files Created/Modified

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json` - pnpm 10, exact catalog versions, clean lockfile, and reliable build cache inputs.
- `packages/config/eslint/boundaries.mjs` - role-aware UI package preset with default-deny dependency and atomic layer rules.
- `packages/config/test/boundaries.test.ts` - 76 mutation-style ESLint integration tests.
- `packages/config/eslint/boundaries.d.mts` - public preset declarations for typed config tests.
- `packages/config/vitest/ui-preset.mjs` - shared jsdom test environment.
- `packages/design-tokens/*` - token package skeleton using node Vitest and token-role boundaries.
- `packages/ui-web/*` - React UI package skeleton using jsdom, approved runtime/test dependencies, and component-role boundaries.
- `apps/web/vitest.config.ts`, `apps/web/src/test/*`, `apps/web/components.json` - Next app test setup and aligned shadcn configuration.
- `ai-memories/tripory-fe--ddd-architecture.md` - UI package placement, allowlists, atomic direction, and updated self-test count.

## Decisions Made

- Retained `allowBuilds: { unrs-resolver: false }`; this is supported by pnpm 10.34.6 and avoids unnecessary install scripts.
- Used a single parameterized `uiPackage()` preset so component and token packages share deep-import/dynamic-import safeguards while keeping different allowlists.
- Did not add `@testing-library/jest-dom`; smoke tests use standard Vitest assertions as required.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a declaration for the ESLint preset module**
- **Found during:** Task 2 typecheck
- **Issue:** The TDD self-test imports `uiPackage()` directly, but the `.mjs` module had no declaration and failed TS7016.
- **Fix:** Added `packages/config/eslint/boundaries.d.mts` and included ESLint declarations in the config package tsconfig.
- **Files modified:** `packages/config/eslint/boundaries.d.mts`, `packages/config/tsconfig.json`
- **Verification:** `pnpm --filter @tripory/config typecheck` passed.
- **Committed in:** `744e555`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** The declaration only exposes existing preset types and was required for strict typechecking; no scope expansion.

## Issues Encountered

- The original dependency tree was incomplete. The authorized clean reinstall restored executable links, Next binaries, native packages, and local framework docs.
- Vitest reports a future-facing Vite warning for the Next app's ESM-style `vitest.config.ts`; tests pass and this does not affect current Vitest 4 behavior.

## Known Stubs

- `packages/design-tokens/src/index.ts` and `packages/ui-web/src/index.ts` intentionally export nothing. This plan only establishes package skeletons; later Phase 1 plans add tokens and components before those deliverables are considered complete.

## Verification

All commands were run from the repository root unless a filter is shown:

- `pnpm --version` — PASS (`10.34.6`)
- `pnpm install` — PASS (clean reinstall, lockfile regenerated)
- `pnpm install --frozen-lockfile` — PASS
- `pnpm --filter @tripory/web build` — PASS
- `pnpm --filter @tripory/config test` — PASS (76 tests)
- `pnpm --filter @tripory/config lint` — PASS
- `pnpm --filter @tripory/config typecheck` — PASS
- `pnpm --filter @tripory/design-tokens test` — PASS
- `pnpm --filter @tripory/ui-web test` — PASS (1 test)
- `pnpm --filter @tripory/web test` — PASS (1 test)
- `pnpm lint` — PASS (7/7 tasks)
- `pnpm typecheck` — PASS (7/7 tasks)
- `pnpm test` — PASS (7/7 tasks; config 76, ui-web 1, web 1)
- `pnpm build` — PASS (Next.js 16.4 production build)
- `(Get-ChildItem apps/web/node_modules/next/dist/docs -Recurse -File).Count` — PASS (`472`)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 toolchain is green and ready for Plan 01-02 design token implementation.
- No blocking threats or unresolved high-severity issues were introduced.

## Self-Check: PASSED

Verified all key created files and all four task/TDD commits exist.

---
*Phase: 01-design-system-ui-skeleton-walking-skeleton*
*Completed: 2026-10-12*
