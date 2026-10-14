---
phase: 03-identity-session-bff
plan: 10
subsystem: identity-form-foundation
tags: [identity, forms, zod, password-checklist, error-mapping, a11y, cold-start, vitest, tdd]

requires:
  - phase: 03-identity-session-bff
    provides: "Plan 03-03: `REGISTER_PASSWORD_RULES`, `CHANGE_PASSWORD_RULES`, `evaluatePasswordRules`, type `PasswordRule`/`PasswordRuleId`/`PasswordRuleResult` ở entry gốc `@tripory/identity`"
  - phase: 03-identity-session-bff
    provides: "Plan 03-02: `Card`, `Icon`, `InlineAlert`, `PasswordInput`, token `max-w-form` ở `@tripory/ui-web`"
  - phase: 02-http-shared-kernel
    provides: "`ApiError`/`isApiError`/`makeApiError`; `lib/feedback`: `ERROR_MESSAGES`, `GENERIC_ERROR_MESSAGE`, `FIELD_INVALID_MESSAGE`, `selectErrorMessage`, `resolveFormError`"
provides:
  - "`form-schemas.ts`: `loginSchema`, `registerSchema`, `changePasswordSchema`, type `LoginValues`/`RegisterValues`/`ChangePasswordValues`, hằng tên field `LOGIN_FIELDS`/`REGISTER_FIELDS`/`CHANGE_PASSWORD_FIELDS`"
  - "`password-rule-copy.ts`: `passwordRuleLabel`, `buildChecklistItems`, type `ChecklistItem`"
  - "`form-error-mapping.ts`: `mapLoginError`, `mapRegisterError`, `mapChangePasswordError`, type `FormErrorMapping<F>` (`null` = không hiện gì)"
  - "`PasswordChecklist`, `SubmitStatus` (+ `COLD_START_MESSAGE`), `AuthFormCard`"
affects: [03-12, 03-14, phase-03-identity]

tech-stack:
  added: ["lucide-react (catalog, đã pin sẵn) vào apps/web để truyền `Circle`/`CircleCheck` cho atom `Icon`"]
  patterns: [one-error-per-field-zod, per-form-error-table-map, props-only-checklist, always-mounted-live-region]

key-files:
  created:
    - apps/web/src/modules/identity/ui/form-schemas.ts
    - apps/web/src/modules/identity/ui/form-schemas.test.ts
    - apps/web/src/modules/identity/ui/password-rule-copy.ts
    - apps/web/src/modules/identity/ui/form-error-mapping.ts
    - apps/web/src/modules/identity/ui/form-error-mapping.test.ts
    - apps/web/src/modules/identity/ui/password-checklist.tsx
    - apps/web/src/modules/identity/ui/password-checklist.test.tsx
    - apps/web/src/modules/identity/ui/submit-status.tsx
    - apps/web/src/modules/identity/ui/submit-status.test.tsx
    - apps/web/src/modules/identity/ui/auth-form-card.tsx
    - apps/web/src/modules/identity/ui/auth-form-card.test.tsx
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Mỗi ô chỉ phát ra đúng một lỗi tại một thời điểm: ô rỗng chỉ có 'Vui lòng nhập…', không kèm lỗi dạng/độ mạnh. Kiểm tra từng ô nằm trong `superRefine` của ô đó; chỉ rule cần hai ô (độ mạnh mật khẩu mới + `differentFromCurrent`, nhập lại khớp) nằm ở `superRefine` của object."
  - "Email: `z.string().trim()` rồi mới kiểm, dạng chuẩn `^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$`; comment mô tả lỗi regex BE bằng lời, không chép lại chuỗi lỗi vào source (D-33)."
  - "Họ tên đếm độ dài trên giá trị thô và giá trị đầu ra giữ nguyên (không trim): BE tự trim ở VO, FE không cần đổi dữ liệu gửi đi."
  - "Bảng mã lỗi → ô là `Map<string, F | 'alert'>` riêng từng form; các mã mơ hồ (`NotEmptyValidator`, `Auth.InvalidCredentials`, `Auth.UserBanned`) ghi tường minh là `'alert'` dù mặc định cũng rơi vào alert, để người đọc thấy chủ đích. `ERROR_MESSAGES` toàn cục không đổi."
  - "`SubmitStatus` chỉ dùng `aria-live=\"polite\"` (không `role=\"status\"`) để `getByRole('status')` trong test form ở 03-12 không đụng `FormFieldError` (đã là `role=\"status\"`); `mt-stack-sm` chỉ áp khi có chữ nên dòng rỗng không chiếm chỗ dưới nút."
  - "`passwordRuleLabel('minLength')` thiếu `min` trả câu trung tính 'Đủ số ký tự tối thiểu' thay vì đoán con số 8."

