# Phase 4 — UI Review

**Audited:** 2026-10-24 (nhánh `phase_4`)
**Baseline:** `04-UI-SPEC.md` (hợp đồng thiết kế, kèm ghi chú token của UI checker) + `04-CONTEXT.md` (D-01..D-51)
**Screenshots:** không chụp. Công cụ `mcp__playwright__*` không có trong phiên này và theo yêu cầu không khởi động dev server, nên đây là audit **code-only**. Không tạo thư mục `.planning/ui-reviews/` vì không có ảnh nào cần lưu. Mục cần phán đoán trên trình duyệt/thiết bị thật được đánh dấu `needs_human_review: true`.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Chuỗi khóa D-39/D-42/D-35/D-48/toast/empty khớp nguyên văn; không có "Tải thêm", không có UI lỗi cuối lưới, không có hộp/nút "Chia sẻ" |
| 2. Visuals | 3/4 | Phân cấp và icon button có `aria-label` đầy đủ; nút chính của thẻ waypoint thấp hơn 44px khi chỉ có tên; padding kép của Sheet làm lệch thanh "Thêm điểm đến" sticky |
| 3. Color | 4/4 | Không màu hard-code; chỉ dùng semantic token; accent đúng danh sách cho phép |
| 4. Typography | 4/4 | Chỉ 4 cỡ (`text-label/body/heading/display`), 2 weight (400/600); không có `text-xs/sm/...` hay `font-medium/bold` |
| 5. Spacing | 3/4 | Hầu hết dùng token; còn vài giá trị tailwind số (`size-6`, `w-40`, `w-60`) và `calc()` trộn token với `env()`; hợp lý nhưng ngoài scale đã khai báo |
| 6. Experience Design | 3/4 | Đủ state loading/empty/error/403/404, a11y tốt; còn các điểm cần xác nhận trên thiết bị thật (kéo thả trong Sheet, bàn phím ảo, tương tác Tooltip/dải giải thích) và lệch nhỏ so với spec ở header rút gọn |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Nút chính của thẻ waypoint có thể thấp hơn 44px** — người dùng cảm ứng chạm hụt khi điểm đến chỉ có tên, không có địa chỉ (8 + 24 + 8 = 40px) — thêm `min-h-touch` (hoặc `self-stretch`) cho nút chính tại `sortable-waypoint-item.tsx:80-82`. Container đã có `items-center` nên nút không giãn theo hàng.
2. **Thanh "Thêm điểm đến" sticky trong Sheet có khoảng đệm kép** — trên mobile `SheetContent` có `p-stack-lg` (24px) và `pb` + safe-area (`sheet.tsx:182`), còn `TimelinePanel` tự thêm `sticky bottom-0 ... pb-[calc(stack-md + safe-area)]` (`timeline-panel.tsx:75`). Thanh sticky dính ở mép trong của vùng padding chứ không dính đáy sheet, và safe-area bị cộng hai lần. Hậu quả: thanh nổi cách đáy ~24px, danh sách lộ phía dưới. Sửa: cho `SheetContent` của timeline không padding (prop hoặc `className="p-0"`) để panel tự quản padding, rồi xác nhận trên iPhone thật.
3. **Header rút gọn của 403/lỗi hiện tiêu đề "Sửa lịch trình" thay vì không tiêu đề** — spec §Trạng thái trang editor: 403 chỉ có back + `UserMenu compact`, không tiêu đề (`itinerary-editor.tsx:115`, `editor-header.tsx:170`). Không lộ dữ liệu lịch trình nên chỉ là lệch contract, nhưng nên truyền `title` rỗng cho nhánh 403, hoặc cập nhật spec nếu giữ tiêu đề chung để người dùng định hướng.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Đối chiếu với bảng Copywriting Contract:

