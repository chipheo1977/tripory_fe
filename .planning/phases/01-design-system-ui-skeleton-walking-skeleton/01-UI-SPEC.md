---
phase: 1
slug: design-system-ui-skeleton-walking-skeleton
status: approved
shadcn_initialized: false
preset: base-nova
created: 2026-10-10
---

# Phase 1 — UI Design Contract

> Hợp đồng hình ảnh và tương tác cho Design System, UI Skeleton & Walking Skeleton. Đây là nguồn sự thật để planner, executor, checker và auditor triển khai/đối chiếu Phase 1.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn CLI; chưa khởi tạo tại thời điểm viết spec, phải khởi tạo trong Phase 1 |
| Preset | `base-nova`; cùng `style`, `iconLibrary`, `baseColor` ở các workspace có `components.json` |
| Component library | `@base-ui/react` |
| Icon library | `lucide-react` qua atom `Icon` |
| Font | Inter qua `next/font`, `subsets: ["latin", "vietnamese"]` |
| Styling | Tailwind CSS 4.3, CSS variables và `@theme inline` |
| Utilities | `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` |
| Feedback | `sonner` qua molecule `Toast` |
| Visual direction | Tối giản, tinh tế, nhiều khoảng trắng, neutral + một coral accent; gần tinh thần Notion/Linear nhưng không sao chép |
| Primary design goal | Có thể rebrand bằng cách thay primitive hoặc semantic mapping mà không sửa component |

**Nguồn quyết định:** locked user decisions, REQUIREMENTS DS-01..07, ROADMAP Phase 1, STACK.md. Repo hiện chưa có `components.json`, `packages/ui-web` hoặc `packages/design-tokens`; Phase 1 phải tạo mới, không port `lib/colors.ts` từ FE cũ. Không khởi tạo shadcn trong bước viết docs này.

### Nguyên tắc hình ảnh

1. Nền sáng, phẳng, nhiều whitespace; hierarchy đến từ typography, khoảng cách và border nhẹ trước khi dùng shadow.
2. Coral orange chỉ chiếm xấp xỉ 10% diện tích nhìn thấy. Không dùng coral cho mọi link, icon hay vùng trang trí.
3. Mật độ cân bằng: nội dung đọc thoáng nhưng control không phình to; control mặc định cao 40px, mọi target tương tác đạt tối thiểu 44×44px nhờ hit area.
4. Không dùng gradient, glassmorphism, shadow đậm, radius quá tròn hoặc animation mang tính trình diễn.
5. Light mode là mode duy nhất của milestone này. Có slot dark-mode trong token nhưng không có media query/theme toggle tự kích hoạt.

---

## Token Architecture

### Mô hình ba lớp

```text
primitive tokens  ->  semantic tokens  ->  optional component tokens
(raw palette/scale)   (meaning/state)      (stable exception only)
                             |
                             +--> components consume this layer only
```

- **Primitive:** tên mô tả giá trị, không mô tả nghiệp vụ, ví dụ `--primitive-neutral-900`, `--primitive-coral-600`, `--primitive-space-4`.
- **Semantic:** tên mô tả vai trò, ví dụ `--color-surface`, `--color-text-muted`, `--space-control-gap`, `--radius-control`.
- **Component:** chỉ tạo khi một component có contract ổn định không biểu đạt được bằng semantic dùng chung, ví dụ `--sheet-snap-medium`; không dùng component token để che hard-code.
- Component trong `ui-web` **không được** tham chiếu `--primitive-*`, hex/rgb/hsl, số spacing/radius tùy ý hoặc Tailwind palette như `text-zinc-600`. Component chỉ dùng semantic token đã map qua utility Tailwind.
- Rebrand thay primitive và/hoặc semantic mapping. Không sửa JSX/CSS của component chỉ để đổi thương hiệu.

### Naming convention

| Layer | Pattern | Example |
|-------|---------|---------|
| Primitive color | `--primitive-{family}-{step}` | `--primitive-coral-600` |
| Primitive scale | `--primitive-{category}-{step}` | `--primitive-space-4` |
| Semantic color | `--color-{role}[-{state}]` | `--color-primary-hover` |
| Semantic size | `--{category}-{role}` | `--space-page-inline`, `--radius-control` |
| Component token | `--{component}-{property}-{variant}` | `--sheet-snap-medium` |
| Tailwind exposure | `--color-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--breakpoint-*` trong `@theme inline` | `bg-surface`, `text-muted`, `rounded-control` |

### File layout bắt buộc

```text
packages/design-tokens/
  src/
    primitives.css       # raw palette và scales
    semantic.css         # light semantic mapping
    dark.css             # selector slot, chưa import/kích hoạt
    theme.css            # @theme inline exports cho Tailwind 4.3
    index.css             # public CSS entry
    index.ts              # metadata/type exports nếu thực sự cần
packages/ui-web/
  src/
    atoms/
    molecules/
    lib/cn.ts
    styles.css            # @source/component styles nếu cần
apps/web/src/app/globals.css
  # import tailwindcss, @tripory/design-tokens CSS, @source ui-web
```

`apps/web/src/app/globals.css` là nơi compose, không định nghĩa lại brand token. Tailwind phải scan workspace source bằng `@source "../../../../packages/ui-web/src"`. `design-tokens` và `ui-web` dùng named package exports; cấm deep import vào `src/**`.

### `@theme` mapping contract