patterns-established:
  - "Form foundation theo nhóm: schema + copy ở `.ts` thuần (test không cần DOM), UI chỉ nhận props, không state nghiệp vụ; form (react-hook-form + mutation) ghép ở plan sau."
  - "Hàm map lỗi trả `null | { fieldErrors, alert }`: `null` là 'không hiện gì' cho `session_expired`/`aborted`, form chỉ cần `if (!mapped) return`."
  - "Vùng `aria-live` luôn có trong DOM, chỉ đổi nội dung; mục danh sách giữ node theo `key = id` để trình đọc màn hình chỉ đọc mục vừa đổi."

# Plan này chỉ dựng nền (schema, copy, map lỗi, ba khối UI); chưa có form nào chạy được nên chưa tick hoàn thành (xem Deviations mục 2).
requirements-addressed: [AUTH-01, AUTH-06]
requirements-completed: []

duration: 10 min
completed: 2026-10-14
---

# Phase 3 Plan 10: Nền ba form auth Summary

**Schema Zod cho login/đăng ký/đổi mật khẩu (email dạng chuẩn, không chép regex lỗi của BE; rule mật khẩu lấy từ `@tripory/identity`), map lỗi BE theo từng form với `session_expired` im lặng, `PasswordChecklist` hiện đủ rule từ lúc tải trang, `SubmitStatus` báo cold start sau 5 giây và khung `AuthFormCard`; `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-10-14T22:07+07:00 (sau commit docs của 03-04)
- **Completed:** 2026-10-14T22:17+07:00
- **Tasks:** 3 (cả ba TDD, RED rồi GREEN)
- **Files:** 13 (11 tạo mới trong `apps/web/src/modules/identity/ui/`, 2 sửa: `apps/web/package.json`, `pnpm-lock.yaml`; không tính `.planning`)

## Accomplishments

- `form-schemas.ts`: ba schema, 63 test. Khóa các ca của plan: email `user@gmail.com`/`tester@sub.example.vn`/`S.S@s.ss` hợp lệ (có chữ "s", D-33), `' user@gmail.com '` được trim ở đầu ra; mật khẩu `'  secret  '` giữ nguyên khoảng trắng; họ tên `'   '` rỗng, 100 ký tự ok, 101 ký tự và `'a'×100 + ' '` đều báo "tối đa 100"; đăng ký `'1234567'` bị từ chối còn `'12345678'` ok (chỉ `minLength`, D-27); đổi mật khẩu `'Abcdef1-'` và `'Abcdef1_'` bị từ chối còn cả 11 ký tự `! ? * @ # $ % ^ & + =` được chấp nhận (D-34); mật khẩu mới trùng hiện tại bị gắn vào `newPassword`; confirm lệch bị gắn vào path `confirmPassword`.
- `password-rule-copy.ts`: `passwordRuleLabel` đúng 6 câu copy (có "Có một trong các ký tự ! ? * @ # $ % ^ & + ="), `buildChecklistItems` giữ thứ tự rule.
- `form-error-mapping.ts`: `mapFormError` dùng chung cộng ba bảng `Map` riêng từng form; 63 test (bảng hành vi chung chạy trên cả ba hàm bằng `describe.each`). Khóa: `session_expired`/`aborted` → `null`; không phải `ApiError`/network/timeout/parse/5xx → alert câu chung; `fieldErrors` khớp → "Giá trị không hợp lệ." tại ô, key lạ → alert câu chung, không chuỗi tiếng Anh nào của BE lọt ra, key `__proto__` không đổi prototype; `Auth.InvalidCurrentPassword` → `currentPassword`, `NotEqualValidator` → `newPassword`, `User.EmailAlreadyExists` → `email`, `Auth.InvalidCredentials` → alert; mã của form này không gắn nhầm ô ở form khác.
- `PasswordChecklist`: 6 `listitem` có mặt ở lần render đầu cho `CHANGE_PASSWORD_RULES` (đều "Chưa đạt: …"), `ul aria-live="polite"`, icon `aria-hidden`, màu icon `text-muted` / `text-success`, rerender giữ nguyên từng node `<li>`, tiền tố là `sr-only`.
- `SubmitStatus`: vùng `aria-live="polite"` luôn có; rỗng ở 4 999 ms, hiện đúng "Máy chủ đang khởi động, có thể mất tới 30 giây…" ở 5 000 ms (fake timers); `pending` về false thì rỗng ngay và `vi.getTimerCount()` = 0; lần gửi sau đếm lại từ đầu; unmount dọn timer.
- `AuthFormCard`: `Card padding="lg"` + `mx-auto w-full max-w-form`, đúng một `h1` (`text-display font-semibold`) có `id={titleId}`, thứ tự DOM h1 → alert → children → footer.

