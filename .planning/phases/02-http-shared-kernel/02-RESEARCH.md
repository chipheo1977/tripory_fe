# Phase 2: HTTP & Shared Kernel - Research

**Researched:** 2026-10-12
**Domain:** HTTP client bằng `fetch` (bóc envelope, chuẩn hóa lỗi ASP.NET Core 10), single-flight refresh, branded id/VO thuần TS, chọn message lỗi tiếng Việt
**Confidence:** HIGH cho hình dạng lỗi BE và contract refresh (đọc code BE, ghi file:dòng). MEDIUM cho hành vi mặc định của ASP.NET khi body rỗng (đọc Program.cs + docs, chưa gọi API thật).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Nghiệm thu toast**
- **D-01:** Phase 2 không mount `<Toast />` (molecule Sonner trong `ui-web`) và không mount `QueryClientProvider`. Phase 3 mount cả hai và nối toast vào mutation khi có thao tác ghi thật đầu tiên.
- **D-02:** Phase 2 chứng minh FND-05 bằng unit test của các phần thuần: chuẩn hóa lỗi (`api-client`), chọn message và quyết định có hiện toast hay không. Không tạo route demo hay trigger debug.

**Nội dung message lỗi**
- **D-03:** Copy hiển thị là **tiếng Việt do FE viết, map theo `errorCode`** của BE. Nếu `errorCode` không có trong bảng map thì dùng `message` của BE làm dự phòng.
- **D-04:** Lỗi không có `errorCode` khớp bảng map và cũng không có `message` BE (lỗi mạng, timeout, 5xx body rỗng, 401/404 body rỗng) thì hiện **một câu chung duy nhất: "Đã có lỗi xảy ra, vui lòng thử lại"**. Không chia câu riêng theo từng loại.
- **D-05:** Lỗi validation (`ValidationProblemDetails` và lỗi validate trong envelope) đi vào `ApiError.fieldErrors` để **gắn vào từng ô form**, không hiện thành toast.
- **D-06:** Nếu lỗi validation có field không khớp ô nào của form, hoặc thao tác không có form, thì hiện **toast lỗi với message của field đầu tiên**.

**Chính sách toast**
- **D-07:** Toast thành công là **opt-in theo từng mutation, mặc định tắt**. Thao tác rời rạc như tạo, xóa, xuất bản, đổi mật khẩu thì bật. Autosave của editor (Phase 4) không bật, vì đã có trạng thái Đang lưu / Đã lưu.
- **D-08:** Nội dung toast thành công là **câu ngắn cố định do FE viết cho từng thao tác** (ví dụ "Đã xuất bản lịch trình"), không lấy `message` thành công trong envelope BE.
- **D-09:** Toast lỗi cho thao tác ghi **mặc định bật**. Mutation tự xử lý lỗi (đã gắn lỗi validation vào form theo D-05, hoặc rollback có UI riêng) được tắt.
- **D-10:** Query đọc bị lỗi **chỉ hiện `ErrorState` kèm nút "Thử lại"** tại chỗ, không hiện toast.

**Timeout, retry và refresh**
- **D-11:** Timeout mặc định của request là **30 giây**. Hết thời gian thì request trả `ApiError` dạng timeout, hiển thị câu chung theo D-04.
- **D-12:** **Không tự retry** khi gặp lỗi mạng hoặc 5xx, kể cả với query đọc. Phase 3 khi tạo `QueryClient` phải đặt `retry: false`. Ngoại lệ duy nhất là phát lại request sau khi refresh token thành công (D-13).
- **D-13:** `withSessionRefresh` chỉ làm **refresh phản ứng**: gặp 401 thì gộp mọi request vào **một promise refresh duy nhất (single-flight)** chạy trong `Lock` tiêm vào, rồi phát lại các request. Test chứng minh N request 401 song song chỉ dẫn tới đúng 1 lần gọi refresh, dùng fake lock.
- **D-14:** Refresh thất bại thì `withSessionRefresh` **từ chối mọi request đang chờ bằng `ApiError` có code `session.expired`**, rồi gọi callback **`onSessionExpired`** do composition tiêm vào.
- **D-15:** **Refresh chủ động trước hạn để sang Phase 3.**

### Claude's Discretion
- Phạm vi `shared-kernel`: chọn branded id nào (tối thiểu `UserId`, `ItineraryId`; thêm id khác chỉ khi có ≥ 2 context dùng cùng nghĩa), cách tạo/validate branded id, phạm vi và độ chính xác của `Wgs84Coordinate`.
- Hình dạng cụ thể của `ApiError` và cách nhận diện từng dạng lỗi BE bằng type guard viết tay. `api-client` không dùng `zod`.
- Nơi đặt bảng map `errorCode` → copy tiếng Việt, hàm chọn message và hợp đồng chính sách toast. Đặt ở app (`apps/web`), không đặt trong `api-client`. Bảng map khởi đầu chỉ cần những `errorCode` đã biết từ BE.
- Cho phép override timeout theo từng request, và cách kết hợp `AbortSignal` của caller với timeout.
- API tiêm `Lock` (interface tối thiểu để Phase 3 cài bằng `navigator.locks`) và cách tiêm hàm refresh vào `withSessionRefresh`.

### Deferred Ideas (OUT OF SCOPE)
- Mount `Toast` + `QueryClientProvider`, nối chính sách toast vào `MutationCache` và nghiệm thu toast thật → Phase 3.
- Refresh chủ động trước hạn (exp − 120 s), cookie `tripory_at_exp`, Web Locks thật giữa các tab → Phase 3.
- Bổ sung bảng map `errorCode` → tiếng Việt cho từng context mới → Phase 3 trở đi.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-05 | Người dùng nhận toast phản hồi thành công/thất bại cho mọi thao tác ghi, message lỗi lấy từ BE | Mục "Hình dạng lỗi BE" (6 dạng, có file:dòng), `ApiError` + type guard, bảng map `errorCode` → tiếng Việt, `selectErrorMessage`, `resolveFormError`, hợp đồng `MutationFeedback`. Phase 2 chỉ chứng minh bằng unit test (D-02); toast thật ở Phase 3 |
| (SC-2) | N request 401 song song → 1 lần refresh → phát lại | Mục "withSessionRefresh": single-flight + epoch, fake lock, các ca biên |
| (SC-3) | `shared-kernel` + `api-client` có test, không browser global, lint ranh giới xanh | Mục shared-kernel, ranh giới ESLint, Validation Architecture |
</phase_requirements>

## Summary

BE trả lỗi theo **6 dạng**, không phải 4: (1) envelope `ApiResponse` camelCase từ `HandlerFailure` và `GlobalExceptionHandler`; (2) `ValidationProblemDetails` của `[ApiController]` khi thiếu field hoặc JSON sai kiểu, key là **tên property PascalCase** (`Email`) hoặc **JSON path** (`$.startDate`), message **tiếng Anh**; (3) `ProblemDetails` không có `errors` (415 khi thiếu `Content-Type`); (4) body rỗng (401 JwtBearer, 403 Forbid, 404 sai route constraint, 405); (5) body không phải JSON (HTML từ proxy/host khi 502/503/504); (6) lỗi phía client: mạng, timeout, abort. Phát hiện quan trọng nhất: **lỗi FluentValidation đi qua envelope 400, `errorCode` là tên validator (`NotEmptyValidator`, `MaximumLengthValidator`...), message tiếng Việt cụ thể, nhưng KHÔNG có tên field** (`ValidationPipelineBehavior.cs:40-41` chỉ lấy `ErrorCode` và `ErrorMessage`). Vì vậy D-05 "gắn vào ô form" chỉ làm được với `ValidationProblemDetails`; lỗi FluentValidation rơi vào D-06 (toast message BE). Đây là điểm planner phải biết.

`api-client` nên gồm: type `HttpClient` trả `Promise<unknown>` (context tự parse bằng Zod), `createFetchHttpClient(deps)` tiêm `fetch` và `baseUrl`, hàm thuần `toApiError(status, body)` cho từng dạng lỗi, `ApiError` plain object có `kind`, và `withSessionRefresh(inner, deps)` dùng single-flight **kèm bộ đếm epoch** để 401 đến muộn (sau khi refresh đã xong) chỉ phát lại, không refresh lần hai. Timeout cài bằng `AbortController` + `setTimeout`, không dùng `AbortSignal.any` (iOS Safari < 17.4 không có) và không dùng `AbortSignal.timeout` (Vitest fake timers không điều khiển được).

