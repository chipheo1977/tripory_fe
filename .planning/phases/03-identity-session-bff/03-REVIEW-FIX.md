---
phase: 03-identity-session-bff
fixed_at: 2026-10-23T14:20:00Z
review_path: .planning/phases/03-identity-session-bff/03-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-10-23
**Source review:** .planning/phases/03-identity-session-bff/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (0 Critical, 4 Warning; Info out of scope)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-02: `rotateSession` giữ cookie cũ khi BE đã xoay refresh token

**Files modified:** `apps/web/src/composition/server/auth-handlers.ts`, `apps/web/src/composition/server/auth-handlers.refresh.test.ts`
**Commit:** 0f964f6
**Applied fix:** Khi BE đã trả 2xx cho `refresh-token` nhưng FE không dựng/ghi được phiên mới (body không phải JSON, envelope sai, thiếu claim, `expiresAt` không parse được → `writeSession` trả `ok: false`), `rotateSession` gọi `sessionEnded` (xóa cả 3 cookie đủ thuộc tính, 401 `session.expired`) thay vì 502 giữ cookie. BE 5xx/429/timeout/mạng/404/3xx vẫn giữ cookie và trả 503 (không đổi). Test: bảng "BE 200 nhưng sai hình dạng" (body không JSON, rỗng, thiếu data, status error, thiếu refreshToken, access không claim, expiresAt hỏng) nay kỳ vọng 401 + xóa cookie. Lỗi ghi cookie của `writeSession` chỉ biểu hiện qua `ok: false` nên các ca claim/expiresAt chính là ca write-failure.
**Status:** fixed: requires human verification (logic về vòng đời phiên).

### WR-03: `API_ORIGIN` không bị ép HTTPS ở production

**Files modified:** `apps/web/src/composition/server/env.ts`, `apps/web/src/composition/server/env.test.ts`
**Commit:** 8d6325d
**Applied fix:** `parseServerEnv` ném Error (tiếng Việt, nêu `API_ORIGIN`, không kèm giá trị) khi `NODE_ENV === "production"` và protocol không phải https, trừ host loopback (`localhost`, `127.0.0.1`, `[::1]`) để `next build`/`next start` với BE local vẫn chạy. Không thêm biến escape-hatch (khác gợi ý của review là cờ `ALLOW_INSECURE_API_ORIGIN`, theo yêu cầu). Dùng `raw.NODE_ENV` thay vì `isSecureCookieEnv()` để hàm thuần và test được. Test: https prod OK, http công khai prod bị từ chối, 3 host loopback prod OK, `localhost.evil.test` bị từ chối, dev/test http OK, `serverDeps` đọc NODE_ENV từ process.env. Test cũ "secure theo NODE_ENV" đổi sang `https://be.test`.

### WR-01: BFF và `/api/auth/*` chuyển tiếp content-type/body của BE nguyên văn

**Files modified:** `apps/web/src/composition/server/upstream.ts`, `request-guards.ts`, `bff.ts`, `auth-handlers.ts`, và test `bff.forward.test.ts`, `auth-handlers.credentials.test.ts`, `auth-handlers.change-password.test.ts` (cùng thư mục)
**Commit:** b21a592
**Applied fix:**
- `isPassableUpstreamBody(contentType, body)`: chỉ `application/json` và `application/problem+json` (có thể kèm `; charset`) đi qua. Body rỗng luôn được qua (204, 401 trần) kể cả không có content-type (điều chỉnh so với gợi ý review: Response giả lập trong test và 401 trần của BE không có JSON, nhưng không có gì để render). Loại khác → 502 `Bff.InvalidUpstream`.
- Upstream 5xx không chuyển body: `upstreamServerError` trả envelope FE `Bff.UpstreamError` (504 nếu BE trả 504, còn lại 502). Mã 502/504 của timeout/lỗi mạng giữ nguyên.
- `x-content-type-options: nosniff` thêm vào mọi envelope FE (`withNoStore`) và mọi response chuyển tiếp ở cả `forwardToBackend` lẫn `forwardUpstream`.
- 4xx (400/401/403/404/409, 429 kèm `Retry-After` đã lọc theo D-35) giữ nguyên, nên map lỗi của form theo `errorCode` không đổi.
- Test: 4xx JSON/problem+json đi qua, 5xx ẩn body (stack trace không lọt), 504→504, text/html và image/svg+xml → 502, thiếu content-type có body → 502, 4xx rỗng giữ nguyên. Các test "BE 500 chuyển nguyên" cũ đổi thành 502 `Bff.UpstreamError`.
- Retry-After cho BFF (IN-03) vẫn ngoài phạm vi.

### WR-04: Kiểm Origin so với `request.nextUrl.origin` khi hosting đổi

**Files modified:** `apps/web/src/composition/server/env.ts`, `request-guards.ts`, `auth-handlers.ts`, `bff.ts`, `turbo.json`, `apps/web/.env.example`, `apps/web/src/auth-invariants.test.ts`, và test `env.test.ts`, `request-guards.test.ts`, `auth-handlers.refresh.test.ts`
**Commit:** 38d09cb
**Applied fix:** `APP_ORIGIN` tùy chọn, server-only, parse trong `parseServerEnv` thành `ServerEnv.appOrigin` (vắng key khi trống). Phải là đúng một origin http(s) (không path/query/hash/userinfo); ở production áp luật https-hoặc-loopback như WR-03 (http loopback không bị từ chối). `checkSameOrigin(request, appOrigin?)` so Origin với `appOrigin ?? request.nextUrl.origin`; 5 chỗ gọi (4 handler auth + BFF) truyền `deps.env.appOrigin`. Comment ràng buộc hosting trong `request-guards.ts` (như `client-ip.ts`). Khai báo trong `turbo.json` (build, dev) và `.env.example` (comment, ghi chú chỉ cần khi self-host sau proxy ghi lại Host, Vercel để trống). Invariant: `NEXT_PUBLIC_*APP_ORIGIN` bị cấm, `APP_ORIGIN`/`appOrigin` chỉ xuất hiện trong `composition/server/**`. Test: set/unset, origin nội bộ bị từ chối khi set, Sec-Fetch-Site không đổi, handler refresh với appOrigin, parse hợp lệ/không hợp lệ/production.

`03-BE-DEPENDENCIES.md` không đổi: không fix nào thay đổi điều BE phải cung cấp.

## Skipped Issues

None.

## Verification

- Scoped: `vitest run src` trong `apps/web` → 57 files, 888 tests pass; `tsc --noEmit` sạch.
- Root: `pnpm lint` (8/8), `pnpm typecheck` (8/8), `pnpm test` (web 888, ui-web 180, identity 244, api-client 95, config 104, shared-kernel 32, design-tokens 9; tất cả pass, `token-guard` không flake lần này), `pnpm build` thành công, không in "Uncached data was accessed outside of <Suspense>".
- Chưa kiểm: chạy lại UAT thủ công với BE thật (chỉ có test tự động).

---

_Fixed: 2026-10-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
