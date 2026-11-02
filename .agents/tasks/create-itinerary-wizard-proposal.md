# Đề xuất: luồng tạo lịch trình 4 bước (điểm đến → tên → ngày → sở thích)

Báo cáo chỉ đọc. Không sửa code, không commit. FE: `tripory_fe` nhánh `phase_4`. BE: `tripory_be` nhánh `feat/be-fe-integration-group-a` (HEAD `9339749`, cây làm việc sạch).

## 1. Tóm tắt

- BE hiện chỉ nhận **tiêu đề** khi tạo lịch trình. `POST /api/v1/itineraries` nhận `CreateItineraryRequest(string Title)` và BE tự tạo sẵn Ngày 1. BE không có khái niệm điểm đến, tỉnh/thành, sở thích, tag hay danh mục. Cũng không có bảng tỉnh/thành nào.
- Làm được ngay bằng endpoint có sẵn: **tên mặc định theo điểm đến**, **ngày khởi hành**, **số ngày**. Sau `POST` cần thêm tối đa 2 request: `PUT /itineraries/{id}` để đặt `startDate`, và một `PUT /itineraries/{id}/days/{N}/subtitle` để có đủ N ngày. Chỉ cần tạo ngày N vì editor tự vẽ Ngày 1..N.
- Không lưu được **điểm đến** và **sở thích** nếu không sửa BE. Nhét vào `description` là cách tệ (lý do ở mục 8).
- Repo chưa có danh sách tỉnh/thành. Nên dùng 34 đơn vị cấp tỉnh mới (Nghị quyết 202/2025/QH15, hiệu lực 01/07/2025). Danh sách và mã phải đối chiếu văn bản chính thức trước khi code.
- Khuyến nghị: **phương án C (làm theo giai đoạn)**. Làm wizard 4 bước ngay. Bước 1–3 chạy bằng endpoint có sẵn. Bước 4 ẩn bằng prop `visible` cho tới khi BE có trường lưu. Song song đó, đưa đề xuất BE (phương án B) vào danh sách phụ thuộc BE. Nếu bạn muốn sửa BE ngay thì chọn B: một request duy nhất, ít rủi ro lỗi giữa chừng.
- Luồng mới thay quyết định D-09..D-12 (tạo nhanh một ô), đổi lời của ITIN-02 và mâu thuẫn với đặc tả `tripory/docs` PT-01 "Giai đoạn 1: chỉ nhập Tên chuyến đi". Cần bạn chốt để cập nhật các tài liệu này.

## 2. Luồng tạo hiện tại (sự thật, đã đọc code)

| Bước | Vị trí | Nội dung |
|---|---|---|
| Nút mở | `apps/web/src/modules/itinerary/ui/my-itineraries-view.tsx:234` (đầu trang), `:195` (EmptyState, `visible={status === "all"}`), `:247` mount `CreateItineraryDialog` | `AddButton` "Tạo lịch trình" |
| Dialog | `create-itinerary-dialog.tsx:112-113` | `Dialog` + `DialogContent size="sm"`. Không dùng `ResponsiveFormSurface`, nên trên mobile vẫn là dialog giữa màn hình chứ không phải bottom sheet |
| Giá trị đầu | `create-itinerary-dialog.tsx:25` | `DEFAULT_TITLE = "Chuyến đi mới"`, bôi đen bằng `input.select()` (`:55`) |
| Schema | `form-schemas.ts:44`, `:65`, `:69` | `createItinerarySchema = z.object({ title })`, 1–100 ký tự, đếm trên chuỗi thô |
| Mutation | `create-itinerary-dialog.tsx:41`, `:66` | `itinerary.useCreateItinerary({ meta: { feedback: { errorToast: false } } })`, gửi `{ title: trim }` |
| Hook | `packages/itinerary/src/react/index.ts:147-158` | Không có scope. Thành công thì seed cache detail và invalidate danh sách |
| Port | `packages/itinerary/src/application/ports.ts:32` | `create(input: { title: string }): Promise<Itinerary>` |
| Adapter | `packages/itinerary/src/infrastructure/http-itinerary-repository.ts:43-47` | `POST /itineraries` body `{ title }`, parse `itineraryDetailDto` |
| BFF | `apps/web/src/composition/server/bff.ts:14`, `:48` | Catch-all `/api/bff/[...path]`, allowlist gốc `itineraries`, chuyển tiếp tới `/api/v1/...` |
| Lỗi | `form-error-mapping.ts` (`CREATE_TARGETS`, `mapCreateItineraryError`) | `ItineraryTitle.Empty/TooLong` gắn vào ô, còn lại hiện InlineAlert |
| Điều hướng | `create-itinerary-dialog.tsx:80-81` | `markEnteredFromList()` rồi `router.push('/itineraries/{id}/edit')`, không toast (D-11) |

