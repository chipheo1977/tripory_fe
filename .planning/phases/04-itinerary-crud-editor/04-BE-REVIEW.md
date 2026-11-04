---
phase: 04-itinerary-crud-editor
reviewed: 2026-11-04T02:40:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - API_ENDPOINTS.md
  - src/Services/Tripory/Tripory.API/Contracts/V1/Itineraries/Requests/CreateItineraryRequest.cs
  - src/Services/Tripory/Tripory.API/Contracts/V1/Itineraries/Requests/UpdateItineraryMetadataRequest.cs
  - src/Services/Tripory/Tripory.API/Controllers/V1/ItinerariesController.cs
  - src/Services/Tripory/Tripory.API/appsettings.json
  - src/Services/Tripory/Tripory.API/appsettings.Development.json
  - src/Services/Tripory/Tripory.Application/Abstractions/DestinationCover/IDestinationCoverProvider.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Commands/CreateQuickDraftItineraryCommand.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Commands/UpdateItineraryMetadataCommand.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Extensions/ItineraryExtensions.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Handlers/CreateQuickDraftItineraryCommandHandler.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Handlers/UpdateItineraryMetadataCommandHandler.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Responses/ItineraryDetailDto.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Responses/ItinerarySummaryDto.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Validators/CreateQuickDraftItineraryCommandValidator.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Validators/UpdateItineraryMetadataCommandValidator.cs
  - src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Validators/ItineraryRuleBuilderExtensions.cs
  - src/Services/Tripory/Tripory.Domain/Catalogs/DestinationCatalog.cs
  - src/Services/Tripory/Tripory.Domain/Catalogs/InterestCatalog.cs
  - src/Services/Tripory/Tripory.Domain/Entities/Itinerary.cs
  - src/Services/Tripory/Tripory.Domain/Errors/DomainErrors.cs
  - src/Services/Tripory/Tripory.Infrastructure/Configurations/DestinationCatalogOptions.cs
  - src/Services/Tripory/Tripory.Infrastructure/DependencyInjection.cs
  - src/Services/Tripory/Tripory.Infrastructure/Implementations/DestinationCover/DestinationCoverProvider.cs
  - src/Services/Tripory/Tripory.Persistence/Configurations/ItineraryConfiguration.cs
  - src/Services/Tripory/Tripory.Persistence/Migrations/20261103085252_Add_Itinerary_Destination_Interests_CoverImages.cs
  - src/Services/Tripory/Tripory.Persistence/Migrations/20261103085252_Add_Itinerary_Destination_Interests_CoverImages.Designer.cs
  - src/Services/Tripory/Tripory.Persistence/Migrations/ApplicationDbContextModelSnapshot.cs
depth_pass2: standard
steering_applied: true
reviewed_pass2: 2026-11-04
findings:
  critical: 2
  warning: 2
  info: 17
  total: 21
findings_pass1:
  critical: 0
  warning: 6
  info: 8
  total: 14
findings_pass2_new:
  critical: 2
  warning: 1
  info: 4
  total: 7
status: issues_found
---

# Phase 4: Báo cáo review BE (C1..C12)

**Reviewed:** 2026-11-04
**Depth:** standard (lần theo luồng POST và PUT xuyên Controller, MediatR, ValidationPipelineBehavior, Handler, Domain, EF)
**Repo BE:** `C:\Users\OS\Documents\personal\tripory_be`, nhánh `be/phase_4`, các thay đổi đang ở trạng thái đã `git add`, chưa commit.
**Nguồn sự thật:** `04-BE-CONTRACT.md` (mục 3 đến 11).

## Tóm tắt

Không có lỗi Critical. Solution biên dịch sạch (`dotnet build Tripory.API --no-restore -o %TEMP%\tripory-api-check`: 0 cảnh báo, 0 lỗi). Danh mục 34 slug và 7 mã sở thích khớp hợp đồng từng ký tự và đúng thứ tự. Luồng POST và PUT đúng mục 6 và mục 7 ở hầu hết tổ hợp đầu vào: các mã lỗi trả đúng, mã lạ trả 400, `javascript:` và `data:` bị chặn, bất biến `CoverImageUrl == CoverImageUrls[selected]` giữ ở cả hai đường ghi, EF nhận ra thay đổi của `string[]`, model EF khớp snapshot.

Có sáu điểm mức Warning cần xử lý trước khi nghiệm thu 04-25. Hai điểm ảnh hưởng trực tiếp đến FE:

1. **WR-01.** `title` thiếu hoặc `null` trả ProblemDetails của ASP.NET (không có `errorCode`), không phải `ItineraryTitle.Empty` như mục 6 và mục 7 ghi.
2. **WR-02.** Rule `ItineraryId` của validator PUT không có `WithErrorCode`, nên mã lỗi là `NotEmptyValidator`.

Bốn điểm còn lại là: ghi đè cả hàng khi PUT (WR-03), SQL migration chừa lại URL cũ mà validator mới từ chối (WR-04), khuếch đại bộ nhớ với mảng rất lớn (WR-05), và kiểm tra cấu hình `CoverImageBaseUrl` còn hở (WR-06).

### Cách kiểm chứng

Ngoài đọc code, tôi chạy hai chương trình thử đặt ở `%TEMP%` (không nằm trong repo nào, không đụng DB, không chạy API thật):

- `%TEMP%\be-review-harness`: máy chủ Kestrel tạm trên 127.0.0.1:5199. Chạy `ItinerariesController` thật, MediatR thật, `ValidationPipelineBehavior` thật, validator thật, domain thật, `DestinationCoverProvider` thật, với repository và UnitOfWork giả trong bộ nhớ. Gửi gần 100 request POST và PUT, in `errorCode` và trạng thái sau mỗi PUT.
- `%TEMP%\be-ef-harness`: dựng `ApplicationDbContext` với Npgsql nhưng không kết nối. Kiểm model EF, `HasPendingModelChanges`, sinh SQL của migration (Up và Down) bằng `IMigrator.GenerateScript`, và kiểm change tracking.

Trích dẫn "Bằng chứng" bên dưới lấy từ hai chương trình này.

### Những gì KHÔNG kiểm được

- Chưa chạy POST/PUT thật vào API với PostgreSQL. Repository trong harness là bản giả, nên chưa thấy câu SQL `INSERT/UPDATE` thật, chưa thấy lỗi ràng buộc DB (ví dụ `22001` khi vượt `varchar(500)`).
- Chưa chạy migration trên PostgreSQL, chưa chạy trên dữ liệu có ảnh bìa. SQL của migration chỉ được sinh ra offline; toán tử regex `~*`, `cardinality`, `ARRAY[...]` chưa được PostgreSQL thực thi. Điều này khớp với ghi chú trong hợp đồng (mục 2, C10).
- Chưa khởi động host thật để thấy `ValidateOnStart` chặn khởi động. Harness chỉ truy cập `IOptions<DestinationCatalogOptions>.Value`, nên các validator của options chạy đúng như lúc khởi động nhưng đường `ValidateOnStart` chưa được xem trực tiếp.
- Giới hạn thân request mặc định 30 MB của Kestrel lấy từ tài liệu mặc định của ASP.NET Core, `Program.cs` không cấu hình lại; chưa đo ở 30 MB.
- Không kiểm phía FE/BFF (kể cả việc FE hiển thị URL ảnh bằng cách nào).
- File `.Designer.cs` và `ApplicationDbContextModelSnapshot.cs` là mã sinh tự động. Tôi chỉ xác nhận snapshot khớp model (`HasPendingModelChanges = False`) và kiểu cột `text[]`, `varchar(64)`.

## Warnings

### WR-01: `title` thiếu hoặc `null` trả ProblemDetails, không có `errorCode` (lệch mục 7 và mục 9)

**File:** `Tripory.API/Contracts/V1/Itineraries/Requests/CreateItineraryRequest.cs:6`, `UpdateItineraryMetadataRequest.cs:4`
**Vấn đề:** `string Title` là kiểu không nullable trong dự án bật `<Nullable>enable</Nullable>`. Với `[ApiController]` (`ApiController.cs:8`) và `AddControllers()` mặc định (`Program.cs:24`), MVC coi tham số non-nullable là `[Required]` ngầm. Request thiếu `title` hoặc `"title": null` bị chặn ở bước model binding, trả ProblemDetails `{"errors":{"Title":["The Title field is required."]}}` trước khi tới validator. Mục 7 ghi `title` thiếu hoặc `null` thì lỗi `ItineraryTitle.Empty`.
**Bằng chứng (harness):**
- `POST` không có `title`: 400 `ProblemDetails errors={"Title":["The Title field is required."]}`.
- `POST {}` (thiếu cả hai trường): cũng ra lỗi `Title` của ProblemDetails, không ra `Itinerary.DestinationRequired`. Mục 6 yêu cầu thứ tự (1) điểm đến rồi (2) tên.
- `PUT` với `"title": null`: cùng kết quả.
- `title: ""` và `"   "` thì qua được binding và ra đúng `ItineraryTitle.Empty`.
**Ảnh hưởng:** FE xử lý theo `errorCode`. Một request thiếu `title` sẽ không gắn được lỗi vào khối "Tên chuyến đi" và có phong bì khác với `ApiResponse`. FE hiện luôn gửi `title` nên rủi ro thực tế thấp, nhưng hợp đồng nói khác code.
**Cách sửa:** đổi `Title` thành `string?` ở hai request và hai command, giữ `NotEmpty()` + `ItineraryTitle.Empty` trong validator (cần `!` hoặc `?? string.Empty` ở rule độ dài). Nếu muốn giữ hành vi hiện tại, sửa mục 6, mục 7 và mục 9 của hợp đồng cho đúng. Lỗi JSON sai kiểu (`dayCount: "abc"`, `startDate: "abc"`) cũng ra ProblemDetails, nhưng hợp đồng đã nêu trường hợp `startDate` ở mục 6 và đây là hành vi có từ trước.

