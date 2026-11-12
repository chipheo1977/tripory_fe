---
phase: 05-map-public-view
plan: 16
subsystem: navigation
tags: [itinerary-card, itinerary-editor, redirect, d-24, d-25, wave-1]
provides:
  - "Mục \"Xem trang công khai\" (icon Eye) trong menu thẻ đã xuất bản (D-24)"
  - "Editor chuyển người không phải chủ sang `/itineraries/{id}` khi lịch trình đã xuất bản (D-25)"
key-files:
  modified:
    - apps/web/src/modules/itinerary/ui/itinerary-card.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-card.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.test.tsx
requirements-completed: [PUB-03]
completed: 2026-11-11
---
# Phase 5 Plan 16: Hai thay đổi điều hướng hoãn từ Phase 4 Summary

**Thẻ đã xuất bản có lối vào trang công khai; người không phải chủ mở editor của lịch trình đã xuất bản được chuyển sang trang công khai.**

## Accomplishments
- `PublicPageMenuItem` (có prop `visible`) đứng sau "Mở", trước dải phân cách; là `next/link` tới `/itineraries/{id}`, không `target`, không đặt cờ "vào từ danh sách". Thẻ nháp không có mục này.
- `shouldRedirectToPublic` (hàm thuần) + `RedirectToPublic` (side effect `router.replace` trong `useEffect`, hiện skeleton trong lúc chờ, không toast). Chủ và nháp của người khác (trang 403) không đổi; BE 403 vẫn trang 403.
- Test: +3 ở card, +2 ở editor.

## Deviations
Sửa có chủ đích một ca Phase 4 theo D-25: `shows the forbidden body without edit actions when the owner is somebody else` dùng `isPublic: true`, nay đổi thành `isPublic: false` (tên ca đổi thành "...when a draft belongs to somebody else") vì lịch trình đã xuất bản của người khác bị chuyển hướng. Ca BE 403 giữ nguyên.

## Verification
Gate gốc xanh: lint (0 lỗi, 1 cảnh báo cũ), typecheck, test (web 2182).
