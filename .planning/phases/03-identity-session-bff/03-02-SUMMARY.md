---
phase: 03-identity-session-bff
plan: 02
subsystem: ui-design-system
tags: [design-tokens, ui-web, base-ui, password-input, inline-alert, dropdown-menu, button, a11y, tdd]

requires:
  - phase: 01-design-system-ui-skeleton-walking-skeleton
    provides: "Token semantic/component của `@tripory/design-tokens`, atoms `Button`/`Input`/`IconButton`/`Icon`/`Spinner`, molecules `DropdownMenu*`/`FormField`, `token-guard.test.ts`"
provides:
  - "Token `--semantic-size-form` (400px, light + dark) với utility `max-w-form` qua `--spacing-form`, và `--user-menu-name-max-width` (160px); `tokens.test.ts` khóa cả hai và biên dịch thử `max-w-form`"
  - "`Button` prop `loadingLabel`: `loading` + nhãn thì hiện `Spinner sm` decorative và nhãn thay children, giữ `aria-busy`, `disabled`, `focusableWhenDisabled`"
  - "`PasswordInput`: nút Hiện/Ẩn mật khẩu (`aria-label`, `aria-pressed`, `aria-controls`, `type=\"button\"`), `readOnly` thì toggle disabled, value controlled về `''` thì quay lại ẩn, `ref` xuống `<input>`"
  - "`InlineAlert`: `role=\"alert\"`, icon decorative, không render khi `children` rỗng"
  - "`DropdownMenuLinkItem` (bọc `Menu.LinkItem`, nhận `render`, đóng menu khi chọn) và prop `align` của `DropdownMenuContent`"
affects: [03-10, 03-12, 03-13, phase-03-identity]

tech-stack:
  added: []
  patterns: [loading-label-replaces-children, controlled-value-reset-to-hidden, link-item-render-prop-no-router-import, base-ui-focusable-disabled-menu-item]

key-files:
  created:
    - packages/ui-web/src/molecules/password-input.tsx
    - packages/ui-web/src/molecules/password-input.test.tsx
    - packages/ui-web/src/molecules/inline-alert.tsx
    - packages/ui-web/src/molecules/inline-alert.test.tsx
    - .planning/phases/03-identity-session-bff/deferred-items.md
  modified:
    - packages/design-tokens/src/semantic.css
    - packages/design-tokens/src/dark.css
    - packages/design-tokens/src/theme.css
    - packages/design-tokens/src/components.css
    - packages/design-tokens/src/tokens.test.ts
    - packages/ui-web/src/atoms/button.tsx
    - packages/ui-web/src/atoms/button.test.tsx
    - packages/ui-web/src/molecules/dropdown-menu.tsx
    - packages/ui-web/src/molecules/dropdown-menu.test.tsx
    - packages/ui-web/src/index.ts
    - packages/ui-web/src/exports.test.ts

key-decisions:
  - "`DropdownMenuLinkItem` mặc định `closeOnClick = true`, khác `Menu.LinkItem` gốc (`false`): UserMenu nằm trong layout nên điều hướng client không unmount nó, menu sẽ kẹt mở. Truyền `closeOnClick={false}` để giữ."
  - "Không thêm prop `focusableWhenDisabled` cho `DropdownMenuItem`: Base UI 1.8.0 `Menu.Item` đã gọi `useButton({ focusableWhenDisabled: true })` nên mũi tên tới được mục disabled sẵn. Ngoại lệ đã đo: khi mở menu bằng phím, focus đầu bỏ qua mục disabled đứng đầu."
  - "`PasswordInput` chỉ tự reset về ẩn khi `value` là controlled `''`. Với `register` uncontrolled của React Hook Form, `resetField` ghi thẳng vào DOM nên component không biết; form phải dùng value controlled hoặc đổi `key`."
  - "`Button` có `loadingLabel` thì thay hẳn children bằng Spinner + nhãn (không dùng `invisible` + spinner tuyệt đối), để nhãn đang gửi đọc được."

patterns-established:
  - "Atom nhận thêm prop thì giữ nguyên nhánh cũ khi prop vắng; test cũ không đổi (`Button` không có `loadingLabel` vẫn `invisible` + spinner phủ)."
  - "Molecule bọc primitive của router nhận `render` từ app thay vì import framework; `dropdown-menu.tsx` không chứa chuỗi `next/link`."
  - "Mọi molecule mới đi kèm test render, role/aria và bàn phím (DS-07) và nằm trong `exports.test.ts`."

