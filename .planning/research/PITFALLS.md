# Pitfalls Research

**Domain:** Web app lập và chia sẻ lịch trình du lịch: Next.js 16 BFF trên Vercel, .NET API + SignalR ở repo riêng, gọi thoại WebRTC qua TURN
**Researched:** 2026-10-09
**Confidence:** HIGH cho các phát hiện đọc trực tiếp từ code `tripory_be`, `tripory` (FE cũ) và `tripory_fe`. MEDIUM cho hành vi trình duyệt và mạng (Safari, NAT di động, TURN), cần kiểm trên thiết bị thật.

Ký hiệu phase: **0a** khung UI · **0b** HTTP + kernel · **0c** identity/session (BFF) · **1** Itinerary CRUD + editor · **2** bản đồ SVG + public view · **3** profile/users · **4** chat realtime + gọi thoại · **deploy** (Vercel và phụ thuộc BE ngoài repo).

## Năm điều phải nhớ

1. BE xoay vòng refresh token và **thu hồi toàn bộ phiên của user** khi thấy token cũ bị dùng lại. Hai lần refresh song song là user bị đăng xuất ở mọi nơi, kể cả FE cũ.
2. BE cần **access token đã hết hạn** trong body refresh. Cookie access token không được hết hạn cùng lúc với JWT.
3. `apps/web/next.config.ts` đã bật `cacheComponents: true`. Gọi `cookies()` ngoài `<Suspense>` sẽ chặn prerender, còn GET route handler không đọc request có thể bị prerender ngay lúc build.
4. Vercel giới hạn body 4,5 MB, trong khi BE nhận voice tới 10 MB và so khớp MIME chính xác. `audio/webm;codecs=opus` và `audio/mp4` (Safari) có nguy cơ bị từ chối.
5. FE cũ làm rơi ICE candidate đến sớm, chỉ dùng STUN và không có ICE restart. Hub BE gửi `IncomingCall` tới mọi tab và thiết bị của người nhận, kể cả tab FE cũ.

## Critical Pitfalls

### Pitfall 1: Refresh song song kích hoạt reuse detection, BE thu hồi mọi phiên

**What goes wrong:**
Hai request cùng thấy access token hết hạn và cùng gọi `POST /api/v1/auth/refresh-token` với một refresh token. Hai request đó có thể đến từ 2 tab, từ RSC và fetch client, hoặc từ 2 route handler BFF trên 2 instance Vercel. Request đầu xoay vòng thành công. Request sau gặp token đã `Revoked`, nên BE gọi `RevokeAllRefreshTokens` và trả `Token.Compromised`. User bị đăng xuất trên mọi thiết bị, kể cả phiên FE Vite cũ đang chạy song song.

**Why it happens:**
`RefreshTokenCommandHandler` không có grace window. Mỗi lần refresh, token cũ bị thu hồi (ghi `ReplacedByToken`), và mọi lần dùng lại token đã thu hồi đều bị coi là xâm phạm. Vercel Functions scale ra nhiều instance nên mutex trong bộ nhớ của BFF vô tác dụng. Docs Next cũng dặn Proxy không được dựa vào module hay biến global dùng chung.

**How to avoid:**
- Chỉ một đường được refresh: route handler `POST /api/auth/refresh`. `GET /api/auth/token` gọi lại đúng hàm đó. BFF proxy REST, RSC và `proxy.ts` **không bao giờ tự refresh**. Gặp token hết hạn thì trả 401 kèm code riêng (`session.expired`).
- Single-flight ở client: `api-client` gộp mọi 401 vào một promise refresh duy nhất. Đây là JS thuần nên hợp lệ với preset `httpPackage`. Điều phối giữa các tab bằng Web Locks (`navigator.locks.request('tripory-refresh', …)`), tiêm từ `apps/web/src/composition` vì package bị cấm dùng `navigator`.
- Trong lock, kiểm tra lại trước khi gọi. Đặt thêm một cookie **không httpOnly** chỉ chứa thời điểm hết hạn của access token (`tripory_at_exp`, không có secret). Nếu exp đã lùi, tức tab khác vừa refresh, thì bỏ qua refresh và retry luôn.
- Refresh chủ động trước hạn (khoảng exp − 120 s) để server hiếm khi gặp token hết hạn. BE đặt `ClockSkew = TimeSpan.Zero`, nên không được trông vào độ lệch đồng hồ.
- Ghi vào danh sách phụ thuộc BE: grace window vài giây cho token vừa bị thay thế. Việc này không chặn milestone vì FE tự tránh được race.

**Warning signs:**
Log BE có `Token.Compromised`. User báo "tự đăng xuất" khi mở nhiều tab hoặc khi máy vừa ngủ dậy. Test nhiều request song song với token hết hạn thấy hơn một lần gọi refresh.

**Phase to address:** 0b (single-flight trong `api-client`, test "N request song song thì đúng 1 lần refresh"), 0c (route handler, cookie exp, Web Locks), 4 (`accessTokenFactory` của SignalR dùng chung bộ điều phối).

**Confidence:** HIGH cho hành vi BE (đọc `RefreshTokenCommandHandler.cs`, `User.cs`). MEDIUM cho mức hỗ trợ Web Locks trên các bản iOS nhóm bạn đang dùng.

---

### Pitfall 2: Cookie access token hết hạn cùng JWT, không refresh được hoặc BE trả 500

**What goes wrong:**
`RefreshTokenCommand` cần cả `AccessToken` (đã hết hạn) lẫn `RefreshToken`. BE đọc userId từ access token qua `GetPrincipalFromExpiredToken` với `ValidateLifetime = false`. Nếu cookie access token có `Max-Age` 60 phút cho khớp `JwtOptions.ExpiryMinutes`, trình duyệt xóa cookie đúng lúc cần dùng nó để refresh. Gửi chuỗi rỗng hoặc hỏng thì `ValidateToken` ném exception không ai bắt. `GlobalExceptionHandler` sẽ trả 500 `Server.Error` chứ không phải 401.

**Why it happens:**
Người viết thường quen mô hình chỉ cần refresh token. Hợp đồng của BE thì khác, và mọi lỗi refresh đều trả **400**: `HandlerFailure` chỉ map sang 401 khi error code chứa `Unauthorized`.

**How to avoid:**
- Cookie access token sống lâu bằng cookie refresh: dùng `expiresAt` trong response, BE đặt cứng 7 ngày (`AddDays(7)`). Việc JWT đã hết hạn hay chưa thì kiểm bằng claim `exp` ở server.
- Thiếu một trong hai cookie thì BFF không gọi refresh, chỉ xóa phiên và trả 401.
- Phân loại lỗi refresh. Lỗi 400 (`Token.Expired`, `Token.InvalidRefreshToken`, `Token.Compromised`, `Token.UserUnavailable`): xóa cookie, đăng xuất. Lỗi 5xx hoặc timeout (BE cold start): **giữ cookie**, trả 503 để client thử lại. Nếu không phân loại, một lần BE ngủ dậy chậm sẽ đăng xuất mọi người.

**Warning signs:**
Log có refresh trả 500. User bị đăng xuất đúng sau 60 phút không thao tác.

**Phase to address:** 0c.

**Confidence:** HIGH (đọc `JwtTokenService.cs`, `ApiController.cs`, `GlobalExceptionHandler.cs`, key `JwtOptions.ExpiryMinutes` trong `appsettings.json`).

---

### Pitfall 3: Refresh trong lúc render Server Component làm hỏng refresh token

