# Báo cáo coder: chuyển SaveIndicator + Xuất bản lên vùng phải header (lần lặp 1)

Nhánh `phase_4`, chưa commit, chưa push. `package.json` và `pnpm-lock.yaml` giữ nguyên thay đổi turbo có sẵn, không đụng.

## File đã đổi

- `apps/web/src/modules/itinerary/ui/editor-header.tsx`: bỏ hàng 2 và `useMediaQuery(SM)`. Một hàng duy nhất ở mọi breakpoint. Vùng phải `shrink-0` gồm SaveIndicator, PublishButton, menu ⋯, UserMenu compact. Dòng "Thay đổi hiển thị ngay với người xem" tách thành component `PublishedNote` (trả null khi chưa xuất bản). `EditorHeaderMinimal` không đổi.
- `apps/web/src/modules/itinerary/ui/save-indicator.tsx`: viết lại không dùng `? :` và `&&` (component `SaveStatus` dùng early return). Chữ trạng thái là `sr-only md:not-sr-only`. Nút lỗi thêm `min-w-touch` (đã có `min-h-touch` từ Button).
- `apps/web/src/modules/itinerary/ui/publish-button.tsx`: dưới `md` chỉ hiện icon `Globe`, chữ "Xuất bản" là `sr-only md:not-sr-only`, thêm `min-w-touch`. Thay `allowed ? ... : ...` và `!allowed && ...` bằng hàm `blockedAttributes`. Hành vi giữ nguyên (aria-disabled, tooltip từ `lg`, dải giải thích dưới `lg`, biến mất khi đã xuất bản).
- `apps/web/src/modules/itinerary/ui/editor-header.test.tsx`, `save-indicator.test.tsx`: cập nhật và thêm test (bên dưới).
- `.planning/phases/04-itinerary-crud-editor/04-UI-SPEC.md`: cập nhật §EditorHeader (một hàng, vùng phải, thu gọn dưới `md`, ước lượng độ rộng 320px, ghi chú lệch D-16/D-30/D-38), §SaveIndicator, §PublishButton, dòng chiều cao header và dòng "Mặc định của researcher".
- `itinerary-editor.tsx`, `editor-layout.tsx`: không cần sửa. Header 403 dùng `EditorHeaderMinimal` nên không bị ảnh hưởng.

## Breakpoint và lý do

Dùng `md` (768px), một ngưỡng cho cả hai thành phần, thuần CSS (`sr-only md:not-sr-only`, `md:hidden`). `md` là ngưỡng sẵn có của dự án (Dialog↔Sheet), và dưới `md` còn các điện thoại và tablet dọc hẹp. Thuần CSS nên chỉ render một bản, không trùng `aria-live` hay `hintId`, không cần media query ở JS.

## Hiển thị trên mobile (<768px)

- SaveIndicator: chỉ icon (Spinner / Check / CircleAlert). Chữ `sr-only` nằm trong vùng `aria-live="polite"`. Nút "Lỗi – Thử lại" bấm được, vùng chạm 44×44.
- Xuất bản: nút primary chỉ có icon `Globe`, tên truy cập "Xuất bản", vùng chạm 44×44, vẫn nằm ngoài menu ⋯. Chọn icon thay vì chữ để tiêu đề còn chỗ ở 320px.
- Từ `md`: chữ đầy đủ, không icon.
- Ước lượng ở 320px (tính tay): tiêu đề còn khoảng 76px, khoảng 48px khi chỉ báo ở trạng thái lỗi. Vùng phải `shrink-0` nên không tràn ngang; chỉ tiêu đề co và truncate.

Đánh đổi: nút Xuất bản dưới `md` chỉ còn icon nên kém dễ nhận biết hơn chữ. Nếu user muốn giữ chữ "Xuất bản" ở mobile, tiêu đề ở 320px sẽ chỉ còn khoảng 40px (12px khi chỉ báo lỗi).

## Dòng "Thay đổi hiển thị ngay với người xem"

Giữ ở khối tiêu đề (dòng 2 dưới h1) ở mọi breakpoint, đúng D-41. Hẹp thì bị cắt bằng ellipsis; chữ đầy đủ ở thuộc tính `title`. Không thêm hàng nên header không cao lên, `headerHeight` (ResizeObserver) và `insetTop` của Sheet vẫn đúng. Dải giải thích của Xuất bản bị chặn vẫn xuất hiện tạm thời dưới header như trước (hành vi cũ).

## Lệnh đã chạy

- `node_modules\@turbo\windows-64\bin\turbo.exe run lint typecheck test --force` từ gốc repo: 24/24 task thành công. Web: 97 file, 1442 test pass. ui-web 229 pass, config 114 pass, identity 244 pass.
- Quét diff của `apps/` tìm `? :` và `&&` ở dòng thêm: không có.

## Test đã thêm hoặc đổi

- Header: cụm nằm trong header cùng parent với ⋯ và UserMenu; không còn `.border-t` (không hàng riêng); khối tiêu đề `min-w-0 flex-1`; Xuất bản không nằm trong menu ⋯ (menu chỉ 2 mục); nhãn Xuất bản `sr-only md:not-sr-only` và `min-w-touch`; Xuất bản bị chặn vẫn Tab tới được và `aria-describedby` trỏ đúng lời giải thích; dòng đã xuất bản ở khối tiêu đề, truncate, có `title`.
- SaveIndicator: chữ "Đã lưu", "Đang lưu…", "Lỗi – Thử lại" là `sr-only md:not-sr-only` và nằm trong vùng aria-live; nút lỗi có `min-h-touch min-w-touch`, vẫn gọi đúng `retry`.
- Giữ nguyên các test cũ của publish-button (aria-disabled, tooltip từ `lg`, biến mất sau khi xuất bản).

## CHƯA được xác minh trực quan

Chưa chạy trình duyệt, chưa chụp hoặc đo DOM ở 320×568, 390×844, 768, 1440 (editor cần đăng nhập và backend). Các phần sau mới dựa trên test class và tính tay, chưa đo thật:
- Không tràn ngang (`scrollWidth <= clientWidth`) ở 320px.
- Chiều rộng thực của tiêu đề ở 320 và 390.
- Vùng chạm 44px thực tế của nút lỗi và nút Xuất bản dạng icon (test chỉ kiểm class `min-h-touch min-w-touch`).
- Chiều cao header 64px không đổi trên mobile và `insetTop` của Sheet khớp.
- Khoảng trống 4px của vùng chỉ báo lưu khi trống (div rỗng vẫn chiếm một gap trong flex).

Nên mở thủ công editor ở 320px với trạng thái lỗi lưu và lịch trình đã xuất bản để kiểm tra các điểm trên.