`theme.css` map semantic CSS variables bằng `@theme inline`; ví dụ contract (minh họa, không phải application code):

```css
@theme inline {
  --color-background: var(--color-background);
  --color-surface: var(--color-surface);
  --color-primary: var(--color-primary);
  --color-primary-foreground: var(--color-primary-foreground);
  --color-border: var(--color-border);
  --color-focus-ring: var(--color-focus-ring);
  --font-sans: var(--font-family-sans);
  --radius-control: var(--radius-control);
  --shadow-overlay: var(--shadow-overlay);
}
```

Executor có thể tránh self-reference bằng cách dùng tên nội bộ semantic như `--semantic-color-background` rồi map ra namespace Tailwind `--color-background`; dù chọn cách nào, public utility và tên semantic trong bảng dưới phải giữ nguyên.

### Dark-mode slot

- `dark.css` khai báo cùng đầy đủ semantic keys dưới selector chưa kích hoạt `[data-theme="dark"]`.
- Không import `dark.css` vào app trong Phase 1, không thêm toggle, không dùng `prefers-color-scheme`, không đưa class `dark:*` vào component.
- Khi UX-09 được thực hiện, chỉ map lại semantic values; component không đổi.

---

## Complete Primitive Tokens

### Primitive color palette

| Token | Value | Purpose |
|-------|-------|---------|
| `--primitive-neutral-0` | `#FFFFFF` | White canvas/elevated base |
| `--primitive-neutral-50` | `#FAFAF9` | Warm off-white surface |
| `--primitive-neutral-100` | `#F5F5F4` | Subtle fill |
| `--primitive-neutral-200` | `#E7E5E4` | Border |
| `--primitive-neutral-300` | `#D6D3D1` | Strong border/disabled |
| `--primitive-neutral-400` | `#A8A29E` | Placeholder/disabled text |
| `--primitive-neutral-500` | `#78716C` | Secondary icon |
| `--primitive-neutral-600` | `#57534E` | Muted text |
| `--primitive-neutral-700` | `#44403C` | Strong secondary text |
| `--primitive-neutral-800` | `#292524` | High-emphasis fill |
| `--primitive-neutral-900` | `#1C1917` | Primary text |
| `--primitive-neutral-950` | `#0C0A09` | Maximum contrast |
| `--primitive-coral-50` | `#FFF3EE` | Accent tint |
| `--primitive-coral-100` | `#FFE2D5` | Accent subtle fill |
| `--primitive-coral-200` | `#FFC1AA` | Accent soft border |
| `--primitive-coral-300` | `#FF9877` | Decorative data point only |
| `--primitive-coral-400` | `#F56F4B` | Non-text highlight only |
| `--primitive-coral-500` | `#E15A37` | Strong highlight |
| `--primitive-coral-600` | `#C44728` | Primary/accent; AA with white |
| `--primitive-coral-700` | `#A83C22` | Primary hover/pressed |
| `--primitive-coral-800` | `#84301D` | Strong accent text |
| `--primitive-coral-900` | `#612418` | Deep accent |
| `--primitive-red-50` | `#FEF2F2` | Danger subtle fill |
| `--primitive-red-600` | `#B42318` | Danger action/text |
| `--primitive-red-700` | `#912018` | Danger hover |
| `--primitive-green-50` | `#ECFDF3` | Success subtle fill |
| `--primitive-green-700` | `#16794A` | Success text/icon |
| `--primitive-amber-50` | `#FFFAEB` | Warning subtle fill |
| `--primitive-amber-700` | `#B54708` | Warning text/icon |

### Primitive spacing scale

| Token | Value |
|-------|-------|
| `--primitive-space-1` | `4px` |
| `--primitive-space-2` | `8px` |
| `--primitive-space-4` | `16px` |
| `--primitive-space-6` | `24px` |
| `--primitive-space-8` | `32px` |
| `--primitive-space-12` | `48px` |
| `--primitive-space-16` | `64px` |

Spacing scale chỉ gồm tập chuẩn `4/8/16/24/32/48/64`. `--size-touch-min: 44px` là sizing/touch-target token độc lập, không thuộc spacing scale. Các kích thước control như `40px`, `44px` chỉ được khai báo trong sizing contract và không được dùng làm spacing.

### Primitive typography

| Token | Value |
|-------|-------|
| `--primitive-font-size-1` | `14px` |
| `--primitive-font-size-2` | `16px` |
| `--primitive-font-size-3` | `20px` |
| `--primitive-font-size-4` | `28px` |
| `--primitive-font-weight-regular` | `400` |
| `--primitive-font-weight-semibold` | `600` |
| `--primitive-line-height-body` | `1.5` |
| `--primitive-line-height-heading` | `1.2` |
| `--primitive-letter-spacing-tight` | `-0.02em` |
| `--primitive-letter-spacing-normal` | `0` |

Chỉ có 4 font sizes và đúng 2 font weights trong Phase 1.

---

## Complete Semantic Tokens

### Semantic colors