## Task Commits

1. **Task 03-10-01: Schema Zod 3 form và bảng copy rule mật khẩu**
   - RED `e8ab4bc` `test(03-10): add failing tests for form schemas and password rule copy`
   - GREEN `87b106e` `feat(03-10): add Zod schemas for login, register, change-password forms`
2. **Task 03-10-02: Map lỗi BE theo từng form**
   - RED `039a1d7` `test(03-10): add failing tests for per-form BE error mapping`
   - GREEN `97dce88` `feat(03-10): map BE errors to fields or inline alert per form`
3. **Task 03-10-03: `PasswordChecklist`, `SubmitStatus`, `AuthFormCard`**
   - RED `365b380` `test(03-10): add failing tests for PasswordChecklist, SubmitStatus, AuthFormCard`
   - GREEN `d29b6f0` `feat(03-10): add PasswordChecklist, SubmitStatus and AuthFormCard`

Không cần commit REFACTOR. Cả ba lần RED đều chạy và xác nhận đỏ trước khi chốt code (`Failed to resolve import` vì module chưa tồn tại).

## Files Created/Modified

- `apps/web/src/modules/identity/ui/`: `form-schemas.ts`, `password-rule-copy.ts`, `form-error-mapping.ts`, `password-checklist.tsx`, `submit-status.tsx`, `auth-form-card.tsx` và năm file test đi cặp (`password-rule-copy` được test chung trong `form-schemas.test.ts` theo plan).
- `apps/web/package.json`, `pnpm-lock.yaml`: thêm `lucide-react` (xem Deviations mục 1).

## Decisions Made

Xem `key-decisions`. Tất cả theo đúng `<action>` của plan; `boundaries.mjs` không đổi, `apps/web/src/lib/feedback/error-messages.ts` không đổi (`git diff` rỗng, không có key `*Validator` toàn cục).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `apps/web` chưa khai báo `lucide-react`**
- **Found during:** Task 3
- **Issue:** Plan yêu cầu `PasswordChecklist` dùng `Icon` của `@tripory/ui-web` với `Circle`/`CircleCheck` từ `lucide-react`. Atom `Icon` nhận `icon: LucideIcon` nên glyph phải do app import, nhưng `apps/web/package.json` chưa có `lucide-react`; pnpm cài kiểu isolated nên `import "lucide-react"` ở app sẽ lỗi TS2307 (đã kiểm: `apps/web/node_modules` không có).
- **Fix:** Thêm `"lucide-react": "catalog:"` vào `dependencies` của `apps/web`, `pnpm install` (lockfile +3 dòng, bản 1.54.0 đã pin trong catalog và đã có sẵn trong store). Không đụng `boundaries.mjs`: preset `app()` không giới hạn module ngoài. Đây là thêm khai báo dependency đã có trong catalog, không phải nới allowlist.
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Commit:** `d29b6f0`

