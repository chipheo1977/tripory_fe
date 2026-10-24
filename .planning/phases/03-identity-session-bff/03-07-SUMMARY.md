---
phase: 03-identity-session-bff
plan: 07
subsystem: bff-auth-routes
tags: [route-handler, httponly-cookie, login-csrf, idempotent-refresh, change-password, same-origin, mass-assignment, vitest, tdd]

requires:
  - phase: 03-identity-session-bff
    provides: "03-05: `checkSameOrigin`, `errorEnvelope`/`successEnvelope`, `callBackend`, `writeSession`/`clearSession`/`readSession`/`readRawTokens`/`decodeJwtPayload`, `serverDeps()`, `be-auth-fixtures.ts`; 03-04: `authResponseDto`, `tokenResponseDto`, `toViewer`, `parseAccessTokenClaims`; 03-03: `REFRESH_IF_BELOW_SEC`; 03-01: `makeRequest`/`setCookiesOf`; Phase 2: `SESSION_EXPIRED`"
provides:
  - "`apps/web/src/composition/server/auth-handlers.ts`: `handleLogin`, `handleRegister`, `handleLogout`, `handleRefresh`, `handleChangePassword`, đều là hàm thuần `(NextRequest, ServerDeps)`"
  - "5 route mỏng (7 dòng mỗi file): `POST /api/auth/login`, `/register`, `/logout`, `/refresh`, `PUT /api/auth/change-password`"
  - "Hợp đồng response cho client (khóa bằng 122 test): login/register `data: { viewer }`; refresh `data: { refreshed: boolean }`; logout và change-password `data: null`; lỗi FE sinh `Bff.CrossOrigin` 403, `Bff.InvalidBody` 400, `Bff.UpstreamTimeout` 504, `Bff.UpstreamUnavailable` 502, `Bff.InvalidUpstream` 502, `Bff.RefreshUnavailable` 503, `session.expired` 401"
affects: [03-08, 03-11, 03-12, 03-13, phase-03-identity]

tech-stack:
  added: []
  patterns: [pure-handler-plus-thin-route, named-field-allowlist-body, upstream-error-passthrough-without-headers, idempotent-refresh-by-server-clock, clear-session-on-confirmed-death-only]

key-files:
  created:
    - apps/web/src/composition/server/auth-handlers.ts
    - apps/web/src/composition/server/auth-handlers.credentials.test.ts
    - apps/web/src/composition/server/auth-handlers.refresh.test.ts
    - apps/web/src/composition/server/auth-handlers.change-password.test.ts
    - apps/web/src/app/api/auth/login/route.ts
    - apps/web/src/app/api/auth/register/route.ts
    - apps/web/src/app/api/auth/logout/route.ts
    - apps/web/src/app/api/auth/refresh/route.ts
    - apps/web/src/app/api/auth/change-password/route.ts
  modified: []

key-decisions:
  - "Body gửi lên BE được dựng lại từ các field chuỗi đặt tên cứng (`email`/`password`/`fullName`, `currentPassword`/`newPassword`), không chuyển nguyên body client; thiếu hoặc sai kiểu một field thì cả body bị từ chối `Bff.InvalidBody`, chuỗi rỗng vẫn qua để BE trả lỗi validate (D-19), mật khẩu không bị `trim`."
  - "Lỗi upstream chia ba nhóm: 4xx/5xx chuyển nguyên `status` + `body` + `content-type` (bỏ mọi header khác, đặc biệt `set-cookie`); timeout → 504, mạng → 502; status ngoài 400..599 (3xx do `redirect: manual`) → 502 `Bff.InvalidUpstream`. BE 2xx mà body sai hình dạng, id không phải GUID hoặc access token thiếu claim cũng là 502 và không có cookie nào."
  - "`handleRefresh` kiểm Origin trước cả khi xét cookie (Origin lạ không được phép xóa cookie của người dùng); quyết định no-op theo đồng hồ server `deps.nowMs()`; chỉ BE 400/401/403 mới xóa phiên, mọi status còn lại (5xx, 404, 429, 3xx), timeout và lỗi mạng giữ cookie và trả 503; BE 200 hỏng thì 502 và cũng giữ cookie."
  - "`handleChangePassword`: `none`/`stale` → 401 `session.expired` không gọi BE và KHÔNG xóa cookie (client còn cần refresh token để refresh rồi phát lại), `invalid` → xóa cookie; BE 2xx xóa cả 3 cookie bất kể body; BE 401 → 401 `session.expired` của FE, không xóa; lỗi BE khác chuyển nguyên và không xóa."
  - "`handleLogout` là hàm đồng bộ (không gọi BE vì BE không có endpoint đăng xuất) nhưng vẫn kiểm Origin để chặn CSRF logout; các helper `readJsonObject`, `pickStrings`, `forwardUpstream` để riêng tư trong file, 03-08 cần thì tách ra khi đó."