| Token | Primitive mapping | Usage |
|-------|-------------------|-------|
| `--color-background` | `neutral-50` | Page canvas, dominant 60% |
| `--color-surface` | `neutral-0` | Card/control/nav, secondary 30% |
| `--color-surface-muted` | `neutral-100` | Subtle group/hover fill |
| `--color-surface-elevated` | `neutral-0` | Dialog, Sheet, menu |
| `--color-surface-inverse` | `neutral-900` | Inverse badge/tooltip |
| `--color-text` | `neutral-900` | Primary copy |
| `--color-text-muted` | `neutral-600` | Secondary copy |
| `--color-text-subtle` | `neutral-500` | Metadata/placeholder where AA is met |
| `--color-text-disabled` | `neutral-400` | Disabled only; never essential information |
| `--color-text-inverse` | `neutral-0` | Text on inverse surface |
| `--color-border` | `neutral-200` | Default divider/control border |
| `--color-border-strong` | `neutral-300` | Hover/selected neutral border |
| `--color-input` | `neutral-0` | Input background |
| `--color-placeholder` | `neutral-500` | Input placeholder |
| `--color-primary` | `coral-600` | Primary CTA/selected emphasis |
| `--color-primary-hover` | `coral-700` | Hover/pressed primary |
| `--color-primary-subtle` | `coral-50` | Selected/tinted accent surface |
| `--color-primary-border` | `coral-200` | Accent-tinted border |
| `--color-primary-foreground` | `neutral-0` | Text/icon on primary |
| `--color-accent` | `coral-600` | Accent text/icon on light surface |
| `--color-focus-ring` | `coral-600` | Keyboard focus ring only |
| `--color-danger` | `red-600` | Destructive action/error text |
| `--color-danger-hover` | `red-700` | Destructive hover/pressed |
| `--color-danger-subtle` | `red-50` | Error background |
| `--color-success` | `green-700` | Success feedback |
| `--color-success-subtle` | `green-50` | Success background |
| `--color-warning` | `amber-700` | Warning feedback |
| `--color-warning-subtle` | `amber-50` | Warning background |
| `--color-overlay` | `rgb(12 10 9 / 48%)` derived from `neutral-950` | Modal scrim; defined once in semantic layer |

### Semantic spacing and sizing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-inline-xs` | `4px` | Tight icon/text gap |
| `--space-inline-sm` | `8px` | Compact inline gap |
| `--space-control-gap` | `8px` | Icon-label gap |
| `--space-stack-sm` | `8px` | Label/help stack |
| `--space-stack-md` | `16px` | Default content stack |
| `--space-stack-lg` | `24px` | Section stack |
| `--space-section` | `32px` | Major section separation |
| `--space-page-block` | `48px` | Mobile page top/bottom |
| `--space-page-block-wide` | `64px` | Desktop page top/bottom |
| `--space-page-inline` | `16px` | Mobile page gutter |
| `--space-page-inline-md` | `24px` | Tablet page gutter |
| `--space-page-inline-lg` | `32px` | Desktop page gutter |
| `--size-control-sm` | `32px` | Visual compact control; hit area still 44px |
| `--size-control-md` | `40px` | Default visual control; hit area 44px |
| `--size-control-lg` | `48px` | Prominent/mobile control |
| `--size-touch-min` | `44px` | Minimum interactive target |
| `--size-content-sm` | `640px` | Reading/forms |
| `--size-content-md` | `768px` | Standard content |
| `--size-content-lg` | `1200px` | AppShell maximum content width |
| `--size-header` | `64px` | AppHeader height |

### Semantic radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` | `0px` | Edge-to-edge regions only |
| `--radius-subtle` | `4px` | Badge/small indicator |
| `--radius-control` | `8px` | Button, inputs, menu items |
| `--radius-container` | `8px` | Card, EmptyState, ErrorState |
| `--radius-overlay` | `12px` | Dialog/Sheet floating top corners |
| `--radius-pill` | `9999px` | Avatar, Spinner track, status pill only |

Radius nhận diện mặc định là `8px`; `12px` chỉ dành overlay cần phân lớp và `9999px` chỉ dành hình tròn/pill có semantics.