### WR-02: Rule `ItineraryId` của validator PUT thiếu `WithErrorCode`

**File:** `Tripory.Application/UseCases/V1/Itineraries/Validators/UpdateItineraryMetadataCommandValidator.cs:12-13`
**Vấn đề:** `RuleFor(x => x.ItineraryId).NotEmpty().WithMessage(...)` không có `WithErrorCode`. `ValidationPipelineBehavior.cs:41` lấy `ErrorCode` của FluentValidation, nên mã là tên validator mặc định. Route `{id:guid}` chấp nhận `00000000-0000-0000-0000-000000000000`. Rule này khai báo đầu tiên, nên nếu id rỗng thì lỗi này thành lỗi được trả.
**Bằng chứng (harness):** `PUT /api/v1/itineraries/00000000-0000-0000-0000-000000000000` trả 400 `errorCode=NotEmptyValidator`.
**Vi phạm:** mục 9, quy tắc bắt buộc số 1 ("mọi rule trong hai validator đều có `WithErrorCode`"). Mục 2 của hợp đồng đang ghi C9 là "Xong" với câu "mọi rule của hai validator có `WithErrorCode`"; câu đó chưa đúng.
**Cách sửa:** thêm `WithErrorCode` có tiền tố `Itinerary.` và không chứa các chuỗi con `NotFound`, `Conflict`, `AlreadyExists`, `Unauthorized`, `Forbidden`. Gợi ý: `Itinerary.InvalidId`. Hoặc bỏ rule vì route đã ràng buộc kiểu GUID. Nếu thêm mã mới thì thêm vào mục 9 và báo FE.

### WR-03: PUT ghi đè cả hàng (`DbSet.Update`), có thể ghi đè dữ liệu cũ của thao tác khác

**File:** `Tripory.Application/UseCases/V1/Itineraries/Handlers/UpdateItineraryMetadataCommandHandler.cs:59`, `Tripory.Persistence/Repositories/RepositoryBase.cs:72-76`
**Vấn đề:** thực thể đã được EF theo dõi sau `FindAsync`, nên không cần `Update()`. `DbSet.Update` đánh dấu mọi cột là `Modified`, kể cả `IsPublic`, `TotalDistanceKm`, `CreatedAt`, `IsDeleted`, `DeletedAt`. Hai request chạy gần nhau (ví dụ tự lưu "Thông tin chuyến đi" lúc người dùng vừa thêm điểm dừng làm `RecalculateDistances` đổi `TotalDistanceKm`, hoặc lúc vừa `Publish`) có thể bị PUT đến sau ghi lại giá trị cũ đã đọc trước đó.
**Bằng chứng (EF harness):** sau `UpdateMetadata` và `DetectChanges`, EF chỉ đánh dấu `CoverImageUrl, CoverImageUrls, Interests, UpdatedAt`. Sau `Update()` là 17 cột: `CoverImageUrl, CoverImageUrls, CreatedAt, CreatedBy, DeletedAt, DeletedBy, Description, DestinationCode, Interests, IsDeleted, IsPublic, StartDate, Title, TotalDistanceKm, UpdatedAt, UpdatedBy, UserId`.
**Mức độ:** mẫu code này có từ trước thay đổi C7, nhưng tự lưu của form mới gọi PUT thường xuyên hơn nên xác suất gặp tăng. Hợp đồng chấp nhận "lệnh PUT cuối cùng thắng" cho metadata (mục 7), không nói tới các cột ngoài metadata.
**Cách sửa:** trong handler này bỏ `UpdateAsync` và chỉ gọi `SaveChangesAsync` (change tracking đã đủ, xem bằng chứng), hoặc đặt `UpdateAsync` của repository thành no-op cho thực thể đã theo dõi. Không cần ValueComparer: EF đã gán `ListOfReferenceTypesComparer` cho cả `Interests` lẫn `CoverImageUrls`.

### WR-04: Migration giữ lại URL cũ mà validator mới từ chối, làm chặn tự lưu

**File:** `Tripory.Persistence/Migrations/20261103085252_Add_Itinerary_Destination_Interests_CoverImages.cs:40-46` so với `Tripory.Application/.../Validators/ItineraryRuleBuilderExtensions.cs:37-48`
**Vấn đề:** SQL chuyển ảnh chỉ kiểm `^https://` (không phân biệt hoa thường) và `length <= 500`. Validator `IsHttpsUrl` chặt hơn: không cho khoảng trắng hoặc ký tự điều khiển, phải là URL tuyệt đối có host. Dữ liệu cũ chưa từng được kiểm, nên có thể có `https://` + khoảng trắng ở giữa (ví dụ `https://a.com/my image.jpg`), `https://` không có host, hay chuỗi có ký tự điều khiển. Các dòng đó qua migration, vào `CoverImageUrls`. Khi FE tự lưu và gửi lại cả danh sách, PUT bị `Itinerary.CoverImageInvalidUrl` từ chối mãi, đúng kịch bản mà D-104 và C10 muốn tránh ("người dùng không sửa nổi tiêu đề").
**Bằng chứng:** harness xác nhận validator trả `CoverImageInvalidUrl` cho `https://a.com/a b.jpg` và `https:/a.com/x.jpg`. SQL của migration không loại các ca đó (đọc từ SQL sinh ra). Chưa chạy trên dữ liệu thật.
**Cách sửa:** siết điều kiện của câu UPDATE đầu cho khớp validator, ví dụ `~* '^https://[^[:space:][:cntrl:]]+$'`, để các URL kiểu đó rơi vào nhánh "bỏ" cùng URL `http://`. Trước khi chạy trên DB thật, đếm các dòng bị loại theo điều kiện mới (mục 10 bước 2).

### WR-05: `TrimmedCoverImages` tính lại mỗi lần truy cập và không có giới hạn kích thước request, khuếch đại bộ nhớ

**File:** `Tripory.Application/UseCases/V1/Itineraries/Commands/UpdateItineraryMetadataCommand.cs:19-21`; dùng ở `UpdateItineraryMetadataCommandValidator.cs:35-37, 40-42, 47`, và `UpdateItineraryMetadataCommandHandler.cs:54`
**Vấn đề:** `TrimmedCoverImages` là thuộc tính tính toán: mỗi lần đọc lại duyệt toàn mảng, `Trim()` từng phần tử và cấp phát mảng mới. Một request chạy qua điều kiện `When` của 4 rule ảnh, selector, rule chọn ảnh và handler, nên mảng bị trim vài lần trước cả khi kiểm số lượng (giới hạn 5 chỉ được kiểm sau khi mảng đã bị trim). `Program.cs` không đặt giới hạn thân request, mặc định Kestrel là 30 MB. Cần đăng nhập mới gọi được, nên rủi ro là DoS nhẹ.
**Bằng chứng (harness):** `PUT` với 2.000.000 phần tử trong `coverImages` (thân 8 MB) trả đúng `TooManyCoverImages` nhưng tốn khoảng 600 ms và cấp phát khoảng 170 MB. Với `interests` cùng cỡ: khoảng 190 ms, 105 MB (phần lớn do bộ đọc JSON). Thân hợp lệ lớn nhất thực tế khoảng vài KB (5 URL × 500 ký tự + mô tả 1000 ký tự).
**Cách sửa:** tính trim một lần (gán trong constructor hoặc thuộc tính `init`), và thêm `[RequestSizeLimit]` cỡ vài chục KB cho hai action POST và PUT của itinerary. Có thể kiểm số lượng trước khi trim.

### WR-06: Kiểm tra `CoverImageBaseUrl` lúc khởi động còn hở

**File:** `Tripory.Infrastructure/DependencyInjection.cs:34-44`, `DestinationCoverProvider.cs:24`
**Vấn đề:** ba chỗ lệch mục 11 và C11:
1. Giá trị `null` (ví dụ `"CoverImageBaseUrl": null`) làm rule thứ hai (`o.CoverImageBaseUrl.EndsWith("/")`, dòng 40-41) ném `NullReferenceException`. BE vẫn không khởi động, nhưng không có thông điệp tiếng Việt như mục 11 yêu cầu.
2. Rule chỉ kiểm tuyệt đối, `https`, kết thúc bằng `/`. Nó chấp nhận URL có khoảng trắng trong đường dẫn hoặc có query. URL mặc định ghép ra sẽ chứa khoảng trắng và bị chính `IsHttpsUrl` từ chối ở lần tự lưu kế tiếp, đúng kịch bản mà cảnh báo của C11 mô tả cho `http`.
3. Không kiểm độ dài. Gốc dài hơn khoảng 482 ký tự cho URL mặc định vượt 500 ký tự, vượt `varchar(500)` của `CoverImageUrl` (dòng 30 của `ItineraryConfiguration.cs`), `POST` sẽ lỗi 500 từ DB (suy luận, chưa chạy với DB thật).
**Bằng chứng (harness):**
- `null` → `NullReferenceException`.
- `https://x.vn/my dir/` → chấp nhận, URL ghép `https://x.vn/my dir/vn-hue.jpg`.
- `https://x.vn/d/?a=b/` → chấp nhận.
- `HTTPS://X.VN/D/` → chấp nhận, URL ghép giữ nguyên chữ hoa `HTTPS://X.VN/D/vn-hue.jpg`.
- Giá trị `""`, `http://...`, thiếu `/` cuối, `ftp://`, đường dẫn tương đối: đều bị chặn đúng với thông điệp tiếng Việt.
**Cách sửa:** thêm `string.IsNullOrWhiteSpace` vào rule đầu và dùng `o.CoverImageBaseUrl?.EndsWith("/") == true` ở rule hai. Dùng lại cùng hàm kiểm URL với validator (không khoảng trắng, không ký tự điều khiển, không `?`/`#`) và giới hạn độ dài (`<= 500 - 14 - 4`; 14 là độ dài slug dài nhất, 4 là `.jpg`).

## Info

### IN-01: Thông điệp lỗi trong validator khác thông điệp hợp đồng và khác value object

