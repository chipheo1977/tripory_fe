---
phase: 04-itinerary-crud-editor
verified: 2026-10-29T04:41:54Z
status: passed
score: "5/5 roadmap truths verified (2 by automation, 3 by automation plus manual UAT); 0 failed"
overrides_applied: 0
verified_by_automation_itin_ids: [ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-06, ITIN-09, ITIN-10, ITIN-11, ITIN-12]
human_needed_itin_ids: []
verified_by_uat_itin_ids: [ITIN-05, ITIN-07, ITIN-08, ITIN-13, ITIN-14]
uat_confirmed: "2026-10-30, 23/23 PASS, người chạy xác nhận thủ công, không đính kèm ảnh chụp"
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
**Ghi chú 2026-10-30:** PUB-02 được chuyển từ Phase 5 vào phạm vi Phase 4 sau khi xác minh này; báo cáo chưa phủ PUB-02.
**Status:** passed (cập nhật 2026-10-30: `human_needed` → `passed`)
**Re-verification:** Cập nhật trạng thái sau UAT thủ công. Phần kiểm tự động ở dưới giữ nguyên, không chạy lại.

> **Cập nhật 2026-10-30:** Người chạy UAT xác nhận PASS 23/23 bước trong `04-UAT-CHECKLIST.md` (bước 2 từng lỗi, đã sửa). Các tiêu chí ITIN-05, ITIN-07, ITIN-08, ITIN-13, ITIN-14 trước đây `human_needed` nay được UAT xác nhận (bước 7–8, 10, 11–12 và 17, 19–20, 12 và 23). Bằng chứng là xác nhận thủ công, không đính kèm ảnh chụp; model máy và công cụ đọc màn hình do người chạy tự điền. Các cảnh báo MD-01, LW-01 … LW-06 ở dưới vẫn mở, không chặn. Các đoạn "pending" / "chưa chạy" trong phần còn lại của tệp phản ánh thời điểm kiểm ban đầu 2026-10-29.

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

---

## Xác minh lại phần mở lại 2026-10-30 (plans 04-26..04-41)

**Ngày:** 2026-11-05 · **Nhánh:** `phase_4` · **Phương pháp:** đọc kế hoạch, SUMMARY, kết quả gate tự động và UAT; không dùng agent verifier riêng (không có công cụ sinh agent trong môi trường này). Phần xác minh ban đầu ở trên (ITIN-01..14, 2026-10-29) giữ nguyên.

**Trạng thái phần mở lại:** `passed` cho ITIN-02 và ITIN-03 ở mức tự động và UAT local; còn tồn đọng ghi ở "Chưa kiểm / tồn đọng".

### Sự thật cần đạt (từ 04-40 và 04-CONTEXT D-59..D-107)

| # | Sự thật | Bằng chứng | Trạng thái |
|---|---------|------------|------------|
| 1 | Modal tạo 4 khối (điểm đến 34 mục, tên mặc định, 1-30 ngày, sở thích), gửi một request, vào editor đủ Ngày 1..N, không toast | 04-26 (domain), 04-29 (danh mục), 04-33..04-37 (schema, khối, accordion, dialog); test `create-itinerary-dialog`, `use-create-itinerary-form`, `destination-block`, `trip-dates-block`; UAT 2', 2a, 2b PASS | ✓ |
| 2 | "Thông tin chuyến đi" tự lưu, không nút Lưu; lưới 5 ảnh lưu ngay; lỗi hiện kèm "Thử lại"; đóng khi còn lỗi thì chỉ báo header | 04-35, 04-36, 04-38; test `metadata-autosave`, `use-metadata-autosave`, `trip-info-dialog`, `cover-*`; UAT 5a, 5b, 5c PASS | ✓ |
| 3 | Điểm đến và sở thích không hiện ở thẻ và editor; ảnh mặc định rơi về nền dự phòng | 04-30, 04-31; test `cover-image`, `destination-cover`; UAT 4a PASS | ✓ |
| 4 | Không bản nháp metadata; `PUT` không gửi điểm đến, sở thích, `coverImageUrl` | `itinerary-invariants.test.ts` (case 8, 10); UAT 5a, 16a PASS | ✓ |
| 5 | Mọi lời gọi BE qua BFF, không token ở client, ranh giới ESLint nguyên vẹn | `auth-invariants`, `itinerary-invariants` (case 9, 11), `packages/config` không đổi | ✓ |

