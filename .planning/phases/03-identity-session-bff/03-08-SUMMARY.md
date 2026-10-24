---
phase: 03-identity-session-bff
plan: 08
subsystem: bff-proxy
tags: [route-handler, bff, allowlist, path-traversal, same-origin, bearer-from-cookie, header-allowlist, vitest, tdd]

requires:
  - phase: 03-identity-session-bff
    provides: "03-05: `checkSameOrigin`, `errorEnvelope`, `callBackend`, `readSession`, `serverDeps()`, `ServerDeps`; 03-01: `makeRequest`; fixtures `bearerPair`, `jsonResponse` trong `be-auth-fixtures.ts`; 03-07: quy ước route mỏng + handler thuần"
provides:
  - "`apps/web/src/composition/server/bff.ts`: `resolveBffTarget`, `forwardToBackend`, `BFF_ALLOWED_ROOTS`, `BFF_ALLOWED_METHODS`, `BFF_MAX_BODY_BYTES`"
  - "`apps/web/src/app/api/bff/[...path]/route.ts`: `GET POST PUT DELETE` vỏ mỏng gọi `forwardToBackend(request, path, serverDeps())`"
  - "Hợp đồng cho client (03-06 `bffHttp`, 03-11+): BFF trả lỗi FE sinh `Bff.MethodNotAllowed` 405, `Bff.NotFound` 404, `Bff.BadPath` 400, `Bff.CrossOrigin` 403, `session.expired` 401 (stale/invalid, BE không bị gọi), `Bff.PayloadTooLarge` 413, `Bff.UpstreamTimeout` 504, `Bff.UpstreamUnavailable` 502, `Bff.InvalidUpstream` 502 (BE trả 3xx); mọi trường hợp khác chuyển nguyên status + body + content-type của BE"
affects: [03-09, 03-11, 03-12, 03-13, phase-03-identity]

tech-stack:
  added: []
  patterns: [pure-handler-plus-thin-route, route-segment-allowlist, raw-path-encoded-traversal-guard, outbound-header-allowlist, server-attached-bearer]

key-files:
  created:
    - apps/web/src/composition/server/bff.ts
    - apps/web/src/composition/server/bff.resolve.test.ts
    - apps/web/src/composition/server/bff.forward.test.ts
    - apps/web/src/app/api/bff/[...path]/route.ts
  modified: []

key-decisions:
  - "`resolveBffTarget` kiểm theo thứ tự: dạng mã hóa `%2f|%5c|%2e` trên chuỗi thô → từng segment (rỗng, `.`, `..`, `/`, `\\`, ký tự điều khiển) → gốc allowlist. Traversal luôn 400 kể cả khi gốc là `users` hoặc gốc ngoài allowlist; gốc ngoài allowlist với segment sạch (kể cả `auth/*`) là 404."
  - "`forwardToBackend` kiểm theo thứ tự method → allowlist/traversal → Origin → phiên → body → gọi BE; mọi bước từ chối đều chưa gọi BE (test `fetch` 0 lần cho 405, 404, 400, 403, 401, 413). `stale` và `invalid` đều 401 `session.expired`; không cookie chuyển tiếp không Bearer."
  - "Header đi BE dựng mới từ đúng `accept`, `content-type`, `authorization` (chỉ khi `fresh`, do server gắn); response về client chỉ có `content-type` và `cache-control: no-store`."
  - "Body: chỉ đọc cho method khác GET, trần 4 MB kiểm hai lần (`content-length` trước khi đọc, độ dài thực sau khi đọc); body rỗng thì không gửi. Body đúng bằng 4 MB vẫn qua."
  - "BE trả 3xx (đã có `redirect: manual` từ `callBackend`) → 502 `Bff.InvalidUpstream`, cùng quy tắc với `/api/auth/*` ở 03-07. Plan ghi 'status nguyên' nhưng một 3xx đã bị lọc `location` là vô nghĩa với trình duyệt."
  - "Không tái dùng `forwardUpstream` của 03-07 vì nó là hàm riêng tư ở `auth-handlers.ts` và đóng gói theo nhu cầu route auth (envelope, phân loại 4xx/5xx); BFF cần chuyển nguyên 2xx nữa nên dựng response riêng, cùng quy tắc (chỉ giữ content-type)."

patterns-established:
  - "Route catch-all mỏng: `await context.params` rồi gọi hàm thuần; Next tự trả 405 cho verb không export (PATCH/OPTIONS), hàm thuần vẫn tự kiểm method để test được."
  - "Test traversal phải dùng dạng dính liền (`%2e%2e%2fauth`, `x%2e`) vì `new URL` gộp `/%2e%2e/` thành dot-segment trước khi tới handler; chuỗi thô của request thật chỉ còn dạng dính liền nên regex vẫn cần."

requirements-addressed: [AUTH-08, AUTH-02, AUTH-03]
# Chưa tick: chưa có UI dùng BFF end-to-end (03-09, 03-11..03-13); tick ở bước verify phase như 03-05..03-07.
requirements-completed: []

duration: ~15 min
completed: 2026-10-15
---

