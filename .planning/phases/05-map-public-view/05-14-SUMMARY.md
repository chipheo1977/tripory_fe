---
phase: 05-map-public-view
plan: 14
subsystem: public-map-readonly-bodies
tags: [tabs, overview, day-panel, maps-link, read-only, wave-4]
provides:
  - "`MapsLink` dùng chung cho bài viết và chế độ Bản đồ"
  - "`publicOverviewData`, `PublicOverviewSummary`, `PublicOverviewPanel`"
  - "`PublicDayTabs`, `PublicWaypointItem`, `PublicDayPanel`"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/maps-link.tsx
    - apps/web/src/modules/itinerary/ui/public-overview-summary.tsx
    - apps/web/src/modules/itinerary/ui/public-overview-panel.tsx
    - apps/web/src/modules/itinerary/ui/public-day-tabs.tsx
    - apps/web/src/modules/itinerary/ui/public-waypoint-item.tsx
    - apps/web/src/modules/itinerary/ui/public-day-panel.tsx
    - "(+ 5 file test)"
  modified:
    - apps/web/src/modules/itinerary/ui/article-waypoint.tsx
    - apps/web/src/modules/itinerary/ui/public-format.ts
    - apps/web/src/modules/itinerary/ui/public-format.test.ts
requirements-completed: [PUB-02]
completed: 2026-11-11
---
# Phase 5 Plan 14: Thân chỉ đọc của chế độ Bản đồ Summary

**Dải tab, Tổng quan và tab Ngày chỉ đọc, dùng lại `DayOverviewRow`, `CoverImage`, `EdgeFade`, `useTabStrip`; không hook ghi, không dnd-kit, không nút sửa.**

## Accomplishments
- `MapsLink` là điểm duy nhất sinh link Google Maps (`target=_blank`, `rel="noopener noreferrer"`, `aria-label` có tên điểm); `ArticleWaypoint` dùng nó, test bài viết giữ nguyên xanh.
- `PublicOverviewData` chỉ 6 trường (test khóa danh sách khóa); Tổng quan không Badge trạng thái, không "Thêm ảnh bìa", không "Thêm điểm đến", không vùng bấm sửa; gốc không `min-h-full` để thanh viên thuốc dính đáy của sheet (05-15) còn với tới.
- `PublicDayTabs`: một dòng, đủ Ngày 1..max, `min-h-touch`, `focusRequest` theo `seq`, cuộn tab chọn vào khung bằng `scrollIntoView?.()`.
- `PublicWaypointItem`: nút chọn (`aria-current`, vòng chọn), chi tiết NGAY SAU nút (ghi chú text + `MapsLink`), mô tả sr-only "Nhấn để xem trên bản đồ" chỉ khi bản đồ sẵn sàng. `PublicDayPanel`: phụ đề, "X điểm · Y km", ngày trống có thông báo riêng, không CTA.
- 42 test ở nhóm tổng quan + 9 (tabs) + 9 (day panel).

## Deviations
Không có.

## Verification
Gate gốc: xem báo cáo wave 4.
