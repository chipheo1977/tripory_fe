---
phase: 5
slug: map-public-view
status: approved
shadcn_initialized: true
preset: base-nova
created: 2026-11-09
reviewed_at: 2026-11-09
---

# Phase 5 — UI Design Contract

> Hợp đồng hình ảnh và tương tác cho Map & Public View (PUB-01..PUB-05, phần còn lại của ITIN-11). Phase 5 **dùng lại toàn bộ** token, typography, spacing, màu, focus ring, state matrix, Sheet snap và a11y nền của `01-UI-SPEC.md`, mẫu phiên và hồi phục phiên của `03-UI-SPEC.md`, cùng mọi hợp đồng bản đồ, tab Tổng quan, bảng màu ngày, ghi công, Hoàng Sa/Trường Sa của `04-UI-SPEC.md` (§Bản đồ trong editor và tab Tổng quan). File này chỉ khai báo phần mới hoặc phần ghép riêng của Phase 5. Mọi D-xx dẫn chiếu `05-CONTEXT.md` (đã khóa); "04 D-xx" dẫn chiếu `04-CONTEXT.md`. Copy trong ngoặc kép có gắn D-xx là chuỗi khóa, chép nguyên văn.
>
> Ngoài phạm vi: like, bình luận, fork (Phase 5.1 và sau), trang hồ sơ tác giả, nút chia sẻ riêng từng mạng xã hội, ảnh OG động (UX-02), bấm bản đồ chọn vị trí (MAP-02), hủy xuất bản.

### Quyết định người dùng chốt trong phiên UI (2026-11-09)

| # | Câu hỏi | Chốt |
|---|---------|------|
| U-01 | Design system | Kế thừa nguyên Phase 1/4, không đổi font, cỡ, weight, accent |
| U-02 | Header trang công khai | Một hàng 64px riêng (`PublicHeader`): trái logo "Tripory"; phải [Bài viết\|Bản đồ] (từ `lg`), Sửa (chủ), Chia sẻ, ô tài khoản. Không dùng `AppHeader` + thanh công cụ thứ hai |
| U-03 | Ô tài khoản | Giữ như `AppHeader` (khách thấy "Đăng nhập"); riêng trang 403 chỉ có logo (D-21) |
| U-04 | Toast "Đã xuất bản lịch trình" khi hộp chia sẻ tự mở (D-15) | **Giữ toast**; hộp tự mở dùng tiêu đề thường "Chia sẻ lịch trình". Thứ tự chống chồng ở §Sau khi xuất bản |
| U-05 | "Lịch trình của bạn" (D-02) | Đặt **cạnh** khối tác giả, dạng `Badge` sau tên; DTO chưa có `author` thì chỉ hiện Badge |
| U-06 | Bản nháp (D-23) | Dải "Bản nháp – chỉ bạn thấy" có sẵn nút "Sửa"; header **không** có nút Sửa khi là nháp |
| U-07 | Chế độ Bản đồ mobile | Như editor: sheet đóng được (nút X, vuốt), chip "Lịch trình" để mở lại; viên thuốc chuyển chế độ đặt cạnh chip; D-09 vẫn giữ (viên thuốc luôn thấy, không bị sheet che) |
| U-08 | Kiểu nút Chia sẻ | `secondary` từ `md`, `ghost` icon dưới `md`; không dùng accent |
| U-09 | "Xem trang công khai" trên menu thẻ (D-24) | Mở trong tab hiện tại |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn CLI, đã khởi tạo (`apps/web/components.json`, `packages/ui-web/components.json`) |
| Preset | `base-nova`, `baseColor: neutral`, `registries: {}` |
| Component library | `@base-ui/react` 1.8 (qua `@tripory/ui-web`) |
| Icon library | `lucide-react` qua atom `Icon`; icon trong header, nút và dòng chữ cỡ `sm` (16px) |
| Font | Inter qua `next/font` (`latin`, `vietnamese`), không đổi |
| Styling | Tailwind CSS 4.3 + semantic token của `@tripory/design-tokens`, không đổi |
| Feedback | `Toast`/`notify` (Sonner) đã mount ở root layout, vị trí `top-right` (mobile full-width ở đỉnh). Phase 5 chỉ phát một toast mới theo thứ tự ở §Sau khi xuất bản |
| Bản đồ | Dùng lại `TripMap`/`LazyTripMap` (MapLibre + OpenFreeMap, style riêng của repo), nạp client-only, chỉ đọc |
| QR | `uqr` 0.1.3 (thư viện npm, pin cứng trong `catalog:`): chỉ `encode()` ra ma trận, vẽ bằng JSX `<svg><rect>`; **không** dùng `renderSVG` (cần HTML thô) |

Nguồn: `01-UI-SPEC.md`, `03-UI-SPEC.md`, `04-UI-SPEC.md`, `05-RESEARCH.md` §Standard Stack, đọc trực tiếp `packages/design-tokens/src/{components,theme}.css`, `packages/ui-web/src/*`, `apps/web/src/components/{app-header,app-shell}.tsx`, `apps/web/src/modules/itinerary/ui/*`.

---

## Spacing Scale

Dùng nguyên scale Phase 1 (bội số 4):

| Token | Value | Usage trong Phase 5 |
|-------|-------|---------------------|
| xs | 4px | Gap icon–chữ trong chip ngày và đoạn của viên thuốc, padding trong khung viên thuốc, gap tên–địa chỉ của điểm, gap các nút trên header dưới `sm` |
| sm | 8px | Gap các nút header từ `sm`, gap chấm/số với chữ, padding dọc dải chip ngày và dải bản nháp, gap chip "Lịch trình" ↔ viên thuốc, gap giữa hai nút trong cảnh báo lỗi bản đồ, gap chip ngày với nhau |
| md | 16px | Gutter trang mobile, gap các khối trong hero (tiêu đề, tác giả, meta, mô tả), padding ngang đoạn viên thuốc từ `sm`, khoảng viên thuốc cách đáy màn hình, gap ô link ↔ nút "Sao chép link", gap trong hộp chia sẻ giữa các khối nhỏ |
| lg | 24px | Gap giữa các điểm trong một ngày, gap ảnh bìa → tiêu đề, gap giữa ba khối của hộp chia sẻ (link, QR, mở trang), gutter từ `sm` |
| xl | 32px | Gutter từ `lg`, đệm trên của mục ngày sau đường kẻ (`pt-section`), đệm vùng phải khi bản đồ lỗi ở desktop (`p-section`) |
| 2xl | 48px | Khoảng cách giữa hai mục ngày; khoảng trên/dưới trang 403 và lỗi ở mobile |
| 3xl | 64px | Đệm đáy bài viết dưới `lg` (chừa viên thuốc nổi, cộng `env(safe-area-inset-bottom)`); khoảng trên/dưới trang 403 và lỗi từ `lg` |

Exceptions: none. Các kích thước dưới đây là sizing, không phải spacing.

### Sizing

| Token / giá trị | Value | Nguồn | Dùng ở |
|-----------------|-------|-------|--------|
| `--size-header` | 64px | có sẵn (Phase 1) | Hàng `PublicHeader` |
| `--size-touch-min` | 44px | có sẵn | Mọi vùng chạm: nút header, chip ngày, đoạn viên thuốc, link Google Maps, nút trong hộp chia sẻ |
| `--map-pin-size` | 28px | có sẵn (Phase 4) | Vòng số thứ tự điểm ở bài viết và danh sách chế độ Bản đồ: cùng cỡ pin để người xem nhận ra là cùng một điểm |
| `--map-day-dot-size` | 12px | có sẵn | Chấm màu ngày trong chip ngày, tab ngày, dòng ngày Tổng quan |
| `--itinerary-cover-ratio` | 16 / 9 | có sẵn | Ảnh bìa hero, ảnh bìa trong Tổng quan |
| `--content-md` (`max-w-content-md`) | 768px | có sẵn | Cột đọc của bài viết |
| `--editor-timeline-width` | 400px | có sẵn | Cột trái chế độ Bản đồ từ `lg` (cùng bố cục editor) |
| `--share-qr-size` | **192px (mới)** | thêm vào `packages/design-tokens/src/components.css` + `tokens.test.ts` | Cạnh của mã QR trên màn hình (`size-(--share-qr-size)`). Không có token sẵn ở cỡ này; 192 là bội số 4 và vừa khung 272px của Sheet ở 320px |

Chiều cao viên thuốc là kết quả bố cục (44px đoạn + 2 × 4px đệm = 52px), không khai báo token. Chiều cao header + dải bản nháp đo bằng `ResizeObserver` như editor (không token).

### Hằng tương tác (app constant, không phải token)

| Hằng | Giá trị | Dùng ở |
|------|---------|--------|
| Nhãn "Đã sao chép link" trên nút | 2000ms rồi về "Sao chép link" | D-13 |
| Ngưỡng chip ngày đang đọc | `IntersectionObserver` với `rootMargin: "-{header + dải chip}px 0px -60% 0px"` | D-06 |
| Đệm cuộn tới mục ngày | `scroll-margin-top` = chiều cao header + dải chip + 16px | D-06 |
| Cold start | 5000ms (`SubmitStatus`, chuỗi `COLD_START_MESSAGE`) | trạng thái tải trang công khai |
| Bản đồ: `MAP_MOVE_MS`, `MAP_LOAD_TIMEOUT_MS`, zoom, padding canh khung | như `04-UI-SPEC.md` §Hằng bản đồ | chế độ Bản đồ |
| Mã QR | `ecc: "M"`, viền 2 module | D-14 |
| Ảnh QR tải về | PNG 512×512px, module `#000000` trên nền `#FFFFFF` (dữ liệu ảnh, không phải class UI) | D-14 |

---

## Typography

Không đổi so với Phase 1. Phase 5 dùng **đúng 4 cỡ** (14/16/20/28) và **đúng 2 weight** (400/600). Token `caption` 12px của Phase 4 (dòng km của tab ngày editor) **không** dùng ở Phase 5: tab ngày của chế độ Bản đồ công khai chỉ có một dòng, km nằm ở dòng phụ của bảng ngày.

