---
phase: 04-itinerary-crud-editor
verified: 2026-10-29T04:41:54Z
status: human_needed
score: "2/5 roadmap truths fully verified; 3/5 automated-pass with manual-only residue; 0 failed"
overrides_applied: 0
verified_by_automation_itin_ids: [ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-06, ITIN-09, ITIN-10, ITIN-11, ITIN-12]
human_needed_itin_ids: [ITIN-05, ITIN-07, ITIN-08, ITIN-13, ITIN-14]
gap_count: 0
warning_count: 7
gaps: []
deferred:
  - truth: "ITIN-11 share dialog opens after publish"
    addressed_in: "Phase 5"
    evidence: "Decision D-40 (04-CONTEXT.md) and REQUIREMENTS.md ITIN-11 note: the share dialog moves to Phase 5 together with PUB-04. ROADMAP Phase 4 SC4 repeats this."
human_verification:
  - test: "Touch drag inside the bottom sheet on a real phone (iOS Safari + Android Chrome)"
    expected: "Long-press ~180 ms on the handle starts the drag, the sheet does not move, auto-scroll near the edge (UAT step 12, ITIN-08/ITIN-14, D-34)"
    why_human: "jsdom cannot emulate real touch gestures or Sheet vs dnd-kit gesture arbitration"
  - test: "Sheet 3 snap levels do not cover the header at 320x568 and 390x844; virtual keyboard does not hide the submit button"
    expected: "UAT step 12 / 23 (ITIN-14, D-14..D-16)"
    why_human: "Real viewport, safe-area and virtual-keyboard layout"
  - test: "Real Google short links from the Vercel deploy: pinned-point link and a POI link without coordinates"
    expected: "Pin link resolves to coordinates via /api/maps/resolve; POI link shows the D-48 sentence, auto-fills Name/Address (D-49), cannot save without coordinates (UAT steps 7, 8, ITIN-05)"
    why_human: "Depends on Google's real redirects and on the Vercel runtime (T-04-69); not reproducible with fakes"
  - test: "Close the tab within 5 s after deleting a waypoint (keepalive)"
    expected: "Waypoint is gone on the real BE; DevTools shows keepalive DELETE with Origin header (UAT step 10, ITIN-07, D-32, D-50, T-04-66)"
    why_human: "Browser lifecycle and real BE; fetch keepalive cannot be asserted end to end in jsdom"
  - test: "VoiceOver / NVDA reads the dnd announcements in Vietnamese"
    expected: "UAT step 11 (ITIN-08, D-34)"
    why_human: "Needs a real screen reader. Only the announcement strings are unit tested"
  - test: "Owner opens /itineraries/{id}/edit with a stale access token (D-45, D-46, Pitfall 11)"
    expected: "No false 403 for the owner's own draft; non-owner sees 403 for published and draft (UAT steps 19, 20, ITIN-13)"
    why_human: "Needs real BE behaviour (anonymous 403 for expired Bearer, 04-BE-DEPENDENCIES #7) and real token expiry"
  - test: "Run the full UAT checklist 04-UAT-CHECKLIST.md (plan 04-23, still pending) against the real BE"
    expected: "All 23 steps recorded PASS/FAIL by a human; section C filled in"
    why_human: "Plan 04-23 Task 2 is a human checkpoint. Every result cell is empty today"
---

# Phase 4: Itinerary CRUD & Editor Verification Report

**Phase Goal:** Người dùng đã đăng nhập tạo, sửa, sắp xếp và xuất bản một lịch trình thật bằng API BE, trên cả desktop và mobile.
**Verified:** 2026-10-29T04:41:54Z
**Branch:** `phase_4` (HEAD `6523ba2`, working tree clean before this file)
**Status:** human_needed
**Re-verification:** No, initial verification.

## Summary

All code paths for the 14 requirements exist, are substantive, are wired end to end and are covered by automated tests. No gap was found. The phase cannot be called `passed` because the manual-only checks listed in `04-VALIDATION.md` (phone touch drag, real BE, real Google short links incl. POI without coordinates, keepalive on tab close, VoiceOver, stale-token editor open) have not been run. Plan 04-23 (manual UAT) is pending and `04-UAT-CHECKLIST.md` has every result cell empty. None of these items is claimed as verified here.

## Fresh evidence (run in this verification)

