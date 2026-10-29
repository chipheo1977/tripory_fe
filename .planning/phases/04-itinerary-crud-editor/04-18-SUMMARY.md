---
phase: 04-itinerary-crud-editor
plan: 18
subsystem: itinerary-editor-pending-delete
tags: [undo, pending-delete, keepalive, pagehide, visibilitychange, wave-7]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-04: notify.undoable; 04-09: itinerary.useDeleteWaypoint (optimistic + rollback), itineraryUnload.deleteWaypoint (keepalive); 04-13: useSaveStatusStore"
provides:
  - "`createPendingDeleteController(deps)` + `UNDO_WINDOW_MS = 5_000`: controller thuần, idempotent, timer tiêm được"
  - "`usePendingDelete({ itineraryId, onUndone })` → `{ pendingIds, remove, flush }`: toast Hoàn tác, DELETE sau 5 s, flush khi rời route/pagehide/ẩn tab"
affects: [04-19, 04-20, 04-21]

tech-stack:
  added: []
  patterns: [idempotent-finish, stale-toast-handler-guard, latest-holder-object-in-state]

key-files:
  created:
    - apps/web/src/modules/itinerary/ui/pending-delete.ts
    - apps/web/src/modules/itinerary/ui/pending-delete.test.ts
    - apps/web/src/modules/itinerary/ui/use-pending-delete.ts
    - apps/web/src/modules/itinerary/ui/use-pending-delete.test.tsx
  modified: []

key-decisions:
  - "Handler của toast chỉ có hiệu lực khi lệnh của nó còn là lệnh chờ hiện tại (so theo đối tượng): Sonner đóng toast cũ bất đồng bộ rồi gọi `onDismiss`, và không có guard này nó commit nhầm lệnh xóa thứ hai (ngoài Pitfall 5 của RESEARCH)."
  - "RESEARCH A4 đã kiểm bằng test: `mutate` gọi trong cleanup sau khi observer gỡ vẫn gửi DELETE (test 'unmount'). Không cần phương án gọi repository trực tiếp."
  - "Controller dựng bằng `useState` initializer thay vì `useRef` lazy: dựng không có side effect (toast chỉ ở `remove`), nên StrictMode chạy initializer hai lần vô hại. Giá trị mới nhất (itineraryId, onUndone, mutate) nằm trong đối tượng `latest` giữ bằng `useState` và ghi qua `sync()` trong effect, vì rule `react-hooks/refs` cấm truyền ref vào closure dựng lúc render."

requirements-completed: [ITIN-07, ITIN-10]

duration: ~30 phút
completed: 2026-10-29
---

# Phase 4 Plan 18: Xóa waypoint hoãn commit có hoàn tác Summary

**Controller thuần giữ đồng hồ 5 giây cho lệnh xóa (idempotent, an toàn với toast cũ đóng muộn) và hook `usePendingDelete` nối toast "Hoàn tác", mutation DELETE, và flush bằng fetch keepalive khi `pagehide`/`visibilitychange` hidden, hoặc DELETE thường khi rời route**

## Commits

1. **Task 04-18-01 RED** — `b32a3f3` `test(04-18): add failing tests for pending-delete controller`
2. **Task 04-18-01 GREEN** — `458afa8` `feat(04-18): add pending-delete controller with undo window`
3. **Task 04-18-02 tests** — `b86475b` `test(04-18): add tests for usePendingDelete lifecycle`
4. **Task 04-18-02 GREEN** — `12a60af` `feat(04-18): add usePendingDelete hook with unload flush`

## Accomplishments