Test đang khóa luồng này:
- `create-itinerary-dialog.test.tsx`: 10 test. Có các ca: giá trị đầu và bôi đen, Enter gửi đúng `{ title }`, không toast, chặn gửi lần hai, khóa khi đang gửi, cold start 5 giây, lỗi field và lỗi 500.
- `my-itineraries-view.test.tsx:230`, `:239`: tìm dialog tên "Lịch trình mới".
- `form-schemas.test.ts:32-46`, `form-error-mapping.test.ts:19`, `:60-69`, `itinerary-hooks.test.tsx:355`, `packages/itinerary/src/infrastructure/http-itinerary-repository.test.ts:129-144`.
- Tài liệu: UAT `04-UAT-CHECKLIST.md:41` (bước 2), `04-VALIDATION.md:67`, `04-UI-SPEC.md:222-226` và `:501`, `04-CONTEXT.md` D-09..D-12, `ROADMAP.md:121` (tiêu chí 1), `REQUIREMENTS.md:44` (ITIN-02).

## 3. Khả năng của BE (sự thật, đã đọc code BE)

Đường dẫn tính từ `tripory_be/src/Services/Tripory/`.

- Endpoint tạo: `Tripory.API/Controllers/V1/ItinerariesController.cs:23-39`, gửi `CreateQuickDraftItineraryCommand(request.Title)`, trả 201 kèm `ItineraryDetailDto`.
- Request: `Tripory.API/Contracts/V1/Itineraries/Requests/CreateItineraryRequest.cs` chỉ có `record CreateItineraryRequest(string Title)`.
- Command: `CreateQuickDraftItineraryCommand(string Title)`. Validator chỉ kiểm Title 1–100.
- Domain: `Tripory.Domain/Entities/Itinerary.cs:48-66`. `CreateQuickDraft(userId, title)` đặt description null, startDate null, rồi `GetOrCreateDay(1)` (`:64`).
- Entity có `StartDate` (`Itinerary.cs:16`). Chỉ đặt được qua `UpdateMetadata` (`:68-81`), tức `PUT /itineraries/{id}` (controller `:78-97`). PUT này **ghi đè cả 4 trường**: title, description, startDate, coverImageUrl. Với lịch trình vừa tạo thì gửi `description: null, coverImageUrl: null` là an toàn.
- Ngày: `SetDaySubtitle(dayNumber, subtitle)` (`Itinerary.cs:194-203`) gọi `GetOrCreateDay`, chỉ chặn `dayNumber < 1` và không có trần. Validator `SetDaySubtitleCommandValidator` cũng chỉ kiểm `> 0`. Bảng `itinerary_days` có unique index `(ItineraryId, DayNumber)` (`Tripory.Persistence/Configurations/ItineraryDayConfiguration.cs:24`).
- Không có điểm đến, tỉnh/thành, sở thích, tag hay danh mục. Tìm `province|destination|interest|categor|tag` trong `*.cs`, `*.md`, `*.json` của BE không ra kết quả nghiệp vụ nào. `ARCHITECTURE.md:60` có nhắc enum `WaypointCategory` nhưng thư mục `Tripory.Domain/Enums` không có file này (chỉ có `CallDirection`, `CallStatus`, `MessageType`, `UserRoleType`, `UserStatus`).
- Không có endpoint tạo nhiều ngày một lúc.
- Rate limit: BE chỉ có 3 policy cho auth (`Tripory.API/RateLimiting/RateLimitingExtensions.cs:13-18`, gắn ở `AuthController.cs:23`, `:40`, `:56`). Endpoint itinerary không bị giới hạn, nên 2–3 request liên tiếp không chạm rate limit.
- Lỗi `DbUpdateConcurrencyException` lúc UAT (`04-UAT-CHECKLIST.md:80`): cấu hình hiện tại có `builder.Property(r => r.Id).ValueGeneratedNever()` cho `ItineraryDay` (`ItineraryDayConfiguration.cs:14`). **Suy luận, chưa xác minh bằng chạy thử:** đây là bản sửa, đã nằm trong commit `9339749`. Nếu đúng thì tạo ngày mới qua `SetDaySubtitle` đã ổn.
- `ToSummaryDto` lấy `itinerary.Days.Count` (`Tripory.Application/.../Extensions/ItineraryExtensions.cs:43`). Đây là số bản ghi ngày, không phải số ngày lớn nhất.

### Mỗi trường mới cần gì ở BE (phương án B)

