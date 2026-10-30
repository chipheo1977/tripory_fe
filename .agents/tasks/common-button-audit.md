# Audit: component Button dùng chung (icon+text, visible, loading, size)

Chế độ: chỉ đọc, không sửa code, không commit. Số liệu lấy từ grep phân biệt hoa/thường (`<Button`) trên `apps/` và `packages/`, loại `node_modules`, `.next`, `*.test.*`.

## Trả lời ngắn

| Thuộc tính | Đã có trong Button chung? | Chi tiết |
|---|---|---|
| size | Có | `sm / md / lg` (cva), mặc định `md`. `button.tsx:19-23` |
| loading | Có | `loading` + `loadingLabel`, `aria-busy`, tự `disabled`. `button.tsx:31-60` |
| icon (tùy chọn) + text | Không | Không có prop `icon`. Nơi gọi tự đặt `<Icon>` trong children (9 chỗ). Children bị bọc 1 `<span>` thường nên `gap` của nút không tách icon khỏi chữ (mục C). |
| visible | Không | Không có prop `visible` ở Button. Chỉ có `CreateItineraryButton` (module itinerary) tự làm `visible` bằng `return null`. |

Khuyến nghị: mở rộng `Button` thêm prop `icon` (+ `iconPosition`), sửa cấu trúc children để gap hoạt động; làm `visible` ở tầng `Button` hoặc để callsite dùng điều kiện (xem D). Không tạo component mới trùng chức năng.

## A. Ma trận khả năng

Ký hiệu: Y = hỗ trợ, N = không, ~ = một phần.

| Component (file) | icon+text | visible | loading / loadingLabel | size | variant | link/asChild | ref |
|---|---|---|---|---|---|---|---|
| `Button` (`packages/ui-web/src/atoms/button.tsx`) | N (tự đặt vào children; children trong 1 `<span>`, dòng 51) | N | Y / Y (dòng 31-37, 40-60) | Y sm/md/lg (19-23) | Y primary/secondary/ghost/danger (13-18) | N. Không có `render`/`asChild` được ghi trong tài liệu repo; app dùng `buttonVariants` trên `next/link` (xem dưới). Base UI Button có prop `render` nhưng chưa dùng ở đâu. | Y (React 19 `ref` nằm trong `...props`, đến BaseButton) |
| `buttonVariants` (cùng file, export dòng 63) | Y nếu tự bọc, gap hoạt động vì class `inline-flex gap-control-gap` nằm trên chính thẻ `<a>` | N | N | Y | Y | Y (dùng trên `<Link>`) | Y |
| `IconButton` (`atoms/icon-button.tsx`) | chỉ icon, bắt buộc `aria-label` (dòng 23) | N | N (không có `loading`) | Y sm/md/lg (dòng 18) | Y ghost/secondary/danger | N | Y |
| `CreateItineraryButton` (`modules/itinerary/ui/create-itinerary-button.tsx`) | Y, cứng icon `Plus` + chữ "Tạo lịch trình", có `inline-flex` wrapper (dòng 18) | Y (`visible: boolean`, dòng 6, 15) | N | N (không truyền size) | cứng `primary` | N | Y (`ref`, dòng 8) |
| `PublishButton` (`itinerary/ui/publish-button.tsx:73`) | N (chỉ chữ) | N. `PublishHintStrip` dùng `visible` nhưng là `<p hidden>` (dòng 93, 104), không phải nút | N | cứng `sm` | cứng `primary` | N | N |
| `DropdownMenuItem` / `LinkItem` (`molecules/dropdown-menu.tsx:65,77`) | N (callsite đặt `<Icon>` trong children, vd `user-menu.tsx:80`, `editor-header.tsx:132,137`) | N | N | N | Y (`variant` danger) | LinkItem dùng `render={<Link/>}` (Y) | ~ |
| `DialogClose`, `SheetClose`, `SheetTrigger`, `DropdownMenuTrigger` | không phải Button chung; dùng ở vị trí nút "Hủy"/"Ở lại" (vd `create-itinerary-dialog.tsx:132`) | N | N | N | style riêng | N | ~ |
| `ErrorState` (`molecules/error-state.tsx:26`) | N | `onRetry ? <Button> : null` (dòng 25-29) | N | N | cứng `primary` | N | N |

