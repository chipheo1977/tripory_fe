# Phase 3: Identity & Session (BFF) - Research

**Researched:** 2026-10-13
**Domain:** Phiên đăng nhập bằng cookie httpOnly qua BFF Next.js 16.4 (`proxy.ts`, Route Handler, Cache Components), refresh single-flight + Web Locks, form auth bằng React Hook Form + Zod, TanStack Query + toast
**Confidence:** HIGH cho contract BE (đọc code C#, có file:dòng; tên claim JWT đã chạy thử bằng đúng package `System.IdentityModel.Tokens.Jwt` 8.14.0). HIGH cho hành vi Next (docs cục bộ 16.4.0 đã có, 472 file). MEDIUM cho hành vi Web Locks khi tab iOS bị đóng băng.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Màn đăng nhập / đăng ký
- **D-01:** Hai trang riêng `/login` và `/register` thuộc `(public)`, có link qua lại. Link qua lại **giữ nguyên `?next=`**.
- **D-02:** Đăng ký thành công thì **tự đăng nhập luôn**. Nếu `POST /auth/register` của BE trả token thì dùng token đó. Nếu không, route `/api/auth/register` tự gọi login bằng credential vừa nhập. Researcher kiểm response của BE.
- **D-03:** Sau khi đăng nhập hoặc đăng ký, đi tới `next` hợp lệ. Không có `next` thì tới **`/itineraries/mine`**. `next` không hợp lệ (ra ngoài origin, `//host`, scheme lạ…) thì bỏ qua và dùng đích mặc định.
- **D-04:** Người đã đăng nhập mở `/login` hoặc `/register` thì `proxy.ts` **redirect ngay** sang `next` hợp lệ, không có thì sang `/itineraries/mine`. Đây là kiểm tra lạc quan theo sự có mặt của cookie.
- **D-05:** Đăng nhập sai (hoặc lỗi không gắn được vào field) hiện **thông báo inline ở đầu form, có `role="alert"`**. Giữ email đã nhập, xóa ô mật khẩu. Mutation đăng nhập và đăng ký đặt `errorToast: false`, đúng ngoại lệ D-09 của Phase 2 (mutation tự xử lý lỗi). Lỗi có field thì gắn vào ô theo D-05 và D-05a của Phase 2.
- **D-06:** Bố cục: hai trang nằm trong **AppShell public (có AppHeader)**. Form là `Card` căn giữa, rộng tối đa khoảng 400px.
- **D-07:** **Có toast thành công**. Đăng nhập hiện "Chào mừng, {tên}", đăng ký hiện "Tạo tài khoản thành công". Đây là opt-in theo D-07 và D-08 của Phase 2.

#### Auth gate và trạng thái khách
- **D-08:** Khách thấy **một nút "Đăng nhập"** ở vị trí UserMenu, trỏ tới `/login?next=<path hiện tại>`. Không có nút "Đăng ký" trên header. Trên `/login` thì không cần gắn `next` trỏ về chính nó.
- **D-09:** Trang `/` **giữ nguyên cho mọi người**, không redirect và không thêm CTA (giữ D-13 của Phase 1).
- **D-10:** **Cả route group `(dashboard)` được gate theo mặc định**, còn `(public)` mở. Route mới thêm vào `(dashboard)` tự được bảo vệ. `/settings/password` (D-17) cũng nằm trong `(dashboard)`. `proxy.ts` chỉ kiểm tra lạc quan. Trang vẫn phải tự xử lý trường hợp có cookie nhưng phiên đã chết (D-24, D-25).
- **D-11:** Lúc đang đọc phiên (Suspense fallback do `cacheComponents`), header hiện **Skeleton tròn cỡ avatar** ở chỗ UserMenu, không để nháy nút "Đăng nhập".

#### Menu user
- **D-12:** Nút mở menu: **mobile chỉ có avatar**. **Từ `sm` trở lên có avatar kèm tên**, tên dài thì cắt bằng ellipsis. Không có `avatarUrl` thì hiện chữ cái đầu (fallback sẵn có của `Avatar`). Vùng chạm ≥ 44px, có tên truy cập.
- **D-13:** Đầu menu: **tên kèm email** (chữ nhỏ, màu phụ), sau đó là separator.
- **D-14:** Các mục trong Phase 3: "Lịch trình của tôi" (`/itineraries/mine`), "Đổi mật khẩu" (`/settings/password`), "Đăng xuất".
- **D-15:** "Hồ sơ" và "Tin nhắn" **hiện dạng mục disabled** (`aria-disabled`, không có `href`, không điều hướng), kèm badge **"Sắp có"**. Phase 6 bật "Hồ sơ", Phase 7 bật "Tin nhắn". Đây là **ngoại lệ có chủ đích** do người dùng chọn, so với nguyên tắc "không dựng thứ giả". Nó không phạm luật "không link tới route chưa tồn tại" của Phase 1, vì không phải link. Mục disabled vẫn phải đọc được bằng trình đọc màn hình.
- **D-16:** AUTH-07 được **hoàn tất dần**: Phase 3 giao avatar, tên, Đăng xuất và hai mục disabled. Phase 6 và 7 bật mục tương ứng. Nguồn tên, avatar, email (claim JWT hay `GET /users/me`) do researcher chốt.

#### Đổi mật khẩu
- **D-17:** Trang riêng **`/settings/password`** trong `(dashboard)`. Có nút phụ "Hủy" quay về `/itineraries/mine`.
- **D-18:** Đổi thành công thì **đăng xuất, chuyển sang `/login`, toast "Đã đổi mật khẩu, vui lòng đăng nhập lại"**. Làm vậy bất kể BE có revoke refresh token hay không. Cookie bị xóa, broadcast đăng xuất giống D-22.
- **D-19:** Sai mật khẩu hiện tại thì lỗi **gắn dưới ô "Mật khẩu hiện tại"** và focus chuyển về ô đó, các ô khác giữ nguyên. Nếu BE chỉ trả `errorCode` mà không có tên field, FE map mã đó sang field này. Lỗi "mật khẩu mới trùng mật khẩu cũ" gắn vào ô "Mật khẩu mới" theo cùng cách. Researcher liệt kê `errorCode` thật.

#### Hết phiên và đăng xuất
- **D-20:** Hết phiên thật (`onSessionExpired`, Phase 2 D-14 và D-14a) thì **chuyển sang `/login?next=<path hiện tại>` kèm toast "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"**. Lỗi refresh tạm thời (mạng, timeout, 5xx/cold start) **không** đăng xuất: giữ cookie, hiện câu chung D-04, đúng D-14a. Thay đổi chưa lưu có thể mất. Rủi ro này được chấp nhận, Phase 4 tự cân nhắc.
- **D-21:** Đăng xuất **không cần xác nhận**. Xong thì **về `/`, không toast**. Phase 7 có thể thêm xác nhận nếu đang trong cuộc gọi.
- **D-22:** **Đồng bộ giữa các tab qua `BroadcastChannel`** (cùng origin):
  - Đăng xuất ở một tab thì các tab khác chuyển về `/`, không toast.
  - Đăng nhập ở một tab thì các tab khác làm mới header. Tab đang ở `/login` hoặc `/register` thì chuyển theo `next` hợp lệ, không có thì sang `/itineraries/mine`.
  - Đổi mật khẩu phát cùng tín hiệu với đăng xuất.
  - Đây là kênh riêng cho phiên, không phải UX-06 (chuông cuộc gọi). Adapter `BroadcastChannel` nằm ở `apps/web/src/composition/**`, không nằm trong package.
- **D-23:** Hook cho AUTH-04 "ngắt realtime khi đăng xuất": composition có một chỗ móc (danh sách callback khi đăng xuất). Phase 7 đăng ký SignalR và cuộc gọi vào đó. Phase 3 không có kết nối realtime nào để ngắt.
- **D-24:** Mở hoặc reload trang dashboard đúng lúc access token vừa hết hạn mà refresh token còn: **hồi phục im lặng**. RSC không refresh (theo research). Trang render một client component nhỏ, chạy refresh qua đúng đường single-flight và Web Locks, xong thì `router.refresh()`. Người dùng chỉ thấy skeleton lâu hơn một chút. Refresh thất bại thật thì theo D-20. Cơ chế cụ thể do researcher chốt.
- **D-25:** `proxy.ts` **không** redirect sang `/login` chỉ vì access token hết hạn. Chỉ redirect khi không còn cookie phiên nào. Điều này để giữ tiêu chí 2 "reload không bị đăng xuất".

#### Form và mật khẩu
- **D-26:** Rule mật khẩu là **checklist dưới ô mật khẩu mới, tự đánh dấu khi gõ**. Đạt hay chưa thể hiện bằng icon kèm chữ, không chỉ dựa vào màu. Khu vực có `aria-live="polite"`. Rule được thấy **trước khi nhập** (AUTH-06).
- **D-27:** **Cùng một component checklist** cho đăng ký và đổi mật khẩu, rule truyền vào theo **đúng validator BE của từng form**. Theo research: đăng ký ≥ 8 ký tự. Đổi mật khẩu: chữ hoa, chữ thường, số, ký tự đặc biệt, khác mật khẩu cũ. FE **không tự thêm rule mạnh hơn BE**. Researcher xác nhận rule thật từ validator BE.
- **D-28:** **Ô "Nhập lại mật khẩu" có ở cả `/register` và `/settings/password`**. **Mọi ô mật khẩu** (kể cả login) có nút hiện/ẩn: `IconButton` với `aria-label` "Hiện mật khẩu"/"Ẩn mật khẩu" và `aria-pressed`. Ô dùng `autocomplete` đúng chuẩn (`email`, `current-password`, `new-password`, `name`).
- **D-29:** **Validate đầy đủ phía client bằng Zod**: email đúng dạng, họ tên 1–100 ký tự, rule mật khẩu theo D-27, nhập lại phải khớp. Lỗi hiện **khi blur và khi Gửi**, đã có lỗi thì cập nhật khi gõ. **Nút Gửi luôn bấm được**. Bấm mà còn lỗi thì focus vào ô lỗi đầu tiên. BE vẫn là nguồn sự thật: lỗi BE lọt qua thì xử lý theo D-05 và D-19.

#### Trạng thái gửi và cold start
- **D-30:** Khi đang gửi, nút có `Spinner` và chữ đổi thành "Đang đăng nhập…", "Đang tạo tài khoản…" hoặc "Đang lưu…". Nút có `aria-busy`, **chặn gửi lần hai**. Các ô ở chế độ chỉ đọc (không sửa được) cho tới khi xong.
- **D-31:** Request chạy quá **khoảng 5 giây** thì dưới nút hiện dòng **"Máy chủ đang khởi động, có thể mất tới 30 giây…"** (`aria-live="polite"`). Hết 30 giây (timeout D-11 của Phase 2) thì hiện câu chung D-04 inline theo D-05.

#### Copy
- **D-32:** Copy đã chốt:
  - `/login`: tiêu đề "Đăng nhập", nút "Đăng nhập", link "Chưa có tài khoản? Đăng ký".
  - `/register`: tiêu đề "Tạo tài khoản", nút "Đăng ký", link "Đã có tài khoản? Đăng nhập".
  - `/settings/password`: tiêu đề "Đổi mật khẩu", nút "Đổi mật khẩu", nút phụ "Hủy".
  - Nhãn ô: "Email", "Mật khẩu", "Họ và tên", "Nhập lại mật khẩu", "Mật khẩu hiện tại", "Mật khẩu mới".
  - Toast: xem D-07, D-18, D-20. Dòng cold start: xem D-31. Header khách: "Đăng nhập".

### Claude's Discretion
- Tên cookie, prefix `__Host-`/`__Secure-`, `SameSite`, `Max-Age`, cookie `tripory_at_exp` cho refresh chủ động, tên claim JWT. Research flag của ROADMAP, researcher chốt theo PITFALLS P1 và P2.
- Cơ chế Web Locks trên iOS Safari và fallback nếu không có `navigator.locks`.
- Hình dạng `packages/identity` (rút gọn theo ARCHITECTURE.md), vị trí schema Zod của form (context package hay app), nơi đặt `isSafeNextPath`.
- Cách tách client component hồi phục phiên (D-24) và chỗ đặt nó trong layout `(dashboard)`.
- Có dựng `/api/auth/token` ngay Phase 3 hay để Phase 7.
- Ngưỡng 5 giây (D-31) có thể chỉnh nhẹ nếu research thấy hợp lý hơn.

### Deferred Ideas (OUT OF SCOPE)
- Xác nhận trước khi đăng xuất nếu đang trong cuộc gọi → Phase 7.
- Ngắt SignalR và kết thúc cuộc gọi khi đăng xuất (nối vào chỗ móc D-23) → Phase 7.
- `GET /api/auth/token` cho SignalR (CHAT-09) → Phase 7, trừ khi planner dựng sẵn.
- Đề xuất BE: thêm tên field vào envelope validate (Phase 2 D-05a), endpoint logout/revoke refresh token.
- Quên mật khẩu, xác thực email → chờ BE.
- Dọn marker merge conflict trong `.planning/ROADMAP.md` và `.planning/STATE.md` → việc vặt trước khi plan, không phải tính năng.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Đăng ký bằng email, mật khẩu, họ tên; thấy lỗi validate của BE rõ ràng | §Contract BE (register trả `AuthResponse` có token → D-02 không cần gọi login), §Map lỗi BE vào ô form (bảng errorCode theo form), §Bẫy 1 (regex email của BE từ chối mọi email có chữ "s") |
| AUTH-02 | Đăng nhập; token chỉ ở cookie httpOnly | §Thiết kế cookie (`__Host-`, `HttpOnly`, `SameSite=Lax`, `Max-Age` theo refresh), Pattern 2 (route auth không trả token), test Set-Cookie |
| AUTH-03 | Giữ phiên qua reload, refresh im lặng, N×401 → 1 refresh kể cả nhiều tab | Pattern 3 (route refresh idempotent + Web Locks + `withSessionRefresh` có sẵn), Pattern 4 (refresh chủ động), Pattern 6 (hồi phục D-24), §Web Locks trên iOS |
| AUTH-04 | Đăng xuất ở mọi trang, xóa cookie, ngắt realtime | Pattern 7 (logout route + vòng đời phiên + `BroadcastChannel` + danh sách callback D-23), Bẫy xóa cookie `__Host-` |
| AUTH-05 | Chưa có phiên → login → quay lại đúng trang; `?next=` chỉ path nội bộ | Pattern 5 (`proxy.ts` + lưới an toàn trong layout `(dashboard)`), `toSafeNextPath` và bảng ca test |
| AUTH-06 | Đổi mật khẩu, thấy rule BE trước khi nhập | §Rule mật khẩu thật của BE (có `MinimumLength(8)` mà CONTEXT D-27 chưa ghi; tập ký tự đặc biệt bị giới hạn), §errorCode cho D-19 (`Auth.InvalidCurrentPassword`, `NotEqualValidator`), BE revoke mọi refresh token khi đổi mật khẩu |
| AUTH-07 | Menu user theo phiên thật | §Nguồn dữ liệu Viewer (claim JWT cho tên/email/id, `GET /users/me` qua BFF cho avatar; avatar mặc định của BE là ảnh chung cho mọi người → coi là `null`) |
| AUTH-08 | BFF allowlist `users|itineraries|chat`, chặn `auth/*`, kiểm Origin | Pattern 8 (`resolveBffTarget` thuần, kiểm Origin + `Sec-Fetch-Site`, chặn path traversal, lọc header, rút gọn 401) |
</phase_requirements>

## Summary

BE đã làm sẵn phần lớn việc khó, nhưng có ba điểm làm thay đổi kế hoạch. Thứ nhất, **tên claim JWT là URI dài**, không phải `nameid`/`email` như ARCHITECTURE.md đoán: chạy thử đúng đoạn `JwtTokenService.GenerateAccessToken` với `System.IdentityModel.Tokens.Jwt` 8.14.0 ra payload `{"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "handle", "name", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "exp", "iss", "aud"}`, **không có `sub`, `iat`, `nbf`, không có avatar**. Thứ hai, `POST /auth/register` **trả `AuthResponse` có token** giống login, nên D-02 không cần gọi login lần hai. Thứ ba, `ChangePassword` **thu hồi mọi refresh token** (`User.cs:93-100`), validator đổi mật khẩu có **`MinimumLength(8)`** (CONTEXT D-27 bỏ sót) và tập ký tự đặc biệt chỉ gồm `! ? * @ # $ % ^ & + =`. Ngoài ra có một **lỗi BE nghiêm trọng**: regex của `Email` VO là `^[^@s]+@[^@s]+.[^@s]+$` (thiếu `\`), nên **mọi email chứa chữ "s"/"S" không đăng ký và không đăng nhập được** (đã chạy thử: `user@gmail.com` → false). FE không sửa được; phải báo người dùng trước khi nghiệm thu.

Kiến trúc phiên chốt như sau. Hai cookie httpOnly `__Host-tripory_at` (JWT access) và `__Host-tripory_rt` (refresh), cả hai `Secure; SameSite=Lax; Path=/`, `Max-Age` theo `expiresAt` của BE (hạn refresh, +7 ngày), cộng cookie đọc được bằng JS `__Host-tripory_at_exp` chỉ chứa số giây `exp`. Ở dev qua `http://` dùng tên không prefix và bỏ `Secure`. **Một đường duy nhất xoay refresh token: `POST /api/auth/refresh`, và route này idempotent**: còn hơn 150 giây thì trả "đã tươi" mà không gọi BE. Nhờ vậy mọi lời gọi refresh (phản ứng do 401, chủ động trước hạn, hồi phục khi mở trang) chỉ cần đi qua cùng một `Lock` (`navigator.locks`, fallback mutex trong tab) là an toàn giữa các tab. Không cần đổi API `withSessionRefresh` của Phase 2. BFF `/api/bff/[...path]` và các route `/api/auth/*` dùng chung một hàm gọi upstream (fetch thô, timeout 28 giây, `cache: 'no-store'`), viết dưới dạng `(NextRequest, deps) => NextResponse` để test bằng Vitest mà không cần runtime Next.

Header đọc Viewer từ claim của cookie access trong Server Component bọc `<Suspense>` (không gọi BE, không bị cold start chặn), còn avatar lấy bằng `useQuery(['identity','me'])` qua BFF và được seed ngay từ response login. Form dùng React Hook Form `mode: 'onTouched'` + `zodResolver`, khớp đúng D-29 (blur rồi cập nhật khi gõ, focus ô lỗi đầu tiên). TanStack Query mount ở root với `retry: false` và `MutationCache` gọi `decideMutationSuccess/Error` có sẵn của Phase 2.

**Primary recommendation:** Dựng `packages/identity` rút gọn (domain + application/ports + infrastructure Zod + react hooks), viết lõi server thành hàm thuần nhận `NextRequest` và trả `NextResponse` (cookie, refresh idempotent, BFF allowlist), nối mọi refresh vào một `refreshSession()` trong composition đi qua `navigator.locks`. Báo người dùng lỗi regex email của BE ngay khi bắt đầu Phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Đổi credential lấy token, ghi/xóa cookie | Frontend Server (Route Handler `/api/auth/*` → `composition/server`) | API/Backend (BE `/auth/*`) | Chỉ Route Handler/Server Function ghi được cookie (docs `cookies.md`); token không được về JS |
| Xoay refresh token | Frontend Server (`POST /api/auth/refresh`, idempotent) | Browser (khởi động + tuần tự hóa bằng Web Locks) | BE có reuse detection; chỉ client có khóa chung giữa các tab, server serverless thì không |
| Gate route dashboard | Frontend Server (`proxy.ts`, lạc quan) | Frontend Server (lưới an toàn trong layout `(dashboard)`) | Proxy chỉ thấy URL, không thấy route group; layout bắt route quên khai báo |
| Đọc Viewer cho header | Frontend Server (RSC trong `<Suspense>`, giải mã claim) | Browser (query `users/me` cho avatar) | Không gọi BE khi render header, tránh cold start chặn header |
| BFF REST | Frontend Server (`/api/bff/[...path]`) | API/Backend | Gắn Bearer từ cookie, allowlist, kiểm Origin, rút gọn 401 |
| Rule mật khẩu, `toSafeNextPath`, độ tươi token | `packages/identity/src/domain` (thuần) | — | Dùng chung web/mobile, test rẻ |
| Schema DTO BE, schema claim, mapper Viewer | `packages/identity/src/infrastructure` (Zod) | — | ACL theo tài liệu kiến trúc mục 5–6 |
| Form, checklist, toast, điều hướng | Browser (`apps/web/src/modules/identity/ui`) | — | Trình bày + `next/navigation` |
| Đồng bộ tab, Web Locks, vòng đời phiên | Browser (`apps/web/src/composition/**`) | — | Browser global bị cấm trong package |
| Xác thực thật, kiểm quyền | API/Backend | — | FE không verify chữ ký JWT (không giữ secret) |

## Contract BE (đọc code, 2026-10-13)

Gốc: `tripory_be/src/Services/Tripory/`. Route gốc `api/v1/[controller]` (`Tripory.API/Controllers/ApiController.cs:8`). JSON camelCase, envelope `ApiResponse` như Phase 2 đã ghi.

| Endpoint | Body | Thành công `data` | Lỗi chính | Nguồn |
|---|---|---|---|---|
| `POST /api/v1/auth/register` | `{ email, password, fullName }` | `AuthResponse { accessToken, refreshToken, expiresAt, user: UserDto }` (**có token**) | `User.EmailAlreadyExists` 409; `Email.Empty`/`Email.InvalidFormat`/`Email.TooLong` 400; `User.InvalidFullName` 400; FluentValidation 400 | `AuthController.cs:20-33`, `RegisterCommandHandler.cs:35-95`, `RegisterCommandValidator.cs:11-21` [VERIFIED: code] |
| `POST /api/v1/auth/login` | `{ email, password }` | `AuthResponse` như trên | `Auth.InvalidCredentials` 400 (cả khi email sai dạng VO), `Auth.UserBanned` 400, FluentValidation 400 | `LoginCommandHandler.cs:34-90`, `LoginCommandValidator.cs` [VERIFIED] |
| `POST /api/v1/auth/refresh-token` | `{ accessToken, refreshToken }` | `TokenResponse { accessToken, refreshToken, expiresAt }` (**không có user**) | 400: `Token.InvalidAccessToken`, `Token.UserUnavailable`, `Token.InvalidRefreshToken`, `Token.Compromised` (thu hồi mọi phiên), `Token.Expired`; token hỏng có thể ném → 500 | `RefreshTokenCommandHandler.cs:29-77` [VERIFIED] |
| `PUT /api/v1/auth/change-password` (`[Authorize]`) | `{ currentPassword, newPassword }` | `null` (envelope success, message "Mật khẩu đã được thay đổi thành công. Vui lòng đăng nhập lại.") | `Auth.InvalidCurrentPassword` 400; `Auth.Unauthorized` 401 (envelope); `User.NotFound` 404; FluentValidation 400; 401 body rỗng nếu Bearer hỏng/hết hạn | `AuthController.cs:63-76`, `ChangePasswordCommandHandler.cs:31-52` [VERIFIED] |
| `GET /api/v1/users/me` (`[Authorize]`) | — | `UserProfileResponse { id, email, handle, fullName, bio, avatarUrl, status, roles, createdAt }` | `Auth.Unauthorized` 401, `User.NotFound` 404 | `UsersController.cs:37-49`, `GetCurrentUserProfileQueryHandler.cs` [VERIFIED] |

`UserDto = { id, email, handle, fullName, bio, avatarUrl, status, roles }` (`Application/Common/Models/UserDto.cs`).

Điểm quyết định:
- **D-02 chốt:** register trả token → route `/api/auth/register` ghi cookie y như login. Không gọi login lần hai. [VERIFIED: `RegisterCommandHandler.cs:69-94`]
- **`expiresAt` là hạn refresh token** (`UtcNow.AddDays(7)` cứng ở `LoginCommandHandler.cs:71`, `RegisterCommandHandler.cs:73`, `RefreshTokenCommandHandler.cs:65`), không phải hạn access. `JwtOptions.RefreshTokenExpiryDays` có khai báo nhưng handler không dùng. [VERIFIED]
- **Hạn access** = claim `exp`, tính từ `JwtOptions.ExpiryMinutes` (appsettings 60, mặc định code 15 nếu thiếu cấu hình). `ClockSkew = TimeSpan.Zero` (`Program.cs:46`). Không hard-code 60 phút. [VERIFIED]
- **Đổi mật khẩu thu hồi mọi refresh token** (`User.ChangePassword` gọi `RevokeAllRefreshTokens`). Access token hiện tại vẫn hợp lệ tới `exp`. D-18 xóa cookie ngay là bắt buộc: nếu giữ cookie refresh cũ, lần refresh kế tiếp gửi token đã bị revoke, BE đi vào nhánh reuse (`RefreshTokenCommandHandler.cs:52-58`) và trả `Token.Compromised`. Không mất gì thêm (mọi token đã bị thu hồi), nhưng người dùng thấy câu "không còn an toàn" sai ngữ cảnh. Các tab và thiết bị khác cũng sẽ gặp đúng nhánh này ở lần refresh sau; đó là hành vi mong muốn. [VERIFIED]
- **Login với email sai dạng VO** trả `Auth.InvalidCredentials` (không phải `Email.InvalidFormat`), còn register trả `Email.InvalidFormat`. [VERIFIED: `LoginCommandHandler.cs:36-38`]
- **CORS BE** là `SetIsOriginAllowed(_ => true)` + `AllowCredentials` (`Program.cs:100-109`). BE không tự bảo vệ theo Origin; lớp kiểm Origin duy nhất là BFF. BFF gọi BE server-to-server nên CORS không ảnh hưởng. [VERIFIED]
- Không có endpoint logout/revoke (giới hạn đã chấp nhận). [VERIFIED: grep `HttpPost|HttpPut` trong `AuthController.cs`]

### Tên claim JWT (research flag ROADMAP)

Chạy thử ngày 2026-10-13: project console `net10.0` + `System.IdentityModel.Tokens.Jwt` 8.14.0 (đúng bản trong `Tripory.Infrastructure.csproj`), sao nguyên `new JwtSecurityToken(issuer, audience, claims, expires, creds)` + `WriteToken`. Payload thật:

```json
{"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier":"<guid>",
 "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress":"a@b.vn",
 "handle":"a","name":"<fullName>",
 "http://schemas.microsoft.com/ws/2008/06/identity/claims/role":"Traveler",
 "exp":1791890410,"iss":"TriporyBackend","aud":"TriporyClientApp"}
```

[VERIFIED: chạy `dotnet run`, đã xóa project tạm]

- Constructor `JwtSecurityToken(...)` không áp `OutboundClaimTypeMap`, nên `ClaimTypes.*` giữ nguyên URI. ARCHITECTURE.md đoán `nameid` là **sai**.
- Không có `sub` (BE refresh có fallback `sub`, `RefreshTokenCommandHandler.cs:35-36`), không có `iat`/`nbf`.
- `role` là chuỗi khi có một vai trò, **mảng** khi có nhiều. Phase 3 không dùng role; schema để `optional`, nhận cả hai.
- **Không có avatar trong token.**
- `name` là tiếng Việt có dấu: giải mã base64url phải ra **UTF-8** (`Buffer.from(seg, 'base64url').toString('utf8')`). `atob` trả chuỗi Latin-1, làm vỡ dấu.
- Schema nên nhận cả dạng URI lẫn dạng ngắn (`nameid`/`sub`, `email`) để không vỡ nếu BE chuyển sang `JsonWebTokenHandler` hoặc bật outbound map. Ưu tiên URI.

### Rule mật khẩu thật (D-26, D-27)

| Form | Rule BE | Nguồn | Checklist FE |
|---|---|---|---|
| Đăng ký | `NotEmpty`, `MinimumLength(8)`. Các rule hoa/thường/số/đặc biệt **đang bị comment** | `RegisterCommandValidator.cs:19-26` | `minLength` (8) |
| Đổi mật khẩu | `NotEmpty`, `MinimumLength(8)`, `Matches([A-Z])`, `Matches([a-z])`, `Matches([0-9])`, `Matches([\!\?\*\@\#\$\%\^\&\+\=])`, `NotEqual(CurrentPassword)` | `ChangePasswordCommandValidator.cs:12-19` | `minLength` (8), `uppercase`, `lowercase`, `digit`, `special`, `differentFromCurrent` |

[VERIFIED: code]

- **CONTEXT D-27 thiếu `minLength` cho đổi mật khẩu.** BE có `MinimumLength(8)`. Đây là "rule thật từ validator BE" mà D-27 giao researcher xác nhận, nên checklist đổi mật khẩu phải có 6 mục. Bảng copy trong UI-SPEC đã có `minLength`; chỉ cần truyền đủ.
- **Tập ký tự đặc biệt chỉ gồm `! ? * @ # $ % ^ & + =`.** `-`, `_`, `.`, khoảng trắng, `~` không tính. Regex FE phải giống hệt: `/[!?*@#$%^&+=]/`. Copy UI-SPEC "Có ký tự đặc biệt (ví dụ ! @ # $)" đúng hướng nhưng nên liệt kê đủ để người dùng không gõ `-` rồi bị từ chối: đề xuất "Có một trong các ký tự ! ? * @ # $ % ^ & + =". Đây là chỉnh copy, planner xác nhận với người dùng (A3).
- `[A-Z]`, `[a-z]` của .NET mặc định chỉ khớp ASCII. "Đ", "ă" không tính là chữ hoa/thường. Regex JS `/[A-Z]/` cũng chỉ ASCII, khớp với BE.
- `MinimumLength` của FluentValidation đếm `string.Length` (UTF-16), JS `.length` cũng UTF-16. Khớp.
- Mật khẩu **không trim** ở BE. FE không trim mật khẩu.
- Email: BE `Trim().ToLowerInvariant()` trước khi kiểm (`Email.cs`). FE có thể trim email trong Zod (`z.string().trim()`), không đổi chữ thường (để BE làm).
- Họ tên: `NotEmpty` (FluentValidation coi chuỗi toàn khoảng trắng là rỗng) + `MaximumLength(100)` + VO trim. FE: `trim().min(1).max(100)`. Lưu ý BE đếm độ dài **trước** trim; FE nên đếm trên chuỗi chưa trim để không cho qua chuỗi 101 ký tự có khoảng trắng cuối. Ca này hiếm, chọn: validate độ dài trên giá trị thô.

### errorCode cho map lỗi vào ô (D-05, D-19)

`ValidationPipelineBehavior` chỉ trả **lỗi đầu tiên** và `errorCode` là tên validator mặc định của FluentValidation (không có `WithErrorCode`). Mã mặc định: `NotEmptyValidator`, `MinimumLengthValidator`, `MaximumLengthValidator`, `EmailValidator`, `RegularExpressionValidator`, `NotEqualValidator`. [VERIFIED: grep validator; CITED: docs.fluentvalidation.net/en/latest/error-codes.html qua 02-RESEARCH]

| Form | errorCode | Gắn vào ô | Copy hiển thị |
|---|---|---|---|
| `/login` | `Auth.InvalidCredentials` | không (InlineAlert) | bảng map: "Email hoặc mật khẩu không đúng." |
| `/login` | `Auth.UserBanned` | không | message BE (có lý do khóa) |
| `/login` | `EmailValidator` | `email` | message BE |
| `/register` | `User.EmailAlreadyExists` | `email` | bảng map: "Email này đã được đăng ký." |
| `/register` | `Email.InvalidFormat`, `Email.Empty`, `Email.TooLong`, `EmailValidator` | `email` | bảng map hoặc message BE |
| `/register` | `MaximumLengthValidator`, `User.InvalidFullName` | `fullName` | message BE / bảng map |
| `/register` | `MinimumLengthValidator` | `password` | message BE |
| `/settings/password` | `Auth.InvalidCurrentPassword` | `currentPassword` (+ focus) | bảng map: "Mật khẩu hiện tại không đúng." |
| `/settings/password` | **`NotEqualValidator`** (mới trùng cũ, D-19) | `newPassword` | message BE "Mật khẩu mới không được trùng với mật khẩu hiện tại." |
| `/settings/password` | `MinimumLengthValidator`, `RegularExpressionValidator` | `newPassword` | message BE |
| mọi form | `NotEmptyValidator` | không (mơ hồ: nhiều field cùng mã) | InlineAlert, message BE |
| mọi form | `ValidationProblemDetails` (`fieldErrors`) | theo key (`email`, `password`…) | "Giá trị không hợp lệ." (Phase 2 D-05a) |

Map này là **theo từng form** (cùng mã `MinimumLengthValidator` nghĩa khác nhau giữa form), nên đặt ở `modules/identity/ui`, không thêm vào `ERROR_MESSAGES` toàn cục. Khi gắn vào ô, nội dung ô = `ERROR_MESSAGES.get(code) ?? error.message ?? GENERIC`. Chỉ có ý nghĩa như lưới an toàn: Zod phía client chặn trước hầu hết ca.

**`session_expired` trong form (Phase 2 IN-02):** form gặp `kind === 'session_expired'` thì **không** hiện InlineAlert, vì `onSessionExpired` đã chuyển trang + toast (D-20). Áp cho cả ba form.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` (đã có) | 16.4.0 | `proxy.ts`, Route Handler, `cookies()`, `NextRequest`/`NextResponse` | Docs cục bộ 16.4.0 có đủ (`01-app/**`, 472 file) [VERIFIED: `node_modules/next/package.json`] |
| `@tanstack/react-query` | 5.104.2 | `QueryClientProvider`, `MutationCache`, `useMutation`/`useQuery` | Mới nhất, phát hành 2026-10-11; STACK.md chọn 5.104.1, bản vá kế tiếp [VERIFIED: npm view] |
| `zod` | 4.6.7 | Schema DTO BE, claim JWT, env, form | Mới nhất 2026-10-12; STACK.md 4.6.5 [VERIFIED: npm view] |
| `react-hook-form` | 7.89.0 | State form, `mode: 'onTouched'`, `shouldFocusError` | Bản STACK.md đã kiểm; 7.90.0 mới ra 2026-10-11 (2 ngày), chưa cần [VERIFIED: npm view] |
| `@hookform/resolvers` | 5.9.1 | `zodResolver` cho Zod 4 | Mới nhất, nhận `zod ^3.25 || ^4` [VERIFIED: npm view; CITED: STACK.md] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tripory/api-client` (workspace) | — | `createFetchHttpClient`, `withSessionRefresh`, `ApiError` | Client browser, gọi `/api/auth/*` và `/api/bff/*` |
| `@tripory/ui-web` (workspace) | — | `Toast`/`notify`, `Card`, `FormField`, `Input`, `DropdownMenu`, `Avatar`, `Skeleton`… | UI-SPEC liệt kê; thêm `PasswordInput`, `InlineAlert`, `DropdownMenuLinkItem`, `Button.loadingLabel` |
| Web APIs: `navigator.locks`, `BroadcastChannel`, `Buffer` (Node) | — | Khóa giữa tab, đồng bộ phiên, giải mã base64url phía server | Không thêm thư viện |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Giải mã JWT bằng `Buffer` (không verify) | `jose` 6.x để verify chữ ký | Phải chia sẻ HMAC secret của BE với FE, tức FE tự đúc được token. Không dùng |
| Route Handler cho login/logout | Server Action + `useActionState` | STACK.md §8 loại: mutation đi qua hook package để dùng lại cho mobile |
| React Hook Form | Tự viết state form + Zod | D-29 (blur → cập nhật khi gõ, focus ô lỗi đầu, chặn gửi hai lần) chính là `mode: 'onTouched'` + `shouldFocusError` + `formState.isSubmitting`. Tự viết là hand-roll |
| `use cache: private` cho Viewer | Đọc cookie trực tiếp trong `<Suspense>` | Private cache giữ kết quả 5 phút ở client (docs `authentication-with-cache-components.md`, Step 6), dễ hiện header cũ sau login/logout. Viewer giải mã cookie rất rẻ, không cần cache |
| `server-only` package | Không cài | Package `server-only` ném lỗi khi import ngoài điều kiện `react-server`, nên Vitest import file `*.server.ts` sẽ vỡ. Giữ `import 'server-only'` chỉ ở vỏ mỏng (Next tự xử lý), logic test được nằm ở file không có dòng này [ASSUMED: hành vi package `server-only`; cách tránh không phụ thuộc giả định] |

**Installation (catalog, pin cứng):**
```yaml
# pnpm-workspace.yaml → catalog:
"@tanstack/react-query": 5.104.2
zod: 4.6.7
react-hook-form: 7.89.0
"@hookform/resolvers": 5.9.1
```
```jsonc
// apps/web/package.json dependencies
"@tripory/identity": "workspace:*", "@tanstack/react-query": "catalog:", "zod": "catalog:",
"react-hook-form": "catalog:", "@hookform/resolvers": "catalog:"
// packages/identity/package.json
"dependencies": { "@tripory/api-client": "workspace:*", "@tripory/shared-kernel": "workspace:*", "zod": "catalog:" },
"peerDependencies": { "react": "catalog:", "@tanstack/react-query": "catalog:" },
"devDependencies": { "react": "catalog:", "@tanstack/react-query": "catalog:", ... }
```
Không cần sửa `boundaries.mjs`: `zod` có sẵn trong allowlist `infrastructure`, `react` + `@tanstack/react-query` có sẵn trong allowlist `react`. `apps/web` theo preset `app()` không có allowlist module ngoài. [VERIFIED: `boundaries.mjs:119-127, 197-200`]

## Thiết kế cookie (research flag ROADMAP)

| Cookie | Giá trị | Thuộc tính (production) | `Max-Age` |
|---|---|---|---|
| `__Host-tripory_at` | JWT access | `HttpOnly; Secure; SameSite=Lax; Path=/`, không `Domain` | `expiresAt` (refresh) − now, giây, ≥ 0 |
| `__Host-tripory_rt` | refresh token | `HttpOnly; Secure; SameSite=Lax; Path=/`, không `Domain` | như trên |
| `__Host-tripory_at_exp` | `exp` của access (số nguyên giây) | `Secure; SameSite=Lax; Path=/`, **không** `HttpOnly` | như trên |

Lý do:
- **`__Host-`** buộc `Secure`, `Path=/`, không `Domain`: cookie không bị subdomain ghi đè hay "cookie tossing". Đây là prefix mạnh nhất có hỗ trợ rộng. `__Host-Http-` mới hơn và chưa chắc được hỗ trợ đều, không dùng. [CITED: developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie §Cookie prefixes]
- **Refresh cũng `Path=/`** (khác ARCHITECTURE.md đề xuất `Path=/api/auth`). `__Host-` bắt buộc `Path=/`; MDN ghi rõ `Path` không phải biện pháp bảo mật. Đổi lại refresh token được gửi kèm mọi request cùng origin tới chính Vercel của mình; BFF phải bỏ header `cookie` khi gọi BE (vốn đã phải làm). `proxy.ts` cũng thấy được cả hai cookie. [CITED: MDN Set-Cookie §Path]
- **`SameSite=Lax`**: mở link từ Zalo/Messenger vẫn có phiên (Strict thì không), POST cross-site không mang cookie. Không cần `None` vì BFF cùng origin. [CITED: MDN; PITFALLS P14]
- **`Max-Age` của access = hạn refresh** (P2): BE cần access token đã hết hạn trong body refresh. Lấy từ `expiresAt` của response, không đặt cứng 7 ngày.
- **`tripory_at_exp`** chỉ chứa một con số. JS đọc được, nên tiêu chí 1 "document.cookie không đọc được access/refresh token" vẫn đúng. Chỉ dùng để lên lịch refresh chủ động; quyết định có refresh hay không luôn do route (đồng hồ server).
- **Dev qua `http://`**: prefix `__Host-`/`__Secure-` và `Secure` chỉ được chấp nhận từ origin HTTPS. Chrome/Firefox bỏ qua yêu cầu HTTPS cho `localhost`, Safari thì không, và truy cập từ iPhone qua IP LAN (`http://192.168.x.x:3000`) cũng không. Chốt: `secure = process.env.NODE_ENV === 'production'`; khi không secure thì tên cookie bỏ prefix (`tripory_at`, `tripory_rt`, `tripory_at_exp`). Muốn thử prefix ở local thì `next dev --experimental-https`. [CITED: MDN Set-Cookie; PITFALLS P14]
- Tên cookie là hằng số trong `apps/web/src/composition/session-cookies.ts` (không `server-only`, vì `proxy.ts` và code client đọc `at_exp` cùng dùng), dạng hàm `sessionCookieNames(secure: boolean)`.

**Xóa cookie phải ghi lại đủ thuộc tính.** Next `cookies().delete(name)` / `response.cookies.delete(name)` chỉ phát `Set-Cookie` với `Expires` quá khứ. Với cookie `__Host-`, trình duyệt từ chối Set-Cookie thiếu `Secure`/`Path=/`, nên lệnh xóa bị bỏ qua và người dùng không đăng xuất được. Xóa bằng `set(name, '', { ...sameAttrs, maxAge: 0 })`. Test kiểm header `Set-Cookie` của logout có `Secure`, `Path=/`, `Max-Age=0`. [CITED: docs `cookies.md` dòng 273 "maxAge 0"; MDN prefix rules. Hành vi `delete()` không kèm `Secure`: ASSUMED, nên test khóa lại]

## Architecture Patterns

### System Architecture Diagram

```
 Trình duyệt (tab A, tab B…)
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │ LoginForm/RegisterForm/ChangePasswordForm (RHF + Zod)                                 │
 │   └─ useLogin/useRegister/useChangePassword (@tripory/identity/react)                 │
 │        └─ SessionGateway (composition) ── authHttp: fetch base '/api/auth' ───────────┼──┐
 │ UserMenu ← viewer (prop từ RSC) + useMyProfile() ── bffHttp: base '/api/bff' ─────────┼──┼─┐
 │                                                     └─ withSessionRefresh ─┐          │  │ │
 │ SessionKeeper (refresh chủ động exp−120s, visibilitychange) ───────────────┤          │  │ │
 │ SessionRecovery (D-24, trong layout dashboard) ────────────────────────────┤          │  │ │
 │                                        refreshSession() = lock('tripory-session-refresh')│ │
 │                                        navigator.locks ▸ fallback mutex trong tab       │  │ │
 │                                          └─ POST /api/auth/refresh ───────────────────┼──┤ │
 │ sessionEvents (expired | logged-in | logged-out) ◀─▶ BroadcastChannel('tripory-session')│ │
 │   └─ SessionEffects (React): router.replace/refresh, notify, queryClient.clear,        │  │ │
 │                              chạy logoutHandlers (chỗ móc D-23)                        │  │ │
 └───────────────────────────────────────────────────────────────────────────────────────┘  │ │
                                                                                            │ │
 Vercel (Node runtime)                                                                      ▼ ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────────┐
 │ proxy.ts: có cookie at? ─ /login,/register + có ─▶ 307 next an toàn | /itineraries/mine    │
 │                         ─ route bảo vệ + không ─▶ 307 /login?next=<path+search>            │
 │ RSC: AppHeader slot <Suspense fallback=Skeleton> → getViewer(): giải mã claim (không gọi BE)│
 │      (dashboard)/layout <Suspense> → DashboardSessionGate: none→LoginRedirect,             │
 │                                                       stale→SessionRecovery, fresh→children│
 │ /api/auth/login|register: Origin ✓ → BE → Zod AuthResponse → set 3 cookie → {viewer}       │
 │ /api/auth/refresh: Origin ✓ → thiếu cookie→401 expired | còn >150s→200 no-op               │
 │                    | BE refresh-token: 200→set cookie | 400 Token.*→xóa cookie, 401 expired │
 │                    | 5xx/timeout/mạng→giữ cookie, 503                                       │
 │ /api/auth/logout: Origin ✓ → xóa cookie → 200                                              │
 │ /api/auth/change-password: Origin ✓ → stale→401 expired | BE PUT → 200: xóa cookie         │
 │ /api/bff/[...path]: resolveBffTarget (allowlist, chống traversal) → Origin ✓ →             │
 │                     stale→401 expired | Bearer từ cookie, bỏ cookie/host → BE /api/v1/*    │
 └───────────────────────────────────────────────┬────────────────────────────────────────────┘
                                                 ▼  HTTPS, timeout 28 s, cache: 'no-store'
                                   Backend .NET (/api/v1/auth/*, /api/v1/users/me …)
```

### Recommended Project Structure

```
packages/identity/                          # contextPackage(), rút gọn
├── package.json                            # exports ".", "./http", "./react"
├── eslint.config.mjs  tsconfig.json  vitest.config.ts
└── src/
    ├── index.ts                            # domain + application
    ├── domain/
    │   ├── viewer.ts                       # type Viewer, viewerDisplayName
    │   ├── safe-next-path.ts               # toSafeNextPath(raw) → string | null
    │   ├── token-freshness.ts              # remainingSeconds(exp, nowSec), isFresh(exp, nowSec, minSec)
    │   └── password-rules.ts               # REGISTER_PASSWORD_RULES, CHANGE_PASSWORD_RULES, evaluate()
    ├── application/ports.ts                # SessionGateway, ProfileReader
    ├── infrastructure/
    │   ├── index.ts                        # → "./http"
    │   ├── dto.ts                          # authResponseDto, tokenResponseDto, userDto, userProfileDto, viewerDto
    │   ├── access-token-claims.ts          # accessTokenClaimsSchema, parseAccessTokenClaims(payload: unknown)
    │   ├── mappers.ts                      # toViewer, normalizeAvatarUrl (DefaultAvatarUrl → null)
    │   └── http-session-gateway.ts         # createHttpSessionGateway(http), createHttpProfileReader(http)
    └── react/index.ts                      # createIdentityHooks(deps), identityKeys

apps/web/src/
├── proxy.ts
├── app/
│   ├── layout.tsx                          # <Providers> (client) + title.template
│   ├── providers.tsx                       # 'use client': QueryClientProvider, Toast, SessionEffects, SessionKeeper
│   ├── (public)/login/page.tsx  (public)/register/page.tsx
│   ├── (dashboard)/layout.tsx              # AppShell + <Suspense><DashboardSessionGate>{children}
│   ├── (dashboard)/settings/password/page.tsx
│   └── api/
│       ├── auth/{login,register,logout,refresh,change-password}/route.ts   # vỏ mỏng, POST/PUT
│       └── bff/[...path]/route.ts          # vỏ mỏng, GET POST PUT DELETE
├── composition/
│   ├── session-cookies.ts                  # tên + thuộc tính cookie (dùng chung proxy/server/client)
│   ├── server/                             # logic thuần, test được; KHÔNG import 'server-only'
│   │   ├── env.ts                          # Zod parse API_ORIGIN (server-only env)
│   │   ├── upstream.ts                     # callBackend(path, init, deps): fetch thô, timeout 28 s
│   │   ├── session-store.ts                # readSession(get, nowSec), writeSession(res, tokens), clearSession(res)
│   │   ├── request-guards.ts               # checkSameOrigin(request), envelopes lỗi BFF
│   │   ├── auth-handlers.ts                # handleLogin/Register/Logout/Refresh/ChangePassword(req, deps)
│   │   └── bff.ts                          # resolveBffTarget(segments, rawPath), forwardToBackend(req, segs, deps)
│   ├── viewer.server.ts                    # import 'server-only'; getViewer() = cache(cookies → claims → Viewer)
│   ├── http.client.ts                      # authHttp, bffHttp, refreshSession, navigator.locks + fallback
│   ├── identity.client.ts                  # gateway + hooks = createIdentityHooks(...)
│   ├── session-events.client.ts            # emitter + BroadcastChannel adapter + logoutHandlers (D-23)
│   └── query-client.ts                     # makeQueryClient(): retry false, MutationCache → notify
└── modules/identity/ui/
    ├── auth-form-card.tsx  login-form.tsx  register-form.tsx  change-password-form.tsx
    ├── password-checklist.tsx  submit-status.tsx
    ├── form-schemas.ts                     # Zod schema form + copy lỗi (UI-SPEC)
    ├── form-error-mapping.ts               # map errorCode → field theo từng form
    ├── session-recovery.tsx  login-redirect.tsx  session-effects.tsx  session-keeper.tsx
    └── guest-login-button.tsx
```

Ghi chú vị trí:
- **`toSafeNextPath` ở `identity/domain`**: thuần, không dùng `URL` (RN có `URL` không đầy đủ), chỉ kiểm chuỗi. `proxy.ts`, form và `SessionEffects` cùng import từ `@tripory/identity`.
- **Rule mật khẩu ở `identity/domain`** dạng dữ liệu `{ id, min?, test(value, ctx) }`, ghi nguồn file:dòng validator BE trong comment. Đây là chép luật BE có chủ đích theo D-27 (tài liệu kiến trúc mục 9 cảnh báo chép luật; ở đây người dùng đã chốt). Copy hiển thị của rule thuộc app.
- **Schema form Zod ở app** (`modules/identity/ui/form-schemas.ts`): chứa copy tiếng Việt, là luật UX (STACK.md §8). Schema dùng predicate từ domain để checklist và Zod không lệch nhau.
- **File `composition/server/*.ts` không có `import 'server-only'`** để Vitest import được. Chúng chỉ được import từ `app/api/**/route.ts`, `proxy.ts` và `viewer.server.ts`. Route Handler vốn chỉ chạy server, không có rủi ro lọt vào bundle client. Chỉ `viewer.server.ts` (dùng `next/headers`) có `import 'server-only'`.
- **Không tạo barrel `composition/index.ts`** (PITFALLS P12).

### Pattern 1: Viewer từ claim, avatar từ `/users/me`

**What:** Header đọc cookie access trong RSC, giải mã payload (không verify chữ ký, không kiểm `exp`, chỉ để hiển thị), map sang `Viewer { id, email, fullName, handle, avatarUrl: null }`. Avatar đến sau từ `useMyProfile()` (GET `/api/bff/users/me`, `staleTime` 5 phút), được seed ngay khi login/register bằng `queryClient.setQueryData(identityKeys.me, toProfile(response.user))`.

**Vì sao không gọi `/users/me` trong RSC:** header nằm trong layout, BE ngủ thì header kẹt skeleton tới 30 giây. Truyền access token vào `use cache` thì token nằm trong cache key dạng plain text (docs `authentication-with-cache-components.md`, "cache keys and tags are stored in plain text"). Claim có sẵn tên/email, đủ cho first paint. [CITED: docs cục bộ]

**Avatar mặc định của BE là ảnh chung:** `User.DefaultAvatarUrl = "https://api.dicebear.com/7.x/identicon/svg?seed=tripory"` (seed cố định, `User.cs:11,19,54`), nên mọi người dùng chưa đổi avatar có **cùng một ảnh**. `normalizeAvatarUrl` map đúng chuỗi này (và rỗng) thành `null` để `Avatar` hiện chữ cái đầu. [VERIFIED: code]

```tsx
// apps/web/src/composition/viewer.server.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { readViewerFromCookie } from "./server/session-store";

/** Viewer để hiển thị; null = khách. Không gọi BE. */
export const getViewer = cache(async () => {
  const jar = await cookies();                       // Next 16: async
  return readViewerFromCookie((name) => jar.get(name)?.value);
});
```
```tsx
// apps/web/src/components/app-shell.tsx (server) → truyền slot vào AppHeader (client)
<AppHeader
  account={
    <Suspense fallback={<Skeleton aria-hidden className="size-8 rounded-full" />}>
      <AccountSlot />   {/* async server: const viewer = await getViewer(); viewer ? <UserMenu viewer={viewer}/> : <GuestLoginButton/> */}
    </Suspense>
  }
/>
```
`AppHeader` là client component (dùng `usePathname`), nhận server component qua prop `account` (ReactNode) là hợp lệ. `GuestLoginButton` dùng `usePathname()` + `useSearchParams()` để dựng `next`; nằm trong `<Suspense>` có sẵn nên không vướng lỗi prerender. [CITED: docs `use-router.md`, `authentication-with-cache-components.md` Step 2]

### Pattern 2: Route auth là hàm thuần trên `NextRequest`/`NextResponse`

**What:** Mọi handler nhận `(request: NextRequest, deps: { env, fetch, nowMs })` và trả `NextResponse`. Đọc cookie bằng `request.cookies`, ghi bằng `response.cookies.set`. File `route.ts` chỉ là:

```ts
// apps/web/src/app/api/auth/login/route.ts
import type { NextRequest } from "next/server";
import { handleLogin } from "@/composition/server/auth-handlers";
import { serverDeps } from "@/composition/server/env";

export function POST(request: NextRequest) {
  return handleLogin(request, serverDeps());
}
```

**Vì sao:** `cookies()` của `next/headers` cần ngữ cảnh request của Next, gọi trong Vitest sẽ lỗi. `NextRequest`/`NextResponse` chạy được trong Node thuần, nên test được toàn bộ: Origin, Set-Cookie, phân loại lỗi, body không chứa token. Docs cho phép ghi cookie trong Route Handler. [CITED: docs `cookies.md` dòng 6, 74, 81; `route.md`]

Hợp đồng response của route auth: **cùng envelope của BE** để `createFetchHttpClient` bóc như mọi API khác.
- Thành công: `{ status: "success", data: { viewer }, message: null, errorCode: null, timestamp }` (login/register), `data: null` cho logout/change-password, `data: { refreshed: boolean }` cho refresh.
- BE trả lỗi (envelope hoặc ProblemDetails): chuyển nguyên status + body + `content-type`. Không bọc lại.
- Lỗi do FE sinh: envelope `{ status: "error", errorCode: "Bff.*" | "session.expired", message: null }`. `message: null` để `selectErrorMessage` rơi về câu chung D-04.
- Header `Cache-Control: no-store` trên mọi response.
- **Không bao giờ trả `accessToken`/`refreshToken`/`expiresAt` cho client.** Test bắt buộc kiểm JSON response không có các key này.

Ghi cookie từ `AuthResponse`:
```ts
// apps/web/src/composition/server/session-store.ts (trích)
export function writeSession(res: NextResponse, t: { accessToken: string; refreshToken: string; expiresAt: string },
                             accessExp: number, nowMs: number, secure: boolean) {
  const names = sessionCookieNames(secure);
  const maxAge = Math.max(0, Math.floor((Date.parse(t.expiresAt) - nowMs) / 1000));
  const base = { secure, sameSite: "lax" as const, path: "/", maxAge };
  res.cookies.set(names.access, t.accessToken, { ...base, httpOnly: true });
  res.cookies.set(names.refresh, t.refreshToken, { ...base, httpOnly: true });
  res.cookies.set(names.accessExp, String(accessExp), { ...base, httpOnly: false });
}
export function clearSession(res: NextResponse, secure: boolean) {
  const names = sessionCookieNames(secure);
  const base = { secure, sameSite: "lax" as const, path: "/", maxAge: 0 };
  for (const name of [names.access, names.refresh]) res.cookies.set(name, "", { ...base, httpOnly: true });
  res.cookies.set(names.accessExp, "", { ...base, httpOnly: false });
}
```
`accessExp` lấy từ claim `exp` của token mới (parse bằng `parseAccessTokenClaims`). Token BE trả mà không parse được claim thì coi là lỗi upstream (502), không ghi cookie.

### Pattern 3: Một đường refresh, idempotent, tuần tự bằng Web Locks

**Route `POST /api/auth/refresh`** (thứ tự kiểm):
1. Origin (Pattern 8).
2. Thiếu cookie access hoặc refresh, hoặc claim không parse được → `clearSession`, 401 `session.expired`.
3. `exp − nowSec > 150` → 200 `{ refreshed: false }`, **không gọi BE**. Đây là điểm làm cho mọi lần gọi lặp (tab B sau tab A, refresh chủ động trùng phản ứng, StrictMode chạy effect hai lần) đều vô hại.
4. Gọi BE `POST /api/v1/auth/refresh-token { accessToken, refreshToken }`, timeout 28 giây.
   - 200 → `writeSession` → 200 `{ refreshed: true }`.
   - 400 với `errorCode` bắt đầu bằng `Token.` → `clearSession` → 401 `session.expired`.
   - 400 khác (FluentValidation `NotEmptyValidator` khi cookie rỗng) → `clearSession` → 401 `session.expired`.
   - 5xx, timeout, mạng → **giữ cookie**, 503 `Bff.RefreshUnavailable` (D-14a, P2).

**Client** (`composition/http.client.ts`):
```ts
const LOCK_NAME = DEFAULT_SESSION_LOCK_NAME; // 'tripory-session-refresh' từ @tripory/api-client/http

const fallbackLock = (() => {           // mutex trong tab khi không có navigator.locks
  let tail: Promise<unknown> = Promise.resolve();
  return <T,>(_name: string, task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
})();

export const lock: Lock = <T,>(name: string, task: () => Promise<T>): Promise<T> => {
  // navigator.locks chỉ có trong secure context: undefined khi mở qua http://<IP LAN>.
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return fallbackLock(name, task);
  // Chờ khóa tối đa 40 s: tab giữ khóa bị đóng băng (iOS nền) không được treo mọi tab khác.
  // Hết giờ thì request() reject AbortError → lỗi tạm thời, không đăng xuất.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40_000);
  const run = locks.request(name, { signal: controller.signal }, () => {
    clearTimeout(timer);
    return task();
  }) as Promise<T>;
  return run.finally(() => clearTimeout(timer));
};

/** Gọi route refresh; KHÔNG đi qua client đã bọc withSessionRefresh (đệ quy). */
async function callRefreshRoute(): Promise<RefreshOutcome> {
  // Luôn hỏi route, KHÔNG tự bỏ qua theo cookie at_exp + đồng hồ máy: máy chạy chậm hơn server
  // > 2 phút sẽ tưởng token còn tươi, trả 'refreshed' giả, phát lại vẫn 401 → đăng xuất oan.
  // Route quyết định bằng đồng hồ server và no-op khi đã tươi (tab khác vừa refresh).
  try {
    await authHttp.send({ method: "POST", path: "/refresh", sessionRefresh: false });
    return "refreshed";
  } catch (error) {
    if (isApiError(error) && error.status === 401) return "expired";
    throw error;                                         // 503/mạng/timeout: lỗi tạm thời (D-14a)
  }
}

let inFlight: Promise<RefreshOutcome> | null = null;
/** Lối vào duy nhất cho refresh chủ động (SessionKeeper) và hồi phục (SessionRecovery). */
export const refreshSession = () =>
  (inFlight ??= lock(LOCK_NAME, callRefreshRoute).finally(() => { inFlight = null; }));

export const bffHttp = withSessionRefresh(
  createFetchHttpClient({ baseUrl: "/api/bff", fetch: globalThis.fetch.bind(globalThis) }),
  { refresh: callRefreshRoute, lock, onSessionExpired: () => sessionEvents.emit("expired") },
);
```

`withSessionRefresh` có `inFlight` riêng, `refreshSession` có `inFlight` riêng; cả hai chạy trong cùng `lock` và route idempotent, nên tối đa một lần gọi BE cho mỗi lần hết hạn. Không phải sửa `packages/api-client`. [VERIFIED: đọc `with-session-refresh.ts`; lập luận an toàn dựa trên route idempotent]

**Vì sao an toàn giữa tab:** Web Locks xếp hàng yêu cầu cùng tên trong cùng origin. Tab B chỉ chạy `callRefreshRoute` sau khi tab A nhận response (kèm Set-Cookie). Cookie jar dùng chung, nên request của tab B mang token mới; route thấy còn ~3600 giây và no-op. Không bao giờ có hai lần gửi cùng refresh token tới BE khi có `navigator.locks`. [CITED: developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API]

**Ngưỡng thống nhất (một chỗ, `identity/domain/token-freshness.ts`):**
| Hằng | Giá trị | Dùng ở |
|---|---|---|
| `STALE_AT_SEC` | 30 | BFF rút gọn 401; layout dashboard quyết định hồi phục |
| `REFRESH_IF_BELOW_SEC` | 150 | Route refresh no-op khi còn nhiều hơn (chỉ server quyết định; 02-03-SUMMARY gợi ý kiểm `at_exp` trong lock ở client, research này bỏ vì lệch đồng hồ máy gây đăng xuất oan) |
| `PROACTIVE_LEAD_SEC` | 120 | `SessionKeeper` hẹn giờ `exp − 120` (< 150 nên route thật sự refresh) |

### Pattern 4: Refresh chủ động (Phase 2 D-15)

`SessionKeeper` (client, mount trong `Providers`, chỉ chạy khi có cookie `at_exp`):
- Đọc `at_exp`, hẹn `setTimeout` tới `exp − 120 s`. Hết giờ thì `refreshSession()` rồi hẹn lại theo cookie mới.
- `visibilitychange` sang `visible` và `online`: kiểm lại ngay (timer bị trì hoãn khi máy ngủ hoặc tab nền).
- **Chống vòng lặp do lệch đồng hồ client:** nếu đồng hồ máy chạy nhanh hơn server > 30 giây, timer nổ sớm, route no-op, cookie không đổi, timer lại nổ ngay. Đặt độ trễ tối thiểu 60 giây giữa hai lần chủ động liên tiếp có cùng `exp`.
- Lỗi tạm thời: im lặng, thử lại ở lần kế. `'expired'` → `sessionEvents.emit('expired')`.
- Không cần BroadcastChannel cho refresh: tab khác đọc `at_exp` mới ở lần kiểm tiếp theo.

### Pattern 5: Gate `(dashboard)`: `proxy.ts` + lưới an toàn trong layout

`proxy.ts` chỉ thấy URL, không thấy tên route group, nên "route mới trong `(dashboard)` tự được bảo vệ" (D-10) cần hai lớp:

1. **`proxy.ts`** (lạc quan, nhanh, không gọi BE):
```ts
// apps/web/src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { toSafeNextPath } from "@tripory/identity";
import { hasSessionCookie } from "@/composition/session-cookies";

export const PROTECTED_PREFIXES = ["/itineraries/mine", "/settings"] as const; // test đối chiếu với thư mục (dashboard)
const AUTH_PAGES = new Set(["/login", "/register"]);
const DEFAULT_AFTER_LOGIN = "/itineraries/mine";

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const signedIn = hasSessionCookie(request.cookies);           // có cookie access (Max-Age = hạn refresh), D-25
  if (AUTH_PAGES.has(pathname)) {
    if (!signedIn) return NextResponse.next();
    const next = toSafeNextPath(searchParams.get("next")) ?? DEFAULT_AFTER_LOGIN;
    return NextResponse.redirect(new URL(next, request.url));   // D-04
  }
  if (!signedIn && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|.*\\.[a-zA-Z0-9]+$).*)"],
};
```
- Proxy mặc định chạy Node.js, không cấu hình được `runtime`; `matcher` phải là hằng số; không có matcher thì chạy cả cho `_next/static`. Proxy cũng chạy cho Server Function trên route khớp. [CITED: docs `proxy.md` dòng 75, 136, 249-255]
- `/api/**` không qua proxy: BFF và route auth tự xử lý.
- **Test đối chiếu**: một test Vitest đọc cây `src/app/(dashboard)/**/page.tsx`, đổi thành URL (bỏ tên group, `[id]` → segment bất kỳ) và khẳng định mỗi URL khớp `PROTECTED_PREFIXES`. Thêm route mà quên khai báo thì CI đỏ. Đây là cách "tự được bảo vệ" mà không cần proxy biết route group.

2. **`DashboardSessionGate`** trong `(dashboard)/layout.tsx`, bên trong `<Suspense>` (đọc cookie phải nằm trong Suspense khi bật Cache Components):
```tsx
// apps/web/src/app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell variant="dashboard">
      <Suspense fallback={<DashboardLoading />}>
        <DashboardSessionGate>{children}</DashboardSessionGate>
      </Suspense>
    </AppShell>
  );
}
// DashboardSessionGate (server): const s = await getSessionState();
//   'none'    → <LoginRedirect />      (client: router.replace(`/login?next=${pathname+search}`))
//   'stale' | 'invalid' → <SessionRecovery />   (Pattern 6)
//   'fresh'   → children
```
`'stale'` = `exp − now ≤ 30`. Docs khuyên không `await` phiên ở top-level layout mà đẩy xuống component trong boundary; làm đúng như vậy. Layout không chạy lại khi điều hướng client (Anti-Pattern 7 của ARCHITECTURE), chấp nhận được vì đây là lưới cho lần tải đầu/reload; khi đang dùng, `SessionKeeper` và refresh phản ứng giữ phiên. [CITED: docs `authentication-with-cache-components.md` Step 2]

**`toSafeNextPath(raw)`** (domain, thuần), trả path đã kiểm hoặc `null`:
- `typeof raw === 'string'`, độ dài 1..2048.
- Bắt đầu bằng `/`, ký tự thứ hai không phải `/` hay `\`.
- Không chứa `\` ở bất kỳ đâu, không chứa ký tự điều khiển hay khoảng trắng (`/[\u0000-\u0020\u007f]/`). Trình duyệt bỏ tab/xuống dòng khi parse URL, nên `"/\t/evil.com"` thành `//evil.com`.
- Không bắt đầu bằng `/api/`, `/_next/`, và pathname không phải `/login`, `/register` (tránh vòng lặp).
- Bảng test: `/itineraries/mine` ✓, `/itineraries/mine?tab=draft#x` ✓, `//evil.com` ✗, `/\evil.com` ✗, `/\t/evil.com` ✗, `https://evil.com` ✗, `javascript:alert(1)` ✗, `evil.com` ✗, `/%2F%2Fevil.com` ✓ (path nội bộ đã mã hóa, an toàn), `/login?next=/x` ✗, `/api/bff/users` ✗, `""`/`null` ✗.
- Docs `use-router.md`: không đưa URL chưa làm sạch vào `router.push/replace` (`javascript:` sẽ chạy). [CITED]