### Shadow scale

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-none` | `none` | Default flat surface |
| `--shadow-sm` | `0 1px 2px rgb(12 10 9 / 6%)` | Hovered card/control |
| `--shadow-md` | `0 8px 24px rgb(12 10 9 / 10%)` | Dropdown/Tooltip |
| `--shadow-overlay` | `0 20px 48px rgb(12 10 9 / 16%)` | Dialog/Sheet |

### Z-index scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | `0` | Page flow |
| `--z-sticky` | `20` | AppHeader |
| `--z-dropdown` | `40` | Select/DropdownMenu/Tooltip |
| `--z-overlay` | `60` | Scrim |
| `--z-modal` | `70` | Dialog/Sheet |
| `--z-toast` | `90` | Toast region |

Không dùng z-index ngoài scale. Nested overlay dùng portal/layer đúng loại, không tăng số tùy ý.

### Motion scale

| Token | Value | Usage |
|-------|-------|-------|
| `--motion-duration-fast` | `120ms` | Hover/focus color |
| `--motion-duration-normal` | `180ms` | Menu/tooltip/dialog fade |
| `--motion-duration-slow` | `280ms` | Sheet translate/snap |
| `--motion-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Enter/move |
| `--motion-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exit |

- Animate `opacity`, `transform` và màu; không animate layout kích thước nếu không cần.
- Với `prefers-reduced-motion: reduce`, duration trở thành `0ms` cho decorative transition; Spinner vẫn thể hiện tiến trình bằng label/aria và có thể dùng chuyển động tối thiểu cần thiết.
- Không dùng bounce hoặc overshoot.

### Breakpoint scale

| Token | Value | Contract |
|-------|-------|----------|
| `--breakpoint-sm` | `640px` | Phone ngang/large phone |
| `--breakpoint-md` | `768px` | Tablet; bắt đầu desktop-like header |
| `--breakpoint-lg` | `1024px` | Desktop shell |
| `--breakpoint-xl` | `1280px` | Wide viewport; content vẫn max 1200px |

Mobile-first: base `<640px`, chỉ bổ sung min-width breakpoint. Không tạo breakpoint theo từng device.

---

## Spacing Scale

Declared values (mọi giá trị là bội số 4):

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | `4px` | Icon gaps, tight inset |
| `sm` | `8px` | Compact element spacing |
| `md` | `16px` | Default element spacing |
| `lg` | `24px` | Section padding |
| `xl` | `32px` | Layout gaps |
| `2xl` | `48px` | Major section breaks |
| `3xl` | `64px` | Page-level spacing |

**Exceptions:** none. Giá trị `44px` thuộc sizing/touch-target contract (`--size-touch-min`), không phải spacing exception.

---

## Typography

| Role | Size | Weight | Line Height | Letter spacing |
|------|------|--------|-------------|----------------|
| Body | `16px` | regular `400` | `1.5` | `0` |
| Label | `14px` | semibold `600` | `1.5` | `0` |
| Heading | `20px` | semibold `600` | `1.2` | `-0.02em` |
| Display | `28px` | semibold `600` | `1.2` | `-0.02em` |

- Inter được nạp bằng `next/font` với `latin` và `vietnamese`; CSS semantic `--font-family-sans` nhận font variable từ app composition.
- Không dùng weight khác `400` và `600`, không dùng all caps cho heading/action.
- Body tối ưu 45–75 ký tự mỗi dòng; copy dài dùng content width `640px`.
- Số/tabular metadata có thể dùng `font-variant-numeric: tabular-nums`, không thêm font mono vào design system Phase 1.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FAFAF9` (`background`) | Page background và whitespace |
| Secondary (30%) | `#FFFFFF` (`surface`) | Cards, AppHeader, controls, overlays |
| Accent (10%) | `#C44728` (`primary`/`accent`) | Primary CTA, active tab underline/selected control, focus ring, progress emphasis, retry action |
| Destructive | `#B42318` (`danger`) | Chỉ dành cho destructive actions và error semantics |

**Accent reserved for:** primary CTA; active/selected indicator; keyboard focus ring; retry action; one high-priority status/progress emphasis; accent icon trong EmptyState nếu có. Không dùng accent cho body links mặc định, toàn bộ icon, decorative background lớn, AppHeader background hoặc mọi border.

### WCAG AA contrast evidence

Tỷ lệ tính theo WCAG relative luminance (sRGB linearized), ngưỡng normal text AA `4.5:1`:

| Pair | Ratio | Result |
|------|-------|--------|
| `#FFFFFF` text on `#C44728` accent | `4.91:1` | PASS AA normal text |
| `#C44728` accent text/icon on `#FFFFFF` surface | `4.91:1` | PASS AA normal text |
| `#C44728` accent text/icon on `#FAFAF9` background | `4.70:1` | PASS AA normal text |

Primary hover dùng `#A83C22`, không làm giảm contrast với white. Coral bước 300–500 không được dùng cho normal text. Focus ring không dựa vào màu đơn lẻ: ring có độ dày/offset rõ ràng.

---

## Focus Ring Specification

- Chỉ hiện với `:focus-visible`, không hiện cố định sau pointer click.
- Ring: `2px solid var(--color-focus-ring)` + `2px` offset dùng `var(--color-background)`; tổng dấu hiệu ngoài control là 4px.
- Trên surface coral/danger hoặc nền khiến coral khó phân biệt, dùng ring ngoài `--color-text` và offset `--color-surface`; component không tự hard-code màu.
- Không dùng `outline: none` nếu chưa thay bằng ring tương đương.
- Compound widget đặt focus theo pattern ARIA của Base UI: roving focus cho Tabs/Menu, trap focus cho Dialog/Sheet.
- Disabled element không nhận focus; loading button vẫn có thể nhận focus nhưng không kích hoạt lại action và công bố trạng thái bận.

---

## Component Inventory

### Atoms (`packages/ui-web/src/atoms`)

| Component | Variants / sizes | Required states and contract |
|-----------|------------------|------------------------------|
| `Button` | `primary`, `secondary`, `ghost`, `danger`; `sm` 32, `md` 40, `lg` 48 | hover, focus-visible, pressed, disabled, loading; loading giữ nguyên width, có Spinner, `aria-busy`, chặn double action; target ≥44px |
| `IconButton` | `ghost`, `secondary`, `danger`; `sm`, `md`, `lg` | bắt buộc accessible name qua `aria-label`; icon decorative `aria-hidden`; target ≥44×44; Tooltip chỉ bổ trợ, không thay label |
| `Input` | `md`, `lg` | default, hover border, focus-visible, disabled, read-only, error (`aria-invalid`, `aria-describedby`); không dùng placeholder thay Label |
| `Textarea` | `md`, `lg`; resize vertical | như Input; min-height 96px; error/help association |
| `Label` | required/optional indicator | `htmlFor` khớp control; required không chỉ biểu thị bằng màu |
| `Checkbox` | checked, unchecked, indeterminate | click/Space toggle; visible focus; disabled; label hit area ≥44px |
| `Switch` | on/off | role `switch`, `aria-checked`; Space toggle; label ngoài; không dùng cho action tức thời |
| `Avatar` | `sm` 32, `md` 40, `lg` 48 | image, initials fallback, neutral fallback; alt theo ngữ cảnh; hình tròn |
| `Badge` | `neutral`, `primary`, `success`, `warning`, `danger` | không interactive; icon optional; text truyền tải semantics, không dùng màu làm tín hiệu duy nhất |
| `Spinner` | `sm` 16, `md` 20, `lg` 24 | decorative khi nằm trong button; standalone có `role=status` và accessible label |
| `Skeleton` | text, circle, block | `aria-hidden`; container loading có status text dành cho assistive tech; reduced-motion safe |
| `Separator` | horizontal, vertical | decorative mặc định; semantic separator dùng role phù hợp; contrast nhẹ |
| `Icon` | Lucide name/component; `sm` 16, `md` 20, `lg` 24 | decorative mặc định `aria-hidden`; semantic icon phải có label ở parent; stroke width nhất quán 2 |

