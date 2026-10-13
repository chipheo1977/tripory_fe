---
phase: 2
slug: http-shared-kernel
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-12
---

# Phase 2 — Validation Strategy

> Hợp đồng kiểm chứng của phase, dùng để lấy mẫu phản hồi trong lúc thực thi. Nguồn: `02-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 |
| **Config file** | `packages/{api-client,shared-kernel}/vitest.config.ts` (preset node); `apps/web/vitest.config.ts` (jsdom + setup) |
| **Quick run command** | `pnpm --filter @tripory/api-client test` · `pnpm --filter @tripory/shared-kernel test` · `pnpm --filter @tripory/web exec vitest run src/lib/feedback` |
| **Full suite command** | `pnpm lint; pnpm typecheck; pnpm test` (từ gốc repo) |
| **Estimated runtime** | ~60 giây cho full suite, dưới 10 giây cho quick run |

---

## Sampling Rate

- **Sau mỗi task commit:** chạy quick run của package vừa sửa
- **Sau mỗi plan:** chạy full suite
- **Trước `/gsd-verify-work`:** full suite phải xanh
- **Độ trễ phản hồi tối đa:** 10 giây (quick run)

---

## Per-Task Verification Map

Task ID lấy từ `02-0N-PLAN.md`. Mỗi dòng có lệnh `<automated>` trong task tương ứng.

| Task ID | Behavior | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|----------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-02-02 | Envelope 1a/1b/1c → `ApiError{kind:http,status,code,message}` | FND-05 / SC-1 | — | Không giữ raw body/header | unit | `pnpm --filter @tripory/api-client test -- to-api-error` | ✅ | ✅ |
| 02-02-02 | `ValidationProblemDetails` → `fieldErrors` (key `Email`, `$.startDate`, `command`, `""`, gộp trùng) | FND-05 / D-05a | — | Type guard tay, không `as` | unit | như trên | ✅ | ✅ |
| 02-02-02 | ProblemDetails trơn, body rỗng, HTML, JSON hỏng → `kind:http`, `code/message:null` | FND-05 / SC-1 | — | Không lộ chi tiết server | unit | như trên | ✅ | ✅ |
| 02-02-03 | Fetch client: 200/201/204, 2xx không envelope → `parse`, JSON/FormData, query string | FND-05 | — | N/A | unit | `pnpm --filter @tripory/api-client test -- fetch-http-client` | ✅ | ✅ |
| 02-02-03 | Timeout 30 s, `timeoutMs` override, timeout khi đọc body, timer được xóa | D-11 | — | N/A | unit (fake timers) | như trên | ✅ | ✅ |
| 02-02-03 | `fetch` reject → `network`; caller abort → `aborted` | FND-05 | — | N/A | unit | như trên | ✅ | ✅ |
| 02-03-01 | N=5 request 401 song song → refresh 1 lần, lock 1 lần, phát lại, cả 5 resolve | SC-2 / D-13 | T-refresh-race | Không kích hoạt reuse detection | unit | `pnpm --filter @tripory/api-client test -- with-session-refresh` | ✅ | ✅ |
| 02-03-01 | 401 đến muộn sau refresh (epoch) → phát lại, không refresh lần 2 | SC-2 | T-refresh-race | như trên | unit | như trên | ✅ | ✅ |
| 02-03-02 | Refresh `'expired'` → `session.expired` cho mọi request, `onSessionExpired` đúng 1 lần | D-14 / D-14a | — | N/A | unit | như trên | ✅ | ✅ |
| 02-03-02 | Refresh throw (tạm thời) → lỗi gốc, không gọi `onSessionExpired`, lần sau refresh lại | D-14a | — | Không đăng xuất oan | unit | như trên | ✅ | ✅ |
| 02-03-01, 02-03-02 | Phát lại vẫn 401 → `session.expired`; lỗi khác 401 đi thẳng; `sessionRefresh:false` không refresh | D-13 / D-14a | T-refresh-loop | Không vòng lặp vô hạn | unit | như trên | ✅ | ✅ |
| 02-01-01 | `parseUserId`/`parseItineraryId`: GUID hoa → thường, sai → `null`, không gán chéo | SC-3 | — | Input validation | unit | `pnpm --filter @tripory/shared-kernel test` | ✅ | ✅ |
| 02-01-02 | `createWgs84Coordinate`: biên ±90/±180, vượt biên/NaN/Infinity → `null`, frozen | SC-3 | — | Input validation | unit | như trên | ✅ | ✅ |
| 02-04-01 | `selectErrorMessage`: map → copy FE; không map → message BE; network/timeout/rỗng → câu chung; `aborted` → `null`; `toString`/`__proto__` không khớp nhầm | FND-05 / D-03, D-04, D-16 | T-proto-key | `Map`/`Object.hasOwn` | unit | `pnpm --filter @tripory/web exec vitest run src/lib/feedback` | ✅ | ✅ |
| 02-04-02 | `resolveFormError`: field khớp → "Giá trị không hợp lệ."; không khớp → toast; FluentValidation (không field) → toast message BE | D-05, D-05a, D-06 | — | Không hiện message tiếng Anh | unit | như trên | ✅ | ✅ |
| 02-04-02 | `decideMutationSuccess` mặc định null; `decideMutationError` mặc định bật, opt-out, `session_expired` → null | D-07..D-09 | — | N/A | unit | như trên | ✅ | ✅ |
| 02-04-03 | Ranh giới: `navigator` trong api-client bị bắt; UI import `@tripory/api-client` hợp lệ; UI import `@tripory/api-client/http` bị chặn | SC-3 | — | Ranh giới ESLint | self-test | `pnpm --filter @tripory/config test` | ✅ (thêm case) | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/api-client/src/fixtures/be-responses.ts`: body thật cho 1a, 1b, 1c, 2 (3 biến thể key), 3, rỗng, HTML, envelope success, refresh success
- [x] `packages/api-client/src/{to-api-error,fetch-http-client,with-session-refresh,api-error}.test.ts`
- [x] `packages/shared-kernel/src/{ids,geo}.test.ts`
- [x] `apps/web/src/lib/feedback/*.test.ts`
- [x] Bỏ `--passWithNoTests` ở `packages/api-client/package.json` và `packages/shared-kernel/package.json`
- [x] Thêm `"@tripory/api-client": "workspace:*"` vào `apps/web/package.json`, chạy `pnpm install`
- [x] Thêm 3 case vào `packages/config/test/boundaries.test.ts` (chỉ thêm case, không sửa rule)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Người dùng thấy toast thật khi thao tác ghi | FND-05 / SC-1 | Phase 2 chưa mount `Toast`/`QueryClientProvider` (D-01) | Nghiệm thu ở Phase 3 bằng đăng ký/đăng nhập |
| Query đọc lỗi không hiện toast | D-10 | Chưa có `QueryCache` ở Phase 2 | Nghiệm thu ở Phase 3 |

---

## Validation Sign-Off

- [x] Mọi task có `<automated>` verify hoặc phụ thuộc Wave 0
- [x] Không có 3 task liên tiếp thiếu automated verify
- [x] Wave 0 phủ mọi tham chiếu MISSING
- [x] Không dùng watch mode
- [x] Độ trễ phản hồi < 10 giây
- [x] Đặt `nyquist_compliant: true` trong frontmatter

**Approval:** approved 2026-10-12 (gsd-verifier: `pnpm lint`/`pnpm typecheck` uncached 7/7, `pnpm test` 7/7; xem `02-VERIFICATION.md`)
