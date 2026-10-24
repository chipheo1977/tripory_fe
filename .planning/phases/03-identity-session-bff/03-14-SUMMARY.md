---
phase: 03-identity-session-bff
plan: 14
subsystem: integration-gate
tags: [identity, proxy, security-invariants, static-tests, be-dependencies, build, cache-components, vitest]
requires:
  - phase: 03-identity-session-bff
    provides: "03-05..03-13: `proxy.ts` (`PROTECTED_PREFIXES`), route `/api/auth/*`, BFF `/api/bff/[...path]`, `composition/http.client.ts`, `viewer.server.ts`, layout `(dashboard)`"
provides:
  - "`proxy-coverage.test.ts`: mọi `page.tsx` trong `(dashboard)` phải khớp `PROTECTED_PREFIXES`; trang `(public)` không bị gate nhầm"
  - "`auth-invariants.test.ts`: bất biến bảo mật tĩnh của phase"
  - "`03-BE-DEPENDENCIES.md`: 14 phụ thuộc BE cho DEPL-02, đứng đầu là lỗi regex email (D-33)"
  - "`03-VALIDATION.md` đã điền Per-Task Verification Map và sign-off"
affects: [03-15]
key-files:
  created:
    - apps/web/src/proxy-coverage.test.ts
    - apps/web/src/auth-invariants.test.ts
    - .planning/phases/03-identity-session-bff/03-BE-DEPENDENCIES.md
  modified:
    - .planning/phases/03-identity-session-bff/03-VALIDATION.md
key-decisions:
  - "Test `server-only` khớp `import \"server-only\"` (regex), không khớp chuỗi trần: `bff.ts` và `dashboard-gate.ts` nhắc `server-only` trong comment giải thích vì sao chúng KHÔNG import nó."
  - "Test `NEXT_PUBLIC_*TOKEN`, `localStorage`, `console.` bỏ qua `*.test.*` và thư mục `src/test/` để chính file test không tự vi phạm."
  - "Đếm `/refresh` bằng literal có nháy kép `\"/refresh\"`: đường BE `/api/v1/auth/refresh-token` và route `/api/auth/refresh` không bị tính nhầm."
requirements-addressed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08]
requirements-completed: []
completed: 2026-10-15
---

# Phase 3 Plan 14: Cổng tích hợp, bất biến bảo mật và phụ thuộc BE Summary

**Khóa bằng CI việc route `(dashboard)` mới phải có prefix bảo vệ và 8 bất biến bảo mật tĩnh (một đường refresh duy nhất, không `/api/auth/token`, route mỏng, không `console.`/storage/`NEXT_PUBLIC_*TOKEN`, một `server-only`), ghi 14 phụ thuộc BE cho DEPL-02 (lỗi regex email đứng đầu); `pnpm lint`, `typecheck`, `test` (web: 56 file / 792 test) và `pnpm build` xanh, build không có lỗi Suspense**

## Accomplishments

- **Task 1 (hai test tĩnh):** `proxy-coverage` duyệt đệ quy `src/app/(dashboard)`, đổi đường dẫn `page.tsx` thành URL (bỏ `(group)`, `[id]` → `x`, `[...slug]` → `x/y`) rồi `it.each` khẳng định khớp `PROTECTED_PREFIXES`; có test chống "duyệt thư mục hỏng" (phải thấy `/itineraries/mine` và `/settings/password`) và test trang `(public)` không bị gate. `auth-invariants` khóa: `"/refresh"` chỉ ở `composition/http.client.ts`; không có thư mục `api/auth/token`; mỗi `route.ts` ≤ 25 dòng, import `@/composition/server/`, không import `@tripory/identity/http` hay `@tripory/api-client/http`; không `console.` trong `composition/**` và `modules/**`; chỉ `viewer.server.ts` import `server-only`; không `localStorage`/`sessionStorage`/`NEXT_PUBLIC_API`/`NEXT_PUBLIC_*TOKEN`; `proxy.ts` không `fetch(` và không import `/http`; `composition/server` không `.delete(` trên cookie. Chạy 18 test, đạt ngay lần đầu: không có vi phạm nào từ các plan trước nên không phải sửa nguồn.
- **Task 2 (`03-BE-DEPENDENCIES.md`):** bảng 14 dòng (vấn đề, mức độ, nguồn `file:dòng` trong `tripory_be`, hành động đề xuất, cách FE kiểm lại) và mục "Ghi chú chuyển sang DEPL-02". Đã đối chiếu `Email.cs:10-12` và `Program.cs:100-109` với mã BE thật. Không chứa secret.
- **Task 3 (full suite + build):** chạy tuần tự từ gốc repo, `API_ORIGIN=http://localhost:5000`. Build liệt kê `ƒ /api/auth/{change-password,login,logout,refresh,register}`, `ƒ /api/bff/[...path]`, `◐ /itineraries/mine`, `◐ /login`, `◐ /register`, `◐ /settings/password` và `ƒ Proxy (Middleware)`. Không có `Uncached data`, không có `Error:`, không cảnh báo đổi tên `middleware`.
- **`03-VALIDATION.md`:** các dòng 03-01-01 → 03-14-03 đặt ✅ (còn 03-15-02 là UAT thủ công, giữ ⬜), `wave_0_complete: true`, tick các mục Wave 0 và dòng "Mọi task có `<automated>` verify". Dòng **Approval** vẫn `pending` vì còn UAT thủ công ở 03-15.

