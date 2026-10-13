---
phase: 02-http-shared-kernel
plan: 04
subsystem: web-feedback
tags: [feedback, error-messages, toast-policy, form-errors, boundaries, vitest, tdd]

requires:
  - phase: 02-http-shared-kernel
    provides: "`isApiError`, `makeApiError`, `sessionExpiredError`, `SESSION_EXPIRED`, `FieldErrors` từ entry gốc `@tripory/api-client` (02-02); `withSessionRefresh` ở `./http` (02-03)"
provides:
  - "`apps/web/src/lib/feedback`: `ERROR_MESSAGES` (Map 39 mã D-16), `GENERIC_ERROR_MESSAGE`, `FIELD_INVALID_MESSAGE`, `SESSION_EXPIRED_MESSAGE`"
  - "`selectErrorMessage(error): string | null`, `resolveFormError(error, fieldNames)`, `decideMutationSuccess`, `decideMutationError`, type `MutationFeedback`, `ToastDecision`, `FormErrorResolution`"
  - "Self-test ranh giới cho api-client (navigator/window/zod/node:fs), kernel (fetch/navigator), `/http` ngoài composition"
affects: [phase-03-identity]

tech-stack:
  added: []
  patterns: [error-code-map-via-Map, pure-toast-decision, form-error-split, boundary-self-test]

key-files:
  created:
    - apps/web/src/lib/feedback/error-messages.ts
    - apps/web/src/lib/feedback/select-error-message.ts
    - apps/web/src/lib/feedback/select-error-message.test.ts
    - apps/web/src/lib/feedback/resolve-form-error.ts
    - apps/web/src/lib/feedback/resolve-form-error.test.ts
    - apps/web/src/lib/feedback/mutation-feedback.ts
    - apps/web/src/lib/feedback/mutation-feedback.test.ts
    - apps/web/src/lib/feedback/index.ts
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
    - packages/config/test/boundaries.test.ts

key-decisions:
  - "Bảng `ERROR_MESSAGES` là `ReadonlyMap` 39 mã; mã giới hạn động và mã tên validator cố ý không có key để dùng message BE; mã nội bộ map về câu chung."
  - "`selectErrorMessage`: map → message BE → câu chung; `aborted` → `null`; lỗi không phải `ApiError` → câu chung."
  - "`resolveFormError`: field khớp → \"Giá trị không hợp lệ.\", field không khớp/key rỗng → toast câu chung, không có `fieldErrors` → `selectErrorMessage`; dựng object qua `Map` + `Object.fromEntries`."
  - "`decideMutationError` im lặng khi `errorToast: false`, `session_expired`, `aborted`; `decideMutationSuccess` chỉ khi `successMessage` khác rỗng."

patterns-established:
  - "Lớp trình bày lỗi là hàm thuần trong `apps/web/src/lib/feedback`, chỉ import entry gốc `@tripory/api-client`; Phase 3 gọi `notify[decision.variant](decision.message)` trong `MutationCache`."
  - "Test bảng copy bằng `it.each([...] as const)` trên toàn bộ cặp kỳ vọng, khẳng định thêm `size === 39`."

requirements-completed: [FND-05]

duration: 6 min
completed: 2026-10-12
---

# Phase 2 Plan 4: Feedback (errorCode → copy, lỗi form, chính sách toast) Summary

**`apps/web/src/lib/feedback` có bảng `Map` 39 errorCode → copy tiếng Việt, `selectErrorMessage` (map → message BE → câu chung), `resolveFormError` (ô form "Giá trị không hợp lệ.", không lọt chuỗi tiếng Anh) và `decideMutationSuccess`/`decideMutationError` cho Phase 3 nối `MutationCache`; 12 case self-test ranh giới mới đều xanh, `pnpm lint`/`typecheck`/`test` toàn repo xanh**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-12T17:34:00+07:00
- **Completed:** 2026-10-12T17:40:00+07:00
- **Tasks:** 3 (task 1, 2 TDD RED/GREEN; task 3 thêm case self-test)
- **Files:** 11 (8 tạo mới, 3 sửa)

