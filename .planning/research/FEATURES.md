# Feature Research

**Domain:** Ứng dụng lập và chia sẻ lịch trình du lịch (web, mobile-first) kèm chat 1-1, tin nhắn thoại và gọi thoại WebRTC
**Researched:** 2026-10-09
**Confidence:** HIGH cho phạm vi BE hỗ trợ (đọc trực tiếp controller, DTO, entity, hub của `tripory_be`); MEDIUM cho kỳ vọng UX/đối thủ; LOW ở những dòng ghi rõ

## Kết luận chính

- Tính năng của milestone bị giới hạn bởi những gì BE có. BE có Auth, Users, Chat/SignalR và 11 endpoint Itinerary, nhưng **không có** các thứ sau: unpublish, chuyển waypoint sang ngày khác, xóa ngày, thông tin tác giả trong `ItineraryDetailDto`, `GET /users/{id}`, presence, typing, push, upload ảnh, revoke refresh token. Các tính năng phụ thuộc chúng là anti-feature trong milestone này, hoặc chỉ làm bằng workaround thuần FE (xem mục "Khoảng trống BE"). (HIGH)
- **Bản đồ SVG của FE cũ không chọn được vị trí.** Nó là sơ đồ co theo bounding box của các waypoint, không có nền bản đồ và không có phép chiếu ngược (`lib/projection.ts`, `MapCanvas.tsx`). Vì vậy "click trên bản đồ để thêm waypoint" vô nghĩa. Cách nhập vị trí phải chốt ở Phase 1. Đề xuất: tìm địa điểm qua geocoder OSM miễn phí, gọi qua route handler server-side, kèm ô dán tọa độ/link Google Maps làm phương án dự phòng. (HIGH)
- FE cũ có nhiều UX table stakes mà đề xuất (`tripory-fe-quick-proposal.md`) chưa nhắc: undo khi xóa, chia sẻ link/QR/Web Share, badge unread ở danh sách và header, trạng thái cuộc gọi kèm âm báo, bottom sheet và kéo thả bằng cảm ứng trên mobile, thử lại khi upload voice lỗi. Cần đưa vào REQUIREMENTS, nếu không bản mới sẽ kém hơn bản cũ. (HIGH)
- FE cũ cũng thiếu vài table stakes mà bản mới phải bổ sung: trạng thái lỗi và trang 403/404, gửi tin thất bại thì cho thử lại, hết giờ đổ chuông, xử lý "bận", resync sau khi kết nối lại, chỉ đánh dấu đã đọc khi tab đang hiển thị, sửa waypoint, chỉ báo trạng thái lưu. (HIGH, đã đọc code)
- Hai cạm bẫy UX có thể làm hỏng buổi thử với bạn bè:
  - Safari dưới 18.4 ghi âm ra `audio/mp4`, mà allowlist MIME của BE không có định dạng này.
  - Session nằm trong cookie httpOnly, nên hai tab cùng trình duyệt là cùng một user. Nghiệm thu "gọi giữa 2 tab" phải dùng 2 profile/thiết bị, và lý tưởng nhất là 2 mạng khác nhau. (MEDIUM)

## Feature Landscape

### Table Stakes (Users Expect These)

Cột "Phase" ánh xạ vào lộ trình 0a → 4. "BE" ghi endpoint/giới hạn đã kiểm chứng trong code BE.

#### A. Nền tảng và UX chung

| Feature | Why Expected | Complexity | Phase | Notes |
|---|---|---|---|---|
| Responsive mobile-first: editor dùng bottom sheet nhiều mức (`collapsed/half/expanded/hidden`), chat tách list/thread kèm nút back, vùng chạm ≥ 44px, `dvh` và safe-area | Bạn bè mở link trên điện thoại. FE cũ đã làm như vậy (`TimelineSheet.tsx`, `ChatRoom.tsx`) | MEDIUM | 0a, áp dụng ở mọi phase | Dùng `h-dvh` thay `h-screen` vì bàn phím iOS che ô nhập chat |
| Trạng thái loading/empty/error cho mọi màn, có nút "Thử lại" | FE cũ có skeleton và empty state nhưng **không có error state** (không xử lý `isError`) | LOW–MEDIUM | 0a (quy ước `loading.tsx`/`error.tsx`/`not-found.tsx`), áp dụng ở từng phase | Message lỗi lấy từ `ApiResponse.message` (BE trả tiếng Việt), chuẩn hóa ở `api-client` (0b) |
| Toast phản hồi cho mọi mutation (thành công/thất bại) | Mọi thao tác editor đều là một REST call. Người dùng cần biết nó đã lưu hay chưa | LOW | 0a (toast), 0b (`ApiError`) | — |
| Điều hướng chỉ hiện route có thật | Link tới Discovery/Fork giả làm mất niềm tin khi dùng thử | LOW | 0a | Trang chủ: khách thấy landing + CTA đăng nhập; đã đăng nhập thì vào "Lịch trình của tôi" |
| Dialog/form có focus trap, đóng bằng Esc, label đầy đủ, dùng được bằng bàn phím | FE cũ tự viết modal, focus trap chỉ có một phần | MEDIUM | 0a (`ui-web`) | Validate WCAG đầy đủ cần kiểm thử thủ công bằng công nghệ hỗ trợ |

#### B. Identity (0c)

| Feature | Why Expected | Complexity | Phase | Notes |
|---|---|---|---|---|
| Đăng ký, đăng nhập, đăng xuất | Cửa vào của mọi tính năng ghi | LOW–MEDIUM | 0c | BE: register `{email, password ≥8, fullName ≤100}`. Không có endpoint logout/revoke, nên đăng xuất = xóa cookie + ngắt SignalR + kết thúc cuộc gọi |
| Giữ phiên và tự refresh im lặng | Không bắt người dùng đăng nhập lại mỗi giờ | MEDIUM | 0b/0c | `appsettings.json` của BE: access 60 phút, refresh 7 ngày. Body refresh cần `{accessToken, refreshToken}` (`RefreshTokenCommand`) |
| Auth gate quay lại đúng trang sau khi đăng nhập | FE cũ mở modal rồi chạy tiếp hành động (`openAuthModal({onAuthenticated})`) | LOW | 0c | Dùng `?next=` qua proxy/middleware. Chỉ nhận path nội bộ để tránh open redirect |
| Đổi mật khẩu | FE cũ đã có (`ChangePasswordModal`) | LOW | 0c hoặc 3 | Rule của BE mạnh hơn lúc đăng ký: có chữ hoa, chữ thường, số, ký tự đặc biệt, khác mật khẩu cũ. FE phải hiển thị rule trước để người dùng không bất ngờ với lỗi 400 |
| Menu user ở header: avatar, tên, Hồ sơ, Tin nhắn, Đăng xuất | Mẫu quen thuộc | LOW | 0a slot tĩnh → 0c nối thật | Badge unread nối ở Phase 4 |

