# Review: chuyển SaveIndicator + Xuất bản lên vùng phải header

Kết luận: **APPROVED**. Không có phát hiện chặn.

## Căn cứ

Đã đọc `coder-report.md` và diff của 5 file trong `apps/web/src/modules/itinerary/ui` cùng `04-UI-SPEC.md`. Không chạy lại lint, typecheck, test, build. Báo cáo coder ghi `turbo run lint typecheck test --force` thành công 24/24 task, web 1442 test pass.

## Đối chiếu yêu cầu

- **Một hàng ở mọi breakpoint.** `editor-header.tsx` bỏ hàng 2 (`border-t`) và `useMediaQuery(SM)`. `SaveIndicator`, `PublishButton`, menu ⋯ và `UserMenu compact` nằm trong `ACTIONS_CLASSES` (`flex shrink-0 ...`) cùng hàng với tiêu đề.
- **Xuất bản ở ngoài menu ⋯.** Menu vẫn chỉ có 2 mục. Test `keeps Xuất bản outside the ⋯ menu` kiểm tra điều này.
- **Mobile, SaveIndicator.** Mỗi trạng thái hiện icon. Chữ dùng `sr-only md:not-sr-only` và vẫn nằm trong `div aria-live="polite"`. Nút lỗi có `min-w-touch`. `min-h-touch` đã có sẵn trong `Button`. Token `--spacing-touch` có trong `theme.css`, nên cả hai class hợp lệ. Test thêm kiểm tra `retry` được gọi khi bấm.
- **Mobile, Xuất bản.** Dưới `md` chỉ hiện icon `Globe` (`md:hidden`). Chữ "Xuất bản" là `sr-only md:not-sr-only` nên tên truy cập vẫn là "Xuất bản". `min-w-touch` đảm bảo vùng chạm 44px. Hành vi chặn giữ nguyên: `aria-disabled`, `aria-describedby`, tooltip từ `lg`, dải giải thích dưới `lg`, `return null` khi đã xuất bản. Test Tab tới nút bị chặn và kiểm tra nội dung lời giải thích.
- **Tiêu đề.** Khối tiêu đề giữ `min-w-0 flex-1`, h1 `truncate`. Vùng phải `shrink-0`, nên chỉ tiêu đề co lại. Ước lượng 320px của coder (76px tiêu đề) tính lại khớp: 288 − (4×44 + 16 + 5×4) = 76.
- **Dòng "Thay đổi hiển thị ngay với người xem".** Giữ ở dòng 2 của khối tiêu đề, cắt bằng ellipsis và có `title`. Lựa chọn được ghi rõ trong báo cáo và UI-SPEC, hợp lý vì không thêm hàng nên header không cao lên.
- **`headerHeight` và `insetTop`.** Header vẫn một phần tử sticky đo bằng ResizeObserver. Mobile không còn hàng 44px nên chiều cao ổn định 64px, không cần sửa `editor-layout.tsx`.
- **403.** `EditorHeaderMinimal` không đổi.

## Ràng buộc code

- Quét các dòng thêm của diff `apps/`: không có `? :` hay `&&`. Chỉ có `?.` (optional chaining) ở `?.textContent` trong test, không phải toán tử điều kiện. Điều kiện được thay bằng early return, component `SaveStatus` / `PublishedNote` và hàm `blockedAttributes`.
- Class chỉ dùng token (`gap-inline-xs`, `text-label`, `text-muted`, `min-w-touch`, `shrink-0`, ...). Không có màu hoặc khoảng cách thô.
- Không đổi import giữa các tầng ngoài `lucide-react` (`Globe`), cùng nguồn với các file UI khác. Không đụng cấu hình ESLint boundaries.
- `package.json` và `pnpm-lock.yaml` bị sửa từ trước (nâng turbo, ngoài phạm vi). HEAD vẫn là `c088072`, branch `phase_4`, không có commit hay push mới.
- 6 file đã sửa đọc được là UTF-8 hợp lệ, không có ký tự thay thế U+FFFD, không có dấu hiệu mojibake. Chuỗi có dấu trong diff đúng. Phần hiển thị lỗi trong console PowerShell chỉ là vấn đề hiển thị của terminal.
- `04-UI-SPEC.md` đã cập nhật: một hàng, vùng phải, thu gọn dưới `md`, ước lượng 320px, dòng chiều cao header, mặc định của researcher, và ghi chú lệch D-16/D-30/D-38 (Phương án C).

## Test

Có test cho: cụm nằm trong header cùng parent với ⋯ và UserMenu; không còn `.border-t`; khối tiêu đề co được; Xuất bản ngoài menu ⋯; nhãn `sr-only` và `aria-live` cho 3 trạng thái; nút lỗi bấm được với `min-h-touch min-w-touch`; `aria-disabled` kèm lời giải thích và Tab tới được; nút biến mất khi đã xuất bản (test cũ giữ nguyên); dòng đã xuất bản truncate và có `title`. Các test này chỉ kiểm class, không đo bố cục thật. Đó là giới hạn của môi trường test, không phải blocker.

## Mức trung thực của báo cáo coder

Báo cáo nêu rõ các điểm chưa xác minh trực quan (không tràn ngang ở 320px, độ rộng tiêu đề thực, vùng chạm 44px thực, chiều cao header 64px và `insetTop`, khoảng trống 4px của vùng chỉ báo rỗng). Không có điểm nào cho thấy lỗi từ đọc code. Khuyến nghị: mở thủ công editor ở 320px ở trạng thái lỗi lưu và lịch trình đã xuất bản.
