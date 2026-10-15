# Phase 3: Phụ thuộc vào BE (đầu vào cho DEPL-02)

Danh sách các điểm của `tripory_be` mà FE Phase 3 (Identity, phiên, BFF) phụ thuộc hoặc phải chấp nhận giới hạn. Repo `tripory_be` chỉ được đọc từ repo này; các hành động ở cột "Hành động đề xuất" sẽ được chuyển sang `tripory_be` ở Phase 8 (DEPL-02).

Đường dẫn nguồn tính từ `tripory_be/src/Services/Tripory/`.

| # | Vấn đề / Phụ thuộc | Mức độ | Nguồn | Hành động đề xuất cho `tripory_be` | Cách FE kiểm lại |
|---|--------------------|--------|-------|-------------------------------------|------------------|
| 1 | **Lỗi regex email (D-33).** `Email.cs` dùng `^[^@s]+@[^@s]+.[^@s]+$` (thiếu dấu `\` trước `s` và `.`), nên lớp ký tự loại cả chữ "s"/"S" và dấu `.` khớp mọi ký tự: mọi email chứa chữ "s" đều không đăng ký, không đăng nhập được. | Chặn UAT | `Tripory.Domain/ValueObjects/Email.cs:10-12` | Sửa thành `^[^@\s]+@[^@\s]+\.[^@\s]+$`. | UAT Phase 3: đăng ký rồi đăng nhập bằng `user@gmail.com`. FE KHÔNG chép regex lỗi (validate email phía FE dùng quy tắc riêng, D-33). |
| 2 | Không có rate limit cho `login` / `register`. | Cao | `Tripory.API/Program.cs`, `Controllers/V1/AuthController.cs` | Thêm rate limiter theo IP/tài khoản cho các endpoint auth. | FE chỉ hiển thị lỗi 429 chung; kiểm lại sau khi BE thêm giới hạn. |
| 3 | Không có endpoint logout / thu hồi refresh token. Giới hạn đã chấp nhận: đăng xuất chỉ xóa cookie phía BFF, refresh token cũ vẫn dùng được tới khi hết hạn. | Trung bình | `Controllers/V1/AuthController.cs` | Thêm `POST /auth/logout` thu hồi refresh token; FE sẽ gọi nó từ `handleLogout`. | Sau khi BE có endpoint: refresh bằng token cũ phải trả 401. |
| 4 | Refresh token không có cửa sổ ân hạn (grace window). FE phụ thuộc Web Locks và route idempotent để hai tab không đạp token của nhau. | Trung bình | `Infrastructure/Implementations/Security/JwtTokenService.cs`, handler refresh | Thêm grace window vài giây: token vừa xoay vẫn được chấp nhận lại. | Mở hai tab, để cùng refresh một lúc: không tab nào bị đăng xuất. |
| 5 | Validation envelope không có tên field (Phase 2 D-05a): `ValidationPipelineBehavior` chỉ trả lỗi đầu tiên và `errorCode` là tên validator FluentValidation. | Trung bình | `Tripory.Application/Behaviors/ValidationPipelineBehavior.cs` | Thêm `WithErrorCode` hoặc tên field vào từng rule, trả đủ danh sách lỗi. | FE map lỗi form theo field (`form-error-mapping`); kiểm lại fixture khi BE đổi. |
| 6 | Endpoint `[AllowAnonymous]` coi Bearer hết hạn là ẩn danh và trả 403. BFF chặn sớm (refresh trước khi chuyển tiếp), nhưng ghi lại để không bị bất ngờ. | Thấp | `Controllers/V1/*` | Cân nhắc trả 401 khi Bearer có mặt nhưng không hợp lệ. | Test BFF với access token hết hạn trên endpoint công khai. |
| 7 | CORS `SetIsOriginAllowed(_ => true)` cùng `AllowCredentials`. BFF là lớp kiểm Origin duy nhất phía FE. | Cao khi deploy | `Tripory.API/Program.cs:100-109` | Giới hạn origin theo môi trường khi deploy (DEPL-02). | Gọi BE từ origin lạ phải bị từ chối sau khi sửa. |
| 8 | `expiresAt` là hạn refresh token 7 ngày cứng; `JwtOptions.RefreshTokenExpiryDays` không được dùng. `ExpiryMinutes` mặc định 15 nếu thiếu cấu hình (appsettings đặt 60). | Thấp | `Infrastructure/Configurations/JwtOptions.cs`, `Tripory.API/appsettings.json` | Dùng `RefreshTokenExpiryDays` thật sự; ghi rõ mặc định. | FE đọc hạn từ claim access token và `Max-Age` cookie; kiểm lại nếu BE đổi. |
| 9 | Tên claim JWT là URI dài, không có `sub` / `iat` / avatar. Nếu BE đổi sang `JsonWebTokenHandler` hoặc bật outbound claim map thì tên claim đổi. | Thấp | `Infrastructure/Implementations/Security/JwtTokenService.cs` | Báo FE trước khi đổi định dạng claim. | `parseAccessTokenClaims` nhận cả dạng ngắn và dài; chạy lại test fixture claim. |
| 10 | Avatar mặc định của BE là một ảnh chung (`dicebear identicon seed=tripory`) cho mọi người dùng. | Thấp | Domain/Application (tạo user) | Dùng seed theo người dùng hoặc để trống. | FE coi avatar mặc định này là "không có avatar" và hiện chữ cái đầu. |
| 11 | Đăng ký có thể tạo user nhưng client timeout trước khi nhận phản hồi (cold start), lần bấm lại báo `User.EmailAlreadyExists`. FE chấp nhận (Pitfall 7). | Thấp | `Controllers/V1/AuthController.cs` | Cân nhắc làm `register` idempotent theo email + mật khẩu. | UAT: đăng ký lúc BE nguội, thử lại, rồi đăng nhập được. |
| 12 | BE trên host miễn phí có cold start tới khoảng 30 giây (FE timeout 30 s, upstream 28 s). | Trung bình | Hạ tầng host | Dùng gói luôn bật hoặc ping giữ ấm khi deploy. | Đo thời gian phản hồi đầu tiên sau khi để BE ngủ. |
| 13 | Mẹo UAT: chạy BE với biến môi trường `JwtOptions__ExpiryMinutes=5` để thấy refresh im lặng nhanh. Không đặt nhỏ hơn 3 phút vì `PROACTIVE_LEAD_SEC` = 120 giây. | Ghi chú | `Tripory.API/appsettings.json` | Không cần sửa BE. | Đăng nhập, chờ quá hạn, thao tác tiếp: phiên được giữ. |
| 14 | FE cần biến server-only `API_ORIGIN` (URL gốc BE, không kèm `/api/v1`), khai báo trong Vercel và `turbo.json` (Phase 8 hoàn thiện, DEPL-01). | Bắt buộc khi deploy | `apps/web/src/composition/server/env.ts` | Không cần sửa BE; cần URL ổn định của BE. | Build và chạy production với `API_ORIGIN` trỏ tới BE thật. |

## Ghi chú chuyển sang DEPL-02 (Phase 8)

Các mục cần đẩy sang repo `tripory_be`:

- Mục 1: sửa regex email (chặn UAT, làm trước tiên).
- Mục 2: rate limit cho endpoint auth.
- Mục 3: endpoint logout / thu hồi refresh token.
- Mục 4: grace window cho refresh token.
- Mục 5: tên field và danh sách đầy đủ trong lỗi validation.
- Mục 6: 401 thay vì 403 cho Bearer hết hạn trên endpoint công khai.
- Mục 7: giới hạn CORS theo origin khi deploy.
- Mục 8, 10: dọn cấu hình hạn token và avatar mặc định.

Các mục 9, 11, 12, 13, 14 là ghi chú cho FE hoặc vận hành, không đòi hỏi sửa `tripory_be`.