Native `<button>` tự viết (không dùng Button, loại phần bên trong Base UI):
- `modules/itinerary/ui/day-subtitle.tsx:113`
- `modules/itinerary/ui/sortable-waypoint-item.tsx:64` (nút kéo thả), `:78` (hàng waypoint)
- `packages/ui-web/src/molecules/card.tsx:40` (Card tương tác)
- `packages/ui-web/src/molecules/sheet.tsx:212`

Đây đều là bề mặt tương tác đặc thù (kéo thả, card, hàng danh sách), không phải nút hành động chuẩn, nên không nhất thiết đổi sang Button.

Link trông như nút tự viết class, không dùng `buttonVariants`: `apps/web/src/components/not-found-view.tsx:14-19` (sao chép style của primary, bỏ `border`, `gap`, `size`).

## B. Thống kê sử dụng `<Button`

Tổng: 23 vị trí JSX `<Button` (không tính test, comment và `<button` thường).

Danh sách: `change-password-form.tsx:118`, `login-form.tsx:114`, `register-form.tsx:147`, `create-itinerary-button.tsx:16`, `create-itinerary-dialog.tsx:132`, `day-tabs.tsx:93`, `delete-itinerary-dialog.tsx:94`, `leave-guard.tsx:48`, `publish-button.tsx:73`, `publish-dialog.tsx:84`, `save-indicator.tsx:26`, `timeline-panel.tsx:76`, `trip-info-dialog.tsx:243,268,286,289`, `trip-summary.tsx:58,84`, `waypoint-form-dialog.tsx:316,319,323`, `waypoint-list.tsx:186`, `ui-web/molecules/error-state.tsx:26`. (Các file nằm trong `apps/web/src/modules/{identity,itinerary}/ui/` trừ dòng cuối.)

**Compose `<Icon>` trong children: 9** (8 không có wrapper + 1 có wrapper):
- `day-tabs.tsx:93` (Icon dòng 94)
- `save-indicator.tsx:26` (Icon 27)
- `timeline-panel.tsx:76` (Icon 77)
- `trip-info-dialog.tsx:243` (Icon 244), `trip-info-dialog.tsx:268` (Icon 275)
- `trip-summary.tsx:84` (Icon 85)
- `waypoint-form-dialog.tsx:323` (Icon 330)
- `waypoint-list.tsx:186` (Icon 187)
- `create-itinerary-button.tsx:16` (Icon 19, có `inline-flex` wrapper)

**Nằm sau điều kiện viết tay mà `visible` có thể thay: 8 chắc chắn, 1 có khả năng**
- `save-indicator.tsx:25-26` (chuỗi ternary, nhánh `failure !== null`)
- `timeline-panel.tsx:75-76` (`hasVisibleWaypoints ? (<div><Button/></div>) : null`; điều kiện bao cả container sticky, nên `visible` chỉ thay được nếu container cũng ẩn theo)
- `trip-info-dialog.tsx:242-243` (`startDateValue === "" ? null : <Button/>`), `:267-268` (`coverValue === "" ? null : <Button/>`)
- `waypoint-form-dialog.tsx:322-323` (`adding ? null : <Button/>`)
- `waypoint-list.tsx:185-186` (`emptyAction === undefined ? undefined : <Button/>`; kết quả truyền vào `action` của EmptyState nên `null` thay `undefined` cần đúng kiểu)
- `error-state.tsx:25-26` (`onRetry ? <Button/> : null`; điều kiện còn quyết định `onClick`, nên `visible` ít giá trị)
- `create-itinerary-button.tsx:15` (early return `!visible`; đây là nơi `visible` đã được hiện thực)
- `my-itineraries-view.tsx:197` (`status === "all" ? <CreateItineraryButton visible/> : undefined`) và `:237` (`visible` luôn `true`): hiện `visible` bị truyền hằng số `true`, điều kiện thật vẫn viết tay ở dòng 197.
- Có khả năng: `trip-summary.tsx:58` nằm trong nhánh `canvas`/placeholder (chưa đọc điều kiện bao ngoài).

