---
phase: 3
slug: identity-session-bff
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-10-13
---

# Phase 3 — UI Design Contract

> Hợp đồng hình ảnh và tương tác cho Identity & Session (BFF). Phase 3 **dùng lại toàn bộ** token, typography, spacing, màu, focus ring, state matrix và a11y nền của `01-UI-SPEC.md` (đã duyệt). File này chỉ khai báo phần mới hoặc phần ghép riêng của Phase 3. Mọi quyết định D-xx dẫn chiếu `03-CONTEXT.md` (đã khóa).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn CLI, đã khởi tạo (`apps/web/components.json`, `packages/ui-web/components.json`) |
| Preset | `base-nova`, `baseColor: neutral`, `registries: {}` |
| Component library | `@base-ui/react` 1.8 |
| Icon library | `lucide-react` qua atom `Icon` |
| Font | Inter qua `next/font` (`latin`, `vietnamese`), không đổi |
| Styling | Tailwind CSS 4.3 + semantic token của `@tripory/design-tokens`, không đổi |
| Feedback | `Toast`/`notify` (Sonner) của `ui-web`, mount ở `apps/web/src/app/layout.tsx` trong Phase 3 |

Nguồn: `01-UI-SPEC.md`, `components.json` (đọc trực tiếp), STACK.md. Không có token màu, cỡ chữ hay weight mới.

---

## Spacing Scale

Dùng nguyên scale Phase 1 (bội số 4):

| Token | Value | Usage trong Phase 3 |
|-------|-------|---------------------|
| xs | 4px | Gap icon–chữ trong checklist, inset nút hiện/ẩn mật khẩu |
| sm | 8px | Gap trong FormField (label/control/mô tả/lỗi), gap Spinner–chữ trong nút, gap nút submit → dòng cold start, gap hai nút ở `/settings/password` |
| md | 16px | Gap giữa các field, padding inline alert |
| lg | 24px | Padding Card form, gap tiêu đề → form, gap field cuối → nút submit, gap nút submit → link chuyển trang |
| xl | 32px | Không dùng mới |
| 2xl | 48px | Padding trên/dưới trang auth ở mobile (`py-page-block`), padding phải của Input mật khẩu để chừa nút hiện/ẩn |
| 3xl | 64px | Padding trên/dưới trang auth từ `md` (`md:py-page-block-wide`) |

Exceptions: none. Kích thước mới bên dưới thuộc sizing contract, không phải spacing.

### Sizing mới (token, không hard-code)

| Token | Value | Layer | Usage |
|-------|-------|-------|-------|
| `--semantic-size-form` → utility `max-w-form` | `400px` | `packages/design-tokens/src/semantic.css` + `dark.css` + `theme.css` (`--spacing-form`) | Bề rộng tối đa Card form ở `/login`, `/register`, `/settings/password` (D-06) |
| `--user-menu-name-max-width` | `160px` | `packages/design-tokens/src/components.css` | Bề rộng tối đa tên trong nút UserMenu từ `sm`, cắt ellipsis (D-12) |

Cập nhật `tokens.test.ts` cho hai token này. Không dùng `max-w-[400px]` hay giá trị tùy ý.

---

## Typography

Không đổi so với Phase 1, chỉ gán vai trò:

| Role | Size | Weight | Line Height | Dùng ở Phase 3 |
|------|------|--------|-------------|----------------|
| Body | 16px | 400 | 1.5 | Giá trị Input, nội dung inline alert, mục menu, link chuyển trang (phần câu hỏi) |
| Label | 14px | 600 | 1.5 | Nhãn ô, chữ nút, tên trong nút/đầu menu, Badge "Sắp có" |
| Label (regular) | 14px | 400 | 1.5 | Email ở đầu menu, mục checklist, dòng cold start, lỗi field (cùng cỡ Label, weight 400; không thêm weight) |
| Heading | 20px | 600 | 1.2 | Không dùng mới |
| Display | 28px | 600 | 1.2 | `h1` của Card form: "Đăng nhập", "Tạo tài khoản", "Đổi mật khẩu" |

Đúng 4 cỡ (14/16/20/28), đúng 2 weight (400/600).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FAFAF9` `background` | Nền trang auth và dashboard |
| Secondary (30%) | `#FFFFFF` `surface` / `surface-elevated` | Card form, AppHeader, popup UserMenu, Input |
| Accent (10%) | `#C44728` `primary` | Xem danh sách dưới |
| Destructive | `#B42318` `danger` | Inline alert lỗi form, lỗi field, viền Input `aria-invalid`. Phase 3 không có destructive action |
| Success (semantic, có sẵn) | `#16794A` `success` | Icon mục checklist đã đạt, toast thành công |

