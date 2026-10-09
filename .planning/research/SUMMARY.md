# Project Research Summary

**Project:** Tripory Frontend (Next.js monorepo, chạy song song FE Vite cũ)
**Domain:** Web app lập và chia sẻ lịch trình du lịch, mobile-first, kèm chat 1-1, tin nhắn thoại và gọi thoại WebRTC; Next.js 16 BFF trên Vercel trước một backend .NET 10 + SignalR ở repo riêng
**Researched:** 2026-10-09
**Confidence:** MEDIUM-HIGH

## Executive Summary

Tripory là app "planner + chia sẻ + nhắn tin" cỡ nhỏ: phần giá trị là editor lịch trình theo ngày và trang công khai để gửi cho bạn bè, phần giữ chân là chat/voice/gọi thoại. Phạm vi tính năng bị chặn trên bởi những gì BE đang có (Auth, Users, Chat/SignalR, 11 endpoint Itinerary). Không có unpublish, chuyển waypoint giữa ngày, tác giả trong DTO, upload ảnh, presence, push, logout/revoke. Cách làm đúng cho milestone này: BFF mỏng bằng Route Handler, Server Component gọi thẳng BE, client fetch qua `/api/bff` bằng TanStack Query, mọi adapter riêng nền tảng (SignalR, WebRTC, MediaRecorder, Web Locks) nằm ở `apps/web/src/composition`, còn domain/application thuần TS trong package theo ranh giới ESLint.

Rủi ro lớn nhất không nằm ở UI mà ở hợp đồng với BE và nền tảng. (1) BE xoay refresh token và thu hồi mọi phiên khi thấy token cũ bị dùng lại, nên chỉ được có một đường refresh: client gọi `POST /api/auth/refresh`, tuần tự hóa bằng single-flight + Web Locks; proxy, RSC và BFF không bao giờ tự refresh. (2) `cacheComponents: true` đang bật, nên đọc `cookies()` phải nằm trong `<Suspense>`, và GET route trả token/credential phải đọc cookie ngay đầu để không bị prerender. (3) Gọi thoại giữa hai mạng thật cần TURN, buffer ICE candidate, ICE restart, và hợp đồng hub phải giữ tương thích với FE cũ đang chạy song song. (4) Voice qua BFF bị trần 4,5 MB của Vercel và allowlist MIME so khớp nguyên chuỗi của BE.

Khuyến nghị: dựng và deploy walking skeleton lên Vercel ngay cuối Phase 0a (gỡ rủi ro pnpm 11 + Next cài thiếu docs), xây session/BFF cẩn thận ở 0b–0c với test race refresh, rồi đi tuần tự Itinerary → Public view → Profile → Chat/Call. TURN dùng Cloudflare Realtime TURN (free 1.000 GB/tháng, mint credential ngắn hạn bằng một REST call). Deploy BE là phụ thuộc ngoài; research chỉ đề xuất VPS nhỏ + docker compose (khoảng €5–7/tháng) và chuyển checklist sang repo BE.

## Key Findings

### Recommended Stack

Giữ nguyên lõi đã chốt (Next 16.4, React 19.3, Tailwind 4.3, TS 5.9, Turborepo, Vitest 4.1, Node 24.x). Thêm vào `catalog:` một bộ nhỏ, phổ biến; ghi âm, WebRTC, BFF proxy và đọc `exp` JWT dùng API native. Chi tiết version và vị trí đặt theo ESLint ở [STACK.md](./STACK.md).