## Task Commits

1. Task 1: `9800851` `test(03-14): lock dashboard gate coverage and auth security invariants`
2. Task 2: `7852d14` `docs(03-14): record BE dependencies checklist for DEPL-02`
3. Task 3: không có thay đổi mã nguồn (không có lỗi ghép nối cần sửa). Phần điền `03-VALIDATION.md`: `6e419df` `docs(03-14): fill per-task verification map and sign-off`

## Deviations from Plan

### Auto-fixed Issues

Không có lỗi ghép nối nào cần sửa: lint, typecheck, test, build đều xanh ngay lần chạy đầu.

### Ghi chú

- **Task 1 không có commit RED riêng:** plan là `type: execute`, hai file là test tĩnh trên mã đã có, nên đạt ngay lần đầu; không có mục TDD Gate Compliance. Đã kiểm lại rằng các khẳng định không tầm thường (đếm test case 18 ≥ 8; danh sách `(dashboard)` không rỗng).
- **`prettier` không có sẵn trong `apps/web`:** kiểm định dạng dựa vào ESLint (xanh) và style app (nháy kép, `;`).
- **`eslint-disable`:** chỉ còn một dòng có sẵn ở `session-effects.tsx` (plan 03-11, cố ý tải lại cứng). Plan này không thêm cái nào; `git diff -- packages/config/eslint` rỗng.
- **Thay đổi có sẵn không stage:** `.planning/config.json` và `packages/api-client/src/fetch-http-client.ts` (thừa một dấu cách đầu dòng, lint không đỏ nên không gỡ). STATE.md đọc được, không có marker merge conflict.
- **File tạm:** log build ghi vào `%TEMP%` đã xóa; `git status` chỉ còn hai thay đổi có sẵn ở trên.
- **Không tick checkbox AUTH-01..08 trong `REQUIREMENTS.md`:** còn 03-15 (UAT end-to-end trên bản chạy thật).
- `token-guard.test.ts` (flake đã biết, deferred-items) không timeout trong lần chạy này.

## Known Stubs

Không có.

## Threat Model Verification

- **T-03-70:** `proxy-coverage.test.ts` làm CI đỏ khi `page.tsx` mới trong `(dashboard)` không có prefix.
- **T-03-71:** `auth-invariants` khẳng định `"/refresh"` chỉ ở `composition/http.client.ts`.
- **T-03-72:** test cấm `localStorage`/`sessionStorage`, `NEXT_PUBLIC_*TOKEN`, `console.` trong `composition`/`modules`, và route `api/auth/token`.
- **T-03-73:** test khẳng định `proxy.ts` không `fetch(` và không import `@tripory/identity/http`.
- **T-03-74 (accept):** CORS mở, thiếu rate limit, lỗi regex email đã ghi ở `03-BE-DEPENDENCIES.md` mục 1, 2, 7 để chuyển sang `tripory_be`.

## Threat Flags

Không có bề mặt bảo mật mới.

## Verification

- `pnpm --filter @tripory/web test -- proxy-coverage auth-invariants`: 18 test xanh.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` ở gốc repo: exit 0 (web 56 file / 792 test; identity 244 test).
- `pnpm build` (`API_ORIGIN=http://localhost:5000`): thành công, tuyến và Proxy như nêu ở Task 3; không có lỗi Suspense.
- Chưa kiểm được ở đây: hành vi với BE thật, trình duyệt thật, HTTPS và cookie `__Host-` (thuộc 03-15).

## Next Phase Readiness

- 03-15 (UAT thủ công 19 bước) có thể bắt đầu. Cần BE đã sửa regex email (mục 1) để bước đăng ký `user@gmail.com` qua; chạy BE với `JwtOptions__ExpiryMinutes=5` để kiểm refresh.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-15*

## Self-Check: PASSED

Đã kiểm 4 file (`proxy-coverage.test.ts`, `auth-invariants.test.ts`, `03-BE-DEPENDENCIES.md`, `03-VALIDATION.md`) tồn tại và 3 commit `9800851`, `7852d14`, `6e419df` có trong git log.
