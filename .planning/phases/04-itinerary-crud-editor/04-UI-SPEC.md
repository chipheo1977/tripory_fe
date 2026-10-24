---
phase: 4
slug: itinerary-crud-editor
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-10-24
---

# Phase 4 — UI Design Contract

> Hợp đồng hình ảnh và tương tác cho Itinerary CRUD & Editor. Phase 4 **dùng lại toàn bộ** token, typography, spacing, màu, focus ring, state matrix, Sheet snap và a11y nền của `01-UI-SPEC.md` (đã duyệt), cùng mẫu form, nút đang gửi, `InlineAlert`, `SubmitStatus` và giọng copy của `03-UI-SPEC.md`. File này chỉ khai báo phần mới hoặc phần ghép riêng của Phase 4. Mọi D-xx dẫn chiếu `04-CONTEXT.md` (đã khóa); copy trong ngoặc kép có gắn D-xx là chuỗi khóa, chép nguyên văn.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn CLI, đã khởi tạo (`apps/web/components.json`, `packages/ui-web/components.json`) |
| Preset | `base-nova`, `baseColor: neutral`, `registries: {}` |
| Component library | `@base-ui/react` 1.8 |
| Icon library | `lucide-react` qua atom `Icon` (app import glyph, truyền vào `Icon`) |
| Font | Inter qua `next/font` (`latin`, `vietnamese`), không đổi |
| Styling | Tailwind CSS 4.3 + semantic token của `@tripory/design-tokens`, không đổi |
| Feedback | `Toast`/`notify` (Sonner) của `ui-web`, đã mount ở root layout |
| Kéo thả | dnd-kit (planner thêm vào `catalog:`, pin cứng). Spec này chỉ khóa hành vi, không khóa API |

Nguồn: `01-UI-SPEC.md`, `03-UI-SPEC.md`, đọc trực tiếp `packages/design-tokens/src/*`, `packages/ui-web/src/*`. Không có màu, cỡ chữ hay weight mới.

---

## Spacing Scale

Dùng nguyên scale Phase 1 (bội số 4):

| Token | Value | Usage trong Phase 4 |
|-------|-------|---------------------|
| xs | 4px | Gap giữa các icon button trong header editor ở `<640px`, gap icon–chữ trong dòng "Đã nhận", gap chữ trong tab ngày (hai dòng) |
| sm | 8px | Gap giữa các thẻ waypoint, gap nút trong footer dialog, gap icon–chữ trong nút/menu, padding dọc tab ngày, gap trong FormField |
| md | 16px | Padding thân thẻ lịch trình, gap lưới thẻ ở `<1024px`, gap giữa các field, padding ngang cột timeline desktop, gap tiêu đề trang → nút "Tạo lịch trình" khi xuống dòng |
| lg | 24px | Gap h1 → Tabs lọc → lưới, gap lưới thẻ từ `lg`, padding Dialog/Sheet (sẵn có), gap field cuối → footer form, gap khối ảnh bìa → tóm tắt |
| xl | 32px | Padding vùng canvas desktop (`p-section`) |
| 2xl | 48px | Padding trên/dưới trang danh sách ở mobile (AppShell sẵn có) |
| 3xl | 64px | Padding trên/dưới trang danh sách từ `lg` (AppShell sẵn có) |

Exceptions: none. Các kích thước dưới đây thuộc sizing contract, không phải spacing.

### Sizing mới (token, không hard-code)

| Token | Value | Layer | Usage |
|-------|-------|-------|-------|
| `--editor-timeline-width` | `400px` | `packages/design-tokens/src/components.css` | Bề rộng cột timeline desktop từ `lg` (D-13). Grid `lg:grid-cols-[var(--editor-timeline-width)_1fr]` |
| `--itinerary-cover-ratio` | `16 / 9` | `packages/design-tokens/src/components.css` | Tỉ lệ ảnh bìa ở thẻ, canvas, nền mobile, preview trong dialog. Dùng `aspect-(--itinerary-cover-ratio)` |

Cập nhật `tokens.test.ts` cho hai token này. Chiều cao header editor là kết quả bố cục (64px một hàng, 64 + 44px hai hàng ở `<640px`), app đo bằng `ResizeObserver` để truyền cho Sheet (xem Sheet mở rộng), không khai báo token.

### Hằng tương tác (app constant, không phải token)

| Hằng | Giá trị | Dùng ở |
|------|---------|--------|
| `PAGE_SIZE` | 12 | `/mine` (D-02) |
| Ngưỡng "gần cuối" | `rootMargin: "0px 0px 400px 0px"` | Sentinel infinite scroll |
| `UNDO_WINDOW_MS` | 5000 | Hoãn DELETE waypoint (D-31), đồng hồ thực, không dừng khi hover/focus |
| Nhấn giữ cảm ứng | 180ms, dung sai 8px | dnd-kit TouchSensor trên tay cầm (D-34) |
| Ngưỡng chuột | di chuyển ≥ 4px, không delay | dnd-kit PointerSensor, phân biệt click với kéo |
| Debounce preview ảnh bìa | 400ms | D-25 |
| Debounce resolve link rút gọn | 400ms sau lần gõ cuối, hoặc ngay khi blur/paste | D-20 |
| Làm nổi waypoint mới | 1500ms | D-22 |
| Cold start | 5000ms | `SubmitStatus` (Phase 3 D-31) |

---

## Typography

Không đổi so với Phase 1, chỉ gán vai trò:

| Role | Size | Weight | Line Height | Dùng ở Phase 4 |
|------|------|--------|-------------|----------------|
| Body | 16px | 400 | 1.5 | Giá trị Input/Textarea, mô tả trong canvas, nội dung dialog xác nhận, mục menu, phụ đề ngày |
| Body (semibold) | 16px | 600 | 1.5 | Tiêu đề trên header editor (`h1`, cắt ellipsis), tên waypoint trong thẻ |
| Label | 14px | 600 | 1.5 | Chữ nút, tab lọc, dòng 1 tab ngày ("Ngày 2"), Badge, nhãn ô |
| Label (regular) | 14px | 400 | 1.5 | Địa chỉ waypoint, meta thẻ ("Khởi hành … · … km"), dòng 2 tab ngày (km), chỉ báo lưu, dòng "Đã nhận: …", mô tả ô, lỗi field, dòng "Thay đổi hiển thị ngay với người xem", dòng giải thích nút Xuất bản |
| Heading | 20px | 600 | 1.2 | Tiêu đề thẻ lịch trình (tối đa 2 dòng), `DialogTitle`/`SheetTitle`, heading EmptyState/ErrorState, tiêu đề chuyến đi trong nền mobile |
| Display | 28px | 600 | 1.2 | `h1` "Lịch trình của tôi", tiêu đề chuyến đi trong canvas desktop |

Đúng 4 cỡ (14/16/20/28), đúng 2 weight (400/600). Số km và ngày dùng `tabular-nums`.

### Định dạng số và ngày

- Km: `Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })` + " km" → "12,4 km". Ẩn khi giá trị là 0 hoặc null (D-04). Luôn là số của BE (D-28).
- Ngày khởi hành: `dd/MM/yyyy` dựng từ chuỗi `CalendarDate` (`YYYY-MM-DD`), không qua `new Date()` (D-26). Hiển thị "Khởi hành 12/10/2026".
- Tọa độ (dòng "Đã nhận"): 4 chữ số thập phân, dấu chấm, `lat, lng` → "10.7769, 106.7009" (D-21). Giá trị gửi BE giữ đủ độ chính xác.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FAFAF9` `background` | Nền trang danh sách, vùng canvas editor, nền mobile phía sau sheet |
| Secondary (30%) | `#FFFFFF` `surface` / `surface-elevated` | Thẻ lịch trình, header editor, cột timeline, Sheet, Dialog, thẻ waypoint, menu, Input |
| Accent (10%) | `#C44728` `primary` | Xem danh sách dưới |
| Destructive | `#B42318` `danger` | Hành động xóa, chỉ báo "Lỗi – Thử lại", lỗi field, `InlineAlert` lỗi |
| Success (có sẵn) | `#16794A` `success` | Badge "Đã xuất bản", icon dòng "Đã nhận", icon chỉ báo "Đã lưu", toast thành công |
| Muted fill (có sẵn) | `#F5F5F4` `surface-muted` | Nền dự phòng ảnh bìa, placeholder khi kéo, Skeleton |

