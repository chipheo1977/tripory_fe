# Phase 2: HTTP & Shared Kernel - Discussion Log

> **Chỉ dùng để lưu vết.** Không dùng làm đầu vào cho agent research, planning hay execution.
> Quyết định nằm trong CONTEXT.md. Log này giữ lại các phương án đã cân nhắc.

**Date:** 2026-10-12
**Phase:** 2-HTTP & Shared Kernel
**Areas discussed:** Chứng minh toast, Nội dung message lỗi, Khi nào hiện toast, Timeout/retry/refresh

---

## Chứng minh toast khi chưa có thao tác ghi thật

| Option | Description | Selected |
|--------|-------------|----------|
| Nối ngay + test | Mount Toast và QueryClientProvider ở Phase 2, nối toast vào mutation toàn cục, chứng minh bằng test | |
| Phase 3 nghiệm thu | Phase 2 chỉ làm cơ chế, Phase 3 nghiệm thu bằng form đăng ký/đăng nhập thật | ✓ |
| Route demo | Bị loại từ đầu vì Phase 1 cấm trigger debug | |

**User's choice:** Để Phase 3 nghiệm thu.

---

## Nội dung message lỗi

| Option | Description | Selected |
|--------|-------------|----------|
| Nguyên văn BE | Hiện message của BE như nhận được | |
| Map theo `errorCode` sang tiếng Việt, message BE làm dự phòng | FE viết copy | ✓ |

| Option (lỗi không có errorCode/message) | Description | Selected |
|--------|-------------|----------|
| Câu riêng theo loại | Mạng / timeout / 5xx / không tìm thấy | |
| Một câu chung | "Đã có lỗi xảy ra, vui lòng thử lại" | ✓ |

| Option (validation) | Description | Selected |
|--------|-------------|----------|
| Toast | | |
| Gắn vào từng ô form | | ✓ |

| Option (validation không khớp ô/không có form) | Description | Selected |
|--------|-------------|----------|
| Toast message field đầu tiên | | ✓ |
| Dòng lỗi chung đầu form | | |

---

## Khi nào hiện toast

| Option | Description | Selected |
|--------|-------------|----------|
| Toast thành công opt-in, mặc định tắt | Autosave không bật | ✓ |
| Toast thành công opt-out | | |
| Toast lỗi mặc định bật, mutation tự xử lý được tắt | | ✓ |
| Toast lỗi opt-in | | |
| Lỗi query chỉ hiện ErrorState | | ✓ |
| Lỗi query hiện ErrorState + toast | | |
| Copy thành công cố định do FE viết | | (mặc định, người dùng không trả lời) |
| Dùng `message` của envelope BE | | |

**Notes:** Câu 3d (nội dung toast thành công) không được trả lời ở cả hai lượt. Áp dụng phương án mặc định đã báo trước.

---

## Timeout, retry và refresh thất bại

| Option | Description | Selected |
|--------|-------------|----------|
| Timeout 15 giây | | |
| Timeout 30 giây | Phù hợp BE trên host free có cold start | ✓ |
| Claude quyết, cấu hình được | | |
| Query đọc retry 1 lần, thao tác ghi không retry | | |
| Không tự retry | Người dùng bấm "Thử lại" | ✓ |
| Từ chối request bằng `session.expired` + callback `onSessionExpired` | | ✓ |
| Chỉ từ chối request | | |
| Refresh chủ động để Phase 3 | | ✓ |
| Dựng sẵn API lên lịch refresh ở Phase 2 | | |

---

## Claude's Discretion

- Phạm vi `shared-kernel` (branded id nào, cách validate `Wgs84Coordinate`). Người dùng chọn không bàn vùng này.
- Hình dạng `ApiError`, nơi đặt bảng map `errorCode`, hợp đồng `meta` của mutation, API `Lock`.

## Deferred Ideas

- Mount Toast/QueryClientProvider, refresh chủ động, Web Locks thật → Phase 3.
