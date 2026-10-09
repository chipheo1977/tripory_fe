# Đề xuất hoàn thiện tripory_fe (bản nhanh)

## Kết luận trước

- `tripory_fe` mới có khung monorepo và lớp cưỡng chế ranh giới. Chưa có dòng code nghiệp vụ nào: `shared-kernel`, `api-client`, `itinerary` đều chỉ có `export {}`, còn `apps/web` là trang mặc định của create-next-app.
- FE cũ (`tripory`, Vite + React 18) chỉ nối API thật cho Auth, Users và Chat (gồm SignalR và WebRTC). Itinerary, Discovery, Profile trips, Public view, Fork, Like, Comment, Check-in đều chạy bằng `src/data/mock*.ts`.
- BE đã có đủ Auth, Users, Chat và 11 endpoint Itinerary. Chưa có Fork, Social (like/comment), Discovery feed, Check-in, upload ảnh bìa.
- Nên đi theo thứ tự: Phase 0 nền móng (api-client, identity, session cookie httpOnly qua route handler) → Itinerary (core, viết mới vì FE cũ chỉ là mock) → Profile → Chat (port logic từ FE cũ) → các phần chờ BE.

## 1. Hiện trạng tripory_fe

| Thành phần | Trạng thái | Bằng chứng |
|---|---|---|
| `packages/config` | Có code thật: preset ESLint ranh giới, tsconfig library, preset Vitest, self-test 58 test | `packages/config/eslint/boundaries.mjs`, `packages/config/test/boundaries.test.ts` |
| `packages/shared-kernel` | Rỗng | `src/index.ts` chỉ có `export {}` (12 byte) |
| `packages/api-client` | Rỗng | `src/index.ts` chỉ có `export {}` |
| `packages/itinerary` | Đã có 4 thư mục tầng, nhưng mọi file đều rỗng | `src/{domain,application,infrastructure,react}/index.ts` |
| `apps/web` | Next 16.4.0, React 19.3.0, Tailwind 4.3.3. Chỉ có `layout.tsx`, `page.tsx` mặc định, chưa cài TanStack Query hay zod | `apps/web/package.json`, `pnpm-workspace.yaml` (catalog) |
| Chưa có package | `identity`, `profile`, `chat`, `maps`, `social`, `discovery`, `ui-web`, `design-tokens`, `api-contract` | Tài liệu kiến trúc mục 4 có dự kiến |

Luật cần giữ (`ai-memories/tripory-fe--ddd-architecture.md` mục 5):
- Mỗi tầng chỉ được import những gì có trong allowlist.
- Chỉ `apps/web/src/composition/**` được import `/http`.
- Package context không import lẫn nhau.
- `next/*` và `server-only` chỉ được dùng trong app.

## 2. Tính năng của FE cũ

Router nằm ở `tripory/src/App.tsx` (react-router-dom 7). Lớp API là `src/services/api/*.ts` (axios), realtime là `src/services/realtime/*.ts`.

| Tính năng | Route / page | Endpoint gọi tới | Trạng thái |
|---|---|---|---|
| Auth (modal đăng nhập/đăng ký, đổi mật khẩu, menu user) | modal `components/auth/*`, `contexts/AuthContext.tsx` | `POST /auth/register`, `/auth/login`, `/auth/refresh-token`, `PUT /auth/change-password` (`authService.ts`) | Hoàn chỉnh. Token lưu trong localStorage (`apiClient.ts` `STORAGE_KEYS`), có hàng đợi refresh khi gặp 401 |
| Users directory | `/users` → `UsersDirectoryPage` | `GET /users?search=&limit=`, `POST /chat/conversations/{partnerId}` | Hoàn chỉnh |
| Profile | `/profile` → `UserProfilePage` | `GET /users/me`, `PUT /users/profile` (`userService.ts`). Danh sách trip lấy từ `data/mockProfile` | Một phần: thông tin user là thật, danh sách trip là mock |
| Chat 1-1, voice, gọi thoại | `/messages`, `/messages/:id` → `MessagesPage` | 8 endpoint `/chat/*` (`chatService.ts`), hub `/hubs/chat` với `accessTokenFactory` (`signalRService.ts`), WebRTC (`webrtcService.ts`) | Hoàn chỉnh. Riêng thẻ chia sẻ lịch trình dùng dữ liệu mock |
| Itinerary editor (bản đồ, timeline, kéo thả, publish, undo) | `/editor` → `ItineraryEditorPage` | Không gọi API: dùng `data/mockItinerary`, tự vẽ bản đồ (`lib/projection.ts`, `MapGrid`), tính quãng đường bằng `@turf/distance` | Mock |
| Danh sách itinerary | `/itineraries/:id`, `ItineraryListPage` | Không gọi API | Mock |
| Public view (article/map), Fork, Like, Comment, Share/QR, Check-in | `/public` → `PublicItineraryPage` | Không gọi API: dùng `mockComments`, `lib/fork.ts`, `lib/waypointCheckin.ts` | Mock |
| Discovery feed | `/` → `DiscoveryFeedPage` | Không gọi API: dùng `mockDiscovery` | Mock |