| Role | Size | Weight | Line Height | Dùng ở Phase 5 |
|------|------|--------|-------------|----------------|
| Body | 16px | 400 | 1.5 | Mô tả lịch trình (hero), ghi chú điểm (`whitespace-pre-line`), câu "Chưa có điểm" của ngày trống, mô tả hộp chia sẻ, giá trị ô link |
| Body (semibold) | 16px | 600 | 1.5 | Tên điểm (`h3`), tiêu đề chuyến đi trong Tổng quan dưới `lg`, dòng 1 của dòng ngày Tổng quan |
| Label | 14px | 600 | 1.5 | Chữ nút, đoạn đang chọn của viên thuốc, chip ngày đang đọc, tên tác giả, Badge, dòng dải bản nháp, link "Mở trong Google Maps", nhãn "Link lịch trình", tiêu đề "Mã QR" |
| Label (regular) | 14px | 400 | 1.5 | Meta hero ("Khởi hành … · 3 ngày · 12 điểm · 45,2 km"), dòng phụ ngày ("3 điểm · 12,4 km"), địa chỉ điểm, chip ngày không đang đọc, đoạn chưa chọn của viên thuốc, ghi chú dưới QR, dòng phản hồi sao chép/chia sẻ |
| Heading | 20px | 600 | 1.2 | Tiêu đề mục ngày (`h2` "Ngày N · phụ đề"), `DialogTitle`/`SheetTitle` "Chia sẻ lịch trình", heading `EmptyState`/`ErrorState`, tiêu đề chuyến đi trong Tổng quan từ `lg` |
| Display | 28px | 600 | 1.2 | `h1` tiêu đề lịch trình ở hero (mọi breakpoint, `break-words`). Wordmark "Tripory" trên header dùng Heading như `AppHeader` |

Số km, số ngày, số điểm dùng `tabular-nums`. Định dạng số và ngày dùng lại `format.ts`/`overview-format.ts` (km `Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })` + " km", ẩn khi 0/null; ngày `dd/MM/yyyy` từ chuỗi `CalendarDate`, không qua `new Date()`).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FAFAF9` `background` | Nền trang bài viết, nền vùng bản đồ khi đang tải, nền trang 403/lỗi |
| Secondary (30%) | `#FFFFFF` `surface` / `surface-elevated` | `PublicHeader`, dải chip ngày, cột trái và Sheet chế độ Bản đồ, hộp chia sẻ, viên thuốc, khung QR, dòng ngày/thẻ điểm |
| Accent (10%) | `#C44728` `primary` | Xem danh sách dưới |
| Destructive | `#B42318` `danger` | Chỉ dòng báo "Không sao chép được, hãy chép thủ công" và các lỗi thao tác chia sẻ; Phase 5 không có hành động phá hủy |
| Muted fill (có sẵn) | `#F5F5F4` `surface-muted` | Dải "Bản nháp – chỉ bạn thấy", nền dự phòng ảnh bìa, Skeleton, nền khung viên thuốc trên header (`lg`) |
| Inverse (có sẵn) | `surface-inverse` / `text-inverse` | Đoạn đang chọn của viên thuốc |
| Màu dữ liệu ngày (có sẵn, Phase 4) | `--map-day-1..8` | Vòng số thứ tự điểm, chấm màu ngày, pin, đường. Không phải accent thứ hai (lý do ngữ nghĩa: ngày), không dùng cho nút/focus/trạng thái chọn |

**Accent reserved for (Phase 5):**
1. Nút primary "Sao chép link" trong hộp chia sẻ (CTA chính của hộp).
2. Link dạng nút primary "Về trang chủ" (trang 403) và nút "Thử lại" của `ErrorState` (lỗi tải trang).
3. Chip ngày đang đọc: `border-primary bg-primary-subtle` (chỉ báo vị trí, đúng nhóm "active/selected indicator" của Phase 1).
4. Vạch tab đang chọn trong chế độ Bản đồ (`Tabs variant="line"` sẵn có).
5. Focus ring.

**Không dùng accent cho:** nút Chia sẻ (header và editor, U-08), nút Sửa, viên thuốc chuyển chế độ (đoạn chọn dùng `surface-inverse`), link "Mở trong Google Maps" (`text-text` gạch chân), Badge "Lịch trình của bạn" (`neutral`), dải bản nháp, nút "Tải ảnh QR", "Chia sẻ qua ứng dụng", "Mở trang công khai", "Xem dạng bài viết" (đều `secondary`/`ghost`), chip "Lịch trình", nút zoom, ghi công, chip ngày không đang đọc.

Trạng thái không chỉ truyền bằng màu: chip ngày đang đọc đổi weight 400 → 600 và có `aria-current`; đoạn viên thuốc đang chọn đổi nền, weight và `aria-pressed`; điểm đang chọn ở chế độ Bản đồ có `ring-2 ring-inset ring-text` + `aria-current`; số thứ tự luôn có trên vòng màu ngày.

Contrast: dùng lại bằng chứng Phase 1/4. `text-inverse` trên `surface-inverse` ≈ 17:1. Số trắng trên 8 màu ngày ≥ 4.99:1 (04-UI-SPEC). QR `fill-text` trên `surface` > 15:1.

---

## Component Inventory

### Dùng lại nguyên trạng (`@tripory/ui-web`)

`Button` (`primary`, `secondary`, `ghost`; `sm`, `md`; `visible`), `IconButton` (`ghost`, `secondary`), `buttonVariants`, `Avatar` (`sm`, chữ cái đầu khi không có ảnh), `Badge` (`neutral`), `Icon`, `Skeleton`, `EmptyState` (`page`, `compact`), `ErrorState` (`page`), `InlineAlert` (`info` + `action`), `Input` (`md`, `readOnly`), `FormField*`, `Dialog*`/`Sheet*` (qua `ResponsiveFormSurface`), `Tabs*` (`line`), `DropdownMenuLinkItem`, `MapPin`, `MapZoomControls`, `notify`.

### Mở rộng `ui-web` (generic, không chứa copy nghiệp vụ, có test theo DS-07)

| Component | Vị trí | Contract |
|-----------|--------|----------|
| `SegmentedControl`, `SegmentedControlItem` | `molecules/segmented-control.tsx` (mới, Base UI `toggle-group` + `toggle`) | Nhóm **chọn đúng một**, không bao giờ rỗng. Props: `value: string`, `onValueChange(value)`, bắt buộc `aria-label` hoặc `aria-labelledby`, `className`, `children`. Bấm đoạn đang chọn không làm gì (chặn mảng rỗng của Base UI). Khung: `inline-flex items-center rounded-pill border border-border p-inline-xs`; nền khung do caller truyền qua `className` (`bg-surface-elevated shadow-overlay` khi nổi, `bg-surface-muted` khi nằm trên header). Đoạn: `inline-flex min-h-touch items-center gap-inline-xs rounded-pill px-inline-sm sm:px-stack-md text-label`; chưa chọn `font-regular text-muted hover:text-text`; chọn (`data-pressed`) `bg-surface-inverse font-semibold text-text-inverse`; focus ring chuẩn. `SegmentedControlItem` nhận `value`, `icon?: LucideIcon` (16px, `aria-hidden`; caller ẩn bằng `hidden sm:inline-flex` qua prop `iconClassName` nếu cần), `children` (nhãn). Bàn phím theo Base UI: một điểm dừng Tab, ←/→ di chuyển focus, Space/Enter chọn (mũi tên **không** tự chọn, vì đổi chế độ nạp bản đồ). `aria-pressed` trên từng đoạn. Test: không rỗng khi bấm lại đoạn đang chọn; `aria-pressed`; roving focus; Space/Enter chọn; mũi tên không gọi `onValueChange` |

Không thay đổi component sẵn có của `ui-web`.

### Thay đổi tương thích ngược ở `apps/web` (thêm prop tùy chọn, mặc định giữ hành vi cũ)

| Component | Thay đổi |
|-----------|----------|
| `EditorMapArea` | Prop `errorHint?: string` (mặc định "Bạn vẫn sửa lịch trình như bình thường.") và `errorActions?: ReactNode` (nút đứng sau "Thử lại" trong `InlineAlert`); `MapStatusOverlay` nhận `message?: string` (mặc định "Thêm điểm đến để thấy trên bản đồ") |
| `EditorLayout` | Xuất lại `WideBody`, `NarrowBody`, hook đo header (di chuyển nguyên trạng). `ReopenChip` nhận slot `companion?: ReactNode` đặt cạnh chip trong cùng dải đáy (mặc định không có) và đổi lớp `z-modal` → `z-sticky` (§Viên thuốc). `NarrowBody` nhận `sheetFooter?: ReactNode` (thanh dính đáy của sheet, mặc định không có) |
| `CoverImage` | Prop `loading?: "lazy" \| "eager"` (mặc định `"lazy"`); hero trang công khai dùng `"eager"` (ảnh lớn đầu trang) |
| `PublishDialog` | Prop `successToast?: boolean` (mặc định `true`, giữ toast như cũ). Editor truyền `false` khi sẽ tự mở hộp chia sẻ (xem §Sau khi xuất bản) |
| `ItineraryCard` | Menu ⋯ của thẻ đã xuất bản thêm mục "Xem trang công khai" (bảng ánh xạ theo `isPublic`, không thêm `if` vào thân) |

### Organism nghiệp vụ mới (`apps/web/src/modules/itinerary/ui/`)