- Dialog xuất bản (D-39): "Xuất bản lịch trình?" `publish-dialog.tsx:76`; mô tả `publish-dialog.tsx:31`; toast "Đã xuất bản lịch trình" `publish-dialog.tsx:36`.
- Dialog xóa lịch trình (D-42): `IRREVERSIBLE` `delete-itinerary-dialog.tsx:31`, câu thêm `SHARE_LINK_GONE` `:32` (chỉ khi đã xuất bản), toast "Đã xóa lịch trình" `:36`.
- Rời trang (D-35): "Thay đổi đang được lưu. Rời trang?" / "Nếu rời ngay..." / "Ở lại" / "Rời trang" `leave-guard.tsx:44-49`.
- Vị trí: `LOCATION_INVALID`, `LOCATION_NO_COORDINATE` (D-48), `LOCATION_RESOLVE_FAILED`, `LOCATION_RESOLVING`, "Đã nhận: ..." `location-field.tsx:20-25,197`.
- Undo toast: `Đã xóa "${name}"` + "Hoàn tác" `use-pending-delete.ts:78-79`. Toast "Danh sách đã thay đổi, đã tải lại" `waypoint-list.tsx:42`. Hủy kéo: "Đã hủy. ... trở lại vị trí ..." `dnd-announcements.ts:22`.
- Empty theo tab: `my-itineraries-view.tsx:35-41`; ngày trống: `waypoint-list.tsx:192-193`. 403: `editor-forbidden.tsx` (heading, body, link, document title đúng).
- Chỉ báo lưu: "Đang lưu…", "Lỗi – Thử lại", "Đã lưu" `save-indicator.tsx:23-33`. Phụ đề ngày, "Xóa ngày", "Xóa ảnh bìa", "Đã khôi phục nội dung chưa lưu" đều có.
- D-02: `my-itineraries-view.tsx` không có nút "Tải thêm"; trang kế lỗi không render gì (chỉ skeleton khi `isFetchingNextPage`, `:233-241`).
- D-40: chỉ có chú thích trong code ở `publish-button.tsx:11`, `publish-dialog.tsx:6`; không có component/nút "Chia sẻ".
- Giọng văn nhất quán ("điểm đến", "lịch trình", không dấu chấm than). Không có chuỗi chung chung ("Submit", "OK") trong UI.

Ghi chú: `format.ts` in ra mojibake khi đọc bằng console PowerShell (lỗi hiển thị của terminal, không phải lỗi mã hóa nguồn; các file khác đọc đúng bằng công cụ đọc file). Không tính là lỗi.

### Pillar 2: Visuals (3/4)

- Focal point rõ: danh sách có `h1` Display + CTA primary duy nhất; editor có header, timeline, canvas với tiêu đề Display.
- Mọi icon button có `aria-label`: back `editor-header.tsx:42`, ⋯ `:124`, tay cầm `sortable-waypoint-item.tsx:67`, ⋯ thẻ `itinerary-card.tsx:47`, ⋯ waypoint `:101`.
- Thẻ lịch trình: cả thẻ bấm được bằng link tiêu đề kéo giãn, menu ở `z-base` bên trên, focus ring bao cả thẻ qua `has-[a:focus-visible]` `itinerary-card.tsx:38`.
- Waypoint: tay cầm → nút chính → ⋯ tách riêng, không lồng tương tác. Thẻ kéo có placeholder nét đứt và overlay `shadow-md` đúng spec.
- **Vấn đề 1 (Top fix 1):** `sortable-waypoint-item.tsx:80-82` không có `min-h-touch`.
- **Vấn đề 2 (Top fix 2):** xem phần Spacing/Experience; ảnh hưởng ngoại hình thanh sticky trong Sheet.
- Số thứ tự waypoint `size-6` (24px) là yếu tố trang trí `aria-hidden`, chấp nhận được.

### Pillar 3: Color (4/4)