Phần trình bày (bảng map, `selectErrorMessage`, `resolveFormError`, `MutationFeedback`) đặt ở `apps/web/src/lib/feedback/`. Preset `app()` cho phép import `@tripory/api-client`, chỉ cần thêm `"@tripory/api-client": "workspace:*"` vào `apps/web/package.json`. **Không cần sửa `boundaries.mjs`**. Đề xuất tách `createFetchHttpClient` và `withSessionRefresh` ra subpath `@tripory/api-client/http`, để rule `httpOnlyInComposition` có sẵn tự cấm UI tự dựng client. `shared-kernel` chỉ cần `UserId`, `ItineraryId` (GUID, chuẩn hóa chữ thường) và `Wgs84Coordinate { latitude, longitude }` khoảng đóng [-90, 90] / [-180, 180], số `double`, không làm tròn. Không thêm dependency nào vào catalog.

**Primary recommendation:** Viết `toApiError` thuần + fixture lấy đúng body BE cho cả 6 dạng, test trước; `withSessionRefresh` dùng single-flight + epoch, test bằng fake `HttpClient` và fake lock đếm số lần gọi; trình bày lỗi ở `apps/web/src/lib/feedback` theo thứ tự map → message BE → câu chung.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Gửi request, timeout, bóc envelope | `packages/api-client` (JS thuần, chạy cả browser lẫn Node) | — | Dùng chung client/server/mobile; được dùng `fetch` theo `httpPackage()` |
| Chuẩn hóa lỗi BE → `ApiError` | `packages/api-client` | — | Biết HTTP, không biết UI; type guard tay (không Zod) |
| Single-flight refresh | `packages/api-client` (`withSessionRefresh`) | `apps/web/src/composition` (Phase 3: `navigator.locks`, gọi `/api/auth/refresh`) | Package bị cấm `navigator`; lock và refresh tiêm vào |
| Branded id, `Wgs84Coordinate` | `packages/shared-kernel` | — | VO dùng ≥ 2 context (itinerary, chat, maps, profile) |
| Bảng map `errorCode` → tiếng Việt, chọn message | `apps/web/src/lib/feedback` | — | Là trình bày; mobile sẽ có bản riêng |
| Hợp đồng chính sách toast | `apps/web/src/lib/feedback` (type + hàm thuần) | Phase 3: `MutationCache` + `notify` | Phase 2 không mount provider |
| Hiển thị toast, ErrorState | `packages/ui-web` (đã có) | Phase 3 nối | D-01 |

## Hình dạng lỗi BE (bằng chứng từ code)

Đường dẫn gốc: `tripory_be/src/Services/Tripory/`. Đã đọc trực tiếp ngày 2026-10-12.

| # | Dạng | Khi nào | Body thật | Content-Type | Nguồn |
|---|------|---------|-----------|--------------|-------|
| 1a | Envelope lỗi nghiệp vụ | `HandlerFailure(result)` | `{"status":"error","data":null,"message":"<vi>","errorCode":"Itinerary.NotFound","timestamp":"2026-10-12T08:00:00+00:00"}` | `application/json` | `Tripory.API/Common/Responses/ApiResponse.cs:3-27`, `Controllers/ApiController.cs:19-34` |
| 1b | Envelope 5xx | Exception không bắt | `errorCode: "Server.Error"`, `message: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."`, status 500 | `application/json` | `Middlewares/GlobalExceptionHandler.cs:23-36` |
| 1c | Envelope validate (FluentValidation) | Validator của command fail | `errorCode: "NotEmptyValidator"` (tên validator), `message` tiếng Việt từ `WithMessage`, **không có field**, status 400 | `application/json` | `Tripory.Application/Behaviors/ValidationPipelineBehavior.cs:38-41`; validator không dùng `WithErrorCode` (grep `UseCases/V1/*/Validators`) |
| 2 | `ValidationProblemDetails` | Thiếu/null field non-nullable, JSON sai kiểu (vd. `DateOnly`), body rỗng | `{"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"errors":{"Email":["The Email field is required."]},"traceId":"..."}`; JSON sai kiểu: key `"$.startDate"`, có thể kèm key tên tham số `"command"` | `application/problem+json` | `ApiController.cs:8` (`[ApiController]`), `Program.cs:22` (`AddControllers()` không đăng ký `SystemTextJsonValidationMetadataProvider`), csproj `<Nullable>enable</Nullable>` |
| 3 | `ProblemDetails` không `errors` | 415 khi thiếu `Content-Type: application/json` | `{"type":...,"title":"Unsupported Media Type","status":415,"traceId":...}` | `application/problem+json` | Hành vi mặc định `[ApiController]` (MEDIUM, chưa gọi thử) |
| 4 | Body rỗng | 401 JwtBearer (`[Authorize]`), 403 Forbid, 404 route constraint `{id:guid}` không khớp, 405 | rỗng | — | `Program.cs:35-64` (chỉ có `OnMessageReceived`, không có `OnChallenge`), không có `UseStatusCodePages` (`Program.cs:114-130`); route `ItinerariesController.cs:62..211`, `ChatController.cs:75..198` |
| 5 | Body không phải JSON | Proxy/host trả 502/503/504 (BE ngủ, cold start) | HTML hoặc text | `text/html` | Suy luận từ hạ tầng (LOW), không thuộc code BE |
| 6 | Lỗi client | Mất mạng, timeout 30 s, caller abort | — | — | `fetch` reject `TypeError` / `AbortError` |

Chi tiết cần nhớ:
- **Casing JSON:** `AddControllers()` mặc định System.Text.Json camelCase, không có `AddJsonOptions` trong repo BE (grep `JsonSerializerOptions|AddJsonOptions` không có kết quả). Envelope thành công vẫn có `"errorCode": null` (không bật `DefaultIgnoreCondition`). `status` của envelope là **chuỗi** `"success"`/`"error"`, còn `status` của ProblemDetails là **số**. Đây là khóa để phân biệt hai dạng. [VERIFIED: code BE]
- **Map errorCode → HTTP** dựa trên `Contains` (`ApiController.cs:26-33`): chứa `NotFound` → 404, `Conflict`/`AlreadyExists` → 409, `Unauthorized` → 401, `Forbidden` → 403, còn lại → 400. Hệ quả: `Auth.InvalidCredentials` (sai mật khẩu) là **400**, không phải 401, nên đăng nhập sai không kích hoạt refresh. `Auth.Unauthorized` là **401 có body envelope**. [VERIFIED: code BE]
- **Field rỗng `""` trong JSON không ra ProblemDetails.** Docs ASP.NET Core 10: implicit `[Required(AllowEmptyStrings = true)]` cho non-nullable; chỉ thiếu field hoặc `null` mới lỗi ở bước model binding. `""` đi tiếp tới FluentValidation (`NotEmpty`) và ra envelope 1c. [CITED: learn.microsoft.com/aspnet/core/mvc/models/validation?view=aspnetcore-10.0]
- **Key của `errors`:** mặc định là tên property (`Email`, PascalCase), JSON path khi deserialize lỗi (`$.startDate`), tên tham số hoặc chuỗi rỗng khi cả body hỏng (`command`, `""`). [CITED: cùng trang docs, mục "Use JSON property names in validation errors"; MEDIUM cho key `$.x`/`command`]
- **FluentValidation ErrorCode mặc định là tên validator** (vd. `NotNullValidator`). BE không gọi `WithErrorCode`, nên `firstFailure.ErrorCode ?? "Validation.Error"` luôn ra tên validator. [CITED: docs.fluentvalidation.net/en/latest/error-codes.html] [VERIFIED: grep validator BE]
- **Exception domain** (`NotFoundException`, `ConflictException`, `ItineraryDomainException`...) có định nghĩa nhưng **không chỗ nào `throw`** (grep `throw new \w+Exception` chỉ ra `InvalidOperationException`). Thực tế `GlobalExceptionHandler` chỉ sinh `Server.Error` 500. [VERIFIED: grep]
- **WWW-Authenticate:** JwtBearer mặc định trả `WWW-Authenticate: Bearer` khi không có token, và `Bearer error="invalid_token", error_description="The token expired at '...'"` khi token hết hạn (`IncludeErrorDetails` mặc định true, BE không tắt). Có thể phân biệt được, nhưng **chỉ có ích ở server (BFF Phase 3)**: trình duyệt không gọi thẳng BE, và header này không được expose qua CORS. Phase 2 không cần đọc header. [ASSUMED: hành vi mặc định JwtBearer; Program.cs không cấu hình `Events.OnChallenge`]
- **Lỗi validate từ tầng domain** (`Email.InvalidFormat`, `ItineraryTitle.TooLong`, `Coordinate.InvalidLatitude`...) đi qua envelope 400 với `errorCode` có nghĩa, message tiếng Việt, cũng không có field.