| Component | Contract tóm tắt |
|-----------|------------------|
| `PublicItineraryView` | Container client: nhận plain object lịch trình + `viewer` hẹp (`isOwner`, `canEdit`), đọc/ghi `?view` qua `usePublicView`, dựng `PublicHeader`, `DraftStrip`, `PublicArticle` (luôn dựng, `visible` theo chế độ) và `PublicMapMode` (dựng lần đầu khi `visible`), `ViewModeToggle` đặt theo breakpoint, `ShareDialog` |
| `PublicHeader` | Header một hàng 64px (§PublicHeader). Slot: `toggle`, `actions`, `account`; trang 403 truyền rỗng cả ba |
| `DraftStrip` | Dải "Bản nháp – chỉ bạn thấy" + nút "Sửa" (§Dải bản nháp) |
| `ViewModeToggle` | `SegmentedControl` hai đoạn "Bài viết" \| "Bản đồ"; biến thể `floating` (dưới `lg`) và `inline` (header từ `lg`) chỉ khác `className` |
| `PublicArticle` | Hero + dải chip ngày + danh sách ngày (§Chế độ Bài viết) |
| `ArticleHero`, `AuthorLine`, `DayChipStrip`, `ArticleDaySection`, `ArticleWaypoint` | Trình bày, props hẹp (không truyền cả `itinerary` xuống `ArticleWaypoint`/`AuthorLine`) |
| `PublicMapMode` | Bố cục editor chỉ đọc (§Chế độ Bản đồ): `WideBody`/`NarrowBody` + `EditorMapArea` + `PublicDayTabs` + `PublicOverviewPanel`/`PublicDayPanel` |
| `PublicDayTabs` | `Tabs line` một dòng: "Tổng quan", "● Ngày N"; không có "+ Thêm ngày", không có dòng km |
| `PublicOverviewPanel`, `PublicOverviewSummary` | Như `OverviewPanel`/`OverviewSummary` bỏ mọi thao tác sửa và nút "Thêm điểm đến"; dùng lại `DayOverviewRow` |
| `PublicDayPanel`, `PublicWaypointItem` | Danh sách điểm chọn được, không dnd-kit, không menu ⋯ |
| `ShareButton` | Nút mở hộp chia sẻ, dùng ở `PublicHeader` và `EditorHeader` (§Nút Chia sẻ) |
| `ShareDialog`, `ShareLinkField`, `QrCode`, `QrDownloadButton` | Hộp chia sẻ (§Hộp chia sẻ). Hook `use-share-url`, `use-copy-link`, `use-native-share`, `use-qr-download` bọc `navigator.*`/`window.*`; component không gọi trực tiếp |
| `PublicForbidden` | Thân trang 403 (§Trang 403) |
| `PublicItinerarySkeleton` | Fallback tải và hồi phục phiên (§Trạng thái trang công khai) |

---

## Khung trang công khai (`/itineraries/[id]`, route group riêng toàn màn hình)

- Không dùng `AppShell`/`AppHeader` (05-RESEARCH: `main` của AppShell giới hạn `max-w-content-lg`, chế độ Bản đồ cần toàn màn). Trang có skip link "Bỏ qua đến nội dung chính" như AppShell, đích là vùng nội dung của chế độ đang hiện.
- Root `min-h-dvh bg-background text-text`; chế độ Bản đồ từ `lg` thêm `lg:h-dvh lg:overflow-hidden` như editor.
- Khối dính trên cùng (`sticky top-0 z-sticky`, đo chiều cao bằng `ResizeObserver`): `PublicHeader` rồi `DraftStrip` (chỉ khi chủ xem nháp). Chiều cao đo được dùng cho: `top` của dải chip ngày, `insetTop` của Sheet, `top` của vùng bản đồ dưới `lg`.
- Heading: mỗi chế độ có đúng một `h1` trong cây a11y. Bài viết: `h1` tiêu đề ở hero. Bản đồ: `h1.sr-only` "{tiêu đề}" đầu vùng chế độ Bản đồ; tiêu đề trong Tổng quan là `p`. Chế độ không hiện được ẩn bằng thuộc tính `hidden`, nên `h1` của nó không vào cây a11y.
- Document title: "{tiêu đề} · Tripory" (template root). 403, lỗi, đang hồi phục phiên: "Lịch trình · Tripory" (không lộ tiêu đề nháp, D-20). 404: title của trang not-found sẵn có.

### PublicHeader (U-02, U-03, D-09, D-12, D-17, D-23)

`header` `bg-surface border-b border-border pt-[env(safe-area-inset-top)]`, hàng `min-h-header px-page-inline sm:px-page-inline-md lg:px-page-inline-lg`. Dưới `lg`: `flex items-center justify-between gap-inline-xs sm:gap-inline-sm`. Từ `lg`: `grid grid-cols-[1fr_auto_1fr] items-center`.

```text
Dưới lg:  [Tripory]                                   [Sửa*] [Chia sẻ*] [Tài khoản]
Từ lg:    [Tripory]        [ Bài viết | Bản đồ ]        [Sửa*] [Chia sẻ*] [Tài khoản]
          * Sửa: chỉ chủ, chỉ khi đã xuất bản (nháp có nút Sửa ở dải bản nháp, U-06)
          * Chia sẻ: chỉ khi đã xuất bản (D-17)
```

- Logo: `next/link` "Tripory" tới `/`, giống `AppHeader` (`text-heading font-semibold`, `min-h-touch min-w-touch`, focus ring). Không có nút back (người xem tới từ link ngoài, không có trang trước trong app).
- Viên thuốc trên header: `ViewModeToggle inline` ở cột giữa, chỉ từ `lg` (`hidden lg:inline-flex`). Dưới `lg` viên thuốc nằm ở đáy (§Viên thuốc chuyển chế độ).
- Vùng phải `flex shrink-0 items-center justify-self-end gap-inline-xs sm:gap-inline-sm`, thứ tự: Sửa → Chia sẻ → ô tài khoản.
- **Sửa** (D-23, chủ + đã xuất bản): link tới `/itineraries/{id}/edit`. Dưới `md`: `IconButton`-dạng link `ghost`, icon `SquarePen` 16px, `aria-label` "Sửa lịch trình". Từ `md`: `buttonVariants({ variant: "secondary", size: "sm" })` icon `SquarePen` + chữ "Sửa", `aria-label` "Sửa lịch trình". Ẩn/hiện bằng `visible` theo `canEdit && isPublic`.
- **Chia sẻ**: `ShareButton` (§Nút Chia sẻ), `visible` theo `isPublic`.
- **Ô tài khoản** (U-03): dùng lại `AccountSlot` trong `Suspense` (fallback `Skeleton circle` 32px như AppShell): khách thấy nút "Đăng nhập" (`/login?next=/itineraries/{id}`), người có phiên thấy `UserMenu`. Dưới `sm` `UserMenu` chỉ hiện avatar (như Phase 3).
- Ước lượng 320px (tính tay): padding 32, logo ~80, khách: Chia sẻ 44 + "Đăng nhập" ~104 + 2 gap 4 = 268 ≤ 320; chủ đã xuất bản: Sửa 44 + Chia sẻ 44 + avatar 44 + 3 gap = 256. Không tràn ngang.
- Trang 403 (U-03, D-21): chỉ logo, không vùng phải.

### Dải bản nháp (`DraftStrip`, D-23, U-06)

Chỉ khi chủ xem bản nháp, ở cả hai chế độ, ngay dưới header trong khối dính:

```text
[FilePen 16 text-muted] Bản nháp – chỉ bạn thấy                    [✎ Sửa]
```

- `div` `bg-surface-muted border-b border-border px-page-inline sm:px-page-inline-md lg:px-page-inline-lg py-inline-sm`, `flex items-center justify-between gap-inline-sm`. Chữ Label semibold `text-text` (icon `aria-hidden`). Không phải live region (trạng thái có sẵn khi tải trang).
- Nút: link `buttonVariants({ variant: "secondary", size: "sm" })` icon `SquarePen` + "Sửa", `aria-label` "Sửa lịch trình", tới `/itineraries/{id}/edit`.
- Header không có nút Sửa và không có nút Chia sẻ khi là nháp (D-17, U-06).

---

## Chế độ Bài viết (PUB-01, D-01..D-06; mặc định, D-07)

### Bố cục

```text
Khối dính: PublicHeader (+ DraftStrip)
DayChipStrip (sticky dưới khối dính)
main  mx-auto w-full max-w-content-md
  ArticleHero
    ảnh bìa aspect-(--itinerary-cover-ratio): dưới sm tràn hết bề rộng màn hình, không bo góc;
                                               từ sm nằm trong cột, rounded-container, cách đầu cột 24px
    khối chữ (px-page-inline dưới sm), flex-col gap-stack-md, cách ảnh 24px
      h1 tiêu đề                         Display 28/600, break-words
      AuthorLine                         [Avatar sm] Tên tác giả  [Badge "Lịch trình của bạn"]
      meta                               "Khởi hành 12/10/2026 · 3 ngày · 12 điểm · 45,2 km"
      mô tả                              Body text-muted whitespace-pre-line break-words
  danh sách ngày  flex-col gap-page-block, cách hero 48px
    ArticleDaySection × N (Ngày 1 → ngày lớn nhất, kể cả ngày thưa)
  đệm đáy: dưới lg 64px + safe-area (chừa viên thuốc nổi); từ lg 64px
ViewModeToggle floating (dưới lg, fixed đáy giữa)
```

- Thứ bậc: tiêu đề `h1` là tiêu điểm; ảnh bìa là điểm nhìn đầu tiên ở trên nó; rồi các tiêu đề ngày `h2`; rồi tên điểm `h3`.
- **Ảnh bìa (D-01):** `CoverImage loading="eager"` với chuỗi dự phòng của editor (ảnh đang hiển thị → ảnh mặc định của điểm đến → nền `surface-muted` + icon `ImageOff`/`Image` 24px `text-subtle`). `alt=""` (trang trí; tiêu đề ở ngay dưới). `referrerPolicy="no-referrer"` (sẵn có).
- **Meta (D-01):** một dòng Label regular `text-muted tabular-nums`, các phần nối " · ": "Khởi hành {dd/MM/yyyy}" (bỏ khi không có ngày), "{n} ngày", "{m} điểm" (m = 0 thì "Chưa có điểm"), "{x} km" (bỏ khi `totalDistanceKm` 0/null). Không hiện điểm đến, sở thích, ngày kết thúc (04 D-74, D-76). Xuống dòng tự nhiên ở 320px.
- **Mô tả:** không có thì không render (`visible`). Chữ thường, không HTML.

### AuthorLine (D-02, U-05)

`div` `flex flex-wrap items-center gap-inline-sm`:

| Dữ liệu | Hiển thị |
|---------|----------|
| Có `author`, người xem không phải chủ | `Avatar sm` (ảnh `avatarUrl`, hoặc chữ cái đầu của `displayName` khi `avatarUrl` null/ảnh mặc định dicebear) + `displayName` Label semibold `text-text` |
| Có `author`, người xem là chủ | Như trên + `Badge neutral` "Lịch trình của bạn" sau tên |
| Không có `author`, người xem là chủ | Chỉ `Badge neutral` "Lịch trình của bạn" |
| Không có `author`, người xem không phải chủ | Không render cả khối (`visible={false}`) |

- Avatar `alt=""` (tên đã có ngay cạnh). Tên không phải link (trang hồ sơ tác giả là deferred). Không hiện email.

### DayChipStrip (D-06)

- `nav aria-label="Các ngày trong lịch trình"`, `sticky z-sticky bg-surface border-b border-border`, `top` = chiều cao khối dính đo được. Bên trong: hàng `overflow-x-auto` cuộn ngang ở mọi breakpoint (căn theo cột `max-w-content-md` từ `sm`), `flex gap-inline-sm px-page-inline py-inline-sm`, mép mờ hai bên khi còn nội dung tràn (dùng lại `EdgeFade` của `day-tabs.tsx`, tách ra file dùng chung nếu cần).
- Chip: `<a href="#ngay-{N}">`, `inline-flex min-h-touch shrink-0 items-center gap-inline-xs rounded-pill border px-stack-md text-label`, chấm màu ngày `size-(--map-day-dot-size) rounded-pill bg-map-day-N` `aria-hidden` + "Ngày {N}".
  - Thường: `border-border bg-surface font-regular text-text hover:bg-surface-muted`.
  - Đang đọc: `border-primary bg-primary-subtle font-semibold text-text`, `aria-current="true"`.
- Bấm chip (chuột, Enter): chặn hành vi mặc định của anchor (không đổi hash, không thêm mục lịch sử; lịch sử chỉ dành cho chế độ, D-08), cuộn mục ngày tới vị trí (`behavior: "smooth"`, `"auto"` khi `prefers-reduced-motion: reduce`, đọc media query lúc bấm), đặt ngay chip đó là đang đọc và giữ tới khi cuộn xong, rồi focus `h2` của ngày (`tabIndex={-1}`, `preventScroll`).
- Ngày đang đọc theo vị trí cuộn: mục ngày cao nhất đang giao với vùng quan sát (`rootMargin` ở §Hằng tương tác); không mục nào giao (một ngày rất dài) thì giữ chip trước; cuộn chạm đáy trang thì là ngày cuối. Chip đang đọc tự cuộn vào khung dải (`inline: "nearest"`, không mượt khi reduced motion).
- Không render dải khi lịch trình không có ngày nào (`visible`).

### ArticleDaySection (D-04, D-05)

```text
section id="ngay-{N}" aria-labelledby → h2
  h2  "Ngày {N} · {phụ đề}" / "Ngày {N}"      Heading 20/600, break-words, scroll-mt theo §Hằng
  p   "{X} điểm · {Y} km" / "{X} điểm"       Label regular text-muted tabular-nums (km dayDistanceKm của BE, ẩn khi 0/null)
  ol  aria-label="Điểm đến Ngày {N}"  flex-col gap-stack-lg, cách dòng phụ 24px
      ArticleWaypoint × X
  (ngày trống) p "Chưa có điểm"               Body text-muted, thay cho dòng phụ và danh sách
```

- Khoảng giữa hai mục ngày 48px (`gap-page-block`), mục sau có `border-t border-border pt-section`.
- Ngày thưa (không có trong dữ liệu) vẫn hiện như ngày trống (D-04, 04 D-28).

### ArticleWaypoint (D-03)

```text
li  grid grid-cols-[auto_1fr] gap-stack-md
  [vòng số]   size-(--map-pin-size) rounded-pill bg-map-day-N text-text-inverse text-label font-semibold tabular-nums, aria-hidden
  cột min-w-0 flex-col gap-inline-xs
    h3  tên điểm                         Body semibold, break-words
    p   địa chỉ (nếu có)                 Label regular text-muted, break-words
    p   ghi chú (nếu có)                 Body text-text whitespace-pre-line break-words, cách 8px
    a   "Mở trong Google Maps" ↗         Label semibold text-text underline underline-offset-2, icon ExternalLink 16 aria-hidden
```

- Số là thứ tự 1-based trong ngày theo `orderIndex`, trùng số trên pin của chế độ Bản đồ. Màu vòng theo `dayColorIndex` (bảng ánh xạ tĩnh, không ghép chuỗi class).
- Link Google Maps: `href="https://www.google.com/maps/search/?api=1&query={lat},{lng}"`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label` "Mở {tên} trong Google Maps (mở tab mới)", `inline-flex min-h-touch items-center gap-inline-xs`, hover/focus đổi `decoration-2`, focus ring chuẩn.
- Mọi chữ do người dùng nhập là text node React, không `dangerouslySetInnerHTML` (D-03).

---

## Viên thuốc chuyển chế độ (`ViewModeToggle`, PUB-02, D-07..D-09, U-07)

- `SegmentedControl aria-label="Chế độ xem"`, hai đoạn theo thứ tự: icon `BookOpen` + "Bài viết" (`value="article"`), icon `Map` + "Bản đồ" (`value="map"`). Dưới `sm` icon ẩn, chỉ còn chữ (đủ chỗ cạnh chip "Lịch trình" ở 320px, xem bảng đo dưới).
- Đổi chế độ: `usePublicView().setView` đẩy một mục lịch sử (`?view=map`; Bài viết thì bỏ tham số), không gọi lại server (D-08). Nút back của trình duyệt về chế độ trước. Giá trị lạ của `?view` = Bài viết.
- **Một vị trí tại một thời điểm**, theo breakpoint và chế độ:

| Ngữ cảnh | Vị trí | Lớp |
|----------|--------|-----|
| Từ `lg`, cả hai chế độ | Cột giữa `PublicHeader` (`inline`: khung `bg-surface-muted`, không bóng) | trong header |
| Dưới `lg`, Bài viết | Nổi ở đáy giữa: `fixed inset-x-0 bottom-0 flex justify-center pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))] pointer-events-none`, viên thuốc `pointer-events-auto bg-surface-elevated shadow-overlay` | `z-sticky` |
| Dưới `lg`, Bản đồ, sheet đang mở (mức thấp, vừa, mở rộng) | Trong thanh đáy của sheet (`sheetFooter`): `sticky bottom-0 bg-surface border-t border-border py-inline-sm pb-[calc(var(--semantic-space-stack-sm)+env(safe-area-inset-bottom))]`, căn giữa. Dùng đúng cơ chế thanh "Thêm điểm đến" của editor (vùng cuộn có `bottom` = phần đáy popup bị che), nên thanh luôn sát đáy màn hình ở cả ba mức và **không bị sheet che** (D-09) | trong Sheet |
| Dưới `lg`, Bản đồ, sheet đã đóng | Dải đáy của `ReopenChip`: `[⌃ Lịch trình] [Bài viết \| Bản đồ]` cạnh nhau, `gap-inline-sm`, căn giữa (U-07) | `z-sticky` (xem ghi chú dưới) |

- Đo tay ở 320px (dải đáy khi sheet đóng): bề rộng dùng được 320 − 2 × 16 = 288px; chip "Lịch trình" (`Button secondary md`: 16 + icon 16 + 8 + chữ ~62 + 16) ≈ 118px; viên thuốc không icon (4 + 2 × (8 + chữ ~50 + 8) + 4) ≈ 140px; tổng 118 + 8 + 140 = 266px ≤ 288. Từ `sm` viên thuốc có icon và `px-stack-md` (≈ 220px). Executor đo lại trên trình duyệt ở 320×568.
- **Lớp của dải đáy:** dải chỉ tồn tại khi sheet đóng, nên không cần nằm trên sheet. Dải dùng `z-sticky` (nằm trên bản đồ, dưới scrim `z-overlay` của hộp chia sẻ và mọi Dialog/Sheet modal). `ReopenChip` hiện dùng `z-modal` nên nổi trên scrim khi một Dialog mở ở bề rộng `md`..`lg`; đổi xuống `z-sticky` áp cho cả editor (sửa luôn lỗi đó), planner kiểm nút zoom và ghi công không đè dải.
- **Focus khi viên thuốc đổi chỗ:** nếu focus đang ở viên thuốc lúc nó chuyển vị trí (đổi chế độ, mở/đóng sheet, qua breakpoint `lg`), focus chuyển sang đoạn đang chọn của viên thuốc ở vị trí mới; không rơi về `body`.
- Bài viết dưới `lg` có đệm đáy 64px + safe-area nên nội dung cuối không bị viên thuốc che.

---

## Chế độ Bản đồ (PUB-02, D-10, D-11; "giống editor nhưng chỉ đọc")

Dùng lại nguyên hình ảnh và hành vi của `04-UI-SPEC.md` §Bản đồ trong editor và tab Tổng quan (pin, nhãn tên, đường nối, nhấn mạnh theo tab, đồng bộ chọn và canh khung, trạng thái tải, ghi công nút "i", nút zoom, Hoàng Sa/Trường Sa, reduced motion, vùng an toàn), **trừ**: không có nút thêm/sửa/xóa/kéo thả, không ô phụ đề, không nút bánh răng "Sửa thông tin", không "+ Thêm ngày", không thanh "Thêm điểm đến", không dòng km dưới tab.

### Tiêu điểm và thứ bậc

- Desktop: bản đồ là tiêu điểm; cột trái (tab, thông tin chuyến đi hoặc danh sách điểm) là thứ bậc hai.
- Mobile: phần bản đồ không bị sheet che là tiêu điểm ở mức thấp/vừa; nội dung sheet là tiêu điểm ở mức mở rộng. Viên thuốc luôn ở đáy.

### Bố cục

**Từ `lg`:**

```text
Khối dính (PublicHeader có viên thuốc ở giữa, + DraftStrip)
grid lg:grid-cols-[var(--editor-timeline-width)_1fr], cao 100dvh − khối dính
├─ cột trái 400px bg-surface border-r, cuộn dọc riêng
│    h1.sr-only "{tiêu đề}"
│    PublicDayTabs sticky: [Tổng quan][● Ngày 1][● Ngày 2]…
│    Tổng quan → PublicOverviewPanel: PublicOverviewSummary · "Các ngày" · DayOverviewRow × N
│    Ngày N    → PublicDayPanel: dòng phụ ngày · danh sách điểm
└─ EditorMapArea (không padding, không cuộn): TripMap · MapZoomControls góc trên phải · MapAttribution góc dưới phải
```

**Dưới `lg`:**

```text
Khối dính (PublicHeader, + DraftStrip)
EditorMapArea fixed từ đáy khối dính tới đáy viewport
Sheet modal={false}, 3 mức, mở ở medium, có nút X "Đóng" (U-07, như editor)
  PublicDayTabs đứng yên ở đầu · vùng cuộn thân tab · thanh đáy chứa ViewModeToggle