#### C. Itinerary: danh sách và editor (Phase 1)

| Feature | Why Expected | Complexity | Phase | Notes |
|---|---|---|---|---|
| "Lịch trình của tôi": phân trang, lọc Tất cả/Nháp/Đã xuất bản | Điểm vào chính sau khi đăng nhập | LOW–MEDIUM | 1 | `GET /mine?pageIndex&pageSize(≤100)&isPublic`, trả `PagedResult` có `TotalCount`/`HasNextPage` |
| Tạo nhanh bằng tiêu đề rồi vào thẳng editor | BE tạo nháp chỉ từ `{title}` (1–100 ký tự) | LOW | 1 | Có thể điền sẵn "Chuyến đi mới" để tạo bằng một chạm |
| Sửa metadata: tiêu đề, mô tả (≤1000), ngày khởi hành, ảnh bìa | FE cũ có `PublishModal` | LOW–MEDIUM | 1 | Ảnh bìa **chỉ là URL** (chưa có upload): ô nhập URL + preview + nền gradient dự phòng |
| Tab ngày, "Thêm ngày", phụ đề ngày (≤100) sửa inline | Lịch trình chia theo ngày là mô hình cốt lõi | MEDIUM | 1 | BE tạo ngày ngầm khi `AddWaypoint` hoặc `SetDaySubtitle`. Ngày rỗng mới thêm chỉ tồn tại ở client cho tới khi có waypoint/phụ đề |
| Thêm waypoint: tên (≤200), địa chỉ, tọa độ, ghi chú | Hành động chính của editor | MEDIUM–HIGH | 1 | **Phụ thuộc quyết định nhập vị trí** (mục "Quyết định cần chốt"). FE cũ dùng `mockPOIs`, không port được |
| Sửa waypoint | BE có `PUT /waypoints/{id}`. FE cũ **không có** UI sửa | LOW–MEDIUM | 1 | `UpdateWaypointRequest` không có `dayNumber`, nên không đổi ngày được |
| Xóa waypoint kèm **Undo 5 giây** | FE cũ có (`UndoToast`, D-12). Thao tác phá hủy trên mobile dễ chạm nhầm | MEDIUM | 1 | Khuyến nghị **hoãn commit**: ẩn ngay, gửi `DELETE` sau 5 giây hoặc khi rời trang. Undo kiểu xóa xong thêm lại sẽ ra ID mới và cần thêm một lần reorder |
| Kéo thả sắp xếp trong ngày (pointer, touch, keyboard), optimistic + rollback | FE cũ có dnd-kit với 3 sensor (`SortableWaypointList.tsx`) | MEDIUM | 1 | `PUT /days/{n}/reorder-waypoints` yêu cầu danh sách ID khớp **đúng** tập waypoint của ngày (`InvalidReorderList`) |
| Quãng đường theo ngày và tổng | FE cũ hiển thị trong `DaySwitcher` | LOW | 1 | Dùng `DayDistanceKm`/`TotalDistanceKm` của BE sau khi refetch. Không tự tính làm nguồn sự thật (tài liệu kiến trúc mục 9) |
| Chỉ báo trạng thái lưu (Đang lưu / Đã lưu / Lỗi – thử lại), cảnh báo rời trang khi còn request | Mỗi thao tác là một request riêng, không có nút "Lưu" | MEDIUM | 1 | FE cũ không cần vì lưu vào localStorage |
| Xuất bản: disable khi chưa có waypoint, **xác nhận rõ là không hủy xuất bản được** | BE trả `CannotPublishEmpty`. Không có endpoint unpublish (entity có `Unpublish()` nhưng controller không lộ ra) | LOW | 1 | Sau khi xuất bản, hiện ngay link chia sẻ (mục D) |
| Xóa lịch trình có hộp xác nhận | FE cũ có (`DeleteTripConfirmDialog`) | LOW | 1/3 | — |
| Ẩn thao tác sửa khi không phải chủ | BE chỉ chặn bằng 403, không trả cờ quyền | LOW | 1 | `canEdit = itinerary.userId === viewerId` (domain) |

#### D. Public view, bản đồ SVG và chia sẻ (Phase 2)