### Contract refresh token (chỉ để thiết kế interface)

- `POST /api/v1/auth/refresh-token`, `[AllowAnonymous]` (controller không có `[Authorize]` ở cấp class), body `RefreshTokenCommand { accessToken, refreshToken }`, cả hai bắt buộc (`AuthController.cs:49-61`, `RefreshTokenCommand.cs:6-9`, `RefreshTokenCommandValidator.cs:10-11`).
- Thành công 200: `data: TokenResponse { accessToken, refreshToken, expiresAt }` (`TokenResponse.cs:3-7`). `expiresAt` là hạn của **refresh token**, cố định +7 ngày (`RefreshTokenCommandHandler.cs:65`).
- Thất bại đều là **400** (không mã nào chứa `Unauthorized`): `Token.InvalidAccessToken`, `Token.UserUnavailable`, `Token.InvalidRefreshToken`, `Token.Compromised` (reuse detection, thu hồi mọi refresh token, `:52-58`), `Token.Expired` (`:60-61`). Access token rỗng/hỏng có thể làm `GetPrincipalFromExpiredToken` ném exception → 500 `Server.Error` (PITFALLS P2).
- Hệ quả cho `withSessionRefresh`: hàm refresh tiêm vào phải tự phân loại kết quả (hết phiên hay lỗi tạm thời). `api-client` không biết route `/api/auth/refresh` hay cookie; Phase 3 cài.

### Danh sách errorCode và copy tiếng Việt đề xuất

Quy tắc chọn: **chỉ map khi FE viết được câu tốt hơn mà không chép luật của BE**. Mã có message BE chứa số giới hạn động (`{MaxLength}`, lý do khóa tài khoản) thì **không map**, để dùng message BE (D-03), tránh lệch khi BE đổi giới hạn (tài liệu kiến trúc mục 9 "Sao chép luật của BE"). Mã có message BE tiếng Anh thì bắt buộc map.

| errorCode | HTTP | Nguồn | Copy FE đề xuất |
|-----------|------|-------|-----------------|
| `Auth.Unauthorized` | 401 | `Domain/Errors/DomainErrors.cs:9-12` | "Vui lòng đăng nhập để tiếp tục." |
| `Auth.InvalidCredentials` | 400 | `DomainErrors.cs:14-17` | "Email hoặc mật khẩu không đúng." |
| `Auth.InvalidCurrentPassword` | 400 | `DomainErrors.cs:19-22` | "Mật khẩu hiện tại không đúng." |
| `Auth.UserBanned` | 400 | `DomainErrors.cs:24-27` | *(không map: message BE có lý do khóa)* |
| `User.NotFound` | 404 | `DomainErrors.cs:29-32` | "Không tìm thấy người dùng." |
| `User.EmailAlreadyExists` | 409 | `Handlers/RegisterCommandHandler.cs:47` | "Email này đã được đăng ký." |
| `User.InvalidFullName` | 400 | `Entities/User.cs:46,72` | "Họ và tên không được để trống." |
| `User.BioTooLong` | 400 | `User.cs:75` | *(không map: có `{MaxBioLength}`)* |
| `User.InvalidPassword` | 400 | `User.cs:43` | câu chung D-04 (lỗi nội bộ, không phải lỗi người dùng) |
| `Email.Empty` / `Email.InvalidFormat` | 400 | `ValueObjects/Email.cs:24,32` | "Vui lòng nhập email." / "Email không đúng định dạng." |
| `Email.TooLong` | 400 | `Email.cs:29` | *(không map)* |
| `Handle.Empty` / `Handle.InvalidFormat` | 400 | `ValueObjects/Handle.cs:24,31` | *(không map: message BE đã mô tả luật)* |
| `Token.InvalidAccessToken`, `Token.InvalidRefreshToken`, `Token.Invalid`, `Token.Expired` | 400 | `RefreshTokenCommandHandler.cs:33,39,49,61`; `User.cs:128` | "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." |
| `Token.Compromised` | 400 | `RefreshTokenCommandHandler.cs:57` | "Phiên đăng nhập không còn an toàn. Vui lòng đăng nhập lại." |
| `Token.UserUnavailable` | 400 | `:43` | "Tài khoản không tồn tại hoặc đã bị khóa." |
| `session.expired` *(FE tự sinh)* | 401 | D-14 | "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." |
| `Itinerary.NotFound` | 404 | `DomainErrors.cs:37-45` | "Không tìm thấy lịch trình." |
| `Itinerary.Forbidden` | 403 | `DomainErrors.cs:47-50` | "Bạn không có quyền chỉnh sửa lịch trình này." |
| `Itinerary.CannotPublishEmpty` | 400 | `DomainErrors.cs:52-55` | "Cần ít nhất một điểm dừng để xuất bản lịch trình." |
| `Itinerary.InvalidReorderList` | 400 | `DomainErrors.cs:67-70` | "Danh sách điểm dừng đã thay đổi. Vui lòng tải lại rồi thử lại." |
| `Itinerary.InvalidDayNumber` | 400 | `DomainErrors.cs:62-65` | "Ngày không hợp lệ." |
| `Itinerary.InvalidUserId` | 400 | `DomainErrors.cs:57-60` | câu chung D-04 (lỗi nội bộ) |
| `ItineraryTitle.Empty` | 400 | `ValueObjects/ItineraryTitle.cs:21` | "Tiêu đề không được để trống." |
| `ItineraryTitle.TooLong`, `ItineraryDescription.TooLong`, `WaypointName.TooLong` | 400 | `ItineraryTitle.cs:25`, `ItineraryDescription.cs:24-26`, `WaypointName.cs:27-29` | *(không map: có `{MaxLength}`)* |
| `WaypointName.Empty` | 400 | `WaypointName.cs:21-23` | "Tên điểm dừng không được để trống." |
| `Waypoint.NotFound` | 404 | `DomainErrors.cs:75-83` | "Không tìm thấy điểm dừng." |
| `Coordinate.InvalidLatitude` / `Coordinate.InvalidLongitude` | 400 | `ValueObjects/Wgs84Coordinate.cs:24,27` | "Vĩ độ phải nằm trong khoảng -90 đến 90." / "Kinh độ phải nằm trong khoảng -180 đến 180." |
| `Conversation.NotFound` | 404 | `DomainErrors.cs:88-91` | "Không tìm thấy cuộc trò chuyện." |
| `Chat.Forbidden` | 403 | `DomainErrors.cs:93-96` | "Bạn không thuộc cuộc trò chuyện này." |
| `Conversation.SelfChat`, `Conversation.SelfChatNotAllowed` | 400 | `DomainErrors.cs:98-101`, `Entities/Conversation.cs:34` | "Bạn không thể nhắn tin cho chính mình." |
| `Conversation.InvalidUser` | 400 | `Conversation.cs:31` | câu chung D-04 |
| `ChatMessage.EmptyContent` | 400 | `Entities/ChatMessage.cs:30` | "Nội dung tin nhắn không được để trống." |
| `ChatMessage.ContentTooLong`, `ChatMessage.InvalidVoiceDuration` | 400 | `ChatMessage.cs:34,58` | *(không map: có số giới hạn)* |
| `ChatMessage.InvalidVoiceUrl`, `ChatMessage.NullCallLogData` | 400 | `ChatMessage.cs:54,81` | câu chung D-04 (lỗi nội bộ) |
| `File.Empty` / `File.TooLarge` / `File.InvalidFormat` | 400 | `Controllers/V1/ChatController.cs:35,37,39` | "Chưa có tệp ghi âm." / *(không map: 10MB)* / "Định dạng ghi âm không được hỗ trợ." |
| `Server.Error` | 500 | `GlobalExceptionHandler.cs:29` | câu chung D-04 |
| `Error.NullValue` | 400/500 | `BuildingBlocks/Core/Abstractions/Shared/Error.cs:6` | câu chung D-04 (**message BE tiếng Anh**) |
| `*Validator`, `Validation.Error` | 400 | `ValidationPipelineBehavior.cs:41` | *(không map: message BE tiếng Việt cụ thể hơn mọi câu FE)* |
| `NotFound`, `Conflict`, `BadRequest`, `Invalid Coordinate`, `Invalid Itinerary Title` | 4xx | `GlobalExceptionHandler.cs:25-28`, `Domain/Exceptions/*` | *(không map: hiện không được throw; message BE tiếng Việt)* |