Sheet đóng: dải đáy [⌃ Lịch trình] [Bài viết | Bản đồ]; bấm "Lịch trình" mở lại ở mức vừa
```

- Tab mặc định khi vào chế độ Bản đồ: Tổng quan (D-10). Tab không lưu trên URL.
- Vùng an toàn canh khung, vị trí nút ghi công, mức thu nhỏ tối đa: như editor. Sheet đóng thì chừa vùng dải đáy (76px + 32px) như chip "Lịch trình" của editor; dải đáy có viên thuốc cùng chiều cao hàng nên không đổi số này (viên thuốc 52px ≤ vùng chừa).
- Bấm pin ở mobile đưa sheet về mức vừa, mở lại nếu đang đóng (04 D-125).

### PublicDayTabs

`Tabs variant="line"`, `value` = `"overview"` hoặc dayNumber; vẽ đủ Ngày 1 → ngày lớn nhất. Tab: một dòng, `min-h-touch`, "Tổng quan" và "● Ngày {N}" (chấm `aria-hidden`). Roving focus ←/→, Home/End (Base UI). Không có nút sau `TabsList`. Đổi tab bỏ chọn điểm và canh khung theo tab mới (04 D-127).

### PublicOverviewPanel (tab Tổng quan)

Như `OverviewPanel` của editor, chỉ đọc:

| Phần | Từ `lg` | Dưới `lg` |
|------|---------|-----------|
| Ảnh bìa | Full width `aspect-(--itinerary-cover-ratio) rounded-container`, chuỗi dự phòng; không có nút "Thêm ảnh bìa" | Ảnh thu nhỏ `w-(--overview-cover-thumb-width)` bên trái hàng đầu |
| Tiêu đề (`p`) | Heading 20/600 `break-words` | Body semibold `line-clamp-2` |
| `AuthorLine` | Dưới tiêu đề | Dưới hàng ảnh + tiêu đề |
| Meta | "{n} ngày · {m} điểm · {x} km" (như editor); "Khởi hành {dd/MM/yyyy}" ở đầu khi có | Như trái |
| Mô tả | Body `text-muted whitespace-pre-line line-clamp-4` | `line-clamp-2` |
| "Các ngày" + `DayOverviewRow` × N | Như editor (bấm chuyển tab, rê/focus nhấn mạnh từ `lg`) | Như editor |

Không có Badge trạng thái (khách không cần biết "Đã xuất bản"; nháp đã có `DraftStrip`). Bấm vùng nền khối không mở gì (không có dialog thông tin).

### PublicDayPanel và PublicWaypointItem (tab Ngày N)

```text
p  "{phụ đề}"                 Body semibold, chỉ khi có phụ đề (px-stack-md pt-stack-md)
p  "{X} điểm · {Y} km"        Label regular text-muted tabular-nums
ol aria-label="Điểm đến Ngày {N}"  px-stack-md py-stack-md flex-col gap-inline-sm
  li
    button type="button"  w-full min-h-touch rounded-container border border-border bg-surface px-stack-md py-stack-sm
                          flex items-start gap-inline-sm text-left hover:bg-surface-muted
      [vòng số 28px màu ngày, aria-hidden] [cột: tên Body semibold line-clamp-2 · địa chỉ Label regular text-muted line-clamp-1]
    chi tiết (chỉ khi điểm đang chọn, visible): px-stack-md pt-inline-sm
      ghi chú Body whitespace-pre-line break-words (nếu có) · link "Mở trong Google Maps" (như bài viết)
```

- Bấm nút: chọn điểm (bản đồ di chuyển tới pin, giữ zoom, pin "được chọn" + nhãn; 04 D-126). Đang chọn: `ring-2 ring-inset ring-text`, `aria-current="true"`; phần chi tiết hiện ngay sau nút (không lồng trong nút). Bấm lại nút đang chọn: giữ chọn.
- Bản đồ đang tải hoặc lỗi: nút vẫn chọn điểm và hiện chi tiết (không có pin để di chuyển).
- Mô tả sr của nút khi bản đồ sẵn sàng: "Nhấn để xem trên bản đồ" (dùng lại copy Phase 4).
- Ngày không có điểm: `EmptyState variant="compact"` icon `MapPin`, heading "Chưa có điểm đến nào trong Ngày {N}", body "Người tạo chưa thêm điểm đến cho ngày này.", không CTA.

### Trạng thái bản đồ (D-11)

| Trạng thái | Hiển thị |
|-----------|----------|
| Đang tải | `Skeleton block` phủ kín vùng bản đồ + sr "Đang tải bản đồ…" (như editor); danh sách dùng được ngay |
| Sẵn sàng | Bản đồ, pin, đường, nút zoom, nút ghi công "i" |
| Sẵn sàng, không có điểm nào | Căn theo khung tỉnh điểm đến, không có thì `VIETNAM_VIEW_BOUNDS` (04 D-121); chip `MapStatusOverlay` với `message` "Lịch trình chưa có điểm đến nào" |
| Lỗi (không WebGL, thư viện/style/tile đầu lỗi, quá 15 giây) | `InlineAlert variant="info"` (desktop: đầu vùng phải `p-section`, `max-w-content-md mx-auto`; mobile: đầu vùng bản đồ `p-stack-md`): dòng 1 "Không tải được bản đồ" (semibold), dòng 2 "Bạn vẫn xem được lịch trình dạng bài viết."; action: `Button secondary sm` "Thử lại" (`aria-label` "Thử tải lại bản đồ") + `Button secondary sm` "Xem dạng bài viết" (gap 8px, xuống dòng khi hẹp). Không có `TripSummary` dự phòng: cột trái/sheet vẫn đủ thông tin |

- "Thử lại": về Đang tải, focus vào `section` vùng bản đồ (như editor). "Xem dạng bài viết": chuyển `?view` về Bài viết (đẩy lịch sử như viên thuốc), focus vào đoạn "Bài viết" của viên thuốc ở vị trí hiện hành.
- Ghi công nút "i" luôn thấy khi bản đồ sẵn sàng, kể cả khi sheet đóng (nằm trên dải đáy).

---

## Nút Chia sẻ (`ShareButton`, PUB-04, D-12, D-15, D-17, U-08)

| Nơi | Dưới `md` | Từ `md` |
|-----|-----------|---------|
| `PublicHeader` (đã xuất bản) | `Button ghost` chỉ icon `Share2` 16px, chữ "Chia sẻ" `sr-only`, `min-h-touch min-w-touch` | `Button secondary size="sm"` icon `Share2` + "Chia sẻ" |
| `EditorHeader` (đã xuất bản, đúng chỗ nút Xuất bản, D-15) | Như trên | Như trên |

- `aria-label` "Chia sẻ lịch trình" ở mọi nơi, mọi breakpoint (chứa chữ hiển thị "Chia sẻ"). Một cây component, variant theo `useMediaQuery("(min-width: 768px)")` như `PublishButton` (giữ focus khi đổi breakpoint).
- Nháp: không render (`visible={isPublic}`) ở cả trang công khai (D-17) và editor (nút Xuất bản ở đó). Không có nút Chia sẻ ở trang 403.
- Bấm: luôn mở hộp chia sẻ (D-13), không gọi thẳng Web Share. Đóng hộp: focus về nút này.

## Hộp chia sẻ (`ShareDialog`, D-13, D-14, D-16)

Bề mặt `ResponsiveFormSurface`: `Dialog size="md"` từ `md` có nút X "Đóng" (`closeButton`), `Sheet` modal mức `expanded` dưới `md` (X sẵn có); `locked={false}`; đóng bằng X, Esc, vuốt xuống (Sheet). Không có nút "Hủy"/"Đóng" ở chân (không có thao tác để hủy).

```text
Title  "Chia sẻ lịch trình"                                         Heading
Mô tả  "Ai có link đều xem được lịch trình này."                    Body text-muted
── khối Link (flex-col gap-stack-sm) ──
FormField  nhãn "Link lịch trình"
  [ Input readOnly, giá trị URL tuyệt đối /itineraries/{id} (không ?view), chọn hết chữ khi focus ]  [ Sao chép link ]
  dòng phản hồi (aria-live="polite", luôn có trong DOM)
