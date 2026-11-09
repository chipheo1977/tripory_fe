---
phase: 04-itinerary-crud-editor
plan: 49
subsystem: web-editor-layout
tags: [map, layout, sheet, states, wave-29]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-45 Sheet snap/onSnapChange + snapHeightPx, 04-46 LazyTripMap + MapViewport + MAP_LOAD_TIMEOUT_MS"
provides:
  - "editor-map-viewport.ts: MapFrame, SheetSnapRequest, wideViewport, narrowViewport, REOPEN_CHIP_AREA_PX"
  - "EditorLayout với slot map(frame) và sheetSnapRequest (bỏ canvas/summary)"
  - "EditorMapArea (đang tải, sẵn sàng, chưa có điểm, lỗi + thử lại + dự phòng TripSummary), MapStatusOverlay"
affects: [04-50, 04-51]
tech-stack:
  added: []
  patterns: ["Yêu cầu bằng seq, áp một lần (điều chỉnh state trong lúc render)", "Ẩn/hiện bằng component trả null theo prop visible"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/editor-map-viewport.ts
    - apps/web/src/modules/itinerary/ui/editor-map-viewport.test.ts
    - apps/web/src/modules/itinerary/ui/editor-map-area.tsx
    - apps/web/src/modules/itinerary/ui/editor-map-area.test.tsx
    - apps/web/src/modules/itinerary/ui/map-status-overlay.tsx
  modified:
    - apps/web/src/modules/itinerary/ui/editor-layout.tsx
    - apps/web/src/modules/itinerary/ui/editor-layout.test.tsx
    - apps/web/src/modules/itinerary/ui/editor-skeleton.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
    - apps/web/src/modules/itinerary/ui/ellipsis-menu.test.tsx
key-decisions:
  - "itinerary-editor.tsx tạm truyền map={(frame) => <TripSummary …/>} để typecheck; 04-51 thay bằng EditorMapArea"
  - "Chiều cao viewport dưới lg đọc bằng useSyncExternalStore (SSR trả 640, khớp mặc định của Sheet)"
  - "Chip trạng thái dùng style maxWidth với biến token thay cho class arbitrary"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 49: Lắp bản đồ vào khung editor Summary
**EditorLayout có một slot `map(frame)` cho desktop lẫn nền mobile, vùng an toàn tính theo mức sheet; EditorMapArea quản lý tải/rỗng/lỗi/timeout 15 giây và dự phòng TripSummary.**
## Accomplishments
- Desktop: cột phải `relative isolate overflow-hidden`, không padding/cuộn. Mobile: bản đồ `fixed` từ đáy header; sheet controlled `snap`/`onSnapChange`; đóng sheet thì chừa 76px; chip mở lại về mức vừa.
- `sheetSnapRequest` đưa sheet về mức yêu cầu, mở lại khi đang đóng, không áp lại cùng `seq`.
- `EditorMapArea`: skeleton + "Đang tải bản đồ…", chip "Thêm điểm đến để thấy trên bản đồ", lỗi "Không tải được bản đồ" + "Thử lại" (focus về section, lỗi lần nữa thì focus nút), timeout 15 giây bằng fake timers.
- `EditorSkeleton`: canvas desktop và nền mobile là một khối phủ kín.
## Task Commits
1. Task 1: `c5672b3`
2. Task 2: `2729e9c`
## Deviations from Plan
**[Rule 3 - Blocker] Test khác dùng API cũ của EditorLayout** - `ellipsis-menu.test.tsx` truyền `canvas`/`summary` làm typecheck đỏ | Fix: đổi sang `map={() => null}` | Commit `c5672b3`.
**[Rule 1] Rule React Compiler** - `ReactNode`/ref lồng object và `refs` | không phát sinh ở plan này; `create-itinerary-dialog.test.tsx` đỏ 1 ca trong lần chạy toàn bộ (quá tải 32s), chạy riêng 26/26 xanh (đã biết từ đầu).
**Total deviations:** 1 auto-fixed. **Impact:** không đổi hành vi.
## Chưa kiểm
- Bố cục thật dưới lg (bản đồ cố định dưới sheet, vị trí ghi công theo mức sheet) và các trạng thái với WebGL thật: kiểm ở UAT 04-53.
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/web test -- --run` | 122 file, 1902 test, 1 ca flaky create-itinerary-dialog (xanh khi chạy riêng 26/26) |
| `pnpm --filter @tripory/design-tokens test -- --run` | 32/32 |
| `pnpm --filter @tripory/ui-web test -- --run token-guard` | 46/46 |
## Self-Check: PASSED
