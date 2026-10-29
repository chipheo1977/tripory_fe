---
phase: 04-itinerary-crud-editor
plan: 19
subsystem: itinerary-editor-waypoint-list
tags: [dnd-kit, drag-and-drop, reorder, undo-delete, a11y, announcements, wave-8]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-05: spike dnd-kit trong StrictMode; 04-06: moveItem/isSameOrder/isValidDayOrder; 04-09: itinerary.useReorderWaypoints (optimistic + rollback + scope); 04-13: useSaveStatusStore; 04-18: usePendingDelete (pendingIds, remove, flush)"
provides:
  - "`viAnnouncements(ids, nameOf)` + `VI_DRAG_INSTRUCTIONS`: thông báo kéo thả tiếng Việt cho trình đọc màn hình"
  - "`SortableWaypointItem` (tay cầm riêng, nút chính, menu ⋯ Sửa/Xóa) + `WaypointCardOverlay`"
  - "`WaypointList` + `WaypointListProps` + `WaypointFocusRequest`: danh sách kéo thả của một ngày, ẩn điểm chờ xóa, reorder optimistic, xử lý lỗi và focus"
affects: [04-20, 04-21]
tech-stack:
  added: []
  patterns: [handle-as-activator, flush-before-drag, dataset-focus-lookup, external-store-portal-target]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/dnd-announcements.ts
    - apps/web/src/modules/itinerary/ui/dnd-announcements.test.ts
    - apps/web/src/modules/itinerary/ui/sortable-waypoint-item.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-list.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-list.test.tsx
  modified: []
key-decisions:
  - "Cảm biến Mouse (distance 4) + Touch (delay 180, tolerance 8) + Keyboard (`sortableKeyboardCoordinates`); không dùng cảm biến con trỏ chung của dnd-kit (ghi đè dòng trong bảng hằng UI-SPEC, theo plan)."
  - "Bắt đầu kéo gọi `onFlushPending` (D-33). Thả mà tập hiển thị không phải hoán vị của tập ngày trong cache (DELETE chưa kịp xong) thì không gửi: toast info 'Danh sách đã thay đổi, đã tải lại' + invalidate chi tiết, chỉ báo không chuyển sang lỗi."
  - "`Itinerary.InvalidReorderList` từ BE: hook đã rollback và settle (refetch); UI chỉ hiện toast info và KHÔNG gọi `markFailed` (D-37). Lỗi khác: `decideMutationError` quyết định toast (bỏ qua hết phiên/aborted), rồi `markFailed(retry)` gửi lại đúng biến."
  - "Focus: effect theo `focusRequest` tìm nút qua `data-waypoint-main|handle` (không cần ref cho từng thẻ); `add` focus `addButtonRef`. Ngày trống thì `addButtonRef` gắn vào nút trong EmptyState, nên 'xóa điểm cuối → focus Thêm điểm đến' hoạt động. Sau thả/hủy, rAF trả focus về tay cầm."
  - "DragOverlay portal ra `document.body` (target lấy bằng `useSyncExternalStore` để SSR an toàn và qua rule `react-hooks/set-state-in-effect`), `style.zIndex = var(--z-index-toast)` ghi đè `zIndex = 999` mặc định của dnd-kit, không dùng class `z-<số>`."
  - "`emptyAction` là prop riêng của EmptyState (plan ghi 'qua prop emptyAction'); TimelinePanel (04-21) truyền `onAdd(dayNumber)` vào đây."
requirements-completed: [ITIN-07, ITIN-08, ITIN-10]
duration: ~75 phút
completed: 2026-10-29
---

# Phase 4 Plan 19: Danh sách waypoint kéo thả và nối luồng xóa có hoàn tác Summary

**`WaypointList` kéo thả bằng chuột, cảm ứng nhấn giữ và bàn phím (announcements tiếng Việt), reorder optimistic có rollback/retry, `InvalidReorderList` thành làm mới êm, ẩn điểm đang chờ xóa và flush DELETE trước khi kéo**

## Commits

1. **Task 04-19-01 RED** — `c8b4e1f` `test(04-19): add failing tests for Vietnamese dnd announcements`
2. **Task 04-19-01 GREEN** — `35393e5` `feat(04-19): add Vietnamese dnd announcements and SortableWaypointItem`
3. **Task 04-19-02 RED** — `f2497bb` `test(04-19): add failing tests for WaypointList drag, reorder and focus`
4. **Task 04-19-02 GREEN** — `a1c6c13` `feat(04-19): add WaypointList with drag-and-drop reorder and undoable delete wiring`

## Accomplishments