[ ⇪ Chia sẻ qua ứng dụng ]                       Button secondary w-full, chỉ khi trình duyệt hỗ trợ (visible)
── Separator, khối QR (flex-col items-center gap-stack-md) ──
h3 "Mã QR"                                        Label semibold, căn trái
QrCode  size-(--share-qr-size), bg-surface border border-border rounded-container p-stack-md
p  "Quét mã bằng camera điện thoại để mở lịch trình."   Label regular text-muted, căn giữa
[ ↓ Tải ảnh QR ]                                  Button secondary
── chỉ khi mở từ editor (D-16) ──
[ ↗ Mở trang công khai ]                           link ghost, căn trái
```

- Bố cục ô link: từ `sm` một hàng (`flex gap-stack-md`, Input `flex-1 min-w-0`, nút `shrink-0`); dưới `sm` xếp dọc, nút `w-full`.
- **Focus ban đầu:** nút "Sao chép link" (`initialFocus`).
- **"Sao chép link"** (`Button primary`, icon `Copy`) gọi `use-copy-link`:
  - Thành công: nhãn nút thành "Đã sao chép link" + icon `Check` trong 2000ms rồi trở lại; dòng phản hồi đọc "Đã sao chép link". Không phát toast (hộp đang mở, tránh hai thông báo chồng nhau).
  - Lỗi (không có quyền clipboard, trình duyệt cũ): chọn sẵn toàn bộ chữ trong ô link và focus ô; dòng phản hồi `text-danger` "Không sao chép được, hãy chép thủ công".
- **"Chia sẻ qua ứng dụng"** (`use-native-share`, icon `Share2`): `navigator.share({ title, url })`. Người dùng hủy (`AbortError`): im lặng. Lỗi khác: dòng phản hồi `text-danger` "Không mở được ứng dụng chia sẻ. Hãy dùng Sao chép link."
- **QR (D-14):** `QrCode` vẽ ma trận của `uqr encode(url, { ecc: "M", border: 2 })` bằng `<svg viewBox>` + `<rect>`/`<path>` JSX, module `fill-text`, nền `fill-surface`; `role="img"` `aria-label` "Mã QR của link lịch trình". Sinh tại client, không gửi link cho dịch vụ ngoài.
- **"Tải ảnh QR"** (icon `Download`): vẽ cùng ma trận lên canvas 512×512 (đen trên trắng) → PNG → tải về, tên file `tripory-{tiêu đề đã bỏ dấu, chữ thường, nối bằng "-", tối đa 60 ký tự}.png`, tiêu đề chuẩn hóa rỗng thì `tripory-{id}.png`. Lỗi: dòng phản hồi dưới nút `text-danger` "Không tải được ảnh QR. Hãy thử lại hoặc chụp màn hình mã QR."
- **"Mở trang công khai"** (D-16, chỉ editor): `<a target="_blank" rel="noopener noreferrer">` dạng `buttonVariants({ variant: "ghost", size: "sm" })`, icon `ExternalLink`, `aria-label` "Mở trang công khai (mở tab mới)", tới `/itineraries/{id}`.
- Ở 320px, Sheet có bề rộng nội dung 272px (320 − 2 × 24): QR 192px + đệm 16px × 2 = 224px vừa khung.

### Sau khi xuất bản (D-15, U-04): thứ tự toast và hộp

Mục tiêu: không bao giờ có toast "Đã xuất bản lịch trình" nằm đè lên hộp chia sẻ. Đo tay cho thấy dưới `md` Sheet `expanded` bắt đầu ở 8dvh (45px ở 568px, 67px ở 844px), còn toast mobile chiếm đỉnh màn hình từ 16px + safe-area, cao khoảng 56px, nên nếu hiện cùng lúc toast sẽ che tay cầm và nút X của Sheet. Vì vậy:

1. Bấm "Xuất bản" trong `PublishDialog` → thành công: **không** phát toast lúc này (`PublishDialog successToast={false}`), đóng `PublishDialog`.
2. Sau khi `PublishDialog` đóng xong (`onOpenChangeComplete(false)`), editor mở `ShareDialog` (tiêu đề thường "Chia sẻ lịch trình", focus ở "Sao chép link"). Không mở cùng nhịp với lúc hộp xuất bản đang đóng (tránh tranh focus trap, 05-RESEARCH Pitfall 6).
3. Khi hộp chia sẻ tự mở này đóng xong (bất kỳ cách nào), phát **một** toast success "Đã xuất bản lịch trình" (vị trí `top-right` sẵn có, 5 giây), rồi focus về nút "Chia sẻ" trên header (nút có sẵn khi dữ liệu đã tải lại `isPublic: true`; chưa có thì focus nút "i" "Thông tin chuyến đi").
4. Mở hộp chia sẻ bằng nút "Chia sẻ" (không phải ngay sau xuất bản) thì đóng không phát toast.
5. Lỗi xuất bản: giữ nguyên Phase 4 (`InlineAlert` trong `PublishDialog`, hộp vẫn mở, không mở hộp chia sẻ, không toast).

Như vậy trong cả luồng, tại một thời điểm chỉ có một thông báo: hộp chia sẻ (đang mở), rồi toast (sau khi hộp đóng). Badge "Đã xuất bản" và nút "Chia sẻ" thay nút "Xuất bản" trên header vẫn cập nhật ngay sau bước 1 (phía sau scrim).

---

## Trang 403 (`PublicForbidden`, D-21, U-03)

- Khách hoặc người không phải chủ mở bản nháp. Trang tự render (không `forbidden()`), `noindex`, title "Lịch trình · Tripory", không lộ tiêu đề, ảnh hay tác giả.
- Header: `PublicHeader` chỉ có logo.
- Thân: `div mx-auto flex w-full max-w-content-lg flex-1 flex-col justify-center px-page-inline py-page-block sm:px-page-inline-md lg:px-page-inline-lg lg:py-page-block-wide` (cùng khung `EditorForbidden`) chứa `EmptyState variant="page"`: icon `Lock` (`lg`), heading "Lịch trình này chưa được xuất bản", body "Chỉ người tạo xem được bản nháp.", action link `buttonVariants({ variant: "primary" })` "Về trang chủ" → `/`.
- Không có nút "Đăng nhập", không có ô tài khoản (D-21, U-03).
- Chủ có phiên nhưng access token hết hạn: không hiện trang này ngay; hồi phục phiên trước (D-22, §Trạng thái).

## Trạng thái trang công khai

| Trạng thái | Hiển thị |
|------------|----------|
| Đang tải (`loading.tsx`, Suspense) | `PublicHeader` có logo + `Skeleton circle` 32px ở ô tài khoản (không có Sửa/Chia sẻ/viên thuốc). Thân `PublicItinerarySkeleton`: khung bài viết `max-w-content-md` gồm `Skeleton block` ảnh bìa 16:9, `Skeleton text` tiêu đề 2 dòng, 1 dòng meta, hàng 3 chip `Skeleton` cao 44px, 2 khối ngày (1 dòng tiêu đề + 2 `Skeleton block` cao 64px). `p.sr-only role="status"` "Đang tải lịch trình…". Sau 5 giây: `SubmitStatus pending` hiện "Máy chủ đang khởi động, có thể mất tới 30 giây…" (`aria-live="polite"`) dưới khung |
| Đang hồi phục phiên (403 + phiên `stale`, D-22) | `SessionRecovery` với fallback là đúng skeleton trên (không nháy nội dung 403). Refresh thành công thì tải lại trang; hết phiên thật thì theo Phase 3 D-20 (chuyển `/login`, toast info "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"); lỗi tạm thời thì `ErrorState` "Thử lại" của `SessionRecovery` |
| Lỗi mạng/5xx/timeout/dữ liệu sai hình | `PublicHeader` logo + ô tài khoản; thân `ErrorState variant="page"`: heading "Không tải được lịch trình", body "Đã xảy ra sự cố khi tải lịch trình. Kiểm tra kết nối mạng rồi thử lại.", nút "Thử lại" (tải lại dữ liệu trang, giữ `?view`). Title "Lịch trình · Tripory" |
| 404 / id sai GUID | Trang not-found sẵn có (`NotFoundView`: "Không tìm thấy trang" / "Trang bạn đang tìm không tồn tại hoặc đã được di chuyển." / "Về trang chủ"), `noindex` |
| 403 | §Trang 403 |
| Có dữ liệu, không có ngày nào | Hero như thường; thay dải chip và danh sách ngày bằng `EmptyState variant="compact"` icon `MapPin`, heading "Lịch trình chưa có điểm đến nào", body "Người tạo chưa thêm điểm đến vào lịch trình này. Hãy quay lại sau.", không CTA |
| Có dữ liệu, có ngày nhưng không có điểm nào | Mỗi ngày "Chưa có điểm" (D-05); meta hero "… · Chưa có điểm" |
| Có dữ liệu | §Chế độ Bài viết / §Chế độ Bản đồ theo `?view` |

---

## Điều hướng đổi từ Phase 4 (D-24, D-25)

- **Menu thẻ đã xuất bản (D-24, U-09):** thêm `DropdownMenuLinkItem` icon `Eye` 16px "Xem trang công khai" ngay sau "Mở", trước separator; `next/link` tới `/itineraries/{id}`, mở trong tab hiện tại. Thẻ nháp không có mục này. Bấm thẻ vẫn vào editor.
- **Không phải chủ mở editor của lịch trình đã xuất bản (D-25):** chuyển hướng `replace` sang `/itineraries/{id}`, không có trang trung gian hay toast. Trong lúc chờ chuyển hiện skeleton editor sẵn có. Nháp của người khác vẫn là trang 403 editor ("Bạn không có quyền sửa lịch trình này").

---

## Preview link (PUB-05, D-18..D-20): phần nhìn thấy

- `og:title` = tiêu đề; `og:description` = mô tả đã chuẩn hóa khoảng trắng, cắt khoảng 160 ký tự + "…"; mô tả trống thì "Lịch trình {N} ngày · {X} điểm trên Tripory" (D-19); `og:site_name` "Tripory"; `twitter:card` `summary_large_image`.
- `og:image`: ảnh bìa người dùng tự thêm (URL `https://`, không bắt đầu bằng gốc ảnh điểm đến); ngược lại ảnh OG mặc định (D-18).
- **Ảnh OG mặc định** (1200×630 PNG, file/route tĩnh, URL tuyệt đối): nền `#FAFAF9` (`background`), wordmark "Tripory" màu của token `text` căn giữa, rộng khoảng 1/3 ảnh, semibold; một vạch ngang `#C44728` (`primary`) dài bằng wordmark, dày khoảng 1/80 chiều cao, cách dưới wordmark; không có chữ khác (chỉ ASCII, font mặc định của trình tạo ảnh không đảm bảo dấu tiếng Việt). Là tài sản ảnh, nằm ngoài thang chữ UI.
- Mọi trạng thái `noindex, nofollow`; 403/404/lỗi/hồi phục: metadata trung tính "Lịch trình · Tripory", không có `openGraph` riêng (D-20).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (hộp chia sẻ) | "Sao chép link" → "Đã sao chép link" (D-13) |
| Chuyển chế độ (D-09) | Nhóm `aria-label` "Chế độ xem"; đoạn "Bài viết", "Bản đồ" |
| Header | Logo "Tripory"; Sửa: chữ "Sửa", `aria-label` "Sửa lịch trình" (D-23); Chia sẻ: chữ "Chia sẻ", `aria-label` "Chia sẻ lịch trình" (D-12); khách: "Đăng nhập" (Phase 3) |
| Dải bản nháp (D-23) | "Bản nháp – chỉ bạn thấy"; nút "Sửa" (`aria-label` "Sửa lịch trình") |
| Tác giả (D-02) | "{displayName}"; Badge "Lịch trình của bạn" |
| Meta hero (D-01) | "Khởi hành {dd/MM/yyyy}", "{n} ngày", "{m} điểm" / "Chưa có điểm", "{x} km", nối " · " |
| Dải chip ngày (D-06) | `nav aria-label` "Các ngày trong lịch trình"; chip "Ngày {N}" |
| Mục ngày (D-04, D-05) | `h2` "Ngày {N} · {phụ đề}" / "Ngày {N}"; dòng phụ "{X} điểm · {Y} km" / "{X} điểm"; ngày trống "Chưa có điểm"; danh sách `aria-label` "Điểm đến Ngày {N}" |
| Điểm (D-03) | Link "Mở trong Google Maps", `aria-label` "Mở {tên} trong Google Maps (mở tab mới)" |
| Chế độ Bản đồ | Tab "Tổng quan", "Ngày {N}"; "Các ngày", dòng ngày và tên truy cập như Phase 4 (§Danh sách ngày ở Tổng quan); mô tả sr nút điểm "Nhấn để xem trên bản đồ"; vùng bản đồ, canvas, zoom, ghi công, nhãn quần đảo: copy Phase 4 |
| Bản đồ không có điểm | "Lịch trình chưa có điểm đến nào" |
| Ngày trống (chế độ Bản đồ) | Heading "Chưa có điểm đến nào trong Ngày {N}"; body "Người tạo chưa thêm điểm đến cho ngày này." |
| Lỗi bản đồ (D-11) | "Không tải được bản đồ" + "Bạn vẫn xem được lịch trình dạng bài viết." + "Thử lại" (`aria-label` "Thử tải lại bản đồ") + "Xem dạng bài viết" |
| Hộp chia sẻ (D-13, D-14, D-16) | Title "Chia sẻ lịch trình"; mô tả "Ai có link đều xem được lịch trình này."; nhãn "Link lịch trình"; "Sao chép link" / "Đã sao chép link" / "Không sao chép được, hãy chép thủ công"; "Chia sẻ qua ứng dụng" / "Không mở được ứng dụng chia sẻ. Hãy dùng Sao chép link."; tiêu đề "Mã QR"; QR `aria-label` "Mã QR của link lịch trình"; "Quét mã bằng camera điện thoại để mở lịch trình."; "Tải ảnh QR" / "Không tải được ảnh QR. Hãy thử lại hoặc chụp màn hình mã QR."; "Mở trang công khai" (`aria-label` "Mở trang công khai (mở tab mới)"); nút X "Đóng" (sẵn có) |
| Toast (D-15, U-04) | "Đã xuất bản lịch trình" (success, sau khi hộp chia sẻ tự mở đã đóng) |
| Menu thẻ (D-24) | "Xem trang công khai" |
| 403 (D-21, chuỗi khóa) | Heading "Lịch trình này chưa được xuất bản"; body "Chỉ người tạo xem được bản nháp."; action "Về trang chủ" |
| Empty: không có ngày | Heading "Lịch trình chưa có điểm đến nào"; body "Người tạo chưa thêm điểm đến vào lịch trình này. Hãy quay lại sau." |
| Error (trang) | Heading "Không tải được lịch trình"; body "Đã xảy ra sự cố khi tải lịch trình. Kiểm tra kết nối mạng rồi thử lại."; nút "Thử lại" |
| Loading (sr) | "Đang tải lịch trình…"; "Đang tải bản đồ…"; cold start "Máy chủ đang khởi động, có thể mất tới 30 giây…" |
| 404 | Copy not-found sẵn có |
| Document title | "{tiêu đề} · Tripory"; "Lịch trình · Tripory" (403, lỗi, hồi phục) |
| OG (D-19) | Mô tả rút gọn + "…"; dự phòng "Lịch trình {N} ngày · {X} điểm trên Tripory" |
| Skip link | "Bỏ qua đến nội dung chính" (Phase 1) |
| Destructive | Không có hành động phá hủy mới trong Phase 5 |