**Accent reserved for (Phase 4):**
1. Nút primary: "Tạo lịch trình" (đầu trang, EmptyState tab Tất cả, nút gửi trong dialog tạo), "Thêm điểm đến" (CTA EmptyState của ngày trống và nút gửi form thêm), "Lưu" (form sửa waypoint, dialog Thông tin chuyến đi), "Xuất bản" (header và hộp xác nhận), "Thử lại" (ErrorState), "Về Lịch trình của tôi" (trang 403).
2. Vạch tab đang chọn (Tabs lọc trạng thái, tab ngày).
3. Focus ring.
4. Nút "Hoàn tác" trong toast (style action sẵn có của `Toast`).
5. Làm nổi waypoint vừa thêm: `bg-primary-subtle` + `border-primary-border` trong 1500ms (D-22).
6. Thẻ đang kéo (drag overlay): `border-primary-border`.
7. Icon trong EmptyState (`text-accent`, sẵn có).

**Không dùng accent cho:** nút "Thêm điểm đến" ở cuối danh sách khi ngày đã có điểm (dùng `secondary`), nút "+ Thêm ngày" (`ghost`), menu ⋯, nút back, tay cầm kéo, số thứ tự waypoint (`bg-surface-muted text-text`), Badge "Nháp" (`neutral`), km, chỉ báo lưu, link "Mở".

**Destructive dùng cho:** mục menu "Xóa" (`DropdownMenuItem variant="danger"`), nút "Xóa" của dialog xóa lịch trình (`Button variant="danger"`), nút "Rời trang" của dialog rời trang (`danger`), nút "Xóa điểm đến" trong form sửa (`Button variant="ghost"` + `text-danger`), chỉ báo "Lỗi – Thử lại".

Contrast: dùng lại bằng chứng Phase 1/3. Badge `success` (`success` trên `success-subtle`) ≈ 5.1:1; `text-subtle` (placeholder phụ đề) trên `surface` ≈ 4.8:1, đạt AA. Trạng thái không chỉ truyền bằng màu: Badge có chữ, chỉ báo lưu có icon + chữ, ngày đang chọn có vạch + `aria-selected`.

---

## Component Inventory

### Dùng lại nguyên trạng (`@tripory/ui-web`)

`Card` (`default`), `Tabs`/`TabsList`/`TabsTrigger`/`TabsPanel` (`line`), `Dialog`/`DialogContent` (`sm`, `md`)/`DialogTitle`/`DialogDescription`/`DialogClose`, `DropdownMenu*` (gồm `DropdownMenuLinkItem`, item `danger`), `Tooltip*`, `Badge` (`neutral`, `success`), `Skeleton`, `EmptyState` (`compact`, `page`), `ErrorState` (`page`, `card`), `FormField*`, `Input` (`md`, `lg`), `Textarea`, `Button` (`loadingLabel`), `IconButton`, `InlineAlert`, `Avatar`, `Spinner`, `Icon`, `Separator`, `Sheet*`.

### Mở rộng `ui-web` (generic, không chứa copy nghiệp vụ, mỗi mục có test theo DS-07)

| Component | Vị trí | Contract |
|-----------|--------|----------|
| `notify.undoable` | `molecules/toast.tsx` | Chữ ký `notify.undoable(title, { actionLabel, onAction, onDismiss }): ToastId`. Toast variant `info` (`role="status"`, `aria-live="polite"`), có nút action và nút đóng sẵn có. **Không tự hết hạn** (Sonner `duration: Infinity`): app sở hữu đồng hồ 5 giây và gọi `notify.dismiss(id)` khi commit/flush/hoàn tác (D-31). `onAction` gọi đúng một lần rồi đóng toast. `onDismiss` gọi khi người dùng bấm nút đóng hoặc vuốt bỏ, và khi `notify.dismiss(id)`. Các `notify.*` hiện có giữ nguyên (không mở `duration`). Test: còn hiện sau 10 giây với fake timers; action gọi một lần, bàn phím Tab tới được và Enter kích hoạt; nút đóng gọi `onDismiss`; `dismiss(id)` đóng toast |
| `InlineAlert` prop `variant?: "danger" \| "info"` | `molecules/inline-alert.tsx` | Mặc định `danger` (giữ nguyên hành vi, `role="alert"`). `info`: `border-border bg-surface-muted text-text`, icon `Info` 20px `text-muted`, `role="status"`. Dùng cho "Đã khôi phục nội dung chưa lưu" (D-36). Test: role theo variant |
| `Sheet` prop `dismissible?: boolean` (mặc định `true`) | `molecules/sheet.tsx` | `false`: không render nút "Đóng bảng" trong `SheetControls`, vuốt xuống ở mức peek dừng tại peek (không đóng), Esc không đóng. Dùng cho timeline không modal (D-14) |
| `Sheet` prop `defaultSnap?: "peek" \| "medium" \| "expanded"` (mặc định `medium`) | `molecules/sheet.tsx` | Mức mở ban đầu. Form waypoint/metadata dùng `expanded` (D-18), timeline dùng `medium` (D-15) |
| `Sheet` prop `insetTop?: number` (px, mặc định 0) | `molecules/sheet.tsx` + `sheet-snap.ts` | `resolveSnapPoints(viewportHeight, insetTop)`: mức `expanded` = `min(0.92 × vh, vh − insetTop)` quy ra px; peek/medium giữ nguyên nếu nhỏ hơn mức expanded. Editor truyền chiều cao header đo được để sheet không bao giờ che header (D-16). Test bảng giá trị trong `sheet-snap.test.ts` |

### Organism dùng chung (`apps/web/src/components/`)

| Component | Thay đổi |
|-----------|----------|
| `UserMenu` | Thêm prop `compact?: boolean`: chỉ hiện `Avatar sm` ở mọi breakpoint (ẩn tên và chevron). Header editor dùng `compact` (D-16). `aria-label` trigger giữ nguyên |
| `SubmitStatus` | Chuyển từ `modules/identity/ui` sang `apps/web/src/components/submit-status.tsx` (cùng API, cùng `COLD_START_MESSAGE`), identity import lại từ đây. Itinerary dùng chung |

### Organism nghiệp vụ mới (`apps/web/src/modules/itinerary/ui/`)

| Component | Contract tóm tắt |
|-----------|------------------|
| `MyItinerariesView` | Tiêu đề trang, nút tạo, Tabs lọc theo URL, lưới, infinite scroll |
| `ItineraryCard` | Thẻ lưới: ảnh bìa, badge, tiêu đề, meta, menu ⋯ |
| `CreateItineraryDialog` | Dialog tạo nhanh một ô |
| `DeleteItineraryDialog` | Xác nhận xóa, dùng chung cho thẻ và editor (D-42) |
| `EditorLayout` | Khung editor có 4 slot: `header`, `timeline`, `canvas`, `summary`. Desktop đặt `summary` trong `canvas` ở Phase 4; mobile đặt `summary` trên nền phía sau sheet. Phase 5 thay `canvas` bằng bản đồ và chuyển `summary` lên đầu cột trái mà không đổi các slot khác (D-13, D-14) |
| `EditorHeader` | Back, tiêu đề, chỉ báo lưu, Xuất bản, menu ⋯, `UserMenu compact` |
| `SaveIndicator` | 4 trạng thái (D-30) |
| `TripSummary` | Ảnh bìa lớn + tiêu đề + badge + ngày khởi hành + tổng km + mô tả + nút "Sửa thông tin" |
| `TripInfoDialog` | Form metadata (Dialog từ `md`, Sheet modal dưới `md`) |
| `DayTabs` | Dải tab Ngày 1..max + "+ Thêm ngày" |
| `DaySubtitle` | Phụ đề inline (D-29) |
| `WaypointList` / `SortableWaypointItem` | Danh sách sắp xếp được, tay cầm riêng |
| `WaypointFormDialog` | Form thêm/sửa dùng chung (Dialog từ `md`, Sheet modal `expanded` dưới `md`) |
| `LocationField` | Ô dán vị trí, parse + resolve link rút gọn, dòng trạng thái |
| `PublishButton` / `PublishDialog` | `aria-disabled` + giải thích, hộp xác nhận |
| `LeaveEditorDialog` | Xác nhận rời trang trong app (D-35) |
| `EditorForbidden` | Trang 403 tự render (D-45, D-46) |

Ngưỡng chuyển Dialog ↔ Sheet của form: **`md` (768px)**. Lý do: Dialog `md` rộng 560px vừa tablet; dưới 768px bàn phím ảo và chiều ngang hẹp hợp với Sheet hơn. Bố cục editor chuyển hai vùng ở `lg` (D-13), nên từ 768 đến 1023px editor vẫn dùng sheet timeline nhưng form là Dialog.

---

## Trang "Lịch trình của tôi" (`/itineraries/mine`) — ITIN-01, 02, 12

### Bố cục

