# Tripory Frontend

## What This Is

Tripory là ứng dụng lập và chia sẻ lịch trình du lịch. Dự án này viết lại frontend hiện có thành ứng dụng Next.js trong monorepo theo kiến trúc DDD, chạy song song với frontend Vite cũ trong thời gian thử nghiệm với một nhóm bạn bè trước khi thay thế dần.

Milestone đầu tiên đưa luồng chính từ đăng nhập, tạo/chỉnh sửa/xuất bản lịch trình, xem trang công khai, quản lý hồ sơ đến chat và gọi thoại lên một URL Vercel có thể sử dụng ngoài môi trường local.

## Core Value

Người dùng có thể tạo, chỉnh sửa và chia sẻ một lịch trình du lịch thật trên bản triển khai công khai, rồi trao đổi về chuyến đi với người khác.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Người dùng có thể truy cập khung giao diện responsive cho các route thuộc milestone mà không gặp lỗi build hoặc điều hướng.
- [ ] Người dùng có thể đăng ký, đăng nhập, duy trì phiên và đăng xuất qua BFF cùng origin; access token và refresh token nằm trong cookie httpOnly và không thể bị JavaScript phía client đọc.
- [ ] Người dùng đã đăng nhập có thể tạo, xem, sửa và xóa lịch trình bằng API thật của backend.
- [ ] Người dùng có thể thêm, sửa, xóa và sắp xếp waypoint theo ngày, đặt phụ đề ngày và xuất bản lịch trình.
- [ ] Người dùng có thể thao tác waypoint mà không phụ thuộc Mapbox token, sử dụng bản đồ SVG và cơ chế nhập/chọn tọa độ sẽ được chốt khi lập kế hoạch phase tương ứng.
- [ ] Khách chưa đăng nhập có thể xem trang công khai của một lịch trình đã xuất bản; lịch trình nháp hiển thị đúng trạng thái lỗi quyền truy cập.
- [ ] Người dùng có thể xem và cập nhật hồ sơ thật, tìm người dùng khác và xem danh sách lịch trình của mình.
- [ ] Người dùng có thể gửi/nhận tin nhắn text và voice theo thời gian thực, theo dõi trạng thái đã đọc và xem lịch sử hội thoại.
- [ ] Hai người dùng ở các mạng Internet khác nhau có thể gọi thoại ổn định qua WebRTC với TURN, dùng credential ngắn hạn thay vì để secret trong bundle client.
- [ ] Frontend được triển khai trên Vercel và một nhóm bạn bè có thể sử dụng để đưa phản hồi.
- [ ] Frontend có thể trỏ tới URL backend công khai qua cấu hình môi trường; kết nối SignalR trực tiếp tới backend hoạt động với CORS phù hợp cho domain Vercel.
- [ ] Mọi thay đổi tuân thủ ranh giới DDD đã được ESLint cưỡng chế và vượt qua lint, typecheck, test cùng build liên quan.

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Fork itinerary — backend chưa có endpoint; chờ hợp đồng API trước khi triển khai.
- Social (like, comment, share nghiệp vụ), Discovery feed và Check-in/review — backend chưa hỗ trợ; không dựng mock trong frontend mới.
- Mapbox GL và Mapbox Geocoding — chưa có token; milestone này giữ bản đồ SVG và hoãn package maps tích hợp Mapbox.
- `apps/admin` và ứng dụng mobile — không thuộc mục tiêu thử nghiệm frontend web đầu tiên.
- Triển khai backend — thực hiện trong repo `tripory_be`; roadmap frontend chỉ coi URL backend công khai là phụ thuộc bên ngoài.
- Thay thế hoặc gỡ frontend Vite cũ — frontend mới sẽ chạy song song trong milestone đầu để giảm rủi ro.

## Context

- Repo hiện là pnpm workspace dùng Turborepo, Next.js 16.4, React 19.3 và Tailwind CSS 4.3; code nghiệp vụ chưa được triển khai.
- `packages/config` đã có ESLint presets, kiểm tra ranh giới tầng/package và self-test. `shared-kernel`, `api-client` và bốn tầng của `itinerary` hiện mới là khung rỗng.
- Frontend Vite cũ có Auth, Users và Chat nối API thật; Itinerary, Discovery, danh sách trip trong Profile, Public view, Fork, Like, Comment và Check-in dựa trên mock.
- Backend hiện chạy local và đã có API Auth, Users, Chat/SignalR và 11 endpoint Itinerary. Backend chưa có API cho Fork, Social, Discovery, Check-in hoặc upload ảnh bìa.
- Milestone đầu tiên dự kiến đi qua UI skeleton, HTTP/kernel, identity/session, Itinerary editor, public view, Profile/users và Chat realtime đến hết Phase 4.
- Nhóm người dùng ban đầu là vài người quen được mời dùng bản deploy và đưa phản hồi; chưa coi đây là đợt phát hành production diện rộng.
- Backend phải được triển khai riêng trước khi nghiệm thu end-to-end. Nghiên cứu dự án có thể đề xuất nền tảng miễn phí/rẻ phù hợp .NET, database và WebSocket, nhưng không thay đổi code repo backend trong roadmap này.

