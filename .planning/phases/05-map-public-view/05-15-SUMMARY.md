---
phase: 05-map-public-view
plan: 15
subsystem: public-map-mode
tags: [map, read-only, sheet, pill, selection, wave-5]
provides:
  - "`usePublicMapState` (tab, chọn điểm, camera, sheet snap, mô hình pin/đường)"
  - "`PublicPillBar` (viên thuốc trong thanh dính đáy sheet)"
  - "`PublicMapMode` (chế độ Bản đồ chỉ đọc, dùng `WideBody`/`NarrowBody`/`EditorMapArea` của editor)"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/use-public-map-state.ts
    - apps/web/src/modules/itinerary/ui/public-pill-bar.tsx
    - apps/web/src/modules/itinerary/ui/public-map-mode.tsx
    - "(+ 2 file test)"
requirements-completed: [PUB-02]
completed: 2026-11-11
---
# Phase 5 Plan 15: Chế độ Bản đồ chỉ đọc Summary

**Cùng một bản đồ và bố cục với editor, không có thao tác ghi; viên thuốc chuyển chế độ luôn đúng một bản trong DOM dưới `lg`.**

## Accomplishments
- `usePublicMapState` sao logic chọn/camera/tab của `LoadedEditor` (D-125..D-127, D-131..D-136) nhưng bỏ phần ghi: `pendingIds` luôn rỗng, không form/bản nháp/lưu. `handleActivate` chỉ dời bản đồ khi `mapStatus === "ready"`; điểm đang chọn không còn trong lịch trình thì về `null`; rê dòng ngày chỉ có tác dụng khi `wide`.
- `PublicMapMode`: `main#map-content` + `h1.sr-only`; từ `lg` `WideBody`, dưới `lg` `NarrowBody` với `reopenCompanion` là viên thuốc `dock`; khi sheet mở viên thuốc nằm trong `PublicPillBar` (cơ chế `TimelineAddBar`, sát đáy ở cả ba mức). Lỗi bản đồ: "Bạn vẫn xem được lịch trình dạng bài viết." + "Xem dạng bài viết"; không `TripSummary`, không `fallback`/`controls`. Rỗng: chip "Lịch trình chưa có điểm đến nào".
- Test: 14 (hook) + 13 (container; map giả): tab, dòng ngày → focus tab, danh sách ↔ pin hai chiều, không có điều khiển sửa/thêm/xóa/kéo, lỗi/rỗng, narrow một viên thuốc di chuyển giữa sheet và dải đáy, ghim bấm khi sheet đóng mở lại sheet.

## Deviations
Không có. Việc đo sát đáy thật của viên thuốc ở 320px và độ mượt sheet trên thiết bị cảm ứng chỉ người kiểm được (UAT).

## Verification
Gate gốc: xem báo cáo wave 5.
