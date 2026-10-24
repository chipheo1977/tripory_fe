# Phase 3: Identity & Session (BFF) - Discussion Log

> **Chỉ dùng làm audit trail.** Không dùng làm input cho agent research, planning hay execution.
> Quyết định nằm trong CONTEXT.md. Log này giữ lại các phương án đã cân nhắc.

**Date:** 2026-10-13
**Phase:** 03-identity-session-bff
**Areas discussed:** Màn đăng nhập/đăng ký, Auth gate và trạng thái khách, Menu user và đổi mật khẩu, Hết phiên và đăng xuất, Form mật khẩu, Trạng thái gửi và cold start, Copy trang auth

---

## Màn đăng nhập/đăng ký

| Câu hỏi | Phương án | Chọn |
|---|---|---|
| Vị trí màn | Hai trang riêng `/login`, `/register` · Một trang có tab · Dialog như FE cũ · Bạn quyết định | Hai trang riêng ✓ |
| Sau đăng ký | Tự đăng nhập · Chuyển `/login` điền sẵn email · Bạn quyết định | Tự đăng nhập ✓ |
| Đích mặc định | `/itineraries/mine` · `/` · Referrer | `/itineraries/mine` ✓ |
| Đã đăng nhập mở `/login` | Redirect · Hiện form kèm "đang đăng nhập với X" · Bạn quyết định | Redirect ✓ |
| Lỗi đăng nhập sai | Inline `role="alert"` · Toast · Cả hai | Inline ✓ |
| Bố cục | Trong AppShell public, Card căn giữa · Trang tối giản riêng · Chia đôi màn hình | AppShell public ✓ |
| Toast thành công | Không · Có toast ngắn · Chỉ đăng ký | Có toast ngắn ✓ (khác khuyến nghị) |

## Auth gate và trạng thái khách

| Câu hỏi | Phương án | Chọn |
|---|---|---|
| Header cho khách | Một nút Đăng nhập · Hai nút · Không hiện | Một nút ✓ |
| `/` khi đã đăng nhập | Giữ nguyên · Redirect · Thêm link | Giữ nguyên ✓ |
| Route gate | Cả `(dashboard)` · Allowlist từng path · Bạn quyết định | Cả `(dashboard)` ✓ |
| Fallback header | Skeleton avatar · Để trống · Nút Đăng nhập mặc định | Skeleton ✓ |

## Menu user và đổi mật khẩu

| Câu hỏi | Phương án | Chọn |
|---|---|---|
| Hồ sơ/Tin nhắn chưa có route | Chỉ mục có đích thật · Disabled + "Sắp có" · Tạo trang tối giản | Disabled + "Sắp có" ✓ (khác khuyến nghị) |
| Vị trí đổi mật khẩu | Dialog từ menu · Trang `/settings/password` · Bạn quyết định | Trang riêng ✓ (khác khuyến nghị) |
| Sau khi đổi mật khẩu | Đăng xuất và đăng nhập lại · Giữ phiên · Theo BE | Đăng xuất ✓ |
| Nút mở menu | Avatar / avatar+tên từ `sm` · Chỉ avatar · Bạn quyết định | Avatar / avatar+tên ✓ |
| Đầu menu | Tên + email · Chỉ tên · Không có | Tên + email ✓ |
| Sai mật khẩu hiện tại | Dưới ô · Inline đầu form · Toast | Dưới ô ✓ |

## Hết phiên và đăng xuất

| Câu hỏi | Phương án | Chọn |
|---|---|---|
| Hết phiên thật | Redirect + toast · Dialog chặn · Redirect im lặng | Redirect + toast ✓ |
| Xác nhận đăng xuất | Không · Có | Không ✓ |
| Sau đăng xuất | `/` · `/login` · Ở lại nếu là trang public | `/` ✓ |
| Đồng bộ đăng xuất giữa tab | BroadcastChannel · Không chủ động · Bạn quyết định | BroadcastChannel ✓ |
| Đồng bộ đăng nhập giữa tab | Có · Không | Có ✓ |
| RSC gặp access hết hạn | Hồi phục im lặng · `proxy` redirect · Bạn quyết định | Hồi phục im lặng ✓ |

## Form mật khẩu

| Câu hỏi | Phương án | Chọn |
|---|---|---|
| Hiển thị rule | Checklist cập nhật khi gõ · Đoạn văn tĩnh · Checklist khi gửi | Checklist khi gõ ✓ |
| Nhập lại mật khẩu | Chỉ đổi mật khẩu · Cả hai · Không | Cả hai ✓ (khác khuyến nghị) |
| Client validate | Đầy đủ · Tối thiểu · Đầy đủ + disable nút | Đầy đủ ✓ |
| Checklist ở đăng ký | Cùng component, rule theo BE · Áp rule mạnh · Hint tĩnh | Rule theo BE ✓ |

## Trạng thái gửi và cold start

| Câu hỏi | Phương án | Chọn |
|---|---|---|
| Nút khi đang gửi | Spinner + chữ + chặn gửi lần hai · Chỉ disable · Overlay | Spinner + chữ ✓ |
| Cold start | Dòng báo sau ~5 giây · Không báo · Bạn quyết định ngưỡng | Báo sau 5 giây ✓ |

## Copy trang auth

| Câu hỏi | Phương án | Chọn |
|---|---|---|
| Copy chính | Bộ đề xuất · Có chỉnh · Để UI-SPEC chốt | Bộ đề xuất ✓ |

## Claude's Discretion

Cookie, claim JWT, Web Locks trên iOS, hình dạng `packages/identity`, vị trí schema Zod và `isSafeNextPath`, cơ chế hồi phục phiên của RSC, thời điểm dựng `/api/auth/token`, ngưỡng cold start.

## Deferred Ideas

Xác nhận đăng xuất khi đang gọi, ngắt SignalR khi đăng xuất (Phase 7). `/api/auth/token` (Phase 7). Đề xuất BE: field trong envelope validate, logout/revoke. Quên mật khẩu, xác thực email. Dọn marker merge conflict trong ROADMAP và STATE.