patterns-established:
  - "Mỗi handler: `checkSameOrigin` đầu tiên → (phiên) → body → `callBackend` → phân loại → response; route chỉ gọi `handleX(request, serverDeps())`, không `export const dynamic|runtime`."
  - "Test route đọc header `Set-Cookie` thô cho lệnh xóa (`Max-Age=0`, `Secure`, `Path=/`) và `setCookiesOf` cho giá trị/thuộc tính ghi; ca 'giữ cookie' khẳng định `getSetCookie()` rỗng; ca timeout dùng `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` + `vi.waitFor(fetch được gọi)` + `advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS)` vì `request.json()` chạy trước `callBackend`."

requirements-addressed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-06]
# Plan này chỉ dựng route phía server. Chưa có form (03-12/03-13), chưa có vòng đời phiên trên UI (03-11), chưa có BFF
# (03-08) nên đăng ký/đăng nhập/giữ phiên/đăng xuất/đổi mật khẩu chưa chạy end-to-end: chưa tick (xem "Bước workflow cố ý bỏ qua").
requirements-completed: []

duration: ~12 min
completed: 2026-10-15
---

# Phase 3 Plan 7: Route Handler `/api/auth/*` (đăng nhập, đăng ký, đăng xuất, refresh, đổi mật khẩu) Summary

**Năm route auth là hàm thuần trên `NextRequest`/`NextResponse` với Origin kiểm đầu tiên: login/register ghi 3 cookie và chỉ trả `{ viewer }` (register dùng token BE trả, gọi BE đúng 1 lần), refresh idempotent theo đồng hồ server (còn > 150 giây thì không gọi BE; chỉ 400/401/403 mới xóa phiên, 5xx/timeout/mạng giữ cookie với 503), đổi mật khẩu xóa phiên khi BE 2xx và chuyển nguyên lỗi BE; 122 test mới, `pnpm lint`, `typecheck`, `test` toàn repo xanh, `next build` liệt kê đủ 5 route**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-10-15T09:51:00+07:00 (ước tính; commit đầu 09:54:09)
- **Completed:** 2026-10-15T10:03:00+07:00
- **Tasks:** 3 (cả ba TDD: RED rồi GREEN, không cần REFACTOR)
- **Files:** 9 (đều tạo mới, trùng danh sách `files_modified` của plan; không sửa file có sẵn)

## Accomplishments

- **Task 1 (login, register, logout):** `credentialsHandler` dùng chung: `checkSameOrigin` → `readJsonObject` → `pickStrings` → `callBackend(/api/v1/auth/<login|register>)` → 2xx thì `authEnvelope.parse` + `toViewer` + `writeSession`. Body trả về chỉ có `viewer` (avatar mặc định của BE thành `null`, avatar riêng đi qua); test khẳng định text response không khớp `accessToken|refreshToken|expiresAt` và không chứa giá trị access token, refresh token, mật khẩu. Header gửi BE đúng `{ accept, content-type }`, field thừa (`role`, `isAdmin`, `confirmPassword`) bị bỏ, `cookie`/`authorization`/`origin` của client không đi tiếp. Register gọi `/register` đúng 1 lần (D-02). `handleLogout` xóa 3 cookie đủ `Secure; Path=/; Max-Age=0` và không gọi BE.
- **Task 2 (refresh):** thứ tự Origin → thiếu/hỏng cookie (xóa + 401) → no-op nếu còn > 150 giây (200 `{ refreshed: false }`, 0 lần gọi BE, 0 Set-Cookie) → `POST refresh-token` với token **từ cookie** (body client bị bỏ qua) → phân loại. Ngưỡng kiểm ở 151 (no-op) và 150 (gọi BE). Test hai tab: tab A xoay token, tab B với cookie mới no-op, BE chỉ bị gọi 1 lần.
- **Task 3 (change-password):** `readSession` quyết định trước (`none`/`stale` 401 không gọi BE và giữ cookie, `invalid` xóa cookie), Bearer lấy từ cookie, 2xx xóa cả 3 cookie (kể cả khi body BE rỗng), `Auth.InvalidCurrentPassword`/`NotEqualValidator` chuyển nguyên và giữ cookie. Test khẳng định mật khẩu không xuất hiện trong bất kỳ response nào.
- **Kiểm chứng độ nhạy của test:** ba đột biến tạm, mỗi cái bị bắt rồi đã hoàn nguyên bằng `git checkout -- <file>`: (1) trải `...tokens` vào `data` của login → 2 test đỏ; (2) ngưỡng no-op `REFRESH_IF_BELOW_SEC + 1000` → 7 test đỏ; (3) `isSessionEndedStatus = status >= 400` → 6 test đỏ.
- 122 test mới cho `@tripory/web` (46 + 46 + 30); toàn repo: `@tripory/web` 35 file / 571 test, `@tripory/identity` 244, `@tripory/api-client` 95, `@tripory/ui-web` 180, `@tripory/config` 104, `@tripory/shared-kernel` 32, `@tripory/design-tokens` 9.
- `next build` (với `API_ORIGIN=http://localhost:5000` đặt tạm trong phiên) biên dịch được và liệt kê `ƒ /api/auth/{change-password,login,logout,refresh,register}`.

