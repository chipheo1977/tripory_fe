# Phase 5: Map & Public View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-07
**Phase:** 05-map-public-view
**Areas discussed:** Bố cục bài viết, Chuyển Bài viết/Bản đồ, Chia sẻ, Preview link và trang lỗi/nháp

---

## Bố cục bài viết

| Câu | Lựa chọn | Đã chọn |
|---|---|---|
| 1 Đầu trang | (a) ảnh bìa lớn + tiêu đề, mô tả, ngày, số ngày, số điểm, km / (b) bản gọn chỉ chữ | a |
| 2 Tác giả | (a) không hiện, chủ thấy "Lịch trình của bạn", đề xuất BE `author` / (b) chờ BE | Khác: BE nhúng `author {id, displayName, avatarUrl}` vào DTO (không dùng `GET /users/{id}`); FE không chờ, ẩn khi chưa có |
| 3 Mỗi điểm | (a) số màu ngày, tên, địa chỉ, ghi chú, link Google Maps / (b) không link | a |
| 4 Thanh nhảy nhanh | (a) chip ngày dính, tô ngày đang đọc / (b) không | a |
| 5 Ngày trống | (a) ẩn / (b) hiện "Chưa có điểm" | b |

**Notes:** Người dùng hỏi vì sao cần `author`; đã giải thích FE chỉ có `userId`, BE phải trả tên/avatar.

## Chuyển Bài viết/Bản đồ

| Câu | Lựa chọn | Đã chọn |
|---|---|---|
| 6 Mặc định | (a) Bài viết / (b) Bản đồ | a (làm cả hai, người xem tự chuyển) |
| 7 URL | (a) `?view=map` / (b) state trong trang | a |
| 8 Vị trí nút | (a) viên thuốc nổi đáy mobile, thanh trên desktop / (b) dải tab mọi màn | a |
| 9 Chế độ Bản đồ | (a) giống editor chỉ đọc, tab Tổng quan + ngày / (b) chỉ bản đồ toàn màn + thẻ pin | a |
| 10 Bản đồ lỗi | (a) thông báo + Thử lại + Xem dạng bài viết / (b) tự chuyển + toast | a |

## Chia sẻ

| Câu | Lựa chọn | Đã chọn |
|---|---|---|
| 11 Nút Chia sẻ | (a) desktop thanh trên, mobile icon header / (b) thanh dính đáy mobile | a |
| 12 Bấm Chia sẻ | (a) luôn mở hộp (link, QR, Web Share khi hỗ trợ) / (b) mobile mở thẳng share sheet | a |
| 13 QR | (a) có "Tải ảnh QR" / (b) chỉ hiện | a |
| 14 Editor | (a) thế chỗ nút Xuất bản, tự mở sau xuất bản / (b) trong nút "i" | a |
| 15 Link "Mở trang công khai" | (a) có / (b) không | a |
| 16 Chủ xem nháp | (a) ẩn Chia sẻ / (b) hiện kèm cảnh báo | a |

## Preview link và trang lỗi/nháp

| Câu | Lựa chọn | Đã chọn |
|---|---|---|
| 17 Ảnh OG | (a) ảnh tự thêm, không thì ảnh OG mặc định Tripory / (b) luôn `coverImageUrl` / (c) luôn mặc định | a |
| 18 Mô tả OG | (a) mô tả cắt 160, trống thì câu tóm tắt / (b) luôn câu tóm tắt | a |
| 19 Index | (a) `noindex` mọi trang công khai / (b) cho index trang đã xuất bản | a |
| 20 Trang 403 | (a) thông báo + Đăng nhập + Về trang chủ / (b) thông báo + Về trang chủ | b |
| 21 Chủ xem | (a) banner nháp + Sửa; đã xuất bản có Sửa nhỏ / (b) chỉ nháp có Sửa | a |
| 22 Thẻ đã xuất bản | (a) vẫn vào editor, menu thêm "Xem trang công khai" / (b) mở trang công khai | a |
| 23 Không phải chủ mở editor | (a) chuyển sang trang công khai / (b) giữ 403 | a |

## Claude's Discretion

Cách lấy dữ liệu SSR và chống Bearer stale, tách component bản đồ chỉ đọc, thư viện QR, biến môi trường URL gốc, nhận biết ảnh giữ chỗ, ảnh OG mặc định, copy phụ, giữ hay bỏ toast xuất bản khi hộp chia sẻ tự mở.

## Deferred Ideas

OG động (UX-02), cho index + sitemap, trang hồ sơ tác giả, nút chia sẻ từng mạng xã hội, ảnh bìa thật 34 điểm đến, hủy xuất bản.