| Check | Command | Result |
|---|---|---|
| lint + typecheck + test, all packages, no cache | `node_modules\@turbo\windows-64\bin\turbo.exe run lint typecheck test --force` | 24/24 tasks successful, 0 cached, 44.9 s |
| Tests per package | same | web 95 files / 1417 tests; itinerary 13 / 304; identity 9 / 244; ui-web 31 / 211; config 1 / 114; api-client 5 / 98; shared-kernel 2 / 32; design-tokens 1 / 19. All pass |
| Production build | `pnpm --filter @tripory/web build` | success. Routes present: `/api/maps/resolve` (dynamic), `/itineraries/mine`, `/itineraries/[id]/edit`, Proxy |
| Anti-pattern scan over 99 changed non-test source files (`git diff c3e993c HEAD`) | grep TODO/FIXME/placeholder/not-implemented | 0 real hits (one false positive: the word "hack" in a comment of `leave-guard.tsx`) |
| Static hollow-data check | grep for FE-side distance computation | None. `distanceKm` and `totalDistanceKm` come only from the BE DTO via `mappers.ts` (`dayDistanceKm`, `totalDistanceKm`) and are only formatted in the UI |

Note: plain root `pnpm lint|typecheck|test` crashes on this host (exit 3221226505); turbo was called through its binary as instructed.

## Goal Achievement: ROADMAP Success Criteria

| # | Success criterion | Status | Evidence |
|---|---|---|---|
| 1 | "Lịch trình của tôi" with pagination, All/Draft/Published filter, quick create then straight into editor, delete after confirmation | ✓ VERIFIED (automation) | `my-itineraries-view.tsx` (Tabs by `?status`, infinite scroll via IntersectionObserver, silent next-page error), `create-itinerary-dialog.tsx` (`router.push(/itineraries/{id}/edit)`, no toast), `delete-itinerary-dialog.tsx`; tests `my-itineraries-view`, `create-itinerary-dialog`, `delete-itinerary-dialog`, `itinerary-card`, `itinerary-hooks`, `http-itinerary-repository` |
| 2 | Editor: metadata, day switch/add, inline day subtitle, waypoint by pasting "lat, lng" or Google Maps link, per-day and total km from BE | ✓ VERIFIED (automation); ? real Google links manual | `trip-info-dialog.tsx`, `day-tabs.tsx`, `day-subtitle.tsx`, `waypoint-form-dialog.tsx`, `location-field.tsx`, `location-input.ts` (coordinates, `!3d!4d`, `@`, `/place/`, short link, no-coordinate), `maps-resolve.ts` + `maps-handlers.ts`; tests for each plus `location-input`, `maps-resolve`, `maps-handlers`, `trip-summary`. Real `maps.app.goo.gl` resolve is manual |
| 3 | Delete waypoint with 5 s undo; drag-drop reorder by mouse, touch and keyboard; rollback on BE error | ✓ VERIFIED mouse/keyboard/rollback (automation); ? touch and keyboard-with-screen-reader manual | `pending-delete.ts`, `use-pending-delete.ts`, `waypoint-list.tsx` (Mouse distance 4, Touch delay 180/tolerance 8, Keyboard sensors; `isValidDayOrder`; `InvalidReorderList` refetch), `react/index.ts` optimistic + snapshot + rollback + shared `scope`. Tests `pending-delete`, `use-pending-delete`, `waypoint-list` (StrictMode keyboard reorder, rollback, retry, cancel), `itinerary-hooks`. Real touch is manual |
| 4 | Always-visible Đang lưu / Đã lưu / Lỗi – Thử lại; leave warning while a request is running; publish with ≥ 1 waypoint after an irreversible confirmation; list shows "Đã xuất bản" (share dialog moved to Phase 5, D-40) | ✓ VERIFIED (automation) | `save-indicator.tsx` (`useIsMutating` on the shared write key + failure store), `leave-guard.tsx` (`beforeunload` only while dirty, in-app `LeaveEditorDialog`), `publish-button.tsx` (`canPublish`, `aria-disabled`), `publish-dialog.tsx` (`usePublish`, no share box), `editor-header.tsx` (published line, no publish button when `isPublic`). Tests `save-indicator`, `save-status`, `leave-guard`, `publish-button`, `publish-dialog`, `editor-header`, `itinerary-editor` |
| 5 | Non-owner sees no edit actions; on mobile the timeline lives in a multi-level bottom sheet and all steps remain possible | ✓ VERIFIED in jsdom; ? real devices and stale-token manual | `permissions.ts` `canEdit`, `itinerary-editor.tsx` (403/404/`canEdit` branches, `EditorForbidden`), edit `page.tsx` (GUID guard, no BE call from RSC, viewer `key`), `proxy.ts` protects `/edit`, `editor-layout.tsx` (Sheet `defaultSnap="medium"`, `insetTop` = measured header, `dismissible={false}`), `responsive-form-surface.tsx`. Tests `permissions`, `editor-forbidden`, `editor-layout`, `route-layouts`, `page`, `responsive-form-surface`, `sheet` (ui-web). Real phone layout, keyboard overlap and stale-token open are manual |

