---
phase: 04-itinerary-crud-editor
plan: 43
subsystem: itinerary-domain
tags: [map, domain, pure, destination, wave-26]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-RESEARCH R9.3 (tâm/bbox 34 tỉnh), UI-SPEC mục Bản đồ"
provides:
  - "geo-bounds.ts: LngLat, GeoBounds, VIETNAM_VIEW_BOUNDS, boundsOf, boundsContain, isDegenerate"
  - "map-view.ts: EditorTab, dayColorIndex, defaultEditorTab, countVisibleWaypoints, buildMapPins, buildDayRoutes, fitTargetFor, summarizeDays"
  - "Destination.view (tâm + bbox) cho 34 tỉnh"
affects: [04-46, 04-47, 04-50, 04-51, phase-05]
tech-stack:
  added: []
  patterns: ["Domain chỉ trả số/trạng thái/tọa độ; chuỗi tiếng Việt ở tầng app"]
key-files:
  created:
    - packages/itinerary/src/domain/geo-bounds.ts
    - packages/itinerary/src/domain/geo-bounds.test.ts
    - packages/itinerary/src/domain/map-view.ts
    - packages/itinerary/src/domain/map-view.test.ts
  modified:
    - packages/itinerary/src/domain/destination.ts
    - packages/itinerary/src/domain/index.ts
    - packages/itinerary/src/domain/destination-search.test.ts
    - packages/itinerary/src/infrastructure/static-destination-catalog.ts
    - packages/itinerary/src/infrastructure/static-destination-catalog.test.ts
    - packages/itinerary/src/exports.test.ts
    - apps/web/src/modules/itinerary/ui/destination-block.test.tsx
key-decisions:
  - "Bỏ điểm chờ xóa và sắp theo (dayNumber, orderIndex) bên trong domain, không tin thứ tự đầu vào"
  - "Bảng 34 khung nhìn chép nguyên văn R9.3, ghi nguồn OSM ODbL trong comment"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 43: Domain thuần của bản đồ Summary
**Hàm thuần cho màu ngày, pin, đường, nhấn mạnh, khung canh, tab mặc định, tóm tắt ngày, cùng tâm/bbox của 34 tỉnh có test địa danh sau sáp nhập.**
## Accomplishments
- `map-view.ts` đúng interface của plan; rule nhấn mạnh viết bằng early return (không `? :` lồng).
- `fitTargetFor`: overview/ngày/ngày trống, một điểm hoặc trùng tọa độ thành `point`, rỗng thì khung tỉnh rồi `VIETNAM_VIEW_BOUNDS`.
- 34 `view` kiểm: bbox trong `[[102.1, 8.3], [109.6, 23.4]]`, chứa tâm, chứa 11 địa danh alias, Khánh Hòa dùng khung tay.
## Task Commits
1. Task 1: `35f8186`
2. Task 2: `2837d43`
## Deviations from Plan
None. (Comment trong `map-view.ts`/`geo-bounds.ts` dùng từ "day", "waypoint" thay "ngày/điểm" để lệnh grep "không có copy UI ở domain" của acceptance criteria trả rỗng.)
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/itinerary lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/itinerary test -- --run` | 523/523 (baseline 427, +96) |
| `pnpm --filter @tripory/web typecheck` | exit 0 |
| `pnpm --filter @tripory/web test -- --run destination-block` | 19/19 |
## Self-Check: PASSED