- Quét `#hex`, `rgb(`, `z-[`, giá trị px/rem tùy ý trong `modules/itinerary/ui`, `app/(dashboard)`, `components`: **không có kết quả** (ngoài test).
- Token đã sửa theo ghi chú của UI checker: `theme.css:17-23` có cả `--color-text-*` lẫn `--text-color-*` nên `text-muted/subtle/disabled` sinh CSS thật; `theme.css:103-108` ánh xạ `--z-index-*` nên `z-sticky/z-overlay/z-modal/z-toast` hoạt động. `text-disabled` dùng ở `publish-button.tsx:25` giờ có hiệu lực.
- Accent: dùng cho CTA primary, vạch tab, focus ring, highlight waypoint mới (`bg-primary-subtle border-primary-border`, `sortable-waypoint-item.tsx:57`), viền overlay kéo. Nút "Thêm điểm đến" cuối danh sách là `secondary`, "Thêm ngày" là `ghost`, tay cầm/⋯ là `text-muted`, số thứ tự là `bg-surface-muted`. Khớp danh sách "không dùng accent".
- Destructive: `variant="danger"` cho "Xóa"/"Rời trang"; "Xóa điểm đến" là `ghost` + `text-danger`; chỉ báo lỗi `text-danger`. Đúng spec.
- Trạng thái không chỉ truyền bằng màu: Badge có chữ, chỉ báo lưu có icon + chữ.

### Pillar 4: Typography (4/4)

- Tìm `text-(xs|sm|base|lg|xl|2xl|3xl)` và `font-(medium|bold|light)`: không có.
- Chỉ dùng `text-label` (14), `text-body` (16), `text-heading` (20), `text-display` (28); weight chỉ `font-semibold` và mặc định.
- Vai trò khớp spec: `h1` danh sách Display; tiêu đề header editor Body semibold, `truncate` (`editor-header.tsx:111`); tiêu đề canvas Display, mobile Heading (`trip-summary.tsx:75`); km/số dùng `tabular-nums` (`day-tabs.tsx:91`, `trip-summary.tsx:63`).

### Pillar 5: Spacing (3/4)

- Dùng token: `gap-stack-*`, `gap-inline-*`, `px-page-inline*`, `p-section` (canvas desktop `editor-layout.tsx:66`), `min-h-header`, `min-h-touch`, `size-touch`, `max-w-content-md`.
- `--editor-timeline-width` và `--itinerary-cover-ratio` được dùng đúng qua `grid-cols-[var(--editor-timeline-width)_1fr]` và `aspect-(--itinerary-cover-ratio)` (`editor-layout.tsx:58`, `my-itineraries-view.tsx:63`, `trip-summary.tsx:54`).
- Giá trị tùy ý còn lại, đều có lý do: `pt-[env(safe-area-inset-top)]` (`editor-header.tsx:36`), `pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))]` (`timeline-panel.tsx:75`), `height: calc(100dvh - headerHeight px)` (`editor-layout.tsx:60`, đo bằng ResizeObserver theo quyết định có chủ đích), `pb-(--sheet-snap-peek)` (`editor-layout.tsx:69`). `size-6` (`sortable-waypoint-item.tsx:90`), `w-40`/`w-60`/`w-2/3` ở Skeleton là kích thước tailwind, nằm ngoài scale spacing đã khai báo nhưng không phải spacing giữa các phần tử. Trừ 1 điểm vì không có token cho "kích thước chip số thứ tự" và Skeleton.
- Đơn vị `dvh` dùng nhất quán (`min-h-dvh`, `h-dvh`, `--sheet-snap-*` ở `components.css:3-5`).
- Safe-area: header top, Sheet bottom (`sheet.tsx:182`), thanh sticky (`timeline-panel.tsx:75`). Chỉ cần kiểm lại phần chồng padding (Top fix 2).

### Pillar 6: Experience Design (3/4)

