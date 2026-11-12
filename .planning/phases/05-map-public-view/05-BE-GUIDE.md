# Phase 5: Hướng dẫn sửa BE (tác giả của lịch trình)

**Ngày viết:** 2026-11-11
**Người sửa BE:** user. Tài liệu này là hướng dẫn bằng lời, không kèm code. Đặc tả gốc nằm ở mục "Phụ thuộc BE" (BE-05-01) và D-02 của `05-CONTEXT.md`.
**Repo BE đã đọc:** `tripory_be` nằm cạnh repo FE, nhánh `dev`, commit `feb288e`, đọc ở chế độ chỉ đọc. Tên lớp và tệp dưới đây là tên thật trong repo đó. Đường dẫn tính từ `src/Services/Tripory/`.

## 1. Tình trạng đã xác nhận

Hai điều sau do user báo ngày 2026-11-11. Agent chưa kiểm độc lập (chưa gọi BE đã deploy, chưa đọc cấu hình môi trường thật). Vì vậy hai hạng mục này KHÔNG còn là việc phải làm, nhưng UAT Phase 5 vẫn nên liếc lại ở bước kiểm tồn đọng Phase 4.

| Hạng mục | Tình trạng | Nguồn xác nhận |
|----------|------------|----------------|
| Các mục 6 đến 11 của `04-BE-CONTRACT.md` (nghiệm thu `POST`, `PUT`, `GET` thật) | BE đã deploy | User, 2026-11-11 |
| `DestinationCatalog:CoverImageBaseUrl` của BE | Khớp với `DESTINATION_IMAGE_BASE_URL` bên FE | User, 2026-11-11 |

Việc còn lại duy nhất là BE-05-01 ở mục 2.

## 2. Việc duy nhất cần sửa: BE-05-01 (nhúng tác giả)

### What (làm gì)

Thêm một khóa `author` vào dữ liệu trả về của `GET /api/v1/itineraries/{id}`. Khóa này là một đối tượng gồm ba trường: `id` (mã người tạo), `displayName` (tên hiển thị) và `avatarUrl` (ảnh đại diện, có thể rỗng). Không thêm endpoint mới, không dùng `GET /users/{id}`.

### Why (vì sao)

Trang công khai của Phase 5 muốn hiện người tạo bài (avatar và tên, ngay dưới tiêu đề) cho cả khách chưa đăng nhập. Dữ liệu chi tiết hiện chỉ có `userId`, FE không có cách nào lấy tên. `UsersController` chỉ có danh sách và tìm kiếm, `GET /me` và `PUT /profile`, nên cũng không có endpoint công khai để hỏi riêng theo mã người dùng. Nhúng thẳng vào dữ liệu chi tiết tránh thêm một lần gọi và tránh phải mở thêm endpoint công khai về người dùng.

### Where (sửa ở đâu)

Tên dưới đây là tên thật đọc từ `tripory_be`.

| Tầng | Tệp | Việc cần làm |
|------|-----|--------------|
| Application, phản hồi | `Tripory.Application/UseCases/V1/Itineraries/Responses/ItineraryDetailDto.cs` | Thêm một kiểu con mới cho tác giả (ba trường nói ở trên) và một thành phần mới `Author` kiểu cho phép rỗng trong `ItineraryDetailDto`. Đặt thành phần mới ở cuối danh sách để không làm lệch các nơi gọi theo thứ tự. |
| Application, ánh xạ | `Tripory.Application/UseCases/V1/Itineraries/Extensions/ItineraryExtensions.cs` | Phương thức mở rộng đổi lịch trình sang DTO chi tiết cần nhận thêm thông tin tác giả (tùy chọn, mặc định rỗng) và điền vào DTO. |
| Application, xử lý truy vấn | `Tripory.Application/UseCases/V1/Itineraries/Handlers/GetItineraryByIdQueryHandler.cs` | Sau khi đã qua kiểm quyền, nạp người dùng theo `UserId` của lịch trình, tính tác giả, rồi truyền vào bước ánh xạ. Cần tiêm thêm `IUserRepository` (nằm ở `Tripory.Application/Abstractions/Data/`, đã có thao tác lấy người dùng theo mã). |
| Application, nơi gọi khác | `CreateQuickDraftItineraryCommandHandler.cs` (cùng thư mục `Handlers`) | Cũng dùng phương thức ánh xạ trên cho phản hồi của `POST /api/v1/itineraries`. Không cần làm gì thêm: tác giả để rỗng là chấp nhận được, FE không đọc tác giả từ phản hồi này. |
| Domain | `Tripory.Domain/Entities/User.cs` | Chỉ đọc: có `FullName`, `Handle` (kiểu giá trị có thuộc tính `Value`), `AvatarUrl`. Không sửa. |

Ghi chú: trong cấu hình EF của lịch trình (`ItineraryConfiguration.cs`) chỉ thấy `UserId` và chỉ mục theo `UserId`, không thấy thuộc tính điều hướng tới người dùng. Vì vậy hướng chọn là nạp người dùng riêng trong handler (một lần đọc theo khóa chính), không sửa mô hình dữ liệu và không cần migration.

### When (khi nào)

KHÔNG chặn Phase 5. FE đã coi `author` là tùy chọn: khi dữ liệu chưa có `author` thì ẩn khối tác giả, không lỗi. Chủ lịch trình vẫn thấy dòng "Lịch trình của bạn" dù BE chưa sửa. Bạn có thể sửa và deploy bất cứ lúc nào, trước hoặc sau UAT Phase 5. Nên deploy trước UAT nếu muốn kiểm mục I2 của `05-UAT-CHECKLIST.md` (khối tác giả có avatar và tên).