## Constraints

- **Architecture**: Tuân thủ `ai-memories/tripory-fe--ddd-architecture.md`; bounded context không import lẫn nhau, composition root nằm trong app và chỉ `apps/web/src/composition/**` được import adapter `/http` — ranh giới được ESLint cưỡng chế.
- **Backend authority**: Backend là nguồn sự thật cho invariant và dữ liệu dẫn xuất; frontend chỉ giữ luật phục vụ trải nghiệm người dùng và map DTO qua ACL — tránh sao chép nghiệp vụ backend.
- **Framework**: Next.js 16.4 trong `apps/web`; phải đọc tài liệu đúng phiên bản tại `apps/web/node_modules/next/dist/docs/` trước khi viết code Next.js.
- **Deployment**: Frontend chạy trên Vercel; backend được triển khai ở nơi khác và cung cấp URL công khai có HTTPS, CORS và WebSocket/SignalR hoạt động.
- **Authentication**: REST từ client đi qua BFF cùng origin; access và refresh token nằm trong cookie httpOnly. SignalR kết nối thẳng tới backend bằng access token ngắn hạn lấy qua endpoint server-side của app.
- **Realtime**: WebRTC phải hoạt động qua mạng khác nhau; TURN là bắt buộc, credential phải ngắn hạn và secret nhà cung cấp chỉ nằm trong biến môi trường server-side.
- **Maps**: Không phụ thuộc Mapbox trong milestone này; dùng bản đồ SVG hiện có hoặc giải pháp không cần token.
- **Compatibility**: Frontend mới chạy song song với frontend cũ và cùng sử dụng backend hiện có; không được yêu cầu gỡ frontend cũ để vận hành.
- **Dependencies**: Deploy backend nằm ngoài repo này và là gate để nghiệm thu deployment, auth, SignalR và gọi thoại end-to-end.
- **Quality**: Trước khi hoàn tất công việc phải chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`; chạy build và kiểm tra runtime/visual phù hợp cho phần giao diện bị ảnh hưởng.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Xây frontend mới bằng monorepo pnpm + Turborepo và bounded-context packages | Chia sẻ domain/application/adapters giữa web, admin và mobile trong tương lai, đồng thời cưỡng chế ranh giới kiến trúc | — Pending |
| Hoàn tất milestone đầu tiên đến hết Chat (Phase 4) | Bản thử nghiệm cần đủ luồng chính tương đương những phần backend đã hỗ trợ, không chỉ dừng ở nền móng | — Pending |
| Chạy frontend mới song song với frontend Vite cũ | Cho phép thử nghiệm và chuyển đổi dần mà không làm mất phiên bản hiện có | — Pending |
| Triển khai web trên Vercel | Có URL công khai nhanh để mời bạn bè dùng thử và góp ý | — Pending |
| Deploy backend là phụ thuộc ngoài repo frontend | Backend có repo và vòng đời riêng; frontend chỉ cần hợp đồng cùng URL môi trường | — Pending |
| REST dùng BFF cùng origin, token nằm trong cookie httpOnly | Giảm bề mặt XSS so với lưu token trong localStorage và đơn giản hóa request phía client | — Pending |
| SignalR kết nối trực tiếp tới backend | Vercel route handlers không phải proxy WebSocket dài hạn; backend phải cho phép origin frontend | — Pending |
| Bắt buộc TURN cho gọi thoại | STUN đơn thuần không đảm bảo kết nối WebRTC giữa các NAT/mạng di động khác nhau | — Pending |
| Credential TURN được cấp ngắn hạn qua endpoint server-side | Tránh lộ TURN secret dài hạn trong JavaScript bundle | — Pending |
| Giữ bản đồ SVG, hoãn Mapbox | Chưa có Mapbox token nhưng luồng Itinerary vẫn cần tiến triển | — Pending |
| Không dựng mock cho tính năng backend chưa hỗ trợ | Tránh tạo trải nghiệm giả và công việc phải bỏ khi contract thật xuất hiện | — Pending |
| Viết tay schema Zod trước, cân nhắc type sinh từ OpenAPI sau | Cần kiểm tra runtime sớm trong khi contract generation chưa phải dependency của nền móng | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-09 after initialization*
