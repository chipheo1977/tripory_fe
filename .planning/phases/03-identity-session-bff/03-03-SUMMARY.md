---
phase: 03-identity-session-bff
plan: 03
subsystem: identity-domain
tags: [identity, domain, application, ports, open-redirect, password-rules, token-freshness, vitest, tdd]

requires:
  - phase: 03-identity-session-bff
    provides: "Plan 03-01: khung `@tripory/identity` theo `contextPackage()`, barrel `domain`/`application` rỗng, `src/index.ts` = `export * from './domain'; export * from './application';`"
  - phase: 02-http-shared-kernel
    provides: "`UserId` branded và `parseUserId` trong `@tripory/shared-kernel`"
provides:
  - "`toSafeNextPath(raw)`: chỉ trả path nội bộ, chặn `//`, `\\`, ký tự điều khiển/khoảng trắng, scheme, `/login`, `/register`, `/api`, `/_next`, chuỗi > 2048 ký tự"
  - "`STALE_AT_SEC` 30, `REFRESH_IF_BELOW_SEC` 150, `PROACTIVE_LEAD_SEC` 120, `remainingSeconds`, `isFresh` (nowSec luôn là tham số)"
  - "`Viewer` (readonly) và `viewerDisplayName`"
  - "`REGISTER_PASSWORD_RULES` (1 mục), `CHANGE_PASSWORD_RULES` (6 mục theo D-34), `evaluatePasswordRules`, type `PasswordRuleId`/`PasswordRule`/`PasswordRuleResult`"
  - "Port `SessionGateway`, `ProfileReader` và `LoginInput`/`RegisterInput`/`ChangePasswordInput`, export (type) từ `@tripory/identity`"
affects: [03-04, 03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12, phase-03-identity]

tech-stack:
  added: []
  patterns: [pure-domain-null-on-invalid, rules-as-data, time-as-parameter, type-only-ports-barrel]

key-files:
  created:
    - packages/identity/src/domain/viewer.ts
    - packages/identity/src/domain/viewer.test.ts
    - packages/identity/src/domain/safe-next-path.ts
    - packages/identity/src/domain/safe-next-path.test.ts
    - packages/identity/src/domain/token-freshness.ts
    - packages/identity/src/domain/token-freshness.test.ts
    - packages/identity/src/domain/password-rules.ts
    - packages/identity/src/domain/password-rules.test.ts
    - packages/identity/src/application/ports.ts
  modified:
    - packages/identity/src/domain/index.ts
    - packages/identity/src/application/index.ts
    - packages/identity/src/exports.test.ts

key-decisions:
  - "`toSafeNextPath` so khớp theo đoạn path: `/login`, `/register`, `/api`, `/_next` bị chặn cùng con của chúng (`/login/x`), còn `/loginfoo`, `/registered`, `/apix` vẫn hợp lệ."
  - "Kiểm ký tự điều khiển/khoảng trắng bằng vòng lặp `charCodeAt` (`<= 0x20` hoặc `0x7f`) thay vì regex `/[\\u0000-\\u0020\\u007f]/`, để khỏi vướng `no-control-regex`."
  - "`evaluatePasswordRules` không đặt khóa `min` cho rule không có `min` (thay vì `min: undefined`)."
  - "`application/index.ts` dùng `export type * from './ports'`: ports chỉ có type, không sinh runtime."
  - "Rule mật khẩu mang `test()` là function nhưng chỉ dùng trong client/hook; không truyền qua ranh giới Server → Client Component."

patterns-established:
  - "Domain thuần: `parseX`/`toX` trả `null` thay vì ném lỗi; hằng ngưỡng gom một file; thời gian là tham số."
  - "Rule dạng dữ liệu `{ id, min?, test }` + `evaluate*` trả kết quả cùng thứ tự; copy tiếng Việt thuộc app."
  - "Test bảng `it.each([...] as const)` kèm tên test tiếng Việt, chỉ import `vitest` và file cùng thư mục."

# Plan này chỉ giao các hàm thuần và port; chưa có proxy, route, form hay menu nên chưa tick hoàn thành (xem Deviations mục 4).
requirements-addressed: [AUTH-05, AUTH-06, AUTH-07, AUTH-03]
requirements-completed: []