**Accent reserved for (Phase 3):**
1. Nút submit primary: "Đăng nhập", "Đăng ký", "Đổi mật khẩu".
2. Focus ring (`:focus-visible`).

**Không dùng accent cho:** nút "Đăng nhập" trên header (dùng `secondary`), link "Chưa có tài khoản? Đăng ký" / "Đã có tài khoản? Đăng nhập", mục menu, Badge "Sắp có" (`neutral`), checklist, nút hiện/ẩn mật khẩu.

Contrast (WCAG AA, chữ thường 4.5:1): `danger` trên `danger-subtle` ≈ 6.1:1, `success` trên `surface` ≈ 5.3:1, `text-muted` trên `surface` ≈ 7.6:1, `primary-foreground` trên `primary` 4.91:1 (Phase 1). `text-disabled` chỉ dùng cho nhãn mục menu disabled; ý nghĩa "chưa dùng được" được truyền bằng Badge "Sắp có" (`text` trên `surface-muted`) và `aria-disabled`, không chỉ bằng màu.

---

## Component Inventory

### Dùng lại nguyên trạng (`@tripory/ui-web`)

`Card` (`default`, padding `lg`), `FormField` + `FormFieldLabel` / `FormFieldDescription` / `FormFieldError`, `Input` (size `lg`), `IconButton` (ghost, `sm`), `Avatar` (`sm`), `Badge` (`neutral`), `Skeleton` (circle), `Spinner` (`sm`), `Separator`, `Icon`, `DropdownMenu*`, `ErrorState`, `Toast`/`notify`.

### Bổ sung vào `ui-web` (generic, không chứa copy nghiệp vụ, mỗi cái có test theo DS-07)

| Component | Vị trí | Contract |
|-----------|--------|----------|
| `Button` prop `loadingLabel?: ReactNode` | `atoms/button.tsx` | Khi `loading` và có `loadingLabel`: hiện `Spinner sm` (decorative) + `loadingLabel` thấy được, cách nhau 8px, thay cho children. Giữ `aria-busy`, `disabled`, `focusableWhenDisabled`. Không có `loadingLabel` thì giữ hành vi cũ. Test: label đổi, `aria-busy="true"`, click lần hai không gọi handler |
| `DropdownMenuLinkItem` | `molecules/dropdown-menu.tsx` | Bọc `Menu.LinkItem` của Base UI 1.8, cùng class `menuItemVariants`, nhận `render` (để app truyền `next/link`). Export named, thêm vào barrel và `exports.test.ts` |
| `PasswordInput` | `molecules/password-input.tsx` | `Input size="lg"` + `IconButton` ghost `sm` đặt tuyệt đối bên phải (inset 4px), Input có padding phải 48px. Icon `Eye` khi đang ẩn, `EyeOff` khi đang hiện. `aria-label` "Hiện mật khẩu" / "Ẩn mật khẩu", `aria-pressed` false/true, `aria-controls` trỏ id Input (D-28). Toggle `type="button"`, không submit form. Nhận và chuyển `autoComplete`, `readOnly`, `aria-invalid`, `aria-describedby`. Prop `disabled` của toggle đi theo `readOnly` của Input. Prop reset: khi value về rỗng thì trạng thái về "ẩn" |
| `InlineAlert` | `molecules/inline-alert.tsx` | Variant `danger` (chỉ một variant trong Phase 3). Khối `rounded-control border border-danger bg-danger-subtle p-stack-md`, icon `CircleAlert` 20px `text-danger` decorative + nội dung `text-body text-danger`, gap 8px. `role="alert"`. Không có nút đóng. Không render khi không có nội dung |

### Organism nghiệp vụ mới (`apps/web/src/modules/identity/ui/`)