### Pattern 6: Hồi phục im lặng khi mở trang dashboard (D-24)

```tsx
// apps/web/src/modules/identity/ui/session-recovery.tsx
"use client";
export function SessionRecovery() {
  const router = useRouter();
  const [state, setState] = useState<"working" | "failed">("working");
  const run = useCallback(() => {
    setState("working");
    refreshSession().then(
      (outcome) => (outcome === "refreshed" ? router.refresh() : sessionEvents.emit("expired")),
      () => setState("failed"),                       // lỗi tạm thời: không đăng xuất (D-20)
    );
  }, [router]);
  useEffect(run, [run]);                               // StrictMode chạy 2 lần: inFlight + route idempotent gộp lại
  return state === "working" ? <DashboardLoading /> : <ErrorState variant="page" onRetry={run} />;
}
```
- Lúc chờ hiện đúng skeleton `(dashboard)/loading.tsx` (UI-SPEC). Lỗi tạm thời hiện `ErrorState` Phase 1 có "Thử lại".
- `router.refresh()` render lại RSC với cookie mới; layout lần này thấy `'fresh'` và render children. [CITED: docs `use-router.md` dòng 46]
- Không lặp vô hạn: nếu sau refresh vẫn `'stale'` (không xảy ra khi server cùng đồng hồ), component mount lại và chạy thêm đúng một lượt; route no-op vì cookie đã tươi theo cùng ngưỡng.

