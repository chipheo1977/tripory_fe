# Phase 4: Hợp đồng BE cho form tạo lịch trình, nhiều ảnh bìa và tự lưu

**Ngày viết:** 2026-11-03 (phần mở lại 2026-10-30)
**Người sửa BE:** user (D-52). Tài liệu này là đặc tả, không kèm code và không kèm ca kiểm thử (D-57).
**Repo BE đã đọc để trích dẫn:** `tripory_be`, nhánh `feat/be-fe-integration-group-a`, đọc ở chế độ chỉ đọc. Mọi đường dẫn `file:dòng` dưới đây tính từ `tripory_be/src/Services/Tripory/` và đúng với nhánh đó; nếu bạn đã sửa các file này thì số dòng có thể lệch.

## 1. Mục đích và phạm vi

**Mục đích.** FE của Phase 4 được mở lại ngày 2026-10-30 để làm hai yêu cầu: ITIN-02 (form tạo lịch trình 4 khối: Điểm đến, Tên chuyến đi, Thời gian, Sở thích) và ITIN-03 (tối đa 5 ảnh bìa, chọn một ảnh đang hiển thị, tự lưu "Thông tin chuyến đi"). Hai yêu cầu này cần BE nhận và trả thêm dữ liệu mà BE hiện chưa có. Tài liệu này mô tả đầy đủ thay đổi để bạn tự sửa `tripory_be` mà không cần hỏi thêm.

**Hiện trạng BE (đã kiểm lại):**

- `POST /api/v1/itineraries` chỉ nhận `{ "title" }` (`Tripory.API/Contracts/V1/Itineraries/Requests/CreateItineraryRequest.cs:3`) và chỉ tạo đúng Ngày 1 (`Tripory.Domain/Entities/Itinerary.cs:48-66`, `GetOrCreateDay(1)` ở dòng 64).
- `PUT /api/v1/itineraries/{id}` nhận 4 trường `title`, `description`, `startDate`, `coverImageUrl` và ghi đè cả 4 (`UpdateItineraryMetadataRequest.cs:3-8`, `Itinerary.cs:68-81`). Không có validator cho `startDate` và `coverImageUrl` (`Tripory.Application/UseCases/V1/Itineraries/Validators/UpdateItineraryMetadataCommandValidator.cs:10-19`).
- Entity chỉ có một cột ảnh bìa `CoverImageUrl` (`Itinerary.cs:15`, giới hạn 500 ký tự ở `Tripory.Persistence/Configurations/ItineraryConfiguration.cs:30`), không có điểm đến, không có sở thích.

**Quyết định đã khóa mà tài liệu này đáp ứng:** D-52 (user tự sửa BE), D-53 (danh mục điểm đến là hằng số kèm validator, slug có tiền tố quốc gia), D-54 (`PUT` thiếu điểm đến/sở thích thì giữ nguyên), D-55 (sở thích là `text[]`, mã cố định, không trùng, tối đa 7), D-56 (tạo đủ Ngày 1..N, 1 đến 30), D-57 (tài liệu chỉ đặc tả hợp đồng, có 5W1H, không code, không ca kiểm thử), D-58 (BE trước, FE sau), D-79 và D-80 (ảnh mặc định theo điểm đến là ảnh 1 và được chọn), D-92 (đúng 34 đơn vị cấp tỉnh), D-99 (tối đa 5 ảnh bìa, giữ `coverImageUrl` là ảnh đang hiển thị), D-102 (`destinationCode` bắt buộc với lịch trình mới, `null` với dữ liệu cũ), D-103 (thiếu `dayCount` thì mặc định 1), D-104 (URL ảnh cũ không phải `https://` thì bỏ khi migration), D-105 (nguồn ảnh thật, xem Phụ lục C), D-106 (ảnh giữ chỗ, URL cố định theo slug, 404 được chấp nhận).

**Ngoài phạm vi (không làm trong đợt này):**

- Upload ảnh. Ảnh bìa vẫn chỉ nhập bằng URL `https://` (D-81).
- Sửa điểm đến hoặc sở thích sau khi tạo (D-77). `PUT` chỉ giữ nguyên hai trường này.
- ETag hoặc phát hiện ghi chồng giữa hai tab (xem `04-BE-DEPENDENCIES.md` mục 4). Lệnh `PUT` cuối cùng thắng.
- 34 ảnh bìa thật và bản ghi giấy phép (Phụ lục C, thuộc Deferred, D-105 và D-106).
- Trường `interests` trong `ItinerarySummaryDto` (danh sách `/mine`). Phase này không hiển thị sở thích ở thẻ (D-76, D-78).
- Sửa bug đếm `DaysCount`/`WaypointsCount` của `/mine` (`04-BE-DEPENDENCIES.md` mục 1) chỉ được nhắc ở C4 vì hai việc liên quan; bạn có thể làm cùng lúc hoặc để sau.

