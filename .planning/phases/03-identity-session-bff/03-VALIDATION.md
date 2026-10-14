---
phase: 3
slug: identity-session-bff
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-13
---

# Phase 3 — Validation Strategy

> Hợp đồng kiểm chứng của phase, dùng để lấy phản hồi trong lúc thực thi. Nguồn: `03-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11. `apps/web` dùng preset jsdom + Testing Library. Route, BFF và proxy dùng `// @vitest-environment node`. Package dùng preset node. |
| **Config file** | `apps/web/vitest.config.ts`, `packages/*/vitest.config.ts`. `packages/identity/vitest.config.ts` tạo mới ở Wave 0. |
| **Quick run command** | `pnpm --filter @tripory/identity test` / `pnpm --filter @tripory/web test -- <pattern>` |
| **Full suite command** | `pnpm lint && pnpm typecheck && pnpm test` (từ gốc repo) |
| **Estimated runtime** | khoảng 60–120 giây |

---

## Sampling Rate

- **Sau mỗi commit task:** chạy test và lint của package vừa sửa (`pnpm --filter <pkg> test -- <pattern>`).
- **Sau mỗi wave:** chạy `pnpm lint && pnpm typecheck && pnpm test`.
- **Trước `/gsd-verify-work`:** full suite xanh và `pnpm build` xanh. Output build không được có lỗi "Uncached data was accessed outside of `<Suspense>`".
- **Độ trễ phản hồi tối đa:** 120 giây.

---

## Per-Task Verification Map

