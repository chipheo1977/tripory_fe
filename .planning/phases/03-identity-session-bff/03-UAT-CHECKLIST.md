# Phase 3: Kịch bản UAT thủ công (Identity, phiên, BFF)

Nghiệm thu các hành vi cần trình duyệt thật, nhiều tab và BE thật mà test tự động không phủ (mục "Manual-Only" của `03-VALIDATION.md`). Chốt 5 tiêu chí ROADMAP Phase 3 trước `/gsd-verify-work`.

Phạm vi: AUTH-01..AUTH-08, FND-05. Các bước phụ thuộc BE đều ghi tham chiếu `03-BE-DEPENDENCIES.md`.

Quy ước: không ghi mật khẩu hay token thật vào tệp này. Dùng mật khẩu thử tự đặt, chỉ nhớ trong đầu hoặc trình quản lý mật khẩu.

---

## A. Chuẩn bị

- [x] **BE đã sửa regex email** (`03-BE-DEPENDENCIES.md` mục 1): `^[^@\s]+@[^@\s]+\.[^@\s]+$` trong `tripory_be` (`Tripory.Domain/ValueObjects/Email.cs`). Chưa sửa thì bước 3 sẽ FAIL và chặn nghiệm thu (D-33).
- [x] **BE chạy với `JwtOptions__ExpiryMinutes=5`** (hoặc BE deploy đã cấu hình tương đương), để thấy refresh im lặng nhanh. Không đặt nhỏ hơn 3 phút vì `PROACTIVE_LEAD_SEC` = 120 giây (`03-BE-DEPENDENCIES.md` mục 13). Ví dụ PowerShell:
  ```powershell
  $env:JwtOptions__ExpiryMinutes = "5"
  # rồi chạy BE (dotnet run ...) trong cùng cửa sổ
  ```
- [x] **FE: `API_ORIGIN` trỏ tới BE**, đặt trong `apps/web/.env.local` (không commit). Giá trị là URL gốc BE, không kèm `/api/v1` (`03-BE-DEPENDENCIES.md` mục 14). Mẫu ở `apps/web/.env.example`:
  ```
  API_ORIGIN=http://localhost:5000
  BFF_SHARED_SECRET=dev-bff-secret-change-me
  ```
  `BFF_SHARED_SECRET` phải trùng `AuthRateLimitOptions:BffSharedSecret` của BE (giá trị dev trong `appsettings.Development.json`, nên chạy BE với `ASPNETCORE_ENVIRONMENT=Development`). Thiếu nó thì mọi người dùng chung một bucket theo IP của server FE (`03-BE-DEPENDENCIES.md` mục 2, 15). Sửa `.env.local` xong phải khởi động lại `next dev`.
- [x] **Biết giới hạn tốc độ của BE** (theo IP): login 5 lần/phút, register 3 lần/giờ. Bước 3 và 4 (đăng ký hai lần) dùng 2 trong 3 lần của giờ đó, nên đừng đăng ký thử thêm tùy tiện. Bộ đếm nằm trong bộ nhớ BE: **khởi động lại BE sẽ reset**. Gặp 429 thì UI phải hiện "Bạn thao tác quá nhanh. Vui lòng thử lại sau." (câu của BE).
- [x] **FE chạy HTTPS local** để thử cookie `__Host-` và `navigator.locks`:
  ```powershell
  pnpm --filter @tripory/web exec next dev --experimental-https
  ```
  Hoặc dùng bản deploy Vercel (HTTPS). Mở trang bằng URL `https://localhost:3000` (chấp nhận chứng chỉ tự ký nếu trình duyệt hỏi).
- [pending, không hiểu để làm gì] **Công cụ**: hai trình duyệt (hoặc một cửa sổ thường + một cửa sổ ẩn danh), ba tab cùng một phiên; DevTools → Application → Cookies; có chỗ xem log BE.
- [pending, không hiểu để làm gì] Phiên đăng nhập cũ đã được xóa (xóa cookie của `localhost` trước khi bắt đầu).