- AppShell `dashboard` (có AppHeader). Document title "Lịch trình của tôi · Tripory".
- Hàng đầu: `flex flex-wrap items-center justify-between gap-stack-md`: `h1` Display "Lịch trình của tôi" + `Button primary size="md"` icon `Plus` "Tạo lịch trình" (D-10). Ở 320px nút xuống dòng dưới h1, căn trái.
- Cách 24px: `Tabs variant="line"` ba tab "Tất cả", "Nháp", "Đã xuất bản" (D-03). Tab đổi bằng `router.replace` (không thêm mục lịch sử, `scroll: false`) với `?status=all|draft|published`; giá trị lạ hiển thị "Tất cả". Nội dung là một `TabsPanel` duy nhất cho tab đang chọn.
- Cách 24px: lưới `grid grid-cols-1 gap-stack-md sm:grid-cols-2 lg:grid-cols-3 lg:gap-stack-lg` (D-01). Thứ tự theo BE (D-05).
- Sau lưới: sentinel `div` rỗng `aria-hidden` cho IntersectionObserver.

### ItineraryCard (D-04, D-06, D-07)

```text
article (Card default, padding 0, overflow-hidden, relative, group)
  ảnh bìa  aspect-(--itinerary-cover-ratio), object-cover, rounded-t-container
           không có / lỗi tải → nền surface-muted + Icon Map 24px text-subtle ở giữa
  thân     p-stack-md, flex-col gap-stack-sm
    hàng 1 Badge ("Nháp" neutral | "Đã xuất bản" success) ............ IconButton ⋯
    hàng 2 h2 Heading, line-clamp-2 → Link tới /itineraries/[id]/edit (stretched)
    hàng 3 text-label text-muted: "Khởi hành 12/10/2026 · 12,4 km" (bỏ phần thiếu; thiếu cả hai thì không render hàng)
```

- Cả thẻ bấm được nhờ link tiêu đề có `after:absolute after:inset-0` (không bọc thẻ trong `<button>` vì bên trong có menu). Hover: `border-border-strong shadow-sm` qua `group-hover`/`has-[a:hover]`. Focus: ring bao cả thẻ qua `has-[a:focus-visible]:outline-2 … outline-focus-ring`.
- `IconButton ghost size="sm"` icon `MoreHorizontal`, `relative z-10` nằm trên link, `aria-label` "Thao tác cho "{tên}"". Menu `align="end"`: `DropdownMenuLinkItem` icon `SquarePen` "Mở" → editor; `DropdownMenuSeparator`; `DropdownMenuItem variant="danger"` icon `Trash2` "Xóa" → `DeleteItineraryDialog`.
- Ảnh: `<img alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer">` (ảnh trang trí, tên nằm ngay cạnh). `onError` → nền dự phòng (D-25).
- Không hiện số ngày/số điểm (D-04).

### Trạng thái

| Trạng thái | Hiển thị |
|------------|----------|
| Tải trang đầu (mỗi tab chưa có cache) | 6 thẻ Skeleton (khối `aspect-(--itinerary-cover-ratio)` + 2 dòng text) trong lưới; `p.sr-only role="status"` "Đang tải lịch trình…" |
| Lỗi trang đầu | `ErrorState variant="page"` + "Thử lại" gọi `refetch` (D-08) |
| Trống | EmptyState `page` theo tab (bảng Copywriting). Chỉ tab "Tất cả" có CTA "Tạo lịch trình" |
| Đang tải trang kế | 3 thẻ Skeleton nối cuối lưới; `p.sr-only role="status"` "Đang tải thêm lịch trình…" |
| Lỗi trang kế | **Không hiện gì** (D-02): tắt skeleton cuối, giữ các trang đã có, không nút, không toast, không status. Lần sau sentinel vào viewport thì gọi `fetchNextPage` lại |
| Hết trang | Không hiện gì thêm (D-02) |

### Xóa từ thẻ (D-42)

- Xóa xong: thẻ biến mất, toast success "Đã xóa lịch trình". Focus chuyển tới link tiêu đề của thẻ kế tiếp; không còn thẻ sau thì thẻ trước; danh sách trống thì tới CTA của EmptyState (tab Tất cả) hoặc nút "Tạo lịch trình" đầu trang.

---

## Dialog tạo nhanh (D-09..D-12)

- `Dialog`, `DialogContent size="sm"` ở mọi breakpoint (một ô, không cần Sheet). Mở từ nút đầu trang hoặc CTA EmptyState.
- `DialogTitle` "Lịch trình mới". Form `noValidate`, `aria-labelledby` trỏ title.
- Một `FormField`: nhãn "Tiêu đề", `Input size="lg"`, giá trị đầu "Chuyến đi mới", **focus và bôi đen toàn bộ khi mở** (`select()` sau khi Dialog đặt focus). Không đánh dấu "(bắt buộc)" vì chỉ có một ô.
- Footer (cách 24px): `flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end`: `DialogClose` "Hủy" (`secondary`) + `Button primary type="submit"` "Tạo lịch trình", `loadingLabel` "Đang tạo…" (D-12). Ở mobile nút gửi nằm trên.
- Enter trong ô là gửi. Đang gửi: Input `readOnly`, "Hủy" disabled, Esc và scrim không đóng dialog, `SubmitStatus` dưới footer.
- Lỗi: field → dưới ô; không gắn field → `InlineAlert` đầu form (`errorToast: false`).
- Thành công: `router.push` tới editor, không toast (D-11).

---

## Editor (`/itineraries/[id]/edit`) — ITIN-03..14

### Khung toàn màn (D-16)

- Không có AppHeader. Root `min-h-dvh` (desktop: `h-dvh` + cuộn theo vùng), nền `background`.
- Document title: "{tiêu đề} · Tripory"; đang tải hoặc lỗi: "Sửa lịch trình · Tripory".
- Heading: `h1` là tiêu đề trên header. Cột/sheet timeline có `h2.sr-only` "Lịch trình theo ngày". Vùng tóm tắt là `section aria-labelledby` trỏ `h2.sr-only` "Thông tin chuyến đi"; tiêu đề lớn trong tóm tắt là `p` (không lặp heading).

### EditorHeader

Sticky top, `z-(--z-sticky)`, `bg-surface border-b border-border`, `pt-[env(safe-area-inset-top)]`, padding ngang `px-page-inline sm:px-page-inline-md lg:px-page-inline-lg`.

**Từ `sm` (≥640px), một hàng cao 64px**, gap 8px:

```text
[← IconButton] [khối tiêu đề, flex-1 min-w-0] [SaveIndicator] [Xuất bản] [⋯ IconButton] [UserMenu compact]
               dòng 1: h1 Body semibold, truncate
               dòng 2 (chỉ khi đã xuất bản): "Thay đổi hiển thị ngay với người xem" Label regular text-muted, truncate (D-41)
```

**Dưới `sm` (<640px), hai hàng**, gap 4px giữa icon button:

```text
hàng 1 (64px): [←] [khối tiêu đề như trên] [⋯] [UserMenu compact]
hàng 2 (min-h-touch, border-t border-border): [SaveIndicator] ......... [Xuất bản]  (bản nháp)
                                              [SaveIndicator]                      (đã xuất bản)
dải giải thích (chỉ khi cần, xem PublishButton)
```

- Back: `IconButton ghost` icon `ArrowLeft`, `aria-label` "Về Lịch trình của tôi". Hành vi theo D-47; đi qua chặn rời trang D-35.
- Menu ⋯: `IconButton ghost` icon `MoreHorizontal`, `aria-label` "Thao tác lịch trình", menu `align="end"`: icon `Info` "Thông tin chuyến đi"; `DropdownMenuSeparator`; `danger` icon `Trash2` "Xóa lịch trình".
- Đã xuất bản: nút "Xuất bản" không render (D-40); không có nút "Chia sẻ".

### SaveIndicator (D-30)

Bọc trong `div aria-live="polite"`, luôn có trong DOM. Ưu tiên: còn mutation chạy → "Đang lưu"; else có thao tác nền lỗi chưa gửi lại thành công → "Lỗi"; else đã từng lưu thành công → "Đã lưu"; else trống.

| Trạng thái | Hiển thị |
|------------|----------|
| Trống (chưa có thao tác ghi nào từ lúc mở) | Không có chữ, không chiếm chỗ |
| Đang lưu | `Spinner sm` decorative + "Đang lưu…" `text-label text-muted` |
| Đã lưu | `Icon Check sm text-success` + "Đã lưu" `text-label text-muted` |
| Lỗi | `Button ghost size="sm"` `text-danger`, icon `CircleAlert`, nhãn "Lỗi – Thử lại". Bấm thì gửi lại đúng thao tác đã lỗi, chỉ báo về "Đang lưu…" |

- Lỗi của form (thêm/sửa waypoint, metadata, tạo, xuất bản, xóa lịch trình) hiện trong form/dialog. Chỉ báo vẫn hiện "Đang lưu…" trong lúc gửi, nhưng không chuyển sang "Lỗi" khi các mutation đó lỗi; xong thì về trạng thái trước.
- Thao tác nền lỗi: chỉ báo "Lỗi – Thử lại" **và** toast error theo chính sách Phase 2 (`selectErrorMessage`).
- Lệnh xóa đang chờ 5 giây không tính là đang lưu; khi commit thì tính.