### Bước workflow cố ý bỏ qua

**2. [Chủ đích] Không chạy `requirements mark-complete AUTH-01 AUTH-06`**
- **Lý do:** Giống quyết định của 03-01, 03-03, 03-04. Plan này chỉ giao nền (schema, copy, map lỗi, ba khối UI); chưa có form nào ghép với react-hook-form và mutation, chưa có trang, nên người dùng chưa thấy lỗi validate hay checklist trên màn hình. Đánh Complete lúc này sai sự thật. `requirements-completed` ở frontmatter để trống, `requirements-addressed` ghi đủ hai id.
- **Hệ quả:** AUTH-01 được tick khi form chạy (03-12, 03-14); AUTH-06 khi form đổi mật khẩu hiện checklist trên màn hình, hoặc ở bước verify phase.

### Ghi chú về comment trong code

Comment của `form-schemas.ts` mô tả lỗi regex email của BE bằng lời để không chứa lại chuỗi regex lỗi (acceptance criteria dùng chính chuỗi đó làm mẫu cấm). Không đổi hành vi.

---

**Total deviations:** 1 auto-fix (Rule 3), 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không nới allowlist, không sửa package nào ngoài `apps/web`.

## Issues Encountered

- Một lệnh gộp (kiểm tra acceptance + `git commit` của Task 2) bị từ chối ở lớp phê duyệt công cụ nên chưa chạy; tách ra chạy lại từng lệnh, không mất thay đổi nào. Không liên quan đến code.
- `.planning/config.json` (khóa của gsd tooling) và `packages/api-client/src/fetch-http-client.ts` (một dấu cách đầu dòng 1) là thay đổi có sẵn từ trước plan, không stage. `pnpm lint` và `typecheck` toàn repo vẫn xanh với dấu cách đó, nên không phải gỡ.
- STATE.md đọc được bình thường, không còn marker merge conflict ở thời điểm thực thi.
- Git cảnh báo "LF will be replaced by CRLF" khi add file mới (cấu hình autocrlf của máy), không ảnh hưởng.
- `token-guard.test.ts` flake đã biết không xuất hiện trong lần chạy `pnpm test` cuối.

## Known Stubs

Không có stub. Ba khối UI nhận dữ liệu qua props, đúng thiết kế "chưa gắn mutation" của plan; `AuthFormCard` có slot `alert`/`footer` tùy chọn nên không có giá trị rỗng cứng nào chảy vào UI.

## Lưu ý cho plan 03-12

- `FormFieldDescription` bọc `Field.Description` của Base UI, đã kiểm trong `node_modules` là phần tử `<p>`. `PasswordChecklist` render `div` + `ul`, nên đặt nó bên trong `FormFieldDescription` mặc định sẽ sinh `<div>`/`<ul>` lồng trong `<p>` (HTML sai). Truyền `render={<div />}` cho `FormFieldDescription`, hoặc đặt checklist cạnh ô nhưng ngoài `FormFieldDescription` và tự nối `aria-describedby` bằng prop `id` của checklist.
- `PasswordChecklist` chỉ nhận `items`; form tính `buildChecklistItems(evaluatePasswordRules(RULES, watch("password"), watch("currentPassword")))` mỗi lần render. Chỉ gõ mật khẩu mới mới đổi `met`, không cần debounce.
- `mapXxxError` trả `fieldErrors` theo đúng tên field của schema; form gọi `setError(name, { message })` rồi focus ô đầu tiên, và hiện `alert` bằng `InlineAlert` ở slot `alert` của `AuthFormCard`. `null` nghĩa là bỏ qua.
- Muốn `confirmPassword` được kiểm lại khi `password`/`newPassword` đổi, form cần `deps` của react-hook-form (schema chỉ kiểm khi gọi resolver).
- `SubmitStatus` không xóa ô nào; chặn gửi lần hai, `readOnly` các ô và nhãn `loadingLabel` vẫn do form xử lý (D-30).

