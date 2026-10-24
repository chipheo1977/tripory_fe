---
phase: 03-identity-session-bff
plan: 15
subsystem: manual-uat
tags: [identity, uat, manual-verification, bff, session, multi-tab, toast]
requires:
  - phase: 03-identity-session-bff
    provides: "03-01..03-14: toàn bộ luồng đăng ký/đăng nhập/refresh/đổi mật khẩu/đăng xuất, BFF allowlist, `03-BE-DEPENDENCIES.md`, `03-VALIDATION.md`"
provides:
  - "`03-UAT-CHECKLIST.md`: kịch bản UAT 19 bước kèm kết quả đã điền (19/19 PASS) và mục kết luận"
  - "Xác nhận trên BE thật cho 5 tiêu chí ROADMAP Phase 3 và FND-05"
affects: [03-verify-work]
key-files:
  created:
    - .planning/phases/03-identity-session-bff/03-UAT-CHECKLIST.md
  modified: []
key-decisions:
  - "Executor không tự chạy UAT và không tự điền PASS; kết quả do người dùng chạy và xác nhận `approved`."
requirements-addressed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, FND-05]
requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, FND-05]
duration: "Task 1 khoảng 5 phút; Task 2 là UAT do người dùng chạy (không tính vào thời gian thực thi)"
completed: 2026-10-23
---

# Phase 3 Plan 15: Nghiệm thu UAT thủ công Summary

**Kịch bản UAT 19 bước (đăng ký `user@gmail.com`, refresh 3 tab với `JwtOptions__ExpiryMinutes=5`, cookie `HttpOnly`/`__Host-`, đồng bộ đăng xuất/đổi mật khẩu giữa tab, allowlist và kiểm Origin của BFF, toast thật, smoke UI) được người dùng chạy trên BE thật: 19/19 PASS, log BE có đúng 1 `refresh-token` mỗi lần hết hạn và không có `Token.Compromised`.**

## Accomplishments

- **Task 1 (auto):** soạn `03-UAT-CHECKLIST.md` bằng tiếng Việt gồm phần A (chuẩn bị: sửa regex email BE, `JwtOptions__ExpiryMinutes=5`, `API_ORIGIN` trong `apps/web/.env.local`, `next dev --experimental-https`, nhiều tab, DevTools), phần B (19 bước với cột hành động, kết quả mong đợi, tiêu chí/quyết định, kết quả) và phần C (kết luận). Không chứa mật khẩu hay token thật. Commit `3dccda1`.
- **Task 2 (human-verify):** người dùng chạy UAT và trả lời `approved`. Kết quả ghi trong phần B và C của `03-UAT-CHECKLIST.md`, commit `4067730`:
  - 19/19 bước PASS, không có FAIL hay N/A.
  - Môi trường: BE local `http://localhost:5251` (đã có bản sửa regex email và rate limit, `JwtOptions__ExpiryMinutes=5`), FE local `localhost:3000` với `API_ORIGIN` trỏ tới BE và `BFF_SHARED_SECRET` khớp BE Development. Trình duyệt cụ thể và việc chạy HTTP hay HTTPS local chưa được ghi lại.
  - Bằng chứng tiêu chí 2 (bước 8): log BE có 1 dòng `refresh-token` mỗi lần hết hạn, không có `Token.Compromised` (người chạy tự xem log và xác nhận). Bước 19: đã thấy dòng "Máy chủ đang khởi động…".
  - Bước 3 (`user@gmail.com`) PASS, nghĩa là BE đã sửa regex email (`03-BE-DEPENDENCIES.md` mục 1).

## Task Commits

1. Task 1: `3dccda1` `docs(03-15): add manual UAT checklist for phase 3 identity and BFF`
2. Task 2: `4067730` `docs(03-15): record UAT results, 19/19 steps PASS`

## Deviations from Plan

None - plan executed exactly as written.

### Ghi chú

- **Không chạy lại UAT:** theo chỉ đạo của workflow, kết quả lấy từ người dùng, executor không tự kiểm lại bằng trình duyệt.
- **Bằng chứng HTTPS/`__Host-` chưa được ghi rõ:** phần C nói chưa ghi việc chạy HTTP hay HTTPS local. Bước 6 được người dùng báo PASS; nếu cần khẳng định riêng prefix `__Host-`, kiểm lại khi deploy HTTPS (Phase 8, DEPL-01).
- **Thay đổi có sẵn không stage:** `.planning/config.json` và `packages/api-client/src/fetch-http-client.ts` không do plan này tạo và không được commit.
- **Việc BE còn lại (không chặn Phase 3):** merge `feat/be-fe-integration-group-a` (CORS theo cấu hình, `POST /auth/logout`, hạn token theo cấu hình) rồi FE gọi `/auth/logout` ở một việc riêng (`03-BE-DEPENDENCIES.md` mục 3, 7, 8); khi deploy đặt secret thật cho `BFF_SHARED_SECRET` ở Vercel và BE, cấu hình `Cors__AllowedOrigins` (Phase 8, DEPL-01/02).

## Known Stubs

Không có. Plan này chỉ thêm tài liệu.

## Threat Model Verification

- **T-03-75 (mitigate):** bước 6 PASS: `document.cookie` chỉ đọc được `at_exp`, `at`/`rt` có `HttpOnly`/`Secure`/`SameSite`.
- **T-03-76 (mitigate):** bước 8 PASS: 1 `refresh-token` mỗi lần hết hạn, không có `Token.Compromised`.
- **T-03-77 (mitigate):** bước 16 PASS: `auth/*` và ngoài allowlist bị từ chối, sai Origin bị chặn.
- **T-03-78 (mitigate):** bước 10 và 14 PASS: cookie phiên biến mất sau đăng xuất và đổi mật khẩu.
- **T-03-79 (mitigate):** bước 2 PASS: `?next=//evil.com` bị bỏ qua.

## Threat Flags

Không có bề mặt bảo mật mới.

## Next Phase Readiness

- Phase 3 đủ 15/15 plan. Có thể chạy `/gsd-verify-work` (hoặc verifier của phase) cho 5 tiêu chí ROADMAP.
- `03-VALIDATION.md` dòng **Approval** vẫn ghi `pending` và dòng 03-15-02 vẫn ⬜; cập nhật khi chạy verify-work nếu muốn khép sổ.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-23*

## Self-Check: PASSED

Đã kiểm 2 file (`03-UAT-CHECKLIST.md`, `03-15-SUMMARY.md`) tồn tại và 2 commit `3dccda1`, `4067730` có trong git log.