**File:** `CreateQuickDraftItineraryCommandValidator.cs:22,24`, `UpdateItineraryMetadataCommandValidator.cs:17,19,23`, so với `Tripory.Domain/ValueObjects/ItineraryTitle.cs:21,25` và `ItineraryDescription.cs:25`
Mục 9 ghi "giữ thông điệp hiện có" cho ba mã `ItineraryTitle.Empty`, `ItineraryTitle.TooLong`, `ItineraryDescription.TooLong` (value object: "Tiêu đề hành trình không được để trống.", "Mô tả hành trình không được vượt quá ..."). Validator dùng câu ngắn hơn ("Tiêu đề không được để trống.", "Mô tả không được vượt quá ..."). Cùng một mã nhưng thông điệp khác nhau tùy lỗi do validator hay value object trả ra. FE ánh xạ theo mã nên không lỗi; chỉ là không nhất quán. Không có thông điệp nào lộ chi tiết nội bộ (kiểm toàn bộ thông điệp ở hai validator và `ItineraryRuleBuilderExtensions`). Mười bốn mã đều không chứa chuỗi con `NotFound/Conflict/AlreadyExists/Unauthorized/Forbidden`: harness xác nhận mỗi mã trả HTTP 400. Gợi ý: dùng chung hằng thông điệp từ value object hoặc `DomainErrors`.

### IN-02: Thứ tự kiểm ảnh theo loại luật, không theo từng phần tử; `selectedCoverIndex` đứng một mình bị bỏ qua im lặng

**File:** `ItineraryRuleBuilderExtensions.cs:27-34`, `UpdateItineraryMetadataCommandValidator.cs:35-42`
Mục 7 ghi thứ tự "số lượng, rồi từng phần tử theo thứ tự (định dạng, độ dài, trùng), rồi chỉ số chọn". Code kiểm toàn mảng theo từng luật: mọi phần tử qua định dạng, rồi mọi phần tử qua độ dài, rồi trùng. Harness: `[URL hợp lệ dài 600 ký tự, "not-a-url"]` trả `CoverImageInvalidUrl` (theo từng phần tử sẽ ra `CoverImageTooLong`). Chỉ khác khi một request sai nhiều chỗ; hợp đồng có thể được hiểu theo cả hai cách, nên hãy chốt một cách và sửa mục 7 hoặc code.
Ngoài ra, `PUT` chỉ gửi `selectedCoverIndex` (không có `coverImages`) trả 200 và không đổi gì (harness: `idx` giữ nguyên). Phù hợp quyết định "coverImages null thì giữ nguyên", nhưng một client muốn đổi riêng ảnh đang chọn sẽ tưởng đã lưu. Nên ghi vào mục 7 hoặc `API_ENDPOINTS.md`.

### IN-03: `IsHttpsUrl` chấp nhận userinfo, host nội bộ và scheme viết hoa; không chuẩn hóa URL

**File:** `ItineraryRuleBuilderExtensions.cs:37-48`
Harness: `https://user:pw@a.com/x.jpg`, `https://169.254.169.254/latest`, `https://localhost/x` và `HTTPS://A.com/x.jpg` đều được lưu (chuỗi lưu nguyên văn). Trả lời các câu hỏi bảo mật:

- **SSRF phía BE: không có.** Tìm `HttpClient|WebClient` trong `src/` không có kết quả. BE chỉ lưu và trả chuỗi, không tải ảnh.
- **`javascript:` và `data:`** bị chặn (harness: `CoverImageInvalidUrl`).
- **Rủi ro còn lại ở nơi đọc URL.** Mọi thành phần phía máy chủ sau này lấy URL này để tải (trình tối ưu ảnh của Next.js nếu bật `remotePatterns` rộng, BFF, tạo ảnh Open Graph ở Phase 5) cần danh sách host cho phép hoặc chặn dải IP nội bộ.
- **Lộ thông tin đăng nhập.** URL có `user:pw@` được trả công khai bởi `GET /itineraries/{id}` ([AllowAnonymous]) khi hành trình công khai. Nên từ chối URL có userinfo (`uri.UserInfo` không rỗng).
- Cân nhắc lưu dạng chuẩn (`uri.AbsoluteUri` hoặc ép scheme chữ thường) để migration và validator dùng cùng một quy ước.

### IN-04: Domain không tự bảo vệ bất biến; phụ thuộc hoàn toàn vào validator

**File:** `Tripory.Domain/Entities/Itinerary.cs:51, 87, 96-111, 287-292`
Harness (gọi thẳng domain, bỏ qua validator):
- `CreateQuickDraft` với `dayCount` 0 hoặc -3 tạo 0 ngày; 31 tạo 31 ngày. `CreateInitialDays` (dòng 287-292) không kiểm khoảng 1..30.
- `SetCoverImages` (dòng 96-111) giữ tham chiếu mảng của người gọi (dòng 108); sửa mảng gốc làm vỡ bất biến (`CoverImageUrl` còn, `SelectedCoverIndex` thành `null`). Constructor cũng giữ tham chiếu `interests` (dòng 51).
- Không chặn URL trùng: với `["https://a/1","https://a/1"]` và index 1 thì `SelectedCoverIndex` trả 0, không phải 1 (`Array.IndexOf` lấy phần tử đầu).
- Với mảng rỗng, `selectedIndex` bị bỏ qua (dòng 98-103); chỉ validator bắt `[] + index 0`.
Hiện không có đường nào gọi domain mà không qua validator, và các mảng truyền vào đều mới tạo (`ToArray()` hoặc literal), nên chưa thành lỗi. Gợi ý: sao chép mảng (`[.. urls]`), kiểm `dayCount` trong domain bằng cùng hằng với validator, và chặn trùng trong `SetCoverImages`.
Mục 3 của câu hỏi ("nửa vời khi `SetCoverImages` lỗi"): `UpdateMetadata` gọi `SetCoverImages` trước khi đụng bất kỳ trường nào khác (dòng 123-128), và `SetCoverImages` chỉ gán sau khi qua kiểm tra chỉ số, nên không có trạng thái nửa vời.

### IN-05: Migration không idempotent khi chạy lại ngoài EF, không báo số dòng bị bỏ, `Down()` không khôi phục dữ liệu

**File:** `20261103085252_Add_Itinerary_Destination_Interests_CoverImages.cs:40-54, 58-74`
- UPDATE đầu không có điều kiện `cardinality("CoverImageUrls") = 0`. EF chỉ chạy một lần nhờ `__EFMigrationsHistory`, nhưng nếu ai chạy lại đoạn SQL này bằng tay sau khi người dùng đã sửa danh sách ảnh, danh sách nhiều ảnh bị thu về một phần tử. Thêm điều kiện là đủ.
- Dòng có `CoverImageUrl` rỗng, `http://` hoặc không hợp lệ bị đặt `NULL` mà không ghi lại (D-104 đã chấp nhận mất). Hợp đồng dặn đếm trước bằng tay (mục 10 bước 2); migration có thể thêm `RAISE NOTICE` đếm số dòng, hoặc chép các URL bị bỏ sang bảng tạm để quay lui được ngoài bản sao lưu.
- `Down()` chỉ `DropColumn` ba cột; URL đã bị đặt `NULL` ở `Up()` không khôi phục được và dữ liệu `DestinationCode`/`Interests`/danh sách ảnh nhiều phần tử mất. Hợp lý với hợp đồng ("quay lui bằng bản sao lưu") nhưng nên ghi chú trong file.
- Điểm đúng: SQL thô áp dụng cho mọi dòng kể cả xóa mềm; `NULL` và chuỗi rỗng (không khớp `^https://`) đi vào nhánh bỏ; kiểu cột và mặc định khớp mục 10 (`text[] NOT NULL DEFAULT '{}'` ×2, `varchar(64)` cho phép `NULL`); migration chạy trong một giao dịch; `ItineraryConfiguration.cs:38-46` khớp (SQL sinh offline và `HasPendingModelChanges = False`).

### IN-06: `API_ENDPOINTS.md` đúng chữ ký nhưng thiếu các luật đã chốt trong C12

**File:** `API_ENDPOINTS.md:97, 100, 109`
Ba dòng khớp tên trường và kiểu với `CreateItineraryRequest` và `UpdateItineraryMetadataRequest`. Thiếu so với mục 12 của hợp đồng: (1) `coverImageUrl` đã bị xóa khỏi request PUT (không có trong dòng 100; mục 12 yêu cầu ghi rõ); (2) `destinationCode` bắt buộc ở POST, `dayCount` 1..30 và mặc định 1; (3) `selectedCoverIndex` bắt buộc khi `coverImages` không rỗng; (4) liên kết tới danh sách mã lỗi ở mục 7 (tùy chọn). Dòng 109 đúng.

### IN-07: Chất lượng mã, các điểm nhỏ

- `CreateItineraryRequest.cs:1`: `using Tripory.Domain.Catalogs;` không dùng.
- Hằng số 500 nằm ở ba nơi: `ItineraryRuleBuilderExtensions.cs:9`, `ItineraryConfiguration.cs:30` (literal), migration. Nên có một hằng dùng chung (ví dụ trên `Itinerary`) cho `HasMaxLength` và validator. Tương tự `MinDayCount/MaxDayCount` chỉ nằm ở validator POST, domain không dùng (xem IN-04).
- `DependencyInjection.cs:42`: thông điệp "Ảnh bìa phải kết thúc bằng ký tự '/'." sai tên đối tượng, phải là `CoverImageBaseUrl`.
- `DestinationCatalog.cs:42-44`, `InterestCatalog.cs:16-18`: `Codes.Contains` trên `IReadOnlyList<string>` là LINQ O(n), đủ nhanh với 34 phần tử. `Codes` thực chất là `string[]` nên có thể bị ghi đè bằng ép kiểu; dùng `ImmutableArray` hoặc `HashSet` cho `IsKnown` nếu muốn chặt. Kiểu ngoặc `{` cùng dòng ở `IsKnown` khác phần còn lại của repo (Allman), dòng trắng thừa ở `InterestCatalog.cs:5`.
- `ItinerariesController.cs:29` ghi nguyên `request.Title` vào log, người dùng có thể chèn xuống dòng vào log. Có từ trước, không thuộc đợt này.