Biến môi trường (chỉ tên): `VITE_API_BASE_URL`.

## 3. API của BE

Nguồn: `tripory_be/API_ENDPOINTS.md` (cập nhật 09/10/2026).
- Response luôn bọc trong `ApiResponse<T>` gồm `status, data, message, errorCode, timestamp`.
- Lỗi map sang HTTP: NotFound→404, Conflict→409, Unauthorized→401, Forbidden→403, còn lại→400.

| Method | Path (`/api/v1`) | Auth | Context |
|---|---|:-:|---|
| POST | `/auth/register`, `/auth/login`, `/auth/refresh-token` | public | identity |
| PUT | `/auth/change-password` | Bearer | identity |
| GET | `/users?search=&limit=50` | public | profile |
| GET | `/users/me` | Bearer | profile / identity |
| PUT | `/users/profile` | Bearer | profile |
| GET | `/chat/conversations` | Bearer | chat |
| POST | `/chat/conversations/{partnerId}` | Bearer | chat |
| GET | `/chat/conversations/{id}/messages?page&pageSize` | Bearer | chat |
| POST | `/chat/conversations/{id}/messages/text` và `/voice` | Bearer | chat |
| POST | `/chat/voice` (multipart, ≤10MB) | Bearer | chat |
| POST | `/chat/conversations/{id}/call-log` | Bearer | chat |
| PUT | `/chat/conversations/{id}/read` | Bearer | chat |
| HUB | `/hubs/chat`: 7 method client→server, 10 event server→client | Bearer | chat |
| POST | `/itineraries` `{title}` → 201 | Bearer | itinerary |
| GET | `/itineraries/mine?pageIndex&pageSize&isPublic` | Bearer | itinerary |
| GET | `/itineraries/{id}` (403 nếu lịch trình chưa public) | public | itinerary |
| PUT / DELETE | `/itineraries/{id}` (metadata, gồm `coverImageUrl` dạng chuỗi) | Bearer | itinerary |
| PUT | `/itineraries/{id}/publish` | Bearer | itinerary |
| POST / PUT / DELETE | `/itineraries/{id}/waypoints[/{waypointId}]` | Bearer | itinerary |
| PUT | `/itineraries/{id}/days/{dayNumber}/reorder-waypoints` và `/subtitle` | Bearer | itinerary |

BE chưa có: fork, like, comment, share, discovery feed, check-in/review, upload ảnh bìa, endpoint cho admin.

## 4. Gap map