### Pattern 7: Vòng đời phiên, đồng bộ tab, chỗ móc đăng xuất (D-20..D-23)

`composition/session-events.client.ts` (module client, không React):
- `sessionEvents`: emitter `'expired' | 'logged-in' | 'logged-out'`, có cờ chống lặp cho `'expired'` (cả `withSessionRefresh` và `refreshSession` có thể báo).
- `BroadcastChannel('tripory-session')`: phát `{ type: 'logged-in' | 'logged-out' }`. `BroadcastChannel` không giao tin cho chính tab phát. Không có `BroadcastChannel` (Safari < 15.4) → no-op, tab khác tự phát hiện ở request kế tiếp.
- `registerLogoutHandler(fn): () => void` (D-23). `runLogoutHandlers()` chạy `Promise.allSettled` trước khi điều hướng. Phase 3 danh sách rỗng; Phase 7 đăng ký SignalR/cuộc gọi.

`SessionEffects` (React, mount trong `Providers`) là nơi duy nhất dùng `router` + `notify` cho sự kiện phiên:
| Sự kiện | Hành động |
|---|---|
| `expired` (tab này) | `runLogoutHandlers()`, `queryClient.clear()`, `router.replace('/login?next=' + encodeURIComponent(pathname+search))`, `notify.info("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại")`. Không chạy nếu đang ở `/login`/`/register` |
| Đăng xuất (tab này) | `POST /api/auth/logout` → `runLogoutHandlers()` → broadcast `logged-out` → `queryClient.clear()` → `router.replace('/')` + `router.refresh()`. Không toast (D-21). Lỗi: toast lỗi mặc định, ở lại trang |
| Đổi mật khẩu thành công | Route đã xóa cookie → như đăng xuất nhưng `router.replace('/login')` + toast success D-18 |
| `logged-out` (tab khác) | `runLogoutHandlers()`, `window.location.assign('/')`. Điều hướng cứng là chủ đích: xóa sạch state/cache của tab, D-22 không có toast nên không mất gì |
| `logged-in` (tab khác) | `queryClient.clear()`, rồi: đang ở `/login`/`/register` → `router.replace(toSafeNextPath(next) ?? '/itineraries/mine')`; còn lại → `router.refresh()` (header làm mới) |
| Đăng nhập/đăng ký (tab này) | Seed `identityKeys.me`, broadcast `logged-in`, `router.replace(next)` + `router.refresh()`, rồi `notify.success(...)` (Toast ở root layout không bị unmount) |