**Điểm tốt**
- Loading: skeleton 6 thẻ + `p.sr-only role="status"` "Đang tải lịch trình…" (`my-itineraries-view.tsx:88-92,190-195`), skeleton thẻ kế + status "Đang tải thêm lịch trình…" (`:233-241`), `editor-skeleton.tsx:32`.
- Error trang đầu: `ErrorState variant="page"` + `refetch` (`my-itineraries-view.tsx:196`, `itinerary-editor.tsx:173`). 404 qua `NotFoundView`, 403 qua `EditorForbidden` (`itinerary-editor.tsx:157-181`).
- Empty theo tab: chỉ tab "Tất cả" có CTA; ngày trống có EmptyState compact kèm CTA.
- SaveIndicator luôn có trong DOM với `aria-live="polite"` (`save-indicator.tsx:19`); live region editor "Đã thêm ..." (`itinerary-editor.tsx:348`); `LocationField` có `aria-live` (`location-field.tsx:193,207`); toast `role="status"`/`alert` (`toast.tsx:12-15`); `InlineAlert` `info` là `role="status"`.
- `notify.undoable` không tự hết hạn (`toast.tsx:37`, `duration: Infinity`), app sở hữu đồng hồ 5 giây. Một toast hoàn tác tại một thời điểm, flush khi kéo/rời route.
- Dialog phá hủy đặt focus đầu vào "Hủy"/"Ở lại": `initialFocus={cancelRef|stayRef}` ở `publish-dialog.tsx:75`, `delete-itinerary-dialog.tsx:82`, `leave-guard.tsx:43`.
- Nút Xuất bản dùng `aria-disabled` + `aria-describedby` trỏ phần tử luôn có trong DOM (`publish-button.tsx:75-76,100-109`), có tooltip từ `lg` và dải giải thích dưới `lg`.
- Tay cầm kéo có `aria-label` "Kéo để sắp xếp ...", `touch-none`, `data-base-ui-swipe-ignore`; announcements tiếng Việt (`dnd-announcements.ts`); `DragOverlay` tôn trọng reduced motion (`waypoint-list.tsx:241`).
- Reduced motion: `DayTabs` (`day-tabs.tsx:22,62`), cuộn tới waypoint mới (`waypoint-list.tsx:94,178`), dịch chỗ khi kéo (`sortable-waypoint-item.tsx:49`).
- Responsive: hai vùng từ `lg`, Sheet không modal `dismissible={false}` với `insetTop` đo từ header (`editor-layout.tsx:72`), header hai hàng dưới `sm` (`editor-header.tsx:144-149`).
- Focus: sau thêm/xóa/hoàn tác qua `focusRequest`; sau xóa thẻ ở danh sách (`my-itineraries-view.tsx:146-161`); sau thêm ngày (`day-tabs.tsx:66-69`).

**Điểm trừ**
- Lệch contract nhỏ: header rút gọn của 403/lỗi có tiêu đề "Sửa lịch trình" (Top fix 3).
- Edge case trong `my-itineraries-view.tsx:198`: điều kiện EmptyState là `items.length === 0 && !hasNextPage`. Nếu mọi thẻ của trang đã tải bị `removedIds` lọc hết trong khi vẫn còn `hasNextPage`, người dùng thấy lưới rỗng thay vì EmptyState/skeleton đến khi sentinel nạp trang kế. Hiếm, ảnh hưởng thấp.
- `LeaveEditorDialog` dùng `DialogClose` cho "Ở lại" (`leave-guard.tsx:47`); cần xác nhận kiểu mặc định của `DialogClose` là `secondary` như spec (xem needs_human_review).
- Nhiều hành vi không thể xác nhận bằng code (xem danh sách dưới).

---

## needs_human_review

Tất cả đánh dấu `needs_human_review: true` (jsdom/code không chứng minh được):