| Context | Đích trong tripory_fe | Endpoint BE | Port hay viết lại | Lệch contract / ghi chú |
|---|---|---|---|---|
| Nền HTTP | `packages/api-client` (`httpPackage()`): port `HttpClient`, bản cài đặt bằng `fetch`, bóc `ApiResponse<T>`, chuẩn hóa `ApiError` | Mọi endpoint | Port logic chuẩn hóa lỗi và hàng đợi refresh từ `apiClient.ts`, viết lại bằng fetch | ESLint cấm `localStorage`/`window` ở api-client, nên không bê nguyên axios + localStorage sang được |
| identity | `packages/identity` (rút gọn: domain session, infra auth http) + `apps/web/src/app/api/auth/*` (route handler đặt cookie) + `composition/identity.{client,server}.ts` | `/auth/*`, `/users/me` | Viết lại cách lưu token, port schema Zod `schemas/auth.schema.ts` | Body refresh cần `{accessToken, refreshToken}` (suy ra từ `apiClient.ts`; chưa xem DTO của BE) |
| shared-kernel | `UserId`, `ItineraryId` (branded), `Wgs84Coordinate` | — | Viết mới | — |
| itinerary (core) | `packages/itinerary`, đủ 4 tầng; UI ở `apps/web/src/modules/itinerary/ui`; route `(dashboard)/itineraries/[id]/edit`, `(public)/itineraries/[id]` | 11 endpoint `/itineraries` | Viết lại phần dữ liệu. Có thể port component trình bày (Timeline, SortableWaypoint, PublishModal) sau khi đổi sang type của domain mới | Không tự tính quãng đường: dùng `TotalDistanceKm`/`DayDistanceKm` do BE trả (mục 9 tài liệu kiến trúc). Ảnh bìa chỉ gửi URL vì chưa có upload |
| maps | `packages/maps` (port `PlaceSearch`, adapter Mapbox Geocoding) + Mapbox GL JS ở UI web | Không qua BE | Viết mới: FE cũ tự vẽ bản đồ, không dùng Mapbox | Cần Mapbox token (`NEXT_PUBLIC_MAPBOX_TOKEN`). Không lưu `mapbox_id` |
| profile | `packages/profile` (rút gọn: infra + react) | `/users/me`, `PUT /users/profile`, `GET /users`, `/itineraries/mine` (app ghép ở UI) | Port từ `userService.ts`, `schemas/user.schema.ts`, `components/profile/*` | Tab trip lấy từ itinerary qua app, không import chéo package |
| chat | `packages/chat` (domain: state machine cuộc gọi, optimistic message); adapter SignalR và WebRTC đặt ở app | 8 REST + hub | Port nhiều nhất: `chatService.ts`, `signalRService.ts`, `webrtcService.ts`, `realtimeChat.ts` | Allowlist chưa có `@microsoft/signalr`, và WebRTC dùng browser global → đặt adapter realtime trong `apps/web/src/composition` hoặc `modules/chat`. Nếu muốn đưa vào package thì đó là một quyết định kiến trúc (sửa `boundaries.mjs`), không phải nới rule cho qua lint. Hub ở web cần token: cookie httpOnly không truyền được vào `accessTokenFactory` → cần cách cấp token (xem mục 6) |
| social, discovery, fork, check-in | Chưa tạo package | Chưa có ở BE | Giữ mock ở UI hoặc hoãn lại | Chờ BE. Fork đặt ở `itinerary` hay `Social` vẫn đang chờ chốt với BE (tài liệu kiến trúc mục 2) |
| ui-web, design-tokens | `packages/ui-web`, `packages/design-tokens` | — | Port `lib/colors.ts` và class Tailwind 3 của FE cũ, chuyển sang Tailwind 4 (`@theme`) | Component dùng từ Server Component phải export các phần con bằng named export |

## 5. Lộ trình

| Phase | Mục tiêu | Package / file chính | Effort | Nghiệm thu |
|---|---|---|:-:|---|
| 0a | Khung UI (ưu tiên theo yêu cầu user) | `design-tokens` (port `lib/colors.ts` sang Tailwind 4 `@theme`), `ui-web` (Button, Dialog, Input…), route group `(public)`, `(dashboard)` với trang placeholder cho mọi route của FE cũ, layout + header. Menu user tạm là slot tĩnh (chưa có session), nối thật ở 0c. `QueryClientProvider` để sẵn | M | `pnpm build` xanh, các route khung render được, `pnpm lint typecheck test` xanh |
| 0b | Nền HTTP + kernel | `shared-kernel/src/{ids,geo}.ts`; `api-client/src/{http-client.ts,fetch-http-client.ts,api-response.ts,api-error.ts}`; thêm `zod` vào catalog | M | Unit test bóc envelope, map lỗi 4xx, refresh một lần cho nhiều request song song; `pnpm lint typecheck test` xanh |
| 0c | Identity + session | `packages/identity`; `apps/web/src/app/api/auth/{login,logout,refresh}/route.ts` (cookie httpOnly); `composition/identity.{client,server}.ts`; `proxy`/middleware chặn route dashboard; `.env.example` (`API_BASE_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`); nối menu user trong header với session thật | M | Đăng nhập/đăng xuất chạy với BE local, access token hết hạn thì tự refresh, JS không đọc được cookie |
| 1 | Itinerary: CRUD và editor | `itinerary` domain (`canEdit`, `canPublish`, số ngày), use case (`addWaypoint`, `reorderWaypoints`, `publishItinerary`), infra Zod + mapper, hooks; UI timeline + dnd-kit; trang `/itineraries/mine` | L | Tạo nháp → thêm/sửa/xóa waypoint → reorder → đặt subtitle → publish, tất cả với BE thật; có test domain và use case bằng fake repo |
| 2 | Maps + public view | `packages/maps` (`PlaceSearch` Mapbox), bản đồ Mapbox GL JS ở web; `(public)/itineraries/[id]` render bằng Server Component (SEO) | M | Tìm địa điểm rồi thêm thành waypoint; trang public của lịch trình đã xuất bản xem được khi chưa đăng nhập, lịch trình nháp trả 403 thì hiện trang lỗi |
| 3 | Profile + users directory | `packages/profile`; `/profile`, `/users`; modal sửa profile, đổi mật khẩu | S | Sửa profile lưu xuống BE; tab trip hiện dữ liệu `/mine` |
| 4 | Chat realtime | `packages/chat` (domain + application); adapter SignalR/WebRTC ở app; `/messages/[id]`; thẻ itinerary trong tin nhắn | L | Gửi/nhận text và voice realtime, đánh dấu đã đọc, gọi thoại giữa 2 tab |
| 5+ | Social, Discovery, Fork, Check-in | Package mới khi BE có endpoint | L | Theo spec của từng module |

