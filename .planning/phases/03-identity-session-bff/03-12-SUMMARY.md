---
phase: 03-identity-session-bff
plan: 12
subsystem: identity-forms-pages
tags: [identity, forms, react-hook-form, zod, login, register, change-password, a11y, cold-start, vitest]

requires:
  - phase: 03-identity-session-bff
    provides: "03-02: `PasswordInput`, `InlineAlert`, `Button.loadingLabel`; 03-06: `identity` hook factory, `makeQueryClient`; 03-10: schemas, `mapXxxError`, `PasswordChecklist`, `SubmitStatus`, `AuthFormCard`; 03-11: `useSessionActions` (`afterSignIn`, `afterPasswordChanged`)"
provides:
  - "`LoginForm`, `RegisterForm`, `ChangePasswordForm` (`modules/identity/ui`)"
  - "`auth-fields.tsx`: `AuthField` (vỏ một ô + checklist + lỗi), `ControlledPasswordInput`"
  - "Route `/login`, `/register` (Suspense quanh form dùng `useSearchParams`), `/settings/password` (trong `(dashboard)`)"
affects: [03-13, 03-14, 03-15]

key-files:
  created:
    - apps/web/src/modules/identity/ui/auth-fields.tsx
    - apps/web/src/modules/identity/ui/login-form.tsx
    - apps/web/src/modules/identity/ui/login-form.test.tsx
    - apps/web/src/modules/identity/ui/register-form.tsx
    - apps/web/src/modules/identity/ui/register-form.test.tsx
    - apps/web/src/modules/identity/ui/change-password-form.tsx
    - apps/web/src/modules/identity/ui/change-password-form.test.tsx
    - apps/web/src/app/(public)/login/page.tsx
    - apps/web/src/app/(public)/login/page.test.tsx
    - apps/web/src/app/(public)/register/page.tsx
    - apps/web/src/app/(public)/register/page.test.tsx
    - apps/web/src/app/(dashboard)/settings/password/page.tsx
    - apps/web/src/app/(dashboard)/settings/password/page.test.tsx

key-decisions:
  - "Ô mật khẩu dùng `Controller` (controlled), không `register`: `PasswordInput` chỉ tự ẩn lại khi nhận `value === ''`, nên sau `resetField('password')` ở login toggle mới về 'Hiện mật khẩu' (T-03-04)."
  - "Base UI `Field.Error` chỉ hiện khi `match` hoặc khi Base UI tự thấy lỗi; lỗi do React Hook Form giữ nên `AuthField` truyền `invalid` cho `FormField` và `match` cho `FormFieldError`."
  - "Checklist đặt trong `FormFieldDescription render={<div />}` (mặc định là `<p>`, `div`/`ul` lồng trong `p` là HTML sai). Base UI tự nối id của description vào `aria-describedby` của ô."
  - "Chặn gửi lần hai bằng `submittingRef` ở wrapper `onSubmit` (đặt trước khi chạy validate, trả về trong `finally`), vì Enter trong ô vẫn kích hoạt submit khi nút đang loading."
  - "Nút 'Hủy' là `next/link` gắn `buttonVariants({ variant: 'secondary' })`, không dùng `Button render={<Link/>}`: Base UI Button với phần tử không native gán `role=\"button\"`, làm link mất vai trò link. Khi đang gửi: `aria-disabled`, `data-disabled`, `tabIndex=-1` và `preventDefault` ở `onClick`."
  - "`RegisterForm`/`ChangePasswordForm` giữ nút gửi bằng state (`ref={setSubmitButton}`) thay vì ref, vì React Compiler lint (`react-hooks/refs`) cấm callback của `handleSubmit` đọc ref; checklist đọc mật khẩu bằng `useWatch` thay `form.watch` (rule `react-hooks/incompatible-library`)."
  - "`afterPasswordChanged()` được `await` trong callback `handleSubmit`, nên form còn khóa tới khi handler đăng xuất xong; `afterSignIn` đồng bộ nên chạy ngoài `try` để lỗi của nó không bị `mapXxxError` nuốt thành alert."