## Accomplishments

- `apps/web/package.json` thêm `"@tripory/api-client": "workspace:*"`, `pnpm install` cập nhật lockfile.
- `error-messages.ts`: 3 hằng (`GENERIC_ERROR_MESSAGE` không dấu chấm cuối, `FIELD_INVALID_MESSAGE`, `SESSION_EXPIRED_MESSAGE`) và `ERROR_MESSAGES` đúng 39 cặp D-16 (dùng hằng `SESSION_EXPIRED` cho `session.expired`), comment tiếng Việt về lý do không map mã động/validator và tra bằng `Map`.
- `select-error-message.ts`: chọn message theo D-03/D-04, `aborted` → `null`.
- `resolve-form-error.ts`: tách lỗi `ValidationProblemDetails` thành lỗi ô + toast (D-05, D-05a, D-06); FluentValidation → toast message BE.
- `mutation-feedback.ts`: `MutationFeedback`, `ToastDecision`, `decideMutationSuccess`, `decideMutationError`; comment cuối file ghi cách Phase 3 nối (`Register.mutationMeta`, `MutationCache`, D-10, D-12). Không cài `@tanstack/react-query`, không mount provider (D-01).
- `index.ts`: barrel 4 dòng `export * from`.
- `boundaries.test.ts`: thêm 8 case `bad` và 4 case `ok`, không sửa case cũ, `boundaries.mjs` không đổi.

## Task Commits

1. **Task 02-04-01: Dependency api-client, bảng map errorCode và selectErrorMessage**
   - RED `f938738` `test(02-04): add failing test for errorCode map and selectErrorMessage`
   - GREEN `2a653c3` `feat(02-04): implement errorCode map and selectErrorMessage`
2. **Task 02-04-02: resolveFormError, hợp đồng chính sách toast và barrel feedback**
   - RED `4acd419` `test(02-04): add failing test for resolveFormError and mutation toast policy`
   - GREEN `1c9921d` `feat(02-04): implement resolveFormError, mutation toast policy and feedback barrel`
3. **Task 02-04-03: Case self-test ranh giới và full suite**
   - `cbd3d30` `test(02-04): add boundary self-test cases for api-client, kernel and lib/feedback`

Không cần commit REFACTOR.

## Files Created/Modified

- `apps/web/src/lib/feedback/error-messages.ts` — hằng copy và bảng map 39 mã.
- `apps/web/src/lib/feedback/select-error-message.ts` — chọn message cho lỗi bất kỳ.
- `apps/web/src/lib/feedback/select-error-message.test.ts` — 77 test: `size === 39`, 39 cặp, 17 mã không map, thứ tự ưu tiên, câu chung cho 10 loại lỗi, `aborted`, 4 key prototype, hết phiên.
- `apps/web/src/lib/feedback/resolve-form-error.ts` — tách lỗi form.
- `apps/web/src/lib/feedback/resolve-form-error.test.ts` — 11 test: field khớp/không khớp/hỗn hợp key rỗng, FluentValidation, network, `Error`, `aborted`, 3 ca `JSON.stringify` không chứa `'The Email field'`, key `__proto__`.
- `apps/web/src/lib/feedback/mutation-feedback.ts` — chính sách toast mutation.
- `apps/web/src/lib/feedback/mutation-feedback.test.ts` — 10 test: success opt-in (3 ca null + 1 ca có câu), lỗi mặc định bật, `errorToast: false`, `session_expired`, `aborted`, network, barrel.
- `apps/web/src/lib/feedback/index.ts` — barrel.
- `apps/web/package.json`, `pnpm-lock.yaml` — workspace dependency.
- `packages/config/test/boundaries.test.ts` — 12 case mới.

## Decisions Made

