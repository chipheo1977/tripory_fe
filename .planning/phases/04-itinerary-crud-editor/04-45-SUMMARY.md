---
phase: 04-itinerary-crud-editor
plan: 45
subsystem: ui-web
tags: [map, sheet, presentation, a11y, wave-27]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-42 token --map-day-N, --map-pin-size*, --map-day-dot-size, --map-label-max-width, --map-dimmed-opacity"
provides:
  - "Sheet: snap? / onSnapChange? (controlled theo tên mức, tương thích ngược) và snapHeightPx"
  - "MapPin, MapToneDot, mapToneClass, MapZoomControls (không phụ thuộc thư viện bản đồ)"
affects: [04-46, 04-47, 04-49, 04-50]
tech-stack:
  added: []
  patterns: ["Bảng class tĩnh theo trạng thái thay cho nhánh JSX", "Pin aria-hidden, danh sách là đường bàn phím chính (D-128)"]
key-files:
  created:
    - packages/ui-web/src/molecules/map-pin.tsx
    - packages/ui-web/src/molecules/map-pin.test.tsx
    - packages/ui-web/src/molecules/map-zoom-controls.tsx
    - packages/ui-web/src/molecules/map-zoom-controls.test.tsx
    - packages/ui-web/src/molecules/sheet-controlled.test.tsx
  modified:
    - packages/ui-web/src/molecules/sheet.tsx
    - packages/ui-web/src/molecules/sheet-snap.ts
    - packages/ui-web/src/molecules/sheet-snap.test.ts
    - packages/ui-web/src/index.ts
    - packages/ui-web/src/exports.test.ts
key-decisions:
  - "Test onSnapChange nằm ở file riêng, bọc Drawer.Root để gọi onSnapPointChange như lúc vuốt thật (jsdom không vuốt được); sheet.test.tsx cũ không đổi"
  - "snapHeightPx tự export qua index vì index đã export sheet-snap"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 45: Phần trình bày chung của bản đồ trong ui-web Summary
**`Sheet` có `snap`/`onSnapChange` controlled và `snapHeightPx`; thêm `MapPin`, `MapToneDot`, `MapZoomControls` chỉ dùng class token, không import thư viện bản đồ.**
## Accomplishments
- Sheet: mức controlled theo tên (bỏ qua khi `fixedSnap`), `onSnapChange` báo tên mức sau vuốt, không báo khi đóng hay `fixedSnap`; không truyền prop mới thì 70+ test cũ vẫn xanh.
- `MapPin`: 3 trạng thái (28px / 36px + ring / mờ không nhận chuột), vùng chạm `size-control-lg` 48px, nhãn chỉ khi selected, nội dung là text node.
- `MapZoomControls`: `role="group"` "Thu phóng bản đồ", nút 48px, vô hiệu ở biên, `visible=false` trả `null`.
## Task Commits
1. Task 1 (Sheet, snapHeightPx): `7511df9`
2. Task 2 (MapPin, MapToneDot, MapZoomControls, export): `9291093`
## Deviations from Plan
None.
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/ui-web lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/ui-web test -- --run` | 39 file, 377 test (baseline 342, +35) |
| `pnpm --filter @tripory/design-tokens test -- --run` | 32/32 |
## Self-Check: PASSED
