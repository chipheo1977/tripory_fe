---
phase: 02-http-shared-kernel
verified: 2026-10-12T15:28:54Z
status: passed
score: 3/3 success criteria verified (FND-05 phần Phase 2)
overrides_applied: 0
deferred:
  - truth: "Người dùng thấy toast thật trên màn hình khi thao tác ghi thành công/thất bại (tiêu chí 1, phần hiển thị)"
    addressed_in: "Phase 3"
    evidence: "ROADMAP Phase 2 Note: tiêu chí 1 chỉ chứng minh bằng unit test ở Phase 2; toast thật nghiệm thu ở Phase 3 khi đã mount `Toast` và `QueryClientProvider`. 02-VALIDATION.md §Manual-Only cũng ghi nghiệm thu ở Phase 3."
---

# Phase 2: HTTP & Shared Kernel Verification Report

**Phase Goal:** Mọi lời gọi BE đi qua một client thống nhất, lỗi BE ở mọi dạng biến thành thông báo đọc được cho người dùng, và refresh token không bao giờ chạy trùng.
**Verified:** 2026-10-12T15:28:54Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Roadmap Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Mọi dạng lỗi BE → message đọc được; thao tác thành công có toast thành công | ✓ VERIFIED (unit) / phần hiển thị DEFERRED | `toApiError` chuẩn hóa envelope (1a/1b/1c), `ValidationProblemDetails`, ProblemDetails trơn, body rỗng/HTML/JSON hỏng; `createFetchHttpClient` thêm `network`/`timeout`/`aborted`/`parse`. `selectErrorMessage` chọn copy tiếng Việt theo `errorCode` → message BE → `GENERIC_ERROR_MESSAGE`; `resolveFormError` gắn "Giá trị không hợp lệ." vào ô; `decideMutationSuccess`/`decideMutationError` quyết định toast. Toast thật trên màn hình chuyển sang Phase 3 theo ROADMAP Note. |
| 2 | N request 401 song song qua `withSessionRefresh` → đúng 1 refresh rồi phát lại | ✓ VERIFIED | `with-session-refresh.test.ts` case "N=5 request 401 song song chỉ lock và refresh 1 lần, mỗi request phát lại 1 lần" (assert `lock`/`refresh` `toHaveBeenCalledTimes(1)`). Source dùng `inFlight ??=` + `epoch` trong closure; case 401 đến muộn chỉ phát lại, không refresh lần hai. 19/19 case pass. |
| 3 | `shared-kernel` (branded id, `Wgs84Coordinate`) và `api-client` có test, không browser global trong package, boundary lint xanh | ✓ VERIFIED | `shared-kernel` 32 test (`ids.test.ts`, `geo.test.ts`), `api-client` 95 test (5 file); `--passWithNoTests` đã bỏ ở cả hai. Grep `window|document|navigator|localStorage|sessionStorage` trong `src` không phải test: 0 kết quả. `pnpm lint --force` 7/7; `boundaries.mjs` không đổi kể từ `4c1175f`; self-test config 88/88 (thêm 12 case: `navigator`/`zod` trong api-client, `navigator` trong kernel, `/http` ngoài composition). |

**Score:** 3/3 tiêu chí verified (phần hiển thị toast của tiêu chí 1 deferred sang Phase 3, không tính là gap).