`queryClient.clear()` khi đổi phiên là bắt buộc: người dùng thử nhiều tài khoản trên cùng máy (CONTEXT §Specific), cache của tài khoản cũ không được hiện cho tài khoản mới (PITFALLS P13).

**`router.refresh()` sau `router.replace()`**: `refresh` làm mới route hiện tại, cần để layout chung (ví dụ `next` là một trang `(public)`) render lại header với cookie mới. Khi `replace` đổi sang group khác (`/login` → `/itineraries/mine`), layout mới đã render với cookie mới. Gọi cả hai là an toàn. [CITED: docs `use-router.md`; thứ tự hai lệnh trong cùng tick: ASSUMED, kiểm bằng tay ở UAT]

**Activity giữ state form:** với Cache Components, App Router giữ state Client Component qua điều hướng bằng `<Activity>`. Đăng xuất rồi quay lại `/login` có thể còn giá trị cũ. Reset form tường minh trong `onSuccess` (và xóa ô mật khẩu trong `onError` của login). [CITED: docs `use-router.md` dòng 177-180]

### Pattern 8: BFF không thành open proxy (AUTH-08)

```ts
// apps/web/src/composition/server/bff.ts (trích, thuần)
const ALLOWED_ROOTS = new Set(["users", "itineraries", "chat"]);
const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE"]);   // BE chỉ dùng 4 verb này

export function resolveBffTarget(segments: readonly string[], rawPathname: string):
  { ok: true; path: string } | { ok: false; status: 400 | 404 } {
  // Chặn sớm dạng mã hóa của / \ và dấu chấm trên chuỗi thô (trước khi Next giải mã segment).
  if (/%2f|%5c|%2e/i.test(rawPathname)) return { ok: false, status: 400 };
  if (segments.length === 0 || !ALLOWED_ROOTS.has(segments[0]!)) return { ok: false, status: 404 };
  for (const s of segments) {
    if (s === "" || s === "." || s === ".." || /[\/\\\u0000-\u001f]/.test(s)) return { ok: false, status: 400 };
  }
  return { ok: true, path: `/api/v1/${segments.map(encodeURIComponent).join("/")}` };
}

/** Same-origin: Origin (nếu có) phải bằng origin của app; request ghi thiếu Origin thì cần Sec-Fetch-Site. */
export function checkSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin !== null) return origin === request.nextUrl.origin;
  if (request.method === "GET" || request.method === "HEAD") return true;
  return request.headers.get("sec-fetch-site") === "same-origin";
}
```
Luồng `forwardToBackend(request, segments, deps)`:
1. Method ngoài allowlist → 405. `resolveBffTarget` lỗi → 404/400. `auth/*` rơi vào 404 vì không có trong allowlist.
2. `checkSameOrigin` sai → 403 `Bff.CrossOrigin`. Áp cho mọi method; GET cùng origin thường không có `Origin` nên vẫn qua.
3. Đọc phiên: `stale`/`invalid` → 401 `session.expired` **không gọi BE** (P4: endpoint `[AllowAnonymous]` coi Bearer hết hạn là ẩn danh và trả 403). Không có cookie → chuyển tiếp không Bearer (endpoint public như `GET /users`, `GET /itineraries/{id}` vẫn chạy).
4. Header đi BE chỉ gồm `accept`, `content-type` (giữ boundary multipart), `authorization: Bearer <at>`. **Không** chuyển `cookie`, `host`, `origin`, `authorization` của client, `x-forwarded-*`.
5. Body: `await request.arrayBuffer()` cho method khác GET; trần 4 MB qua `content-length` (Phase 7 dùng cho voice).
6. Response về client: status nguyên, chỉ header `content-type` + `cache-control: no-store`. Không chuyển `set-cookie` của BE.
7. Timeout 28 giây → 504 `Bff.UpstreamTimeout`; lỗi mạng → 502 `Bff.UpstreamUnavailable`.