| Feature | Why Expected | Complexity | Phase | Notes |
|---|---|---|---|---|
| Trang công khai SSR xem được khi chưa đăng nhập, bố cục bài viết theo ngày | Giá trị cốt lõi: chia sẻ lịch trình | MEDIUM | 2 | `GET /itineraries/{id}` là public. Không cache chung giữa các viewer vì chủ được xem nháp, khách thì không |
| Bản đồ SVG: pin theo ngày, polyline, đồng bộ chọn giữa bản đồ và danh sách, zoom/pan, nút chuyển Bài viết/Bản đồ | FE cũ có (`PublicMapView`, `MapCanvas`, `ModeTogglePill`) | MEDIUM | 2 (dùng lại trong editor) | Chỉ hiển thị, không chọn được vị trí. Một component dùng chung cho editor và public view |
| 403 cho nháp (khách), 404 cho id sai; chủ xem nháp thấy banner "Bản nháp – chỉ bạn thấy" + nút Sửa | BE trả 403 cho người không phải chủ. Chủ có Bearer thì nhận 200 (`GetItineraryByIdQueryHandler`) | LOW–MEDIUM | 2 | `forbidden()` của Next vẫn **experimental** ([docs](https://nextjs.org/docs/app/api-reference/functions/forbidden)), nên tự render component 403 |
| Chia sẻ: copy link, Web Share API trên mobile, mã QR | FE cũ có (`ShareModal`, `QrCodeSvg`, `navigator.share`) | LOW | 2 | Web Share trên mobile đã phủ Zalo/Messenger qua share sheet của hệ điều hành |
| Link preview khi dán vào Zalo/Messenger (Open Graph: tiêu đề, mô tả, ảnh bìa) | Bạn bè chia sẻ qua app chat. Link không có preview trông như spam | LOW–MEDIUM | 2 | `generateMetadata` trên route public. Nháp/403 thì đặt `noindex` và metadata trung tính |

#### E. Profile và người dùng (Phase 3)

| Feature | Why Expected | Complexity | Phase | Notes |
|---|---|---|---|---|
| Xem/sửa hồ sơ: họ tên (≤100), bio (≤250), avatar dạng URL; handle/email chỉ đọc | FE cũ có (`EditProfileModal`) | LOW | 3 | `UpdateUserProfileCommand {fullName, bio?, avatarUrl?}`. Không có upload ảnh |
| Tab lịch trình trong hồ sơ (Tất cả/Nháp/Công khai) + thao tác nhanh: mở, sửa, xóa, chia sẻ | FE cũ có (`ProfileTripTabs`, `TripQuickActionSheet`) nhưng dữ liệu là mock | LOW–MEDIUM | 3 | App ghép dữ liệu từ `/mine`, `profile` không import `itinerary` |
| Danh bạ: tìm người dùng (debounce), nút "Nhắn tin" | FE cũ có (`UsersDirectoryPage`) | LOW | 3 | `GET /users?search&limit` là **AllowAnonymous và trả cả `Email`**. Mapper ACL phải bỏ email, chỉ gọi khi đã đăng nhập |

#### F. Chat (Phase 4)

| Feature | Why Expected | Complexity | Phase | Notes |
|---|---|---|---|---|
| Danh sách hội thoại: avatar, tên, snippet theo loại (text/voice/cuộc gọi), thời gian tương đối, **badge unread**, mới nhất lên đầu, cập nhật realtime | Chuẩn của mọi app chat. FE cũ có (`ConversationList`) | MEDIUM | 4 | `ConversationDto` có `UnreadCount`, `LastMessageType`, `LastMessageAt`; event `ConversationUpdated` |
| **Badge unread tổng** trên header/nav | FE cũ có (`PublicHeader.tsx`) | LOW | 4 | Tổng `UnreadCount` từ cache hội thoại |
| Thread: tải tin cũ hơn, cuộn về cuối khi có tin mới, empty state | FE cũ có (infinite query, nút "Tải tin nhắn cũ hơn") | MEDIUM | 4 | `?page&pageSize` (1–100) |
| Gửi text (≤2000) optimistic: đang gửi → đã gửi; **thất bại → Thử lại/Xóa** | FE cũ không xử lý `onError`, tin tạm bị treo ở trạng thái "Đang gửi..." | MEDIUM | 4 | Thay tin tạm bằng `ChatMessageDto` server trả về, ghép theo `tempId`, không ghép theo nội dung |
| Đã xem ✓/✓✓, đánh dấu đã đọc khi mở thread hoặc có tin mới **và tab đang hiển thị** | FE cũ đánh dấu cả khi tab ẩn (`useEffect` theo `messages.length`) | LOW–MEDIUM | 4 | `PUT /read`; event `MessageRead` tới người gửi |
| Khử trùng lặp tin realtime | Người nhận đang mở phòng nhận cả `ReceiveMessage` lẫn `ReceiveConversationMessage` (`ChatNotificationService`) | LOW | 4 | Dedupe theo `id` |
| Chỉ báo kết nối, tự kết nối lại, **resync** sau reconnect | FE cũ có badge kết nối nhưng không refetch sau khi reconnect, nên mất tin trong khoảng rớt mạng | MEDIUM | 4 | Khi reconnected thì invalidate conversations + thread đang mở. `accessTokenFactory` lấy token mới qua `GET /api/auth/token` |

#### G. Tin nhắn thoại (Phase 4)

| Feature | Why Expected | Complexity | Phase | Notes |
|---|---|---|---|---|
| Ghi âm 1–120 giây, tự dừng ở 120 giây, hủy/gửi, thông báo khi bị từ chối quyền mic | Spec PT-02 (BR_CHAT_02). FE cũ có | MEDIUM | 4 | BE validate `VoiceDuration` trong khoảng 1–120 |
| Upload ≤ 10MB, **thử lại khi lỗi mà vẫn giữ bản ghi**, chuẩn hóa MIME | FE cũ có retry (`VoiceRecorder.tsx`) | MEDIUM | 4 | BE so khớp `ContentType` **chính xác** với allowlist (webm/wav/ogg/mp3/mpeg). Blob từ MediaRecorder thường mang `;codecs=opus`, nên đóng gói lại thành `audio/webm` trước khi upload (MEDIUM, cần kiểm chứng). Safari 14.1–18.3 chỉ ghi được `audio/mp4` ([LambdaTest](https://www.lambdatest.com/web-technologies/mediarecorder-firefox)), mà BE không nhận |
| Player: play/pause, tiến độ/tua, thời lượng; mỗi lúc chỉ một bản phát | FE cũ có (`VoiceMessagePlayer`, `audioManager`) | MEDIUM | 4 | File do BE phục vụ qua `UseStaticFiles`. Hosting có đĩa tạm thì file mất sau redeploy (phụ thuộc deploy BE) |

#### H. Gọi thoại (Phase 4)

| Feature | Why Expected | Complexity | Phase | Notes |
|---|---|---|---|---|
| State machine `idle → calling → ringing → connected → ended` và `incoming → connected/ended`; modal toàn cục: Nghe/Từ chối, tắt mic, đồng hồ, ringback/ringtone | Spec PT-03, FE cũ có (`ChatRealtimeContext`, `AudioCallModal`). Mô hình trạng thái khớp với SDK thương mại ([Telnyx](https://developers.telnyx.com/docs/development/webrtc/js-sdk/explanation/call-state-lifecycle)) | HIGH | 4 | Đặt state machine trong `packages/chat` domain (thuần TS, test được) |
| **Hết giờ đổ chuông** (ví dụ 30–45 giây) → gửi `EndCall` + call-log `Missed` | Spec có nhắc "Timeout" nhưng FE cũ không cài, nên chuông kêu vô hạn | LOW–MEDIUM | 4 | Caller chịu trách nhiệm call-log (BR_CHAT_05) |
| **Bận**: đang gọi mà có cuộc gọi khác đến → tự `RejectCall("Bận")` | FE cũ ghi đè `activeCall` | LOW | 4 | — |
| Lỗi mic, ICE `failed` → báo rõ và kết thúc; ICE `disconnected` → hiện "Đang kết nối lại" | Mạng di động hay chập chờn. Trình duyệt có thể đợi tới khoảng 15 giây mới báo thất bại ([webrtc-developers](https://www.webrtc-developers.com/nailing-the-webrtc-call-start/)) | MEDIUM | 4 | Theo dõi `iceConnectionState`/`connectionState` |
| Tên/avatar người gọi ở cuộc gọi đến | Event `IncomingCall` chỉ có `CallerId`, `Offer`, `Timestamp`. FE cũ hiện "Người dùng Tripory" | LOW | 4 | Tra trong cache hội thoại theo `partner.id`; không có thì gọi `POST /conversations/{callerId}` (get-or-create, trả `Partner`) |
| Call log trong thread (hoàn thành/nhỡ/từ chối, thời lượng) + nút "Gọi lại" | FE cũ có (`CallLogMessage`) | LOW | 4 | Enum BE: `CallStatus {Completed=1, Missed=2, Declined=3}`, `CallDirection {InBound=1, Outbound=2}` |
| TURN với credential ngắn hạn qua `GET /api/rtc/ice-servers` | Gọi giữa các mạng khác nhau (quyết định đã chốt) | MEDIUM | 4 | FE cũ chỉ dùng STUN của Google |
| Cuộc gọi không rớt khi điều hướng giữa các route | FE cũ đặt provider và modal ở gốc `App.tsx` | MEDIUM | 4 | Provider realtime + modal gọi phải nằm ở layout bao cả `(public)` lẫn `(dashboard)`, nếu không chuyển group layout sẽ unmount và cắt cuộc gọi |
| Báo khi tab ẩn: nhấp nháy tiêu đề tab với tin/cuộc gọi đến | FE cũ có (`flashTabTitle`) | LOW | 4 | Chuông có thể bị autoplay chặn nếu chưa có thao tác người dùng, nên tín hiệu hình ảnh là bắt buộc |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Tìm địa điểm theo tên không cần token (OSM geocoder qua route handler) | Thêm waypoint nhanh như app có Mapbox/Google mà không cần key | MEDIUM | Xem "Quyết định cần chốt". Đặt sau port `PlaceSearch` (package `maps`) để đổi nhà cung cấp mà không sửa UI |
| Dán link Google Maps hoặc chuỗi "lat, lng" để lấy tọa độ | Bạn bè thường đã có sẵn link Google Maps của quán/điểm đến; không phụ thuộc dịch vụ ngoài | LOW | Parse mẫu `@lat,lng` và `?q=lat,lng`. Link rút gọn `maps.app.goo.gl` cần resolve phía server (LOW confidence về độ ổn định) |
| Thẻ lịch trình trong chat qua **link** (unfurl URL nội bộ `/itineraries/{id}`) | Trao đổi về chuyến đi ngay trong chat, đúng Core Value | MEDIUM | Gửi như tin text bình thường; FE nhận diện URL cùng domain rồi render thẻ bằng hook của `itinerary`. BE `MessageType.Itinerary = 3` đang "tạm hoãn", chưa có endpoint |
| Ảnh OG động (`opengraph-image.tsx` với `ImageResponse`: tên chuyến, số ngày, km) | Preview đẹp khi chưa có ảnh bìa | LOW–MEDIUM | [Next docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image): mặc định cache tĩnh, phải cấu hình động theo `params` |
| Ngày thực theo `startDate` ("Ngày 2 · Thứ Bảy 12/10") | Biến danh sách ngày trừu tượng thành lịch cụ thể | LOW | Giá trị dẫn xuất thuần trong domain |
| Khoảng cách từng chặng (ước tính) | FE cũ có (`LegDistanceBadge`); Wanderlog cũng hiển thị khoảng cách giữa các điểm ([Wanderlog](https://wanderlog.com/travel-maps)) | LOW | BE **không** trả số liệu theo chặng. Nếu làm thì phải ghi rõ "ước tính", tính bằng Haversine trong domain, không cộng dồn để thay số km ngày/tổng của BE |
| Thông báo hệ thống (Notification API) cho tin nhắn/cuộc gọi khi tab ẩn | Không bỏ lỡ cuộc gọi khi đang ở tab khác | LOW–MEDIUM | Chỉ xin quyền khi người dùng bấm. FE cũ xin quyền nhưng không có UI kích hoạt rõ ràng |
| Dừng chuông ở các tab khác khi đã nghe ở một tab (`BroadcastChannel`) | Hub gửi `IncomingCall` tới **mọi** kết nối của user (`Clients.User`), nên tab nào cũng đổ chuông | LOW | Thuần FE, cùng origin |
| Kiểm tra mic trước khi gọi + hiển thị loại kết nối (trực tiếp/relay qua TURN) | Giúp chẩn đoán khi bạn bè báo "không nghe được" | LOW–MEDIUM | Đọc từ `getStats()`; chỉ hiện ở chế độ debug |
| Kênh góp ý trong app (link form/nhóm chat) + hiển thị phiên bản build | Mục tiêu milestone là lấy phản hồi | LOW | Nút ở menu user. Version lấy từ biến môi trường build của Vercel |
| Sau khi xuất bản: chúc mừng + mở sẵn hộp chia sẻ | FE cũ có (`PublishCelebrationToast`) | LOW | Rút ngắn đường từ "xuất bản" tới "gửi cho bạn bè" |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| Mock Discovery/Fork/Like/Comment/Check-in, hoặc trang "sắp ra mắt" trong nav | FE cũ có đủ màn, đề xuất 0a dựng placeholder cho mọi route cũ | Quyết định đã chốt là không dùng mock; người thử bấm vào màn trống thì mất niềm tin | Placeholder chỉ để trong code skeleton, không đưa vào nav khi deploy. Hoãn tới khi BE có endpoint |
| Số liệu hồ sơ giả (followers, lượt thích, fork, số tỉnh đã đi) | FE cũ hiển thị từ `mockProfile` | BE không có dữ liệu | Chỉ hiện số lịch trình (`TotalCount`) và số đã xuất bản |
| Chấm online/presence, "đang nhập..." | Chuẩn của app chat | Hub không có presence/typing. FE cũ luôn hiện chấm xám "Ngoại tuyến", gây hiểu nhầm | Chỉ hiện trạng thái kết nối của chính mình |
| Nút "Loa ngoài" trong cuộc gọi | FE cũ có | `toggleSpeaker` của FE cũ chỉ đổi state. Web không có API chuyển loa trong/loa ngoài; `setSinkId` chỉ khoảng 47% hỗ trợ ([caniuse](https://caniuse.com/mdn-api_htmlmediaelement_setsinkid)) và chọn thiết bị ra, không phải speakerphone | Bỏ. Nếu cần thì làm "chọn thiết bị âm thanh" trên desktop khi `setSinkId` tồn tại |
| Upload ảnh bìa/avatar dạng "giả" | FE cũ preview bằng `URL.createObjectURL` | BE chỉ lưu URL; blob URL chết khi reload | Ô nhập URL + preview + fallback |
| Giờ đến/đi, chi phí, category, ảnh cho từng waypoint | Có trong type của FE cũ | `WaypointDto` không có các trường này, dữ liệu mất sau reload | Người dùng ghi vào `notes`. Chờ BE mở rộng contract |
| Gửi lịch trình dạng JSON trong tin text | FE cũ (`ShareItineraryModal` → `sendText(JSON.stringify(...))`) | Người nhận thấy JSON thô vì tin có type Text; sẽ vỡ khi BE làm loại Itinerary thật | Gửi link + unfurl (Differentiators) |
| Kéo thả waypoint giữa các ngày, xóa ngày, đổi thứ tự ngày | Kỳ vọng tự nhiên của editor | Không có endpoint (entity có `MoveToDay` nhưng không lộ ra). Làm giả bằng xóa + thêm thì không nguyên tử, đổi ID | Chỉ sắp xếp trong ngày. Nếu bắt buộc thì làm "Chuyển sang ngày…" (thêm mới rồi xóa cũ, báo rõ) ở v1.x |
| Hủy xuất bản | Người dùng đổi ý | Không có endpoint | Cảnh báo trước khi xuất bản; muốn ẩn thì xóa lịch trình |
| Soạn lịch trình khi chưa đăng nhập (nháp trong localStorage như FE cũ) | Giảm ma sát | BE yêu cầu auth để tạo; phải làm đồng bộ local → server và giải quyết xung đột | Auth gate trước khi tạo, đăng ký ngắn gọn |
| Soạn chung realtime / giải quyết xung đột nhiều tab | Wanderlog có collaborate | BE không có version/ETag, ghi sau thắng | Chỉ chủ sửa; refetch khi focus lại cửa sổ |
| Bộ chuyển tài khoản test lưu mật khẩu (`testUsersRegistry`, tab "local") | Tiện test chat 2 người | Lưu mật khẩu trong localStorage; vô nghĩa với cookie httpOnly | Test bằng 2 profile trình duyệt/thiết bị |
| Hiển thị email người khác trong danh bạ | `UserDto` có `Email` | Lộ PII; endpoint lại là public | ACL bỏ `email` khỏi type danh bạ |
| Web Push / nhận cuộc gọi khi tab đã đóng | Như app native | BE không có push; trình duyệt mobile đóng WebSocket ở nền | Ghi rõ: muốn nhận cuộc gọi thì phải mở Tripory. Cuộc gọi lỡ có call-log `Missed` |
| Chat nhóm, sửa/xóa/thu hồi tin, reaction, gửi ảnh | Chuẩn của Zalo/Messenger | BE không hỗ trợ | Hoãn |
| Autocomplete trên Nominatim public | Gõ tới đâu gợi ý tới đó | **Bị cấm** theo [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) | Tìm khi bấm Enter/nút; hoặc dùng Photon (cho phép search-as-you-type ở mức hợp lý) |
| Quên mật khẩu, xác thực email | Chuẩn của auth | BE không có | Với nhóm bạn bè: reset thủ công phía BE |
| Dark mode | FE cũ có class `dark:` | FE cũ không có nút bật nên thực tế chưa từng hoạt động; nhân đôi việc QA | Hoãn; token màu trong `design-tokens` để sẵn chỗ |
| Offline/PWA, xuất PDF/in | Spec "view public itinerary" có nhắc | Ngoài phạm vi Phase 0–4 | Hoãn v2 |
| Tự tính lại quãng đường ngày/tổng ở FE và coi đó là số thật | Hiển thị ngay khi kéo thả | Lệch với BE (BE không cộng quãng qua đêm) | Hiện số tạm khi đang kéo, thay bằng số BE sau khi refetch |

## UX table stakes FE cũ có — đối chiếu với đề xuất

Đề xuất (`tripory-fe-quick-proposal.md` mục 5) chỉ nói chung chung "UI timeline + dnd-kit", "thẻ itinerary trong tin nhắn", "gọi thoại giữa 2 tab". Các mục dưới đây chưa được nhắc và dễ bị bỏ sót khi viết REQUIREMENTS.

| UX của FE cũ | FE cũ làm thế nào | Đề xuất có nhắc? | Khuyến nghị cho bản mới |
|---|---|---|---|
| Undo khi xóa waypoint | Toast 5 giây, khôi phục trong state local | Không | P1, Phase 1, hoãn commit `DELETE` |
| Chia sẻ link / QR / Web Share / nút mạng xã hội | `ShareModal` + `lib/qr.ts` tự viết + `navigator.share` | Không | P1 (copy link, Web Share, QR) ở Phase 2. Nút Facebook/Zalo/X là P3 (URL share của Zalo chưa kiểm chứng, LOW) |
| Badge unread (từng hội thoại và tổng ở header) | `ConversationList`, `PublicHeader` | Không | P1, Phase 4 |
| Trạng thái cuộc gọi + ringtone/ringback + âm kết thúc + nhấp nháy tiêu đề tab | `ChatRealtimeContext`, `audioManager` | Một phần ("gọi thoại giữa 2 tab") | P1, Phase 4, bổ sung timeout, bận, ICE lỗi, tên người gọi |
| Loading skeleton và empty state có CTA | Danh sách hội thoại, thread, danh sách trip | Không | P1 ở mọi phase, bổ sung **error state** (FE cũ thiếu) |
| Bottom sheet nhiều mức trong editor/public map; nút "khôi phục" khi ẩn | `TimelineSheet`, `PublicMapView`, `FloatingRestorePill` | Không | P1, Phase 1–2 |
| Kéo thả bằng cảm ứng (delay 100ms) và bàn phím | `SortableWaypointList` | Có nhắc dnd-kit, không nói tới sensor | P1, giữ đủ 3 sensor |
| Chat mobile tách list/thread, nút back, thanh nhập ở vùng ngón cái | `MessagesPage`, `ChatRoom` | Không | P1, Phase 4 |
| Thanh hành động dính đáy trên mobile ở trang public | `StickyBottomActionBar` | Không | P2: chỉ còn Chia sẻ (+ Sửa nếu là chủ) vì Like/Fork/Comment chưa có |
| Đồng bộ chọn bản đồ ↔ timeline, tự cuộn và tự canh giữa pin | `handleSelectWaypoint`, `calculateAutoCenterPan` | Không | P1, Phase 2 (editor dùng lại) |
| Chuyển Bài viết/Bản đồ trên trang public | `ModeTogglePill` | Không | P1, Phase 2 |
| Thử lại upload voice mà không mất bản ghi | `VoiceRecorder` | Không | P1, Phase 4 |
| Badge trạng thái kết nối realtime | `ConversationList` | Không | P1, Phase 4, thêm resync |
| Auth gate chạy tiếp hành động sau khi đăng nhập | `openAuthModal({onAuthenticated})` | Không | P1, Phase 0c, dùng `?next=` |
| Sửa inline phụ đề ngày + tóm tắt quãng đường theo ngày | `DaySwitcher` | Có nhắc "đặt subtitle" | P1, Phase 1 |
| Chúc mừng sau khi xuất bản | `PublishCelebrationToast` | Không | P2 |

## Khoảng trống BE ảnh hưởng tính năng

Không thuộc repo này. Liệt kê để REQUIREMENTS ghi phụ thuộc ngoài hoặc chọn workaround.

| Khoảng trống (đã kiểm trong code BE) | Ảnh hưởng FE | Workaround FE trong milestone | Mức chặn |
|---|---|---|---|
| `ItineraryDetailDto` chỉ có `UserId`; không có `GET /users/{id}` | Trang public không hiện được tên/avatar tác giả cho khách | Ẩn byline, hoặc chỉ hiện "Của bạn" khi viewer là chủ | Không chặn, nhưng giảm chất lượng chia sẻ. Đề nghị BE thêm `author` vào DTO |
| Không có endpoint unpublish (`Itinerary.Unpublish()` có sẵn) | Xuất bản là một chiều | Cảnh báo trước khi xuất bản | Không chặn |
| Không có endpoint chuyển ngày (`Waypoint.MoveToDay` có sẵn) | Không kéo thả được giữa các ngày | Chỉ sắp xếp trong ngày | Không chặn |
| Allowlist MIME voice không có `audio/mp4` và so khớp `ContentType` chính xác | iPhone Safari < 18.4 không gửi được voice; blob mang tham số codecs có thể bị từ chối | Đóng gói lại blob về type cơ sở; báo lỗi rõ trên trình duyệt không hỗ trợ | **Có thể chặn voice trên iOS cũ**, cần kiểm thử thật |
| `GET /users` là AllowAnonymous và trả `Email` | Rủi ro lộ PII | Chỉ gọi qua BFF khi có session; bỏ email ở ACL | Không chặn FE; nên báo BE |
| Không có logout/revoke refresh token | Refresh token còn hiệu lực 7 ngày sau khi đăng xuất | Xóa cookie phía BFF | Không chặn |
| `IncomingCall` không có tên người gọi/`conversationId`/call id; không có sự kiện "đã nghe ở thiết bị khác" | Phải tự tra tên; nhiều tab cùng đổ chuông | Tra trong cache hội thoại; `BroadcastChannel` | Không chặn |
| File voice lưu bằng `UseStaticFiles` trên đĩa của BE | Mất file nếu host BE dùng đĩa tạm | — | Phụ thuộc lựa chọn deploy BE |

## Quyết định cần chốt ở Phase 1: cách nhập vị trí waypoint

Bản đồ SVG không chọn được tọa độ (đã đọc `lib/projection.ts`: chỉ có `projectCoordinate`, không có hàm chiếu ngược; không có lớp nền). Khuyến nghị theo thứ tự:

1. **Ô "Dán tọa độ / link Google Maps"**: LOW complexity, không phụ thuộc dịch vụ ngoài. Luôn có, là phương án dự phòng. (HIGH)
2. **Tìm địa điểm theo tên** qua route handler `GET /api/places/search` gọi geocoder OSM: MEDIUM complexity.
   - **Nominatim public** ([Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)). Chính sách cho phép tìm kiếm do người dùng kích hoạt khi số người dùng ở mức vừa phải, với điều kiện:
     - Tổng lưu lượng của cả ứng dụng ≤ 1 request/giây.
     - User-Agent/Referer định danh ứng dụng.
     - Ghi công OSM, dữ liệu theo giấy phép ODbL.
     - Nên đặt proxy và cache; phải đổi được nhà cung cấp khi được yêu cầu.
     - **Cấm autocomplete**.
     - Chính sách còn yêu cầu người phát triển phải chủ động, có hiểu biết khi chọn dịch vụ này. Đây là điểm cần chủ dự án quyết định, không chọn mặc định. (HIGH, đọc trực tiếp chính sách)
   - **Photon (komoot) public** hỗ trợ search-as-you-type. Theo [README](https://github.com/komoot/photon), dùng được ở mức hợp lý, dùng quá nhiều sẽ bị throttle hoặc chặn. (MEDIUM)
   - Nhóm vài người bạn nằm gọn trong cả hai giới hạn nếu có debounce, cache và tìm khi bấm.
3. **Tùy chọn cần user duyệt:** nền bản đồ không cần key (MapLibre + [OpenFreeMap](https://openfreemap.org/), miễn phí, không đăng ký) để chọn vị trí bằng cách bấm lên bản đồ. Lựa chọn này **lệch quyết định "giữ bản đồ SVG"**, nên chỉ ghi lại để chủ dự án cân nhắc, không đưa vào phạm vi mặc định. (MEDIUM)

## Feature Dependencies

```
[0a UI skeleton: layout, ui-web, toast, quy ước loading/error/not-found]
    └──> mọi màn sau

[0b api-client: bóc envelope, ApiError, refresh một lần]
    └──> [0c Session cookie httpOnly + BFF]
             ├──> [Auth gate ?next=] ──> [Editor], [Profile], [Chat]
             ├──> [GET /api/auth/token] ──> [SignalR] ──> [Chat realtime] ──> [Gọi thoại]
             └──> [Menu user header] <──enhances── [Badge unread tổng (P4)]

[Itinerary domain: canEdit, canPublish, số ngày]
    ├──> [Danh sách /mine] ──> [Tab trip ở Profile (P3)]
    └──> [Editor]
            ├──requires──> [Cách nhập vị trí (dán tọa độ; tìm địa điểm OSM)]
            ├──> [Thêm/Sửa/Xóa + Undo] ──> [Reorder trong ngày]
            ├──> [Chỉ báo trạng thái lưu]
            └──> [Xuất bản] ──> [Trang public SSR] ──> [Chia sẻ: link/QR/Web Share]
                                        │                    └──> [OG metadata / ảnh OG]
                                        └──> [Thẻ lịch trình trong chat qua link (P4)]

[Component bản đồ SVG (port projection/MapCanvas)]
    ├──> [Trang public chế độ Bản đồ (P2)]
    └──enhances──> [Editor (dùng lại sau P2, hoặc port sớm ở P1)]

[Danh bạ /users (P3)] ──> [POST /conversations/{partnerId}] ──> [Thread chat (P4)]

[Chat realtime]
    ├──> [Resync khi reconnect], [Dedupe], [Đã xem khi tab hiển thị]
    ├──> [Voice: ghi → chuẩn hóa MIME → upload → gửi]
    └──> [Gọi thoại]
            ├──requires──> [TURN ice-servers route (server-side secret)]
            ├──requires──> [Provider realtime ở layout gốc (sống qua điều hướng)]
            ├──requires──> [Cache hội thoại để tra tên người gọi]
            └──> [Call log + Gọi lại], [Timeout/Bận], [BroadcastChannel dừng chuông]

[Undo hoãn commit] ──conflicts──> [Reorder ngay khi waypoint đang chờ xóa]
[Kéo thả giữa các ngày] ──conflicts──> [Contract BE hiện tại]
```

### Dependency Notes

- **Cách nhập vị trí là điều kiện của Editor:** không có nó thì không thêm được waypoint, nên không xuất bản được và không có gì để chia sẻ. Phải chốt ở bước plan Phase 1, không để tới Phase 2.
- **Component bản đồ SVG dùng chung:** đề xuất để bản đồ ở Phase 2. Editor Phase 1 vẫn dùng được nếu chỉ có timeline, nhưng FE cũ đặt bản đồ ở trung tâm editor. Port component một lần rồi dùng cho cả hai màn. Nếu muốn editor có bản đồ ngay thì làm ở Phase 1.
- **Phase 3 (danh bạ) là cửa vào Phase 4:** cách duy nhất để bắt đầu hội thoại mới là `POST /conversations/{partnerId}` từ danh bạ hoặc hồ sơ.
- **Gọi thoại phụ thuộc vị trí provider:** route groups `(public)` và `(dashboard)` có layout riêng. Provider realtime đặt trong `(dashboard)` sẽ unmount khi người dùng mở trang public của một lịch trình, và cuộc gọi bị cắt.
- **Undo hoãn commit và reorder:** nếu người dùng kéo thả trong 5 giây chờ xóa, danh sách ID gửi BE phải còn chứa waypoint đang chờ xóa (BE yêu cầu khớp đủ tập ID). Cách đơn giản: commit `DELETE` ngay trước khi gửi reorder.
- **Unfurl thẻ lịch trình phụ thuộc trang public:** chỉ render được cho lịch trình đã xuất bản hoặc nháp của chính người xem. Thẻ cho nháp của người khác phải hiển thị "Không xem được".

## MVP Definition

### Launch With (v1 = hết Phase 4 + deploy Vercel)

- [ ] Khung responsive, các quy ước loading/error/404 và toast. Mọi màn khác đứng trên nền này.
- [ ] Đăng ký/đăng nhập/đăng xuất, giữ phiên, auth gate có `?next=`, đổi mật khẩu. Cửa vào mọi thao tác ghi.
- [ ] "Lịch trình của tôi" + tạo nhanh + xóa. Điểm vào sau khi đăng nhập.
- [ ] Editor: metadata, ngày + phụ đề, thêm (dán tọa độ + tìm địa điểm), sửa, xóa có Undo, reorder trong ngày, quãng đường từ BE, chỉ báo lưu, xuất bản kèm cảnh báo không hủy được. Đây là Core Value.
- [ ] Trang public SSR với Bài viết/Bản đồ SVG, 403/404, banner nháp cho chủ, chia sẻ (copy/Web Share/QR), OG metadata. Đây là Core Value (chia sẻ).
- [ ] Hồ sơ xem/sửa, tab trip, danh bạ có tìm kiếm + "Nhắn tin". Cửa vào chat.
- [ ] Chat: danh sách có badge unread, badge tổng, thread phân trang, gửi optimistic có thử lại, đã xem, dedupe, resync. Giúp "trao đổi về chuyến đi".
- [ ] Voice: ghi 1–120 giây, upload có thử lại, player. Có trong phạm vi đã chốt.
- [ ] Gọi thoại: state machine đầy đủ (timeout, bận, ICE lỗi, tên người gọi), TURN ngắn hạn, call log, sống qua điều hướng, nhấp nháy tiêu đề. Phải "chạy được thật giữa người quen".
- [ ] Kênh góp ý + phiên bản build. Mục tiêu của đợt thử.

### Add After Validation (v1.x)

- [ ] Thẻ lịch trình trong chat qua link. Thêm khi người thử thật sự gửi link lịch trình cho nhau.
- [ ] Ảnh OG động. Thêm khi nhiều lịch trình không có ảnh bìa.
- [ ] Notification API, dừng chuông đa tab bằng BroadcastChannel. Thêm khi có phản hồi bỏ lỡ cuộc gọi/tin.
- [ ] Khoảng cách theo chặng, ngày thực theo `startDate`. Thêm khi người dùng hỏi "đi bao xa giữa hai điểm".
- [ ] "Chuyển sang ngày…" (thêm + xóa). Chỉ làm nếu người dùng phàn nàn và BE chưa mở `MoveToDay`.
- [ ] Byline tác giả trên trang public. Thêm khi BE bổ sung thông tin tác giả.

### Future Consideration (v2+)

- [ ] Fork, Like/Comment, Discovery, Check-in. Chờ contract BE.
- [ ] Mapbox (bản đồ + geocoding). Chờ token; port `PlaceSearch` cho phép thay adapter.
- [ ] Unpublish, xóa/đổi thứ tự ngày, upload ảnh bìa/avatar. Chờ endpoint BE.
- [ ] Web Push, PWA/offline, xuất PDF, dark mode, đa ngôn ngữ.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Session httpOnly + auth gate | HIGH | MEDIUM | P1 |
| Editor CRUD + reorder trong ngày | HIGH | MEDIUM | P1 |
| Nhập vị trí (dán tọa độ) | HIGH | LOW | P1 |
| Tìm địa điểm OSM qua route handler | HIGH | MEDIUM | P1 (cần chủ dự án duyệt chính sách) |
| Undo xóa waypoint | MEDIUM | MEDIUM | P1 |
| Chỉ báo trạng thái lưu | MEDIUM | LOW | P1 |
| Cảnh báo xuất bản không hủy được | MEDIUM | LOW | P1 |
| Trang public SSR + 403/404 | HIGH | MEDIUM | P1 |
| Bản đồ SVG (port) | MEDIUM | MEDIUM | P1 |
| Chia sẻ link/Web Share/QR + OG metadata | HIGH | LOW | P1 |
| Hồ sơ + danh bạ | MEDIUM | LOW | P1 |
| Danh sách hội thoại + badge unread (từng hội thoại và tổng) | HIGH | MEDIUM | P1 |
| Gửi tin optimistic có thử lại + đã xem + resync | HIGH | MEDIUM | P1 |
| Voice message (ghi/upload/phát) | MEDIUM | MEDIUM | P1 |
| Gọi thoại + TURN + timeout/bận/ICE | HIGH | HIGH | P1 |
| Kênh góp ý trong app | HIGH (cho đợt thử) | LOW | P1 |
| Thanh hành động dính đáy (mobile public) | LOW | LOW | P2 |
| Chúc mừng sau xuất bản | LOW | LOW | P2 |
| Thẻ lịch trình qua link trong chat | MEDIUM | MEDIUM | P2 |
| Notification API + BroadcastChannel | MEDIUM | LOW | P2 |
| Ảnh OG động | MEDIUM | LOW | P2 |
| Khoảng cách chặng / ngày thực | LOW | LOW | P2 |
| Nút chia sẻ Facebook/Zalo/X | LOW | LOW | P3 |
| Kiểm tra mic + loại kết nối (debug) | LOW | LOW | P3 |

**Priority key:** P1 bắt buộc cho đợt dùng thử, P2 nên có, P3 để sau.

## Competitor Feature Analysis

| Feature | Wanderlog | Zalo/Messenger (kỳ vọng chat) | Tripory milestone 1 |
|---|---|---|---|
| Lịch trình theo ngày, bản đồ tô màu theo ngày | Có, bản đồ theo ngày hoặc theo loại ([Wanderlog](https://wanderlog.com/plan-a-trip)) | — | Có: timeline theo ngày + SVG màu theo ngày, không có nền bản đồ |
| Khoảng cách/thời gian giữa các điểm, tối ưu thứ tự | Có ([Wanderlog travel maps](https://wanderlog.com/travel-maps)) | — | Km ngày/tổng từ BE; khoảng cách chặng ở P2; không tối ưu tuyến |
| Tìm địa điểm có gợi ý | Có (Google Places) | — | Tìm OSM khi bấm (Nominatim) hoặc gợi ý (Photon), kèm dán tọa độ/link |
| Chia sẻ xem-chỉ-đọc + cộng tác | Có cả hai ([App Store](https://apps.apple.com/gb/app/wanderlog-travel-planner/id1476732439)) | — | Chỉ xem công khai; không cộng tác |
| Offline, ngân sách, đặt chỗ | Có | — | Không (anti-feature trong milestone) |
| Unread, đã xem, voice note, gọi thoại, cuộc gọi nhỡ | — | Chuẩn (LOW: kiến thức chung, chưa kiểm chứng từng app) | Có đủ, trừ presence/typing/push |

## Gaps / chưa kiểm chứng

- `apps/web/node_modules/next/dist/docs/` hiện **không có file nào** (chỉ có thư mục rỗng, đã đếm 0 file). AGENTS.md yêu cầu đọc docs đúng phiên bản trước khi viết code Next. Ở đây phải dùng nextjs.org; người thực thi nên cài lại `next` hoặc kiểm tra pnpm store.
- Chưa chạy thử upload voice với blob `audio/webm;codecs=opus` lên BE, nên kết luận "BE từ chối" là suy luận từ việc BE so khớp `HashSet` chính xác (MEDIUM). Cần thử thật ở Phase 4.
- URL share inline của Zalo (`sp.zalo.me/share_inline`) chưa kiểm chứng điều kiện sử dụng (LOW).
- Chưa đo hành vi Safari iOS khi tab chạy nền với SignalR/WebRTC. Kỳ vọng là kết nối bị treo, nhưng chưa kiểm thử (LOW).

## Sources

- Code BE (đọc trực tiếp, chỉ đọc): `tripory_be/API_ENDPOINTS.md`; `Tripory.API/Controllers/V1/{ChatController,ItinerariesController,UsersController}.cs`; `Tripory.Infrastructure/Hubs/ChatHub.cs`; `Tripory.Infrastructure/Implementations/Realtime/ChatNotificationService.cs`; `Tripory.Domain/Entities/{Itinerary,ItineraryDay,Waypoint}.cs`; `Tripory.Domain/Enums/{MessageType,CallStatus,CallDirection}.cs`; DTO trong `UseCases/V1/*/Responses`; validator trong `UseCases/V1/*/Validators`; `appsettings.json` (chỉ đọc tên khóa thời hạn token).
- Code FE cũ (đọc trực tiếp, chỉ đọc): `tripory/src/App.tsx`, `pages/*`, `components/{itinerary,public-itinerary,chat,profile,auth}/*`, `contexts/ChatRealtimeContext.tsx`, `services/realtime/{signalRService,webrtcService}.ts`, `services/api/chatService.ts`, `hooks/queries/useChat.ts`, `lib/projection.ts`, `data/testUsersRegistry.ts`, `types/*`; spec `tripory/docs/traveler/USER_CHAT_01/PT-02,PT-03`.
- Tài liệu dự án: `.planning/PROJECT.md`, `ai-memories/tripory-fe--ddd-architecture.md`, `.agents/tasks/tripory-fe-quick-proposal.md`.
- [Nominatim Usage Policy — OSMF](https://operations.osmfoundation.org/policies/nominatim/) (HIGH)
- [komoot/photon README](https://github.com/komoot/photon) (MEDIUM)
- [OpenFreeMap](https://openfreemap.org/), [OpenFreeMap GitHub](https://github.com/hyperknot/openfreemap) (MEDIUM)
- [MediaRecorder support — LambdaTest](https://www.lambdatest.com/web-technologies/mediarecorder-firefox) (MEDIUM, cần xác nhận lại bằng WebKit release notes)
- [caniuse: HTMLMediaElement.setSinkId](https://caniuse.com/mdn-api_htmlmediaelement_setsinkid), [MDN setSinkId](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/setSinkId) (MEDIUM)
- [Telnyx — Call State Lifecycle](https://developers.telnyx.com/docs/development/webrtc/js-sdk/explanation/call-state-lifecycle) (MEDIUM, tham chiếu mô hình trạng thái)
- [Nailing the WebRTC Call Start — webrtc-developers.com](https://www.webrtc-developers.com/nailing-the-webrtc-call-start/) (MEDIUM)
- [Next.js — forbidden](https://nextjs.org/docs/app/api-reference/functions/forbidden), [Next.js — opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) (HIGH, docs chính thức, cập nhật 2026)
- [Wanderlog — travel maps](https://wanderlog.com/travel-maps), [Wanderlog — plan a trip](https://wanderlog.com/plan-a-trip), [Wanderlog — App Store](https://apps.apple.com/gb/app/wanderlog-travel-planner/id1476732439) (MEDIUM)

*Nội dung từ các nguồn bên ngoài đã được diễn đạt lại để tuân thủ giới hạn trích dẫn.*

---
*Feature research for: Tripory frontend (travel itinerary planner + 1-1 chat/voice/calls)*
*Researched: 2026-10-09*