- **Task 1:** `viAnnouncements` đúng bốn câu của plan, đọc danh sách id mới nhất mỗi lần gọi; `over` null trả `undefined`. `SortableWaypointItem`: `li` sortable, tay cầm `button` là activator (`aria-label` "Kéo để sắp xếp {tên}", `size-touch`, `touch-none`, `data-base-ui-swipe-ignore`, `aria-roledescription`), nút chính mở form sửa với `aria-label` "{số} {tên}, {địa chỉ}", menu ⋯ "Sửa"/"Xóa" (danger). Ngày một điểm không render tay cầm. Trạng thái nổi bật, chỗ trống đang kéo và `WaypointCardOverlay` theo UI-SPEC. 7 test.
- **Task 2:** `WaypointList` với `DndContext` (closestCenter, `restrictToVerticalAxis` + `restrictToFirstScrollableAncestor`, announcements + hướng dẫn tiếng Việt), `SortableContext` theo id đang hiển thị, `ol aria-label="Điểm đến Ngày N"`. Reorder dùng `itinerary.useReorderWaypoints` với `errorToast: false`. EmptyState "Chưa có điểm đến nào trong Ngày N". Highlight cuộn thẻ vào view (tôn trọng reduced motion). 20 test.
- **Threat model:** T-04-53 (flush trước khi kéo, `isValidDayOrder`, scope tuần tự, InvalidReorderList → refetch, đều có test); T-04-54 (tên chỉ vào live region/aria-label bằng text, React escape); T-04-55 (rollback + toast + chỉ báo "Lỗi – Thử lại" + retry gửi lại đúng biến, có test).

## Verification

- `pnpm --filter @tripory/web test -- dnd-announcements` (7) và `-- waypoint-list` (20): xanh.
- `pnpm --filter @tripory/web typecheck | lint | test`: sạch; web 88 file, 1360 test xanh.
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công. `packages/config/eslint/boundaries.mjs` không đổi; dnd-kit chỉ ở `modules/itinerary/ui`; token guard (04-01) xanh.
- Acceptance: `data-base-ui-swipe-ignore` có trong `sortable-waypoint-item.tsx`; `PointerSensor` không xuất hiện trong `waypoint-list.tsx`; `delay: 180, tolerance: 8` và `Danh sách đã thay đổi, đã tải lại` có; 20 ≥ 10 test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lint `react-hooks/set-state-in-effect` chặn `setState(document.body)` trong effect**
- **Found during:** Task 2
- **Fix:** lấy portal target bằng `useSyncExternalStore(subscribeNever, () => document.body, () => null)`; SSR trả null nên không chạm `document`.
- **Commit:** a1c6c13

**2. [Rule 1 - Bug] Comment nhắc tên `PointerSensor` làm tiêu chí acceptance (Select-String) fail**
- **Fix:** viết lại comment không dùng tên đó.
- **Commit:** a1c6c13

### Khác với chữ của plan

- Menu ⋯ dùng `DropdownMenuTrigger` (cùng mẫu `ItineraryCard`) thay vì `IconButton ghost sm`, để khỏi phụ thuộc cách Base UI gộp className khi dùng `render`; chưa thử phương án IconButton. Vùng bấm vẫn 44×44 (`min-h-touch min-w-touch`).
- Lỗi reorder dùng `decideMutationError` (đã có trong `@/lib/feedback`) thay vì `selectErrorMessage ?? GENERIC_ERROR_MESSAGE` để cùng chính sách với MutationCache (không toast khi hết phiên hoặc request bị hủy). Chỉ báo vẫn chuyển sang lỗi.
- Plan ghi `idsRef` cập nhật mỗi render; rule `react-hooks/refs` cấm, nên `viAnnouncements` nhận closure tạo lại mỗi render (đọc `visibleIds` hiện tại, không cần ref).
- Test announcement kiểm câu "… đang ở vị trí 1 trên 3." thay vì "Đã nhấc …": dnd-kit bắn `onDragOver` ngay sau `onDragStart` nên live region chỉ còn câu thứ hai; câu "Đã nhấc" được kiểm ở `dnd-announcements.test.ts`.
- Test reorder cần "BE" giữ trạng thái (mock `getById` trả thứ tự mới sau reorder), nếu không lần refetch sau `settle` đưa danh sách về thứ tự cũ.

## Known Stubs

None. `WaypointList` chưa được lắp vào editor: `TimelinePanel`/`ItineraryEditor` (04-21) truyền `pendingIds`/`remove`/`flush` từ `usePendingDelete`, `focusRequest`, `highlightId`, `addButtonRef`, `emptyAction`.

## Notes cho người xem trình duyệt (UAT máy thật, không kiểm được trong jsdom)

- Kéo chuột (≥ 4px) và nhấn giữ 180ms trên tay cầm trên thiết bị cảm ứng; cuộn dọc bằng ngón tay ngoài tay cầm không kích hoạt kéo.
- Kéo trong `Sheet` mobile: Drawer không bị vuốt đóng (`data-base-ui-swipe-ignore`, RESEARCH A8); `DragOverlay` hiện đúng vị trí và nằm trên Sheet (RESEARCH Pitfall 8).
- Xóa một điểm rồi kéo ngay: toast "Hoàn tác" đóng, DELETE đi trước, reorder đi sau (Network tab).
- VoiceOver/NVDA đọc announcements tiếng Việt; sau thả bằng bàn phím focus ở tay cầm.
- Menu ⋯ đóng xong không kéo focus lại trigger của thẻ vừa xóa (thẻ đã bị ẩn).

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: dnd-announcements.ts, dnd-announcements.test.ts, sortable-waypoint-item.tsx, waypoint-list.tsx, waypoint-list.test.tsx
- FOUND commits: c8b4e1f, 35393e5, f2497bb, a1c6c13