Giọng văn theo Phase 1/3/4: tiếng Việt trung tính, câu ngắn, không dấu chấm than; câu lỗi/hướng dẫn có dấu chấm cuối, nhãn nút/toast/chuỗi khóa D-13 giữ nguyên dấu câu đã khóa. Thuật ngữ: "lịch trình", "điểm đến"/"điểm", "Ngày N", "bản nháp", "xuất bản", "link" (giữ như Phase 4). Tên riêng giữ nguyên: Tripory, Google Maps, OpenStreetMap, OpenFreeMap, OpenMapTiles.

---

## Accessibility Checklist (bổ sung Phase 1/3/4)

- Một `h1` trong cây a11y mỗi chế độ (§Khung trang). `h2` cho mục ngày, `h3` cho tên điểm và "Mã QR". Vùng bản đồ dùng `section` + `h2.sr-only` "Bản đồ lịch trình" (Phase 4).
- Skip link tới vùng nội dung của chế độ đang hiện.
- Viên thuốc: `SegmentedControl` có tên "Chế độ xem", `aria-pressed`, một điểm dừng Tab, mũi tên di chuyển, Space/Enter chọn; đổi chế độ không làm mất focus (§Viên thuốc).
- Chip ngày: link thật dùng được bằng Tab/Enter, `aria-current="true"` cho ngày đang đọc, đang đọc khác bằng weight chứ không chỉ màu; sau khi bấm focus vào `h2` của ngày.
- Mọi nút icon-only có `aria-label`: Sửa ("Sửa lịch trình"), Chia sẻ ("Chia sẻ lịch trình"), X "Đóng", zoom, ghi công. Link mở tab mới nói rõ trong tên truy cập "(mở tab mới)".
- Hộp chia sẻ: title + mô tả gắn vào dialog; focus đầu ở "Sao chép link"; trap focus (modal); Esc đóng; trả focus về nút mở (luồng sau xuất bản: §Sau khi xuất bản bước 3). Dòng phản hồi sao chép/chia sẻ/tải QR `aria-live="polite"` luôn có trong DOM. QR là `role="img"` có tên.
- Chế độ Bản đồ: như Phase 4 (pin `aria-hidden`, danh sách là đường chính, canvas có `aria-label` và mô tả, Esc trên canvas bỏ chọn); nút điểm `aria-current` khi chọn; chi tiết điểm đặt ngay sau nút trong DOM. Sheet không modal không trap focus; thứ tự DOM dưới `lg`: khối dính → vùng bản đồ → sheet (tab, thân, thanh đáy viên thuốc) → dải đáy (khi sheet đóng).
- Dải bản nháp là chữ thường (không phải live region); trạng thái nháp không chỉ bằng màu nền (có icon + chữ).
- Vùng chạm ≥ 44px: nút header, chip ngày, đoạn viên thuốc, chip "Lịch trình", link Google Maps, nút trong hộp chia sẻ, nút điểm, tab.
- `prefers-reduced-motion`: cuộn tới ngày, chip vào khung, canh khung/di chuyển bản đồ đều nhảy thẳng; đọc media query lúc thao tác.
- Smoke ở 320×568, 390×844, 768×1024, 1440×900: không overflow ngang (header, dải chip, dải đáy chip + viên thuốc, hộp chia sẻ); viên thuốc thấy được và bấm được ở Bài viết, ở cả ba mức sheet và khi sheet đóng; nút ghi công "i" không bị dải đáy che; toast không bao giờ hiện cùng lúc với hộp chia sẻ; tiêu đề và tên điểm dài xuống dòng, không tràn.

---

## Testing Contract (UI)

