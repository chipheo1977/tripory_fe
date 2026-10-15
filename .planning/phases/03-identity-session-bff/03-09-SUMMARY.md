---
phase: 03-identity-session-bff
plan: 09
subsystem: optimistic-gate
tags: [proxy, next-16, session-cookie, open-redirect, rsc, cacheComponents, vitest, tdd]
requires:
  - phase: 03-identity-session-bff
    provides: "03-05: `hasSessionCookie`, `isSecureCookieEnv`, `readSession`, `readViewerFromCookie`; 03-01: `makeRequest`; identity: `toSafeNextPath`"
provides:
  - "`apps/web/src/proxy.ts`: `proxy`, `config.matcher`, `PROTECTED_PREFIXES`"
  - "`apps/web/src/composition/viewer.server.ts`: `getViewer`, `getSessionKind` (React `cache`, đọc cookie, không gọi BE)"
  - "`apps/web/src/composition/server/dashboard-gate.ts`: `decideDashboardGate`, kiểu `SessionKind`, `DashboardGateDecision`"
affects: [03-11, 03-12, 03-13, 03-14, phase-03-identity]
tech-stack:
  added: []
  patterns: [optimistic-proxy-gate, segment-prefix-match, pure-decision-plus-server-only-adapter]
key-files:
  created:
    - apps/web/src/proxy.ts
    - apps/web/src/proxy.test.ts
    - apps/web/src/composition/viewer.server.ts
    - apps/web/src/composition/server/dashboard-gate.ts
    - apps/web/src/composition/server/dashboard-gate.test.ts
  modified: []
key-decisions:
  - "Proxy chỉ kiểm sự có mặt của cookie access (`hasSessionCookie`), không giải mã JWT, không gọi BE, không đọc refresh token. Cookie còn mà access đã hết hạn thì cho qua (D-25); chỉ khi mất cookie mới về /login."
  - "Khớp route bảo vệ theo segment (`pathname === prefix || startsWith(prefix + \"/\")`), nên `/itineraries/minefoo` không bị gate."
  - "`next` dựng lại từ `URLSearchParams` đã lọc `_rsc` và `__next*` (Pitfall 8), không dùng `search` thô; chỉ còn tham số nội bộ thì không để lại dấu `?`."
  - "Người đã đăng nhập vào /login hoặc /register: `toSafeNextPath(next) ?? /itineraries/mine`. `//evil.com`, `https://evil.com`, `/login` đều rơi về mặc định."
  - "`getSessionKind` gọi `await cookies()` trước `Date.now()` (cacheComponents bật trong `next.config.ts`). Không dùng cache dùng chung của Next cho dữ liệu phiên; chỉ `React.cache` theo request."
  - "`decideDashboardGate` là hàm thuần ở `composition/server/` (không `server-only`) để test dưới Vitest; `viewer.server.ts` là file duy nhất trong `composition` có `import \"server-only\"`."
patterns-established:
  - "Test proxy: `// @vitest-environment node` + `makeRequest`; phân biệt cho qua (`x-middleware-next: 1`, không `location`) với redirect (307 + `location`)."
requirements-addressed: [AUTH-05, AUTH-03, AUTH-07]
# Chưa tick: layout `(dashboard)` dùng `decideDashboardGate`/`getSessionKind` và UI login quay lại `next` ở 03-11..03-13; tick ở bước verify phase như 03-05..03-08.
requirements-completed: []
duration: ~10 min
completed: 2026-10-15
---

# Phase 3 Plan 9: `proxy.ts` và `viewer.server.ts` Summary