### PublishButton (D-38)

- `Button primary size="sm"` "Xuất bản" (hit area 44px sẵn có).
- `canPublish` false (0 waypoint, không tính waypoint đang chờ xóa): **`aria-disabled="true"`**, không dùng `disabled`; vẫn focus được; style giống disabled (`bg-surface-muted text-disabled border-border`); bấm không mở hộp xác nhận. Nút có `aria-describedby` trỏ phần tử giải thích "Thêm ít nhất 1 điểm đến để xuất bản" (luôn có trong DOM).
  - Từ `lg`: phần tử giải thích là `TooltipContent`, mở khi hover/focus và khi bấm.
  - Dưới `lg`: dải dưới header `bg-surface-muted px-page-inline py-inline-sm text-label text-muted`, hiện khi nút đang focus hoặc trong 4 giây sau khi chạm; ẩn bằng `hidden` (vẫn đọc được qua `aria-describedby`).
- `canPublish` true: bấm mở `PublishDialog`.

### Bố cục desktop (từ `lg`, D-13)

```text
EditorHeader (64px)
grid lg:grid-cols-[var(--editor-timeline-width)_1fr], cao 100dvh − header
├─ cột timeline: bg-surface border-r border-border, flex-col, cuộn dọc riêng
│    DayTabs (sticky top, bg-surface, border-b)
│    DaySubtitle (px-stack-md pt-stack-md)
│    WaypointList (px-stack-md py-stack-md, gap 8px)
│    thanh dưới sticky bottom: border-t, p-stack-md, Button secondary w-full icon Plus "Thêm điểm đến"
│      (ẩn khi ngày trống vì EmptyState đã có CTA)
└─ canvas (slot): bg-background p-section, cuộn dọc riêng
     TripSummary: max-w-content-md mx-auto, flex-col gap-stack-lg
       ảnh bìa aspect-(--itinerary-cover-ratio) rounded-container (không có → nền surface-muted + Icon ImagePlus
         24px text-subtle + Button secondary sm "Thêm ảnh bìa")
       hàng: Badge trạng thái · "Khởi hành 12/10/2026" · "Tổng quãng đường: 12,4 km" (Label regular text-muted)
       p Display tiêu đề (break-words)
       mô tả Body text-muted, whitespace-pre-line (không có thì không render)
       Button secondary sm icon Pencil "Sửa thông tin"
```

- Bấm vào vùng tóm tắt hoặc ảnh bìa (chuột/chạm) cũng mở `TripInfoDialog` (D-17); bàn phím dùng nút "Sửa thông tin" / "Thêm ảnh bìa" (vùng bấm không nhận focus, không có role giả).

### Bố cục mobile/tablet (dưới `lg`, D-14, D-15)

- Nền (sau sheet, cuộn được, tương tác được): `TripSummary` dạng gọn: ảnh bìa full-width `aspect-(--itinerary-cover-ratio)`, rồi khối `p-stack-md` gồm hàng badge/meta, tiêu đề Heading, mô tả `line-clamp-3`, nút "Sửa thông tin". Padding dưới bằng chiều cao mức peek để nội dung cuối không bị sheet che.
- Timeline: `Sheet modal={false} dismissible={false} defaultSnap="medium" insetTop={chiều cao header}` luôn mở. `SheetTitle` sr-only "Lịch trình theo ngày". Nội dung theo thứ tự: `SheetControls` sẵn có ("Thu gọn bảng", "Mở rộng bảng"), DayTabs (sticky trong vùng cuộn của sheet), DaySubtitle, WaypointList, thanh "Thêm điểm đến" sticky bottom (như desktop, cộng `env(safe-area-inset-bottom)`).
- Sheet không bao giờ che header ở cả ba mức (nhờ `insetTop`).
- Kéo thả trong sheet: chỉ tay cầm nhận nhấn giữ 180ms; vuốt ở chỗ khác của sheet vẫn là cuộn/snap sheet (D-34).

### DayTabs (D-27, D-28)

- `Tabs variant="line"` với `value` = dayNumber; vẽ đủ Ngày 1 → ngày lớn nhất, ngày thưa hiện như ngày trống.
- Thanh `overflow-x-auto` (cuộn ngang, ẩn scrollbar không bắt buộc), `TabsList` + nút "+ Thêm ngày" nằm **sau** `TabsList` (không thuộc roving focus của tab).
- Mỗi `TabsTrigger` hai dòng, `py-inline-sm`: dòng 1 "Ngày N" (Label semibold); dòng 2 km của ngày (Label regular text-muted, `tabular-nums`), không có km thì không render dòng 2. Accessible name: "Ngày 2, 12,4 km" hoặc "Ngày 2".
- Tab đang chọn tự cuộn vào giữa thanh khi đổi (`scrollIntoView({ inline: "nearest" })`, `behavior` theo reduced-motion).
- "+ Thêm ngày": `Button ghost size="sm"` icon `Plus` "Thêm ngày". Bấm: thêm tab "Ngày {max+1}" ngay (optimistic), chọn nó, focus vào tab mới, cuộn thanh tới cuối; nội dung là EmptyState ngày trống. Lỗi: gỡ tab, chọn lại tab trước, focus về nút "Thêm ngày", chỉ báo "Lỗi – Thử lại" + toast error. Không xác nhận, không xóa ngày (D-27). BE không giới hạn trên số ngày (chỉ chặn < 1), FE không đặt trần.

### DaySubtitle (D-29)

| Trạng thái | Hiển thị |
|------------|----------|
| Xem, chưa có phụ đề | Nút toàn chiều ngang, căn trái, `min-h-touch`, không viền: icon `Pencil` 16px `text-subtle` + "Thêm phụ đề cho ngày này" (Body `text-subtle`). Accessible name "Thêm phụ đề cho Ngày N" |
| Xem, có phụ đề | Như trên nhưng chữ là phụ đề (Body `text-text`, xuống dòng tự do), icon `Pencil` decorative. Accessible name "Sửa phụ đề Ngày N: {phụ đề}" |
| Sửa | `Input size="md"` `aria-label` "Phụ đề Ngày N", focus + đặt con trỏ cuối, `FormFieldError` dưới ô khi > 100 ký tự |

- Enter hoặc blur: trim; không đổi thì thoát không gửi; rỗng gửi `null`; > 100 ký tự thì ở lại chế độ sửa với lỗi. Lưu optimistic: về chế độ xem với giá trị mới ngay, chỉ báo "Đang lưu…". Lỗi: trả giá trị cũ, toast + chỉ báo lỗi.
- Esc: hủy, trả giá trị cũ, focus về nút xem.

### WaypointList và SortableWaypointItem (D-22, D-23, D-33, D-34)

- `ol` `aria-label` "Điểm đến Ngày N", `flex-col gap-inline-sm`. Số thứ tự tính trên tập đang hiển thị (không tính waypoint đang chờ xóa).
- Thẻ (`li`): `rounded-container border border-border bg-surface`, `flex items-center`, `min-h-touch`, không có phần tử tương tác lồng nhau:

```text
[tay cầm 44×44] [nút chính, flex-1 min-w-0, text-left, py-inline-sm] [⋯ IconButton ghost sm]
                 số thứ tự 24px rounded-pill bg-surface-muted text-label semibold tabular-nums
                 tên Body semibold truncate
                 địa chỉ Label regular text-muted line-clamp-1 (không có thì bỏ)
```

- Tay cầm: `button type="button"`, icon `GripVertical` 20px `text-muted`, `touch-none`, `cursor-grab` (đang kéo `cursor-grabbing`), `aria-label` "Kéo để sắp xếp {tên}", `aria-describedby` trỏ hướng dẫn bàn phím sr-only dùng chung. Ngày chỉ có 1 điểm thì không render tay cầm.
- Nút chính: mở form sửa (D-23). Hover `bg-surface-muted`. Accessible name tự nhiên từ nội dung: "1 Chợ Bến Thành, Lê Lợi, Quận 1".
- Menu ⋯: `aria-label` "Thao tác cho "{tên}"": icon `Pencil` "Sửa"; separator; `danger` icon `Trash2` "Xóa".

| Trạng thái thẻ | Hiển thị |
|----------------|----------|
| Mặc định | Như trên |
| Vừa thêm (1500ms) | `bg-primary-subtle border-primary-border`, rồi chuyển về mặc định bằng `transition-colors duration-(--semantic-motion-duration-slow)`; list cuộn tới thẻ (`block: "nearest"`). Reduced motion: không cuộn mượt, không chuyển màu dần |
| Chỗ trống khi đang kéo | `border-dashed border-border-strong bg-surface-muted`, nội dung `invisible` (giữ chiều cao) |
| Drag overlay | `bg-surface-elevated border-primary-border shadow-md`, không xoay/phóng to |
| Dịch chỗ | `transform` với `duration-(--semantic-motion-duration-normal) ease-standard`; reduced motion: 0ms |

