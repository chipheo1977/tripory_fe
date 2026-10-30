# Lỗi: Sheet modal không vuốt đổi mức peek / medium / expanded

Điều tra chỉ đọc, không sửa code. Trạng thái đọc: working tree lúc điều tra (SheetControls đã bị gỡ khỏi `sheet.tsx`).

## 1. Trả lời ngắn

**Nguyên nhân gốc (xác suất cao nhất, chưa chứng minh được bằng đọc code, cần xác nhận trên thiết bị):**
`SheetContent` đặt `overflow-y-auto` lên chính `BaseDrawer.Popup` (`sheet.tsx`, class của Popup). Popup có `max-h` nhưng không có chiều cao cố định, nên khi nội dung form cao hơn `max-h` thì Popup trở thành "scroll target" của Base UI. Với `swipeDirection='down'`, Base UI chỉ cho vuốt bắt đầu từ vùng cuộn khi (a) Popup đang ở `scrollTop = 0` và (b) ngón tay kéo xuống (hướng đóng). Kéo lên bị coi là cuộn nội dung, nên sheet không bao giờ lên mức cao hơn (và `peek`/`medium` còn che mất phần nội dung bên dưới nên cuộn trông như "kẹt"). Form nào đủ thấp để Popup không tràn thì vuốt chạy bình thường.

**Vì sao "Thông tin chuyến đi" vuốt được còn "Thêm điểm đến" không:** cả hai dùng cùng một `ResponsiveFormSurface` và cùng props Sheet (xem §4), không có khác biệt props nào. Khác biệt duy nhất đáng kể là chiều cao nội dung: form waypoint cao hơn (Tên, Vị trí kèm dòng trạng thái/hint, Địa chỉ, Ghi chú textarea, footer 2 nút, cộng `InlineAlert`), còn TripInfo thấp hơn. Form waypoint vừa vượt `max-h` của Popup (nhất là khi bàn phím ảo bật do `initialFocus` vào ô Tên) nên rơi vào nhánh "Popup có thể cuộn". Chân dung này khớp với báo cáo thiết bị, nhưng cần bước đo ở §7 để khẳng định.

**Sheet bị ảnh hưởng:** mọi Sheet bottom có nội dung cao hơn `max-h` của Popup: form waypoint (add/edit), timeline editor khi có nhiều điểm đến. Form ngắn (TripInfo) thì không bị.

**Sửa khuyến nghị:** chỉ cho Popup cuộn khi đang ở mức `expanded` (`overflow-y-hidden` ở peek/medium). Khi đó Base UI không thấy scroll target, mọi cử chỉ vuốt/kéo giữ tay cầm đều di chuyển sheet theo snap; ở `expanded` nội dung cuộn như cũ và vuốt xuống từ `scrollTop = 0` hạ mức. Thêm `touch-none` cho `SheetHandle`.

## 2. Các Sheet đang tồn tại

Grep `<Sheet ` (không tính test):

| Sheet | File:dòng | modal | defaultSnap | dismissible | disablePointerDismissal | snap points |
|---|---|---|---|---|---|---|
| Timeline editor (dưới `lg`) | `editor-layout.tsx:72` | `false` | `medium` | `false` | tự động `true` (vì `!modal`) | `resolveSnapPoints(vh, headerHeight)` |
| Form waypoint + TripInfo (dưới `md`) | `responsive-form-surface.tsx:52` | `true` | `expanded` | `true` (mặc định) | `true` | `resolveSnapPoints(vh, 0)` |

Chỉ có hai nơi dựng `Sheet`. `WaypointFormDialog` (`waypoint-form-dialog.tsx:243`) và `TripInfoDialog` (`trip-info-dialog.tsx:206`) cùng đi qua `ResponsiveFormSurface`. Không có modal nào tên "Thêm ngày": "Thêm ngày" là nút thêm trực tiếp, không mở modal. Modal có chữ "Thêm" trong tiêu đề là "Thêm điểm đến vào Ngày N" (`waypoint-form-dialog.tsx:247`). `create-itinerary-dialog.tsx` (tạo lịch trình) là Dialog riêng, không dùng Sheet (grep không thấy `Sheet`).