| Component | Contract |
|-----------|----------|
| `AuthFormCard` | Khung dùng chung ba trang: `Card padding="lg"`, `w-full max-w-form mx-auto`; `h1` Display; slot `alert`, slot form, slot footer |
| `LoginForm`, `RegisterForm`, `ChangePasswordForm` | Form client, Zod schema, mutation `errorToast: false` (xem Interaction Contract) |
| `PasswordChecklist` | Danh sách rule truyền vào `{ id, label, met }[]` (rule theo validator BE của từng form, D-27). Xem mục riêng dưới |
| `SubmitStatus` | Vùng `aria-live="polite"` ngay dưới nút submit, hiện dòng cold start sau 5 giây (D-31) |

### Organism dùng chung (`apps/web/src/components/`) — thay slot tĩnh Phase 1

| Component | Contract |
|-----------|----------|
| `UserMenu` | Ba trạng thái: đang đọc phiên (Skeleton), khách (nút "Đăng nhập"), có phiên (menu). Chi tiết ở mục UserMenu |
| `AppHeader` | Không đổi bố cục; UserMenu nằm trong `<Suspense>` với fallback là Skeleton tròn (D-11) |

---

## Layout: trang `/login`, `/register`, `/settings/password`

- `/login`, `/register`: AppShell `public` (có AppHeader). `/settings/password`: AppShell `dashboard`.
- Vùng main: một cột, `px-page-inline sm:px-page-inline-md`, `py-page-block md:py-page-block-wide`. Card căn giữa ngang, `w-full max-w-form`. Không căn giữa dọc (tránh nhảy layout khi bàn phím ảo mở).
- Thứ tự dọc trong Card (gap ghi trong ngoặc):
  1. `h1` Display (→ 24px)
  2. `InlineAlert` nếu có lỗi form (→ 16px)
  3. Các field (16px giữa các field)
  4. Nút submit primary `size="lg"`, `w-full` (→ 24px phía trên)
  5. `SubmitStatus` (8px phía trên, không chiếm chỗ khi rỗng)
  6. Footer (→ 24px): link chuyển trang, hoặc nút "Hủy" ở `/settings/password`
- 320px: Card rộng 288px, nội dung 240px; không overflow ngang. Nút submit cao 48px.
- Footer `/login`, `/register`: một dòng căn giữa, `text-body text-muted`: "Chưa có tài khoản?" + `Link` "Đăng ký" (`text-body font-semibold text-text underline underline-offset-4`, vùng chạm ≥ 44px qua `min-h-touch inline-flex items-center`). Link giữ nguyên `?next=` hợp lệ (D-01).
- Footer `/settings/password`: nút `secondary` `size="lg"` `w-full` "Hủy", render `next/link` tới `/itineraries/mine` (D-17), nằm dưới nút primary, cách 8px. Disabled khi đang gửi.
- Document title: thêm `title.template: "%s · Tripory"` (default "Tripory") ở root layout. Trang: "Đăng nhập · Tripory", "Tạo tài khoản · Tripory", "Đổi mật khẩu · Tripory".

### Field theo form (thứ tự cố định)

| Form | Field | Control | `autocomplete` | Ghi chú |
|------|-------|---------|----------------|---------|
| `/login` | Email | `Input lg`, `type="email"`, `inputMode="email"` | `email` | Autofocus: không |
| | Mật khẩu | `PasswordInput` | `current-password` | |
| `/register` | Họ và tên | `Input lg`, `type="text"`, `maxLength` không đặt (để Zod báo lỗi) | `name` | |
| | Email | `Input lg`, `type="email"` | `email` | |
| | Mật khẩu | `PasswordInput` + `PasswordChecklist` | `new-password` | |
| | Nhập lại mật khẩu | `PasswordInput` | `new-password` | |
| `/settings/password` | Mật khẩu hiện tại | `PasswordInput` | `current-password` | |
| | Mật khẩu mới | `PasswordInput` + `PasswordChecklist` | `new-password` | |
| | Nhập lại mật khẩu | `PasswordInput` | `new-password` | |

- Mọi ô đều bắt buộc: đặt `aria-required="true"` trên control, **không** bật `FormFieldLabel required` (tất cả đều bắt buộc nên dấu "(bắt buộc)" chỉ gây nhiễu).
- Form có `noValidate` (validate bằng Zod, D-29). Không dùng placeholder thay nhãn; không đặt placeholder.

---

## PasswordChecklist (D-26, D-27)