# Plan 02 chỉ dựng khối UI generic; form (03-12) và UserMenu (03-13) mới thực hiện hành vi của hai yêu cầu này nên chưa tick hoàn thành (xem mục "Bước workflow cố ý bỏ qua").
requirements-addressed: [AUTH-06, AUTH-07]
requirements-completed: []

duration: 71 min
completed: 2026-10-14
---

# Phase 3 Plan 2: Token form và khối UI generic cho form auth và UserMenu Summary

**Hai token (`max-w-form` 400px, tên UserMenu 160px) cùng `Button.loadingLabel`, `PasswordInput` (toggle `aria-pressed`/`aria-controls`, reset khi rỗng, chuyển `ref`), `InlineAlert` (`role="alert"`), `DropdownMenuLinkItem` và `DropdownMenuContent align`, đều có test theo DS-07; Base UI 1.8 giữ mục disabled trong vòng phím mũi tên nên không cần prop thêm; `pnpm lint`, `typecheck`, `test` toàn repo xanh**

## Performance

- **Duration:** 71 min thời gian thực (16:02 đến 17:13). Bốn commit đầu xong trước 16:08; phần còn lại nằm ở lần chạy lặp suite để truy flake của `token-guard.test.ts` và chờ công cụ giữa commit RED và GREEN của Task 3.
- **Started:** 2026-10-14T16:02:44+07:00
- **Completed:** 2026-10-14T17:13:11+07:00
- **Tasks:** 3 (task 2 và 3 theo TDD RED/GREEN)
- **Files:** 15 file trong `packages/` (4 tạo mới, 11 sửa, khớp `files_modified` của plan) cộng `deferred-items.md`

## Accomplishments

- `--semantic-size-form: 400px` ở `semantic.css` và `dark.css` (dark slot vẫn khớp đủ khóa với light), alias `--spacing-form` ở `theme.css`, `--user-menu-name-max-width: 160px` ở `components.css`. `tokens.test.ts` khóa các giá trị và biên dịch thử `max-w-form` bằng Tailwind.
- `Button`: thêm `loadingLabel?: ReactNode`; không truyền thì giữ hành vi cũ. Test: nhãn và Spinner decorative, `aria-busy`, click lần hai và phím Enter không gọi handler, `tabIndex` vẫn 0.
- `PasswordInput` (15 test): đổi `type`, `aria-label`, `aria-pressed`; kích hoạt bằng Enter/Space; nằm trong `<form onSubmit>` thì click toggle không submit còn Enter trong ô vẫn submit; `readOnly` khóa toggle; controlled về `''` thì ẩn lại; `ref`, `autoComplete`, `aria-invalid`, `aria-describedby`, `name` đi vào `<input>`; `aria-controls` khớp `id` (tự sinh hoặc do caller truyền); đặt trong `FormField` thì nhãn vẫn nối với ô nhập.
- `InlineAlert` (8 ca): `role="alert"`, icon `aria-hidden`, không render với `null`/`undefined`/`''`/`false`.
- `DropdownMenuLinkItem` và `align`: link render `<a href>` role `menuitem`, nhận `render` hoặc `href` trực tiếp, Enter kích hoạt đúng một lần, `data-variant` và class dùng chung `menuItemVariants`; `align` mặc định `start`, `end` đến được positioner (`data-align`).
- Xác minh Base UI 1.8.0 cho mục disabled (D-15): `aria-disabled="true"`, `data-disabled`, ArrowDown và ArrowUp tới được, Enter và click không kích hoạt và không đóng menu.

## Task Commits

1. **Task 03-02-01: Token `--semantic-size-form` và `--user-menu-name-max-width`** — `946b7c5` `feat(03-02): add form width and user menu name tokens`
2. **Task 03-02-02: `Button.loadingLabel`, `PasswordInput`, `InlineAlert` (TDD)**
   - RED `79c542b` `test(03-02): add failing tests for Button.loadingLabel, PasswordInput and InlineAlert`
   - GREEN `f901bd8` `feat(03-02): add Button.loadingLabel, PasswordInput and InlineAlert`
3. **Task 03-02-03: `DropdownMenuLinkItem` và prop `align` (TDD)**
   - RED `1ffba49` `test(03-02): add failing tests for DropdownMenuLinkItem, align and disabled items`
   - GREEN `e86b1b3` `feat(03-02): add DropdownMenuLinkItem and align prop for DropdownMenuContent`

Không cần commit REFACTOR.

## Files Created/Modified

