---
phase: 02-http-shared-kernel
plan: 03
subsystem: api-client
tags: [api-client, session-refresh, single-flight, epoch, lock, decorator, vitest, tdd]

requires:
  - phase: 02-http-shared-kernel
    provides: "`HttpClient`, `HttpRequest.sessionRefresh`, `isApiError`, `makeApiError`, `sessionExpiredError` (plan 02-02)"
provides:
  - "`withSessionRefresh(inner, deps)` + `DEFAULT_SESSION_LOCK_NAME = 'tripory-session-refresh'` qua subpath `@tripory/api-client/http`"
  - "Type `Lock`, `RefreshOutcome`, `SessionRefreshDeps` qua entry gốc `@tripory/api-client` (chỉ type) cho Phase 3 cài"
affects: [02-04, phase-03-identity]

tech-stack:
  added: []
  patterns: [http-client-decorator, single-flight-promise-in-closure, refresh-epoch-counter, injected-lock, replay-once]

key-files:
  created:
    - packages/api-client/src/with-session-refresh.ts
    - packages/api-client/src/with-session-refresh.test.ts
  modified:
    - packages/api-client/src/index.ts
    - packages/api-client/src/http.ts
    - packages/api-client/src/exports.test.ts

key-decisions:
  - "Single-flight bằng `inFlight ??= deps.lock(name, deps.refresh).then(...).finally(() => inFlight = null)`; `epoch` tăng khi `'refreshed'`, request chỉ refresh khi `epoch === sentAt`, ngược lại chỉ phát lại (chặn 401 đến muộn gây reuse detection)."
  - "State `epoch`/`inFlight` nằm trong closure của `withSessionRefresh`, không ở module scope."
  - "D-14a: chỉ `'expired'` gọi `onSessionExpired` (một lần cho cả lô, trong `.then` của promise chung) và trả `session.expired`; refresh/lock throw thì lỗi gốc lan nguyên tới mọi request chờ, `inFlight` reset để lần 401 sau refresh lại."
  - "Phát lại đúng một lần; phát lại vẫn 401 → `session.expired` và không gọi `onSessionExpired` (refresh đã thành công, theo RESEARCH Pattern 4); caller abort trong lúc chờ refresh → `kind: 'aborted'`, không phát lại."
  - "`withSessionRefresh` chỉ phơi qua `./http` (composition); entry `.` chỉ có type."

patterns-established:
  - "Test concurrency không dùng fake timers: helper `deferred<T>()` cục bộ treo refresh, `vi.waitFor(...)` chờ mọi request tới điểm 401 rồi mới resolve/reject deferred."
  - "Fake lock `vi.fn((name, task) => task())` ép về `Lock`; fake inner đếm lượt theo `path` (lượt 1 → 401, lượt 2 → `{ ok: path }`)."
  - "Khẳng định nhiều promise reject cùng lúc bằng `Promise.all(results.map((r) => expect(r).rejects...))` để không có rejection chưa xử lý."

requirements-completed: []

duration: 10 min
completed: 2026-10-12
---

# Phase 2 Plan 3: withSessionRefresh (single-flight + epoch) Summary

**`withSessionRefresh` bọc `HttpClient`: mọi 401 dùng chung một promise refresh chạy trong `Lock` tiêm vào, có epoch chặn 401 đến muộn, phát lại đúng một lần, phân biệt hết phiên (`session.expired` + `onSessionExpired` một lần) với lỗi tạm thời (giữ lỗi gốc); 17 test mới, test N=5 song song khẳng định `lock` và `refresh` đều 1 lần, `inner.send` 10 lần**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-10-12T17:28:00+07:00
- **Completed:** 2026-10-12T17:38:00+07:00
- **Tasks:** 2 (TDD, mỗi task một cặp commit RED/GREEN)
- **Files:** 5 (2 tạo mới, 3 sửa)

## Accomplishments

- `with-session-refresh.ts`: `Lock` (chữ ký khớp `locks.request(name, callback)`), `RefreshOutcome`, `SessionRefreshDeps` (JSDoc cấm hàm refresh đi qua client đã bọc), `DEFAULT_SESSION_LOCK_NAME`, `withSessionRefresh`.
- `send`: `sessionRefresh === false` đi thẳng; ghi `sentAt = epoch` trước khi gửi; lỗi không phải `ApiError` 401 ném nguyên; `epoch === sentAt` mới `await refreshOnce()`; `'expired'` → `sessionExpiredError()`; signal đã abort → `aborted`; phát lại một lần, vẫn 401 → `sessionExpiredError()`, lỗi khác ném nguyên.
- Comment tiếng Việt giải thích vì sao cần epoch (refresh token vừa xoay bị dùng lại → `Token.Compromised`, BE thu hồi mọi phiên), vì sao state ở closure, cách đọc D-14a, và refresh chủ động thuộc Phase 3 (D-15).
- `http.ts` export `withSessionRefresh`, `DEFAULT_SESSION_LOCK_NAME`; `index.ts` thêm `export type { Lock, RefreshOutcome, SessionRefreshDeps }`; `exports.test.ts` khóa `withSessionRefresh` có ở `./http`, không có ở `.`.

## Task Commits

1. **Task 02-03-01: Single-flight + epoch cho 401 song song và 401 đến muộn**
   - RED `cf6ef97` `test(02-03): add failing test for withSessionRefresh single-flight and epoch`
   - GREEN `8b22818` `feat(02-03): implement withSessionRefresh single-flight with epoch`