duration: 6 min
completed: 2026-10-14
---

# Phase 3 Plan 3: Domain và application của `@tripory/identity` Summary

**`toSafeNextPath` chặn open redirect và vòng lặp `/login` bằng bảng 46 ca, ba ngưỡng tươi token gom một file (30/150/120), bộ rule mật khẩu khớp validator BE (đăng ký 1 mục, đổi mật khẩu đúng 6 mục, `special` chỉ `! ? * @ # $ % ^ & + =`), `Viewer` và port `SessionGateway`/`ProfileReader` export từ `@tripory/identity`; `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-14T21:47:49+07:00 (sau commit docs của 03-02)
- **Completed:** 2026-10-14T21:53:05+07:00
- **Tasks:** 2 (cả hai TDD, RED rồi GREEN)
- **Files:** 12 (9 tạo mới, 3 sửa; không tính các file `.planning`)

## Accomplishments

- `safe-next-path.ts` theo RESEARCH Pattern 5, không `URL`, không đồng hồ. Test 46 ca: 9 ca hợp lệ (gồm `/%2F%2Fevil.com` đã mã hóa và ca biên đúng 2048 ký tự), đầu vào không phải string, 18 ca open redirect (`//`, `/\`, tab/xuống dòng/CR sau dấu `/`, scheme `https`/`http`/`javascript`/`data`, `evil.com`, khoảng trắng, NUL, DEL), 13 ca vòng lặp và route nội bộ (`/login…`, `/register…`, `/api…`, `/_next/…`).
- `token-freshness.ts`: ba hằng kèm comment lý do, `remainingSeconds`, `isFresh`. Test khóa ca biên `isFresh(1000, 970, 30) === false` và `isFresh(1000, 969, 30) === true`, và `STALE < PROACTIVE_LEAD < REFRESH_IF_BELOW` (để route refresh thật sự gọi BE lúc SessionKeeper hẹn giờ).
- `viewer.ts`: `Viewer` readonly với `avatarUrl: string | null`, `viewerDisplayName` rơi về email khi họ tên rỗng hoặc toàn khoảng trắng.
- `password-rules.ts`: comment ghi nguồn `RegisterCommandValidator.cs:19-26` và `ChangePasswordCommandValidator.cs:12-19`, nói rõ đây là chép luật BE có chủ đích theo D-27. Test khóa độ dài 1 và 6, thứ tự 6 id, `special` nhận đủ 11 ký tự và từ chối `- _ . ~ , ; / ( ` cùng khoảng trắng, chữ hoa/thường/số chỉ ASCII (`Đ`, `ă`, chữ số Arabic-Indic không tính), `differentFromCurrent` (rỗng, trùng, khác chỉ hoa thường, `current` bỏ trống), mật khẩu không bị trim.
- `ports.ts`: type-only, `Readonly<{...}>`. Hai barrel `domain`/`application` đã nối, entry gốc phơi toàn bộ.

## Task Commits

1. **Task 03-03-01: `toSafeNextPath`, ngưỡng tươi token, `Viewer`**
   - RED `c8704dd` `test(03-03): add failing tests for toSafeNextPath, token freshness and Viewer`
   - GREEN `54e39ba` `feat(03-03): add toSafeNextPath, token freshness thresholds and Viewer`
2. **Task 03-03-02: Rule mật khẩu và port**
   - RED `991896e` `test(03-03): add failing tests for password rules and identity public entry`
   - GREEN `4c609a1` `feat(03-03): add BE-aligned password rules and SessionGateway/ProfileReader ports`

Không cần commit REFACTOR. Cả hai lần RED đều chạy và xác nhận đỏ trước khi viết code (lần 1: ba module chưa tồn tại; lần 2: `password-rules` chưa có và entry gốc thiếu tên export).

## Files Created/Modified

