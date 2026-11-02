---
inclusion: auto
name: code-review
description: Luật review code Tripory FE. Dùng khi review code, chạy gsd-code-review hoặc kiểm tra thay đổi trước khi ship.
---

# Luật review code Tripory FE

Kiến trúc đầy đủ: ai-memories/tripory-fe--ddd-architecture.md (mục 5 là ranh giới tầng).

File này dành cho người review: nó quy định mức độ nghiêm trọng và cách nhận ra vi phạm. Luật viết code mà agent phải tuân theo khi làm việc nằm ở coding-rules.md. Các nhãn Critical/Warning, ngưỡng và cách báo ở đây không tạo thêm ràng buộc nào khi viết code.

## Phải gắn nhãn Critical nếu vi phạm
- Token (access/refresh) xuất hiện ở code chạy phía client, hoặc bị đưa vào localStorage/URL/log.
- Gọi BE trực tiếp từ client, bỏ qua BFF.
- Dùng dangerouslySetInnerHTML với dữ liệu người dùng (tên điểm, mô tả, link).
- Import xuyên tầng/package trái ranh giới ESLint (đừng đề xuất sửa rule hay thêm allowlist).

## Gắn Warning
- Mutation (tạo/sửa/xóa) không xử lý lỗi BE hoặc không hiện thông báo tiếng Việt cho người dùng.
- Thiếu trạng thái loading/empty/error trong component dữ liệu.
- Component tương tác thiếu aria-label hoặc không dùng được bằng bàn phím.
- Chuỗi hiển thị viết cứng tiếng Anh.
- Dùng API Next.js cũ: phải đối chiếu docs trong apps/web/node_modules/next/dist/docs/.
- Lồng toán tử `? :`, `&&` (hoặc trộn hai loại) quá 1 cấp trong cùng một biểu thức, ví dụ `a ? (b ? x : y) : z` hay `a && (b ? x : y)`. Tối đa 1 cấp. Đề xuất tách ra biến có tên, hàm nhỏ hoặc early return. Luật này là về cấu trúc code, không thuộc mục "style thuần" bên dưới nên vẫn phải báo.
- Dùng `? :` hoặc `&&` để ẩn/hiện component trong JSX, ví dụ `{isOpen && <Dialog />}` hay `{loading ? <Spinner /> : <List />}`. Phải dùng prop `visible` của chính component để nó tự quyết định ẩn/hiện. Chỉ dùng `? :` cho giá trị (chuỗi, class, số), không dùng để chọn component hiển thị.

## Gắn Warning: nguyên tắc SOLID trong React
Mỗi gạch đầu dòng dưới đây mô tả một vi phạm cần báo. Chỉ báo khi vi phạm rõ trong code được review, kèm cách tách cụ thể. Không báo chung chung "vi phạm SOLID". Các con số dưới đây là ngưỡng gợi ý, vượt ngưỡng nhưng vẫn mạch lạc thì chỉ ghi Info.

### S: mỗi component/hook chỉ có một lý do để thay đổi
- Component vừa render UI vừa chứa logic nghiệp vụ (validate, biến đổi dữ liệu, tính toán, quy tắc quyền). Logic phải nằm ở hàm thuần hoặc custom hook, component chỉ nối props/hook với JSX. Ví dụ `validateForm(values)` là hàm riêng, không nằm trong thân component form.
- Component trộn từ ba mối quan tâm trở lên trong cùng một file: gọi dữ liệu (query/mutation), trạng thái form, điều hướng, side effect, layout. Đề xuất tách container (nối dữ liệu) khỏi phần trình bày.
- Một custom hook làm nhiều việc không liên quan (ví dụ vừa tải dữ liệu vừa quản lý dialog vừa theo dõi scroll).
- Component quá dài hoặc quá nhiều nhánh render (khoảng trên 150 dòng, hoặc nhiều khối JSX độc lập). Đề xuất tách thành component con có tên rõ nghĩa.