**What goes wrong:**
RSC đọc được cookie nhưng **không ghi được cookie** trong lúc render. Theo docs Next 16, `set` và `delete` chỉ chạy trong Server Function hoặc Route Handler. Nếu `composition/*.server.ts` gặp access token hết hạn và tự gọi BE refresh, BE đã xoay vòng token nhưng cặp token mới không vào được trình duyệt. Request kế tiếp gửi refresh token cũ, kích hoạt reuse detection và mọi phiên bị thu hồi (Pitfall 1).

**Why it happens:**
Thói quen "interceptor 401 thì refresh" được mang sang cả HttpClient phía server.

**How to avoid:**
- HttpClient phía server chỉ đọc cookie và gắn Bearer. Gặp token hết hạn thì coi như chưa đăng nhập cho lần render đó, hoặc ném `session.expired` cho client boundary bắt.
- Khi nhận tín hiệu này, client gọi `POST /api/auth/refresh` (single-flight) rồi `router.refresh()`.
- `proxy.ts` chỉ làm gate rẻ: không có cookie refresh thì redirect sang đăng nhập cho route dashboard. Không refresh trong proxy, vì proxy chạy cho cả prefetch và cho nhiều request song song.

**Warning signs:**
Trang dashboard SSR thỉnh thoảng hiện trạng thái chưa đăng nhập, sau đó user bị đăng xuất hẳn. Log BE có hai lần refresh liên tiếp với cùng một token.

**Phase to address:** 0c (thiết kế), 1 và 2 (mọi trang SSR có dữ liệu cá nhân).