---

## B. Các bước

Cột "Kết quả" điền `PASS`, `FAIL` kèm ghi chú, hoặc `N/A` kèm lý do.

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| 1 | Khi chưa đăng nhập, mở `/itineraries/mine`. | Bị chuyển tới `/login?next=%2Fitineraries%2Fmine`. | Tiêu chí 3, D-10 | PASS |
| 2 | Mở `/login?next=//evil.com`, đăng nhập bằng tài khoản hợp lệ. | Tới `/itineraries/mine`, không rời origin của ứng dụng. `next` ngoại lai bị bỏ qua. | Tiêu chí 3, AUTH-05, T-03-79 | PASS |
| 3 | Vào `/register`. Kiểm tra checklist mật khẩu có dòng "Ít nhất 8 ký tự" TRƯỚC khi gõ. Đăng ký với email `user@gmail.com`, họ tên có dấu, mật khẩu thử ≥ 8 ký tự. | Toast "Tạo tài khoản thành công", tự đăng nhập, vào `/itineraries/mine`. Nếu báo "Email không đúng định dạng": ghi "BE chưa sửa regex" và chặn nghiệm thu (xem `03-BE-DEPENDENCIES.md` mục 1). | Tiêu chí 1, AUTH-01, D-02, D-33 | PASS |
| 4 | Ở tab ẩn danh, đăng ký lại đúng email đó. | Lỗi "Email này đã được đăng ký." hiện dưới ô Email. | AUTH-01 | PASS |
| 5 | Nhìn header sau khi đăng nhập, rồi mở menu user. | Có avatar, tên (từ breakpoint `sm` trở lên) và menu. Menu có tên + email, "Lịch trình của tôi", "Hồ sơ" kèm nhãn "Sắp có" (disabled, không điều hướng), "Tin nhắn" kèm nhãn "Sắp có", "Đổi mật khẩu", "Đăng xuất". Avatar mặc định chung của BE được coi như không có avatar, hiện chữ cái đầu (`03-BE-DEPENDENCIES.md` mục 10). | Tiêu chí 1, AUTH-07, D-12..D-15 | PASS |
| 6 | DevTools Console chạy `document.cookie`. Rồi xem tab Application → Cookies. | `document.cookie` chỉ thấy cookie `...tripory_at_exp`, không thấy `tripory_at` / `tripory_rt`. Cookie `...tripory_at` và `...tripory_rt` có cờ `HttpOnly`, `Secure`, `SameSite=Lax`. Khi chạy HTTPS tên có prefix `__Host-`. | Tiêu chí 1, AUTH-02, T-03-75 | PASS |
| 7 | Reload trang nhiều lần. | Vẫn đăng nhập, không nhấp nháy về `/login`. | Tiêu chí 2, AUTH-03 | PASS |
| 8 | Mở 3 tab cùng đăng nhập. Chờ quá 5 phút để access token hết hạn. Thao tác ở cả 3 tab (điều hướng, mở menu) rồi reload từng tab. | Không tab nào bị đăng xuất. Log BE có đúng 1 request `refresh-token` cho mỗi lần hết hạn và không có `Token.Compromised`. (`03-BE-DEPENDENCIES.md` mục 4, 13) | Tiêu chí 2, AUTH-03, T-03-76 | PASS |
| 9 | Tắt BE, rồi chờ refresh chủ động hoặc reload khi token sắp hết hạn. Sau đó bật BE lại. | KHÔNG bị đăng xuất. Hiện câu thông báo chung hoặc nút "Thử lại". Bật BE lại, bấm "Thử lại" thì phục hồi. | AUTH-03, D-14a, D-20 | PASS |
| 10 | Đăng xuất ở tab A (tab B đang mở và đang đăng nhập). | Tab B tự về `/`, không hiện toast. Reload không còn phiên. Cookie phiên bị xóa trên cả hai tab. Ghi nhận: BE chưa có endpoint logout nên refresh token cũ còn hiệu lực tới khi hết hạn (`03-BE-DEPENDENCIES.md` mục 3). | Tiêu chí 4, AUTH-04, D-21, D-22, T-03-78 | PASS |
| 11 | Đăng nhập ở tab A trong khi tab B đang ở `/login` và tab C đang ở `/` (chưa đăng nhập). | Tab B chuyển sang `/itineraries/mine`. Tab C làm mới header, hiện trạng thái đã đăng nhập. | AUTH-04, D-22 | PASS |
| 12 | Đăng nhập với email đúng và mật khẩu sai. | InlineAlert "Email hoặc mật khẩu không đúng." ở đầu form. Email được giữ, mật khẩu bị xóa, focus vào ô mật khẩu. | AUTH-05, D-05 | PASS |
| 13 | Đăng nhập đúng. | Toast "Chào mừng, {tên}" vẫn thấy được sau khi chuyển trang. | FND-05, D-07 | PASS |
| 14 | Vào `/settings/password`. Kiểm tra: thấy đủ 6 rule trước khi nhập; ký tự đặc biệt hợp lệ là `! ? * @ # $ % ^ & + =`; gõ `-` không được tính là ký tự đặc biệt. Thử nhập sai "Mật khẩu hiện tại"; thử mật khẩu mới trùng mật khẩu cũ; rồi đổi thành công. | Sai mật khẩu hiện tại: lỗi hiện dưới ô đó và focus vào đó. Mật khẩu mới trùng cũ: lỗi dưới ô "Mật khẩu mới". Đổi thành công: về `/login`, toast "Đã đổi mật khẩu, vui lòng đăng nhập lại", cookie bị xóa. Đăng nhập lại bằng mật khẩu mới được. | Tiêu chí 4, AUTH-06, D-18, D-19, FND-05, T-03-78 | PASS |
| 15 | Có hai tab đang đăng nhập (A và B). Đổi mật khẩu ở tab A. | Tab B tự về `/`. | AUTH-06, D-22 | PASS |
| 16 | Trong DevTools Console của trang đã đăng nhập, chạy lần lượt: `fetch('/api/bff/auth/login', {method:'POST'})`; `fetch('/api/bff/admin')`; `fetch('/api/bff/users/%2e%2e/auth/login')`; `fetch('/api/bff/users/me')`. Rồi gửi một request sai Origin: từ trang khác origin, hoặc `curl -X POST -H "Origin: https://evil.test" https://localhost:3000/api/bff/users/me` (thêm `-k` nếu chứng chỉ tự ký). | `auth/login` → 404. `admin` (ngoài allowlist) → 404. Đường dẫn `%2e%2e` → 400. `users/me` → 200 có dữ liệu. Request sai Origin → 403. | Tiêu chí 5, AUTH-08, T-03-77 | PASS |
| 17 | Để token hết hạn khi đang ở trang dashboard (BE 5 phút), rồi mở lại hoặc reload `/itineraries/mine`. | Hiện skeleton rồi vào trang, không bị đẩy ra `/login`. | Tiêu chí 2, D-24, D-25 | PASS |
| 18 | Smoke giao diện ở 320, 390, 768, 1440px cho `/login`, `/register`, `/settings/password` và menu user. | Không tràn ngang. Vùng chạm ≥ 44px. Mở/đóng menu bằng bàn phím được. Esc đóng menu và trả focus về nút mở. | AUTH-07, `03-UI-SPEC.md` (Accessibility Checklist) | PASS |
| 19 | Cold start: nếu BE đang ngủ, đăng nhập và chờ ≥ 5 giây. Ghi `N/A` nếu BE không ngủ. | Hiện "Máy chủ đang khởi động, có thể mất tới 30 giây…". (`03-BE-DEPENDENCIES.md` mục 11, 12) | D-31 | PASS |