### Molecules (`packages/ui-web/src/molecules`)

| Component | Variants / sizes | Required states and interaction |
|-----------|------------------|---------------------------------|
| `FormField` | control slot + `FormFieldLabel`, `FormFieldDescription`, `FormFieldError` named exports | tạo ID ổn định; nối `aria-describedby`; error polite/live; required text rõ; không chứa schema nghiệp vụ |
| `SearchInput` | `md`, `lg`; clear optional | role searchbox; label accessible; Esc/clear button xóa; loading indicator; không tự debounce nghiệp vụ |
| `Select` | `sm`, `md`, `lg`; single select | trigger, popup, item, group, label named exports; keyboard Arrow/Home/End/Enter/Esc; error/disabled/loading; focus trả trigger |
| `Tabs` | `line`, `contained`; horizontal | `Tabs`, `TabsList`, `TabsTrigger`, `TabsPanel` named exports; Arrow keys, Home/End; active không chỉ dựa màu |
| `DropdownMenu` | default, checkbox/radio item support | named compound exports; Enter/Space mở, Arrow điều hướng, Esc đóng, focus trả trigger; danger item tách nhóm |
| `Tooltip` | top/right/bottom/left | hover + keyboard focus; delay 400ms; Esc đóng; không chứa thông tin thiết yếu duy nhất; không dùng trên touch làm đường duy nhất |
| `Toast` | success, error, info, warning | Sonner adapter; title/body/action; `aria-live` phù hợp; max 3; auto-dismiss 5s trừ actionable/error 8s; pause on hover/focus |
| `Dialog` | `sm` 400, `md` 560, `lg` 720 | modal, title/description/close named exports; trap focus; Esc và scrim đóng trừ thao tác destructive đang commit; restore focus; body scroll lock |
| `Sheet` | bottom mặc định; side optional cho desktop | multi-snap mobile; drag handle; keyboard tương đương; trap focus khi modal; Esc đóng; safe-area; snap points dưới đây |
| `Card` | `default`, `interactive`, `selected`; padding `sm`, `md`, `lg` | hover/focus chỉ khi interactive; toàn card không giả button; selected có icon/border ngoài màu |
| `EmptyState` | compact, page | icon/illustration nhỏ, heading, body, optional action; không render CTA giả/route chưa có |
| `ErrorState` | inline, card, page | heading/body, retry `Button` mặc định label “Thử lại”; callback optional; lỗi không lộ stack/technical details |

### Shared organisms (`apps/web/src/components`)

| Component | Contract |
|-----------|----------|
| `AppHeader` | Logo/wordmark, nav chỉ route tồn tại, static `UserMenu` slot; sticky; không chứa business fetch; behavior theo breakpoint ở dưới |
| `UserMenu` | Slot tĩnh Phase 1; Avatar neutral + label “Tài khoản”; không giả session/user data; real session được nối ở Phase 3 |
| `AppShell` | `public` và `dashboard` variants; compose header/main; dùng `min-height: 100dvh`, safe-area, max content width; không chứa business logic |

Business organisms/templates trong tương lai đặt tại `apps/web/src/modules/*/ui`; Phase 1 không đưa chúng vào `ui-web`. Compound children có thể vượt Server/Client boundary phải là named exports, không dùng static property kiểu `Tabs.Panel`.

### Shared state matrix

| State | Visual | Interaction | Accessibility |
|-------|--------|-------------|---------------|
| Default | semantic surface/text/border | normal | role/name/value đầy đủ |
| Hover | surface-muted hoặc border-strong; 120ms | pointer only | không là tín hiệu duy nhất |
| Focus-visible | ring spec 2px + 2px offset | keyboard | không bị clip bởi overflow |
| Pressed/selected | primary-subtle + icon/border | active semantics | `aria-pressed`, `aria-selected` hoặc `aria-current` đúng pattern |
| Disabled | neutral muted; không opacity thấp hơn 50% cho toàn text | không action, không focus | native `disabled` khi có thể |
| Loading | giữ layout; Spinner/Skeleton | chặn action lặp | `aria-busy`; status announcement một lần |
| Error | danger text + icon + border khi là field | retry nếu recoverable | `aria-invalid`, linked description, live region vừa đủ |

---

## Sheet Snap Points

Bottom Sheet mobile có ba snap points tính trên **available viewport height** sau safe-area và keyboard:

