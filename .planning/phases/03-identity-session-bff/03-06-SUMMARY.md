---
phase: 03-identity-session-bff
plan: 06
subsystem: client-composition
tags: [web-locks, single-flight-refresh, broadcast-channel, session-events, tanstack-query, mutation-cache, toast, vitest, tdd]

requires:
  - phase: 03-identity-session-bff
    provides: "03-01: `makeFakeLockManager`/`makeFakeBroadcastChannelHub` (`apps/web/src/test`), catalog pin react-query 5.104.2; 03-04: `createHttpSessionGateway`, `createHttpProfileReader`, `createIdentityHooks`, `identityKeys`; Phase 2: `withSessionRefresh`, `DEFAULT_SESSION_LOCK_NAME`, `lib/feedback` (`decideMutationSuccess/Error`)"
provides:
  - "`apps/web/src/composition/http.client.ts`: `makeBrowserHttp(deps)` trả `{ authHttp, bffHttp, refreshSession, lock }`; singleton export `authHttp`, `bffHttp`, `refreshSession`; kiểu `LockManagerLike`, `BrowserHttpDeps`, `BrowserHttp`. Nơi DUY NHẤT trong app có chuỗi đường dẫn route refresh"
  - "`apps/web/src/composition/session-events.client.ts`: `makeSessionEvents`, singleton `sessionEvents` (`emitExpired`, `rearmExpired`, `on`, `announce`, `registerLogoutHandler`, `runLogoutHandlers`, `dispose`), kiểu `BroadcastChannelLike`, `SessionEventName`, `SessionAnnouncement`"
  - "`apps/web/src/composition/query-client.ts`: `makeQueryClient()` (`retry: false`, `staleTime` 60 giây, `MutationCache` nối `decideMutationSuccess/Error` vào `notify`) và khai báo `Register` (`mutationMeta.feedback`, `defaultError`)"
  - "`apps/web/src/composition/identity.client.ts`: `identity` = `createIdentityHooks` đã lắp gateway (`authHttp`) và profile reader (`bffHttp`)"
  - "`apps/web/src/lib/feedback/error-messages.ts`: `SESSION_EXPIRED_TOAST` (D-20), đi ra qua barrel `@/lib/feedback`"
affects: [03-07, 03-11, 03-12, 03-13, phase-04, phase-07]

tech-stack:
  added: []
  patterns: [pure-factory-plus-singleton, injected-lock-manager, abort-before-grant-to-timeout, lazy-broadcast-channel, entry-per-registration-handlers, mutation-cache-toast-policy]

key-files:
  created:
    - apps/web/src/composition/http.client.ts
    - apps/web/src/composition/http.client.test.ts
    - apps/web/src/composition/session-events.client.ts
    - apps/web/src/composition/session-events.client.test.ts
    - apps/web/src/composition/query-client.ts
    - apps/web/src/composition/query-client.test.ts
    - apps/web/src/composition/identity.client.ts
    - apps/web/src/lib/feedback/error-messages.test.ts
  modified:
    - apps/web/src/lib/feedback/error-messages.ts
    - apps/web/src/lib/feedback/mutation-feedback.ts

key-decisions:
  - "`refreshSession()` chỉ trả `'refreshed' | 'expired'` hoặc ném lỗi tạm thời, KHÔNG tự gọi `onSessionExpired`; caller (SessionKeeper, SessionRecovery ở 03-11) phát `sessionEvents.emitExpired()`, vốn đã chống lặp. `withSessionRefresh` vẫn gọi `onSessionExpired` cho các request 401."
  - "Hết hạn xin khóa đổi AbortError thành `ApiError` `kind: 'timeout'` chỉ khi khóa CHƯA được cấp (cờ `granted`); lỗi của chính tác vụ refresh trong khóa lan nguyên (503 vẫn là 503) và không bao giờ phát `expired`."
  - "Mutex dự phòng khi không có `navigator.locks` nằm trong closure của từng `makeBrowserHttp`, không ở module scope: test dựng nhiều 'tab' độc lập; chỉ chặn được trong một tab, chấp nhận vì thiếu `navigator.locks` chỉ xảy ra ở dev qua http://IP-LAN."
  - "`sessionEvents`: `'expired'` không đi qua channel (cookie bị xóa nên tab nào cũng tự thấy ở request kế tiếp); channel tạo lazy ở `on()`/`announce()` đầu tiên và `createChannel` chỉ được hỏi một lần kể cả khi trả `null`; `dispose()` đóng channel và gỡ listener nhưng giữ handler đăng xuất."
  - "`makeQueryClient()` luôn trả client mới và `QueryCache` cố ý không có toast (D-10); callback `MutationCache` theo chữ ký 5.104.2 `(data, variables, onMutateResult, mutation, context)`, đọc `mutation.meta?.feedback`."

