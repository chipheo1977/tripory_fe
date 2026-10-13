---
phase: 02-http-shared-kernel
plan: 02
subsystem: api-client
tags: [api-client, http, fetch, api-error, problem-details, timeout, abort-controller, vitest, fake-timers, tdd]

requires: []
provides:
  - "Hợp đồng `HttpMethod`, `QueryValue`, `HttpRequest`, `HttpClient` (chỉ type) trong `@tripory/api-client`"
  - "`ApiError` plain object frozen, `ApiErrorKind`, `FieldErrors`, `makeApiError`, `isApiError`, `SESSION_EXPIRED`, `sessionExpiredError` trong `@tripory/api-client`"
  - "`toApiError(status, body)` + `normalizeFieldKey` thuần (nội bộ), type guard viết tay `isApiEnvelope`/`isProblemDetails`/`isValidationProblemDetails`/`readBody`"
  - "Fixture body thật của BE cho 6 dạng phản hồi (`src/fixtures/be-responses.ts`, không export)"
  - "`createFetchHttpClient(deps)`, `DEFAULT_TIMEOUT_MS = 30_000`, `FetchHttpClientDeps` qua subpath `@tripory/api-client/http`"
affects: [02-03, 02-04, phase-03-identity, phase-07-voice]

tech-stack:
  added: []
  patterns: [plain-object-error-with-type-tag, hand-written-type-guard, fixture-real-be-body, abort-controller-timeout-flag, bare-fetch-call, subpath-http-for-composition]

key-files:
  created:
    - packages/api-client/src/http-client.ts
    - packages/api-client/src/api-error.ts
    - packages/api-client/src/api-error.test.ts
    - packages/api-client/src/response-shapes.ts
    - packages/api-client/src/to-api-error.ts
    - packages/api-client/src/to-api-error.test.ts
    - packages/api-client/src/fixtures/be-responses.ts
    - packages/api-client/src/fetch-http-client.ts
    - packages/api-client/src/fetch-http-client.test.ts
    - packages/api-client/src/http.ts
    - packages/api-client/src/exports.test.ts
  modified:
    - packages/api-client/src/index.ts
    - packages/api-client/package.json

key-decisions:
  - "`ApiError` là plain object frozen có dấu `type: 'ApiError'`, `kind` thuộc tập 6 giá trị; chỉ chép `type, kind, status, code, message, fieldErrors`, không bao giờ giữ raw body/header/token."
  - "Envelope giữ nguyên `errorCode`/`message` BE (chuỗi rỗng/khoảng trắng → `null`); ValidationProblemDetails → `message: null` + `fieldErrors` key camelCase, gộp key trùng; mọi body khác → `code/message: null`."
  - "Timeout 30 giây bằng `AbortController` + `setTimeout` + cờ `timedOut`, bao cả `response.text()`; không retry; header dựng bằng `Headers` nên `request.headers` ghi đè không phân biệt hoa thường."
  - "`toApiError`, `readBody`, type guard và fixture giữ nội bộ; entry `.` chỉ có type + helper `ApiError`, factory client chỉ ở `./http`."

patterns-established:
  - "Test chuẩn hóa lỗi: mảng case `{ name, fixture, expected }` + `it.each(cases)('$name', ...)`, feed body qua `readBody` như client thật."
  - "Test timeout: fake fetch chỉ reject khi `init.signal` abort, gắn `.then/.catch` trước `vi.advanceTimersByTimeAsync`, kiểm `vi.getTimerCount() === 0` sau request."
  - "Fake fetch dạng `function` ném `Illegal invocation` khi `this !== undefined` để khóa cách gọi hàm trần."

requirements-completed: []

duration: 16 min
completed: 2026-10-12
---

# Phase 2 Plan 2: api-client core (HttpClient, ApiError, fetch client) Summary

**`@tripory/api-client` có hợp đồng `HttpClient`, `ApiError` plain object, `toApiError` chuẩn hóa cả 6 dạng phản hồi BE bằng type guard viết tay và fixture body thật, cùng `createFetchHttpClient` timeout 30 giây bao cả phần đọc body, không retry, tách ở subpath `./http`; 75 test, lint `httpPackage()` xanh**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-10-12T10:11:00Z
- **Completed:** 2026-10-12T10:27:00Z
- **Tasks:** 3 (TDD, mỗi task một cặp commit RED/GREEN)
- **Files:** 13 (11 tạo mới, 2 sửa)

## Accomplishments

