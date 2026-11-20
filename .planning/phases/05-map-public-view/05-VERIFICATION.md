---
phase: 05-map-public-view
status: passed
verified: 2026-11-11
uat_confirmed: 2026-11-20
verifier: inline (cùng agent thực thi; KHÔNG độc lập vì môi trường không có công cụ spawn subagent)
score: 4/4 tiêu chí có bằng chứng tự động; 4/4 có xác nhận của người dùng (không kiểm độc lập)
---

> **Cập nhật 2026-11-20:** `human_needed` đổi thành `passed` dựa HOÀN TOÀN trên xác nhận của người dùng: `05-HUMAN-UAT.md` 8/8 và `05-UAT-CHECKLIST.md` 51/51, tổng hợp ở `05-UAT.md`. Agent không kiểm độc lập, không có số đo, ảnh chụp hay thông tin thiết bị. Tồn đọng không chặn: chưa có review code độc lập (`05-REVIEW.md` là `skipped`), chưa có `05-SECURITY.md`, BE-05-01 (`author`) là việc BE của người dùng.
> Các bảng bên dưới giữ nguyên nội dung ngày 2026-11-11; cột "Cần người" nay đã được người dùng xác nhận.
# Phase 5: Xác minh mục tiêu

Mục tiêu: khách chưa đăng nhập mở link chia sẻ và đọc được lịch trình đã xuất bản dưới dạng bài viết hoặc bản đồ; link hiện preview đẹp khi dán vào ứng dụng nhắn tin.

Người xác minh là chính agent đã viết code, nên bản này chỉ ghi bằng chứng đã đo và không đánh PASS cho thứ chỉ người mới kiểm được. Trạng thái `human_needed`: toàn bộ phần cần người nằm ở `05-UAT-CHECKLIST.md` và `05-HUMAN-UAT.md`.

## Cổng tự động (2026-11-11)

`pnpm lint` 0 lỗi (1 cảnh báo cũ), `pnpm typecheck` xanh, `pnpm test` xanh (web 2579, itinerary 636, ui-web 388, identity 244, api-client 98, config 114, design-tokens 33, shared-kernel 32), `next build` xanh.

## Tiêu chí ROADMAP

| # | Tiêu chí | Bằng chứng tự động | Cần người |
|---|----------|--------------------|-----------|
| 1 | Khách mở link đã xuất bản thấy trang SSR bố cục bài viết theo ngày | `next start` + BE giả: 200, `h1`, đủ mục ngày (kể cả ngày trống), tác giả, `noindex`; không redirect `/login`; `?view=map` vẫn có bài viết trong HTML | B1-B5 trên bản deploy |
| 2 | Nháp: 403 cho khách, id sai 404; chủ thấy "Bản nháp – chỉ bạn thấy" + Sửa | Nháp (BE 403) ra đúng chữ 403, không lộ tiêu đề (sau khi sửa lỗi RSC của `PublicForbidden`); id sai và BE 404 ra fallback 404 của Next; HTTP vẫn 200 do stream (đã chấp nhận). Banner/Sửa/`recover` chỉ kiểm bằng test đơn vị (05-12, 05-18), chưa chạy với phiên chủ thật | D1-D5, G1-G2 |
| 3 | Copy link, Web Share, QR; xuất bản xong mở hộp chia sẻ + nút "Chia sẻ" ở editor; preview Zalo/Messenger; nháp `noindex` | Test đơn vị cho 05-09, 05-11, 05-17. Đo: `og:*` nằm trong `<head>` với UA `Zalo`, `Facebot`, `meta-externalagent`, `facebookexternalhit`; ảnh OG mặc định 1200×630; `noindex` ở mọi trang | E1-E7, F1-F7 (Zalo/Messenger thật, điện thoại thật). Giả định A1 (UA thật của Zalo) chưa kiểm |
| 4 | Nút chuyển Bài viết/Bản đồ, dùng lại bản đồ Phase 4 | Test đơn vị 05-12, 05-14, 05-15, 05-18; MapLibre không nằm trong chunk JS đầu, có chunk và worker riêng | C1-C6, H1-H6 (WebGL, sheet cảm ứng, 320px) |

## Yêu cầu

| ID | Trạng thái | Ghi chú |
|----|------------|---------|
| PUB-01 | Tự động xong, chờ người | B1-B5 |
| PUB-02 | Tự động xong, chờ người | C1-C6 |
| PUB-03 | Tự động xong, chờ người | D1-D5; D4 (hồi phục phiên) chỉ có test đơn vị |
| PUB-04 | Tự động xong, chờ người | E1-E7 |
| PUB-05 | Tự động xong, chờ người | F1-F7; Zalo UA chưa biết |

## Lỗi phát hiện khi xác minh

`PublicForbidden` gọi `buttonVariants()` từ server component làm trang 403 của nháp chỉ hiện skeleton. Đã sửa (`"use client"`) và khóa bằng invariant ở commit `9669935`. Test đơn vị không bắt được lớp lỗi này; chỉ chạy bản build thật mới thấy. Lớp lỗi tương tự có thể còn ở chỗ khác chỉ khi render server: `editor-forbidden.tsx` (Phase 4) chưa có `"use client"` và gọi `buttonVariants`, hiện được render trong cây client nên chưa lỗi (G2 sẽ cho thấy).

## Phụ thuộc BE

- BE-05-01 (`author`): không chặn; FE ẩn khối tác giả khi thiếu. Hướng dẫn ở `05-BE-GUIDE.md`.
- Mục 6-11 của `04-BE-CONTRACT.md` và `CoverImageBaseUrl`: người dùng xác nhận đã xong; agent chưa kiểm độc lập.

## Human verification

Danh sách ở `05-HUMAN-UAT.md`.