Spec: `04-UI-SPEC.md:133` xác nhận ba mức chỉ đổi bằng vuốt hoặc giữ-kéo `SheetHandle`; `:139-141` định nghĩa `dismissible`, `defaultSnap`, `insetTop`; `:374` và `:408` nêu form dùng `Sheet modal defaultSnap="expanded"`; `:316` nêu kéo thả waypoint chỉ ở tay cầm, "vuốt ở chỗ khác vẫn là cuộn/snap sheet". Vậy vuốt đổi snap là hành vi mong đợi cho cả ba trường hợp.

## 3. Cách Base UI 1.8.0 xử lý vuốt (đã đọc source)

Đường dẫn: `node_modules/.pnpm/@base-ui+react@1.8.0_.../node_modules/@base-ui/react/drawer/`.

- Vuốt gắn ở **`DrawerViewport`**, không ở Popup hay tay cầm (`viewport/DrawerViewport.js`, `useSwipeDismiss({ elementRef: popupRef, ignoreScrollableAncestors: true, ... })`). Không có API "handle"; mọi chạm trong Viewport đều có thể bắt đầu vuốt.
- Chuột: `onPointerDown` bỏ qua nếu mục tiêu nằm trong `[data-drawer-content]` (`isDrawerContentTarget`, thành phần `Drawer.Content`) hoặc trong `[data-base-ui-swipe-ignore]`. Tay cầm của ta nằm ngoài `Drawer.Content`, nên kéo chuột bằng tay cầm hoạt động; kéo chuột trong nội dung thì không (để chọn chữ).
- Cảm ứng: `onTouchStart` không kiểm tra `Drawer.Content`; chỉ bỏ qua `data-base-ui-swipe-ignore` và `input[type=range]`. Nó gọi `findScrollableTouchTarget(target, viewport, 'vertical')` (`utils/scrollable.js`): đi từ phần tử chạm lên tới Viewport, trả về phần tử đầu tiên có `overflow-y: auto|scroll` **và** `scrollHeight > clientHeight`. Popup của ta thỏa điều kiện khi nội dung tràn.
- Có scroll target: `touchState.allowSwipe` khởi tạo `false` nếu không ở mép bắt đầu (`isAtSwipeStartEdge`: `scrollTop <= 0` với hướng `down`). Trong `processTouchMove`, `canSwipeFromScrollEdgeOnMove` trả `false` trừ khi ngón tay đang kéo theo hướng đóng (`delta > 0` với `down`) và đang ở mép. Hệ quả: **kéo lên luôn bị coi là cuộn nội dung**, không bao giờ nâng snap.
- Không có scroll target (Popup không tràn, hoặc `overflow` không phải auto/scroll): `moveSwipeNative` chạy ngay, vuốt hoạt động theo cả hai hướng.
- Thả tay (`onRelease`, nhánh `snapPoints`): chọn snap gần nhất theo `currentOffset + dragDelta` cộng bù vận tốc (`SNAP_VELOCITY_THRESHOLD 0.5`, `*300`, kẹp ±4). `snapToSequentialPoints` mặc định `false` nên vuốt nhanh có thể nhảy cách mức. Vuốt xuống nhanh (`>= FAST_SWIPE_VELOCITY 0.5`) hoặc kéo qua nửa khoảng tới đáy thì gọi `onSnapPointChange(null)` rồi `onOpenChange(false)` (đóng). Từ mức thấp nhất (peek) vuốt xuống đủ mạnh/xa thì **đóng** nếu `dismissible`; với `dismissible=false` wrapper `details.cancel()` ở `sheet.tsx` (`onOpenChange`), Base UI hoàn tác về snap trước đó.
- `resolvedSnapPoints` (`root/useDrawerSnapPoints.js`): mỗi snap bị kẹp `clamp(h, 0, min(popupHeight, viewportHeight))`, rồi **gộp snap có chiều cao chênh <= 1px**. `popupHeight` là `offsetHeight` tự nhiên của Popup (`popup/DrawerPopup.js`, `measureHeight`). Vì Popup của ta không có chiều cao cố định, form ngắn hơn mức `medium`/`expanded` làm các mức đó trùng nhau và mất (chỉ còn 1-2 mức phân biệt). Đây là nguyên nhân phụ: không đổi được mức vì thực sự chỉ có ít hơn ba mức.
- `data-expanded` trên Popup chỉ bật khi `activeSnapPoint === 1` (số), không bao giờ đúng với snap dạng chuỗi px của ta, nên không dùng để style được.
- `transition-transform duration-slow` trên Popup (`sheet.tsx`, class Popup): cần kiểm tra Base UI có tắt transition khi `data-swiping`; nếu không, kéo sẽ trễ. Chưa xác minh.

