---
phase: 05-map-public-view
plan: 08
subsystem: public-article-blocks
tags: [article, hero, author-line, waypoint, xss-safe, wave-2]
provides:
  - "`public-format.ts`: `articleMetaLine`, `daySectionTitle`, `daySectionMeta`, `googleMapsUrl`, `mapsLinkLabel`, `dayAnchorId`"
  - "`AuthorLine` (4 ca tác giả/chủ), `ArticleHero`, `ArticleWaypoint`, `ArticleDaySection`"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/public-format.ts
    - apps/web/src/modules/itinerary/ui/public-format.test.ts
    - apps/web/src/modules/itinerary/ui/author-line.tsx
    - apps/web/src/modules/itinerary/ui/author-line.test.tsx
    - apps/web/src/modules/itinerary/ui/article-hero.tsx
    - apps/web/src/modules/itinerary/ui/article-hero.test.tsx
    - apps/web/src/modules/itinerary/ui/article-waypoint.tsx
    - apps/web/src/modules/itinerary/ui/article-day-section.tsx
    - apps/web/src/modules/itinerary/ui/article-day-section.test.tsx
requirements-completed: [PUB-01]
completed: 2026-11-11
---
# Phase 5 Plan 08: Khối trình bày chế độ Bài viết Summary

**Hero, tác giả, mục ngày và điểm cho bài viết công khai; ghi chú/mô tả/tên là text node, link ngoài an toàn.**

## Accomplishments
- Hàm thuần tái dùng `overviewMetaLine` và `formatKm`/`formatStartDate`, không `new Date()`.
- `AuthorLine` theo bảng 4 ca; chỉ nhận `displayName`, `avatarUrl`, `isOwner` (không email, không id).
- `ArticleHero` dùng `CoverImage loading="eager"` (referrerPolicy giữ), `h1` `text-display`, mô tả `whitespace-pre-line`, slot `author`.
- `ArticleDaySection`: `section#ngay-N` có `aria-labelledby`, `h2` `tabIndex -1` nhận `headingRef`, `scrollMarginTop` qua style (không tạo biến CSS), ngày trống hiện "Chưa có điểm" không có `ol`. `ArticleWaypoint` 7 prop, `mapToneClass`, link Google Maps `target=_blank rel="noopener noreferrer"` có `aria-label` nêu tên điểm.
- Test: 60 ca trong các file liên quan (public-format 17, author-line 6, article-hero 11, article-day-section 12, cộng invariants).

## Deviations
Không có.

## Verification
Gate gốc: xem báo cáo wave 2.