### Who (ai làm)

User tự sửa `tripory_be`. Agent không sửa repo BE. FE không phải đổi gì khi BE sửa xong.

### How (làm thế nào)

1. Thêm kiểu tác giả mới trong tầng Application, cạnh `ItineraryDetailDto`, với ba trường `id`, `displayName`, `avatarUrl`.
2. Thêm thành phần `author` (cho phép rỗng) vào cuối `ItineraryDetailDto`.
3. Cho phương thức ánh xạ trong `ItineraryExtensions.cs` nhận tác giả như một tham số tùy chọn, mặc định rỗng, để các nơi gọi cũ vẫn biên dịch.
4. Trong `GetItineraryByIdQueryHandler`, đặt bước nạp người dùng SAU khối kiểm quyền bản nháp (để bản nháp của người khác vẫn trả 403 và không phát sinh truy vấn thừa), rồi áp quy tắc ở mục 3 để tạo tác giả.
5. Nếu không tìm thấy người dùng, truyền tác giả rỗng. Không trả lỗi, không đổi mã trạng thái.
6. Cập nhật `API_ENDPOINTS.md` của BE: thêm khóa `author` vào mô tả phản hồi của `GET /api/v1/itineraries/{id}`.
7. Biên dịch, chạy các bộ kiểm thử hiện có của BE, rồi deploy.

## 3. Quy tắc dữ liệu

| Quy tắc | Nội dung |
|---------|----------|
| `displayName` | Lấy từ `FullName` của người dùng. Nếu `FullName` rỗng hoặc chỉ có khoảng trắng thì dùng giá trị của `Handle`. |
| `avatarUrl` | Lấy nguyên từ `AvatarUrl`. Có thể là ảnh mặc định chung (dicebear). KHÔNG lọc ở BE: FE tự nhận ra ảnh mặc định và hiện chữ cái đầu của tên. |
| Trường nhạy cảm | Tuyệt đối KHÔNG trả `email`, vai trò, trạng thái, lý do khóa, tiểu sử, mật khẩu băm hay bất kỳ trường nào khác của người dùng. Tác giả chỉ có đúng ba trường công khai ở trên. |
| Người tạo không còn | Nếu không nạp được người dùng theo `UserId` (đã bị xóa) thì `author` là rỗng, các trường khác của lịch trình vẫn trả bình thường. |
| Tương thích ngược | Chỉ THÊM trường. Không đổi tên, không đổi kiểu, không đổi nghĩa bất kỳ trường cũ nào (kể cả `userId`). FE cũ đang chạy song song phải tiếp tục hoạt động. |
| Quyền truy cập | Endpoint vẫn cho truy cập ẩn danh (`AllowAnonymous`). Bản nháp của người khác vẫn trả 403. Mã lịch trình không tồn tại vẫn trả 404. Không đổi thứ tự: kiểm quyền trước, nạp tác giả sau. |
| Người xem là khách | Khách vẫn nhận được `author` của lịch trình đã xuất bản. Đây chỉ là ba trường công khai nên không có rủi ro lộ dữ liệu. |
| Người xem là chủ | Chủ thấy cùng ba trường như khách. Không thêm trường riêng cho chủ. |

## 4. Ghi chú định hướng cho Phase 5.1 (like và comment)

API like và comment sẽ có hợp đồng BE riêng, viết sau khi chạy `/gsd-discuss-phase 5.1`. Tài liệu này không đặc tả phần đó, và việc nhúng `author` ở trên không phụ thuộc vào nó.

## 5. Cách kiểm sau khi sửa

Danh sách kiểm bằng lời, theo thứ tự:

1. Chọn một lịch trình đã xuất bản. Khi CHƯA đăng nhập, gọi `GET /api/v1/itineraries/{id}`. Kết quả phải là 200 và dữ liệu có khóa `author` với đúng ba trường `id`, `displayName`, `avatarUrl`.
2. Đối chiếu: `author.id` bằng `userId` của chính lịch trình đó; `displayName` bằng họ tên của người tạo (hoặc `Handle` nếu họ tên rỗng).
3. Tìm trong toàn bộ phản hồi: không có `email`, vai trò, trạng thái hay trường lạ nào ngoài ba trường tác giả.
4. Với người tạo dùng avatar mặc định, `avatarUrl` vẫn là địa chỉ ảnh mặc định (không bị đổi thành rỗng).
5. Khi chưa đăng nhập, gọi `GET /api/v1/itineraries/{id}` của một bản nháp thuộc người khác: phải trả 403, không có `author`. Nếu đăng nhập bằng tài khoản không phải chủ cũng phải trả 403.
6. Gọi với một mã đúng dạng nhưng không tồn tại: phải trả 404.
7. Mở lịch trình bằng tài khoản chủ: vẫn trả đủ các trường cũ (`coverImages`, `days`, `waypoints`...) cùng với `author`, giá trị cũ không đổi.
8. Không cần đổi gì ở FE. Mở trang công khai `/itineraries/{id}` của lịch trình đã xuất bản: dưới tiêu đề tự hiện avatar (hoặc chữ cái đầu khi là ảnh mặc định) và tên người tạo. Chủ lịch trình thấy thêm nhãn "Lịch trình của bạn".
9. Ghi kết quả vào mục I2 của `05-UAT-CHECKLIST.md` khi đến bước UAT.