Upstream URL dựng bằng `new URL(path + request.nextUrl.search, env.API_ORIGIN)` rồi kiểm lại `url.origin === env.API_ORIGIN` và `url.pathname.startsWith('/api/v1/')`. Docs Next: Route Handler phải tự kiểm Origin (chỉ Server Action được Next kiểm). [CITED: docs `data-security.md`; ARCHITECTURE Pattern 3]

Route auth dùng cùng `checkSameOrigin` (chống login CSRF: site lạ không đăng nhập nạn nhân vào tài khoản kẻ tấn công).

**Timeout 28 giây (không phải 15 như ARCHITECTURE):** client timeout 30 giây (Phase 2 D-11), copy D-31 hứa "tới 30 giây". Upstream 28 giây để client luôn nhận response có cấu trúc (504) trước khi tự timeout. Vercel Function mặc định đủ dài (PITFALLS: Hobby 300 s). D-31 vẫn đúng: 5 giây hiện dòng cold start, ~28 giây hiện câu chung D-04.

### Pattern 9: QueryClient, MutationCache, đăng ký type

```ts
// apps/web/src/composition/query-client.ts
import { MutationCache, QueryClient } from "@tanstack/react-query";
import { notify } from "@tripory/ui-web";
import { decideMutationError, decideMutationSuccess, type MutationFeedback } from "@/lib/feedback";
import type { ApiError } from "@tripory/api-client";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { feedback?: MutationFeedback };
    defaultError: ApiError | Error;
  }
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 }, mutations: { retry: false } }, // Phase 2 D-12
    mutationCache: new MutationCache({
      onSuccess: (_d, _v, _c, m) => { const d = decideMutationSuccess(m.meta?.feedback); if (d) notify[d.variant](d.message); },
      onError: (e, _v, _c, m) => { const d = decideMutationError(e, m.meta?.feedback); if (d) notify[d.variant](d.message); },
    }),
  });
}
```
- `Providers` (client) giữ một `QueryClient` cho browser (`useState(() => makeQueryClient())`). Server không dùng QueryClient trong Phase 3 (không prefetch), nên không có nguy cơ cache dùng chung giữa request (P13).
- Ba mutation form đặt `meta: { feedback: { errorToast: false } }`; toast thành công có tên động ("Chào mừng, {tên}") nên form tự gọi `notify.success` trong `onSuccess`, không dùng `successMessage` tĩnh.
- Hook trong `packages/identity/react` nhận `options` từ app để app gắn `meta` (package không biết `MutationFeedback`).
- Kiểm chữ ký callback `MutationCache` của 5.104 khi viết (số tham số đổi qua các bản 5.x). [ASSUMED: thứ tự `(data, variables, context, mutation)`; xác nhận bằng typecheck]