## 6. Quyết định kỹ thuật

- **Contract: viết tay Zod hay sinh từ OpenAPI.** Đề xuất: viết tay Zod trong `infrastructure/` ngay bây giờ. Thêm `packages/api-contract` (openapi-typescript sinh từ `/swagger/v1/swagger.json`) ở Phase 1 để chỉ dùng type khi typecheck. Khi đó Zod đóng vai trò kiểm tra lúc chạy, type sinh ra dùng để bắt lệch contract khi BE đổi. Hướng này khớp với mục 3 của tài liệu kiến trúc.
- **TanStack Query hay Server Components.** Đề xuất kết hợp cả hai:
  - Trang public và SEO (`/itineraries/[id]`, discovery) dùng Server Component, lấy dữ liệu qua `composition/*.server.ts`.
  - Editor, chat, profile dùng TanStack Query qua hooks `react/` của package, vì đây là những màn tương tác nhiều và cần optimistic update.
  - Có thể prefetch rồi hydrate khi cần.
- **Nơi lưu token.** Đề xuất: refresh token (và access token) đặt trong cookie httpOnly, do route handler của Next đặt. Request REST từ client đi qua proxy `/api/bff/*`, hoặc `rewrites` sang BE kèm header gắn ở route handler.
  - Riêng SignalR cần chuỗi token: thêm route `GET /api/auth/token` trả access token ngắn hạn cho `accessTokenFactory`.
  - Không dùng localStorage như FE cũ, vì dễ lộ token qua XSS và ESLint đã chặn trong package.
  - Suy luận: cần BE bật CORS/credentials, hoặc đi qua proxy cùng origin. Chưa kiểm tra cấu hình CORS của BE.
- **Bản đồ.** Đề xuất: Mapbox GL JS (`react-map-gl`) thay cho bản đồ tự vẽ của FE cũ, vì tài liệu kiến trúc đã chọn Mapbox.

## 7. Câu hỏi mở

## 8. Quyết định đã chốt (user, 09/10/2026)

- Lộ trình: Khung UI làm đầu tiên (Phase 0a), sau đó api-client (0b), identity (0c).
- Hoàn thành Phase 1 (Itinerary) trước rồi mới làm Chat.
- Chưa có Mapbox token: tạm giữ bản đồ SVG của FE cũ (`lib/projection.ts`, `MapGrid`). Phase 2 port bản đồ SVG thay cho Mapbox GL JS; `packages/maps` (Mapbox Geocoding) hoãn cho tới khi có token. Cần cách thêm waypoint không qua geocoding (click trên bản đồ hoặc nhập tọa độ), chi tiết chốt ở Phase 1/2.
- Fork, Social, Discovery, Check-in: chờ BE, không dựng mock.
- `apps/admin`: không nằm trong phạm vi lần hoàn thiện này.
- Auth: BFF proxy cùng origin. Token (access + refresh) nằm trong cookie httpOnly do route handler Next đặt; client gọi `/api/...` của Next, route handler gắn Bearer rồi chuyển tiếp sang BE. SignalR lấy token ngắn hạn qua `GET /api/auth/token`.
- Còn mở: câu 5 (vị trí Fork, không gấp vì đang chờ BE).
