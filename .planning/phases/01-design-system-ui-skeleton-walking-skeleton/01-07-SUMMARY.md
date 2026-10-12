---
phase: 01-design-system-ui-skeleton-walking-skeleton
plan: 07
subsystem: ui
tags: [nextjs, app-router, react, accessibility, responsive-shell, tdd]

requires:
  - phase: 01-06
    provides: Server-safe ui-web exports, Skeleton, EmptyState, ErrorState, and Avatar
provides:
  - Responsive public and dashboard AppShell with sticky header and skip link
  - Static non-interactive UserMenu and real-only home navigation
  - Walking routes for / and /itineraries/mine
  - Next 16.4 loading, retry error, global error, root 404, metadata, font, and icon conventions
affects: [identity, itinerary-dashboard, public-pages, vercel-deploy]

tech-stack:
  added: []
  patterns: [route-group-shell-composition, retry-error-boundary, root-only-unmatched-404, semantic-token-organisms, tdd-red-green]

key-files:
  created:
    - apps/web/src/components/app-shell.tsx
    - apps/web/src/components/app-header.tsx
    - apps/web/src/components/user-menu.tsx
    - apps/web/src/app/(public)/page.tsx
    - apps/web/src/app/(dashboard)/itineraries/mine/page.tsx
    - apps/web/src/app/not-found.tsx
    - apps/web/src/app/global-error.tsx
  modified:
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/globals.css

key-decisions:
  - "Keep UserMenu as a static Avatar and account label with no button, menu, link, or fake identity."
  - "Use Next.js 16.4 retry() for every recoverable route error and never expose Error details."
  - "Use only root app/not-found.tsx for unmatched URLs; omit route-group not-found handlers per the authoritative execution request."
  - "Keep AppHeader navigation limited to the existing root route while /itineraries/mine remains directly addressable."

patterns-established:
  - "Route groups select an AppShell variant while the top-level root layout owns html, Vietnamese metadata, Inter, and global CSS."
  - "Loading skeletons stay decorative under one status announcement; error boundaries pass only retry into fixed-copy ErrorState."

requirements-completed: [FND-03, FND-04, DS-05, DS-06, DS-07]

duration: 20 min
completed: 2026-10-12
---

# Phase 1 Plan 7: App Shell and Walking Routes Summary

**Responsive semantic-token AppShell with static account identity, two real routes, and Next.js 16.4 retry/loading/root-404 conventions**

## Performance

- **Duration:** 20 min
- **Started:** 2026-10-12T03:54:00Z
- **Completed:** 2026-10-12T04:13:53Z
- **Tasks:** 3
- **Files modified:** 36 (including 7 intentional scaffold deletions)

## Accomplishments

- Added responsive public/dashboard shells with 100vh fallback plus 100dvh, safe-area padding, 16/24/32px semantic gutters, 1200px maximum width, sticky header, and keyboard skip link.
- Added a single real wordmark destination and a static UserMenu that presents no false session or interactive affordance.
- Added `/` and `/itineraries/mine` with locked no-CTA content, Vietnamese metadata, self-hosted Inter subsets, semantic CSS composition, and Tripory SVG icon.
- Added route-group Skeleton loading and fixed-copy error states, plus global error and root-only unmatched-route 404 handling using Next.js 16.4 `retry()`.

## Task Commits

1. **Task 1 RED: Organism contracts** - `93a9cb8` (test)
2. **Task 1 GREEN: AppShell, AppHeader, and UserMenu** - `8eb5ea1` (feat)
3. **Task 2 RED: Walking route contracts** - `81ac0f1` (test)
4. **Task 2 GREEN: Root layout and walking routes** - `a942140` (feat)
5. **Task 3 RED: Route convention contracts** - `17ae53d` (test)
6. **Task 3 GREEN: Loading, errors, and root 404** - `7555e36` (feat)

## Files Created/Modified

