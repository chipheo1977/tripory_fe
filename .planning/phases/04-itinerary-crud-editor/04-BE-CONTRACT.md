# Phase 4: Hợp đồng BE cho form tạo lịch trình, nhiều ảnh bìa và tự lưu

**Ngày viết:** 2026-11-03 (phần mở lại 2026-10-30)
**Trạng thái (cập nhật 2026-11-05): HOÀN THÀNH theo xác nhận của người dùng.** C1 đến C12 đã làm xong ở `tripory_be` và đã merge vào nhánh `dev` (`origin/dev` tại `5dc4c7b`, chứa commit `bca0577`). Những gì CHƯA được kiểm: BE đã deploy lên môi trường thật, hai migration trên DB thật, và các lần gọi `POST`/`PUT`/`GET` thật (mục 13: 6 đến 11); ghi chú chi tiết ở cuối mục 13.
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

| Mã | Thay đổi | Quyết định | Chi tiết | Trạng thái |
|----|----------|------------|----------|----------|
| C1 | Danh mục điểm đến: 34 slug và phép kiểm thuộc danh mục | D-53, D-92 | mục 3, mục 4 | Xong |
| C2 | Danh mục sở thích: 7 mã theo thứ tự | D-55, D-70 | mục 3, mục 5 | Xong |
| C3 | Mở rộng `POST /itineraries` nhận `title`, `destinationCode`, `dayCount`, `startDate`, `interests` | D-56, D-96, D-102, D-103 | mục 3, mục 6 | Xong |
| C4 | Tạo đủ bản ghi Ngày 1..N trong một lần lưu | D-56 | mục 3 | Xong |
| C5 | Ghi ảnh mặc định theo slug làm ảnh 1 và chọn nó lúc tạo | D-79, D-80, D-106 | mục 3 | Xong |
| C6 | Danh sách ảnh bìa tối đa 5 (cột mảng mới) và giữ cột cũ là ảnh đang hiển thị | D-99 | mục 3, mục 7 | Xong |
| C7 | `PUT /itineraries/{id}`: giữ nguyên trường thiếu, thêm `coverImages` và `selectedCoverIndex`, bỏ `coverImageUrl` | D-54, D-87, D-99 | mục 3, mục 7 | Xong |
| C8 | Trường mới của `ItineraryDetailDto` và `ItinerarySummaryDto` | D-99, D-78 | mục 3, mục 8 | Xong |
| C9 | 14 mã lỗi và yêu cầu `WithErrorCode` cho mọi rule | D-57 | mục 3, mục 9 | Xong |
| C10 | Migration: ba cột mới và chuyển dữ liệu ảnh bìa cũ | D-99, D-104 | mục 3, mục 10 | Xong |
| C11 | Cấu hình `DestinationCatalog:CoverImageBaseUrl` | D-79, D-80, D-106 | mục 3, mục 11 | Xong |
| C12 | Cập nhật `API_ENDPOINTS.md` | D-57 | mục 3, mục 12 | Xong |

**Trạng thái làm BE** (cập nhật 2026-11-03, theo review code trong `tripory_be`; "Xong" nghĩa là phần C đó đã có trong code và `Tripory.Domain` biên dịch được, chưa tính nghiệm thu ở mục 13):

- **C1, C2 Xong:** `DestinationCatalog` (34 slug, khớp mục 4) và `InterestCatalog` (7 mã), kiểu `IReadOnlyList<string>` kèm `IsKnown`.
- **C3 Xong:** request, command, controller, validator (điểm đến, tên, số ngày, sở thích) và handler đã có; solution biên dịch được. Chưa kiểm bằng `POST` thật.
- **C4 Xong:** domain tạo Ngày 1..N qua `CreateInitialDays`. Chưa kiểm khi lưu thật (`POST` với `dayCount:3` rồi `GET`).
- **C6 Xong:** domain có `SetCoverImages` và `SelectedCoverIndex`. Ánh xạ EF và migration đã có (C10); `UpdateMetadata` đã đi qua `SetCoverImages` (C7). Chưa kiểm bằng `PUT` thật.
- **C9 Xong:** mọi rule của hai validator có `WithErrorCode` (kể cả `Itinerary.InvalidId` cho `ItineraryId` rỗng ở `PUT`, mã mới ngoài 14 mã của mục 9, FE chưa cần ánh xạ). `title` thiếu hoặc `null` giờ ra `ItineraryTitle.Empty` (`Title` là `string?` ở request và command). Mã của `POST` ở `CreateQuickDraftItineraryCommandValidator`; mã của `PUT` (`ItineraryTitle.*`, `ItineraryDescription.TooLong`, `Itinerary.DestinationUnknown`, sở thích, `TooManyCoverImages`, `CoverImageInvalidUrl`, `CoverImageTooLong`, `CoverImageDuplicated`, `CoverSelectionInvalid`) ở `UpdateItineraryMetadataCommandValidator`. Rule sở thích và ảnh bìa dùng chung qua `ItineraryRuleBuilderExtensions`. Chưa kiểm từng mã bằng request thật.
- **C7 Xong:** `PUT` nhận `destinationCode`, `interests`, `coverImages`, `selectedCoverIndex`; `destinationCode`/`interests` null thì giữ nguyên; `coverImages` null thì giữ nguyên ảnh bìa hiện có. Request không còn `coverImageUrl` và đã bỏ nhánh dự phòng cho FE cũ (quyết định của bạn, xem mục 7): FE cũ đổi ảnh bìa sẽ không được lưu cho tới khi FE mới deploy. Chưa kiểm bằng `PUT` thật.
- **C11 Xong:** khóa `DestinationCatalog:CoverImageBaseUrl` có ở `appsettings.json` và `appsettings.Development.json`; `DestinationCatalogOptions` được kiểm lúc khởi động (URL tuyệt đối, `https`, kết thúc bằng `/`). Chưa thử bằng tay trường hợp cấu hình sai.
- **C5 Xong:** `IDestinationCoverProvider` (Application) và `DestinationCoverProvider` (Infrastructure) ghép `{CoverImageBaseUrl}{slug}.jpg`, mã lạ thì trả `null`; handler truyền ảnh đó vào `CreateQuickDraft`, domain chọn nó làm ảnh 1. Cả solution biên dịch được; chưa kiểm bằng `POST` thật vì còn thiếu migration (C10) và DTO (C8).
- **C10 Xong:** migration `20261103085252_Add_Itinerary_Destination_Interests_CoverImages` thêm ba cột (`DestinationCode`, `Interests`, `CoverImageUrls`) và chuyển ảnh bìa cũ sang danh sách mới; đã chạy trên DB phát triển, bước kiểm sau khi chạy đạt. Dữ liệu thử không có dòng nào có ảnh bìa nên phần chuyển ảnh chưa được thử trên dữ liệu thật. Migration thứ hai `20261104034058_Clean_Itinerary_Cover_Images` (chỉ SQL, không đổi cấu trúc) loại khỏi danh sách các URL mà validator từ chối (có khoảng trắng, không host, quá 500 ký tự...) và chỉnh lại `CoverImageUrl` cho khớp danh sách; đã thử SQL trên một DB tạm với 8 dòng mẫu, đúng như mong đợi, và đã áp dụng lên DB phát triển `tripory_db` (sao lưu mới `C:\Users\OS\Backups\tripory\2026-11-04\tripory_db.dump`, 16 dòng, không dòng nào có ảnh bìa nên chỉ xác nhận không lỗi). Chạy cả hai migration theo thứ tự trên DB thật, sau khi sao lưu. Chưa chạy trên DB thật.
- **C8 Xong:** `ItineraryDetailDto` có `CoverImages`, `SelectedCoverIndex` (`int?`), `DestinationCode`, `Interests`; `ItinerarySummaryDto` có ba trường đầu, không có `Interests`. `ToDetailDto` và `ToSummaryDto` đã ánh xạ từ entity. Solution biên dịch được; chưa kiểm JSON thật qua `GET`.
- **C12 Xong:** `API_ENDPOINTS.md` đã sửa dòng `POST /`, `PUT /{id}` và ghi chú ảnh bìa ở mục 6. Chưa thêm liên kết danh sách mã lỗi vào mục 7 của tài liệu đó (tùy chọn).

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