### Bằng chứng tự động (chạy lại 2026-11-05 trên HEAD `723f08f` cộng working tree của người dùng)

`turbo.exe run lint typecheck test --force --continue`: 23/24 task xanh.

| Gói | Test |
|-----|------|
| shared-kernel | 32 |
| design-tokens | 20 |
| api-client | 98 |
| itinerary | 21 file, 427 |
| identity | 244 |
| config | 114 |
| web | 114 file, 1741 |
| ui-web | 341 đạt, **1 đỏ** (`token-guard.test.ts` cho `packages/ui-web/src/molecules/toast.tsx`) |

- Test đỏ của ui-web do thay đổi CHƯA COMMIT của người dùng trong `toast.tsx` (lớp `pr-8`, `size-6` là spacing số, vi phạm guard token). Bản `toast.tsx` đã commit (`f29f66e`) không có hai lớp này. Tôi không sửa vì đó là việc đang làm dở của người dùng (đi kèm `apps/web/src/app/zz-toast-harness/` chưa theo dõi).
- Hồi quy thật đã sửa: `549902a` (chân form modal) thêm biến `--footer-bleed` trên phần tử làm đỏ guard `design-tokens`. Đã khai báo trong `runtimeVariables` ở `tokens.test.ts` (commit `723f08f`).
- `turbo.exe run build`: exit 0 ở 04-39 (commit `e8a5ce5`). Chưa chạy lại sau các commit của người dùng và harness chưa commit.

### Review

- `04-REVIEW-REOPENED-FIX.md` (người dùng): WR-01..WR-04 đã sửa (`fb92fea`, `09780af`, `fcfe3ee`, `3c87732`); Info IN-01..IN-11 chưa sửa. File `04-REVIEW-REOPENED.md` mà báo cáo tham chiếu không có trong thư mục phase.
- Tôi không chạy `gsd-code-review` mới cho phần mở lại (đã có review của người dùng; cổng này chỉ khuyến nghị). `04-REVIEW.md` và `04-REVIEW-GATE.json` vẫn là của lượt 2026-10-29.

### UAT