Planner điền Task ID và Plan khi đã có plan. Các dòng dưới đây theo requirement.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| AUTH-01 | Route register: BE 200 thì đặt 3 cookie và trả `{viewer}` không kèm token. BE 409/400 thì chuyển nguyên lỗi. | unit (node) | `pnpm --filter @tripory/web test -- auth-handlers` | ❌ W0 | ⬜ |
| AUTH-01 | RegisterForm: lỗi Zod khi blur hoặc Gửi, focus ô lỗi đầu, map errorCode sang ô, phần còn lại vào InlineAlert | component | `pnpm --filter @tripory/web test -- register-form` | ❌ W0 | ⬜ |
| AUTH-02 | Set-Cookie của login: `at`/`rt` có `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age`. `at_exp` không HttpOnly, chỉ chứa chữ số. Body không có token. | unit (node) | `pnpm --filter @tripory/web test -- auth-handlers` | ❌ W0 | ⬜ |
| AUTH-02 | `parseAccessTokenClaims` với payload có claim URI thật, cùng UTF-8 tiếng Việt | unit | `pnpm --filter @tripory/identity test` | ❌ W0 | ⬜ |
| AUTH-03 | Route refresh: thiếu cookie, token còn > 150 s (không gọi BE), BE 200, BE 400 `Token.*` (xóa cookie + 401), BE 5xx/timeout (giữ cookie + 503) | unit (node) | `pnpm --filter @tripory/web test -- auth-handlers` | ❌ W0 | ⬜ |
| AUTH-03 | 5 request 401 song song cộng 1 refresh chủ động chỉ gọi route đúng 1 lần. Hai "tab" dùng chung fake lock thì tab B không gọi lại. Fallback mutex khi không có `navigator.locks`. | unit (jsdom) | `pnpm --filter @tripory/web test -- http.client` | ❌ W0 | ⬜ |
| AUTH-03 | `SessionKeeper` (hẹn `exp−120`, `visibilitychange`), `SessionRecovery`, `decideDashboardGate` | unit/component | `pnpm --filter @tripory/web test -- session-` | ❌ W0 | ⬜ |
| AUTH-04 | Route logout xóa 3 cookie, giữ đủ thuộc tính kèm `Max-Age=0`, có kiểm Origin | unit (node) | `pnpm --filter @tripory/web test -- auth-handlers` | ❌ W0 | ⬜ |
| AUTH-04 | `sessionEvents`: chạy `logoutHandlers`, broadcast, `queryClient.clear`. Tab nhận `logged-out` thì về `/`, tab nhận `logged-in` ở `/login` thì sang `next`. | unit (fake BroadcastChannel) | `pnpm --filter @tripory/web test -- session-events` | ❌ W0 | ⬜ |
| AUTH-05 | Bảng ca của `toSafeNextPath` | unit | `pnpm --filter @tripory/identity test` | ❌ W0 | ⬜ |
| AUTH-05 | `proxy`: khách bị gate, đã có phiên bị đẩy khỏi `/login`, `next=//evil` bị bỏ, cookie hết hạn thì cho qua (D-25). Mọi page trong `(dashboard)` đều được prefix phủ. | unit (node) | `pnpm --filter @tripory/web test -- proxy` | ❌ W0 | ⬜ |
| AUTH-06 | `evaluatePasswordRules` cho cả hai bộ rule. Đổi mật khẩu có 6 mục (D-34). `special` chỉ nhận `!?*@#$%^&+=`. | unit | `pnpm --filter @tripory/identity test` | ❌ W0 | ⬜ |
| AUTH-06 | ChangePasswordForm: checklist hiện trước khi nhập. `Auth.InvalidCurrentPassword` gắn vào ô hiện tại và focus. Trùng mật khẩu cũ gắn vào ô mới. Thành công thì chạy logout và toast. | component | `pnpm --filter @tripory/web test -- change-password-form` | ❌ W0 | ⬜ |
| AUTH-07 | UserMenu ba trạng thái (đang đọc, khách, đã đăng nhập), `aria-label`, mục disabled kèm "Sắp có", `next` của nút khách | component | `pnpm --filter @tripory/web test -- user-menu` | ✅ (viết lại) | ⬜ |
| AUTH-08 | `resolveBffTarget` (allowlist, `auth/*` trả 404, chặn path traversal) và `forwardToBackend` (Origin lạ 403, header đi BE không có cookie, response không có `set-cookie`, timeout 504) | unit (node) | `pnpm --filter @tripory/web test -- bff` | ❌ W0 | ⬜ |
| FND-05 | `makeQueryClient`: `retry:false`, toast thành công và thất bại theo `meta`, `errorToast:false` thì không toast | unit | `pnpm --filter @tripory/web test -- query-client` | ❌ W0 | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Khung `packages/identity/`: `package.json` (exports `.`, `./http`, `./react`), `eslint.config.mjs` (`contextPackage()`), `tsconfig.json`, `vitest.config.ts`. Thêm case self-test ranh giới.
- [ ] Thêm vào catalog và `apps/web/package.json`: `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@tripory/identity`. Pin cứng version.
- [ ] Fixture: payload JWT thật, `AuthResponse`/`TokenResponse`/`UserProfileResponse` mẫu, envelope lỗi `Token.*`, `Auth.InvalidCurrentPassword`, `NotEqualValidator`.
- [ ] Helper `apps/web/src/test/next-request.ts`: dựng `NextRequest` có cookie và Origin, đọc `Set-Cookie`.
- [ ] Fake `navigator.locks` (hàng đợi theo tên) và fake `BroadcastChannel` cho jsdom.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `document.cookie` không đọc được token | AUTH-02 | Cần trình duyệt thật và HTTPS cho prefix `__Host-` | Mở DevTools trên bản deploy. `document.cookie` chỉ thấy `__Host-tripory_at_exp`. Tab Application cho thấy `at`/`rt` có cờ `HttpOnly`. |
| Reload hoặc token hết hạn không đăng xuất. Nhiều tab chỉ refresh 1 lần, không có `Token.Compromised`. | AUTH-03 | Cần BE thật và nhiều tab | Chạy BE với `JwtOptions__ExpiryMinutes=5`. Mở 3 tab, chờ quá hạn, thao tác ở cả 3 tab rồi reload. Log BE phải có đúng 1 `refresh-token` mỗi lần hết hạn. Tắt BE lúc đang refresh thì không bị đăng xuất. |
| Đăng xuất và đổi mật khẩu đồng bộ giữa các tab | AUTH-04, AUTH-06 | Cần nhiều tab thật | Đăng xuất ở tab A thì tab B về `/`. Đổi mật khẩu xong đăng nhập lại được bằng mật khẩu mới. |
| Email có chữ "s" đăng ký và đăng nhập được | AUTH-01 (D-33) | Phụ thuộc người dùng đã sửa BE | Đăng ký `user@gmail.com`, đăng xuất, đăng nhập lại. |
| Toast thật hiện sau login và đổi mật khẩu | FND-05 | Hiển thị thật | Quan sát toast "Chào mừng, {tên}" và "Đã đổi mật khẩu, vui lòng đăng nhập lại". |
| Smoke UI ở 320/390/768/1440 | AUTH-07 | Kiểm tra hình ảnh | Theo `03-UI-SPEC.md` |

---

## Validation Sign-Off

- [ ] Mọi task có `<automated>` verify, hoặc phụ thuộc vào Wave 0
- [ ] Không có 3 task liên tiếp thiếu automated verify
- [ ] Wave 0 phủ mọi tham chiếu đang thiếu
- [ ] Không dùng cờ watch-mode
- [ ] Độ trễ phản hồi < 120 giây
- [ ] Đặt `nyquist_compliant: true` trong frontmatter

**Approval:** pending