**Core technologies (bổ sung):**
- `@tanstack/react-query` 5.104.1: server state, optimistic update, prefetch/hydrate cho trang public — mẫu `getQueryClient()` chính thức, `staleTime` 60 s.
- `zod` 4.6.5: ACL parse DTO ở tầng `infrastructure`, env server, input BFF — FE cũ đã dùng, port được schema.
- `@microsoft/signalr` 10.0.11: client hub, chỉ trong `apps/web` (package bị cấm) — khớp major với BE .NET 10; không dùng 11 preview.
- `@dnd-kit/core` 6.3.1 + `sortable` 10.0.0: reorder waypoint trong ngày, đủ 3 sensor — FE cũ dùng đúng bộ này.
- shadcn CLI 4.21.4 trên `@base-ui/react` 1.8.0 + `cva`/`clsx`/`tailwind-merge`/`tw-animate-css`/`lucide-react`/`sonner`: `packages/ui-web`.
- `react-hook-form` 7.89.0 + `@hookform/resolvers` 5.9.1: form; không dùng Server Action cho mutation nghiệp vụ.
- `@playwright/test` 1.64.0: E2E hai browser context (chat/gọi), tách khỏi `pnpm test`.
- TURN: Cloudflare Realtime TURN (chọn); coturn trên VPS làm dự phòng.

