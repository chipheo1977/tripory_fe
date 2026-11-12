---
phase: 05-map-public-view
plan: 19
subsystem: verification
tags: [invariants, e2e-measurement, uat, wave-7]
provides:
  - "7 bất biến tĩnh Phase 5 trong `apps/web/src/itinerary-invariants.test.ts`"
  - "`05-UAT-CHECKLIST.md` (51 dòng, 0/51 chạy)"
  - "Sửa lỗi RSC của `PublicForbidden` phát hiện khi chạy bản build thật"
key-files:
  created:
    - .planning/phases/05-map-public-view/05-UAT-CHECKLIST.md
  modified:
    - apps/web/src/itinerary-invariants.test.ts
    - apps/web/src/modules/itinerary/ui/public-forbidden.tsx
requirements-completed: [PUB-01, PUB-02, PUB-03, PUB-04, PUB-05]
completed: 2026-11-11
---
# Phase 5 Plan 19: Kiểm chứng và UAT Summary

**Bất biến tĩnh đã khóa, bản build thật đã chạy với BE giả và tìm ra một lỗi thật (trang 403 vỡ ở server), đã sửa; checklist UAT 51 dòng sẵn sàng cho người dùng.**

## Accomplishments

- **Task 1.** `describe("public itinerary invariants (Phase 5, static)")` gồm 7 test: mọi `target="_blank"` đi kèm `rel="noopener noreferrer"`; route công khai không có http/fetch/cache dùng chung/cookies và có `generateMetadata`; không có file-based opengraph/twitter image; `uqr` chỉ trong app và không dùng `renderSVG`; file chỉ-đọc không import data client của editor hay dnd-kit; metadata luôn `noindex` và `PUBLIC_SITE_URL` chỉ ở server; trang 403 đúng chữ, không "Đăng nhập" và nay phải là `"use client"`. Helper `code()` bỏ dòng chú thích trước khi so từ cấm.
- **Task 2 (đo ở máy).** `next build` + `next start -p 3100` với BE giả ở `127.0.0.1:5099` (ngoài repo, đã xóa, các tiến trình đã dừng). Kết quả ở bảng dưới.
- **Task 3.** `05-UAT-CHECKLIST.md`, mục A-L, cột "Kết quả" để trống.

## Lỗi thật tìm thấy khi chạy build thật (đã sửa)

`PublicForbidden` là server component nhưng gọi `buttonVariants()`, hàm nằm trong file `'use client'` của `@tripory/ui-web`. Next ném `Attempted to call buttonVariants() from the server...` nên trang nháp của người lạ chỉ hiện skeleton, không bao giờ ra trang 403. Test jsdom (render component thẳng) không bắt được vì không có ranh giới RSC. Sửa: thêm `"use client"` cho `public-forbidden.tsx` (vẫn SSR), cùng một khẳng định trong invariant để khóa lại. Sau sửa: nháp ra "Lịch trình này chưa được xuất bản", không có "Đăng nhập", không lộ tiêu đề.

`editor-forbidden.tsx` cũng gọi `buttonVariants` mà không có `"use client"`; nó là code Phase 4 và được render bên trong cây client của editor, chưa thấy lỗi, nên không đổi. Việc cần mắt người: bước G2 (nháp của người khác ở `/edit`).

## Số đo (build thật, BE giả)

| Phép đo | Kết quả |
|---|---|
| Đã xuất bản | 200; `h1`, 3 mục ngày (ngày 2 trống "Chưa có điểm"), tác giả "Trần Thị Lan", `noindex, nofollow`; `og:image` = `/og-default.png` tuyệt đối, `og:url` đúng, `twitter:card` = `summary_large_image` |
| Nháp (BE 403) | 200 (stream), trang 403 đúng chữ, không lộ tiêu đề, không nút Đăng nhập, `noindex, nofollow` |
| BE 404 và id sai dạng GUID | 200 (stream), `robots: noindex`, dùng fallback 404 chuẩn của Next (chữ 404 chỉ có trong payload RSC, client render) |
| BE 500 | 200, "Không tải được lịch trình" + "Thử lại", `noindex, nofollow` |
| `?view=map` | Có bài viết trong HTML (`id="ngay-1"`), không lỗi bản đồ, không redirect `/login` |
| `og:*` trong `<head>` theo UA | `Zalo`, `Facebot`, `meta-externalagent`, `facebookexternalhit`: có. `RandomBot` và Chrome: có trong `<body>` (stream), đúng thiết kế |
| `/og-default.png` | 200, `image/png`, 1200×630, 23568 byte |
| Bundle | 0/20 chunk JS đầu chứa MapLibre; có chunk MapLibre riêng và `maplibre-gl-worker*.mjs` |
| `next build` | Xanh; `/itineraries/[id]` là Partial Prerender (◐), `/og-default.png` tĩnh (○); không có `blocking-prerender-metadata-runtime` |

Trong HTML của trang đã xuất bản, tiêu đề và các mục ngày xuất hiện hai lần: một lần ở `fallback` của `Suspense` (`PublicItineraryView`, cố ý để HTML đầu có nội dung) và một lần ở nội dung chính. Đây là thiết kế đã ghi trong comment của file, không phải lỗi.

Chưa đo được (chuyển sang UAT mục K, F): UA thật của Zalo có khớp `htmlLimitedBots` không (RESEARCH A1), màn hình 404 trên trình duyệt thật, mọi thứ cần thiết bị cảm ứng.

## Cổng cuối

- `pnpm lint`: 0 lỗi, 1 cảnh báo cũ (`day-tabs.test.tsx`, `_request` không dùng).
- `pnpm typecheck`: xanh (8/8).
- `pnpm test`: config 114, shared-kernel 32, api-client 98, identity 244, itinerary 636, ui-web 388, design-tokens 33, web 2579. Tất cả xanh (8/8).
- `next build` xanh.

## Deviations

- Plan nói "dừng bằng `list_processes`": các terminal cũ báo `exited/stopped`; cổng 3100 và 5099 đã được giải phóng, file stub/verify trong thư mục tạm đã xóa, không có gì trong repo.
- Lần chạy đầu của phép đo không hợp lệ vì stub không chạy (đường dẫn thư mục tạm); đã chạy lại và chỉ dùng kết quả lần sau.
- Không sửa ESLint hay thêm allowlist.

## Chưa kiểm được (UAT)

Xem `05-UAT-CHECKLIST.md`: Zalo/Messenger thật, Web Share và QR trên điện thoại, dải đáy ở 320px, trình đọc màn hình, hồi phục phiên (D-22), BE-05-01.