- `apps/web/src/components/app-shell.tsx` - Responsive app frame, skip link, semantic gutters, and main landmark.
- `apps/web/src/components/app-header.tsx` - Sticky 64px header with only the real `/` destination and active-page semantics.
- `apps/web/src/components/user-menu.tsx` - Non-interactive neutral Avatar and “Tài khoản” label.
- `apps/web/src/app/layout.tsx` - Vietnamese root document, Inter font, and Tripory metadata.
- `apps/web/src/app/globals.css` - Tailwind, design-token, and ui-web stylesheet composition.
- `apps/web/src/app/(public)/*` - Public shell, minimal home page, Skeleton loading, and retry error boundary.
- `apps/web/src/app/(dashboard)/*` - Dashboard shell, neutral itinerary empty state, Skeleton loading, and retry error boundary.
- `apps/web/src/app/not-found.tsx` - Sole unmatched-URL handler with public shell and real home link.
- `apps/web/src/app/global-error.tsx` - Full document fallback with font/styles and retry recovery.
- `apps/web/src/app/icon.svg` - Coral Tripory “T” app icon.
- `apps/web/src/app/**/*.test.tsx`, `apps/web/src/components/*.test.tsx` - Route, callback, content, landmark, and static-slot contracts.
- Removed default `app/page.tsx`, `favicon.ico`, and five create-next-app SVG assets intentionally.

## Decisions Made

- UserMenu remains static until real identity is introduced; it has no trigger, menu, action, fake name, or fake avatar data.
- The wordmark is the only AppHeader destination because `/itineraries/mine` is intentionally direct-access only in Phase 1.
- Error boundaries accept the framework props but pass only `retry` into ErrorState, preserving fixed copy and preventing detail disclosure.
- Root `app/not-found.tsx` is the only not-found handler, matching the authoritative request and Next 16.4 unmatched-route behavior.

## Deviations from Plan

### Plan Adjustment

**1. Authoritative request overrode route-group not-found files**
- **Found during:** Task 3
- **Issue:** `01-07-PLAN.md` listed route-group `not-found.tsx` files, while the authoritative execution request explicitly said not to add any other not-found handlers.
- **Adjustment:** Added only `apps/web/src/app/not-found.tsx`; no `(public)` or `(dashboard)` not-found handlers were created.
- **Verification:** File search finds only the root source handler; runtime `/khong-ton-tai` returns HTTP 404 with root 404 behavior covered by DOM tests.
- **Committed in:** `7555e36`

**Total deviations:** 1 plan adjustment driven by the authoritative user requirement. **Impact:** Less duplicate convention surface; unmatched and expected 404 handling remains centralized at root.

## Issues Encountered

None. Vitest continues to emit the pre-existing Vite native-config advisory, but all tests and gates pass.

## Known Stubs

None. The itinerary page intentionally uses the approved `EmptyState` until Phase 4 provides real itinerary data; it fulfills this plan’s locked walking-skeleton goal and is not an unwired mock.

## Threat Model Verification

- **T-01-13 (information disclosure):** Error UIs render fixed `ErrorState` copy only; source scan confirms no `message`, `digest`, or `stack` output.
- **T-01-14 (spoofing):** UserMenu is non-interactive and contains only a neutral account label/avatar fallback.
- **T-01-15 (route tampering):** Next production build and route tests pass; no debug trigger or development route exists.
- No endpoint, authentication path, file-access path, schema, or other new production trust boundary was introduced.

## Verification

- `pnpm --filter @tripory/web test -- components` — PASS (3 files, 5 tests).
- `pnpm --filter @tripory/web test -- app` — PASS (12 files, 15 tests at task verification).
- `pnpm --filter @tripory/ui-web test -- token-guard` — PASS (32 tests; all organisms use semantic/component tokens).
- `pnpm lint` — PASS (7/7 tasks).
- `pnpm typecheck` — PASS (7/7 tasks; Next route types generated).
- `pnpm test` — PASS (7/7 tasks; web 14 files/17 tests, ui-web 133, config 76, design-tokens 8).
- `pnpm build` — PASS; static routes `/`, `/_not-found`, `/icon.svg`, and `/itineraries/mine` generated.
- Managed production-server smoke — PASS: `/` = 200, `/itineraries/mine` = 200, `/khong-ton-tai` = 404; process stopped afterward.
- Production CSS scan — PASS: emitted CSS contains `--semantic-color-primary` and semantic primary utilities.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AppShell and route conventions are ready for Vercel deployment in Plan 01-08.
- No unresolved blocker or high-severity threat remains.

---
*Phase: 01-design-system-ui-skeleton-walking-skeleton*
*Completed: 2026-10-12*
## Self-Check: PASSED

Verified all seven key implementation files, the summary, and all six TDD task commits exist.