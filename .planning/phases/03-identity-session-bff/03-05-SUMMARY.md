---
phase: 03-identity-session-bff
plan: 05
subsystem: bff-server-core
tags: [cookies, host-prefix, set-cookie, same-origin, csrf, ssrf, upstream-timeout, session-store, jwt-claims, vitest, tdd]

requires:
  - phase: 03-identity-session-bff
    provides: "03-01: `makeRequest`/`setCookiesOf`, `API_ORIGIN` server-only, test `// @vitest-environment node`; 03-03: `STALE_AT_SEC`, `isFresh`, `Viewer`; 03-04: `parseAccessTokenClaims` (`@tripory/identity/http`)"
provides:
  - "`apps/web/src/composition/session-cookies.ts`: `sessionCookieNames(secure)`, `isSecureCookieEnv()`, `hasSessionCookie(cookies, secure)`, `readAccessExpFromCookieString(cookieString, secure)`; không import API server của Next nên proxy và client dùng chung"
  - "`composition/server/env.ts`: `parseServerEnv`, `serverDeps()` (đọc `API_ORIGIN` lúc gọi, chỉ giữ origin), kiểu `ServerEnv`/`ServerDeps`"
  - "`composition/server/request-guards.ts`: `checkSameOrigin`, `errorEnvelope`, `successEnvelope` (luôn `cache-control: no-store`)"
  - "`composition/server/upstream.ts`: `callBackend` (timeout 28 giây, `cache: no-store`, `redirect: manual`, URL khóa vào `API_ORIGIN` + `/api/v1/`), `UPSTREAM_TIMEOUT_MS`, kiểu `UpstreamResult`"
  - "`composition/server/session-store.ts`: `writeSession`, `clearSession`, `readRawTokens`, `readSession`, `readViewerFromCookie`, `decodeJwtPayload`, kiểu `SessionState`/`CookieGetter`/`SessionTokens`"
  - "`apps/web/src/test/be-auth-fixtures.ts`: `fakeJwt`, `claimsPayload`, `bearerPair`, `beAuthResponse`, `beTokenResponse`, `beErrorEnvelope`, 7 envelope lỗi BE, `jsonResponse` (không import `vitest`)"
affects: [03-06, 03-07, 03-08, 03-09, 03-11, 03-13, phase-03-identity]

tech-stack:
  added: []
  patterns: [pure-server-modules-no-server-only, set-cookie-header-tests, fake-fetch-with-fake-timers, rewrite-cookie-with-max-age-0, upstream-url-lock]

key-files:
  created:
    - apps/web/src/composition/session-cookies.ts
    - apps/web/src/composition/session-cookies.test.ts
    - apps/web/src/composition/server/env.ts
    - apps/web/src/composition/server/env.test.ts
    - apps/web/src/composition/server/request-guards.ts
    - apps/web/src/composition/server/request-guards.test.ts
    - apps/web/src/composition/server/upstream.ts
    - apps/web/src/composition/server/upstream.test.ts
    - apps/web/src/composition/server/session-store.ts
    - apps/web/src/composition/server/session-store.test.ts
    - apps/web/src/test/be-auth-fixtures.ts
  modified: []

key-decisions:
  - "Tên cookie viết thành hai hằng đầy đủ (`__Host-tripory_at|rt|at_exp` và `tripory_at|rt|at_exp`), không ghép prefix lúc chạy, để grep được tên cookie thật khi debug."
  - "`writeSession` vẫn ghi cookie với `Max-Age=0` khi `expiresAt` đã qua (trả `ok: true`); chỉ `expiresAt` không parse được hoặc access token không có claim hợp lệ mới trả `ok: false` và không ghi cookie nào."
  - "`readSession` trả `stale` không kèm `accessToken`; route refresh lấy token thô bằng `readRawTokens`."
  - "`decodeJwtPayload` đòi đúng 3 đoạn và đoạn giữa chỉ gồm ký tự base64url trước khi giải mã (chặt hơn chỉ `try/catch`)."
  - "`callBackend` ném `Error('Upstream URL không hợp lệ')` không kèm đường dẫn, vì đường dẫn có thể chứa dữ liệu do client gửi."

patterns-established:
  - "Module server của app (`composition/server/*.ts`) là hàm thuần nhận `deps`/`nowSec`/`secure` và `NextResponse`/getter, không import `server-only` hay `next/headers`, test bằng Vitest môi trường node."
  - "Test Set-Cookie đọc header thô (`getSetCookie()`) cho các thuộc tính trình duyệt nghiêm ngặt (`Secure`, `Path=/`, `Max-Age=0`) và `setCookiesOf` cho map theo tên."
  - "Fake fetch dạng `vi.fn<(...args) => Promise<Response>>`, ca timeout dùng `vi.useFakeTimers()` + `advanceTimersByTimeAsync`, `afterEach(() => vi.useRealTimers())`."

