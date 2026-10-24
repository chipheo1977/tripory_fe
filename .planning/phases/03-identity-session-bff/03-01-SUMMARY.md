---
phase: 03-identity-session-bff
plan: 01
subsystem: identity-foundation
tags: [pnpm-catalog, zod, react-query, react-hook-form, identity-package, boundaries, test-helpers, vitest, tdd]

requires:
  - phase: 02-http-shared-kernel
    provides: "`@tripory/api-client` (`HttpClient`, `withSessionRefresh`, `ApiError`), `@tripory/shared-kernel` (`UserId`), `apps/web/src/lib/feedback`, self-test ranh giới của Phase 2"
provides:
  - "Catalog pin cứng: `@tanstack/react-query` 5.104.2, `zod` 4.6.7, `react-hook-form` 7.89.0, `@hookform/resolvers` 5.9.1; `apps/web` dùng `catalog:`"
  - "`packages/identity` (`@tripory/identity`) theo preset `contextPackage()`: exports `.`, `./http`, `./react`; lint/typecheck/test xanh"
  - "`API_ORIGIN` (server-only) trong `apps/web/.env.example` và `env` của task `build`/`dev` ở `turbo.json`"
  - "15 case self-test mới cho `identity` và `apps/web` (proxy, modules, app/api route, composition), `boundaries.mjs` không đổi"
  - "Helper test dùng chung: `makeRequest`, `setCookiesOf`, `makeFakeLockManager`, `makeFakeBroadcastChannelHub`"
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07, phase-03-identity]

tech-stack:
  added: ["@tanstack/react-query 5.104.2", "zod 4.6.7", "react-hook-form 7.89.0", "@hookform/resolvers 5.9.1"]
  patterns: [catalog-pinned-deps, context-package-skeleton, node-environment-route-tests, shared-fake-lock-and-channel]

key-files:
  created:
    - packages/identity/package.json
    - packages/identity/eslint.config.mjs
    - packages/identity/tsconfig.json
    - packages/identity/vitest.config.ts
    - packages/identity/src/index.ts
    - packages/identity/src/exports.test.ts
    - packages/identity/src/domain/index.ts
    - packages/identity/src/application/index.ts
    - packages/identity/src/infrastructure/index.ts
    - packages/identity/src/react/index.ts
    - apps/web/.env.example
    - apps/web/src/test/next-request.ts
    - apps/web/src/test/fake-locks.ts
    - apps/web/src/test/fake-broadcast-channel.ts
    - apps/web/src/test/test-helpers.test.ts
  modified:
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
    - apps/web/package.json
    - turbo.json
    - .gitignore
    - packages/config/test/boundaries.test.ts
    - apps/web/src/test/setup.ts

key-decisions:
  - "`apps/web/.env.example` chỉ khai báo `API_ORIGIN` (không tiền tố công khai của Next); `.gitignore` bỏ qua `.env*` nên thêm `!.env.example` để file mẫu được commit."
  - "`makeRequest` đặt URL gốc `https://app.test` (`TEST_ORIGIN`) và chỉ đặt header `origin` khi truyền `origin`; `headers` truyền vào luôn ghi đè giá trị sinh tự động."
  - "`setCookiesOf` giữ nguyên giá trị cookie (không decode) và hạ chữ thường tên thuộc tính cùng giá trị `SameSite`; thuộc tính không giá trị (`HttpOnly`, `Secure`) là `true`."
  - "Fake `BroadcastChannel` chuyển tin đồng bộ qua `structuredClone` (tin không clone được sẽ lộ ngay trong test); fake lock reject bằng `signal.reason` đúng đặc tả Web Locks."

patterns-established:
  - "Test route/BFF/proxy dùng `// @vitest-environment node` ngay trong app (preset app mặc định jsdom); `src/test/setup.ts` chỉ polyfill `matchMedia` khi có `window`."
  - "Một `makeFakeLockManager()` dùng chung cho nhiều client mô phỏng nhiều tab; `held()` cho biết khóa đang giữ."
  - "Helper test trong `apps/web/src/test` không import `vitest` để dùng được ở cả node lẫn jsdom."

# Wave 0 chưa thực hiện hành vi nào của các yêu cầu này nên chưa tick hoàn thành (xem mục "Bước workflow cố ý bỏ qua").
requirements-addressed: [AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-08]
requirements-completed: []