### Anti-Patterns to Avoid
- **Refresh ở `proxy.ts`, RSC hoặc BFF:** BE xoay token có reuse detection; chỉ client có khóa giữa tab (ARCHITECTURE Anti-Pattern 1, P1, P3).
- **Gọi `/api/auth/refresh` bằng `bffHttp` (client đã bọc):** đệ quy. Dùng `authHttp` với `sessionRefresh: false`.
- **Dùng `expiresAt` làm hạn access** (ARCHITECTURE Anti-Pattern 5): đó là hạn refresh.
- **`cookies().delete()` cho cookie `__Host-`:** lệnh xóa bị trình duyệt từ chối (xem §Thiết kế cookie).
- **Đọc `cookies()` ở top-level root layout:** chặn cả cây; đọc trong component bọc `<Suspense>`.
- **`atob` để giải mã claim:** vỡ dấu tiếng Việt; dùng `Buffer` ở server.
- **Map errorCode `*Validator` toàn cục:** nghĩa phụ thuộc form; map theo form.
- **Thêm `PROTECTED_PREFIXES` mà không có test đối chiếu thư mục `(dashboard)`:** route mới lọt gate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Single-flight + epoch cho 401 | Bộ đếm/queue mới trong composition | `withSessionRefresh` có sẵn (Phase 2) | Đã có test N×401 → 1 refresh, epoch, 401 muộn |
| Chuẩn hóa lỗi BE | Parse body trong form | `ApiError` + `selectErrorMessage` + `resolveFormError` (Phase 2) | Đã phủ 6 dạng lỗi BE |
| Khóa giữa tab | Lock bằng `localStorage` + timestamp | `navigator.locks` (+ mutex trong tab làm fallback) | Có trong mọi trình duyệt mục tiêu từ 2022; lock tự viết bằng storage có race |
| State form, blur/touched, focus lỗi đầu | `useState` + handler tự viết | React Hook Form `mode: 'onTouched'`, `shouldFocusError`, `formState.isSubmitting` | D-29/D-30 khớp đúng tính năng có sẵn |
| Validate form | Hàm kiểm tay | Zod 4 + `zodResolver` | Một schema cho cả validate và type |
| Toast | Mount toast riêng | `Toast`/`notify` của `ui-web` + `MutationCache` | Chính sách Phase 2 D-07..D-10 |
| Cookie header | Tự ghép chuỗi `Set-Cookie` | `NextResponse.cookies.set(name, value, options)` | Đúng encode, đúng thuộc tính |
| Giải mã base64url | Bảng mã tự viết | `Buffer.from(seg, 'base64url').toString('utf8')` (Node 24) | Có sẵn, đúng UTF-8 |

**Key insight:** phần khó (single-flight, chuẩn hóa lỗi) Phase 2 đã làm và test. Phase 3 chỉ cần nối đúng chỗ. Rủi ro lớn nhất là viết thêm một đường refresh thứ hai không đi qua `lock` + route idempotent.

## Common Pitfalls

