---
phase: 4
slug: itinerary-crud-editor
status: approved
shadcn_initialized: true
preset: base-nova
created: 2026-10-24
updated: 2026-11-05
reviewed_at: 2026-11-05
---

# Phase 4 — UI Design Contract

> Hợp đồng hình ảnh và tương tác cho Itinerary CRUD & Editor. Phase 4 **dùng lại toàn bộ** token, typography, spacing, màu, focus ring, state matrix, Sheet snap và a11y nền của `01-UI-SPEC.md` (đã duyệt), cùng mẫu form, nút đang gửi, `InlineAlert`, `SubmitStatus` và giọng copy của `03-UI-SPEC.md`. File này chỉ khai báo phần mới hoặc phần ghép riêng của Phase 4. Mọi D-xx dẫn chiếu `04-CONTEXT.md` (đã khóa); copy trong ngoặc kép có gắn D-xx là chuỗi khóa, chép nguyên văn.

> **Thay đổi 2026-10-30 (mở lại ITIN-02, ITIN-03; D-52..D-101).** Phần đã giao của 23 plan và các sửa sau UAT giữ nguyên, trừ ba chỗ:
> 1. **Form tạo lịch trình** thay "Dialog tạo nhanh": một modal (`ResponsiveFormSurface`) có 4 khối accordion Điểm đến → Tên chuyến đi → Thời gian → Sở thích, nút "Tạo lịch trình" dính đáy. Xem §Form tạo lịch trình. Thay D-09; D-11, D-12 giữ hành vi.
> 2. **Ảnh bìa** thành lưới 5 ô chọn một ảnh hiển thị, chỉ sửa trong "Thông tin chuyến đi"; ảnh mặc định theo điểm đến. Xem §CoverImageField. Thay phần một ảnh bìa của D-25.
> 3. **"Thông tin chuyến đi" tự lưu**, không còn nút "Lưu"/"Hủy" và không còn chân form. Xem §TripInfoDialog. Thay D-24.
>
> Các mục đã sửa theo đợt này: Hằng tương tác, Typography (vai trò), Color (accent), Component Inventory, ItineraryCard và TripSummary (chuỗi ảnh dự phòng), Form tạo lịch trình (mới), TripInfoDialog (viết lại), CoverImageField (mới), Copywriting, Lỗi validate, A11y, Testing, Source Traceability. PUB-02 nằm ngoài đợt cập nhật này.
>
> **Thay đổi 2026-11-05 (mở lại lần 2: bản đồ trong editor và tab Tổng quan; PUB-06, D-111..D-140).** Mọi nội dung đã duyệt giữ nguyên, trừ các mục bị thay trực tiếp, mỗi mục có ghi chú "[Cập nhật 2026-11-05]": Component Inventory (`EditorLayout`, `TripSummary`, `DayTabs`, `WaypointFormDialog`, `Sheet`), §Bố cục desktop (canvas thành bản đồ), §Bố cục mobile/tablet (nền sau sheet thành bản đồ), §DayTabs (thêm tab "Tổng quan" và chấm màu ngày), §WaypointList (nút chính của thẻ chọn điểm thay vì mở form sửa, D-126), §WaypointFormDialog (ô "Ngày" khi mở từ Tổng quan, D-138), §Trạng thái trang editor (skeleton bản đồ). Phần mới nằm ở **§Bản đồ trong editor và tab Tổng quan**, gồm token, màu ngày, copy, a11y và test riêng. Ngoài phạm vi: trang công khai, nút chuyển Bài viết/Bản đồ (PUB-02, Phase 5), ảnh Open Graph (PUB-05), tìm POI và bấm bản đồ chọn vị trí (MAP-01, MAP-02, v2).
>
> **Sửa FLAG 1 của UI checker (2026-10-30):** lưới ảnh bìa tách thành hai lớp chồng nhau, `RadioGroup` chỉ chứa ô có ảnh, nút X "Xóa ảnh bìa {N}" và nút "Thêm ảnh bìa" nằm ở lớp sau trong DOM, ngoài radiogroup; thêm thứ tự Tab, quy tắc trả focus và live region (§CoverImageField, cùng các dòng Copywriting, A11y, Testing liên quan).

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
| Feedback | `Toast`/`notify` (Sonner) của `ui-web`, đã mount ở root layout. Toast hiện ở đầu màn hình (`top-right`), error không icon và chữ `text-danger` |
| Kéo thả | dnd-kit (planner thêm vào `catalog:`, pin cứng). Spec này chỉ khóa hành vi, không khóa API |
| Bản đồ (2026-11-05) | `maplibre-gl` (BSD-3), nền vector tile OpenFreeMap qua style JSON riêng của repo (D-111, D-112). Có dùng `react-map-gl/maplibre` hay gọi `maplibre-gl` trực tiếp là việc của planner (Claude's Discretion); spec chỉ khóa hình ảnh và hành vi. Nạp client-only, không SSR |

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

Phần mở lại lần 2 (2026-11-05) không thêm token spacing. Gán dùng: nút zoom và chip gợi ý cách mép bản đồ 16px (`stack-md`), gap giữa hai nút zoom 4px (`inline-xs`), nhãn pin cách pin 8px, ghi công cách mép 8px (`inline-sm`), padding `OverviewPanel` 16px, gap giữa các khối thông tin chung 16px, gap giữa các dòng ngày 8px, padding dòng ngày 16px ngang / 8px dọc, chấm màu cách chữ 8px (dòng ngày) và 4px (tab ngày).

Phần mở lại 2026-10-30 không thêm token. Gán dùng: padding trigger và panel accordion 16px (`px-stack-md`), padding dọc trigger 8px (`py-stack-sm`), gap giữa các ô trong một khối 16px, gap giữa chip và giữa các ô lưới ảnh 8px (`gap-inline-sm`), padding chân form dính đáy 16px dọc (`py-stack-md`), padding khung "Link ảnh" 16px.

### Sizing mới (token, không hard-code)

| Token | Value | Layer | Usage |
|-------|-------|-------|-------|
| `--editor-timeline-width` | `400px` | `packages/design-tokens/src/components.css` | Bề rộng cột timeline desktop từ `lg` (D-13). Grid `lg:grid-cols-[var(--editor-timeline-width)_1fr]` |
| `--itinerary-cover-ratio` | `16 / 9` | `packages/design-tokens/src/components.css` | Tỉ lệ ảnh bìa ở thẻ, canvas, nền mobile, preview trong dialog. Dùng `aspect-(--itinerary-cover-ratio)` |

Cập nhật `tokens.test.ts` cho hai token này. Token mới của bản đồ (kích thước pin, chấm màu ngày, bảng màu ngày) nằm ở §Bản đồ trong editor và tab Tổng quan → Token mới. Chiều cao header editor là kết quả bố cục (64px, luôn một hàng ở mọi breakpoint; cụm chỉ báo lưu + Xuất bản đã chuyển lên vùng bên phải header), app đo bằng `ResizeObserver` để truyền cho Sheet (xem Sheet mở rộng), không khai báo token.

### Hằng tương tác (app constant, không phải token)

| Hằng | Giá trị | Dùng ở |
|------|---------|--------|
| `PAGE_SIZE` | 12 | `/mine` (D-02) |
| Ngưỡng "gần cuối" | `rootMargin: "0px 0px 400px 0px"` | Sentinel infinite scroll |
| `UNDO_WINDOW_MS` | 5000 | Hoãn DELETE waypoint (D-31), đồng hồ thực, không dừng khi hover/focus |
| Nhấn giữ cảm ứng | 180ms, dung sai 8px | dnd-kit TouchSensor trên tay cầm (D-34) |
| Ngưỡng chuột | di chuyển ≥ 4px, không delay | dnd-kit PointerSensor, phân biệt click với kéo |
| Debounce preview ảnh bìa | 400ms | D-25; ô "Link ảnh" của lưới ảnh bìa (D-84) |
| Tự lưu ô chữ "Thông tin chuyến đi" | 800ms sau lần gõ cuối, hoặc ngay khi blur | D-88 (tiêu đề, mô tả) |
| `DAY_COUNT_MIN` / `DAY_COUNT_MAX` / mặc định | 1 / 30 / 3 | D-56, D-73 (hằng domain, không phải token) |
| `COVER_IMAGE_LIMIT` | 5 | D-99 |
| Số mục nhóm "Phổ biến" | 8 (hạng 1..8 của bảng D-61) | D-60 |
| Debounce resolve link rút gọn | 400ms sau lần gõ cuối, hoặc ngay khi blur/paste | D-20 |
| Làm nổi waypoint mới | 1500ms | D-22 |
| Cold start | 5000ms | `SubmitStatus` (Phase 3 D-31) |

---

## Typography

Không đổi so với Phase 1, chỉ gán vai trò:

| Role | Size | Weight | Line Height | Dùng ở Phase 4 |
|------|------|--------|-------------|----------------|
| Body | 16px | 400 | 1.5 | Giá trị Input/Textarea, mô tả trong canvas, nội dung dialog xác nhận, mục menu, phụ đề ngày, tên điểm đến trong danh sách chọn (chưa chọn), con số của bộ đếm ngày, chữ "ngày" sau bộ đếm |
| Body (semibold) | 16px | 600 | 1.5 | Tiêu đề trên header editor (`h1`, cắt ellipsis), tên waypoint trong thẻ, tiêu đề khối accordion ("Điểm đến"…), tên điểm đến đang chọn |
| Label | 14px | 600 | 1.5 | Chữ nút, tab lọc, dòng 1 tab ngày ("Ngày 2"), Badge, nhãn ô, chữ chip sở thích, nhãn nhóm "Phổ biến"/"Tất cả"/"Kết quả tìm kiếm", chữ ô "Thêm ảnh" |
| Label (regular) | 14px | 400 | 1.5 | Địa chỉ waypoint, meta thẻ ("Khởi hành … · … km"), dòng 2 tab ngày (km), chỉ báo lưu, dòng "Đã nhận: …", mô tả ô, lỗi field, dòng giải thích nút Xuất bản (dòng D-41 "Thay đổi hiển thị ngay với người xem" đã bỏ), dòng tóm tắt của khối accordion, dòng alias "gồm Đà Lạt", ghi chú dưới lưới ảnh bìa |
| Heading | 20px | 600 | 1.2 | Tiêu đề thẻ lịch trình (tối đa 2 dòng), `DialogTitle`/`SheetTitle` (gồm "Lịch trình mới"), heading EmptyState/ErrorState, tiêu đề chuyến đi trong nền mobile |
| Display | 28px | 600 | 1.2 | `h1` "Lịch trình của tôi", tiêu đề chuyến đi trong canvas desktop |

Đúng 4 cỡ (14/16/20/28), đúng 2 weight (400/600). Số km và ngày dùng `tabular-nums`.

(2026-11-05) Phần bản đồ không thêm cỡ hay weight: số trên pin, nhãn tên pin, chip gợi ý, ghi công, dòng 2 của dòng ngày dùng Label (14px, 600 hoặc 400); dòng 1 của dòng ngày và tiêu đề `OverviewSummary` dưới `lg` dùng Body semibold; tiêu đề `OverviewSummary` từ `lg` dùng Heading (20px). Chữ trong style nền chỉ dùng 14px và 16px.

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
1. Nút primary: "Tạo lịch trình" (đầu trang, EmptyState tab Tất cả, nút gửi ở chân form tạo), "Thêm điểm đến" (CTA EmptyState của ngày trống và nút gửi form thêm), "Lưu" (form sửa waypoint), "Thêm" (khung "Link ảnh" của lưới ảnh bìa), "Xuất bản" (header và hộp xác nhận), "Thử lại" (ErrorState), "Về Lịch trình của tôi" (trang 403). Dialog "Thông tin chuyến đi" không còn nút "Lưu" (D-87).
2. Vạch tab đang chọn (Tabs lọc trạng thái, tab ngày).
3. Focus ring.
4. Nút "Hoàn tác" trong toast (style action sẵn có của `Toast`).
5. Làm nổi waypoint vừa thêm: `bg-primary-subtle` + `border-primary-border` trong 1500ms (D-22). (2026-11-05) Cùng style cho dòng ngày ở Tổng quan khi vừa thêm điểm vào ngày đó từ Tổng quan.
6. Thẻ đang kéo (drag overlay): `border-primary-border`.
7. Icon trong EmptyState (`text-accent`, sẵn có).
8. (2026-10-30) Lựa chọn đang bật trong form tạo: dòng điểm đến đang chọn (`bg-primary-subtle border-primary-border` + icon `Check` `text-primary`) và chip sở thích đang bật (`bg-primary-subtle border-primary-border` + icon `Check` `text-primary`). Chữ vẫn là `text-text`.
9. (2026-10-30) Ô ảnh bìa đang hiển thị: viền `ring-2 ring-primary` + huy hiệu dấu tích `bg-primary text-primary-foreground` (D-85).

**Không dùng accent cho:** nút "Thêm điểm đến" ở cuối danh sách khi ngày đã có điểm (dùng `secondary`), nút "+ Thêm ngày" (`ghost`), menu ⋯, nút back, tay cầm kéo, số thứ tự waypoint (`bg-surface-muted text-text`), Badge "Nháp" (`neutral`), km, chỉ báo lưu, link "Mở", trigger accordion và chevron (`text-text`/`text-muted`), nút −/+ của bộ đếm ngày (`secondary`), ô "Thêm ảnh" (nét đứt trung tính), nút X xóa ảnh (`secondary`), nút "Hủy" trong khung "Link ảnh" (`secondary`).

**Bản đồ (2026-11-05):** accent không dùng cho pin, đường nối, chấm màu ngày, nút zoom (`secondary`), trạng thái chọn pin (`ring-text`), thẻ/dòng đang chọn (`ring-text`), chip gợi ý, ghi công. Pin, đường, chấm ngày dùng **bảng màu dữ liệu theo ngày** (8 màu, §Bản đồ → Bảng màu theo ngày), là màu phân loại có lý do ngữ nghĩa (ngày), không phải accent thứ hai. Nền bản đồ sáng nhạt thuộc phần 60% (D-116).

**Danger dùng thêm (2026-10-30):** dấu báo lỗi trên trigger khối accordion (icon `CircleAlert` + dòng tóm tắt `text-danger`), toast error lỗi tự lưu (trước đây `InlineAlert`). Nút X xóa ảnh **không** dùng màu danger vì thao tác nhẹ và ảnh có thể thêm lại.

**Destructive dùng cho:** mục menu "Xóa" (`DropdownMenuItem variant="danger"`), nút "Xóa" của dialog xóa lịch trình (`Button variant="danger"`), nút "Rời trang" của dialog rời trang (`danger`), nút "Xóa điểm đến" trong form sửa (`Button variant="ghost"` + `text-danger`), chỉ báo "Lỗi – Thử lại".

Contrast: dùng lại bằng chứng Phase 1/3. Badge `success` (`success` trên `success-subtle`) ≈ 5.1:1; `text-subtle` (placeholder phụ đề) trên `surface` ≈ 4.8:1, đạt AA. Trạng thái không chỉ truyền bằng màu: Badge có chữ, chỉ báo lưu có icon + chữ, ngày đang chọn có vạch + `aria-selected`.

---

## Component Inventory

### Dùng lại nguyên trạng (`@tripory/ui-web`)

`Card` (`default`), `Tabs`/`TabsList`/`TabsTrigger`/`TabsPanel` (`line`), `Dialog`/`DialogContent` (`sm`, `md`)/`DialogTitle`/`DialogDescription`/`DialogClose`, `DropdownMenu*` (gồm `DropdownMenuLinkItem`, item `danger`), `Tooltip*`, `Badge` (`neutral`, `success`), `Skeleton`, `EmptyState` (`compact`, `page`), `ErrorState` (`page`, `card`), `FormField*`, `Input` (`md`, `lg`; `allowClear`, `clearLabel`), `Textarea` (`allowClear`, `clearLabel`), `Button` (`loadingLabel`), `IconButton`, `InlineAlert`, `Avatar`, `Spinner`, `Icon`, `Separator`, `Sheet*`.

### Mở rộng `ui-web` (generic, không chứa copy nghiệp vụ, mỗi mục có test theo DS-07)

> **Cập nhật theo yêu cầu người dùng (2026-10):** `SheetControls` và các nút "Thu gọn bảng", "Mở rộng bảng", "Đóng bảng" đã bị gỡ khỏi `Sheet` (cùng `stepSnapPoint`). Người dùng đổi giữa ba mức thấp (peek) / vừa (medium) / mở rộng (expanded) bằng cách vuốt, hoặc giữ và kéo thanh kéo (`SheetHandle`) lên/xuống; đóng sheet bằng vuốt xuống, Esc, hoặc nút "Hủy" của form. Không thêm nút thay thế cho việc đổi mức snap (người dùng đã xác nhận). Đánh đổi a11y đã biết: người dùng chỉ dùng bàn phím không còn cách đổi mức snap (chỉ Esc đóng được khi `dismissible`).

> **Nút X đóng của Sheet bottom (2026-10, yêu cầu người dùng; mở rộng cho non-modal ở lượt sau):** khác với các nút đổi mức đã gỡ, mọi `Sheet` **bottom đóng được (`dismissible`), modal lẫn non-modal** có nút icon `X` (lucide, size `sm`) ở góc trên phải popup, `aria-label` "Đóng", vùng chạm `min-h-touch min-w-touch` (44px), đặt cùng dải cao với `SheetHandle` nên không che tay cầm giữa và không đè tiêu đề (tiêu đề nằm dưới dải này). Nút chỉ đóng sheet qua `onOpenChange(false)` (cùng đường với vuốt hết xuống và Esc), **không đổi mức snap**; focus trả về phần tử đã mở. Có `data-base-ui-swipe-ignore` để chạm vào nút không bắt đầu cử chỉ vuốt. `SheetContent` prop `closeDisabled` vô hiệu nút (form dùng khi `locked`, đang gửi). Sheet timeline của editor (non-modal) cũng có X: bấm X thì sheet đóng, chip "Lịch trình" ở đáy hiện ra để mở lại (viewport non-modal là `pointer-events-none` nhưng popup và X là `pointer-events-auto`). **X cuộn cùng nội dung (2026-10, người dùng xác nhận phương án A, sửa lỗi X bị ghim cứng khi cuộn dọc):** X không `fixed`/`sticky` mà nằm trong luồng nội dung cuộn của popup, ở hàng đầu tiên cao 0 (`relative h-0`, X `absolute right-0 top-0` so với hàng này), trước `SheetHandle`; ở mức expanded (popup `overflow-y-auto`) cuộn nội dung thì X trôi lên và biến mất cùng nội dung, ở mức peek/medium (popup `overflow-y-hidden`) X luôn thấy ở góc trên phải. Vì X không còn dính mép, hàng sticky của `DayTabs` không cần chừa chỗ cho X (đã bỏ `pr-touch`); lúc nghỉ X nằm trong dải tay cầm, phía trên hàng tab. Sheet `dismissible={false}` và sheet cạnh trái/phải không có nút. `Dialog` từ `md` không có X tự động: đóng bằng Esc hoặc nút "Hủy" của form (giữ nguyên). Vùng cuộn nội dung của Sheet chỉ bật ở mức mở rộng (expanded); ở mức thấp/vừa nội dung không cuộn, vuốt hoặc giữ-kéo thanh kéo để đổi mức (sửa lỗi vuốt không đổi mức khi form cao hơn vùng hiển thị).

| Component | Vị trí | Contract |
|-----------|--------|----------|
| `notify.undoable` | `molecules/toast.tsx` | Chữ ký `notify.undoable(title, { actionLabel, onAction, onDismiss }): ToastId`. Toast variant `info` (`role="status"`, `aria-live="polite"`), có nút action và nút đóng sẵn có. **Không tự hết hạn** (Sonner `duration: Infinity`): app sở hữu đồng hồ 5 giây và gọi `notify.dismiss(id)` khi commit/flush/hoàn tác (D-31). `onAction` gọi đúng một lần rồi đóng toast. `onDismiss` gọi khi người dùng bấm nút đóng hoặc vuốt bỏ, và khi `notify.dismiss(id)`. Các `notify.*` hiện có giữ nguyên (không mở `duration`). Test: còn hiện sau 10 giây với fake timers; action gọi một lần, bàn phím Tab tới được và Enter kích hoạt; nút đóng gọi `onDismiss`; `dismiss(id)` đóng toast |
| `InlineAlert` prop `variant?: "danger" \| "info"` | `molecules/inline-alert.tsx` | Mặc định `danger` (giữ nguyên hành vi, `role="alert"`). `info`: `border-border bg-surface-muted text-text`, icon `Info` 20px `text-muted`, `role="status"`. Dùng cho "Đã khôi phục nội dung chưa lưu" (D-36). Test: role theo variant |
| `Sheet` prop `dismissible?: boolean` (mặc định `true`) | `molecules/sheet.tsx` | `false`: vuốt xuống ở mức peek dừng tại peek (không đóng), Esc không đóng. Timeline không dùng `false` nữa: nó đóng được và có chip mở lại (xem mục Bố cục mobile) |
| `Sheet` prop `defaultSnap?: "peek" \| "medium" \| "expanded"` (mặc định `medium`) | `molecules/sheet.tsx` | Mức mở ban đầu. Form waypoint/metadata dùng `expanded` (D-18), timeline dùng `medium` (D-15) |
| `Sheet` prop `insetTop?: number` (px, mặc định 0) | `molecules/sheet.tsx` + `sheet-snap.ts` | `resolveSnapPoints(viewportHeight, insetTop)`: mức `expanded` = `min(0.92 × vh, vh − insetTop)` quy ra px; peek/medium giữ nguyên nếu nhỏ hơn mức expanded. Editor truyền chiều cao header đo được để sheet không bao giờ che header (D-16). Test bảng giá trị trong `sheet-snap.test.ts` |

**Bổ sung 2026-10-30** (generic, không chứa copy nghiệp vụ, tương thích ngược: chỉ thêm prop tùy chọn có mặc định giữ hành vi cũ; mỗi mục có test theo DS-07):

| Component | Vị trí | Contract |
|-----------|--------|----------|
| `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionPanel` | `molecules/accordion.tsx` (mới, Base UI `accordion`) | `Accordion` bọc `Accordion.Root`, truyền tiếp mọi prop (`value`, `onValueChange`, `multiple` mặc định `false`, `disabled`, `keepMounted`). Khung: `rounded-container border border-border divide-y divide-border bg-surface`. `AccordionTrigger` bọc `Accordion.Header` (h3) + `Accordion.Trigger`, props thêm `title: ReactNode`, `summary?: ReactNode`, `invalid?: boolean` (mặc định `false`). Trigger: `button` full width, `min-h-touch px-stack-md py-stack-sm`, `flex items-center gap-inline-sm text-left`, hover `bg-surface-muted`, focus ring chuẩn. Bên trái là cột `min-w-0 flex-1`: dòng 1 `title` (Body semibold), dòng 2 `summary` (Label regular `text-muted`, `line-clamp-1`). Dòng 2 chỉ hiện khi khối đóng, ẩn bằng CSS theo `data-panel-open` của trigger (`group-data-panel-open:hidden`), không dùng điều kiện JSX. `invalid`: dòng 2 đổi `text-danger`, hiện icon `CircleAlert` 16px `text-danger` (decorative) trước chevron, cả khi khối đóng lẫn mở. Bên phải: icon `ChevronDown` 16px `text-muted`, xoay 180° khi mở (`group-data-panel-open:rotate-180`, `transition-transform duration-(--semantic-motion-duration-normal) ease-standard`). `AccordionPanel`: `overflow-hidden h-(--accordion-panel-height) data-starting-style:h-0 data-ending-style:h-0 transition-[height] duration-(--semantic-motion-duration-normal) ease-standard`, nội dung bọc trong `px-stack-md pb-stack-md pt-inline-xs`. Reduced motion: token motion về 0ms nên không có hoạt ảnh. Test: chỉ một khối mở khi `multiple={false}`; bấm khối đang mở thì đóng; `aria-expanded`/`aria-controls`; dòng tóm tắt ẩn khi mở; `invalid` đổi màu + có icon; Enter/Space bật tắt; panel đóng không nằm trong thứ tự Tab |
| `ToggleChipGroup`, `ToggleChip` | `molecules/toggle-chip.tsx` (mới, Base UI `toggle-group` + `toggle`) | Nhóm chọn nhiều: `ToggleChipGroup` bọc `ToggleGroup` với `multiple` mặc định `true`, `loopFocus` mặc định `true`, bắt buộc `aria-label` hoặc `aria-labelledby`, bố cục `flex flex-wrap gap-inline-sm`. `ToggleChip` bọc `Toggle` (`aria-pressed`): `inline-flex min-h-touch items-center gap-inline-xs rounded-pill border px-stack-md text-label font-semibold`; tắt `border-border bg-surface text-text hover:bg-surface-muted`; bật (`data-pressed`) `border-primary-border bg-primary-subtle text-text` và hiện icon `Check` 16px `text-primary` ở đầu chip (icon luôn render, ẩn bằng CSS `hidden group-data-pressed:inline-flex`, nên trạng thái không chỉ truyền bằng màu); disabled theo mẫu `data-disabled` của `Button`. Bàn phím theo Base UI: Tab vào nhóm (một điểm dừng), ←/→ (và ↑/↓) di chuyển, Home/End, Space/Enter bật tắt. Test: `aria-pressed`, roving focus, icon ẩn hiện theo `data-pressed`, nhiều chip bật cùng lúc |
| `NumberStepper` | `molecules/number-stepper.tsx` (mới, Base UI `number-field`) | Props: `value`, `onValueChange`, `min`, `max`, `step` (mặc định 1), `decrementLabel` (mặc định "Giảm"), `incrementLabel` (mặc định "Tăng"), `suffix?: ReactNode`, `invalid?: boolean`, `readOnly?`, `id?`, `inputRef?`, `aria-describedby?`. Bố cục `inline-flex items-center gap-inline-sm`: `NumberField.Decrement` (icon `Minus`) · `NumberField.Input` · `NumberField.Increment` (icon `Plus`) · `suffix` (Body `text-muted`, `aria-hidden`). Nút −/+: style `IconButton secondary`, kích thước `size-control-lg` (48px, vượt 44px tối thiểu, D-73), `aria-label` theo prop; tự `data-disabled` ở biên `min`/`max` (Base UI). Ô số: `h-control-lg w-page-block rounded-control border border-border bg-input text-center text-body tabular-nums`, `inputMode="numeric"`, `aria-invalid` theo `invalid`. `allowWheelScrub={false}`, không có scrub area. Gõ số ngoài khoảng: Base UI 1.8.0 kẹp về `min`/`max` (`allowOutOfRange=false`). Để trống rồi blur: Base UI trả `null`, nên `NumberStepper` tự giữ `lastValid` và hiện lại giá trị trước, không đẩy `null` ra ngoài (D-109). Bàn phím: ↑/↓ ±1, Shift+↑/↓ ±10 (`largeStep`), Home/End về `min`/`max`; Base UI 1.8.0 không xử lý PageUp/PageDown. Ô số mang `aria-roledescription` tiếng Anh cứng `Number field`; `NumberStepper` ghi đè bằng tiếng Việt (mặc định `ô số`). Để giữ ≤ 7 prop, các prop hiển thị phụ gom vào `labels` (`decrement`, `increment`, `suffix`, `roleDescription`). Test: kẹp biên, blur trống khôi phục, nút disabled ở biên, phím mũi tên, nhãn nút, `aria-invalid`, `aria-roledescription` |
| `RadioGroup`, `Radio` | `molecules/radio-group.tsx` (mới, Base UI `radio-group` + `radio`) | Primitive không áp hình dạng: `RadioGroup` truyền tiếp `value`, `onValueChange`, `aria-labelledby`, `aria-describedby`, `aria-invalid`, `className`. `Radio` (`role="radio"`) chỉ thêm focus ring chuẩn, `cursor-pointer`, `data-disabled:cursor-not-allowed`; caller tự tạo hình dạng (dòng điểm đến, ô ảnh) qua `className` và selector `data-checked`. Bàn phím theo APG: Tab vào nhóm dừng ở mục đang chọn (chưa chọn thì mục đầu), ↑/↓/←/→ di chuyển **và chọn**, Space chọn. Base UI 1.8.0: `onClick` của `Radio` chỉ chạy khi bấm/Space, không chạy khi đổi bằng phím mũi tên; `Enter` bị chặn mặc định. Dùng để tự chuyển khối chỉ khi bấm/Space/Enter (D-64). Test: một điểm dừng Tab, mũi tên đổi lựa chọn, `aria-checked`, `onClick` không chạy khi đổi bằng mũi tên |
| `InlineAlert` prop `action?: ReactNode` | `molecules/inline-alert.tsx` | Mặc định không có (giữ nguyên hành vi). Có `action` thì render sau nội dung, căn phải trên cùng hàng từ `sm` (`ml-auto shrink-0`), xuống dòng dưới nội dung khi hẹp. Từng dùng cho "Thử lại" của lỗi tự lưu (D-90); từ 2026-11 lỗi đó là toast (`notify.*` nhận thêm option `persistent?: boolean`, mặc định `false`: không tự hết hạn), prop `action` giữ lại cho nơi khác. Test: render action, role theo variant không đổi |
| `DialogContent` prop `showCloseButton?: boolean` (mặc định `false`), `closeDisabled?: boolean` | `molecules/dialog.tsx` | `true`: nút icon `X` (lucide, `sm`) `aria-label` "Đóng" ở góc trên phải popup (`absolute right-stack-md top-stack-md`), vùng chạm 44px, dùng `Dialog.Close` (cùng đường với Esc, focus trả về phần tử đã mở). `DialogTitle` khi có nút thì cần `pr-touch` để chữ dài không chạy dưới nút (caller thêm class). `closeDisabled` vô hiệu nút như `SheetContent`. Dùng cho "Thông tin chuyến đi" vì form không còn nút "Hủy" (D-91). Test: có/không có nút, đóng gọi `onOpenChange(false)`, disabled |
| (2026-11-05) `Sheet` prop `snap?: "peek" \| "medium" \| "expanded"` và `onSnapChange?(snap)` | `molecules/sheet.tsx` + `sheet-snap.ts` | Tùy chọn, mặc định không truyền (giữ hành vi `defaultSnap` hiện tại). Có `snap` thì mức là controlled: app đặt mức theo tên (D-125: bấm pin thì đưa sheet lên `medium`). `onSnapChange` báo mức sau mỗi lần vuốt/kéo, để bản đồ biết phần bị sheet che (§Bản đồ → Mobile). `resolveSnapPoints` được export để app quy mức ra px. Test: controlled đổi mức không qua cử chỉ; `onSnapChange` gọi đúng tên mức; không truyền thì hành vi cũ không đổi |
| `Sheet` prop `fixedSnap?: boolean` (mặc định `false`) | `molecules/sheet.tsx` + `sheet-snap.ts` | `true`: sheet bottom chỉ có một mức là `defaultSnap`; vuốt xuống là đóng (khi `dismissible`), không dừng ở mức thấp hơn. Lý do: form tạo có chân form dính đáy phải luôn thấy (D-66); ở mức peek/medium phần đáy popup nằm ngoài màn hình. Test: `snapPoints` chỉ có một phần tử; vuốt xuống gọi `onOpenChange(false)`. Bố cục chân form: `SheetContent fillSnap` cho phần nội dung `flex-1`, `<form>` `flex-1 flex-col`, `StickyFormFooter` dùng `mt-auto` và `-bottom/-mb` bằng padding đáy (stack-lg + safe-area) nên chân form luôn sát đáy popup, kể cả khi nội dung ngắn |

### Organism dùng chung (`apps/web/src/components/`)

| Component | Thay đổi |
|-----------|----------|
| `UserMenu` | Thêm prop `compact?: boolean`: chỉ hiện `Avatar sm` ở mọi breakpoint (ẩn tên và chevron). Chỉ header rút gọn của editor (tải/lỗi/403) dùng `compact`; header editor đầy đủ không có UserMenu. `aria-label` trigger giữ nguyên |
| `SubmitStatus` | Chuyển từ `modules/identity/ui` sang `apps/web/src/components/submit-status.tsx` (cùng API, cùng `COLD_START_MESSAGE`), identity import lại từ đây. Itinerary dùng chung |

### Organism nghiệp vụ mới (`apps/web/src/modules/itinerary/ui/`)

| Component | Contract tóm tắt |
|-----------|------------------|
| `MyItinerariesView` | Tiêu đề trang, nút tạo, Tabs lọc theo URL, lưới, infinite scroll |
| `ItineraryCard` | Thẻ lưới: ảnh bìa, badge, tiêu đề, meta, menu ⋯ |
| `CreateItineraryDialog` | (2026-10-30) Container của form tạo 4 khối: giữ tên export và props `open`, `onOpenChange` để `MyItinerariesView` không đổi. Chỉ nối `ResponsiveFormSurface`, form state, mutation, điều hướng; mỗi khối là component trình bày riêng (dưới) |
| `DestinationBlock` / `DestinationOption` | (mới) Ô tìm + nhóm "Phổ biến"/"Tất cả"/"Kết quả tìm kiếm" + empty state; một dòng điểm đến (D-59..D-61, D-92) |
| `TripNameBlock` | (mới) Ô "Tên chuyến đi" theo tên mặc định (D-68, D-93) |
| `TripDatesBlock` | (mới) Ngày khởi hành + bộ đếm số ngày (D-73..D-75) |
| `InterestsBlock` | (mới) Nhóm chip sở thích (D-70, D-71, D-94) |
| `StickyFormFooter` | (mới) Chân form dính đáy: "Hủy" + nút gửi + `SubmitStatus` (D-66, D-12) |
| `CoverImageField` / `CoverTile` / `CoverUrlPanel` | (mới) Lưới 5 ô chọn ảnh hiển thị, một ô ảnh, khung "Link ảnh" dưới lưới (D-82..D-86) |
| `CoverImage` (đã có) | (2026-10-30) Thêm chuỗi dự phòng: ảnh đang hiển thị → ảnh mặc định của điểm đến → nền `surface-muted` + icon (xem §ItineraryCard) |
| `DeleteItineraryDialog` | Xác nhận xóa, dùng chung cho thẻ và editor (D-42) |
| `EditorLayout` | Khung editor có 4 slot: `header`, `timeline`, `canvas`, `summary`. Desktop đặt `summary` trong `canvas` ở Phase 4; mobile đặt `summary` trên nền phía sau sheet. Phase 5 thay `canvas` bằng bản đồ và chuyển `summary` lên đầu cột trái mà không đổi các slot khác (D-13, D-14). **[Cập nhật 2026-11-05]** Việc "thay canvas bằng bản đồ" làm ngay ở Phase 4 (D-118, D-119): `canvas` (desktop) và nền mobile cùng nhận container `EditorMapArea`; slot `summary` được phép đổi tên thành `backdrop`. Canvas desktop bỏ `p-section` và không cuộn; nền mobile là bản đồ cố định, không cuộn. Tóm tắt chuyến đi chuyển vào tab Tổng quan của `timeline` (D-133). `EditorLayout` báo mức sheet hiện tại (hoặc "đã đóng") cho bản đồ |
| `EditorMapArea` / `TripMap` / `MapPinMarker` / `MapPinLabel` / `MapZoomControls` / `MapAttribution` / `MapStatusOverlay` | (mới 2026-11-05) Xem §Bản đồ trong editor và tab Tổng quan |
| `OverviewPanel` / `OverviewSummary` / `DayOverviewRow` | (mới 2026-11-05) Nội dung tab Tổng quan: thông tin chung, dòng tóm tắt từng ngày, nút "Thêm điểm đến" (D-133..D-138) |
| `EditorHeader` | Back, tiêu đề + icon "i" (Thông tin chuyến đi), chỉ báo lưu, Xuất bản, nút xóa. Không có menu ⋯ và `UserMenu` |
| `SaveIndicator` | 4 trạng thái (D-30) |
| `TripSummary` | Ảnh bìa lớn + tiêu đề + badge + ngày khởi hành + tổng km + mô tả + nút "Sửa thông tin". **[Cập nhật 2026-11-05]** Chỉ còn là phần dự phòng khi bản đồ không tải được (D-120): biến thể `canvas` trên desktop, `compact` trên nền mobile, không đổi giao diện. Tab Tổng quan dùng `OverviewSummary` (mới), không dùng `TripSummary` |
| `TripInfoDialog` | Form metadata tự lưu, không có chân form (Dialog từ `md` có nút X, Sheet modal dưới `md`) (D-87..D-91) |
| `ResponsiveFormSurface` (đã có) | (2026-10-30) Thêm prop tùy chọn `closeButton?: boolean` (mặc định `false`, chuyển thành `showCloseButton` của `DialogContent`, `closeDisabled` theo `locked`) và `fixedSnap?: boolean` (mặc định `false`, chuyển cho `Sheet`). Form tạo dùng `fixedSnap`; "Thông tin chuyến đi" dùng `closeButton`. Form waypoint giữ nguyên |
| `DayTabs` | Dải tab Ngày 1..max + "+ Thêm ngày". **[Cập nhật 2026-11-05]** Thêm tab "Tổng quan" đứng đầu và chấm màu ngày (§DayTabs) |
| `DaySubtitle` | Phụ đề inline (D-29) |
| `WaypointList` / `SortableWaypointItem` | Danh sách sắp xếp được, tay cầm riêng |
| `WaypointFormDialog` | Form thêm/sửa dùng chung (Dialog từ `md`, Sheet modal `expanded` dưới `md`). **[Cập nhật 2026-11-05]** Form thêm mở từ Tổng quan có thêm ô "Ngày" (D-138); form sửa không đổi |
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
- **Chuỗi ảnh dự phòng (2026-10-30, D-79, D-86), dùng chung cho thẻ, canvas, nền mobile và `TripSummary`:** (1) `coverImageUrl` = ảnh đang hiển thị; (2) không có hoặc tải lỗi → ảnh mặc định của điểm đến (URL https tự lưu trữ trong danh mục điểm đến, tra theo mã điểm đến của lịch trình); (3) lịch trình không có điểm đến (dữ liệu cũ), DTO chưa có mã điểm đến, hoặc ảnh mặc định cũng lỗi → nền `surface-muted` + icon như trên. Ảnh mặc định ở bước (2) chỉ để hiển thị, không ghi vào danh sách ảnh bìa (D-86). Thẻ không hiện tên điểm đến (D-78). Nếu `ItinerarySummaryDto` chưa mang mã điểm đến thì thẻ dừng ở bước (1)/(3); ghi vào checklist hợp đồng BE.
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

## Form tạo lịch trình (ITIN-02; D-62..D-75, D-92..D-97, giữ D-10..D-12)

> Thay "Dialog tạo nhanh" (D-09 lệch 2026-10-30). Bản cũ (một ô "Tiêu đề" điền sẵn và bôi đen, `Dialog size="sm"`, Enter gửi) không còn dùng. Vị trí nút mở (D-10), cách gửi (D-12) và điều hướng sau khi tạo (D-11) giữ nguyên.

### Bề mặt (D-67)

- Mở từ nút "Tạo lịch trình" đầu trang hoặc CTA EmptyState của tab Tất cả. Đóng xong thì focus về nút đã mở (Base UI tự trả).
- `ResponsiveFormSurface` với `fixedSnap`: từ `md` là `DialogContent size="md"` (560px, cuộn dọc trong popup); dưới `md` là `Sheet modal defaultSnap="expanded" fixedSnap`, có tay cầm và nút X "Đóng" sẵn có ở góc trên phải. Dialog không có nút X (đã có "Hủy" ở chân form). Bấm scrim không đóng (như mọi form).
- Tiêu đề `DialogTitle`/`SheetTitle` "Lịch trình mới" (Heading). Ngay dưới là `InlineAlert` (lỗi không gắn field). Form `noValidate`, `aria-labelledby` trỏ tiêu đề.
- Cách đóng: "Hủy", Esc, X và vuốt xuống (Sheet). **Không hỏi xác nhận**, bỏ toàn bộ dữ liệu (D-95). Đóng xong hẳn (`onOpenChangeComplete(false)`) thì reset form, nên mở lại là form mới với khối Điểm đến mở sẵn.
- Đang gửi (`locked`): không đóng được bằng bất kỳ cách nào (X bị vô hiệu), `Accordion disabled`, mọi ô `readOnly`, chip và lựa chọn điểm đến `disabled`, "Hủy" disabled.

```text
Dialog từ md / Sheet dưới md (fixedSnap expanded)
  [tay cầm + X Đóng]                                   (chỉ Sheet)
  "Lịch trình mới"                                     Heading
  InlineAlert lỗi chung                                (không có lỗi thì không render)
  form
    Accordion (khung rounded-container, các khối ngăn bằng divide-y)
      ▸ Điểm đến        dòng tóm tắt        [!] [⌄]
      ▸ Tên chuyến đi   dòng tóm tắt        [!] [⌄]
      ▸ Thời gian       dòng tóm tắt        [!] [⌄]
      ▸ Sở thích        dòng tóm tắt        [!] [⌄]   ([!] chỉ khi BE trả lỗi sở thích)
    StickyFormFooter (sticky bottom-0, luôn thấy)
      [Hủy] [Tạo lịch trình]
      SubmitStatus (dòng cold start)
```

### Accordion (D-62..D-65, D-72)

- `Accordion` với `multiple={false}`, controlled `value` (mảng 0 hoặc 1 phần tử trong `destination | name | dates | interests`), `keepMounted` để giá trị và ref của React Hook Form còn nguyên khi khối đóng (panel đóng có `hidden`, không nằm trong thứ tự Tab). Khi mở modal: `["destination"]` (D-65).
- Mở được khối bất kỳ theo thứ tự nào. Bấm trigger của khối đang mở thì đóng nó (cho phép không khối nào mở). Mở khối khác thì khối đang mở tự đóng.
- Thứ tự cố định: Điểm đến → Tên chuyến đi → Thời gian → Sở thích (D-72).
- Mỗi trigger dùng `AccordionTrigger` với `title`, `summary`, `invalid`:

| Khối | `title` | `summary` khi có giá trị | `summary` khi trống | Tự chuyển khối kế (D-64, D-68) |
|------|---------|--------------------------|---------------------|------------------------------|
| Điểm đến | "Điểm đến" | Tên điểm đến, ví dụ "Đà Nẵng" | "Chưa chọn" | **Có**: chọn xong thì đóng khối và mở "Tên chuyến đi" |
| Tên chuyến đi | "Tên chuyến đi" | Giá trị đã trim, ví dụ "Chuyến đi Đà Nẵng" | "Chưa đặt tên" | Không |
| Thời gian | "Thời gian" | "{N} ngày" hoặc "{N} ngày, từ {dd/MM/yyyy}" | (luôn có số ngày) | Không |
| Sở thích | "Sở thích" | Nhãn đã bật theo thứ tự danh sách, nối bằng ", ", ví dụ "Thiên nhiên, Mua sắm" (cắt một dòng, tên truy cập đọc đủ) | "Chưa chọn" | Không |

- Dòng tóm tắt hiện khi khối đóng (D-63). Hai dòng (tiêu đề / tóm tắt) thay cho dạng một dòng "Điểm đến · Đà Nẵng" của ví dụ D-63, để không bị cắt ở 320px; nội dung giống nhau.
- **Dấu báo lỗi** (`invalid`): bật khi khối có lỗi trong form state, tức là sau lần bấm "Tạo lịch trình" đầu tiên, sau khi ô trong khối bị blur với giá trị sai (`mode: "onTouched"`), hoặc khi BE trả lỗi field thuộc khối đó. Mở modal lần đầu không có dấu lỗi nào, kể cả khi chưa chọn điểm đến. Khi `invalid`, dòng tóm tắt hiện **thông điệp lỗi** thay cho giá trị (ví dụ "Vui lòng chọn điểm đến."), màu `text-danger`, kèm icon `CircleAlert`. Sửa đúng thì dấu lỗi tắt ngay.
- **Khi tự chuyển** từ Điểm đến sang Tên chuyến đi: focus chuyển tới **trigger** của khối "Tên chuyến đi" (không vào ô nhập, để bàn phím ảo không bật lên trên mobile); cuộn vùng cuộn của modal để trigger đó nằm trong khung (`scrollIntoView({ block: "nearest" })`, `behavior` theo reduced motion). Phần tử đang focus ở danh sách điểm đến bị ẩn, nên không được để focus rơi về `body`.
- Hoạt ảnh mở/đóng: chiều cao panel và chevron theo `duration-normal`; `prefers-reduced-motion` thì 0ms (token đã về 0).

### Khối Điểm đến (D-59..D-61, D-92)

```text
SearchInput "Tìm điểm đến"                      (size lg)
FormFieldError "Vui lòng chọn điểm đến."         (khi có lỗi)
[không tìm]  "Phổ biến"  radiogroup  8 dòng theo hạng D-61
             "Tất cả"    radiogroup  34 dòng theo chữ cái (gồm cả 8 mục phổ biến)
[đang tìm]   "Kết quả tìm kiếm"  radiogroup  các dòng khớp
             hoặc EmptyState compact khi không có kết quả
p.sr-only role="status": "{n} kết quả" / "Không có kết quả"   (chỉ khi đang tìm)
```

- Danh mục: 34 đơn vị cấp tỉnh theo Nghị quyết 202/2025/QH15, đọc qua port danh mục điểm đến (không hard-code trong component). Tên hiển thị là tên ngắn đã xác minh, không có tiền tố "Tỉnh"/"Thành phố", trừ "TP. Hồ Chí Minh" (cách viết của D-61). Danh sách, tên và alias phải được researcher/planner đối chiếu văn bản gốc trước khi code (D-92, D-59); spec không liệt kê lại để tránh sai.
- `SearchInput` (`label` "Tìm điểm đến", placeholder "Tìm tỉnh, thành phố, ví dụ Đà Lạt", `size="lg"`, nút "Xóa tìm kiếm" sẵn có). Lọc tại chỗ khi gõ, không debounce, không gọi mạng. So khớp không dấu: `normalize("NFD")`, bỏ dấu kết hợp, `đ → d`, chữ thường, trim, gộp khoảng trắng (D-60). Khớp trên tên và alias. Logic tìm và sắp xếp là hàm thuần ở domain `itinerary`.
- Thứ tự kết quả: tên bắt đầu bằng từ khóa → tên chứa từ khóa → khớp alias; trong cùng mức theo hạng D-61, rồi theo chữ cái.
- Esc trong ô tìm khi có chữ: chỉ xóa chữ (hành vi sẵn có của `SearchInput`), không đóng modal; planner kiểm Base UI Dialog/Drawer không nhận Esc này (chặn lan truyền nếu cần). Esc khi ô trống: đóng modal như thường.
- Enter trong ô tìm: có ít nhất một kết quả thì chọn kết quả đầu tiên và tự chuyển như khi bấm; không có kết quả thì không làm gì. Enter không bao giờ gửi form.
- Nhóm: nhãn nhóm là `p` có `id` (Label semibold `text-muted`, `px-inline-sm pt-stack-sm pb-inline-xs`). Mỗi nhóm là một `RadioGroup` riêng có `aria-labelledby` trỏ nhãn, `aria-describedby` trỏ lỗi, `aria-invalid` khi có lỗi. Các nhóm cùng gắn vào **một** giá trị điểm đến, nên mục phổ biến đang chọn hiện đã chọn ở cả "Phổ biến" lẫn "Tất cả". Mỗi nhóm là một điểm dừng Tab; trong nhóm không có mục trùng.
- `DestinationOption` (`Radio`, `value` = slug): `flex min-h-touch w-full items-center gap-inline-sm rounded-control border border-transparent px-inline-sm py-inline-xs text-left`, hover `bg-surface-muted`.

```text
[ cột min-w-0 flex-1                                     ] [Check 16px text-primary]
  tên điểm đến      Body; đang chọn: semibold
  "gồm Đà Lạt"     Label regular text-muted (chỉ khi dòng khớp qua alias)
```

  - Đang chọn (`data-checked`): `border-primary-border bg-primary-subtle`, tên semibold, icon `Check` hiện (icon luôn render, ẩn bằng CSS `invisible group-data-checked:visible`), nên trạng thái không chỉ bằng màu.
  - Dòng alias: component `AliasLine` nhận `alias: string | null` và `visible`; chỉ hiện trong kết quả tìm khi mục khớp qua alias, nội dung "gồm {alias đã khớp}" (D-59). Tên truy cập của dòng: "Lâm Đồng, gồm Đà Lạt".
- **Chọn và tự chuyển (D-64):** bấm/chạm một dòng hoặc nhấn Space trên dòng đang focus thì chọn, đóng khối và mở "Tên chuyến đi". Bấm lại đúng dòng đang chọn cũng đóng và chuyển (người dùng mở lại khối chỉ để xem). **Đổi lựa chọn bằng phím mũi tên** (radio APG chọn theo focus) **không tự chuyển**, để người dùng bàn phím đi qua danh sách được; khi đó Enter (hoặc Space) trên dòng đang chọn thì chuyển. Planner phân biệt nguồn thay đổi qua `eventDetails` của `onValueChange` hoặc bắt sự kiện click/keydown trên dòng.
- Trống kết quả: `EmptyState variant="compact"` icon `SearchX`, heading "Không tìm thấy "{từ khóa}"", body "Thử tên tỉnh, thành phố mới hoặc tên cũ, ví dụ Đà Lạt.". Không có nút. Giá trị đang chọn (nếu có) vẫn giữ.
- Đổi điểm đến khi tên chưa bị sửa: ô Tên đổi theo (D-93), không bật lỗi.

### Khối Tên chuyến đi (D-68, D-93)

- `FormFieldRow` nhãn "Tên chuyến đi" (`required`), mô tả "Tên tự đổi theo điểm đến cho tới khi bạn sửa.", `Input size="lg"` `autoComplete="off"`.
- Giá trị mặc định: "Chuyến đi {Tên điểm đến}"; chưa chọn điểm đến thì "Chuyến đi mới". Cờ "đã tự sửa" bật khi người dùng gõ ra giá trị khác giá trị mặc định đang có. Xóa trắng rồi blur: điền lại mặc định theo điểm đến hiện tại, tắt cờ, không báo lỗi. Hàm tính tên mặc định và cờ là hàm thuần ở domain (D-93).
- Enter trong ô: `preventDefault`, không gửi form, không chuyển khối (D-68).
- Validate: trim, 1–100 ký tự (validator BE). Lỗi dưới ô theo bảng Lỗi validate.

### Khối Thời gian (D-73..D-75)

Hai ô xếp dọc, cách 16px:

| Ô | Control | Bắt buộc | Ghi chú |
|---|---------|----------|---------|
| Ngày khởi hành | `Input size="lg" type="date"` (icon lịch bên trái, `allowClear` mặc định của `type="date"`, `clearLabel="Xóa Ngày khởi hành"`) | Không | Mô tả "Không bắt buộc." Không chặn ngày quá khứ (D-75). Giá trị qua `CalendarDate`; trống gửi `null`. Không hiện ngày kết thúc (D-74) |
| Số ngày | `NumberStepper` `min={1} max={30}`, mặc định 3, `decrementLabel="Giảm số ngày"`, `incrementLabel="Tăng số ngày"`, `suffix` "ngày" | Có (luôn có giá trị) | Nhãn "Số ngày" gắn với ô số qua `FormFieldRow`; mô tả "Từ 1 đến 30 ngày." Nút −/+ 48px (D-73) |

- Enter trong cả hai ô không gửi form.
- Dòng tóm tắt cập nhật theo giá trị (bảng Accordion).

### Khối Sở thích (D-70, D-71, D-94)

- Mô tả (Label regular `text-muted`, `id` dùng cho `aria-describedby` của nhóm): "Chọn một hoặc nhiều. Không bắt buộc."
- `ToggleChipGroup` `aria-label` "Sở thích", 7 `ToggleChip` theo đúng thứ tự: "Lịch sử & Văn hóa", "Thiên nhiên", "Mua sắm", "Ẩm thực & Đồ uống", "Giải trí", "Sức khỏe", "Khác" (D-70). "Khác" chỉ là nhãn, không mở ô nhập. Giá trị là mã cố định (D-55), không hiện ra UI.
- Không có lỗi client (tùy chọn, không trùng vì là tập). Lỗi BE `Itinerary.InterestUnknown` hiện dưới nhóm.

### StickyFormFooter (D-66, D-12, D-96)

- Nằm trong `form`, phần tử cuối của vùng cuộn, `sticky bottom-0 z-sticky bg-surface-elevated border-t border-border pt-stack-md`, tràn hết chiều ngang popup (bù padding ngang của Dialog/Sheet bằng margin âm theo token `stack-lg`) và dính sát mép dưới. Trong Sheet cộng `env(safe-area-inset-bottom)` vào padding dưới (mẫu thanh dưới của timeline). Nội dung cuộn trôi dưới chân form, không bị che vĩnh viễn: vùng cuộn có đủ padding dưới để mục cuối cuộn lên được trên chân form.
- Hàng nút `flex justify-end gap-inline-sm`: "Hủy" (`Button secondary`, `type="button"`) rồi "Tạo lịch trình" (`Button primary type="submit"`, `loadingLabel` "Đang tạo…"). Dưới `sm` cả hai `flex-1` (Hủy trái, Tạo phải) để giữ chân form một hàng khi bàn phím ảo mở. `SubmitStatus` ngay dưới hàng nút (dòng cold start sau 5 giây, D-12).
- Nút gửi luôn bấm được (mẫu Phase 3), chặn gửi lần hai bằng ref như bản cũ.

### Gửi, lỗi và thành công (D-69, D-96, D-11)

1. Chỉ nút "Tạo lịch trình" gửi form. Enter trong mọi ô không gửi (chặn implicit submission ở cấp form, trừ khi phần tử gây submit là nút gửi).
2. Validate client toàn form. Có lỗi: bật dấu lỗi cho mọi khối lỗi, **mở khối lỗi đầu tiên** theo thứ tự khối, chờ panel bỏ `hidden` (frame kế) rồi focus đúng ô: Điểm đến → xóa từ khóa tìm (nếu có) rồi focus dòng đầu tiên của nhóm "Phổ biến"; Tên → ô Tên; Thời gian → ô lỗi đầu tiên trong khối; Sở thích → chip đầu tiên. Lỗi hiện dưới ô (D-69), cuộn ô vào khung.
3. Hợp lệ: gửi **một request** (D-96) gồm điểm đến, tên đã trim, ngày khởi hành hoặc `null`, số ngày, danh sách sở thích. Nút "Đang tạo…" + Spinner, `aria-busy`, khóa form (mục Bề mặt).
4. Lỗi field từ BE (`resolveFormError` theo `ERROR_MESSAGES`): gắn vào ô tương ứng và xử lý như bước 2. Mã → khối: `Itinerary.DestinationUnknown` → Điểm đến; lỗi tiêu đề → Tên chuyến đi; `Itinerary.DayCountOutOfRange`, lỗi ngày khởi hành → Thời gian; `Itinerary.InterestUnknown` → Sở thích. Mã cuối cùng theo tài liệu hợp đồng BE (D-57); đây là mã đề xuất.
5. Lỗi không gắn field (mạng, 5xx, timeout): `InlineAlert` đầu modal (`errorToast: false`), cuộn vùng cuộn lên đầu để thấy thông báo, focus ở lại nút "Tạo lịch trình", khối đang mở giữ nguyên.
6. Thành công (201 kèm chi tiết): đánh dấu vào editor từ danh sách (`markEnteredFromList`, như bản cũ), `router.push("/itineraries/{id}/edit")`, đóng modal, **không toast** (D-11). Editor mở ở Ngày 1 trong dải Ngày 1..N do BE tạo sẵn (D-56), ảnh bìa là ảnh mặc định của điểm đến (D-80). Cache danh sách bị invalidate.

### Thứ tự focus

[X Đóng (chỉ Sheet)] → trigger Điểm đến → (khi mở) ô tìm → nhóm "Phổ biến" (hoặc "Kết quả tìm kiếm") → nhóm "Tất cả" → trigger Tên chuyến đi → (khi mở) ô Tên → trigger Thời gian → (khi mở) ô Ngày khởi hành → nút xóa ngày → nút giảm → ô số ngày → nút tăng → trigger Sở thích → (khi mở) nhóm chip → "Hủy" → "Tạo lịch trình". Focus ban đầu: từ `md` là ô tìm điểm đến; dưới `md` là trigger "Điểm đến" (tránh bàn phím ảo che danh sách ngay khi mở).

### Tách component (coding-rules S, I)

`CreateItineraryDialog` là container (form state, mutation, điều hướng, quyết định khối mở). Mỗi khối là component trình bày nhận đúng trường nó cần (ví dụ `DestinationBlock` nhận `value`, `onSelect`, `error`, `disabled`, không nhận cả form). Ẩn/hiện phần tử (dòng alias, empty state, lỗi, nhóm theo chế độ tìm) đi qua prop `visible` hoặc CSS theo `data-*`, không dùng `? :`/`&&` chọn component trong JSX. Logic tìm, tên mặc định, kiểm số ngày, chọn khối lỗi đầu tiên là hàm thuần có test.

---

## Editor (`/itineraries/[id]/edit`) — ITIN-03..14

### Khung toàn màn (D-16)

- Không có AppHeader. Root `min-h-dvh` (desktop: `h-dvh` + cuộn theo vùng), nền `background`.
- Document title: "{tiêu đề} · Tripory"; đang tải hoặc lỗi: "Sửa lịch trình · Tripory".
- Heading: `h1` là tiêu đề trên header. Cột/sheet timeline có `h2.sr-only` "Lịch trình theo ngày". Vùng tóm tắt là `section aria-labelledby` trỏ `h2.sr-only` "Thông tin chuyến đi"; tiêu đề lớn trong tóm tắt là `p` (không lặp heading).

### EditorHeader

Sticky top, `z-(--z-sticky)`, `bg-surface border-b border-border`, `pt-[env(safe-area-inset-top)]`, padding ngang `px-page-inline sm:px-page-inline-md lg:px-page-inline-lg`.

**Ở mọi breakpoint, một hàng cao 64px** (không còn hàng 2). Gap 4px dưới `sm`, 8px từ `sm`:

```text
[← IconButton] [ khối tiêu đề + "i", flex-1 min-w-0: [khối chữ, min-w-0] [i IconButton, shrink-0] ] [ vùng phải, shrink-0: [SaveIndicator] [Xuất bản] [Xóa IconButton] ]
                 dòng 1: h1 Body semibold, truncate
dải giải thích (chỉ khi cần, dưới hàng, xem PublishButton)
```

- Vùng phải `shrink-0`: khối chữ của tiêu đề là phần duy nhất co và truncate, nên header không tràn ngang ở 320px; icon "i" `shrink-0` nên luôn nhìn thấy cạnh tiêu đề. Xuất bản vẫn ngoài mọi menu. Header không còn menu ⋯ và không còn `UserMenu` (chỉ header rút gọn của trạng thái tải/lỗi/403 còn `UserMenu compact`).
- **Icon trong header cỡ `sm`** (16px, `Icon size="sm"` / `Spinner size="sm"`): `ArrowLeft`, `Info`, `Trash2`, icon của SaveIndicator, `Globe` của Xuất bản. Nút vẫn có vùng chạm `min-h-touch min-w-touch` (44px).
- **Dưới `md` (<768px) thu gọn**: `SaveIndicator` chỉ còn icon, `Xuất bản` chỉ còn icon `Globe`; chữ của cả hai chuyển sang `sr-only` (tên truy cập vẫn là "Đang lưu…" / "Đã lưu" / "Lỗi – Thử lại" / "Xuất bản"). **Từ `md` (≥768px)** hiện đủ chữ như cũ. Ngưỡng `md` là ngưỡng sẵn có của dự án (Dialog↔Sheet), một breakpoint cho cả hai thành phần.
- Ước lượng (tính tay, chưa đo trên trình duyệt) ở 320px: padding 16×2, back 44, "i" 44, Xuất bản 44, xóa 44, chỉ báo lưu 16, gap 4 giữa các phần tử (2 gap ngoài + 1 gap tiêu đề–"i" + 2 gap trong vùng phải = 5 × 4): khối chữ tiêu đề còn khoảng 76px; khi chỉ báo ở trạng thái lỗi (nút 44px) còn khoảng 48px; khi đã xuất bản (không còn nút Xuất bản) còn khoảng 124px.
- **Lệch so với D-41 (theo yêu cầu user 2026-10-30):** dòng "Thay đổi hiển thị ngay với người xem" (`PublishedNote`) đã bị bỏ. Khối tiêu đề chỉ còn `h1` (`min-w-0`, `truncate`).

> **Lệch so với D-16 / PLAN cũ (đã được user chọn, Phương án C):** trước đây dưới `sm` header có hàng 2 chứa chỉ báo lưu và Xuất bản. Nay chỉ báo lưu và Xuất bản nằm ở vùng phải của hàng duy nhất, thu thành icon dưới `md`. D-16 ("chỉ báo trạng thái lưu, nút Xuất bản... nằm trên header") vẫn đúng; D-30 (3 trạng thái, `aria-live`) và D-38 (`aria-disabled` + giải thích) giữ nguyên hành vi, chỉ đổi cách hiển thị dưới `md`.

- Back: `IconButton ghost` icon `ArrowLeft`, `aria-label` "Về Lịch trình của tôi". Hành vi theo D-47; đi qua chặn rời trang D-35.
- "i": `IconButton ghost` icon `Info` cạnh phải tiêu đề, `aria-label` "Thông tin chuyến đi", mở dialog Thông tin chuyến đi; đóng dialog thì focus về nút này.
- Xóa: `IconButton ghost` + `text-danger`, icon `Trash2`, `aria-label` "Xóa lịch trình", nằm ở cuối vùng phải, mở `DeleteItineraryDialog`; đóng hộp thoại (Hủy) thì focus về nút này.
- Đã xuất bản: nút "Xuất bản" không render (D-40); không có nút "Chia sẻ".

### SaveIndicator (D-30)

Bọc trong `div aria-live="polite"`, luôn có trong DOM. Ưu tiên: còn mutation chạy → "Đang lưu"; else có thao tác nền lỗi chưa gửi lại thành công → "Lỗi"; else đã từng lưu thành công → "Đã lưu"; else trống.

| Trạng thái | Hiển thị |
|------------|----------|
| Trống (chưa có thao tác ghi nào từ lúc mở) | Không có chữ, không chiếm chỗ |
| Đang lưu | `Spinner sm` decorative + "Đang lưu…" `text-label text-muted` |
| Đã lưu | `Icon Check sm text-success` + "Đã lưu" `text-label text-muted` |
| Lỗi | `Button ghost size="sm"` `text-danger`, icon `CircleAlert`, nhãn "Lỗi – Thử lại". Bấm thì gửi lại đúng thao tác đã lỗi, chỉ báo về "Đang lưu…" |

- Dưới `md` chữ của cả ba trạng thái là `sr-only` (`sr-only md:not-sr-only`) và vẫn nằm trong vùng `aria-live`, chỉ còn icon trên màn hình. Nút "Lỗi – Thử lại" có `min-h-touch min-w-touch` (44px) để bấm được khi chỉ còn icon.

- Lỗi của form (thêm/sửa waypoint, metadata, tạo, xuất bản, xóa lịch trình) hiện trong form/dialog. Chỉ báo vẫn hiện "Đang lưu…" trong lúc gửi, nhưng không chuyển sang "Lỗi" khi các mutation đó lỗi; xong thì về trạng thái trước. Ngoại lệ (2026-10-30): lệnh tự lưu của "Thông tin chuyến đi" lỗi mà người dùng đóng form trước khi thử lại thành công thì chuyển thành lỗi thao tác nền ("Lỗi – Thử lại" + toast), xem §TripInfoDialog.
- Thao tác nền lỗi: chỉ báo "Lỗi – Thử lại" **và** toast error theo chính sách Phase 2 (`selectErrorMessage`).
- Lệnh xóa đang chờ 5 giây không tính là đang lưu; khi commit thì tính.

### PublishButton (D-38)

- `Button size="sm"` "Xuất bản" (hit area 44px sẵn có, thêm `min-w-touch`), luôn là `<button>` thật. Nằm ở vùng phải header ở mọi breakpoint. Variant chọn theo `useMediaQuery("(min-width: 768px)")`, cùng một cây component (không dựng lại nút, giữ focus):
  - Dưới `md`: variant `ghost`, **không khung/nền nhìn thấy**, chỉ còn icon `Globe` (size `sm`); chữ "Xuất bản" là `sr-only`, tên truy cập vẫn là "Xuất bản"; vùng chạm `min-h-touch min-w-touch` (≥ 44px) không viền/nền. Trạng thái nghiệp vụ chỉ thể hiện qua icon: cho phép = `text-primary` (hover/focus nền nhẹ `surface-muted` + focus ring); bị chặn = `text-disabled` + `cursor-not-allowed`, không nền khi hover; đã xuất bản = không render.
  - Từ `md`: variant `primary` hiện chữ, không icon.
  - SSR/hydrate: snapshot server là "dưới `md`" (theo `useMediaQuery` của repo), từ `md` tự đúng sau hydrate.
- `canPublish` false (0 waypoint, không tính waypoint đang chờ xóa): **`aria-disabled="true"`**, không dùng `disabled`; vẫn focus được; từ `md` style giống disabled (`bg-surface-muted text-disabled border-border`), dưới `md` chỉ icon `text-disabled`; bấm không mở hộp xác nhận. Nút có `aria-describedby` trỏ phần tử giải thích "Thêm ít nhất 1 điểm đến để xuất bản" (luôn có trong DOM).
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
       ảnh bìa aspect-(--itinerary-cover-ratio) rounded-container theo chuỗi dự phòng (§ItineraryCard):
         ảnh đang hiển thị → ảnh mặc định của điểm đến → nền surface-muted + Icon ImagePlus
         24px text-subtle + Button secondary sm "Thêm ảnh bìa" (chỉ ở bước cuối)
       hàng: Badge trạng thái · "Khởi hành 12/10/2026" · "Tổng quãng đường: 12,4 km" (Label regular text-muted)
       p Display tiêu đề (break-words)
       mô tả Body text-muted, whitespace-pre-line (không có thì không render)
       Button secondary sm icon Pencil "Sửa thông tin"
```

- Bấm vào vùng tóm tắt hoặc ảnh bìa (chuột/chạm) cũng mở `TripInfoDialog` (D-17); bàn phím dùng nút "Sửa thông tin" / "Thêm ảnh bìa" (vùng bấm không nhận focus, không có role giả).

> **[Cập nhật 2026-11-05, D-118]** Canvas không còn `TripSummary`. Canvas là `EditorMapArea` phủ kín vùng phải (`relative isolate h-full overflow-hidden`, không `p-section`, không cuộn). `TripSummary variant="canvas"` chỉ hiện lại khi bản đồ lỗi (D-120). Cột trái giữ nguyên cấu trúc trên; ở tab Tổng quan, phần dưới `DayTabs` là `OverviewPanel` thay cho DaySubtitle + WaypointList. Sơ đồ đầy đủ ở §Bản đồ trong editor và tab Tổng quan → Bố cục.

### Bố cục mobile/tablet (dưới `lg`, D-14, D-15)

- Nền (sau sheet, cuộn được, tương tác được): `TripSummary` dạng gọn: ảnh bìa full-width `aspect-(--itinerary-cover-ratio)`, rồi khối `p-stack-md` gồm hàng badge/meta, tiêu đề Heading, mô tả `line-clamp-3`, nút "Sửa thông tin". Padding dưới bằng chiều cao mức peek để nội dung cuối không bị sheet che.
- Timeline: `Sheet modal={false} defaultSnap="medium" insetTop={chiều cao header}` + `SheetContent fillSnap` (popup cao cố định bằng mức expanded, nếu không Base UI gộp mất mức vừa khi nội dung ngắn). Có đủ ba mức peek/vừa/mở rộng; vuốt xuống hết từ peek hoặc bấm nút X "Đóng" ở góc trên phải thì đóng (cùng `onOpenChange(false)`, state `open` ở `EditorLayout`) và hiện chip `Button` "Lịch trình" cố định ở đáy để mở lại (mở lại ở mức vừa). `SheetTitle` sr-only "Lịch trình theo ngày". Nội dung theo thứ tự: DayTabs (sticky trong vùng cuộn của sheet), DaySubtitle, WaypointList, thanh "Thêm điểm đến" sticky bottom (như desktop, cộng `env(safe-area-inset-bottom)`).
- **[Cập nhật 2026-11-06, UAT 04-53]** Thanh "Thêm điểm đến" (tab ngày và Tổng quan) phải thấy và bấm được ở CẢ BA mức sheet, không cần kéo lên expanded. Popup luôn cao bằng mức expanded và bị dịch xuống ở mức thấp/vừa nên đáy popup (nơi `sticky bottom-0` đứng) nằm ngoài màn hình. `EditorLayout` tính phần bị che (`expanded − mức hiện tại`) và `TimelineAddBar` nâng `bottom` đúng bằng đó, nên đáy thanh luôn trùng đáy màn hình (`innerHeight`) ở cả ba mức. Để làm được, `SheetContent` của timeline bỏ đệm đáy popup (`pb-0`); vùng an toàn `env(safe-area-inset-bottom)` nằm trong padding của chính thanh. Từ `lg` thanh giữ `bottom: 0` trong cột trái.
- Sheet không bao giờ che header ở cả ba mức (nhờ `insetTop`).
- Kéo thả trong sheet: chỉ tay cầm nhận nhấn giữ 180ms; vuốt ở chỗ khác của sheet vẫn là cuộn/snap sheet (D-34).

> **[Cập nhật 2026-11-05, D-119]** Nền sau sheet không còn là `TripSummary` cuộn được. Nền là `EditorMapArea` cố định từ đáy header tới đáy viewport (không cuộn trang, không còn `pb-(--sheet-snap-peek)`). Một ngón kéo trên phần bản đồ không bị sheet che là pan, hai ngón là zoom. Sheet giữ nguyên ba mức, mở ở `medium` (D-15), có nút X và chip "Lịch trình" như cũ. Thông tin chung của chuyến đi nằm đầu nội dung sheet ở tab Tổng quan. `TripSummary variant="compact"` chỉ hiện lại trên nền khi bản đồ lỗi (D-120), khi đó nền cuộn được như trước.

### DayTabs (D-27, D-28)

- `Tabs variant="line"` với `value` = dayNumber; vẽ đủ Ngày 1 → ngày lớn nhất, ngày thưa hiện như ngày trống.
- Thanh `overflow-x-auto` (cuộn ngang, ẩn scrollbar không bắt buộc), `TabsList` + nút "+ Thêm ngày" nằm **sau** `TabsList` (không thuộc roving focus của tab).
- Mỗi `TabsTrigger` hai dòng, `py-inline-sm`: dòng 1 "Ngày N" (Label semibold); dòng 2 km của ngày (Label regular text-muted, `tabular-nums`), không có km thì không render dòng 2. Accessible name: "Ngày 2, 12,4 km" hoặc "Ngày 2".
- Tab đang chọn tự cuộn vào giữa thanh khi đổi (`scrollIntoView({ inline: "nearest" })`, `behavior` theo reduced-motion).
- "+ Thêm ngày": `Button ghost size="sm"` icon `Plus` "Thêm ngày". Bấm: thêm tab "Ngày {max+1}" ngay (optimistic), chọn nó, focus vào tab mới, cuộn thanh tới cuối; nội dung là EmptyState ngày trống. Lỗi: gỡ tab, chọn lại tab trước, focus về nút "Thêm ngày", chỉ báo "Lỗi – Thử lại" + toast error. Không xác nhận, không xóa ngày (D-27). BE không giới hạn trên số ngày (chỉ chặn < 1), FE không đặt trần.

**[Cập nhật 2026-11-05: tab Tổng quan và màu ngày, D-123, D-131, D-132, D-140]**

- `value` của `Tabs` đổi thành `"overview" | "<dayNumber>"`; state của editor có kiểu `"overview" | number`. Hàm thuần chọn tab mặc định (D-132): lịch trình có ít nhất một điểm thì `"overview"`, chưa có điểm thì `1`; mở lại bản nháp form thêm thì ngày của bản nháp (giữ hành vi cũ).
- Tab **"Tổng quan"** là `TabsTrigger` đầu tiên, trước "Ngày 1", cùng hai dòng: dòng 1 "Tổng quan" (Label semibold), dòng 2 tổng km `totalDistanceKm` của BE (Label regular `text-muted`, `tabular-nums`), không có km hoặc bằng 0 thì không render dòng 2 (D-140). Không có chấm màu. Accessible name "Tổng quan, 42,5 km" hoặc "Tổng quan".
- Tab "Ngày N" thêm **chấm màu ngày** trước chữ ở dòng 1: `span aria-hidden` `size-(--map-day-dot-size) rounded-pill` nền màu ngày N (`bg-map-day-{1..8}` theo bảng ánh xạ, §Bảng màu theo ngày), gap 4px với chữ. Accessible name không đổi ("Ngày 2, 12,4 km").
- Vạch tab đang chọn vẫn là accent (không đổi màu theo ngày).
- Đổi tab xóa lựa chọn điểm trên bản đồ và canh khung theo tab mới (D-127).
- "+ Thêm ngày" vẫn ở cuối thanh và vẫn chọn ngày mới (rời Tổng quan nếu đang ở đó).

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
- **[Cập nhật 2026-11-05, D-126, D-125]** Khi bản đồ đang hiển thị, nút chính **chọn điểm trên bản đồ** thay vì mở form sửa: bản đồ di chuyển tới pin (giữ mức zoom), pin chuyển trạng thái "được chọn" và hiện nhãn tên. Sửa đi qua mục "Sửa" của menu ⋯ (giữ nguyên); Xóa và tay cầm kéo giữ nguyên. Khi bản đồ lỗi hoặc chưa tải xong, nút chính giữ hành vi cũ (mở form sửa), để người dùng không mất đường sửa nhanh. Thẻ đang được chọn: `ring-2 ring-inset ring-text` (viền đậm trung tính, không dùng accent) và nút chính có `aria-current="true"`; mô tả sr-only dùng chung "Nhấn để xem trên bản đồ" nối `aria-describedby` khi bản đồ hiển thị. Lựa chọn mất khi đổi tab, bấm vùng trống của bản đồ, chọn điểm khác, hoặc điểm đó bị xóa (kể cả đang chờ hoàn tác). Bấm pin trên bản đồ thì thẻ tương ứng được chọn và cuộn vào khung (`block: "nearest"`, không mượt khi reduced motion).
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

- Từ `md`: `DialogContent size="md"`. Dưới `md`: `Sheet modal defaultSnap="expanded"`. Form dialog **không đóng khi bấm scrim** (`disablePointerDismissal`); Esc, vuốt xuống hoặc nút X góc trên phải (Sheet), "Hủy" thì đóng và bỏ thay đổi. Đang gửi: không đóng được bằng bất kỳ cách nào (nút X bị vô hiệu).
- Tiêu đề: thêm "Thêm điểm đến vào Ngày N"; sửa "Sửa điểm đến". Không có ô ngày (D-23).
- **[Cập nhật 2026-11-05, D-138, D-139]** Form **thêm mở từ tab Tổng quan** có thêm ô **"Ngày"** và tiêu đề "Thêm điểm đến" (không kèm số ngày, vì ngày đổi được trong form). Ô "Ngày" là field đầu tiên (trên ô Tên), dùng `Select` của `ui-web` (`SelectTrigger` cỡ `lg`, khớp `Input lg`), nhãn "Ngày", không đánh dấu bắt buộc vì luôn có giá trị. Lựa chọn: đủ dải Ngày 1 → ngày lớn nhất (cả ngày thưa), chữ "Ngày {N}" hoặc "Ngày {N} · {phụ đề}" khi có phụ đề. Mặc định **ngày cuối cùng**. Focus ban đầu vẫn ở ô Tên (D-18); Shift+Tab lên ô Ngày. Thêm vào ngày chưa có bản ghi đi theo cơ chế ngày thưa hiện có. Form thêm mở từ tab ngày và form sửa **không có** ô Ngày (UAT bước 9). Ẩn/hiện ô bằng prop `visible`, không rẽ nhánh JSX. Bản nháp `sessionStorage` (D-36) lưu theo ngày đang chọn trong ô (`add:{N}`); khôi phục thì mở form thêm của tab Ngày N như cũ (không có ô Ngày).
- Thêm xong từ Tổng quan: đóng form, **ở lại tab Tổng quan**, bản đồ di chuyển tới điểm mới (giữ zoom, D-127, D-139), dòng của ngày đó trong Tổng quan được làm nổi 1500ms (cùng style "Vừa thêm"), live region đọc "Đã thêm {tên} vào Ngày {N}", focus về nút "Thêm điểm đến" của Tổng quan.
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

### TripInfoDialog (D-17, D-26, D-87..D-91, D-101; viết lại 2026-10-30)

> Thay bản có nút "Lưu"/"Hủy" và một ô URL ảnh bìa (D-24, phần "Lưu" của D-25). Không còn nút gửi, chân form, `SubmitStatus` hay `loadingLabel` trong dialog này.

**Bề mặt.** `ResponsiveFormSurface` với `closeButton`: từ `md` là `DialogContent size="md"` có nút X "Đóng" góc trên phải (`showCloseButton`, `DialogTitle` thêm `pr-touch`); dưới `md` là `Sheet modal defaultSnap="expanded"` (nhiều mức như cũ, X sẵn có). Bấm scrim không đóng. Tiêu đề "Thông tin chuyến đi". Mở từ nút "i" của header, nút "Sửa thông tin"/"Thêm ảnh bìa" và vùng tóm tắt (D-17); focus ban đầu ở ô Tiêu đề; đóng thì focus về phần tử đã mở.

**Cách đóng (D-91).** Dialog: Esc hoặc nút X. Sheet: nút X, vuốt xuống hoặc Esc. Không có `locked`: đóng được cả khi đang có lệnh lưu chạy; lệnh vẫn chạy tiếp trong hàng đợi và chỉ báo header thể hiện tiến trình (D-90).

**Thứ tự nội dung (cách 16px):**

```text
"Thông tin chuyến đi"                                   [X Đóng]
(lỗi tự lưu chung là toast kèm "Thử lại" ở vùng toast, không nằm trong form)
Tiêu đề        Input lg, required
Mô tả          Textarea
Ngày khởi hành Input lg type="date"
Ảnh bìa        CoverImageField (lưới 5 ô + khung "Link ảnh")
(không có chân form)
```

| Field | Control | Bắt buộc | Giới hạn | Lưu khi (D-88) |
|-------|---------|----------|----------|----------------|
| Tiêu đề | `Input lg` | `required` | 1–100 sau trim | Blur, hoặc 800ms sau lần gõ cuối |
| Mô tả | `Textarea` | không | ≤ 1000 | Blur, hoặc 800ms sau lần gõ cuối |
| Ngày khởi hành | `Input lg type="date"`, `allowClear` mặc định, `clearLabel="Xóa Ngày khởi hành"`, icon lịch bên trái | không | `CalendarDate` | Ngay khi đổi thành ngày hợp lệ hoặc khi xóa (gửi `null`) |
| Ảnh bìa | `CoverImageField` | không | tối đa 5, mỗi link `https://`, ≤ 500 | Ngay sau mỗi thao tác thêm, xóa, chọn |

Không có ô điểm đến và sở thích (D-77).

**Quy tắc tự lưu (D-87..D-90):**

- Chỉ gửi khi giá trị khác giá trị đã lưu gần nhất (so sánh sau trim) và hợp lệ. Blur mà không đổi gì thì không gửi; blur ngay sau một lần lưu do debounce cũng không gửi lại.
- `PUT` ghi đè toàn bộ metadata, nên mỗi lệnh ghép **giá trị hợp lệ gần nhất của từng ô** (ô đang sai thì dùng giá trị đã lưu) cùng danh sách ảnh và ảnh đang chọn. Không gửi điểm đến, sở thích (BE giữ nguyên, D-54). Hàm ghép payload là hàm thuần có test.
- Mọi lệnh đi qua `useUpdateMetadata` (cùng `mutationKey` ghi và `scope: itinerary:{id}`), nên chạy tuần tự sau các lệnh ghi khác của editor (D-88). Planner được phép gộp các lệnh chưa chạy của cùng form thành lệnh mới nhất (ví dụ khi đổi ảnh đang chọn bằng phím mũi tên liên tục), miễn lệnh cuối mang trạng thái cuối.
- Giá trị sai (tiêu đề trống, quá 100 ký tự, mô tả quá 1000, ngày không hợp lệ, link không phải https): **không gửi**, lỗi dưới ô (`mode: "onTouched"`, hiện khi blur hoặc ngay khi gõ sau lần lỗi đầu) (D-89).
- Đóng khi còn ô sai: bỏ giá trị sai; lần mở sau các ô hiện giá trị đã lưu gần nhất. Đóng khi còn debounce chưa chạy và giá trị hợp lệ: gửi ngay lúc đóng (flush), không bỏ.
- Trong form **không hiện** "Đang lưu…" hay "Đã lưu" (D-90). Chỉ báo header (D-30) vẫn chạy như cũ cho các lệnh này: "Đang lưu…" khi còn lệnh chạy, "Đã lưu" khi xong.
- Lưu thành công: không toast, form giữ mở, giá trị đã lưu mới thành mốc so sánh. Dữ liệu refetch trong lúc form mở không ghi đè ô đang gõ (mẫu ref hiện có).

**Lỗi lưu (D-90):**

| Loại lỗi | Hiển thị trong form | Hiển thị ngoài form |
|----------|--------------------|--------------------|
| Lỗi field từ BE (`resolveFormError`, ví dụ tiêu đề) | `FormFieldError` dưới ô đó; giá trị vẫn trong ô; không có nút "Thử lại" (sửa ô thì lần blur/debounce sau gửi lại) | Không |
| Lỗi danh sách ảnh từ BE (vượt giới hạn, link sai) | Lỗi dưới lưới ảnh (`CoverImageField`), lưới quay về danh sách đã lưu | Không |
| Lỗi không gắn field (mạng, 5xx, timeout) | Không có gì trong form. **Toast error** (cập nhật 2026-11): "Chưa lưu được thay đổi. {thông điệp theo `selectErrorMessage`}" + action "Thử lại" (`notify.error` với `id` cố định và `persistent`). Giá trị vẫn trong ô | Toast ở vùng toast, hiện cả khi form còn mở |
| Đóng form khi lỗi không gắn field chưa được thử lại thành công | (form đã đóng) | Chuyển thành lỗi thao tác nền: chỉ báo header "Lỗi – Thử lại" (thử lại = gửi lại lệnh đã lỗi với giá trị cuối); toast lỗi tự lưu ở trên vẫn là toast duy nhất (không thêm toast thứ hai), để thay đổi hợp lệ không mất im lặng |

- Toast lỗi tự lưu (thay `InlineAlert` + "Thử lại", cập nhật 2026-11): chỉ một toast tại một thời điểm (id cố định, lỗi lặp lại cập nhật tại chỗ, không chồng), không tự hết hạn, có nút đóng; tắt khi lệnh lưu thành công hoặc khi lỗi mới là lỗi field. Bấm "Thử lại" không tắt toast (nếu lần gửi lại vẫn lỗi ngay thì toast được cập nhật tại chỗ, không biến mất). "Thử lại" gửi lại payload mới nhất (không phải bản cũ đã lỗi) và là cùng hành động với "Lỗi – Thử lại" ở header.
- Toast error có `role="alert"` nên được đọc ngay; toast không nhận focus nên focus không bị kéo đi khỏi ô đang gõ.

**Bản nháp `sessionStorage` (D-36, D-101).** Tự lưu làm bản nháp form metadata gần như thừa. Mặc định của spec: **bỏ** bản nháp và `InlineAlert info` "Đã khôi phục nội dung chưa lưu" cho form này (form waypoint giữ nguyên). Nếu planner giữ lại thì copy và vị trí alert như cũ, đặt trên `InlineAlert` lỗi.

**Cảnh báo rời trang (D-35).** "Có thay đổi chưa lưu" của form này = còn debounce chưa chạy hoặc còn lỗi lưu chưa thử lại thành công. Lệnh đang chạy đã được `useIsMutating` tính sẵn.

### CoverImageField (D-79..D-86, D-99, D-100)

Chỉ có trong "Thông tin chuyến đi" (D-100). Form tạo không có khối ảnh (D-97).

```text
"Ảnh bìa"                                    nhãn nhóm (Label semibold), id coverLabelId
"Tối đa 5 ảnh. Chọn một ảnh để hiển thị."    mô tả (Label regular text-muted), id coverDescId
CoverGrid  div grid (một ô lưới, hai lớp chồng lên nhau)
  lớp 1  CoverChoiceGroup = RadioGroup       chỉ Radio của ô có ảnh
           [ảnh 1 ✓] [ảnh 2] [ảnh 3]
  lớp 2  CoverTileActions = div              X của từng ô có ảnh, rồi nút thêm, rồi khung trống (bấm được bằng chuột/chạm, không vào Tab)
           [      X] [     X] [     X]
           [+ Thêm ảnh] [ khung trống ]
FormFieldError lưới                          role="alert" (lỗi BE danh sách ảnh)
ghi chú trạng thái                           p aria-live="polite" (đủ 5 ảnh / chưa có ảnh)
thông báo thao tác                           p.sr-only aria-live="polite" (đã thêm / đã xóa)
CoverUrlPanel                                visible khi đang thêm, ngay dưới các dòng trên
```

**Cấu trúc DOM (sửa FLAG 1).** `RadioGroup` chỉ chứa các `Radio` của ô có ảnh. Không có nút, ô trống hay phần tử tương tác nào khác bên trong `role="radiogroup"`, và không có phần tử tương tác nào lồng trong `Radio`. Nút X và nút "Thêm ảnh bìa" nằm ở lớp 2, là anh em của `RadioGroup` và đứng **sau** nó trong DOM. Hai lớp trùng vị trí bằng CSS grid, nên trên màn hình X vẫn nằm ở góc ô ảnh và nút thêm nằm ở ô trống đầu tiên.

- `CoverGrid`: `div grid`. Cả hai lớp đặt `col-start-1 row-start-1` để chồng lên nhau, và cùng dùng `grid grid-cols-2 sm:grid-cols-3 gap-inline-sm`. Mọi ô của cả hai lớp có `aspect-(--itinerary-cover-ratio)`, nên hàng và cột của hai lớp khớp nhau ở mọi bề rộng.
- Thứ tự chồng: lớp 2 render sau nên được vẽ trên lớp 1 theo thứ tự DOM. Không dùng `z-index` (không raw, không token).
- Lớp 2 có `pointer-events-none`; chỉ nút X, nút thêm và các khung trống có `pointer-events-auto`. Bấm/chạm vào phần ảnh ngoài nút X thì sự kiện xuống `Radio` ở lớp 1 và chọn ảnh; bấm/chạm vào khung trống mở ô nhập URL.
- Luôn vẽ 5 ô (D-82). Lớp 1 có `n` ô (n = số ảnh, theo thứ tự lưu). Lớp 2 luôn có đủ 5 ô: `n` ô hành động (mỗi ô chứa một nút X), rồi `CoverAddTile`, rồi `4 − n` khung trống. Khi `n = 5`, `CoverAddTile` không render và số khung trống là 0. Mỗi ô `rounded-container overflow-hidden`, cùng tỉ lệ với ảnh bìa thật để người dùng thấy đúng cách cắt.
- Ẩn hiện bằng prop `visible`, không dùng `? :`/`&&` trong JSX: `CoverChoiceGroup visible={n > 0}` (không có ảnh thì không render radiogroup rỗng), `CoverAddTile visible={n < COVER_IMAGE_LIMIT}`, `CoverUrlPanel visible={đang thêm}`. Ô hành động và khung trống render bằng `map` trên mảng do hàm thuần tính sẵn, không rẽ nhánh trong JSX.

**Lớp 1: ô ảnh (`CoverChoice`, Base UI `Radio`, render `span role="radio"` kèm `input` ẩn).**

- `Radio` (`value` = id ảnh, hoặc vị trí nếu BE không có id) phủ kín ô, chứa `<img alt="" referrerPolicy="no-referrer" loading="lazy">` `object-cover`, viền `border border-border`.
- Đang hiển thị (`data-checked`): `ring-2 ring-primary border-primary` + huy hiệu dấu tích góc trên trái (`absolute left-inline-xs top-inline-xs`, `rounded-pill bg-primary text-primary-foreground p-inline-xs`, icon `Check` 16px, `aria-hidden`; luôn render, ẩn hiện bằng CSS theo `data-checked`) (D-85). Focus ring (`outline` offset 2px) tách khỏi viền chọn (`ring`), nên thấy được cả hai.
- Tên truy cập (D-85, `aria-label` của `Radio`): ô đang hiển thị "Ảnh bìa {N}, đang hiển thị"; ô khác "Chọn ảnh {N} làm ảnh bìa". `N` là vị trí 1-based hiện tại.
- Ảnh tải lỗi: thay ảnh bằng nền `surface-muted` + icon `ImageOff` 24px `text-subtle`; ô vẫn chọn được và xóa được (D-84, D-25); `aria-describedby` của `Radio` trỏ câu sr-only "Không tải được ảnh từ link này".

**Lớp 2: hành động (`CoverTileActions`, `div` không có role).**

- Ô hành động thứ `N`: `div relative`, bản thân ô không tương tác (chỉ nút X bên trong). Bên trong là nút X: `IconButton variant="secondary" size="sm"` (`rounded-pill`), đặt `absolute right-inline-xs top-inline-xs`, `pointer-events-auto`, icon `X` 16px, `aria-label` "Xóa ảnh bìa {N}". Phần nhìn thấy có thể nhỏ hơn và đè lên góc ô ảnh, nhưng vùng chạm không nhỏ hơn `size-touch` (44×44px, đã có sẵn ở `IconButton`). Không dùng màu danger, không hỏi xác nhận (D-86).
- `CoverAddTile` (vị trí ô `n + 1`): `button type="button"` phủ kín ô, `min-h-touch min-w-touch`, `pointer-events-auto`, `border border-dashed border-border-strong bg-surface-muted`, hover `bg-surface`; giữa ô là icon `ImagePlus` 20px `text-muted` + "Thêm ảnh" (Label semibold `text-text`). `aria-label` "Thêm ảnh bìa", `aria-expanded` theo trạng thái `CoverUrlPanel`, `aria-controls` trỏ id khung. Không phải radio, không nằm trong radiogroup.
- Khung trống còn lại (ô thứ `n + 2` đến 5): `div aria-hidden`, `border border-dashed border-border`, `cursor-pointer`, `pointer-events-auto`, hover `bg-surface-muted`, thuộc tính `data-cover-empty`, có `onClick` mở `CoverUrlPanel` giống nút "Thêm ảnh bìa" và đưa focus vào ô "Link ảnh" (D-82 "ô trống bấm để dán URL", D-84 "bấm ô trống thì mở ô nhập URL"). Đây là đường tắt CHỈ cho chuột và cảm ứng: khung không có `tabindex`, `role` hay xử lý phím, nên không thêm điểm dừng Tab và không vào cây truy cập (`aria-hidden`). Bàn phím và trình đọc màn hình dùng một điểm dừng duy nhất là nút "Thêm ảnh bìa". Khung trống chỉ render khi `n < 5`.

**Ghi chú và thông báo.**

- Đủ 5 ảnh: ghi chú dưới lưới "Đã đủ 5 ảnh. Xóa một ảnh để thêm ảnh khác." (Label regular `text-muted`).
- Chưa có ảnh nào (D-86): lớp 1 không render, lớp 2 có nút thêm và 4 khung trống; ghi chú "Chưa có ảnh bìa. Lịch trình đang dùng ảnh mặc định." khi lịch trình có điểm đến (có ảnh mặc định), hoặc "Chưa có ảnh bìa." khi không có. Câu này cố ý không nhắc "điểm đến", vì trong editor "điểm đến" là waypoint. Ảnh mặc định chỉ hiện ở thẻ, canvas, nền (chuỗi dự phòng §ItineraryCard), không chèn vào lưới và không được ghi vào danh sách. Không tên điểm đến nào hiện trong editor (D-76).
- Ghi chú trạng thái nằm trong `p aria-live="polite"`, đọc khi đổi giữa "đủ 5 ảnh", "chưa có ảnh" và không ghi chú.
- Thông báo thao tác nằm trong `p.sr-only aria-live="polite"` riêng của `CoverImageField`, luôn có trong DOM: "Đã thêm ảnh bìa {N}", "Đã xóa ảnh bìa {N}". Mỗi lần ghi đè nội dung cũ.
- Lỗi BE của danh sách ảnh (vượt 5, link sai): `FormFieldError` dưới lưới có `role="alert"`, được đọc ngay; id của nó thêm vào `aria-describedby` của `RadioGroup` và nút "Thêm ảnh bìa". Lưới quay về danh sách đã lưu.
- Lỗi lưu không gắn field (mạng, 5xx, timeout) không hiện trong lưới: dùng `InlineAlert` đầu form (`role="alert"`) theo bảng Lỗi lưu của §TripInfoDialog.

**Bàn phím và chọn (D-85).** `RadioGroup` có `aria-labelledby` = coverLabelId, `aria-describedby` = coverDescId (+ id lỗi khi có). Tab vào nhóm dừng ở ô đang hiển thị (một điểm dừng duy nhất, roving tabindex của Base UI); ←/→/↑/↓ di chuyển và chọn; Space chọn; Enter không làm gì (Base UI chặn). Bấm/chạm ô chọn ngay. Mỗi lần đổi lựa chọn là một lần lưu ngay (D-88).

**Thứ tự Tab của phần ảnh bìa (theo DOM, không dùng `tabIndex` dương):**

1. `RadioGroup`: một điểm dừng ở ô đang hiển thị.
2. Nút "Xóa ảnh bìa 1" … "Xóa ảnh bìa {n}" theo thứ tự ô.
3. Nút "Thêm ảnh bìa" (chỉ khi `n < 5`).
4. Khi `CoverUrlPanel` mở: ô "Link ảnh" → nút "Xóa link ảnh" (chỉ khi ô có chữ, của `allowClear`) → "Hủy" → "Thêm". Hai nút nằm trên hàng nhãn nhưng đứng SAU ô nhập trong DOM (bố cục bằng CSS grid), nên Tab vẫn đi ô nhập trước; "Hủy" trước "Thêm".

Ghi chú, thông báo sr-only và `FormFieldError` không nhận focus. Shift+Tab đi ngược đúng thứ tự trên.

**Xóa (D-86).** Bấm X của ô `N`: gỡ ảnh khỏi lưới ngay (optimistic) và lưu ngay. Xóa ảnh đang hiển thị thì **ảnh đầu tiên còn lại** tự được chọn; xóa ảnh khác thì giữ ảnh đang chọn. Xóa hết thì danh sách rỗng, không ảnh nào được chọn, không ghi ảnh mặc định (thẻ, canvas, nền hiện ảnh mặc định của điểm đến theo chuỗi dự phòng). Thông báo sr "Đã xóa ảnh bìa {N}".

Focus sau khi xóa ảnh ở vị trí `N` (danh sách còn `m` ảnh), để focus không rơi về `body`:

- `m ≥ N`: nút "Xóa ảnh bìa {N}" mới (ảnh kế tiếp đã dồn vào vị trí `N`).
- `1 ≤ m < N` (vừa xóa ảnh cuối): nút "Xóa ảnh bìa {m}" (ảnh liền trước).
- `m = 0`: nút "Thêm ảnh bìa".

Lưu lỗi: lưới trả về danh sách đã lưu và xử lý theo bảng Lỗi lưu. Nếu phần tử đang có focus vẫn còn trong DOM thì giữ focus; nếu không thì focus về `Radio` của ô đang hiển thị.

**Thay ảnh.** Không có thao tác thay riêng: xóa rồi thêm (D-86).

**CoverUrlPanel (D-84).** Mở khi bấm "Thêm ảnh bìa"; không mở modal chồng. Khung `rounded-container border border-border p-stack-md flex flex-col gap-stack-sm`, nằm ngay dưới lưới (và dưới ghi chú), cuộn vào khung khi mở.

| Phần | Contract |
|------|----------|
| Ô "Link ảnh" | `FormFieldRow` nhãn "Link ảnh", mô tả "Dán link ảnh bắt đầu bằng https://", `Input lg type="url" inputMode="url" autoComplete="off" allowClear clearLabel="Xóa link ảnh"`. Focus vào ô khi khung mở |
| Preview | Như preview cũ: chỉ khi link hợp lệ, debounce 400ms, `aspect-(--itinerary-cover-ratio) rounded-container`; đang tải `Skeleton block`; tải được `<img alt="Xem trước ảnh bìa" referrerPolicy="no-referrer">`; lỗi tải → nền `surface-muted` + icon `ImageOff` + "Không tải được ảnh từ link này", **vẫn cho thêm** (D-84, D-25) |
| Nút | Nằm CÙNG HÀNG với nhãn "Link ảnh" (nhãn bên trái, nút căn phải) qua slot `labelAction` của `FormFieldRow` (grid `grid-cols-[minmax(0,1fr)_auto]`, nút ở cột 2 hàng 1): "Hủy" (`Button secondary size="sm"`) rồi "Thêm" (`Button primary size="sm"`, `min-w-touch`). Không có `loading` (thêm là thao tác cục bộ, lưu đi qua tự lưu) |

- "Thêm" hoặc Enter trong ô: validate (https, ≤ 500 ký tự, chưa có trong danh sách). Sai thì lỗi dưới ô, khung vẫn mở. Đúng thì thêm vào cuối lưới, lưu ngay, đóng khung, focus vào `Radio` của ô mới (gọi `focus()` trên phần tử `role="radio"`; Base UI 1.8.0 chỉ chọn khi focus đến từ phím mũi tên, nên focus bằng code không đổi ảnh đang chọn). Nếu trước đó danh sách rỗng thì ảnh mới tự được chọn làm ảnh hiển thị; còn lại giữ ảnh đang chọn. Thêm ảnh thứ 5 thì nút "Thêm ảnh bìa" biến mất (`visible={false}`), focus vẫn ở `Radio` ảnh mới. Thông báo sr "Đã thêm ảnh bìa {N}".
- "Hủy" hoặc Esc trong ô: đóng khung, bỏ link đang gõ, focus về nút "Thêm ảnh bìa". Esc này chỉ đóng khung, không đóng dialog (chặn lan truyền).
- Đủ 5 ảnh thì khung không mở được (`CoverAddTile visible={false}`, không còn nút thêm).
- Link trong khung chưa bấm "Thêm" không phải giá trị đã lưu: đóng dialog thì bỏ, không gửi, không tính là thay đổi chưa lưu.
- An toàn (giữ T-04-39/40): chỉ render `<img>` khi link qua kiểm `https`, `referrerPolicy="no-referrer"`, thẻ `img` thường không qua image optimizer, không `dangerouslySetInnerHTML`.

**Tách component.** `CoverImageField` nhận `images`, `selectedIndex`, `onChange(next)` (danh sách + ảnh chọn mới), `fallbackNote` và `error`; không tự gọi API. Bên trong tách `CoverChoiceGroup` (lớp 1), `CoverTileActions` (lớp 2, gồm `CoverAddTile`) và `CoverUrlPanel`; mỗi phần nhận đúng trường nó cần và có prop `visible`. Thao tác danh sách (thêm, xóa và chọn lại ảnh đầu, chọn, kiểm trùng, giới hạn 5), mảng ô của lớp 2 (`n` ô hành động, ô thêm, `4 − n` khung trống) và đích focus sau khi xóa (theo `N`, `m`) là hàm thuần ở domain `itinerary` có test.

### PublishDialog (D-39, D-40)

- `DialogContent size="sm"` ở mọi breakpoint. `DialogTitle` "Xuất bản lịch trình?"; `DialogDescription` "Ai có link đều xem được lịch trình này. Bạn vẫn sửa được nội dung sau khi xuất bản, nhưng không thể chuyển lại về nháp."
- Footer `flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end`: `DialogClose` "Hủy" (`secondary`, **`initialFocus`**) + `Button primary` "Xuất bản" (`loadingLabel` "Đang xuất bản…").
- Đang gửi: Esc/scrim/"Hủy" không đóng; `SubmitStatus`. Lỗi: `InlineAlert` trong dialog (gồm `Itinerary.CannotPublishEmpty` → "Thêm ít nhất 1 điểm đến để xuất bản."), dialog vẫn mở.
- Thành công: đóng, toast success "Đã xuất bản lịch trình", badge thành "Đã xuất bản", nút "Xuất bản" biến mất, header không hiện dòng ghi chú nào (D-40; dòng D-41 đã bỏ theo yêu cầu user 2026-10-30). Focus về nút "i" của header (nút Xuất bản không còn).

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
| Đang tải | Header rút gọn (back + `Skeleton text` thay tiêu đề + `UserMenu compact`). Desktop: cột timeline có Skeleton thanh tab + 3 `Skeleton block`; canvas có `Skeleton` khối ảnh bìa + 2 dòng. Mobile: Skeleton ảnh bìa + 3 khối, không mở sheet. `p.sr-only role="status"` "Đang tải lịch trình…". **[Cập nhật 2026-11-05]** Canvas desktop và nền mobile là một `Skeleton block` phủ kín vùng bản đồ (không còn khối ảnh bìa + 2 dòng); cột timeline giữ nguyên |
| Lỗi mạng/5xx (D-46) | Header rút gọn + `ErrorState variant="page"` "Thử lại" |
| 404 / id sai GUID (D-46) | `not-found` sẵn có của app |
| 403 (D-45, D-46) | Header rút gọn (back + `UserMenu compact`, không tiêu đề). Thân: `EmptyState variant="page"` icon `Lock`, heading "Bạn không có quyền sửa lịch trình này", body "Chỉ người tạo lịch trình mới sửa được.", action link dạng `buttonVariants({ variant: "primary" })` "Về Lịch trình của tôi" → `/itineraries/mine`. Document title "Không có quyền truy cập · Tripory" |
| Có dữ liệu, `canEdit` true | Editor đầy đủ |

---

## Bản đồ trong editor và tab Tổng quan (PUB-06; D-111..D-140, mở lại lần 2 2026-11-05)

> Phần này thêm mới. Nó thay canvas desktop (D-13 → D-118), nền mobile sau sheet (D-14 → D-119), thêm tab "Tổng quan" vào dải tab ngày (D-131) và ô "Ngày" cho form thêm mở từ Tổng quan (D-138). D-15 (sheet mở ở mức vừa), D-16 (header), D-17 (dialog "Thông tin chuyến đi"), D-28 (dải ngày đủ, km của BE), D-76/D-78 (không hiện điểm đến, sở thích) giữ nguyên. Bản đồ chỉ hiển thị: không bấm bản đồ để chọn vị trí, không tìm POI (D-115). Không gửi dữ liệu lịch trình cho OpenFreeMap, chỉ tải tile. Không cần thay đổi BE.

### Tiêu điểm và thứ bậc

- **Desktop:** bản đồ là tiêu điểm (chiếm phần lớn màn hình, pin màu là phần tử đậm màu nhất trên nền nhạt). Cột trái là thứ bậc hai: tab ngày, rồi thông tin chung (Tổng quan) hoặc danh sách điểm (tab ngày). Header giữ thứ bậc như cũ.
- **Mobile:** phần bản đồ không bị sheet che là tiêu điểm khi sheet ở mức thấp hoặc vừa; khi sheet mở rộng, nội dung sheet là tiêu điểm.
- Thứ tự mắt nhìn trên bản đồ: pin đang chọn kèm nhãn tên → pin và đường của ngày đang chọn → ngày mờ → nền. Nền cố ý nhạt (D-116) để pin luôn đứng trên.

### Bố cục

**Desktop từ `lg` (1024px; ví dụ 1440×900):**

```text
EditorHeader (64px, không đổi)
grid lg:grid-cols-[var(--editor-timeline-width)_1fr], cao 100dvh − header
├─ cột trái 400px: bg-surface border-r, cuộn dọc riêng (như cũ)
│    DayTabs sticky: [Tổng quan][• Ngày 1][• Ngày 2]…[+ Thêm ngày]
│    tab Tổng quan → OverviewPanel: OverviewSummary · "Các ngày" · DayOverviewRow × N · thanh "Thêm điểm đến" sticky
│    tab Ngày N   → DaySubtitle · WaypointList · thanh "Thêm điểm đến" sticky (như cũ, không có thông tin chung)
└─ EditorMapArea: relative isolate h-full overflow-hidden, không padding, không cuộn (1040×836 ở 1440×900)
     TripMap phủ kín
     MapStatusOverlay: chip gợi ý trên cùng bên trái (chỉ khi chưa có điểm)
     MapZoomControls: trên cùng bên phải, cách mép 16px
     MapAttribution: dưới cùng bên phải, cách mép 8px
```

**Dưới `lg` (320, 390, 768px):**

```text
EditorHeader (64px, sticky, không bị sheet che)
EditorMapArea: fixed, từ đáy header tới đáy viewport, không cuộn
  chip gợi ý trên cùng bên trái · MapZoomControls trên cùng bên phải · MapAttribution ngay trên mép sheet, bên phải
Sheet timeline (modal={false}, 3 mức, mở ở medium, có X và chip "Lịch trình" khi đóng; như cũ)
  DayTabs sticky · nội dung theo tab (Tổng quan: OverviewSummary dạng gọn + các dòng ngày + "Thêm điểm đến")
```

Phần bản đồ còn thấy được (header 64px, mức sheet theo `resolveSnapPoints`, tính tay, cần đo lại khi làm):

| Viewport | Vùng bản đồ | Sheet thấp (peek) | Sheet vừa (medium) | Sheet mở rộng |
|----------|-------------|-------------------|--------------------|---------------|
| 320×568 | 504px | thấy 344px | thấy 163px | gần như bị che hết |
| 390×844 | 780px | thấy 569px | thấy 274px | thấy 4px |
| 768×1024 | 960px | thấy 704px | thấy 346px | thấy 18px |
| 1440×900 (desktop) | 1040×836 | không có sheet | | |

- Ở 320px mức vừa vẫn đủ chỗ cho cột nút zoom (16 + 44 + 4 + 44 = 108px) và chip gợi ý.
- Ở mức mở rộng, bản đồ gần như bị che; ghi công và nút zoom nằm sau sheet là chấp nhận được vì bản đồ không còn được hiển thị.
- Không overflow ngang ở cả bốn bề rộng. Tablet 768px vẫn là bố cục sheet (form là Dialog từ `md`, như cũ).

### Token mới (`packages/design-tokens`)

Kích thước, thêm vào `components.css` và bảng `tokens.test.ts` (mọi giá trị là bội số của 4):

| Token | Value | Dùng ở |
|-------|-------|--------|
| `--map-pin-size` | `28px` | Đường kính pin thường (`size-(--map-pin-size)`) |
| `--map-pin-size-selected` | `36px` | Đường kính pin đang chọn |
| `--map-day-dot-size` | `12px` | Chấm màu ngày ở tab ngày và dòng ngày của Tổng quan |
| `--map-label-max-width` | `240px` | Bề rộng tối đa nhãn tên cạnh pin |
| `--overview-cover-thumb-width` | `112px` | Ảnh bìa thu nhỏ (16:9, cao 63px) của `OverviewSummary` dưới `lg` |
| `--map-dimmed-opacity` | `0.35` | Độ mờ của pin và đường thuộc ngày không chọn (`opacity-(--map-dimmed-opacity)`); cùng giá trị đọc ra cho `line-opacity` của MapLibre |

Vùng chạm của pin dùng `size-touch` (44px) có sẵn.

### Bảng màu theo ngày (D-123)

Màu ngày là **màu dữ liệu phân loại**, không phải accent thứ hai: chỉ dùng cho pin, đường nối, chấm màu ngày. Không dùng cho nút, focus ring, vạch tab đang chọn hay trạng thái chọn. Màu không bao giờ là kênh duy nhất: pin có số thứ tự, nhãn ở Tổng quan ghi "Ngày N", chấm màu luôn đi cùng chữ "Ngày N".

Thêm primitive vào `primitives.css` (amber dùng lại primitive sẵn có), component token vào `components.css`, ánh xạ Tailwind trong `theme.css` (`--color-map-day-N: var(--map-day-N)` → class `bg-map-day-N`). `dark.css` không ghi đè: bản đồ luôn sáng (D-116).

| Ngày (lặp mỗi 8) | Component token | Primitive | Hex | Số trắng trên pin | Pin trên nền đất `#F5F5F4` | Pin trên nước `#D4E4EE` |
|---|---|---|---|---|---|---|
| 1, 9, 17… | `--map-day-1` | `--primitive-blue-700` (mới) | `#1D4ED8` | 6.70:1 | 6.14:1 | 5.15:1 |
| 2, 10… | `--map-day-2` | `--primitive-amber-700` (có sẵn) | `#B54708` | 5.43:1 | 4.97:1 | 4.17:1 |
| 3, 11… | `--map-day-3` | `--primitive-emerald-700` (mới) | `#047857` | 5.48:1 | 5.03:1 | 4.21:1 |
| 4, 12… | `--map-day-4` | `--primitive-pink-700` (mới) | `#BE185D` | 6.04:1 | 5.53:1 | 4.64:1 |
| 5, 13… | `--map-day-5` | `--primitive-purple-700` (mới) | `#7E22CE` | 6.98:1 | 6.40:1 | 5.36:1 |
| 6, 14… | `--map-day-6` | `--primitive-cyan-700` (mới) | `#0E7490` | 5.36:1 | 4.91:1 | 4.12:1 |
| 7, 15… | `--map-day-7` | `--primitive-lime-700` (mới) | `#4D7C0F` | 4.99:1 | 4.58:1 | 3.84:1 |
| 8, 16… | `--map-day-8` | `--primitive-slate-700` (mới) | `#334155` | 10.35:1 | 9.49:1 | 7.95:1 |

- Số trên pin là chữ 14px semibold (không phải "chữ lớn" theo WCAG), nên cần ≥ 4.5:1: cả 8 màu đạt (thấp nhất 4.99:1). Pin so với nền bản đồ là đồ họa, cần ≥ 3:1 (WCAG 1.4.11): cả 8 màu đạt ở nền đất và nước; viền trắng 2px của pin tách pin khỏi nền và khỏi pin chồng.
- Thứ tự sắp để hai ngày liền nhau khác hẳn sắc độ. Không dùng cam/đỏ (gần accent coral và màu danger).
- Chỉ số màu là hàm thuần ở domain `itinerary`: `dayColorIndex(dayNumber) = ((dayNumber − 1) mod 8) + 1`. App ánh xạ chỉ số sang class bằng bảng tĩnh (không ghép chuỗi class động, để Tailwind sinh đủ CSS). Đường nối là lớp MapLibre nên không nhận class: màu đọc một lần từ token (`getComputedStyle(document.documentElement).getPropertyValue("--map-day-N")`) khi bản đồ tải, không hard-code hex trong component.
- `tokens.test.ts` thêm kiểm: 8 token tồn tại và trỏ primitive; tương phản giữa mỗi màu và trắng ≥ 4.5:1.

### Style nền (style JSON riêng, D-112, D-113, D-116)

Style JSON nằm ở app (vị trí do planner chốt), trỏ nguồn vector tile, glyph và sprite của OpenFreeMap. Màu trong style là dữ liệu bản đồ, không phải class UI, nên ghi hex trong JSON là đúng chỗ (guard token chỉ quét component). Đổi nguồn tile sau này chỉ đổi URL trong style.

| Lớp | Giá trị |
|-----|---------|
| Nền đất | `#F5F5F4` (trùng `surface-muted`, thuộc phần 60% nền nhạt) |
| Nước (biển, sông, hồ) | `#D4E4EE` |
| Công viên, rừng | `#E6EEE3`, chỉ từ zoom 8 |
| Đường chính | `#FFFFFF`, viền `#E7E5E4`; đường nhỏ `#FFFFFF` không viền, từ zoom 12 |
| Tòa nhà | `#EEECEA`, từ zoom 15 |
| Ranh giới quốc gia trên đất liền | `#A8A29E`, nét liền 1px |
| Ranh giới tỉnh | `#D6D3D1`, nét đứt, từ zoom 6 |
| Nhãn chữ | `#57534E`, halo `#FFFFFF` 1px; nhãn nước `#4B6475` |
| Cỡ chữ | 14px (địa danh, tên đường, nhãn quần đảo) và 16px (quốc gia, biển); không dùng cỡ khác |
| POI (cửa hàng, nhà hàng, biểu tượng) | Ẩn hết, để không cạnh tranh với pin. Giữ nhãn tỉnh/thành, quận/huyện, thị trấn; tên đường từ zoom 14 |
| Nghiêng, xoay | Tắt (`dragRotate`, `touchPitch`, xoay hai ngón đều tắt); bản đồ luôn hướng bắc |

**Nhãn tiếng Việt (D-113 mục 1).** Mọi lớp chữ lấy `name:vi`, dự phòng `name` (`coalesce`). Biển hiện "Biển Đông" nhờ `name:vi`. Font glyph phải hiển thị đủ dấu tiếng Việt (dải Latin Extended Additional); UAT kiểm bằng mắt.

**Hoàng Sa, Trường Sa (D-113 mục 2–4, bắt buộc):**

1. Ẩn mọi đoạn ranh giới quốc gia trên biển và ranh giới tranh chấp (lọc thuộc tính `maritime` và `disputed` của schema OpenMapTiles khỏi lớp ranh giới).
2. Ẩn nhãn quần đảo gốc của OSM ở hai vùng này (lọc theo tên các biến thể của Paracel Islands, Spratly Islands, tên tiếng Trung và tiếng Việt; danh sách tên chính xác do planner lập từ tile thật).
3. Thêm hai lớp nhãn riêng (nguồn GeoJSON tĩnh trong style), chữ **chính xác**:
   - "Quần đảo Hoàng Sa (Việt Nam)" đặt quanh 16,5° B, 112,0° Đ.
   - "Quần đảo Trường Sa (Việt Nam)" đặt quanh 10,0° B, 114,5° Đ.
   Cỡ 14px, màu nhãn nước `#4B6475`, halo trắng, hiện từ mức thu nhỏ tối đa tới zoom 10, `text-allow-overlap` để không bị nhãn khác che.
4. Kiểm tự động bằng test style JSON (§Testing bổ sung), và **kiểm bằng mắt** ở mức zoom thấy cả Biển Đông trước khi phát hành, ghi vào UAT. Test tự động không thay được bước kiểm bằng mắt.

### Khung nhìn và zoom (D-117, D-128)

- Không khóa biên (`maxBounds` không đặt). Mức thu nhỏ tối đa là mức vừa đủ chứa khung Việt Nam và Biển Đông (`VIETNAM_VIEW_BOUNDS`, xấp xỉ 101,5–118,5° Đ, 5,5–24,0° B) trong khung bản đồ hiện tại; tính lại khi khung đổi kích thước. Mức phóng to tối đa 18.
- **`MapZoomControls`:** nhóm `div role="group" aria-label="Thu phóng bản đồ"` ở góc trên phải (`absolute top-stack-md right-stack-md`), hai `IconButton variant="secondary"` (44×44px) xếp dọc cách nhau 4px: icon `Plus` `aria-label` "Phóng to", icon `Minus` `aria-label` "Thu nhỏ". Mỗi lần bấm đổi 1 mức zoom quanh tâm. Ở mức tối đa/tối thiểu thì nút tương ứng `disabled`. Dùng được bằng Tab, Enter, Space. Không dùng `NavigationControl` mặc định của MapLibre (nhãn tiếng Anh, vùng chạm nhỏ). Không có nút la bàn.
- **Bàn phím trên canvas:** canvas của MapLibre là một điểm dừng Tab, giữ keyboard handler mặc định (mũi tên di chuyển, `+`/`−` phóng to/thu nhỏ). Canvas có `aria-label` tiếng Việt (bảng copy). Esc khi canvas đang focus thì bỏ chọn điểm.
- Thao tác chuột/chạm: kéo một ngón/chuột để pan, cuộn chuột hoặc hai ngón để zoom, nhấp đúp để phóng to. Không bật "cooperative gestures" (bản đồ là nội dung chính của màn hình).

### Pin (`MapPinMarker`, D-122, D-123)

- Pin là marker HTML (không phải lớp symbol), để dùng class token, vùng chạm 44px và trạng thái CSS. Mỗi điểm hiển thị một pin; điểm đang chờ xóa (hoàn tác 5 giây) **không** có pin và không được đánh số (giống danh sách).
- Số trên pin là thứ tự 1-based trong ngày theo `orderIndex` trên tập đang hiển thị, trùng số ở thẻ của danh sách.
- Cấu trúc: phần tử ngoài `size-touch` (44×44px, trong suốt, tâm trùng tọa độ) chứa vòng tròn nhìn thấy ở giữa. Lớp marker có `aria-hidden="true"` và không nhận focus: pin là đường tắt cho chuột/chạm, danh sách là đường chính cho bàn phím và trình đọc màn hình (D-128; cùng nguyên tắc với khung trống của lưới ảnh bìa).

| Trạng thái | Hình | Tương tác |
|-----------|------|-----------|
| Thường | Tròn `size-(--map-pin-size)` (28px) `rounded-pill`, nền `bg-map-day-N`, viền `border-2 border-surface`, `shadow-sm`; số `text-label font-semibold tabular-nums text-text-inverse` căn giữa | Vùng chạm 44px, `cursor-pointer`, hover `shadow-md` |
| Được chọn | Tròn `size-(--map-pin-size-selected)` (36px), thêm `ring-2 ring-text` ngoài viền trắng, `shadow-md`, nằm trên mọi pin khác; kèm `MapPinLabel` | Như thường |
| Mờ (ngày không chọn) | Như thường, `opacity-(--map-dimmed-opacity)`, nằm dưới pin của ngày đang chọn | `pointer-events-none`: không bấm được, không có vùng chạm, chỉ để định hướng |

- Thứ tự chồng (theo thứ tự render, không dùng `z-index` số): pin mờ → pin thường theo ngày rồi `orderIndex` → pin được chọn và nhãn của nó. Điểm trùng tọa độ không gom cụm; pin sau đè pin trước.
- Đổi kích thước khi chọn dùng `transition-[width,height] duration-(--semantic-motion-duration-fast) ease-standard`; reduced motion thì token về 0ms.

### Nhãn tên cạnh pin (`MapPinLabel`, D-125, D-136)

- Chỉ hiện cho **pin đang chọn** (một nhãn tại một thời điểm). Không dùng `Tooltip` (hover) hay `Popup` của MapLibre: nhãn là thẻ nhỏ gắn cùng marker, nằm phía trên pin, cách mép pin 8px, căn giữa theo pin.
- Thẻ: `bg-surface-elevated text-text shadow-md rounded-control border border-border px-inline-sm py-inline-xs`, `max-w-(--map-label-max-width)`, `pointer-events-none`, `aria-hidden` (thông tin đã có ở dòng được chọn trong danh sách).
- Tab ngày: một dòng tên điểm, Label semibold, `truncate`. Tab Tổng quan: dòng 1 tên điểm (Label semibold, `truncate`), dòng 2 "Ngày {N}" (Label regular `text-muted`).
- Khi chọn, bản đồ dời để cả pin và nhãn nằm trong vùng an toàn (padding canh khung bên dưới), nên nhãn không bị cắt ở mép trên.

### Đường nối (D-124)

- Mỗi ngày một đường thẳng nối các điểm theo thứ tự, chỉ khi ngày có ≥ 2 điểm. Không nối điểm cuối ngày N với điểm đầu ngày N+1. Điểm đang chờ xóa bị bỏ khỏi đường.
- Lớp `line` của MapLibre nằm dưới mọi pin: màu ngày, rộng 4px, `line-join` và `line-cap` tròn, không nét đứt. Ngày thường: `line-opacity` 0.9. Ngày mờ: rộng 4px, `line-opacity` bằng `--map-dimmed-opacity`. Đường của ngày đang được nhấn mạnh vẽ sau (trên) các ngày khác.

### Nhấn mạnh theo tab (D-122, D-131, D-135, D-136)

| Ngữ cảnh | Pin và đường |
|----------|--------------|
| Tab Tổng quan | Mọi ngày "thường", mỗi ngày màu và đường riêng |
| Tab Tổng quan, desktop, rê chuột hoặc focus vào dòng Ngày N | Ngày N "thường" và vẽ trên cùng; các ngày khác "mờ". Rời dòng thì trở về như trên |
| Tab Tổng quan, đã bấm một pin | Mọi ngày "thường", pin đó "được chọn" + nhãn hai dòng; dòng ngày của nó được làm nổi |
| Tab Ngày N | Ngày N "thường"; các ngày khác "mờ" (vẫn thấy, không bấm được) |
| Tab Ngày N, đã chọn một điểm | Như trên, điểm đó "được chọn" + nhãn một dòng; thẻ của nó trong danh sách được chọn |

Nhấn mạnh do một hàm thuần tính từ (tab, ngày đang rê/focus, điểm đang chọn) ra trạng thái từng pin và từng đường, có test bảng.

### Đồng bộ chọn và canh khung (D-125..D-127, D-132, D-135..D-139)

| Sự kiện | Bản đồ | Danh sách / sheet |
|---------|--------|-------------------|
| Mở editor | Vừa khung các điểm của tab mặc định (Tổng quan: mọi điểm) | Tab mặc định theo D-132 |
| Đổi tab (bấm tab, phím mũi tên, bấm dòng ngày, "+ Thêm ngày") | Bỏ chọn; vừa khung các điểm của tab mới | |
| Tab Ngày N chưa có điểm, nhưng lịch trình có điểm | Vừa khung mọi điểm của lịch trình, mọi ngày "mờ" | EmptyState ngày trống như cũ |
| Lịch trình chưa có điểm nào (D-121) | Căn theo khung bao (bbox) xấp xỉ của tỉnh điểm đến; lịch trình cũ không có điểm đến thì căn `VIETNAM_VIEW_BOUNDS`; hiện chip "Thêm điểm đến để thấy trên bản đồ" | |
| Bấm pin ở tab ngày (D-125) | Pin "được chọn" + nhãn; dời bản đồ nếu pin/nhãn ra ngoài vùng an toàn; không mở form sửa | Thẻ tương ứng được chọn và cuộn vào khung. Mobile: sheet về mức vừa (từ thấp, mở rộng, hoặc mở lại nếu đang đóng) |
| Bấm pin ở Tổng quan (D-136) | Pin "được chọn" + nhãn hai dòng; không đổi tab | Dòng của ngày đó được làm nổi và cuộn vào khung. Mobile: sheet về mức vừa (cùng quy tắc với D-125) |
| Bấm nút chính của thẻ điểm (D-126) | Di chuyển tới pin, **giữ mức zoom**; pin "được chọn" + nhãn | Thẻ được chọn. Mobile: mức sheet giữ nguyên |
| Bấm dòng Ngày N ở Tổng quan (D-135) | Như "Đổi tab" | Chuyển sang tab Ngày N, focus vào tab "Ngày N" |
| Rê/focus dòng Ngày N ở Tổng quan, desktop | Nhấn mạnh Ngày N (bảng trên); khung không đổi | |
| Thêm điểm (tab ngày hoặc Tổng quan, D-127, D-139) | Di chuyển tới điểm mới, giữ zoom; không tự chọn | Như §WaypointFormDialog |
| Sửa điểm (tọa độ đổi) | Di chuyển tới điểm, giữ zoom | Như cũ |
| Xóa (kể cả chờ hoàn tác), hoàn tác, kéo thả, thêm ngày lỗi | Giữ nguyên khung; pin, số, đường vẽ lại | Như cũ |
| Bấm vùng trống của bản đồ, hoặc Esc khi canvas có focus | Bỏ chọn | Bỏ trạng thái chọn của thẻ/dòng |
| Khung bản đồ đổi kích thước (xoay máy, đổi mức sheet) | Giữ tâm và zoom, không canh lại; tính lại mức thu nhỏ tối đa | |

- **Vùng an toàn khi canh khung:** desktop padding 64px mỗi cạnh. Dưới `lg`: trên 64px (chừa nút zoom và chip), hai bên 32px, dưới = chiều cao phần bị sheet che + 32px (sheet đóng thì chừa vùng chip "Lịch trình": 76px + 32px). Canh khung không vượt zoom 15; tab chỉ có một điểm thì đặt tâm tại điểm đó ở zoom 14.
- **Chuyển động:** di chuyển và canh khung dùng `easeTo`/`fitBounds` 480ms. `prefers-reduced-motion: reduce` thì nhảy thẳng (`jumpTo`, thời lượng 0), kể cả nút zoom, giống quy tắc reduced motion đã có của editor (UAT bước 23). Đọc media query lúc thao tác, không cache lúc mount.
- Lựa chọn điểm là state của editor (không nằm trong bản đồ), để danh sách và bản đồ đọc cùng một nguồn.

### Trạng thái bản đồ (D-120, D-121)

| Trạng thái | Hiển thị |
|-----------|----------|
| Đang tải (nạp thư viện, style, tile đầu) | `Skeleton block` phủ kín vùng bản đồ; không hiện nút zoom, ghi công; `p.sr-only role="status"` "Đang tải bản đồ…". Danh sách và form dùng được ngay; nút chính của thẻ mở form sửa cho tới khi bản đồ sẵn sàng |
| Sẵn sàng | Bản đồ, pin, đường, nút zoom, ghi công |
| Sẵn sàng, chưa có điểm | Như trên + `MapStatusOverlay`: chip ở góc trên trái (`absolute top-stack-md left-stack-md`, bề rộng tối đa bằng bề rộng bản đồ trừ cột nút zoom và 3 khoảng 16px, xuống dòng khi dài), `rounded-pill bg-surface-elevated shadow-md px-stack-md py-inline-sm`, icon `MapPin` 16px `text-muted` + "Thêm điểm đến để thấy trên bản đồ" (Label regular `text-text`). Chip không bấm được |
| Lỗi | Xem dưới |

**Khi nào là lỗi:** không nạp được thư viện, trình duyệt không có WebGL, style/nguồn tile lỗi trước sự kiện `load`, hoặc quá 15 giây chưa `load`. Tile lẻ lỗi sau khi đã tải thì bỏ qua (MapLibre để trống ô đó), không chuyển sang lỗi.

**Lỗi (D-120), editor vẫn đủ chức năng:**

- Desktop: canvas trở lại như bản trước (`p-section`, cuộn dọc). Trên cùng là `InlineAlert variant="info"` (`role="status"`, không phải lỗi của người dùng) `max-w-content-md mx-auto`: "Không tải được bản đồ" + câu "Bạn vẫn sửa lịch trình như bình thường." + action `Button secondary size="sm"` "Thử lại" (`aria-label` "Thử tải lại bản đồ"). Dưới alert cách 24px là `TripSummary variant="canvas"` như trước.
- Mobile: nền trở lại `TripSummary variant="compact"` cuộn được (padding dưới bằng mức peek như trước), `InlineAlert` cùng nội dung đặt trên cùng của nền trong `p-stack-md`. Sheet không đổi.
- Không có pin, nút chính của thẻ điểm mở form sửa (§WaypointList), dòng ngày ở Tổng quan vẫn chuyển tab.
- "Thử lại": quay về "Đang tải" (tạo lại bản đồ). Vì nút biến mất, focus chuyển vào `section` của vùng bản đồ (`tabIndex={-1}`) để không rơi về `body`; status sr đọc "Đang tải bản đồ…". Lỗi lần nữa thì hiện lại alert, focus vào nút "Thử lại".
- Ở desktop, tab Tổng quan khi bản đồ lỗi hiện thông tin chung ở cả cột trái và canvas. Chấp nhận trùng lặp này để giữ đúng D-120 (quay về tóm tắt như hiện nay).

### Ghi công (`MapAttribution`, D-114)

- Luôn hiện khi bản đồ sẵn sàng. Tắt `AttributionControl` mặc định (nó tự thu gọn thành nút "i" dưới 640px), dùng thành phần riêng: `p` ở góc dưới phải (`absolute right-inline-sm`), `bg-surface/80 rounded-subtle px-inline-xs text-label text-muted`, xuống dòng được (`max-w-full`), không che nút zoom.
- Nội dung: phần sr-only "Nguồn bản đồ: " rồi ba link `© OpenStreetMap` (`https://www.openstreetmap.org/copyright`) · `OpenFreeMap` (`https://openfreemap.org`) · `OpenMapTiles` (`https://www.openmaptiles.org`), mở tab mới, `rel="noopener noreferrer"`, gạch chân khi hover/focus, focus ring chuẩn. Tên riêng giữ nguyên.
- Vị trí đáy: desktop cách mép dưới 8px. Dưới `lg`: ngay trên mép sheet (đáy = chiều cao phần bị sheet che + 8px; sheet đóng thì nằm trên chip "Lịch trình"); ở mức mở rộng ghi công nằm sau sheet cùng bản đồ.

### Tab Tổng quan (`OverviewPanel`, D-131..D-140)

Chỉ xem (D-137). Không có DaySubtitle, không liệt kê điểm (D-134), không sửa/xóa/kéo thả. Ngoại lệ duy nhất là nút "Thêm điểm đến" (D-138). Thứ tự trong cột/sheet:

```text
DayTabs (sticky)
OverviewSummary          px-stack-md pt-stack-md, flex-col gap-stack-md
──────── border-t ────────
"Các ngày"               h3, Label semibold text-muted, px-stack-md pt-stack-md
ol DayOverviewRow × N    px-stack-md py-stack-md, flex-col gap-inline-sm
thanh "Thêm điểm đến"    sticky bottom (cùng style thanh của tab ngày), luôn hiện ở Tổng quan
```

**`OverviewSummary` (D-133).** `section aria-label="Thông tin chuyến đi"`; tiêu đề là `p` (đúng một `h1` vẫn là tiêu đề trên header). Không hiện điểm đến, sở thích (D-76), ngày kết thúc (UX-03, v2). Bấm chuột/chạm vào vùng (ngoài nút) mở "Thông tin chuyến đi" (D-17), bàn phím dùng nút.

| Phần | Từ `lg` (cột 400px) | Dưới `lg` (trong sheet) |
|------|---------------------|-------------------------|
| Ảnh bìa | Full width `aspect-(--itinerary-cover-ratio) rounded-container`, chuỗi dự phòng như §ItineraryCard; không có ảnh nào thì nền `surface-muted` + icon `ImagePlus` + `Button secondary sm` "Thêm ảnh bìa" (như `TripSummary`) | Ảnh thu nhỏ `w-(--overview-cover-thumb-width)` tỉ lệ 16:9 `rounded-container shrink-0` bên trái hàng đầu; không có ảnh thì nền `surface-muted` + icon `ImagePlus` 20px `text-subtle`, không có nút (đã có "Sửa thông tin") |
| Hàng 1 | `Badge` "Nháp"/"Đã xuất bản" · "Khởi hành {dd/MM/yyyy}" (bỏ khi không có), Label regular `text-muted` | Cạnh ảnh thu nhỏ, cùng nội dung |
| Tiêu đề | Heading 20px semibold, `break-words` | Body semibold, `line-clamp-2`, cạnh ảnh thu nhỏ dưới hàng 1 |
| Mô tả | Body `text-muted whitespace-pre-line line-clamp-4`; không có thì không render | Body `text-muted whitespace-pre-line line-clamp-2`, full width |
| Hàng 2 | "{n} ngày · {m} điểm · {km}" (Label regular `text-muted tabular-nums`). `m` không tính điểm đang chờ xóa; `m = 0` thì "Chưa có điểm"; km của BE (`totalDistanceKm`), bằng 0 hoặc null thì bỏ | Như trái |
| Nút | `Button secondary size="sm"` icon `Pencil` "Sửa thông tin" | Như trái |

**`DayOverviewRow` (D-135).** `li` chứa một `button type="button"` full width, `min-h-touch rounded-container border border-border bg-surface px-stack-md py-stack-sm`, `flex items-start gap-inline-sm text-left`:

```text
[● chấm màu 12px, aria-hidden] [cột min-w-0 flex-1                     ] [ChevronRight 16px text-muted, aria-hidden]
                               dòng 1 "Ngày 2 · Phố cổ Hội An"  Body semibold truncate (không phụ đề: "Ngày 2")
                               dòng 2 "3 điểm · 12,4 km"        Label regular text-muted tabular-nums
                                      ("3 điểm" khi km 0/null; "Chưa có điểm" khi ngày không có điểm)
```

| Trạng thái dòng | Hiển thị |
|-----------------|----------|
| Mặc định | Như trên |
| Hover (chuột) | `bg-surface-muted`; desktop: nhấn mạnh ngày trên bản đồ |
| Focus (bàn phím) | Focus ring chuẩn; desktop: nhấn mạnh ngày trên bản đồ |
| Ngày của pin đang chọn | `ring-2 ring-inset ring-text`, cuộn vào khung |
| Vừa thêm điểm vào ngày này từ Tổng quan | `bg-primary-subtle border-primary-border` 1500ms rồi về mặc định (cùng quy tắc "Vừa thêm" và reduced motion của §WaypointList) |

- Chấm màu: `size-(--map-day-dot-size) rounded-pill bg-map-day-N shrink-0`, căn giữa dòng 1 (dịch xuống bằng `mt-inline-xs`).
- Tên truy cập (`aria-label`, hàm thuần ghép từ phần có dữ liệu): "Xem Ngày {N}: {phụ đề}, {X} điểm, {Y} km"; bỏ ": {phụ đề}" khi không có phụ đề và ", {Y} km" khi không có km; ngày không có điểm: "Xem Ngày {N}, chưa có điểm".
- `ol aria-label="Tóm tắt các ngày"`. Vẽ đủ dải Ngày 1 → ngày lớn nhất, kể cả ngày thưa (D-28).
- Bấm (chuột, Enter, Space): chuyển sang tab Ngày N và focus vào tab đó (D-135). Nhấn mạnh khi rê/focus chỉ áp dụng từ `lg`; dưới `lg` không có.

**Nút "Thêm điểm đến" ở Tổng quan (D-138).** `Button secondary` full width icon `Plus` "Thêm điểm đến" trong thanh sticky dưới, luôn hiện ở Tổng quan (kể cả lịch trình chưa có điểm). Mở `WaypointFormDialog` chế độ thêm có ô "Ngày", mặc định ngày cuối (§WaypointFormDialog). Nhãn dùng lại copy sẵn có "Thêm điểm đến" (CONTEXT gọi tắt là nút "Thêm điểm"); "điểm đến" trong editor là waypoint, đúng thuật ngữ đã thống nhất.

### Bàn phím và trình đọc màn hình (D-128)

- Danh sách bên trái (tab ngày) và các dòng ngày (Tổng quan) là đường chính để chọn điểm/ngày bằng bàn phím. Mọi việc làm được bằng pin đều làm được từ danh sách: chọn điểm (nút chính của thẻ), xem ngày (dòng ngày), sửa (menu ⋯).
- Vùng bản đồ: `section aria-labelledby` trỏ `h2.sr-only` "Bản đồ lịch trình". Canvas có `aria-label` "Bản đồ lịch trình. Dùng phím mũi tên để di chuyển, phím cộng và trừ để phóng to, thu nhỏ." và `aria-describedby` trỏ câu sr-only "Danh sách điểm đến trong lịch trình có cùng nội dung với bản đồ." Pin và nhãn pin `aria-hidden`.
- Thứ tự Tab theo DOM: header → cột/sheet timeline (tab, nội dung, nút thêm) → canvas bản đồ → "Phóng to" → "Thu nhỏ" → ba link ghi công. Desktop: cột trái đứng trước canvas trong DOM (như cũ). Mobile: giữ thứ tự đã duyệt header → nền (nay là bản đồ: canvas, nút zoom, ghi công) → sheet; sheet không modal không trap focus (như cũ).
- Thẻ điểm đang chọn: `aria-current="true"`. Dòng ngày không dùng `aria-current` (chỉ là làm nổi tạm thời).
- Reduced motion: không bay, không chuyển màu dần, không đổi kích thước pin có hoạt ảnh, cuộn danh sách không mượt.

### Hằng bản đồ (app constant, không phải token)

| Hằng | Giá trị | Dùng ở |
|------|---------|--------|
| `MAP_MOVE_MS` | 480 | `easeTo`/`fitBounds`; 0 khi reduced motion |
| `MAP_LOAD_TIMEOUT_MS` | 15000 | Chưa `load` sau mốc này thì chuyển sang lỗi |
| `MAP_MAX_ZOOM` | 18 | Phóng to tối đa |
| `FIT_MAX_ZOOM` / `SINGLE_POINT_ZOOM` | 15 / 14 | Canh khung |
| Padding canh khung | Desktop 64px mỗi cạnh; dưới `lg` trên 64, hai bên 32, dưới = phần bị che + 32 | §Đồng bộ chọn và canh khung |
| `VIETNAM_VIEW_BOUNDS` | xấp xỉ [[101.5, 5.5], [118.5, 24.0]] (lng, lat) | Mức thu nhỏ tối đa; căn khi không có điểm đến |
| Đường nối | rộng 4px, `line-opacity` 0.9 (thường) / `--map-dimmed-opacity` (mờ) | §Đường nối |
| Bước zoom của nút | 1 mức | `MapZoomControls` |
| Khung bao 34 tỉnh | Tâm và bbox xấp xỉ, dữ liệu tĩnh trong `static-destination-catalog.ts` (D-121) | Căn khi chưa có điểm |

### Tách component (coding-rules S, I, D)

- `TripMap` (trình bày, đặt ở `ui-web` theo Claude's Discretion của CONTEXT, nhận dữ liệu qua props, không gọi API, không chứa copy nghiệp vụ; nhãn nút zoom có mặc định "Phóng to"/"Thu nhỏ" và cho ghi đè qua `labels`): nhận danh sách pin đã tính sẵn (tọa độ, số, chỉ số màu, trạng thái), danh sách đường, khung cần canh, vùng an toàn, `onPinSelect`, `onBackgroundClick`, `onStatusChange`. Giữ ≤ 7 prop bằng cách gom phần hiển thị phụ vào `labels`/`insets`.
- `EditorMapArea` (app, container): nối state editor (tab, điểm đang chọn, ngày đang rê, mức sheet) với `TripMap`, chọn hiển thị theo trạng thái tải/lỗi bằng prop `visible` (`MapStatusOverlay visible={chưa có điểm}`, `TripSummary` dự phòng `visible={lỗi}`), không dùng `? :`/`&&` để ẩn hiện trong JSX.
- Phép biến đổi lịch trình thành pin, đường, khung canh, nhấn mạnh, tab mặc định, chỉ số màu, chuỗi tóm tắt dòng ngày là hàm thuần ở domain `itinerary`, có test.
- `OverviewSummary` và `DayOverviewRow` nhận đúng trường cần dùng (không truyền cả `itinerary` vào `DayOverviewRow`).

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
| Dòng đã xuất bản (D-41) | ~~"Thay đổi hiển thị ngay với người xem"~~ (đã bỏ theo yêu cầu user 2026-10-30) |
| Giải thích Xuất bản (D-38) | "Thêm ít nhất 1 điểm đến để xuất bản" |
| Tóm tắt | "Sửa thông tin", "Thêm ảnh bìa" |
| Tab ngày | "Ngày {N}", nút "Thêm ngày" |
| Phụ đề (D-29) | Placeholder "Thêm phụ đề cho ngày này"; `aria-label` "Thêm phụ đề cho Ngày {N}" / "Sửa phụ đề Ngày {N}: {phụ đề}" / "Phụ đề Ngày {N}" |
| Danh sách waypoint | `aria-label` "Điểm đến Ngày {N}"; tay cầm "Kéo để sắp xếp {tên}"; menu "Thao tác cho "{tên}"", "Sửa", "Xóa" |
| Form tạo: khung (D-62, D-66, D-12) | Title "Lịch trình mới"; nút "Tạo lịch trình" / "Đang tạo…"; "Hủy"; nút X Sheet "Đóng" (sẵn có) |
| Form tạo: tiêu đề khối (D-72) | "Điểm đến", "Tên chuyến đi", "Thời gian", "Sở thích" |
| Form tạo: tóm tắt khối (D-63) | Điểm đến: "{Tên điểm đến}" / "Chưa chọn"; Tên: "{tên}" / "Chưa đặt tên"; Thời gian: "{N} ngày" / "{N} ngày, từ {dd/MM/yyyy}"; Sở thích: "{nhãn}, {nhãn}" / "Chưa chọn". Khi khối lỗi: thông điệp lỗi của ô (bảng Lỗi validate) |
| Form tạo: Điểm đến (D-59, D-60) | Nhãn ô tìm "Tìm điểm đến"; placeholder "Tìm tỉnh, thành phố, ví dụ Đà Lạt"; nút "Xóa tìm kiếm" (sẵn có); nhãn nhóm "Phổ biến", "Tất cả", "Kết quả tìm kiếm"; dòng alias "gồm {alias}"; status sr "{n} kết quả" / "Không có kết quả"; empty heading "Không tìm thấy "{từ khóa}"", body "Thử tên tỉnh, thành phố mới hoặc tên cũ, ví dụ Đà Lạt." |
| Form tạo: Tên (D-93) | Nhãn "Tên chuyến đi"; mô tả "Tên tự đổi theo điểm đến cho tới khi bạn sửa."; mặc định "Chuyến đi {Tên điểm đến}" / "Chuyến đi mới" |
| Form tạo: Thời gian (D-73..D-75) | Nhãn "Ngày khởi hành", mô tả "Không bắt buộc.", nút xóa "Xóa Ngày khởi hành"; nhãn "Số ngày", mô tả "Từ 1 đến 30 ngày.", hậu tố "ngày", nút "Giảm số ngày", "Tăng số ngày" |
| Form tạo: Sở thích (D-70) | Nhóm `aria-label` "Sở thích"; mô tả "Chọn một hoặc nhiều. Không bắt buộc."; chip "Lịch sử & Văn hóa", "Thiên nhiên", "Mua sắm", "Ẩm thực & Đồ uống", "Giải trí", "Sức khỏe", "Khác" |
| Form waypoint | Title "Thêm điểm đến vào Ngày {N}" / "Sửa điểm đến"; nhãn "Tên", "Vị trí", "Địa chỉ", "Ghi chú"; mô tả vị trí "Dán tọa độ (ví dụ 10.7769, 106.7009) hoặc link Google Maps."; "Đã lấy tên từ link, bạn có thể sửa."; nút "Thêm điểm đến" / "Đang thêm…", "Lưu" / "Đang lưu…", "Hủy", "Xóa điểm đến" |
| Vị trí (D-21) | "Đã nhận: {lat}, {lng}"; "Đang đọc link…" |
| Dialog Thông tin chuyến đi (D-87..D-91) | Title "Thông tin chuyến đi"; nút X "Đóng" (Dialog và Sheet); nhãn "Tiêu đề", "Mô tả", "Ngày khởi hành", "Ảnh bìa"; nút xóa "Xóa Ngày khởi hành". Không còn nút "Lưu", "Đang lưu…", "Hủy", "Xóa Ảnh bìa" |
| Tự lưu lỗi (D-90) | `InlineAlert` "Chưa lưu được thay đổi. {thông điệp `selectErrorMessage`}" + nút "Thử lại". Đóng form khi còn lỗi: chỉ báo "Lỗi – Thử lại" + toast lỗi theo `selectErrorMessage` |
| Lưới ảnh bìa (D-82, D-85, D-86) | Mô tả "Tối đa 5 ảnh. Chọn một ảnh để hiển thị."; ô ảnh "Ảnh bìa {N}, đang hiển thị" / "Chọn ảnh {N} làm ảnh bìa"; nút xóa "Xóa ảnh bìa {N}"; nút thêm (ngoài radiogroup): chữ "Thêm ảnh", `aria-label` "Thêm ảnh bìa"; ghi chú "Đã đủ 5 ảnh. Xóa một ảnh để thêm ảnh khác.", "Chưa có ảnh bìa. Lịch trình đang dùng ảnh mặc định.", "Chưa có ảnh bìa."; sr "Không tải được ảnh từ link này"; live "Đã thêm ảnh bìa {N}", "Đã xóa ảnh bìa {N}" |
| Khung Link ảnh (D-84) | Nhãn "Link ảnh"; mô tả "Dán link ảnh bắt đầu bằng https://"; nút xóa trong ô "Xóa link ảnh"; preview alt "Xem trước ảnh bìa"; "Không tải được ảnh từ link này"; nút "Thêm", "Hủy" |
| Khôi phục bản nháp (D-36) | "Đã khôi phục nội dung chưa lưu" (form waypoint; form metadata chỉ khi planner giữ bản nháp, xem §TripInfoDialog) |
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

**Bổ sung 2026-11-05 (bản đồ và tab Tổng quan):**

| Element | Copy |
|---------|------|
| Tab Tổng quan (D-131, D-140) | "Tổng quan"; dòng 2 "{x} km"; tên truy cập "Tổng quan, {x} km" / "Tổng quan" |
| Vùng bản đồ (D-128) | `h2.sr-only` "Bản đồ lịch trình"; canvas `aria-label` "Bản đồ lịch trình. Dùng phím mũi tên để di chuyển, phím cộng và trừ để phóng to, thu nhỏ."; mô tả sr "Danh sách điểm đến trong lịch trình có cùng nội dung với bản đồ." |
| Nút zoom (D-128) | Nhóm "Thu phóng bản đồ"; "Phóng to"; "Thu nhỏ" |
| Ghi công (D-114) | sr "Nguồn bản đồ: "; link "© OpenStreetMap", "OpenFreeMap", "OpenMapTiles" (tên riêng) |
| Nhãn quần đảo (D-113, chuỗi khóa) | "Quần đảo Hoàng Sa (Việt Nam)"; "Quần đảo Trường Sa (Việt Nam)" |
| Nhãn cạnh pin (D-125, D-136) | Tab ngày: "{tên}"; Tổng quan: "{tên}" + "Ngày {N}" |
| Thẻ điểm khi bản đồ hiển thị (D-126) | Mô tả sr "Nhấn để xem trên bản đồ" |
| Đang tải bản đồ | sr "Đang tải bản đồ…" |
| Chưa có điểm (D-121, chuỗi khóa) | "Thêm điểm đến để thấy trên bản đồ" |
| Lỗi bản đồ (D-120) | "Không tải được bản đồ" + "Bạn vẫn sửa lịch trình như bình thường." + nút "Thử lại" (`aria-label` "Thử tải lại bản đồ") |
| Thông tin chung (D-133) | Vùng "Thông tin chuyến đi"; "Khởi hành {dd/MM/yyyy}"; "{n} ngày · {m} điểm · {x} km"; "{n} ngày · Chưa có điểm"; "Sửa thông tin"; "Thêm ảnh bìa" |
| Danh sách ngày ở Tổng quan (D-135, chuỗi khóa) | Tiêu đề "Các ngày"; danh sách `aria-label` "Tóm tắt các ngày"; dòng 1 "Ngày {N} · {phụ đề}" / "Ngày {N}"; dòng 2 "{X} điểm · {Y} km" / "{X} điểm" / "Chưa có điểm"; tên truy cập "Xem Ngày {N}: {phụ đề}, {X} điểm, {Y} km" (bỏ phần trống) / "Xem Ngày {N}, chưa có điểm" |
| Thêm từ Tổng quan (D-138) | Nút "Thêm điểm đến"; title form "Thêm điểm đến"; nhãn ô "Ngày"; lựa chọn "Ngày {N}" / "Ngày {N} · {phụ đề}"; live region "Đã thêm {tên} vào Ngày {N}" (sẵn có) |

Phần mới không có hành động phá hủy. Không có chuỗi tiếng Anh hiển thị cho người dùng, trừ tên riêng trong ghi công.

### Lỗi validate client (Zod)

| Field | Điều kiện | Copy |
|-------|-----------|------|
| Điểm đến (form tạo) | chưa chọn | "Vui lòng chọn điểm đến." |
| Tên chuyến đi (form tạo) | rỗng sau trim (chỉ xảy ra khi chưa blur; blur thì điền lại mặc định) | "Vui lòng nhập tên chuyến đi." |
| Tên chuyến đi (form tạo) | > 100 ký tự | "Tên chuyến đi tối đa 100 ký tự." |
| Số ngày (form tạo) | ngoài 1–30 (chỉ khi BE trả về; client kẹp khi blur) | "Số ngày từ 1 đến 30." |
| Link ảnh (khung thêm ảnh) | đã có trong danh sách | "Ảnh này đã có trong danh sách." |
| Lưới ảnh bìa | BE từ chối vì quá 5 ảnh | "Chỉ lưu được tối đa 5 ảnh bìa." |
| Tiêu đề (metadata) | rỗng sau trim | "Vui lòng nhập tiêu đề." |
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
| Vị trí | link Google Maps không chứa tọa độ (gồm link POI rút gọn, D-48) | "Link này chỉ có tên địa điểm, không có tọa độ. Trong Google Maps, nhấn giữ vào địa điểm để lấy tọa độ rồi dán vào đây." (vẫn tự điền Tên/Địa chỉ theo D-49) |
| Vị trí | resolve link rút gọn thất bại (timeout, quá số bước, host lạ, lỗi mạng) | "Không mở được link rút gọn này. Thử dán link đầy đủ hoặc tọa độ." |
| Địa chỉ | > 500 ký tự | "Địa chỉ tối đa 500 ký tự." |
| Ghi chú | > 2000 ký tự | "Ghi chú tối đa 2000 ký tự." |

Mã lỗi BE cần thêm vào `ERROR_MESSAGES` (planner chốt câu cuối cùng theo giọng D-16 Phase 2): `Itinerary.NotFound` "Không tìm thấy lịch trình.", `Itinerary.Forbidden` "Bạn không có quyền sửa lịch trình này.", `Itinerary.CannotPublishEmpty` "Thêm ít nhất 1 điểm đến để xuất bản.", `Itinerary.InvalidDayNumber` "Ngày không hợp lệ.", `Itinerary.InvalidReorderList` (không hiện câu này, xử lý bằng toast D-37), `Waypoint.NotFound` "Điểm đến không còn tồn tại."

Mã lỗi BE đề xuất cho phần mở lại (D-57; mã cuối cùng theo tài liệu hợp đồng BE sau khi user sửa BE): `Itinerary.DestinationUnknown` "Điểm đến không hợp lệ. Vui lòng chọn lại." (khối Điểm đến), `Itinerary.DayCountOutOfRange` "Số ngày từ 1 đến 30." (khối Thời gian), `Itinerary.InterestUnknown` "Có sở thích không hợp lệ. Vui lòng chọn lại." (khối Sở thích), lỗi vượt giới hạn danh sách ảnh "Chỉ lưu được tối đa 5 ảnh bìa." (dưới lưới), lỗi link ảnh không hợp lệ "Link ảnh phải bắt đầu bằng https://." (dưới lưới), lỗi ảnh đang chọn không nằm trong danh sách: không hiện câu riêng, refetch rồi dùng câu chung của `selectErrorMessage`.

**Hai nghĩa của "điểm đến".** Theo D-60/D-72 khối đầu của form tạo tên là "Điểm đến" (tỉnh/thành của chuyến đi), còn trong editor "điểm đến" là waypoint (giữ từ các phase trước). Hai nghĩa không gặp nhau trên cùng màn hình: form tạo không có waypoint, editor không hiện điểm đến của chuyến đi (D-76). Copy mới trong editor (lưới ảnh bìa) cố ý không dùng từ này cho tỉnh/thành.

Giọng văn theo Phase 1/3: tiếng Việt trung tính, câu ngắn, không dấu chấm than; lỗi field có dấu chấm cuối; toast, nhãn nút, chỉ báo lưu không có dấu chấm cuối. Thuật ngữ thống nhất: "lịch trình", "điểm đến" (không dùng "waypoint", "điểm dừng" trong UI), "Ngày N", "xuất bản", "nháp".

---

## Accessibility Checklist (bổ sung Phase 1/3)

- Mỗi trang đúng một `h1` (danh sách: "Lịch trình của tôi"; editor: tiêu đề trên header). Dialog/Sheet có title; form `aria-labelledby` trỏ title.
- Thẻ lịch trình: một link duy nhất (tiêu đề) + một nút menu; không lồng phần tử tương tác. Thẻ waypoint: tay cầm, nút chính, nút menu tách rời.
- Tabs (lọc, ngày) theo pattern Base UI: ←/→, Home/End, `aria-selected`; nút "Thêm ngày" ngoài roving focus.
- Mọi icon button có `aria-label` (back, ⋯, tay cầm, nút X trong ô "Xóa Ngày khởi hành", "Xóa link ảnh", nút X xóa ảnh "Xóa ảnh bìa {N}", nút X "Đóng" của Dialog/Sheet, nút −/+ "Giảm số ngày"/"Tăng số ngày").
- `aria-disabled` cho "Xuất bản" kèm `aria-describedby` giải thích; không dùng `disabled` thật (D-38).
- Live region: chỉ báo lưu, dòng trạng thái vị trí, `SubmitStatus`, live region editor (thêm điểm), announcements dnd-kit, status tải. Toast hoàn tác `role="status"` và tới được bằng bàn phím (vùng toast của Sonner có phím tắt và nút có thể Tab tới).
- Dialog xác nhận phá hủy và xuất bản đặt focus đầu ở "Hủy"/"Ở lại"; trả focus đúng chỗ theo các quy tắc ở trên sau khi đóng.
- Sheet timeline không modal: không trap focus; Tab đi từ header → nền → sheet theo thứ tự DOM. Sheet form modal: trap focus như Phase 1.
- Vùng chạm ≥ 44px: tay cầm 44×44, icon button, tab ngày, nút phụ đề, nút "Thêm ngày", mục menu, nút trong toast, nút chỉ báo lỗi (`size="sm"` có hit area 44).
- `prefers-reduced-motion`: không cuộn mượt, không chuyển màu làm nổi, dịch chỗ khi kéo 0ms (token motion đã về 0).
- Smoke ở 320×568, 390×844, 768×1024, 1440×900: không overflow ngang; header editor không bị sheet che ở cả ba mức; bàn phím ảo không che nút gửi trong Sheet form; tên dài cắt ellipsis ở header, xuống dòng trong tóm tắt và dialog.

**Bổ sung 2026-10-30 (form tạo, lưới ảnh bìa, tự lưu):**

- Accordion theo Base UI: mỗi trigger là `button` trong `h3` (`Accordion.Header`) có `aria-expanded`, `aria-controls`; panel có `role="region"` và `aria-labelledby` trỏ trigger (mặc định Base UI). Không có roving focus giữa các trigger (APG mới): Tab đi lần lượt; Enter/Space bật tắt. Panel đóng có `hidden`, không nhận Tab.
- Tên truy cập của trigger gồm tiêu đề và dòng tóm tắt (hoặc thông điệp lỗi). Dấu lỗi không chỉ bằng màu: có icon và câu lỗi.
- Không để focus rơi về `body`: tự chuyển khối thì focus tới trigger khối kế; lỗi khi gửi thì focus ô lỗi sau khi panel mở; xóa ảnh thì focus theo quy tắc ở §CoverImageField.
- Live region: lỗi field (`FormFieldError` gắn `aria-describedby`, thông báo qua `aria-invalid` + mô tả), `InlineAlert` lỗi (`role="alert"`), số kết quả tìm điểm đến (`role="status"`), ghi chú dưới lưới ảnh và "Đã thêm/Đã xóa ảnh bìa {N}" (`aria-live="polite"`), lỗi BE dưới lưới ảnh (`role="alert"`), `SubmitStatus`.
- Bàn phím: danh sách điểm đến và các ô có ảnh của lưới ảnh là radio group (Tab một điểm dừng, mũi tên di chuyển và chọn, Space chọn). Radiogroup ảnh bìa chỉ chứa radio; nút X và nút "Thêm ảnh bìa" là anh em đứng sau nó trong DOM, mỗi nút một điểm dừng Tab (thứ tự ở §CoverImageField); chip sở thích là toggle group (mũi tên di chuyển, Space/Enter bật tắt, `aria-pressed`); bộ đếm ngày (↑/↓, Shift+↑/↓, Home/End, gõ số). Enter trong form tạo không gửi form.
- Vùng chạm ≥ 44px: trigger khối (`min-h-touch`), dòng điểm đến, chip, nút −/+ (48px), nút X xóa ảnh, ô "Thêm ảnh", nút "Thêm"/"Hủy" (`min-h-touch` sẵn có của `Button`), nút X của Dialog.
- `prefers-reduced-motion`: không hoạt ảnh chiều cao panel và xoay chevron, cuộn khối vào khung không mượt.
- Ảnh trong lưới là nội dung của radio có tên truy cập riêng, nên `<img alt="">`. Preview trong khung "Link ảnh" có `alt="Xem trước ảnh bìa"`.
- Smoke bổ sung: form tạo ở 320×568 với khối Điểm đến mở (chân form luôn thấy, không overflow ngang); bàn phím ảo mở ở ô Tên (chân form một hàng không che ô); lưới ảnh 2 cột ở 320px, 3 cột từ `sm`, nút X không che hết ô.

**Bổ sung 2026-11-05 (bản đồ, tab Tổng quan):**

- Mọi việc làm được bằng pin đều làm được bằng bàn phím từ danh sách hoặc dòng ngày (WCAG 2.1.1); pin và nhãn pin `aria-hidden`, không nhận focus (D-128).
- Vùng bản đồ là `section` có heading sr-only; canvas có `aria-label` tiếng Việt và mô tả trỏ về danh sách; nút "Phóng to"/"Thu nhỏ" là `IconButton` 44×44px có `aria-label`, `disabled` ở biên zoom; ghi công là link có focus ring.
- Tab "Tổng quan" là `TabsTrigger` đầu tiên trong roving focus (←/→, Home/End); chấm màu `aria-hidden`; tên truy cập tab không đổi theo màu.
- Dòng ngày là `button` có tên truy cập đầy đủ ("Xem Ngày 2: …"); Enter/Space chuyển tab và focus vào tab mới, không để focus rơi về `body`. Thẻ điểm đang chọn có `aria-current="true"`.
- Ô "Ngày" của form thêm từ Tổng quan có nhãn "Ngày", là `Select` theo Base UI (mũi tên, Enter, Esc, gõ chữ để nhảy); focus ban đầu vẫn ở ô Tên.
- Màu không là kênh duy nhất: pin có số, nhãn Tổng quan ghi "Ngày N", chấm màu đi cùng chữ "Ngày N", pin chọn có vòng viền đậm và lớn hơn. Số trắng trên pin ≥ 4.99:1; pin trên nền ≥ 3.84:1 (đồ họa ≥ 3:1).
- Trạng thái bản đồ đọc được: "Đang tải bản đồ…" (`role="status"`), lỗi là `InlineAlert info` (`role="status"`) có nút "Thử lại"; sau "Thử lại" focus vào `section` bản đồ.
- `prefers-reduced-motion`: canh khung, di chuyển tới điểm, nút zoom đều nhảy thẳng; pin đổi kích thước và dòng "vừa thêm" không có hoạt ảnh.
- Smoke ở 320×568, 390×844, 768×1024, 1440×900: không overflow ngang; nút zoom và chip gợi ý không chồng nhau ở 320px; ghi công thấy được ở mức sheet thấp/vừa và khi sheet đóng (không bị chip "Lịch trình" che); header không bị sheet che; nhãn tên dài cắt ellipsis trong 240px.

---

## Testing Contract (UI)

| Đối tượng | Test bắt buộc |
|-----------|---------------|
| `notify.undoable` | Không tự đóng sau 10 giây (fake timers); action gọi một lần + đóng; nút đóng gọi `onDismiss`; `dismiss(id)` đóng; `role="status"` |
| `InlineAlert variant="info"` | `role="status"`, không render khi rỗng; `danger` giữ `role="alert"` |
| `Sheet dismissible/defaultSnap/insetTop` | Esc và vuốt không đóng khi `dismissible={false}`; không có nút "Thu gọn bảng", "Mở rộng bảng", "Đóng bảng" ở mọi vị trí; mức mở đầu theo `defaultSnap`; `resolveSnapPoints(vh, insetTop)` bảng giá trị (gồm 568 và 844 với header 108/64) |
| `UserMenu compact` | Chỉ avatar ở mọi breakpoint, `aria-label` giữ nguyên |
| `MyItinerariesView` | Tab đọc/ghi `?status`, giá trị lạ → Tất cả; skeleton trang đầu; ErrorState + Thử lại khi trang đầu lỗi; EmptyState đúng copy từng tab, chỉ Tất cả có CTA; sentinel gọi `fetchNextPage`; trang kế lỗi không render nút/thông báo, sentinel lần sau gọi lại; hết trang không render gì |
| `ItineraryCard` | Link tới editor; menu Mở/Xóa; ẩn km = 0, ẩn ngày khởi hành khi null; ảnh lỗi → nền dự phòng; không hiện số ngày/điểm |
| `CreateItineraryDialog` (form 4 khối) | Mở là khối Điểm đến mở, các khối khác đóng; chỉ một khối mở; mở khối bất kỳ; tóm tắt đúng copy từng khối; chọn điểm đến bằng chuột/Space thì đóng và mở khối Tên, focus ở trigger Tên; đổi bằng mũi tên không tự chuyển; Sở thích và Thời gian không tự chuyển; Enter ở ô Tên/ô tìm/ô số không gửi; tên mặc định đổi theo điểm đến tới khi sửa, xóa trắng rồi blur điền lại; gửi khi chưa chọn điểm đến mở khối Điểm đến, focus dòng đầu nhóm Phổ biến, hiện "Vui lòng chọn điểm đến."; lỗi BE theo mã mở đúng khối; một request duy nhất với đủ trường; "Đang tạo…" + chặn gửi lần hai + khóa đóng; cold start 5s; lỗi chung là `InlineAlert`; thành công điều hướng, không toast; đóng giữa chừng không hỏi và mở lại là form mới |
| `DestinationBlock` | Hai nhóm khi không tìm (8 phổ biến theo hạng D-61, 34 theo chữ cái); tìm không dấu ("da lat", "Đà Lạt", "DA LAT" cùng kết quả); khớp alias hiện "gồm {alias}"; thứ tự kết quả; trống kết quả hiện empty state và status "Không có kết quả"; Esc xóa chữ không đóng modal; Enter chọn kết quả đầu |
| `TripDatesBlock` / `NumberStepper` | Mặc định 3; −/+ đổi giá trị, disabled ở 1 và 30; gõ 45 rồi blur kẹp về 30; để trống rồi blur trả giá trị trước; `aria-roledescription` tiếng Việt; nhãn "Giảm số ngày"/"Tăng số ngày"; ngày khởi hành tùy chọn, xóa được, không chặn ngày quá khứ |
| `InterestsBlock` / `ToggleChipGroup` | 7 chip đúng thứ tự; bật nhiều chip; `aria-pressed`; mũi tên di chuyển, Space bật tắt; tóm tắt theo thứ tự danh sách |
| `Accordion` / `ToggleChip` / `RadioGroup` / `InlineAlert action` / `DialogContent showCloseButton` / `Sheet fixedSnap` | Theo cột Contract ở Component Inventory |
| `EditorHeader` / `SaveIndicator` | 4 trạng thái theo mutation; bấm "Lỗi – Thử lại" gửi lại đúng thao tác; ẩn Xuất bản khi đã xuất bản; không còn dòng D-41 (đã bỏ) |
| `PublishButton` / `PublishDialog` | `aria-disabled` + describedby khi 0 điểm (tính cả điểm đang chờ xóa); focus đầu ở Hủy; loading; lỗi inline; thành công đổi badge, ẩn nút, toast |
| `DeleteItineraryDialog` | Câu thêm khi đã xuất bản; focus đầu ở Hủy; danger + loading; điều hướng + toast |
| `DayTabs` | Vẽ đủ dải ngày thưa; km dòng 2; Thêm ngày optimistic + chọn + focus, rollback khi lỗi |
| `DaySubtitle` | Enter/blur lưu, Esc hủy, rỗng → null, > 100 báo lỗi, không đổi không gửi |
| `WaypointList` | Xóa ẩn ngay + toast; hoàn tác trả đúng vị trí, không gọi BE; 5s gửi DELETE; xóa thứ hai commit lệnh thứ nhất; kéo khi đang chờ thì flush trước; reorder bằng bàn phím (Space/↑/↓/Space, Esc) + announcements tiếng Việt; rollback khi lỗi; `InvalidReorderList` toast info + refetch; focus sau xóa/hoàn tác |
| `WaypointFormDialog` / `LocationField` | Thứ tự field, focus Tên; các mẫu parse (bảng do planner/researcher lập ở domain) hiện "Đã nhận"; tự điền tên khi trống, không ghi đè khi đã có; resolve rút gọn (fake fetch) và lỗi resolve; lỗi khi blur/gửi; khôi phục bản nháp hiện InlineAlert info; Xóa điểm đến từ form chạy luồng hoàn tác |
| `TripInfoDialog` (tự lưu) | Không có nút "Lưu"/"Hủy" và không chân form; Dialog có nút X "Đóng"; gõ tiêu đề rồi chờ 800ms (fake timers) gửi một lệnh; blur gửi ngay; không đổi thì không gửi; tiêu đề trống/quá 100 và mô tả quá 1000 không gửi, lỗi dưới ô; đổi/xóa ngày khởi hành gửi ngay (xóa → `null`); payload dùng giá trị hợp lệ gần nhất của mọi ô; đóng khi còn ô sai thì mở lại thấy giá trị đã lưu; đóng khi còn debounce thì gửi ngay; không hiện "Đang lưu"/"Đã lưu" trong form; lỗi mạng hiện toast lỗi kèm "Thử lại" gửi lại payload mới nhất (một toast, lỗi lặp lại không chồng, thử lại lỗi ngay vẫn còn toast); đóng khi còn lỗi chuyển sang chỉ báo header "Lỗi – Thử lại"; lỗi field BE gắn vào ô |
| `CoverImageField` / `CoverUrlPanel` | Luôn 5 ô; `role="radiogroup"` chỉ chứa phần tử `role="radio"` (không có `button` bên trong, không có phần tử tương tác lồng trong radio); ô đang hiển thị có `aria-checked` và nhãn "Ảnh bìa N, đang hiển thị", ô khác "Chọn ảnh N làm ảnh bìa"; mũi tên đổi ảnh chọn và lưu; thứ tự Tab (`userEvent.tab`): radio đang chọn → "Xóa ảnh bìa 1".."Xóa ảnh bìa n" → "Thêm ảnh bìa" → ô "Link ảnh" → "Hủy" → "Thêm"; X xóa ảnh, xóa ảnh đang chọn thì chọn ảnh đầu còn lại; xóa hết thì không ảnh nào chọn, không ghi ảnh mặc định và hiện ghi chú; focus sau xóa theo 3 trường hợp (X cùng vị trí, X liền trước, nút thêm); thêm ảnh thì focus vào radio mới mà `aria-checked` không đổi; thông báo sr "Đã thêm/Đã xóa ảnh bìa N"; lỗi BE dưới lưới có `role="alert"`; nút "Thêm ảnh bìa" là `button` không phải radio, chỉ có một; đủ 5 ảnh thì không có nút thêm và hiện ghi chú; khung "Link ảnh" mở dưới lưới, focus ô; preview debounce, ảnh lỗi vẫn thêm được; link không https, quá 500, trùng thì báo lỗi; Enter thêm, Esc chỉ đóng khung; thêm vào danh sách rỗng thì ảnh mới được chọn |
| Hàm thuần domain (mới) | Tìm không dấu và alias; sắp xếp kết quả; tên mặc định + cờ đã sửa; kẹp số ngày 1–30; chọn khối lỗi đầu tiên; thao tác danh sách ảnh (thêm, xóa + chọn lại, chọn, trùng, giới hạn 5); ghép payload tự lưu |
| `ItineraryCard` / `TripSummary` (ảnh) | Chuỗi dự phòng: ảnh đang hiển thị → ảnh mặc định của điểm đến → nền dự phòng; ảnh lỗi chuyển bước kế |
| `LeaveEditorDialog` | Hiện khi còn request; tự đóng và đi tiếp khi request xong; focus đầu ở "Ở lại" |
| `EditorForbidden` | Copy D-45, link về `/itineraries/mine` |
| (2026-11-05) Hàm thuần domain bản đồ | `dayColorIndex` lặp 1..8; pin: bỏ điểm đang chờ xóa, số 1-based theo `orderIndex` trên tập hiển thị, ngày đúng; đường: một đường mỗi ngày có ≥ 2 điểm, không nối qua ngày; nhấn mạnh theo bảng §Nhấn mạnh theo tab; khung canh theo tab (mọi điểm, một ngày, ngày trống → mọi điểm, không điểm → bbox tỉnh → `VIETNAM_VIEW_BOUNDS`); tab mặc định D-132; chuỗi dòng ngày và tên truy cập (có/không phụ đề, có/không km, không điểm); hàng meta Tổng quan ("Chưa có điểm", bỏ km 0) |
| (2026-11-05) Style JSON | Mọi lớp chữ dùng `coalesce` `name:vi` → `name`; lớp ranh giới loại `maritime`/`disputed`; nhãn quần đảo gốc của OSM bị lọc; có hai lớp nhãn với đúng chuỗi "Quần đảo Hoàng Sa (Việt Nam)" và "Quần đảo Trường Sa (Việt Nam)"; không lớp POI nào hiện; nguồn tile trỏ OpenFreeMap. Bổ sung, không thay, bước kiểm bằng mắt trong UAT |
| (2026-11-05) Token | 6 token kích thước/độ mờ và 8 token màu ngày tồn tại, trỏ primitive; tương phản mỗi màu ngày với trắng ≥ 4.5:1; class `bg-map-day-N`, `size-(--map-pin-size)` có CSS thật (guard sẵn có) |
| (2026-11-05) `TripMap` / `MapZoomControls` / `MapAttribution` | Map thật thay bằng fake ở jsdom (không có WebGL). Lớp marker `aria-hidden`, pin mờ không bắt sự kiện; bấm pin gọi `onPinSelect`; bấm nền gọi `onBackgroundClick`; nút zoom có nhãn, `disabled` ở biên; ghi công có 3 link và phần sr "Nguồn bản đồ: "; reduced motion gọi đường nhảy thẳng (thời lượng 0) |
| (2026-11-05) `EditorMapArea` | Đang tải: skeleton + status sr; chưa có điểm: chip đúng copy; lỗi (thư viện, WebGL, style, quá 15 giây): `InlineAlert info` đúng copy + "Thử lại" + `TripSummary` dự phòng; "Thử lại" về đang tải và focus vào `section`; tile lỗi sau `load` không chuyển sang lỗi |
| (2026-11-05) `DayTabs` | Tab "Tổng quan" đứng đầu, km dòng 2 khi > 0, tên truy cập; chấm màu `aria-hidden` theo bảng ánh xạ; tab mặc định theo D-132; đổi tab bỏ chọn điểm |
| (2026-11-05) `OverviewPanel` | Thông tin chung đủ trường D-133, không có điểm đến/sở thích/ngày kết thúc; dòng ngày đúng copy cho ngày có/không phụ đề, có/không km, không điểm; bấm dòng chuyển tab và focus tab; rê/focus nhấn mạnh chỉ từ `lg`; bấm pin làm nổi dòng của ngày, không đổi tab; nút "Thêm điểm đến" luôn có và mở form có ô Ngày mặc định ngày cuối; thêm xong ở lại Tổng quan, dòng ngày làm nổi, focus về nút |
| (2026-11-05) `WaypointFormDialog` | Ô "Ngày" chỉ có khi mở từ Tổng quan, đứng đầu, mặc định ngày cuối, liệt kê đủ ngày thưa; title "Thêm điểm đến"; focus ban đầu ở Tên; form thêm từ tab ngày và form sửa không có ô Ngày; gửi đúng `dayNumber` đã chọn |
| (2026-11-05) `WaypointList` | Bản đồ sẵn sàng: nút chính chọn điểm, `aria-current`, mô tả sr; bản đồ lỗi/đang tải: nút chính mở form sửa; menu ⋯ "Sửa" vẫn mở form; xóa điểm đang chọn thì bỏ chọn |
| (2026-11-05) `Sheet snap/onSnapChange` | Controlled đổi mức; `onSnapChange` đúng tên mức; không truyền thì hành vi cũ không đổi |

Test bằng Vitest + Testing Library (jsdom), fake `HttpClient`, không MSW. Không test pixel; kéo bằng chuột/cảm ứng kiểm qua adapter/handler thuần, kéo bằng bàn phím kiểm end-to-end trong jsdom.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Không thêm block mới; phần mở rộng (gồm `Accordion`, `ToggleChip`, `NumberStepper`, `RadioGroup` của đợt 2026-10-30) viết tay trên Base UI 1.8.0 đã có trong repo, theo pattern Phase 1 | not required — official only, `registries: {}` xác nhận 2026-10-24, không đổi 2026-10-30 |
| Third-party | none | not applicable — không khai báo. dnd-kit là thư viện npm (catalog, pin cứng), không phải registry block. (2026-11-05) `maplibre-gl` và, nếu planner chọn, `react-map-gl` cũng là thư viện npm (catalog, pin cứng), không phải registry block; phần mở lại lần 2 không thêm block shadcn nào. `registries: {}` không đổi |

---

## Source Traceability

| Source | Quyết định dùng |
|--------|-----------------|
| `04-CONTEXT.md` | D-01..D-47 (bố cục, infinite scroll im lặng khi lỗi trang kế, tạo nhanh (D-09 đã được D-62.. thay), editor hai vùng/sheet, form, nhập vị trí, lưu, hoàn tác, kéo thả, rời trang, xuất bản không có hộp chia sẻ, 403, toàn bộ copy khóa) |
| `04-CONTEXT.md` (mở lại 2026-10-30) | D-53..D-56 (mã slug, sở thích cố định, `PUT` giữ nguyên, tạo Ngày 1..N), D-59..D-75 và D-92..D-97 (form tạo 4 khối accordion, 34 tỉnh/thành, alias, nhóm Phổ biến/Tất cả, tên mặc định, bộ đếm 1–30, ngày khởi hành tùy chọn, chip sở thích, chân form dính đáy, lỗi mở khối đầu, không xác nhận khi đóng, một request, không khối ảnh), D-76..D-78 (chưa hiện/sửa điểm đến, sở thích), D-79..D-86 và D-99, D-100 (ảnh mặc định, lưới 5 ô, radio, X xóa, khung Link ảnh), D-87..D-91 và D-101 (tự lưu, lỗi lưu, không chân form) |
| `REQUIREMENTS.md` (2026-10-30) | ITIN-02, ITIN-03 viết lại; ROADMAP §Phase 4 tiêu chí 1, 2 |
| `04-CONTEXT.md` (mở lại lần 2, 2026-11-05) | D-111..D-117 (MapLibre + OpenFreeMap, style riêng, Hoàng Sa/Trường Sa, ghi công, chỉ hiển thị, nền sáng, mức thu nhỏ tối đa), D-118..D-121 (bố cục desktop/mobile, lỗi quay về tóm tắt, chưa có điểm căn theo tỉnh), D-122..D-124 (ngày chọn đậm/ngày khác mờ, pin màu theo ngày có số, đường chỉ trong ngày), D-125..D-128 (đồng bộ chọn, canh khung, reduced motion, bàn phím), D-131..D-140 (tab Tổng quan, tab mặc định, thông tin chung, dòng ngày, bấm pin ở Tổng quan, chỉ xem, thêm có ô Ngày, ở lại sau khi thêm, tổng km) |
| `REQUIREMENTS.md` / `ROADMAP.md` (2026-11-05) | PUB-06; ROADMAP §Phase 4 tiêu chí 0. PUB-02, PUB-05 thuộc Phase 5, không có trong spec này |
| `.agents/tasks/map-providers-comparison.md`, openfreemap.org (đọc 2026-11-05) | Rủi ro dữ liệu OSM ở Hoàng Sa; ghi công yêu cầu "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (OpenFreeMap không bắt buộc hiện); `react-map-gl` 8.x hỗ trợ maplibre; MapLibre v6 cần `setWorkerUrl` |
| Codebase scout 2026-11-05 | `EditorLayout` (slot `canvas`/`summary`, `WideBody` có `p-section`, `NarrowBody` có `pb-(--sheet-snap-peek)`, chip "Lịch trình"), `TripSummary` (biến thể `canvas`/`compact`), `DayTabs` (`value` là số, km dòng 2), `TimelinePanel` (thanh "Thêm điểm đến" sticky, `visible`), `WaypointFormDialog` (`mode.kind === "add"` có `dayNumber`, title theo ngày), `Sheet` đã nhận `onSnapPointChange` nội bộ nhưng chưa cho controlled theo tên mức; token guard cấm hex, palette Tailwind, spacing số trong `ui-web` và `apps/web/src/components`; `dark.css` có theme tối |
| Mặc định của researcher (2026-11-05, Claude's Discretion) | Nhãn tên là thẻ gắn marker (không tooltip/popup), chỉ cho pin đang chọn; độ mờ ngày không chọn 0.35; 8 màu ngày (xanh dương, hổ phách, ngọc lục, hồng, tím, lục lam, xanh lá mạ, xám đá) đều ≥ 4.99:1 với số trắng; pin marker HTML 28px/36px, vùng chạm 44px, `aria-hidden`; pin ngày mờ không bấm được; tắt xoay/nghiêng; nút zoom riêng góc trên phải; ghi công riêng (không thu gọn); nút chính của thẻ chọn điểm khi có bản đồ, mở form sửa khi bản đồ lỗi; bấm pin ở Tổng quan cũng đưa sheet về mức vừa; ngày trống canh mọi điểm; ảnh bìa thu nhỏ 112px trong sheet; chấm màu ở tab ngày; ô Ngày đứng đầu form; lỗi bản đồ là `InlineAlert info`; hằng 480ms, 15 giây, zoom 14/15/18, padding 64/32; style nền (màu, cỡ chữ 14/16, ẩn POI); toàn bộ copy phụ mới (aria-label canvas, nút zoom, "Bạn vẫn sửa lịch trình như bình thường.", "Thử tải lại bản đồ", "Các ngày", "Xem Ngày N…") |
| `04-DISCUSSION-LOG.md` | Bối cảnh lựa chọn (chỉ tham khảo): accordion thay wizard, "chỉ báo khi lưu lỗi", "không có nút" ở chân form |
| Base UI 1.8.0 (`node_modules/@base-ui/react`, đọc `.d.ts`) | `Accordion.Root` (`value`, `multiple` mặc định false, `keepMounted`, `disabled`; roving focus đã bỏ theo APG), `Accordion.Header` render `h3`, CSS var `--accordion-panel-height`; `NumberField.Root` (`min`, `max`, `step`, `largeStep`, `allowWheelScrub`, `onValueCommitted`); `RadioGroup` (`value`, `onValueChange` kèm `eventDetails`); `ToggleGroup` (`multiple`, `loopFocus`) |
| Codebase scout 2026-10-30 | `create-itinerary-dialog.tsx` (một ô, `Dialog size="sm"`), `trip-info-dialog.tsx` (Lưu/Hủy, một ô URL ảnh, preview 400ms), `responsive-form-surface.tsx` (không có X ở Dialog, Sheet `expanded` nhiều mức), `Sheet` có X cuộn cùng nội dung và `closeDisabled`, `Input` có `allowClear`/`clearLabel` và icon lịch cho `type="date"`, `SearchInput` có nút "Xóa tìm kiếm" và Esc xóa chữ, `Button`/`AddButton` có `visible`, `InlineAlert` chưa có `action`, `IconButton` luôn ≥ 44px, `SaveIndicator` đọc `useIsMutating` trên key ghi chung; theme đã có `z-sticky`/`z-modal` và `text-muted`/`text-subtle`/`text-disabled` |
| `01-UI-SPEC.md` | Token, typography, spacing, màu, accent, focus ring, state matrix, Sheet snap, EmptyState/ErrorState, Toast, 404 |
| `03-UI-SPEC.md` | `loadingLabel`, `SubmitStatus`, `InlineAlert`, validate blur + gửi, focus field lỗi, giọng lỗi field, `DropdownMenuLinkItem`, link dạng `buttonVariants` |
| `REQUIREMENTS.md` | ITIN-01..14 (ITIN-11 theo ghi chú D-40) |
| Codebase scout | `notify` ép 8 giây và không có `duration`; `InlineAlert` chỉ có `danger`; `Sheet` (lúc khảo sát) luôn có "Đóng bảng", mở mặc định 0.6, expanded 0.92 viewport (sẽ che header editor); `ErrorState` copy cố định; `FormFieldLabel required` hiện "(bắt buộc)"; `SubmitStatus` đang nằm trong `modules/identity/ui`; `Card` interactive là `<button>` (không chứa được menu) |
| BE scout (`tripory_be`) | Tên waypoint ≤ 200 (`WaypointName`), địa chỉ ≤ 500, ghi chú ≤ 2000, ảnh bìa ≤ 500 (EF config); tiêu đề 1–100, mô tả ≤ 1000, phụ đề ≤ 100 (validator); `InvalidDayNumber` chỉ chặn dayNumber < 1; `pageSize` 1–100 |
| FE cũ (chỉ tham khảo UX) | Thẻ waypoint 3 phần (tay cầm, thân, thao tác), placeholder nét đứt khi kéo, EmptyState theo ngày có CTA |
| Mặc định của researcher (2026-10-30) | Tóm tắt khối hai dòng; dấu lỗi chỉ sau lần gửi/blur đầu; focus tới trigger khối kế khi tự chuyển; đổi điểm đến bằng mũi tên không tự chuyển; Enter trong ô tìm chọn kết quả đầu; "Tất cả" gồm cả 8 mục phổ biến (hai radiogroup chung một giá trị); 8 mục phổ biến; tên ngắn không tiền tố; `Sheet fixedSnap` cho form tạo; chân form một hàng dưới `sm`; focus ban đầu khác nhau theo `md`; bộ đếm kẹp khi blur; nút −/+ 48px; Dialog "Thông tin chuyến đi" có nút X; lưới 2 cột / 3 cột từ `sm`, tỉ lệ 16:9; ô trống đầu là nút "Thêm ảnh bìa" (điểm dừng bàn phím duy nhất), các khung trống còn lại bấm được bằng chuột/chạm để mở ô nhập URL nhưng không vào Tab (D-82, D-84); ảnh mới không tự được chọn trừ khi danh sách rỗng; X xóa ảnh không danger, không xác nhận; lỗi tự lưu chung đặt đầu form, đóng form khi còn lỗi chuyển ra chỉ báo header; bỏ bản nháp D-36 cho form metadata (planner có thể giữ); toàn bộ copy phụ mới (placeholder, mô tả, empty tìm kiếm, ghi chú lưới, lỗi trùng ảnh, câu lỗi tự lưu) |
| Mặc định của researcher | Ngưỡng Dialog↔Sheet ở `md`; header editor một hàng ở mọi breakpoint, chỉ báo lưu và Xuất bản thu thành icon dưới `md` (xem §EditorHeader); `notify.undoable` không tự hết hạn (app sở hữu đồng hồ); một toast hoàn tác tại một thời điểm; form dialog không đóng khi bấm scrim; `router.replace` khi đổi tab lọc; 180ms/8px/4px cho cảm biến; sentinel 400px; tay cầm ẩn khi ngày có 1 điểm; số thứ tự màu trung tính; dialog rời trang tự đi tiếp khi request xong; toàn bộ copy phụ (empty từng tab, lỗi vị trí, menu, title, announcements, 403 body) |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS (FLAG 2 bên dưới)
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-11-05 (UI checker, phần mở lại lần 2; lượt 1, không có BLOCK)

**Kết quả checker 2026-11-05 (mở lại lần 2: bản đồ, tab Tổng quan):**

| Dimension | Verdict | Ghi chú |
|-----------|---------|---------|
| 1 Copywriting | PASS | CTA "Thêm điểm đến" dùng lại copy sẵn có; empty "Thêm điểm đến để thấy trên bản đồ" (D-121); lỗi "Không tải được bản đồ" có câu trấn an và "Thử lại" (tên truy cập "Thử tải lại bản đồ"); không có hành động phá hủy mới; nhãn quần đảo đúng D-113 |
| 2 Visuals | PASS | Tiêu điểm khai báo cho desktop và mobile; nút zoom icon-only có `aria-label`; pin `aria-hidden` có đường thay thế qua danh sách (D-128) |
| 3 Color | PASS + FLAG | Accent không mở rộng (chỉ thêm dòng ngày "vừa thêm" vào mục 5 sẵn có); bảng màu ngày là màu dữ liệu có lý do ngữ nghĩa, đủ tương phản |
| 4 Typography | PASS | Không thêm cỡ/weight; style nền chỉ 14/16px |
| 5 Spacing | PASS | Token mới là sizing (28, 36, 12, 240, 112px, bội số 4); spacing dùng 4/8/16/32/64 |
| 6 Registry Safety | PASS | Không thêm block; `maplibre-gl`/`react-map-gl` là thư viện npm |

Khuyến nghị (không chặn):

- **FLAG 1 (Dimension 2, D-114):** ở mức sheet mở rộng trên mobile, ghi công nằm sau sheet cùng bản đồ. Đã ghi lý do (bản đồ không còn được hiển thị ở mức này); UAT xác nhận ghi công thấy được ở mức thấp, vừa và khi sheet đóng.
- **FLAG 2 (Dimension 3):** cặp màu ngày 3/6/7 (ngọc lục, lục lam, xanh lá mạ) khó phân biệt với người mù màu đỏ-lục. Đã giảm thiểu bằng số trên pin, nhãn "Ngày N" ở Tổng quan và việc ngày không chọn bị làm mờ; không đổi bảng màu. Nếu UAT thấy khó phân biệt, planner có thể đổi thứ tự hoặc thay một màu, giữ ngưỡng ≥ 4.5:1 với chữ trắng.

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

- (2026-10-30) Hai lỗi trên đã được sửa trong `theme.css` (có `--z-index-*` và `--text-color-muted|subtle|disabled`). Các mục mới của đợt mở lại dùng class thật: `z-sticky`, `z-modal`, `text-muted`, `text-subtle`, `text-disabled`. Các mục cũ còn ghi `z-(--z-*)` đọc theo nghĩa `z-sticky`/`z-modal`/`z-overlay`.