duration: 9 min
completed: 2026-10-14
---

# Phase 3 Plan 1: Khung `packages/identity`, dependency catalog và helper test Summary

**`@tripory/identity` dựng theo `contextPackage()` với 3 exports, 4 dependency (react-query, zod, react-hook-form, resolvers) pin cứng trong catalog, `API_ORIGIN` server-only cho dev, 15 case self-test ranh giới mới (không sửa `boundaries.mjs`) và bộ helper test `makeRequest`/`setCookiesOf`/fake Web Locks/fake BroadcastChannel; `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-10-14T15:50:00+07:00
- **Completed:** 2026-10-14T15:58:00+07:00
- **Tasks:** 3 (task 3 TDD RED/GREEN)
- **Files:** 22 (15 tạo mới, 7 sửa; không tính các file `.planning`)

## Accomplishments

- `pnpm-workspace.yaml` thêm đúng 4 dòng catalog, không `^`/`~`; đã kiểm bằng `pnpm view` từng version trước khi ghi. `apps/web` khai báo 5 dependency mới (4 `catalog:` và `@tripory/identity` `workspace:*`).
- `packages/identity` sao từ `packages/itinerary` (tsconfig, vitest config, eslint, 4 barrel tầng), thêm `zod` vào `dependencies`, `react` và `@tanstack/react-query` vào `peerDependencies` + `devDependencies`, script `test` là `vitest run` (không `--passWithNoTests`) và `exports.test.ts` làm test đầu tiên.
- `boundaries.test.ts` thêm 6 ca `bad` cho `identity` (zod ở domain/application, `next/*` ở react/infrastructure, `Date.now`, `navigator`), 3 ca `bad` cho web (`/http` trong `modules`, `proxy.ts`, `app/api` route) và 6 ca `ok` (identity infrastructure/react, composition `/http`/`/react`, `proxy.ts`, `modules`). Self-test từ 88 lên 104 test (15 ca mới + 1 ca tự kiểm preset đã nối cho `packages/identity`).
- Helper test: `makeRequest` (URL, method, `origin`, `cookie`, body JSON), `setCookiesOf` (đọc `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=60` và cookie do `NextResponse` sinh), `makeFakeLockManager` (hàng đợi theo tên, `signal`, `held()`), `makeFakeBroadcastChannelHub` (không gửi về kênh gửi, `close()` gỡ kênh). 18 test trong `test-helpers.test.ts`.

## Task Commits

1. **Task 03-01-01: Catalog + dependency apps/web + khung packages/identity + API_ORIGIN** — `c05785c` `feat(03-01): add identity package skeleton, catalog deps and API_ORIGIN`
2. **Task 03-01-02: Case self-test ranh giới cho identity và thư mục mới của apps/web** — `871153e` `test(03-01): lock identity and new web boundaries in self-test`
3. **Task 03-01-03: Helper test dùng chung (TDD)**
   - RED `1dbb66a` `test(03-01): add failing tests for shared NextRequest, lock and channel helpers`
   - GREEN `c53e3dd` `feat(03-01): implement shared test helpers for NextRequest, locks and BroadcastChannel`

Không cần commit REFACTOR.

## Files Created/Modified

- `pnpm-workspace.yaml`, `pnpm-lock.yaml` — 4 catalog entry và lockfile (`+10 -5` package, không đổi version package cũ).
- `apps/web/package.json` — 5 dependency mới.
- `turbo.json` — `env: ["API_ORIGIN"]` cho `build` và `dev`.
- `apps/web/.env.example`, `.gitignore` — biến mẫu server-only và `!.env.example`.
- `packages/identity/**` — khung package (config + 4 barrel tầng + `exports.test.ts`).
- `packages/config/test/boundaries.test.ts` — 15 case mới và hằng `identity`.
- `apps/web/src/test/next-request.ts` — `makeRequest`, `setCookiesOf`, `TEST_ORIGIN`, type `MakeRequestOptions`, `ParsedSetCookie`.
- `apps/web/src/test/fake-locks.ts` — `makeFakeLockManager`, type `LockManagerLike`, `FakeLockManager`.
- `apps/web/src/test/fake-broadcast-channel.ts` — `makeFakeBroadcastChannelHub`, type `BroadcastChannelLike`, `FakeBroadcastChannelHub`.
- `apps/web/src/test/test-helpers.test.ts` — 18 test (đầu file `// @vitest-environment node`).
- `apps/web/src/test/setup.ts` — chỉ polyfill `matchMedia` khi có `window`.

## Decisions Made

- Bốn quyết định ở `key-decisions` ở trên; còn lại theo đúng `<action>` của plan.
- `type BroadcastChannelLike` và `LockManagerLike` được export từ thư mục `test` theo plan; plan 03-06 tự khai báo type tương đương trong code production, không import ngược từ `test`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `src/test/setup.ts` vỡ trong môi trường node**
- **Found during:** Task 3 (chạy test RED)
- **Issue:** `setup.ts` dùng `window.matchMedia` không điều kiện; mọi file test `// @vitest-environment node` (route handler, BFF, proxy ở các plan sau) lỗi `ReferenceError: window is not defined` trước khi chạy test.
- **Fix:** Thêm điều kiện `typeof window !== "undefined" &&` và một dòng comment lý do. Hành vi trong jsdom giữ nguyên (`setup.test.ts` vẫn xanh).
- **Files modified:** `apps/web/src/test/setup.ts`
- **Verification:** `test-helpers.test.ts` (node) và toàn bộ 18 file/133 test của `@tripory/web` xanh.
- **Committed in:** `c53e3dd`

**2. [Rule 3 - Blocking] `.gitignore` chặn `apps/web/.env.example`**
- **Found during:** Task 1
- **Issue:** Pattern `.env*` bỏ qua cả file mẫu, nên `.env.example` không commit được. Plan có dặn "thêm `!.env.example` nếu pattern chặn", nhưng `.gitignore` không nằm trong `files_modified`.
- **Fix:** Thêm dòng `!.env.example` sau `.env*`. `git check-ignore -v` xác nhận file được nhận.
- **Files modified:** `.gitignore`
- **Committed in:** `c05785c`

**3. [Rule 1 - Bug trong plan] Comment `.env.example` mâu thuẫn với acceptance criteria**
- **Found during:** Task 1
- **Issue:** Plan yêu cầu dòng comment chứa chuỗi `NEXT_PUBLIC_` nhưng acceptance criteria đòi file **không** chứa chuỗi này.
- **Fix:** Viết lại comment: "server-only, không đặt tiền tố công khai của Next". Tuân theo ý định (không có biến công khai), `Select-String 'NEXT_PUBLIC_'` trả 0.
- **Files modified:** `apps/web/.env.example`
- **Committed in:** `c05785c`

**4. [Rule 1 - Sai kỳ vọng trong test của chính task] Hai kỳ vọng ban đầu của `test-helpers.test.ts`**
- **Found during:** Task 3 (lần chạy GREEN đầu: 16/18 xanh)
- **Issue:** (a) `Request` chuẩn tự gắn `content-type: text/plain;charset=UTF-8` cho body chuỗi; (b) `NextResponse.cookies.set` tự thêm `Expires` khi có `maxAge`. Helper đúng, kỳ vọng của test sai.
- **Fix:** (a) khẳng định `content-type` khác `application/json` và thêm ca ghi đè bằng `headers`; (b) dùng `toMatchObject` cho các thuộc tính cần thiết. Cập nhật comment `body` của `makeRequest` cho đúng.
- **Files modified:** `apps/web/src/test/test-helpers.test.ts`, `apps/web/src/test/next-request.ts`
- **Committed in:** `1dbb66a` (test, trước khi commit RED) / `c53e3dd`

Ghi chú: các thay đổi của hai file test/helper ở mục 4 được làm trước khi commit; commit RED chứa phiên bản test đã sửa kỳ vọng.

### Bước workflow cố ý bỏ qua

**5. [Chủ đích] Không tick checkbox trong `REQUIREMENTS.md`**
- **Bước:** `requirements mark-complete AUTH-02 AUTH-03 AUTH-04 AUTH-05 AUTH-08`
- **Lý do:** Plan này chỉ là Wave 0 (khung package, dependency, self-test, helper test). Chưa có đăng nhập, refresh, đăng xuất, chuyển hướng `?next=` hay BFF allowlist nên đánh dấu Complete sẽ sai sự thật và làm verifier/tiến độ hiểu nhầm. Lệnh đã chạy rồi được hoàn lại bằng `git checkout -- .planning/REQUIREMENTS.md` (file không có thay đổi nào trước đó).
- **Hệ quả:** `requirements-completed` ở frontmatter vẫn sao nguyên `requirements` của plan theo template; năm yêu cầu được tick khi plan thực hiện hành vi tương ứng (03-05 trở đi) hoặc khi verify phase.

---

**Total deviations:** 4 auto-fixed (2 Rule 3, 2 Rule 1) và 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `boundaries.mjs`, không nới allowlist; hai fix Rule 3 là điều kiện để task chạy được.

## Issues Encountered

- `.planning/config.json` (`_auto_chain_active`) và `packages/api-client/src/fetch-http-client.ts` (dấu cách đầu dòng 1) là thay đổi có sẵn trước plan, không thuộc plan này nên không stage. `pnpm lint` ở gốc vẫn xanh với dấu cách đó (ESLint không kiểm định dạng), nên không cần gỡ.
- Cảnh báo của Vite khi chạy `vitest` ở `apps/web` ("ESM syntax in a file loaded as CommonJS (vitest.config.ts)") có sẵn từ Phase 1, không ảnh hưởng kết quả, ngoài phạm vi plan.
- `pnpm install` báo `eslint@9.39.5 deprecated` cho package mới; cùng bản đã dùng ở mọi package khác (catalog), không đổi.

## Known Stubs

Barrel `domain/application/infrastructure/react` của `packages/identity` là `export {};` và `exports.test.ts` chỉ khẳng định entry gốc là module hợp lệ. Đây là chủ đích của Wave 0; plan 03-02 và 03-04 thay bằng code thật và mở rộng test.

## Threat Model Verification

- **T-03-01 (Tampering, supply chain):** 4 version pin cứng, đã `pnpm view` từng cái trước khi ghi, không `^`/`~`; lockfile được commit (`c05785c`). Chỉ package đã nằm trong STACK.md.
- **T-03-02 (Information Disclosure, `API_ORIGIN`):** tên biến không có tiền tố công khai; `.env.example` chỉ có URL local, `Select-String 'NEXT_PUBLIC_'` = 0.
- **T-03-03 (EoP, nới ranh giới):** Task 2 chỉ thêm test; `git diff --stat -- packages/config/eslint` rỗng; 9 ca `bad` mới đều bị rule hiện có bắt.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan.

## Verification

- `pnpm --filter @tripory/identity test | lint | typecheck` — exit 0 (1 test).
- `pnpm --filter @tripory/config test` — 104 test xanh.
- `pnpm --filter @tripory/web test | lint | typecheck` — 18 file, 133 test xanh.
- Acceptance Task 1: 4 dòng catalog khớp, 0 dòng `^`/`~`, 5 dependency của web, `./http` và `./react` trong `exports`, 0 `passWithNoTests`, `contextPackage()`, `API_ORIGIN=` có mặt, 0 `NEXT_PUBLIC_`, `turbo.json` chứa `API_ORIGIN`.
- Acceptance Task 2: `const identity = 'packages/identity'` và 5 tên case bắt buộc có mặt; `git diff --stat -- packages/config/eslint` rỗng.
- Acceptance Task 3: 4 file tồn tại, `from "vitest"` trong `next-request.ts` = 0, 4 export bắt buộc có, dòng đầu `test-helpers.test.ts` là `// @vitest-environment node`.
- Gốc repo: `pnpm install` ("Already up to date"), `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh.

## User Setup Required

None. Khi chạy `pnpm dev` với BE local, sao `apps/web/.env.example` thành `apps/web/.env.local` và chỉnh `API_ORIGIN` nếu BE không ở `http://localhost:5000`; các route dùng biến này chưa tồn tại (plan 03-05).

## Next Phase Readiness

- Plan 03-02 đến 03-04 có sẵn `@tripory/identity`, `zod` và `@tanstack/react-query` để viết domain, application, ACL và hooks.
- Plan 03-05 và 03-07 dùng `makeRequest`/`setCookiesOf` cho test route handler (môi trường node đã chạy được).
- Plan 03-06 dùng `makeFakeLockManager`/`makeFakeBroadcastChannelHub` cho test khóa xuyên tab và đồng bộ tab.
- Ready for 03-02.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-14*

## Self-Check: PASSED

Đã kiểm 15 file tạo mới tồn tại và 4 commit `c05785c`, `871153e`, `1dbb66a`, `c53e3dd` có trong git log; acceptance criteria của cả ba task và `<verification>` của plan chạy lại đều PASS.
