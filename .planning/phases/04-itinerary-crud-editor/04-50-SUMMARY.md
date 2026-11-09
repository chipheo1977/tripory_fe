---
phase: 04-itinerary-crud-editor
plan: 50
subsystem: web-itinerary-ui
tags: [waypoint-list, selection, timeline, wave-30]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-47 DayTabs/DayOverviewRow, 04-49 EditorLayout"
provides:
  - "WaypointList selection (WaypointSelection): nút chính chọn điểm khi bản đồ hiển thị, mở form sửa khi không"
  - "SortableWaypointItem gom prop thành appearance + actions"
  - "DayPanel (thân tab ngày) và TimelinePanel khung { tabs, children }"
  - "DayTabs.focusRequest, DayOverviewRow cuộn khi selected, WaypointFormDialog.onUpdated(waypointId, coordinate)"
affects: [04-51]
tech-stack:
  added: []
  patterns: ["Prop tùy chọn bật chế độ mới, không truyền thì giữ hành vi cũ", "Yêu cầu focus theo seq"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/day-panel.tsx
  modified:
    - apps/web/src/modules/itinerary/ui/sortable-waypoint-item.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-list.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-list.test.tsx
    - apps/web/src/modules/itinerary/ui/timeline-panel.tsx
    - apps/web/src/modules/itinerary/ui/timeline-panel.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
    - apps/web/src/modules/itinerary/ui/day-tabs.tsx
    - apps/web/src/modules/itinerary/ui/day-tabs.test.tsx
    - apps/web/src/modules/itinerary/ui/day-overview-row.tsx
    - apps/web/src/modules/itinerary/ui/overview-panel.test.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-form-dialog.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-form-dialog.test.tsx
    - apps/web/src/modules/itinerary/ui/ellipsis-menu.test.tsx
key-decisions:
  - "Gợi ý sr 'Nhấn để xem trên bản đồ' là một phần tử dùng chung cho cả danh sách (aria-describedby từ mọi nút chính)"
  - "itinerary-editor.tsx ghép DayTabs + DayPanel với state ngày hiện tại; state EditorTab đầy đủ là việc của 04-51"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 50: Danh sách điểm đồng bộ với bản đồ Summary
**Danh sách có chế độ chọn điểm (aria-current, viền chọn, cuộn vào khung) bật bằng prop `selection`; thân tab ngày tách thành `DayPanel`; thêm ba điểm nối nhỏ cho editor.**
## Accomplishments
- Không truyền `selection`: toàn bộ 27 test cũ của `waypoint-list` giữ nguyên hành vi (nút chính mở form sửa). Có `selection`: nút chính gọi `onSelect`, menu ⋯ vẫn có "Sửa"/"Xóa".
- `TimelinePanel` còn lại thanh tab sticky + `children`; `DayPanel` giữ phụ đề, danh sách, thanh "Thêm điểm đến" (một nút duy nhất, `addButtonRef` đúng như cũ).
- `DayTabs.focusRequest` (một lần mỗi `seq`), `DayOverviewRow` tự cuộn khi chuyển sang `selected`, `onUpdated` trả tọa độ đã gửi.
## Task Commits
1. Task 1 (selection): `6c8ae12`
2. Task 2 (DayPanel, TimelinePanel khung): `18bed4f`
3. Task 3 (focusRequest, cuộn dòng, onUpdated): `0ce1b1b`
## Deviations from Plan
None. (Thêm `ellipsis-menu.test.tsx` vào commit Task 1 vì test đó dựng `SortableWaypointItem` bằng prop cũ.)
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/web test -- --run` | 122 file, 1916 test (baseline ~1741) |
| `pnpm --filter @tripory/design-tokens test -- --run` | 32/32 |
## Self-Check: PASSED