**Proxy Next 16 gate lạc quan theo cookie phiên: khách vào `/itineraries/mine?x=1` hoặc `/settings/*` bị 307 sang `/login?next=` (đã lọc `_rsc`/`__next*`), người đã đăng nhập bị đẩy khỏi `/login`/`/register` sang `next` an toàn hoặc `/itineraries/mine`, access token hết hạn vẫn cho qua (D-25); `viewer.server.ts` đọc cookie trong RSC không gọi BE và `decideDashboardGate` map `none→login`, `invalid|stale→recover`, `fresh→render`; 24 test mới, `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 (cả hai TDD: RED rồi GREEN)
- **Files:** 5 (đều tạo mới, trùng `files_modified` của plan)

## Accomplishments

- **Task 1 (`proxy.ts`):** 20 test. Khách: `/itineraries/mine?x=1` → 307 `/login?next=%2Fitineraries%2Fmine%3Fx%3D1`; `/settings/password`; route con `/itineraries/mine/draft`; `/`, `/login`, `/register`, `/not-a-route`, `/itineraries/minefoo` cho qua; `_rsc` và `__nextDataReq` bị lọc; chỉ còn tham số nội bộ thì `next` không có `?`. Đã đăng nhập: `/login` → `/itineraries/mine`; `next=/settings/password` được giữ; `//evil.com`, `https://evil.com`, `/login` rơi về mặc định; access token hết hạn vẫn `next()`; trang công khai cho qua; production đọc đúng cookie `__Host-tripory_at` và bỏ qua cookie tên dev. Matcher là mảng hằng, test kiểm bằng regex: loại `api/`, `_next/static`, `_next/image`, file có đuôi.
- **Task 2 (`viewer.server.ts` + `decideDashboardGate`):** 4 test `it.each` cho 4 loại phiên. `getViewer` và `getSessionKind` bọc `React.cache`, `await cookies()` rồi mới tới `Date.now()`, gọi lại `readViewerFromCookie`/`readSession` của 03-05 nên logic đã có test sẵn.
- Toàn repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` đều 8/8 task thành công; `@tripory/web` 39 file / 669 test (645 trước plan + 24); `@tripory/config` 104 test xanh.

## Task Commits

1. **Task 03-09-01: `proxy.ts` (TDD)**
   - RED `1fa2e27` `test(03-09): add failing tests for optimistic proxy gate`
   - GREEN `35c7912` `feat(03-09): add optimistic proxy gate for dashboard and auth pages`
2. **Task 03-09-02: `viewer.server.ts` + `decideDashboardGate` (TDD)**
   - RED `8808f49` `test(03-09): add failing test for decideDashboardGate`
   - GREEN `70719f6` `feat(03-09): add viewer.server and decideDashboardGate`

## Files Created/Modified

- `apps/web/src/proxy.ts` — `proxy`, `config`, `PROTECTED_PREFIXES`.
- `apps/web/src/proxy.test.ts` — 20 test.
- `apps/web/src/composition/viewer.server.ts` — `getViewer`, `getSessionKind`.
- `apps/web/src/composition/server/dashboard-gate.ts` — `decideDashboardGate`, `SessionKind`, `DashboardGateDecision`.
- `apps/web/src/composition/server/dashboard-gate.test.ts` — 4 test.

## Decisions Made

Sáu quyết định ở `key-decisions`. Hai điểm lệch nhỏ so với đoạn code mẫu của RESEARCH Pattern 5:

- `hasSessionCookie` ở 03-05 yêu cầu tham số `secure` (mẫu research gọi không tham số), nên proxy truyền `isSecureCookieEnv()`.
- Mẫu research nối `search` thô vào `next`; plan (và Pitfall 8) yêu cầu lọc `_rsc`/`__next*`, nên `next` dựng từ `URLSearchParams` đã lọc.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Điều chỉnh nhỏ (không phải sửa lỗi)

- Comment đầu tiên trong `viewer.server.ts` có cụm "use cache" làm tiêu chí acceptance `Select-String "use cache"` có kết quả; đã viết lại comment trước khi commit (code không dùng directive).
- `packages/api-client/src/fetch-http-client.ts` (dấu cách đầu dòng 1) và `.planning/config.json` là thay đổi có sẵn trước plan, không stage; lint không báo lỗi nên không gỡ dấu cách.

### Bước workflow cố ý bỏ qua

**1. [Chủ đích] Không tick AUTH-05, AUTH-03, AUTH-07 trong `REQUIREMENTS.md`**
- **Lý do:** cùng cách làm của 03-05..03-08. Plan này chỉ dựng lớp gate và nguồn dữ liệu phía server; layout `(dashboard)`, trang login quay lại `next` và header dùng Viewer nằm ở 03-11..03-13, nên hành vi người dùng chưa chạy end-to-end. `requirements-completed` để rỗng, tick ở bước verify phase.

---

**Total deviations:** 0 sửa lỗi, 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `packages/config/eslint/boundaries.mjs`, không nới allowlist, không sửa package nào khác.

## Issues Encountered

- `server-only` không phải dependency của `apps/web` (không có trong `node_modules`). Next tự alias import này sang bản biên dịch sẵn (`next/dist/compiled/server-only`); `tsc` và ESLint không báo lỗi với import side-effect. Chưa chạy `next build` trong plan này nên chưa quan sát bundler xử lý import đó; layout `(dashboard)` ở 03-13 là nơi đầu tiên import `viewer.server.ts`, và bước build/verify phase sẽ lộ ra nếu có vấn đề.
- Cảnh báo Vite `configLoader: 'native'` khi chạy `vitest` ở `apps/web` có sẵn từ Phase 1.
- `token-guard.test.ts` của `ui-web` không timeout ở lần chạy toàn repo này.

## Known Stubs

Không có. `getViewer`/`getSessionKind` chưa có nơi gọi (03-13), nhưng là export thật, không dữ liệu giả.

## Threat Model Verification

- **T-03-42 (open redirect qua `?next=`):** mọi đích redirect của người đã đăng nhập đi qua `toSafeNextPath`; test `//evil.com`, `https://evil.com`, `/login`.
- **T-03-43 (bypass auth chỉ dựa vào proxy):** comment đầu `proxy.ts` ghi rõ proxy chỉ là UX; không giải mã JWT, không `fetch`; BFF (03-08) và BE xác thực Bearer thật; gate thứ hai ở layout `(dashboard)` thuộc 03-13 (chưa làm trong plan này).
- **T-03-44 (vòng lặp redirect):** `toSafeNextPath` từ chối `/login` và `/register`; test `/login?next=/login` → `/itineraries/mine`. Phần route refresh xóa cookie trước khi client điều hướng thuộc 03-07.
- **T-03-45 (Viewer cache chung giữa người dùng):** không dùng `use cache`, chỉ `React.cache` theo request; grep xác nhận không còn chuỗi `use cache` trong `viewer.server.ts`.
- **T-03-46 (`_rsc` lọt vào `next`):** lọc `_rsc` và `__next*`; test hai tham số cùng lúc và ca chỉ còn tham số nội bộ.