- `http-client.ts`: chỉ type `HttpMethod`, `QueryValue`, `HttpRequest` (có `signal`, `timeoutMs`, `sessionRefresh`), `HttpClient`.
- `api-error.ts`: `makeApiError` trả object `Object.freeze`, không có key `fieldErrors` khi không truyền; `isApiError` kiểm `type` và `kind` qua `ReadonlySet`; `sessionExpiredError()` = `{ kind: 'session_expired', status: 401, code: 'session.expired', message: null }`.
- `response-shapes.ts`: `isRecord`, `isApiEnvelope` (khóa `status` là chuỗi `'success'|'error'`), `isProblemDetails` (`status` là số hoặc vắng), `isValidationProblemDetails` (mọi value của `errors` là mảng chuỗi), `readBody` không bao giờ ném.
- `to-api-error.ts`: envelope 1a/1b/1c/401 giữ `errorCode` + message tiếng Việt của BE, FluentValidation không có `fieldErrors` (D-05a); `Email`→`email`, `$.startDate`→`startDate`, `Items[0].Name`→`items[0].name`, `$`/`""`→`""`; `{Email, $.email}` gộp thành `email: ['a','b']`; ProblemDetails 415, body rỗng 401/403/404/405, HTML 502, JSON hỏng → `code/message: null`.
- `fixtures/be-responses.ts`: 18 fixture theo bảng "Hình dạng lỗi BE" của RESEARCH, kể cả `envelopeSuccess`, `envelopeCreated`, `refreshSuccess` (chứa `fake-refresh`).
- `fetch-http-client.ts`: `Accept: application/json` luôn có; plain object → JSON + `Content-Type: application/json`; `FormData` giữ nguyên, không đặt `Content-Type`; URL bỏ `/` thừa, query bỏ `null`/`undefined`; `getHeaders` chạy trước timer, ngoài `try`; 2xx rỗng → `undefined`, envelope success → `data`, sai dạng → `kind: 'parse'`; non-2xx → `toApiError`; `timeout`/`aborted`/`network` phân biệt bằng cờ `timedOut` và `request.signal.aborted`.
- `index.ts` thay `export {}` bằng type + helper `ApiError`; `http.ts` export `createFetchHttpClient`, `DEFAULT_TIMEOUT_MS`, `FetchHttpClientDeps`; `package.json` thêm `"./http"` và đổi `"test"` thành `"vitest run"`.

## Task Commits

1. **Task 02-02-01: Hợp đồng HttpClient và ApiError plain object**
   - RED `0eb6799` `test(02-02): add failing test for ApiError plain object`
   - GREEN `ccfc526` `feat(02-02): implement HttpClient contract and ApiError plain object`
2. **Task 02-02-02: Type guard body BE, toApiError thuần và fixture thật**
   - RED `7803bdc` `test(02-02): add failing test for toApiError with real BE fixtures`
   - GREEN `c6421d3` `feat(02-02): implement toApiError with hand-written BE body guards`
3. **Task 02-02-03: createFetchHttpClient có timeout, barrel `.` và `./http`**
   - RED `664be7d` `test(02-02): add failing test for fetch client timeout and barrels`
   - GREEN `7162373` `feat(02-02): implement createFetchHttpClient with 30s timeout and ./http subpath`

Không cần commit REFACTOR.

## Files Created/Modified

- `packages/api-client/src/http-client.ts` — hợp đồng type, không có code chạy.
- `packages/api-client/src/api-error.ts` — `ApiError` và helper, comment lý do không dùng lớp và không giữ raw body.
- `packages/api-client/src/api-error.test.ts` — 11 test: thứ tự key, frozen, `fieldErrors` tùy chọn, 7 ca `isApiError` sai, `sessionExpiredError`.
- `packages/api-client/src/response-shapes.ts` — type guard viết tay và `readBody`.
- `packages/api-client/src/to-api-error.ts` — `toApiError`, `normalizeFieldKey`, `normalizeFieldErrors` nội bộ.
- `packages/api-client/src/to-api-error.test.ts` — 34 test: 15 ca fixture, envelope rỗng, 6 body lạ, ca bảo mật `fake-refresh`, 6 ca `normalizeFieldKey`, 5 ca `readBody`.
- `packages/api-client/src/fixtures/be-responses.ts` — body thật của BE, không import `vitest`, không export ra barrel.
- `packages/api-client/src/fetch-http-client.ts` — client `fetch` có timeout.
- `packages/api-client/src/fetch-http-client.test.ts` — 26 test: thành công/parse, lỗi HTTP, không retry, dựng request, hàm trần, timeout (mặc định, deps, request, khi đọc body), dọn timer, caller abort.
- `packages/api-client/src/http.ts` — subpath cho composition.
- `packages/api-client/src/exports.test.ts` — 4 test khóa entry `.` không có factory/helper nội bộ, `./http` có factory.
- `packages/api-client/src/index.ts` — barrel công khai.
- `packages/api-client/package.json` — `exports["./http"]`, bỏ `--passWithNoTests`; `dependencies` giữ nguyên.

## Decisions Made