### IN-08: Ghi nhận các hành vi có từ trước (không tính là lỗi mới)

- `GetMyItinerariesPagedAsync` (`ItineraryRepository.cs:26-38`) không `Include` `Days`/`Waypoints`, nên `DaysCount`/`WaypointsCount` của `/mine` bằng 0. Hợp đồng đã nêu ở C4 và mục "Ngoài phạm vi".
- Lỗi JSON sai kiểu (`dayCount: "abc"`, `startDate: "abc"`, thân rỗng) trả ProblemDetails, không phải `ApiResponse`.
- `appsettings.json` chứa `JwtOptions:SecretKey` và mật khẩu DB; `AddPersistence` bật `EnableSensitiveDataLogging`. Đã có trong `.planning/codebase/CONCERNS.md` của BE.

## Trả lời các câu hỏi trọng tâm

1. **Mã lỗi.** Mọi rule của validator POST có `WithErrorCode` đúng mục 9. Validator PUT thiếu ở rule `ItineraryId` (WR-02). Không mã nào chứa các chuỗi con đổi HTTP status; thông điệp tiếng Việt, không lộ chi tiết nội bộ (IN-01 chỉ nói về độ nhất quán).
2. **Thứ tự lỗi đầu tiên.** POST: điểm đến (Required rồi Unknown), tên (Empty rồi TooLong), số ngày, sở thích (số lượng, mã lạ, trùng) đúng mục 6 khi `title` có mặt (harness: `{destinationCode lạ, title ""}` → `DestinationUnknown`). PUT: số lượng, định dạng, độ dài, trùng, chỉ số chọn; xem IN-02 về thứ tự theo phần tử. Phần tử `null` hoặc chuỗi rỗng trong `coverImages` không ném `NullReferenceException`: `TrimmedCoverImages` đổi `null` thành `""` (`UpdateItineraryMetadataCommand.cs:20`), `IsHttpsUrl("")` trả `false` (harness: `CoverImageInvalidUrl`). Với `interests` có `[null]`: `InterestUnknown`, không NRE.
3. **PUT và EF.** Không có trạng thái nửa vời (IN-04). Bất biến giữ ở cả CreateQuickDraft (`Itinerary.cs:89`) và UpdateMetadata (`:125`). `SetCoverImages` giữ tham chiếu mảng của người gọi (IN-04); trên đường PUT mảng mới do `ToArray()` tạo ra nên không bị chia sẻ. EF nhận ra mảng mới: cả hai cột có `ListOfReferenceTypesComparer`, không cần ValueComparer thêm (EF harness). `UpdateAsync` gọi `DbSet.Update` đánh dấu cả hàng (WR-03).
4. **POST.** `dayCount` thiếu hoặc `null` cho 1 ngày; 0, âm và 31 bị `DayCountOutOfRange`; 30 được nhận; `interests` null hoặc `[]` được nhận. Tên bị `trim` (100 ký tự + 5 khoảng trắng được nhận). Tạo đủ N ngày với `DayNumber` 1..N và Id khác nhau (harness: 3 ngày). `startDate` quá khứ được nhận. Handler gọi `IDestinationCoverProvider`, ảnh 1 được chọn, `selectedCoverIndex` bằng 0. Mã điểm đến lạ không tới được provider vì validator chặn trước; provider vẫn tự kiểm `IsKnown` và trả `null`.
5. **DTO.** Khớp mục 8: `coverImages` không bao giờ `null`, `selectedCoverIndex` là `int?`, `ItinerarySummaryDto` không có `interests`. `GetById` có `Include` đủ; `/mine` xem IN-08.
6. **Migration.** Xem WR-04 và IN-05.
7. **Cấu hình.** Xem WR-06. Slug đã qua `IsKnown` trước khi ghép URL (`DestinationCoverProvider.cs:21`, so khớp chính xác theo ordinal với 34 giá trị cố định), nên không thể có ký tự lạ hay đường dẫn đi lên trong phần slug.
8. **Danh mục.** So từng slug bằng chương trình: 34 slug khớp mục 4, đúng thứ tự, không trùng; 7 mã sở thích khớp mục 5, đúng thứ tự. `IsKnown(null)` = false, `""` = false, `VN-HUE` = false, `vn-hue` = true.
9. **Quyền và bảo mật.** PUT dùng `GetOwnedItineraryAsync` (`UpdateItineraryMetadataCommandHandler.cs:33`): trả 404 khi không có, 403 khi không phải chủ. GET chi tiết chỉ cho người ngoài đọc khi hành trình công khai (`GetItineraryByIdQueryHandler.cs:34-40`). Không có đường ghi ảnh bìa nào khác ngoài `SetCoverImages`. SSRF, `javascript:`/`data:`, mảng lớn: xem IN-03 và WR-05.
10. **API_ENDPOINTS.md.** Xem IN-06.
11. **Chất lượng.** Xem IN-07. Không còn `#pragma`, `Obsolete` hay `LegacyCoverImageUrl` trong `src/` (các `#pragma` còn lại thuộc migration cũ). Không có code chết mới ngoài `using` ở IN-07.

## Bảng đối chiếu C1..C12

| Mã | Kết luận | Ghi chú |
|----|----------|---------|
| C1 | Khớp | 34 slug khớp mục 4 từng ký tự và thứ tự; `IsKnown` so khớp chính xác, xử lý `null`, rỗng, hoa/thường. |
| C2 | Khớp | 7 mã khớp mục 5 và thứ tự; không tự sắp xếp, lưu đúng thứ tự gửi. |
| C3 | Khớp, trừ WR-01 | `destinationCode` bắt buộc, `dayCount` 1..30 mặc định 1, `interests` tùy chọn, `startDate` không chặn quá khứ; riêng `title` thiếu hoặc `null` ra ProblemDetails. |
| C4 | Khớp | Tạo đủ Ngày 1..N, `DayNumber` và Id đúng. Lỗi đếm của `/mine` có từ trước (IN-08). Domain không tự kiểm khoảng (IN-04). |
| C5 | Khớp | Ảnh 1 là `{base}{slug}.jpg`, được chọn, `selectedCoverIndex` bằng 0, mã lạ cho `null`. Cấu hình gốc URL còn hở (WR-06). |
| C6 | Khớp | Bất biến giữ ở cả hai đường ghi; cột `text[]` NOT NULL mặc định rỗng; EF theo dõi được mảng. Domain chưa tự chặn trùng và sao chép mảng (IN-04). |
| C7 | Khớp, trừ WR-01 | Giữ nguyên `destinationCode`/`interests`/`coverImages` khi `null`; `[]` xóa ảnh; `selectedCoverIndex` đúng bảng; khóa `coverImageUrl` cũ bị bỏ qua (harness: 200, không đổi). `title` thiếu/null lệch (WR-01). `Update()` ghi đè cả hàng (WR-03). |
| C8 | Khớp | `ItineraryDetailDto` và `ItinerarySummaryDto` đúng mục 8; JSON thật từ harness có đủ `coverImages`, `selectedCoverIndex`, `destinationCode`, `interests`. |
| C9 | Lệch một phần | Thiếu `WithErrorCode` ở `ItineraryId` (WR-02); `title` thiếu/null không ra mã (WR-01); thông điệp không giống bản "giữ nguyên" (IN-01); thứ tự theo phần tử (IN-02). Cả 14 mã của mục 9 đều trả đúng mã và HTTP 400 trong harness. |
| C10 | Khớp cấu trúc, lệch nội dung SQL | Kiểu cột và mặc định đúng; model khớp snapshot; SQL còn chừa URL mà validator từ chối (WR-04); thiếu thông báo số dòng bị bỏ và điều kiện idempotent (IN-05). Chưa chạy trên dữ liệu có ảnh. |
| C11 | Khớp một phần | Khóa có ở cả hai file appsettings, đúng giá trị; kiểm tra lúc khởi động chặn được `http`, thiếu `/`, rỗng, tương đối, nhưng bị NRE với `null` và chấp nhận khoảng trắng/query/gốc quá dài (WR-06). |
| C12 | Khớp một phần | Ba dòng đúng chữ ký; thiếu luật đã chốt (IN-06). |

## Lượt 2: Đối chiếu steering BE

**Bộ luật áp dụng:** `tripory_be/.kiro/steering/code-review.md` (mức độ) và `coding-rules.md` (luật viết code); `AGENTS.md` §4 đến §6; ARCHITECTURE.md. Phạm vi: diff đã `git add` của C1..C12 (30 file), không sửa code BE, không commit.

**Số liệu.** Lượt 1: 0 Critical, 6 Warning, 8 Info (14). Lượt 2 thêm 7 phát hiện mới (2 Critical, 1 Warning, 4 Info), và chỉnh mức của 5 Warning cũ theo steering. Tổng sau lượt 2 (ghi ở frontmatter): **2 Critical, 2 Warning, 17 Info, 21 phát hiện**. Cả 2 Critical và 1 Warning mới đều **có từ trước**, nằm ngoài diff C1..C12; chúng được ghi vì bạn yêu cầu xét các mục (k) và (l). Trong phạm vi diff đợt này không có Critical.

**Quy ước đổi mức.** Chỉ những mục khớp một dòng trong "Phải gắn nhãn Critical" hoặc "Gắn Warning" của `code-review.md` mới giữ nhãn đó. Mục không khớp dòng nào thì là Info theo steering, dù rủi ro thực tế vẫn còn. Cột "Ưu tiên sửa" ở bảng (3) giữ đánh giá rủi ro của lượt 1 để bạn không mất thông tin.

### (1) Bảng đối chiếu từng ý