| Trường | Domain/DB | Validate | API |
|---|---|---|---|
| `startDate` | Đã có cột `date` | Chưa có rule (có thể thêm "không chặn ngày quá khứ") | Thêm `DateOnly? StartDate` vào `CreateItineraryRequest` và command |
| `dayCount` | Không cần cột. Vòng `GetOrCreateDay(1..N)` trong factory | `InclusiveBetween(1, 30)` (trần do ta chọn) | Thêm `int? DayCount` (mặc định 1) |
| `destinationCode` | Cột mới `destination_code varchar(32) null`, index cho lọc discovery | Mã thuộc danh mục: hằng số C# hoặc bảng tham chiếu `destinations` seed bằng migration | Thêm vào request, `ItineraryDetailDto`, `ItinerarySummaryDto` |
| `interests` | Cột `text[]` (Npgsql primitive collection) hoặc `jsonb`, mặc định rỗng | Mỗi phần tử thuộc enum cho phép, tối đa K mục, không trùng | Thêm vào request và cả hai DTO |

Một migration (`Add_Itinerary_Destination_Interests`) là đủ. Mọi trường mới đều tùy chọn, nên FE cũ chỉ gửi `{ title }` vẫn chạy. Zod phía FE dùng `z.object` thường (`packages/itinerary/src/infrastructure/dto.ts:34`, `:53`) và bỏ qua key lạ, nên BE thêm trường vào DTO không làm vỡ FE hiện tại.

**Bẫy khi làm B:** `PUT /itineraries/{id}` ghi đè toàn bộ. Nếu thêm `destinationCode` hay `interests` vào PUT, dialog "Thông tin chuyến đi" hiện tại (`trip-info-dialog.tsx`) không gửi hai trường này và sẽ xóa chúng mỗi lần lưu. Có hai cách tránh: BE coi thiếu trường là "giữ nguyên", hoặc FE thêm hai trường vào PUT trong cùng đợt.

### Làm "số ngày" bằng endpoint có sẵn (phương án A/C)

- `buildDayRange` vẽ liền Ngày 1..max (`packages/itinerary/src/domain/day-range.ts:5-22`, D-28). Vì vậy chỉ cần **một** lệnh `PUT days/{N}/subtitle` với `subtitle: null` là editor hiện đủ N tab. Không cần N−1 lệnh.
- Cái giá:
  - Dữ liệu BE thưa: chỉ có bản ghi ngày 1 và ngày N. Khi BE sửa `Include` của `/mine` (BE-DEPENDENCIES mục 1), `DaysCount` sẽ trả 2 thay vì N. Hiện D-04 ẩn số ngày trên thẻ nên chưa lộ ra.
  - Nếu cần `DaysCount` đúng thì phải gửi N−1 lệnh tuần tự. Mỗi lệnh BE tải cả aggregate rồi `SaveChanges`. Với N = 7 là 6 vòng mạng, mỗi vòng có thể dính cold start.
- Gửi tuần tự, không song song. Hook ghi của editor đã xếp hàng theo `scope: { id: 'itinerary:'+id }` (`react/index.ts:89`). Use case mới cũng nên `await` từng lệnh. Lý do: gửi song song tới cùng ngày sẽ va unique index, và không có ETag nên lệnh sau thắng (BE-DEPENDENCIES mục 4).
- `startDate` không đặt được lúc tạo. Phải gửi thêm `PUT /itineraries/{id}`.
- Lỗi giữa chừng: `POST` xong nhưng PUT lỗi thì lịch trình đã tồn tại nhưng thiếu ngày khởi hành hoặc số ngày. Cả hai đều sửa lại được trong editor (Thông tin chuyến đi, nút "+ Thêm ngày"). Đề xuất: vẫn chuyển vào editor, rồi hiện một toast cảnh báo tiếng Việt cho riêng trường hợp này, ví dụ "Đã tạo lịch trình nhưng chưa lưu được ngày khởi hành. Bạn có thể sửa trong Thông tin chuyến đi." Đây là ngoại lệ có chủ đích của D-11 (không toast).

## 4. Dữ liệu điểm đến