- Theo `<interfaces>` của plan: tên type và helper giữ đúng để 02-03 (`withSessionRefresh`) và 02-04 (chọn message) dùng.
- Header dựng bằng `new Headers(...)` + `set`, nên `request.headers` ghi đè header cùng tên kể cả khác hoa thường (`X-Trace` vs `x-trace`, có test).
- Comment tiếng Việt ghi lý do: plain object để serialize qua ranh giới server/client; message ProblemDetails là tiếng Anh của framework nên `null`; không dùng `AbortSignal` tĩnh `any()` (Safari/iOS ≥ 17.4) hay `timeout()` (fake timers không điều khiển được); gọi `fetch` như hàm trần để tránh "Illegal invocation"; không tự thử lại (D-12).
- `packages/api-client/src` không có chuỗi copy tiếng Việt dành cho người dùng; chuỗi tiếng Việt chỉ nằm trong fixture (message BE) và tên test.

## Deviations from Plan

None - plan executed exactly as written.

Ghi chú nhỏ (không phải deviation):
- Comment ban đầu chứa các từ `class`, `zod`, `retry` làm grep acceptance criteria khớp nhầm; đã viết lại comment ("không khai báo lớp", "thư viện schema", "không tự thử lại") trước khi commit GREEN, nội dung giữ nguyên ý.
- Fixture có thêm `emptyMethodNotAllowed` (405) vì RESEARCH liệt kê 405 trong dạng body rỗng; message của `envelopeNotFound`/`envelopeUnauthorized` là câu tiếng Việt minh họa do plan không ghi nguyên văn.
- Test thêm ca dọn timer sau request lỗi và ca `deps.timeoutMs` riêng; ca hàm trần được kiểm bằng mutation tạm (đổi sang `deps.fetch(...)` thì test đỏ), đã hoàn lại trước commit.

## Issues Encountered

- `tsc` báo `Property 'errors' does not exist` khi `isProblemDetails` thu hẹp kiểu trước `isRecord`; sửa bằng cách kiểm `isRecord` trước rồi đọc `errors` qua `'errors' in value`. Không phải deviation (lỗi trong lúc GREEN của chính task).
- Không gọi `requirements mark-complete FND-05`: như 02-01, FND-05 (toast/message lỗi) chỉ giao xong ở 02-04, nên `requirements-completed` để trống.

## Known Stubs

None.

## Threat Model Verification

- **T-02-04 (Information Disclosure, `makeApiError`/`toApiError`):** chỉ chép field đã biết; test body có `refreshToken: 'fake-refresh'` không xuất hiện trong `JSON.stringify(result)`, `Object.keys` nằm trong tập cho phép.
- **T-02-05 (Information Disclosure, ProblemDetails/HTML):** `message: null` cho ProblemDetails, rỗng, HTML, JSON hỏng (có test từng dạng).
- **T-02-06 (Tampering, `response-shapes.ts`/`readBody`):** guard kiểm từng field, `JSON.parse` trong `try`; 6 body lạ (chuỗi, số, mảng, record lạ, `status` sai, `errors` không phải mảng chuỗi) rơi về `code/message: null`, không ném.
- **T-02-07 (DoS, `createFetchHttpClient`):** timeout bao `response.text()` (test body treo → `timeout` ở 30 000 ms), `clearTimeout` trong `finally`, `getTimerCount() === 0` sau thành công và lỗi.
- **T-02-08 (token phía client):** lint `httpPackage()` xanh; grep `localStorage|navigator\.|from 'node:|from 'zod'` trên `src` không có kết quả.
- **T-02-09 (EoP, UI tự dựng client):** `createFetchHttpClient` chỉ ở `./http`; `exports.test.ts` khóa entry `.` không có factory.
- Không thêm endpoint, auth path hay truy cập file mới.

## Verification

- `pnpm --filter @tripory/api-client test` — PASS, 4 file, 75 test.
- `pnpm --filter @tripory/api-client lint` — PASS.
- `pnpm --filter @tripory/api-client typecheck` — PASS.
- `Select-String` `\bclass\b` (api-error.ts), `zod` (src), `vitest` (fixture), `AbortSignal\.(any|timeout)|localStorage|navigator|window\.|retry` (fetch-http-client.ts), `createFetchHttpClient` (index.ts), `passWithNoTests` (package.json) — không có kết quả.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 7/7 task thành công mỗi lệnh.

## User Setup Required

None.

## Next Phase Readiness

- 02-03 bọc `HttpClient` bằng `withSessionRefresh`, dùng `sessionExpiredError`, `SESSION_EXPIRED`, `HttpRequest.sessionRefresh`.
- 02-04 đọc `ApiError.code`/`message`/`fieldErrors` để chọn message.
- Ready for 02-03.

---
*Phase: 02-http-shared-kernel*
*Completed: 2026-10-12*

## Self-Check: PASSED

Đã kiểm 12 file nguồn/test/fixture tồn tại và 6 commit `0eb6799`, `ccfc526`, `7803bdc`, `c6421d3`, `664be7d`, `7162373` có trong git log; acceptance criteria của cả ba task và `<verification>` của plan chạy lại đều PASS.