**Dùng `loading`: 8 vị trí, cả 8 đều có `loadingLabel`**: `change-password-form.tsx:120`, `login-form.tsx:114`, `register-form.tsx:149`, `create-itinerary-dialog.tsx:132`, `delete-itinerary-dialog.tsx:94`, `publish-dialog.tsx:84`, `trip-info-dialog.tsx:289`, `waypoint-form-dialog.tsx:316`. Không có chỗ nào dùng `loading` mà không có `loadingLabel`, nên nhánh "children ẩn + spinner phủ lên" (`button.tsx:55-56`) chỉ được test (`button.test.tsx:69`), không được dùng thật.

**Size**: `sm` 7 (`day-tabs:93`, `publish-button:73`, `save-indicator:26`, `trip-info:243`, `trip-info:268`, `trip-summary:58`, `trip-summary:84`), `lg` 3 (`change-password:118`, `login:114`, `register:147`), `md` (mặc định, không truyền) 13.

**`buttonVariants` trên Link: 3**: `guest-login-button.tsx:22`, `editor-forbidden.tsx:17`, `change-password-form.tsx:131` (nút "Hủy", tự thêm `aria-disabled`, `data-disabled`, `tabIndex` thủ công để mô phỏng trạng thái disabled). Thêm 1 Link tự viết class: `not-found-view.tsx:15`.

**Native `<button>` tự viết**: 5 vị trí, xem mục A.

Số file test có nhắc "Button" (query role, tên component): 49 file trong `apps/` và `packages/`. Test trực tiếp component Button chỉ có `packages/ui-web/src/atoms/button.test.tsx`; `icon-button.test.tsx` cho IconButton.

## C. Lỗi layout: `gap` không tách Icon khỏi chữ

Cơ chế: `button.tsx:51` render `<span className={loading ? 'invisible' : undefined}>{children}</span>`. `<span>` này không có `display:flex` và không có `gap`. Class `inline-flex ... gap-control-gap` nằm trên `BaseButton` (dòng 9), chỉ tác dụng giữa các con trực tiếp của nút (lúc này chỉ có 1 `<span>`, thêm 1 `<span>` spinner khi loading). `Icon` (`atoms/icon.tsx`) render `<svg>` có `shrink-0`, mặc định `display: inline`. Kết quả: svg và chữ nằm cùng một dòng inline, **không có khoảng cách** (JSX bỏ xuống dòng giữa `<Icon/>` và chữ nên không có khoảng trắng) và căn theo baseline chứ không căn giữa dọc. Nhận định này suy ra từ đọc code, chưa chạy app hay chụp ảnh.

Số vị trí phụ thuộc vào gap này và có thể trông lệch: **8** (Icon trực tiếp trong children của Button):
`day-tabs.tsx:94`, `save-indicator.tsx:27`, `timeline-panel.tsx:77`, `trip-info-dialog.tsx:244`, `trip-info-dialog.tsx:275`, `trip-summary.tsx:85`, `waypoint-form-dialog.tsx:330`, `waypoint-list.tsx:187`.

Chỗ đã tự xử lý bằng wrapper `inline-flex items-center gap-control-gap`: **1**, `create-itinerary-button.tsx:18` (do yêu cầu "Icon và text cùng một hàng"). Grep `inline-flex items-center gap-control-gap` trên toàn repo chỉ ra duy nhất vị trí này. Ở Link dùng `buttonVariants` không có vấn đề vì class nằm trên chính thẻ `<a>`, con trực tiếp là svg và text (gap hoạt động).