Phase 2 chỉ cần đưa vào bảng các mã Auth/User/Token/session (Phase 3 dùng ngay) cùng `Server.Error`, `Error.NullValue`. Các mã Itinerary/Chat có thể thêm luôn vì đã biết, hoặc để phase tương ứng (CONTEXT: "Phase 3+ bổ sung dần"). Đề xuất: thêm luôn những dòng ở trên, vì chi phí thấp và đã có bằng chứng.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fetch`, `AbortController`, `Response`, `Headers`, `DOMException` (global) | Node 24.14.1 / trình duyệt | HTTP, hủy request | Có sẵn ở Node 24 và mọi trình duyệt mục tiêu; `httpPackage()` cho phép `fetch` [VERIFIED: `node -e`] |
| TypeScript | 5.9.3 (catalog) | Branded type, `unique symbol` | `lib.dom.d.ts` của 5.9.3 có `AbortSignal.any/timeout` (dòng 2787, 2793) [VERIFIED] |
| Vitest | 4.1.11 (catalog) | Unit test, `vi.useFakeTimers`, `vi.advanceTimersByTimeAsync` | Preset `@tripory/config/vitest` environment `node` [VERIFIED: preset.mjs] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tripory/ui-web` `notify` | workspace | Đích hiển thị toast | Phase 3 nối; Phase 2 chỉ thiết kế để khớp chữ ký `notify.error(title)` |
| `@tanstack/react-query` | 5.104.1 (STACK.md) | `MutationCache`, `Register.mutationMeta` | **Phase 3**. Phase 2 không cài; type `MutationFeedback` viết độc lập để Phase 3 gắn vào `Register` [CITED: tanstack.com/query/latest/docs/framework/react/typescript, mục "Registering global Meta"] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Type guard tay | `zod` trong `api-client` | Phải sửa allowlist `httpPackage()`; envelope chỉ có 5 field, viết tay ngắn hơn. Không dùng |
| `AbortController` + `setTimeout` | `AbortSignal.any([caller, AbortSignal.timeout(ms)])` | `any()` cần Safari/iOS ≥ 17.4 [CITED: caniuse.com/wf-abortsignal-any]; `AbortSignal.timeout` không theo fake timers nên test 30 s phải chờ thật hoặc mock sâu. Không dùng |
| Fake `fetch`/fake `HttpClient` | MSW | STACK.md đã loại MSW ở milestone này |
| `HttpClient.send` trả `Promise<unknown>` | `send<T>()` generic | Generic là "ép kiểu trá hình"; `unknown` buộc context parse bằng Zod ở ACL |

**Installation:** không cài thêm gì vào catalog. Chỉ thêm workspace dependency:
```bash
# apps/web/package.json → "dependencies": { "@tripory/api-client": "workspace:*" }
pnpm install
```

## Architecture Patterns

### System Architecture Diagram

```
 Context infrastructure (Phase 3+)        UI app (Phase 3+)
   repository.send({method,path,body})      mutation onError / form submit
              │                                      ▲
              ▼                                      │ ApiError
 ┌──────────── withSessionRefresh(inner, {refresh, lock, onSessionExpired}) ───────────┐
 │  send → inner.send ──ok──► data                                                       │
 │            │ ApiError 401 && sessionRefresh!==false                                   │
 │            ▼                                                                          │
 │   epoch đổi từ lúc gửi? ──có──► phát lại 1 lần                                        │
 │            │ không                                                                    │
 │            ▼                                                                          │
 │   inFlight ??= lock(name, refresh) ── 'refreshed' → epoch++ → phát lại 1 lần           │
 │            │                         ── 'expired'  → onSessionExpired() 1 lần,        │
 │            │                                         reject tất cả: session.expired   │
 │            │                         ── throw      → reject tất cả bằng lỗi đó        │
 │   phát lại vẫn 401 → session.expired (không refresh lần 2)                            │
 └───────────────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
 createFetchHttpClient({ baseUrl, fetch, timeoutMs=30000 })
   build URL + query → JSON body (Content-Type) → AbortController(timeout ∪ caller signal)
   → fetch → response.text() (trong cửa sổ timeout)
   → 2xx: rỗng → undefined | envelope success → data | khác → ApiError parse
   → !2xx: toApiError(status, parsedBody)
         envelope → {kind:http, code: errorCode, message}
         ValidationProblemDetails → {kind:http, code:null, fieldErrors: chuẩn hóa key}
         ProblemDetails / rỗng / HTML → {kind:http, code:null, message:null}
   → TypeError → kind network | timeout → kind timeout | caller abort → kind aborted
              │
              ▼
 apps/web/src/lib/feedback
   selectErrorMessage(e): map[code] → e.message (BE) → "Đã có lỗi xảy ra, vui lòng thử lại"
   resolveFormError(e, fields): {fieldErrors khớp form, toastMessage của field đầu tiên không khớp}
   decideMutationFeedback(meta, outcome): {variant, message} | null
```

### Recommended Project Structure
```
packages/shared-kernel/src/
├── ids.ts            # Brand, UserId, ItineraryId, parseUserId, parseItineraryId, isGuid
├── ids.test.ts
├── geo.ts            # Wgs84Coordinate, createWgs84Coordinate, isWgs84Coordinate
├── geo.test.ts
└── index.ts

packages/api-client/src/
├── http-client.ts             # type HttpMethod, HttpRequest, HttpClient (chỉ type)
├── api-error.ts               # ApiError, ApiErrorKind, FieldErrors, isApiError, makeApiError, sessionExpiredError
├── api-error.test.ts
├── response-shapes.ts         # isRecord, isApiEnvelope, isProblemDetails, isValidationProblemDetails (type guard tay)
├── to-api-error.ts            # toApiError(status, body) thuần + normalizeFieldKey
├── to-api-error.test.ts       # 1 test/dạng lỗi, dùng fixture
├── fetch-http-client.ts       # createFetchHttpClient(deps)
├── fetch-http-client.test.ts  # fake fetch trả new Response(...), fake timers
├── with-session-refresh.ts    # Lock, RefreshOutcome, withSessionRefresh
├── with-session-refresh.test.ts
├── fixtures/be-responses.ts   # body thật của BE (không phải *.test.ts, không import vitest)
├── index.ts                   # export type + ApiError helpers (dùng được ở UI)
└── http.ts                    # export createFetchHttpClient, withSessionRefresh (chỉ composition)

apps/web/src/lib/feedback/
├── error-messages.ts          # GENERIC_ERROR_MESSAGE, ERROR_MESSAGES: Record<string,string>
├── select-error-message.ts    # selectErrorMessage(error: unknown): string | null
├── resolve-form-error.ts      # resolveFormError(error, fieldNames)
├── mutation-feedback.ts       # type MutationFeedback, decideMutationSuccess/Error
└── *.test.ts
```

### Pattern 1: `ApiError` plain object có `kind`
**What:** Một union đóng, serialize được, có dấu nhận diện để type guard không nhầm với object khác.
```typescript
// packages/api-client/src/api-error.ts
export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'parse' | 'session_expired';
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export type ApiError = Readonly<{
  type: 'ApiError';          // dấu nhận diện cho isApiError
  kind: ApiErrorKind;
  status: number | null;     // null với network/timeout/aborted
  code: string | null;       // errorCode BE, hoặc 'session.expired'
  message: string | null;    // message BE thô; null nếu không có câu dành cho người dùng
  fieldErrors?: FieldErrors; // chỉ từ ValidationProblemDetails
}>;

export const SESSION_EXPIRED = 'session.expired';

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'ApiError'
    && typeof (value as { kind?: unknown }).kind === 'string';
}
```
- Plain object theo quy ước "không class" (tài liệu kiến trúc mục 1). Đổi lại không có stack trace; chấp nhận được vì lỗi HTTP không cần stack. Phase 3 đăng ký `Register { defaultError: ApiError | Error }` nếu muốn có type ở `useMutation`. Docs TanStack khuyên ném `Error`, nhưng không bắt buộc [CITED: tanstack.com/query/latest/docs/framework/react/typescript]. Ghi lý do này trong code.
- **Không lưu raw body/headers vào `ApiError`.** Body của refresh/login chứa token; lỗi có thể bị log hoặc serialize sang client.
- `message` của `ValidationProblemDetails`/`ProblemDetails` đặt `null` (title tiếng Anh không dành cho người dùng), để `selectErrorMessage` rơi về câu chung.