## Threat Flags

Không có bề mặt mới ngoài `threat_model` của plan.

## Verification

- `pnpm --filter @tripory/web test -- proxy` (20 test), `-- dashboard-gate` (4 test), `lint`, `typecheck` — exit 0.
- `pnpm --filter @tripory/config test` — 104 test xanh.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh.
- Acceptance Task 1: `proxy.ts` chứa `export function proxy`, `export const config`, `PROTECTED_PREFIXES`, `toSafeNextPath`, `hasSessionCookie`; không import `@tripory/identity/http` hay `@tripory/api-client/http`, không `fetch(`, không `decodeJwtPayload`; test có ca `/register?next=//evil.com`, `_rsc`, cookie hết hạn vẫn `next()`, `/itineraries/minefoo`.
- Acceptance Task 2: `viewer.server.ts` có `import "server-only"`, `await cookies()` (trước `Date.now()` trong `getSessionKind`), `cache(`; chỉ file này trong `composition` có `import "server-only"`; không có `use cache`.

## User Setup Required

None.

## Next Phase Readiness

- 03-13 (layout `(dashboard)`) dùng `getSessionKind` + `decideDashboardGate` trong `<Suspense>`; 03-14 viết test `proxy-coverage` đối chiếu `PROTECTED_PREFIXES` với thư mục `(dashboard)`.
- Route mới trong `(dashboard)` phải được thêm tiền tố vào `PROTECTED_PREFIXES`; 03-12 thêm `settings/password` đã nằm trong tiền tố `/settings`.
- Ready for 03-11.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-15*

## Self-Check: PASSED

Đã kiểm 5 file nguồn/test tồn tại và 4 commit `1fa2e27`, `35c7912`, `8808f49`, `70719f6` có trong git log.