| Name | Value | Use |
|------|-------|-----|
| `peek` | `25dvh`, clamp tối thiểu `160px` | Xem ngữ cảnh phía sau, nội dung tóm tắt |
| `medium` | `60dvh` | Default thao tác timeline/list |
| `expanded` | `92dvh` trừ `env(safe-area-inset-top)` | Form/danh sách dài; vẫn còn dấu hiệu phân lớp |

- Component token: `--sheet-snap-peek`, `--sheet-snap-medium`, `--sheet-snap-expanded`.
- Mở mặc định ở `medium`; drag qua midpoint hoặc velocity threshold để snap gần nhất; swipe xuống từ `peek` đóng.
- Drag handle có target 44px. Người dùng bàn phím có control accessible “Mở rộng bảng”, “Thu gọn bảng”, “Đóng bảng”; không bắt buộc drag.
- Nội dung trong sheet scroll độc lập chỉ khi ở snap hiện tại; overscroll không kéo body.
- Khi virtual keyboard mở, dùng `visualViewport`/available viewport adapter ở app nếu cần; action cuối không bị bàn phím hoặc safe-area che.
- Từ `md` trở lên, consumer có thể chuyển cùng nội dung sang panel/sidebar; Sheet base vẫn hỗ trợ bottom placement.

---

## AppShell & AppHeader Responsive Contract

### AppShell

| Viewport | Public | Dashboard |
|----------|--------|-----------|
| Base `<640px` | Một cột, gutter 16px, page block 32–48px, full-width content | Một cột; không sidebar giả; content full-width trong gutter 16px |
| `sm` `≥640px` | Gutter 24px; reading content max 640px khi là prose | Gutter 24px; cards/list có thể hai cột nếu có nội dung thật |
| `md` `≥768px` | Header horizontal; content max theo role | Dashboard nav chỉ xuất hiện khi route thật tồn tại; không placeholder nav |
| `lg` `≥1024px` | Gutter 32px; shell max 1200px, centered | Main max 1200px; sidebar/panel chỉ khi phase nghiệp vụ yêu cầu |
| `xl` `≥1280px` | Không kéo text vượt max width | Giữ max 1200px; whitespace tăng hai bên |

- Root dùng `min-height: 100dvh`; fallback `100vh` chỉ để hỗ trợ cũ.
- Padding top/bottom cộng `env(safe-area-inset-*)` khi vùng chạm sát viewport.
- Main có skip link “Bỏ qua đến nội dung chính”, target focus được.
- Không horizontal overflow ở 320px. Media/content dùng `min-width: 0`, wrap và max-width 100%.

### AppHeader

- Cao 64px, sticky top 0, z-sticky, background surface với border-bottom; không shadow mặc định.
- Mobile: logo bên trái; các action thực sự tồn tại + `UserMenu` slot bên phải; nav rộng được ẩn, nhưng không tạo hamburger nếu chưa có ≥2 destination thật.
- `md+`: logo, nav route thật, spacer và UserMenu trên một hàng. Active route dùng `aria-current="page"`, semibold + underline/indicator coral; không chỉ đổi màu.
- Header padding theo page gutter; inner max 1200px, centered.
- Header tôn trọng safe-area top; touch target mọi action ≥44px.
- Phase 1 không link tới login, profile, itinerary, chat hay route chưa tồn tại. Static UserMenu không hiển thị tên/avatar giả và không chứa action giả.

---

## Loading, Empty, Error & 404 Patterns

### Loading

- Route loading dùng Skeleton có hình dạng gần layout cuối, không dùng Spinner toàn trang nếu biết cấu trúc.
- Giữ AppHeader/AppShell ổn định để tránh layout shift; skeleton không shimmer mạnh và `aria-hidden`.
- Có một visually-hidden `role="status"`: “Đang tải nội dung…”. Không announce từng skeleton.
- Action cục bộ dùng loading state của Button, giữ label context và width.

### Empty

- `EmptyState` gồm icon 24px, heading, body tối đa 2 câu, optional CTA chỉ khi action/route thật tồn tại.
- Copy mặc định Phase 1: “Chưa có nội dung” / “Nội dung sẽ xuất hiện tại đây khi sẵn sàng.”
- Không dùng fake cards, fake counts hay mock data để lấp chỗ trống.

### Error

- Recoverable fetch/action error dùng `ErrorState`; copy trung tính, không đổ lỗi người dùng.
- Heading: “Không thể tải nội dung”. Body: “Đã xảy ra sự cố. Vui lòng thử lại.” Action: “Thử lại”.
- Retry giữ focus hợp lý và announce kết quả. Không retry vô hạn; không hiển thị stack, status raw hoặc dữ liệu nhạy cảm.
- Toast dùng cho feedback thao tác ngắn; lỗi chặn nội dung phải hiện inline/page ErrorState, không chỉ toast.

### 404

- Route không tồn tại hiển thị heading “Không tìm thấy trang”.
- Body: “Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.”
- CTA: “Về trang chủ”, link route `/` có thật.
- Giữ AppShell public, title document rõ, không tự redirect. Illustration nếu có chỉ là icon line nhỏ bằng neutral/accent, không thêm asset thương hiệu khó rebrand.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | “Khám phá Tripory” — chỉ dùng khi target/action thật tồn tại; trên walking skeleton có thể trỏ tới anchor nội dung cùng trang |
| Empty state heading | “Chưa có nội dung” |
| Empty state body | “Nội dung sẽ xuất hiện tại đây khi sẵn sàng.” |
| Error state heading | “Không thể tải nội dung” |
| Error state body | “Đã xảy ra sự cố. Vui lòng thử lại.” |
| Retry action | “Thử lại” |
| Loading status | “Đang tải nội dung…” |
| 404 heading | “Không tìm thấy trang” |
| 404 body | “Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.” |
| 404 action | “Về trang chủ” |
| Destructive confirmation | Phase 1 không có destructive business action. Dialog base không hard-code copy; consumer tương lai phải dùng “{Động từ} {đối tượng}?” + hậu quả + nút xác nhận cụ thể, không dùng “OK”. |