- Theo đúng `<interfaces>` và `<action>` của plan; không có quyết định ngoài plan.
- `decideMutationSuccess` dùng kiểm truthy nên `successMessage: ''` → `null` (đúng behavior).
- Test `__proto__` dựng `fieldErrors` bằng `JSON.parse` để `__proto__` là own key thật, khẳng định prototype của kết quả vẫn là `Object.prototype` và `Object.keys` = `['__proto__', 'email']`.

## Deviations from Plan

None - plan executed exactly as written.

Ghi chú nhỏ (không phải deviation):
- `pnpm install` ngoài mục `apps/web` còn viết lại khóa peer-suffix của `eslint-import-resolver-typescript`/`eslint-plugin-import` trong `snapshots` (cùng version 3.10.1/2.32.0, chỉ đổi chuỗi định danh). Không thêm hay đổi version package nào.
- Barrel được khẳng định trong `mutation-feedback.test.ts` (ca "barrel lib/feedback") thay vì file test riêng.
- `.planning/config.json` có thay đổi sẵn từ trước (`_auto_chain_active`), không thuộc plan này nên không commit.

## Issues Encountered

None.

## Known Stubs

None. App chưa mount `Toast`/`QueryClientProvider` là chủ đích D-01 (Phase 3 nối).

## Threat Model Verification

- **T-02-15 (Tampering, lookup):** `Map.get`; test `toString`, `__proto__`, `constructor`, `hasOwnProperty` → câu chung; `resolveFormError` dựng qua `Map` + `Object.fromEntries`, test `__proto__` không đổi prototype.
- **T-02-16 (Information Disclosure):** ô form "Giá trị không hợp lệ.", toast câu chung cho ProblemDetails; `new Error()` → câu chung; test `JSON.stringify` không chứa `'The Email field'`.
- **T-02-17 (EoP, `/http` ngoài composition):** case `web: api-client /http trong lib/feedback` và `trong app` bị bắt; `composition` được phép.
- **T-02-18 (EoP, browser global/zod trong package):** case `navigator`, `window`, `zod`, `node:fs` (api-client) và `fetch`, `navigator` (kernel) đều bị bắt. Không có lỗ hổng ranh giới.
- **T-02-19 / T-02-20:** accept như plan; chỉ thêm workspace dependency.

## Verification

- `pnpm --filter @tripory/web exec vitest run src/lib/feedback` — PASS, 3 file, 98 test.
- `pnpm --filter @tripory/web lint` / `typecheck` — exit 0.
- `pnpm --filter @tripory/config test` — PASS, 88 test (12 case mới).
- Grep acceptance: chuỗi hằng/mã bắt buộc có mặt; `"Auth.UserBanned"|"User.BioTooLong"|"NotEmptyValidator"|"Validation.Error"|"File.TooLarge"` không có trong `error-messages.ts`; không import `@tripory/api-client/http`, `@tripory/ui-web`, `sonner`, `@tanstack`; `index.ts` có 4 dòng `export * from`.
- `git diff --stat -- packages/config/eslint/boundaries.mjs` rỗng; không có `QueryClientProvider|<Toast` trong `apps/web/src/app`; không có `passWithNoTests` trong `api-client`/`shared-kernel`.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 7/7 task thành công mỗi lệnh.

## User Setup Required

None.

## Next Phase Readiness

- Phase 2 hoàn tất 4/4 plan: kernel (02-01), api-client core (02-02), `withSessionRefresh` (02-03), feedback (02-04).
- Phase 3 cài `@tanstack/react-query`, khai báo `Register.mutationMeta`, tạo `MutationCache` gọi `decideMutationSuccess`/`decideMutationError` → `notify`, mount `Toast` và provider, nối `withSessionRefresh` trong `src/composition`.
- Phase complete, ready for next step.

---
*Phase: 02-http-shared-kernel*
*Completed: 2026-10-12*

## Self-Check: PASSED

Đã kiểm 8 file trong `apps/web/src/lib/feedback` tồn tại và 5 commit `f938738`, `2a653c3`, `4acd419`, `1c9921d`, `cbd3d30` có trong git log; acceptance criteria của cả ba task và `<verification>` của plan chạy lại đều PASS.