patterns-established:
  - "Module browser global đi theo cặp `makeX(deps)` thuần (test tiêm fake) + một singleton ở cuối file, kèm comment lý do singleton."
  - "Test hai 'tab' bằng hai `makeBrowserHttp` dùng chung một `makeFakeLockManager()` và một cookie jar giả; fake route refresh chỉ tăng `beCalls` khi cookie còn cũ, nên `beCalls === 1` chứng minh route idempotent + khóa."
  - "Gate request bằng deferred (`bffGate`, `refreshGate`) chốt trạng thái cookie lúc gửi, để mô phỏng chính xác 401 muộn của request bay trước lượt refresh."

requirements-addressed: [AUTH-03, AUTH-04, AUTH-01, AUTH-02, FND-05]
# Plan này chỉ dựng phần lắp ráp client. Chưa có route `/api/auth/*` (03-07), chưa có Providers/Toast/SessionEffects (03-11)
# nên chưa tick AUTH-01..04 (xem "Bước workflow cố ý bỏ qua"). FND-05 đã Complete từ Phase 2, giữ nguyên.
requirements-completed: []

duration: ~35 min (ước tính; lượt chạy đầu bị gián đoạn nên đồng hồ không phản ánh thời gian làm việc)
completed: 2026-10-15
---

# Phase 3 Plan 6: Composition client (Web Locks, sự kiện phiên, QueryClient) Summary

