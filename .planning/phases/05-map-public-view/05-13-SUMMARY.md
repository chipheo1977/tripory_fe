---
phase: 05-map-public-view
plan: 13
subsystem: public-status-bodies
tags: [403, skeleton, load-error, skip-link, wave-3]
provides:
  - "`SkipLink`, `PublicStatusFrame`, `PublicForbidden`, `PublicItinerarySkeleton`, `PublicLoadError`, `PublicRefreshError`"
key-files:
  created:
    - apps/web/src/components/skip-link.tsx
    - apps/web/src/modules/itinerary/ui/public-status-frame.tsx
    - apps/web/src/modules/itinerary/ui/public-forbidden.tsx
    - apps/web/src/modules/itinerary/ui/public-itinerary-skeleton.tsx
    - apps/web/src/modules/itinerary/ui/public-load-error.tsx
    - "(+ 4 file test)"
requirements-completed: [PUB-03]
completed: 2026-11-11
---
# Phase 5 Plan 13: Thân trạng thái trang công khai Summary

**Trang 403 tối giản không mời đăng nhập, skeleton hình bài viết có cold start 5 giây, lỗi tải có "Thử lại" (`router.refresh()`), cùng khung chung có skip link.**

## Accomplishments
- `PublicForbidden`: không nhận prop; test khẳng định `textContent` chỉ gồm ba câu copy khóa và `PublicForbidden.length === 0`, không có nút/link Đăng nhập.
- `PublicItinerarySkeleton`: ảnh bìa theo `--itinerary-cover-ratio`, 3 chip `h-11`, 2 khối ngày, `p.sr-only role=status` "Đang tải lịch trình…", `SubmitStatus` hiện câu cold start sau đúng 5000ms.
- `PublicLoadError` dùng `EmptyState` (copy riêng) thay `ErrorState` cố định của ui-web, không sửa ui-web.
- `PublicStatusFrame`: skip link tới `#public-content`, `main tabIndex=-1`, `min-h-dvh`.
- 11 test mới.

## Deviations
Không có.

## Verification
Gate gốc: xem báo cáo wave 3.