1. **Kéo thả cảm ứng trong Sheet**: nhấn giữ 180ms trên tay cầm không làm Sheet chuyển snap; vuốt chỗ khác vẫn cuộn/snap sheet; auto-scroll gần mép (D-34). Máy thật iPhone Safari + Android Chrome.
2. **Sheet 3 mức snap không che header** ở 320×568, 390×844, 768×1024, kể cả khi header hai hàng (108px) và khi `visualViewport` thay đổi do thanh địa chỉ.
3. **Thanh "Thêm điểm đến" sticky trong Sheet**: kiểm tra khoảng đệm kép (Top fix 2) và safe-area iPhone có home indicator.
4. **Bàn phím ảo** không che nút gửi trong `ResponsiveFormSurface` (Sheet `expanded`) với footer `max-md:sticky max-md:bottom-0`; `Input type="date"` và nút "Xóa ngày" trên Safari iOS.
5. **Nút Xuất bản bị chặn**: tooltip từ `lg` (hover/focus/click) và dải giải thích dưới `lg` hiện khi focus/chạm 4 giây; trình đọc màn hình đọc được mô tả qua `aria-describedby` khi dải bị `hidden`.
6. **Trình đọc màn hình** (VoiceOver/NVDA): announcements dnd tiếng Việt, "Đã thêm ... vào Ngày N", SaveIndicator đổi trạng thái, role/live của toast hoàn tác, nút "Hoàn tác" Tab tới được trong vùng toast Sonner.
7. **Focus ring và độ tương phản** thực tế sau khi alias token `text-muted/subtle/disabled` đã sinh CSS: đặc biệt `text-disabled` trên `surface-muted` của nút Xuất bản bị chặn và `text-subtle` của placeholder phụ đề (cần ≥ 4.5:1 theo spec).
8. **Overflow ngang** ở 320×568 (header editor, tab ngày, tiêu đề dài ellipsis, dialog tên dài xuống dòng).
9. **Hiệu ứng làm nổi waypoint mới** (`transition-colors duration-slow`) và cuộn `block: "nearest"` với reduced motion bật thật trong trình duyệt.
10. **`DialogClose` mặc định** hiển thị là `secondary` (Hủy/Ở lại), và hit area ≥ 44px của `IconButton size="sm"` / mục menu / nút trong toast.
11. **Preview ảnh bìa** (debounce 400ms, trạng thái lỗi vẫn lưu được) và ảnh bìa lỗi tải ở thẻ danh sách: cần ảnh thật từ domain ngoài.
12. **Resolve link rút gọn Google Maps** trên deploy Vercel (đã nằm trong `04-VERIFICATION.md` human_needed, UAT bước 7, 8).

---

## Registry Safety

Registry audit: 0 third-party blocks (`registries: {}`, dnd-kit là dependency npm), không có flag.

---

## Files Audited

- `04-UI-SPEC.md`, `04-CONTEXT.md`, `04-VERIFICATION.md`, `04-REVIEW.md` (ngữ cảnh), các PLAN/SUMMARY của phase.
- `apps/web/src/modules/itinerary/ui/`: `editor-header.tsx`, `publish-button.tsx`, `editor-layout.tsx`, `sortable-waypoint-item.tsx`, `save-indicator.tsx`, `my-itineraries-view.tsx`, `trip-summary.tsx`, `timeline-panel.tsx`, `day-tabs.tsx`, `leave-guard.tsx`, `editor-forbidden.tsx`, `waypoint-form-dialog.tsx` (footer), `format.ts`; quét theo mẫu (grep) toàn bộ `.tsx` không phải test của thư mục này.
- `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx` (nhánh trạng thái, live region), `itinerary-card.tsx`, `publish-dialog.tsx`, `delete-itinerary-dialog.tsx`, `create-itinerary-dialog.tsx`.
- `apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/*`, `(shell)/itineraries/mine/*` (liệt kê cấu trúc).
- `apps/web/src/components/user-menu.tsx` (prop `compact`).
- `packages/ui-web/src/molecules/toast.tsx`, `inline-alert.tsx`, `sheet.tsx`; `packages/design-tokens/src/theme.css`, `components.css`.