#### code-review.md: Phải gắn nhãn Critical

| # | Ý | Kết quả | Bằng chứng |
|---|----|---------|-----------|
| C-1 | Bí mật trong code/appsettings được commit; token/mật khẩu vào log | **PASS trong diff**; **FAIL có từ trước** | Diff `appsettings.json` và `appsettings.Development.json` chỉ thêm khóa `DestinationCatalog:CoverImageBaseUrl` (URL công khai), không có bí mật. Nhưng `appsettings.json:13` (mật khẩu DB `postgres`) và `:16` (`JwtOptions:SecretKey`) đã được commit từ trước (file được git theo dõi): xem **CR-02**. Log: không có `LogX` nào trong code mới chứa Token/Password/Secret (grep toàn `src/`). |
| C-2 | Endpoint ghi/trả dữ liệu cá nhân thiếu `[Authorize]`, hoặc thêm `[AllowAnonymous]` trả dữ liệu người khác | PASS | `ItinerariesController.cs:13` `[Authorize]` cấp class; `[AllowAnonymous]` duy nhất ở `GetById` (`:69`) có từ trước, handler chặn người ngoài khi hành trình không công khai (lượt 1, mục 9). POST (`:23`) và PUT (`:84`) kế thừa `[Authorize]`. |
| C-3 | Handler ghi aggregate người dùng mà không kiểm quyền sở hữu | PASS | `UpdateItineraryMetadataCommandHandler.cs:33-34` dùng `GetOwnedItineraryAsync`. `CreateQuickDraftItineraryCommandHandler.cs:39-42` lấy `UserId` từ `ICurrentUserService`, trả `DomainErrors.Auth.Unauthorized` khi thiếu. |
| C-4 | CORS `AllowCredentials` + wildcard | KHÔNG ÁP DỤNG | Diff không đụng CORS (`Cors:AllowedOrigins` không đổi). |
| C-5 | Đổi hợp đồng FE mà không cập nhật `API_ENDPOINTS.md` và báo FE | PASS (có ghi chú) | `API_ENDPOINTS.md:97,100,109` đổi trong cùng diff. Xóa `coverImageUrl` khỏi request PUT là quyết định đã chốt (hợp đồng mục 7, `04-BE-CONTRACT.md:345,349`), ghi nhận là thay đổi hợp đồng đã chấp nhận: dòng 100 đã bỏ `coverImageUrl` khỏi chữ ký request. Mã lỗi: bản `HEAD` của hai validator chưa có `WithErrorCode`, nên mã `ItineraryTitle.Empty/TooLong` và `ItineraryDescription.TooLong` giữ nguyên tên (từ value object, nay validator trả cùng mã), không mã nào bị đổi tên hay xóa. Slug/mã sở thích khớp hợp đồng (lượt 1). Nghĩa null của PUT khớp `coverImages` null = giữ, `[]` = xóa (`Itinerary.cs:123-128`, `API_ENDPOINTS.md:100`). Việc `API_ENDPOINTS.md` chưa liệt kê các mã lỗi mới chỉ là thiếu sót tài liệu, xem IN-06. |
| C-6 | Import xuyên tầng; `ProjectReference` trái chiều | PASS | Grep `EntityFrameworkCore\|HttpClient\|DataAnnotations\|Tripory.Persistence\|Tripory.Infrastructure` trong `Tripory.Domain` và `Tripory.Application`: 0 kết quả. Không có `.csproj` nào trong diff. Tham chiếu hiện có: Domain → BuildingBlocks.Core; Application → Domain (`Tripory.Application.csproj`); Infrastructure → Application, Domain; Persistence → Domain, Application, BuildingBlocks.Core; API → Application, Infrastructure, Persistence. Không có chiều ngược. `IDestinationCoverProvider` đặt ở `Application/Abstractions`, adapter ở `Infrastructure/Implementations` đúng "Port/adapter". |
| C-7 | Migration phá dữ liệu (`DropColumn`, `AlterColumn` thu hẹp) mà PR không ghi sao lưu/chuyển dữ liệu; sửa tay migration/snapshot đã commit | **CHƯA XÁC MINH ĐƯỢC** (điều kiện) | `Down()` có 3 `DropColumn` (`...CoverImages.cs:60-73`), `Up()` có `UPDATE ... SET "CoverImageUrl" = NULL` (`:49-54`). Không có `AlterColumn`. Chưa có PR (thay đổi mới `git add`, chưa commit) nên không có mô tả PR để kiểm. Bước sao lưu và quay lui đã ghi trong hợp đồng (`04-BE-CONTRACT.md:437` sao lưu, `:444` quay lui) và C10 ghi đã chạy trên DB phát triển (`:59`). Nhắc: phải chép bước sao lưu/quay lui vào mô tả PR, nếu thiếu thì mục này thành Critical. Migration và snapshot là file sinh bởi EF; SQL tay trong `Up()` là việc coding-rules yêu cầu, không tính là "sửa tay trái luật". Xem IN-12. |
| C-8 | `EnableSensitiveDataLogging`/`EnableDetailedErrors` ở Production | **FAIL có từ trước** | `Tripory.Persistence/DependencyInjection.cs:27-28` bật không điều kiện môi trường. Ngoài diff. Xem **CR-01**. |

#### code-review.md: Gắn Warning

| # | Ý | Kết quả | Bằng chứng |
|---|----|---------|-----------|
| W-1 | Business rule nằm trong Handler/Infrastructure Service | PASS (có Info) | Hai handler chỉ điều phối (`Create...Handler.cs:37-66`, `Update...Handler.cs:31-63`). Provider (`DestinationCoverProvider.cs:19-25`) chỉ ghép URL từ cấu hình, là việc của adapter. Chuẩn hóa trim ảnh nằm ở Command và các bất biến ảnh chỉ nằm ở validator: xem IN-10. |
| W-2 | Throw exception cho lỗi nghiệp vụ; `new Error("...")` inline thay vì `DomainErrors` | PASS | Không có `throw` mới. Grep `new Error(` trong `src/` (trừ Migrations, `DomainErrors.cs`): mọi kết quả nằm ở file không có trong diff (`ChatController`, `RefreshTokenCommandHandler`, `RegisterCommandHandler`, `ChatMessage`, `Conversation`, `User`, `Email`, `Handle`, `ItineraryTitle`, `ItineraryDescription`, `WaypointName`, `Wgs84Coordinate`), tức có từ trước. `ValidationPipelineBehavior.cs:41` là `new Error(firstFailure.ErrorCode ...)` bọc mã của validator, không phải mã inline. Mã mới `Itinerary.CoverSelectionInvalid` đã thêm vào `DomainErrors.cs` (diff +5 dòng) và dùng tại `Itinerary.cs:106`. Các mã trong validator đặt bằng `WithErrorCode` (xem W-3), không phải `new Error`. |
| W-3 | Validator: `RuleFor` thiếu `WithErrorCode`/`WithMessage` tiếng Việt; thứ tự khối form; độ dài đo trước `Trim` | **FAIL (1 rule)** | Mọi rule có `WithMessage` tiếng Việt. Thiếu `WithErrorCode`: `UpdateItineraryMetadataCommandValidator.cs:12-13` (`ItineraryId`), xem **WR-02**. Thứ tự: POST là điểm đến (`:15-18`), tên (`:20-24`), số ngày (`:26-29`), sở thích (`:31-33`), khớp mục 6 hợp đồng (`04-BE-CONTRACT.md:270`). PUT là Id, tên, mô tả, điểm đến, sở thích, ảnh bìa (`:12-42`). Độ dài đo sau `Trim`: tên `Create...Validator.cs:23`, `Update...Validator.cs:18`; mô tả `:22`; URL ảnh đo trên `TrimmedCoverImages` (`Update...Validator.cs:35,40`; `...Extensions.cs:31`). |
| W-4 | Mã lỗi mới chứa `NotFound/Conflict/AlreadyExists/Unauthorized/Forbidden` mà không định map 404/409/401/403 | PASS | 14 mã mới/đổi: `Itinerary.DestinationRequired/DestinationUnknown/DayCountOutOfRange/TooManyInterests/InterestUnknown/InterestDuplicated/TooManyCoverImages/CoverImageInvalidUrl/CoverImageTooLong/CoverImageDuplicated/CoverSelectionInvalid`, `ItineraryTitle.Empty/TooLong`, `ItineraryDescription.TooLong`. Không mã nào chứa các chuỗi con trên. |
| W-5 | Controller: thiếu `CancellationToken`, `LogInformation` đầu action, `HandlerFailure`, `[ProducesResponseType]`, bind Command trực tiếp, `HttpPatch` | PASS | `Create` (`ItinerariesController.cs:27-45`): `ct` `:27`, log `:29`, `HandlerFailure` `:38-39`, `[ProducesResponseType]` 201/400/401 `:24-26`, bind `CreateItineraryRequest` `:27`. `UpdateMetadata` (`:89-110`): `ct` `:92`, log `:94`, `HandlerFailure` `:106-107`, 200/400/403/404 `:85-88`, bind `UpdateItineraryMetadataRequest` `:91`. Không có `HttpPatch` trong controller. Ghi chú nhỏ: PUT không khai 401 dù có `[Authorize]`, xem IN-11. |
| W-6 | Handler/Repository bỏ `ct` khi API cho phép | PASS | `GetOwnedItineraryAsync(..., ct)` (`Update...Handler.cs:33-34`), `AddAsync(..., ct)` (`Create...Handler.cs:62`), `SaveChangesAsync(ct)` (`Create...Handler.cs:63`, `Update...Handler.cs:60`). `UpdateAsync(itinerary)` (`Update...Handler.cs:59`) thuộc ngoại lệ không báo. `GetDefaultCoverUrl` là đồng bộ, không có `ct` để truyền. |
| W-7 | `.Result`/`.Wait()`/`GetAwaiter().GetResult()` | PASS | Grep toàn `src/` (trừ Migrations, obj, bin): 0 kết quả. |
| W-8 | `DateTime.Now` hoặc thời gian không UTC | PASS | Không có `DateTime.Now`. Code mới dùng `DateTimeOffset.UtcNow` (`Itinerary.cs:80,81,135`). |
| W-9 | Cấu hình mới không qua Options Pattern, thiếu `ValidateOnStart`, dùng `set`, option không dùng | PASS (có Info) | `DestinationCatalogOptions.cs:5` `const SectionName`, `:6` `init`, mặc định `string.Empty` (không hợp lệ nên khởi động sẽ báo lỗi, an toàn hơn đoán). `DependencyInjection.cs:34-44` `AddOptions...Bind...Validate x2...ValidateOnStart()`. Dùng tại `DestinationCoverProvider.cs:16,24`. Kẽ hở kiểm tra giá trị: xem WR-06 (nay Info). |
| W-10 | Truy vấn danh sách không phân trang/giới hạn `PageSize`; DTO có trường đếm mà truy vấn không `Include` | **FAIL, nhưng bỏ qua vì nợ đã ghi nhận** | `ToSummaryDto` (diff sửa, `ItineraryExtensions.cs:46-47`) trả `Days.Count`/`Waypoints.Count`, còn `GetMyItinerariesPagedAsync` (`ItineraryRepository.cs:26-38`, có từ trước) không `Include` nên giá trị là 0 (IN-08). Đã ghi trong hợp đồng phần "Ngoài phạm vi" (`04-BE-CONTRACT.md:26`), thuộc "Bỏ qua: nợ đã ghi nhận", không báo mới. Phân trang `PageSize` không đổi trong diff. |
| W-11 | Endpoint ẩn danh mới ghi dữ liệu/kiểm mật khẩu thiếu `[EnableRateLimiting]` | KHÔNG ÁP DỤNG | Diff không thêm endpoint ẩn danh. |
| W-12 | Message cho client bằng tiếng Anh hoặc lộ chi tiết nội bộ | PASS | Mọi `WithMessage` và `DomainErrors` mới bằng tiếng Việt, không có stack trace/SQL/tên bảng. Ngoại lệ ProblemDetails tiếng Anh của MVC khi `title` thiếu: có từ trước (WR-01, nay Info). |
| W-13 | Ghi email vào log | **FAIL có từ trước** | `AuthController.cs:30,46` ghi `{Email}`. File không có trong diff. Xem **WR-07**. Code C1..C12 không ghi email (`ItinerariesController.cs:29` ghi tiêu đề, các log khác ghi ID). |
| W-14 | Thêm/đổi endpoint mà `API_ENDPOINTS.md` không đổi | PASS | Cả ba dòng 97, 100, 109 đổi trong cùng diff. Thiếu chi tiết luật: IN-06. |

