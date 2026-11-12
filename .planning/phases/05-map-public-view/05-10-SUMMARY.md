---
phase: 05-map-public-view
plan: 10
subsystem: public-article
tags: [article-mode, day-chips, intersection-observer, wave-3]
provides:
  - "`EdgeFade` dùng chung (tách khỏi `day-tabs.tsx`)"
  - "`nextActiveDay`, `useDayNavigation`, `DayChipStrip`, `PublicArticle`"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/edge-fade.tsx
    - apps/web/src/modules/itinerary/ui/active-day.ts
    - apps/web/src/modules/itinerary/ui/use-day-navigation.ts
    - apps/web/src/modules/itinerary/ui/day-chip-strip.tsx
    - apps/web/src/modules/itinerary/ui/public-article.tsx
    - "(+ 4 file test)"
  modified:
    - apps/web/src/modules/itinerary/ui/day-tabs.tsx
requirements-completed: [PUB-01]
completed: 2026-11-11
---
# Phase 5 Plan 10: Chế độ Bài viết (dải chip, ngày đang đọc, PublicArticle) Summary

**Dải chip ngày dính, theo dõi ngày đang đọc bằng IntersectionObserver, nhảy ngày không đổi hash/lịch sử, và PublicArticle ghép hero + ngày + empty.**

## Accomplishments
- `EdgeFade` tách ra file riêng; `day-tabs.tsx` import lại, test cũ giữ nguyên.
- `useDayNavigation`: `rootMargin: -{offset}px 0px -60% 0px`; `goToDay` đọc `prefers-reduced-motion` lúc bấm, ghim chip tới `scrollend` hoặc 1000ms, focus `h2` với `preventScroll`, `scrollIntoView?.()` (jsdom không có), không đụng `location.hash`.
- `DayChipStrip`: `nav` có tên, chip `<a href="#ngay-N">` chặn mặc định, `aria-current`, `min-h-touch`, cuộn chip đang đọc vào khung (bỏ qua lần mount đầu); `stripRef` kiểu `Ref<HTMLElement>` để dùng với `useHeaderHeight`.
- `PublicArticle`: `scroll-margin-top` = stickyTop + chiều cao dải chip đo được + 16 (test: 64 + 44 + 16 = 124px); `main#article-content`; EmptyState khi không có ngày lẫn điểm.
- Test: active-day 4, use-day-navigation 11, day-chip-strip 8, public-article 10.

## Deviations
Không có.

## Verification
Gate gốc: xem báo cáo wave 3. Hành vi cuộn thật (ngày đang đọc theo cuộn, sticky) cần mắt người trên trình duyệt: để UAT.