- **What**: Request `PUT` thêm `coverImages` (danh sách URL) và `selectedCoverIndex` (chỉ số ảnh đang chọn). `destinationCode` và `interests` nếu thiếu hoặc `null` thì giữ nguyên giá trị đã lưu. `coverImageUrl` cũ bị bỏ khỏi request (không còn nhánh dự phòng cho FE cũ). Bảng đầy đủ ở mục 7.
- **Why**: D-54: sửa "Thông tin chuyến đi" không được xóa điểm đến hay sở thích. D-87 và D-99: FE tự lưu và mỗi lần gửi cả danh sách ảnh cùng chỉ số chọn trong một lệnh `PUT`, nên "ảnh chọn thuộc danh sách" luôn nhất quán (so với việc làm ba endpoint thêm, xóa, chọn riêng, vốn không giải được ghi chồng giữa hai tab).
- **Who**: Contracts, Application (command, validator, handler), Domain (phương thức cập nhật metadata). FE gửi payload dựng từ trạng thái form mới nhất.
- **When**: Sau C6 và C9. Nhánh dự phòng `coverImageUrl` đã bị xóa, nên deploy BE và FE mới cùng lúc.
- **Where**: `UpdateItineraryMetadataRequest.cs:3-8`, `ItinerariesController.cs:78-97` (dòng 90-91 dựng command), `UpdateItineraryMetadataCommand.cs:6-12`, `Validators/UpdateItineraryMetadataCommandValidator.cs:10-19`, `Handlers/UpdateItineraryMetadataCommandHandler.cs:31-53` (dòng 48 gọi `UpdateMetadata`), `Itinerary.cs:68-81`.
- **How**: `title` bắt buộc như hiện nay. `description` và `startDate`: `null` nghĩa là xóa (FE luôn gửi cả hai). `coverImages`: `null` hoặc thiếu thì giữ nguyên ảnh bìa hiện có; `[]` thì xóa hết ảnh; có phần tử thì thay toàn bộ danh sách. Không có cách phân biệt "thiếu khóa" với "gửi `null`" vì BE dùng cấu hình JSON mặc định (tìm `AddJsonOptions|JsonSerializerOptions|UnmappedMemberHandling` không có kết quả), nên với `destinationCode` và `interests`, `null` cũng là giữ nguyên; đợt này chưa có cách xóa (D-77).

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

## 6. Hợp đồng POST /itineraries

Đường dẫn: `POST /api/v1/itineraries` (cần đăng nhập). Request ví dụ:

```json
{
  "title": "Chuyến đi Đà Nẵng",
  "destinationCode": "vn-da-nang",
  "dayCount": 3,
  "startDate": "2026-11-12",
  "interests": ["nature", "food-drink"]
}
```

| Trường | Kiểu | Bắt buộc | Luật | Mã lỗi |
|--------|------|----------|------|--------|
| `destinationCode` | chuỗi | Có (D-102) | Thiếu, `null`, rỗng hoặc chỉ khoảng trắng thì lỗi. Có giá trị thì phải thuộc 34 slug ở mục 4 (so khớp chính xác, chữ thường, không tự `trim`). | `Itinerary.DestinationRequired`, `Itinerary.DestinationUnknown` |
| `title` | chuỗi | Có | Độ dài từ 1 đến 100 ký tự sau khi `trim`. | `ItineraryTitle.Empty`, `ItineraryTitle.TooLong` |
| `dayCount` | số nguyên | Không (D-103) | Thiếu hoặc `null` thì mặc định 1. Có giá trị thì từ 1 đến 30. | `Itinerary.DayCountOutOfRange` |
| `startDate` | ngày `yyyy-MM-dd` | Không | Không chặn ngày quá khứ (D-75). Chỉ cần đọc được thành ngày. | Không có mã domain (xem ghi chú dưới bảng) |
| `interests` | mảng chuỗi | Không | Thiếu hoặc `null` thì coi là rỗng. Tối đa 7 phần tử; mỗi phần tử thuộc 7 mã ở mục 5; không trùng. | `Itinerary.TooManyInterests`, `Itinerary.InterestUnknown`, `Itinerary.InterestDuplicated` |

**Thứ tự áp rule** (theo thứ tự khối của form, vì chỉ lỗi đầu tiên được trả về): (1) `destinationCode`: Required rồi Unknown; (2) `title`: Empty rồi TooLong; (3) `dayCount`; (4) `interests`: kiểm số lượng trước, rồi mã lạ, rồi trùng. Thứ tự lỗi trong một validator theo thứ tự khai báo rule là hành vi mặc định của FluentValidation theo hiểu biết có sẵn; chưa xác minh bằng chạy thử, nên hãy thử một request lỗi nhiều chỗ ở mục 13.

**Ghi chú về `startDate`:** nếu client gửi chuỗi không phải ngày hợp lệ, ASP.NET Core có thể trả 400 ngay ở bước đọc request, không qua validator và không có mã domain (hành vi mặc định của `[ApiController]`, `ApiController.cs:8`). FE đã chặn giá trị sai từ trước nên trường hợp này hiếm.

**Hành vi khi thành công:**

