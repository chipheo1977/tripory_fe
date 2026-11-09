---
phase: 04-itinerary-crud-editor
plan: 47
subsystem: web-itinerary-ui
tags: [overview, day-tabs, a11y, wave-28]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-43 summarizeDays/EditorTab/dayColorIndex, 04-45 MapToneDot"
provides:
  - "overview-format.ts: dayRowTitle/Meta/AccessibleName, overviewTabAccessibleName, overviewMetaLine, overviewSummaryData, tabValue/parseTabValue"
  - "DayTabs có tab Tổng quan (selectedTab/onSelectTab theo EditorTab) và chấm màu ngày"
  - "OverviewSummary, DayOverviewRow, OverviewPanel (chưa nối vào editor, 04-51 làm)"
  - "trip-cover.tsx dùng chung (TripCover, showAddButton)"
affects: [04-50, 04-51]
tech-stack:
  added: []
  patterns: ["Class theo biến thể bằng bảng tĩnh", "Component trả null thay cho ? : / && ẩn hiện JSX", "Ref mảng trong object props phải destructure trước khi dùng (react-hooks/refs)"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/overview-format.ts
    - apps/web/src/modules/itinerary/ui/overview-format.test.ts
    - apps/web/src/modules/itinerary/ui/trip-cover.tsx
    - apps/web/src/modules/itinerary/ui/overview-summary.tsx
    - apps/web/src/modules/itinerary/ui/day-overview-row.tsx
    - apps/web/src/modules/itinerary/ui/overview-panel.tsx
    - apps/web/src/modules/itinerary/ui/overview-panel.test.tsx
  modified:
    - apps/web/src/modules/itinerary/ui/day-tabs.tsx
    - apps/web/src/modules/itinerary/ui/day-tabs.test.tsx
    - apps/web/src/modules/itinerary/ui/timeline-panel.tsx
    - apps/web/src/modules/itinerary/ui/trip-summary.tsx
key-decisions:
  - "TimelinePanel chỉ được sửa tối thiểu để DayTabs typecheck: bỏ qua 'overview' khi onSelectTab; 04-50 viết lại TimelinePanel"
  - "TripCover tách sang trip-cover.tsx (TripSummary import lại, hành vi giữ nguyên) với prop showAddButton cho ảnh thu nhỏ"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 47: Tab Tổng quan Summary
**Tab Tổng quan trong DayTabs cùng ba component chỉ xem (thông tin chung, dòng ngày, panel) và các hàm ghép chuỗi tiếng Việt có test bảng.**
## Accomplishments
- `DayTabs`: tab "Tổng quan" đứng đầu (tên truy cập "Tổng quan, 42,5 km"), tab ngày có `MapToneDot`; thêm ngày từ Tổng quan chọn ngày mới.
- `OverviewSummary` không có field điểm đến/sở thích/ngày kết thúc (test khóa tập khóa của `OverviewSummaryData`).
- `DayOverviewRow`: button, tên truy cập theo hàm thuần, rê/focus báo ngày, emphasis selected/recent.
- `OverviewPanel`: "Các ngày", `ol` "Tóm tắt các ngày", thanh "Thêm điểm đến" luôn hiện.
## Task Commits
1. Task 1 (format + DayTabs): `b287ce1`, sửa lint ref tab: `7180a90`
2. Task 2 (3 component + TripCover dùng chung): `9e257e6`
## Deviations from Plan
**[Rule 1 - Lint] react-hooks/refs** - `registerTab` curried và `actions.addButtonRef` bị rule React Compiler chặn | Fix: gọi `trackTab(tabRefs.current, …)` trong ref callback của JSX; `OverviewPanel` destructure `const { onEdit, onAdd, addButtonRef } = actions` trước khi dùng. Interface props không đổi | Commit `7180a90` và commit Task 2.
Task 1 bị commit trước khi lint chạy xong do lệnh nối bằng `;` (lint đỏ 1 lỗi), sửa ngay ở `7180a90`; không có commit nào sau đó bị đỏ.
**Total deviations:** 1 auto-fixed. **Impact:** không đổi hành vi.
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/web test -- --run` | 120 file, 1875 test (baseline ~1741) |
| `pnpm --filter @tripory/design-tokens test -- --run` | 32/32 |
## Self-Check: PASSED