- Nằm trong `FormFieldDescription` ngay dưới ô mật khẩu mới, **luôn hiện từ lúc trang tải** (trước khi nhập). Thứ tự trong FormField: nhãn → control → checklist → lỗi field.
- Tiêu đề nhỏ `text-label font-normal text-muted`: "Mật khẩu cần có:". Danh sách `<ul>`, mỗi mục `flex items-start gap-inline-xs text-label`.
- Ô mật khẩu có `aria-describedby` trỏ tới id checklist và id lỗi.
- `<ul aria-live="polite">` (D-26). Mục chỉ đổi khi trạng thái đạt/chưa đạt đổi, không render lại nội dung mỗi phím.

| Trạng thái mục | Icon (16px, decorative) | Màu chữ | Tiền tố đọc màn hình (visually hidden) |
|----------------|-------------------------|---------|----------------------------------------|
| Chưa đạt | `Circle` `text-muted` | `text-muted` | "Chưa đạt: " |
| Đạt | `CircleCheck` `text-success` | `text-text` | "Đã đạt: " |

Không chỉ dựa vào màu: icon đổi hình và có tiền tố chữ.

**Copy catalog rule** (form chỉ dùng các rule mà validator BE của form đó thật sự có; researcher xác nhận danh sách, FE không thêm rule mạnh hơn BE):

| Rule id | Copy |
|---------|------|
| `minLength` | "Ít nhất {n} ký tự" (đăng ký: n = 8 theo FEATURES.md) |
| `uppercase` | "Có chữ in hoa (A–Z)" |
| `lowercase` | "Có chữ thường (a–z)" |
| `digit` | "Có chữ số (0–9)" |
| `special` | "Có ký tự đặc biệt (ví dụ ! @ # $)" |
| `differentFromCurrent` | "Khác mật khẩu hiện tại" — chỉ ở `/settings/password`; đạt khi ô mới không rỗng và khác ô "Mật khẩu hiện tại" |

---

## UserMenu (D-08, D-11..D-16)

### Trạng thái

| Trạng thái | Hiển thị |
|------------|----------|
| Đang đọc phiên (Suspense fallback) | `Skeleton` circle 32px (cỡ `Avatar sm`), `aria-hidden`, không có status text. Không hiện nút "Đăng nhập" (D-11) |
| Khách | `Button secondary size="md"` "Đăng nhập", render `next/link` tới `/login?next=<pathname+search hiện tại>`. Trên `/login` và `/register`: `href="/login"` không kèm `next`; trên `/login` thêm `aria-current="page"` (D-08). Không có nút "Đăng ký" |
| Có phiên | Trigger + menu bên dưới |

### Trigger

- `DropdownMenuTrigger` ghi đè thành ghost: `border-transparent`, hover `bg-surface-muted`. Vùng chạm ≥ 44×44px.
- Base `<640px`: chỉ `Avatar sm` (ảnh `avatarUrl` hoặc chữ cái đầu).
- `sm+`: `Avatar sm` + tên `text-label font-semibold text-text truncate max-w-(--user-menu-name-max-width)` + icon `ChevronDown` 16px decorative, gap 8px.
- `aria-label="Menu tài khoản: {tên}"` (tên đầy đủ, không cắt).
- Tên hiển thị = `fullName`; nếu rỗng thì dùng email (Avatar lấy chữ cái đầu từ chuỗi này).

### Nội dung popup (`align="end"`, rộng tối thiểu theo trigger, tối đa `max-w-form`)

```text
DropdownMenuGroup
  DropdownMenuGroupLabel   {tên}  (text-label semibold text-text, truncate)
                           {email} (text-label regular text-muted, truncate)
  ─ DropdownMenuSeparator ─
  DropdownMenuLinkItem     [Map]           Lịch trình của tôi      → /itineraries/mine
  DropdownMenuItem disabled[User]          Hồ sơ        [Badge neutral "Sắp có"]
  DropdownMenuItem disabled[MessageCircle] Tin nhắn     [Badge neutral "Sắp có"]
  DropdownMenuLinkItem     [KeyRound]      Đổi mật khẩu            → /settings/password
─ DropdownMenuSeparator ─
DropdownMenuItem           [LogOut]        Đăng xuất
```

