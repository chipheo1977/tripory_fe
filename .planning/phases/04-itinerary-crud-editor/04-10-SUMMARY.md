---
phase: 04-itinerary-crud-editor
plan: 10
subsystem: api
tags: [route-handler, bff, ssrf, google-maps, error-messages, tdd]
requires:
  - phase: 03-identity
    provides: "request-guards (checkSameOrigin, errorEnvelope, successEnvelope), readSession, ServerDeps, mẫu handler auth"
provides:
  - "`resolveShortMapsLink(deps, raw)` thuần: theo tối đa 3 redirect từ `maps.app.goo.gl` hoặc `goo.gl/maps/…` tới URL Google Maps đích, không fetch đích, không đọc body"
  - "`handleMapsResolve` và `POST /api/maps/resolve`: method → Origin → phiên fresh → body → resolve; 405/403/401/400/422 đều `no-store`"
  - "`json-body.ts` (`readJsonObject`, `pickStrings`) dùng chung cho auth và maps"
  - "`ERROR_MESSAGES` (40 mã) có copy UI-SPEC cho Itinerary/Waypoint và `Maps.UnresolvableLink`"
affects: [04-12, 04-13, 04-14, 04-15, 04-16, 04-17]
tech-stack:
  added: []
  patterns: [pure-resolver-with-injected-fetch, abortcontroller-settimeout-for-fake-timers, bff-guard-order]
key-files:
  created:
    - apps/web/src/composition/server/maps-resolve.ts
    - apps/web/src/composition/server/maps-resolve.test.ts
    - apps/web/src/composition/server/maps-handlers.ts
    - apps/web/src/composition/server/maps-handlers.test.ts
    - apps/web/src/composition/server/json-body.ts
    - apps/web/src/app/api/maps/resolve/route.ts
  modified:
    - apps/web/src/composition/server/auth-handlers.ts
    - apps/web/src/lib/feedback/error-messages.ts
    - apps/web/src/lib/feedback/error-messages.test.ts
    - apps/web/src/lib/feedback/select-error-message.test.ts
    - apps/web/src/lib/feedback/mutation-feedback.test.ts
key-decisions:
  - "Handler dùng `deps.fetch` có sẵn trong `ServerDeps` thay vì tham số thứ ba; route chỉ gọi `handleMapsResolve(request, serverDeps())`."
  - "Phiên `stale` và `invalid` đều trả 401 `session.expired` mà KHÔNG xóa cookie, để client refresh rồi phát lại."
  - "Chỉ `Maps.UnresolvableLink` là mã mới; 6 mã Itinerary/Waypoint khác đã có key từ trước nên chỉ đổi câu."
requirements-completed: [ITIN-05, ITIN-11, ITIN-13]
duration: 8 min
completed: 2026-10-28
---
# Phase 4 Plan 10: Route resolve link rút gọn Google Maps và mã lỗi itinerary Summary
**`POST /api/maps/resolve` chống SSRF (https + allowlist host mỗi bước, redirect manual, ≤ 3 bước, 5 giây, không fetch đích) sau đủ lớp chặn kiểu BFF, kèm bảng `ERROR_MESSAGES` 40 mã theo copy UI-SPEC**
## Performance
- **Duration:** 8 min
- **Started:** 2026-10-28T15:30:00+07:00
- **Completed:** 2026-10-28T15:38:00+07:00
- **Tasks:** 3
- **Files modified:** 11
## Accomplishments
- `resolveShortMapsLink`: 26 test bằng fake fetch (thành công, consent `continue`, host lạ ở mọi bước, http, `goo.gl` không `/maps/`, 4 bước → dừng sau đúng 3 fetch, 404/200/thiếu Location, lỗi mạng, treo → abort sau 5 giây, input 2049 ký tự, body được `cancel()` mỗi bước).
- `handleMapsResolve` + route: 15 test (405, 403, 401 `Auth.Unauthorized`, 401 `session.expired` cho stale/hết hạn/invalid không có `set-cookie`, 400 cho 5 dạng body sai, 200, 422, không gửi cookie/Authorization tới Google); mọi ca từ chối fetch 0 lần.
- Tách `readJsonObject`/`pickStrings` sang `json-body.ts`; 157 test auth cũ vẫn xanh.
- `ERROR_MESSAGES`: sửa 6 câu theo UI-SPEC (thuật ngữ "điểm đến"), thêm `Maps.UnresolvableLink`; không thêm mã `*.TooLong`.
## Task Commits
1. **Task 1 RED** - `3df1c06` (test)
2. **Task 1 GREEN** - `40787e2` (feat)
3. **Task 2 refactor `json-body.ts`** - `fcb9519` (refactor)
4. **Task 2 RED** - `ebf036c` (test)
5. **Task 2 GREEN** - `f828471` (feat)
6. **Task 3** - `407991c` (feat)
7. **Task 3 bổ sung test đếm mã** - `07ee100` (test)
## Verification
- `pnpm --filter @tripory/web test`: 60 file, 979 test xanh.
- `turbo run lint typecheck test` (binary trực tiếp): 24/24 task thành công.
- Acceptance: `redirect: "manual"` và `MAX_HOPS = 3` có trong `maps-resolve.ts`; `route.ts` không có `GET`; `Maps.UnresolvableLink` có trong `maps-handlers.ts` và `error-messages.ts`; không còn "điểm dừng" hay `TooLong` trong `error-messages.ts`.
## Deviations from Plan
### Auto-fixed Issues
**1. [Rule 3 - Blocking] Cập nhật test đếm số mã lỗi ngoài danh sách `files_modified`**
- **Found during:** Task 3
- **Issue:** `select-error-message.test.ts` (bảng `EXPECTED` 39 mã, câu cũ) và `mutation-feedback.test.ts` (`size` = 39) vỡ khi đổi câu và thêm `Maps.UnresolvableLink`.
- **Fix:** Cập nhật câu theo UI-SPEC và số mã 39 → 40.
- **Files modified:** `apps/web/src/lib/feedback/select-error-message.test.ts`, `apps/web/src/lib/feedback/mutation-feedback.test.ts`
- **Commit:** `407991c`, `07ee100`
### Khác biệt nhỏ so với văn bản plan
- Handler lấy `fetch` từ `deps.fetch` (đã có trong `ServerDeps`), đúng nhánh "nếu đã có thì dùng" của plan; không có tham số thứ ba.
- Chữ ký của test Task 3 thêm ca bảo vệ (không `TooLong`, không "điểm dừng") ở `error-messages.test.ts`.
## Auth gates
None.
## Known Stubs
None.
## Threat Flags
None. Bề mặt mới (route `/api/maps/resolve`, gọi ra `maps.app.goo.gl`) đã nằm trong threat model T-04-24..T-04-28; T-04-27 (không rate limit) là rủi ro chấp nhận theo D-51.
## Self-Check: PASSED