**Kéo thả (D-34):** ba cảm biến. Chuột: kích hoạt khi di chuyển ≥ 4px, không delay. Cảm ứng: nhấn giữ 180ms trên tay cầm, dung sai 8px. Bàn phím trên tay cầm: Space nhấc, ↑/↓ di chuyển, Space thả, Esc hủy. Chỉ sắp xếp trong một ngày; trục dọc; giới hạn trong danh sách.

- Bắt đầu kéo khi còn lệnh xóa chờ: flush DELETE ngay và đóng toast hoàn tác (D-33), rồi mới kéo trên tập còn lại.
- Thả: thứ tự mới hiện ngay (optimistic), chỉ báo "Đang lưu…". Thả về đúng chỗ cũ: không gửi.
- Lỗi: trả thứ tự cũ, toast error, refetch, chỉ báo lỗi. `Itinerary.InvalidReorderList`: refetch và toast info "Danh sách đã thay đổi, đã tải lại" (D-37), không chuyển chỉ báo sang lỗi.
- Sau khi thả bằng bàn phím, focus ở lại tay cầm của thẻ đó.

### Ngày trống và hướng dẫn

- `EmptyState variant="compact"` icon `MapPin`, heading "Chưa có điểm đến nào trong Ngày N", body "Dán tọa độ hoặc link Google Maps để thêm điểm đầu tiên.", action `Button primary` icon `Plus` "Thêm điểm đến". Editor mới tạo mở ở Ngày 1 với trạng thái này (D-11).

### WaypointFormDialog (D-18..D-22)

- Từ `md`: `DialogContent size="md"`. Dưới `md`: `Sheet modal defaultSnap="expanded"`. Form dialog **không đóng khi bấm scrim** (`disablePointerDismissal`); Esc, "Hủy", nút đóng của Sheet thì đóng và bỏ thay đổi. Đang gửi: không đóng được bằng bất kỳ cách nào.
- Tiêu đề: thêm "Thêm điểm đến vào Ngày N"; sửa "Sửa điểm đến". Không có ô ngày (D-23).
- Đầu form: `InlineAlert variant="info"` "Đã khôi phục nội dung chưa lưu" khi mở lại từ bản nháp `sessionStorage` (D-36); `InlineAlert` lỗi khi có lỗi không gắn field.
- Field (thứ tự cố định, hiện cùng lúc, cách 16px), Tên được focus khi mở:

| Field | Control | Bắt buộc | Giới hạn (BE) | Ghi chú |
|-------|---------|----------|---------------|---------|
| Tên | `Input lg` | `FormFieldLabel required` | ≤ 200 (`WaypointName.MaxLength`) | Tự điền từ `/place/<tên>/` khi đang trống; khi đó `FormFieldDescription` "Đã lấy tên từ link, bạn có thể sửa." |
| Vị trí | `LocationField` (`Input lg`, `type="text"`, `autoComplete="off"`, `spellCheck={false}`, `autoCapitalize="off"`) | `required` | parse được thành `Wgs84Coordinate` | Mô tả cố định "Dán tọa độ (ví dụ 10.7769, 106.7009) hoặc link Google Maps." |
| Địa chỉ | `Input lg` | không | ≤ 500 | |
| Ghi chú | `Textarea` | không | ≤ 2000 | |

- Footer (cách 24px). Từ `md`: `flex items-center gap-inline-sm`: (chỉ form sửa) `Button ghost text-danger` icon `Trash2` "Xóa điểm đến" bên trái; spacer; `DialogClose` "Hủy" `secondary`; nút gửi `primary`. Dưới `md`: cột full-width: nút gửi, "Hủy", rồi "Xóa điểm đến" (form sửa) cách 16px phía trên. Footer dính đáy vùng cuộn của Sheet để bàn phím ảo không che.
- Nút gửi: thêm "Thêm điểm đến" (`loadingLabel` "Đang thêm…"); sửa "Lưu" (`loadingLabel` "Đang lưu…"). `SubmitStatus` dưới footer.
- "Xóa điểm đến" trong form sửa: đóng form ngay (bỏ thay đổi), chạy luồng xóa có hoàn tác như menu ⋯ (không hỏi xác nhận).
- Validate theo mẫu Phase 3 (blur + gửi, nút gửi luôn bấm được, focus field lỗi đầu tiên). Gửi khi link rút gọn đang resolve: chờ resolve xong rồi validate, nút ở trạng thái loading.
- Thêm xong: đóng form, focus về nút đã mở form, waypoint mới ở cuối ngày đang chọn và được làm nổi; live region sr-only của editor đọc "Đã thêm {tên} vào Ngày N". Không toast (D-22). Sửa xong: đóng form, focus về nút chính của thẻ đó.

### LocationField (D-20, D-21)

Dòng trạng thái nằm ngay dưới ô (sau mô tả), `aria-live="polite"`, nối `aria-describedby`:

| Trạng thái | Hiển thị |
|------------|----------|
| Trống / đang gõ chưa parse được, chưa blur | Chỉ mô tả cố định |
| Parse được (tọa độ hoặc link đầy đủ) | Icon `CircleCheck` 16px `text-success` + "Đã nhận: 10.7769, 106.7009" (`text-label text-text`). Hiện ngay khi parse được, không chờ blur |
| Link rút gọn đang resolve | `Spinner sm` decorative + "Đang đọc link…" (`text-label text-muted`) |
| Lỗi (sau blur hoặc khi gửi) | `FormFieldError` theo bảng lỗi vị trí; ô `aria-invalid` |

- Form sửa: ô điền sẵn "lat, lng" của waypoint, dòng "Đã nhận" hiện ngay.
- Resolve chỉ gọi route handler của app (D-20); UI không hiện URL đích.

### TripInfoDialog (D-17, D-24..D-26)

- Từ `md`: `DialogContent size="md"`; dưới `md`: `Sheet modal defaultSnap="expanded"`. Không đóng khi bấm scrim. Tiêu đề "Thông tin chuyến đi". `InlineAlert info` khôi phục bản nháp như form waypoint.
- Field (cách 16px):

| Field | Control | Bắt buộc | Giới hạn | Ghi chú |
|-------|---------|----------|----------|---------|
| Tiêu đề | `Input lg` | `required` | 1–100 sau trim | Focus khi mở |
| Mô tả | `Textarea` | không | ≤ 1000 | |
| Ngày khởi hành | `Input lg type="date"` | không | `CalendarDate` | Có giá trị thì hiện `Button ghost sm` icon `X` "Xóa ngày" cạnh ô (Safari iOS không có nút xóa gốc); để trống gửi `null` |
| Ảnh bìa | `Input lg type="url" inputMode="url"` | không | `https://`, ≤ 500 (cột BE) | Mô tả "Dán link ảnh bắt đầu bằng https://". Có giá trị thì hiện `Button ghost sm` icon `X` "Xóa ảnh bìa" |

- Preview ảnh bìa dưới ô (cách 8px), `aspect-(--itinerary-cover-ratio) rounded-container overflow-hidden`, chỉ khi URL hợp lệ, debounce 400ms: đang tải `Skeleton block`; tải được `<img alt="Xem trước ảnh bìa" referrerPolicy="no-referrer">`; lỗi tải → nền `surface-muted` + icon `ImageOff` 24px `text-subtle` + dòng "Không tải được ảnh từ link này" (`text-label text-muted`), **vẫn cho lưu** (D-25).
- Footer: "Hủy" `secondary` + "Lưu" `primary` (`loadingLabel` "Đang lưu…"), bố cục như form waypoint (không có nút xóa). `SubmitStatus` dưới footer. Lưu xong đóng, không toast (D-24); focus về nút đã mở dialog.

### PublishDialog (D-39, D-40)

- `DialogContent size="sm"` ở mọi breakpoint. `DialogTitle` "Xuất bản lịch trình?"; `DialogDescription` "Ai có link đều xem được lịch trình này. Bạn vẫn sửa được nội dung sau khi xuất bản, nhưng không thể chuyển lại về nháp."
- Footer `flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end`: `DialogClose` "Hủy" (`secondary`, **`initialFocus`**) + `Button primary` "Xuất bản" (`loadingLabel` "Đang xuất bản…").
- Đang gửi: Esc/scrim/"Hủy" không đóng; `SubmitStatus`. Lỗi: `InlineAlert` trong dialog (gồm `Itinerary.CannotPublishEmpty` → "Thêm ít nhất 1 điểm đến để xuất bản."), dialog vẫn mở.
- Thành công: đóng, toast success "Đã xuất bản lịch trình", badge thành "Đã xuất bản", nút "Xuất bản" biến mất, header hiện "Thay đổi hiển thị ngay với người xem" (D-40, D-41). Focus về nút menu ⋯ của header (nút Xuất bản không còn).