---

## C. Kết luận

- Ngày chạy: 23/10/2026 (ghi nhận lúc 13:54)
- Người chạy: vci-loinh (chủ dự án, tên theo git config)
- Môi trường (BE local / deploy, trình duyệt, HTTPS local / Vercel): BE local tại `http://localhost:5251` (có bản sửa regex email và rate limit, `JwtOptions__ExpiryMinutes=5`); FE local tại `localhost:3000` với `API_ORIGIN` trỏ tới BE và `BFF_SHARED_SECRET` khớp BE Development. Trình duyệt cụ thể và việc chạy HTTP hay HTTPS local: chưa ghi.
- Bằng chứng tiêu chí 2 (bước 8): số dòng `refresh-token` trong log BE mỗi lần hết hạn = `1`; có `Token.Compromised` không = `không` (người chạy đã xem log BE và xác nhận). Bước 19 người chạy xác nhận đã thấy dòng "Máy chủ đang khởi động…".

**Kết luận chung:** `PASS toàn bộ` (19/19 bước PASS, không có bước FAIL hay N/A)

Danh sách bước FAIL (nếu có), kèm bước số và mô tả:

- Không có.

Bước phụ thuộc BE cần xử lý ở `tripory_be` (tham chiếu `03-BE-DEPENDENCIES.md`):