## 4. So sánh ba người dùng Sheet

Props truyền vào `Sheet` của form waypoint và TripInfo **giống hệt** (`responsive-form-surface.tsx:52`): `defaultSnap="expanded"`, `disablePointerDismissal`, `modal`, `dismissible` mặc định. `locked` chỉ lọc `onOpenChange`. `initialFocus` cả hai trỏ vào ô nhập đầu tiên (Tên / Tiêu đề). Không có `key` đổi, không có mount có điều kiện của Sheet theo mode.

Khác biệt:

| Điểm | Waypoint | TripInfo |
|---|---|---|
| Mount | `WaypointFormDialog` render `null` khi chưa có `mode`; lần mở đầu Sheet mount với `open=true` (`waypoint-form-dialog.tsx:341-348`). Sau khi đóng, `retained` giữ nó mounted với `open=false` | Luôn mounted, `open` đổi (`itinerary-editor.tsx:363`) |
| Chiều cao nội dung | Cao hơn (4 trường + hint/trạng thái vị trí + textarea + footer) | Thấp hơn |
| Footer | `max-md:sticky max-md:bottom-0 max-md:bg-surface` ngay trong vùng cuộn của Popup (`waypoint-form-dialog.tsx` khối footer) | Footer thường |
| Điểm mở | Từ nút trong Sheet timeline (Sheet khác, không modal, mở sẵn) | Từ menu header |

Kết luận so sánh: không phần tử nào ở form waypoint chủ động chặn cử chỉ (không có `touch-none`, `overflow-x`, `data-base-ui-swipe-ignore`, hay carousel trong form; đã grep `location-field.tsx`, `waypoint-form-dialog.tsx`, `trip-info-dialog.tsx`). Khả năng còn lại thật sự là: form waypoint làm Popup tràn `max-h`; điều kiện thứ hai là cách mount lần đầu (nghi ngờ thấp hơn). Footer sticky ở `bottom-0` trong Popup cũng chỉ có tác dụng khi Popup cuộn, cho thấy tác giả đã dự kiến Popup cuộn cho form này.

Khả năng vuốt hiện tại:

| Sheet | Vuốt đổi snap |
|---|---|
| TripInfo (form ngắn, Popup không tràn) | Được (khớp báo cáo của bạn) |
| Waypoint form (Popup tràn) | Không nâng được bằng kéo lên; kéo xuống từ `scrollTop = 0` có thể hạ/đóng |
| Timeline (nội dung dài, DayTabs sticky trong vùng cuộn Popup, `editor-layout.tsx:72`) | Cùng lỗi khi có nhiều điểm đến; kéo thả waypoint đã được bảo vệ bằng `data-base-ui-swipe-ignore` trên tay cầm (`sortable-waypoint-item.tsx:70`) và trên danh sách khi đang kéo (`waypoint-list.tsx:222`) |

## 5. Bằng chứng từ lịch sử và test

- Git: `sheet.tsx` trước khi gỡ `SheetControls` có hai nút `Thu gọn bảng`/`Mở rộng bảng` gọi `setSnapPoint(stepSnapPoint(...))`, tức là snap đổi bằng nút luôn chạy; vuốt thật chưa bao giờ có test. Commit gốc `6a6b558 feat(01-06)` thêm Sheet; `0f8238b`, `989c5ca` thêm `dismissible/defaultSnap/insetTop/disablePointerDismissal`.
- `sheet.test.tsx` không có test nào kiểm tra vuốt hay snap (grep `swipe|snap` chỉ ra `onSnapPointChange` làm prop ví dụ, test resize ở dòng 197 và `data-swipe-direction`). jsdom không mô phỏng được vuốt cảm ứng thật nên lỗi này chưa từng bị bắt. Việc gỡ nút làm lộ ra chứ không gây ra lỗi.
- Wiring snap (đúng): `sheet.tsx` lưu `snapIndex`, suy `snapPoint` từ `snapPoints[snapIndex]`, truyền `snapPoint` + `onSnapPointChange` cho `BaseDrawer.Root`; `onSnapPointChange` cập nhật `snapIndex` trừ khi `closingRef` (bỏ qua lần báo peek sau khi đóng). `viewportHeight` mặc định `640` rồi đồng bộ trong `useEffect`; `snapPoints` đổi theo `resize` nhưng `snapIndex` giữ chỉ số nên không lệch. Không thấy lỗi ở nhánh này.