requirements-addressed: [AUTH-01, AUTH-02, AUTH-05, AUTH-06, FND-05]
requirements-completed: []

completed: 2026-10-15
---

# Phase 3 Plan 12: Form đăng nhập, đăng ký, đổi mật khẩu Summary

**Ba form React Hook Form + Zod ghép với mutation `@tripory/identity` (`errorToast: false`) và ba trang `/login`, `/register`, `/settings/password`: lỗi validate hiện khi blur/Gửi và focus ô lỗi đầu tiên, lỗi BE gắn đúng ô hoặc `InlineAlert`, đăng nhập sai xóa mật khẩu và focus lại, checklist rule mật khẩu thấy được trước khi nhập, chặn gửi trùng kể cả Enter; `pnpm lint`, `typecheck`, `test` (web: 51 file / 749 test) và `pnpm build` đều xanh**

## Accomplishments

- **Task 1 (`LoginForm`, `/login`):** link 'Đăng ký' giữ `?next=` đã qua `toSafeNextPath` (`//evil.com` bị bỏ). Hợp lệ thì gateway nhận `{ email (đã trim), password (giữ nguyên) }` và `afterSignIn({ viewer, next: <raw>, toast: 'Chào mừng, {tên}' })` đúng một lần. `Auth.InvalidCredentials` hiện `InlineAlert` role=alert, giữ email, xóa mật khẩu, toggle về ẩn, focus ô mật khẩu; gửi lại thì alert cũ biến mất ngay. `session_expired` im lặng, timeout/network ra câu chung.
- **Task 2 (`RegisterForm`, `/register`):** checklist 'Ít nhất 8 ký tự' hiện sẵn, đổi 'Chưa đạt' sang 'Đã đạt' ở đúng 8 ký tự. Ô nhập lại được kiểm lại khi mật khẩu chính đổi. Gateway nhận `{ email, password, fullName }` (không có `confirmPassword`). `User.EmailAlreadyExists` gắn vào ô Email, focus ô đó, giữ mọi giá trị kể cả mật khẩu; `NotEmptyValidator` ra alert và focus ở nút gửi.
- **Task 3 (`ChangePasswordForm`, `/settings/password`):** đủ 6 mục checklist theo thứ tự lúc chưa nhập, phản ứng khi gõ (gồm 'Khác mật khẩu hiện tại' và ký tự `-` bị từ chối). `Auth.InvalidCurrentPassword` gắn vào 'Mật khẩu hiện tại' và focus ô đó; `NotEqualValidator` gắn vào 'Mật khẩu mới' với message BE. Thành công thì `form.reset()` rồi `afterPasswordChanged()`. Đang gửi: Input `readOnly`, 3 toggle disabled, 'Hủy' vô hiệu, không gửi lần hai, dòng cold start sau 5 giây.

## Task Commits

1. Task 1: `392a48d` `feat(03-12): add LoginForm and /login page` (gồm `auth-fields.tsx` dùng chung)
2. Task 2: `26d6f45` `feat(03-12): add RegisterForm and /register page`
3. Task 3: `2474f8d` `feat(03-12): add ChangePasswordForm and /settings/password page`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mỗi task là một commit `feat` gồm cả test, không có commit RED riêng**
- **Found during:** Task 1 đến 3
- **Issue:** Plan đánh dấu `tdd="true"`, nhưng phần ghép với Base UI `Field`, `PasswordInput` và React Hook Form cần chạy thử mới biết hành vi thật (cách hiện lỗi, `ref`, focus), nên code và test được viết cùng lúc rồi chạy.
- **Fix:** Test vẫn đầy đủ theo `<behavior>`; mỗi task một commit. Không có `## TDD Gate Compliance` vì plan này là `type: execute`, không phải `type: tdd`.