Roadmap score: 2/5 criteria fully verified (1, 4), 3/5 automated-pass with manual-only residue (2, 3, 5), 0 failed.

## Requirements Coverage (ITIN-01 .. ITIN-14)

Statuses: **verified** = verified by automated evidence; **human_needed** = automated part verified, manual-only part still open; **gap** = none.

| Req | Status | Evidence (files, tests) | Manual-only residue |
|---|---|---|---|
| ITIN-01 | **verified** | `my-itineraries-view.tsx`, `itinerary-card.tsx`, `cover-image.tsx`, `react/index.ts` `useMyItineraries` (per-status key, `getNextPageParam`), `parseStatusFilter` in domain; `my-itineraries-view.test`, `itinerary-card.test`, `cover-image.test`, `itinerary-hooks.test`, `http-itinerary-repository.test`, `itinerary.test`, `mine/page.test` | UAT steps 1, 3, 4, 22 observe the real BE (offset pagination caveat, 04-BE-DEPENDENCIES #3) |
| ITIN-02 | **verified** | `create-itinerary-dialog.tsx` (trim 1..100, Enter, locked after success, `router.push` to edit, no toast); `create-itinerary-dialog.test` (prefilled+selected, Enter submit, no toast, blank/over-100, pending lock, BE errors) | UAT step 2. Doc drift: `REQUIREMENTS.md` still shows ITIN-02 as `[ ]` / Pending although the code and tests satisfy it (see Warnings) |
| ITIN-03 | **verified** | `trip-info-dialog.tsx`, `form-schemas.ts` (https-only, ≤ 500), `cover-image.tsx` (`referrerPolicy=no-referrer`, fallback), `useUpdateMetadata`; `trip-info-dialog.test`, `form-schemas.test`, `cover-image.test`, `calendar-date.test` | UAT step 5 on the real BE |
| ITIN-04 | **verified** | `day-tabs.tsx` (sparse day range, add day optimistic), `day-subtitle.tsx` (Enter/blur/Esc/empty/>100), `day-range.ts`, `useAddDay`, `useSetDaySubtitle`; `day-tabs.test`, `day-subtitle.test`, `day-range.test`, `updates.test` | UAT step 6 |
| ITIN-05 | **human_needed** | Automated: `location-input.ts` + `location-input.test` (bare coordinates, full URL, `!3d!4d`, `@`, `/place/`, short link, `no-coordinate` D-48, Name/Address split D-49, exact host match), `location-field.tsx` + test, `waypoint-form-dialog.tsx` + test, `maps-resolve.ts` + `maps-handlers.ts` + tests (method, Origin, session, allowlist, ≤ 3 hops, 5 s, no destination fetch), `http-short-link-resolver.test`, `itinerary-invariants` (route is POST only) | **Real Google short links incl. a POI link without coordinates (D-48)** on the Vercel deploy; UAT steps 7, 8 |
| ITIN-06 | **verified** | `waypoint-form-dialog.tsx` edit mode (no day field), `useUpdateWaypoint`; `waypoint-form-dialog.test`, `itinerary-editor.test`, `http-itinerary-repository.test` | UAT step 9 |
| ITIN-07 | **human_needed** | Automated: `pending-delete.ts` (5 s commit, undo sends nothing, second delete commits the first, idempotent), `use-pending-delete.ts` (unmount, `pagehide`, `visibilitychange` flush), `notify.undoable` (ui-web), `useDeleteWaypoint` optimistic + rollback + scope, `HttpRequest.keepalive` in api-client + `bffUnloadHttp`; tests `pending-delete`, `use-pending-delete`, `toast` (ui-web), `fetch-http-client` (keepalive passed to fetch), `http.client`, `itinerary-hooks`, `itinerary-editor` | **Keepalive DELETE on tab close with `Origin` header on the real BE** (UAT step 10); see warning MD-01 |
| ITIN-08 | **human_needed** | Automated: `waypoint-list.tsx` + test (keyboard reorder in StrictMode, mouse sensor, optimistic order, flush of pending delete first, rollback + error toast + failed indicator, retry, Esc cancel, no-op drop, `InvalidReorderList` → info + refetch), `dnd-announcements.ts` + test (Vietnamese strings), `updates.ts` (`moveItem`, `isValidDayOrder`, `applyDayOrder`), `dnd-strict-mode` spike, `react/index.ts` rollback | **Phone touch drag, VoiceOver/NVDA reading, two-tab reorder on real BE** (UAT steps 11, 12, 17) |
| ITIN-09 | **verified** | `trip-summary.tsx` and `day-tabs.tsx` show `totalDistanceKm` / `dayDistanceKm` mapped from the BE DTO; no FE distance computation exists; `formatKm` vi-VN, hidden at 0; `trip-summary.test`, `day-tabs.test`, `format.test`, `mappers.test`, `dto.test` | UAT step 13 confirms the BE recomputes km after each write (BE behaviour, not FE logic) |
| ITIN-10 | **verified** | `save-indicator.tsx`, `save-status.ts`, `leave-guard.tsx` (`beforeunload` only when dirty, `Link onNavigate` guard, `LeaveEditorDialog`), `draft-storage.ts` + `use-form-draft.ts` (D-36); tests `save-indicator`, `save-status`, `leave-guard`, `draft-storage`, `user-menu` | UAT steps 14, 15, 16 (the session-expiry draft restore, D-36, needs real token expiry) |
| ITIN-11 | **verified** (share dialog deferred, not a gap) | `publish-button.tsx` (`canPublish` minus pending deletes, `aria-disabled`, hint), `publish-dialog.tsx` (irreversible confirmation, focus on "Hủy", `usePublish`, success toast), `editor-header.tsx`; tests `publish-button`, `publish-dialog`, `editor-header`, `permissions`, `itinerary-editor`, `itinerary-invariants` (no share UI) | Share dialog: Phase 5 by D-40. UAT step 18 on the real BE |
| ITIN-12 | **verified** | `delete-itinerary-dialog.tsx` (extra sentence when published, focus "Hủy", `removeQueries` + invalidate), used from the list card menu and the editor menu; `delete-itinerary-dialog.test`, `my-itineraries-view.test`, `itinerary-editor.test` | UAT step 21. See warning LW-01 |
| ITIN-13 | **human_needed** | Automated: `canEdit` in `permissions.ts` + test, `itinerary-editor.tsx` (BE 403 and `!canEdit` → `EditorForbidden`, 404 → `NotFoundView`), `editor-forbidden.tsx`, edit `page.tsx` (GUID guard, no RSC fetch, `key={viewer.id}`), `proxy.ts` `isProtectedPath`; tests `permissions`, `editor-forbidden`, `itinerary-editor`, `page`, `proxy`, `route-layouts`, `itinerary-invariants` | **Stale-token editor open (D-45, D-46, Pitfall 11) and non-owner 403 against the real BE** (UAT steps 19, 20; 04-BE-DEPENDENCIES #7) |
| ITIN-14 | **human_needed** | Automated: `editor-layout.tsx` + test (grid from `lg`, Sheet `defaultSnap="medium"`, `insetTop` from header measurement, non-modal), ui-web `sheet.tsx` (peek/medium/expanded, `insetTop` clamp) + `sheet.test`, `responsive-form-surface.tsx` + test (Dialog from `md`, Sheet below), `timeline-panel.test` | **Real iOS/Android devices, 320x568 and 390x844, virtual keyboard, touch drag in sheet** (UAT steps 12, 23) |

**Counts:** verified by automation = 9 (ITIN-01, 02, 03, 04, 06, 09, 10, 11, 12); human_needed = 5 (ITIN-05, 07, 08, 13, 14); gap = 0; orphaned requirements = 0 (REQUIREMENTS.md maps exactly ITIN-01..14 to Phase 4, all claimed by plans).

## Required Artifacts (spot check, three levels + data flow)

| Artifact | Exists | Substantive | Wired | Data flows | Status |
|---|---|---|---|---|---|
| `packages/itinerary/src/domain/*` (aggregate, `CalendarDate`, `buildDayRange`, `canEdit`/`canPublish`, `updates`, `parseLocationInput`) | ✓ | ✓ pure, tested | ✓ used by UI and hooks | n/a | ✓ VERIFIED |
| `packages/itinerary/src/infrastructure/*` (Zod DTO, mapper ACL, HTTP repository, short-link resolver) | ✓ | ✓ | ✓ via `apps/web/src/composition/itinerary.client.ts` | ✓ DTO → mapper → domain; km from BE | ✓ VERIFIED |
| `packages/itinerary/src/react/index.ts` (hook factory) | ✓ | ✓ optimistic, rollback, shared `scope` and `mutationKey` | ✓ imported by editor UI via composition | ✓ | ✓ VERIFIED |
| `apps/web/src/modules/itinerary/ui/*` (about 40 files) | ✓ | ✓ no stubs | ✓ `ItineraryEditor` assembles all; `MyItinerariesView` for the list | ✓ queries/mutations hit the repository | ✓ VERIFIED |
| `apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/*` and `(shell)/itineraries/mine/page.tsx` | ✓ | ✓ | ✓ build lists both routes | ✓ | ✓ VERIFIED |
| `apps/web/src/app/api/maps/resolve/route.ts` + `composition/server/maps-*.ts` | ✓ | ✓ | ✓ called by `HttpShortLinkResolver` | ✓ | ✓ VERIFIED (real Google manual) |
| `apps/web/src/proxy.ts` `/itineraries/{id}/edit` | ✓ | ✓ | ✓ | n/a | ✓ VERIFIED |
| `ui-web`: `notify.undoable`, `InlineAlert info`, `Sheet` `dismissible`/`defaultSnap`/`insetTop` | ✓ | ✓ | ✓ used by editor | n/a | ✓ VERIFIED |
| `api-client` `HttpRequest.keepalive` | ✓ | ✓ | ✓ used by `bffUnloadHttp` / `itineraryUnload` | n/a | ✓ VERIFIED (browser behaviour manual) |
| `04-UAT-CHECKLIST.md`, `04-BE-DEPENDENCIES.md` (plan 04-23 autonomous part) | ✓ | ✓ 23 steps, 11 BE items | ✓ cross-referenced | n/a | ✓ present; UAT results empty |

## Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `CreateItineraryDialog` | `/itineraries/{id}/edit` | `useCreateItinerary` → `router.push` | ✓ WIRED |
| `MyItinerariesView` | repository `listMine` | `useMyItineraries(status)` → `getNextPageParam` → IO sentinel | ✓ WIRED |
| `ItineraryEditor` | BE detail | client `useItinerary` through `appHttp` (BFF, refresh + replay), no RSC fetch | ✓ WIRED |
| `WaypointList` | BE reorder | `useReorderWaypoints` (optimistic, shared scope after pending DELETE flush) | ✓ WIRED |
| `usePendingDelete` | BE delete | `useDeleteWaypoint` (normal) / `itineraryUnload.deleteWaypoint` (pagehide) | ✓ WIRED |
| `SaveIndicator` / `leave-guard` | write mutations | `useIsMutating({ mutationKey: itineraryKeys.write(id) })` | ✓ WIRED |
| `PublishButton` → `PublishDialog` | BE publish | `canPublish` → `usePublish` → refetch flips `isPublic` | ✓ WIRED |
| `LocationField` | short-link resolver | `useResolveShortLink` → `/api/maps/resolve` → `parseLocationInput` again | ✓ WIRED |
| `EditorLayout` | `Sheet` | `insetTop` from `ResizeObserver` header height | ✓ WIRED |
| Domain/infrastructure/ui boundaries | ESLint boundaries | `lint` passes with boundary rules and self-tests (`@tripory/config` 114 tests) | ✓ ENFORCED |

## Review Findings (04-REVIEW.md, 04-REVIEW-GATE.json)

Gate verdict `APPROVED`: 0 blocker, 0 high, 1 medium, 6 low. `04-REVIEW-FIX.md` does not exist, so no review fix was applied; all seven findings are still open in the code. I confirmed MD-01 and LW-01 by reading the current source.

| Id | Severity | Confirmed in code | Effect on the goal |
|---|---|---|---|
| MD-01 | medium | ✓ `use-pending-delete.ts`: `visibilitychange` → `flush("unload")` → `itineraryUnload.deleteWaypoint(...).catch(() => undefined)`: no session refresh, errors dropped, no cache or save-status update | Warning, not a gap. Tab switch with a stale token can silently lose the pending delete and the waypoint reappears. D-50 and D-32 are locked; the review argues the non-refreshing path should be `pagehide` only. Undo and the 5 s delete still work in the normal case, so ITIN-07 holds |
| LW-01 | low | ✓ `itinerary-editor.tsx` `handleDeleteItinerary` calls `pending.flush()` before opening the dialog | Warning. Cancelling the dialog does not restore the waypoint; possible spurious 404 error |
| LW-02 | low | not re-read | Old title/cover shown for one round trip after metadata save |
| LW-03 | low | not re-read | Back button may land on settings after in-editor navigation |
| LW-04 | low | not re-read | Resolve route parses body before the 2 KB check (authenticated, same-origin only) |
| LW-05 | low | not re-read | `GOOGLE_HOST` regex duplicated; `[a-z]{2}` wider than needed |
| LW-06 | low | not re-read | `flush()` may report `LOCATION_REQUIRED` while a short link is resolving; comment id typo; unused `reorderWaypoints` export |

No finding contradicts a locked decision (D-01..D-51), and none breaks a requirement, so none is counted as a gap. Recommend `/gsd-code-review-fix 4` for MD-01 at least, before or after UAT.

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Whole workspace lint, typecheck, test | `turbo.exe run lint typecheck test --force` | 24/24 successful | ✓ PASS |
| Production build with both Phase 4 routes and `/api/maps/resolve` | `pnpm --filter @tripory/web build` | success | ✓ PASS |
| Running app, real BE, real Google, devices | n/a | not run | ? SKIP (routed to human verification) |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `apps/web/src/modules/itinerary/ui/use-pending-delete.ts` | 70, 92-94 | unload path used for `visibilitychange` | ⚠️ Warning (MD-01) | Possible silent loss of a pending delete on tab switch with stale token |
| `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx` | ~307 | flush before confirm | ⚠️ Warning (LW-01) | Irreversible even when the dialog is cancelled |
| others | n/a | stubs, TODO, placeholder, hollow props, hardcoded empty data flowing to render | none found | n/a |

## Human Verification Required

Plan 04-23 Task 2 (manual UAT of `04-UAT-CHECKLIST.md`) is pending. These items must be run by a person; none is claimed verified:

1. **Phone touch drag in the sheet** (iOS Safari, Android Chrome): long-press ~180 ms, sheet does not move, auto-scroll (steps 11-12; ITIN-08, ITIN-14).
2. **Sheet layout on real viewports** 320x568 and 390x844, header not covered, virtual keyboard does not hide submit (steps 12, 23; ITIN-14).
3. **Real BE end to end**: create, edit, reorder, delete, publish, delete itinerary (steps 1-6, 9, 13-14, 17-18, 21-22).
4. **Real Google short links** from the Vercel HTTPS deploy, including a POI link without coordinates and the UX risk note (steps 7, 8; ITIN-05; D-48, D-49, D-51).
5. **Keepalive on tab close** with `Origin` header visible in DevTools (step 10; ITIN-07; T-04-66).
6. **VoiceOver / NVDA** reading the Vietnamese drag announcements (step 11; ITIN-08).
7. **Stale-token editor open** for the owner, plus non-owner 403 (steps 19, 20; ITIN-13; D-45, D-46).
8. **Session expiry with an open form** restores the draft (step 16; D-36), and **two tabs** (step 17; D-37).

## Gaps Summary

No gaps. Warning-level items for the finalize step:

- `REQUIREMENTS.md` still marks ITIN-02 as `[ ]` and "Pending" in the traceability table although the implementation and tests exist. Update it when finalizing (ITIN-02 is verified by automation; the UAT step 2 remains).
- `04-REVIEW-FIX.md` is absent; the seven review findings (MD-01 first) are open and non-blocking.
- `04-VALIDATION.md` row 04-23 stays `⬜ pending` until UAT is recorded.
- Overall `human_needed` clears only when a person fills in `04-UAT-CHECKLIST.md` with all PASS (or FAILs are turned into `/gsd-plan-phase 4 --gaps`).

---

_Verified: 2026-10-29T04:41:54Z_
_Verifier: Claude (gsd-verifier)_