Giọng văn: tiếng Việt trung tính, lịch sự, trực tiếp; sentence case; động từ + danh từ cho CTA; tránh dấu chấm than, thuật ngữ kỹ thuật và lời hứa không kiểm chứng.

---

## Registry Safety

`ui_safety_gate = true`.

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Các primitive tương ứng inventory Phase 1; executor chỉ lấy source từ official registry và điều chỉnh về semantic tokens | Official registry only — gate not required — recorded 2026-10-10 |
| Third-party | none | Không được khai báo/đưa vào Phase 1 — recorded 2026-10-10 |

- `components.json` chưa tồn tại khi viết spec; executor khởi tạo `base-nova`, Base UI, Lucide và cấu hình monorepo trong Phase 1.
- Bất kỳ third-party registry/block phát sinh sau spec đều phải chạy `shadcn view`, kiểm network/env/eval/dynamic external import/obfuscation và được developer phê duyệt trước khi vào contract/code.
- Không có third-party block nào được miễn gate bằng cách copy-paste thủ công.

---

## Atomic Placement & Boundary Contract

| Level | Location | Allowed content |
|-------|----------|-----------------|
| Tokens | `packages/design-tokens` | Primitive, semantic, Tailwind mapping; không React/Next/business logic |
| Atoms | `packages/ui-web/src/atoms` | Stateless/base controls; semantic token only |
| Molecules | `packages/ui-web/src/molecules` | Composition nhỏ, generic; Base UI behavior; không business copy/rule |
| Shared organisms | `apps/web/src/components` | `AppHeader`, `UserMenu`, `AppShell`; app-wide composition |
| Business organisms/templates | `apps/web/src/modules/*/ui` | UI gắn bounded context; không đặt trong Phase 1 nếu chưa có nghiệp vụ |
| Route composition | `apps/web/src/app` | Ghép layout/page/state; không business logic |

`ui-web` dùng preset boundary `uiPackage()` được thêm có chủ đích cùng self-test. Import bị boundary chặn phải được xử lý bằng đặt lại đúng tầng, không nới allowlist tùy tiện. Component có child dùng từ Server Component export child bằng named export.

---

## Testing Contract

Không dùng Storybook, `/dev/ui`, showcase hoặc visual demo route. Mỗi base component có test gần source trong `packages/ui-web` bằng Vitest + jsdom + Testing Library theo preset `uiPackage()`.

### Tối thiểu cho mọi component

1. **Render:** render variant/default, children/content, class/semantic token mapping quan trọng; không snapshot toàn markup.
2. **Role/name/state:** query bằng role/accessible name; kiểm `aria-*`, label association, described-by, busy/invalid/selected/checked.
3. **Keyboard:** mọi interactive component được vận hành bằng keyboard theo pattern; kiểm focus-visible behavior ở mức state/class có thể kiểm được.
4. **Disabled/loading/error:** kiểm không kích hoạt callback sai, giữ accessible state và không mất layout contract.
5. **Named exports:** test import public entry cho compound children, ngăn regression static-property qua Server/Client boundary.

### Ma trận tương tác bắt buộc

| Component group | Tests required |
|-----------------|----------------|
| Button/IconButton | Enter/Space activate; disabled/loading không activate; IconButton thiếu name phải bị test phát hiện |
| Input/Textarea/FormField/SearchInput | label liên kết; error `aria-invalid` + described-by; clear bằng keyboard; focus order |
| Checkbox/Switch | Space toggle; role/state đúng; click label |
| Select/Tabs/DropdownMenu | open/close; Arrow/Home/End; Enter/Space; Esc; focus restore/roving focus |
| Tooltip | mở bằng focus/hover, Esc đóng, accessible relation |
| Dialog | focus trap, initial focus, Tab/Shift+Tab, Esc đóng, close control, restore focus, body scroll contract |
| Sheet | focus trap, Esc đóng, accessible snap controls, close/restore focus; drag logic test bằng unit adapter thay vì brittle pointer pixel |
| Toast | live region/role theo severity, action keyboard, dismiss, timer pause |
| EmptyState/ErrorState | heading/body/action role; “Thử lại” gọi đúng callback một lần |
| Spinner/Skeleton/Separator/Icon/Avatar/Badge/Card | semantics decorative vs informative, fallback, interactive Card keyboard only when configured |
| AppHeader/AppShell/UserMenu | landmarks, skip link, nav chỉ route tồn tại, static slot không fake session, target sizing class/token |

### Quality gates

Từ repo root, trước khi Phase 1 hoàn tất phải chạy xanh:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Ngoài automated tests, smoke ở viewport 320×568, 390×844, 768×1024 và 1440×900: không overflow ngang; safe-area không che action; target ≥44px; keyboard đi qua header/main/dialog/sheet; reduced motion hoạt động. Không cần pixel-perfect screenshot baseline trong Phase 1.

