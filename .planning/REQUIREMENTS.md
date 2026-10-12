# Requirements: Tripory Frontend

**Defined:** 2026-10-09
**Core Value:** Người dùng có thể tạo, chỉnh sửa và chia sẻ một lịch trình du lịch thật trên bản triển khai công khai, rồi trao đổi về chuyến đi với người khác.

## v1 Requirements

Phạm vi milestone 1 (Phase 0a → 4 + deploy Vercel). Chi tiết contract BE và lý do: `.planning/research/FEATURES.md`, `PITFALLS.md`.

### Nền tảng (FND)

- [x] **FND-01**: Repo build và cài đặt được bằng pnpm 10 (đổi `packageManager`, cấu hình workspace tương thích), `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đều xanh
- [x] **FND-02**: `boundaries.mjs` có preset `uiPackage()` cho `packages/ui-web` và `packages/design-tokens`, có self-test và tài liệu kiến trúc được cập nhật
- [ ] **FND-03**: Người dùng thấy giao diện responsive mobile-first (`dvh`, safe-area, vùng chạm ≥ 44px) với header, layout `(public)`/`(dashboard)` và điều hướng chỉ gồm route có thật
- [ ] **FND-04**: Mọi màn có trạng thái loading, empty và error kèm nút "Thử lại"; route sai hiển thị trang 404
- [ ] **FND-05**: Người dùng nhận toast phản hồi thành công/thất bại cho mọi thao tác ghi, message lỗi lấy từ BE
- [x] **FND-06**: Dialog và form dùng được bằng bàn phím (focus trap, Esc để đóng, label đầy đủ)
- [ ] **FND-07**: Bản walking skeleton được deploy lên Vercel ngay cuối Phase 0a (Root Directory `apps/web`, Node 24)

### Design System (DS)

- [x] **DS-01**: `packages/design-tokens` chứa bộ token thiết kế mới (không port `lib/colors.ts` của FE cũ): màu dạng semantic (`primary`, `surface`, `text`, `border`, `danger`, `success`…), typography, spacing, radius, shadow, z-index, motion, breakpoint; xuất ra Tailwind 4 `@theme` và CSS variables, cấu trúc sẵn chỗ cho dark mode (chưa bật)
- [x] **DS-02**: Quy ước atomic design được ghi trong tài liệu kiến trúc và cưỡng chế bằng cấu trúc thư mục: atoms và molecules ở `packages/ui-web`; organisms và templates gắn nghiệp vụ ở `apps/web/src/modules/*/ui`; organisms dùng chung (AppHeader, AppShell) ở `apps/web/src/components`
- [x] **DS-03**: `ui-web` có các atom: Button, IconButton, Input, Textarea, Label, Checkbox, Switch, Avatar, Badge, Spinner, Skeleton, Separator, Icon (lucide)
- [x] **DS-04**: `ui-web` có các molecule: FormField (label + input + lỗi), SearchInput, Select, Tabs, DropdownMenu, Tooltip, Toast, Dialog, Sheet (bottom sheet nhiều mức), Card, EmptyState, ErrorState (có nút "Thử lại")
- [ ] **DS-05**: App có các organism dùng chung: AppHeader, UserMenu (slot tĩnh, nối phiên thật ở Phase 3), AppShell cho `(public)` và `(dashboard)`
- [x] **DS-06**: Component chỉ dùng token (không hard-code màu/spacing/radius); component có phần con dùng được từ Server Component thì export bằng named export
- [x] **DS-07**: Mỗi base component có test (render, role/aria, tương tác bàn phím cho component tương tác); không dùng showcase (Storybook hay route `/dev/ui`)

### Phiên đăng nhập (AUTH)

- [ ] **AUTH-01**: Người dùng có thể đăng ký bằng email, mật khẩu và họ tên, thấy lỗi validate của BE rõ ràng
- [ ] **AUTH-02**: Người dùng có thể đăng nhập; access và refresh token chỉ nằm trong cookie httpOnly, JavaScript phía client không đọc được
- [ ] **AUTH-03**: Phiên được giữ qua reload và tự refresh im lặng; N request 401 song song chỉ dẫn tới đúng 1 lần refresh, kể cả khi mở nhiều tab (không kích hoạt reuse detection của BE)
- [ ] **AUTH-04**: Người dùng có thể đăng xuất ở mọi trang; cookie bị xóa, kết nối realtime bị ngắt
- [ ] **AUTH-05**: Truy cập trang cần đăng nhập khi chưa có phiên sẽ chuyển sang đăng nhập rồi quay lại đúng trang (`?next=` chỉ nhận path nội bộ)
- [ ] **AUTH-06**: Người dùng có thể đổi mật khẩu, thấy rule mật khẩu của BE trước khi nhập
- [ ] **AUTH-07**: Header hiển thị menu user (avatar, tên, Hồ sơ, Tin nhắn, Đăng xuất) theo phiên thật
- [ ] **AUTH-08**: Client chỉ gọi BE qua BFF cùng origin có allowlist (`users`, `itineraries`, `chat`), chặn `auth/*` và kiểm Origin; BFF không thành open proxy

### Lịch trình — danh sách và editor (ITIN)

- [ ] **ITIN-01**: Người dùng thấy "Lịch trình của tôi" có phân trang và lọc Tất cả/Nháp/Đã xuất bản
- [ ] **ITIN-02**: Người dùng có thể tạo lịch trình nhanh bằng tiêu đề và vào thẳng editor
- [ ] **ITIN-03**: Người dùng có thể sửa metadata: tiêu đề, mô tả, ngày khởi hành, ảnh bìa dạng URL (có preview và nền dự phòng)
- [ ] **ITIN-04**: Người dùng có thể chuyển tab ngày, thêm ngày và sửa phụ đề ngày inline
- [ ] **ITIN-05**: Người dùng có thể thêm waypoint (tên, địa chỉ, ghi chú) và nhập vị trí bằng cách dán tọa độ "lat, lng" hoặc link Google Maps
- [ ] **ITIN-06**: Người dùng có thể sửa waypoint
- [ ] **ITIN-07**: Người dùng có thể xóa waypoint và hoàn tác trong 5 giây (hoãn gửi DELETE)
- [ ] **ITIN-08**: Người dùng có thể kéo thả sắp xếp waypoint trong ngày bằng chuột, cảm ứng và bàn phím; cập nhật optimistic và rollback khi lỗi
- [ ] **ITIN-09**: Người dùng thấy quãng đường theo ngày và tổng do BE tính
- [ ] **ITIN-10**: Người dùng thấy trạng thái lưu (Đang lưu / Đã lưu / Lỗi – thử lại) và được cảnh báo khi rời trang lúc còn request đang chạy
- [ ] **ITIN-11**: Người dùng có thể xuất bản khi có ít nhất 1 waypoint, sau khi xác nhận rằng không thể hủy xuất bản; xong thì mở sẵn hộp chia sẻ
- [ ] **ITIN-12**: Người dùng có thể xóa lịch trình sau khi xác nhận
- [ ] **ITIN-13**: Người không phải chủ không thấy thao tác sửa (`canEdit` suy ra ở domain)
- [ ] **ITIN-14**: Editor dùng được trên mobile với bottom sheet nhiều mức cho timeline

### Trang công khai và chia sẻ (PUB)

- [ ] **PUB-01**: Khách chưa đăng nhập xem được trang công khai SSR của lịch trình đã xuất bản, bố cục bài viết theo ngày
- [ ] **PUB-02**: Người xem chuyển được giữa chế độ Bài viết và Bản đồ SVG (pin theo ngày, polyline, zoom/pan, đồng bộ chọn với danh sách)
- [ ] **PUB-03**: Lịch trình nháp trả trang 403 cho khách, id sai trả 404; chủ xem nháp thấy banner "Bản nháp – chỉ bạn thấy" và nút Sửa
- [ ] **PUB-04**: Người xem có thể chia sẻ bằng copy link, Web Share (mobile) và mã QR
- [ ] **PUB-05**: Link khi dán vào Zalo/Messenger hiển thị preview Open Graph (tiêu đề, mô tả, ảnh bìa); nháp đặt `noindex`
- [ ] **PUB-06**: Bản đồ SVG là một component dùng chung, editor cũng hiển thị được

### Hồ sơ và người dùng (PROF)

- [ ] **PROF-01**: Người dùng xem và sửa được hồ sơ: họ tên, bio, avatar dạng URL; email chỉ đọc
- [ ] **PROF-02**: Hồ sơ có tab lịch trình (Tất cả/Nháp/Công khai) với thao tác nhanh mở, sửa, xóa, chia sẻ
- [ ] **PROF-03**: Người dùng đã đăng nhập tìm được người dùng khác (có debounce), email người khác không hiển thị
- [ ] **PROF-04**: Từ danh bạ, người dùng bấm "Nhắn tin" để mở hoặc tạo hội thoại

### Chat (CHAT)

- [ ] **CHAT-01**: Người dùng thấy danh sách hội thoại (avatar, tên, snippet theo loại, thời gian tương đối, badge unread), cập nhật realtime, mới nhất lên đầu
- [ ] **CHAT-02**: Header hiển thị badge unread tổng
- [ ] **CHAT-03**: Người dùng mở thread, tải được tin cũ hơn, tự cuộn xuống khi có tin mới
- [ ] **CHAT-04**: Người dùng gửi tin text optimistic; nếu thất bại thì có nút Thử lại hoặc Xóa
- [ ] **CHAT-05**: Người gửi thấy trạng thái đã xem; tin chỉ được đánh dấu đã đọc khi thread đang mở và tab đang hiển thị
- [ ] **CHAT-06**: Tin realtime không bị hiển thị trùng (dedupe theo `id`)
- [ ] **CHAT-07**: Người dùng thấy trạng thái kết nối; app tự kết nối lại và đồng bộ lại hội thoại sau khi reconnect
- [ ] **CHAT-08**: Chat trên mobile tách danh sách/thread, có nút back, ô nhập không bị bàn phím che
- [ ] **CHAT-09**: SignalR kết nối thẳng tới hub BE bằng token ngắn hạn lấy qua `GET /api/auth/token` (route không bị prerender/cache)

### Tin nhắn thoại (VOICE)

- [ ] **VOICE-01**: Người dùng ghi âm 1–120 giây (tự dừng ở 120 giây), hủy hoặc gửi; được báo rõ khi bị từ chối quyền mic
- [ ] **VOICE-02**: Upload voice qua BFF dưới 4 MB với MIME được BE chấp nhận; lỗi thì có Thử lại mà không mất bản ghi
- [ ] **VOICE-03**: Người dùng phát voice với play/pause, tiến độ/tua, thời lượng; mỗi lúc chỉ một bản phát
- [ ] **VOICE-04**: Trình duyệt không hỗ trợ ghi định dạng BE nhận (iOS < 18.4) hiển thị thông báo rõ thay vì lỗi im lặng

### Gọi thoại (CALL)

- [ ] **CALL-01**: Người dùng gọi thoại 1-1 với đủ trạng thái đang gọi / đổ chuông / đã kết nối / kết thúc, và nghe hoặc từ chối cuộc gọi đến qua modal toàn cục
- [ ] **CALL-02**: Hai người ở hai mạng khác nhau (4G và Wi-Fi) gọi được cho nhau qua TURN; nghiệm thu bằng `iceTransportPolicy: 'relay'`
- [ ] **CALL-03**: Credential TURN ngắn hạn được cấp qua `GET /api/rtc/ice-servers` (cần phiên); secret nhà cung cấp chỉ nằm trong env server-side
- [ ] **CALL-04**: Cuộc gọi tự kết thúc sau thời gian đổ chuông tối đa và ghi call log "Nhỡ"; đang trong cuộc gọi mà có cuộc khác đến thì tự từ chối "Bận"
- [ ] **CALL-05**: Lỗi mic hoặc ICE failed được báo rõ; ICE disconnected hiện "Đang kết nối lại" và thử ICE restart
- [ ] **CALL-06**: Cuộc gọi đến hiển thị tên và avatar người gọi
- [ ] **CALL-07**: Thread hiển thị call log (hoàn thành/nhỡ/từ chối, thời lượng) và nút "Gọi lại"
- [ ] **CALL-08**: Cuộc gọi không bị ngắt khi điều hướng giữa các route; tab ẩn nhấp nháy tiêu đề khi có tin hoặc cuộc gọi đến
- [ ] **CALL-09**: Payload hub giữ tương thích với FE cũ đang chạy song song (chỉ thêm field, không đổi cấu trúc)

### Triển khai và phản hồi (DEPL)

- [ ] **DEPL-01**: Bản production trên Vercel trỏ tới URL BE công khai qua biến môi trường; biến server-only và `NEXT_PUBLIC_*` được tách rõ và khai báo trong `turbo.json`
- [ ] **DEPL-02**: Checklist phụ thuộc BE (HTTPS/WSS, CORS cho domain Vercel và FE cũ, một instance hoặc sticky session, lưu voice bền) được ghi lại để chuyển sang repo `tripory_be`
- [ ] **DEPL-03**: Smoke E2E bằng Playwright trên URL deploy: đăng nhập → tạo và xuất bản lịch trình → xem trang public → nhắn tin giữa hai người
- [ ] **DEPL-04**: Menu user có link góp ý và hiển thị phiên bản build

## v2 Requirements

Hoãn sang milestone sau, có theo dõi nhưng không nằm trong roadmap hiện tại.

### Bản đồ và địa điểm

- **MAP-01**: Tìm địa điểm theo tên qua geocoder OSM (Nominatim/Photon) gọi từ route handler, đặt sau port `PlaceSearch`
- **MAP-02**: Nền bản đồ MapLibre + OpenFreeMap, bấm lên bản đồ để chọn vị trí waypoint
- **MAP-03**: Mapbox GL + Geocoding khi có token

### Trải nghiệm bổ sung

- **UX-01**: Thẻ lịch trình trong chat bằng cách unfurl link nội bộ
- **UX-02**: Ảnh OG động (`opengraph-image.tsx`)
- **UX-03**: Ngày thực theo `startDate` ("Ngày 2 · Thứ Bảy 12/10")
- **UX-04**: Khoảng cách từng chặng có ghi "ước tính"
- **UX-05**: Notification API cho tin nhắn/cuộc gọi khi tab ẩn
- **UX-06**: `BroadcastChannel` để dừng chuông ở các tab khác khi đã nghe ở một tab
- **UX-07**: "Chuyển sang ngày…" cho waypoint (thêm mới rồi xóa cũ)
- **UX-08**: Nút chia sẻ riêng cho Facebook/Zalo/X
- **UX-09**: Dark mode (bật nhánh token đã chừa sẵn ở DS-01)
- **UX-10**: Showcase component (Storybook hoặc route dev-only)

### Chờ BE

- **BE-01**: Fork lịch trình
- **BE-02**: Like, comment
- **BE-03**: Discovery feed
- **BE-04**: Check-in và review waypoint
- **BE-05**: Upload ảnh bìa/avatar
- **BE-06**: Hiển thị tác giả trên trang công khai (cần `author` trong DTO)
- **BE-07**: Hủy xuất bản

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mọi mock (Discovery, Fork, Like, Comment, Check-in, số liệu hồ sơ giả) | Quyết định không dựng mock; màn trống làm mất niềm tin người thử |
| Presence/"đang nhập..." | Hub BE không hỗ trợ |
| Nút loa ngoài trong cuộc gọi | Web không có API speakerphone; FE cũ chỉ đổi state |
| Kéo thả waypoint giữa các ngày, xóa/đổi thứ tự ngày | BE không có endpoint |
| Soạn lịch trình khi chưa đăng nhập | BE yêu cầu auth để tạo |
| Cộng tác realtime | BE không có version/ETag |
| Web Push, nhận cuộc gọi khi tab đóng | BE không có push |
| Chat nhóm, sửa/xóa/thu hồi tin, reaction, gửi ảnh | BE không hỗ trợ |
| Quên mật khẩu, xác thực email | BE không có |
| PWA/offline, xuất PDF | Ngoài phạm vi thử nghiệm (dark mode chuyển sang v2 UX-09) |
| Autocomplete trên Nominatim public | Bị cấm theo Usage Policy |
| `apps/admin`, mobile | Ngoài mục tiêu milestone |
| Deploy BE | Repo `tripory_be` tự lo; FE chỉ cần URL |
| Revoke refresh token khi logout, chuông đổ ở mọi tab, voice trên iOS < 18.4 | Giới hạn đã chấp nhận cho đợt dùng thử; ghi đề xuất cho BE |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Pending |
| FND-04 | Phase 1 | Pending |
| FND-05 | Phase 2 | Pending |
| FND-06 | Phase 1 | Complete |
| FND-07 | Phase 1 | Pending |
| DS-01 | Phase 1 | Complete |
| DS-02 | Phase 1 | Complete |
| DS-03 | Phase 1 | Complete |
| DS-04 | Phase 1 | Complete |
| DS-05 | Phase 1 | Pending |
| DS-06 | Phase 1 | Complete |
| DS-07 | Phase 1 | Complete |
| AUTH-01 | Phase 3 | Pending |
| AUTH-02 | Phase 3 | Pending |
| AUTH-03 | Phase 3 | Pending |
| AUTH-04 | Phase 3 | Pending |
| AUTH-05 | Phase 3 | Pending |
| AUTH-06 | Phase 3 | Pending |
| AUTH-07 | Phase 3 | Pending |
| AUTH-08 | Phase 3 | Pending |
| ITIN-01 | Phase 4 | Pending |
| ITIN-02 | Phase 4 | Pending |
| ITIN-03 | Phase 4 | Pending |
| ITIN-04 | Phase 4 | Pending |
| ITIN-05 | Phase 4 | Pending |
| ITIN-06 | Phase 4 | Pending |
| ITIN-07 | Phase 4 | Pending |
| ITIN-08 | Phase 4 | Pending |
| ITIN-09 | Phase 4 | Pending |
| ITIN-10 | Phase 4 | Pending |
| ITIN-11 | Phase 4 | Pending |
| ITIN-12 | Phase 4 | Pending |
| ITIN-13 | Phase 4 | Pending |
| ITIN-14 | Phase 4 | Pending |
| PUB-01 | Phase 5 | Pending |
| PUB-02 | Phase 5 | Pending |
| PUB-03 | Phase 5 | Pending |
| PUB-04 | Phase 5 | Pending |
| PUB-05 | Phase 5 | Pending |
| PUB-06 | Phase 5 | Pending |
| PROF-01 | Phase 6 | Pending |
| PROF-02 | Phase 6 | Pending |
| PROF-03 | Phase 6 | Pending |
| PROF-04 | Phase 6 | Pending |
| CHAT-01 | Phase 7 | Pending |
| CHAT-02 | Phase 7 | Pending |
| CHAT-03 | Phase 7 | Pending |
| CHAT-04 | Phase 7 | Pending |
| CHAT-05 | Phase 7 | Pending |
| CHAT-06 | Phase 7 | Pending |
| CHAT-07 | Phase 7 | Pending |
| CHAT-08 | Phase 7 | Pending |
| CHAT-09 | Phase 7 | Pending |
| VOICE-01 | Phase 7 | Pending |
| VOICE-02 | Phase 7 | Pending |
| VOICE-03 | Phase 7 | Pending |
| VOICE-04 | Phase 7 | Pending |
| CALL-01 | Phase 7 | Pending |
| CALL-02 | Phase 7 | Pending |
| CALL-03 | Phase 7 | Pending |
| CALL-04 | Phase 7 | Pending |
| CALL-05 | Phase 7 | Pending |
| CALL-06 | Phase 7 | Pending |
| CALL-07 | Phase 7 | Pending |
| CALL-08 | Phase 7 | Pending |
| CALL-09 | Phase 7 | Pending |
| DEPL-01 | Phase 8 | Pending |
| DEPL-02 | Phase 8 | Pending |
| DEPL-03 | Phase 8 | Pending |
| DEPL-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 72 total
- Mapped to phases: 72
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-09*
*Last updated: 2026-10-09 after roadmap creation*
