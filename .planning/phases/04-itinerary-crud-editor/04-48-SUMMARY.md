---
phase: 04-itinerary-crud-editor
plan: 48
subsystem: web-itinerary-ui
tags: [waypoint-form, overview, select, wave-26]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "WaypointFormDialog (04-18), Select của ui-web"
provides:
  - "WaypointFormMode.add.dayChoices (tùy chọn, tương thích ngược), WaypointDayField, dayChoiceLabel"
affects: [04-51]
tech-stack:
  added: []
  patterns: ["Ẩn/hiện ô bằng prop visible; ngày đã chọn gắn với identity của mode nên mở lại là về mặc định"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/waypoint-day-field.tsx
  modified:
    - apps/web/src/modules/itinerary/ui/waypoint-form-dialog.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-form-dialog.test.tsx
key-decisions:
  - "Bản nháp (chỉ ghi khi phiên hết hạn, D-36) dùng khóa add:{ngày đang chọn}; reset form vẫn theo ngày mặc định của mode để đổi ngày không xóa nội dung đã gõ"
  - "Hủy/gửi xóa cả khóa theo ngày đang chọn lẫn khóa theo ngày mặc định"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 48: Ô Ngày trong form thêm điểm từ Tổng quan Summary
**Form thêm điểm mở với `dayChoices` có ô "Ngày" (Select, đứng trên ô Tên, mặc định ngày cuối), title "Thêm điểm đến"; form từ tab ngày và form sửa không đổi.**
## Accomplishments
- `WaypointDayField` trả `null` khi `visible` là false; nhãn lựa chọn "Ngày N" hoặc "Ngày N · phụ đề".
- Gửi dùng ngày đang chọn; focus ban đầu vẫn ở ô Tên; ô Ngày bị vô hiệu khi đang gửi.
- 7 test mới: thứ tự/mặc định/focus, danh sách lựa chọn và gửi đúng ngày, ngày mặc định, khóa bản nháp theo ngày chọn, không có ô ở tab ngày, không có ô ở form sửa, vô hiệu khi gửi.
## Task Commits
1. Task 1: `d91742d`
## Deviations from Plan
None. Lưu ý nhỏ: tiêu chí `<WaypointDayField visible=` theo chữ khác một chút vì props được xếp theo thứ tự chữ cái (`visible` ở cuối); phần tử vẫn dùng đúng prop `visible`.
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/web test -- --run` | 115 file, 1773 test (waypoint-form-dialog 31/31) |
## Self-Check: PASSED