---

## Out of Scope for Phase 1

- Dark mode runtime/toggle; chỉ có token slot.
- Brand illustration, logo system hoàn chỉnh hoặc màu phụ thứ hai.
- Storybook, `/dev/ui`, component showcase.
- Session thật trong UserMenu (Phase 3), dữ liệu/mock business, route business chưa tồn tại.
- Component nghiệp vụ itinerary/profile/chat/call.
- Third-party registry blocks.

---

## Requirement Coverage

Bảng này là acceptance map bắt buộc cho planner/executor. Một requirement chỉ được tuyên bố hoàn tất khi contract tương ứng và quality gate đều đạt.

| Requirement | Phase 1 contract / acceptance evidence |
|-------------|----------------------------------------|
| `FND-01` | Toolchain phải dùng **pnpm 10**; từ repo root, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đều chạy xanh như quy định tại **Testing Contract → Quality gates**. |
| `FND-02` | Thêm preset ESLint `uiPackage()` cho **cả** `packages/ui-web` và `packages/design-tokens`; bổ sung self-test chứng minh preset được nối và bắt đúng vi phạm; cập nhật `ai-memories/tripory-fe--ddd-architecture.md` với placement/import rules. Xem **Atomic Placement & Boundary Contract**. |
| `FND-03` | Giao diện mobile-first dùng `100dvh`, safe-area, target tối thiểu `44×44px`, không overflow và chỉ điều hướng tới route thật. Xem **AppShell & AppHeader Responsive Contract**, **Semantic spacing and sizing**. |
| `FND-04` | Mọi màn khung có loading, empty, error với “Thử lại”; route sai có 404. Xem **Loading, Empty, Error & 404 Patterns** và **Copywriting Contract**. |
| `FND-05` | Theo ROADMAP, requirement feedback toast cho mọi write operation thuộc **Phase 2**, không được tuyên bố hoàn tất ở Phase 1. Phase 1 chỉ cung cấp molecule `Toast`/Sonner và accessibility contract để Phase 2 sử dụng; xem **Component Inventory → Molecules**. |
| `FND-06` | Form có Label/description/error liên kết; Dialog và Sheet trap focus, Esc đóng, restore focus; keyboard matrix phải xanh. Xem **Focus Ring Specification**, **Component Inventory**, **Testing Contract**. |
| `FND-07` | Cuối Phase 1 phải deploy walking skeleton lên Vercel với **Root Directory `apps/web`**, **Node 24**, thu được URL truy cập thật; smoke mobile/desktop xác nhận `AppShell`, `AppHeader`, static `UserMenu`, 404 và state patterns hoạt động. |
| `DS-01` | Bộ token mới trong `packages/design-tokens`, không port FE cũ; đủ color, typography, spacing, radius, shadow, z-index, motion, breakpoint; xuất CSS variables + Tailwind 4.3 `@theme`; có dark-mode slot chưa kích hoạt. Xem **Token Architecture**, **Complete Primitive Tokens**, **Complete Semantic Tokens**. |
| `DS-02` | Tokens/atoms/molecules/shared organisms/business organisms/route composition đặt đúng tầng. Xem **Atomic Placement & Boundary Contract** và **File layout bắt buộc**. |
| `DS-03` | Đủ 13 atoms bắt buộc cùng variants, sizes, states và accessibility behavior. Xem **Component Inventory → Atoms**. |
| `DS-04` | Đủ 13 molecules bắt buộc, gồm Sheet multi-snap và ErrorState có “Thử lại”. Xem **Component Inventory → Molecules** và **Sheet Snap Points**. |
| `DS-05` | Có `AppHeader`, static `UserMenu`, `AppShell` variants `public`/`dashboard`; hành vi theo breakpoint được cố định. Xem **Shared organisms** và **AppShell & AppHeader Responsive Contract**. |
| `DS-06` | Component chỉ consume semantic tokens; không hard-code color/spacing/radius; compound children qua Server/Client boundary dùng named exports. Xem **Token Architecture**, **Atomic Placement & Boundary Contract**, **Testing Contract → Named exports**. |
| `DS-07` | Mỗi base component có test render, role/aria và keyboard/state phù hợp; không Storybook, `/dev/ui` hay showcase. Xem **Testing Contract** và **Out of Scope for Phase 1**. |

---

## Source Traceability

| Source | Decisions used |
|--------|----------------|
| Locked user decisions | Visual direction, coral accent, Inter, 8px radius, mobile-first, layered tokens, atomic placement, inventory, no showcase, stack, named exports |
| `REQUIREMENTS.md` | FND-01..07 và DS-01..07; `FND-05` được ghi rõ thuộc Phase 2, Phase 1 chỉ cung cấp `Toast` molecule contract |
| `ROADMAP.md` | Phase goal, success criteria, static UserMenu, `(public)`/`(dashboard)`, Vercel skeleton |
| `PROJECT.md` | Architecture boundaries, no fake features, Next/Tailwind stack |
| `research/STACK.md` | shadcn `base-nova`, Base UI, Tailwind `@source`, component dependencies |
| `research/SUMMARY.md` | Walking skeleton/state conventions và deferred dark mode |
| DDD architecture sections 4, 5, 9 | Folder placement, imports, composition root, named compound exports |
| Existing repo scout | Chưa có design system; scaffold hiện dùng Geist/dark media/hard-coded palette và phải được thay bởi contract này trong Phase 1 |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-09