**Mọi lần refresh phía browser đi qua một khóa Web Locks và một route idempotent (5 request 401 + 1 refresh chủ động + hai tab chỉ gọi BE đúng 1 lần, kiểm bằng fake lock và cookie jar dùng chung), hết hạn xin khóa 40 giây chỉ là lỗi tạm thời, `sessionEvents` đồng bộ tab bằng `BroadcastChannel('tripory-session')` và có chỗ móc đăng xuất cho Phase 7, `makeQueryClient()` nối chính sách toast Phase 2 vào `MutationCache`; `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** ~35 min hoạt động (ước tính). Commit đầu 2026-10-14T23:02+07:00; lượt chạy đầu bị gián đoạn rồi chạy tiếp ngày 2026-10-15.
- **Tasks:** 3 (cả ba TDD: RED rồi GREEN, không cần REFACTOR). Thứ tự thực hiện 2 → 1 → 3 vì `http.client.ts` import `session-events.client.ts` (plan cho phép).
- **Files:** 10 (8 tạo mới, 2 sửa), trùng danh sách `files_modified` của plan.

## Accomplishments

- **Task 2 (`session-events.client.ts`):** `emitExpired()` gọi listener đúng một lần dù gọi 3 lần, `rearmExpired()` cho phát lại (Pitfall 10). `announce('logged-out' | 'logged-in')` đẩy `{ type }` lên channel; tab khác nhận `remote-logged-out` / `remote-logged-in`, tab phát không nhận lại. Message lạ (`{ type: 'x' }`, `{ type: 'expired' }`, chuỗi, `null`, số, `type` không phải chuỗi) bị bỏ. `createChannel` trả `null` thì mọi hàm vẫn chạy, `announce` là no-op. Channel tạo lazy; singleton có guard `typeof window` vì Node 24 có `BroadcastChannel` toàn cục. `runLogoutHandlers` dùng `Promise.allSettled` bọc `Promise.resolve().then(fn)` nên handler ném đồng bộ hay reject đều không chặn handler khác.
- **Task 1 (`http.client.ts`):** `makeBrowserHttp` dựng `authRawHttp` (chỉ để gọi route refresh, không bọc), `authHttp` (`/api/auth`) và `bffHttp` (`/api/bff`) bọc `withSessionRefresh` cùng một `lock`. `callRefreshRoute` luôn hỏi route, không bỏ qua theo đồng hồ máy; chỉ 401 mới thành `'expired'`, 503/mạng/timeout ném lên (D-14a). `refreshSession = () => (inFlight ??= lock(DEFAULT_SESSION_LOCK_NAME, callRefreshRoute).finally(...))`. Xin khóa quá `lockWaitMs` (mặc định `40_000`) thì reject `ApiError` `kind: 'timeout'`, không lọt `DOMException`, không phát `expired`. Singleton bọc `fetch` bằng arrow và đọc `navigator.locks` có guard.
- **Task 3 (`query-client.ts`, `identity.client.ts`, `SESSION_EXPIRED_TOAST`):** `makeQueryClient()` có `retry: false` cho query và mutation, `staleTime: 60_000`, `MutationCache` gọi `decideMutationSuccess/Error(mutation.meta?.feedback)` rồi `notify[variant](message)`; `Register` khai `mutationMeta` và `defaultError: ApiError | Error`. `identity` lắp `createHttpSessionGateway(authHttp)` và `createHttpProfileReader(bffHttp)`. `SESSION_EXPIRED_TOAST` = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" (không dấu chấm), `SESSION_EXPIRED_MESSAGE` và 39 khóa của `ERROR_MESSAGES` giữ nguyên. Khối comment sketch trong `mutation-feedback.ts` thay bằng một dòng tham chiếu `composition/query-client.ts` (giữ comment D-10, D-12).
- **Kiểm chứng độ nhạy của test:** thay `lock` của hai client bọc bằng hàm chạy thẳng, 2/19 test `http.client` đỏ (ca 5×401 + refresh chủ động, cả hai biến thể khóa). Đã hoàn nguyên.
- 61 test mới cho `@tripory/web` (24 + 19 + 13 + 5); toàn repo: `@tripory/web` 32 file / 449 test, `@tripory/identity` 244, `@tripory/api-client` 95, `@tripory/ui-web` 180, `@tripory/config` 104, `@tripory/shared-kernel` 32, `@tripory/design-tokens` 9.

## Task Commits

1. **Task 03-06-02: `session-events.client.ts` (TDD)**
   - RED `a0a440f` `test(03-06): add failing tests for session events, tab sync and logout hooks`
   - GREEN `60c9a64` `feat(03-06): add session events with tab sync and logout hooks`
2. **Task 03-06-01: `http.client.ts` (TDD)**
   - RED `945b7db` `test(03-06): add failing tests for browser http client and single refresh path`
   - GREEN `12a6f06` `feat(03-06): add browser http client with Web Locks and a single refresh path`
3. **Task 03-06-03: `query-client.ts`, `identity.client.ts`, `SESSION_EXPIRED_TOAST` (TDD)**
   - RED `5570653` `test(03-06): add failing tests for query client toast wiring and session expired copy`
   - GREEN `75e074f` `feat(03-06): wire query client toasts, identity hooks and session-expired copy`

Không cần commit REFACTOR.

## Files Created/Modified

- `apps/web/src/composition/http.client.ts` (+ test) — HTTP browser, khóa, `refreshSession`.
- `apps/web/src/composition/session-events.client.ts` (+ test) — sự kiện phiên, đồng bộ tab, chỗ móc đăng xuất.
- `apps/web/src/composition/query-client.ts` (+ test) — `makeQueryClient`, `Register`.
- `apps/web/src/composition/identity.client.ts` — hook identity đã lắp (không có test riêng, typecheck và import chain khóa kiểu).
- `apps/web/src/lib/feedback/error-messages.ts` (+ `error-messages.test.ts` mới) — thêm `SESSION_EXPIRED_TOAST`.
- `apps/web/src/lib/feedback/mutation-feedback.ts` — thay khối comment sketch bằng tham chiếu.

## Decisions Made

- Năm quyết định ở `key-decisions` ở trên; còn lại theo đúng `<action>` của plan.
- **Hợp đồng cho 03-11** (khóa bằng test): `sessionEvents.on(event, listener)` trả hàm gỡ; `SessionKeeper`/`SessionRecovery` nhận `'expired'` từ `refreshSession()` thì phải tự gọi `sessionEvents.emitExpired()`; sau khi đăng nhập lại gọi `rearmExpired()`; `runLogoutHandlers()` luôn resolve; `makeQueryClient()` gọi một lần trong `useState` của `Providers`.
- **Hợp đồng cho 03-12:** mutation form đặt `meta: { feedback: { errorToast: false } }` (kiểu đã có nhờ `Register`); `identity.useLogin(options)` nhận `meta` qua `options`.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Điều chỉnh nhỏ (không phải sửa lỗi)

- **Quote trong `http.client.ts`:** file dùng nháy kép như phần còn lại của `apps/web`, riêng `kind: 'timeout'` giữ nháy đơn để khớp đúng chuỗi acceptance của plan (`Select-String ... "kind: 'timeout'"`); acceptance còn lại của file cũng yêu cầu `"/refresh"` nháy kép. ESLint không có luật quote nên không đỏ.
- **Test thêm ngoài danh sách hành vi của plan:** `lockWaitMs` tùy chỉnh, lỗi của tác vụ trong khóa không bị đổi thành `timeout`, lần xin khóa kế tiếp sau hết hạn vẫn hoạt động, `authHttp` mặc định vẫn refresh rồi phát lại, `authHttp` và `bffHttp` dùng chung một khóa. Không đổi code ngoài phạm vi.

### Bước workflow cố ý bỏ qua

**1. [Chủ đích] Không tick checkbox AUTH-01..AUTH-04 trong `REQUIREMENTS.md`**
- **Bước:** `requirements mark-complete AUTH-03 AUTH-04 AUTH-01 AUTH-02 FND-05`
- **Lý do:** Cùng cách làm của 03-01 và 03-05. Plan này chỉ lắp phía client: route `/api/auth/*` (03-07), BFF (03-08), `Providers`/`Toast`/`SessionEffects`/`SessionKeeper` (03-11) và form (03-12) chưa có, nên đăng ký, đăng nhập, giữ phiên, đăng xuất chưa chạy end-to-end. Tick bây giờ sẽ sai sự thật. `requirements-completed` để rỗng. FND-05 đã `[x]` Complete từ Phase 2 (lệnh sẽ không đổi gì).
- **Ghi chú phạm vi:** việc mount `<Toast />` và `QueryClientProvider` nằm ở plan 03-11 (`Providers` + `layout.tsx`), không thuộc `files_modified` của 03-06. Plan này chỉ làm phần `makeQueryClient()` + `MutationCache` + hằng toast, đã khóa bằng test với `notify` được mock.

---

**Total deviations:** 0 sửa lỗi, 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `packages/config/eslint/boundaries.mjs`, không nới allowlist, không sửa `packages/api-client`.

## Issues Encountered

- Lượt chạy đầu bị gián đoạn đúng lúc chạy `pnpm lint` và `pnpm typecheck` song song (exit code lạ, không có output). Chạy lại tuần tự thì xanh; RED/GREEN của Task 2 đã commit trước đó.
- Lúc kiểm độ nhạy bằng cách sửa tạm `http.client.ts` bằng PowerShell, đã đối chiếu lại nội dung file sau khi hoàn nguyên (tiếng Việt nguyên vẹn, không còn đoạn sửa tạm) trước khi commit.
- `.planning/config.json` (khóa của gsd tooling) và `packages/api-client/src/fetch-http-client.ts` (dấu cách đầu dòng 1) là thay đổi có sẵn trước plan, không thuộc plan này nên không stage. `pnpm lint` và `typecheck` vẫn xanh với dấu cách đó nên không gỡ.
- Cảnh báo Vite `configLoader: 'native'` khi chạy `vitest` ở `apps/web` có sẵn từ Phase 1, không ảnh hưởng kết quả.
- `token-guard.test.ts` của `ui-web` (flake nhạy tải đã ghi trong `deferred-items.md`) không timeout ở lần chạy toàn repo này.

## Known Stubs

Không có. Cả bốn module đều chạy thật và có test (riêng `identity.client.ts` chỉ lắp factory, kiểu được khóa bằng typecheck); chưa có UI nào dùng chúng (việc của 03-11, 03-12, 03-13), nhưng không có dữ liệu giả nối vào UI.

## Threat Model Verification

- **T-03-21 (reuse / race refresh):** mọi lời gọi refresh đi qua `lock` + route idempotent; `Select-String '"/refresh"'` trong `http.client.ts` = đúng 1 kết quả và toàn `apps/web/src` (trừ test) chỉ có file này. Test `beCalls === 1` cho: 5×401 + refresh chủ động (cả Web Locks lẫn mutex trong tab), hai tab đồng thời (tab B chờ, `refreshCalls` vẫn là 1 cho tới khi tab A xong), tab B ngay sau tab A, và `authHttp` + `bffHttp` đồng thời.
- **T-03-22 (tab giữ khóa treo mọi tab):** khóa bị giữ vô hạn, `advanceTimersByTimeAsync(39_999)` còn pending, thêm 1 ms thì reject `kind: 'timeout'`; fetch gọi 0 lần.
- **T-03-23 (đăng xuất oan):** route 503 và lỗi mạng: `onSessionExpired` 0 lần, cookie giữ, lần 401 kế tiếp refresh lại được (`beCalls === 1`); route 401 với 5 request song song: `onSessionExpired` đúng 1 lần và `refreshCalls === 1` (không đệ quy).
- **T-03-24 (message giả qua BroadcastChannel):** chấp nhận; chỉ `logged-in`/`logged-out` được xử lý, 6 dạng message lạ bị bỏ (có test), hành động là điều hướng, không mang dữ liệu.
- **T-03-25 (cache rò giữa tài khoản):** `makeQueryClient()` luôn trả client mới (có test `not.toBe`); việc `queryClient.clear()` khi đổi phiên thuộc `useSessionActions`/`SessionEffects` ở 03-11. Chưa có QueryClient dùng chung phía server.
- **T-03-26 (toast lộ chi tiết kỹ thuật):** chấp nhận; test `TypeError("x is not a function")` ra câu chung `GENERIC_ERROR_MESSAGE`.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan. Không log token hay mật khẩu (`Select-String 'console\.'` trên các file mới = 0).

## Verification

- `pnpm --filter @tripory/web test | lint | typecheck` — exit 0 (32 file, 449 test).
- Acceptance Task 1: `"/refresh"` đúng 1 kết quả trong `http.client.ts` và duy nhất file này trong `apps/web/src` (trừ test); có `inFlight ??=`, `DEFAULT_SESSION_LOCK_NAME`, `40_000`, `kind: 'timeout'`, `navigator.locks`; không import từ `test/`.
- Acceptance Task 2: có `tripory-session`, `Promise.allSettled`, `registerLogoutHandler`, `typeof window`; không import `react`; test có đủ ca chống lặp `expired`, không về chính tab phát, message lạ, `createChannel` trả `null`, handler ném lỗi, channel lazy.
- Acceptance Task 3: `query-client.ts` có `retry: false`, `MutationCache`, `decideMutationSuccess`, `decideMutationError`, `mutationMeta`; `error-messages.ts` có `SESSION_EXPIRED_TOAST` đúng câu D-20 và còn nguyên `SESSION_EXPIRED_MESSAGE`; `identity.client.ts` có `createIdentityHooks`, `createHttpSessionGateway`, `createHttpProfileReader`.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh.

## User Setup Required

None.

## Next Phase Readiness

- 03-07 (route auth): route `POST /api/auth/refresh` phải no-op (200 `{ refreshed: false }`, không gọi BE) khi access token còn hơn 150 giây và trả 401 `session.expired` khi hết phiên; client ở đây dựa vào đúng hai hành vi này.
- 03-11 (vòng đời phiên UI): dùng `refreshSession`, `sessionEvents`, `makeQueryClient`, `SESSION_EXPIRED_TOAST`; `Providers` mount `<Toast />` và `QueryClientProvider`.
- 03-12 (form): dùng `identity` từ `identity.client.ts`.
- Ready for 03-07.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-15*

## Self-Check: PASSED

Đã kiểm 10 file nguồn/test tồn tại và 6 commit `a0a440f`, `60c9a64`, `945b7db`, `12a6f06`, `5570653`, `75e074f` có trong git log; acceptance criteria của cả ba task và `<verification>` của plan chạy lại đều PASS.