**Thứ tự làm giữa BE và FE (D-58).** BE trước, FE sau. Plan 04-25 là điểm dừng của bạn: bạn duyệt tài liệu, sửa và deploy `tripory_be`, tự kiểm theo mục 13, rồi gõ `BE xong`. Sau đó mới chạy `/gsd-execute-phase 4` để sửa FE. FE mới được thiết kế chịu được BE cũ lẫn BE mới (trường mới là tùy chọn), nhưng form tạo 4 khối chỉ chạy đúng khi BE đã theo hợp đồng này.

**Quy ước đọc.** Tên trường JSON viết camelCase, đúng cách ASP.NET Core mặc định tuần tự hóa. Mã lỗi là chuỗi trong trường `errorCode` của phong bì `ApiResponse` (`Tripory.API/Common/Responses/ApiResponse.cs:3-9`: `status`, `data`, `message`, `errorCode`, `timestamp`). "Đề xuất" nghĩa là bạn có thể đổi, nhưng đổi thì phải ghi lại ở mục 14 để FE theo.

## 2. Tóm tắt thay đổi

| Mã | Thay đổi | Quyết định | Chi tiết |
|----|----------|------------|----------|
| C1 | Danh mục điểm đến: 34 slug và phép kiểm thuộc danh mục | D-53, D-92 | mục 3, mục 4 |
| C2 | Danh mục sở thích: 7 mã theo thứ tự | D-55, D-70 | mục 3, mục 5 |
| C3 | Mở rộng `POST /itineraries` nhận `title`, `destinationCode`, `dayCount`, `startDate`, `interests` | D-56, D-96, D-102, D-103 | mục 3, mục 6 |
| C4 | Tạo đủ bản ghi Ngày 1..N trong một lần lưu | D-56 | mục 3 |
| C5 | Ghi ảnh mặc định theo slug làm ảnh 1 và chọn nó lúc tạo | D-79, D-80, D-106 | mục 3 |
| C6 | Danh sách ảnh bìa tối đa 5 (cột mảng mới) và giữ cột cũ là ảnh đang hiển thị | D-99 | mục 3, mục 7 |
| C7 | `PUT /itineraries/{id}`: giữ nguyên trường thiếu, thêm `coverImages` và `selectedCoverIndex`, nhánh dự phòng `coverImageUrl` | D-54, D-87, D-99 | mục 3, mục 7 |
| C8 | Trường mới của `ItineraryDetailDto` và `ItinerarySummaryDto` | D-99, D-78 | mục 3, mục 8 |
| C9 | 14 mã lỗi và yêu cầu `WithErrorCode` cho mọi rule | D-57 | mục 3, mục 9 |
| C10 | Migration: ba cột mới và chuyển dữ liệu ảnh bìa cũ | D-99, D-104 | mục 3, mục 10 |
| C11 | Cấu hình `DestinationCatalog:CoverImageBaseUrl` | D-79, D-80, D-106 | mục 3, mục 11 |
| C12 | Cập nhật `API_ENDPOINTS.md` | D-57 | mục 3, mục 12 |

**Thứ tự làm đề xuất cho người sửa BE** (mỗi bước dựa vào bước trước):

1. C1 và C2: hằng số danh mục (không phụ thuộc gì).
2. C11: cấu hình và kiểm lúc khởi động, để C5 có gốc URL.
3. C6 (phần entity và cấu hình ánh xạ cột) cùng C10: sinh migration, chạy thử trên DB phát triển trước, rồi mới lên DB thật.
4. C9: mã lỗi và validator (chưa gắn vào endpoint nào cũng được).
5. C3, C4, C5: `POST` mới.
6. C7: `PUT` mới.
7. C8: DTO (có thể làm cùng bước 5 vì response của `POST` đã dùng DTO mới).
8. C12: cập nhật tài liệu.
9. Sao lưu DB thật, chạy migration, đặt cấu hình, deploy, rồi tự kiểm bằng danh sách ở mục 13.

## 3. Chi tiết từng thay đổi (5W1H)

### C1 Danh mục điểm đến (34 slug)