2. **Task 02-03-02: Nhánh hết phiên, lỗi tạm thời, phát lại vẫn 401, abort và export**
   - RED `f96496f` `test(02-03): add failing test for session expiry, transient refresh error, abort and exports`
   - GREEN `002c683` `feat(02-03): handle abort before replay and export withSessionRefresh via ./http`

Không cần commit REFACTOR.

## Files Created/Modified

- `packages/api-client/src/with-session-refresh.ts` — decorator refresh phản ứng, không browser global, không state module scope.
- `packages/api-client/src/with-session-refresh.test.ts` — 16 test: N=5 song song, tên lock mặc định và tùy chỉnh, epoch (401 đến muộn), hai epoch tuần tự, không 401, 3 lỗi khác 401, `sessionRefresh: false`, `'expired'`, lỗi tạm thời rồi refresh lại, 503, phát lại vẫn 401, phát lại 500, abort.
- `packages/api-client/src/exports.test.ts` — thêm ca `withSessionRefresh`/`DEFAULT_SESSION_LOCK_NAME` ở `./http`, `withSessionRefresh` không ở `.`.
- `packages/api-client/src/http.ts` — export runtime cho composition.
- `packages/api-client/src/index.ts` — export type cho Phase 3.

## Decisions Made

- Hợp đồng giữ đúng `<interfaces>` của plan và RESEARCH Pattern 4.
- Kiểm abort đặt sau `await refreshOnce()` và trước phát lại, áp dụng cả khi epoch đã tăng (request chỉ phát lại) để không gửi request mà caller đã hủy.
- Comment và JSDoc tránh viết `onSessionExpired()` có ngoặc để grep acceptance (đúng 1 lần gọi) khớp chính xác dòng gọi; không nhắc tên browser global trong comment để grep `navigator|window|localStorage` sạch.

## Deviations from Plan

None - plan executed exactly as written.

Ghi chú nhỏ (không phải deviation):
- Ở RED của task 2, các ca `'expired'`, lỗi tạm thời, 503, phát lại 401/500 đã xanh ngay vì cài đặt Pattern 4 ở task 1 đã bao các nhánh này; chỉ ca abort và ca export đỏ. RED vẫn có test đỏ thật nên không vi phạm fail-fast.
- Test epoch dùng bộ đếm riêng cho `/a` và `/b` thay vì `Map` dùng chung của helper vì `/a` cần lượt đầu treo bằng deferred.

## Issues Encountered

- Không gọi `requirements mark-complete FND-05`: như 02-01 và 02-02, FND-05 (toast phản hồi thao tác ghi, message lỗi từ BE) chỉ giao xong ở 02-04, nên `requirements-completed` để trống dù frontmatter plan ghi `[FND-05]`.

## Known Stubs

None.

## Threat Model Verification

- **T-02-10 (DoS, refresh race):** `inFlight ??=` trong `Lock` + epoch; test N=5 song song (`lock`/`refresh` 1 lần) và 401 đến muộn (`refresh` vẫn 1 lần, `/a` gửi đúng 2 lần).
- **T-02-11 (DoS, vòng lặp refresh/replay):** phát lại một lần, vẫn 401 → `session.expired` (`refresh` 1, `send` 2); `sessionRefresh: false` không refresh (test).
- **T-02-12 (DoS, đăng xuất oan khi cold start):** lỗi network và 503 từ refresh → lỗi gốc `toBe`, `onSessionExpired` 0 lần, lần 401 sau refresh lại (`refresh` tổng 2).
- **T-02-13 (EoP, browser lock trong package):** `Lock` là type tiêm vào; grep `navigator|window|localStorage` trên file không có kết quả, lint `httpPackage()` xanh. Self-test case `api-client: navigator` thuộc plan 02-04.
- **T-02-14 (Information Disclosure, token):** accept; `withSessionRefresh` không đọc, giữ hay truyền token.
- Không thêm endpoint, auth path hay truy cập file mới.

## Verification

- `pnpm --filter @tripory/api-client exec vitest run src/with-session-refresh.test.ts` — PASS, 16 test.
- `pnpm --filter @tripory/api-client test` — PASS, 5 file, 92 test.
- `pnpm --filter @tripory/api-client lint` / `typecheck` — PASS.
- `(Select-String ... -Pattern 'onSessionExpired\(\)').Count` = 1; `sessionExpiredError()`, `kind: 'aborted'`, `inFlight ??=`, `sessionRefresh === false` có trong file; `^let |^var |navigator|window|localStorage` không có kết quả; `index.ts` không chứa `export { withSessionRefresh`.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 7/7 task thành công mỗi lệnh.

## User Setup Required

None.

## Next Phase Readiness

- 02-04 thêm self-test boundaries `api-client: navigator` và lớp chọn message (`session_expired` không hiện toast).
- Phase 3 cài `lock = (name, task) => navigator.locks.request(name, task)`, `refresh` gọi `/api/auth/refresh` với `sessionRefresh: false` và phân loại `Token.*` thành `'expired'`, `onSessionExpired` chuyển trang đăng nhập; bổ sung kiểm `tripory_at_exp` trong lock cho nhiều tab.
- Ready for 02-04.

---
*Phase: 02-http-shared-kernel*
*Completed: 2026-10-12*

## Self-Check: PASSED

Đã kiểm 2 file nguồn/test tồn tại và 4 commit `cf6ef97`, `8b22818`, `f96496f`, `002c683` có trong git log; acceptance criteria của cả hai task và `<verification>` của plan chạy lại đều PASS.
