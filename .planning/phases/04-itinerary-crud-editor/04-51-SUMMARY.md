---
phase: 04-itinerary-crud-editor
plan: 51
subsystem: web-editor
tags: [map, overview, editor-wiring, wave-31]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-43 domain thuần, 04-46 TripMap, 04-47 tab Tổng quan, 04-48 ô Ngày, 04-49 EditorMapArea/EditorLayout, 04-50 selection + DayPanel"
provides:
  - "LoadedEditor nối bản đồ và tab Tổng quan: tab EditorTab, chọn điểm, nhấn mạnh ngày, lệnh camera, yêu cầu mức sheet, thêm điểm từ Tổng quan"
  - "useEditorTab, useMapSelection, useMapCamera (state, một hook một việc), toTripMapPins/toLngLat, EditorTimelineBody, destinationBoundsFor"
affects: [04-52, 04-53]
tech-stack:
  added: []
  patterns: ["Điểm đang chọn được dẫn xuất (visibleSelection) thay vì effect setState", "Mọi phép tính bản đồ qua hàm thuần của domain"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/use-editor-tab.ts
    - apps/web/src/modules/itinerary/ui/use-map-selection.ts
    - apps/web/src/modules/itinerary/ui/use-map-camera.ts
    - apps/web/src/modules/itinerary/ui/use-editor-map.test.tsx
    - apps/web/src/modules/itinerary/ui/editor-map-pins.ts
    - apps/web/src/modules/itinerary/ui/editor-map-pins.test.ts
    - apps/web/src/modules/itinerary/ui/editor-timeline-body.tsx
  modified:
    - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.test.tsx
    - apps/web/src/modules/itinerary/ui/destination-cover.ts
    - apps/web/src/modules/itinerary/ui/destination-cover.test.ts
key-decisions:
  - "Guard itinerary-invariants chỉ cho vài file UI chạm destinationCatalog: thêm destinationBoundsFor vào destination-cover.ts (file được phép) thay vì sửa guard"
  - "Điểm đang chọn không còn tồn tại/đang chờ xóa thì coi như không chọn (dẫn xuất khi render) và bị xóa khi người dùng xóa đúng điểm đó"
  - "Không tách EditorTimeline: LoadedEditor dùng EditorTimelineBody và các hàm clampTab/dayOfTab/visibleSelection ở module scope"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 51: Nối bản đồ và tab Tổng quan vào editor Summary
**Editor mở ở Tổng quan khi đã có điểm (Ngày 1 khi chưa có), bản đồ đồng bộ với danh sách qua chọn điểm, đổi tab, thêm/sửa điểm; thêm điểm từ Tổng quan có ô Ngày và ở lại Tổng quan.**
## Accomplishments
- Đổi tab (tab, mũi tên, dòng ngày, "+ Thêm ngày") bỏ chọn và canh khung; bấm dòng ngày sang tab Ngày N và focus tab.
- Bấm pin: chọn, `reveal` (chỉ dời khi ra ngoài vùng an toàn), `sheetSnapRequest` mức vừa, không mở form; ở Tổng quan nhãn hai dòng và dòng ngày được làm nổi.
- Bấm nút chính của thẻ: bản đồ sẵn sàng thì chọn + `focus` giữ zoom, đang tải/lỗi thì mở form sửa.
- Thêm điểm: `focus` tới điểm mới không tự chọn; từ Tổng quan: dòng ngày "vừa thêm" 1500ms, live region, focus nút thêm. Sửa đổi tọa độ: `focus`.
- 15 test mới ở `itinerary-editor.test.tsx` (bản đồ giả qua mock `trip-map.lazy`, ghi `EditorLayout` props), 24 test cũ giữ nguyên ý nghĩa (5 test cập nhật vì editor mở ở Tổng quan).
## Task Commits
1. Task 1 (hook + editor-map-pins): `9ab09f5`
2. Task 2 (editor + test): `414d75a`
## Deviations from Plan
**[Rule 3 - Blocker] Guard `itinerary-invariants` chặn `destinationCatalog` trong `itinerary-editor.tsx`** | Fix: `destinationBoundsFor` ở `destination-cover.ts` (đã được phép), editor gọi hàm đó; guard không đổi | Files: destination-cover.ts, destination-cover.test.ts, itinerary-editor.tsx.
**Test cũ chỉnh:** "opens on Day 1" đổi thành Tổng quan + ca mới "0 điểm mở Ngày 1"; ba test dùng thẻ điểm/phụ đề (thêm điểm, xóa, rời trang đang lưu) bấm tab Ngày 1 trước; test "Thông tin chuyến đi" đọc `region` của OverviewSummary.
**Total deviations:** 1 auto-fixed. **Impact:** không đổi hành vi.
## Chưa kiểm
- Toàn bộ tương tác bản đồ thật (kéo, zoom, pin trên canvas, sheet thật dưới lg, chiều cao vùng an toàn) và Hoàng Sa/Trường Sa: kiểm ở 04-52/04-53 trên trình duyệt thật.
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/web test -- --run` | 124 file, 1943 test (baseline ~1741) |
| `pnpm --filter @tripory/itinerary test -- --run` | 523/523 (baseline 427) |
| `pnpm --filter @tripory/ui-web test -- --run` | 377/377 (baseline 342) |
| `pnpm --filter @tripory/design-tokens test -- --run` | 32/32 (baseline 20) |
## Self-Check: PASSED