## 6. Đề xuất sửa

### Phương án A (khuyến nghị): chỉ cuộn khi `expanded`, tay cầm `touch-none`

Ý tưởng: ở `peek`/`medium` Popup `overflow-y-hidden` nên không có scroll target, mọi vuốt (kể cả kéo lên) di chuyển sheet. Ở `expanded` Popup `overflow-y-auto`; vuốt xuống từ `scrollTop = 0` hạ mức, kéo lên cuộn nội dung. Không đổi prop nào của Base UI, không đụng quy tắc đóng.

`sheet.tsx` (context mang thêm chỉ số snap):

```tsx
// trước
type SheetContextValue = { dismissible: boolean; modal: boolean; position: SheetPosition };
// sau
type SheetContextValue = { dismissible: boolean; modal: boolean; position: SheetPosition; atTopSnap: boolean };

// trước
const context = useMemo<SheetContextValue>(
  () => ({ dismissible, modal, position }),
  [dismissible, modal, position],
);
// sau (mức cao nhất = chỉ số cuối của snapPoints; sheet side thì luôn cuộn được)
const atTopSnap = position !== 'bottom' || snapIndex >= snapPoints.length - 1;
const context = useMemo<SheetContextValue>(
  () => ({ dismissible, modal, position, atTopSnap }),
  [dismissible, modal, position, atTopSnap],
);
```

`SheetContent`:

```tsx
// trước
const { modal, position } = useSheetContext();
...
className={cn('pointer-events-auto flex flex-col overflow-y-auto overscroll-contain ...', ...)}
// sau
const { modal, position, atTopSnap } = useSheetContext();
...
className={cn(
  'pointer-events-auto flex flex-col overscroll-contain ...',
  atTopSnap ? 'overflow-y-auto' : 'overflow-y-hidden',
  ...
)}
```

`SheetHandle` (cử chỉ giữ-kéo ở tay cầm không bị trình duyệt hiểu là cuộn):

```tsx
// trước
className="flex min-h-touch shrink-0 items-center justify-center"
// sau
className="flex min-h-touch shrink-0 touch-none items-center justify-center"
```

Lưu ý và đánh đổi:
- Chỉ dùng class sẵn có (`overflow-y-*`, `touch-none`), không thêm `z-<số>` hay `var()` mới nên guard token không bị ảnh hưởng.
- Ở `peek`/`medium` nội dung không cuộn được (đúng mẫu bottom sheet thông thường: vuốt lên để mở rộng trước, rồi mới cuộn). Với timeline mở ở `medium`, người dùng muốn cuộn danh sách dài phải vuốt lên `expanded` trước. Cần chốt với người dùng; 04-UI-SPEC nên ghi dòng này.
- Hệ quả phụ: lỗi "snap bị gộp vì Popup ngắn hơn" (§3, `resolvedSnapPoints`) vẫn còn với form ngắn. Nếu muốn luôn có ba mức thật, thêm `min-h` cho Popup bằng token `--sheet-snap-expanded`; xem phương án B.
- Waypoint drag: không đổi; `data-base-ui-swipe-ignore` trên tay cầm vẫn thắng. Dismiss: không đổi (`dismissible`, `disablePointerDismissal`, `locked` đều chạy qua `onOpenChange`). Cần theo dõi `onSnapPointChange` có chạy sau lần đóng cuối (`closingRef`) khi `atTopSnap` đổi để Popup không bật cuộn sai lúc đóng.

### Phương án B: Popup chiều cao cố định theo mức expanded, vùng cuộn tách riêng