- Icon mục 16px decorative, gap 8px; Badge đẩy sang phải (`ml-auto`).
- Mục đang ở route hiện tại (`/itineraries/mine`, `/settings/password`) có `aria-current="page"`.
- Mục disabled (D-15): `aria-disabled="true"`, không `href`, không điều hướng, không đóng menu khi chọn; vẫn tới được bằng phím mũi tên để trình đọc màn hình đọc "Hồ sơ, Sắp có". Nhãn dùng `text-disabled`, Badge giữ `neutral`. Executor xác minh hành vi focus của `Menu.Item disabled` trong Base UI 1.8; nếu Base UI bỏ qua mục disabled khi điều hướng phím thì dùng `focusableWhenDisabled` hoặc tương đương. Test bắt buộc kiểm điều này.
- "Đăng xuất" dùng variant `default` (không phải `danger`, vì không mất dữ liệu). Không xác nhận (D-21).
- Bàn phím theo Phase 1: Enter/Space mở, mũi tên di chuyển, Esc đóng và trả focus về trigger.

---

## Interaction Contract

### Validate client (D-29)

- Lỗi field hiện **khi blur** và **khi bấm Gửi**; sau khi một field đã có lỗi thì cập nhật lại theo từng phím. Chưa blur thì không báo lỗi.
- Nút Gửi **luôn bấm được**. Bấm khi còn lỗi: hiện tất cả lỗi, focus vào field lỗi đầu tiên theo thứ tự DOM, không gửi request.
- Field lỗi: `aria-invalid="true"`, viền `danger`, `FormFieldError` (`text-label text-danger`) dưới control (sau checklist nếu có).

### Đang gửi (D-30, D-31)

- Nút submit: `loading` + `loadingLabel` ("Đang đăng nhập…", "Đang tạo tài khoản…", "Đang lưu…"), `aria-busy`, chặn gửi lần hai (kể cả Enter trong ô).
- Mọi Input `readOnly` (nền `surface-muted` theo Input sẵn có); toggle hiện/ẩn và nút "Hủy" disabled. Link chuyển trang vẫn bấm được.
- Sau ~5 giây chưa xong: `SubmitStatus` hiện "Máy chủ đang khởi động, có thể mất tới 30 giây…" (`text-label text-muted`, căn giữa). Vùng `aria-live="polite"` luôn có trong DOM, chỉ đổi nội dung. Xong request thì xóa dòng.
- Hết 30 giây (timeout Phase 2 D-11): xóa dòng cold start, hiện câu chung D-04 trong `InlineAlert`.

### Lỗi từ BE (D-05, D-19)

- Cả ba mutation đặt `errorToast: false`; lỗi hiển thị tại form.
- Lỗi có field (ValidationProblemDetails, hoặc `errorCode` FE map sang field) → gắn vào ô đó, focus ô đó.
  - `/register`: `User.EmailAlreadyExists` → ô Email.
  - `/settings/password`: `Auth.InvalidCurrentPassword` → ô "Mật khẩu hiện tại", focus vào đó, các ô khác giữ nguyên (D-19). Mã "mật khẩu mới trùng mật khẩu cũ" (researcher chốt tên mã) → ô "Mật khẩu mới".
- Lỗi không gắn được vào field (gồm `Auth.InvalidCredentials`, lỗi FluentValidation không tên field, mạng, timeout, 5xx) → `InlineAlert` ở đầu form, nội dung = `selectErrorMessage` (bảng map → message BE → câu chung D-04).
- `/login` khi lỗi: giữ email, **xóa ô mật khẩu** (toggle về "ẩn"), focus vào ô mật khẩu. Alert được đọc nhờ `role="alert"`.
- `/register` và `/settings/password` khi lỗi không gắn field: giữ mọi giá trị, focus giữ ở nút submit.
- Gửi lại: xóa `InlineAlert` cũ ngay khi bắt đầu request mới.

### Thành công và điều hướng

| Sự kiện | Điều hướng | Toast |
|---------|------------|-------|
| Đăng nhập | `next` hợp lệ, không có thì `/itineraries/mine` (D-03), dùng `router.replace` | success "Chào mừng, {tên}" (D-07) |
| Đăng ký (tự đăng nhập, D-02) | Như trên | success "Tạo tài khoản thành công" (D-07) |
| Đổi mật khẩu | Đăng xuất, broadcast, sang `/login` (D-18) | success "Đã đổi mật khẩu, vui lòng đăng nhập lại" |
| Đăng xuất | `/` (D-21) | Không |
| Hết phiên thật (D-20) | `/login?next=<path hiện tại>` | info "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" |
| Đăng xuất/đổi mật khẩu ở tab khác (D-22) | `/` | Không |
| Đăng nhập ở tab khác (D-22) | Tab ở `/login`/`/register` → `next` hợp lệ hoặc `/itineraries/mine`; tab khác chỉ làm mới header | Không |

