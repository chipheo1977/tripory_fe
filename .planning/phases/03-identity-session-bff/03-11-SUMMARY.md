---
phase: 03-identity-session-bff
plan: 11
subsystem: client-session-lifecycle
tags: [session-effects, session-keeper, session-recovery, providers, tanstack-query, toast, broadcast-channel, vitest, tdd]

requires:
  - phase: 03-identity-session-bff
    provides: "03-06: `refreshSession`, `sessionEvents`, `makeQueryClient`, `identity` (hook factory đã lắp), `SESSION_EXPIRED_TOAST`; 03-05: `readAccessExpFromCookieString`, `isSecureCookieEnv`; 03-03: `toSafeNextPath`, `PROACTIVE_LEAD_SEC`, `identityKeys`"
provides:
  - "`modules/identity/ui/use-session-actions.ts`: `useSessionActions()` → `afterSignIn`, `signOut`, `afterPasswordChanged`, `isSigningOut`; hằng `DEFAULT_AFTER_SIGN_IN`"
  - "`modules/identity/ui/session-effects.tsx`: `SessionEffects` (expired, remote-logged-in/out, rearm trên /login|/register)"
  - "`modules/identity/ui/session-keeper.tsx`: `SessionKeeper` (refresh chủ động 120 giây trước hạn)"
  - "`modules/identity/ui/session-recovery.tsx`: `SessionRecovery({ fallback })` (D-24)"
  - "`modules/identity/ui/login-redirect.tsx`: `LoginRedirect` (lưới an toàn của gate)"
  - "`app/providers.tsx`: `Providers` mount ở root layout; `metadata.title.template` = `%s · Tripory`"
affects: [03-12, 03-13, 03-14, 03-15, phase-04, phase-07]

key-files:
  created:
    - apps/web/src/modules/identity/ui/use-session-actions.ts
    - apps/web/src/modules/identity/ui/use-session-actions.test.tsx
    - apps/web/src/modules/identity/ui/session-effects.tsx
    - apps/web/src/modules/identity/ui/session-effects.test.tsx
    - apps/web/src/modules/identity/ui/session-keeper.tsx
    - apps/web/src/modules/identity/ui/session-keeper.test.tsx
    - apps/web/src/modules/identity/ui/session-recovery.tsx
    - apps/web/src/modules/identity/ui/session-recovery.test.tsx
    - apps/web/src/modules/identity/ui/login-redirect.tsx
    - apps/web/src/modules/identity/ui/login-redirect.test.tsx
    - apps/web/src/app/providers.tsx
    - apps/web/src/app/providers.test.tsx
  modified:
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/layout.test.tsx

key-decisions:
  - "`signOut` đặt `onSuccess` ở mức hook `useLogout({ onSuccess })` chứ không ở `mutate(..., { onSuccess })`: callback của `mutate` bị bỏ khi component gọi đã unmount, mà menu đóng ngay khi bấm 'Đăng xuất'."
  - "`SessionRecovery` chặn StrictMode chạy hai lần bằng ref `started`, nên `refreshSession` được gọi đúng một lượt; không dùng cờ hủy trong cleanup vì sẽ làm rơi kết quả của lượt đầu."
  - "`SessionKeeper` nhớ `{ exp, at }` của lần thử gần nhất trong ref (sống qua đổi route) và chặn thử lại cùng `exp` trong 60 giây; hết phiên (`'expired'`) thì không hẹn lại."
  - "`SessionEffects` dựng `next` từ `toSafeNextPath(pathname + search)` rồi mới `encodeURIComponent`; không có đích an toàn thì về `/login` trơn."
  - "`remote-logged-out` dùng `window.location.assign('/')` có chủ đích (xóa sạch state tab, D-22), kèm `eslint-disable` có lý do cho rule `no-location-assign-relative-destination`."

requirements-addressed: [AUTH-03, AUTH-04, AUTH-05, FND-05]
requirements-completed: []

completed: 2026-10-15
---

# Phase 3 Plan 11: Vòng đời phiên phía client (Providers, SessionEffects, SessionKeeper, SessionRecovery) Summary

**Root layout mount `QueryClientProvider` (`retry: false`), `Toast`, `SessionEffects` và `SessionKeeper` qua `Providers`; đăng nhập/đăng xuất/đổi mật khẩu/hết phiên và đồng bộ tab đi qua `useSessionActions` + `SessionEffects` với mọi đích điều hướng qua `toSafeNextPath` hoặc hằng; refresh chủ động và hồi phục D-24 chỉ đi qua `refreshSession()`; `pnpm lint`, `typecheck`, `test` toàn repo xanh (web: 45 file / 708 test)**

## Accomplishments

