# Luật viết code Tripory FE

Áp dụng cho mọi code mới và code sửa. Kiến trúc đầy đủ: ai-memories/tripory-fe--ddd-architecture.md (mục 5 là ranh giới tầng). Cách reviewer chấm các luật này nằm ở code-review.md.

## Không bao giờ
- Để token (access/refresh) xuất hiện ở code chạy phía client, hoặc đưa vào localStorage, URL, log.
- Gọi BE trực tiếp từ client. Mọi lời gọi BE đi qua BFF.
- Dùng `dangerouslySetInnerHTML` với dữ liệu người dùng (tên điểm, mô tả, link).
- Import xuyên tầng/package trái ranh giới ESLint. Nếu ESLint chặn import, đặt code lại đúng tầng, không sửa rule và không thêm allowlist.

## Luôn làm
- Mutation (tạo/sửa/xóa) phải xử lý lỗi BE và hiện thông báo tiếng Việt cho người dùng.
- Component dữ liệu phải có đủ trạng thái loading, empty và error.
- Component tương tác phải có `aria-label` khi cần và dùng được bằng bàn phím.
- Chuỗi hiển thị cho người dùng viết bằng tiếng Việt, trừ tên riêng và mã lỗi kỹ thuật.
- Trước khi dùng API Next.js, đối chiếu docs đúng phiên bản trong `apps/web/node_modules/next/dist/docs/`.

## Biểu thức điều kiện
- Tối đa 1 cấp `? :` và `&&` trong một biểu thức. Nhiều hơn thì tách ra biến có tên, hàm nhỏ hoặc early return.
- Không dùng `? :` hay `&&` để ẩn/hiện component trong JSX. Dùng prop `visible` của chính component để nó tự quyết định ẩn/hiện. `? :` chỉ dùng để chọn giá trị (chuỗi, class, số).

## SOLID trong React
- **S:** logic nghiệp vụ (validate, biến đổi dữ liệu, quy tắc quyền) nằm ở hàm thuần hoặc custom hook. Component chỉ nối props/hook với JSX. Khi một file gộp nhiều mối quan tâm (dữ liệu, form, điều hướng, side effect, layout), tách container khỏi phần trình bày. Một hook chỉ làm một việc.
- **O:** thêm biến thể qua `children`, slot prop, render prop hoặc bảng ánh xạ, không thêm nhánh `if/switch` vào thân component có sẵn. Hành vi dùng chung (logging, theo dõi sự kiện, kiểm quyền, retry) đặt ở custom hook hoặc composition, HOC chỉ khi hook không làm được. Đổi API của `packages/ui-web` phải tương thích ngược: thêm prop tùy chọn có giá trị mặc định.
- **L:** component biến thể nhận cùng bộ prop với bản nền (`ComponentProps<typeof Base>`), truyền tiếp `ref`, `className`, `aria-*` và handler của người gọi. Biến thể chỉ thêm hành vi, không bỏ hay nuốt hành vi của bản nền.
- **I:** prop của component chỉ chứa thứ nó dùng. Không truyền cả `itinerary`, `user` hay response BE khi chỉ cần vài trường. Khoảng trên 7 prop hoặc component dài trên khoảng 150 dòng là dấu hiệu cần tách. Hook không trả về object lớn khi chỗ gọi chỉ cần một giá trị.
- **D:** component và tầng UI không gọi trực tiếp `fetch`, `axios`, `localStorage`, `window.location` hay dịch vụ ngoài. Đi qua hook hoặc hàm của tầng ứng dụng, hoặc `packages/api-client`. Component dùng chung trong `ui-web` nhận dữ liệu và handler qua props, context hoặc hook do tầng trên cung cấp, không tự gọi API. Không cần tiêm mọi thứ qua props: dùng hook của tầng ứng dụng đã là phụ thuộc vào trừu tượng.
