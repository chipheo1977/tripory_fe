---
phase: 04-itinerary-crud-editor
plan: 13
subsystem: itinerary-editor-save-and-leave-guard
tags: [save-indicator, navigation-guard, beforeunload, user-menu, tanstack-query, wave-6]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-09: itineraryKeys.write(id) và mọi lệnh ghi editor chung mutationKey; 04-05: helper test; 04-04: Dialog/notify"
provides:
  - "`createSaveStatusStore`, `SaveStatusProvider`, `useSaveStatusStore`, `useSaveStatus` (modules/itinerary/ui/save-status.ts)"
  - "`SaveIndicator({ itineraryId })` với 4 trạng thái (aria-live polite, luôn trong DOM)"
  - "`NavigationGuardProvider` / `useNavigationGuard` (components/navigation-guard.tsx, mặc định no-op)"
  - "`UserMenu compact` và hai link đi qua guard bằng `Link onNavigate`"
  - "`useBeforeUnloadWarning`, `useEditorLeaveGuard`, `LeaveEditorDialog` (modules/itinerary/ui/leave-guard.tsx)"
affects: [04-14, 04-15, 04-16, 04-17, 04-18, 04-19, 04-20, 04-21]

tech-stack:
  added: []
  patterns: [external-store-with-useSyncExternalStore, context-guard-no-op-default, mutation-cache-subscription-for-auto-continue]

key-files:
  created:
    - apps/web/src/components/navigation-guard.tsx
    - apps/web/src/modules/itinerary/ui/save-status.ts
    - apps/web/src/modules/itinerary/ui/save-status.test.ts
    - apps/web/src/modules/itinerary/ui/save-indicator.tsx
    - apps/web/src/modules/itinerary/ui/save-indicator.test.tsx
    - apps/web/src/modules/itinerary/ui/leave-guard.tsx
    - apps/web/src/modules/itinerary/ui/leave-guard.test.tsx
  modified:
    - apps/web/src/components/user-menu.tsx
    - apps/web/src/components/user-menu.test.tsx

key-decisions:
  - "\"Đang lưu…\" suy ra từ `useIsMutating({ mutationKey: itineraryKeys.write(id) })`; store chỉ giữ `hasSaved` và `failure.retry`. Ưu tiên pending > failure > đã lưu > trống."
  - "`useEditorLeaveGuard` đọc số lệnh ghi bằng `queryClient.isMutating` lúc bấm (không dùng giá trị của lần render), nên `guard` và `requestLeave` ổn định và luôn đúng."
  - "Dialog tự đóng và đi tiếp bằng cách đăng ký `MutationCache.subscribe` khi đang chờ, thay vì setState trong thân effect (rule react-hooks/set-state-in-effect)."
  - "`beforeunload` gắn khi `pending || formDirty`; chặn in-app chỉ khi còn lệnh ghi (form bẩn không chặn in-app)."

requirements-completed: [ITIN-10]

duration: ~30 phút
completed: 2026-10-28
---

# Phase 4 Plan 13: Save indicator + chặn rời trang Summary

**Store trạng thái lưu và `SaveIndicator` 4 trạng thái theo `mutationKey`, context `NavigationGuard` dùng chung với `UserMenu compact`, và `useEditorLeaveGuard` (beforeunload khi bẩn, `LeaveEditorDialog` tự đóng và đi tiếp khi mọi lệnh ghi xong)**

## Commits

1. **Task 04-13-01 RED** — `ee6bdad` `test(04-13): add failing tests for save-status store and SaveIndicator`
2. **Task 04-13-01 GREEN** — `fcbf82b` `feat(04-13): save-status store va SaveIndicator 4 trang thai`
3. **Task 04-13-02 RED** — `985ca9a` `test(04-13): add failing tests for UserMenu compact and navigation guard`
4. **Task 04-13-02 GREEN** — `cc48c05` `feat(04-13): NavigationGuard context va UserMenu compact/onNavigate`
5. **Task 04-13-03 RED** — `7af40ef` `test(04-13): add failing tests for leave guard and LeaveEditorDialog`
6. **Task 04-13-03 GREEN** — `fb7646d` `feat(04-13): useBeforeUnloadWarning, useEditorLeaveGuard va LeaveEditorDialog`

## Accomplishments