Sự thật:
- Repo FE chưa có danh sách tỉnh/thành. Chỉ có mẫu `destinationItems` (Huế, Đà Nẵng) trong `packages/ui-web/src/molecules/select.test.tsx:16`.
- BE không có bảng tham chiếu nào.
- Đặc tả nghiệp vụ có chỗ dùng tỉnh/thành: `tripory/docs/traveler/USER_PROFILE_01/PT-01_profile_header_and_stats.md:21` ("Tỉnh/Thành đã qua"), BRD `:329`, `:390` ("Select destination(s)", "Filter by destination, duration, interests").
- Nghị quyết 202/2025/QH15 ngày 12/6/2025 về sắp xếp đơn vị hành chính cấp tỉnh ([HĐND TP.HCM trích dẫn](https://hdnd.hochiminhcity.gov.vn/nghi-quyet/tai-xuong/311)). Mã số mới ban hành theo Quyết định 19/2025/QĐ-TTg ([vietnam.vn](https://www.vietnam.vn/ja/bang-danh-muc-va-ma-so-cac-don-vi-hanh-chinh-viet-nam)).

Danh sách 34 đơn vị dưới đây là **bản nháp từ trí nhớ, phải đối chiếu nguyên văn Nghị quyết 202/2025/QH15 và Quyết định 19/2025/QĐ-TTg trước khi code**:
- 6 thành phố trực thuộc trung ương: Hà Nội, Huế, Hải Phòng, Đà Nẵng, TP. Hồ Chí Minh, Cần Thơ.
- 28 tỉnh: Lai Châu, Điện Biên, Sơn La, Lạng Sơn, Cao Bằng, Quảng Ninh, Thanh Hóa, Nghệ An, Hà Tĩnh, Tuyên Quang, Lào Cai, Thái Nguyên, Phú Thọ, Bắc Ninh, Hưng Yên, Ninh Bình, Quảng Trị, Quảng Ngãi, Gia Lai, Khánh Hòa, Lâm Đồng, Đắk Lắk, Đồng Nai, Tây Ninh, Vĩnh Long, Đồng Tháp, Cà Mau, An Giang.

**Rủi ro UX lớn nhất:** nhiều điểm du lịch nổi tiếng không còn là tên tỉnh. Ví dụ (cần xác minh): Đà Lạt và Mũi Né thuộc Lâm Đồng, Phú Quốc thuộc An Giang, Vũng Tàu thuộc TP. Hồ Chí Minh, Hội An thuộc Đà Nẵng, Sa Pa thuộc Lào Cai, Hà Giang thuộc Tuyên Quang, Quy Nhơn thuộc Gia Lai. Người dùng gõ "Đà Lạt" mà không thấy gì, hoặc nhận tên mặc định "Chuyến đi Lâm Đồng", sẽ thấy lạ. Đề xuất: mỗi đơn vị có `aliases` (tên tỉnh cũ, thành phố du lịch) để tìm. Câu hỏi Q2 hỏi có cho chọn thẳng điểm du lịch hay không.

Đề xuất hình dạng dữ liệu:
```ts
// packages/itinerary/src/domain/destination.ts
type CountryCode = 'VN';                         // mở rộng sau: 'TH', 'JP'...
type DestinationId = `${Lowercase<CountryCode>}-${string}`;  // 'vn-lam-dong'
type Destination = Readonly<{
  id: DestinationId;
  countryCode: CountryCode;
  name: string;          // "Lâm Đồng", "TP. Hồ Chí Minh" (tên hiển thị ngắn)
  kind: 'municipality' | 'province';
  adminCode: string | null;   // mã theo QĐ 19/2025, chỉ để đối chiếu
  popularityRank: number;     // 1 = phổ biến nhất
  aliases: readonly string[]; // "Đà Lạt", "Phú Quốc", tên tỉnh cũ
}>;
```
- ID dùng slug có tiền tố quốc gia (`vn-lam-dong`), không dùng mã số. Mã số là của riêng Việt Nam và vừa bị cấp lại năm 2025. ISO 3166-2 có thể chưa cập nhật cho đơn vị mới (chưa xác minh). Slug đọc được, mở rộng ra toàn cầu bằng cách đổi tiền tố.
- Độ phổ biến: thứ hạng tĩnh do người làm sản phẩm chọn, lưu ở trường `popularityRank`. Khi BE lưu `destinationCode`, có thể đổi sang thống kê của BE (đếm lịch trình theo điểm đến). Repo không có nguồn số liệu du lịch nào. Thứ tự gợi ý dưới đây là **giả định**: Đà Nẵng, TP. Hồ Chí Minh, Hà Nội, Khánh Hòa, Lâm Đồng, Quảng Ninh, An Giang, Lào Cai, Huế, Ninh Bình, rồi các tỉnh còn lại theo bảng chữ cái.
- Tìm không dấu: hàm thuần `normalizeSearchText` gồm `normalize('NFD')`, bỏ dấu kết hợp, `đ→d`, chữ thường. So khớp trên `name` và `aliases`. Hàm đặt ở domain, không cần thư viện.
- Nơi đặt: type và các hàm thuần (`searchDestinations`, `sortByPopularity`, `defaultTripTitle`) ở `domain`. Danh mục đi qua port `DestinationCatalog` ở `application/ports.ts`. Bản cài đặt tĩnh `static-destination-catalog.ts` nằm ở `infrastructure`, composition lắp vào. Khi BE có bảng hay API, chỉ đổi adapter. Không tạo package mới: chỉ `itinerary` dùng, và `shared-kernel` chỉ dành cho thứ ≥ 2 context dùng (kiến trúc §7). Khi `profile` cần "số tỉnh đã qua" thì xét lại.

## 5. Tên mặc định theo điểm đến

- Mẫu: `Chuyến đi ${destination.name}`, ví dụ "Chuyến đi Đà Nẵng". Tên dài nhất cỡ "Chuyến đi TP. Hồ Chí Minh", vẫn dưới 100 ký tự. Chưa chọn điểm đến thì giữ "Chuyến đi mới".
- Quy tắc khi quay lại đổi điểm đến: giữ một cờ `titleEdited`.
  - Người dùng chưa sửa tên thì tên đi theo điểm đến mới.
  - Đã sửa thì giữ tên của họ.
  - Xóa trắng rồi rời bước thì coi như chưa sửa và điền lại mặc định.
- Logic này là hàm thuần `nextTitle({ current, edited, destination })` ở domain, có unit test. Component không chứa nó.
- Vào bước 2 thì focus ô tên và bôi đen như hiện nay (giữ hành vi D-09).

## 6. Bước 3 và bước 4

Bước 3: ngày bắt đầu và số ngày.
- Ngày bắt đầu: **tùy chọn** (BE nullable; đặc tả PT-01 ghi "Tùy chọn"). Dùng `Input type="date"` có `allowClear` và `clearLabel="Xóa Ngày khởi hành"` như `trip-info-dialog.tsx:232`. Giá trị đi qua `CalendarDate` và `startDateField` đã có (`form-schemas.ts:46`).
- Số ngày: **bắt buộc, mặc định 3** (đề xuất, xem Q5), tối thiểu 1, tối đa 30. BE không có trần (BE-DEPENDENCIES mục 9), số 30 là ta tự chọn.
- Nếu có ngày bắt đầu thì hiện dòng phụ "Về ngày dd/mm/yyyy" = start + N − 1. Cần hàm cộng ngày thuần trên `CalendarDate` (`domain/calendar-date.ts`), không dùng `new Date()` local.
- Tab editor vẫn hiện "Ngày 1..N". Hiện ngày thực theo `startDate` là UX-03 (v2, `REQUIREMENTS.md:126`). Wizard làm UX-03 hữu ích hơn nhưng không bắt buộc làm cùng.

Bước 4: sở thích.
- Đặc tả đã có bộ danh mục cho discovery: Nghỉ dưỡng, Phượt & khám phá, Ẩm thực, Check-in sống ảo, Du lịch tiết kiệm (`tripory/docs/traveler/DISCOVERY_FEED_01/PT-01_hero_and_smart_search.md:18-25`, `discovery_feed.md:5`). BRD `:329` ghi "Filter by destination, duration, interests". Vậy sở thích có mục đích thật: lọc và gợi ý ở Discovery sau này.
- Đề xuất: **chọn nhiều, tùy chọn, có "Bỏ qua"**. Dùng chung bộ id với danh mục Discovery để sau này không phải map lại. Có thể thêm Biển, Núi, Văn hóa – lịch sử nếu bạn muốn (Q6).
- BE chưa có chỗ lưu. Không nên lưu vào `localStorage`: mất khi đổi máy, không phục vụ Discovery được, và luật D cấm UI chạm `localStorage` trực tiếp. Không nên lưu vào `description` (mục 8). Vì vậy đề xuất ẩn bước 4 cho tới khi BE có trường `interests`.

## 7. Hình dạng UX

- Bề mặt: dùng `ResponsiveFormSurface` (`responsive-form-surface.tsx`). Desktop là `Dialog size="md"`, mobile là `Sheet` mở `expanded` có nút X góc trên phải. Đổi này sửa luôn việc dialog tạo hiện tại không thành bottom sheet trên mobile. `locked` chặn đóng khi đang gửi, giữ như D-12.
- Thanh tiến độ: dòng chữ "Bước 2/4" kèm tên bước, có `aria-live="polite"`. Nếu cần thanh ngang thì dùng Base UI `Progress` (có trong `@base-ui/react` 1.8.0).
- Nút: "Quay lại" (ẩn ở bước 1 bằng `visible`), "Tiếp tục", và "Tạo lịch trình" ở bước cuối. Bước 4 có thêm "Bỏ qua". Enter trong ô tên chuyển bước, không gửi.
- Validate theo bước:
  - Bước 1: phải chọn điểm đến.
  - Bước 2: tên 1–100 ký tự.
  - Bước 3: ngày hợp lệ (nếu nhập), số ngày 1–30.
  - Bước 4: không bắt buộc.
  - Mỗi bước có schema Zod riêng trong `form-schemas.ts`. Dùng `react-hook-form` một form chung và `trigger(fieldsOfStep)` trước khi sang bước.
- Focus khi vào bước: bước 1 vào ô tìm, bước 2 vào ô tên (bôi đen), bước 3 vào ô ngày, bước 4 vào chip đầu tiên. Lỗi focus vào ô lỗi đầu tiên.
- Gửi một lần ở bước cuối, không tạo sớm. Bỏ giữa chừng thì không để lại bản nháp rỗng trên BE.
- Đóng giữa chừng: bỏ dữ liệu, không hỏi xác nhận (đề xuất, Q8). Lý do: nhập lại 4 lựa chọn rất nhanh, và hộp xác nhận lồng sẽ mở thêm một modal trên modal. Mở lại là form mới, giống `handleOpenChangeComplete` hiện nay.
- Component có sẵn dùng lại: `SearchInput` (ô tìm có nút xóa), `Input` (`allowClear`, `clearLabel`, kiểu date), `Button` (`visible`, `loading`, `loadingLabel`), `InlineAlert`, `SubmitStatus` (dòng cold start), `FormFieldRow`.
- Component mới trong `packages/ui-web`, dựng trên Base UI 1.8.0 (đã có `radio-group`, `toggle-group`, `number-field`, `combobox`):
  - `OptionList`: danh sách chọn một, dựng trên RadioGroup, dùng mũi tên bàn phím. Dùng cho 34 điểm đến, hiện ngay trong bước và lọc bằng `SearchInput`. Không dùng popup combobox vì trong bottom sheet, danh sách hiện sẵn dễ chạm hơn.
  - `ChipGroup`: chọn nhiều, dựng trên ToggleGroup `multiple`. Dùng cho sở thích.
  - `NumberStepper`: dựng trên NumberField, có nút −/+ và `aria-label` tiếng Việt. Dùng cho số ngày.
  - Mọi prop mới đều tùy chọn và có mặc định, theo luật O với `ui-web`.

## 8. Ảnh hưởng và xung đột

Quyết định và tài liệu phải đổi:
- `04-CONTEXT.md` D-09 (một ô tiêu đề) và D-11 (không toast): thay bằng wizard. Ngoại lệ toast chỉ khi lỗi giữa chừng. D-10 (vị trí nút) và D-12 (trạng thái gửi, cold start) giữ nguyên.
- `04-UI-SPEC.md:158`, `:222-226`, `:501`: viết lại mục "Dialog tạo nhanh".
- `REQUIREMENTS.md:44` ITIN-02 đổi thành, ví dụ: "Người dùng tạo lịch trình qua các bước điểm đến, tên, ngày khởi hành và số ngày (sở thích khi BE hỗ trợ), rồi vào thẳng editor". `ROADMAP.md:121` tiêu chí 1 đổi theo.
- Đặc tả `tripory/docs/traveler/ITINERARY_01_MAP+TIMELINE/PT-01_metadata.md:9-12` ("chỉ cần nhập duy nhất Tên chuyến đi") mâu thuẫn với luồng mới. Bạn quyết định có sửa đặc tả hay không.
- `04-UAT-CHECKLIST.md:41` bước 2 phải viết lại và chạy lại. `04-VALIDATION.md:67` cập nhật.
- `04-BE-DEPENDENCIES.md`: thêm mục mới cho đề xuất B (create nhận startDate, dayCount, destinationCode, interests).

Trạng thái phase: Phase 4 đang mở lại vì PUB-02 (`ROADMAP.md:34`, `STATE.md:28-30`). Đề xuất chèn **phase 4.1 "Wizard tạo lịch trình"** thay vì gộp vào Phase 4. Lý do: tách khỏi PUB-02, và giữ nguyên kết quả UAT 23/23 của Phase 4 trừ bước 2. Gộp vào Phase 4 cũng được, nhưng khi đó UAT Phase 4 phải chạy lại bước 2 (Q10).

Code và test phải đổi:
- `create-itinerary-dialog.tsx` và test của nó: thay bằng container wizard và test mới. Giữ tên dialog "Lịch trình mới" thì `my-itineraries-view.test.tsx:230`, `:239` không phải sửa.
- `form-schemas.ts` và test: thêm schema theo bước.
- `form-error-mapping.ts` và test: thêm field nếu B (ví dụ `DayCount.OutOfRange`, `Destination.Unknown`).
- `itinerary-hooks.test.tsx:355`: thêm test cho hook mới.
- `http-itinerary-repository.test.ts:129`: chỉ đổi nếu B đổi body của `create`.
- `packages/itinerary/src/application/use-cases.test.ts`: test use case mới.
- `packages/itinerary/src/exports.test.ts`: nếu có export mới.

Đặt code theo kiến trúc DDD (mục 5–6 tài liệu kiến trúc):
- `domain/`: `destination.ts` (type, tìm không dấu, sắp theo độ phổ biến), `trip-title.ts` (`defaultTripTitle`, `nextTitle`), `day-count.ts` (min, max, mặc định, hàm kiểm), hàm cộng ngày cho `CalendarDate`. Tất cả là hàm thuần, không đồng hồ.
- `application/`: port `DestinationCatalog`. Use case `createPlannedItinerary(repo)`: lệnh ghi có ≥ 2 bước nên được phép có use case (kiến trúc §6). Thứ tự: `create`, rồi `updateMetadata` nếu có ngày, rồi `setDaySubtitle(N, null)` nếu N > 1. Trả `{ itinerary, failed: ('startDate' | 'days')[] }`.
- `infrastructure/`: `static-destination-catalog.ts`.
- `react/`: `useCreatePlannedItinerary` (seed hoặc invalidate detail và danh sách) và `useDestinations`.
- `apps/web/src/composition/itinerary.client.ts`: lắp catalog.
- `apps/web/src/modules/itinerary/ui/create-wizard/`:
  - `create-itinerary-wizard.tsx`: container, nối bề mặt, form, mutation và điều hướng.
  - `use-create-wizard.ts`: một việc, quản lý bước hiện tại.
  - Bốn component trình bày: `destination-step.tsx`, `title-step.tsx`, `schedule-step.tsx`, `interests-step.tsx`.
  - `wizard-progress.tsx`.
  - Nhãn sở thích tiếng Việt để ở bảng ánh xạ trong UI, theo mẫu `TAB_LABELS` (`my-itineraries-view.tsx:18`).
- Luật coding:
  - Ẩn/hiện bước và nút bằng prop `visible`, không dùng `&&` hay `? :` trong JSX.
  - Các bước khai báo bằng bảng cấu hình (luật O), không dùng chuỗi `if/switch` trong thân component.
  - Mỗi file dưới khoảng 150 dòng, prop hẹp (ví dụ bước 1 chỉ nhận `destinations`, `value`, `onChange`).
  - Không có lệnh `fetch` trong UI. Mọi chuỗi hiển thị bằng tiếng Việt.
- Next.js: chỉ dùng `useRouter` của `next/navigation` như hiện nay. Không cần API Next mới.

Về việc nhét điểm đến và sở thích vào `description`: **không nên.** Lý do:
- Làm bẩn nội dung của người dùng.
- Chiếm giới hạn 1000 ký tự.
- Người dùng sửa mô tả trong "Thông tin chuyến đi" là hỏng dữ liệu.
- Mô tả sẽ hiện ở trang công khai và Open Graph của Phase 5.
- BE không lọc theo đó được.
- Muốn bỏ về sau phải viết migration bóc chuỗi.

## 9. Các phương án

### A. Chỉ FE, đủ 4 bước ngay
- Thay đổi:
  - FE như mục 8.
  - Điểm đến chỉ dùng để sinh tên.
  - Sở thích không có chỗ lưu thật: phải hoặc bỏ đi, hoặc nhét vào `description` (bị loại ở mục 8).
- Ưu: không đụng BE.
- Nhược: bước 4 làm người dùng tưởng dữ liệu đã được lưu. Điểm đến không xem lại được ở đâu.
- Rủi ro: lỗi giữa chừng (3 request).
- Công: M.
- Đánh giá: **không khuyến nghị.**

### B. BE trước, FE gửi một request
- BE:
  - `CreateItineraryRequest`/command thêm `StartDate?`, `DayCount?`, `DestinationCode?`, `Interests?`.
  - Đổi tên hoặc thêm factory `Itinerary.CreateDraft(...)` tạo đủ ngày 1..N.
  - Thêm validator, cột và migration.
  - Thêm trường vào `ItineraryDetailDto` và `ItinerarySummaryDto`.
  - Xử lý bẫy PUT ghi đè (mục 3).
  - Danh mục điểm đến phía BE (hằng số hoặc bảng seed) phải khớp FE.
- FE:
  - `ports.create` nhận input mở rộng. Adapter gửi body dựng từ field đặt tên cứng.
  - Thêm Zod DTO và mapper cho trường mới.
  - Wizard 4 bước. Không cần use case nhiều bước.
- Ưu: một request, không lỗi giữa chừng. `DaysCount` đúng. Dữ liệu sẵn cho Discovery.
- Nhược: phải sửa BE ngay, trái với cách làm hiện tại là gom việc BE sang Phase 8 (DEPL-02, `04-BE-DEPENDENCIES.md`). Danh mục điểm đến tồn tại ở hai nơi.
- Công: BE M, FE M.

### C. Làm theo giai đoạn (khuyến nghị)
- Giai đoạn 1 (FE, làm ngay):
  - Wizard 4 bước trên `ResponsiveFormSurface`.
  - Bước 1 chọn trong 34 điểm đến (catalog tĩnh qua port), dùng để sinh tên. Chưa lưu lên BE.
  - Bước 2 tên mặc định.
  - Bước 3 ngày bắt đầu và số ngày, qua use case `createPlannedItinerary` (POST, rồi PUT metadata, rồi PUT ngày N).
  - Bước 4 dựng sẵn nhưng `visible={false}` sau một cờ khả năng (`supportsInterests`) cho tới khi BE có trường.
  - Lỗi giữa chừng thì vẫn vào editor, hiện toast cảnh báo.
- Giai đoạn 2 (khi BE làm B):
  - Đổi adapter `create` gửi đủ trường. Use case rút về một lệnh.
  - Bật bước 4. Hiện điểm đến trong editor nếu muốn.
- Ưu: người dùng có luồng mới ngay. Không có bước nào giả vờ lưu. Đổi sang B chỉ đụng adapter, use case và cờ.
- Nhược: giai đoạn 1 chưa lưu điểm đến. Có 2–3 request và rủi ro lỗi giữa chừng. Ngày thưa trên BE.
- Công: FE M (khoảng 3–4 plan: domain/catalog, ui-web components, wizard, tài liệu và UAT). Giai đoạn 2: FE S, BE M.
- Test: như mục 8, cộng thêm test use case cho các ca lỗi giữa chừng (POST lỗi, PUT metadata lỗi, PUT ngày lỗi).

**Khuyến nghị: C.** Nếu bạn sẵn sàng sửa BE ngay (Q1 = có), chọn B và bỏ use case nhiều bước.

## 10. Câu hỏi cho bạn (kèm đề xuất mặc định)

1. Sửa BE ngay để lưu điểm đến, sở thích, số ngày và ngày bắt đầu trong một request (B), hay làm FE trước (C)? **Đề xuất: C, rồi đưa B vào danh sách phụ thuộc BE.**
2. Bước 1 chỉ có 34 tỉnh/thành, hay cho chọn cả điểm du lịch nổi tiếng (Đà Lạt, Phú Quốc, Hội An, Sa Pa) gắn với tỉnh mới? **Đề xuất: chỉ 34 đơn vị, nhưng tìm được theo alias. Ví dụ gõ "Đà Lạt" ra Lâm Đồng, có dòng phụ "gồm Đà Lạt".**
3. Chỉ chọn một điểm đến, hay nhiều (BRD ghi "destination(s)")? **Đề xuất: một, mở rộng sau.**
4. Bước 1 bắt buộc không? **Đề xuất: bắt buộc** (nó sinh tên mặc định).
5. Số ngày mặc định và trần? **Đề xuất: mặc định 3, từ 1 tới 30.**
6. Danh sách sở thích? **Đề xuất: dùng bộ danh mục Discovery (Nghỉ dưỡng, Phượt & khám phá, Ẩm thực, Check-in sống ảo, Du lịch tiết kiệm), thêm Biển, Núi, Văn hóa – lịch sử. Chọn nhiều, tùy chọn.**
7. Ngày bắt đầu có bắt buộc không, có chặn ngày quá khứ không? **Đề xuất: tùy chọn, không chặn.**
8. Đóng wizard giữa chừng có hỏi xác nhận không? **Đề xuất: không hỏi, bỏ dữ liệu.**
9. Mẫu tên mặc định? **Đề xuất: "Chuyến đi {Tên điểm đến}".** Đổi điểm đến thì tên đi theo, trừ khi người dùng đã tự sửa tên.
10. Đặt việc này ở đâu trong roadmap? **Đề xuất: chèn phase 4.1, tách khỏi PUB-02.** Cập nhật ITIN-02, D-09..D-11, UI-SPEC và UAT bước 2.
11. Thứ tự phổ biến lấy từ đâu? **Đề xuất: bạn duyệt một bảng xếp hạng tĩnh.** Bản nháp: Đà Nẵng, TP. Hồ Chí Minh, Hà Nội, Khánh Hòa, Lâm Đồng, Quảng Ninh, An Giang, Lào Cai, Huế, Ninh Bình, rồi các tỉnh còn lại theo chữ cái. Sau này đổi sang số liệu BE.
12. Có sửa đặc tả `tripory/docs` PT-01 ("chỉ nhập Tên chuyến đi") theo luồng mới không? **Đề xuất: có, ghi luồng 4 bước vào Giai đoạn 1.**

## 11. Chưa xác minh được

- Danh sách 34 đơn vị, tên chính thức, mã số theo QĐ 19/2025/QĐ-TTg, và việc ISO 3166-2 đã cập nhật hay chưa. Phải đối chiếu văn bản gốc.
- Ánh xạ điểm du lịch sang tỉnh mới (Đà Lạt, Phú Quốc, Vũng Tàu, Hội An...) là từ trí nhớ.
- `ValueGeneratedNever()` là bản sửa của lỗi concurrency lúc UAT: suy ra từ code và commit, chưa chạy lại.
- Chưa chạy BE hay FE. Mọi nhận định về hành vi đến từ đọc code.
- Thứ tự phổ biến là giả định, repo không có số liệu.