Điểm không nhất quán đáng chú ý: `my-itineraries-view` (đã refactor sang `CreateItineraryButton`) thì đúng, còn 8 nút còn lại bị lỗi tiềm ẩn như trên. Khi `loadingLabel` bật, nhánh `Spinner + <span>` (dòng 46-48) là con trực tiếp của nút nên gap hoạt động. Nói cách khác, gap chỉ đúng ở trạng thái loading có nhãn và sai ở trạng thái thường.

## D. Phân tích khoảng trống và phương án

Còn thiếu so với API yêu cầu:
1. Prop `icon` tùy chọn (và vị trí trái/phải) để Button tự dựng layout icon + chữ.
2. Cấu trúc children sao cho gap hoạt động (sửa gốc lỗi mục C).
3. Prop `visible` ẩn/hiện.
(`loading` và `size` đã đủ.)

Ràng buộc repo: `ui-web` chỉ dùng token, named export, barrel `packages/ui-web/src/index.ts` an toàn cho server (Button đã có `'use client'`, đã export dòng 3), atoms/molecules phân tầng, test bằng Testing Library, không chứa copy nghiệp vụ (nhãn "Tạo lịch trình" phải ở app).

**Phương án 1. Mở rộng `Button` (khuyến nghị)**
- Thêm `icon?: LucideIcon` (hoặc `ReactNode`) và `iconPosition?: 'start' | 'end'` (mặc định `start`); render `<Icon size="sm"/>` cùng `children` trong một `span` có `inline-flex items-center gap-control-gap`, hoặc bỏ span và để các con là con trực tiếp của nút (khi đó nhánh loading phải giữ chiều rộng bằng `invisible`).
- Thêm `visible?: boolean` mặc định `true`, `if (!visible) return null`.
- Ưu: một API cho cả app, thêm tùy chọn nên tương thích ngược, gỡ `wrapper` ở `CreateItineraryButton` và 8 chỗ bị lỗi layout, `loading` có sẵn trong cùng component.
- Nhược: Button là atom dùng rộng (23 vị trí JSX, 3 Link qua `buttonVariants`); đổi cấu trúc DOM (bỏ/đổi `<span>` children) có thể làm lệch test query hoặc CSS, nên phải chạy lại cả 49 file test có nhắc Button. `visible` trả về `null` cũng làm `ref` không gắn khi ẩn, cần lưu ý với `emptyCtaRef`, `addButtonRef`, `headerCtaRef` (focus return).
- Rủi ro mức vừa-thấp nếu chỉ thêm prop và giữ nguyên cấu trúc khi không có `icon`.

**Phương án 2. Molecule `ActionButton` bọc Button**
- Component mới ở `molecules/`, nhận `icon`, `visible`, truyền còn lại xuống Button.
- Ưu: không đụng atom, 0 rủi ro cho 23 chỗ hiện có.
- Nhược: hai component nút cạnh nhau, dễ bị hỏi "dùng cái nào"; vẫn phải vá lỗi gap trong Button (không sửa được từ ngoài trừ khi bọc children, giống wrapper hiện tại); repo đã có 1 wrapper ở phía app (`CreateItineraryButton`) nên thêm tầng thứ hai tăng độ rối.

**Phương án 3. Giữ Button, thêm `Show`/`Visible` wrapper chung**
- Component nhỏ `Show({ when, children })` trả `null` khi `when` false, dùng cho mọi thứ (không chỉ nút).
- Ưu: tổng quát, không đổi Button, không dính vấn đề `ref`.
- Nhược: không giải quyết `icon`/gap; `visible` không còn là prop của nút như người dùng yêu cầu ("sử dụng prop visible để xử lý ẩn hiện"); thay thế ternary chỉ cải thiện cú pháp.