# Plan này chỉ dựng nguyên liệu server (cookie, guard, upstream, kho phiên). Chưa có route nào đăng nhập,
# refresh, đăng xuất hay BFF nên chưa tick hoàn thành (xem mục "Bước workflow cố ý bỏ qua").
requirements-addressed: [AUTH-02, AUTH-03, AUTH-04, AUTH-08]
requirements-completed: []

duration: 9 min
completed: 2026-10-14
---

# Phase 3 Plan 5: Lõi server của BFF (cookie, Origin guard, upstream, kho phiên) Summary

**5 module thuần cho BFF: tên cookie `__Host-` (dev bỏ prefix), `API_ORIGIN` đọc lúc gọi, `checkSameOrigin` + envelope no-store, `callBackend` timeout 28 giây khóa vào `API_ORIGIN` + `/api/v1/` với `redirect: manual`, và `session-store` ghi/xóa/đọc phiên khóa bằng test header `Set-Cookie` (xóa bằng `Max-Age=0` đủ `Secure; Path=/`, không dùng `delete`); `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-10-14T22:18:00+07:00
- **Completed:** 2026-10-14T22:27:00+07:00
- **Tasks:** 3 (cả ba TDD: RED rồi GREEN, không cần REFACTOR)
- **Files:** 11 (đều tạo mới, trùng danh sách `files_modified` của plan; không sửa file có sẵn)

## Accomplishments

- **Task 1:** `sessionCookieNames(true)` = `__Host-tripory_at|rt|at_exp`, `(false)` = `tripory_at|rt|at_exp`; `hasSessionCookie` chỉ kiểm cookie access (D-25); `readAccessExpFromCookieString` khớp tên đầy đủ và chỉ nhận số nguyên dương an toàn. `parseServerEnv` giữ đúng origin (`http://localhost:5000/` → `http://localhost:5000`), `serverDeps()` đọc `process.env` lúc gọi nên `next build` không vỡ khi thiếu biến. `checkSameOrigin` từ chối `Origin` lạ (kể cả chuỗi `null`, khác scheme, khác port), cho GET/HEAD thiếu Origin, và request ghi thiếu Origin chỉ qua khi `Sec-Fetch-Site: same-origin`.
- **Task 2:** `callBackend` kiểm `url.origin === apiOrigin` và `pathname.startsWith("/api/v1/")` trước khi fetch (10 dạng URL ép đổi origin/thoát thư mục đều bị chặn, fetch gọi 0 lần), timeout 28 giây tính cả lúc đọc body, `clearTimeout` trong `finally`, 3xx của BE được chuyển như response.
- **Task 3:** `writeSession` đặt access/refresh `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800` và `at_exp` không `HttpOnly` chỉ chứa chữ số; `clearSession` ghi lại đủ thuộc tính với `Max-Age=0`; `readSession` phân loại `none | invalid | stale | fresh` với biên 30/31 giây; test round-trip ghi rồi đọc lại. `be-auth-fixtures.ts` cho plan 03-07/08/09/13 dùng chung.
- 105 test mới cho `@tripory/web` (44 + 25 + 36); toàn repo: `@tripory/web` 28 file / 388 test, `@tripory/identity` 244, `@tripory/api-client` 95, `@tripory/ui-web` 180, `@tripory/config` 104.

## Task Commits

1. **Task 03-05-01: `session-cookies`, `env`, `request-guards` (TDD)**
   - RED `e0fc103` `test(03-05): add failing tests for session cookies, server env and request guards`
   - GREEN `ba2c1a2` `feat(03-05): add session cookie names, server env and same-origin guard`
2. **Task 03-05-02: `callBackend` (TDD)**
   - RED `8b006f9` `test(03-05): add failing tests for callBackend upstream timeout and URL lock`
   - GREEN `62d1eed` `feat(03-05): add callBackend with 28s timeout and API_ORIGIN-locked URL`
3. **Task 03-05-03: `session-store` và fixture auth dùng chung (TDD)**
   - RED `e928970` `test(03-05): add failing tests for session store and shared BE auth fixtures`
   - GREEN `e28a464` `feat(03-05): add session store to write, clear and read session cookies`

Không cần commit REFACTOR.

## Files Created/Modified