- Tạo lịch trình thuộc người dùng đang đăng nhập, `isPublic` là `false`, `description` là `null`, `totalDistanceKm` là 0.
- Tạo đủ bản ghi Ngày 1..`dayCount` (C4), mỗi ngày `subtitle` là `null`.
- Ghi `destinationCode` và `interests` như nhận được (`interests` giữ thứ tự gửi).
- Ghi ảnh mặc định theo slug làm ảnh 1 và chọn nó (C5): `coverImages` là `["https://triporyv1.vercel.app/destinations/vn-da-nang.jpg"]`, `selectedCoverIndex` là 0, `coverImageUrl` bằng đúng URL đó.
- Trả HTTP 201 kèm header `Location` (như hiện nay, `ItinerariesController.cs:35-38`), `data` là `ItineraryDetailDto` mở rộng:

```json
{
  "status": "success",
  "data": {
    "id": "00000000-0000-0000-0000-000000000001",
    "userId": "00000000-0000-0000-0000-0000000000aa",
    "title": "Chuyến đi Đà Nẵng",
    "description": null,
    "coverImageUrl": "https://triporyv1.vercel.app/destinations/vn-da-nang.jpg",
    "coverImages": ["https://triporyv1.vercel.app/destinations/vn-da-nang.jpg"],
    "selectedCoverIndex": 0,
    "destinationCode": "vn-da-nang",
    "interests": ["nature", "food-drink"],
    "startDate": "2026-11-12",
    "isPublic": false,
    "totalDistanceKm": 0,
    "createdAt": "2026-11-03T01:00:00+00:00",
    "updatedAt": "2026-11-03T01:00:00+00:00",
    "days": [
      { "id": "00000000-0000-0000-0000-0000000000d1", "dayNumber": 1, "subtitle": null, "dayDistanceKm": 0 },
      { "id": "00000000-0000-0000-0000-0000000000d2", "dayNumber": 2, "subtitle": null, "dayDistanceKm": 0 },
      { "id": "00000000-0000-0000-0000-0000000000d3", "dayNumber": 3, "subtitle": null, "dayDistanceKm": 0 }
    ],
    "waypoints": []
  },
  "message": "Tạo bản nháp hành trình thành công.",
  "errorCode": null,
  "timestamp": "2026-11-03T01:00:00+00:00"
}
```

**Lỗi ví dụ** (HTTP 400, mã ở mục 9): thiếu `destinationCode` thì `errorCode` là `Itinerary.DestinationRequired` và `message` là "Vui lòng chọn điểm đến.".

## 7. Hợp đồng PUT /itineraries/{id}

Đường dẫn: `PUT /api/v1/itineraries/{id}` (cần đăng nhập, chỉ chủ sở hữu; kiểm quyền và 404/403 giữ nguyên như hiện nay ở `UpdateItineraryMetadataCommandHandler.cs:33-36`). Request ví dụ:

```json
{
  "title": "Chuyến đi Đà Nẵng",
  "description": null,
  "startDate": "2026-11-12",
  "coverImages": [
    "https://triporyv1.vercel.app/destinations/vn-da-nang.jpg",
    "https://img.example/b.jpg"
  ],
  "selectedCoverIndex": 1
}
```

Response thành công giữ nguyên: HTTP 200, `data` là `{}` (`ApiResponse.cs:31-32`). FE đọc lại lịch trình bằng `GET /itineraries/{id}` khi cần.

**Bảng "thiếu / null / có giá trị":**

| Trường | Thiếu hoặc `null` | Có giá trị |
|--------|-------------------|------------|
| `title` | Lỗi `ItineraryTitle.Empty` (bắt buộc như hiện nay). | Ghi, sau `trim`, 1 đến 100 ký tự. |
| `description` | `null` nghĩa là xóa mô tả (FE luôn gửi). | Ghi, sau `trim`, tối đa 1000 ký tự (`ItineraryDescription.TooLong`). Chuỗi chỉ có khoảng trắng coi như xóa (`ItineraryDescription.cs:19-20`). |
| `startDate` | `null` nghĩa là xóa ngày khởi hành (FE luôn gửi). | Ghi. |
| `destinationCode` | GIỮ NGUYÊN giá trị đã lưu (D-54). Lịch trình cũ chưa có điểm đến vẫn để `null`, và `PUT` không báo lỗi vì thiếu nó. | Đợt này FE không gửi. Nếu có gửi thì phải thuộc 34 slug (`Itinerary.DestinationUnknown`, kể cả chuỗi rỗng) rồi ghi đè. |
| `interests` | GIỮ NGUYÊN giá trị đã lưu (D-54). | Đợt này FE không gửi. Nếu có gửi thì kiểm như mục 6 rồi ghi đè; mảng rỗng `[]` nghĩa là xóa hết sở thích. |
| `coverImages` | GIỮ NGUYÊN ảnh bìa hiện có. | `[]` xóa hết ảnh bìa (khác `null` nên phân biệt được); có phần tử thì thay TOÀN BỘ danh sách. |
| `selectedCoverIndex` | Bắt buộc khi `coverImages` không rỗng (thiếu thì `Itinerary.CoverSelectionInvalid`). Phải là `null` khi `coverImages` rỗng. | Nằm trong khoảng từ 0 đến số ảnh trừ 1; ngoài khoảng thì `Itinerary.CoverSelectionInvalid`. Có giá trị khi `coverImages` rỗng cũng là `Itinerary.CoverSelectionInvalid`. |
| `coverImageUrl` (cũ) | Đã xóa khỏi request. | Nếu client cũ vẫn gửi, BE bỏ qua khóa này (cấu hình JSON mặc định không báo lỗi khóa lạ). |

Vì BE dùng cấu hình JSON mặc định nên không phân biệt "thiếu khóa" với "gửi `null`": hai trường hợp đó xử lý giống nhau trong toàn bộ bảng trên. Riêng `coverImages` thì `null` và `[]` khác nhau, đó là chỗ duy nhất cần phân biệt.

**Đã bỏ nhánh dự phòng `coverImageUrl`:** FE đang chạy gửi 4 khóa `title`, `description`, `startDate`, `coverImageUrl`. Khi BE bản mới lên mà FE cũ chưa được thay, người dùng đổi ảnh bìa trên FE cũ sẽ mất thay đổi trong im lặng (BE bỏ qua khóa). Chấp nhận rủi ro này và deploy BE cùng FE mới; thứ tự BE trước, FE sau (D-58) vẫn đúng, nhưng khoảng giữa hai lần deploy nên ngắn.

**Luật danh sách ảnh** (mỗi rule phải có mã lỗi, mục 9):

