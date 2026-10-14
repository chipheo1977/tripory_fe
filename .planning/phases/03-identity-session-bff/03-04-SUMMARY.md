---
phase: 03-identity-session-bff
plan: 04
subsystem: identity-infrastructure
tags: [identity, acl, zod, jwt-claims, http-gateway, react-query, hooks, vitest, tdd]

requires:
  - phase: 03-identity-session-bff
    provides: "Plan 03-03: `Viewer`, `viewerDisplayName`, `SessionGateway`, `ProfileReader`, `LoginInput`/`RegisterInput`/`ChangePasswordInput` ở entry gốc `@tripory/identity`"
  - phase: 02-http-shared-kernel
    provides: "`HttpClient`/`HttpRequest` (cờ `sessionRefresh`), `makeApiError`, `parseUserId`"
provides:
  - "`@tripory/identity/http`: `createHttpSessionGateway`, `createHttpProfileReader`, `parseAccessTokenClaims`, `normalizeAvatarUrl`, `toViewer`, schema `userDto`/`authResponseDto`/`tokenResponseDto`/`userProfileDto`/`viewerDto`, type `AccessTokenClaims`"
  - "`@tripory/identity/react`: `createIdentityHooks({ gateway, profile })` (`useLogin`, `useRegister`, `useChangePassword`, `useLogout`, `useMyProfile(enabled)`) và `identityKeys.me`"
  - "Fixture BE dùng chung trong package: payload JWT thật, `AuthResponse`, `TokenResponse`, `UserProfileResponse`, 7 envelope lỗi (`Token.*`, `Auth.*`, `NotEqualValidator`, `User.EmailAlreadyExists`)"
affects: [03-05, 03-06, 03-07, 03-09, 03-11, 03-12, 03-13, phase-03-identity]

tech-stack:
  added: []
  patterns: [zod-acl-at-boundary, tolerant-claim-parser, field-whitelist-body, hook-factory-with-injected-ports, default-error-from-register]

key-files:
  created:
    - packages/identity/src/infrastructure/dto.ts
    - packages/identity/src/infrastructure/dto.test.ts
    - packages/identity/src/infrastructure/access-token-claims.ts
    - packages/identity/src/infrastructure/access-token-claims.test.ts
    - packages/identity/src/infrastructure/mappers.ts
    - packages/identity/src/infrastructure/mappers.test.ts
    - packages/identity/src/infrastructure/fixtures.ts
    - packages/identity/src/infrastructure/http-session-gateway.ts
    - packages/identity/src/infrastructure/http-session-gateway.test.ts
  modified:
    - packages/identity/src/infrastructure/index.ts
    - packages/identity/src/react/index.ts
    - packages/identity/src/exports.test.ts

key-decisions:
  - "Gateway chỉ chép đúng các trường hợp đồng vào body (`{ email, password }`, `{ email, password, fullName }`, `{ currentPassword, newPassword }`), nên `confirmPassword` của form không bao giờ ra khỏi trình duyệt."
  - "`login`/`register`/`logout` đặt `sessionRefresh: false` (đúng 3 chỗ); `changePassword` và `me()` để mặc định để 401 `session.expired` được refresh rồi phát lại."
  - "`toViewer` chỉ chép 5 trường và ném `Error` khi id không phải GUID; `viewerDto` bỏ khóa lạ nên token lọt vào phản hồi cũng không đi tiếp."
  - "`bio` và `avatarUrl` của `userDto` nhận `null` (`nullish`) dù BE khai báo `AvatarUrl` không null; `normalizeAvatarUrl` đã xử lý `null`/`undefined`."
  - "Hook dùng `DefaultError` của TanStack Query thay vì `Error`: khi app khai báo `Register['defaultError']` (plan 03-06), kiểu lỗi trong `onError` của form tự theo, không đụng nhau."
  - "`viewerResponseDto` (`{ viewer }`) nằm ở `dto.ts` để gateway dùng, không export ra `./infrastructure`; route server ở 03-07 chỉ cần `viewerDto`."

patterns-established:
  - "ACL: mọi body từ mạng đi qua `.parse` trong adapter; lỗi parse là lỗi thường, không bao giờ trả DTO hỏng cho UI."
  - "Adapter nhận `HttpClient` qua factory, không state toàn cục; test bằng `vi.fn<HttpClient['send']>` và `toHaveBeenCalledWith(expect.objectContaining(...))`."
  - "Hook factory nhận port, mutation nhận `options` (trừ `mutationFn`) để app gắn `meta`; package không test hook, test qua component ở app."