- **Task 1:** `useSessionActions` giữ đúng thứ tự `afterSignIn`: clear → seed `identityKeys.me` → rearm → announce `logged-in` → `router.replace(next an toàn | /itineraries/mine)` → `router.refresh()` → toast. `signOut` chạy `runLogoutHandlers` → announce `logged-out` → clear → `replace('/')` + `refresh()`, không toast; lỗi thì ở lại trang, không chạy handler. `afterPasswordChanged` không gọi logout (cookie đã xóa ở server), về `/login`, toast D-18. `SessionEffects` xử lý `expired` (chuyển `/login?next=…` + toast một lần, bỏ qua trên `/login` `/register`), `remote-logged-out` (handler rồi điều hướng cứng về `/`), `remote-logged-in` (theo `next` an toàn trên trang auth, `router.refresh()` nơi khác), và rearm `expired` khi vào trang auth.
- **Task 2:** `SessionKeeper` hẹn `exp − 120 s`, kiểm lại khi tab hiện lại/`online`/đổi route, chống lặp 60 giây cùng `exp`, lỗi tạm thời im lặng và thử lại. `SessionRecovery` refresh im lặng rồi `router.refresh()`, `expired` → `emitExpired()`, lỗi tạm thời → `ErrorState` + 'Thử lại'. `LoginRedirect` đưa trang hiện tại vào `next` qua `toSafeNextPath`, chỉ một lượt kể cả StrictMode.
- **Task 3:** `Providers` (`useState(makeQueryClient)`; `SessionEffects` + `SessionKeeper` trong `<Suspense fallback={null}>`; `<Toast />`), `layout.tsx` đổi `title` thành `{ default, template }` và bọc `<Providers>`; root layout không đọc cookie.

## Task Commits

1. Task 1: RED `7ea0cf6` `test(03-11): add tests for useSessionActions and SessionEffects`; GREEN `675ba54` `feat(03-11): add useSessionActions and SessionEffects`
2. Task 2: RED `a075055` `test(03-11): add tests for SessionKeeper, SessionRecovery and LoginRedirect`; GREEN `f3b0b30` `feat(03-11): add SessionKeeper, SessionRecovery and LoginRedirect`
3. Task 3: `96a26d2` `feat(03-11): mount Providers (QueryClient, Toast, session effects) in root layout` (test và code cùng commit vì thay đổi nhỏ)

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Ghi chú

- **TDD:** hai commit RED của Task 1 và 2 chỉ chứa test (chưa có module nên đỏ vì thiếu import); khi viết code xong, test xanh ngay lần chạy đầu nên không có vòng GREEN lặp lại. Không có REFACTOR.
- **`providers.test.tsx`** là file thêm ngoài `files_modified` của plan (kiểm `retry: false`, `Toast`, `SessionEffects`, `SessionKeeper` được mount). Không đổi phạm vi.
- **`route-layouts.test.tsx`** không cần mock `@/app/providers`: test chỉ render layout của nhóm route, không render root layout.
- `.planning/config.json` và `packages/api-client/src/fetch-http-client.ts` là thay đổi có sẵn, không stage; lint/prettier không đỏ vì dấu cách đầu dòng nên không gỡ.
- Không tick checkbox AUTH-03/04/05 trong `REQUIREMENTS.md`: form (03-12), gate `(dashboard)` (03-13) và menu user (03-14) chưa có nên chưa chạy end-to-end. FND-05 đã Complete từ Phase 2.

## Known Stubs

Không có. `SessionRecovery` và `LoginRedirect` chưa được gate dùng (việc của 03-13), nhưng không có dữ liệu giả nối vào UI.

## Threat Model Verification

- **T-03-51 (open redirect):** mọi `router.replace` nhận chuỗi từ `toSafeNextPath` hoặc hằng; test `//evil.com`, `https://evil.com`, `javascript:alert(1)`, `/login` ở `afterSignIn` và `remote-logged-in`, `/login` ở `LoginRedirect`.
- **T-03-52 (refresh đường khác):** `Get-ChildItem apps/web/src/modules -Recurse | Select-String 'fetch\('` = 0 kết quả; keeper và recovery chỉ gọi `refreshSession`; test StrictMode `toHaveBeenCalledTimes(1)`.
- **T-03-53 (lệch đồng hồ):** test fake timers: cùng `exp` thì lần hai không nổ trước 60 giây.
- **T-03-54 (cache tài khoản cũ):** `queryClient.clear()` ở sign-in, sign-out, đổi mật khẩu, `expired`, `remote-logged-in`; có assert.
- **T-03-55 (đăng xuất oan):** chỉ `'expired'` mới `emitExpired`; reject → `ErrorState` hoặc im lặng (test).
- **T-03-56:** chấp nhận như plan. **T-03-57:** không có token trong module UI.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` ở gốc repo: exit 0 (web 45 file / 708 test).
- Acceptance: `use-session-actions.ts` có `toSafeNextPath`, `identityKeys`, `runLogoutHandlers`, `announce("logged-in")`, 'Đã đổi mật khẩu, vui lòng đăng nhập lại'; `session-effects.tsx` có `SESSION_EXPIRED_TOAST`, `window.location.assign`, `remote-logged-out`, `remote-logged-in`; `session-keeper.tsx` có `PROACTIVE_LEAD_SEC`, `visibilitychange`, `online`, `60_000`; `providers.tsx` có `"use client"`, `QueryClientProvider`, `<Toast`, `SessionEffects`, `SessionKeeper`, `<Suspense`, `makeQueryClient`; `layout.tsx` có `template: "%s · Tripory"`, `<Providers>` và không có lời gọi đọc cookie.

## Next Phase Readiness

- 03-12 (form): dùng `useSessionActions().afterSignIn` / `afterPasswordChanged`, reset form trong `onSuccess`.
- 03-13 (gate): truyền `<DashboardLoading />` vào `SessionRecovery fallback`, dùng `LoginRedirect`.
- 03-14: `signOut` / `isSigningOut` cho menu người dùng.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-15*

## Self-Check: PASSED

Đã kiểm 14 file nguồn/test tồn tại và 5 commit `7ea0cf6`, `675ba54`, `a075055`, `f3b0b30`, `96a26d2` có trong git log.