- `packages/design-tokens/src/{semantic,dark,theme,components}.css`, `tokens.test.ts` — hai token mới và test khóa.
- `packages/ui-web/src/atoms/button.tsx`, `button.test.tsx` — `loadingLabel` và 5 ca mới.
- `packages/ui-web/src/molecules/password-input.tsx`, `.test.tsx` — mới.
- `packages/ui-web/src/molecules/inline-alert.tsx`, `.test.tsx` — mới.
- `packages/ui-web/src/molecules/dropdown-menu.tsx`, `.test.tsx` — `DropdownMenuLinkItem`, `DropdownMenuContentProps` có `align`, 12 ca mới.
- `packages/ui-web/src/index.ts`, `exports.test.ts` — export hai molecule mới (`DropdownMenuLinkItem` đã nằm sẵn trong `export *` của `dropdown-menu`), kiểm kiểu `loadingLabel` và `ref` ở entry công khai.
- `.planning/phases/03-identity-session-bff/deferred-items.md` — ghi flake có sẵn ngoài phạm vi.

## Decisions Made

- Bốn quyết định ở `key-decisions` ở trên; còn lại theo đúng `<action>` của plan.
- `InlineAlert` dùng `Icon` không có `label` (decorative mặc định): `Icon` hiện chưa có prop `decorative`, nên không thêm prop mới vào atom ngoài phạm vi.
- `PasswordInput` dùng `useEffect` theo plan để reset khi `value === ''`; lint không phản đối nên không đổi sang setState lúc render.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Thiếu chức năng thiết yếu] `DropdownMenuLinkItem` phải đóng menu khi chọn**
- **Found during:** Task 3 (đọc `MenuLinkItem.mjs`)
- **Issue:** `Menu.LinkItem` mặc định `closeOnClick = false`. UserMenu nằm trong `AppHeader` của layout nên điều hướng client (`next/link`) không unmount nó, menu sẽ vẫn mở sau khi chuyển trang. Plan chỉ nói "bọc `Menu.LinkItem`".
- **Fix:** wrapper đặt mặc định `closeOnClick = true`, vẫn ghi đè được. Thêm 2 test (đóng khi click, giữ mở với `closeOnClick={false}`).
- **Files modified:** `packages/ui-web/src/molecules/dropdown-menu.tsx`, `dropdown-menu.test.tsx`
- **Commit:** `e86b1b3`

**2. [Rule 1 - Sai kỳ vọng trong test của chính task] Ba kỳ vọng đầu của test**
- **Found during:** Task 1 và Task 3
- **Issue:** (a) Tailwind đưa `--spacing-form` thành giá trị gốc nên CSS sinh ra là `max-width: var(--semantic-size-form)`, không phải `var(--spacing-form)`. (b) Khi mở menu bằng phím Base UI đã focus mục đầu, nên bước ArrowDown đầu của tôi lệch một mục. (c) ArrowUp ở mục đầu không quay vòng xuống cuối.
- **Fix:** sửa kỳ vọng cho đúng hành vi đã đo; component không đổi. Có một test debug tạm để đo thứ tự focus, đã xóa trước khi commit.
- **Files modified:** `tokens.test.ts`, `dropdown-menu.test.tsx`
- **Commit:** `946b7c5`, `1ffba49`/`e86b1b3`

### Bước workflow cố ý bỏ qua

**3. [Chủ đích] Không tick checkbox trong `REQUIREMENTS.md`**
- **Bước:** `requirements mark-complete AUTH-06 AUTH-07`
- **Lý do:** plan này chỉ dựng khối UI generic. "Đổi mật khẩu, thấy rule BE trước khi nhập" (AUTH-06) và "Header hiển thị menu user theo phiên thật" (AUTH-07) chỉ xảy ra khi form (03-12) và UserMenu (03-13) ghép các khối này với dữ liệu thật. Cùng cách xử lý với 03-01.
- **Hệ quả:** `requirements-completed` để trống, `requirements-addressed` ghi hai ID.

### Việc plan dự phòng nhưng không cần làm

- Plan cho phép thêm `focusableWhenDisabled` cho `DropdownMenuItem` nếu Base UI bỏ qua mục disabled khi điều hướng phím. Đã đo: không bỏ qua (xem `key-decisions`), nên không thêm prop; test ghi kết quả đo trong comment như plan yêu cầu.

---

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 1) và 1 bước workflow cố ý bỏ qua. **Impact:** không đổi phạm vi, không sửa `boundaries.mjs` hay allowlist, không đụng package ngoài `design-tokens` và `ui-web`.

## Issues Encountered