**Số vị trí bị ảnh hưởng nếu đổi Button (phương án 1):** 23 vị trí JSX + 3 Link `buttonVariants` + `ErrorState`. Nếu chỉ thêm prop tùy chọn và giữ DOM khi không có `icon`: 0 test bắt buộc sửa; test cần thêm: `button.test.tsx` (icon trái/phải, gap, `visible=false`, icon + loading + loadingLabel). Nếu đổi cấu trúc `<span>`: có thể ảnh hưởng test dùng `getByRole('button',{name})` (tên accessible không đổi) hoặc snapshot; hiện chưa thấy snapshot trong các file đã thấy (chưa kiểm tra toàn bộ).

**Khuyến nghị:** Phương án 1, làm theo từng bước nhỏ:
1. Thêm `icon` (+ `iconPosition`) và sửa layout trong `button.tsx`, thêm test trong `button.test.tsx`.
2. Thêm `visible` (mặc định `true`). Quyết định rõ chỗ `ref` khi ẩn.
3. Chuyển 8 chỗ ở mục C sang `icon={...}` để xóa lỗi layout; đơn giản hóa `CreateItineraryButton` (chỉ còn giữ nhãn nghiệp vụ, hoặc xóa luôn và dùng thẳng `Button`).
4. Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test` từ gốc repo.

## E. Đặt tên và nhất quán

| Khái niệm | Tên đang dùng | Nơi dùng |
|---|---|---|
| Đang gửi / loading của nút | `loading` (+ `loadingLabel`) | `Button`; `DashboardSessionGate` cũng có `loading: ReactNode` (khác kiểu, là slot skeleton) (`dashboard-session-gate.tsx:10`) |
| Trạng thái đang chờ trong form | `isSubmitting`, `pending`, `locked` (giá trị truyền xuống `loading`) | `login-form`, `create-itinerary-dialog`, `delete-itinerary-dialog`; `SubmitStatus` nhận `pending: boolean` (`submit-status.tsx:15`) |
| Ẩn/hiện | `visible: boolean` | `CreateItineraryButton`, `PublishHintStrip` (`publish-button.tsx:93`); `hidden={!visible}` trên thẻ native |
| Mở/đóng | `open`, `onOpenChange` | Dialog, Sheet, Tooltip (khớp Base UI) |
| Vô hiệu | `disabled` | Button, DialogClose; Link dùng `aria-disabled` + `data-disabled` thủ công (`change-password-form.tsx:127-128`) |
| Prop boolean kiểu `isX` | `isLoading`, `isVisible`, `show` | Không có trong component UI. `isSubmitting`, `isPending`, `isPublic` chỉ là biến/đối tượng nghiệp vụ |

Kết luận: tên `visible` và `loading` là đúng với quy ước hiện có; không dùng `isLoading`, `show` hay `hidden` cho prop công khai. `visible=false` hiện được hiện thực theo hai kiểu (`return null` ở `CreateItineraryButton` và `hidden` ở `PublishHintStrip`), nên cần quyết định một: với Button nên là `return null`, vì nút ẩn không được còn trong cây a11y/tab order.

## Ghi chú về độ tin cậy
- Đã đọc trực tiếp: `button.tsx`, `icon-button.tsx`, `icon.tsx`, `create-itinerary-button.tsx`, `publish-button.tsx` (phần liên quan), `guest-login-button.tsx`, `not-found-view.tsx`, `sortable-waypoint-item.tsx` (64-100), phần liên quan của `dropdown-menu.tsx`.
- Chưa đọc đầy đủ: `trip-summary.tsx` (điều kiện bao quanh dòng 58), nội dung `DialogClose`/`SheetClose`, danh sách snapshot test.
- Hành vi hiển thị (icon sát chữ, lệch baseline) suy ra từ CSS/DOM, chưa xác minh trên trình duyệt.