### DeleteItineraryDialog (D-42)

- `DialogContent size="sm"`. `DialogTitle` "Xóa lịch trình "{tên}"?" (`break-words`). `DialogDescription` "Thao tác này không hoàn tác được." và, nếu đã xuất bản, thêm câu "Link chia sẻ sẽ không còn mở được." (cùng đoạn, cách một khoảng trắng).
- Footer như PublishDialog: "Hủy" (`initialFocus`) + `Button danger` "Xóa" (`loadingLabel` "Đang xóa…"). Đang gửi không đóng được; lỗi `InlineAlert` trong dialog.
- Xóa trong editor: `router.replace("/itineraries/mine")` rồi toast success "Đã xóa lịch trình". Xóa từ thẻ: xem trang danh sách.

### Xóa waypoint có hoàn tác (D-31..D-33, D-43)

1. Chọn "Xóa" (menu ⋯ hoặc form sửa): waypoint biến mất khỏi danh sách ngay, số thứ tự đánh lại, focus chuyển tới nút chính của thẻ kế tiếp → thẻ trước → nút "Thêm điểm đến" (CTA EmptyState nếu ngày trống).
2. `notify.undoable("Đã xóa "{tên}"", { actionLabel: "Hoàn tác" })`. Đồng hồ 5000ms của app bắt đầu.
3. Bấm "Hoàn tác" trong 5 giây: waypoint về đúng vị trí cũ, không gọi BE, focus vào nút chính của thẻ đó; toast đóng.
4. Hết 5 giây hoặc người dùng đóng toast (nút đóng/vuốt): gửi `DELETE`, đóng toast, chỉ báo "Đang lưu…". Commit là idempotent (gọi lần hai không gửi lại).
5. Xóa waypoint khác khi còn lệnh chờ: commit lệnh cũ ngay (đóng toast cũ), rồi bắt đầu lệnh mới. Tại một thời điểm chỉ có một toast hoàn tác.
6. Bắt đầu kéo, rời route trong app, đóng/reload tab: flush ngay (D-32, D-33). Lệnh chờ không kích hoạt cảnh báo rời trang (D-35).
7. DELETE lỗi: waypoint hiện lại đúng vị trí, toast error, chỉ báo "Lỗi – Thử lại" (thử lại = gửi lại DELETE).
- Xóa điểm cuối cùng của lịch trình đã xuất bản: không cảnh báo thêm (D-43). Trong 5 giây chờ, `canPublish` của bản nháp đã tính bỏ điểm đó.

### Rời trang (D-35)

- Đóng/reload tab khi còn request chạy hoặc form/dialog có thay đổi chưa lưu: `beforeunload` gốc của trình duyệt (không có copy riêng).
- Điều hướng trong app (back của editor, link trong `UserMenu`) khi còn request chạy: `LeaveEditorDialog`, `DialogContent size="sm"`: `DialogTitle` "Thay đổi đang được lưu. Rời trang?"; `DialogDescription` "Nếu rời ngay, thay đổi đang gửi có thể không được lưu."; footer "Ở lại" (`secondary`, `initialFocus`) + `Button danger` "Rời trang". Nếu mọi request xong khi dialog đang mở: dialog tự đóng và điều hướng tiếp, không hỏi lại.

### Trạng thái trang editor

| Trạng thái | Hiển thị |
|------------|----------|
| Đang tải | Header rút gọn (back + `Skeleton text` thay tiêu đề + `UserMenu compact`). Desktop: cột timeline có Skeleton thanh tab + 3 `Skeleton block`; canvas có `Skeleton` khối ảnh bìa + 2 dòng. Mobile: Skeleton ảnh bìa + 3 khối, không mở sheet. `p.sr-only role="status"` "Đang tải lịch trình…" |
| Lỗi mạng/5xx (D-46) | Header rút gọn + `ErrorState variant="page"` "Thử lại" |
| 404 / id sai GUID (D-46) | `not-found` sẵn có của app |
| 403 (D-45, D-46) | Header rút gọn (back + `UserMenu compact`, không tiêu đề). Thân: `EmptyState variant="page"` icon `Lock`, heading "Bạn không có quyền sửa lịch trình này", body "Chỉ người tạo lịch trình mới sửa được.", action link dạng `buttonVariants({ variant: "primary" })` "Về Lịch trình của tôi" → `/itineraries/mine`. Document title "Không có quyền truy cập · Tripory" |
| Có dữ liệu, `canEdit` true | Editor đầy đủ |

---

## Drag & drop announcements (tiếng Việt, D-34)

| Sự kiện | Copy (`{tên}`, `{i}`, `{n}` = vị trí 1-based / tổng trong ngày) |
|---------|------------------------------------------------------------------|
| Hướng dẫn (sr-only, `aria-describedby` của tay cầm) | "Nhấn Space để nhấc điểm đến. Dùng phím mũi tên lên, xuống để di chuyển, nhấn Space để thả hoặc Esc để hủy." |
| Bắt đầu kéo | "Đã nhấc {tên}, đang ở vị trí {i} trên {n}." |
| Di chuyển | "{tên} đang ở vị trí {i} trên {n}." |
| Thả | "Đã thả {tên} ở vị trí {i} trên {n}." |
| Hủy | "Đã hủy. {tên} trở lại vị trí {i} trên {n}." |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA trang danh sách | "Tạo lịch trình" (D-10) |
| Primary CTA editor | "Thêm điểm đến"; "Xuất bản" |
| Tiêu đề trang | "Lịch trình của tôi"; document title "Lịch trình của tôi · Tripory", "{tiêu đề} · Tripory", "Sửa lịch trình · Tripory", "Không có quyền truy cập · Tripory" |
| Tabs lọc | "Tất cả", "Nháp", "Đã xuất bản" |
| Badge | "Nháp", "Đã xuất bản" |
| Meta thẻ / tóm tắt | "Khởi hành {dd/MM/yyyy}", "{x} km", "Tổng quãng đường: {x} km" |
| Menu thẻ | Trigger "Thao tác cho "{tên}""; "Mở", "Xóa" |
| Menu header editor | Trigger "Thao tác lịch trình"; "Thông tin chuyến đi", "Xóa lịch trình" |
| Nút back editor | `aria-label` "Về Lịch trình của tôi" |
| Chỉ báo lưu (D-30) | "Đang lưu…", "Đã lưu", "Lỗi – Thử lại" |
| Dòng đã xuất bản (D-41) | "Thay đổi hiển thị ngay với người xem" |
| Giải thích Xuất bản (D-38) | "Thêm ít nhất 1 điểm đến để xuất bản" |
| Tóm tắt | "Sửa thông tin", "Thêm ảnh bìa" |
| Tab ngày | "Ngày {N}", nút "Thêm ngày" |
| Phụ đề (D-29) | Placeholder "Thêm phụ đề cho ngày này"; `aria-label` "Thêm phụ đề cho Ngày {N}" / "Sửa phụ đề Ngày {N}: {phụ đề}" / "Phụ đề Ngày {N}" |
| Danh sách waypoint | `aria-label` "Điểm đến Ngày {N}"; tay cầm "Kéo để sắp xếp {tên}"; menu "Thao tác cho "{tên}"", "Sửa", "Xóa" |
| Dialog tạo (D-09, D-12) | Title "Lịch trình mới"; nhãn "Tiêu đề"; giá trị đầu "Chuyến đi mới"; nút "Tạo lịch trình" / "Đang tạo…"; "Hủy" |
| Form waypoint | Title "Thêm điểm đến vào Ngày {N}" / "Sửa điểm đến"; nhãn "Tên", "Vị trí", "Địa chỉ", "Ghi chú"; mô tả vị trí "Dán tọa độ (ví dụ 10.7769, 106.7009) hoặc link Google Maps."; "Đã lấy tên từ link, bạn có thể sửa."; nút "Thêm điểm đến" / "Đang thêm…", "Lưu" / "Đang lưu…", "Hủy", "Xóa điểm đến" |
| Vị trí (D-21) | "Đã nhận: {lat}, {lng}"; "Đang đọc link…" |
| Dialog Thông tin chuyến đi (D-24, D-25) | Title "Thông tin chuyến đi"; nhãn "Tiêu đề", "Mô tả", "Ngày khởi hành", "Ảnh bìa"; mô tả "Dán link ảnh bắt đầu bằng https://"; "Xóa ngày", "Xóa ảnh bìa"; "Không tải được ảnh từ link này"; nút "Lưu" / "Đang lưu…", "Hủy" |
| Khôi phục bản nháp (D-36) | "Đã khôi phục nội dung chưa lưu" |
| Cold start | "Máy chủ đang khởi động, có thể mất tới 30 giây…" (Phase 3) |
| Toast | "Đã xóa "{tên}"" + action "Hoàn tác" (D-31) · "Đã xuất bản lịch trình" (D-40) · "Đã xóa lịch trình" (D-42) · "Danh sách đã thay đổi, đã tải lại" (D-37, info) · lỗi theo `selectErrorMessage` |
| Live region editor | "Đã thêm {tên} vào Ngày {N}" |
| Loading status (sr) | "Đang tải lịch trình…", "Đang tải thêm lịch trình…" |
| Empty — tab Tất cả | Heading "Chưa có lịch trình nào"; body "Tạo lịch trình đầu tiên để lên kế hoạch cho chuyến đi của bạn."; action "Tạo lịch trình" (icon `Map`) |
| Empty — tab Nháp | Heading "Chưa có bản nháp nào"; body "Lịch trình chưa xuất bản sẽ nằm ở đây." (icon `FilePen`, không CTA) |
| Empty — tab Đã xuất bản | Heading "Chưa xuất bản lịch trình nào"; body "Lịch trình đã xuất bản sẽ nằm ở đây. Ai có link đều xem được." (icon `Globe`, không CTA) |
| Empty — ngày trống | Heading "Chưa có điểm đến nào trong Ngày {N}"; body "Dán tọa độ hoặc link Google Maps để thêm điểm đầu tiên."; action "Thêm điểm đến" (icon `MapPin`) |
| Error state (trang/lưới đầu) | `ErrorState` Phase 1: "Không thể tải nội dung" / "Đã xảy ra sự cố. Vui lòng thử lại." / "Thử lại" |
| Error state (trang kế) | Không có (D-02) |
| 403 (D-45) | Heading "Bạn không có quyền sửa lịch trình này"; body "Chỉ người tạo lịch trình mới sửa được."; action "Về Lịch trình của tôi" |
| Destructive: xuất bản (D-39) | "Xuất bản lịch trình?" / "Ai có link đều xem được lịch trình này. Bạn vẫn sửa được nội dung sau khi xuất bản, nhưng không thể chuyển lại về nháp." / "Xuất bản" (`Đang xuất bản…`) · "Hủy" (focus mặc định) |
| Destructive: xóa lịch trình (D-42) | "Xóa lịch trình "{tên}"?" / "Thao tác này không hoàn tác được." [+ "Link chia sẻ sẽ không còn mở được." nếu đã xuất bản] / "Xóa" (`Đang xóa…`) · "Hủy" (focus mặc định) |
| Destructive: xóa waypoint (D-31) | Không hỏi xác nhận; hoàn tác 5 giây qua toast |
| Rời trang (D-35) | "Thay đổi đang được lưu. Rời trang?" / "Nếu rời ngay, thay đổi đang gửi có thể không được lưu." / "Rời trang" · "Ở lại" (focus mặc định) |
| Kéo thả | Bảng announcements ở trên |