## Task Commits

1. **Task 03-07-01: login, register, logout (TDD)**
   - RED `2fc8092` `test(03-07): add failing tests for login, register and logout handlers`
   - GREEN `24ea247` `feat(03-07): add login, register and logout route handlers`
2. **Task 03-07-02: refresh idempotent (TDD)**
   - RED `68ed6cc` `test(03-07): add failing tests for idempotent refresh handler`
   - GREEN `cfe8dca` `feat(03-07): add idempotent refresh route handler`
3. **Task 03-07-03: change-password (TDD)**
   - RED `7c1a092` `test(03-07): add failing tests for change-password handler`
   - GREEN `7c8f286` `feat(03-07): add change-password route handler that ends the session`

Không cần commit REFACTOR.

## Files Created/Modified

- `apps/web/src/composition/server/auth-handlers.ts` — 5 handler + helper riêng tư (`readJsonObject`, `pickStrings`, `forwardUpstream`, `issueSession`, `rotateSession`, `sessionEnded`, `refreshUnavailable`).
- `apps/web/src/composition/server/auth-handlers.credentials.test.ts` — 46 test login/register/logout.
- `apps/web/src/composition/server/auth-handlers.refresh.test.ts` — 46 test refresh.
- `apps/web/src/composition/server/auth-handlers.change-password.test.ts` — 30 test đổi mật khẩu.
- `apps/web/src/app/api/auth/{login,register,logout,refresh}/route.ts` (`POST`) và `change-password/route.ts` (`PUT`) — vỏ mỏng 7 dòng.

## Decisions Made

- Năm quyết định ở `key-decisions` ở trên; còn lại theo đúng `<action>` của plan.
- **Hợp đồng cho client (03-11, 03-12, 03-13)** khóa bằng test: 401 `session.expired` từ `/refresh` nghĩa là hết phiên thật (cookie đã bị xóa), 503 `Bff.RefreshUnavailable` là tạm thời (cookie còn); `/change-password` 401 `session.expired` kèm cookie còn là `stale`, client refresh rồi phát lại (`authHttp` mặc định bọc refresh); thành công của `/change-password` nghĩa là cookie đã mất, UI phải chuyển về đăng nhập (D-18); lỗi form (`Auth.InvalidCredentials`, `User.EmailAlreadyExists`, `Auth.InvalidCurrentPassword`, `NotEqualValidator`...) đến nguyên `errorCode` của BE.
- **Ghi chú cho 03-08:** `forwardUpstream` chưa export. BFF cần quy tắc tương tự (chuyển nguyên status/body/content-type, bỏ header khác) thì tách ra module dùng chung ở plan đó, không copy.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Điều chỉnh nhỏ (không phải sửa lỗi)