- **Task 1:** `createSaveStatusStore` thuần (snapshot ổn định tham chiếu, unsubscribe), Provider + `useSaveStatus` bằng `useSyncExternalStore`. `SaveIndicator` hiển thị Spinner + "Đang lưu…", Check + "Đã lưu", hoặc nút ghost `text-danger` "Lỗi – Thử lại" gọi đúng `retry`; vùng `aria-live="polite"` luôn có trong DOM. 11 test.
- **Task 2:** `navigation-guard.tsx` (context, mặc định no-op). `UserMenu` thêm `compact` (chỉ Avatar, `aria-label` giữ nguyên) và truyền `onNavigate` cho hai link ("Lịch trình của tôi", "Đổi mật khẩu") qua guard. 16 test (13 cũ + 3 mới, tính cả `it.each`).
- **Task 3:** `useBeforeUnloadWarning` (gắn khi bẩn, gỡ ngay khi hết/unmount, `preventDefault` + `returnValue = ""`). `useEditorLeaveGuard` trả `{ guard, requestLeave, dialog }`. `LeaveEditorDialog` đúng copy D-35, focus đầu "Ở lại", "Rời trang" danger. 11 test.
- **Threat model:** T-04-36 (beforeunload khi bẩn + dialog cho link trong app), T-04-37 (listener chỉ khi dirty, gỡ trong cleanup), T-04-38 (nút back trình duyệt: chấp nhận, ghi chú giới hạn trong comment của `leave-guard.tsx`, không dùng `pushState`).

## Verification

- `pnpm --filter @tripory/web exec vitest run save-status save-indicator user-menu leave-guard`: xanh (11 + 16 + 11 test).
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 71 file, 1129 test xanh. ESLint boundaries không đổi.
- Acceptance: `Lỗi – Thử lại` và `aria-live="polite"` có trong `save-indicator.tsx`; `onNavigate` và `compact` có trong `user-menu.tsx`; `Thay đổi đang được lưu. Rời trang?` có trong `leave-guard.tsx`; `pushState` không có.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Link thật không phát `onNavigate` trong jsdom**
- **Found during:** Task 2
- **Issue:** `next/link` bỏ qua click khi không có `AppRouterContext`; kể cả khi cấp context giả, click vẫn không tới `onNavigate` trong môi trường test.
- **Fix:** `user-menu.test.tsx` mock `next/link` bằng thẻ `<a>` giữ đúng hợp đồng cần kiểm (prop `onNavigate` được truyền và gọi với event có `preventDefault`). Hành vi thật của Next (`onNavigate` chỉ chạy cho điều hướng SPA, có `preventDefault`) lấy từ docs 16.4 `link.md`; chưa kiểm bằng trình duyệt thật.
- **Files modified:** apps/web/src/components/user-menu.test.tsx
- **Commit:** cc48c05

**2. [Rule 1 - Bug] `setState` trong effect bị rule react-hooks chặn**
- **Found during:** Task 3
- **Issue:** bản đầu dùng effect `if (!pending) { setWaiting(null); waiting(); }` bị `react-hooks/set-state-in-effect`.
- **Fix:** đăng ký `queryClient.getMutationCache().subscribe(...)` khi đang chờ; callback kiểm `isMutating` rồi đóng và đi tiếp.
- **Files modified:** apps/web/src/modules/itinerary/ui/leave-guard.tsx
- **Commit:** fb7646d

### TDD ghi chú

Task 3: mã `leave-guard.tsx` được viết trước khi chạy test lần đầu, nên chưa có lần chạy RED thật cho file này; commit `test(04-13)` vẫn đứng trước commit `feat(04-13)`. Test có răng: bản effect cũ làm 0 test sai nhưng lint đỏ, bản `returnValue` ban đầu bị test bắt (jsdom `Event.returnValue` là boolean, đã sửa test để mô phỏng `BeforeUnloadEvent` đúng kiểu chuỗi).

## Known Limitations

- Nút back của trình duyệt không chặn được trong App Router (T-04-38, chấp nhận). Safari iOS có thể không hiện hộp `beforeunload` (A11).
- Rủi ro hẹp: nếu mọi lệnh ghi xong đúng giữa lúc bấm link và lúc effect đăng ký subscription (một lần commit), dialog sẽ chờ tới sự kiện mutation kế tiếp. Người dùng vẫn bấm "Ở lại"/"Rời trang" được.
- Hợp đồng nối cho plan sau: thao tác nền truyền `onSuccess: () => store.markSaved()` và `onError: (_e, vars) => store.markFailed(() => mutation.mutate(vars))`; form chỉ `onSuccess: () => store.markSaved()`. Chưa có nơi nào lắp `SaveStatusProvider`/`NavigationGuardProvider`; editor (04-14+) làm việc đó.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check

**Trạng thái: PASSED.**

- Bảy file tạo mới và hai file sửa đều tồn tại.
- Sáu commit `ee6bdad`, `fcbf82b`, `985ca9a`, `cc48c05`, `7af40ef`, `fb7646d` có trong `git log` của `phase_4`.