## Threat Model Verification

- **T-03-47 (mật khẩu lọt vào message lỗi/log/DOM):** schema chỉ trả copy cố định, không echo giá trị; hàm map lỗi chỉ nhận `error` và đọc `code`/`message` BE; test `không chuỗi tiếng Anh nào của BE lọt ra`. `grep` các file nguồn của plan: không có `console.*`.
- **T-03-48 (rule client lệch BE):** rule lấy từ `@tripory/identity` (`evaluatePasswordRules`), schema và checklist dùng chung một nguồn; lỗi BE lọt qua đi qua `form-error-mapping`.
- **T-03-49 (liệt kê tài khoản, accept):** `Auth.InvalidCredentials` luôn ra alert chung "Email hoặc mật khẩu không đúng."; không gắn vào ô cụ thể.
- **T-03-50 (XSS qua message BE):** message BE chỉ đi vào chuỗi trả về cho React render như text node; không có `dangerouslySetInnerHTML` trong các file nguồn của plan.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan (không endpoint, không truy cập file, không đổi schema).

## Verification

- `pnpm --filter @tripory/web exec vitest run src/modules/identity/ui` — 5 file, 150 test xanh. `lint` và `typecheck` của `@tripory/web` exit 0.
- Acceptance Task 1: không có `[^@s]` trong `form-schemas.ts`, có `[^\s@]`; `password-rule-copy.ts` chứa "Có một trong các ký tự ! ? * @ # $ % ^ & + ="; test có `tester@sub.example.vn`, `'Abcdef1-'`, ca 101 ký tự và khoảng trắng mật khẩu.
- Acceptance Task 2: `form-error-mapping.ts` chứa `Auth.InvalidCurrentPassword`, `NotEqualValidator`, `User.EmailAlreadyExists`, `Auth.InvalidCredentials`, `session_expired`, dùng `new Map`; `git diff -- apps/web/src/lib/feedback/error-messages.ts` rỗng.
- Acceptance Task 3: `password-checklist.tsx` có `aria-live="polite"`, "Mật khẩu cần có:", "Đã đạt: ", "Chưa đạt: ", `sr-only`; `submit-status.tsx` có chuỗi cold start, `5_000`, `clearTimeout`; `auth-form-card.tsx` có `max-w-form`, `<h1`. Test checklist khẳng định đủ 6 `listitem` lúc chưa nhập; test submit-status khẳng định rỗng ở 4 999 ms và hiện ở 5 000 ms.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh (`@tripory/web` 23 file, 283 test; `@tripory/ui-web` 31 file, 180 test; `@tripory/identity` 244 test; `@tripory/config` 104 test).

## User Setup Required

None.

## Next Phase Readiness

- Plan 03-12 ghép `LoginForm`/`RegisterForm`/`ChangePasswordForm` từ các khối này (react-hook-form `mode: "onTouched"` + `zodResolver`, mutation `errorToast: false`, `mapXxxError`, `SubmitStatus pending={isPending}`), theo mục "Lưu ý cho plan 03-12".
- Ready for the next plan in the wave order.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-14*

## Self-Check: PASSED

Đã kiểm: 11 file tạo mới trong `apps/web/src/modules/identity/ui/` tồn tại; 6 commit `e8ab4bc`, `87b106e`, `039a1d7`, `97dce88`, `365b380`, `d29b6f0` có trong git log; acceptance criteria của cả ba task và `<verification>` chạy lại đều PASS.