- `packages/identity/src/domain/viewer.ts`, `safe-next-path.ts`, `token-freshness.ts`, `password-rules.ts` và bốn file `*.test.ts` cùng thư mục.
- `packages/identity/src/application/ports.ts`: `LoginInput`, `RegisterInput`, `ChangePasswordInput`, `SessionGateway`, `ProfileReader`.
- `packages/identity/src/domain/index.ts`: `export *` bốn module. `packages/identity/src/application/index.ts`: `export type * from './ports'`.
- `packages/identity/src/exports.test.ts`: kiểm entry gốc phơi các hàm/hằng domain và, bằng `expectTypeOf`, các type port và `Viewer`.

## Decisions Made

Xem `key-decisions`. Ngoài ra theo đúng `<action>` của plan; `boundaries.mjs` không đổi, không thêm dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Thiếu kiểm chứng cho must_have] Mở rộng `exports.test.ts`**
- **Found during:** Task 2
- **Issue:** `must_haves` đòi `Viewer`, `SessionGateway`, `ProfileReader` "được export từ entry gốc `@tripory/identity`", nhưng `exports.test.ts` (không nằm trong `files_modified` của plan) chỉ khẳng định entry là module hợp lệ, nên không có gì khóa điều đó. Ports là type thuần nên runtime không thấy được.
- **Fix:** Thêm 2 test: `Object.keys(publicApi)` chứa các tên runtime của domain (dùng `arrayContaining` để các plan sau thêm export không phải sửa), và `expectTypeOf` cho chữ ký `SessionGateway`/`ProfileReader` cùng `RegisterInput` kế thừa `LoginInput`. Phần type được `tsc --noEmit` kiểm (vitest không chạy type-check).
- **Files modified:** `packages/identity/src/exports.test.ts`
- **Commit:** `991896e`

### Lựa chọn cài đặt lệch nhẹ so với văn bản plan (cùng hành vi)

**2. Vòng lặp `charCodeAt` thay vì regex `/[\u0000-\u0020\u007f]/`.** Plan nêu regex. Tôi chọn vòng lặp ngay từ đầu để khỏi phải thêm `eslint-disable` cho `no-control-regex` (chưa thử bản regex để xem lint có báo hay không). Cùng tập ký tự bị chặn (`<= 0x20` và `0x7f`), test bảng phủ tab, `\n`, `\r`, khoảng trắng, NUL, DEL.

**3. Chặn thêm `/_next` đứng riêng.** Plan liệt kê `/_next/`. Tôi dùng chung một quy tắc "đúng bằng gốc hoặc bắt đầu bằng gốc + `/`" cho cả bốn gốc (`/login`, `/register`, `/api`, `/_next`) nên `/_next` đứng riêng cũng bị chặn. Không ảnh hưởng ca nào plan yêu cầu; `/loginfoo`, `/apix` vẫn hợp lệ.

### Bước workflow cố ý bỏ qua

**4. [Chủ đích] Không chạy `requirements mark-complete AUTH-03 AUTH-05 AUTH-06 AUTH-07`**
- **Lý do:** Giống quyết định của 03-01. Plan này chỉ giao hàm thuần và port. Chưa có `proxy.ts`, route refresh, form đổi mật khẩu hay menu user, nên đánh Complete sẽ sai sự thật và làm verifier/tiến độ hiểu nhầm. `requirements-completed` ở frontmatter để trống.
- **Hệ quả:** AUTH-05 được tick khi `proxy.ts` và form dùng `toSafeNextPath`; AUTH-06 khi form đổi mật khẩu hiện checklist; AUTH-07 khi menu user chạy; AUTH-03 khi refresh single-flight hoạt động (các plan 03-05 đến 03-12) hoặc ở bước verify phase.

### Ghi chú về comment trong code

Hai comment đầu file được viết lại để không chứa các chuỗi mà acceptance criteria của Task 1 dùng làm mẫu cấm (`Date.now`, `new Date`): comment của `token-freshness.ts` ghi "đồng hồ toàn cục" thay vì tên API. Không đổi hành vi.

---

**Total deviations:** 1 auto-fix (Rule 2), 2 lựa chọn cài đặt lệch nhẹ, 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `boundaries.mjs`, không nới allowlist.

## Issues Encountered