# Plan này chỉ giao ACL + adapter + hook factory; chưa có route, composition hay form nên chưa tick hoàn thành (xem Deviations mục 3).
requirements-addressed: [AUTH-01, AUTH-02, AUTH-06, AUTH-07]
requirements-completed: []

duration: 8 min
completed: 2026-10-14
---

# Phase 3 Plan 4: Infrastructure và react của `@tripory/identity` Summary

**Zod ACL cho `AuthResponse`/`TokenResponse`/`UserProfileResponse`, parser claim JWT khóa bằng payload thật của BE (URI dài `nameidentifier`/`emailaddress`, nhận cả `nameid`/`sub`/`email`), avatar mặc định chung của BE thành `null`, gateway HTTP chỉ tắt refresh ở login/register/logout, và `createIdentityHooks` cho TanStack Query; `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-10-14T21:56+07:00 (sau commit docs của 03-03)
- **Completed:** 2026-10-14T22:05+07:00
- **Tasks:** 2 (cả hai TDD, RED rồi GREEN)
- **Files:** 12 (9 tạo mới, 3 sửa; không tính các file `.planning`)

## Accomplishments

- `dto.ts`: `userDto`, `authResponseDto`, `tokenResponseDto` (không có `user`), `userProfileDto`, `viewerDto`, `viewerResponseDto`. Test khóa: thiếu từng khóa bắt buộc thì parse thất bại, envelope lỗi của BE không parse thành DTO thành công, khóa token thừa bị bỏ.
- `access-token-claims.ts`: lấy claim URI dài của BE, nhận dạng ngắn, URI ưu tiên hơn `nameid` hơn `sub`. `null` khi thiếu hoặc sai id/email/`exp` và với payload `null`/chuỗi/số/mảng (16 ca bảng). Dấu tiếng Việt trong `name` giữ nguyên. Không giải mã base64 ở package.
- `mappers.ts`: `DEFAULT_AVATAR_URL` kèm nguồn `User.cs:11,19,54`, `normalizeAvatarUrl` (null, rỗng, khoảng trắng, avatar chung có hoặc không có khoảng trắng bao quanh → `null`; URL khác giữ nguyên và trim), `toViewer` (5 trường, ném `Error` khi id hỏng).
- `http-session-gateway.ts`: `createHttpSessionGateway(http)` và `createHttpProfileReader(http)`. Test khẳng định `changePassword` và `me()` gửi request không có khóa `sessionRefresh`; lỗi `ApiError` của `http.send` lan nguyên (`toBe`) ở cả bốn lệnh; body sai hình dạng (thiếu `viewer`, `viewer: null`, nguyên `AuthResponse`, thiếu email, id không phải GUID) thì ném lỗi.
- `react/index.ts`: `createIdentityHooks` và `identityKeys`; `useMyProfile(enabled)` có `staleTime: 5 * 60_000`. Chỉ import `react`-query, `../application`, `../domain`.
- `exports.test.ts`: entry gốc có đủ 10 tên domain và không có bất kỳ tên adapter hoặc hook nào (`it.each` 12 tên); `./infrastructure` có 10 tên; `./react` có 2 tên; mỗi subpath không lẫn của nhau.

## Task Commits

1. **Task 03-04-01: DTO Zod, claim JWT, mapper và fixture**
   - RED `ba2da8b` `test(03-04): add failing tests for BE DTO schemas, JWT claims and viewer mapper`
   - GREEN `d75fe50` `feat(03-04): add BE DTO schemas, JWT claim parser and viewer mapper`
2. **Task 03-04-02: Gateway HTTP, profile reader, hook factory, barrel và exports.test**
   - RED `6f526ab` `test(03-04): add failing tests for HTTP session gateway, profile reader and subpath exports`
   - GREEN `0f36ae9` `feat(03-04): add HTTP session gateway, profile reader and identity hook factory`

Không cần commit REFACTOR. Cả hai lần RED đều chạy và xác nhận đỏ trước khi viết code (lần 1: `./dto` chưa tồn tại; lần 2: `./http-session-gateway` chưa tồn tại và `./react`, `./infrastructure` chưa phơi tên nào).

## Files Created/Modified

- `packages/identity/src/infrastructure/dto.ts`, `access-token-claims.ts`, `mappers.ts`, `http-session-gateway.ts` và bốn file `*.test.ts` cùng thư mục (dto, claims, mappers, gateway).
- `packages/identity/src/infrastructure/fixtures.ts`: fixture BE thật, không import `vitest`, không qua barrel.
- `packages/identity/src/infrastructure/index.ts`: barrel `./http` (ghi chú chỉ composition được import).
- `packages/identity/src/react/index.ts`: `identityKeys`, `createIdentityHooks`.
- `packages/identity/src/exports.test.ts`: mở rộng kiểm ranh giới export cho cả ba entry.

## Decisions Made

Xem `key-decisions`. Ngoài ra theo đúng `<action>` của plan; `boundaries.mjs` không đổi, không thêm dependency, `packages/api-client` không đổi.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Thiếu kiểm soát dữ liệu rời trình duyệt] Gateway chỉ chép trường hợp đồng vào body**
- **Found during:** Task 2
- **Issue:** Plan viết `body: {email,password}` nhưng gateway nhận `LoginInput`/`RegisterInput`/`ChangePasswordInput` là object do form truyền. Form có ô "Nhập lại mật khẩu" (D-28); nếu form truyền nguyên giá trị RHF thì `confirmPassword` bị gửi lên route, rồi lên log hoặc BFF. Truyền thẳng `input` làm `body` không bị kiểu chặn vì object khác literal vẫn khớp kiểu.
- **Fix:** Destructure đúng các trường (`login({ email, password })` ...) và dựng body mới. Thêm 3 test cho login, register, changePassword khẳng định `confirmPassword` bị bỏ.
- **Files modified:** `http-session-gateway.ts`, `http-session-gateway.test.ts`
- **Commit:** `6f526ab` (test), `0f36ae9` (code)

### Lựa chọn cài đặt lệch nhẹ so với văn bản plan (cùng hành vi)

**2. `viewerResponseDto` thêm vào `dto.ts`, `exports.test.ts` mở rộng thêm `./react`.** Plan liệt kê schema `viewerDto`... nhưng gateway cần schema cho `{ viewer }`; tôi thêm `viewerResponseDto` làm nội bộ (không export khỏi `./infrastructure`). `exports.test.ts` ngoài các khẳng định plan nêu còn kiểm `./react` có `createIdentityHooks`/`identityKeys` và không lẫn adapter, vì `react/index.ts` cũng là thứ plan này giao.

### Bước workflow cố ý bỏ qua

**3. [Chủ đích] Không chạy `requirements mark-complete AUTH-01 AUTH-02 AUTH-06 AUTH-07`**
- **Lý do:** Giống quyết định của 03-01 và 03-03. Plan này chỉ giao ACL, adapter và hook factory. Chưa có route `/api/auth/*`, cookie, form đăng ký/đăng nhập, form đổi mật khẩu hay menu user, nên đánh Complete sẽ sai sự thật. `requirements-completed` ở frontmatter để trống, `requirements-addressed` ghi đủ bốn id.
- **Hệ quả:** AUTH-01/02 được tick khi route + form chạy (03-07, 03-12); AUTH-06 khi form đổi mật khẩu hiện checklist; AUTH-07 khi menu user chạy (03-13), hoặc ở bước verify phase.

### Ghi chú về comment trong code

Comment của `access-token-claims.ts` và `http-session-gateway.ts` được viết để không chứa các chuỗi mà acceptance criteria dùng làm mẫu cấm hoặc đếm (`Buffer`, `atob`, `navigator`, `window.`, `next/`, và cụm `sessionRefresh` kèm giá trị tắt ngoài ba lời gọi thật). Không đổi hành vi.

---

**Total deviations:** 1 auto-fix (Rule 2), 1 lựa chọn cài đặt lệch nhẹ, 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `boundaries.mjs`, không nới allowlist.

## Issues Encountered

- `.planning/config.json` (khóa của gsd tooling) và `packages/api-client/src/fetch-http-client.ts` (một dấu cách đầu dòng 1) là thay đổi có sẵn từ trước plan, không thuộc plan này nên không stage. `pnpm lint` và `typecheck` toàn repo vẫn xanh với dấu cách đó, nên không phải gỡ.
- Lint báo `no-unused-vars` cho tham số `_request` của fake `send` và biến `_omitted` trong test; sửa bằng `vi.fn<HttpClient['send']>(async () => ...)` và dựng object không có khóa, không dùng `eslint-disable`. Typecheck báo excess property cho `confirmPassword` khi truyền literal trực tiếp, sửa bằng gán biến trước.
- Git cảnh báo "LF will be replaced by CRLF" khi add file mới (cấu hình autocrlf của máy), không ảnh hưởng.
- `token-guard.test.ts` flake đã biết không xuất hiện trong lần chạy `pnpm test` cuối.

## Known Stubs

Không có stub trong phạm vi plan này. Hook ở `react/index.ts` chưa có test ở package theo đúng plan (hook được test qua component ở `apps/web`, plan 03-12).

## Threat Model Verification

- **T-03-10 (DTO sai hình dạng lọt vào UI):** gateway `.parse` bằng Zod; test body thiếu `viewer`, `viewer: null`, nguyên `AuthResponse`, thiếu email, id không phải GUID đều ném lỗi, không trả `Viewer`.
- **T-03-11 (claim giả, accept):** comment trên `parseAccessTokenClaims` ghi rõ không kiểm chữ ký, chỉ dùng hiển thị và đoán độ tươi; quyền thật do BE xác thực Bearer.
- **T-03-12 (token lọt vào kết quả):** `viewerDto` không có token; `toViewer` chép đúng 5 trường; test khẳng định `Object.keys(viewer)` đúng 5 khóa và `JSON.stringify(viewer)` không chứa `accessToken|refreshToken|expiresAt` ngay cả khi route gửi kèm.
- **T-03-13 (refresh lặp khi login/register/logout trả 401):** `sessionRefresh: false` xuất hiện đúng 3 lần trong `http-session-gateway.ts`; `changePassword` cố ý đi qua refresh, test khẳng định request không có khóa `sessionRefresh`.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan (không endpoint, không truy cập file, không đổi schema; package không đọc cookie hay giải mã token).

## Verification

- `pnpm --filter @tripory/identity test` — 9 file, 244 test xanh (từ 121 ở 03-03). `lint` và `typecheck` exit 0.
- `pnpm --filter @tripory/config test` — 104 test xanh.
- Acceptance Task 1: 2 mẫu URI claim trong `access-token-claims.ts`; mẫu dicebear trong `mappers.ts`; không có `Buffer|atob|btoa|navigator|window.` ở file không phải test của `infrastructure`; `fixtures.ts` không import `vitest` và chứa `Token.Compromised`, `NotEqualValidator`, `Auth.InvalidCurrentPassword`; test có ca payload tiếng Việt có dấu và ca `exp` thiếu trả `null`.
- Acceptance Task 2: `sessionRefresh: false` đúng 3 dòng (login, register, logout); `react/index.ts` không có `from '../infrastructure`, `next/`, `react-dom` và có `identityKeys`, `staleTime: 5 * 60_000`; `exports.test.ts` có `createHttpSessionGateway` khẳng định `false` cho entry gốc và `true` cho `./infrastructure`.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh (`@tripory/web` 18 file, 133 test; `@tripory/ui-web` 31 file, 180 test).

## User Setup Required

None.

## Next Phase Readiness

- Plan 03-05 (server composition) import từ `@tripory/identity/http`: `authResponseDto`/`tokenResponseDto` để parse phản hồi BE trong route login/register/refresh, `parseAccessTokenClaims` để đọc cookie access (sau khi giải mã base64 bằng `Buffer` ở server), `viewerDto`/`toViewer` để dựng body `{ viewer }` trả browser.
- Plan 03-06 lắp `createHttpSessionGateway(authHttp)` và `createHttpProfileReader(bffHttp)` vào `createIdentityHooks`, khai báo `Register { mutationMeta, defaultError }` cho QueryClient.
- Route `/api/auth/login|register` (03-07) phải trả đúng `{ viewer: { id, email, fullName, handle, avatarUrl } }` để khớp `viewerResponseDto`; `/logout` và `/change-password` trả `data: null`.
- Ready for 03-05.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-14*

## Self-Check: PASSED

Đã kiểm: 9 file tạo mới và 3 file sửa tồn tại; 4 commit `ba2da8b`, `d75fe50`, `6f526ab`, `0f36ae9` có trong git log; acceptance criteria của cả hai task và `<verification>` chạy lại đều PASS.