| Luật | Mã lỗi |
|------|--------|
| Tối đa 5 phần tử | `Itinerary.TooManyCoverImages` |
| Mỗi phần tử không rỗng sau `trim`, là URL tuyệt đối có scheme `https`, có host, không chứa khoảng trắng hay ký tự điều khiển | `Itinerary.CoverImageInvalidUrl` |
| Mỗi phần tử dài tối đa 500 ký tự (sau `trim`) | `Itinerary.CoverImageTooLong` |
| Không trùng nhau sau `trim` (so sánh từng ký tự, phân biệt hoa thường) | `Itinerary.CoverImageDuplicated` |
| `selectedCoverIndex` khớp danh sách (bảng trên) | `Itinerary.CoverSelectionInvalid` |

Thứ tự kiểm: số lượng, rồi từng phần tử theo thứ tự (định dạng, độ dài, trùng), rồi chỉ số chọn. BE `trim` từng URL trước khi lưu, như các trường chữ khác. Sau khi lưu: `CoverImageUrl` là `coverImages[selectedCoverIndex]`, hoặc `null` khi danh sách rỗng (bất biến của C6); `UpdatedAt` được cập nhật.

**Ghi chồng giữa hai tab:** BE không có ETag (`04-BE-DEPENDENCIES.md` mục 4). `PUT` mang ảnh chụp đầy đủ của metadata và ảnh bìa, nên lệnh gửi sau thắng toàn bộ. Đây là hành vi hiện tại của `title` và `description` và được chấp nhận (D-37).

## 8. DTO

Tên trường là camelCase trong JSON. Mọi trường cũ giữ nguyên tên, kiểu và nghĩa (nguồn: `ItineraryDetailDto.cs:3-16`, `ItinerarySummaryDto.cs:3-17`).

**`ItineraryDetailDto`** (trả bởi `POST /itineraries` và `GET /itineraries/{id}`):

| Trường | Kiểu | Nullable | Nguồn dữ liệu | Trạng thái |
|--------|------|----------|---------------|------------|
| `id` | GUID | Không | `Id` | Cũ |
| `userId` | GUID | Không | `UserId` | Cũ |
| `title` | chuỗi | Không | `Title` | Cũ |
| `description` | chuỗi | Có | `Description` | Cũ |
| `coverImageUrl` | chuỗi | Có | cột `CoverImageUrl` (ảnh đang hiển thị) | Cũ, đổi nghĩa thành ảnh đang hiển thị |
| `startDate` | ngày | Có | `StartDate` | Cũ |
| `isPublic` | boolean | Không | `IsPublic` | Cũ |
| `totalDistanceKm` | số thực | Không | `TotalDistanceKm` | Cũ |
| `createdAt` | thời điểm | Không | `CreatedAt` | Cũ |
| `updatedAt` | thời điểm | Không | `UpdatedAt` | Cũ |
| `days` | mảng `ItineraryDayDto` | Không | `Days` | Cũ |
| `waypoints` | mảng `WaypointDto` | Không | `Waypoints` | Cũ |
| `coverImages` | mảng chuỗi | Không (rỗng là `[]`) | cột `CoverImageUrls` | MỚI |
| `selectedCoverIndex` | số nguyên | Có (`null` khi `coverImages` rỗng) | vị trí của `CoverImageUrl` trong `CoverImageUrls` | MỚI |
| `destinationCode` | chuỗi | Có (`null` với lịch trình cũ) | cột `DestinationCode` | MỚI |
| `interests` | mảng chuỗi | Không (rỗng là `[]`) | cột `Interests` | MỚI |

**`ItinerarySummaryDto`** (phần tử của `GET /itineraries/mine`):

| Trường | Kiểu | Nullable | Nguồn dữ liệu | Trạng thái |
|--------|------|----------|---------------|------------|
| `id`, `userId`, `title`, `description`, `startDate`, `isPublic`, `totalDistanceKm`, `daysCount`, `waypointsCount`, `createdAt` | như hiện nay | như hiện nay | như hiện nay | Cũ |
| `coverImageUrl` | chuỗi | Có | cột `CoverImageUrl` (ảnh đang hiển thị) | Cũ, đổi nghĩa |
| `coverImages` | mảng chuỗi | Không | cột `CoverImageUrls` | MỚI |
| `selectedCoverIndex` | số nguyên | Có | như trên | MỚI |
| `destinationCode` | chuỗi | Có | cột `DestinationCode` | MỚI |

`ItinerarySummaryDto` KHÔNG có `interests` (D-76, D-78) và vẫn chưa có `updatedAt` (`04-BE-DEPENDENCIES.md` mục 5). `ItineraryDayDto` không đổi (`id`, `dayNumber`, `subtitle`, `dayDistanceKm`).

**Tương thích:** mọi trường mới là thêm vào, FE hiện tại bỏ qua khóa lạ nên không vỡ khi BE lên trước. Ngược lại FE mới chịu được BE cũ thiếu các trường này. Hai điểm FE dựa vào: `coverImages` không bao giờ `null`; `destinationCode` có thể là mã mà FE chưa biết (FE xử lý như không có điểm đến thay vì lỗi trang).

## 9. Mã lỗi

14 mã. Quy tắc đặt: `Aggregate.PascalCaseReason` (như `DomainErrors.cs:35-71`), thông điệp tiếng Việt. HTTP status của cả 14 mã là 400.

| Mã | Endpoint | HTTP | Thông điệp tiếng Việt gợi ý | FE gắn vào khối/ô |
|----|----------|------|------------------------------|-------------------|
| `Itinerary.DestinationRequired` | POST | 400 | Vui lòng chọn điểm đến. | Điểm đến |
| `Itinerary.DestinationUnknown` | POST, PUT | 400 | Điểm đến không hợp lệ. | Điểm đến |
| `ItineraryTitle.Empty` | POST, PUT | 400 | Giữ thông điệp hiện có: "Tiêu đề hành trình không được để trống." | Tên chuyến đi / Tiêu đề |
| `ItineraryTitle.TooLong` | POST, PUT | 400 | Giữ thông điệp hiện có: "Tiêu đề hành trình không được vượt quá 100 ký tự." | Tên chuyến đi / Tiêu đề |
| `Itinerary.DayCountOutOfRange` | POST | 400 | Số ngày phải từ 1 đến 30. | Thời gian |
| `Itinerary.InterestUnknown` | POST, PUT | 400 | Sở thích không hợp lệ. | Sở thích |
| `Itinerary.InterestDuplicated` | POST, PUT | 400 | Sở thích bị trùng. | Sở thích |
| `Itinerary.TooManyInterests` | POST, PUT | 400 | Chọn tối đa 7 sở thích. | Sở thích |
| `ItineraryDescription.TooLong` | PUT | 400 | Giữ thông điệp hiện có: "Mô tả hành trình không được vượt quá 1000 ký tự." | Mô tả |
| `Itinerary.TooManyCoverImages` | PUT | 400 | Tối đa 5 ảnh bìa. | Lưới ảnh bìa |
| `Itinerary.CoverImageInvalidUrl` | PUT | 400 | Link ảnh phải bắt đầu bằng https://. | Lưới ảnh bìa |
| `Itinerary.CoverImageTooLong` | PUT | 400 | Link ảnh tối đa 500 ký tự. | Lưới ảnh bìa |
| `Itinerary.CoverImageDuplicated` | PUT | 400 | Ảnh này đã có trong danh sách. | Lưới ảnh bìa |
| `Itinerary.CoverSelectionInvalid` | PUT | 400 | Ảnh bìa đang chọn không hợp lệ. | Lưới ảnh bìa |