**Confidence:** HIGH ([Next.js `cookies`](https://nextjs.org/docs/app/api-reference/functions/cookies), [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)).

---

### Pitfall 4: Token hết hạn trên endpoint `[AllowAnonymous]` trả 403 thay vì 401

**What goes wrong:**
`GET /itineraries/{id}` có `[AllowAnonymous]`. Khi gửi Bearer đã hết hạn, JwtBearer không xác thực được nhưng endpoint vẫn chạy như user ẩn danh. Kết quả là chủ của bản nháp nhận **403** với chính bản nháp của mình. Logic "401 thì refresh" không bao giờ chạy, và editor báo "không có quyền".

**Why it happens:**
Handler chỉ kiểm `ICurrentUserService.UserId` khi lịch trình chưa public, và không phân biệt "chưa đăng nhập" với "token hết hạn".

**How to avoid:**
BFF kiểm `exp` của access token **trước** khi chuyển tiếp. Hết hạn thì trả ngay 401 `session.expired`, không gọi BE. Nếu nhận 403 trong lúc phiên vừa hết hạn, refresh rồi thử lại đúng một lần trước khi hiện trang lỗi quyền.

**Warning signs:**
Test E2E "mở editor sau 61 phút" ra trang lỗi quyền.

**Phase to address:** 0c (BFF), 1 (editor), 2 (public view khi chủ xem bản nháp).

**Confidence:** HIGH (đọc `ItinerariesController.cs`, `GetItineraryByIdQueryHandler.cs`, `Program.cs`).

---

### Pitfall 5: Cache Components đã bật, ảnh hưởng tới cookie, GET route handler và dữ liệu cá nhân

**What goes wrong:**
`apps/web/next.config.ts` có `cacheComponents: true` và `partialPrefetching: true`. Theo docs 16.x:
- Gọi `cookies()` ngoài `<Suspense>` chặn route khỏi prerender, và dev overlay báo blocking route. Root layout đọc session để vẽ menu user là chỗ hay dính lỗi này.
- GET Route Handler theo cùng mô hình prerender với page. Handler không đọc request hoặc runtime API có thể bị prerender ngay lúc build. Endpoint trả token hoặc credential (`GET /api/auth/token`, `GET /api/rtc/ice-servers`) mà quên đọc cookie trước thì có nguy cơ bị "đóng băng" từ lúc build.
- Dùng `"use cache"` cho trang public lịch trình sẽ phục vụ bản cũ sau khi lịch trình bị sửa hoặc xóa, nếu không invalidate.

**Why it happens:**
Phần lớn ví dụ trên mạng viết cho mô hình cache trước Cache Components (Next 15, GET handler dynamic mặc định).

**How to avoid:**
- Đọc session trong component con bọc `<Suspense>` (header, menu user), không đọc ở root layout.
- Mọi route handler auth và RTC đọc `cookies()` để kiểm phiên ngay dòng đầu và trả `Cache-Control: no-store`. `ice-servers` bắt buộc phải có phiên đăng nhập, nếu không sẽ thành nguồn TURN miễn phí cho người lạ.
- Milestone này không dùng `"use cache"` cho dữ liệu lịch trình. Nếu sau này dùng cho trang public, gắn tag và invalidate trong route handler BFF của mọi mutation (update, publish, delete, waypoint).
- Đọc output của `next build` để biết route nào static, route nào dynamic.

**Warning signs:**
`next build` báo lỗi runtime data ngoài Suspense. `ice-servers` trả cùng `username` ở mọi lần gọi. Trang public không đổi sau khi publish.

**Phase to address:** 0a (layout, slot session), 0c (route handler auth), 2 (public view), 4 (`ice-servers`).

**Confidence:** HIGH ([Caching](https://nextjs.org/docs/app/getting-started/caching), [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), đọc `next.config.ts`).

---

### Pitfall 6: Giới hạn body của Vercel và Next so với voice 10 MB

**What goes wrong:**
BE nhận file tới 10 MB ở `POST /api/v1/chat/voice`, nhưng Vercel Functions giới hạn **4,5 MB cho cả request lẫn response body** và trả 413 `FUNCTION_PAYLOAD_TOO_LARGE`. Phía Next có thêm hai bẫy. Nếu matcher của `proxy.ts` bao cả route upload, proxy chỉ buffer tối đa 10 MB và **cắt bỏ phần thừa mà không báo lỗi**. Server Action mặc định giới hạn body 1 MB.

**Why it happens:**
Giới hạn của BE được đặt khi FE gọi thẳng BE. BFF trên Vercel thêm một tầng giới hạn mới.

**How to avoid:**
- Upload voice qua route handler BFF dạng stream (`duplex: 'half'`), không dùng Server Action, và loại route upload khỏi matcher của `proxy.ts`.
- Chặn ngay ở UI: giới hạn thời lượng (khoảng 120 s) và kiểm `blob.size < 4 MB` trước khi gửi. Opus khoảng 32 kbps nên 4 MB tương đương khoảng 15 phút, dư nhiều. Không ghi WAV: PCM 48 kHz mono khoảng 96 KB/s, vượt 4,5 MB sau chừng 45 s.
- Không phát audio qua BFF (giới hạn response 4,5 MB). Dùng thẳng URL của BE.
- Nếu sau này cần file lớn hơn: upload thẳng tới BE bằng token ngắn hạn, cần thêm CORS ở BE. Việc này ngoài phạm vi milestone.

**Warning signs:**
Log Vercel có 413. File lưu ở BE bị ngắn hoặc hỏng (dấu hiệu proxy cắt body).

**Phase to address:** 4, deploy.

**Confidence:** HIGH cho Vercel và proxy ([Vercel limits](https://vercel.com/docs/functions/limitations), [`proxyClientMaxBodySize`](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize)). MEDIUM cho giới hạn 1 MB của Server Action (kiến thức sẵn có, chưa đối chiếu docs 16.4 vì docs cục bộ trống, xem Pitfall 15).

---

### Pitfall 7: MIME của MediaRecorder không khớp allowlist của BE, đặc biệt trên Safari

**What goes wrong:**
`ChatController.ValidateAudioFile` so `file.ContentType` **khớp chính xác** với tập `audio/webm, audio/wav, audio/wave, audio/x-wav, audio/ogg, audio/mp3, audio/mpeg`.
- Trên Chrome, `MediaRecorder.mimeType` là `audio/webm;codecs=opus`. FE cũ tạo Blob với đúng type này, nên phần multipart mang luôn tham số codec và có khả năng bị trả `File.InvalidFormat`.
- Safari trước 18.4 chỉ ghi được `audio/mp4` (AAC). Type này không có trong allowlist nên chắc chắn bị từ chối. Từ Safari 18.4 thì ghi được WebM/Opus.
- FE cũ đặt cứng tên file `voice_<ts>.webm`. BE lấy phần mở rộng từ tên file trước khi xét MIME, nên file MP4 bị lưu với đuôi `.webm`.

**Why it happens:**
Cấu hình mặc định chạy được trên Chrome lúc dev, trong khi BE validate theo chuỗi nguyên văn.

**How to avoid:**
- Thứ tự chọn mimeType: `audio/webm;codecs=opus`, rồi `audio/webm`, rồi `audio/ogg;codecs=opus`. Không có cái nào thì báo "trình duyệt chưa hỗ trợ ghi âm".
- Khi tạo file để gửi, **bỏ tham số codec**: `new File([blob], 'voice.webm', { type: 'audio/webm' })`, và đặt tên file khớp container thật.
- Không gửi `audio/mp4`. Muốn hỗ trợ iOS dưới 18.4 thì BE phải thêm `audio/mp4` vào allowlist, ghi vào phụ thuộc BE.
- Trước khi chốt Phase 4, upload thử một lần trên Chrome, Firefox, Safari macOS và iPhone thật.

**Warning signs:**
Upload nhận 400 `File.InvalidFormat`. Voice ghi từ Safari không phát được.

**Phase to address:** 4.

**Confidence:** HIGH cho allowlist và cách lấy đuôi file (đọc `ChatController.cs`, `LocalAudioStorageService.cs`, `VoiceRecorder.tsx` cũ). MEDIUM cho việc Chrome bị từ chối vì `;codecs=opus`: đây là suy luận từ việc `IFormFile.ContentType` giữ nguyên header, cần một lần upload thật để xác nhận. HIGH cho WebM trên Safari 18.4 ([WebKit 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)).

---

### Pitfall 8: Gọi thoại chạy trong LAN nhưng không nối được qua 4G hoặc NAT đối xứng

**What goes wrong:**
FE cũ chỉ có STUN của Google. Mạng di động (CGNAT) và nhiều Wi-Fi công ty dùng NAT đối xứng hoặc chặn UDP, nên STUN không đủ. `webrtcService.ts` cũ còn có ba lỗi logic:
1. Người gọi trickle ICE ngay sau `setLocalDescription`, nhưng người nhận chỉ tạo `RTCPeerConnection` khi bấm nghe. Candidate đến sớm bị bỏ (`if (this.peerConnection && candidate)`).
2. Không theo dõi `connectionstatechange`, không ICE restart khi đổi mạng (Wi-Fi sang 4G).
3. Không có id cuộc gọi, nên candidate hoặc `CallEnded` đến muộn của cuộc trước lọt sang cuộc sau.

**Why it happens:**
Test giữa 2 tab trên cùng máy luôn thành công vì có host candidate.

**How to avoid:**
- TURN là bắt buộc, credential ngắn hạn lấy từ `GET /api/rtc/ice-servers`. Cloudflare trả sẵn danh sách URL, gồm cả `turns:turn.cloudflare.com:443?transport=tcp`. Luôn có ít nhất một URL **TURN over TLS cổng 443** cho mạng chỉ mở 443.
- Lấy ICE servers lúc bắt đầu gọi hoặc nhận cuộc gọi, không lấy lúc tải trang. TTL dài hơn cuộc gọi dài nhất (khoảng 2–4 giờ), không đặt 24 giờ.
- Buffer candidate theo `callId` cho tới khi `setRemoteDescription` xong, sau đó mới add.
- Khi `connectionState === 'failed'`: lấy ICE servers mới, gọi `pc.setConfiguration()` rồi `pc.restartIce()` và gửi offer mới. Khi `disconnected`: chờ vài giây rồi mới restart.
- Kiểm TURN thật bằng cách chạy với `iceTransportPolicy: 'relay'`. Khi gọi giữa 4G và Wi-Fi, cặp candidate được chọn trong `getStats()` phải là `relay`.

**Warning signs:**
Gọi được giữa 2 tab cùng máy nhưng treo "đang kết nối" khi hai bên ở hai mạng. `iceConnectionState` đứng ở `checking` rồi chuyển `failed`.

**Phase to address:** 4 (logic), deploy (secret TURN chỉ nằm trong env server của Vercel).

**Confidence:** HIGH cho các lỗi trong code cũ (đọc trực tiếp) và API Cloudflare ([generate credentials](https://developers.cloudflare.com/realtime/turn/generate-credentials/), [restartIce](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/restartIce), [setConfiguration](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setConfiguration)). MEDIUM cho tỷ lệ NAT đối xứng trên mạng di động Việt Nam (chưa đo).

---

### Pitfall 9: Hợp đồng hub hạn chế ICE restart, đa tab và việc chạy song song FE cũ

**What goes wrong:**
- `ChatHub` gửi `IncomingCall`, `ReceiveIceCandidate`, `CallEnded` bằng `Clients.User(...)`, nên **mọi kết nối** của người nhận đều nhận được: nhiều tab FE mới, điện thoại, cả tab FE cũ. Nghe máy ở một nơi thì nơi khác vẫn đổ chuông, vì không có sự kiện "đã nghe ở thiết bị khác".
- Hub chỉ có `CallUser` (gửi offer) và `AcceptCall` (gửi answer), không có method renegotiate. Offer ICE restart gửi bằng `CallUser` sẽ hiện ra như một cuộc gọi đến mới.
- Không có `callId`, không xử lý glare (hai bên gọi nhau cùng lúc).

**Why it happens:**
Hub được viết cho kịch bản một tab, một FE.

**How to avoid (không cần sửa BE, vì `offer`, `answer`, `candidate` là `object` được chuyển nguyên vẹn):**
- **Thêm field, không bọc payload.** Gửi `{ type, sdp, callId, kind: 'offer' | 'ice-restart' }` và `{ candidate, sdpMid, sdpMLineIndex, usernameFragment, callId }`. Dictionary WebIDL bỏ qua thành viên lạ, nên FE cũ vẫn tạo được `RTCSessionDescription`/`RTCIceCandidate` từ payload này. Bọc kiểu `{ callId, offer: {...} }` sẽ làm vỡ FE cũ trong thời gian chạy song song.
- State machine cuộc gọi trong `packages/chat/src/domain` bỏ qua sự kiện có `callId` lạ. Nhận `kind: 'ice-restart'` từ đúng đối tác đang trong cuộc gọi thì coi là renegotiation, không phải cuộc gọi mới.
- Tab không nghe máy tự tắt chuông khi nhận `CallEnded`. Tab đang nghe gửi `EndCall` khi bị đóng. Với milestone này, chấp nhận giới hạn "tab khác vẫn đổ chuông tới khi người gọi dừng", và ghi đề xuất BE thêm sự kiện `CallAnsweredElsewhere`.
- Glare: bên có userId nhỏ hơn nhường, hoặc từ chối cuộc gọi đến khi mình đang gọi đi.

**Warning signs:**
Hai tab cùng đổ chuông. ICE restart làm bật modal cuộc gọi đến. FE cũ báo lỗi SDP khi gọi tới user dùng FE mới.

**Phase to address:** 4.

**Confidence:** HIGH (đọc `ChatHub.cs`, `ChatNotificationService.cs`, `signalRService.ts` cũ).

---

### Pitfall 10: SignalR, gồm CORS, credentials, URL preview, transport fallback và token

**What goes wrong:**
- BE hiện dùng `SetIsOriginAllowed(_ => true)` cùng `AllowCredentials()`. Cấu hình này chạy được với mọi URL preview, nhưng docs Microsoft khuyên chỉ cho phép origin tin cậy. Khi BE siết lại bằng `WithOrigins(prodUrl)`, SignalR trên mọi preview `*.vercel.app` (URL có hash ngẫu nhiên) sẽ hỏng ngay ở bước negotiate.
- CORS không bảo vệ WebSocket, còn negotiate và long polling thì có đi qua CORS.
- Client JS mặc định gửi credentials. Xác thực đã đi qua `access_token` trên query string nên không cần cookie. Cookie chỉ cần khi host dùng sticky session cookie cho nhiều instance.
- `accessTokenFactory` được gọi **trước mọi HTTP request** của SignalR. Với long polling hoặc SSE, token hết hạn giữa chừng làm các request sau thất bại.
- BE chạy nhiều instance mà không sticky session (và không phải WebSocket-only kèm `skipNegotiation`) thì kết nối lỗi ngẫu nhiên.

**Why it happens:**
Chạy local thì một origin, một instance, nên không lộ ra vấn đề.

**How to avoid:**
- Dùng `withUrl(NEXT_PUBLIC_HUB_URL, { accessTokenFactory, withCredentials: false })`. `accessTokenFactory` trả token đang cache, và khi token còn dưới 2 phút thì gọi bộ điều phối refresh (Pitfall 1). Giữ fallback transport mặc định cho mạng có proxy chặn WebSocket.
- Bật `withAutomaticReconnect`. Trong `onreconnected`, join lại các phòng `conv_*` và refetch tin nhắn, vì server không phát lại sự kiện bị lỡ.
- Phụ thuộc BE cần vào checklist deploy: CORS cho production origin, regex preview của đúng project, `http://localhost:3000` và origin FE cũ; method GET, POST, DELETE; host hỗ trợ WSS; một instance hoặc sticky session.
- Không proxy hub qua Vercel. Vercel đã hỗ trợ WebSocket (public beta từ 06/2026), nhưng kết nối bị đóng khi chạm max duration (300 s trên Hobby) và bị ghim vào một instance, không hợp với chat dài hạn. Giữ quyết định kết nối thẳng tới BE.

**Warning signs:**
Lỗi negotiate hoặc CORS trên preview nhưng không có trên production. Transport rơi xuống LongPolling rồi mất kết nối sau khoảng 60 phút.

**Phase to address:** 4, deploy.

**Confidence:** HIGH ([SignalR security](https://learn.microsoft.com/en-us/aspnet/core/signalr/security?view=aspnetcore-10.0), [authn/authz](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-10.0), [scale](https://learn.microsoft.com/en-us/aspnet/core/signalr/scale?view=aspnetcore-10.0), [Vercel WebSocket](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections), đọc `Program.cs`).

---

### Pitfall 11: Ngày giờ: `DateOnly`, ngày suy ra từ `DayNumber` và hydration lệch múi giờ

**What goes wrong:**
- `StartDate` là `DateOnly?`, JSON dạng `"YYYY-MM-DD"`. `ItineraryDayDto` **không có** ngày cụ thể, chỉ có `DayNumber`, nên FE phải tự tính: ngày thứ N = `StartDate + (N − 1)`. `new Date('2026-10-20')` là nửa đêm UTC, ở múi giờ âm sẽ hiện lùi một ngày. Ở Việt Nam (UTC+7) lỗi này bị che đi.
- `CreatedAt`, `UpdatedAt`, `ReadAt` là `DateTimeOffset` dạng `...+00:00`. Function Vercel chạy UTC, trình duyệt chạy `Asia/Ho_Chi_Minh`. Gọi `toLocaleString()` không truyền `timeZone` sẽ ra chuỗi khác nhau giữa SSR và client, gây hydration mismatch.
- `z.iso.datetime()` của Zod mặc định **không chấp nhận offset**, nên `+00:00` bị coi là lỗi contract.
- Gửi `StartDate` bằng `toISOString()` thì model binding `DateOnly` từ chối và trả 400 dạng `ValidationProblemDetails`, không phải envelope `ApiResponse`.

**How to avoid:**
- Tạo value object `CalendarDate` giữ chuỗi `YYYY-MM-DD`, cộng ngày bằng `Date.UTC`, format với `timeZone: 'UTC'`. Domain không được gọi `new Date()` không tham số (ESLint chặn), nên "hôm nay" phải tiêm qua `clock`.
- Thời điểm (instant) giữ dạng chuỗi ISO trong domain. UI format với `timeZone` cố định (`Asia/Ho_Chi_Minh`) hoặc chỉ format ở client.
- Zod: `z.iso.datetime({ offset: true })` cho `DateTimeOffset`, `z.iso.date()` cho `DateOnly`.

**Warning signs:**
Console có cảnh báo hydration ở trang chat hoặc profile. Ngày của Day 1 lệch so với ngày đã chọn. Test chạy với `TZ=America/Los_Angeles` thì đỏ.

**Phase to address:** 1 (StartDate, nhãn ngày), 2 (public view SSR), 4 (giờ tin nhắn).

**Confidence:** HIGH (đọc DTO BE, `GUIDE_STEP_05_API_LAYER.md`, [Zod API](https://zod.dev/api)). MEDIUM cho việc Vercel Functions chạy ở UTC.

---

### Pitfall 12: Ranh giới ESLint quyết định adapter phải nằm ở đâu, và có một lỗ không bị bắt

**What goes wrong:**
Allowlist default-deny trong `boundaries.mjs` làm nhiều cách đặt code "tưởng tự nhiên" bị lint đỏ:
- Không tầng nào của package được import `@microsoft/signalr`. Package bị cấm `window`, `document`, `navigator`, `localStorage`, `sessionStorage`. Vì vậy `getUserMedia`, `MediaRecorder`, Web Locks và SignalR client phải nằm trong `apps/web`.
- `src/app/**`, kể cả route handler BFF trong `app/api/**`, **không được import `/http`**. Route handler login cần adapter identity thì phải đi qua `@/composition/identity.server`.
- `domain` và `application` cấm `Date.now`, `new Date()` không tham số, `Math.random`, `fetch`. Id tạm và `createdAt` của optimistic message, timeout đổ chuông đều phải tiêm `clock`, `idGenerator`, scheduler qua deps.
- `react` cấm `next/*`, nên hook trong package không điều hướng được. Package cấm `import()` động.
- **Lỗ hổng:** `RTCPeerConnection`, `MediaRecorder`, `BroadcastChannel`, `crypto`, `setTimeout` không có trong `BROWSER_GLOBALS`, mà TS lại có lib DOM. Code WebRTC đặt nhầm trong `packages/chat` vẫn qua lint và typecheck, nhưng phá phép thử "chạy được trên React Native".

**How to avoid:**
- Khai báo port trong `packages/chat/src/application/ports.ts` (`ChatRealtime`, `CallTransport`, `AudioRecorder`). Cài đặt ở `apps/web/src/composition/chat.realtime.client.ts` rồi tiêm vào use case.
- Tách entrypoint `*.server.ts` (có `import 'server-only'`) và `*.client.ts`. Không tạo barrel `composition/index.ts` gộp cả hai, vì sẽ kéo `server-only` vào bundle client và build lỗi.
- HttpClient phía server nhận `getAccessToken` qua deps, vì `api-client` không được import `next/headers`.
- Đề xuất (là quyết định kiến trúc, không phải sửa cho qua lint): thêm `RTCPeerConnection`, `MediaRecorder`, `MediaStream` vào `BROWSER_GLOBALS` kèm self-test trong `packages/config/test/boundaries.test.ts`.

**Warning signs:**
Lint báo "Chỉ src/composition/** được import adapter /http" trong `app/api`. Có ý định thêm `@microsoft/signalr` vào allowlist: dừng lại và đọc mục 5 của tài liệu kiến trúc trước.

**Phase to address:** 0b (api-client, token provider), 0c (route handler đi qua composition), 1 (clock và id cho domain), 4 (port realtime).

**Confidence:** HIGH (đọc `boundaries.mjs`, `ai-memories/tripory-fe--ddd-architecture.md`).

---

### Pitfall 13: TanStack Query với RSC: rò dữ liệu giữa user, fetch hai lần, dữ liệu lệch nhau

**What goes wrong:**
- `QueryClient` singleton ở module scope phía server khiến cache dùng chung giữa các request, có thể lộ bản nháp của người khác.
- `staleTime` mặc định là 0, nên hydrate xong là refetch ngay, gấp đôi tải lên BE miễn phí.
- Dùng Server Action làm `queryFn`: Server Action chạy tuần tự nên query có thể kẹt ở trạng thái pending.
- Cùng một dữ liệu render ở cả Server Component và Client Component: sau khi client refetch, phần RSC không cập nhật theo.
- Có hai bản `@tanstack/react-query` trong cây phụ thuộc thì gặp lỗi "No QueryClient set".

**How to avoid:**
Theo mẫu `getQueryClient()` của TanStack: server tạo mới mỗi request, browser dùng singleton. Đặt `staleTime` mặc định 30–60 s. RSC chỉ prefetch, không render kết quả query. Editor, chat, profile do client sở hữu dữ liệu; trang public do server sở hữu, không dùng chung query key. `react` và `@tanstack/react-query` là peer dependency (tài liệu kiến trúc mục 9). Gọi `createItineraryHooks` một lần ở module `composition/*.client.ts`.

**Warning signs:**
Network tab thấy cùng một GET hai lần khi tải trang. Lỗi "No QueryClient set". Header và timeline hiện số liệu khác nhau.

**Phase to address:** 0a (provider), 1, 2, 3.

**Confidence:** HIGH ([Advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr), [SSR](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)).

---

### Pitfall 14: Cookie trên `*.vercel.app`: SameSite, Secure, Domain

**What goes wrong:**
- `vercel.app` nằm trong Public Suffix List, nên không đặt được cookie ở cấp `vercel.app`. Mỗi preview là một site riêng. Điều này tốt cho cô lập, chỉ cần đừng cố đặt `Domain`.
- `SameSite=Strict` làm mất cookie khi bạn bè mở link từ Messenger, Zalo hoặc email. SSR lần đầu hiện như chưa đăng nhập.
- `SameSite=None` không cần thiết: BFF cùng origin, còn BE dùng Bearer. Bật nó chỉ làm rộng bề mặt CSRF.
- Safari không lưu cookie `Secure` trên `http://localhost` (Chrome và Firefox thì có), nên đăng nhập local bằng Safari hoặc iPhone không giữ được phiên.

**How to avoid:**
Dùng `__Host-tripory_at` và `__Host-tripory_rt` với `HttpOnly; Secure; SameSite=Lax; Path=/`, không đặt `Domain`. Cookie phụ `tripory_at_exp` không httpOnly và chỉ chứa một con số. Mutation đi qua BFF kiểm header `Origin`. GET không được có side effect. Khi dev trên Safari, dùng `next dev --experimental-https` hoặc bỏ `Secure`/`__Host-` khi chạy development.

**Phase to address:** 0c, deploy.

**Confidence:** HIGH cho PSL ([Vercel guide](https://vercel.com/guides/can-i-set-a-cookie-from-my-vercel-project-subdomain-to-vercel-app)). MEDIUM cho Safari trên localhost (nguồn cộng đồng: [flaviocopes](https://flaviocopes.com/cookie-not-being-set-in-safari/)).

---

### Pitfall 15: Docs Next cục bộ trống, dễ viết code theo API Next cũ

**What goes wrong:**
`AGENTS.md` yêu cầu đọc `apps/web/node_modules/next/dist/docs/`. Kiểm ngày 2026-10-09 với Next 16.4.0, thư mục này **chỉ có cây thư mục rỗng, không có file nào**. Dev hoặc agent dễ quay về kiến thức Next 13–15: dùng `middleware.ts` trong khi bản 16 đã đổi thành `proxy.ts` (chạy Node.js, không cấu hình runtime được), gọi `cookies()` và `params` đồng bộ trong khi chúng đã thành async, hoặc tin rằng GET route handler mặc định static, điều sai khi bật Cache Components.

**How to avoid:**
Dùng docs chính thức trên nextjs.org (gửi header `Accept: text/markdown` để nhận bản Markdown) và ghi phiên bản docs đã đối chiếu trong PR. Có thể cài lại `next` để khôi phục docs, nhớ kiểm xem cấu hình pnpm có lọc file `*.md` không. Chạy `next build` sớm ngay từ 0a.

**Phase to address:** 0a.

**Confidence:** HIGH (quan sát trực tiếp, [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)).

## Moderate Pitfalls

### Dữ liệu Itinerary: thứ tự, ngày thưa, không chuyển được waypoint sang ngày khác
**What goes wrong:** `ToDetailDto` trả `Days` và `Waypoints` dạng danh sách phẳng, repository không có `OrderBy`. Ngày được tạo lười (`GetOrCreateDay`), nên có thể có Day 1 và Day 3 mà không có Day 2. `UpdateWaypoint` không nhận `DayNumber`. Không có version hay ETag: hai tab cùng sửa thì bản ghi sau đè bản trước, và reorder với danh sách cũ trả `InvalidReorderList` (400).
**Prevention:** Mapper ACL sắp xếp theo `DayNumber`, rồi theo `(DayNumber, OrderIndex)`. UI vẽ đủ dải ngày từ 1 đến max, kể cả ngày trống. Kéo waypoint sang ngày khác là use case `moveWaypointToDay`: thêm trước, xóa sau, copy cả notes, rồi refetch. Reorder lỗi thì refetch và báo cho user. Phase 1. HIGH (đọc code).

### `/itineraries/mine` trả `DaysCount` và `WaypointsCount` luôn bằng 0
**What goes wrong:** `GetMyItinerariesPagedAsync` không `Include` `Days`/`Waypoints`, và không bật lazy loading, nhưng `ToSummaryDto` lại đếm hai collection này. Danh sách "lịch trình của tôi" (Phase 1 và tab trip ở Phase 3) sẽ hiện "0 ngày, 0 điểm".
**Prevention:** Không hiển thị hai số này cho tới khi BE sửa; ghi vào phụ thuộc BE. Phase 1, 3. MEDIUM-HIGH (đọc code, chưa gọi API thật để xác nhận).

### Nhiều dạng lỗi từ BE
**What goes wrong:** Có ít nhất bốn dạng lỗi: envelope `ApiResponse` (`status, data, message, errorCode, timestamp`); `ValidationProblemDetails` khi model binding lỗi (attribute `[ApiController]`); 401 body rỗng từ JwtBearer; 404 body rỗng khi route constraint `{id:guid}` không khớp. FluentValidation chỉ trả lỗi đầu tiên (`ValidationPipelineBehavior`).
**Prevention:** `api-client` chuẩn hóa cả bốn dạng về `ApiError { status, code, message, fieldErrors? }`, mỗi dạng có test riêng. Phase 0b. HIGH cho envelope và validation (đọc code). MEDIUM cho body rỗng của 401/404 (hành vi mặc định của ASP.NET, chưa gọi thử).

### Enum trả về dạng số
**What goes wrong:** BE không đăng ký `JsonStringEnumConverter`, nên `MessageType` là 1/2/3/4 (3 là Itinerary, chưa dùng), `CallStatus` và `CallDirection` cũng là số.
**Prevention:** Zod dùng union các literal số, ACL map sang tên. Gặp giá trị lạ thì hiển thị "tin nhắn chưa hỗ trợ", không làm hỏng cả danh sách. Phase 4. HIGH.

### Đăng xuất và đổi mật khẩu
**What goes wrong:** BE không có endpoint logout hay revoke. Đăng xuất chỉ xóa cookie, refresh token vẫn hợp lệ 7 ngày ở BE. Đổi mật khẩu thu hồi mọi refresh token, nhưng access token hiện tại còn dùng được tới 60 phút.
**Prevention:** BFF xóa cookie ngay sau khi đổi mật khẩu thành công và đưa user về màn đăng nhập. Ghi đề xuất BE thêm `POST /auth/logout`. Phase 0c, 3. HIGH.

### Region mặc định và BE cold start
**What goes wrong:** Vercel Functions mặc định chạy ở `iad1` (Mỹ). Nếu BE đặt ở châu Á, mỗi request BFF phải vòng qua Mỹ. BE ở gói miễn phí có thể ngủ, nên request đầu tiên chậm hàng chục giây.
**Prevention:** Đặt region của function gần BE (Hobby cho chọn một region). Đặt timeout upstream rõ ràng trong BFF (khoảng 25 s), hiện trạng thái "máy chủ đang khởi động", retry GET một lần. Max duration 300 s của Hobby không phải nút thắt. Phase deploy. HIGH cho region ([Vercel limits](https://vercel.com/docs/functions/limitations)). MEDIUM cho thời gian cold start, vì còn phụ thuộc host BE.

### Deployment Protection chặn bạn bè mở link preview
**What goes wrong:** Standard Protection bảo vệ mọi URL trừ production domain. Link preview gửi cho bạn bè sẽ đòi đăng nhập Vercel. Password Protection không có trên gói Hobby.
**Prevention:** Chỉ gửi URL production cho nhóm dùng thử, preview để tự kiểm. Phase deploy. HIGH ([Deployment Protection](https://vercel.com/docs/deployment-protection)).

### Biến môi trường
**What goes wrong:** Biến `NEXT_PUBLIC_*` (URL hub) được nhúng lúc build, nên đổi URL BE là phải redeploy, và cần khai báo riêng cho Preview và Production. FE cũ suy ra URL hub bằng `replace('/api/v1', '')`, rất dễ vỡ.
**Prevention:** Tách `API_BASE_URL` (chỉ server) và `NEXT_PUBLIC_HUB_URL`. Secret TURN không bao giờ mang prefix `NEXT_PUBLIC_`. Phase 0c, deploy. HIGH.

### BFF thành open proxy
**What goes wrong:** Route catch-all `/api/bff/[...path]` chuyển tiếp mọi path. Hậu quả: lộ endpoint ngoài ý muốn, path traversal kiểu `..%2f`, và chuyển tiếp nhầm header `cookie`, `host`, `authorization` của client sang BE.
**Prevention:** Allowlist tiền tố (`auth`, `users`, `itineraries`, `chat`), chuẩn hóa path, chỉ chuyển tiếp header cần thiết, gắn Bearer lấy từ cookie, bỏ hop-by-hop header. Phase 0c. HIGH.

### URL voice dạng `http://` và file voice biến mất (phụ thuộc BE)
**What goes wrong:** `LocalAudioStorageService.BuildPublicUrl` dựng URL từ `Request.Scheme` và `Host`. `Program.cs` không có `UseForwardedHeaders`, nên khi BE đứng sau proxy TLS của host, URL thành `http://...` và bị mixed content trên trang HTTPS. File lưu trên đĩa local, nên host PaaS dùng đĩa tạm sẽ mất voice sau mỗi lần redeploy hoặc ngủ.
**Prevention:** ACL không tự đổi scheme để che lỗi. Khi audio trả 404, hiện "tệp âm thanh không còn". Đưa hai mục này vào checklist deploy BE: `ForwardedHeaders`, volume bền hoặc object storage. Phase 4, deploy. HIGH (đọc code). Mức ảnh hưởng thực tế phụ thuộc host BE.

## Minor Pitfalls

### Autoplay trên iOS
**What goes wrong:** `audio.play()` cho remote stream có thể bị chặn nếu không nằm trong cử chỉ người dùng.
**Prevention:** Tạo phần tử audio và gọi `play()` ngay trong click "Gọi"/"Nghe", gán `srcObject` sau. Phase 4. MEDIUM.

### `UseCors` đặt sau `UseStaticFiles`
**What goes wrong:** File `/uploads/voices/*` không có header CORS. `<audio src>` vẫn phát được, nhưng `fetch()` hay Web Audio (vẽ waveform, đọc duration) sẽ lỗi.
**Prevention:** Dùng `<audio>` và lấy `VoiceDuration` từ DTO. Phase 4. HIGH.

### Token và dữ liệu nhạy cảm trong log BE
**What goes wrong:** `access_token` nằm trên query string của hub, và ASP.NET log URL ở mức Information. `EnableSensitiveDataLogging()` cũng đang bật ở mọi môi trường.
**Prevention:** Ghi vào checklist BE: hạ mức log `Microsoft.AspNetCore.Hosting` và tắt sensitive logging ở production. Deploy. HIGH.

### Giới hạn kích thước message của hub
**What goes wrong:** `MaximumReceiveMessageSize` mặc định của SignalR là 32 KB.
**Prevention:** SDP chỉ có audio thường vài KB nên ổn, chỉ đừng gom mọi candidate vào offer. Phase 4. MEDIUM.

### Matcher của `proxy.ts`
**What goes wrong:** Không có matcher thì proxy chạy cho cả `_next/static`, ảnh và file public. Proxy cũng chạy cho Server Function trên route đó.
**Prevention:** Loại trừ rõ ràng các path tĩnh, và vẫn kiểm quyền trong từng handler. Phase 0c. HIGH.

### API request của Next 16 là async
**What goes wrong:** `params`, `searchParams`, `cookies()`, `headers()` đều là Promise, ví dụ cũ viết kiểu đồng bộ sẽ lỗi.
**Prevention:** Luôn `await` các API này. Phase 0a. HIGH.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Refresh "lười" trong mọi route handler BFF khi gặp 401 | Code ngắn | Race, reuse detection, đăng xuất toàn bộ | Không bao giờ |
| Chỉ dùng STUN, "TURN để sau" | Không cần tài khoản TURN | Gọi thất bại giữa hai mạng khác nhau, đúng yêu cầu của milestone | Không bao giờ |
| `toLocaleString()` không truyền `timeZone` | Nhanh | Hydration mismatch, lệch ngày | Chỉ trong component client-only |
| Bọc offer thành `{ callId, offer }` | Payload gọn | Vỡ tương thích FE cũ khi chạy song song | Sau khi gỡ FE cũ |
| `"use cache"` cho trang public mà không gắn tag | Trang nhanh | Hiện bản cũ hoặc bản đã xóa | Không dùng trong milestone này |
| Thêm `@microsoft/signalr` vào allowlist package | Ít file ở app | Phá ranh giới web/RN | Chỉ khi chốt bằng quyết định kiến trúc, có cập nhật tài liệu và self-test |
| Bỏ test state machine cuộc gọi | Phase 4 nhanh hơn | Lỗi glare và sự kiện muộn chỉ lộ khi bạn bè dùng | Không bao giờ, vì domain thuần nên test rẻ |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| BE `/auth/refresh-token` | Không gửi access token cũ, coi mọi lỗi là 401 | Gửi cả hai token. Lỗi là 400, còn 5xx thì giữ phiên |
| BE `GET /itineraries/{id}` | Gửi Bearer hết hạn, nhận 403 rồi báo "không có quyền" | BFF kiểm `exp` trước khi gửi |
| BE `/chat/voice` | MIME `audio/webm;codecs=opus` hoặc `audio/mp4`, tên `.webm` đặt cứng | MIME không tham số, tên file khớp container |
| SignalR hub | Để `withCredentials` mặc định, cache token cứng, không join lại phòng sau reconnect | `withCredentials: false`, token factory động, rejoin rồi refetch |
| Cloudflare TURN | Lộ API token ra client, TTL 24 giờ, lấy credential lúc tải trang | Gọi từ route handler, TTL theo cuộc gọi dài nhất, lấy khi bắt đầu gọi |
| coturn tự chạy (nếu chọn) | Chung VPS với BE nên tranh cổng 443 cho TLS | Dùng IP riêng hoặc multiplex SNI (ví dụ nginx `stream` với `ssl_preread`), mở dải cổng UDP relay |
| Vercel | Gửi link preview đang có Deployment Protection, để region `iad1` | Chia sẻ URL production, đặt region gần BE |
| FE cũ chạy song song | Đổi định dạng payload hub | Chỉ thêm field. Hai FE phải cùng hiểu một contract |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| `staleTime: 0` khi có SSR | Mỗi trang 2 lần GET | `staleTime` 30–60 s | Ngay khi BE free tier chậm |
| BFF ở `iad1`, BE ở châu Á | Mỗi thao tác editor chậm thêm vài trăm ms | Đặt region gần BE | Từ người dùng đầu tiên |
| Refetch cả itinerary sau mỗi lần kéo thả | Editor giật | Optimistic reorder, debounce refetch | Lịch trình khoảng 50 waypoint trở lên |
| Rơi xuống long polling | Tin nhắn trễ, nhiều request | Kiểm transport thực tế, host BE có WSS | Mạng có proxy chặn WebSocket |
| Ép mọi cuộc gọi đi qua relay | Tốn băng thông TURN | Chỉ ép `relay` khi test | Cloudflare tính khoảng $0.05/GB khi không dùng SFU, không đáng kể ở quy mô vài người |

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| `QueryClient` singleton phía server | Lộ dữ liệu của người khác qua cache | Tạo mới cho mỗi request |
| `GET /api/rtc/ice-servers` không yêu cầu đăng nhập | Người lạ dùng TURN của mình | Bắt buộc có phiên, rate limit nhẹ |
| `GET /api/auth/token` bị cache | Token của người này trả cho người khác | `no-store`, đọc `cookies()` ngay đầu handler |
| BFF catch-all không có allowlist | SSRF, lộ endpoint, chuyển tiếp header nhạy cảm | Allowlist path và header |
| Logout chỉ xóa cookie | Refresh token bị đánh cắp còn dùng được 7 ngày | Chấp nhận trong milestone, đề xuất BE thêm revoke |
| Secret TURN đặt trong `NEXT_PUBLIC_*` | Lộ secret dài hạn | Biến server-only, kiểm bundle sau khi build |
| CORS của BE "cho tất cả cùng credentials" kéo dài | Site bất kỳ gọi được hub và API (rủi ro giảm phần nào vì dùng Bearer) | Siết origin khi deploy BE, gồm cả regex preview |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Hết phiên giữa lúc sửa lịch trình | Mất thao tác, bị đưa ra màn đăng nhập | Refresh chủ động, giữ tạm nội dung form đang mở |
| BE ngủ dậy chậm | Tưởng app hỏng | Hiện "đang khởi động máy chủ" và tự retry |
| Mất quyền micro hoặc trình duyệt không ghi âm được | Bấm nút ghi âm không thấy gì xảy ra | Báo rõ lý do. Không mang sang cơ chế "giả lập voice" của FE cũ |
| Nhiều tab cùng đổ chuông | Rối, nghe máy nhầm tab | Tắt chuông khi cuộc gọi kết thúc, ghi lại giới hạn đã biết |
| Cuộc gọi kẹt ở "đang kết nối" | Không biết vì sao | Timeout ICE khoảng 15 s, báo lỗi và cho thử lại |
| `SameSite=Strict` | Mở link được chia sẻ thì thấy như bị đăng xuất | Dùng `Lax` |

## "Looks Done But Isn't" Checklist

- [ ] **Session:** để tab mở 61 phút rồi thao tác vẫn chạy. Mở 3 tab sau khi token hết hạn thì log BE chỉ có đúng 1 lần refresh.
- [ ] **Session:** tắt BE trong lúc refresh, user không bị đăng xuất.
- [ ] **Editor:** mở được bản nháp sau khi access token hết hạn, không bị 403.
- [ ] **Editor:** Day 3 có waypoint trong khi Day 2 trống vẫn hiển thị đúng thứ tự. Kéo waypoint sang ngày khác vẫn giữ notes.
- [ ] **Public view:** trang public cập nhật sau khi publish hoặc sửa. `next build` không prerender nhầm route có dữ liệu cá nhân.
- [ ] **Ngày giờ:** test xanh với cả `TZ=UTC` và `TZ=America/Los_Angeles`. Trang chat không có cảnh báo hydration.
- [ ] **Voice:** upload thành công từ Chrome, Firefox, Safari macOS và iPhone thật. File trên 4 MB bị chặn ngay ở UI, có thông báo.
- [ ] **Gọi thoại:** gọi được giữa 4G và Wi-Fi của một nhà khác. Chạy `iceTransportPolicy: 'relay'` vẫn thành công. Tắt Wi-Fi giữa cuộc gọi thì ICE restart hồi phục được.
- [ ] **Gọi thoại:** user FE mới gọi user FE cũ và chiều ngược lại đều nghe được.
- [ ] **SignalR:** kết nối được trên một URL preview `*.vercel.app`, không chỉ production. Mất mạng 30 s rồi có lại thì tin nhắn bị lỡ hiện ra nhờ refetch.
- [ ] **Bảo mật:** bundle client không chứa secret TURN hay `API_BASE_URL`. `ice-servers` trả 401 khi chưa đăng nhập.
- [ ] **Deploy:** URL production mở được trong cửa sổ ẩn danh mà không cần đăng nhập Vercel.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Đã xảy ra race refresh | LOW | User đăng nhập lại. Thêm single-flight và test song song, theo dõi `Token.Compromised` |
| Sai MIME voice | LOW | Sửa chỗ tạo `File`. Các file đã lưu trước đó vẫn phát được |
| Deploy rồi mới phát hiện thiếu TURN | MEDIUM | Thêm route `ice-servers` và secret vào env, redeploy. Không cần đổi BE |
| Payload hub làm vỡ FE cũ | MEDIUM | Quay về định dạng phẳng có thêm field. Hai FE phải thống nhất trước khi đổi tiếp |
| `StartDate` đã lưu sai ngày | MEDIUM | Sửa value object và UI. Dữ liệu sai do user nhập lại, vì BE chỉ lưu kiểu `date` |
| Ranh giới bị nới cho qua lint | HIGH | Revert allowlist, chuyển adapter về composition, bổ sung self-test |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---|---|---|
| P15 Docs Next trống, dùng API cũ | 0a | `next build` xanh, không có `middleware.ts` |
| P13 QueryClient và hydration | 0a, 1 | Không có GET trùng, có test provider |
| P5 Cache Components với cookies | 0a, 0c, 2, 4 | Output `next build` đúng static/dynamic, có header `no-store` |
| P12 Ranh giới ESLint | 0b, 0c, 1, 4 | `pnpm lint` xanh mà không sửa allowlist |
| Nhiều dạng lỗi BE | 0b | Unit test cho cả 4 dạng lỗi |
| P1 Race refresh | 0b, 0c | Test N request song song chỉ ra 1 lần refresh |
| P2 Cookie access token, 400 so với 5xx | 0c | Test token hết hạn sau 61 phút, test tắt BE khi đang refresh |
| P3 Refresh trong RSC | 0c | Review code: HttpClient phía server không gọi refresh |
| P4 403 trên endpoint AllowAnonymous | 0c, 1 | E2E mở bản nháp sau khi token hết hạn |
| P14 Thuộc tính cookie | 0c, deploy | Kiểm `Set-Cookie`, mở link từ ứng dụng chat |
| Logout và đổi mật khẩu | 0c, 3 | Đổi mật khẩu xong về màn đăng nhập |
| P11 Ngày giờ | 1, 2, 4 | Test đa múi giờ, không có cảnh báo hydration |
| Thứ tự, ngày thưa, DaysCount = 0 | 1, 3 | Test mapper với dữ liệu không sắp xếp |
| P6 Giới hạn body | 4, deploy | UI chặn file trên 4,5 MB, không gặp 413 |
| P7 MIME voice | 4 | Upload thật trên 4 trình duyệt |
| P8 TURN và ICE | 4, deploy | Gọi 4G với Wi-Fi, `getStats()` cho thấy `relay` |
| P9 Hub đa tab và FE cũ | 4 | Gọi chéo FE mới với FE cũ, test state machine |
| P10 SignalR CORS và transport | 4, deploy (cùng BE ngoài repo) | Kết nối từ URL preview, reconnect có rejoin |
| Region, cold start, Deployment Protection | deploy | Đo TTFB, mở URL production ở cửa sổ ẩn danh |
| URL voice http và đĩa tạm | deploy (BE ngoài repo) | Voice vẫn phát được sau khi BE redeploy |

## Phụ thuộc cần chuyển sang repo `tripory_be` (roadmap FE không sửa)

- CORS: production origin, regex preview của đúng project, localhost, origin FE cũ. Cho phép GET, POST, DELETE cho SignalR.
- Host hỗ trợ WSS. Chạy một instance, hoặc bật sticky session.
- `UseForwardedHeaders` để URL voice ra HTTPS. Voice lưu trên volume bền hoặc object storage.
- Lọc `access_token` khỏi log request, tắt `EnableSensitiveDataLogging` ở production.
- Sửa `DaysCount` và `WaypointsCount` của `/itineraries/mine` (thiếu `Include`).
- Đề xuất, không chặn milestone: grace window cho refresh token vừa xoay vòng, endpoint logout, thêm `audio/mp4` cho iOS dưới 18.4, sự kiện "đã nghe ở thiết bị khác".

## Sources

Code đọc trực tiếp (HIGH):
- `tripory_be/src/Services/Tripory/Tripory.API/Program.cs` (CORS, JwtBearer, hub, thứ tự middleware); `Controllers/ApiController.cs`, `Controllers/V1/{AuthController,ChatController,ItinerariesController}.cs`; `Middlewares/GlobalExceptionHandler.cs`; `appsettings.json` (chỉ tên key)
- `tripory_be/.../Tripory.Application/UseCases/V1/Auth/Handlers/{RefreshTokenCommandHandler,LoginCommandHandler}.cs`; `Behaviors/ValidationPipelineBehavior.cs`; DTO của Itineraries và Chat; `Itineraries/Extensions/ItineraryExtensions.cs`; `GetItineraryByIdQueryHandler.cs`, `GetMyItinerariesQueryHandler.cs`
- `tripory_be/.../Tripory.Domain/Entities/{User,RefreshToken,Itinerary}.cs`; `Tripory.Infrastructure/{Hubs/ChatHub.cs, Implementations/Realtime/ChatNotificationService.cs, Implementations/Security/JwtTokenService.cs, Implementations/Storage/LocalAudioStorageService.cs}`; `Tripory.Persistence/{DependencyInjection.cs, Repositories/ItineraryRepository.cs}`
- `tripory/src/services/realtime/{signalRService,webrtcService}.ts`, `src/services/api/{apiClient,chatService}.ts`, `src/components/chat/VoiceRecorder.tsx`
- `tripory_fe/apps/web/next.config.ts`, `packages/config/eslint/boundaries.mjs`, `ai-memories/tripory-fe--ddd-architecture.md`, thư mục `apps/web/node_modules/next/dist/docs/` (trống)

Tài liệu chính thức:
- Vercel: [Functions limits](https://vercel.com/docs/functions/limitations), [vượt giới hạn body 4,5 MB](https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions), [WebSocket trên Functions](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections), [WebSocket public beta](https://vercel.com/changelog/websocket-support-is-now-in-public-beta), [cookie và vercel.app](https://vercel.com/guides/can-i-set-a-cookie-from-my-vercel-project-subdomain-to-vercel-app), [Deployment Protection](https://vercel.com/docs/deployment-protection)
- Next.js 16: [cookies](https://nextjs.org/docs/app/api-reference/functions/cookies), [Caching với Cache Components](https://nextjs.org/docs/app/getting-started/caching), [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [route.js](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [proxyClientMaxBodySize](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize), [middleware đổi tên thành proxy](https://nextjs.org/docs/messages/middleware-to-proxy)
- ASP.NET Core SignalR (.NET 10): [Security/CORS](https://learn.microsoft.com/en-us/aspnet/core/signalr/security?view=aspnetcore-10.0), [Authn/Authz](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-10.0), [Hosting và scale](https://learn.microsoft.com/en-us/aspnet/core/signalr/scale?view=aspnetcore-10.0)
- Cloudflare Realtime TURN: [Generate credentials](https://developers.cloudflare.com/realtime/turn/generate-credentials/), [Tổng quan, cổng, giá](https://developers.cloudflare.com/realtime/turn/)
- WebKit: [Safari 18.4, MediaRecorder WebM/Opus](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)
- MDN: [restartIce](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/restartIce), [setConfiguration](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setConfiguration)
- TanStack Query: [Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr), [Server Rendering & Hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- Zod: [API, ISO datetime](https://zod.dev/api)

Cộng đồng (MEDIUM/LOW):
- [Safari từ chối cookie Secure trên localhost](https://flaviocopes.com/cookie-not-being-set-in-safari/)
- [Thử WebSocket trên Vercel Functions, mất kết nối khoảng 5 phút](https://dev.classmethod.jp/en/articles/vercel-functions-websocket-public-beta-verification/)

Nội dung từ các nguồn trên đã được diễn đạt lại để tuân thủ giới hạn bản quyền.

---
*Pitfalls research for: Tripory FE (Next.js 16 BFF + .NET API/SignalR + WebRTC)*
*Researched: 2026-10-09*