- **Task 1 (controller):** `remove` commit ngay lệnh cũ rồi hiện toast và hẹn `finish('commit')` sau 5000 ms; `undo` bỏ id, đóng toast, báo `onUndone`; `flush(via)` commit ngay (`unload` cho keepalive). `finish` đặt `pending = null` trước mọi side effect nên `onDismiss` gọi lại khi app đóng toast không commit hai lần. 11 test (fake timers).
- **Task 2 (hook):** toast `Đã xóa "{tên}"` + "Hoàn tác" qua `notify.undoable`; sau 5 s `deleteWaypoint.mutate({ waypointId })`; `pagehide` và `visibilitychange` → hidden gọi `itineraryUnload.deleteWaypoint` (keepalive, bỏ qua lỗi); cleanup effect `flush('normal')` khi rời route/Activity ẩn trang (không có lệnh chờ thì không làm gì, nên StrictMode mount-unmount-mount không commit oan). Lỗi DELETE: hook itinerary rollback cache, MutationCache hiện toast lỗi, `store.markFailed(retry)` gửi lại đúng DELETE. 12 test.
- **Threat model:** T-04-50 (DELETE keepalive đi `/api/bff` cùng origin, BFF kiểm Origin + phiên); T-04-51 (idempotent, có test onDismiss lặp và toast cũ đóng muộn); T-04-52 (token stale lúc unload: rủi ro đã chấp nhận, ghi vào UAT).

## Verification

- `pnpm --filter @tripory/web test -- pending-delete` (11) và `use-pending-delete` (12): xanh.
- `pnpm --filter @tripory/web lint | typecheck | test`: sạch; web 81 file, 1264 test xanh.
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công. ESLint boundaries không đổi.
- Acceptance: `export const UNDO_WINDOW_MS = 5_000`, `visibilitychange`, `pagehide`, `Hoàn tác` đều có trong file tương ứng; ≥ 6 và ≥ 7 test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Toast cũ đóng muộn có thể commit nhầm lệnh xóa mới**
- **Found during:** Task 1 (thiết kế test cho "xóa điểm thứ hai")
- **Issue:** Mẫu Pattern 9 chỉ chống commit lặp khi không có lệnh mới. Khi xóa w2 ngay sau w1, `dismissToast(toast1)` làm Sonner gọi `onDismiss` của toast 1 sau đó; `finish` không phân biệt và commit w2.
- **Fix:** handler của từng toast so với đối tượng lệnh chờ của chính nó trước khi `finish`; thêm test "ignores a late onDismiss of the old toast".
- **Files modified:** pending-delete.ts, pending-delete.test.ts
- **Commit:** 458afa8

**2. [Rule 3 - Blocking] Lint `react-hooks/refs`/`immutability` chặn mẫu `useRef` + gán trong effect**
- **Found during:** Task 2
- **Fix:** giữ đối tượng `latest` bằng `useState` và cập nhật qua helper `sync()` trong effect (xem key-decisions). Không dùng `eslint-disable`.
- **Commit:** 12a60af

Ngoài ra: plan ghi Task 2 "dùng useRef lazily"; đã thay bằng `useState` initializer như trên (cùng hành vi, lint sạch).

## Known Stubs

None. Hook chưa được ghép vào editor; view cần lọc waypoint theo `pendingIds` và gọi `flush()` khi bắt đầu kéo (D-33) ở các plan sau (04-19 trở đi).

## Notes cho người xem trình duyệt

- Đóng tab/reload trong 5 giây sau khi xóa: kiểm trong DevTools Network rằng `DELETE /api/bff/...` được gửi với cookie, `Origin` và không bị BFF trả 401/403 (RESEARCH A5; phiên stale thì lệnh mất, đã chấp nhận ở D-32).
- Đổi tab (visibilitychange hidden) commit sớm thay vì chờ hết 5 giây (D-50), nên toast "Hoàn tác" sẽ không còn tác dụng khi quay lại.
- Hover/tab ẩn không tạm dừng đồng hồ 5 giây (đồng hồ của app, không phải Sonner).

## Self-Check: PASSED

- FOUND: pending-delete.ts, pending-delete.test.ts, use-pending-delete.ts, use-pending-delete.test.tsx
- FOUND commits: b32a3f3, 458afa8, b86475b, 12a60af