### Observable Truths (PLAN must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `parseUserId`/`parseItineraryId` nhận GUID (hoa, có khoảng trắng) → chữ thường; sai → `null`; không gán chéo | ✓ VERIFIED | `packages/shared-kernel/src/ids.ts` + `ids.test.ts`; typecheck uncached xanh. |
| 2 | `createWgs84Coordinate` khoảng đóng ±90/±180, frozen, `NaN`/`Infinity`/vượt biên → `null` | ✓ VERIFIED | `geo.ts` + `geo.test.ts`. |
| 3 | 6 dạng lỗi BE thành `ApiError` plain object có `type: 'ApiError'` và `kind` | ✓ VERIFIED | `to-api-error.ts` (3 nhánh, không ném), `fetch-http-client.ts` (`clientError`, `parse`); `to-api-error.test.ts` dùng fixture thật `fixtures/be-responses.ts`. |
| 4 | `ApiError` không chứa raw body/header/token | ✓ VERIFIED | `makeApiError` chỉ chép field đã biết; test "không lộ token fake-refresh" và allowlist key `type, kind, status, code, message, fieldErrors`. |
| 5 | Timeout 30 s (kể cả lúc đọc body), override được, không tự retry | ✓ VERIFIED | `DEFAULT_TIMEOUT_MS = 30_000`; `response.text()` nằm trong `try`, `clearTimeout` ở `finally`; test network/503 gọi `fetch` đúng 1 lần. |
| 6 | UI import `@tripory/api-client`; `createFetchHttpClient`/`withSessionRefresh` chỉ ở `./http` | ✓ VERIFIED | `index.ts` chỉ export type + helper thuần; `http.ts` export hàm; `package.json` exports `"./http": "./src/http.ts"`; self-test chặn `/http` trong `lib/feedback` và `app`. |
| 7 | `'expired'` → cả lô `session.expired`, `onSessionExpired` 1 lần; refresh throw → lỗi gốc, không đăng xuất | ✓ VERIFIED | Nhánh `notifyExpired()` theo epoch; `.finally` reset `inFlight`; test D-14/D-14a (expired, network, 503). |
| 8 | Phát lại vẫn 401 → `session.expired` (kèm `onSessionExpired`), không refresh lần hai; `sessionRefresh: false` không vào nhánh refresh | ✓ VERIFIED | Sau WR-01/WR-02 (commit `67c3f8e`, `389633c`): replay 401 gọi `notifyExpired()`; 401 muộn sau lô `'expired'` đi tắt; login sau hết phiên mở epoch mới. Có test riêng cho từng nhánh. |
| 9 | Message chọn theo map `errorCode` → message BE → câu chung; đúng 39 mã D-16; key prototype không khớp nhầm | ✓ VERIFIED | `error-messages.ts` dùng `new Map<string, string>`; test "có đúng 39 mã (D-16)", test `__proto__`. |
| 10 | Form: field khớp → "Giá trị không hợp lệ."; không khớp → toast câu chung; FluentValidation → toast message BE | ✓ VERIFIED | `resolve-form-error.ts` + 6 test. |
| 11 | Toast success chỉ khi có `successMessage`; toast lỗi mặc định bật, `errorToast: false` tắt; `session_expired`/`aborted` không toast | ✓ VERIFIED | `mutation-feedback.ts` + 7 test. |
| 12 | Root suite xanh; app chưa mount `Toast`/`QueryClientProvider` (D-01) | ✓ VERIFIED | Lint/typecheck uncached 7/7; test 7/7. Grep `QueryClientProvider|<Toaster|<Toast|fetch(|axios` trong `apps/web/src`: 0 kết quả. |

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-kernel/src/{ids,geo,index}.ts` | Branded id, `Wgs84Coordinate`, barrel | ✓ VERIFIED | gsd-tools 3/3; barrel `export * from './ids'` / `'./geo'`. |
| `packages/api-client/src/{http-client,api-error,to-api-error,fetch-http-client,http}.ts` + `fixtures/be-responses.ts` | Contract, `ApiError`, chuẩn hóa lỗi, fetch client, subpath | ✓ VERIFIED | gsd-tools 6/6; source đọc trực tiếp. |
| `packages/api-client/src/with-session-refresh.ts` + test | Single-flight + epoch + expired | ✓ VERIFIED | gsd-tools 2/2; 19 case. |
| `apps/web/src/lib/feedback/*` | Map, chọn message, lỗi form, chính sách toast | ✓ VERIFIED | gsd-tools 4/4; 3 file test. |
| `packages/config/test/boundaries.test.ts` | Case ranh giới mới | ✓ VERIFIED | 88/88 pass. |

## Key Link Verification

gsd-tools báo 4 link "not verified" do lỗi escape regex (`\\\\(`) và so khớp đường dẫn package; cả 4 đã kiểm tay.

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `shared-kernel/src/index.ts` | `ids.ts`, `geo.ts` | `export *` | ✓ WIRED | Hai dòng `export * from './ids'; export * from './geo';`. |
| `shared-kernel/package.json` | vitest | `"test": "vitest run"` | ✓ WIRED | gsd-tools verified. |
| `fetch-http-client.ts` | `to-api-error.ts` | `throw toApiError(status, …)` | ✓ WIRED | Trong `parseResponse` cho non-2xx. |
| `api-client/package.json` | `src/http.ts` | `exports["./http"]` | ✓ WIRED | Dòng 8 `"./http": "./src/http.ts"`. |
| `fetch-http-client.ts` | AbortController + timer | `clearTimeout` trong `finally` | ✓ WIRED | gsd-tools verified. |
| `with-session-refresh.ts` | `deps.lock(name, deps.refresh)` | `inFlight ??=` | ✓ WIRED | gsd-tools verified. |
| `api-client/src/http.ts` | `with-session-refresh.ts` | `export { withSessionRefresh }` | ✓ WIRED | gsd-tools verified. |
| `lib/feedback/select-error-message.ts` | `@tripory/api-client` | `import { isApiError }` | ✓ WIRED | gsd-tools verified; entry gốc, không `/http`. |
| `lib/feedback/mutation-feedback.ts` | `select-error-message.ts` | `selectErrorMessage(error)` | ✓ WIRED | Dòng 21. |
| `apps/web/package.json` | `packages/api-client` | `"@tripory/api-client": "workspace:*"` | ✓ WIRED | Dòng 17. |

## Data-Flow Trace (Level 4)

Không áp dụng: Phase 2 chỉ có thư viện thuần và hàm trình bày, chưa có component render dữ liệu BE. Client chưa được composition khởi tạo (Phase 3 nối `createFetchHttpClient` + `withSessionRefresh` với `Lock` thật và `/api/auth/refresh`). Đây là phạm vi đã chốt (D-01), không phải stub.

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Lint | `pnpm lint` rồi `pnpm lint --force` | 7/7 successful, lần force 0 cached | ✓ PASS |
| Typecheck | `pnpm typecheck` rồi `pnpm typecheck --force` | 7/7 successful, lần force 0 cached | ✓ PASS |
| Tests | `pnpm test` | 7/7 successful; api-client 95, shared-kernel 32, config 88, web 115, ui-web 137, design-tokens 8 | ✓ PASS |
| Tests uncached (package của phase) | `pnpm --filter @tripory/api-client --filter @tripory/shared-kernel --filter @tripory/config test` | 95 + 32 + 88 pass | ✓ PASS |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FND-05 | 02-01, 02-02, 02-03, 02-04 | Toast phản hồi thành công/thất bại cho mọi thao tác ghi, message lỗi lấy từ BE | ✓ SATISFIED (phần Phase 2) | Chuẩn hóa lỗi, chọn message, chính sách toast có unit test; toast hiển thị thật deferred sang Phase 3 theo ROADMAP Note. |

`REQUIREMENTS.md` chỉ gán FND-05 cho Phase 2; không có requirement orphaned.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/api-client`, `packages/shared-kernel`, `apps/web/src/lib/feedback` | — | Grep TODO/FIXME/HACK/placeholder/not implemented: 0 kết quả | ℹ️ Info | Không có. |
| `with-session-refresh.ts` | 98-105 | IN-01 (review): 401 cũ phát lại ngay khi lượt refresh mới đang chạy | ℹ️ Info | Ca hiếm, để Phase 3. |
| `resolve-form-error.ts` / `mutation-feedback.ts` | — | IN-02: chính sách toast `session_expired` khác nhau giữa hai hàm | ℹ️ Info | Phase 3 cần chọn một chính sách khi nối form thật. |
| `to-api-error.ts` | 32-41 | IN-03: `fieldErrors` chỉ freeze lớp ngoài | ℹ️ Info | Không có bug hiện tại. |
| `fetch-http-client.ts` | 22-31 | IN-04: `buildUrl` không encode path | ℹ️ Info | Chưa có caller; Phase 3/4 cần `encodeURIComponent` segment động. |

Không có blocker hay warning. WR-01, WR-02 của `02-REVIEW.md` đã sửa (`02-REVIEW-FIX.md`, commit `67c3f8e`, `389633c`) và có test phủ từng nhánh.

## Regression (Phase 1)

`01-VERIFICATION.md` passed 13/13. Lần chạy này: ui-web 137/137, design-tokens 8/8, web 115 (17 file, gồm test Phase 1 và 3 file `lib/feedback`), config 88 (76 cũ + 12 mới), lint/typecheck uncached xanh. `boundaries.mjs` không đổi. Không có regression.

## Human Verification

Không có mục nào cho Phase 2. Toast hiển thị thật và query đọc lỗi không toast (D-10) đã được ROADMAP/VALIDATION xếp nghiệm thu ở Phase 3 (deferred).

## Gaps Summary

Không có gap. Client thống nhất (`createFetchHttpClient` + `withSessionRefresh`), chuẩn hóa mọi dạng lỗi BE thành `ApiError`, chọn message tiếng Việt và single-flight refresh đều có code thật, được nối với nhau và có test. Phần còn lại (mount `Toast`/`QueryClientProvider`, cài `Lock` bằng `navigator.locks`, nối `/api/auth/refresh`) thuộc Phase 3 theo đúng phạm vi đã chốt.

---

_Verified: 2026-10-12T15:28:54Z_
_Verifier: Kiro (gsd-verifier)_