**Ba quy tắc bắt buộc:**

1. Mọi rule trong hai validator đều có `WithErrorCode`. Lý do: `ValidationPipelineBehavior` gom lỗi của mọi validator, chỉ trả LỖI ĐẦU TIÊN, và lấy mã từ `ErrorCode` của FluentValidation; nếu rule không đặt mã thì mã là tên rule mặc định (kiểu `NotEmptyValidator`), hoặc `Validation.Error` khi rỗng (`ValidationPipelineBehavior.cs:33-41`), và phong bì không có tên trường. FE sẽ coi các mã đó là lỗi chung và không gắn được vào ô nào.
2. Tránh chuỗi con đổi HTTP status. `ApiController.HandlerFailure` chọn 404 nếu mã chứa `NotFound`, 409 nếu chứa `Conflict` hoặc `AlreadyExists`, 401 nếu chứa `Unauthorized`, 403 nếu chứa `Forbidden` (`ApiController.cs:26-33`). Kiểm cả 14 mã trên: không mã nào chứa các chuỗi này; mã đặt thêm sau này cũng phải tránh.
3. Thông điệp tiếng Việt ngắn, không lộ chi tiết nội bộ (tên bảng, stack, câu lệnh).

Mã `ItineraryTitle.*` và `ItineraryDescription.TooLong` đã tồn tại ở value object (`ItineraryTitle.cs:21,25`, `ItineraryDescription.cs:25`); việc cần làm là gắn cùng mã vào rule của validator để lỗi do validator trả ra có mã giống lỗi do value object trả ra.

## 10. Migration

Mô tả bằng lời, không kèm lệnh. Chi tiết nền ở C10 (mục 3).

1. **Sao lưu** bảng `itinerary.itineraries` (cả cột lẫn dữ liệu) trước khi làm bất cứ việc gì trên DB thật. Chụp thêm số dòng hiện có làm mốc.
2. **Xem trước dữ liệu sẽ bị bỏ.** Đếm số dòng, kể cả dòng đã xóa mềm, có `CoverImageUrl` khác rỗng nhưng không bắt đầu bằng `https://` (không phân biệt hoa thường ở phần scheme) hoặc dài hơn 500 ký tự. Ghi lại số này (và nếu số nhỏ thì cả danh sách) để bạn quyết định có chấp nhận bỏ không (D-104). Đây là số cần bạn xem trước.
3. **Thêm ba cột:** `DestinationCode` (`varchar(64)`, cho phép `NULL`), `Interests` (`text[]`, không `NULL`, mặc định mảng rỗng), `CoverImageUrls` (`text[]`, không `NULL`, mặc định mảng rỗng). Chỉ mục trên `DestinationCode` (để lọc khi làm khám phá sau này) là tùy chọn, chưa cần.
4. **Chuyển dữ liệu ảnh bìa cũ**, áp dụng cho MỌI dòng kể cả dòng xóa mềm (lệnh SQL thô không đi qua bộ lọc xóa mềm): nếu `CoverImageUrl` khác rỗng, bắt đầu bằng `https://` và dài tối đa 500 ký tự thì đặt `CoverImageUrls` là mảng một phần tử chính URL đó và giữ nguyên `CoverImageUrl` (ảnh 1, được chọn). Ngược lại đặt `CoverImageUrls` là mảng rỗng và đặt `CoverImageUrl` về `NULL`. Dòng cũ để `DestinationCode` là `NULL` và `Interests` là mảng rỗng.
5. **Không đổi** cột `StartDate` và không đụng bảng `itinerary_days`.
6. **Kiểm sau khi chạy:** tổng số dòng bằng mốc ở bước 1; số dòng có `CoverImageUrl` khác `NULL` bằng số dòng có `CoverImageUrls` đúng một phần tử; không dòng nào có `CoverImageUrls` rỗng mà `CoverImageUrl` khác `NULL`.

**Quay lui:** khôi phục từ bản sao lưu ở bước 1. Có thể gỡ ba cột mới, nhưng URL bị bỏ ở bước 4 chỉ lấy lại được từ bản sao lưu. Cột dùng PascalCase theo migration hiện có (`20261005085513_Add_Itinerary_PostGIS_Tables.cs:19-28`). Chưa có tiền lệ cột mảng trong BE; Npgsql ánh xạ `List<string>` sang mảng PostgreSQL và hỗ trợ truy vấn trên mảng từ EF 8 trở đi.

## 11. Cấu hình

Khóa: `DestinationCatalog:CoverImageBaseUrl` (biến môi trường tương ứng theo quy ước .NET: `DestinationCatalog__CoverImageBaseUrl`).

| Môi trường | Giá trị |
|------------|---------|
| Development | `https://triporyv1.vercel.app/destinations/` |
| Staging | `https://triporyv1.vercel.app/destinations/` |
| Production | `https://triporyv1.vercel.app/destinations/` |

Cả ba giống nhau, và đều là https production, vì ảnh là file công khai trên bản deploy production nên mọi môi trường dùng chung được. Đừng đặt `http://localhost...` cho Development (lý do ở C11: ảnh 1 sẽ là URL `http` và bị validator từ chối ở lần tự lưu kế tiếp).

**Kiểm lúc khởi động** (theo cách `JwtOptions` đang làm, `Tripory.Infrastructure/DependencyInjection.cs:23-29`): giá trị phải là URL tuyệt đối, scheme `https`, kết thúc bằng `/`. Sai thì BE không khởi động và báo lý do bằng tiếng Việt, giống thông điệp các `Validate` hiện có.

**Thủ tục khi đổi domain ảnh:** (1) đổi giá trị cấu hình ở mọi môi trường; (2) thay tiền tố URL cũ bằng tiền tố mới trên cột danh sách ảnh và cột ảnh đang hiển thị của các lịch trình đã lưu; (3) đổi hằng số `DESTINATION_IMAGE_BASE_URL` phía FE cho khớp. Nếu bỏ qua bước 2, các bản ghi cũ vẫn chạy chừng nào domain cũ còn trỏ tới ảnh.

