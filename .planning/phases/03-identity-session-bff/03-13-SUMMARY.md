---
phase: 03-identity-session-bff
plan: 13
subsystem: header-session-gate
tags: [identity, header, user-menu, suspense, cache-components, dashboard-gate, a11y, vitest]

requires:
  - phase: 03-identity-session-bff
    provides: "03-02: `DropdownMenu*` (`DropdownMenuLinkItem`, `align`), `Avatar`, `Badge`, `Skeleton`; 03-04/03-06: `identity.useMyProfile`; 03-09: `getViewer`, `getSessionKind`, `decideDashboardGate`; 03-11: `useSessionActions`, `LoginRedirect`, `SessionRecovery`"
provides:
  - "`UserMenu({ viewer })` (client) và `GuestLoginButton` (client)"
  - "`AccountSlot` (async Server Component) chọn menu hoặc nút khách theo phiên"
  - "`AppHeader({ account })`, `AppShell` bọc `AccountSlot` trong `<Suspense>` với Skeleton tròn 32px"
  - "`DashboardSessionGate` và layout `(dashboard)` có lưới an toàn phiên"
affects: [03-14, 03-15]

key-files:
  created:
    - apps/web/src/components/account-slot.tsx
    - apps/web/src/components/account-slot.test.tsx
    - apps/web/src/modules/identity/ui/guest-login-button.tsx
    - apps/web/src/modules/identity/ui/guest-login-button.test.tsx
    - apps/web/src/modules/identity/ui/dashboard-session-gate.tsx
    - apps/web/src/modules/identity/ui/dashboard-session-gate.test.tsx
  modified:
    - apps/web/src/components/user-menu.tsx
    - apps/web/src/components/user-menu.test.tsx
    - apps/web/src/components/app-header.tsx
    - apps/web/src/components/app-header.test.tsx
    - apps/web/src/components/app-shell.tsx
    - apps/web/src/components/app-shell.test.tsx
    - apps/web/src/app/(dashboard)/layout.tsx
    - apps/web/src/app/route-layouts.test.tsx
    - apps/web/src/app/not-found.test.tsx

key-decisions:
  - "`GuestLoginButton` là `next/link` gắn `buttonVariants({ variant: 'secondary', size: 'md' })`, không dùng `Button render={<Link />}`: Base UI Button với phần tử không native gán `role=\"button\"` làm mất vai trò link (cùng quyết định với nút 'Hủy' ở 03-12)."
  - "`UserMenu` lấy avatar từ `identity.useMyProfile(true)` (rơi về `viewer.avatarUrl` rồi chữ cái đầu); lỗi query bị bỏ qua, không toast. Tên/email lấy từ `viewer` do server truyền xuống nên render header không gọi BE."
  - "`AccountSlot` là nơi duy nhất đọc cookie của header và chỉ truyền `viewer` (không có token) sang client; `AppShell` bọc nó trong `<Suspense>` với `Skeleton variant=\"circle\"` `size-control-sm`, fallback không chứa chữ 'Đăng nhập' (D-11)."
  - "`DashboardSessionGate` nhận `loading` qua prop thay vì import `app/(dashboard)/loading` để module không phụ thuộc ngược vào `app/`; layout đặt gate bên trong `<Suspense fallback={<Loading />}>` vì gate đọc cookie."
  - "Mục 'Hồ sơ'/'Tin nhắn' là `DropdownMenuItem disabled` (aria-disabled, không href) kèm Badge 'Sắp có' theo D-15; Phase 6/7 bật bằng cách đổi sang `DropdownMenuLinkItem`."

requirements-addressed: [AUTH-07, AUTH-04, AUTH-05, AUTH-03]
requirements-completed: []

completed: 2026-10-15
---

# Phase 3 Plan 13: Menu user, nút khách và gate `(dashboard)` Summary

**Header có ba trạng thái theo phiên (Skeleton tròn 32px lúc đọc phiên, nút 'Đăng nhập' kèm `?next=` cho khách, `UserMenu` có avatar/tên/email, mục disabled 'Sắp có' và 'Đăng xuất' cho người đã đăng nhập) và layout `(dashboard)` có `DashboardSessionGate` (`none` → đăng nhập, `stale|invalid` → hồi phục im lặng, `fresh` → render); `pnpm lint`, `typecheck`, `test` (web: 54 file / 774 test) và `pnpm build` đều xanh**

## Accomplishments

- **Task 1 (`UserMenu`, `GuestLoginButton`):** trigger `aria-label="Menu tài khoản: {tên}"` (rơi về email khi `fullName` rỗng), mobile chỉ avatar, từ `sm` có tên cắt `truncate` + `max-w-(--user-menu-name-max-width)`. Popup `align="end"`: nhóm tên + email, 'Lịch trình của tôi' → `/itineraries/mine`, 'Hồ sơ' và 'Tin nhắn' disabled kèm 'Sắp có' (tới được bằng mũi tên, click không làm gì), 'Đổi mật khẩu' → `/settings/password`, 'Đăng xuất' gọi `signOut()` một lần, không hộp xác nhận. `aria-current="page"` theo `usePathname()`. Nút khách: `/login?next=<path+search>`; `/login` (kèm `aria-current`) và `/register` không có `next`; không có link 'Đăng ký'.
- **Task 2 (`AccountSlot`, `AppHeader`, `AppShell`):** `AccountSlot` trả `UserMenu` hoặc `GuestLoginButton` theo `getViewer()`; `AppHeader` nhận `account`; `AppShell` bọc trong `<Suspense>` với Skeleton, test khẳng định fallback không có 'Đăng nhập'.
- **Task 3 (`DashboardSessionGate`, layout):** đủ 4 ca `none|stale|invalid|fresh`; layout bọc gate trong Suspense. Comment ghi rõ `proxy.ts` là lớp thứ nhất, gate là lớp thứ hai (UX, không phải ranh giới bảo mật) và vì sao layout không chạy lại khi điều hướng client.