### Pattern 2: `toApiError` thuần, chuẩn hóa key field
```typescript
// packages/api-client/src/to-api-error.ts
export function toApiError(status: number, body: unknown): ApiError {
  if (isApiEnvelope(body)) {
    return makeApiError({ kind: 'http', status, code: nonEmpty(body.errorCode), message: nonEmpty(body.message) });
  }
  if (isValidationProblemDetails(body)) {
    return makeApiError({ kind: 'http', status, code: null, message: null, fieldErrors: normalizeFieldErrors(body.errors) });
  }
  return makeApiError({ kind: 'http', status, code: null, message: null }); // ProblemDetails trơn, rỗng, HTML
}

/** "Email" → "email", "$.startDate" → "startDate", "Items[0].Name" → "items[0].name", "$"/"" → "" */
export function normalizeFieldKey(key: string): string {
  return key.replace(/^\$\.?/, '').split('.').map((s) => s.charAt(0).toLowerCase() + s.slice(1)).join('.');
}
```
Gộp các key trùng sau chuẩn hóa (`Email` và `$.email`). Key rỗng `""` giữ nguyên để `resolveFormError` coi là "không khớp ô nào".

### Pattern 3: Fetch client với timeout tự cài
```typescript
// packages/api-client/src/fetch-http-client.ts (rút gọn)
export function createFetchHttpClient(deps: {
  baseUrl: string;
  fetch: typeof fetch;            // composition truyền globalThis.fetch.bind(globalThis)
  timeoutMs?: number;             // mặc định 30_000 (D-11)
  getHeaders?: () => Promise<Readonly<Record<string, string>>>; // Phase 3 server: Bearer
}): HttpClient {
  const doFetch = deps.fetch;     // gọi như hàm trần, tránh "Illegal invocation"
  return {
    async send(request) {
      const controller = new AbortController();
      let timedOut = false;
      const ms = request.timeoutMs ?? deps.timeoutMs ?? 30_000;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, ms);
      const onAbort = () => controller.abort();
      if (request.signal?.aborted) onAbort(); else request.signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const response = await doFetch(buildUrl(deps.baseUrl, request), { ...init(request), signal: controller.signal });
        const text = await response.text();          // đọc body vẫn nằm trong cửa sổ timeout
        return parseResponse(response.status, text); // ném ApiError nếu !2xx hoặc sai dạng
      } catch (error) {
        if (isApiError(error)) throw error;
        if (timedOut) throw makeApiError({ kind: 'timeout', status: null, code: null, message: null });
        if (request.signal?.aborted) throw makeApiError({ kind: 'aborted', status: null, code: null, message: null });
        throw makeApiError({ kind: 'network', status: null, code: null, message: null });
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
```
- `body` là plain object → `JSON.stringify` + `Content-Type: application/json` (thiếu header thì BE trả 415). `FormData` (voice, Phase 7) → để nguyên, không đặt `Content-Type`. Luôn gửi `Accept: application/json`.
- 204 hoặc body rỗng với 2xx → `undefined`. 2xx mà body không phải envelope, hoặc `status !== 'success'` → `kind: 'parse'`.
- Dùng cờ `timedOut` thay vì đọc `reason.name`, để phân biệt timeout với caller abort một cách chắc chắn.

### Pattern 4: `withSessionRefresh` single-flight + epoch
```typescript
// packages/api-client/src/with-session-refresh.ts
export type Lock = <T>(name: string, task: () => Promise<T>) => Promise<T>; // khớp navigator.locks.request(name, cb)
export type RefreshOutcome = 'refreshed' | 'expired';

export function withSessionRefresh(inner: HttpClient, deps: {
  refresh: () => Promise<RefreshOutcome>; // Phase 3: POST /api/auth/refresh; lỗi tạm thời thì throw
  lock: Lock;
  onSessionExpired: () => void;
  lockName?: string;                      // mặc định 'tripory-session-refresh'
}): HttpClient {
  let epoch = 0;
  let inFlight: Promise<RefreshOutcome> | null = null;

  const refreshOnce = () =>
    (inFlight ??= deps.lock(deps.lockName ?? 'tripory-session-refresh', deps.refresh)
      .then((outcome) => {
        if (outcome === 'refreshed') epoch += 1; else deps.onSessionExpired(); // gọi 1 lần cho cả lô
        return outcome;
      })
      .finally(() => { inFlight = null; }));

  return {
    async send(request) {
      if (request.sessionRefresh === false) return inner.send(request);
      const sentAt = epoch;
      try {
        return await inner.send(request);
      } catch (error) {
        if (!isApiError(error) || error.status !== 401) throw error;
        if (epoch === sentAt) {
          const outcome = await refreshOnce();          // throw tạm thời → lan tới mọi request chờ
          if (outcome === 'expired') throw sessionExpiredError();
        }
        try {
          return await inner.send(request);             // phát lại đúng 1 lần
        } catch (replayError) {
          if (isApiError(replayError) && replayError.status === 401) throw sessionExpiredError();
          throw replayError;
        }
      }
    },
  };
}
```
Vì sao cần epoch: request A gửi trước, nhận 401 sau khi lượt refresh của B..N đã xong và `inFlight` đã về `null`. Không có epoch thì A khởi động lần refresh thứ hai với refresh token vừa bị xoay, đúng kịch bản reuse detection của P1. Có epoch thì A chỉ phát lại.

### Anti-Patterns to Avoid
- **Làm theo đoạn mẫu trong `.planning/research/ARCHITECTURE.md` Pattern 2:** mẫu đó phát lại request ẩn danh khi refresh thất bại và đọc `error.errorCode`. **D-14 thay thế mẫu này**: từ chối bằng `session.expired` và gọi `onSessionExpired`.
- **Gọi `deps.fetch(url)` dưới dạng method:** trên trình duyệt `fetch` gọi với `this` là object deps sẽ ném "Illegal invocation". Gán vào biến cục bộ hoặc `bind(globalThis)` ở composition.
- **Hàm refresh đi qua client đã bọc `withSessionRefresh`:** gây đệ quy. Refresh dùng `inner` hoặc `fetch` riêng, request login/register/refresh đặt `sessionRefresh: false`.
- **Map `NotEmptyValidator` → câu tiếng Việt chung:** làm mất message cụ thể BE đã viết ("Mật khẩu phải chứa ít nhất một chữ hoa.").
- **Hiện `title`/`errors` của ProblemDetails cho người dùng:** đó là tiếng Anh của framework.
- **Thêm `zod`, `@tanstack/react-query` hay `navigator` vào package để "cho tiện":** lint chặn đúng chỗ (P12).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Khóa giữa các tab | Mutex bằng `localStorage`/`BroadcastChannel` | `Lock` tiêm vào, Phase 3 cài bằng `navigator.locks.request` | Web Locks xếp hàng cùng origin, tự nhả khi tab chết |
| Parse body lỗi | Regex trên text | `JSON.parse` trong `try` + type guard | HTML/rỗng/JSON hỏng đều phải rơi về một nhánh |
| Query string | Nối chuỗi tay | `URLSearchParams` (bỏ `undefined`) | Escape ký tự tiếng Việt, `&`, `#` |
| Kiểm GUID trong ACL (Phase 3+) | Regex riêng mỗi context | `parseUserId`/`parseItineraryId` của kernel; Zod dùng `z.guid()` | `z.uuid()` của Zod 4 kiểm nghiêm version/variant RFC [ASSUMED: theo changelog Zod 4]; GUID .NET từ `Guid.NewGuid()` là v4 nên vẫn qua, nhưng `z.guid()` an toàn hơn |

**Key insight:** Phần khó của phase này không phải gọi `fetch` mà là các ca biên: 401 đến muộn, refresh lỗi tạm thời, phát lại vẫn 401, timeout lúc đang đọc body, body không phải JSON. Mỗi ca cần một test riêng.

## shared-kernel

**Branded id cần thiết** [VERIFIED: DTO BE `UseCases/V1/*/Responses`]:
- `UserId`: `ItineraryDetailDto.UserId`, `ChatMessageDto.SenderId`, `ParticipantDto.Id`, `UserDto.Id`, `UserProfileResponse.Id` → dùng ở itinerary (`canEdit`), chat, profile, identity. Đủ điều kiện.
- `ItineraryId`: itinerary và chat (thẻ lịch trình trong tin nhắn, tài liệu kiến trúc mục 7). Đủ điều kiện.
- `ConversationId`: chỉ chat (profile mở hội thoại do app ghép, không giữ id). **Không đưa vào kernel.**
- `WaypointId`, `ItineraryDayId`, `MessageId`: chỉ itinerary/chat. **Không đưa vào kernel.**