- Toast phải còn thấy sau điều hướng: gọi `notify` sau `router.replace` phía client (Toast mount ở root layout nên không bị unmount). Không dùng full reload cho các luồng có toast.
- Lỗi đăng xuất (hiếm): toast error câu chung D-04 theo chính sách mặc định Phase 2, ở lại trang.
- Copy toast D-20 là chuỗi khóa ở trên. Hằng `SESSION_EXPIRED_MESSAGE` hiện có trong `lib/feedback/error-messages.ts` khác dấu câu ("…hết hạn. Vui lòng…"); không dùng nó cho toast D-20 trừ khi cập nhật hằng (và test) cho khớp D-20.

### Hồi phục phiên khi mở trang dashboard (D-24, D-20)

- Trong lúc refresh im lặng: hiển thị skeleton của `(dashboard)/loading.tsx` (có status ẩn "Đang tải nội dung…"), không có UI mới.
- Refresh lỗi tạm thời (mạng, timeout, 5xx): không đăng xuất; vùng nội dung hiện `ErrorState` (variant `page`) với copy Phase 1 và nút "Thử lại" chạy lại refresh.
- Refresh thất bại thật: theo D-20.

### Đã đăng nhập mở `/login`, `/register` (D-04)

Redirect ở `proxy.ts`, không render form, không toast.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA `/login` | "Đăng nhập" (đang gửi: "Đang đăng nhập…") |
| Primary CTA `/register` | "Đăng ký" (đang gửi: "Đang tạo tài khoản…") |
| Primary CTA `/settings/password` | "Đổi mật khẩu" (đang gửi: "Đang lưu…"); nút phụ "Hủy" |
| Tiêu đề trang | "Đăng nhập", "Tạo tài khoản", "Đổi mật khẩu" |
| Link chuyển trang | "Chưa có tài khoản? Đăng ký", "Đã có tài khoản? Đăng nhập" |
| Nhãn ô | "Email", "Mật khẩu", "Họ và tên", "Nhập lại mật khẩu", "Mật khẩu hiện tại", "Mật khẩu mới" |
| Nút hiện/ẩn | `aria-label` "Hiện mật khẩu" / "Ẩn mật khẩu" |
| Checklist | "Mật khẩu cần có:" + catalog rule ở trên; tiền tố ẩn "Đã đạt: " / "Chưa đạt: " |
| Header khách | "Đăng nhập" |
| UserMenu | Trigger `aria-label` "Menu tài khoản: {tên}"; mục "Lịch trình của tôi", "Hồ sơ", "Tin nhắn", "Đổi mật khẩu", "Đăng xuất"; Badge "Sắp có" |
| Cold start | "Máy chủ đang khởi động, có thể mất tới 30 giây…" |
| Toast | "Chào mừng, {tên}" · "Tạo tài khoản thành công" · "Đã đổi mật khẩu, vui lòng đăng nhập lại" · "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" |
| Empty state | Phase 3 không có danh sách dữ liệu nên không có empty state mới |
| Error state (form, không gắn field) | Theo `selectErrorMessage`: ví dụ "Email hoặc mật khẩu không đúng." (`Auth.InvalidCredentials`); dự phòng câu chung "Đã có lỗi xảy ra, vui lòng thử lại" |
| Error state (trang, hồi phục phiên lỗi tạm thời) | `ErrorState` Phase 1: "Không thể tải nội dung" / "Đã xảy ra sự cố. Vui lòng thử lại." / "Thử lại" |
| Destructive confirmation | Không có. Đăng xuất không xác nhận (D-21); đổi mật khẩu không xóa dữ liệu |

### Lỗi validate client (Zod)

| Field | Điều kiện | Copy |
|-------|-----------|------|
| Email | rỗng | "Vui lòng nhập email." |
| Email | sai dạng | "Email không đúng định dạng." |
| Họ và tên | rỗng sau trim | "Vui lòng nhập họ và tên." |
| Họ và tên | > 100 ký tự | "Họ và tên tối đa 100 ký tự." |
| Mật khẩu (login) | rỗng | "Vui lòng nhập mật khẩu." |
| Mật khẩu hiện tại | rỗng | "Vui lòng nhập mật khẩu hiện tại." |
| Mật khẩu / Mật khẩu mới | rỗng | "Vui lòng nhập mật khẩu." |
| Mật khẩu / Mật khẩu mới | chưa đạt checklist | "Mật khẩu chưa đạt đủ yêu cầu." |
| Nhập lại mật khẩu | rỗng | "Vui lòng nhập lại mật khẩu." |
| Nhập lại mật khẩu | không khớp | "Mật khẩu nhập lại không khớp." |

