---
phase: 3
slug: identity-session-bff
status: draft
nyquist_compliant: true
wave_0_complete: true
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

Task ID có dạng `03-PP-TT` (plan PP, task TT). Wave theo frontmatter của từng plan.

| Task ID | Plan | Wave | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|----------|-----------|-------------------|-------------|--------|
| 03-01-01 | 03-01 | 1 | AUTH-02..05, 08 | Catalog pin cứng, khung `packages/identity`, `API_ORIGIN` | build/lint | `pnpm --filter @tripory/identity test` | ✅ | ✅ |
| 03-01-02 | 03-01 | 1 | AUTH-08 | Self-test ranh giới cho identity, `proxy.ts`, `modules`, `composition` | unit | `pnpm --filter @tripory/config test` | ✅ (thêm case) | ✅ |
| 03-01-03 | 03-01 | 1 | AUTH-03, 04 | Helper `NextRequest`, fake Web Locks, fake BroadcastChannel | unit | `pnpm --filter @tripory/web test -- test-helpers` | ✅ | ✅ |
| 03-02-01 | 03-02 | 1 | AUTH-06, 07 | Token `--semantic-size-form`, `--user-menu-name-max-width` | unit | `pnpm --filter @tripory/design-tokens test` | ✅ (sửa) | ✅ |
| 03-02-02 | 03-02 | 1 | AUTH-06 | `Button.loadingLabel`, `PasswordInput`, `InlineAlert` | component | `pnpm --filter @tripory/ui-web test` | ✅ | ✅ |
| 03-02-03 | 03-02 | 1 | AUTH-07 | `DropdownMenuLinkItem`, `align`, mục disabled tới được bằng phím | component | `pnpm --filter @tripory/ui-web test` | ✅ (sửa) | ✅ |
| 03-03-01 | 03-03 | 2 | AUTH-05 | Bảng ca `toSafeNextPath`, ngưỡng token, `Viewer` | unit | `pnpm --filter @tripory/identity test` | ✅ | ✅ |
| 03-03-02 | 03-03 | 2 | AUTH-06 | `evaluatePasswordRules` (6 mục đổi mật khẩu, `special` = `!?*@#$%^&+=`) | unit | `pnpm --filter @tripory/identity test` | ✅ | ✅ |
| 03-04-01 | 03-04 | 3 | AUTH-02, 07 | `parseAccessTokenClaims` (payload JWT thật, UTF-8), DTO, `normalizeAvatarUrl` | unit | `pnpm --filter @tripory/identity test` | ✅ | ✅ |
| 03-04-02 | 03-04 | 3 | AUTH-01, 06 | Gateway HTTP, profile reader, hook factory, ranh giới export | unit | `pnpm --filter @tripory/identity test` | ✅ | ✅ |
| 03-05-01 | 03-05 | 4 | AUTH-02, 08 | Tên cookie, env, `checkSameOrigin`, envelope | unit (node) | `pnpm --filter @tripory/web test -- session-cookies env request-guards` | ✅ | ✅ |
| 03-05-02 | 03-05 | 4 | AUTH-08 | `callBackend` timeout 28 s, khóa origin upstream | unit (node) | `pnpm --filter @tripory/web test -- upstream` | ✅ | ✅ |
| 03-05-03 | 03-05 | 4 | AUTH-02, 04 | `writeSession`/`clearSession` (Set-Cookie đủ thuộc tính), `readSession` | unit (node) | `pnpm --filter @tripory/web test -- session-store` | ✅ | ✅ |
| 03-06-01 | 03-06 | 4 | AUTH-03 | N×401 + chủ động + hai tab chỉ 1 refresh; fallback mutex; khóa quá 40 s | unit (jsdom) | `pnpm --filter @tripory/web test -- http.client` | ✅ | ✅ |
| 03-06-02 | 03-06 | 4 | AUTH-04 | `sessionEvents`, BroadcastChannel, `registerLogoutHandler` | unit | `pnpm --filter @tripory/web test -- session-events` | ✅ | ✅ |
| 03-06-03 | 03-06 | 4 | FND-05 | `makeQueryClient` (retry false, toast theo meta), `SESSION_EXPIRED_TOAST` | unit | `pnpm --filter @tripory/web test -- query-client error-messages` | ✅ | ✅ |
| 03-07-01 | 03-07 | 5 | AUTH-01, 02, 04 | Route login/register/logout: cookie, body không token, Origin | unit (node) | `pnpm --filter @tripory/web test -- auth-handlers` | ✅ | ✅ |
| 03-07-02 | 03-07 | 5 | AUTH-03 | Route refresh idempotent, 401 xóa cookie, 5xx giữ cookie | unit (node) | `pnpm --filter @tripory/web test -- auth-handlers.refresh` | ✅ | ✅ |
| 03-07-03 | 03-07 | 5 | AUTH-06 | Route change-password: stale 401, xóa cookie khi thành công | unit (node) | `pnpm --filter @tripory/web test -- auth-handlers.change-password` | ✅ | ✅ |
| 03-08-01 | 03-08 | 5 | AUTH-08 | `resolveBffTarget` (allowlist, `auth/*` 404, traversal 400) | unit (node) | `pnpm --filter @tripory/web test -- bff.resolve` | ✅ | ✅ |
| 03-08-02 | 03-08 | 5 | AUTH-08 | `forwardToBackend` (Origin 403, stale 401, header, timeout 504) | unit (node) | `pnpm --filter @tripory/web test -- bff.forward` | ✅ | ✅ |
| 03-09-01 | 03-09 | 5 | AUTH-05 | `proxy` (gate, đẩy khỏi `/login`, `next=//evil`, D-25) | unit (node) | `pnpm --filter @tripory/web test -- proxy` | ✅ | ✅ |
| 03-09-02 | 03-09 | 5 | AUTH-03, 07 | `decideDashboardGate`, `viewer.server` | unit | `pnpm --filter @tripory/web test -- dashboard-gate` | ✅ | ✅ |
| 03-10-01 | 03-10 | 3 | AUTH-01, 06 | Schema Zod 3 form (D-29, D-33) | unit | `pnpm --filter @tripory/web test -- form-schemas` | ✅ | ✅ |
| 03-10-02 | 03-10 | 3 | AUTH-01, 06 | Map errorCode → ô/alert theo form | unit | `pnpm --filter @tripory/web test -- form-error-mapping` | ✅ | ✅ |
| 03-10-03 | 03-10 | 3 | AUTH-06 | `PasswordChecklist`, `SubmitStatus` (5 s), `AuthFormCard` | component | `pnpm --filter @tripory/web test -- password-checklist submit-status auth-form-card` | ✅ | ✅ |
| 03-11-01 | 03-11 | 5 | AUTH-04, 05 | `useSessionActions`, `SessionEffects` (expired, remote tab) | component | `pnpm --filter @tripory/web test -- use-session-actions session-effects` | ✅ | ✅ |
| 03-11-02 | 03-11 | 5 | AUTH-03, 05 | `SessionKeeper`, `SessionRecovery`, `LoginRedirect` | component | `pnpm --filter @tripory/web test -- session-keeper session-recovery login-redirect` | ✅ | ✅ |
| 03-11-03 | 03-11 | 5 | FND-05 | `Providers` + root layout (Toast, QueryClient) | unit | `pnpm --filter @tripory/web test -- layout` | ✅ (sửa) | ✅ |
| 03-12-01 | 03-12 | 6 | AUTH-02, 05 | `LoginForm` + `/login` | component | `pnpm --filter @tripory/web test -- login` | ✅ | ✅ |
| 03-12-02 | 03-12 | 6 | AUTH-01 | `RegisterForm` + `/register` | component | `pnpm --filter @tripory/web test -- register` | ✅ | ✅ |
| 03-12-03 | 03-12 | 6 | AUTH-06 | `ChangePasswordForm` + `/settings/password` | component | `pnpm --filter @tripory/web test -- change-password settings` | ✅ | ✅ |
| 03-13-01 | 03-13 | 6 | AUTH-07 | `UserMenu` ba trạng thái, mục disabled, nút khách | component | `pnpm --filter @tripory/web test -- user-menu guest-login-button` | ✅ (viết lại) | ✅ |
| 03-13-02 | 03-13 | 6 | AUTH-07 | `AccountSlot`, `AppHeader`, `AppShell` Skeleton lúc đọc phiên | component | `pnpm --filter @tripory/web test -- account-slot app-header app-shell` | ✅ (sửa) | ✅ |
| 03-13-03 | 03-13 | 6 | AUTH-03, 05 | `DashboardSessionGate` + layout `(dashboard)` | component | `pnpm --filter @tripory/web test` | ✅ (sửa) | ✅ |
| 03-14-01 | 03-14 | 7 | AUTH-05, 08 | `proxy-coverage` + bất biến bảo mật tĩnh | unit (node) | `pnpm --filter @tripory/web test -- proxy-coverage auth-invariants` | ✅ | ✅ |
| 03-14-02 | 03-14 | 7 | AUTH-01 (D-33) | `03-BE-DEPENDENCIES.md` (DEPL-02 đầu vào) | doc | `Select-String 03-BE-DEPENDENCIES.md -Pattern user@gmail.com -SimpleMatch` | ✅ | ✅ |
| 03-14-03 | 03-14 | 7 | AUTH-01..08 | Full suite + `pnpm build` (không lỗi Suspense) | build | `pnpm lint; pnpm typecheck; pnpm test; pnpm build` | n/a | ✅ |
| 03-15-02 | 03-15 | 8 | AUTH-01..08, FND-05 | UAT thủ công 19 bước (checkpoint) | manual | `03-UAT-CHECKLIST.md` | ❌ | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 = plan 03-01 (wave 1) cộng fixture ở plan 03-04 và 03-05; các wave sau chỉ dùng lại.