- `apps/web/src/composition/session-cookies.ts` (+ test) — tên cookie, `isSecureCookieEnv`, `hasSessionCookie`, `readAccessExpFromCookieString`.
- `apps/web/src/composition/server/env.ts` (+ test) — `parseServerEnv` (Zod `z.url()` + protocol http/https), `serverDeps()`.
- `apps/web/src/composition/server/request-guards.ts` (+ test) — `checkSameOrigin`, `errorEnvelope`, `successEnvelope`.
- `apps/web/src/composition/server/upstream.ts` (+ test) — `callBackend`, `UPSTREAM_TIMEOUT_MS = 28_000`.
- `apps/web/src/composition/server/session-store.ts` (+ test) — ghi/xóa/đọc phiên, `decodeJwtPayload`, `readViewerFromCookie`.
- `apps/web/src/test/be-auth-fixtures.ts` — JWT giả theo claim thật của BE, cặp token, envelope thành công/lỗi, `jsonResponse`.

## Decisions Made

- Năm quyết định ở `key-decisions` ở trên; còn lại theo đúng `<action>` của plan.
- Chữ ký các fixture cho plan sau: `bearerPair(nowSec, expiresInSec, suffix = "1")` → `{ accessToken, refreshToken: "fake-refresh-token-<suffix>", expiresAt }` (`expiresAt` = `nowSec` + 7 ngày); `beAuthResponse(pair)` có `user` với avatar mặc định chung của BE, `beTokenResponse(pair)` không có `user`; envelope lỗi là hằng (`tokenCompromisedEnvelope`, `tokenInvalidRefreshTokenEnvelope`, `tokenExpiredEnvelope`, `authInvalidCredentialsEnvelope`, `authInvalidCurrentPasswordEnvelope`, `notEqualValidatorEnvelope`, `userEmailAlreadyExistsEnvelope`) hoặc dựng bằng `beErrorEnvelope(errorCode, message)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `parseServerEnv` ném "Invalid URL" thay vì lỗi nhắc `API_ORIGIN`**
- **Found during:** Task 1 (lần chạy GREEN đầu: 41/44 xanh)
- **Issue:** `refine` của Zod 4 vẫn chạy sau khi `z.url()` đã báo lỗi, nên với `"not a url"` hoặc chuỗi rỗng thì `new URL(value)` trong `refine` ném `TypeError: Invalid URL`, lỗi thoát ra trước khi `safeParse` trả kết quả. Người cấu hình sẽ không thấy tên biến.
- **Fix:** Chặn bằng `URL.canParse(value)` trước khi `new URL`, kèm comment lý do.
- **Files modified:** `apps/web/src/composition/server/env.ts`
- **Verification:** 4 ca (`thiếu`, `rỗng`, `ftp://x`, `not a url`) cùng ca `serverDeps` đều ném Error có chứa `API_ORIGIN`.
- **Committed in:** `ba2c1a2` (cùng commit GREEN của task, sửa trước khi commit)

### Bước workflow cố ý bỏ qua

**2. [Chủ đích] Không tick checkbox trong `REQUIREMENTS.md`**
- **Bước:** `requirements mark-complete AUTH-02 AUTH-03 AUTH-04 AUTH-08`
- **Lý do:** Cùng cách làm của 03-01. Plan này chỉ dựng nguyên liệu: chưa có route đăng nhập/refresh/đăng xuất, chưa có BFF, chưa có `proxy.ts`. Đánh dấu Complete bây giờ sẽ sai sự thật và làm verifier hiểu nhầm. `requirements-completed` ở frontmatter để rỗng; bốn yêu cầu được tick khi plan 03-07, 03-08, 03-09 thực hiện hành vi tương ứng hoặc khi verify phase.

---

**Total deviations:** 1 auto-fixed (Rule 1) và 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `boundaries.mjs`, không nới allowlist.

## Issues Encountered

- `.planning/config.json` (khóa của gsd tooling) và `packages/api-client/src/fetch-http-client.ts` (dấu cách đầu dòng 1) là thay đổi có sẵn trước plan, không thuộc plan này nên không stage. `pnpm lint` và `typecheck` vẫn xanh với dấu cách đó, nên không gỡ.
- Cảnh báo Vite `configLoader: 'native'` khi chạy `vitest` ở `apps/web` có sẵn từ Phase 1, không ảnh hưởng kết quả.
- `token-guard.test.ts` của `ui-web` (flake nhạy tải đã ghi trong `deferred-items.md`) không timeout ở lần chạy toàn repo này.

## Known Stubs

Không có. Cả năm module đều chạy thật và có test; chưa có route nào dùng chúng (việc của 03-07, 03-08, 03-09), nhưng không có dữ liệu giả nối vào UI.

