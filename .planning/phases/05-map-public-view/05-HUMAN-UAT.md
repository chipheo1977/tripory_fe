---
status: partial
phase: 05-map-public-view
source: [05-VERIFICATION.md]
started: 2026-11-11T00:00:00Z
updated: 2026-11-11T00:00:00Z
---

## Current Test

[awaiting human testing] Kịch bản chi tiết: `05-UAT-CHECKLIST.md` (51 dòng).

## Tests

### 1. Preview link trên Zalo và Messenger (F1-F7)
expected: Dán link lịch trình đã xuất bản hiện tiêu đề, mô tả, ảnh; link nháp không lộ tiêu đề. Nếu Zalo trống, lấy UA thật và chỉnh `htmlLimitedBots` (RESEARCH A1).
result: [pending]

### 2. Web Share và QR trên iPhone Safari và Android Chrome (E2, E3)
expected: Nút Web Share mở bảng chia sẻ hệ điều hành; QR quét ra đúng trang; ảnh QR tải về quét được.
result: [pending]

### 3. Bản đồ chỉ đọc trên thiết bị cảm ứng thật (C1-C6, J4)
expected: Chuyển Bài viết/Bản đồ, sheet 3 mức, viên thuốc luôn thấy, không đè nút ghi công; lỗi WebGL hiện "Không tải được bản đồ".
result: [pending]

### 4. Dải đáy ở 320×568 (H2, FLAG 2)
expected: [chip "Lịch trình" + viên thuốc] vừa 288px, không tràn, không bị che.
result: [pending]

### 5. Trình đọc màn hình và bàn phím (H3-H6)
expected: Một `h1` mỗi chế độ, viên thuốc một điểm dừng Tab với phím mũi tên, nút Sửa có tên "Sửa lịch trình", hộp chia sẻ đúng focus.
result: [pending]

### 6. Nháp, 403, 404, hồi phục phiên (D1-D5, G1-G2)
expected: Khách và người khác thấy 403 tối giản; chủ thấy dải nháp + Sửa; token hết hạn tự hồi phục (D-22); màn hình 404 hiện đúng trên trình duyệt thật.
result: [pending]

### 7. Luồng xuất bản trong editor (E4-E7)
expected: Xuất bản xong mở hộp chia sẻ, một toast sau khi đóng, focus về nút Chia sẻ; lỗi mạng không mở hộp.
result: [pending]

### 8. Tác giả (BE-05-01) và tồn đọng Phase 4 (I1-I2, J1-J4)
expected: Không `author` thì ẩn khối tác giả, không lỗi; có `author` thì hiện avatar + tên, không có email.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