## 12. Cập nhật API_ENDPOINTS.md

Sửa `tripory_be/API_ENDPOINTS.md` ở ba chỗ:

- **Dòng 97 (POST):** cột Body/Query đổi thành `CreateItineraryRequest { title, destinationCode, dayCount?, startDate?, interests? }`. Cột Response giữ `ItineraryDetailDto` (201 Created kèm header `Location`), thêm ghi chú rằng DTO có `coverImages`, `selectedCoverIndex`, `destinationCode`, `interests`.
- **Dòng 100 (PUT):** cột Body/Query đổi thành `UpdateItineraryMetadataRequest { title, description?, startDate?, coverImages?, selectedCoverIndex?, destinationCode?, interests? }`, ghi rõ `coverImageUrl` đã bị xóa khỏi request, và `destinationCode`, `interests`, `coverImages` thiếu thì giữ nguyên.
- **Dòng 109 (ghi chú):** thay câu "Ảnh bìa hiện gửi dạng URL string qua `coverImageUrl`" bằng: ảnh bìa là danh sách tối đa 5 URL `https` (mỗi URL tối đa 500 ký tự, không trùng) qua `coverImages` cùng `selectedCoverIndex`; `coverImageUrl` trong response là ảnh đang hiển thị; vẫn chưa có endpoint upload ảnh bìa.

Thêm vào mục 7 của tài liệu (bảng mã lỗi) liên kết tới danh sách 14 mã ở mục 9 của hợp đồng này nếu muốn.

## 13. Điều kiện nghiệm thu thủ công của checkpoint 04-25 (không phải ca kiểm thử)

Quyết định D-57 nói: "Không có ca kiểm thử, không có code." Các dòng dưới đây KHÔNG phải ca kiểm thử để viết thành mã. Chúng chỉ là hành vi mong đợi để bạn tự kiểm bằng tay (ví dụ bằng một lần gọi API thật) sau khi sửa và deploy BE, rồi tích `- [x]` khi đạt. Khi tích đủ 12 dòng, gõ `BE xong` ở plan 04-25 để FE được chạy.

- [ ] 1. Đã đối chiếu 34 đơn vị ở mục 4 với văn bản gốc Nghị quyết 202/2025/QH15 (tên chính thức, số lượng 34, 6 thành phố và 28 tỉnh).
- [ ] 2. Đã duyệt slug ở mục 4, 7 mã sở thích ở mục 5, Phụ lục A (alias) và Phụ lục B (hạng phổ biến và thứ tự nhóm "Tất cả"); mọi thay đổi đã ghi ở mục 14.
- [ ] 3. Đã sao lưu bảng `itinerary.itineraries`, xem số dòng ảnh bìa bị bỏ (mục 10 bước 2) và đã chạy migration thành công; bước kiểm sau khi chạy (mục 10 bước 6) đạt.
- [ ] 4. Đã đặt `DestinationCatalog:CoverImageBaseUrl` ở mọi môi trường (mục 11) và BE khởi động được.
- [ ] 5. Đã deploy BE bản mới.
- [ ] 6. Một lần gọi `POST /itineraries` thật (ví dụ ở mục 6) trả 201, có đủ `dayCount` bản ghi ngày, `destinationCode` đúng, `interests` đúng, và ảnh 1 là `https://triporyv1.vercel.app/destinations/vn-da-nang.jpg` được chọn (`selectedCoverIndex` bằng 0, `coverImageUrl` bằng URL đó).
- [ ] 7. `POST` không có `destinationCode` trả 400 với `errorCode` là `Itinerary.DestinationRequired`.
- [ ] 8. `PUT` không có `destinationCode` và `interests` (chỉ có `title`, `description`, `startDate`, `coverImages`, `selectedCoverIndex`) rồi `GET` lại vẫn thấy điểm đến và sở thích cũ.
- [ ] 9. `PUT` với 6 ảnh `https` trả 400 với `errorCode` là `Itinerary.TooManyCoverImages`.
- [ ] 10. `PUT` với một ảnh `http://` trả 400 với `errorCode` là `Itinerary.CoverImageInvalidUrl`.
- [ ] 11. `PUT` với `coverImages` là `[]` và `selectedCoverIndex` là `null`, rồi `GET` lại thì `coverImageUrl` là `null` và `coverImages` là `[]`.
- [x] 12. Đã xóa lịch trình thử đã tạo ở các bước trên (và không để token hay mật khẩu trong file nào).

**Ghi chú trạng thái nghiệm thu (cập nhật 2026-11-04):**

- Mục 12 được tick vì chưa tạo lịch trình thử nào trong `tripory_db` (vẫn 16 dòng như trước) và khóa JWT, mật khẩu không còn trong file cấu hình đã commit (đặt bằng user-secrets). Mục 12 phải kiểm lại sau khi mục 6 đến 11 được chạy.
- Mục 3: đã làm trên DB phát triển `tripory_db` (sao lưu, chạy cả hai migration, kiểm sau khi chạy đạt). Chưa làm trên DB thật nên chưa tick.
- Mục 4: giá trị `CoverImageBaseUrl` có trong cấu hình và BE khởi động được ở Development; chưa đặt ở các môi trường khác, chưa tick.
- Mục 6 đến 11: hoãn đến khi ghép với FE rồi test cùng lúc (quyết định của bạn); chưa tick.
- Mục 1, 2 (đối chiếu Nghị quyết 202/2025/QH15, duyệt slug và alias) là việc của bạn; mục 5 (deploy) chưa làm. Chưa tick.
- Đã commit `tripory_be` (`bca0577`, nhánh `be/phase_4`).
- 2026-11-05: người dùng xác nhận đã merge `be/phase_4` vào `dev` (`origin/dev` tại `5dc4c7b`, gồm `bca0577` và thêm fix `Token.UnauthorizedAccessToken` ở `5dc4c7b`). Merge vào `dev` không đồng nghĩa BE đã deploy: mục 5 vẫn chưa tick và các mục khác ở trên giữ nguyên trạng thái.

## 14. Quyết định đã chốt và câu hỏi còn lại

**Đã chốt (tài liệu này tuân theo):**

| Quyết định | Nội dung |
|------------|----------|
| D-102 | `destinationCode` bắt buộc ở BE với lịch trình tạo mới (`Itinerary.DestinationRequired`); lịch trình cũ để `null`; `PUT` không bắt buộc. |
| D-103 | Thiếu `dayCount` trong request tạo thì BE mặc định 1. |
| D-104 | Khi migration, `CoverImageUrl` cũ không phải `https://` (hoặc dài hơn 500 ký tự) thì bỏ. |
| D-106 | Ảnh mặc định là URL cố định theo slug, đuôi `.jpg`; 404 được chấp nhận cho tới khi có ảnh thật; không có plan checkpoint ảnh. |
| D-99 | Giữ `coverImageUrl` là ảnh đang hiển thị; thêm danh sách ảnh và chỉ số chọn. |