- **Comment đầu `auth-handlers.ts`:** bản nháp đầu nhắc `console.*` trong comment nên trùng chính grep acceptance (`Select-String … "console\."` phải rỗng). Đổi lời comment trước khi commit GREEN của Task 1; code không đổi.
- **Quyết định ngoài danh sách hành vi của plan** (đều theo hướng an toàn, có test): status 3xx từ BE → 502 `Bff.InvalidUpstream` ở login/register/change-password và → 503 ở refresh; BE 404/429 ở refresh → 503 giữ cookie; BE 200 body hỏng ở refresh → 502 giữ cookie; body change-password thiếu field → 400 sau khi đã xét phiên (phiên `stale` thắng nên client refresh trước).

### Bước workflow cố ý bỏ qua

**1. [Chủ đích] Không tick checkbox AUTH-01, 02, 03, 04, 06 trong `REQUIREMENTS.md`**
- **Bước:** `requirements mark-complete AUTH-01 AUTH-02 AUTH-03 AUTH-04 AUTH-06`
- **Lý do:** Cùng cách làm của 03-01, 03-05, 03-06. Plan này chỉ làm phía server của năm route. Chưa có form đăng ký/đăng nhập/đổi mật khẩu (03-12, 03-13), chưa có SessionKeeper/SessionRecovery/nút đăng xuất trên UI (03-11), chưa có BFF dùng phiên (03-08), nên người dùng chưa thực hiện được hành vi nào. Tick bây giờ sẽ sai sự thật và làm verifier hiểu nhầm. `requirements-completed` để rỗng; các yêu cầu được tick khi plan chạm UI tương ứng hoặc ở bước verify phase.

---

**Total deviations:** 0 sửa lỗi, 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `packages/config/eslint/boundaries.mjs`, không nới allowlist, không sửa `packages/identity` hay `packages/api-client`.

## Issues Encountered

- Một lượt kiểm độ nhạy chạy các lệnh song song nên thứ tự "sửa tạm → chạy → hoàn nguyên" không đáng tin; làm lại đột biến thứ ba tuần tự (một lệnh mỗi bước) rồi xác nhận `git status` chỉ còn hai thay đổi có sẵn và 122 test xanh.
- `.planning/config.json` (khóa của gsd tooling) và `packages/api-client/src/fetch-http-client.ts` (dấu cách đầu dòng 1) là thay đổi có sẵn trước plan, không thuộc plan này nên không stage. `pnpm lint` và `typecheck` vẫn xanh với dấu cách đó nên không gỡ.
- Cảnh báo Vite `configLoader: 'native'` khi chạy `vitest` ở `apps/web` có sẵn từ Phase 1, không ảnh hưởng kết quả.
- `token-guard.test.ts` của `ui-web` (flake nhạy tải đã ghi trong `deferred-items.md`) không timeout ở các lần chạy toàn repo này.

## Known Stubs

Không có. Cả năm handler chạy thật và có test; chưa có UI nào gọi chúng (việc của 03-11, 03-12, 03-13), nhưng không có dữ liệu giả nối vào UI.

## Threat Model Verification

- **T-03-27 (token trong body/log):** mọi test thành công của login/register/refresh/change-password khẳng định `text` không khớp `/accessToken|refreshToken|expiresAt/` và không chứa giá trị access token, refresh token, mật khẩu; `Select-String 'console\.'` trên `auth-handlers.ts` = 0. Đột biến trải `...tokens` vào body làm 2 test đỏ.
- **T-03-28 (login-CSRF / CSRF logout, đổi mật khẩu):** `checkSameOrigin` là lời gọi đầu tiên của cả 5 handler; cả 5 handler có test Origin lạ → 403 `Bff.CrossOrigin`, `fetch` gọi 0 lần, không Set-Cookie; login, logout, refresh và change-password có thêm ca thiếu Origin + `Sec-Fetch-Site`, và login, refresh, change-password có thêm ca `Origin: null`. Refresh có thêm ca Origin lạ kèm thiếu cookie vẫn không xóa cookie.
- **T-03-29 (refresh-token reuse / race):** no-op khi còn > 150 giây (0 lần gọi BE) và test hai tab (BE chỉ bị gọi 1 lần); phần khóa phía client đã có ở 03-06.
- **T-03-30 (đăng xuất oan khi BE cold start):** BE 500/502/503/504/404/429/302, timeout (fake timers 28 giây), lỗi mạng → 503 và `getSetCookie()` rỗng; BE 200 hỏng → 502 và giữ cookie. Đột biến `status >= 400` làm 6 test đỏ.
- **T-03-31 (xóa cookie `__Host-` thất bại):** test header Set-Cookie của logout, refresh (hết phiên) và change-password (thành công, `invalid`) kiểm cả 3 dòng có `Max-Age=0`, `Path=/`, `Secure`; logout còn kiểm không có `Domain`.
- **T-03-32 (mass-assignment):** test field thừa `role`, `isAdmin`, `confirmPassword` bị bỏ ở login/register/change-password; refresh bỏ qua body client.
- **T-03-33 (header/Set-Cookie của BE rò về client):** test BE trả `set-cookie` và `x-powered-by` kèm 500 → response không có hai header đó; chỉ `status`, `body`, `content-type` được giữ, `cache-control: no-store` do FE đặt.
- **T-03-34 (phiên cũ sau đổi mật khẩu):** BE 2xx (kể cả body rỗng) → 3 cookie `Max-Age=0`.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: unbounded-request-body | `apps/web/src/composition/server/auth-handlers.ts` | Handler đọc `request.json()` mà không đặt trần kích thước body riêng của FE. Các endpoint này chưa cần phiên (login/register) nên là bề mặt tiền xác thực; Origin guard chỉ chặn trình duyệt khác origin, client không phải trình duyệt có thể giả header. Giới hạn kích thước hiện dựa vào nền tảng triển khai, chưa kiểm cụ thể trong plan này. Không nằm trong `threat_model` của plan; để quyết định ở plan hardening hoặc deploy (Phase 8). |

