# Phase 4: Phụ thuộc vào BE (đầu vào cho DEPL-02)

Danh sách các điểm của `tripory_be` mà FE Phase 4 (Itinerary CRUD & editor) phụ thuộc hoặc phải chấp nhận giới hạn. Repo `tripory_be` chỉ được đọc từ repo này; các hành động ở cột "Đề xuất BE" sẽ được chuyển sang `tripory_be` ở Phase 8 (DEPL-02). Phần phụ thuộc của Phase 3 (đăng nhập, phiên, BFF, rate limit, bí mật dùng chung) nằm ở [`03-BE-DEPENDENCIES.md`](../03-identity-session-bff/03-BE-DEPENDENCIES.md) và vẫn có hiệu lực.

Đường dẫn nguồn tính từ `tripory_be/src/Services/Tripory/`. Hợp đồng BE được đọc từ nhánh `feat/be-fe-integration-group-a` (xem `04-RESEARCH.md` §Contract BE).

| # | Vấn đề | Ảnh hưởng FE | Đề xuất BE | Trạng thái |
|---|--------|--------------|------------|------------|
| 1 | `GET /itineraries/mine` trả `DaysCount` và `WaypointsCount` luôn bằng 0 vì truy vấn thiếu `Include` cho ngày và waypoint. | D-04: thẻ lịch trình không hiện số ngày, số điểm (chỉ hiện tổng km, ẩn khi 0). Test `itinerary-card` khóa việc không hiển thị. | Thêm `Include` (hoặc đếm bằng subquery) để hai trường trả số thật; khi đó FE bật lại hai chỉ số trên thẻ. | Mở |
| 2 | Ba giới hạn độ dài chỉ tồn tại ở cột DB (`HasMaxLength`), không có validator: địa chỉ waypoint 500, ghi chú waypoint 2000, `coverImageUrl` 500. Vượt giới hạn thành lỗi DB (5xx), không phải 400 có mã. | Zod phía FE là lớp chặn duy nhất (`form-schemas`: 500/2000/500). Nếu BE đổi giới hạn cột, FE lệch mà không có test nào báo. | Thêm `RuleFor(...).MaximumLength(...)` cho ba trường để trả 400 với `errorCode` theo field; giữ số khớp cột. | Mở |
| 3 | Phân trang theo offset (`pageIndex`, `pageSize`) trên danh sách sắp `UpdatedAt` giảm dần, mà mọi thao tác ghi (kể cả tính lại km) đều cập nhật `UpdatedAt`. Lịch trình vừa sửa nhảy lên đầu danh sách. | Pitfall 6: khi người dùng cuộn vô hạn (D-02) trong lúc sửa ở tab khác, trang kế có thể trùng hoặc bỏ sót mục. FE chấp nhận, không tự sắp lại (D-05). | Phân trang cursor theo `(UpdatedAt, Id)`, hoặc sắp theo `CreatedAt` cho danh sách cuộn vô hạn. | Mở |
| 4 | Không có ETag hoặc số phiên bản cho lịch trình. `PUT` thay thế toàn bộ, không phát hiện ghi chồng. | D-37: hai tab hoặc hai thiết bị cùng sửa thì bản ghi sau thắng. FE chỉ giảm nhẹ bằng `refetchOnWindowFocus` và, khi `InvalidReorderList`, tải lại rồi báo "Danh sách đã thay đổi, đã tải lại". | Trả `ETag` hoặc `rowVersion`, nhận `If-Match`, trả 412 khi lệch. | Mở |
| 5 | `ItinerarySummaryDto` (danh sách `/mine`) không có `UpdatedAt`. | FE không hiện "cập nhật lần cuối" trên thẻ và không tự sắp xếp theo thời gian (D-05 dựa hoàn toàn vào thứ tự BE). | Thêm `UpdatedAt` (DateTimeOffset) vào `ItinerarySummaryDto`. | Mở |
| 6 | Thiếu endpoint cho các thao tác đã hoãn (Deferred Ideas của 04-CONTEXT): xóa ngày, hủy xuất bản, chuyển waypoint sang ngày khác. | Editor không có "Xóa ngày", không có "Hủy xuất bản" (hộp xác nhận xuất bản ghi rõ không hoàn lại được, D-41), và không có "Chuyển sang ngày…" (UX-07, v2). Kéo thả chỉ đổi thứ tự trong cùng ngày. | `DELETE /{id}/days/{dayNumber}`; `PUT /{id}/unpublish`; `PUT /{id}/waypoints/{wid}/move` (đổi `dayNumber` và `orderIndex`). | Hoãn sang v2 |
| 7 | `GET /itineraries/{id}` là `[AllowAnonymous]` nên coi Bearer hết hạn là ẩn danh và trả 403 thay vì 401. Cùng gốc với mục 6 của Phase 3. | Pitfall 11, D-45: nếu gọi thẳng, chủ sở hữu có phiên stale sẽ thấy trang "Không có quyền" sai. FE tránh bằng cách tải qua BFF (`appHttp` có refresh và phát lại), không gọi BE từ RSC. Test `auth-invariants`/`itinerary-invariants` khóa việc trang editor không gọi BE. | Trả 401 khi Bearer có mặt nhưng không hợp lệ (cùng đề xuất với Phase 3 mục 6). | Mở (FE đã né) |
| 8 | Link Google Maps rút gọn `maps.app.goo.gl` của một địa điểm (POI) không chứa tọa độ; chỉ link ghim mới có. Route `/api/maps/resolve` chỉ theo redirect, không đọc nội dung đích. | D-48: nhập link POI thì FE hiện câu hướng dẫn nhập tọa độ; D-49: tách Tên/Địa chỉ từ `/place/<tên, địa chỉ>/` khi có. Người dùng phải tự dán tọa độ. | Cân nhắc geocoding hoặc Places API ở BE (hoặc BFF) cho v2 (MAP-01: tìm địa điểm theo tên). Không cần sửa BE cho v1. | Hoãn sang v2 |
| 9 | `ItineraryDetailDto.days[]` có thể thưa (ngày không liên tục) và `dayNumber` chỉ chặn `< 1`, không có trần; `ToDetailDto` không `OrderBy`. | D-27, D-28: FE tự sắp xếp và dựng dải ngày thưa (`buildDayRange`); thêm waypoint vào ngày chưa có sẽ tạo ngày. Không đòi hỏi BE, ghi lại để không bị bất ngờ khi BE đổi. | Nếu BE thêm trần số ngày hoặc `OrderBy`, báo FE để chỉnh `buildDayRange` và mapper. | Ghi chú |
| 10 | Phụ đề ngày `""` được lưu là `""` (không phải `null`). | D-29: FE gửi `null` khi rỗng và mapper coi `""` như không có phụ đề. | Chuẩn hóa `""` thành `null` khi lưu. | Ghi chú |
| 11 | `DELETE` waypoint qua `keepalive` khi đóng tab (D-50) đi qua BFF với Origin hợp lệ; không có cơ chế hoàn tác phía BE. | Xóa điểm là xóa thật sau 5 giây (hoặc khi flush); hoàn tác chỉ là hủy lệnh DELETE chưa gửi. | Không cần sửa. | Ghi chú |

## Ghi chú chuyển sang DEPL-02 (Phase 8)

Các mục cần đẩy sang repo `tripory_be`:

- Mục 1, 2, 5: sửa nhỏ, không đổi hợp đồng cũ (thêm `Include`, validator, trường `UpdatedAt`).
- Mục 3, 4: cursor pagination và ETag; có ảnh hưởng hợp đồng nên cần FE đổi đồng thời.
- Mục 6: các endpoint mới cho v2 (UX-07 và liên quan).
- Mục 7: trùng với Phase 3 mục 6 (401 thay vì 403 cho Bearer stale).

Các mục 8 (geocoding, v2), 9, 10, 11 là ghi chú cho FE hoặc phạm vi v2, không đòi hỏi sửa `tripory_be` cho v1.