**2. [Rule 2 - Missing critical] Thêm `auth-fields.tsx` ngoài `files_modified`**
- **Lý do:** vỏ ô (`invalid` + `match` + checklist + lỗi) và ô mật khẩu controlled lặp ở cả ba form; gom một chỗ để cách nối `aria-describedby` và lỗi không lệch giữa các form. Không đổi phạm vi.

**3. [Chủ đích] Nút 'Hủy' không dùng `Button render={<Link />}`** (xem key-decisions). Đạt cùng giao diện mà vẫn là link thật.

### Ghi chú

- Test cold start dùng `fireEvent.submit` sau `vi.useFakeTimers()` thay vì `userEvent`: `userEvent` và `waitFor` của RTL treo khi timer bị giả trong Vitest. Các thao tác gõ dùng timer thật, chỉ bật timer giả ngay trước khi gửi.
- `.planning/config.json` và `packages/api-client/src/fetch-http-client.ts` là thay đổi có sẵn, không stage; lint không đỏ nên không gỡ dấu cách đầu dòng. STATE.md đọc được, không có marker merge conflict.
- Không tick checkbox AUTH-01/02/05/06 và FND-05 trong `REQUIREMENTS.md`: gate `(dashboard)` (03-13) và menu user (03-14) chưa có nên chưa chạy end-to-end, giống quyết định ở các plan trước.

## Known Stubs

Không có.

## Threat Model Verification

- **T-03-58 (open redirect qua `?next=`):** link chuyển trang và `afterSignIn` đều qua `toSafeNextPath`; test `?next=//evil.com` ở login và register.
- **T-03-59 (lộ mật khẩu):** `type="password"` mặc định, `autocomplete` đúng chuẩn, mật khẩu chỉ nằm trong state của React Hook Form; grep `console.`, `placeholder`, `autoFocus` trong ba form = 0.
- **T-03-60:** form chỉ nhận `Viewer` (không có token).
- **T-03-61 (gửi trùng):** `submittingRef` + `aria-busy` + `readOnly`; test gateway `toHaveBeenCalledTimes(1)` cho cả ba form.
- **T-03-62 (XSS):** message BE chỉ đi vào text node, không có `dangerouslySetInnerHTML`.
- **T-03-63:** `/settings/password` nằm trong `(dashboard)`, được `proxy.ts` bảo vệ (`/settings` đã trong `PROTECTED_PREFIXES`); gate layout thuộc 03-13.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` ở gốc repo: exit 0 (web 51 file / 749 test).
- `pnpm build`: thành công, `/login`, `/register`, `/settings/password` prerender tĩnh (`○`), không có lỗi 'Uncached data was accessed outside of <Suspense>'.
- Acceptance: `login-form.tsx` có `errorToast: false`, `mode: "onTouched"`, `noValidate`, `autoComplete="current-password"`, `loadingLabel="Đang đăng nhập…"`, `Chào mừng, `; `register-form.tsx` có `REGISTER_PASSWORD_RULES`, checklist, 'Tạo tài khoản thành công', 'Đang tạo tài khoản…', `new-password`; `change-password-form.tsx` có `CHANGE_PASSWORD_RULES`, `afterPasswordChanged`, 'Đang lưu…', `/itineraries/mine`. Không form nào có `autoFocus`, `placeholder`, `console.`.

## Next Phase Readiness

- 03-13 (gate `(dashboard)`) và 03-14 (menu user, link tới `/settings/password` và `/login`) có thể dùng ngay các route này.
- 03-15 (UAT): cần kiểm bằng tay toast 'Chào mừng, {tên}' còn thấy sau điều hướng, header cập nhật sau `router.refresh()`, và cold start thật trên BE free tier.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-15*

## Self-Check: PASSED

Đã kiểm 13 file nguồn/test tồn tại và 3 commit `392a48d`, `26d6f45`, `2474f8d` có trong git log.