#### code-review.md: Ngưỡng gợi ý (đo thật, đếm dòng của thân phương thức)

| Ngưỡng | Số đo | Kết quả |
|--------|-------|---------|
| Handler dài hơn khoảng 80 dòng | `CreateQuickDraft...Handler.Handle` 30 dòng (`:37-66`); `UpdateItineraryMetadata...Handler.Handle` 33 dòng (`:31-63`) | PASS |
| Constructor nhận hơn 5 phụ thuộc | Create: 4 (`:24-29`); Update: 3 (`:21-24`) | PASS |
| Action controller dài hơn khoảng 25 dòng (không tính attribute) | `Create` 19 dòng (`:27-45`); `UpdateMetadata` 22 dòng (`:89-110`) | PASS |
| Class dài hơn khoảng 300 dòng | `Itinerary.cs` **313 dòng** (bản `HEAD` 200 dòng, diff +113). `ItinerariesController.cs` 243 dòng. | Itinerary: vượt ngưỡng, ghi Info (**IN-09**). Controller: PASS |

#### coding-rules.md: Không bao giờ

| Ý | Kết quả | Bằng chứng |
|----|---------|-----------|
| Ghi token/mật khẩu/`SecretKey`/`BffSharedSecret` vào log, URL, response | PASS (trong diff) | Xem C-1. |
| Commit bí mật vào `appsettings*.json` | **FAIL có từ trước** | CR-02. Diff không thêm bí mật. |
| Đặt cookie từ BE | PASS | Không có `Cookies.Append` trong diff. |
| `AllowCredentials` + wildcard | KHÔNG ÁP DỤNG | Diff không đụng CORS. |
| `EnableSensitiveDataLogging`/`EnableDetailedErrors` ngoài Development | **FAIL có từ trước** | CR-01. |
| Business rule trong Handler/Infrastructure | PASS (xem W-1, IN-10) | |
| Import EF/HttpClient/DataAnnotations vào Domain/Application; inject DbContext vào Handler; Application tham chiếu Persistence/Infrastructure | PASS | Xem C-6. Hai handler chỉ inject `IUnitOfWork`, `ICurrentUserService`, repository, `IDestinationCoverProvider`. |
| Dùng `HttpPatch` | PASS | PUT cho metadata (`ItinerariesController.cs:84`). |
| Throw exception cho lỗi nghiệp vụ | PASS | Xem W-2. |
| `new Error(...)` rải rác | PASS | Xem W-2. |
| Mã lỗi chứa `NotFound/...` ngoài ý muốn | PASS | Xem W-4. |
| Sửa tay migration/snapshot | PASS (có điều kiện) | Chỉ thêm SQL tay vào `Up()`, đúng việc coding-rules yêu cầu cho migration chuyển dữ liệu. Snapshot khớp model (lượt 1: `HasPendingModelChanges = False`). |
| `.Result/.Wait()/GetAwaiter().GetResult()` | PASS | Xem W-7. |
| `DateTime.Now` | PASS | Xem W-8. |

#### coding-rules.md: Luôn làm

| Ý | Kết quả | Bằng chứng |
|----|---------|-----------|
| Controller kế thừa `ApiController`, nhận `ct` và truyền xuống `Send` | PASS | `ItinerariesController.cs:14,31-37,105`. |
| Dòng đầu action ghi `LogInformation` tiếng Việt, không chứa token/mật khẩu | PASS | `:29`, `:94`. |
| `if (result.IsFailure) return HandlerFailure(result);` rồi mới `Ok/Created` | PASS | `:38-39`, `:106-107`. |
| Bind body bằng Request contract riêng | PASS | `Contracts/V1/Itineraries/Requests/CreateItineraryRequest.cs`, `UpdateItineraryMetadataRequest.cs`. |
| `ApiResponse<T>`/`ApiResponse.Success(message)` và `[ProducesResponseType]` | PASS | `:41-44`, `:109`. Xem IN-11. |
| Endpoint ẩn danh ghi dữ liệu có `[EnableRateLimiting]` | KHÔNG ÁP DỤNG | |
| Handler chỉ điều phối, một file một handler, `SaveChangesAsync(ct)`, map DTO, trả `Result` | PASS | Hai handler, xem W-6. |
| Ghi trên Itinerary qua `GetOwnedItineraryAsync` | PASS | `Update...Handler.cs:33`. |
| `RuleFor` có `WithMessage` tiếng Việt và `WithErrorCode("Feature.PascalReason")`; thứ tự khối form; đo độ dài sau `Trim` | **FAIL (1 rule)** | WR-02. Phần còn lại PASS, xem W-3. |
| Trường đếm/DTO lồng chỉ trả khi truy vấn đã `Include` | FAIL có từ trước, đã ghi nhận | Xem W-10. |
| Danh sách phân trang: validator ép `PageIndex >= 1`, `PageSize` 1..100 | KHÔNG ÁP DỤNG | Không đổi trong diff. |
| Invariant nằm trong Entity/ValueObject (factory trả `Result`, setter private) | **PASS một phần** | Setter private ở `Itinerary.cs:12-21`; `SetCoverImages` trả `Result` (`:96-111`). Nhưng giới hạn 5 ảnh, https, 500 ký tự, không trùng, mã danh mục và khoảng 1..30 ngày chỉ kiểm ở validator (IN-04, IN-10). |
| Entity đổi trạng thái thì cập nhật `UpdatedAt = DateTimeOffset.UtcNow` | PASS (có ngoại lệ) | `UpdateMetadata` đặt `UpdatedAt` (`:135`). `SetCoverImages` là phương thức public tự đổi trạng thái nhưng không đặt `UpdatedAt` (`:96-111`); hiện chỉ được `UpdateMetadata` và `CreateQuickDraft` gọi nên không lệch. Đưa vào IN-10. |
| Mapping chỉ bằng Fluent API trong `Configurations/<Entity>Configuration.cs` | PASS | `ItineraryConfiguration.cs:37-46` (diff thêm 10 dòng). |
| Port ở `Abstractions`, adapter ở `Infrastructure/Implementations` | PASS | `Application/Abstractions/DestinationCover/IDestinationCoverProvider.cs`; `Infrastructure/Implementations/DestinationCover/DestinationCoverProvider.cs`; đăng ký `DependencyInjection.cs:65`. |
| Options: `const SectionName`, `init`, mặc định an toàn, `.Validate(...).ValidateOnStart()`, option đều được dùng | PASS | Xem W-9. |
| Migration tạo bằng `dotnet ef migrations add`, SQL tay cho chuyển dữ liệu, ghi sao lưu/quay lui trong PR, chạy thử trên DB phát triển | PASS một phần | Tên `Add_Itinerary_Destination_Interests_CoverImages` đúng định dạng gạch dưới; SQL tay có (`:40-54`); đã chạy trên DB phát triển (hợp đồng `:59`). Mô tả PR chưa tồn tại: C-7, IN-12. |

#### coding-rules.md: Hợp đồng với FE