- Merge nhánh `feat/be-fe-integration-group-a` (CORS theo cấu hình, `POST /auth/logout`, hạn token theo cấu hình), rồi FE gọi `/auth/logout` ở một việc riêng (mục 3, 7, 8). Không chặn nghiệm thu Phase 3.
- Khi deploy: đặt secret thật cho `BFF_SHARED_SECRET` ở cả Vercel và BE, cấu hình `Cors__AllowedOrigins` cho domain Vercel và FE cũ (Phase 8, DEPL-01/02).

Khi có FAIL: lập kế hoạch sửa bằng `/gsd-plan-phase 3 --gaps`.

---

## D. Bổ sung D-36 (kiểm tay sau khi BE merge)

FE nay gọi `POST /api/v1/auth/logout` best-effort khi đăng xuất (D-36, `03-BE-DEPENDENCIES.md` mục 3). Bước dưới chỉ chạy được khi BE đang chạy nhánh `feat/be-fe-integration-group-a` đã merge; chưa merge thì endpoint 404/405 và bước này không có ý nghĩa.

**Lưu ý trước khi chạy:** bước này CỐ Ý gọi `/auth/refresh-token` bằng refresh token đã bị thu hồi, nên BE sẽ kích hoạt `Token.Compromised` và thu hồi TOÀN BỘ phiên khác của user test. Người test chấp nhận điều đó (dùng user test riêng, đừng dùng tài khoản đang cần giữ phiên). Không ghi token thật vào tệp này.

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| 20 | Với BE chạy nhánh đã merge, đăng nhập. Trong DevTools → Application → Cookies, copy giá trị cookie `...tripory_at` và `...tripory_rt` (thấy được ở đó dù HttpOnly). Đăng xuất trên UI. Rồi gọi thẳng BE bằng PowerShell, thay hai placeholder bằng giá trị đã copy: `Invoke-RestMethod -Method Post -Uri "http://localhost:5251/api/v1/auth/refresh-token" -ContentType "application/json" -Body (@{ accessToken = "<ACCESS_TOKEN_DA_COPY>"; refreshToken = "<REFRESH_TOKEN_DA_COPY>" } \| ConvertTo-Json)` | BE từ chối với lỗi `Token.*` (400, ví dụ `Token.Compromised` hoặc `Token.InvalidRefreshToken`), không trả token mới. Điều này chứng tỏ logout đã thu hồi refresh token. Chấp nhận việc bước này kích hoạt `Token.Compromised` và thu hồi các phiên khác của user test. | D-36, AUTH-04 | |