- **What**: Một danh mục cố định gồm đúng 34 mã `destinationCode` (slug dạng `vn-...`, bảng ở mục 4) và một phép kiểm "mã này có thuộc danh mục không". BE chỉ cần slug để kiểm và để ghép URL ảnh; tên hiển thị, alias tìm kiếm và hạng phổ biến do FE giữ.
- **Why**: D-53 chọn hằng số kèm validator và slug có tiền tố quốc gia để sau này mở rộng ra nước khác mà không đổi cấu trúc; không dùng mã hành chính làm id vì mã đó chỉ để tham chiếu. D-92 yêu cầu đúng 34 đơn vị cấp tỉnh sau sắp xếp 2025.
- **Who**: Tầng Domain giữ hằng số (Domain là C# thuần theo `AGENTS.md` mục 4). Tầng Application dùng nó trong validator của `POST` và `PUT`. FE giữ một bản sao tĩnh của cùng 34 slug, vì vậy hai bên phải khớp từng ký tự.
- **When**: Làm đầu tiên, trước C3 và C7, vì hai endpoint đó dùng phép kiểm này.
- **Where**: Tạo file hằng số mới trong `Tripory.Domain` (Domain hiện chỉ có các thư mục `Abstractions`, `Entities`, `Enums`, `Errors`, `Exceptions`, `Repositories`, `ValueObjects`; thư mục mới, ví dụ `Catalogs`, là hợp lý). Phép kiểm được gọi từ `Tripory.Application/UseCases/V1/Itineraries/Validators/CreateQuickDraftItineraryCommandValidator.cs` và `UpdateItineraryMetadataCommandValidator.cs`.
- **How**: So khớp chính xác và phân biệt hoa thường, không tự `trim`, không tự đổi hoa thường hộ: `VN-DA-NANG` hay ` vn-da-nang` đều là mã lạ (`Itinerary.DestinationUnknown`). Slug là bất biến sau khi đã có dữ liệu, vì đổi slug làm gãy URL ảnh và dữ liệu đã lưu. Danh sách đầy đủ ở mục 4.

### C2 Danh mục sở thích (7 mã)

- **What**: Một danh mục cố định gồm 7 mã sở thích theo thứ tự ở mục 5 và phép kiểm thuộc danh mục.
- **Why**: D-55 lưu sở thích dạng mã cố định để đổi nhãn tiếng Việt ở FE mà không đụng dữ liệu; D-70 chốt 7 lựa chọn và thứ tự.
- **Who**: Giống C1: Domain giữ hằng số, Application dùng trong validator, FE giữ bản sao tĩnh để hiện nhãn tiếng Việt.
- **When**: Làm cùng C1, trước C3 và C7.
- **Where**: Cùng thư mục hằng số mới của C1; validator gọi giống C1.
- **How**: Mã không trùng nhau, tối đa 7 phần tử (bằng số lựa chọn), so khớp chính xác như C1. Lưu thành cột `text[]` (C10). BE giữ nguyên thứ tự FE gửi lên và không tự sắp xếp.

### C3 Mở rộng POST /itineraries

- **What**: `POST /api/v1/itineraries` nhận thêm `destinationCode`, `dayCount`, `startDate`, `interests` bên cạnh `title`. Hợp đồng đầy đủ ở mục 6.
- **Why**: D-56 và D-96: form tạo gửi một request duy nhất ở cuối và BE tạo đủ ngày. D-102: `destinationCode` bắt buộc ở BE với lịch trình tạo mới, còn lịch trình cũ vẫn để `null`. D-103: thiếu `dayCount` thì BE mặc định 1 để FE cũ đang chạy trong khoảng giữa hai lần deploy không bị đổi hành vi.
- **Who**: Contracts (request mới), Application (command, validator, handler), Domain (hàm tạo aggregate), API (controller chuyển trường mới vào command). FE là bên gọi duy nhất, qua BFF.
- **When**: Sau C1, C2, C6, C9, C11. Phải xong trước khi FE chạy (plan 04-26 trở đi).
- **Where**: `Tripory.API/Contracts/V1/Itineraries/Requests/CreateItineraryRequest.cs:3`, `Tripory.API/Controllers/V1/ItinerariesController.cs:23-39` (dòng 31 hiện chỉ truyền `request.Title`), `Tripory.Application/UseCases/V1/Itineraries/Commands/CreateQuickDraftItineraryCommand.cs:6`, `Validators/CreateQuickDraftItineraryCommandValidator.cs:10-13`, `Handlers/CreateQuickDraftItineraryCommandHandler.cs:32-50`, `Tripory.Domain/Entities/Itinerary.cs:48-66`.
- **How**: `destinationCode` BẮT BUỘC với lịch trình tạo mới: thiếu, `null`, rỗng hoặc chỉ có khoảng trắng thì trả `Itinerary.DestinationRequired` (D-102); có giá trị nhưng ngoài danh mục thì trả `Itinerary.DestinationUnknown`. `dayCount` thiếu hoặc `null` thì mặc định 1 (D-103); có giá trị thì phải từ 1 đến 30, nếu không trả `Itinerary.DayCountOutOfRange`. `startDate` tùy chọn và không chặn ngày quá khứ. `interests` tùy chọn; thiếu hoặc `null` coi như rỗng. Thứ tự rule trong validator phải theo thứ tự khối của form (điểm đến, tên, số ngày/ngày, sở thích), vì `ValidationPipelineBehavior` chỉ trả lỗi đầu tiên và FE dùng lỗi đó để chọn khối cần cuộn tới.

### C4 Tạo đủ bản ghi Ngày 1..N

- **What**: Khi tạo, aggregate `Itinerary` có sẵn đủ `dayCount` bản ghi ngày, đánh số 1..N liên tục, tất cả lưu trong cùng một lần `SaveChanges`.
- **Why**: D-56: sau khi tạo, FE chuyển thẳng vào editor và hiện đủ các tab ngày; nếu BE chỉ tạo Ngày 1 thì editor phải tự tạo N-1 ngày bằng nhiều request.
- **Who**: Domain tạo các ngày (thay đổi hàm tạo aggregate), Application gọi hàm đó. FE đọc `days[]` và `daysCount`.
- **When**: Làm cùng C3. Việc sửa đếm `DaysCount` của `/mine` (xem Where) là liên quan nhưng độc lập.
- **Where**: `Tripory.Domain/Entities/Itinerary.cs:48-66` hiện gọi `GetOrCreateDay(1)` ở dòng 64; `GetOrCreateDay` là `private` (`Itinerary.cs:230-239`) và tạo ngày với `Guid.NewGuid()`. Bảng ngày có khóa duy nhất `(ItineraryId, DayNumber)` và `Id` không tự sinh (`Tripory.Persistence/Configurations/ItineraryDayConfiguration.cs:14,24`). `GET /itineraries/mine` hiện trả `DaysCount` luôn bằng 0 vì truy vấn không nạp ngày (`Tripory.Persistence/Repositories/ItineraryRepository.cs:26-38`, `ItineraryExtensions.cs:43`).
- **How**: Đề xuất một hàm tạo aggregate mới nhận số ngày (thay cho hoặc bổ sung bên cạnh `CreateQuickDraft`), lặp từ 1 đến N gọi cùng cơ chế tạo ngày đang dùng cho Ngày 1, rồi `AddAsync` một lần như hiện nay (`CreateQuickDraftItineraryCommandHandler.cs:46-47`). Mọi ngày được thêm vào aggregate mới trước lần lưu đầu tiên nên EF coi chúng là bản ghi mới (cùng cách Ngày 1 đang chạy), không phải thêm ngày vào aggregate đã theo dõi. Để thẻ trong danh sách hiện đúng số ngày, truy vấn `/mine` cần nạp ngày hoặc đếm bằng truy vấn con (`04-BE-DEPENDENCIES.md` mục 1); nếu chưa sửa, FE vẫn chạy và chỉ ẩn chỉ số này.

### C5 Ảnh mặc định lúc tạo

- **What**: Lúc tạo, BE ghi URL `{CoverImageBaseUrl}{slug}.jpg` làm ảnh 1 trong danh sách ảnh bìa và đặt nó làm ảnh đang hiển thị; `coverImageUrl` bằng chính URL đó.
- **Why**: D-79 và D-80: ảnh mặc định lấy theo điểm đến, là ảnh 1, được chọn, tính vào giới hạn 5 và xóa hoặc thay được như ảnh thường. D-106: Phase 4 chưa có ảnh thật, BE chỉ ghi URL cố định theo slug.
- **Who**: Handler tạo (Application) ghép URL từ cấu hình C11; Domain nhận danh sách ảnh và chỉ số chọn qua cùng phương thức bất biến của C6.
- **When**: Làm cùng C3, sau C6 và C11.
- **Where**: `CreateQuickDraftItineraryCommandHandler.cs:32-50`; gốc URL lấy từ cấu hình ở mục 11.
- **How**: Ghép gốc URL (kết thúc bằng `/`) với slug và đuôi `.jpg`. Dùng `.jpg` vì URL này sẽ là ảnh Open Graph ở Phase 5 và nhiều nền tảng chia sẻ không hiện ảnh `.webp` ổn định (ví dụ `.webp` trong D-106 chỉ là minh họa). File ảnh có thể chưa tồn tại: BE vẫn ghi URL, link trả 404 là chấp nhận được, FE tự rơi về nền dự phòng (D-106). Kết quả mong đợi: `coverImages` có đúng 1 phần tử, `selectedCoverIndex` bằng 0.

### C6 Danh sách ảnh bìa tối đa 5

- **What**: Thêm cột `CoverImageUrls` kiểu mảng chuỗi (`text[]`, mặc định rỗng). Giữ nguyên cột `CoverImageUrl` với nghĩa "ảnh đang hiển thị". Bất biến: danh sách rỗng khi và chỉ khi `CoverImageUrl` là `null`; danh sách không rỗng thì `CoverImageUrl` là đúng một phần tử của danh sách.
- **Why**: D-99: lưu tối đa 5 ảnh, chọn một ảnh hiển thị, giữ `coverImageUrl` để code cũ, thẻ và Phase 5 (Open Graph) vẫn đọc thẳng một cột, migration không mất dữ liệu và dễ quay lui. Vì URL trong danh sách không trùng nhau nên vị trí đang chọn suy ra duy nhất, không cần cột chỉ số.
- **Who**: Domain giữ bất biến trong một phương thức duy nhất thay thế cả hai giá trị; Persistence ánh xạ cột; Application kiểm định dạng URL trong validator.
- **When**: Làm sau C1/C2, cùng C10 (migration), trước C3 và C7.
- **Where**: Thuộc tính mới trong `Tripory.Domain/Entities/Itinerary.cs` (cạnh dòng 15); ánh xạ trong `Tripory.Persistence/Configurations/ItineraryConfiguration.cs` (cạnh dòng 30). Trong BE chưa có cột mảng, `jsonb` hay owned collection nào để theo (tìm `OwnsMany|ToJson|jsonb|PrimitiveCollection` không có kết quả); Npgsql ánh xạ `List<string>` sang mảng PostgreSQL.
- **How**: Giới hạn 5 phần tử; mỗi URL tuyệt đối, scheme `https`, dài tối đa 500 ký tự, không trùng nhau (so sánh sau khi `trim`). Luật định dạng nằm ở validator, còn bất biến "ảnh chọn thuộc danh sách" nằm trong phương thức của aggregate. Khi cập nhật, thay cả danh sách bằng bản mới thay vì sửa tại chỗ để EF chắc chắn ghi thay đổi. Cột `text[]` không có giới hạn độ dài ở DB, nên validator là chốt chặn duy nhất cho 500 ký tự của từng URL (đồng thời giải quyết `04-BE-DEPENDENCIES.md` mục 2 cho trường ảnh bìa).

### C7 PUT /itineraries/{id}

- **What**: Request `PUT` thêm `coverImages` (danh sách URL) và `selectedCoverIndex` (chỉ số ảnh đang chọn). `destinationCode` và `interests` nếu thiếu hoặc `null` thì giữ nguyên giá trị đã lưu. `coverImageUrl` cũ chỉ còn được đọc khi `coverImages` là `null` (nhánh dự phòng cho FE cũ, đánh dấu deprecated). Bảng đầy đủ ở mục 7.
- **Why**: D-54: sửa "Thông tin chuyến đi" không được xóa điểm đến hay sở thích. D-87 và D-99: FE tự lưu và mỗi lần gửi cả danh sách ảnh cùng chỉ số chọn trong một lệnh `PUT`, nên "ảnh chọn thuộc danh sách" luôn nhất quán (so với việc làm ba endpoint thêm, xóa, chọn riêng, vốn không giải được ghi chồng giữa hai tab).
- **Who**: Contracts, Application (command, validator, handler), Domain (phương thức cập nhật metadata). FE gửi payload dựng từ trạng thái form mới nhất.
- **When**: Sau C6 và C9. Nhánh dự phòng `coverImageUrl` được giữ cho tới khi FE mới đã deploy, sau đó có thể xóa.
- **Where**: `UpdateItineraryMetadataRequest.cs:3-8`, `ItinerariesController.cs:78-97` (dòng 90-91 dựng command), `UpdateItineraryMetadataCommand.cs:6-12`, `Validators/UpdateItineraryMetadataCommandValidator.cs:10-19`, `Handlers/UpdateItineraryMetadataCommandHandler.cs:31-53` (dòng 48 gọi `UpdateMetadata`), `Itinerary.cs:68-81`.
- **How**: `title` bắt buộc như hiện nay. `description` và `startDate`: `null` nghĩa là xóa (FE luôn gửi cả hai). `coverImages`: `null` hoặc thiếu thì dùng nhánh dự phòng; `[]` thì xóa hết ảnh; có phần tử thì thay toàn bộ danh sách. Không có cách phân biệt "thiếu khóa" với "gửi `null`" vì BE dùng cấu hình JSON mặc định (tìm `AddJsonOptions|JsonSerializerOptions|UnmappedMemberHandling` không có kết quả), nên với `destinationCode` và `interests`, `null` cũng là giữ nguyên; đợt này chưa có cách xóa (D-77).

### C8 Trường mới của DTO

- **What**: `ItineraryDetailDto` thêm `coverImages` (mảng, không bao giờ `null`), `selectedCoverIndex` (số nguyên, `null` khi danh sách rỗng), `destinationCode` (chuỗi hoặc `null`), `interests` (mảng). `ItinerarySummaryDto` thêm `coverImages`, `selectedCoverIndex`, `destinationCode` và KHÔNG có `interests`. Mọi trường cũ giữ nguyên tên và nghĩa.
- **Why**: D-99: danh sách ảnh và ảnh đang chọn phải có ở cả chi tiết lẫn danh sách (thẻ cần chọn ảnh dự phòng theo điểm đến). D-78 chỉ cấm hiện tên điểm đến trên thẻ, không cấm dùng mã. `interests` chưa dùng ở danh sách (D-76).
- **Who**: Application (hai record DTO và hàm ánh xạ). FE đọc các trường này và chịu được khi thiếu.
- **When**: Làm cùng C3, vì response của `POST` đã trả DTO mới.
- **Where**: `Tripory.Application/UseCases/V1/Itineraries/Responses/ItineraryDetailDto.cs:3-16`, `Responses/ItinerarySummaryDto.cs:3-17`, `Extensions/ItineraryExtensions.cs:32-47` (`ToSummaryDto`) và `:49-65` (`ToDetailDto`).
- **How**: Các giá trị lấy từ hai cột (`CoverImageUrls`, `CoverImageUrl`) và hai cột mới (`DestinationCode`, `Interests`). `selectedCoverIndex` là vị trí của `CoverImageUrl` trong `CoverImageUrls`, hoặc `null` khi danh sách rỗng. Lịch trình cũ chưa có điểm đến thì `destinationCode` là `null`; chưa có sở thích thì `interests` là `[]`. Bảng trường đầy đủ ở mục 8.

### C9 Mã lỗi

- **What**: 14 mã lỗi ở mục 9, và yêu cầu mọi rule trong hai validator đều có mã lỗi tường minh, kể cả các rule hiện có.
- **Why**: FE gắn lỗi vào đúng khối form dựa vào mã. Hiện `ValidationPipelineBehavior` chỉ trả lỗi đầu tiên với mã mặc định của FluentValidation (kiểu `NotEmptyValidator`) và không có tên trường, nên FE không biết lỗi thuộc ô nào.
- **Who**: Application (validator), Domain (nếu thêm hằng lỗi vào `DomainErrors`). FE ánh xạ mã sang khối/ô.
- **When**: Làm trước C3 và C7.
- **Where**: `Tripory.Application/Behaviors/ValidationPipelineBehavior.cs:33-41` (lấy lỗi đầu tiên, mã là `ErrorCode` của FluentValidation hoặc `Validation.Error` nếu rỗng), `Tripory.API/Controllers/ApiController.cs:19-34` (chọn HTTP status theo chuỗi con của mã), `Tripory.Domain/Errors/DomainErrors.cs:35-71` (mẫu đặt tên `Itinerary.PascalCaseReason`, thông điệp tiếng Việt), `Tripory.Domain/ValueObjects/ItineraryTitle.cs:21,25` và `ItineraryDescription.cs:25` (đã có mã `ItineraryTitle.Empty`, `ItineraryTitle.TooLong`, `ItineraryDescription.TooLong`), `CreateQuickDraftItineraryCommandValidator.cs:10-13` và `UpdateItineraryMetadataCommandValidator.cs:13-19` (hiện chưa có mã nào).
- **How**: Mọi rule của hai validator có `WithErrorCode`; gồm cả rule title (đổi sang `ItineraryTitle.Empty`/`ItineraryTitle.TooLong`, khớp mã value object mà FE đã ánh xạ) và rule description (`ItineraryDescription.TooLong`). Đo độ dài title và description sau khi `trim`, giống value object (hiện validator đo trước khi `trim`, nên một tiêu đề 100 ký tự kèm khoảng trắng cuối bị validator từ chối dù value object chấp nhận). Trên cùng một trường, dừng ở lỗi đầu tiên để mã trả về là mã của lỗi đúng nhất. Tuyệt đối không đặt mã mới chứa chuỗi con `NotFound`, `Conflict`, `AlreadyExists`, `Unauthorized` hay `Forbidden`, vì `ApiController.HandlerFailure` đổi HTTP status theo chuỗi con (`ApiController.cs:26-33`), ví dụ `Itinerary.CoverImageNotFound` sẽ thành 404. Thông điệp bằng tiếng Việt và không lộ chi tiết nội bộ.

### C10 Migration

- **What**: Một migration thêm ba cột vào bảng `itinerary.itineraries`: `DestinationCode` (`varchar(64)`, cho phép `NULL`), `Interests` (`text[]`, không `NULL`, mặc định mảng rỗng), `CoverImageUrls` (`text[]`, không `NULL`, mặc định mảng rỗng); rồi chuyển `CoverImageUrl` cũ hợp lệ thành phần tử duy nhất của `CoverImageUrls`.
- **Why**: D-99 chuyển dữ liệu `CoverImageUrl` cũ thành ảnh 1 và được chọn. D-104: URL cũ không phải `https://` thì bỏ, vì BE chưa từng kiểm trường này, và nếu giữ một URL `http://` trong danh sách thì validator mới sẽ từ chối mọi lần tự lưu sau đó của lịch trình ấy, khiến người dùng không sửa nổi tiêu đề.
- **Who**: Bạn (người sửa BE) chạy migration trên DB thật, sau khi tự sao lưu. Persistence chứa file migration.
- **When**: Sau khi C6 xong ở mức entity, trước khi deploy bản BE mới. Chạy thử trên DB phát triển trước.
- **Where**: `Tripory.Persistence/Migrations/` (đang có `20260918103036_Initial_Identity_Tables`, `20260922094520_Add_Chat_Module_Tables`, `20261005085513_Add_Itinerary_PostGIS_Tables` và `ApplicationDbContextModelSnapshot.cs`). Cột hiện dùng tên PascalCase (`20261005085513_Add_Itinerary_PostGIS_Tables.cs:19-28`, ví dụ `CoverImageUrl character varying(500)`), nên ba cột mới cũng PascalCase. `Tripory.Persistence/DependencyInjection.cs:25` đặt `MigrationsAssembly`. BE không tự chạy migration lúc khởi động (tìm `Migrate(` và `MigrateAsync` không có kết quả), nên bạn chạy bằng tay. EF Core 10.0.11 và Npgsql 10.0.3 (`Tripory.Persistence.csproj:10,15`). Tên migration gợi ý: `Add_Itinerary_Destination_Interests_CoverImages`.
- **How**: Các bước đánh số ở mục 10, gồm sao lưu, đếm trước số dòng bị bỏ, chuyển dữ liệu (kể cả dòng đã xóa mềm), không đổi `StartDate`, không đụng bảng ngày, và cách quay lui bằng bản sao lưu. Tạo migration bằng công cụ EF để `ApplicationDbContextModelSnapshot.cs` cập nhật đồng bộ; phần chuyển dữ liệu phải thêm tay vào migration (bằng lệnh SQL thô), vì EF không tự sinh.

### C11 Cấu hình CoverImageBaseUrl

- **What**: Khóa cấu hình `DestinationCatalog:CoverImageBaseUrl`. Giá trị cho MỌI môi trường, kể cả Development, là `https://triporyv1.vercel.app/destinations/`.
- **Why**: D-79 và D-106: BE ghép URL ảnh mặc định từ gốc cấu hình thay vì viết cứng trong code, để đổi domain chỉ cần đổi cấu hình. Ảnh nằm trong `apps/web/public/destinations/` của FE và được phục vụ bởi bản deploy production nên mọi môi trường dùng chung được.
- **Who**: Bạn (cấu hình từng môi trường); Application/Infrastructure đọc cấu hình. FE giữ một hằng số cùng giá trị (`DESTINATION_IMAGE_BASE_URL` trong `apps/web/src/composition/destination-catalog.ts`, do plan FE tạo); hai nơi phải khớp.
- **When**: Làm trước C5. Đặt giá trị ở mọi môi trường trước khi deploy.
- **Where**: `Tripory.API/appsettings.json` và `appsettings.Development.json` (hiện cả hai chưa có khóa này; Development hiện có `AuthRateLimitOptions`). Tiền lệ đọc cấu hình có kiểm lúc khởi động: `Tripory.Infrastructure/DependencyInjection.cs:23-29` (`AddOptions` + `Bind` + `Validate` + `ValidateOnStart` cho `JwtOptions`) và `Tripory.API/RateLimiting/RateLimitingExtensions.cs:27-31`.
- **How**: Kiểm lúc khởi động: phải là URL tuyệt đối, scheme `https`, và kết thúc bằng `/`; sai thì BE không khởi động. Cảnh báo: nếu môi trường Development đặt `http://localhost:3000/destinations/` thì ảnh 1 của lịch trình thử là URL `http`, và lần tự lưu kế tiếp (FE gửi lại cả danh sách) bị chính validator `https` của BE từ chối, người dùng không lưu được tiêu đề. Thủ tục khi đổi domain sau này: thay tiền tố URL trên cột danh sách ảnh và cột ảnh đang hiển thị trong DB, rồi đổi cấu hình và hằng số FE.

### C12 Cập nhật API_ENDPOINTS.md

- **What**: Sửa `tripory_be/API_ENDPOINTS.md` để phản ánh hợp đồng mới: dòng 97 (POST), dòng 100 (PUT) và ghi chú ở dòng 109.
- **Why**: Tài liệu endpoint là nguồn tra cứu của mọi người dùng API; để lệch với code sẽ gây hiểu sai.
- **Who**: Bạn khi sửa BE.
- **When**: Sau khi C3 và C7 xong.
- **Where**: `API_ENDPOINTS.md:97` (hiện `CreateItineraryRequest { title }`), `:100` (hiện `UpdateItineraryMetadataRequest { title, description?, startDate?, coverImageUrl? }`), `:109` (ghi chú ảnh bìa là URL string, chưa có upload).
- **How**: Chi tiết nội dung ở mục 12.

## 4. Danh mục điểm đến

34 đơn vị cấp tỉnh sau sắp xếp 2025: 6 thành phố trực thuộc trung ương và 28 tỉnh. Cột "Mã QĐ 19" là mã số theo Quyết định 19/2025/QĐ-TTg, CHỈ để tham chiếu, không dùng làm id. `destinationCode` là cột "Slug".

Quy tắc: so khớp chính xác và phân biệt hoa thường (chữ thường); slug bất biến; URL ảnh mặc định là `{CoverImageBaseUrl}{slug}.jpg`, ví dụ `https://triporyv1.vercel.app/destinations/vn-da-nang.jpg`. Slug được tạo từ tên không dấu, chữ thường, nối bằng gạch ngang, và chữ `đ` thành `d`. Slug `vn-ho-chi-minh` không kèm "tp" để slug không đổi nếu tên hiển thị đổi.

| Mã QĐ 19 | Tên hiển thị | Loại | Slug |
|----------|--------------|------|------|
| 01 | Hà Nội | Thành phố | `vn-ha-noi` |
| 04 | Cao Bằng | Tỉnh | `vn-cao-bang` |
| 08 | Tuyên Quang | Tỉnh | `vn-tuyen-quang` |
| 11 | Điện Biên | Tỉnh | `vn-dien-bien` |
| 12 | Lai Châu | Tỉnh | `vn-lai-chau` |
| 14 | Sơn La | Tỉnh | `vn-son-la` |
| 15 | Lào Cai | Tỉnh | `vn-lao-cai` |
| 19 | Thái Nguyên | Tỉnh | `vn-thai-nguyen` |
| 20 | Lạng Sơn | Tỉnh | `vn-lang-son` |
| 22 | Quảng Ninh | Tỉnh | `vn-quang-ninh` |
| 24 | Bắc Ninh | Tỉnh | `vn-bac-ninh` |
| 25 | Phú Thọ | Tỉnh | `vn-phu-tho` |
| 31 | Hải Phòng | Thành phố | `vn-hai-phong` |
| 33 | Hưng Yên | Tỉnh | `vn-hung-yen` |
| 37 | Ninh Bình | Tỉnh | `vn-ninh-binh` |
| 38 | Thanh Hóa | Tỉnh | `vn-thanh-hoa` |
| 40 | Nghệ An | Tỉnh | `vn-nghe-an` |
| 42 | Hà Tĩnh | Tỉnh | `vn-ha-tinh` |
| 44 | Quảng Trị | Tỉnh | `vn-quang-tri` |
| 46 | Huế | Thành phố | `vn-hue` |
| 48 | Đà Nẵng | Thành phố | `vn-da-nang` |
| 51 | Quảng Ngãi | Tỉnh | `vn-quang-ngai` |
| 52 | Gia Lai | Tỉnh | `vn-gia-lai` |
| 56 | Khánh Hòa | Tỉnh | `vn-khanh-hoa` |
| 66 | Đắk Lắk | Tỉnh | `vn-dak-lak` |
| 68 | Lâm Đồng | Tỉnh | `vn-lam-dong` |
| 75 | Đồng Nai | Tỉnh | `vn-dong-nai` |
| 79 | TP. Hồ Chí Minh | Thành phố | `vn-ho-chi-minh` |
| 80 | Tây Ninh | Tỉnh | `vn-tay-ninh` |
| 82 | Đồng Tháp | Tỉnh | `vn-dong-thap` |
| 86 | Vĩnh Long | Tỉnh | `vn-vinh-long` |
| 91 | An Giang | Tỉnh | `vn-an-giang` |
| 92 | Cần Thơ | Thành phố | `vn-can-tho` |
| 96 | Cà Mau | Tỉnh | `vn-ca-mau` |

**Kiểm đếm:** 34 đơn vị = 6 thành phố (Hà Nội, Hải Phòng, Huế, Đà Nẵng, TP. Hồ Chí Minh, Cần Thơ) + 28 tỉnh.

**Nguồn và mức tin cậy.** Danh mục và mã số lấy từ Quyết định 19/2025/QĐ-TTg (hiệu lực 01/07/2025), qua bảng 34 đơn vị đăng lại trên Báo Chính phủ (`baochinhphu.vn`); tên tỉnh cũ gộp vào lấy từ Đề án sắp xếp của Chính phủ (Báo Chính phủ bản tiếng Anh, 15/04/2025). Chưa tải được nguyên văn Nghị quyết 202/2025/QH15, nên bạn cần đối chiếu bảng này với văn bản gốc ở checkpoint 04-25 (D-92); bản toàn văn được dẫn tại `xaydungchinhsach.chinhphu.vn`. Slug là quyết định thiết kế, không phải dữ liệu chính thức.

## 5. Danh mục sở thích

7 mã theo đúng thứ tự D-70. Mã là chuỗi chữ thường nối bằng gạch ngang; nhãn tiếng Việt do FE giữ.

| Thứ tự | Nhãn hiển thị (FE) | Mã |
|--------|--------------------|----|
| 1 | Lịch sử & Văn hóa | `history-culture` |
| 2 | Thiên nhiên | `nature` |
| 3 | Mua sắm | `shopping` |
| 4 | Ẩm thực & Đồ uống | `food-drink` |
| 5 | Giải trí | `entertainment` |
| 6 | Sức khỏe | `wellness` |
| 7 | Khác | `other` |

Hai mã đầu (`history-culture`, `nature`) lấy từ ví dụ trong D-55; năm mã sau là đề xuất để bạn chốt. Mã cuối cùng sau checkpoint 04-25 là nguồn sự thật của FE: nếu bạn đổi mã, hãy sửa bảng này và ghi ở mục 14.

## Phụ lục A

## Phụ lục B

## Phụ lục C