| Ý | Kết quả | Bằng chứng |
|----|---------|-----------|
| Envelope `ApiResponse` (`status`, `data`, `message`, `errorCode`, `timestamp`) | PASS | Không đổi trong diff; `API_ENDPOINTS.md:115`. |
| `AuthResponse`/`TokenResponse`, refresh token xoay vòng, logout, `ExpiryMinutes` >= 3 | KHÔNG ÁP DỤNG | Diff không đụng Auth. `ExpiryMinutes` là 60 (`appsettings.json:19`), không đổi. |
| `errorCode` đã phát hành không đổi tên hay xóa | PASS | Xem C-5. Ngoại lệ lệch hợp đồng nhưng không phải đổi tên: `title` thiếu/null và `ItineraryId` rỗng (WR-01, WR-02). |
| `PUT`: `destinationCode`/`interests` null = giữ; `coverImages` null = giữ, `[]` = xóa | PASS | `Itinerary.cs:123-134`; `UpdateItineraryMetadataCommand.cs:19-21`. |
| Mã điểm đến (34) và mã sở thích (7) bất biến, khớp từng ký tự | PASS | `DestinationCatalog.cs:5-40`, `InterestCatalog.cs:6-14`; đã so từng ký tự ở lượt 1. |
| Rate limit auth | KHÔNG ÁP DỤNG | |
| Đổi endpoint/body/mã lỗi/nghĩa null thì cập nhật `API_ENDPOINTS.md` cùng commit | PASS (có ghi chú) | Xem C-5, W-14; IN-06 về mã lỗi chưa liệt kê. Xóa `coverImageUrl` khỏi PUT là thay đổi hợp đồng đã chấp nhận, đã phản ánh ở `API_ENDPOINTS.md:100`. |
| Trước khi báo xong chạy `dotnet build` ở gốc | PASS một phần | Xem mục (4): `Tripory.slnx` lỗi vì tệp bị khóa, build từng project thì sạch. |

#### Các ý (a) đến (l) bạn nêu, tra nhanh

| Ý | Kết quả | Tham chiếu |
|---|---------|-----------|
| (a) `ct` truyền đủ | PASS | W-6 |
| (b) Controller | PASS | W-5 |
| (c) `new Error` inline mới | PASS | W-2 (`WithErrorCode` của validator khác `new Error`; không có `new Error` mới nào trong diff) |
| (d) Validator | FAIL 1 rule | W-3, WR-02 |
| (e) Options Pattern | PASS | W-9 |
| (f) Import xuyên tầng, `ProjectReference` | PASS | C-6 |
| (g) Business rule đặt sai tầng | Có Info, không có Warning | IN-10 |
| (h) Hợp đồng FE | PASS | C-5 |
| (i) Ngưỡng | PASS, riêng `Itinerary.cs` 313 dòng | IN-09 |
| (j) Migration | Điều kiện | C-7, IN-12 |
| (k) Sensitive logging, bí mật | Trong diff PASS; có từ trước FAIL | CR-01, CR-02 |
| (l) Log | Code mới PASS; có từ trước ghi email | WR-07 |

### (2) Phát hiện mới

#### Critical (có từ trước, ngoài diff C1..C12)

**CR-01: `EnableSensitiveDataLogging` và `EnableDetailedErrors` bật ở mọi môi trường**
**File:** `Tripory.Persistence/DependencyInjection.cs:27-28` (có từ trước; file không nằm trong diff)
**Mô tả.** Hai lời gọi nằm trong `AddDbContext` mà không có điều kiện môi trường, nên chạy cả ở Production. `appsettings.json:4-5` đặt mức log `Default: Information`, khiến giá trị tham số SQL (gồm email, hash mật khẩu, refresh token khi truy vấn bảng người dùng và token) có thể vào log. Steering gắn Critical cho trường hợp này.
**Mức:** Critical theo `code-review.md` ("`EnableSensitiveDataLogging` hoặc `EnableDetailedErrors` chạy ở Production"). `.planning/codebase/CONCERNS.md:77` của BE đã nêu vấn đề; file đó là tài liệu khảo sát, không phải mục cleanup của PR hoặc phase, nên tôi vẫn báo. Nếu bạn coi nó là nợ đã ghi nhận thì chuyển sang "Bỏ qua".
**Gợi ý sửa (không áp dụng ở lượt này):** đưa hai lời gọi vào nhánh `if (environment.IsDevelopment())`, hoặc đọc cờ từ cấu hình mặc định `false`.

**CR-02: Bí mật JWT và mật khẩu DB nằm trong `appsettings.json` đã commit**
**File:** `Tripory.API/appsettings.json:13` (`ConnectionStrings:DefaultConnection` có `Password=postgres`), `:16` (`JwtOptions:SecretKey`). Có từ trước, không thuộc diff (diff chỉ thêm `:22-24`, không có bí mật). `git ls-files` xác nhận cả hai file `appsettings*.json` được theo dõi. Cũng có `Persistence/DependencyInjection.cs:17-18` dùng chuỗi kết nối dự phòng chứa mật khẩu.
**Mô tả.** Khóa ký JWT nằm trong repo nên bất kỳ ai đọc được repo đều tạo được token hợp lệ nếu Production dùng cùng giá trị. Ghi chú: `appsettings.Development.json:16` có `BffSharedSecret` là giá trị giữ chỗ rõ ràng ("dev-bff-secret-change-me"), tôi không tính là bí mật thật.
**Mức:** Critical theo steering ("`SecretKey`, ... mật khẩu DB" trong file cấu hình được commit). `CONCERNS.md:10` đã nêu; cùng nhận định về "nợ đã ghi nhận" như CR-01.
**Gợi ý sửa:** chuyển sang `JwtOptions__SecretKey`, `ConnectionStrings__DefaultConnection` qua biến môi trường hoặc user-secrets; bỏ chuỗi kết nối dự phòng; đổi khóa JWT nếu đã từng dùng ở môi trường thật.

#### Warning

**WR-07: Log ghi email người dùng (có từ trước, ngoài diff)**
**File:** `Tripory.API/Controllers/V1/AuthController.cs:30` (`"...đăng ký tài khoản với email: {Email}"`) và `:46` (`"...đăng nhập từ email: {Email}"`)
**Mô tả.** Khớp đúng dòng "Ghi email người dùng vào log" của mục Warning. Kết hợp với CR-01 (log tham số SQL) làm tăng lượng dữ liệu cá nhân trong log. Không thuộc C1..C12; code của đợt này không ghi email.
**Gợi ý sửa:** bỏ `{Email}` khỏi hai thông điệp, hoặc ghi `UserId` sau khi xác thực xong.

#### Info

**IN-09: `Itinerary.cs` vượt 300 dòng**
**File:** `Tripory.Domain/Entities/Itinerary.cs` (313 dòng; `HEAD` có 200 dòng)
**Mô tả.** Diff thêm 113 dòng (danh mục ảnh bìa, `SetCoverImages`, `FindSelectedCoverIndex`, tạo ngày). Vẫn mạch lạc, một aggregate. Chỉ ghi nhận theo "Ngưỡng gợi ý".
**Gợi ý:** nếu thêm hành vi ảnh bìa nữa, cân nhắc tách `CoverImages` thành value object (kết hợp gợi ý IN-10).

**IN-10: Một số quy tắc dữ liệu ảnh bìa đặt ở Application thay vì Domain**
Không có mục nào đủ điều kiện Warning (steering chỉ nêu Handler và Infrastructure), nên mức Info. Phân tích từng chỗ:
- **Đặt chưa đúng tầng.** `UpdateItineraryMetadataCommand.cs:19-21` (`TrimmedCoverImages`) thực hiện việc trim URL, một chuẩn hóa dữ liệu, trong lớp Command. `Itinerary.SetCoverImages` (`Itinerary.cs:96-111`) lưu đúng chuỗi nhận được, nên một caller khác (không đi qua Command) sẽ lưu được URL có khoảng trắng. Handler (`Update...Handler.cs:54`) phải nhớ truyền `TrimmedCoverImages` thay vì `CoverImages`. Nên để Domain tự trim.
- **Bất biến chỉ có ở validator.** Giới hạn 5 ảnh, https, 500 ký tự, không trùng (`ItineraryRuleBuilderExtensions.cs:8-9,27-34`), mã danh mục và khoảng 1..30 ngày (`CreateQuickDraftItineraryCommandValidator.cs:10-11,26-29`) không có trong Domain, trái lời "Invariant nằm trong Entity/ValueObject" của coding-rules. Chi tiết hậu quả: IN-04.
- **Trùng lặp quy tắc.** Điều kiện nhất quán giữa số ảnh và chỉ số chọn có ở hai nơi: `UpdateItineraryMetadataCommandValidator.cs:45-54` và `Itinerary.cs:98-106`. Hai bản có thể lệch nhau khi sửa một chỗ.
- **Chấp nhận được.** Handler Create (`:47-48`) chỉ dựng mảng một phần tử từ URL mặc định rồi giao cho `CreateQuickDraft` chọn chỉ số 0 (`Itinerary.cs:89`): đó là điều phối. `DestinationCoverProvider.cs:19-25` ghép URL từ cấu hình là việc của adapter.
- **`UpdatedAt`.** `SetCoverImages` là phương thức public đổi trạng thái nhưng không cập nhật `UpdatedAt` (coding-rules yêu cầu); hiện không lệch vì chỉ `UpdateMetadata` gọi nó và đặt `UpdatedAt` ngay sau.
**Gợi ý:** tạo value object `CoverImageUrl`/`CoverImageList` (factory trả `Result`) chứa trim, https, độ dài, trùng, tối đa 5, rồi để validator gọi lại hằng số của nó. Việc này cũng giải quyết IN-04 và IN-07 (hằng 500 nhân đôi).

**IN-11: PUT metadata không khai báo 401**
**File:** `ItinerariesController.cs:85-88` so với `:24-26`
`Create` khai 401, `UpdateMetadata` thì không dù cùng `[Authorize]`. Coding-rules nói "phù hợp" nên không phải vi phạm; chỉ không nhất quán. Gợi ý: thêm `[ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]`.