- `packages/ui-web/src/token-guard.test.ts` ("không có Storybook hoặc route showcase") quá 5 giây khi chạy 3 suite `ui-web` song song, do test quét đệ quy toàn bộ `apps/` kể cả `node_modules`. Chạy tuần tự 7 lần liên tiếp đều xanh. Có sẵn từ Phase 1, không do plan này; đã ghi vào `deferred-items.md`, không sửa.
- `.planning/config.json` và `packages/api-client/src/fetch-http-client.ts` (dấu cách đầu dòng 1) vẫn là thay đổi có sẵn, không stage. `pnpm lint` toàn repo xanh với dấu cách đó nên không gỡ.
- `git` báo "LF will be replaced by CRLF" khi commit; chỉ là cảnh báo cấu hình `autocrlf` của Windows, nội dung file không đổi.

## Known Stubs

None. Không có giá trị rỗng cứng hay placeholder nào chảy vào UI; các thành phần mới chưa được app dùng (03-10, 03-12, 03-13 dùng).

## Threat Model Verification

- **T-03-04 (Information Disclosure, `PasswordInput`):** `type` chỉ đổi khi người dùng bấm toggle; reset về ẩn khi `value` controlled là `''`; component không log, không lưu, không đọc `value` ngoài so sánh với `''`. Test: toggle, `aria-pressed`, reset, `readOnly` khóa toggle, giữ `text` khi value còn nội dung.
- **T-03-05 (Tampering, `DropdownMenuLinkItem`):** đúng `accept`. Package không biết URL, không import router; `Select-String 'next/link'` trên `dropdown-menu.tsx` = 0. App truyền path nội bộ cố định ở 03-13.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `threat_model` của plan.

## Verification

- Acceptance Task 1: `--semantic-size-form: 400px` có 2 kết quả (`semantic.css`, `dark.css`), `--spacing-form: var(--semantic-size-form)` 1, `--user-menu-name-max-width: 160px` 1, `tokens.test.ts` chứa cả hai token.
- Acceptance Task 2: `loadingLabel` có trong `button.tsx`; `button.test.tsx` có `Đang lưu…` và `aria-busy`; `password-input.tsx` có `Hiện mật khẩu`, `Ẩn mật khẩu`, `aria-pressed`, `aria-controls`, `type="button"`; test có ca trong `<form onSubmit>`; `inline-alert.tsx` có `role="alert"` và test có ca không render khi rỗng; `index.ts` và `exports.test.ts` có đủ cả hai tên.
- Acceptance Task 3: `DropdownMenuLinkItem`, `Menu.LinkItem`, `align` có trong `dropdown-menu.tsx`; `next/link` = 0; `index.ts` export `./molecules/dropdown-menu`; `exports.test.ts` có `DropdownMenuLinkItem`; test có ca `aria-disabled` và ca điều hướng phím tới mục disabled.
- `pnpm --filter @tripory/design-tokens test | lint | typecheck` — exit 0 (9 test).
- `pnpm --filter @tripory/ui-web test | lint | typecheck` — exit 0 (31 file, 180 test, gồm `token-guard.test.ts` và `exports.test.ts`).
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 8/8 task thành công mỗi lệnh (`@tripory/web` 18 file/133 test, `@tripory/config` 104 test, không đổi).

## User Setup Required

None.

## Next Phase Readiness

- Plan 03-10 và 03-12 dùng `PasswordInput`, `InlineAlert`, `Button loadingLabel`, `max-w-form`. **Lưu ý cho 03-12:** form đăng nhập phải đưa `PasswordInput` về ẩn sau khi `resetField("password")`. `resetField` của React Hook Form ghi thẳng vào DOM, `PasswordInput` không thấy `value` đổi nên toggle vẫn "Hiện". Dùng value controlled (`Controller` hoặc `watch`) hoặc đổi `key` của `PasswordInput` khi xóa.
- Plan 03-13 dùng `DropdownMenuLinkItem` (truyền `render={<Link href="..." />}`), `DropdownMenuContent align="end"`, `DropdownMenuItem disabled` cho "Hồ sơ" và "Tin nhắn" (đã được test), và `--user-menu-name-max-width` qua `max-w-(--user-menu-name-max-width)`. Mục đầu của menu là link "Lịch trình của tôi" (enabled) nên focus ban đầu khi mở bằng phím không bị ảnh hưởng bởi việc Base UI bỏ qua mục disabled đứng đầu.
- Ready for 03-03.

---
*Phase: 03-identity-session-bff*
*Completed: 2026-10-14*

## Self-Check: PASSED

Đã kiểm 4 file tạo mới cùng `deferred-items.md` tồn tại, 5 commit `946b7c5`, `79c542b`, `f901bd8`, `1ffba49`, `e86b1b3` có trong git log, không có file bị xóa ngoài ý muốn; acceptance criteria của cả ba task và `<verification>` của plan chạy lại đều PASS.
