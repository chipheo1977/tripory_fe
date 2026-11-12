---
phase: 05-map-public-view
plan: 12
subsystem: public-navigation-frame
tags: [view-mode, url-state, pill, focus-handoff, header, draft-strip, wave-2]
provides:
  - "`parsePublicView`, `viewSearch`, `usePublicView` (`?view=map`, `history.pushState`)"
  - "`ViewModeToggle` (4 kiểu nền) + `usePillFocusHandoff`"
  - "`PublicHeader`, `DraftStrip`, `EditLink`"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/public-view.ts
    - apps/web/src/modules/itinerary/ui/use-public-view.ts
    - apps/web/src/modules/itinerary/ui/view-mode-toggle.tsx
    - apps/web/src/modules/itinerary/ui/use-pill-focus-handoff.ts
    - apps/web/src/modules/itinerary/ui/edit-link.tsx
    - apps/web/src/modules/itinerary/ui/draft-strip.tsx
    - apps/web/src/modules/itinerary/ui/public-header.tsx
    - "(+ 5 file test)"
requirements-completed: [PUB-02, PUB-03]
completed: 2026-11-11
---
# Phase 5 Plan 12: Khung điều hướng trang công khai Summary

**Chế độ xem trên URL (đổi chế độ chỉ `pushState`, không refetch), viên thuốc có bàn giao focus, header một hàng, dải bản nháp và link Sửa.**

## Accomplishments
- `parsePublicView` chỉ nhận đúng `map`; `viewSearch` giữ query khác; `usePublicView` ghi bằng `window.history.pushState` (docs Next 16.4, Native History API đã đối chiếu), không dùng `useRouter`.
- `ViewModeToggle` bọc `SegmentedControl` (`aria-label` "Chế độ xem", `data-view-mode-toggle`, icon ẩn dưới `sm`); `SegmentedControl` đã chuyển tiếp `data-*` qua `...rest` nên `ui-web` không phải sửa.
- `PublicHeader` (logo, giữa, phải; lưới ba cột từ `lg`), `DraftStrip` (không live region, U+2013), `EditLink` (thu thành icon dưới `md` khi `collapse`).

## Deviations
- **`usePillFocusHandoff` khác mô tả plan (cơ chế, không phải hành vi).** Plan nêu theo dõi `focusin` toàn cục. Làm vậy giữ cờ cũ sau khi cả cây bị gỡ (như giữa hai test, hoặc khi chuyển trang) và cướp focus của lần mount không liên quan. Đã thay bằng: cleanup của layout effect (lúc đó DOM chưa tháo nên biết focus có nằm trong viên thuốc không) chuyển focus ngay sang viên thuốc khác nếu đã tồn tại, nếu chưa thì đặt cờ chờ 500ms cho viên thuốc mount kế tiếp. Hành vi theo UI-SPEC không đổi và có test cho cả hai thứ tự (mới trước/cũ trước).
- **Phải nhận focus ở tick kế tiếp (`setTimeout 0`), không ngay lúc mount.** Đã đo bằng test: focus đặt đồng bộ trong lúc mount làm vòng điều hướng bằng mũi tên của Base UI chưa kịp đăng ký đoạn nên mũi tên không di chuyển focus. Có test "mũi tên vẫn chạy sau khi nhận bàn giao focus".
- Chưa đo bề rộng header ở 320px (cần trình duyệt/thiết bị thật): để UAT, không đánh dấu đạt.

## Verification
Gate gốc: xem báo cáo wave 2.