**IN-12: Mô tả PR cần ghi bước sao lưu và quay lui cho migration; `Down()` không khôi phục dữ liệu**
**File:** `Tripory.Persistence/Migrations/20261103085252_Add_Itinerary_Destination_Interests_CoverImages.cs:49-54` (đặt `CoverImageUrl` về `NULL`), `:60-73` (`DropColumn` x3)
Không có `AlterColumn` thu hẹp. `Down()` gỡ cột nhưng không phục hồi URL đã bị bỏ ở `Up()` (đã nêu ở IN-05). Hợp đồng đã có bước sao lưu và quay lui (`04-BE-CONTRACT.md:437,444`) và C10 báo đã chạy trên DB phát triển (`:59`), nhưng steering yêu cầu bước này nằm trong PR. Nếu PR không ghi, mục này trở thành Critical theo C-7. Gợi ý: dán mục 10 bước 1, 2, 6 và đoạn "Quay lui" vào mô tả PR.

### (3) Đổi mức theo steering

| Mã | Mức lượt 1 | Mức mới theo steering | Lý do | Ưu tiên sửa (đề xuất) |
|----|-----------|----------------------|-------|-----------------------|
| WR-01 | Warning | **Info** | Không khớp dòng Warning nào. Hành vi `string Title` không nullable có từ trước. Chỉ lệch chữ của hợp đồng (`04-BE-CONTRACT.md` mục 7, 9). | Trung bình. Sửa `string?` hoặc sửa hợp đồng trước nghiệm thu 04-25. |
| WR-02 | Warning | **Warning** (giữ) | Khớp "Validator có `RuleFor` thiếu `WithErrorCode`". Nằm trong file validator có sửa ở diff. | Cao. |
| WR-03 | Warning | **Info** | Không khớp dòng nào; `UpdateAsync` được miễn tham số `ct` nhưng vấn đề nằm ở `DbSet.Update` đánh dấu cả hàng. Mẫu có từ trước. | Trung bình. Nên bỏ `UpdateAsync` ở handler này. |
| WR-04 | Warning | **Info** | Không khớp dòng nào. Migration không phá dữ liệu ngoài phần D-104 đã chấp nhận. Ghi chú sao lưu/quay lui: IN-12. | Cao nếu có dữ liệu ảnh thật: siết điều kiện SQL trước khi chạy trên DB thật. |
| WR-05 | Warning | **Info** | Không khớp dòng nào (steering chỉ yêu cầu giới hạn cho truy vấn danh sách). | Thấp đến trung bình. |
| WR-06 | Warning | **Info** | Điều steering đòi (Options Pattern, `init`, `ValidateOnStart`, option được dùng) đều PASS; còn lại là độ chặt của phép kiểm giá trị. | Thấp: giá trị do người vận hành đặt. |
| IN-01 đến IN-08 | Info | Info (không đổi) | IN-04 và IN-05 liên quan C-7 và coding-rules về invariant; xem IN-10 và IN-12. IN-08 (đếm `/mine`) thuộc nợ đã ghi nhận ở `04-BE-CONTRACT.md:26`, nên không báo thành Warning. IN-08 mục "appsettings chứa `SecretKey` và `EnableSensitiveDataLogging`" nay là CR-01 và CR-02 (Critical theo steering, có từ trước). | |

### (4) Kết quả build

| Lệnh | Kết quả |
|------|---------|
| `dotnet build Tripory.slnx --no-restore` (tại gốc repo BE) | **Lỗi**, 50 cảnh báo, 10 lỗi, đều là `MSB3026` (cảnh báo thử lại) và `MSB3027`/`MSB3021` (không sao chép được `Tripory.Domain.dll`, `Tripory.Application.dll`, `Tripory.Infrastructure.dll`, `Tripory.Persistence.dll`, `BuildingBlocks.Core.dll` vào `Tripory.API\bin\Debug\net10.0\`). Thông báo: tệp đang bị tiến trình "Tripory.API (47000)" khóa. Không phải lỗi biên dịch C#. |
| `dotnet build Tripory.Domain.csproj --no-restore -o %TEMP%\tripory-check-Tripory.Domain` | Thành công, 0 cảnh báo, 0 lỗi. |
| `dotnet build Tripory.API\Tripory.API.csproj --no-restore -o C:\Users\OS\AppData\Local\Temp\tripory-api-check` (kéo theo build Application, Infrastructure, Persistence, BuildingBlocks.Core qua `ProjectReference`) | **Thành công, 0 cảnh báo, 0 lỗi**, mã thoát 0. |

Các lệnh build Application, Infrastructure, Persistence riêng với `-o` có đầu ra bị cắt trong phiên chạy nên tôi không dùng làm bằng chứng; bản build của `Tripory.API` đã biên dịch cả bốn project đó. Không chạy `dotnet ef`, không chạy API, không đụng DB, không sửa code BE, không commit.

---

_Reviewed: 2026-11-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Trạng thái xử lý (cập nhật 2026-11-04)

Các thay đổi nằm trong working tree của `tripory_be`, chưa commit. Cột "Bằng chứng" chỉ ghi những gì đã kiểm thật.

| Mã | Mức (steering) | Trạng thái | Cách xử lý | Bằng chứng |
|----|----------------|------------|------------|------------|
| WR-01 | Info | Đã sửa | `Title` là `string?` ở `CreateItineraryRequest`, `UpdateItineraryMetadataRequest` và cả hai command; hai validator đo độ dài bằng `(title ?? string.Empty).Trim()`. `title` thiếu hoặc `null` giờ ra `ItineraryTitle.Empty`. | Build `Tripory.API` sạch (0 lỗi, 0 cảnh báo). Chưa gọi request thật. |
| WR-02 | Warning | Đã sửa | Rule `ItineraryId` của validator PUT có `WithErrorCode("Itinerary.InvalidId")`. Mã mới, chưa có trong mục 9 của hợp đồng. | Build sạch. Chưa gọi request thật. |
| WR-03 | Info | Đã sửa | Handler PUT không gọi `UpdateAsync`; EF theo dõi thực thể nên chỉ ghi các cột thật sự đổi. | Build sạch. Phân tích change tracking ở lượt 1 (EF harness). |
| WR-04 | Info | Đã sửa bằng migration mới | `20261104034058_Clean_Itinerary_Cover_Images` (chỉ SQL): bỏ URL không khớp luật validator khỏi `CoverImageUrls`, chỉnh `CoverImageUrl` về phần tử đầu hoặc `NULL`. `Down()` trống, có ghi chú. | SQL thử trên DB tạm với 8 dòng mẫu, đúng cả 8. Đã áp dụng lên `tripory_db`: 16 dòng, không dòng nào có ảnh bìa, không vi phạm bất biến. Chưa chạy trên dữ liệu thật có ảnh. |
| WR-05 | Info | Đã sửa | `TrimmedCoverImages` tính một lần; `[RequestSizeLimit(32 KB)]` cho POST và PUT. | Build sạch. Chưa thử trả 413. |
| WR-06 | Info | Đã sửa | `DestinationCatalogOptions.IsAbsoluteHttpsUrl`; kiểm `null`, khoảng trắng, `?`, `#`, host, kết thúc bằng `/`, độ dài tối đa (500 trừ slug dài nhất trừ `.jpg`); thông điệp đã đúng tên. | Build sạch. Host khởi động ở Development với giá trị hiện tại. Chưa thử giá trị URL sai. |
| CR-01 | Critical | Đã sửa | `EnableSensitiveDataLogging` và `EnableDetailedErrors` chỉ bật khi `Persistence:EnableSensitiveDataLogging` là `true`; chỉ `appsettings.Development.json` đặt `true`. | Build sạch. Chưa kiểm log SQL ở Production. |
| CR-02 | Critical | Đã sửa phần code, CÒN việc ngoài code | Bỏ `SecretKey` và `ConnectionStrings` khỏi `appsettings.json`; bỏ chuỗi kết nối dự phòng; `JwtOptions.MinSecretKeyLength = 32` kiểm ở `Program.cs` và `Validate`; thêm `UserSecretsId`; đã đặt khóa mới và chuỗi kết nối vào user-secrets máy dev. | Development khởi động được; Production không có secrets bị từ chối với `InvalidOperationException`. **Chưa làm:** đổi khóa JWT và mật khẩu DB ở Production (khóa cũ còn trong lịch sử git), đặt `JwtOptions__SecretKey` và `ConnectionStrings__DefaultConnection` bằng biến môi trường. |
| WR-07 | Warning | Đã sửa | Hai log đăng ký và đăng nhập trong `AuthController` không còn `{Email}`. | Build sạch. |

**Info đã xử lý một phần:** IN-07 (bỏ `using` thừa trong `CreateItineraryRequest`, sửa thông điệp options sai tên); IN-11 (PUT khai 401); IN-12 (`Down()` của migration mới có ghi chú không khôi phục dữ liệu).

**Chưa xử lý:** IN-01 (thông điệp validator khác value object), IN-02 (thứ tự kiểm ảnh theo từng phần tử, `selectedCoverIndex` đứng một mình), IN-03 (URL có userinfo/host nội bộ), IN-04 và IN-10 (bất biến ảnh bìa chỉ ở validator, đề xuất value object), IN-05 (migration đầu chưa idempotent, chưa báo số dòng bị bỏ), IN-06 (`API_ENDPOINTS.md` chưa liệt kê luật và mã lỗi), IN-08 (`/mine` có `DaysCount` bằng 0, nợ đã ghi nhận), IN-09 (`Itinerary.cs` dài 313 dòng), phần còn lại của IN-07 (hằng 500 nhân đôi, kiểu ngoặc `IsKnown`, log tiêu đề).

**Chưa kiểm:** chưa chạy POST, PUT, GET thật vào API với PostgreSQL (để lại, kiểm khi ghép với FE); không còn mục chưa build: `dotnet build Tripory.slnx --no-restore` ở gốc repo BE đã thành công (0 lỗi, 0 cảnh báo) sau khi `Tripory.API` được dừng.