## Verification

- `pnpm --filter @tripory/web test | lint | typecheck` — exit 0 (35 file, 571 test).
- Acceptance Task 1: `Select-String` mẫu `console\.`, `server-only`, `\.delete\(` trên `auth-handlers.ts` = 0; có `writeSession`, `clearSession`, `checkSameOrigin`, `/api/v1/auth/`; ba route 7 dòng, không `export const dynamic|runtime`; test có `not.toMatch(/accessToken|refreshToken|expiresAt/)` và `fetch` đúng 1 lần cho register.
- Acceptance Task 2: có `REFRESH_IF_BELOW_SEC`, `refresh-token`, `Bff.RefreshUnavailable`, `SESSION_EXPIRED`; test có `toHaveBeenCalledTimes(0)` cho thiếu cookie, claim hỏng, còn > 150 giây, Origin lạ; ca 503 khẳng định `setCookiesOf(res)` bằng `{}`; ca `Token.Compromised` khẳng định 401 và `Max-Age=0`; `refresh/route.ts` 7 dòng chứa `handleRefresh`.
- Acceptance Task 3: có `change-password`, `Bearer`; `change-password/route.ts` có `export function PUT`, không có `POST` (so khớp phân biệt hoa thường); ca `stale` với `fetch` 0 lần và Set-Cookie rỗng, ca `Auth.InvalidCurrentPassword` với Set-Cookie rỗng, ca thành công với 3 cookie `Max-Age=0`.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh. `next build` (có `API_ORIGIN` tạm) biên dịch được và liệt kê 5 route `ƒ`.

## User Setup Required

None. Chạy `pnpm dev` với BE local cần `apps/web/.env.local` có `API_ORIGIN` (xem `apps/web/.env.example`); `serverDeps()` ném lỗi nhắc tên biến ở lần gọi route đầu tiên nếu thiếu, còn `next build` không cần biến này.

## Next Phase Readiness

- 03-08 (BFF `/api/bff/*`): dùng `readSession` (stale/invalid → 401 `session.expired`, không gọi BE) và `callBackend`; cần quy tắc chuyển nguyên lỗi BE giống `forwardUpstream` (xem ghi chú ở Decisions Made).
- 03-09 (`proxy.ts`, `viewer.server.ts`): không phụ thuộc plan này.
- 03-11 (vòng đời phiên UI): `refreshSession()` đã có route thật để gọi; 401 `session.expired` ↔ `'expired'`, 503 ↔ lỗi tạm thời.
- 03-12, 03-13 (form): `authHttp` gọi được `login`, `register`, `logout`, `changePassword` thật; lỗi đến với `errorCode` nguyên của BE.
- Ready for 03-08.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-15*

## Self-Check: PASSED

Đã kiểm 9 file nguồn/test/route tồn tại và 6 commit `2fc8092`, `24ea247`, `68ed6cc`, `cfe8dca`, `7c1a092`, `7c8f286` có trong git log; acceptance criteria của cả ba task và `<verification>` của plan chạy lại đều PASS.