### Pitfall 1: Regex email của BE từ chối mọi email có chữ "s"
**What goes wrong:** Đăng ký `user@gmail.com` trả `Email.InvalidFormat`, đăng nhập trả `Auth.InvalidCredentials`.
**Why it happens:** `Email.cs` dùng `@"^[^@s]+@[^@s]+.[^@s]+$"` với `IgnoreCase`: `s` là chữ s (thiếu `\`), `.` không escape. Đã chạy thử bằng engine regex .NET: `a@b.vn` true, `user@gmail.com` false, `tester@x.com` false. [VERIFIED: chạy thử, file có từ commit `d379cc8`]
**How to avoid:** FE **không** chép regex này (không chặn mạnh hơn BE, và đây là lỗi). Báo người dùng ngay: sửa ở repo `tripory_be` (`^[^@\s]+@[^@\s]+\.[^@\s]+$`) và ghi vào checklist phụ thuộc BE (DEPL-02). Trong lúc chờ, tài khoản thử phải không có chữ "s" (cả phần sau `@`: `gmail.com`, `yahoo.com` không có "s", `outlook.com` không có, nhưng `user`, `test`… thì có).
**Warning signs:** UAT đăng ký thất bại với email hợp lệ, hiện "Email không đúng định dạng." dưới ô Email.

### Pitfall 2: Xóa cookie `__Host-` bằng `delete()` không có tác dụng
**What goes wrong:** Đăng xuất xong reload vẫn còn phiên.
**Why it happens:** Set-Cookie xóa thiếu `Secure`/`Path=/` bị từ chối theo luật prefix.
**How to avoid:** `clearSession` ghi lại đủ thuộc tính với `maxAge: 0`. Test header.
**Warning signs:** chỉ lỗi trên production/HTTPS (dev không dùng prefix).

### Pitfall 3: Hai đường refresh không chung khóa
**What goes wrong:** `Token.Compromised`, đăng xuất mọi thiết bị kể cả FE cũ.
**Why it happens:** Refresh chủ động, hồi phục D-24 hoặc `SessionRecovery` gọi route bằng `fetch` thẳng, không qua `lock`.
**How to avoid:** Mọi lời gọi route refresh đi qua `refreshSession()` hoặc `withSessionRefresh` (cả hai dùng `lock`). Grep `"/refresh"` trong `apps/web/src` chỉ được thấy ở `http.client.ts`.
**Warning signs:** log BE có hai `refresh-token` liên tiếp cách nhau < 1 giây.

### Pitfall 4: Refresh chủ động lặp vô hạn khi đồng hồ máy lệch
Xem Pattern 4. Độ trễ tối thiểu 60 giây giữa hai lần chủ động có cùng `exp`.

### Pitfall 5: `navigator.locks` không có khi thử trên điện thoại qua IP LAN
**What goes wrong:** Dev mở `http://192.168.x.x:3000` trên iPhone: không có `navigator.locks` (chỉ secure context), cookie `Secure` không lưu trên Safari.
**How to avoid:** Fallback mutex trong tab (đã có ở Pattern 3); dev không dùng prefix/`Secure`; thử đa tab thật trên HTTPS (`next dev --experimental-https` hoặc bản deploy). [CITED: MDN `Navigator.locks` "Secure context"]

### Pitfall 6: Tab iOS nền giữ khóa rồi bị đóng băng
**What goes wrong:** Tab khác chờ khóa mãi, mọi request kẹt.
**How to avoid:** `signal` hết hạn 40 giây khi xin khóa (Pattern 3). Task trong khóa tự có timeout 30 giây của `createFetchHttpClient`. [ASSUMED: hành vi giải phóng khóa của tab bị đóng băng chưa kiểm; timeout chặn rủi ro bất kể hành vi]

### Pitfall 7: Đăng ký timeout sau khi BE đã tạo user
**What goes wrong:** BE cold start, tạo user xong ở giây 29, client đã báo lỗi; người dùng bấm lại → `User.EmailAlreadyExists`.
**How to avoid:** Chấp nhận. Lỗi gắn vào ô Email với "Email này đã được đăng ký." là đủ để người dùng chuyển sang đăng nhập (link giữ `next`). Không tự retry (Phase 2 D-12).

### Pitfall 8: `next` lấy từ proxy chứa tham số nội bộ của Next
**What goes wrong:** Request RSC/prefetch có thể mang tham số nội bộ (`_rsc`), lọt vào `?next=`.
**How to avoid:** Khi dựng `next` trong proxy, bỏ các tham số `_rsc` và bắt đầu bằng `__next`. [ASSUMED: `request.nextUrl` có thể còn `_rsc`; xóa thừa vô hại]

### Pitfall 9: Vitest import file có `import 'server-only'` hoặc `next/headers`
**What goes wrong:** Test vỡ khi import.
**How to avoid:** Logic ở `composition/server/*.ts` không có hai import này; chỉ `viewer.server.ts` có. Test route handler bằng `new NextRequest(url, init)` gọi thẳng `handleX(request, deps)`.

### Pitfall 10: `onSessionExpired` gọi hai lần hoặc trên trang auth
**What goes wrong:** Hai toast, hoặc đang ở `/login` lại bị chuyển sang `/login?next=/login`.
**How to avoid:** Cờ chống lặp trong `sessionEvents`; `SessionEffects` bỏ qua `expired` khi pathname là `/login`/`/register`; `toSafeNextPath` từ chối `/login`.

### Pitfall 11: Header hiện viewer cũ sau đăng nhập/đăng xuất
**What goes wrong:** Đăng nhập rồi `next` là trang `(public)`: layout không đổi, header vẫn là nút "Đăng nhập".
**How to avoid:** `router.refresh()` sau `router.replace()` (Pattern 7). UAT kiểm `next=/` và `next=` trang dashboard.

### Pitfall 12: Copy toast hết phiên lệch hằng có sẵn
`SESSION_EXPIRED_MESSAGE` hiện là "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." (có dấu chấm giữa câu), còn D-20 khóa "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại". Dùng hằng riêng cho toast D-20 (UI-SPEC đã ghi), giữ hằng cũ cho bảng map lỗi.

## Code Examples

### Schema claim JWT (tolerant)
```ts
// packages/identity/src/infrastructure/access-token-claims.ts
import { z } from "zod";

const URI_NAMEID = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const URI_EMAIL = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";

const raw = z.object({
  [URI_NAMEID]: z.string().optional(), nameid: z.string().optional(), sub: z.string().optional(),
  [URI_EMAIL]: z.string().optional(), email: z.string().optional(),
  name: z.string().default(""),
  handle: z.string().default(""),
  exp: z.number().int().positive(),
});

export type AccessTokenClaims = Readonly<{ userId: UserId; email: string; fullName: string; handle: string; exp: number }>;

/** `payload` là JSON đã giải mã từ đoạn giữa JWT (composition làm bằng Buffer). null nếu không hợp lệ. */
export function parseAccessTokenClaims(payload: unknown): AccessTokenClaims | null {
  const r = raw.safeParse(payload);
  if (!r.success) return null;
  const id = parseUserId(r.data[URI_NAMEID] ?? r.data.nameid ?? r.data.sub ?? "");
  const email = r.data[URI_EMAIL] ?? r.data.email;
  if (!id || !email) return null;
  return { userId: id, email, fullName: r.data.name, handle: r.data.handle, exp: r.data.exp };
}
```
```ts
// apps/web/src/composition/server/session-store.ts (trích)
export function decodeJwtPayload(token: string): unknown {
  const part = token.split(".")[1];
  if (!part) return null;
  try { return JSON.parse(Buffer.from(part, "base64url").toString("utf8")); } catch { return null; }
}
```

### Rule mật khẩu dạng dữ liệu (domain)
```ts
// packages/identity/src/domain/password-rules.ts
// Nguồn: tripory_be .../Auth/Validators/RegisterCommandValidator.cs:19-21,
//        ChangePasswordCommandValidator.cs:12-19. Đổi BE thì đổi ở đây (D-27: không mạnh hơn BE).
export type PasswordRuleId = "minLength" | "uppercase" | "lowercase" | "digit" | "special" | "differentFromCurrent";
export type PasswordRule = Readonly<{ id: PasswordRuleId; min?: number; test: (pw: string, current?: string) => boolean }>;

const minLength = (n: number): PasswordRule => ({ id: "minLength", min: n, test: (pw) => pw.length >= n });
export const REGISTER_PASSWORD_RULES: readonly PasswordRule[] = [minLength(8)];
export const CHANGE_PASSWORD_RULES: readonly PasswordRule[] = [
  minLength(8),
  { id: "uppercase", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lowercase", test: (pw) => /[a-z]/.test(pw) },
  { id: "digit", test: (pw) => /[0-9]/.test(pw) },
  { id: "special", test: (pw) => /[!?*@#$%^&+=]/.test(pw) },
  { id: "differentFromCurrent", test: (pw, cur) => pw.length > 0 && pw !== cur },
];
export const evaluatePasswordRules = (rules: readonly PasswordRule[], pw: string, current?: string) =>
  rules.map((r) => ({ id: r.id, min: r.min, met: r.test(pw, current) }));
```

### Form đăng nhập (khung)
```tsx
// apps/web/src/modules/identity/ui/login-form.tsx (khung)
const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: "onTouched", shouldFocusError: true,
                                    defaultValues: { email: "", password: "" } });
const login = useLogin({ meta: { feedback: { errorToast: false } } });
const next = toSafeNextPath(useSearchParams().get("next")) ?? "/itineraries/mine";

const onSubmit = form.handleSubmit(async (values) => {
  setAlert(null);
  try {
    const viewer = await login.mutateAsync(values);
    afterSignIn(viewer);                       // seed cache, broadcast, router.replace(next) + refresh
    notify.success(`Chào mừng, ${viewerDisplayName(viewer)}`);
  } catch (error) {
    if (isApiError(error) && error.kind === "session_expired") return;
    const mapped = mapLoginError(error);       // { field?: 'email', message } | { alert: string }
    form.resetField("password");               // D-05: xóa mật khẩu, giữ email
    if ("field" in mapped) form.setError(mapped.field, { message: mapped.message }, { shouldFocus: true });
    else { setAlert(mapped.alert); form.setFocus("password"); }
  }
});
// <form noValidate aria-labelledby=...> ; Input readOnly={form.formState.isSubmitting};
// <Button loading={isSubmitting} loadingLabel="Đang đăng nhập…">Đăng nhập</Button>
// <SubmitStatus pending={isSubmitting} />  // sau 5 s hiện dòng cold start (D-31)
```
`handleSubmit` không gọi lại khi đang submit nếu nút đã `disabled`/`aria-busy`; Enter trong ô vẫn kích hoạt submit, nên chặn bằng `if (form.formState.isSubmitting) return` đầu handler (D-30). [ASSUMED: RHF không tự chặn submit trùng; guard tường minh để chắc]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts`, chạy Node.js, không cấu hình `runtime` | Next 16 | File ở `apps/web/src/proxy.ts` [CITED: docs `proxy.md`] |
| GET Route Handler dynamic mặc định | Với Cache Components, GET Route Handler có thể bị prerender nếu không đọc request | Next 16 + `cacheComponents` | Phase 3 chỉ có POST/PUT ở `/api/auth/*`; BFF GET đọc cookie nên chạy lúc request [CITED: docs `15-route-handlers.md` dòng 87-124] |
| `cookies()`, `params` đồng bộ | Async, phải `await` | Next 15+ | [CITED: docs `cookies.md`] |
| Token trong `localStorage` (FE cũ `AuthContext.tsx`) | Cookie httpOnly qua BFF | Dự án này | Không port cơ chế lưu token của FE cũ |
| ARCHITECTURE.md: claim `nameid`, refresh `Path=/api/auth`, BFF timeout 15 s | Claim URI dài; cả hai cookie `__Host-` `Path=/`; timeout 28 s | Research này | Planner theo bản này |

**Deprecated/outdated:** `export const dynamic`, `runtime = 'edge'`, `preferredRegion` không dùng khi bật Cache Components (ARCHITECTURE Pattern 3, đã cite docs).

## `/api/auth/token` (CHAT-09): để Phase 7

Không dựng ở Phase 3. Route này cố ý trả access token cho JS (SignalR cần), tức đi ngược tiêu chí 1 của Phase 3 nếu không có lý do dùng. Phase 7 dựng cùng lúc với SignalR, gọi `refreshSession()` trước khi đọc cookie và trả `Cache-Control: no-store`. Chi phí dựng sau thấp vì đã có `session-store` và `refreshSession`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `cookies().delete()` không kèm `Secure` nên không xóa được cookie `__Host-` | Thiết kế cookie | Thấp: dùng `set(..., maxAge 0)` đúng trong mọi trường hợp; test khóa hành vi |
| A2 | Gọi `router.replace(x)` rồi `router.refresh()` liền nhau cho header đúng | Pattern 7 | Trung bình: header cũ sau login; UAT phát hiện, sửa bằng điều hướng cứng cho luồng không toast |
| A3 | Người dùng đồng ý đổi copy checklist "ký tự đặc biệt" thành liệt kê đủ `! ? * @ # $ % ^ & + =` và thêm mục "Ít nhất 8 ký tự" cho đổi mật khẩu | Rule mật khẩu | Thấp: nếu giữ copy cũ, người dùng gõ `-` rồi bị BE từ chối (lỗi gắn vào ô vẫn hiện message BE) |
| A4 | Tab iOS bị đóng băng có thể giữ Web Lock | Pitfall 6 | Thấp: đã có timeout xin khóa 40 s |
| A5 | `request.nextUrl` trong proxy có thể chứa `_rsc` | Pitfall 8 | Thấp: lọc thừa vô hại |
| A6 | Chữ ký `MutationCache` `onSuccess/onError(data|error, variables, context, mutation)` ở 5.104 | Pattern 9 | Thấp: typecheck bắt |
| A7 | RHF không tự chặn submit trùng khi nhấn Enter lúc đang gửi | Code Examples | Thấp: guard tường minh |
| A8 | Hành vi package `server-only` ném lỗi ngoài `react-server` | Alternatives | Thấp: thiết kế không phụ thuộc |

## Open Questions

1. **Ai sửa regex email BE và khi nào?**
   - What we know: lỗi chắc chắn, chặn mọi email có "s".
   - What's unclear: người dùng có sửa BE trước UAT Phase 3 không.
   - Recommendation: planner thêm một bước "báo người dùng + ghi DEPL-02" ở đầu phase; UAT dùng email không có "s" nếu BE chưa sửa.
2. **Hết phiên trên trang `(public)` có nên chuyển sang `/login`?**
   - What we know: D-20 áp cho mọi `onSessionExpired`. Trang public ở Phase 3 chưa gọi BFF nào ngoài `users/me` của header.
   - What's unclear: Phase 5 (public view) có muốn chỉ xóa phiên và ở lại trang.
   - Recommendation: Phase 3 làm đúng D-20; `useMyProfile` chỉ chạy khi có viewer nên khách không bị ảnh hưởng. Phase 5 tự cân nhắc.
3. **Copy checklist ký tự đặc biệt** (A3): xác nhận với người dùng khi plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/test | ✓ | 24.x (engines) | — |
| pnpm | install | ✓ | theo `packageManager` | — |
| Next docs cục bộ | AGENTS.md | ✓ | 16.4.0, 472 file | — |
| npm registry | thêm 4 package vào catalog | ✓ | đã `npm view` | — |
| .NET SDK | chạy BE local cho UAT | ✓ | 10.0.301 | dùng BE đã deploy |
| BE `tripory_be` chạy được | UAT luồng thật | chưa kiểm (cần PostgreSQL local) | — | BE deploy công khai nếu có |
| HTTPS local | thử cookie `__Host-`, Web Locks trên thiết bị | `next dev --experimental-https` | — | thử trên bản deploy Vercel |

**Missing dependencies with no fallback:** không có.
**Missing dependencies with fallback:** BE local cần PostgreSQL (chưa kiểm); dùng BE deploy nếu có.

Mẹo UAT: chạy BE với biến môi trường `JwtOptions__ExpiryMinutes=5` để token hết hạn sau 5 phút thay vì 60 (cấu hình ASP.NET đọc env var ghi đè `appsettings.json`). Không dùng giá trị < 3 phút vì `PROACTIVE_LEAD_SEC` = 120. [ASSUMED: binding cấu hình mặc định của ASP.NET Core; `Program.cs:27` đọc section `JwtOptions`]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (catalog); `apps/web` dùng preset `@tripory/config/vitest/ui` (jsdom) + Testing Library; package dùng preset node |
| Config file | `apps/web/vitest.config.ts`, `packages/*/vitest.config.ts`; `packages/identity/vitest.config.ts` mới (Wave 0) |
| Quick run command | `pnpm --filter @tripory/identity test` / `pnpm --filter @tripory/web test -- <pattern>` |
| Full suite command | `pnpm lint && pnpm typecheck && pnpm test` (từ gốc repo) |

Test route handler/BFF/proxy chạy trong `apps/web` với `// @vitest-environment node` ở đầu file (cần `Request`/`Response` thật, không cần DOM), tạo `new NextRequest("https://app.test/api/...", { method, headers, body })` và fake `fetch` trả `new Response(...)`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Register route: BE 200 → set 3 cookie, trả `{viewer}` không có token; BE 409/400 chuyển nguyên | unit (node) | `pnpm --filter @tripory/web test -- auth-handlers` | ❌ Wave 0 |
| AUTH-01 | RegisterForm: lỗi Zod khi blur/Gửi, focus ô lỗi đầu, `User.EmailAlreadyExists` → ô Email, `NotEmptyValidator` → InlineAlert | component (jsdom) | `pnpm --filter @tripory/web test -- register-form` | ❌ |
| AUTH-01 | `mapRegisterError` bảng errorCode → field | unit | `... -- form-error-mapping` | ❌ |
| AUTH-02 | Set-Cookie của login: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age` theo `expiresAt`; `at_exp` không HttpOnly, chỉ chữ số; body không có `accessToken`/`refreshToken`/`expiresAt` | unit (node) | `... -- auth-handlers` | ❌ |
| AUTH-02 | `parseAccessTokenClaims` với payload URI thật (fixture từ lần chạy thử), dạng ngắn, thiếu id, UTF-8 tiếng Việt qua `decodeJwtPayload` | unit | `pnpm --filter @tripory/identity test` | ❌ |
| AUTH-02 | document.cookie không đọc được token | manual (DevTools trên bản deploy HTTPS) | — | manual |
| AUTH-03 | Route refresh: thiếu cookie → 401 + xóa; còn > 150 s → no-op, fetch gọi 0 lần; BE 200 → ghi cookie; BE 400 `Token.*` → xóa + 401; BE 500/timeout → giữ cookie + 503 | unit (node) | `... -- auth-handlers` | ❌ |
| AUTH-03 | `refreshSession` + `bffHttp`: 5 request 401 song song + 1 refresh chủ động cùng lúc → route gọi đúng 1 lần (fake `navigator.locks` xếp hàng, fake fetch) | unit (jsdom) | `... -- http.client` | ❌ |
| AUTH-03 | Hai "tab" (hai bộ composition dùng chung fake lock + fake cookie jar): tab B thấy cookie mới → no-op | unit | `... -- http.client` | ❌ |
| AUTH-03 | Fallback khi không có `navigator.locks`: mutex tuần tự; xin khóa quá 40 s → reject, không `expired` | unit (fake timers) | `... -- http.client` | ❌ |
| AUTH-03 | `SessionKeeper`: hẹn `exp−120`; `visibilitychange`; chống lặp 60 s | unit (fake timers) | `... -- session-keeper` | ❌ |
| AUTH-03 | `SessionRecovery`: refreshed → `router.refresh`; expired → emit; lỗi tạm thời → ErrorState + "Thử lại" | component | `... -- session-recovery` | ❌ |
| AUTH-03 | `DashboardSessionGate` theo `none/stale/fresh` | unit (gọi hàm quyết định thuần `decideDashboardGate`) | `... -- dashboard-session-gate` | ❌ |
| AUTH-03 | Reload sau khi access hết hạn không bị đăng xuất; 3 tab sau hết hạn → BE log đúng 1 `refresh-token`, không `Token.Compromised` | manual (BE `JwtOptions__ExpiryMinutes=5`) | — | manual |
| AUTH-04 | Logout route xóa 3 cookie với đủ thuộc tính `Max-Age=0`; kiểm Origin | unit (node) | `... -- auth-handlers` | ❌ |
| AUTH-04 | `sessionEvents`: logout chạy `logoutHandlers` (allSettled), broadcast, `queryClient.clear`; tab khác nhận `logged-out` → `location.assign('/')`; `logged-in` trên `/login` → `replace(next)` | unit (fake BroadcastChannel) | `... -- session-events` | ❌ |
| AUTH-05 | `toSafeNextPath` bảng ca (Pattern 5) | unit | `pnpm --filter @tripory/identity test` | ❌ |
| AUTH-05 | `proxy`: khách vào `/itineraries/mine?x=1` → 307 `/login?next=%2Fitineraries%2Fmine%3Fx%3D1`; có cookie vào `/login?next=//evil` → 307 `/itineraries/mine`; có cookie hết hạn vào dashboard → `next()` (D-25); `/` không đổi | unit (node, `new NextRequest`) | `... -- proxy` | ❌ |
| AUTH-05 | Mọi `app/(dashboard)/**/page.tsx` được `PROTECTED_PREFIXES` phủ | unit (đọc file system) | `... -- proxy-coverage` | ❌ |
| AUTH-06 | `evaluatePasswordRules` cho cả hai bộ rule; `special` không nhận `-`, `_`, `.`; `differentFromCurrent` | unit | `pnpm --filter @tripory/identity test` | ❌ |
| AUTH-06 | ChangePasswordForm: checklist hiện trước khi nhập; `Auth.InvalidCurrentPassword` → ô hiện tại + focus; `NotEqualValidator` → ô mới; thành công → logout flow + toast | component | `... -- change-password-form` | ❌ |
| AUTH-06 | Change-password route: stale → 401 `session.expired` không gọi BE; BE 200 → xóa cookie | unit (node) | `... -- auth-handlers` | ❌ |
| AUTH-07 | UserMenu ba trạng thái, `aria-label`, mục disabled, `next` của nút khách; `normalizeAvatarUrl` map DefaultAvatarUrl → null | component + unit | `... -- user-menu`, identity test | ❌ (có `user-menu.test.tsx` cũ, viết lại) |
| AUTH-08 | `resolveBffTarget`: `users/me` ✓; `auth/login` 404; `..`, `%2e%2e`, `%2F`, `\`, segment rỗng → 400; encode segment | unit | `... -- bff` | ❌ |
| AUTH-08 | `forwardToBackend`: Origin lạ → 403; POST thiếu Origin và `sec-fetch-site: cross-site` → 403; stale → 401 không gọi fetch; header đi BE không có `cookie`/`host`; response không có `set-cookie`; timeout → 504 | unit (node) | `... -- bff` | ❌ |
| FND-05 (nghiệm thu từ Phase 2) | `makeQueryClient`: mutation thành công có `successMessage` → `notify.success`; lỗi mặc định → `notify.error`; `errorToast:false` → không toast; `retry:false` | unit (spy `notify`) | `... -- query-client` | ❌ |
| FND-05 | Toast thật hiện trên màn hình sau login/đổi mật khẩu | manual | — | manual |

### Sampling Rate
- **Per task commit:** test của file vừa sửa (`pnpm --filter <pkg> test -- <pattern>`) + `pnpm --filter <pkg> lint`.
- **Per wave merge:** `pnpm lint && pnpm typecheck && pnpm test` từ gốc.
- **Phase gate:** full suite xanh, `pnpm build` xanh (kiểm không có lỗi "Uncached data was accessed outside of `<Suspense>`"), rồi UAT thủ công trên bản deploy HTTPS trước `/gsd-verify-work`.

### Manual-only (không tự động hóa được ở milestone này)
- Tiêu chí 1: DevTools → `document.cookie` chỉ thấy `__Host-tripory_at_exp`; Application → Cookies có `HttpOnly` cho `at`/`rt`.
- Tiêu chí 2: BE `JwtOptions__ExpiryMinutes=5`, mở 3 tab, để quá hạn, thao tác cả 3 tab, reload: log BE đúng 1 `refresh-token` mỗi lần hết hạn, không `Token.Compromised`; tắt BE lúc refresh thì không bị đăng xuất.
- Tiêu chí 4: đăng xuất từ một tab, tab còn lại về `/`; đổi mật khẩu, đăng nhập lại bằng mật khẩu mới.
- Smoke UI 320/390/768/1440 (UI-SPEC).
- Playwright E2E thuộc DEPL-03 (Phase 8), không dựng ở Phase 3.

### Wave 0 Gaps
- [ ] `packages/identity/` khung: `package.json` (exports `.`, `./http`, `./react`), `eslint.config.mjs` (`contextPackage()`), `tsconfig.json`, `vitest.config.ts`. Self-test ranh giới tự kiểm package mới; thêm 2–3 case (domain import `zod` bị chặn, infrastructure import `zod` hợp lệ).
- [ ] Catalog + `apps/web/package.json`: `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@tripory/identity`.
- [ ] Fixture: payload JWT thật (Contract BE §Tên claim), `AuthResponse`/`TokenResponse`/`UserProfileResponse` mẫu, envelope lỗi `Token.*`, `Auth.InvalidCurrentPassword`, `NotEqualValidator`.
- [ ] Helper test `apps/web/src/test/next-request.ts`: dựng `NextRequest` có cookie/Origin, đọc `Set-Cookie` từ `NextResponse`.
- [ ] Fake `navigator.locks` (hàng đợi theo tên) và fake `BroadcastChannel` cho jsdom.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | BE xác thực; FE không giữ secret, không verify JWT; mật khẩu chỉ đi qua route POST, không log body |
| V3 Session Management | yes | Cookie `__Host-` `HttpOnly; Secure; SameSite=Lax`; xoay token qua một route có khóa; logout xóa cookie đủ thuộc tính; đổi mật khẩu xóa phiên |
| V4 Access Control | yes | BFF allowlist + chặn `auth/*`; quyền thật do BE; `proxy.ts` chỉ là UX |
| V5 Input Validation | yes | Zod cho form, DTO BE, claim, env; `toSafeNextPath`; `resolveBffTarget` |
| V6 Cryptography | no (tự viết) | Không tự làm crypto; không verify chữ ký ở FE |
| V13 API (CSRF/SSRF) | yes | `checkSameOrigin` cho BFF và `/api/auth/*`; upstream URL cố định theo `API_ORIGIN` + kiểm origin/pathname sau khi dựng |

### Known Threat Patterns for Next.js BFF + JWT

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS đọc token | Information Disclosure | Token chỉ ở cookie `HttpOnly`; route không trả token; `/api/auth/token` hoãn tới Phase 7 |
| CSRF trên BFF/logout/login | Tampering | `SameSite=Lax` + kiểm `Origin`/`Sec-Fetch-Site` |
| Open redirect qua `?next=` | Spoofing | `toSafeNextPath` (chặn `//`, `\`, ký tự điều khiển, scheme) |
| Open proxy / SSRF / path traversal | Elevation | Allowlist gốc, chặn segment `.`/`..`/mã hóa `/`, encode segment, kiểm upstream origin |
| Rò header (cookie, host) sang BE | Information Disclosure | Allowlist header đi và về; bỏ `set-cookie` của BE |
| Refresh token reuse → khóa mọi phiên (DoS tự gây) | Denial of Service | Một route idempotent + Web Locks |
| Cache rò dữ liệu giữa tài khoản | Information Disclosure | `Cache-Control: no-store`; không `use cache` cho dữ liệu phiên; `queryClient.clear()` khi đổi phiên |
| Cookie tossing từ subdomain | Tampering | Prefix `__Host-` |
| Log lộ token/mật khẩu | Information Disclosure | Route không log body/cookie; `ApiError` không chứa body (Phase 2) |

Không có rate limit ở FE cho login; BE cũng không có. Ghi vào checklist phụ thuộc BE (DEPL-02) cùng regex email, endpoint logout/revoke, grace window cho refresh token.

## Project Constraints (từ AGENTS.md; repo không có `.kiro/steering/`)

- Đọc `ai-memories/tripory-fe--ddd-architecture.md` trước khi thêm code; package mới theo `contextPackage()`.
- Đọc docs Next tại `apps/web/node_modules/next/dist/docs/` (đã đọc: `proxy.md`, `cookies.md`, `route.md`, `15-route-handlers.md`, `use-router.md`, `authentication-with-cache-components.md`, `instant-navigation.md`).
- pnpm workspace, version qua `catalog:` pin cứng; Turborepo.
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test` trước khi báo xong.
- Import bị ESLint chặn = đặt sai tầng; không sửa rule/allowlist để qua lint.
- Quy ước code: không class, `type` readonly + pure function, `makeX(deps)`; Vitest, fake `HttpClient`/fake lock, không MSW.

## Sources

### Primary (HIGH confidence)
- Code `tripory_be` (đọc 2026-10-13): `AuthController.cs`, `UsersController.cs`, `ApiController.cs`, `Program.cs`, `appsettings*.json`, `JwtTokenService.cs`, `JwtOptions.cs`, `CurrentUserService.cs`, `Login/Register/RefreshToken/ChangePasswordCommandHandler.cs`, `*CommandValidator.cs`, `AuthResponse.cs`, `TokenResponse.cs`, `UserDto.cs`, `UserProfileResponse.cs`, `User.cs`, `Email.cs`, `DomainErrors.cs`, `ValidationPipelineBehavior.cs`, `API_ENDPOINTS.md`.
- Chạy thử: payload JWT bằng `System.IdentityModel.Tokens.Jwt` 8.14.0 trên .NET 10.0.301; regex `Email` bằng engine .NET.
- Docs Next 16.4.0 cục bộ: `01-app/03-api-reference/03-file-conventions/proxy.md`, `04-functions/cookies.md`, `04-functions/use-router.md`, `03-file-conventions/route.md`, `01-getting-started/15-route-handlers.md`, `02-guides/authentication-with-cache-components.md`, `02-guides/instant-navigation.md`.
- Code `tripory_fe`: `packages/api-client/src/*`, `apps/web/src/lib/feedback/*`, `apps/web/src/components/*`, `apps/web/src/app/**/layout.tsx`, `packages/config/eslint/boundaries.mjs`, `next.config.ts`, `pnpm-workspace.yaml`.
- npm registry (2026-10-13): `@tanstack/react-query` 5.104.2, `zod` 4.6.7, `react-hook-form` 7.90.0 (chọn 7.89.0), `@hookform/resolvers` 5.9.1.

### Secondary (MEDIUM confidence)
- [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie): prefix `__Host-`/`__Secure-`, `SameSite`, `Path` không phải biện pháp bảo mật, `Secure` trên localhost.
- [MDN Navigator.locks](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/locks): chỉ secure context. [MDN Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
- [caniuse navigator.locks](https://caniuse.com/mdn-api_navigator_locks), [caniuse BroadcastChannel](https://caniuse.com/broadcastchannel): Safari/iOS từ 15.4.
- `.planning/research/ARCHITECTURE.md`, `PITFALLS.md`, `STACK.md`; `02-RESEARCH.md` (bảng errorCode, mã FluentValidation mặc định).

### Tertiary (LOW confidence)
- Hành vi Web Locks khi tab iOS bị đóng băng (A4); `_rsc` trong `nextUrl` của proxy (A5).

## Metadata

**Confidence breakdown:**
- Contract BE và claim JWT: HIGH (đọc code + chạy thử đúng phiên bản package).
- Standard stack: HIGH (npm view; không thêm thư viện ngoài STACK.md).
- Architecture (cookie, refresh idempotent, BFF): HIGH cho cơ chế dựa trên docs và code; MEDIUM cho thứ tự `replace` + `refresh` (A2).
- Pitfalls: HIGH cho regex email, xóa cookie prefix, secure context của Web Locks; MEDIUM cho iOS đóng băng tab.

**Research date:** 2026-10-13
**Valid until:** 2026-11-12 (stack ổn định); kiểm lại nếu BE đổi `JwtTokenService`, validator hoặc `Email.cs`.