Đặt `h-[var(--sheet-snap-expanded)]` (token đã có, `components.css`) cho Popup (đảm bảo ba mức luôn phân biệt vì `popupHeight` lớn), bỏ `overflow-y-auto` khỏi Popup và đặt vùng cuộn trong `BaseDrawer.Content`, bật cuộn theo `atTopSnap` như phương án A. Lợi: ba mức luôn tách biệt kể cả form ngắn và khung ổn định theo khuyến nghị của tài liệu Base UI ("keep the popup frame stable"). Hại: form ngắn sẽ có khoảng trống lớn ở `expanded`; phải đo lại footer sticky và `pb` safe-area; thay đổi bố cục nhiều hơn A nên rủi ro hồi quy UI cao hơn. Làm sau nếu A xong mà vẫn thiếu mức.

Khuyến nghị: A trước (thay đổi tối thiểu, một file), đo lại trên thiết bị; chỉ làm B nếu form ngắn vẫn thiếu mức.

## 7. Test

Test đơn vị (Testing Library/jsdom, thêm vào `sheet.test.tsx`; jsdom không mô phỏng vuốt thật, chỉ kiểm tra được wiring):
1. `defaultSnap="expanded"`: `getByRole('dialog')` có class `overflow-y-auto`; `defaultSnap="medium"` và `"peek"`: có `overflow-y-hidden` và không có `overflow-y-auto`.
2. Tay cầm: `container.ownerDocument.querySelector('[data-sheet-handle]')` tồn tại, có `aria-hidden="true"` và class `touch-none`; Sheet side (`position="left"`) không có tay cầm.
3. Position side: Popup luôn `overflow-y-auto` (không phụ thuộc snap).
4. `onSnapPointChange` truyền xuống không bị chặn: mock `@base-ui/react/drawer` Root để chụp props, gọi `onSnapPointChange('300px')` rồi xác nhận Popup chuyển class theo mức mới (cần `snapPoints` do `resolveSnapPoints` tính; dùng `window.innerHeight` cố định).
5. Giữ nguyên các test hiện có (Esc, `dismissible=false`, `disablePointerDismissal`, resize).
6. Chạy guard token: `pnpm test`, `pnpm lint`, `pnpm typecheck` từ gốc repo.

Việc cần đo trên thiết bị để chốt nguyên nhân (trước khi sửa):
- Mở form "Thêm điểm đến" trên điện thoại, kết nối remote debugging, ở Console chạy: `const p=document.querySelector('[data-sheet-position]'); [p.scrollHeight,p.clientHeight,getComputedStyle(p).overflowY]`. Nếu `scrollHeight > clientHeight` ở form waypoint và bằng nhau ở TripInfo thì giả thuyết đúng.
- Lặp lại với bàn phím ảo tắt (bấm ra ngoài ô nhập, hoặc đặt `initialFocus` tạm thời `false` khi thử), để loại trừ ảnh hưởng của chiều cao khả dụng.
- Mở form waypoint hai lần liên tiếp để xem lần thứ hai có vuốt được không (loại trừ giả thuyết mount lần đầu với `open=true`).

## 8. Bước test thủ công thêm vào `04-UAT-CHECKLIST.md` bước 12

1. Timeline (Sheet không modal, dưới `lg`): ở mức medium, vuốt lên bằng ngón tay ở vùng trống của sheet, sheet lên expanded. Vuốt xuống từ expanded về medium rồi peek. Từ peek vuốt xuống tiếp: sheet giữ ở peek (không đóng).
2. Giữ rồi kéo thanh kéo (`SheetHandle`) lên/xuống: sheet đi theo ngón tay và dừng ở mức gần nhất khi thả.
3. Ở expanded, cuộn nội dung dài bình thường; kéo xuống khi đang ở đầu nội dung thì hạ mức, không đóng.
4. Trong timeline, nhấn giữ 180ms tay cầm waypoint rồi kéo: waypoint di chuyển, sheet không đổi mức.
5. "Thêm điểm đến" và "Thông tin chuyến đi" (Sheet modal): mở ra ở expanded, vuốt xuống về medium, peek, lên lại expanded; bấm nền tối không đóng; vuốt xuống mạnh từ peek thì đóng và bản nháp bị bỏ (D-36). Khi đang lưu (`locked`), vuốt xuống không đóng.
6. Mở form waypoint khi bàn phím ảo đang bật (ô Tên có focus): lặp lại bước 5.