## Task Commits

1. Task 1: `6924b60` `feat(03-13): add session-aware UserMenu and GuestLoginButton`
2. Task 2: `7d8a666` `feat(03-13): wire AccountSlot into AppShell with Suspense skeleton`
3. Task 3: `e6d177e` `feat(03-13): add DashboardSessionGate to the (dashboard) layout`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `not-found.test.tsx` vỡ vì `AppShell` giờ kéo theo `viewer.server` (`server-only`)**
- **Found during:** Task 3 (chạy cả bộ test web)
- **Issue:** `not-found.tsx` render `AppShell` thật, nên import `AccountSlot` → `viewer.server` không resolve được dưới Vitest.
- **Fix:** thêm `vi.mock("@/components/account-slot", ...)` trả `null` trong `not-found.test.tsx` (ngoài `files_modified` của plan).
- **Commit:** `e6d177e`

**2. [Chủ đích] `GuestLoginButton` dùng `Link` + `buttonVariants` thay vì `Button render={<Link />}`** (xem key-decisions). Cùng giao diện, giữ role link; tiêu chí nghiệm thu (`toSafeNextPath`, 'Đăng nhập', `/login`, không có 'Đăng ký') vẫn đạt.

**3. [Rule 3 - Blocking] Mỗi task một commit gồm cả test, không có commit RED riêng**
- Giống 03-12: test và code được viết cùng lúc rồi chạy. Plan là `type: execute` nên không có mục TDD Gate Compliance. Commit Task 1 có `AppHeader` tạm thời lỗi typecheck (thiếu `viewer` cho `UserMenu`), được sửa trong commit Task 2; từ Task 2 trở đi mọi commit đều xanh.

### Ghi chú

- Test `UserMenu` dùng `findByRole("menu")` sau khi click trigger: popup Base UI mở bất đồng bộ.
- Test `AppShell` mô phỏng "đang đọc phiên" bằng `AccountSlot` mock ném Promise treo, để thấy fallback Skeleton.
- `.planning/config.json` và `packages/api-client/src/fetch-http-client.ts` là thay đổi có sẵn, không stage; lint không đỏ nên không gỡ dấu cách đầu dòng. STATE.md đọc được, không có marker merge conflict.
- Không tick checkbox AUTH-03/04/05/07 trong `REQUIREMENTS.md`: còn 03-14, 03-15 (kiểm end-to-end) chưa xong.

## Known Stubs

Không có. Hai mục 'Hồ sơ' và 'Tin nhắn' disabled là ngoại lệ có chủ đích D-15 (người dùng duyệt), Phase 6/7 sẽ bật.

## Threat Model Verification

- **T-03-64:** header/menu chỉ hiển thị; dữ liệu thật đi qua BFF/BE xác thực Bearer. Gate ghi rõ là UX trong comment.
- **T-03-65:** `Viewer` không có trường token; `account-slot.test.tsx` khẳng định props của `UserMenu` chỉ là `{ viewer }`.
- **T-03-66:** `GuestLoginButton` và `LoginRedirect` đều qua `toSafeNextPath` (test `/login`, `/register`; `//evil` đã có ở test `toSafeNextPath`).
- **T-03-67:** 'Hồ sơ'/'Tin nhắn' không có `href`, `aria-disabled="true"`, không phải `<a>`, click không gọi `signOut` và không đóng menu.
- **T-03-68:** không dùng `use cache`; `getViewer`/`getSessionKind` chỉ `React.cache` theo request; đọc cookie trong Suspense. Build không có lỗi 'Uncached data was accessed outside of <Suspense>'.
- **T-03-69:** `stale|invalid` → `SessionRecovery`; chỉ `none` mới `LoginRedirect`.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` ở gốc repo: exit 0 (web 54 file / 774 test).
- `pnpm build`: thành công; `/`, `/itineraries/mine`, `/login`, `/register`, `/settings/password` là Partial Prerender (◐), không có lỗi Suspense/cookies.
- Không chạy kiểm bằng trình duyệt thật (menu mở trên mobile, Skeleton lúc tải): để 03-15 (UAT).

## Next Phase Readiness

- Header và gate đã dùng được; 03-14/03-15 có thể kiểm end-to-end: đăng nhập → thấy menu có tên/avatar, đăng xuất → về `/` thấy nút 'Đăng nhập', mở `/itineraries/mine` khi chưa có phiên → `/login?next=`.
- Cần kiểm tay ở UAT: Skeleton không nháy nút 'Đăng nhập' khi reload, popup `align="end"` không tràn ở 320px, header cập nhật sau `router.refresh()`.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-15*

## Self-Check: PASSED

Đã kiểm 15 file nguồn/test tồn tại và 3 commit `6924b60`, `7d8a666`, `e6d177e` có trong git log.