## Threat Model Verification

- **T-03-14 (cookie theft / XSS đọc token):** test header `Set-Cookie`: access và refresh luôn `HttpOnly; Secure; SameSite=Lax; Path=/` (`Secure` theo `secure`, prefix `__Host-` ở production); `at_exp` không `HttpOnly` và khớp `^\d+$`, giá trị không chứa token.
- **T-03-15 (cookie tossing):** tên `__Host-*` + không `Domain` (test khẳng định thuộc tính `domain` vắng) + `Secure` + `Path=/`.
- **T-03-16 (xóa cookie `__Host-` thất bại):** `clearSession` ghi lại đủ thuộc tính với `Max-Age=0`, test kiểm cả 3 dòng có `Secure`, `Path=/`, `Max-Age=0`, `SameSite=lax`, không `Domain`; `Select-String '\.delete\('` trên `session-store.ts` = 0.
- **T-03-17 (CSRF / login-CSRF):** `checkSameOrigin` có test Origin lạ, `null`, khác scheme/port, POST/PUT/DELETE thiếu Origin với `cross-site`, `same-site`, `none` và không có `Sec-Fetch-Site`. Route dùng nó ở 03-07/03-08.
- **T-03-18 (SSRF / open proxy):** `callBackend` có 10 ca URL ép đổi origin hoặc thoát `/api/v1/` (`//evil`, `\\evil`, URL tuyệt đối, khác port/scheme, `..`, `%2e%2e`, rỗng) đều ném lỗi và fetch gọi 0 lần; 3xx không bị theo.
- **T-03-19 (token/mật khẩu lọt log):** `Select-String 'console\.' composition/server/*.ts` = 0; thông điệp lỗi upstream không kèm đường dẫn của caller (có test).
- **T-03-20 (upstream treo):** timeout 28 giây, kiểm bằng fake timers ở 27 999 ms (đang chờ) và 28 000 ms (`timeout`, signal đã abort), kể cả khi header đã về mà body treo; `vi.getTimerCount() === 0` sau khi xong.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan.

## Verification

- `pnpm --filter @tripory/web test | lint | typecheck` — exit 0 (28 file, 388 test).
- Acceptance Task 1: ba tên cookie `__Host-` có trong `session-cookies.ts`; file không chứa `server-only` hay `next/headers`; `env.ts` có `API_ORIGIN`, không có `NEXT_PUBLIC_`, `serverDeps` đọc `process.env` trong hàm; `request-guards.test.ts` có 4 ca bắt buộc.
- Acceptance Task 2: `upstream.ts` có `28_000`, `redirect: "manual"`, `cache: "no-store"`, `startsWith("/api/v1/")`, 0 `console.`; test có ca timeout với `advanceTimersByTimeAsync`, ca URL sai không gọi fetch, ca query giữ nguyên, ca 3xx.
- Acceptance Task 3: `session-store.ts` 0 `.delete(`, có `maxAge: 0`, `base64url`, `STALE_AT_SEC`, `parseAccessTokenClaims`; `composition/server/*.ts` 0 `server-only`.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh.

## User Setup Required

None. Khi chạy `pnpm dev` với BE local, cần `apps/web/.env.local` có `API_ORIGIN` (xem `apps/web/.env.example`); `serverDeps()` sẽ ném lỗi nhắc tên biến nếu thiếu, nhưng chỉ ở lần gọi đầu tiên của route (route chưa tồn tại tới plan 03-07).

## Next Phase Readiness

- 03-06 (client composition) không phụ thuộc plan này nhưng dùng `readAccessExpFromCookieString` và `sessionCookieNames` từ `session-cookies.ts`.
- 03-07 (route auth) ghép `checkSameOrigin`, `callBackend`, `writeSession`/`clearSession`, `readRawTokens`, `errorEnvelope`/`successEnvelope`, `serverDeps()`; test dùng `be-auth-fixtures.ts`.
- 03-08 (BFF) dùng `readSession` (stale/invalid → 401 `session.expired`, không gọi BE) và `callBackend`.
- 03-09 (`proxy.ts`, `viewer.server.ts`) dùng `hasSessionCookie`, `isSecureCookieEnv`, `readViewerFromCookie`.
- Ready for 03-06.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-14*

## Self-Check: PASSED

Đã kiểm 11 file nguồn/test tồn tại và 6 commit `e0fc103`, `ba2c1a2`, `8b006f9`, `62d1eed`, `e928970`, `e28a464` có trong git log; acceptance criteria của cả ba task và `<verification>` của plan chạy lại đều PASS.
