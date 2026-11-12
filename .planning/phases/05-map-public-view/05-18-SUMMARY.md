---
phase: 05-map-public-view
plan: 18
subsystem: public-page-assembly
tags: [route, rsc, metadata, header, view-mode, share, wave-6]
provides:
  - "Route `/itineraries/[id]` (`(public)/(viewer)`): `page.tsx` + `generateMetadata`, `loading.tsx`, `error.tsx`"
  - "`PublicItineraryPage` (RSC phân loại kết quả), `PublicItineraryView`, `PublicViewLayout`"
  - "`usePillFocusRequest`"
key-files:
  created:
    - "apps/web/src/app/(public)/(viewer)/itineraries/[id]/{page,loading,error}.tsx + page.test.tsx + states.test.tsx"
    - apps/web/src/modules/itinerary/ui/public-itinerary-page.tsx
    - apps/web/src/modules/itinerary/ui/public-itinerary-view.tsx
    - apps/web/src/modules/itinerary/ui/public-view-layout.tsx
    - "(+ 2 file test)"
  modified:
    - apps/web/src/modules/itinerary/ui/use-pill-focus-handoff.ts
    - apps/web/src/modules/itinerary/ui/use-pill-focus-handoff.test.tsx
requirements-completed: [PUB-01, PUB-02, PUB-03, PUB-04, PUB-05]
completed: 2026-11-11
---
# Phase 5 Plan 18: Ghép trang công khai Summary

**Khách mở `/itineraries/{id}` thấy bài viết SSR hoặc bản đồ chỉ đọc; nháp trả 403 tối giản; chủ thấy banner + Sửa; chia sẻ bằng link/QR/Web Share; OG + noindex.**

## Accomplishments
- RSC ánh xạ `ok | forbidden | not-found | recover | error` (switch có kiểm tra đầy đủ). Client chỉ nhận `Itinerary`, boolean `canEdit` (tính ở server) và node tài khoản; test khóa danh sách khóa props và không có token.
- `generateMetadata` và trang dùng chung `getPublicItinerary` (một lần gọi BE mỗi request); id sai dạng GUID: metadata trung tính `noindex` và `notFound()` trước mọi lời gọi BE/cookie.
- `PublicViewLayout`: header theo vai trò (khách: Chia sẻ; chủ đã xuất bản: Sửa + Chia sẻ; chủ nháp: DraftStrip, không Chia sẻ; người khác không bao giờ có Sửa), bài viết luôn dựng và `hidden` ở Bản đồ, Bản đồ chỉ mount ở chế độ Bản đồ, đúng một viên thuốc trong DOM ở mọi ca, "Xem dạng bài viết" trả focus về đoạn "Bài viết".
- `ShareDialog showPublicLink={false}`: URL không có `?view`.
- **`next build` thật chạy xanh**: `/itineraries/[id]` là Partial Prerender (◐); KHÔNG gặp `blocking-prerender-metadata-runtime`, nên không cần `DynamicMarker`.
- Test: view 15, page 9, route 5 + states 2, focus-request 2.

## Deviations
- Giả định cần hỏi người dùng (blocking-prerender-metadata-runtime) không xảy ra, không có gì để hỏi.
- Toàn bộ suite có một lần chạy gốc hai test cũ (`itinerary-editor`, `create-itinerary-dialog`) quá 5000ms do tải máy; chạy riêng và chạy lại cả bộ đều xanh (2572 test). Không đổi code.
- Lỗi lint `react-hooks/refs` khi dùng `header.ref`/`header.height` từ object; đã destructure như `EditorLayout`.

## Chưa kiểm được (UAT)
Hành vi trên trình duyệt thật, 320px, thiết bị cảm ứng, preview link Zalo/Messenger.