- [x] Khung `packages/identity/` (plan 03-01 Task 1): `package.json` (exports `.`, `./http`, `./react`), `eslint.config.mjs` (`contextPackage()`), `tsconfig.json`, `vitest.config.ts`. Case self-test ranh giới ở Task 2.
- [x] Catalog + `apps/web/package.json` (plan 03-01 Task 1): `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@tripory/identity`, pin cứng.
- [x] Fixture: payload JWT thật và DTO ở `packages/identity/src/infrastructure/fixtures.ts` (plan 03-04); `apps/web/src/test/be-auth-fixtures.ts` (`fakeJwt`, `beAuthResponse`, envelope lỗi `Token.*`, `Auth.InvalidCurrentPassword`, `NotEqualValidator`) ở plan 03-05.
- [x] Helper `apps/web/src/test/next-request.ts` (`makeRequest`, `setCookiesOf`) (plan 03-01 Task 3).
- [x] Fake `navigator.locks` (`fake-locks.ts`) và fake `BroadcastChannel` (`fake-broadcast-channel.ts`) (plan 03-01 Task 3).

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

- [x] Mọi task có `<automated>` verify, hoặc phụ thuộc vào Wave 0
- [x] Không có 3 task liên tiếp thiếu automated verify
- [x] Wave 0 phủ mọi tham chiếu đang thiếu
- [x] Không dùng cờ watch-mode
- [x] Độ trễ phản hồi < 120 giây
- [x] Đặt `nyquist_compliant: true` trong frontmatter

**Approval:** pending