# Phase 3 Plan 8: BFF `/api/bff/[...path]` Summary

**BFF chuyển tiếp REST cùng origin tới BE: allowlist gốc `users|itineraries|chat` (`auth/*` và gốc lạ 404), chặn path traversal kể cả dạng mã hóa (400), Origin lạ 403, phiên stale/invalid 401 `session.expired` mà không gọi BE, Bearer do server gắn từ cookie, header đi/về theo allowlist, trần body 4 MB, timeout 504 / mạng 502; 72 test mới, `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 (cả hai TDD: RED rồi GREEN) + 1 commit fix sau khi tự rà soát
- **Files:** 4 (đều tạo mới, trùng `files_modified` của plan)

## Accomplishments

- **Task 1 (`resolveBffTarget`):** 29 test bảng `it.each`: 5 đường hợp lệ (gồm encode `a b` → `a%20b`), 7 gốc ngoài allowlist (`[]`, `auth/login`, `auth`, `Users`, `admin`, `api/v1/users`, `usersx`) → 404, 9 segment xấu + 6 chuỗi thô mã hóa (`%2e`, `%2E`, `%2f`, `%2F`, `%5c`, `%5C`) → 400, ca traversal ưu tiên 400 trước 404, và khóa hằng allowlist (3 gốc, 4 verb).
- **Task 2 (`forwardToBackend` + route):** 43 test. 405/404/400/403/401/413 đều khẳng định `fetch` 0 lần; Origin lạ cho cả GET lẫn POST; POST thiếu Origin + `sec-fetch-site: cross-site` → 403; GET thiếu Origin qua. Không cookie → không `authorization`; fresh → `Bearer <accessToken>`; client tự đặt `authorization` giả (có hoặc không cookie) không lọt tới BE. Header đi BE là tập con của `accept`/`content-type`/`authorization` (không `cookie`, `host`, `origin`, `x-forwarded-*`, `x-custom`, `user-agent`). URL upstream `http://be.test/api/v1/users/me?page=2`, query độc hại không đổi được origin. POST/PUT chuyển đúng bytes (tiếng Việt, multipart giữ boundary), body đúng 4 MB qua, thừa 1 byte hoặc `content-length` khai > 4 MB → 413. Response BE 200/201/400/404/500 nguyên status và body; 204 không body; `set-cookie`, `x-powered-by`, `location`, `server` của BE không lọt về; 3xx → 502; timeout (fake timers + `UPSTREAM_TIMEOUT_MS`) → 504; lỗi mạng → 502.
- Toàn repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` đều 8/8 task thành công; `@tripory/web` 37 file / 645 test.

## Task Commits

1. **Task 03-08-01: `resolveBffTarget` (TDD)**
   - RED `3bc61c7` `test(03-08): add failing tests for BFF target resolution`
   - GREEN `05de35c` `feat(03-08): add BFF allowlist and path traversal guard`
2. **Task 03-08-02: `forwardToBackend` + route (TDD)**
   - RED `1f74f53` `test(03-08): add failing tests for BFF forwarding`
   - GREEN `635b83b` `feat(03-08): add BFF forwardToBackend and catch-all route`
3. **Điều chỉnh sau rà soát:** `d92de0e` `fix(03-08): treat BE 3xx as invalid upstream in BFF`

## Files Created/Modified

- `apps/web/src/composition/server/bff.ts` — `BFF_ALLOWED_ROOTS`, `BFF_ALLOWED_METHODS`, `BFF_MAX_BODY_BYTES`, `resolveBffTarget`, `forwardToBackend` (và helper riêng tư `readBoundedBody`).
- `apps/web/src/composition/server/bff.resolve.test.ts` — 29 test.
- `apps/web/src/composition/server/bff.forward.test.ts` — 43 test.
- `apps/web/src/app/api/bff/[...path]/route.ts` — `GET POST PUT DELETE`, không `PATCH`, không `export const dynamic|runtime`.

## Decisions Made

Sáu quyết định ở `key-decisions`. Kiểu `context` của route dùng `{ params: Promise<{ path: string[] }> }` đúng docs Next 16.4 (`route.md`); không dùng helper `RouteContext` vì kiểu tường minh đủ và `typecheck` xanh.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BE 3xx được chuyển nguyên thành 3xx không có `location`**
- **Found during:** rà soát lại sau khi GREEN của Task 2 (đối chiếu với quy tắc 3xx → 502 ở 03-07).
- **Issue:** `callBackend` dùng `redirect: "manual"` nên 3xx của BE đến BFF; chuyển nguyên status nhưng bỏ `location` cho trình duyệt một response 302 vô nghĩa, và 304 vào nhánh không-body.
- **Fix:** status ngoài 2xx và 4xx/5xx → 502 `Bff.InvalidUpstream`; bỏ 304 khỏi tập null-body; test `it.each([301, 302, 304])`.
- **Files modified:** `bff.ts`, `bff.forward.test.ts`
- **Commit:** `d92de0e`

### Điều chỉnh nhỏ (không phải sửa lỗi)

- **Test traversal:** bản đầu dùng `/api/bff/users/%2e%2e/auth/login` làm đường dẫn request, nhưng `new URL` gộp `/%2e%2e/` thành dot-segment trước khi handler thấy nên pathname thực là `/api/bff/auth/login` (an toàn, nhưng không thử được regex). Đổi sang dạng dính liền `%2e%2e%2fauth` và `x%2e`. Ngưỡng stale trong test là 20 giây (bản đầu để 60 vì nhớ nhầm ngưỡng 150 của `REFRESH_IF_BELOW_SEC`; `STALE_AT_SEC` thật là 30).
- `packages/api-client/src/fetch-http-client.ts` (dấu cách đầu dòng 1) và `.planning/config.json` là thay đổi có sẵn trước plan, không stage; lint không báo lỗi nên không gỡ dấu cách.

### Bước workflow cố ý bỏ qua

**1. [Chủ đích] Không tick AUTH-08, AUTH-02, AUTH-03 trong `REQUIREMENTS.md`**
- **Lý do:** cùng cách làm của 03-05..03-07: plan này chỉ dựng phần server của BFF. Chưa có UI gọi BFF với phiên thật (03-09, 03-11..03-13) nên hành vi người dùng chưa chạy end-to-end. `requirements-completed` để rỗng; tick ở bước verify phase.

---

**Total deviations:** 1 bug tự sửa (Rule 1), 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `packages/config/eslint/boundaries.mjs`, không nới allowlist, không sửa package nào khác.

## Issues Encountered

- Một lần chạy `typecheck` đầu báo lỗi kiểu ở test (mảng cookie có union `rt?: undefined`); gán kiểu `Record<string, string>[]` tường minh thì hết.
- Cảnh báo Vite `configLoader: 'native'` khi chạy `vitest` ở `apps/web` có sẵn từ Phase 1.
- `token-guard.test.ts` của `ui-web` không timeout ở các lần chạy toàn repo này.

## Known Stubs

Không có.

## Threat Model Verification

- **T-03-35 (open proxy):** allowlist `users|itineraries|chat`; test `auth/login`, `auth`, `Users`, `admin`, `api/v1/users`, `usersx` → 404 và `fetch` 0 lần.
- **T-03-36 (traversal/SSRF):** regex thô `%2f|%5c|%2e` + kiểm từng segment + `encodeURIComponent`; `callBackend` còn khóa origin và `/api/v1/` (03-05). Test query độc hại không đổi origin upstream.
- **T-03-37 (CSRF qua BFF):** `checkSameOrigin` cho mọi method; test Origin lạ GET/POST và `cross-site` → 403, `fetch` 0 lần.
- **T-03-38 (rò header):** header đi dựng mới từ allowlist; response chỉ `content-type` + `cache-control`; test `set-cookie`, `x-powered-by`, `location`, `server` không lọt về.
- **T-03-39 (bypass auth):** stale/invalid → 401 không gọi BE; `authorization` chỉ do server gắn (test client gửi `authorization` giả, có và không cookie).
- **T-03-40 (DoS):** trần 4 MB (413, hai lớp kiểm), timeout 28 giây (504).
- **T-03-41 (cache trung gian):** `cache-control: no-store` trên mọi response (kể cả lỗi và 204); `callBackend` đã `cache: "no-store"`.

## Threat Flags

Không có bề mặt mới ngoài `threat_model` của plan. Ghi chú: trần body 4 MB ở BFF chỉ áp cho `/api/bff/*`; Threat Flag `unbounded-request-body` của 03-07 cho `/api/auth/*` vẫn còn mở.

## Verification

- `pnpm --filter @tripory/web test | lint | typecheck` — exit 0 (37 file, 645 test).
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh.
- Acceptance Task 1: `bff.ts` chứa `"users", "itineraries", "chat"` và regex `%2f|%5c|%2e`; test chứa `['auth','login']`, `['..']`, `%2e%2e`, `%2F`, `['Users','me']`, `['users','a b']`.
- Acceptance Task 2: `bff.ts` có `callBackend`, `checkSameOrigin`, `readSession`, `4 * 1024 * 1024`, `Bff.CrossOrigin`, `session.expired`; không `console.`, không copy `set-cookie`, không chuyển `cookie` của client; `route.ts` export đúng `GET, POST, PUT, DELETE`.

## User Setup Required

None. Chạy `pnpm dev` cần `API_ORIGIN` trong `apps/web/.env.local` như 03-07.

## Next Phase Readiness

- `bffHttp` (03-06) giờ có route thật để gọi: 401 `session.expired` từ BFF kích hoạt single-flight refresh rồi phát lại.
- 03-09 (`proxy.ts`, `viewer.server.ts`) không phụ thuộc plan này; gating bằng `proxy.ts` không thay được kiểm phiên của BFF (đã có ở đây).
- Ready for 03-09.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-15*

## Self-Check: PASSED

Đã kiểm 4 file nguồn/test/route tồn tại và 5 commit `3bc61c7`, `05de35c`, `1f74f53`, `635b83b`, `d92de0e` có trong git log.