**Định dạng id:** `Guid` C#, sinh bằng `Guid.NewGuid()` (`Entities/Itinerary.cs:54`, `User.cs:50`, `Conversation.cs:41`), System.Text.Json ghi dạng `"d"` chữ thường có gạch nối. URL có thể đến chữ hoa, nên `parse*` **chuẩn hóa về chữ thường** để so sánh `itinerary.userId === viewerId` không sai.

```typescript
// packages/shared-kernel/src/ids.ts
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };
export type UserId = Brand<string, 'UserId'>;
export type ItineraryId = Brand<string, 'ItineraryId'>;

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; // không kiểm version nibble
export const isGuid = (value: string): boolean => GUID.test(value);
const parseGuid = <B extends string>(value: string) =>
  (isGuid(value.trim()) ? (value.trim().toLowerCase() as Brand<string, B>) : null);
export const parseUserId = (value: string): UserId | null => parseGuid<'UserId'>(value);
export const parseItineraryId = (value: string): ItineraryId | null => parseGuid<'ItineraryId'>(value);
```
Test bằng `expectTypeOf` của Vitest: `UserId` không gán được cho `ItineraryId`, chuỗi trần không gán được cho `UserId`. Kernel là `pure: true`: không `Math.random`, không `crypto.randomUUID` (không cần sinh id ở FE).

**`Wgs84Coordinate`** [VERIFIED: `ValueObjects/Wgs84Coordinate.cs:8-29`, `WaypointDto.cs`, `WaypointConfiguration.cs:34-36`]: BE dùng `double`, khoảng **đóng** lat [-90, 90], lng [-180, 180], lưu PostGIS `geometry(Point, 4326)` với X = longitude. BE không làm tròn.
```typescript
// packages/shared-kernel/src/geo.ts
export type Wgs84Coordinate = Readonly<{ latitude: number; longitude: number }>;
export function createWgs84Coordinate(input: { latitude: number; longitude: number }): Wgs84Coordinate | null {
  const { latitude, longitude } = input;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null; // NaN/Infinity không qua JSON
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return Object.freeze({ latitude, longitude });
}
```
- Nhận **object có tên field**, không nhận `(a, b)`: BE `Create(longitude, latitude)`, GeoJSON là `[lng, lat]`, còn người dùng dán "lat, lng" từ Google Maps. Tham số vị trí là nguồn lỗi đảo trục.
- Không làm tròn trong kernel. Làm tròn khi hiển thị (6 chữ số thập phân ≈ 0,11 m) là việc của UI.
- Parse chuỗi "lat, lng" và link Google Maps là việc của Phase 4 (context itinerary), không thuộc kernel.

## Common Pitfalls

### Pitfall 1: 401 đến muộn gây refresh lần hai
**What goes wrong:** Request gửi trước lượt refresh nhưng nhận 401 sau khi lượt refresh đã xong. Nó tự khởi động refresh mới, BE thấy token cũ bị dùng lại và thu hồi mọi phiên.
**How to avoid:** Epoch như Pattern 4. Phase 3 bổ sung kiểm `tripory_at_exp` trong lock cho trường hợp nhiều tab.
**Warning signs:** Test "A chậm, B..N nhanh" đếm được 2 lần refresh.

### Pitfall 2: Refresh lỗi tạm thời bị coi là hết phiên
**What goes wrong:** BE ngủ dậy chậm, refresh timeout/503, FE gọi `onSessionExpired` và đẩy mọi người về màn đăng nhập (PITFALLS P2).
**How to avoid:** Hợp đồng `refresh(): Promise<'refreshed' | 'expired'>`. Chỉ `'expired'` mới dẫn tới `session.expired` + `onSessionExpired`. Throw (network/timeout/5xx) thì lan lỗi đó tới các request đang chờ, không gọi `onSessionExpired`. Đây là cách đọc D-14 (xem Open Questions 1).

### Pitfall 3: Vòng lặp refresh vô hạn
**What goes wrong:** FE cũ (`tripory/src/services/api/apiClient.ts:125-139`) không đánh dấu `_retry` cho request trong hàng đợi, nên request phát lại mà vẫn 401 sẽ refresh tiếp.
**How to avoid:** Phát lại đúng một lần; lần phát lại vẫn 401 → `session.expired`. Request `sessionRefresh: false` (login, register, refresh) không bao giờ vào nhánh refresh.

### Pitfall 4: Lỗi validate BE không có tên field
**What goes wrong:** Planner giả định lỗi FluentValidation gắn được vào ô form. Thực tế envelope chỉ có `errorCode = NotEmptyValidator` và message.
**How to avoid:** Phase 3 form phải validate phía client bằng Zod với cùng luật hiển thị (mật khẩu ≥ 8 ký tự...). Lỗi BE dạng 1c đi theo D-06 (toast message BE). Ghi phụ thuộc BE: đề xuất trả `errors` có `PropertyName` trong envelope.

### Pitfall 5: Timeout không bao phần đọc body
**What goes wrong:** Xóa timer ngay sau khi `fetch` resolve header. Host chậm stream body thì request treo vô hạn.
**How to avoid:** `clearTimeout` trong `finally`, sau `response.text()`.

### Pitfall 6: Fake timers và promise
**What goes wrong:** `vi.advanceTimersByTime` đồng bộ không chạy microtask, test timeout bị treo hoặc xanh giả.
**How to avoid:** Dùng `await vi.advanceTimersByTimeAsync(30_000)`; fake fetch lắng nghe `init.signal` và reject khi abort. Gọi `vi.useRealTimers()` trong `afterEach`.

### Pitfall 7: Ranh giới import
**What goes wrong:** Đặt bảng map trong `api-client`, hoặc import `@tripory/ui-web` từ package, hoặc dùng `navigator.locks` trong `api-client`.
**How to avoid:** Bảng map ở `apps/web/src/lib/feedback`. `api-client` test chỉ được import `vitest` + `@tripory/shared-kernel` (allowlist test của `zone()`), không có `node:*`. Fixture là file `.ts` thường, không import `vitest`.

### Pitfall 8: Field key không khớp form
**What goes wrong:** Form dùng `email`, BE trả `Email` hoặc `$.email`; so sánh trực tiếp không khớp và mọi lỗi đều thành toast.
**How to avoid:** `normalizeFieldKey` trong `api-client`; form dùng tên field camelCase giống JSON gửi lên.

## Code Examples

### Hàm chọn message (app)
```typescript
// apps/web/src/lib/feedback/select-error-message.ts
import { isApiError } from '@tripory/api-client';
import { ERROR_MESSAGES, GENERIC_ERROR_MESSAGE } from './error-messages';

/** null = không hiện gì (caller tự hủy). Thứ tự: map errorCode → message BE → câu chung (D-03, D-04). */
export function selectErrorMessage(error: unknown): string | null {
  if (!isApiError(error)) return GENERIC_ERROR_MESSAGE;
  if (error.kind === 'aborted') return null;
  const mapped = error.code ? ERROR_MESSAGES[error.code] : undefined;
  return mapped ?? error.message ?? GENERIC_ERROR_MESSAGE;
}
```
`GENERIC_ERROR_MESSAGE = 'Đã có lỗi xảy ra, vui lòng thử lại'` (đúng câu của D-04). Dùng `Object.hasOwn` hoặc `Map` để tránh khớp nhầm `toString`, `constructor`.

### Lỗi form (D-05, D-06)
```typescript
// apps/web/src/lib/feedback/resolve-form-error.ts
export type FormErrorResolution = Readonly<{
  fieldErrors: Readonly<Record<string, string>>; // field của form → message đầu tiên
  toastMessage: string | null;                   // field đầu tiên không khớp, hoặc lỗi không phải validation
}>;
export function resolveFormError(error: unknown, fieldNames: readonly string[]): FormErrorResolution;
```
- Có `fieldErrors`: field khớp → gắn vào form; field đầu tiên không khớp (kể cả key `""`) → `toastMessage`.
- Không có `fieldErrors` (gồm envelope FluentValidation) → `toastMessage = selectErrorMessage(error)`.

