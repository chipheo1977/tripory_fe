# Phase 5: Phụ thuộc BE

**Ngày:** 2026-11-11
Repo `tripory_be` do người dùng tự sửa; agent chỉ đặc tả và không ghi gì vào repo đó. Không mục nào dưới đây chặn Phase 5: FE đã xử lý trường hợp BE chưa có `author`.

## BE-05-01 (không chặn): nhúng tác giả vào ItineraryDetailDto

Hướng dẫn từng bước bằng lời nằm ở `05-BE-GUIDE.md` (tên lớp và tệp thật trong `tripory_be`). Người dùng tự thực hiện.

- **What:** `ItineraryDetailDto` thêm `author: { id: Guid, displayName: string, avatarUrl: string | null }`.
- **Why:** trang công khai hiện người tạo cho khách (D-02); FE chỉ có `userId`.
- **Where:** `GetItineraryByIdQueryHandler` / `ToDetailDto` (nạp user theo `UserId`), áp cho `GET /api/v1/itineraries/{id}`; các endpoint trả `ItineraryDetailDto` khác có thể trả cùng trường.
- **How:** `displayName` lấy từ `FullName` của user (rỗng thì `Handle`); `avatarUrl` là `AvatarUrl` hiện có. Không đưa `email`, `roles`, `status` vào. User đã xóa thì `author` là `null`. Trường mới không đổi tên hay nghĩa trường cũ.
- **FE đã làm (plan 05-03):** `author` tùy chọn trong schema Zod (`itineraryAuthorDto.nullish()`); `Itinerary.author?` ở domain; thiếu hoặc hỏng thì ẩn khối tác giả; avatar mặc định dicebear (`seed=tripory`) thành `null` để hiện chữ cái đầu; chỉ chép `id`, `displayName`, `avatarUrl`.

### Cách xác nhận BE-05-01 đã deploy

Gọi `GET {API_ORIGIN}/api/v1/itineraries/{id}` của một lịch trình đã xuất bản và kiểm JSON có khóa `author`. Nếu có, trang công khai tự hiện avatar và tên, không cần đổi code FE.

## Tình trạng các hạng mục tồn đọng từ Phase 4

| Hạng mục | Tình trạng | Nguồn |
|----------|------------|-------|
| BE đã deploy các mục 6-11 của `04-BE-CONTRACT.md` (POST/PUT, DTO `coverImages`/`selectedCoverIndex`/`destinationCode`, mã lỗi, migration) | Đã được người dùng xác nhận ngày 2026-11-11. Không còn là việc phải làm. Agent chưa kiểm độc lập. | Người dùng |
| `DestinationCatalog:CoverImageBaseUrl` của BE khớp `DESTINATION_IMAGE_BASE_URL` trong `apps/web/src/composition/destination-catalog.ts` (`https://triporyv1.vercel.app/destinations`). FE dùng gốc này để nhận ra ảnh giữ chỗ theo điểm đến khi chọn ảnh OG (D-18). | Đã được người dùng xác nhận ngày 2026-11-11. Không còn là việc phải làm. Agent chưa kiểm độc lập. | Người dùng |
| UAT mục F của Phase 4 (F1..F12) mới chỉ được chấp nhận theo xác nhận người dùng; bản đồ Phase 5 dùng lại code 04-42..04-53 | Còn mở. Xem `04-REVIEW.md`, `04-UI-REVIEW.md`, `deferred-items.md`. | Phase 4 |
| Chưa kiểm trên thiết bị cảm ứng thật | Còn mở, thuộc UAT thủ công của Phase 5. | Phase 4 |

## Không ảnh hưởng

`/mine` đếm sai `DaysCount`/`WaypointsCount` (`04-BE-DEPENDENCIES.md`) không ảnh hưởng trang công khai vì trang này dùng DTO chi tiết.

## Hợp đồng BE mà Phase 5 dựa vào

`GET /api/v1/itineraries/{id}` có `[AllowAnonymous]`: 404 `Itinerary.NotFound`; 403 `Itinerary.Forbidden` (nháp, người xem không phải chủ); 200 `ItineraryDetailDto`. Đã kiểm trên nhánh `dev`, commit `feb288e`, ngày 2026-11-07.