- `.planning/config.json` (khóa của gsd tooling) và `packages/api-client/src/fetch-http-client.ts` (một dấu cách đầu dòng 1) là thay đổi có sẵn từ trước plan, không thuộc plan này nên không stage. `pnpm lint` và `typecheck` toàn repo vẫn xanh với dấu cách đó, nên không phải gỡ.
- Git cảnh báo "LF will be replaced by CRLF" khi add file mới (cấu hình autocrlf của máy), không ảnh hưởng.
- Cảnh báo Vite về `vitest.config.ts` của `apps/web` có sẵn từ Phase 1, không ảnh hưởng kết quả.

## Known Stubs

Không có stub trong phạm vi plan này. `infrastructure/index.ts` và `react/index.ts` của `@tripory/identity` vẫn là `export {};` từ 03-01 và được thay ở các plan sau (03-04 trở đi).

## Threat Model Verification

- **T-03-06 (open redirect qua `?next=`):** `toSafeNextPath` chặn `//`, `\`, ký tự điều khiển/khoảng trắng, scheme và `/api`, `/login`, `/register`; bảng test 46 ca (≥ 20 như plan yêu cầu), có `/\t/evil.com`, `javascript:alert(1)`, `https://evil.com`, đối chứng `/%2F%2Fevil.com` hợp lệ.
- **T-03-07 (vòng lặp `/login?next=/login`):** `/login`, `/login?next=/x`, `/login#x`, `/login/`, `/register…` đều trả `null`.
- **T-03-08 (mật khẩu bị trim/log):** rule nhận chuỗi thô, không trim, không log; test `' Abcdef1! '` đạt đủ 6 mục và khoảng trắng đầu/cuối vẫn được đếm vào độ dài.
- **T-03-09 (FE lệch BE):** comment ghi nguồn file:dòng của cả hai validator BE; test khóa 11 ký tự đặc biệt được nhận và 9 ký tự không được nhận, cùng độ dài bộ rule (1 và 6).

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan (không endpoint, không truy cập file, không đổi schema).

## Verification

- `pnpm --filter @tripory/identity test` — 5 file, 121 test xanh (`safe-next-path` 46, `password-rules` 52, `token-freshness` 14, `viewer` 6, `exports` 3).
- `pnpm --filter @tripory/identity lint` và `typecheck` — exit 0.
- Acceptance Task 1: không có `new URL|Date.now|new Date|navigator|window.` trong file domain không phải test; `token-freshness.ts` chứa `STALE_AT_SEC = 30`, `REFRESH_IF_BELOW_SEC = 150`, `PROACTIVE_LEAD_SEC = 120`; `safe-next-path.test.ts` chứa `//evil.com`, `/login?next=/x`, `/api/bff/users`, `javascript:alert(1)`, `/%2F%2Fevil.com` và dùng `it.each`.
- Acceptance Task 2: regex `special` `[!?*@#$%^&+=]` có mặt, comment chứa `ChangePasswordCommandValidator`; test có `'a-'`, `'a_'`, `'a.'` bị từ chối, `toHaveLength(6)` và `toHaveLength(1)`; `ports.ts` có `SessionGateway`, `ProfileReader`, `ChangePasswordInput`.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh (`@tripory/web` 18 file, 133 test; không đụng `token-guard.test.ts` flake).

## User Setup Required

None.

## Next Phase Readiness

- Plan 03-04 (ACL/infrastructure) import `Viewer`, `SessionGateway`, `ProfileReader`, các `*Input` từ `@tripory/identity` và cài `SessionGateway`/`ProfileReader` ở `./http`.
- `proxy.ts`, route refresh, `SessionKeeper`, layout `(dashboard)` dùng `toSafeNextPath` và ba hằng ngưỡng từ cùng một nguồn.
- Form đăng ký/đổi mật khẩu truyền `REGISTER_PASSWORD_RULES`/`CHANGE_PASSWORD_RULES` vào checklist và dùng cùng predicate cho schema Zod ở app (copy tiếng Việt của từng rule thuộc app).
- Ready for 03-04.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-14*

## Self-Check: PASSED

Đã kiểm: 9 file tạo mới và 3 file sửa tồn tại; 4 commit `c8704dd`, `54e39ba`, `991896e`, `4c609a1` có trong git log; acceptance criteria của cả hai task và `<verification>` chạy lại đều PASS.