**Câu hỏi còn lại cho bạn ở checkpoint 04-25:**

1. 7 mã sở thích ở mục 5: năm mã sau (`shopping`, `food-drink`, `entertainment`, `wellness`, `other`) là đề xuất, bạn có đồng ý không?
2. Các alias đánh dấu SUY RA ở Phụ lục A: FE vẫn dùng chúng trừ khi bạn gạch bỏ. Bạn muốn bỏ alias nào?
3. Đuôi ảnh mặc định `.jpg` hay `.webp`? Khuyến nghị `.jpg` vì ảnh này sẽ là ảnh Open Graph ở Phase 5 và nhiều nền tảng chia sẻ không hiện `.webp` ổn định.
4. Gốc URL ảnh `https://triporyv1.vercel.app/destinations/` có đúng domain production bạn muốn khóa vào dữ liệu không? (Đổi domain sau này phải làm thủ tục ở mục 11.)

Sau khi deploy BE, hãy thêm vào cuối mục này một dòng ghi ngày deploy để FE biết bản BE nào đang chạy.

## Phụ lục A: Alias tìm kiếm và tên tỉnh cũ (chỉ FE dùng, để duyệt)

Alias giúp người dùng gõ tên cũ hoặc tên địa danh du lịch và vẫn thấy đúng đơn vị trong danh sách 34 mục (D-59). BE không dùng bảng này. Quy ước trạng thái: **VERIFIED** là có nguồn cho thấy địa danh hoặc tỉnh cũ thuộc đơn vị mới; **SUY RA** là nguồn xác nhận tỉnh cũ đã gộp vào đơn vị mới nhưng việc địa danh thuộc tỉnh cũ là kiến thức chung chưa tra lại, cần bạn duyệt. Tên tỉnh cũ đều VERIFIED theo bảng gộp ở Đề án sắp xếp.

Cách duyệt: tích hoặc gạch ở đầu dòng. Để bỏ một alias, xóa dòng đó hoặc đổi `- [ ]` thành `- [-]`. Alias đánh dấu SUY RA mặc định VẪN được FE dùng trừ khi bạn gạch bỏ ở checkpoint 04-25; plan 04-29 đọc phụ lục này làm nguồn. Alias được so khớp không dấu và không phân biệt hoa thường; dấu gạch nối được coi như khoảng trắng (nên "Bà Rịa – Vũng Tàu" và "Vũng Tàu" là hai alias riêng).

- [ ] Hà Nội: Thủ đô (SUY RA, không phải địa danh, tùy chọn)
- [ ] Tuyên Quang: Hà Giang (VERIFIED, tỉnh cũ)
- [ ] Tuyên Quang: Đồng Văn (SUY RA)
- [ ] Tuyên Quang: Mèo Vạc (SUY RA)
- [ ] Lào Cai: Yên Bái (VERIFIED, tỉnh cũ)
- [ ] Lào Cai: Sa Pa (VERIFIED)
- [ ] Lào Cai: Mù Cang Chải (SUY RA)
- [ ] Thái Nguyên: Bắc Kạn (VERIFIED, tỉnh cũ)
- [ ] Thái Nguyên: Ba Bể (SUY RA)
- [ ] Quảng Ninh: Hạ Long (SUY RA, tỉnh không đổi)
- [ ] Bắc Ninh: Bắc Giang (VERIFIED, tỉnh cũ)
- [ ] Phú Thọ: Vĩnh Phúc (VERIFIED, tỉnh cũ)
- [ ] Phú Thọ: Hòa Bình (VERIFIED, tỉnh cũ)
- [ ] Phú Thọ: Tam Đảo (SUY RA)
- [ ] Phú Thọ: Mai Châu (SUY RA)
- [ ] Hải Phòng: Hải Dương (VERIFIED, tỉnh cũ)
- [ ] Hải Phòng: Cát Bà (SUY RA)
- [ ] Hưng Yên: Thái Bình (VERIFIED, tỉnh cũ)
- [ ] Ninh Bình: Hà Nam (VERIFIED, tỉnh cũ)
- [ ] Ninh Bình: Nam Định (VERIFIED, tỉnh cũ)
- [ ] Ninh Bình: Tràng An (SUY RA)
- [ ] Ninh Bình: Tam Cốc (SUY RA)
- [ ] Quảng Trị: Quảng Bình (VERIFIED, tỉnh cũ)
- [ ] Quảng Trị: Phong Nha (VERIFIED)
- [ ] Quảng Trị: Đồng Hới (VERIFIED, trụ sở tỉnh mới theo Đề án)
- [ ] Huế: Thừa Thiên Huế (SUY RA, tên tỉnh cũ trước khi Huế thành thành phố trực thuộc trung ương)
- [ ] Đà Nẵng: Quảng Nam (VERIFIED, tỉnh cũ)
- [ ] Đà Nẵng: Hội An (VERIFIED)
- [ ] Quảng Ngãi: Kon Tum (VERIFIED, tỉnh cũ)
- [ ] Quảng Ngãi: Măng Đen (SUY RA)
- [ ] Quảng Ngãi: Lý Sơn (SUY RA)
- [ ] Gia Lai: Bình Định (VERIFIED, tỉnh cũ)
- [ ] Gia Lai: Quy Nhơn (VERIFIED, trụ sở tỉnh mới theo Đề án)
- [ ] Gia Lai: Pleiku (SUY RA)
- [ ] Khánh Hòa: Ninh Thuận (VERIFIED, tỉnh cũ)
- [ ] Khánh Hòa: Nha Trang (VERIFIED, trụ sở theo Đề án)
- [ ] Khánh Hòa: Phan Rang (SUY RA)
- [ ] Đắk Lắk: Phú Yên (VERIFIED, tỉnh cũ)
- [ ] Đắk Lắk: Buôn Ma Thuột (VERIFIED, trụ sở theo Đề án)
- [ ] Đắk Lắk: Tuy Hòa (SUY RA)
- [ ] Lâm Đồng: Đắk Nông (VERIFIED, tỉnh cũ)
- [ ] Lâm Đồng: Bình Thuận (VERIFIED, tỉnh cũ)
- [ ] Lâm Đồng: Đà Lạt (VERIFIED, trụ sở theo Đề án)
- [ ] Lâm Đồng: Mũi Né (VERIFIED)
- [ ] Lâm Đồng: Phan Thiết (VERIFIED)
- [ ] Đồng Nai: Bình Phước (VERIFIED, tỉnh cũ)
- [ ] TP. Hồ Chí Minh: Bình Dương (VERIFIED, tỉnh cũ)
- [ ] TP. Hồ Chí Minh: Bà Rịa – Vũng Tàu (VERIFIED, tỉnh cũ)
- [ ] TP. Hồ Chí Minh: Vũng Tàu (VERIFIED)
- [ ] TP. Hồ Chí Minh: Côn Đảo (VERIFIED, đặc khu thuộc TP. Hồ Chí Minh)
- [ ] TP. Hồ Chí Minh: Sài Gòn (SUY RA, tên gọi khác)
- [ ] TP. Hồ Chí Minh: HCM (SUY RA, tên viết tắt)
- [ ] Tây Ninh: Long An (VERIFIED, tỉnh cũ)
- [ ] Đồng Tháp: Tiền Giang (VERIFIED, tỉnh cũ)
- [ ] Đồng Tháp: Mỹ Tho (VERIFIED, trụ sở theo Đề án)
- [ ] Vĩnh Long: Bến Tre (VERIFIED, tỉnh cũ)
- [ ] Vĩnh Long: Trà Vinh (VERIFIED, tỉnh cũ)
- [ ] An Giang: Kiên Giang (VERIFIED, tỉnh cũ)
- [ ] An Giang: Phú Quốc (VERIFIED, đặc khu thuộc An Giang)
- [ ] An Giang: Rạch Giá (VERIFIED, trụ sở theo Đề án)
- [ ] An Giang: Hà Tiên (SUY RA)
- [ ] An Giang: Châu Đốc (SUY RA)
- [ ] Cần Thơ: Sóc Trăng (VERIFIED, tỉnh cũ)
- [ ] Cần Thơ: Hậu Giang (VERIFIED, tỉnh cũ)
- [ ] Cà Mau: Bạc Liêu (VERIFIED, tỉnh cũ)
- [ ] Sơn La: Mộc Châu (SUY RA)
- [ ] Thanh Hóa: Sầm Sơn (SUY RA)