### Lỗi validate client (Zod)

| Field | Điều kiện | Copy |
|-------|-----------|------|
| Tiêu đề (tạo, metadata) | rỗng sau trim | "Vui lòng nhập tiêu đề." |
| Tiêu đề | > 100 ký tự | "Tiêu đề tối đa 100 ký tự." |
| Mô tả | > 1000 ký tự | "Mô tả tối đa 1000 ký tự." |
| Ngày khởi hành | không phải `YYYY-MM-DD` hợp lệ | "Ngày khởi hành không hợp lệ." |
| Ảnh bìa | không phải URL `https://` | "Link ảnh phải bắt đầu bằng https://." |
| Ảnh bìa | > 500 ký tự | "Link ảnh tối đa 500 ký tự." |
| Phụ đề | > 100 ký tự | "Phụ đề tối đa 100 ký tự." |
| Tên điểm đến | rỗng sau trim | "Vui lòng nhập tên điểm đến." |
| Tên điểm đến | > 200 ký tự | "Tên điểm đến tối đa 200 ký tự." |
| Vị trí | rỗng | "Vui lòng dán tọa độ hoặc link Google Maps." |
| Vị trí | không parse được | "Không đọc được vị trí. Dán tọa độ dạng 10.7769, 106.7009 hoặc link Google Maps." |
| Vị trí | ngoài khoảng `Wgs84Coordinate` | "Tọa độ nằm ngoài phạm vi. Vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180." |
| Vị trí | link Google Maps không chứa tọa độ | "Link này không có vị trí. Chọn một địa điểm trong Google Maps rồi chia sẻ lại." |
| Vị trí | resolve link rút gọn thất bại (timeout, quá số bước, host lạ, lỗi mạng) | "Không mở được link rút gọn này. Thử dán link đầy đủ hoặc tọa độ." |
| Địa chỉ | > 500 ký tự | "Địa chỉ tối đa 500 ký tự." |
| Ghi chú | > 2000 ký tự | "Ghi chú tối đa 2000 ký tự." |

Mã lỗi BE cần thêm vào `ERROR_MESSAGES` (planner chốt câu cuối cùng theo giọng D-16 Phase 2): `Itinerary.NotFound` "Không tìm thấy lịch trình.", `Itinerary.Forbidden` "Bạn không có quyền sửa lịch trình này.", `Itinerary.CannotPublishEmpty` "Thêm ít nhất 1 điểm đến để xuất bản.", `Itinerary.InvalidDayNumber` "Ngày không hợp lệ.", `Itinerary.InvalidReorderList` (không hiện câu này, xử lý bằng toast D-37), `Waypoint.NotFound` "Điểm đến không còn tồn tại."

Giọng văn theo Phase 1/3: tiếng Việt trung tính, câu ngắn, không dấu chấm than; lỗi field có dấu chấm cuối; toast, nhãn nút, chỉ báo lưu không có dấu chấm cuối. Thuật ngữ thống nhất: "lịch trình", "điểm đến" (không dùng "waypoint", "điểm dừng" trong UI), "Ngày N", "xuất bản", "nháp".

---

## Accessibility Checklist (bổ sung Phase 1/3)

- Mỗi trang đúng một `h1` (danh sách: "Lịch trình của tôi"; editor: tiêu đề trên header). Dialog/Sheet có title; form `aria-labelledby` trỏ title.
- Thẻ lịch trình: một link duy nhất (tiêu đề) + một nút menu; không lồng phần tử tương tác. Thẻ waypoint: tay cầm, nút chính, nút menu tách rời.
- Tabs (lọc, ngày) theo pattern Base UI: ←/→, Home/End, `aria-selected`; nút "Thêm ngày" ngoài roving focus.
- Mọi icon button có `aria-label` (back, ⋯, tay cầm, xóa ngày, xóa ảnh bìa có chữ thấy được).
- `aria-disabled` cho "Xuất bản" kèm `aria-describedby` giải thích; không dùng `disabled` thật (D-38).
- Live region: chỉ báo lưu, dòng trạng thái vị trí, `SubmitStatus`, live region editor (thêm điểm), announcements dnd-kit, status tải. Toast hoàn tác `role="status"` và tới được bằng bàn phím (vùng toast của Sonner có phím tắt và nút có thể Tab tới).
- Dialog xác nhận phá hủy và xuất bản đặt focus đầu ở "Hủy"/"Ở lại"; trả focus đúng chỗ theo các quy tắc ở trên sau khi đóng.
- Sheet timeline không modal: không trap focus; Tab đi từ header → nền → sheet theo thứ tự DOM. Sheet form modal: trap focus như Phase 1.
- Vùng chạm ≥ 44px: tay cầm 44×44, icon button, tab ngày, nút phụ đề, nút "Thêm ngày", mục menu, nút trong toast, nút chỉ báo lỗi (`size="sm"` có hit area 44).
- `prefers-reduced-motion`: không cuộn mượt, không chuyển màu làm nổi, dịch chỗ khi kéo 0ms (token motion đã về 0).
- Smoke ở 320×568, 390×844, 768×1024, 1440×900: không overflow ngang; header editor không bị sheet che ở cả ba mức; bàn phím ảo không che nút gửi trong Sheet form; tên dài cắt ellipsis ở header, xuống dòng trong tóm tắt và dialog.

---

## Testing Contract (UI)