Mục D của `04-UAT-CHECKLIST.md`: 8/8 bước (2', 2a, 2b, 4a, 5a, 5b, 5c, 16a) PASS do người dùng xác nhận (`approved`). Chạy trên BE local. Mục C (kết luận, thiết bị) của phần mở lại do người dùng tự điền. `04-UAT-CHECKLIST.md` còn thay đổi chưa commit.

### Chưa kiểm / tồn đọng

1. **BE thật đã deploy:** chưa. `04-BE-CONTRACT.md` mục 13 chỉ tick 1/12; mục 6-11 (gọi API thật) chưa chạy. UAT dùng BE local.
2. **Ảnh điểm đến thật:** D-106/D-105 ngoài phạm vi (Deferred). Trong lúc làm, người dùng đã thêm ảnh (`39a9ab9`), chưa kiểm ở đây.
3. **PUB-02** (chuyển từ Phase 5 vào Phase 4 ngày 2026-10-30): chưa có plan. `REQUIREMENTS.md` vẫn ghi Pending. Phase 4 chưa đủ theo yêu cầu cho tới khi PUB-02 được lập kế hoạch hoặc chuyển lại Phase 5.
4. `REQUIREMENTS.md` vẫn ghi ITIN-02, ITIN-03 là Pending dù đã đạt.
5. Cảnh báo cũ MD-01, LW-01..LW-06 còn mở.

---

## Xác minh lại phần mở lại lần 2 (2026-11-05, plans 04-42..04-53, PUB-06)

**Ngày:** 2026-11-06 · **Nhánh:** `phase_4` · **HEAD:** `048da79` · **Phương pháp:** tự làm theo `gsd-verifier.md` (không có sub-agent): đọc 12 PLAN (`must_haves.truths`), `04-53-SUMMARY.md`, mục E của `04-UAT-CHECKLIST.md`; chạy lại lint/typecheck/test/build từng gói; đối chiếu mã và bản build. Phần ở trên và phần mở lại lần 1 giữ nguyên.

**Trạng thái phần mở lại lần 2:** `passed` cho PUB-06 ở mức tự động và UAT thủ công của người dùng (E1..E14 PASS). Phần chưa kiểm trên thiết bị thật ghi ở "Chưa kiểm / tồn đọng" bên dưới; không phần nào bị coi là đã kiểm.

### Sự thật cần đạt (từ `must_haves.truths` của 04-42..04-53 và D-111..D-140)

| # | Sự thật | Bằng chứng | Trạng thái |
|---|---------|------------|------------|
| 1 | 8 token màu ngày, kích thước pin/chấm/nhãn, độ mờ; tương phản ≥ 4.5:1 với chữ trắng; `dark.css` không ghi đè (04-42) | `@tripory/design-tokens` test 33/33; token `caption` 12px thêm ở 04-53 (`ccf6291`) | ✓ |
| 2 | Domain thuần: `dayColorIndex`, `buildMapPins`, `buildDayRoutes`, `fitTargetFor`, `defaultEditorTab`, `summarizeDays`, tâm/bbox 34 tỉnh (04-43) | `@tripory/itinerary` test 523/523 (23 file); hàm nằm ở tầng domain, ESLint ranh giới xanh | ✓ |
| 3 | `maplibre-gl` 6.16.0 và `react-map-gl` 8.1.3 qua `catalog:`; style riêng trỏ OpenFreeMap, lọc ranh giới/nhãn Hoàng Sa, Trường Sa, hai nhãn chủ quyền đúng chuỗi và toạ độ (04-44) | `ui/map/basemap-style.ts` (`SOVEREIGNTY_LABEL_TEXTS`) và `basemap-style.test.ts` (đối chiếu hai nhãn tại [112.0, 16.5] và [114.5, 10.0], điểm mẫu trong/ngoài mask); `@tripory/web` test 1986/1986 | ✓ (xác nhận bằng mắt: E2, người dùng) |
| 4 | `ui-web`: `MapPin`, `MapToneDot`, `MapZoomControls`, `Sheet` `snap`/`onSnapChange`, `snapHeightPx`, tương thích ngược (04-45) | `map-pin.tsx`, `map-zoom-controls.tsx`; `@tripory/ui-web` test 377/377 | ✓ |
| 5 | `TripMap` client-only (`next/dynamic` ssr false), worker dạng asset, lỗi/loading, reduced motion (04-46) | `ui/map/trip-map.lazy.tsx`, `trip-map.tsx`; build có `maplibre-gl-worker.*.mjs` (519 KB) trong `.next/static`; E11, E14 PASS | ✓ |
| 6 | Tab "Tổng quan", `OverviewSummary`, `DayOverviewRow`, `OverviewPanel` chỉ xem (04-47) | `overview-summary.tsx`, `overview-panel.tsx`, `day-overview-row.tsx`, `day-tabs.tsx` + test; E5 PASS | ✓ (xem Deviation về nút bánh răng) |
| 7 | Ô "Ngày" trong form thêm mở từ Tổng quan, form sửa không đổi (04-48) | `waypoint-form-dialog.tsx` + test; E7 PASS | ✓ |
| 8 | Bố cục: bản đồ phủ vùng phải từ `lg`, nền `fixed` dưới `lg`, vùng an toàn theo mức sheet; `EditorMapArea` đủ loading/empty/error (04-49) | `editor-layout.tsx`, `editor-map-area.tsx`, `editor-map-viewport.ts` + test; E8, E9, E13 PASS | ✓ |
| 9 | Chọn điểm đồng bộ danh sách↔pin, tách `DayPanel` (04-50) | `waypoint-list.tsx` (`selection`), `day-panel.tsx` + test | ✓ |
| 10 | Nối vào editor: tab mặc định, đồng bộ chọn, canh khung, thêm từ Tổng quan (04-51) | `itinerary-editor.tsx`, `use-map-camera.ts`, `editor-map-pins.ts` + test; E6, E7 PASS | ✓ (dòng nổi khi bấm pin ở Tổng quan và cuộn thẻ vào khung: chỉ unit test) |
| 11 | Cổng lint/typecheck/test từng gói, build tách bundle, mục E trong checklist (04-52) | Bảng lệnh bên dưới; manifest client của `/itineraries/[id]/edit` có maplibre, của `/itineraries/mine` không (0 lần khớp) | ✓ |
| 12 | UAT E1..E14 có kết quả PASS/N/A, không FAIL tồn đọng (04-53) | Mọi ô E1..E14 là PASS (do người dùng xác nhận); các lỗi phát sinh sửa ở 10 commit `b2b4228`..`bfc5bcd` | ✓ (xác nhận của người dùng, không có ảnh chụp trong repo) |

**Yêu cầu:** PUB-06 là ID duy nhất trong frontmatter của 04-42..04-53, đã khai báo ở cả 12 plan; `REQUIREMENTS.md` ánh xạ PUB-06 vào Phase 4. Không có ID mồ côi. PUB-02 đã về lại Phase 5 (2026-11-05), nên tồn đọng số 3 của phần mở lại lần 1 không còn thuộc Phase 4.

**Bất biến:** không `dangerouslySetInnerHTML`, `localStorage`, `window.location` hay `fetch(` trong các file `*map*.tsx` của editor; mọi lời gọi BE vẫn qua BFF; ESLint ranh giới xanh (`@tripory/config` 114 test, lint 0 lỗi mọi gói). E10 (Network chỉ có tile/TileJSON/glyph tới `tiles.openfreemap.org`, không mang dữ liệu lịch trình) do người dùng xác nhận.

### Bằng chứng tự động (chạy lại 2026-11-06 trên HEAD `048da79`, Windows, `pnpm --filter <gói>`)

| Gói | lint | typecheck | test |
|-----|------|-----------|------|
| `@tripory/shared-kernel` | 0 | 0 | 32/32 |
| `@tripory/design-tokens` | 0 | 0 | 33/33 |
| `@tripory/api-client` | 0 | 0 | 98/98 |
| `@tripory/itinerary` | 0 | 0 | 523/523 |
| `@tripory/identity` | 0 | 0 | 244/244 |
| `@tripory/config` | 0 | 0 | 114/114 |
| `@tripory/ui-web` | 0 | 0 | 377/377 |
| `@tripory/web` | 0 (1 warning cũ ở `day-tabs.test.tsx`) | 0 | 1986/1986 (128 file) |
| `pnpm --filter @tripory/web build` | exit 0, có route `/itineraries/[id]/edit` và `/itineraries/mine` | | |

- Cổng hồi quy các phase trước (1-3) nằm trong các gói trên (identity, api-client, shared-kernel): xanh.
- `pnpm` ở gốc repo (turbo) crash trên máy này, nên chạy từng gói. Lần chạy của `@tripory/web` gồm cả thay đổi chưa commit của người dùng ở `day-overview-row.tsx` và `overview-panel.tsx` (kiểu dáng dòng ngày); test vẫn xanh.
- Không có TODO/FIXME mới được rà trong phạm vi này ngoài các file đã liệt kê; không chạy lại quét 99 file của lượt đầu.

### Deviations so với plan (đã ghi ở `04-53-SUMMARY.md`)

1. Mười commit sửa lỗi UAT ngoài plan (`b2b4228`, `d229e8b`, `0b94d9c`, `cb8812e`, `55a168e`, `252d047`, `814ef46`, `afe3de2`, `ccf6291`, `bfc5bcd`).
2. Nút "Sửa thông tin" ở Tổng quan thành nút bánh răng trên bản đồ (`MapEditInfoButton`, cột điều khiển phải trên), theo yêu cầu người dùng; trái với truth 6 của 04-47 ("nút Sửa thông tin" trong khối), dòng E5 và UI-SPEC đã cập nhật.
3. Cử chỉ sheet đổi: vuốt nội dung chỉ cuộn, kéo bằng tay cầm hoặc hàng tab; sheet có một vùng cuộn.
4. Thêm token `caption` 12px, UI-SPEC có 5 cỡ chữ thay vì 4. Nút zoom 48px → 32px (lệch truth 5 của 04-45, UI-SPEC đã cập nhật).
5. Lớp `park` của OSM gần Hoàng Sa: người dùng duyệt giữ nguyên.

### Review

Không chạy `gsd-code-review` mới cho 04-42..04-53. `04-REVIEW.md` và `04-REVIEW-GATE.json` vẫn là của lượt 2026-10-29 (HEAD `6523ba2`); các commit sửa lỗi UAT chưa qua review độc lập. Khuyến nghị chạy `/gsd-code-review 4` trước khi merge.

### Chưa kiểm / tồn đọng

1. **Thiết bị thật:** iOS Safari và Android Chrome (vùng an toàn, thanh địa chỉ co giãn, home indicator, kéo sheet bằng cảm ứng thật) chưa được agent kiểm; các sửa cử chỉ sheet (`afe3de2`) chỉ chạy Chrome headless với cảm ứng giả lập (CDP). E4 và E13 do người dùng xác nhận, không ghi model máy hay ảnh chụp.
2. **E12, E13, E14:** chỉ có xác nhận của người dùng, agent không chạy lại (bàn phím + NVDA/VoiceOver, smoke 4 kích thước, console WebGL/worker).
3. **Ảnh chụp:** truth 1 của 04-53 yêu cầu ảnh chụp E2; repo không có ảnh nào. Bằng chứng E2 là xác nhận của người dùng.
4. **BE thật trong editor:** các lần chạy Chrome của agent dùng BFF giả lập; dữ liệu BE thật chỉ được người dùng thấy khi UAT.
5. **Review độc lập** cho phần mở lại lần 2: chưa có (xem trên).
6. **Chưa tự động hóa:** dòng ngày nổi khi bấm pin ở Tổng quan và cuộn thẻ điểm vào khung chỉ có unit test, chưa có kiểm trình duyệt tự động.
7. **Cảnh báo cũ** MD-01, LW-01..LW-06 còn mở.
8. **Thay đổi chưa commit của người dùng:** `day-overview-row.tsx`, `overview-panel.tsx` nằm ngoài các commit của phase này.


## Đóng phase 2026-11-07 (mở lại lần 3: tìm địa điểm, MAP-01)

**Người dùng xác nhận hoàn thành Phase 4 ngày 2026-11-07.** Đây là xác nhận của người dùng, không phải kết quả kiểm lại của agent.

- Phạm vi thêm sau lần verify đầu: MAP-01 (plan 04-55..04-58, D-141..D-153) và sửa chân form thêm/sửa điểm trên Sheet mobile (738c9a2).
- Bằng chứng do agent chạy: lint, typecheck, test, build ở các commit 04-55..04-57 (xem thông điệp commit; lần cuối ở c63424f: lint 8/8, typecheck 8/8, test 8/8 gồm itinerary 617, ui-web 378, web 2153). Agent không chạy lại các kiểm này khi đóng phase (chỉ sửa tài liệu).
- **Chấp nhận theo xác nhận của người dùng, agent chưa kiểm độc lập:** mục F UAT (F1..F11), sửa chân form Sheet mobile 738c9a2. Agent chưa chạy Photon/Nominatim thật, thiết bị thật, NVDA/VoiceOver cho phần này.
- Mục E (bản đồ) 14/14 PASS do người dùng xác nhận (xem phần trên).
- Review: gsd-code-review mục E đã chạy ( 4-REVIEW.md,  4-REVIEW-FIX.md); chưa có review độc lập riêng cho 04-55..04-58.
- Tồn đọng không chặn: xem "Chưa kiểm / tồn đọng" ở trên (MD-01, LW-01..LW-06, UF-01..UF-04 vẫn mở), thêm: server Photon/Nominatim công khai (giới hạn băng thông, điều khoản), cache trong bộ nhớ từng instance, place_id chưa lưu ở BE.