| Đối tượng | Test bắt buộc |
|-----------|---------------|
| `SegmentedControl` | Theo cột Contract ở Component Inventory |
| `usePublicView` / `ViewModeToggle` | Đọc `?view=map`; thiếu hoặc giá trị lạ → Bài viết; đổi chế độ gọi `history.pushState` một lần (không `router.push`); popstate khôi phục chế độ; nhãn "Bài viết"/"Bản đồ", tên nhóm "Chế độ xem" |
| `PublicHeader` | Khách: logo, Chia sẻ (khi đã xuất bản), "Đăng nhập"; chủ đã xuất bản: Sửa + Chia sẻ + menu tài khoản; chủ xem nháp: không Sửa, không Chia sẻ; 403: chỉ logo; viên thuốc chỉ có trên header từ `lg` |
| `DraftStrip` | Chỉ hiện khi chủ xem nháp; đúng chuỗi "Bản nháp – chỉ bạn thấy"; link "Sửa" tới `/itineraries/{id}/edit`, tên "Sửa lịch trình" |
| `ArticleHero` / `AuthorLine` | Meta bỏ ngày khởi hành khi null, bỏ km khi 0, "Chưa có điểm" khi 0 điểm; không hiện điểm đến/sở thích; mô tả trống không render; bốn ca của bảng AuthorLine; avatar dicebear → chữ cái đầu; không có email trong DOM |
| `DayChipStrip` | Đủ chip Ngày 1..max (ngày thưa); bấm chip gọi `scrollIntoView` (`auto` khi reduced motion), không đổi `location.hash`, focus `h2`; `aria-current` theo `fake-intersection-observer`; không render khi không có ngày |
| `ArticleDaySection` / `ArticleWaypoint` | "Ngày N · phụ đề"/"Ngày N"; dòng phụ có/không km; ngày trống "Chưa có điểm"; số thứ tự theo `orderIndex`; ghi chú có xuống dòng render text (chuỗi `<b>` hiện nguyên văn, không thành thẻ); link Maps đúng `href`, `target`, `rel`, `aria-label` |
| `PublicMapMode` | Tab mặc định Tổng quan; không có nút thêm/sửa/xóa/kéo/phụ đề/bánh răng/"+ Thêm ngày"; bấm dòng ngày chuyển tab; bấm nút điểm chọn pin (fake map), `aria-current`, hiện chi tiết; bấm pin chọn dòng; lỗi bản đồ hiện đúng copy + "Thử lại" + "Xem dạng bài viết" (chuyển về Bài viết, focus đoạn "Bài viết"); không có điểm → chip "Lịch trình chưa có điểm đến nào" |
| Viên thuốc dưới `lg` (Bản đồ) | Sheet mở: viên thuốc nằm trong thanh đáy sheet; sheet đóng: dải đáy có chip "Lịch trình" và viên thuốc; đổi chỗ khi đang focus thì focus sang đoạn đang chọn ở vị trí mới |
| `EditorMapArea` (prop mới) | Không truyền `errorHint`/`errorActions` thì copy Phase 4 không đổi (test cũ vẫn xanh); truyền thì hiện đúng |
| `ShareButton` | `aria-label` "Chia sẻ lịch trình"; icon-only dưới `md`, có chữ từ `md`; không render khi nháp |
| `ShareDialog` | Title/mô tả đúng copy; URL tuyệt đối không có `?view`; focus đầu ở "Sao chép link"; copy thành công đổi nhãn rồi về sau 2000ms (fake timers), live region "Đã sao chép link", không gọi `notify`; copy lỗi chọn chữ trong ô và hiện câu lỗi; "Chia sẻ qua ứng dụng" ẩn khi không có `navigator.share`; `AbortError` không hiện gì; lỗi khác hiện câu lỗi; QR là `<svg role="img">` có tên, không có `dangerouslySetInnerHTML`; "Tải ảnh QR" tạo PNG với tên file chuẩn hóa (bảng ca: có dấu, rỗng → id); "Mở trang công khai" chỉ có khi mở từ editor, `target="_blank"` + `rel` |
| Luồng sau xuất bản | Thành công: không toast khi hộp xuất bản đóng; hộp chia sẻ mở sau `onOpenChangeComplete(false)`; đóng hộp chia sẻ thì gọi `notify.success("Đã xuất bản lịch trình")` đúng một lần, focus về "Chia sẻ" (hoặc "i"); mở hộp bằng nút Chia sẻ rồi đóng thì không toast; lỗi xuất bản giữ hành vi Phase 4 |
| `PublishDialog` | `successToast` mặc định `true` giữ toast như Phase 4 |
| `EditorHeader` | Đã xuất bản: "Chia sẻ" ở đúng chỗ nút Xuất bản; nháp: nút Xuất bản như cũ |
| `ItineraryCard` | Đã xuất bản có "Xem trang công khai" tới `/itineraries/{id}` sau "Mở"; nháp không có |
| Editor (D-25) | Không phải chủ + đã xuất bản → `replace` sang trang công khai; không phải chủ + nháp → 403 editor như cũ |
| `PublicForbidden` | Copy D-21 nguyên văn; link "Về trang chủ" tới `/`; không có "Đăng nhập", không có tiêu đề lịch trình |
| Trạng thái trang | Skeleton + status sr; cold start sau 5000ms; `recover` dùng skeleton làm fallback; lỗi hiện đúng copy + "Thử lại" |
| `itinerary-invariants` | Thu hẹp test cấm "Chia sẻ" (chỉ còn "Tải thêm", 05-RESEARCH Pitfall 5); thêm: không `dangerouslySetInnerHTML` trong `modules/itinerary/ui`; mọi `<img` có `referrerPolicy`; mọi link `target="_blank"` có `rel="noopener noreferrer"` |
| Token | `--share-qr-size` tồn tại trong `components.css` và `tokens.test.ts`; `size-(--share-qr-size)` có CSS thật (guard sẵn có) |

Test bằng Vitest + Testing Library (jsdom), fake `HttpClient`/`fake-react-map-gl`/`fake-intersection-observer`, mock `navigator.clipboard`, `navigator.share`, `HTMLCanvasElement.toBlob`, `URL.createObjectURL`. Không test pixel. Bước kiểm bằng mắt và preview Zalo/Messenger nằm trong UAT.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Không thêm block. `SegmentedControl` viết tay trên Base UI 1.8.0 `toggle-group`/`toggle` đã có trong repo, theo pattern `ToggleChip` của Phase 4 | not required — official only, `registries: {}` kiểm lại 2026-11-09 (`apps/web/components.json`) |
| Third-party | none | not applicable — không khai báo registry thứ ba. `uqr` 0.1.3 là thư viện npm (MIT, unjs, zero dependency, pin cứng trong `catalog:`), không phải registry block; chỉ dùng `encode()` |

---

## Source Traceability

| Source | Quyết định dùng |
|--------|-----------------|
| `05-CONTEXT.md` | D-01..D-06 (bài viết, tác giả, điểm, ngày, ngày trống, chip ngày), D-07..D-11 (chế độ, `?view`, vị trí nút, bản đồ chỉ đọc, lỗi bản đồ), D-12..D-17 (nút và hộp chia sẻ, QR, editor, mở trang công khai, ẩn khi nháp), D-18..D-21 (OG, noindex, 403), D-22 (Bearer stale → hồi phục), D-23 (banner nháp, Sửa), D-24, D-25 (điều hướng đổi từ Phase 4); Claude's Discretion: copy phụ, ngưỡng chip, toast sau xuất bản |
| Người dùng (phiên UI 2026-11-09) | U-01..U-09 |
| `05-RESEARCH.md` | Stack (`uqr`, không `renderSVG`), tách route group toàn màn hình, `pushState` cho `?view`, tách bản đồ chỉ đọc (prop tùy chọn của `EditorMapArea`, xuất `WideBody`/`NarrowBody`), Pitfall 2 (404/200 khi stream), 5 (test "Chia sẻ"), 6 (hai dialog nối tiếp), 9 (avatar dicebear), 10 (ảnh OG) |
| `04-UI-SPEC.md` | Toàn bộ hợp đồng bản đồ và Tổng quan, header editor và `PublishButton` (vị trí nút Chia sẻ), `PublishDialog`, `EditorForbidden`, `ResponsiveFormSurface`, copy và giọng văn |
| `04-UI-REVIEW.md` | Vùng chạm ≥ 44px cho nút chính của thẻ/điểm (Top fix 1), không chồng padding đáy trong Sheet (Top fix 2: thanh đáy viên thuốc dùng cơ chế đã sửa), header rút gọn không lộ tiêu đề (Top fix 3: 403 công khai chỉ logo) |
| `01-UI-SPEC.md`, `03-UI-SPEC.md` | Token, typography, màu, focus ring, Sheet snap, AppHeader (logo), skip link, 404, `AccountSlot`/`UserMenu`, `SessionRecovery`, cold start |
| Code | `components.css` (token có sẵn), `theme.css` (5 cỡ chữ có sẵn, Phase 5 dùng 4), `app-header.tsx`, `app-shell.tsx`, `editor-header.tsx`, `editor-layout.tsx` (chip "Lịch trình", sheet), `editor-map-area.tsx`, `map-status-overlay.tsx`, `publish-dialog.tsx`, `responsive-form-surface.tsx`, `itinerary-card.tsx`, `cover-image.tsx`, `toast.tsx` (vị trí, thời lượng), `button.tsx` (kích thước) |
| FE cũ | `ModeTogglePill` (viên thuốc hai đoạn, nhóm có tên), `PublicHeader` (bố cục header, chỉ tham khảo; bỏ like/comment/fork/tin nhắn) |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS (FLAG 1)
- [x] Dimension 2 Visuals: PASS (FLAG 2)
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-11-09 (UI checker lượt 1, không có BLOCK). Checker chạy trong phiên orchestrator theo `gsd-ui-checker.md` vì môi trường không có công cụ spawn subagent; trước khi chấm đã sửa hai điểm tự phát hiện: bảng spacing ghi 32px cho khoảng mà bố cục ghi 24px (đã thống nhất), và lớp `z-modal` của dải đáy nổi trên scrim của Dialog (đổi sang `z-sticky`).

| Dimension | Verdict | Ghi chú |
|-----------|---------|---------|
| 1 Copywriting | PASS + FLAG | CTA "Sao chép link" (động từ + danh từ); empty có hướng đi tiếp; lỗi trang, lỗi bản đồ, lỗi sao chép/chia sẻ/tải QR đều có cách xử lý; chuỗi khóa D-13, D-21, D-23 chép nguyên văn; không có hành động phá hủy |
| 2 Visuals | PASS + FLAG | Tiêu điểm khai báo cho Bài viết (ảnh bìa → `h1`), Bản đồ desktop và mobile; nút icon-only đều có `aria-label`; pin có đường thay thế qua danh sách |
| 3 Color | PASS | 60/30/10 khai báo; accent giới hạn 5 mục cụ thể; màu ngày là màu dữ liệu; danger chỉ cho dòng lỗi |
| 4 Typography | PASS | 4 cỡ (14/16/20/28), 2 weight (400/600), line-height 1.5/1.2; không dùng `caption` 12px |
| 5 Spacing | PASS | Chỉ 4/8/16/24/32/48/64; một token sizing mới `--share-qr-size` (192px) có lý do; các số khác là sizing hoặc số đo tay |
| 6 Registry Safety | PASS | shadcn official, không block mới; `uqr` là thư viện npm |

Khuyến nghị (không chặn):

- **FLAG 1 (Dimension 1):** nút "Sửa" chỉ một từ. Giữ vì là chuỗi khóa D-23; tên truy cập là "Sửa lịch trình".
- **FLAG 2 (Dimension 2):** bề rộng dải đáy (chip "Lịch trình" + viên thuốc) ở 320px là số tính tay (266/288px); executor đo lại trên trình duyệt. Nếu tràn, ẩn icon của chip "Lịch trình" dưới `sm` trước khi đổi gì khác.
- **Ghi chú cho UAT (D-15, U-04):** toast "Đã xuất bản lịch trình" được giữ nhưng hiện **sau khi** hộp chia sẻ tự mở đóng lại, không hiện cùng lúc (lý do đo ở §Sau khi xuất bản). Người dùng xác nhận cảm giác thứ tự này khi UAT; đổi lại chỉ cần chuyển thời điểm gọi `notify.success`.