### O: mở để mở rộng, đóng với sửa đổi
- Thêm một biến thể mới bằng cách sửa thân component có sẵn, như thêm một nhánh `if/switch` theo `type`/`variant` ở nhiều nơi. Cách đúng: nhận nội dung qua `children`, slot prop, hoặc render prop; chọn biến thể bằng bảng ánh xạ (object map) thay vì chuỗi `if`.
- Thêm hành vi dùng chung (logging, theo dõi sự kiện, kiểm quyền, retry) bằng cách chép logic vào từng component. Hành vi ngang phải nằm ở custom hook, wrapper hoặc composition. HOC chỉ dùng khi hook không làm được.
- Thay đổi API của component dùng chung trong `packages/ui-web` theo cách làm vỡ chỗ đang gọi, thay vì thêm prop tùy chọn có giá trị mặc định tương thích ngược.

### L: biến thể phải thay thế được bản gốc
- Component bọc một component nền (ví dụ `SubmitButton` bọc `Button`) mà ghi đè hoặc nuốt prop của bản nền: `{...props}` đặt trước một prop cố định như `onClick`, nên `onClick` do người gọi truyền vào bị mất. Biến thể phải nhận cùng bộ prop với bản nền (kiểu `ComponentProps<typeof Button>`), truyền tiếp `ref`, `className`, `aria-*` và các handler, và chỉ được thêm hành vi chứ không bỏ hành vi.
- Biến thể thu hẹp hợp đồng của bản nền mà không báo: prop bắt buộc mới, ném lỗi hoặc trả `null` ở trường hợp bản nền vẫn xử lý được.
- Dùng được ở chỗ này nhưng làm hỏng ở chỗ khác khi đổi bản nền sang biến thể (ví dụ biến thể không còn nhận được focus, mất `disabled`).

### I: không ép phụ thuộc vào thứ không dùng
- Component nhận nhiều prop không liên quan tới nhau (khoảng trên 7 prop), hoặc chỉ dùng một phần prop được truyền vào. Ví dụ `UserProfile` nhận cả `handleLogin`, `handleLogout`, `handleUpdate` chỉ để hiển thị tên và tuổi. Đề xuất tách thành các component nhỏ (phần hiển thị, phần hành động).
- Truyền cả đối tượng lớn (toàn bộ `itinerary`, `user`, response BE) xuống component chỉ cần vài trường. Component phải khai báo kiểu prop hẹp, chỉ chứa trường nó thật sự đọc.
- Component dùng chung ép người gọi truyền các callback hoặc cờ không liên quan tới nó, hoặc một hook trả về object lớn trong khi chỗ gọi chỉ cần một giá trị. Hook nên tách thành các hook nhỏ theo mối quan tâm.

### D: phụ thuộc vào trừu tượng, không vào chi tiết cụ thể
- Component hoặc tầng UI gọi trực tiếp `fetch`, `axios`, `localStorage`, `window.location` hay dịch vụ ngoài. Phải đi qua hook/hàm của tầng ứng dụng hoặc `packages/api-client` (đúng ranh giới trong `ai-memories/tripory-fe--ddd-architecture.md`). Gọi BE trực tiếp từ client vẫn là Critical ở mục trên.
- Component cứng nhắc gắn với một nguồn dữ liệu cụ thể trong khi lẽ ra cần dùng lại hoặc kiểm thử ở nơi khác (ví dụ component dùng chung của `ui-web` tự gọi API). Component dùng chung phải nhận dữ liệu và handler qua props, context hoặc hook do tầng trên cung cấp.
- Tầng domain/ứng dụng import chi tiết hạ tầng hoặc UI (kiểu phụ thuộc ngược chiều). Hướng phụ thuộc phải đi từ ngoài vào trong theo mục 5 của tài liệu kiến trúc.
- Không áp dụng luật này một cách máy móc: không bắt tiêm (inject) mọi thứ qua props. Trong các module của app, việc dùng hook của tầng ứng dụng đã là phụ thuộc vào trừu tượng, không cần thêm một lớp tiêm nữa.

## Bỏ qua
- Style thuần (dấu ngoặc, thứ tự import) vì Prettier/ESLint đã lo.
- File sinh tự động: next-env.d.ts, .next/.