Giọng văn theo Phase 1: tiếng Việt trung tính, câu ngắn, không dấu chấm than. Lỗi field có dấu chấm cuối (khớp bảng map Phase 2); toast và câu chung D-04 không có dấu chấm cuối.

---

## Accessibility Checklist (bổ sung Phase 1)

- Mỗi trang có đúng một `h1`; form có `aria-labelledby` trỏ `h1`.
- Label nối `htmlFor`/`id` qua `FormField`; lỗi và checklist nối `aria-describedby`.
- Inline alert `role="alert"`; lỗi field `aria-live="polite"` (sẵn trong `FormFieldError`); checklist và cold start `aria-live="polite"`.
- Toggle mật khẩu: `aria-label` + `aria-pressed` + `aria-controls` (D-28), vùng chạm 44×44px.
- Không có `autoFocus`. Focus chỉ di chuyển theo các quy tắc lỗi ở trên.
- Mọi vùng chạm ≥ 44px: trigger UserMenu, nút "Đăng nhập" header, link chuyển trang, mục menu.
- Smoke ở 320×568, 390×844, 768×1024, 1440×900: không overflow ngang; bàn phím ảo không che nút submit (form không căn giữa dọc, trang cuộn được).

---

## Testing Contract (UI)

| Đối tượng | Test bắt buộc |
|-----------|---------------|
| `Button loadingLabel` | Hiện label + spinner, `aria-busy`, chặn kích hoạt lần hai |
| `PasswordInput` | Toggle đổi `type`, `aria-pressed`, `aria-label`; không submit form; reset khi rỗng; disabled khi `readOnly` |
| `InlineAlert` | `role="alert"`, không render khi rỗng |
| `DropdownMenuLinkItem` | Render link, Enter điều hướng, named export |
| `PasswordChecklist` | Hiện trước khi nhập; đổi icon + tiền tố khi đạt; `aria-live`; `differentFromCurrent` |
| `LoginForm` / `RegisterForm` / `ChangePasswordForm` | Lỗi khi blur/Gửi; focus field lỗi đầu tiên; đang gửi read-only + chặn gửi lần hai; dòng cold start sau 5s (fake timers); map lỗi BE vào field/alert; login xóa mật khẩu giữ email |
| `UserMenu` | Ba trạng thái; mobile chỉ avatar, `sm+` có tên; `aria-label` trigger; mục disabled có `aria-disabled` và tới được bằng phím; `next` đúng trên nút khách |

Test bằng Vitest + Testing Library (jsdom), fake `HttpClient`, không MSW.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Không thêm block mới; component bổ sung viết tay trên Base UI 1.8 theo pattern Phase 1 | not required — official only, `registries: {}` xác nhận 2026-10-13 |
| Third-party | none | not applicable — không khai báo |

---

## Source Traceability

| Source | Quyết định dùng |
|--------|-----------------|
| `03-CONTEXT.md` | D-01..D-32 (bố cục, gate, UserMenu, đổi mật khẩu, hết phiên, form, trạng thái gửi, toàn bộ copy khóa) |
| `01-UI-SPEC.md` | Token, typography, spacing, màu, accent, focus ring, state matrix, AppHeader/AppShell, ErrorState, Toast |
| `02-CONTEXT.md` | D-04 câu chung, D-05/D-05a lỗi field, D-07..D-10 chính sách toast, D-11 timeout 30s |
| `REQUIREMENTS.md` | AUTH-01, 05, 06, 07 (phần UI) |
| Codebase scout | `components.json` base-nova, API `Button`/`Input`/`FormField`/`DropdownMenu`/`Avatar`/`Toast`, Base UI có `Menu.LinkItem`, chưa có `apps/web/src/modules`, `ERROR_MESSAGES` có mã Auth/User |
| Mặc định của researcher | Token `size-form`/`user-menu-name-max-width`, `PasswordInput`, `InlineAlert`, `loadingLabel`, copy checklist và lỗi Zod, icon menu, toast D-20 variant `info`, focus sau lỗi, title template |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