| Đối tượng | Test bắt buộc |
|-----------|---------------|
| `notify.undoable` | Không tự đóng sau 10 giây (fake timers); action gọi một lần + đóng; nút đóng gọi `onDismiss`; `dismiss(id)` đóng; `role="status"` |
| `InlineAlert variant="info"` | `role="status"`, không render khi rỗng; `danger` giữ `role="alert"` |
| `Sheet dismissible/defaultSnap/insetTop` | Không có "Đóng bảng" và Esc không đóng khi `dismissible={false}`; mức mở đầu theo `defaultSnap`; `resolveSnapPoints(vh, insetTop)` bảng giá trị (gồm 568 và 844 với header 108/64) |
| `UserMenu compact` | Chỉ avatar ở mọi breakpoint, `aria-label` giữ nguyên |
| `MyItinerariesView` | Tab đọc/ghi `?status`, giá trị lạ → Tất cả; skeleton trang đầu; ErrorState + Thử lại khi trang đầu lỗi; EmptyState đúng copy từng tab, chỉ Tất cả có CTA; sentinel gọi `fetchNextPage`; trang kế lỗi không render nút/thông báo, sentinel lần sau gọi lại; hết trang không render gì |
| `ItineraryCard` | Link tới editor; menu Mở/Xóa; ẩn km = 0, ẩn ngày khởi hành khi null; ảnh lỗi → nền dự phòng; không hiện số ngày/điểm |
| `CreateItineraryDialog` | Giá trị đầu được chọn sẵn; Enter gửi; trim + 1–100; "Đang tạo…" + chặn gửi lần hai; cold start 5s; lỗi field/alert; thành công điều hướng, không toast |
| `EditorHeader` / `SaveIndicator` | 4 trạng thái theo mutation; bấm "Lỗi – Thử lại" gửi lại đúng thao tác; ẩn Xuất bản khi đã xuất bản; dòng D-41 |
| `PublishButton` / `PublishDialog` | `aria-disabled` + describedby khi 0 điểm (tính cả điểm đang chờ xóa); focus đầu ở Hủy; loading; lỗi inline; thành công đổi badge, ẩn nút, toast |
| `DeleteItineraryDialog` | Câu thêm khi đã xuất bản; focus đầu ở Hủy; danger + loading; điều hướng + toast |
| `DayTabs` | Vẽ đủ dải ngày thưa; km dòng 2; Thêm ngày optimistic + chọn + focus, rollback khi lỗi |
| `DaySubtitle` | Enter/blur lưu, Esc hủy, rỗng → null, > 100 báo lỗi, không đổi không gửi |
| `WaypointList` | Xóa ẩn ngay + toast; hoàn tác trả đúng vị trí, không gọi BE; 5s gửi DELETE; xóa thứ hai commit lệnh thứ nhất; kéo khi đang chờ thì flush trước; reorder bằng bàn phím (Space/↑/↓/Space, Esc) + announcements tiếng Việt; rollback khi lỗi; `InvalidReorderList` toast info + refetch; focus sau xóa/hoàn tác |
| `WaypointFormDialog` / `LocationField` | Thứ tự field, focus Tên; các mẫu parse (bảng do planner/researcher lập ở domain) hiện "Đã nhận"; tự điền tên khi trống, không ghi đè khi đã có; resolve rút gọn (fake fetch) và lỗi resolve; lỗi khi blur/gửi; khôi phục bản nháp hiện InlineAlert info; Xóa điểm đến từ form chạy luồng hoàn tác |
| `TripInfoDialog` | Preview debounce + lỗi tải vẫn lưu được; chỉ nhận https; Xóa ngày → null; Xóa ảnh bìa; validate 1–100 / ≤ 1000 |
| `LeaveEditorDialog` | Hiện khi còn request; tự đóng và đi tiếp khi request xong; focus đầu ở "Ở lại" |
| `EditorForbidden` | Copy D-45, link về `/itineraries/mine` |

Test bằng Vitest + Testing Library (jsdom), fake `HttpClient`, không MSW. Không test pixel; kéo bằng chuột/cảm ứng kiểm qua adapter/handler thuần, kéo bằng bàn phím kiểm end-to-end trong jsdom.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Không thêm block mới; phần mở rộng viết tay trên Base UI 1.8 theo pattern Phase 1 | not required — official only, `registries: {}` xác nhận 2026-10-24 |
| Third-party | none | not applicable — không khai báo. dnd-kit là thư viện npm (catalog, pin cứng), không phải registry block |

---

## Source Traceability

| Source | Quyết định dùng |
|--------|-----------------|
| `04-CONTEXT.md` | D-01..D-47 (bố cục, infinite scroll im lặng khi lỗi trang kế, tạo nhanh, editor hai vùng/sheet, form, nhập vị trí, lưu, hoàn tác, kéo thả, rời trang, xuất bản không có hộp chia sẻ, 403, toàn bộ copy khóa) |
| `01-UI-SPEC.md` | Token, typography, spacing, màu, accent, focus ring, state matrix, Sheet snap, EmptyState/ErrorState, Toast, 404 |
| `03-UI-SPEC.md` | `loadingLabel`, `SubmitStatus`, `InlineAlert`, validate blur + gửi, focus field lỗi, giọng lỗi field, `DropdownMenuLinkItem`, link dạng `buttonVariants` |
| `REQUIREMENTS.md` | ITIN-01..14 (ITIN-11 theo ghi chú D-40) |
| Codebase scout | `notify` ép 8 giây và không có `duration`; `InlineAlert` chỉ có `danger`; `Sheet` luôn có "Đóng bảng", mở mặc định 0.6, expanded 0.92 viewport (sẽ che header editor); `ErrorState` copy cố định; `FormFieldLabel required` hiện "(bắt buộc)"; `SubmitStatus` đang nằm trong `modules/identity/ui`; `Card` interactive là `<button>` (không chứa được menu) |
| BE scout (`tripory_be`) | Tên waypoint ≤ 200 (`WaypointName`), địa chỉ ≤ 500, ghi chú ≤ 2000, ảnh bìa ≤ 500 (EF config); tiêu đề 1–100, mô tả ≤ 1000, phụ đề ≤ 100 (validator); `InvalidDayNumber` chỉ chặn dayNumber < 1; `pageSize` 1–100 |
| FE cũ (chỉ tham khảo UX) | Thẻ waypoint 3 phần (tay cầm, thân, thao tác), placeholder nét đứt khi kéo, EmptyState theo ngày có CTA |
| Mặc định của researcher | Ngưỡng Dialog↔Sheet ở `md`; header editor hai hàng dưới `sm`; `notify.undoable` không tự hết hạn (app sở hữu đồng hồ); một toast hoàn tác tại một thời điểm; form dialog không đóng khi bấm scrim; `router.replace` khi đổi tab lọc; 180ms/8px/4px cho cảm biến; sentinel 400px; tay cầm ẩn khi ngày có 1 điểm; số thứ tự màu trung tính; dialog rời trang tự đi tiếp khi request xong; toàn bộ copy phụ (empty từng tab, lỗi vị trí, menu, title, announcements, 403 body) |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Ghi chú từ UI checker (2026-10-23): việc tiên quyết cho planner

Checker đã duyệt (APPROVED, không có BLOCK). Orchestrator đã kiểm lại FLAG khẩn sau đây trong code; planner phải xếp nó vào **Wave 0, trước mọi UI của Phase 4**:

- **Utility màu chữ không sinh ra CSS.** `theme.css` khai báo `--color-text-muted`, `--color-text-subtle`, `--color-text-disabled`, nên Tailwind 4 sinh ra `text-text-muted`… chứ không sinh `text-muted`, `text-subtle`, `text-disabled`. Hiện có khoảng 32 chỗ ngoài test trong `packages/ui-web/src` và `apps/web/src` dùng tên ngắn: `label.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `search-input.tsx`, `select.tsx`, `button.tsx`, `checkbox.tsx`, `icon-button.tsx`… Hậu quả: chữ phụ hiện bằng màu chữ thường, còn trạng thái disabled/`aria-disabled` không mờ đi. Riêng nút "Xuất bản" `aria-disabled` của spec này sẽ trông như nút bật.
- **`z-(--z-*)` không có biến.** `theme.css` không có `--z-*`, nên `z-(--z-modal)`, `z-(--z-overlay)`, `z-(--z-sticky)` (Dialog, Sheet, EditorHeader) không có z-index thật.
- Checker còn nêu `text-accent`. `--color-accent` có trong `theme.css`; planner kiểm lại trong build output trước khi sửa.
- **Cách sửa (planner chốt một):**
  - (a) Thêm alias trong `@theme` (ví dụ `--color-muted`, `--color-subtle`, `--color-disabled` trỏ về semantic tương ứng; `--z-*` trỏ về token z-index của `design-tokens`).
  - (b) Đổi mọi chỗ dùng sang tên đúng.

  Dù chọn cách nào cũng phải thêm guard test trong `design-tokens`/`ui-web`, để mọi class màu/z dùng trong component đều có CSS thật (Phase 1 đã có compile/guard test, mở rộng từ đó).
- Spec này viết `text-muted`, `text-subtle`, `text-disabled`, `z-(--z-*)` theo ngữ nghĩa. Khi triển khai thì dùng đúng tên class sau khi đã sửa.