### Hợp đồng chính sách toast (D-07..D-10)
```typescript
// apps/web/src/lib/feedback/mutation-feedback.ts
export type MutationFeedback = Readonly<{
  successMessage?: string; // D-07/D-08: có thì hiện toast thành công, câu cố định do FE viết
  errorToast?: boolean;    // D-09: mặc định true; form tự xử lý thì false
}>;
export type ToastDecision = Readonly<{ variant: 'success' | 'error'; message: string }> | null;

export const decideMutationSuccess = (feedback?: MutationFeedback): ToastDecision =>
  feedback?.successMessage ? { variant: 'success', message: feedback.successMessage } : null;

export function decideMutationError(error: unknown, feedback?: MutationFeedback): ToastDecision {
  if (feedback?.errorToast === false) return null;
  if (isApiError(error) && error.kind === 'session_expired') return null; // onSessionExpired lo (Phase 3)
  const message = selectErrorMessage(error);
  return message ? { variant: 'error', message } : null;
}
// Phase 3: declare module '@tanstack/react-query' { interface Register { mutationMeta: { feedback?: MutationFeedback } } }
// rồi MutationCache({ onError: (e, _v, _c, m) => show(decideMutationError(e, m.meta?.feedback)) })
// D-10: QueryCache không có onError toast; không cần hàm cho query.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Axios interceptor + `localStorage` + cờ `isRefreshing` (FE cũ) | `fetch` + wrapper thuần + `Lock` tiêm vào | Dự án này | Không còn token trong JS; chạy được ở server và mobile |
| `AbortSignal.any` + `AbortSignal.timeout` | Vẫn hợp lệ, nhưng cần Safari ≥ 17.4 | Safari 17.4 (2024) | Dùng `AbortController` + `setTimeout` để hỗ trợ iOS cũ và test được |
| Message lỗi lấy thẳng từ BE (FE cũ) | Map errorCode → copy FE, BE làm dự phòng | D-03 | Có bảng map cần bảo trì theo BE |

**Deprecated/outdated:** Mẫu `withSessionRefresh` trong `.planning/research/ARCHITECTURE.md` (phát lại ẩn danh khi refresh fail, trường `errorCode`) đã bị D-14 thay.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 401 JwtBearer, 403, 404 route, 405 có body rỗng; 415 trả ProblemDetails không `errors` | Hình dạng lỗi | Thấp: `toApiError` có nhánh mặc định cho mọi body lạ |
| A2 | Key `errors` khi JSON sai kiểu có dạng `$.field`, khi body hỏng có key tên tham số (`command`) | Hình dạng lỗi | Thấp: `normalizeFieldKey` xử lý cả hai; field lạ rơi về toast |
| A3 | `WWW-Authenticate` có `error_description="The token expired..."` khi hết hạn | Hình dạng lỗi | Không ảnh hưởng Phase 2 |
| A4 | Proxy host trả HTML cho 502/503/504 | Hình dạng lỗi | Thấp: đã có nhánh body không phải JSON |
| A5 | `z.uuid()` của Zod 4 kiểm nghiêm, nên dùng `z.guid()` | Don't Hand-Roll | Thấp: chỉ ảnh hưởng Phase 3+ |
| A6 | TanStack Query v5 dùng key `mutationMeta` trong `Register` | Code Examples | Thấp: Phase 3 kiểm khi cài |
| A7 | Refresh lỗi tạm thời không được gọi `onSessionExpired` (cách đọc D-14) | Pattern 4, Pitfall 2 | Trung bình: nếu người dùng muốn mọi lỗi refresh đều đăng xuất thì đổi một nhánh |
| A8 | `session_expired` và `aborted` không hiện toast lỗi | mutation-feedback | Thấp: đổi một dòng |
| A9 | Message tiếng Anh của ProblemDetails không hiển thị; field nhận câu chung | Open Questions 2 | Thấp: lỗi này thường do bug FE, không do người dùng nhập |

## Open Questions

1. **"Refresh thất bại" trong D-14 có gồm lỗi tạm thời không?**
   - What we know: D-14 nói từ chối bằng `session.expired`; PITFALLS P2 cảnh báo BE cold start làm đăng xuất oan.
   - Recommendation: Chỉ `'expired'` → `session.expired` + `onSessionExpired`; throw → lan lỗi gốc (network/timeout, hiện câu chung D-04). Planner ghi rõ trong plan; nếu người dùng muốn khác thì đổi một nhánh.
2. **Message của field từ `ValidationProblemDetails` là tiếng Anh.**
   - What we know: D-05 gắn vào ô form, D-06 toast field đầu tiên, nhưng chuỗi là "The Email field is required.".
   - Recommendation: `api-client` giữ chuỗi gốc trong `fieldErrors` (để debug). App hiển thị "Giá trị không hợp lệ." ở ô form và câu chung D-04 khi toast. Lỗi dạng này thường chỉ xảy ra khi FE gửi sai kiểu (bug), vì client validation chặn trước.
3. **2xx mà body không phải envelope (route BFF Phase 3).**
   - Recommendation: Phase 2 coi là `kind: 'parse'`. Phase 3 cho route `/api/auth/*` trả envelope cùng dạng, hoặc gọi chúng bằng `fetch` riêng trong composition.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | test, lint | ✓ | 24.14.1 | — |
| `fetch`/`AbortController`/`Response`/`DOMException` global | api-client + test | ✓ | Node 24 built-in | — |
| pnpm | install workspace dep | ✓ (theo `packageManager`) | 10.34.6 | — |
| Vitest | test | ✓ | 4.1.11 | — |
| BE chạy thật | Không cần (fixture từ code BE) | — | — | Fixture |

Không có dependency thiếu.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 |
| Config file | `packages/{api-client,shared-kernel}/vitest.config.ts` (preset node); `apps/web/vitest.config.ts` (preset jsdom + setup) |
| Quick run command | `pnpm --filter @tripory/api-client test` / `pnpm --filter @tripory/shared-kernel test` / `pnpm --filter @tripory/web exec vitest run src/lib/feedback` |
| Full suite command | `pnpm lint && pnpm typecheck && pnpm test` (từ gốc repo) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-05 / SC-1 | Envelope 1a/1b/1c → `ApiError{kind:http, status, code, message}` | unit | `pnpm --filter @tripory/api-client test -- to-api-error` | ❌ Wave 0 |
| FND-05 / SC-1 | `ValidationProblemDetails` → `fieldErrors` với key chuẩn hóa (`Email`, `$.startDate`, `command`, `""`, gộp trùng) | unit | như trên | ❌ |
| FND-05 / SC-1 | ProblemDetails trơn, body rỗng, HTML, JSON hỏng → `kind:http`, `code/message: null` | unit | như trên | ❌ |
| FND-05 / SC-1 | Fetch client: 200 envelope → `data`; 201; 204 → `undefined`; 2xx không envelope → `parse`; JSON body có `Content-Type`; FormData không đặt `Content-Type`; query string | unit | `pnpm --filter @tripory/api-client test -- fetch-http-client` | ❌ |
| FND-05 / D-11 | Không phản hồi sau 30 s → `timeout`; `timeoutMs` override; timeout khi đang đọc body; timer bị xóa khi xong | unit (fake timers) | như trên | ❌ |
| FND-05 | `fetch` reject `TypeError` → `network`; caller abort trước/trong lúc gửi → `aborted` | unit | như trên | ❌ |
| SC-2 / D-13 | N=5 request 401 song song → `refresh` gọi 1 lần, `lock` gọi 1 lần với đúng tên, 10 lần `inner.send`, cả 5 resolve | unit | `pnpm --filter @tripory/api-client test -- with-session-refresh` | ❌ |
| SC-2 | 401 đến sau khi refresh đã xong (epoch) → phát lại, không refresh lần 2 | unit | như trên | ❌ |
| D-14 | Refresh `'expired'` → mọi request reject `session.expired`, `onSessionExpired` gọi đúng 1 lần | unit | như trên | ❌ |
| D-14 / A7 | Refresh throw → request chờ nhận lỗi đó, `onSessionExpired` không gọi; lượt sau được refresh lại | unit | như trên | ❌ |
| D-13 | Phát lại vẫn 401 → `session.expired`, không refresh lần 2; lỗi khác 401 đi thẳng; `sessionRefresh:false` không refresh | unit | như trên | ❌ |
| SC-3 | `parseUserId`/`parseItineraryId`: GUID hoa → thường, chuỗi sai → `null`, `expectTypeOf` không gán chéo | unit | `pnpm --filter @tripory/shared-kernel test` | ❌ |
| SC-3 | `createWgs84Coordinate`: biên ±90/±180 hợp lệ, vượt biên/NaN/Infinity → `null`, kết quả frozen | unit | như trên | ❌ |
| FND-05 / D-03, D-04 | `selectErrorMessage`: mã có map → copy FE; mã không map (`NotEmptyValidator`, `Auth.UserBanned`) → message BE; network/timeout/rỗng/non-ApiError → câu chung; `aborted` → `null`; `toString` không khớp nhầm | unit | `pnpm --filter @tripory/web exec vitest run src/lib/feedback` | ❌ |
| FND-05 / D-05, D-06 | `resolveFormError`: field khớp → gắn; field đầu tiên không khớp → toast; không có fieldErrors → toast message chọn | unit | như trên | ❌ |
| FND-05 / D-07..D-09 | `decideMutationSuccess` mặc định null, có `successMessage` → success; `decideMutationError` mặc định bật, `errorToast:false` → null, `session_expired` → null | unit | như trên | ❌ |
| SC-3 | Ranh giới: api-client `navigator` bị bắt; UI web import `@tripory/api-client` hợp lệ; UI web import `@tripory/api-client/http` bị chặn | self-test ESLint | `pnpm --filter @tripory/config test` | ✅ (thêm case) |

D-10 (query không toast) không có hàm thuần để test ở Phase 2; nghiệm thu ở Phase 3 khi tạo `QueryCache`.

### Sampling Rate
- **Per task commit:** quick run của package vừa sửa.
- **Per wave merge:** `pnpm lint && pnpm typecheck && pnpm test`.
- **Phase gate:** full suite xanh trước `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `packages/api-client/src/fixtures/be-responses.ts`: body thật cho 1a, 1b, 1c, 2 (3 biến thể key), 3, rỗng, HTML, envelope success, refresh success.
- [ ] `packages/api-client/src/{to-api-error,fetch-http-client,with-session-refresh,api-error}.test.ts`
- [ ] `packages/shared-kernel/src/{ids,geo}.test.ts`
- [ ] `apps/web/src/lib/feedback/*.test.ts`
- [ ] Bỏ `--passWithNoTests` trong `packages/api-client/package.json` và `packages/shared-kernel/package.json` (`"test": "vitest run"`).
- [ ] Thêm `"@tripory/api-client": "workspace:*"` vào `apps/web/package.json`, chạy `pnpm install`.
- [ ] Thêm 3 case vào `packages/config/test/boundaries.test.ts` (chỉ thêm case, không sửa rule).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | không (Phase 3) | — |
| V3 Session Management | có | Single-flight + epoch tránh reuse detection; `onSessionExpired` tiêm vào; không giữ token trong `api-client` |
| V4 Access Control | không | BE quyết định; FE chỉ hiển thị 403 |
| V5 Input Validation | có | Type guard tay cho mọi body BE (không tin `as`); `parse*` id; `Wgs84Coordinate` kiểm `Number.isFinite` + khoảng |
| V6 Cryptography | không | — |
| V7 Error Handling & Logging | có | `ApiError` không chứa raw body/header/token; không hiển thị message tiếng Anh/stack của framework; câu chung cho lỗi không rõ |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Refresh song song làm BE thu hồi mọi phiên | Denial of Service | Single-flight + epoch + Lock (Phase 3: Web Locks) |
| Vòng lặp refresh/replay vô hạn | Denial of Service | Phát lại đúng 1 lần, `sessionRefresh:false` cho endpoint auth |
| Lộ token qua object lỗi bị log/serialize | Information Disclosure | Không lưu body/headers trong `ApiError` |
| Hiển thị chi tiết lỗi server | Information Disclosure | Chỉ hiện copy FE hoặc message BE dành cho người dùng; ProblemDetails → câu chung |
| Khớp nhầm key prototype trong bảng map (`__proto__`, `toString`) | Tampering | `Object.hasOwn`/`Map` |

## Gợi ý chia plan/wave (không bắt buộc)

`parallelization: false` trong `.planning/config.json`, nên chạy tuần tự:

1. **02-01 shared-kernel:** `ids.ts`, `geo.ts`, test, bỏ `--passWithNoTests`. Nhỏ, độc lập.
2. **02-02 api-client lõi:** `http-client.ts`, `api-error.ts`, `response-shapes.ts`, `to-api-error.ts`, fixture, `fetch-http-client.ts` (timeout/abort), `index.ts` + `http.ts` + `exports` trong `package.json`, bỏ `--passWithNoTests`.
3. **02-03 withSessionRefresh:** wrapper + test đủ ca (song song, epoch, expired, throw, replay 401, opt-out, caller abort khi đang chờ).
4. **02-04 feedback ở app + ranh giới:** dependency workspace, `apps/web/src/lib/feedback/*` + test, thêm case self-test boundaries, chạy full suite.

## Sources

### Primary (HIGH confidence)
- Code BE `tripory_be/src` (chỉ đọc): `Tripory.API/Common/Responses/ApiResponse.cs`, `Controllers/ApiController.cs`, `Controllers/V1/{Auth,Chat,Itineraries,Users}Controller.cs`, `Middlewares/GlobalExceptionHandler.cs`, `Program.cs`, `Tripory.Application/Behaviors/ValidationPipelineBehavior.cs`, `UseCases/V1/*/Validators`, `UseCases/V1/Auth/{Commands,Handlers,Responses}`, `Tripory.Domain/Errors/DomainErrors.cs`, `Domain/ValueObjects/*`, `Domain/Entities/*`, `Domain/Exceptions/*`, `Persistence/.../WaypointConfiguration.cs`, csproj (net10.0, Nullable enable).
- `tripory_be/API_ENDPOINTS.md` §7.
- Code FE: `packages/config/eslint/boundaries.mjs`, `base.mjs`, `test/boundaries.test.ts`, `vitest/preset.mjs`, `tsconfig/library.json`, `apps/web/{package.json,eslint.config.mjs,vitest.config.ts}`, `packages/ui-web/src/molecules/toast.tsx`, `pnpm-workspace.yaml`.
- FE cũ: `tripory/src/services/api/apiClient.ts`.
- [ASP.NET Core 10 model validation](https://learn.microsoft.com/en-us/aspnet/core/mvc/models/validation?view=aspnetcore-10.0): implicit Required, key theo tên property.
- [FluentValidation error codes](https://docs.fluentvalidation.net/en/latest/error-codes.html): mã mặc định là tên validator.
- [MDN AbortSignal.any](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static), [caniuse AbortSignal.any](https://caniuse.com/wf-abortsignal-any): Safari/iOS 17.4+.
- [TanStack Query v5 TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript): Register global Error/Meta.
- Kiểm chứng cục bộ: `node -e` (Node 24.14.1 có `AbortSignal.any/timeout`, reason `AbortError`/`TimeoutError`), `lib.dom.d.ts` TS 5.9.3.

### Secondary (MEDIUM confidence)
- `.planning/research/{PITFALLS,ARCHITECTURE,SUMMARY,STACK}.md`.

### Tertiary (LOW confidence)
- Body HTML từ proxy host khi 502/503/504.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, không thêm thư viện, mọi API đã kiểm trên Node 24/TS 5.9.3.
- Architecture: HIGH, khớp `boundaries.mjs` hiện có, không cần sửa rule.
- Hình dạng lỗi BE: HIGH cho envelope/FluentValidation/refresh (đọc code); MEDIUM cho body rỗng và key ProblemDetails (docs + hành vi mặc định).
- Pitfalls: HIGH.

**Research date:** 2026-10-12
**Valid until:** 2026-11-11 (đối chiếu lại nếu BE đổi `ApiController`/`ValidationPipelineBehavior`)

## RESEARCH COMPLETE

- BE có 6 dạng lỗi. Lỗi FluentValidation đi qua envelope 400 với `errorCode` là tên validator, message tiếng Việt, **không có field**. Chỉ `ValidationProblemDetails` (key PascalCase/`$.x`, message tiếng Anh) gắn được vào ô form.
- `withSessionRefresh` cần single-flight **cộng epoch** để 401 đến muộn không refresh lần hai. Phát lại đúng 1 lần. Chỉ kết quả `'expired'` mới dẫn tới `session.expired` + `onSessionExpired`; lỗi refresh tạm thời thì lan lỗi gốc (cần xác nhận cách đọc D-14).
- Timeout cài bằng `AbortController` + `setTimeout` (hỗ trợ iOS < 17.4, test được bằng fake timers), bao cả phần đọc body.
- Phần trình bày đặt ở `apps/web/src/lib/feedback`, chỉ cần thêm workspace dependency, không sửa `boundaries.mjs`. Tách `@tripory/api-client/http` để lint có sẵn cấm UI tự dựng client.
- `shared-kernel`: `UserId`, `ItineraryId` (GUID chữ thường), `Wgs84Coordinate { latitude, longitude }` khoảng đóng, không làm tròn. Không thêm dependency vào catalog.