**Version/nền tảng cần nhớ:** Vercel đã tắt Node 20, dùng 24.x. Vercel docs chỉ liệt kê pnpm 6–10 trong khi repo pin `pnpm@11.6.0` (issue mở vercel#17434). `jsdom` dùng 29.1.1 (30.x đòi Node ≥24.15). Tailwind cần `@source` trỏ tới `packages/ui-web/src`.

### Expected Features

Chi tiết và ánh xạ endpoint BE ở [FEATURES.md](./FEATURES.md). Bản mới phải bằng hoặc hơn FE cũ về UX, không chỉ về kiến trúc.

**Must have (table stakes, P1 cho đợt dùng thử):**
- Khung responsive mobile-first (`dvh`, safe-area, bottom sheet), loading/empty/**error** state, toast, chỉ hiện route có thật trong nav.
- Đăng ký/đăng nhập/đăng xuất, giữ phiên im lặng, auth gate `?next=` (chỉ path nội bộ), đổi mật khẩu (hiện rule BE trước).
- "Lịch trình của tôi" (phân trang, lọc nháp/xuất bản), tạo nhanh bằng tiêu đề, xóa có xác nhận.
- Editor: metadata (ảnh bìa là URL), ngày + phụ đề inline, thêm/sửa waypoint, xóa có Undo 5 s (hoãn commit), reorder trong ngày optimistic, km ngày/tổng lấy từ BE, chỉ báo trạng thái lưu, xuất bản kèm cảnh báo không hủy được.
- Nhập vị trí waypoint không cần Mapbox: ô dán tọa độ/link Google Maps (luôn có) + tìm địa điểm OSM qua route handler server-side.
- Trang public SSR (Bài viết/Bản đồ SVG), 403 cho nháp, 404 cho id sai, banner nháp cho chủ, chia sẻ copy/Web Share/QR, OG metadata.
- Hồ sơ xem/sửa, tab lịch trình, danh bạ tìm người dùng (ACL bỏ `email`) + "Nhắn tin" (cửa vào chat).
- Chat: danh sách + badge unread từng hội thoại và tổng, thread phân trang, gửi optimistic có Thử lại, đã xem chỉ khi tab hiển thị, dedupe theo `id`, resync sau reconnect.
- Voice 1–120 s, upload có thử lại giữ bản ghi, player.
- Gọi thoại: state machine đủ (timeout đổ chuông, bận, ICE lỗi/đang kết nối lại, tên người gọi), TURN ngắn hạn, call log + gọi lại, sống qua điều hướng giữa `(public)`/`(dashboard)`, nhấp nháy tiêu đề tab.
- Kênh góp ý + hiển thị phiên bản build.

**Should have (differentiators, v1.x):**
- Thẻ lịch trình trong chat qua link nội bộ (unfurl), ảnh OG động, `BroadcastChannel` tắt chuông tab khác, Notification API, khoảng cách chặng "ước tính", ngày thực theo `startDate`.

**Defer / anti-features:**
- Mọi mock (Discovery, Fork, Like, Comment, Check-in, số liệu hồ sơ giả), presence/typing, nút "loa ngoài", upload ảnh giả, trường waypoint không có trong DTO, kéo waypoint giữa ngày, unpublish, soạn khi chưa đăng nhập, cộng tác realtime, Web Push, chat nhóm, dark mode, PWA/PDF, autocomplete trên Nominatim public (bị cấm theo chính sách).

### Architecture Approach

Chi tiết pattern và code mẫu ở [ARCHITECTURE.md](./ARCHITECTURE.md). REST từ client đi `/api/bff/[...path]` (Route Handler catch-all có allowlist, kiểm Origin, gắn Bearer từ cookie, rút gọn 401 khi access hết hạn). RSC gọi thẳng BE qua `composition/*.server.ts` và không bao giờ refresh. `proxy.ts` chỉ redirect lạc quan theo sự có mặt của cookie access. SignalR nối thẳng `wss://BE/hubs/chat` với `accessTokenFactory` → `GET /api/auth/token`. Port realtime/media nằm trong `packages/chat/application`, adapter nằm ở `apps/web/src/composition/chat`. Không cần sửa `boundaries.mjs` cho luồng chính.

**Major components:**
1. `app/api/auth/*` — login/register/logout/refresh/token/change-password; đặt/xóa cookie httpOnly; chỉ trả `user`, không trả token (ngoại lệ có chủ đích: `/api/auth/token` cho SignalR, `no-store`).
2. `app/api/bff/[...path]` → `composition/server/bff.server.ts` — proxy allowlist `users|itineraries|chat`, chặn `auth/*`, timeout, envelope lỗi thống nhất.
3. `app/api/rtc/ice-servers` → `composition/server/rtc.server.ts` — bắt buộc có phiên, mint TURN qua interface `IceServerIssuer`, `no-store`.
4. `packages/api-client` — port `HttpClient`, bóc envelope, chuẩn hóa 4 dạng lỗi BE về `ApiError`, `withSessionRefresh` (single-flight, `Lock` tiêm vào).
5. `packages/{identity,itinerary,profile,chat}` — domain/application thuần (clock, id, timer tiêm qua deps), ACL Zod, hooks; `chat` chứa state machine cuộc gọi + call controller có buffer ICE.
6. `composition/**` — nơi duy nhất import `/http`, lắp repository → use case → hooks; tách `*.server.ts` / `*.client.ts`, không barrel gộp.

### Critical Pitfalls

Đầy đủ 15 pitfall chính + checklist "looks done but isn't" ở [PITFALLS.md](./PITFALLS.md).

1. **Refresh song song kích hoạt reuse detection, BE thu hồi mọi phiên (kể cả FE cũ)** — một đường refresh duy nhất từ client, single-flight trong tab + Web Locks giữa tab, route idempotent (no-op khi access còn tươi), refresh chủ động trước hạn; test "N request 401 song song → đúng 1 lần refresh".
2. **Cookie access hết hạn cùng JWT làm refresh không chạy / BE trả 500** — `Max-Age` cả hai cookie = `ExpiresAt` (hạn refresh, 7 ngày); hạn access đọc từ claim `exp`; lỗi refresh 400 → đăng xuất, 5xx/timeout → giữ cookie và trả 503.
3. **Cache Components + cookies + GET route handler** — đọc session trong component con bọc `<Suspense>`; `auth/token` và `rtc/ice-servers` đọc `cookies()` dòng đầu, `no-store`; không dùng `"use cache"` cho dữ liệu lịch trình trong milestone; đọc output `next build`.
4. **Gọi thoại chỉ chạy trong LAN** — TURN bắt buộc kèm `turns:…:443`, lấy ICE servers lúc bắt đầu gọi, buffer candidate theo `callId`, `restartIce()` khi `failed`, nghiệm thu bằng `iceTransportPolicy: 'relay'` giữa 4G và Wi-Fi. Payload hub chỉ **thêm field** (`callId`, `kind`), không bọc lại, để FE cũ vẫn hiểu.
5. **Voice bị chặn bởi trần 4,5 MB và MIME khớp nguyên chuỗi** — giới hạn 120 s (BE validate 1–120), Opus ~32 kbps, kiểm `size < 4 MB` ở UI, tạo `File` với `type: 'audio/webm'` (bỏ `;codecs=opus`) và tên khớp container, không gửi `audio/mp4`, loại route upload khỏi matcher `proxy.ts`; upload thật trên Chrome/Firefox/Safari/iPhone.

Cũng phải chặn sớm: 403 thay vì 401 trên endpoint `[AllowAnonymous]` khi token hết hạn (BFF kiểm `exp` trước), ngày giờ `DateOnly`/`DateTimeOffset` gây lệch ngày và hydration mismatch (value object `CalendarDate`, `z.iso.datetime({ offset: true })`), `QueryClient` singleton phía server rò dữ liệu, BFF thành open proxy, docs Next cục bộ trống dễ dẫn tới code theo API Next cũ (`middleware.ts`, `cookies()` đồng bộ).

## Implications for Roadmap

Giữ đúng lộ trình đã chốt trong PROJECT.md (0a → 4, milestone kết thúc sau Phase 4 + Vercel deploy). Research đề xuất kéo deploy smoke về cuối 0a và giữ một bước nghiệm thu deploy cuối cùng.

### Phase 0a: UI skeleton + walking skeleton trên Vercel
**Rationale:** Mọi màn sau đứng trên layout/provider; rủi ro nền tảng (pnpm 11 trên Vercel, Next cài thiếu docs/dist) phải lộ ra trước khi có code nghiệp vụ.
**Delivers:** route group `(public)`/`(dashboard)`, `providers.tsx` (QueryClient theo mẫu chính thức), `ui-web` (shadcn/Base UI) + `design-tokens`, quy ước `loading`/`error`/`not-found`, toast, header có slot session bọc `<Suspense>`; deploy preview Vercel (Root Directory `apps/web`, Node 24).
**Addresses:** khung responsive, error state, nav chỉ route thật.
**Avoids:** P15 (cài lại Next, kiểm `next build` sớm), P13 (QueryClient), P5 (session trong Suspense), rủi ro pnpm 11.

### Phase 0b: HTTP + shared kernel
**Rationale:** Wrapper refresh và chuẩn hóa lỗi là nền của session và mọi repository.
**Delivers:** `shared-kernel` (branded id, `Wgs84Coordinate`), `api-client` (fetch client, bóc envelope, `ApiError` cho 4 dạng lỗi BE, `withSessionRefresh` với `Lock` tiêm vào).
**Uses:** `zod` ở context, type guard tay trong `api-client`.
**Avoids:** P1 (test race), nhiều dạng lỗi BE, P12 (không dùng `navigator` trong package).

### Phase 0c: Identity + session (BFF)
**Rationale:** Cửa vào mọi thao tác ghi; quyết định cookie và refresh khó sửa về sau.
**Delivers:** `packages/identity`, `composition/server/{env,session,backend-http,bff}.server.ts`, route `auth/{login,register,logout,refresh,change-password}`, `bff/[...path]`, `proxy.ts`, `http.client.ts` + Web Locks, UserMenu đọc claim, Vitest cho helper thuần của `apps/web`.
**Implements:** Pattern 1–5 của ARCHITECTURE.md.
**Avoids:** P1, P2, P3, P4, P14, BFF open proxy, P12 (route đi qua composition).

### Phase 1: Itinerary CRUD + editor
**Rationale:** Core Value; cần session và api-client.
**Delivers:** 4 tầng `itinerary`, "Lịch trình của tôi", editor đầy đủ (metadata, ngày/phụ đề, waypoint CRUD + Undo, reorder trong ngày, trạng thái lưu, xuất bản), cách nhập vị trí (dán tọa độ/link + tìm OSM).
**Addresses:** nhóm C trong FEATURES.md.
**Avoids:** thứ tự/ngày thưa trong DTO (mapper sắp xếp, vẽ đủ dải ngày), `DaysCount = 0` của `/mine` (không hiển thị), P11 (`CalendarDate`, clock tiêm), P4 khi mở editor sau khi token hết hạn.

### Phase 2: Bản đồ SVG + public view
**Rationale:** Cần lịch trình đã xuất bản từ Phase 1; là nơi duy nhất cần pattern RSC + optional auth.
**Delivers:** component bản đồ SVG dùng chung (port từ FE cũ, có thể dùng lại trong editor), trang public SSR trong `<Suspense>`, `generateMetadata`/OG, 403/404 tự render (không dùng `forbidden()` experimental), `<RefreshSessionThenReload/>`, chia sẻ copy/Web Share/QR.
**Avoids:** P5 (không `"use cache"`), P11 (SSR UTC vs client), P13 (không dùng chung query key giữa RSC và client).

### Phase 3: Profile + users
**Rationale:** Danh bạ là cửa vào hội thoại mới (`POST /conversations/{partnerId}`), nên phải xong trước Chat.
**Delivers:** `profile` rút gọn, xem/sửa hồ sơ, tab lịch trình ghép bằng hook `itinerary` ở app, danh bạ có tìm kiếm, đổi mật khẩu xóa phiên.
**Avoids:** lộ `email` qua `GET /users` (ACL bỏ, chỉ gọi khi có phiên), logout/đổi mật khẩu không revoke.

### Phase 4: Chat realtime + voice + gọi thoại
**Rationale:** Phức tạp nhất, phụ thuộc session, danh bạ và BE đã deploy công khai (WSS, CORS).
**Delivers:** 4 tầng `chat` (state machine cuộc gọi, call controller có buffer ICE, schema payload hub, enum số), `composition/chat/*` (SignalR gateway, WebRTC media, voice recorder), route `auth/token` và `rtc/ice-servers`, `<RealtimeProvider>` ở layout bao cả hai route group.
**Avoids:** P6, P7, P8, P9, P10, autoplay iOS, hydration giờ tin nhắn.

### Deploy & nghiệm thu (gate cuối milestone)
**Rationale:** Milestone chỉ xong khi bạn bè dùng được URL production; phụ thuộc BE công khai.
**Delivers:** env Production/Preview (tách biến server-only và `NEXT_PUBLIC_*`), `regions` gần BE, chỉ chia sẻ URL production (preview có Deployment Protection), smoke E2E, checklist phụ thuộc BE đã chuyển sang `tripory_be`.
**Avoids:** region `iad1` lệch BE, cold start BE (timeout + thông báo "đang khởi động"), secret TURN trong bundle, URL voice `http://`.

### Phase Ordering Rationale

- Chuỗi phụ thuộc cứng: api-client (0b) → session/BFF (0c) → mọi màn có dữ liệu; Itinerary (1) → Public view (2); Danh bạ (3) → Chat (4); BE công khai → nghiệm thu SignalR/gọi thoại.
- Deploy sớm ở 0a tách rủi ro nền tảng (pnpm 11, monorepo, Next cài thiếu) khỏi rủi ro tích hợp BE ở cuối.
- Route `auth/token`, `rtc/ice-servers` để tới Phase 4 khi có consumer thật; helper `backend-http.server.ts` dựng từ 0c để Phase 2 dùng lại.
- Quyết định cách nhập vị trí phải chốt khi plan Phase 1: không có nó thì không thêm được waypoint, không xuất bản, không có gì để chia sẻ.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 0c:** tên claim JWT thật (`nameid` hay URI), xung đột thiết kế cookie giữa hai file research (xem Gaps), kiểm chứng Web Locks trên iOS của nhóm bạn.
- **Phase 1:** chốt cách nhập vị trí và nhà cung cấp geocoder (chính sách Nominatim/Photon), dnd-kit với React 19 StrictMode.
- **Phase 4:** upload voice thật để xác nhận MIME, TURN qua 4G/Wi-Fi, tương thích hub với FE cũ, transport SignalR.
- **Deploy:** pnpm 11 trên Vercel (chưa thử), region theo nơi deploy BE.

Phases with standard patterns (skip research-phase):
- **Phase 0b:** fetch client + envelope + single-flight là mẫu quen, đã có code mẫu.
- **Phase 3:** CRUD hồ sơ và tìm kiếm đơn giản, contract BE rõ.
- **Phase 2:** phần lớn đã có docs Next 16 rõ; chỉ cần tuân thủ Suspense/không cache.

## Needs user decision

Các điểm dưới đây lệch hoặc chạm vào quyết định đã chốt/ranh giới kiến trúc. Research không tự đổi; roadmapper giữ mặc định ghi trong ngoặc cho tới khi chủ dự án quyết.

1. **Nền bản đồ MapLibre + OpenFreeMap để bấm chọn vị trí** — lệch quyết định "giữ bản đồ SVG". (Mặc định: không làm; dùng SVG chỉ hiển thị.)
2. **Dùng geocoder OSM public (Nominatim hoặc Photon) qua route handler** — không vi phạm "không Mapbox", nhưng chính sách Nominatim đòi chủ dự án tự quyết, cấm autocomplete, ≤1 req/s, ghi công ODbL. (Mặc định: luôn có ô dán tọa độ/link; tìm OSM chỉ khi được duyệt.)
3. **Sửa `boundaries.mjs`** — (a) thêm preset `uiPackage()` cho `ui-web`/`design-tokens` (cần ở 0a vì self-test bắt mọi package nối preset); (b) thêm `RTCPeerConnection`, `MediaRecorder`, `MediaStream` vào `BROWSER_GLOBALS`; (c) cho phép `@testing-library/react` trong test tầng `react`. Theo AGENTS.md đây là quyết định kiến trúc, phải kèm self-test và cập nhật tài liệu. (Mặc định: (a) cần để tiến hành 0a; (b), (c) không làm.)
4. **Toolchain nếu Vercel không cài được pnpm 11** — thử `ENABLE_EXPERIMENTAL_COREPACK=1`, rồi override Install Command; phương án cuối là hạ pnpm 10 cho CI, tức đổi `packageManager` của repo. (Mặc định: không hạ pnpm trước khi thử hai cách đầu.)
5. **Giới hạn đã biết khi chạy song song FE cũ** — nhiều tab/thiết bị cùng đổ chuông tới khi người gọi dừng; logout không revoke refresh token; iOS < 18.4 không gửi được voice. Chấp nhận cho đợt dùng thử hay chờ BE? (Mặc định: chấp nhận, ghi đề xuất BE.)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Version tra npm registry 2026-10-09, hành vi theo docs chính chủ; hosting BE và giá là MEDIUM/LOW; pnpm 11 trên Vercel chưa thử |
| Features | HIGH | Đối chiếu trực tiếp controller/DTO/hub BE và code FE cũ; kỳ vọng UX/đối thủ MEDIUM |
| Architecture | MEDIUM-HIGH | Next/Vercel/SignalR/Cloudflare theo docs; vài điểm runtime (claim JWT, MIME, transport) chưa chạy thử |
| Pitfalls | HIGH | Phần lớn đọc từ code BE/FE cũ/repo này; hành vi Safari, NAT di động VN, cold start là MEDIUM |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Docs Next cục bộ trống, bản cài Next có vẻ thiếu** (`dist/docs` 0 file, `dist/bin/next` không có): chạy `pnpm install --force` rồi `pnpm build` đầu Phase 0a; tới khi có docs thì đối chiếu nextjs.org và ghi version docs trong PR.
- **Mâu thuẫn giữa các file research, cần chốt khi plan (không phải quyết định của user):**
  - Thời hạn access token: 60 phút (`appsettings.json`) vs mặc định 15 phút trong code. Không phụ thuộc vào số này; luôn đọc `exp`.
  - Cookie: PITFALLS đề xuất `__Host-` cho cả hai cookie (bắt buộc `Path=/`); ARCHITECTURE đặt refresh cookie `Path=/api/auth`. Khuyến nghị: access `__Host-tripory_at` (`Path=/`), refresh `__Secure-tripory_rt` (`Path=/api/auth`), `proxy.ts` gate theo cookie access.
  - BFF allowlist: PITFALLS có `auth`, ARCHITECTURE chặn `auth/*`. Khuyến nghị: chặn `auth/*` (token không được lọt về JS).
  - Phát hiện "tab khác đã refresh": cookie `tripory_at_exp` không httpOnly (PITFALLS) vs route refresh idempotent trả 204 (ARCHITECTURE). Khuyến nghị: route idempotent là bắt buộc; cookie exp là tùy chọn để refresh chủ động.
  - Thời lượng voice: 5 phút (STACK/ARCHITECTURE) vs 120 s (FEATURES/PITFALLS). Khuyến nghị: 120 s vì BE validate `VoiceDuration` 1–120.
  - SignalR transport: STACK đề xuất `WebSockets` + `skipNegotiation`; PITFALLS giữ fallback mặc định + `withCredentials: false`. Khuyến nghị: BE một instance nên giữ fallback mặc định + `withCredentials: false`; chỉ chuyển `skipNegotiation` nếu BE scale ngang không sticky.
  - Tên biến môi trường: chốt một bộ, ví dụ `API_ORIGIN` (server) + `NEXT_PUBLIC_API_ORIGIN` (dựng URL hub), TURN secret server-only; khai báo trong `turbo.json`.
- **MIME voice `audio/webm;codecs=opus` có bị BE từ chối không:** suy luận từ code, kiểm bằng upload thật ở Phase 4.
- **Cloudflare TURN free có đòi phương thức thanh toán không:** kiểm khi tạo key, trước Phase 4.
- **Nơi deploy BE và region:** quyết định `regions` của Vercel; chờ repo BE chốt host.
- **Phụ thuộc BE (chuyển sang `tripory_be`, không chặn code FE nhưng chặn nghiệm thu):** URL HTTPS + WSS; CORS cho production, regex preview, localhost, origin FE cũ; một instance hoặc sticky session; `UseForwardedHeaders`; lưu trữ voice bền; tắt log `access_token` và sensitive logging; sửa `DaysCount`/`WaypointsCount` của `/mine`. Đề xuất thêm: grace window refresh, endpoint logout, nhận `audio/mp4`, sự kiện "đã nghe ở thiết bị khác", `author` trong `ItineraryDetailDto`.

## Sources

### Primary (HIGH confidence)
- Code đọc trực tiếp: `tripory_be` (`Program.cs`, controllers Auth/Chat/Itineraries/Users, `RefreshTokenCommandHandler`, `JwtTokenService`, `ChatHub`, `ChatNotificationService`, `LocalAudioStorageService`, DTO, entity); FE cũ `tripory` (`signalRService`, `webrtcService`, `VoiceRecorder`, `ChatRealtimeContext`, `lib/projection.ts`); repo này (`boundaries.mjs`, `next.config.ts`, `pnpm-workspace.yaml`, tài liệu kiến trúc DDD).
- Next.js 16 docs (nextjs.org): cookies, proxy, Route Handlers, Cache Components, BFF, Authentication, Data Security.
- Vercel docs: Functions limits (4,5 MB), regions, Deployment Protection, package managers, Node 20 deprecation.
- Microsoft Learn: SignalR authn/authz, security/CORS, scale, JavaScript client (.NET 10).
- Cloudflare Realtime TURN: generate credentials, FAQ, pricing.
- TanStack Query Advanced SSR; WebKit Safari 18.4; MDN Web Locks, `restartIce`, `setConfiguration`; Nominatim Usage Policy; npm registry.

### Secondary (MEDIUM confidence)
- vercel/vercel#17434 (pnpm 11), dnd-kit changelog/discussion, Photon README, OpenFreeMap, Auth0 rotation overlap, Render/Neon/Railway pricing, Metered/Twilio docs, webrtc-developers.com, Telnyx call-state.

### Tertiary (LOW confidence)
- Giá VPS (Hetzner đổi giá hai lần trong 2026), Oracle Always Free, LambdaTest MediaRecorder, Safari cookie `Secure` trên localhost (flaviocopes), URL share Zalo.

Nội dung từ các nguồn trên đã được diễn đạt lại để tuân thủ giới hạn bản quyền.

---
*Research completed: 2026-10-09*
*Ready for roadmap: yes*