Các đơn vị không có dòng nào ở trên (Cao Bằng, Điện Biên, Lai Châu, Lạng Sơn, Nghệ An, Hà Tĩnh) chỉ tìm được bằng tên của chính đơn vị.

## Phụ lục B: Hạng phổ biến và thứ tự "Tất cả"

**Hạng phổ biến (D-61).** Nhóm "Phổ biến" lấy 8 mục đầu theo hạng; hạng 9 và 10 vẫn dùng để xếp kết quả tìm khi cùng mức khớp. 24 đơn vị còn lại không có hạng và xếp theo chữ cái. Cả 10 tên trùng tên hiển thị ở mục 4.

| Hạng | Tên hiển thị | Slug | Trong nhóm "Phổ biến" |
|------|--------------|------|------------------------|
| 1 | Đà Nẵng | `vn-da-nang` | Có |
| 2 | TP. Hồ Chí Minh | `vn-ho-chi-minh` | Có |
| 3 | Hà Nội | `vn-ha-noi` | Có |
| 4 | Khánh Hòa | `vn-khanh-hoa` | Có |
| 5 | Lâm Đồng | `vn-lam-dong` | Có |
| 6 | Quảng Ninh | `vn-quang-ninh` | Có |
| 7 | An Giang | `vn-an-giang` | Có |
| 8 | Lào Cai | `vn-lao-cai` | Có |
| 9 | Huế | `vn-hue` | Không |
| 10 | Ninh Bình | `vn-ninh-binh` | Không |

**Thứ tự nhóm "Tất cả"** (34 mục, chữ cái tiếng Việt so từng ký tự; TP. Hồ Chí Minh xếp theo "Hồ Chí Minh"):

1. An Giang
2. Bắc Ninh
3. Cà Mau
4. Cao Bằng
5. Cần Thơ
6. Đà Nẵng
7. Đắk Lắk
8. Điện Biên
9. Đồng Nai
10. Đồng Tháp
11. Gia Lai
12. Hà Nội
13. Hà Tĩnh
14. Hải Phòng
15. TP. Hồ Chí Minh
16. Huế
17. Hưng Yên
18. Khánh Hòa
19. Lai Châu
20. Lạng Sơn
21. Lào Cai
22. Lâm Đồng
23. Nghệ An
24. Ninh Bình
25. Phú Thọ
26. Quảng Ngãi
27. Quảng Ninh
28. Quảng Trị
29. Sơn La
30. Tây Ninh
31. Thái Nguyên
32. Thanh Hóa
33. Tuyên Quang
34. Vĩnh Long

Lưu ý: cách sắp này KHÔNG coi "ng", "nh", "th" là một chữ cái như từ điển truyền thống (ví dụ Cao Bằng đứng trước Cần Thơ vì so từng ký tự). Bạn duyệt thứ tự này ở checkpoint 04-25. FE khai báo sẵn thứ tự này trong file dữ liệu thay vì sắp lúc chạy, vì kết quả `localeCompare('vi')` có thể khác giữa Node và trình duyệt.

## Phụ lục C: Deferred (không thuộc Phase 4)

- **Việc hoãn:** cung cấp 34 ảnh bìa thật cho `apps/web/public/destinations/<slug>.jpg`, kèm bản ghi giấy phép (D-106). Phase 4 không có checkpoint ảnh, và UAT cuối của phần mở lại không kiểm ảnh thật. Cho tới khi có ảnh, URL ảnh mặc định trả 404 và FE rơi về nền dự phòng theo token (`onError` của thẻ ảnh).
- **Chính sách nguồn ảnh khi làm (D-105):** chỉ nhận ảnh từ Unsplash, Pexels, CC0 hoặc ảnh tự chụp của user. Không nhận CC BY và CC BY-SA, vì hai loại này đòi trang ghi công. Không lấy ảnh từ tìm kiếm ảnh, blog, báo hay trang của tỉnh.
- **Bản ghi giấy phép:** mỗi ảnh có một dòng với các cột `slug`, `file`, `sourceUrl`, `author`, `license`, `licenseUrl`, `retrievedAt`, `subject`, `modifications`, `approvedBy`, `approvedAt`.
- **Định dạng đề xuất:** JPEG, 1600×900, tối đa 250 KB mỗi ảnh, xóa dữ liệu EXIF. Chỉ một định dạng JPEG để URL lưu trong DB dùng được cả cho Open Graph. Thay ảnh thì giữ nguyên tên file để mọi lịch trình đã lưu URL đó tự đổi theo sau lần deploy kế tiếp.
- **Lưu ý nội dung:** tránh công trình hiện đại còn bảo hộ bản quyền làm chủ thể, người cận mặt và logo.
