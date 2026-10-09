# Stack Research

**Domain:** Web app lập/chia sẻ lịch trình du lịch + chat realtime và gọi thoại (Next.js BFF trên Vercel, BE .NET riêng)
**Researched:** 2026-10-09
**Confidence:** MEDIUM-HIGH (version tra trực tiếp npm registry ngày 2026-10-09; hành vi lấy từ docs chính chủ; phần hosting BE và giá cả là MEDIUM/LOW)

## Kết luận nhanh

- Thêm vào catalog: `@tanstack/react-query` 5.104.1, `zod` 4.6.5, `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0, `@microsoft/signalr` 10.0.11, `react-hook-form` 7.89.0 + `@hookform/resolvers` 5.9.1, bộ shadcn trên Base UI (`@base-ui/react` 1.8.0, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react`, `sonner`), `@playwright/test` 1.64.0. Ghi âm, WebRTC và BFF proxy dùng API native, không thêm thư viện.
- TURN: dùng **Cloudflare Realtime TURN**. Mỗi tháng miễn phí 1.000 GB, sau đó $0,05/GB. Credential ngắn hạn được mint qua một REST call từ route handler. Phương án dự phòng là coturn tự chạy, dùng HMAC.
- Hosting BE (chỉ tư vấn): một **VPS nhỏ chạy docker compose** (API + `postgis/postgis:16-3.4` + Caddy), khoảng €5–6/tháng. Nếu bắt buộc $0 thì dùng Render Free + Neon Free, nhưng phải chấp nhận cold start khoảng 1 phút và mất file voice.
- Có ba rủi ro cần xử lý sớm, không để tới Phase 4:
  1. Vercel chưa chính thức hỗ trợ pnpm 11.
  2. `cacheComponents: true` có thể prerender các GET route handler (token, ICE servers).
  3. Theo đọc code, BE sẽ từ chối MIME `audio/webm;codecs=opus` mà Chrome tạo ra.

## Recommended Stack

### Core Technologies (đã chốt, chỉ xác nhận version/compat)

| Technology | Version | Purpose | Ghi chú cho milestone | Confidence |
|---|---|---|---|---|
| Next.js | 16.4.0 (npm latest) | App Router, BFF route handlers, `proxy.ts` | `apps/web/next.config.ts` đang bật `cacheComponents: true` và `partialPrefetching: true`. Khi đó GET route handler đi theo mô hình prerender như page ([Next docs: Cache Components](https://nextjs.org/docs/app/getting-started/cache-components)). Từ Next 16, `middleware.ts` đổi tên thành `proxy.ts` và chạy trên Node runtime ([Next: middleware-to-proxy](https://nextjs.org/docs/messages/middleware-to-proxy)) | HIGH |
| React | 19.3.0 (npm latest) | UI | Mọi thư viện đề xuất bên dưới đều khai báo peer `^19` hoặc rộng hơn | HIGH |
| TypeScript | 5.9.3 | Typecheck | Giữ nguyên | HIGH |
| Tailwind CSS | 4.3.3 (+ `@tailwindcss/turbopack` 4.3.3) | Styling, `@theme` cho design tokens | Tailwind không quét `node_modules`/workspace symlink, nên `apps/web/src/app/globals.css` phải khai báo `@source "../../../../packages/ui-web/src";` ([Tailwind: detecting classes](https://tailwindcss.com/docs/detecting-classes-in-source-files)) | HIGH |
| pnpm | 11.6.0 | Workspace + `catalog:` | **Rủi ro deploy:** docs Vercel chỉ liệt kê pnpm 6–10 ([Vercel: package managers](https://vercel.com/docs/package-managers)), và đang có issue mở về pnpm 11 ([vercel#17434](https://github.com/vercel/vercel/issues/17434)). Lockfile của repo là `lockfileVersion: '9.0'` | MEDIUM |
| Turborepo | 2.11.7 | Task runner | Strict env mode: biến nào cần lúc `build` phải khai báo trong `turbo.json` (`tasks.build.env`) | MEDIUM |
| Vitest | 4.1.11 | Unit test (env `node`) | Vitest 5.0.3 yêu cầu `@types/node ^22 \|\| >=24` và Node `^22.12 \|\| ^24` (npm registry). Xem mục Node bên dưới | HIGH |
| Node.js | 24.x (local 24.14.1) | Runtime build/functions | Từ 2026-10-01, Vercel tắt Node 20 ([Vercel changelog](https://vercel.com/changelog/node-js-20-is-being-deprecated)). Catalog đang pin `@types/node` 20.19.43, chỉ lệch về type. Có thể nâng `@types/node` 24.19.1 cùng Vitest 5 thành một việc riêng | HIGH |

### Thư viện thêm cho milestone

| Library | Version | Đặt ở đâu (theo ESLint boundaries) | Mục đích | Phase | Confidence |
|---|---|---|---|---|---|
| `@tanstack/react-query` | 5.104.1 | `peerDependencies` + `devDependencies` trong `packages/<ctx>` (tầng `react/`, đã có trong allowlist); `dependencies` trong `apps/web` | Cache server state, mutation, optimistic update, prefetch/hydrate RSC | 0a (provider), 1+ | HIGH |
| `@tanstack/react-query-devtools` | 5.104.1 | `apps/web` (dev only) | Debug cache | 0a | HIGH |
| `zod` | 4.6.5 | Tầng `infrastructure/` của context (đã có trong allowlist); `apps/web` (env, input của BFF, form) | Parse DTO lúc chạy (ACL); validate env và form | 0b/0c | HIGH |
| `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` | 6.3.1 / 10.0.0 / 3.2.2 | `apps/web/src/modules/itinerary/ui` | Kéo thả sắp xếp waypoint trong ngày (có keyboard sensor). FE cũ dùng đúng bộ này nên port được `SortableWaypoint` | 1 | MEDIUM |
| `@microsoft/signalr` | 10.0.11 | Chỉ `apps/web` (`composition/` hoặc `modules/chat`), vì allowlist của package context không có thư viện này | Client hub `/hubs/chat`. Khớp major với BE (`net10.0`, JwtBearer 10.0.11) | 4 | HIGH |
| `react-hook-form` + `@hookform/resolvers` | 7.89.0 + 5.9.1 | `apps/web/src/modules/*/ui` | Form đăng nhập/đăng ký, đổi mật khẩu, profile, waypoint, metadata lịch trình. Resolver nhận `zod ^3.25 \|\| ^4` | 0c+ | HIGH |
| shadcn CLI | 4.21.4 (chạy bằng `pnpm dlx`, không phải dependency) | Sinh component vào `packages/ui-web` | Copy component vào repo. Hỗ trợ monorepo và Tailwind 4 (trường `tailwind.config` để trống) ([shadcn: monorepo](https://ui.shadcn.com/docs/monorepo)) | 0a | HIGH |
| `@base-ui/react` | 1.8.0 | `packages/ui-web` | Primitive headless (Dialog, Popover, Menu, Tabs…). Mặc định của shadcn từ 07/2026 ([shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)) | 0a | HIGH |
| `class-variance-authority` / `clsx` / `tailwind-merge` | 0.7.1 / 2.1.1 / 3.7.0 | `packages/ui-web` | Variant + `cn()` của shadcn | 0a | HIGH |
| `tw-animate-css` | 1.4.0 | `packages/ui-web` (CSS) | Animation cho component shadcn trên Tailwind 4 | 0a | MEDIUM |
| `lucide-react` | 1.54.0 | `packages/ui-web`, `apps/web` | Icon. FE cũ dùng 0.475, nên kiểm lại tên icon khi port | 0a | MEDIUM |
| `sonner` | 2.0.8 | `packages/ui-web` | Toast. shadcn đã bỏ `toast` cũ để dùng sonner | 0a | HIGH |
| `server-only` | 0.0.1 (tùy chọn) | `apps/web` | Next tự xử lý import `'server-only'`. Chỉ cài khi lint báo extraneous dependency ([Next docs](https://nextjs.org/docs/app/getting-started/server-and-client-components)) | 0c | HIGH |

**Không thêm thư viện** cho các phần sau, dùng API native:

| Phần | Native API | Lý do |
|---|---|---|
| Ghi âm voice message | `MediaRecorder` | Safari 18.4+ đã ghi được WebM/Opus ([WebKit: Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)) |
| Gọi thoại | `RTCPeerConnection` | Signaling đã có qua hub BE |
| BFF proxy | `fetch` trong route handler | Cần chặn 401 để refresh rồi retry, việc mà `rewrites` không làm được |
| Đọc `exp` của JWT | base64url decode | Không cần verify chữ ký vì BE đã verify. Chỉ khi cần verify mới thêm `jose` 6.2.12 |

### Development Tools

| Tool | Version | Purpose | Notes |
|---|---|---|---|
| `@playwright/test` | 1.64.0 (Node >=20) | E2E smoke trên local và Vercel preview/production | Đặt ở `apps/web/e2e/`, script `test:e2e`, turbo task `e2e` (`cache: false`). Không gộp vào `pnpm test` |
| `jsdom` | **29.1.1** (không dùng 30.x) | DOM cho test hook/component khi thật sự cần | jsdom 30.1.2 yêu cầu Node `^24.15`, trong khi máy local là 24.14.1. Bản 29.1.1 nhận `>=24.0.0` |
| `@testing-library/react` + `@testing-library/dom` | 16.3.3 + 10.4.2 | Test hook `react/` | Allowlist test của tầng `react` hiện chỉ có `react`, `@tanstack/react-query`, `vitest`. Thêm thư viện này nghĩa là sửa `boundaries.mjs` (một quyết định kiến trúc). Ưu tiên test domain/application bằng fake repo |
| `@tanstack/eslint-plugin-query` | 5.104.1 (tùy chọn) | Bắt lỗi query key/deps | Cắm vào preset `base.mjs` nếu dùng |
| `openapi-typescript` | 7.13.0 (hoãn) | `packages/api-contract` sinh type từ swagger | BE chỉ bật Swagger ở `Development` (`Program.cs`), nên phải sinh type từ BE chạy local |

## Chi tiết theo chủ đề

### 1. TanStack Query với App Router (prefetch/hydrate)

Làm theo [TanStack Advanced SSR guide](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) (HIGH):

- `getQueryClient()` dùng chung cho server và client. Trên server, mỗi request tạo client mới; trên browser, giữ một singleton. Đặt `staleTime` lớn hơn 0 (ví dụ 60 s) để query không refetch ngay sau khi hydrate. Từ v5.40, có thể dehydrate cả query đang pending để stream (`shouldDehydrateQuery` cộng thêm điều kiện `status === 'pending'`).
- Server Component chỉ dùng để prefetch (`prefetchQuery` → `<HydrationBoundary state={dehydrate(qc)}>`). Không render kết quả query ở server rồi lại để client refetch, vì hai bên sẽ lệch dữ liệu.
- Không dùng Server Action làm `queryFn`. TanStack ghi rõ Server Action chạy tuần tự nên có thể kẹt query ở trạng thái pending. Client fetch qua route handler (BFF).
- Áp dụng vào kiến trúc: tầng `react/` của package export **query options factory** (`createItineraryQueries(useCases)` trả về `queryOptions({ queryKey, queryFn })`). Nhờ vậy `composition/*.server.ts` (use case đọc `cookies()`) và `composition/*.client.ts` (use case gọi `/api/...`) dùng chung một query key.
- Phạm vi: prefetch/hydrate chỉ cho `(public)/itineraries/[id]` (SEO) và có thể thêm lần tải đầu của editor. Dashboard, chat, profile fetch thuần ở client.
- Với `cacheComponents: true`, prefetch đọc cookie hoặc dữ liệu không cache phải nằm trong `<Suspense>`, nếu không dev overlay báo blocking-route ([Next: Cache Components](https://nextjs.org/docs/app/getting-started/cache-components)). Trang public có thể thử `'use cache'` + `cacheLife`/`cacheTag` sau, khi BFF gọi `revalidateTag` sau mỗi mutation. Milestone này để trang public động cho đơn giản.

```ts
// apps/web/src/composition/query-client.ts
import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query';

const make = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000 },
      dehydrate: { shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === 'pending' },
    },
  });

let browserClient: QueryClient | undefined;
export const getQueryClient = () => (isServer ? make() : (browserClient ??= make()));
```

### 2. Zod 4

- `zod` 4.6.5 (latest). FE cũ đã dùng `zod ^4.6.5`, nên port được `schemas/auth.schema.ts` và `user.schema.ts` vào `infrastructure/` của context tương ứng. HIGH
- `packages/api-client` (`httpPackage()`) chỉ được import `shared-kernel`, không có `zod`. Việc bóc envelope `ApiResponse<T>` ở đó phải viết type guard tay. Nếu muốn dùng Zod ở api-client thì phải sửa allowlist. Schema DTO cụ thể nằm ở context.
- Trong `apps/web`: một `composition/env.server.ts` parse `process.env` bằng Zod (fail fast lúc khởi động), và validate body ở route handler BFF. Không cần `@t3-oss/env-nextjs`.

### 3. Kéo thả timeline

- Dùng `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0. Peer là `react >=16.8`, cài với React 19.3 không có cảnh báo. Đây là bộ ổn định mà FE cũ đã chạy. MEDIUM
- Chưa dùng `@dnd-kit/react` 0.5.0 (successor):
  - Vẫn là 0.x (npm `latest` 0.5.0, `beta` 0.5.1).
  - Changelog gần nhất có breaking redesign hệ event type ([dnd kit changelog](https://dndkit.com/changelog)).
  - Maintainer chưa công bố lộ trình deprecate `@dnd-kit/core` ([discussion #1842](https://github.com/clauderic/dnd-kit/discussions/1842), chưa có trả lời chính thức).
  - Cân nhắc lại khi ra 1.0.
- Nếu `@dnd-kit/core` gặp lỗi với React 19 StrictMode thì chuyển sang `@atlaskit/pragmatic-drag-and-drop` 4.0.0 (vẫn được cập nhật 09/2026). Thư viện này framework-agnostic nhưng phải tự làm phần accessibility cho sortable list.
- Reorder gửi `PUT /itineraries/{id}/days/{n}/reorder-waypoints` kèm danh sách ID, với optimistic update qua `onMutate` của TanStack. Quãng đường do BE tính, không thêm `@turf/distance`.

### 4. SignalR trong browser

- `@microsoft/signalr` 10.0.11 (`latest`). `next` là 11.0.0-preview. HIGH
- Không dùng `withAuthenticationRefresh`/`refreshAuthentication`: theo docs, chỉ .NET 11 trở lên mới hỗ trợ refresh credential trên kết nối đang mở ([MS Learn: SignalR authn](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz)), còn BE đang ở .NET 10.
- `accessTokenFactory` được gọi trước **mọi** HTTP request của SignalR, kể cả lúc reconnect. Factory này fetch `GET /api/auth/token` (route handler đọc cookie httpOnly, refresh nếu sắp hết hạn) và cache token ở bộ nhớ tới gần `exp`. Mặc định, token hết hạn giữa chừng không làm rớt kết nối WebSocket.
- Trên trình duyệt, token đi qua query string `access_token`. BE đã đọc `access_token` cho path `/hubs/` (`Program.cs`, `OnMessageReceived`).
- Cấu hình nên dùng: `transport: HttpTransportType.WebSockets` + `skipNegotiation: true`. Ba lý do:
  1. Docs Microsoft xác nhận cấu hình này không cần sticky session ([MS Learn: SignalR scale](https://learn.microsoft.com/en-us/aspnet/core/signalr/scale)).
  2. Bỏ được request negotiate, nên không phụ thuộc CORS credentialed.
  3. Mọi trình duyệt mục tiêu đều có WebSocket.
- Chỉ nạp thư viện ở client: `await import('@microsoft/signalr')` trong `useEffect` của provider client (ESLint chỉ cấm `import()` động trong package, app thì được). Gói này kéo theo `ws`, `node-fetch`, `eventsource` cho Node, nên không để nó bị evaluate lúc SSR.
- URL hub để ở biến public `NEXT_PUBLIC_SIGNALR_HUB_URL` (không phải secret). REST đi qua BFF với `API_BASE_URL` (server-only).

```ts
// apps/web/src/modules/chat/... (client only)
const signalR = await import('@microsoft/signalr');
const conn = new signalR.HubConnectionBuilder()
  .withUrl(process.env.NEXT_PUBLIC_SIGNALR_HUB_URL!, {
    accessTokenFactory: getHubToken, // GET /api/auth/token, cache tới gần exp
    transport: signalR.HttpTransportType.WebSockets,
    skipNegotiation: true,
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .build();
```

### 5. WebRTC: không dùng helper library

- Dùng `RTCPeerConnection` native. Không cần `webrtc-adapter` 9.0.6 vì Chrome, Firefox và Safari hiện tại đều theo spec. Không dùng `simple-peer` hay PeerJS (PeerJS cần signaling server riêng, mà BE đã làm signaling qua hub). Không dùng SFU (Cloudflare Realtime SFU, LiveKit) vì chỉ có cuộc gọi 1-1. MEDIUM
- ICE servers lấy từ `GET /api/rtc/ice-servers` ngay trước mỗi cuộc gọi, thay cho STUN Google hard-code của FE cũ (`webrtcService.ts`).
- Hai điểm cần có để TURN thực sự dùng được:
  - **Buffer ICE candidate** đến trước khi gọi `setRemoteDescription`, hoặc trước khi callee bấm nhận. FE cũ gọi `addIceCandidate` lên `peerConnection` null nên candidate bị bỏ.
  - Hỗ trợ `pc.restartIce()`. Cloudflare khuyến nghị ICE restart vì allocation có thể bị gián đoạn ([CF TURN FAQ](https://developers.cloudflare.com/realtime/turn/faq/)).
- Thêm cờ debug để ép `iceTransportPolicy: 'relay'` (qua query param hoặc env preview). Cách này kiểm chứng đường TURN mà không cần hai mạng thật, và E2E cũng dùng nó.

### 6. Voice message: MediaRecorder

| Trình duyệt | Định dạng ghi | Ghi chú | Confidence |
|---|---|---|---|
| Chrome / Edge / Firefox | `audio/webm;codecs=opus` | Chọn bằng `MediaRecorder.isTypeSupported` | HIGH |
| Safari ≥ 18.4 (macOS 15.4 / iOS 18.4) | `audio/webm;codecs=opus` | WebKit thêm ghi WebM/Opus và hỗ trợ Ogg/Opus ([WebKit 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)) | HIGH |
| Safari < 18.4 | chỉ `audio/mp4` (AAC) | Allowlist MIME của BE không có `audio/mp4`, nên upload bị từ chối | HIGH (đọc code BE) |

Các điểm phải làm:

1. **Chuẩn hóa MIME trước khi upload.** `ChatController.AllowedAudioMimeTypes` so khớp nguyên chuỗi `audio/webm`. Theo đọc code, `audio/webm;codecs=opus` (là `MediaRecorder.mimeType` mà Chrome trả về, FE cũ đang gửi nguyên chuỗi này) sẽ trượt khi so khớp. Upload bằng `new Blob(chunks, { type: 'audio/webm' })` với tên file `voice.webm`. Cần kiểm chứng bằng một lần upload thật (MEDIUM).
2. **Thời lượng.** File WebM do MediaRecorder tạo thường không có duration trong header. Đếm giây ở client, gửi `voiceDuration` (API đã có trường này), và player hiển thị theo số của BE thay vì `audio.duration`.
3. **Kích thước.** Upload đi qua BFF trên Vercel, mà Vercel Functions giới hạn body 4,5 MB ([Vercel KB](https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions)), thấp hơn ngưỡng 10 MB của BE. Opus khoảng 32 kbps nên vài phút chỉ vài trăm KB. Đặt giới hạn thời lượng ghi (ví dụ 5 phút) và không ghi WAV.
4. Không cần polyfill (`extendable-media-recorder`, `opus-media-recorder`, RecordRTC). Với Safari < 18.4, hiện thông báo "trình duyệt chưa hỗ trợ ghi âm", hoặc chờ BE nhận thêm `audio/mp4` (phụ thuộc BE).

### 7. UI primitives cho `packages/ui-web`: shadcn trên Base UI, Tailwind 4

- shadcn CLI 4.21.4 + Base UI 1.8.0 (`style: "base-nova"` trong `components.json`):
  - Base UI là mặc định cho project mới từ 07/2026.
  - Radix vẫn được hỗ trợ đầy đủ (`shadcn init -b radix`, `radix-ui` 1.7.0).
  - Repo greenfield, FE cũ không dùng Radix, nên đi theo mặc định là ít ma sát nhất.
  - Khác biệt API cần nhớ: `asChild` đổi thành `render`.
  - HIGH (đã hỗ trợ); MEDIUM (lựa chọn tốt hơn Radix).
- Monorepo: mỗi workspace có một `components.json` cùng `style`, `iconLibrary`, `baseColor`. Alias trỏ `@tripory/ui-web/components` thay cho `@workspace/ui` mặc định. Bật `rsc: true` để CLI thêm `'use client'` khi cần. Component nào được Server Component dùng thì export phần con bằng named export (tài liệu kiến trúc mục 9).
- **Việc kiến trúc cần làm ở Phase 0a:** `boundaries.mjs` chưa có preset cho `ui-web`/`design-tokens`, mà self-test bắt mọi package phải nối preset. Cần thêm preset kiểu `uiPackage()` (allowlist: `react`, `react-dom`, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`; cho dùng DOM). Đây là sửa preset có chủ đích, không phải nới rule cho qua lint.
- `design-tokens`: port `lib/colors.ts` sang `@theme` (CSS variables) của Tailwind 4. Không cần `tailwind.config.*`.
- Font tiếng Việt: dùng `next/font/google` với `subsets: ['vietnamese', 'latin']`, chọn font có subset Vietnamese.
- Ảnh bìa (`coverImageUrl` là URL tùy ý): dùng `<img>`, hoặc `next/image` với `unoptimized`, vì không liệt kê trước được `remotePatterns`.

### 8. Form

- Dùng React Hook Form 7.89.0 + `@hookform/resolvers/zod` 5.9.1 trong `apps/web` (FE cũ dùng đúng bộ này). shadcn có hướng dẫn `Field` cho cả RHF lẫn TanStack Form. HIGH
- Không dùng Server Actions/`useActionState` cho form nghiệp vụ. Mutation đi qua hook `useMutation` của package để hook dùng lại được cho mobile; mobile không có Server Action.
- Schema form là luật UX (bắt buộc nhập, độ dài). Không sao chép invariant của BE (tài liệu kiến trúc mục 9).

### 9. E2E với Playwright trên Vercel

- `@playwright/test` 1.64.0. Cypress không mở được hai browser context song song dễ dàng; Playwright làm được, và chat/gọi thoại cần đúng điều đó. HIGH
- Preview deployment có Deployment Protection. Bật **Protection Bypass for Automation**, rồi gửi header `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET` (có thể kèm `x-vercel-set-bypass-cookie`) qua `use.extraHTTPHeaders` ([Vercel docs](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)). Repo ở GitHub (`chipheo1977/tripory_fe`, chưa có `.github/`), nên có thể chạy workflow theo sự kiện `deployment_status`. MEDIUM
- Gọi thoại: Chromium với `--use-fake-ui-for-media-stream` và `--use-fake-device-for-media-stream`, `permissions: ['microphone']`, hai context (caller/callee), ép `relay` để chứng minh TURN chạy. Nghiệm thu "khác mạng" thật vẫn phải test tay giữa hai người (Wi-Fi + 4G).
- Bạn bè dùng URL production. Preview giữ protection.

### 10. TURN: khuyến nghị Cloudflare Realtime TURN

| Provider | Free tier | Giá sau free | Mint credential ngắn hạn | Ghi chú | Kết luận |
|---|---|---|---|---|---|
| **Cloudflare Realtime TURN** | 1.000 GB/tháng (chung với SFU) | $0,05/GB egress ([CF pricing](https://developers.cloudflare.com/realtime/pricing/)) | `POST https://rtc.live.cloudflare.com/v1/turn/keys/{KEY_ID}/credentials/generate-ice-servers`, Bearer API token, body `{ttl}`, trả `iceServers` dùng ngay ([CF docs](https://developers.cloudflare.com/realtime/turn/generate-credentials/)). TTL tối đa 48 h, có API revoke | Anycast toàn cầu, gồm châu Á; có `turns:443` cho mạng chặn UDP; STUN miễn phí, không giới hạn | **Chọn** (HIGH) |
| Metered | 500 MB/tháng ([Metered](https://www.metered.ca/stun-turn)) | Gói $99/150 GB | REST có `expiryInSeconds`, nhưng credential mới cần tới 2 phút để lan ra mạng của họ ([Metered docs](https://www.metered.ca/docs/turn-rest-api/post-create-credential)), nên không mint theo từng cuộc gọi được. Open Relay 20 GB dùng credential tĩnh | Free tier quá nhỏ | Loại |
| Twilio NTS | Không (chỉ có credit trial) | $0,40/GB (US/EU), $0,60/GB (Singapore/Tokyo) ([Twilio pricing](https://www.twilio.com/en-us/stun-turn/pricing)) | `POST /Accounts/{sid}/Tokens.json`, `Ttl` mặc định 86.400 s ([Twilio API](https://static1.twilio.com/docs/stun-turn/api)) | Đắt hơn Cloudflare 8–12 lần | Loại |
| coturn tự chạy | $0 trên VPS sẵn có (trả băng thông VPS) | — | TURN REST (`use-auth-secret` + `static-auth-secret`): `username = "<unixExpiry>:<userId>"`, `credential = base64(HMAC-SHA1(secret, username))`, tính bằng `node:crypto`, không gọi API | Phải mở dải port UDP, có IP public, cert cho `turns`; dễ đụng cổng 443 với Caddy | Dự phòng (MEDIUM) |

Ước lượng: một cuộc gọi Opus khoảng 50 kbps mỗi chiều, nên vài chục MB/giờ. 1.000 GB thừa xa cho vài người quen.

Cách cài đặt:

- Route handler `apps/web/src/app/api/rtc/ice-servers/route.ts` chỉ ghép. Phần mint nằm ở `composition/rtc.server.ts` (`import 'server-only'`).
- Env server-only: `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_KEY_API_TOKEN`. Tuyệt đối không dùng tiền tố `NEXT_PUBLIC_`.
- Bắt buộc có session (đọc cookie), trả `Cache-Control: no-store`, TTL khoảng 7.200 s. Nếu cuộc gọi dài hơn, làm mới bằng `pc.setConfiguration()` (Cloudflare có ghi cách này).
- **Bẫy với `cacheComponents`:** GET handler không chạm runtime API (`cookies()`, `headers()`, `connection()`) có thể bị prerender lúc build, và khi đó mọi người nhận chung một credential. Việc đọc cookie để kiểm tra session vừa là kiểm soát truy cập, vừa giữ route ở dạng động. Áp dụng tương tự cho `GET /api/auth/token`. MEDIUM-HIGH

```ts
// apps/web/src/composition/rtc.server.ts (trích)
import 'server-only';
export async function mintIceServers(ttlSeconds = 7200) {
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${env.CLOUDFLARE_TURN_KEY_ID}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: ttlSeconds }),
      cache: 'no-store',
    },
  );
  if (!res.ok) throw new Error(`TURN mint failed: ${res.status}`);
  return (await res.json()) as { iceServers: RTCIceServer[] };
}
```

### 11. Hosting BE (chỉ tư vấn, ngoài phạm vi repo FE)

**Hiện trạng BE (đọc code, chỉ ghi tên key):**

- `net10.0`; PostgreSQL 16 + **PostGIS 3.4** (`Npgsql.EntityFrameworkCore.PostgreSQL(.NetTopologySuite)` 10.0.3, `docker-compose.yml` dùng `postgis/postgis:16-3.4`).
- Config: `ConnectionStrings:DefaultConnection`, `JwtOptions:{SecretKey,Issuer,Audience,ExpiryMinutes,RefreshTokenExpiryDays}`. `ExpiryMinutes` mặc định 15 trong code.
- SignalR một instance, không có backplane.
- CORS `SetIsOriginAllowed(_ => true)` kèm `AllowCredentials`.
- Voice được ghi vào **đĩa local** `wwwroot/uploads/voices` (`LocalAudioStorageService`), URL dựng từ `Request.Scheme` + `Host`.
- Swagger chỉ bật ở Development.
- Chưa có Dockerfile.

| Phương án | Chi phí | SignalR/WebSocket | DB (PostGIS) | File voice | Cold start | Kết luận |
|---|---|---|---|---|---|---|
| **VPS nhỏ + docker compose** (API + `postgis/postgis:16-3.4` + Caddy tự cấp TLS). Ví dụ Hetzner CX23 khoảng €5,49/tháng chưa gồm IPv4, CAX11 (ARM) khoảng €4,49 ([Hetzner price adjustment 06/2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)); hoặc VPS vùng Singapore nếu người dùng ở VN | ~€5–7/tháng (LOW: giá đã đổi hai lần trong 2026) | Native; một instance nên không cần sticky session | Cùng image với local | Đĩa bền, không phải sửa code BE | Không | **Khuyến nghị** (MEDIUM) |
| Render Free (Docker) + Neon Free | $0 | Có WebSocket. Spin down sau 15 phút không có traffic inbound, khoảng 1 phút để dậy; 750 giờ/tháng; tối đa một instance ([Render free](https://render.com/docs/free)) | **Neon** Free: 0,5 GB, scale-to-zero sau 5 phút, có PostGIS ([Neon](https://neon.com/faqs/managed-postgres-databases-free-tier), [Neon PostGIS](http://neon.tech/docs/extensions/postgis)). Không dùng Render Postgres Free (hết hạn sau 30 ngày) | **Filesystem tạm**, mất mỗi lần spin down hoặc redeploy. BE phải chuyển voice sang object storage | Có | Dự phòng nếu bắt buộc $0 (MEDIUM) |
| Railway | Free $1 credit/tháng; Hobby $5/tháng gồm $5 usage ([Railway pricing](https://docs.railway.com/pricing)) | Có | Image PostGIS hoặc template (LOW) | Có volume | Không (Hobby) | Được nếu thích PaaS; chi phí có thể vượt $5 (LOW) |
| Fly.io | Tài khoản mới không có free allowance (LOW, nguồn thứ cấp) | Có | Tự chạy Postgres trên Machine + volume | Có volume | Tùy chọn auto-stop | Nhiều việc vận hành hơn VPS mà không rẻ hơn |
| Azure App Service F1 | $0 | Linux Free tối đa 5 kết nối WebSocket ([MS Q&A](https://learn.microsoft.com/en-us/answers/questions/892666/azure-app-service-web-app-websockets-enable-disabl)); 60 phút CPU/ngày, vượt là 403 ([MS Learn](https://learn.microsoft.com/en-us/azure/app-service/web-sites-monitor)) | Không kèm DB | — | Có | **Loại** |

Oracle Always Free (A1 ARM) đã giảm còn 2 OCPU/12 GB từ 15/06/2026, và có báo cáo về việc instance bị thu hồi/disable ([InfoQ](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/)). Phương án này $0 nhưng rủi ro, LOW.

Ảnh hưởng tới SignalR:

- Một instance kết hợp `skipNegotiation` + WebSockets thì không cần sticky session.
- Trên Render Free, keep-alive mặc định 15 s của client tính là traffic inbound, nên service tự thức khi có người mở app. Người đầu tiên sau 15 phút yên lặng phải chờ khoảng 1 phút.
- Đặt BE và **Vercel Functions** cùng vùng. Vùng mặc định của Vercel là `iad1`, và mọi plan đều chọn được vùng ([Vercel regions](https://vercel.com/guides/choosing-deployment-regions)). Mỗi request REST đi browser → function → BE, nên lệch vùng sẽ nhân đôi độ trễ.

Checklist chuyển cho repo BE (FE chỉ cần URL, đây là phụ thuộc ngoài):

1. URL HTTPS công khai; `wss://` cho `/hubs/chat`.
2. `UseForwardedHeaders` (X-Forwarded-Proto), để URL voice trả về là `https` và không dính mixed content.
3. Nhận `audio/webm` có tham số codecs (so khớp phần MIME gốc) và cân nhắc nhận thêm `audio/mp4`.
4. Lưu trữ bền cho `uploads/voices`.
5. Thu hẹp CORS về domain production + preview của Vercel. Hiện tại cho mọi origin kèm credentials: chạy được nhưng lỏng.
6. Có Dockerfile.

### 12. Những điều cần biết khi deploy Vercel

- **pnpm 11:** Vercel đọc `lockfileVersion: '9.0'` và có thể cài bằng pnpm 9/10. pnpm 10 đọc `packageManager: pnpm@11.6.0` thì có thể tự chuyển phiên bản, nhưng đã có báo lỗi ([vercel#17434](https://github.com/vercel/vercel/issues/17434)). Làm **deploy smoke ngay ở Phase 0a**. Nếu hỏng, thử theo thứ tự:
  1. Env `ENABLE_EXPERIMENTAL_COREPACK=1` (Corepack vẫn có trong Node 24).
  2. Override Install Command thành `npx -y pnpm@11.6.0 install --frozen-lockfile`.

  LOW, cần kiểm chứng.
- Root Directory là `apps/web`. Node.js 24.x đặt trong Project Settings hoặc `engines`.
- Env (chỉ tên):

  | Biến | Phạm vi |
  |---|---|
  | `API_BASE_URL` | server |
  | `NEXT_PUBLIC_SIGNALR_HUB_URL` | public |
  | `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_KEY_API_TOKEN` | server |
  | `VERCEL_AUTOMATION_BYPASS_SECRET` | hệ thống, cho CI |

  Biến nào đọc lúc build phải khai báo trong `turbo.json`.
- Body request vào function tối đa 4,5 MB, ảnh hưởng tới upload voice qua BFF (xem mục 6).

## Installation

Khai báo version một lần trong `pnpm-workspace.yaml` (`catalog:`), rồi ghi `"catalog:"` vào `package.json` của từng nơi dùng và chạy `pnpm install` từ gốc.

```yaml
# pnpm-workspace.yaml (thêm vào catalog)
catalog:
  "@tanstack/react-query": 5.104.1
  "@tanstack/react-query-devtools": 5.104.1
  zod: 4.6.5
  "@microsoft/signalr": 10.0.11
  "@dnd-kit/core": 6.3.1
  "@dnd-kit/sortable": 10.0.0
  "@dnd-kit/utilities": 3.2.2
  react-hook-form: 7.89.0
  "@hookform/resolvers": 5.9.1
  "@base-ui/react": 1.8.0
  class-variance-authority: 0.7.1
  clsx: 2.1.1
  tailwind-merge: 3.7.0
  tw-animate-css: 1.4.0
  lucide-react: 1.54.0
  sonner: 2.0.8
  "@playwright/test": 1.64.0
  # chỉ khi cần test hook/component có DOM:
  jsdom: 29.1.1
  "@testing-library/react": 16.3.3
  "@testing-library/dom": 10.4.2
```

```bash
# Sinh component shadcn (chạy trong apps/web sau khi có components.json ở cả hai workspace)
pnpm dlx shadcn@4.21.4 add button dialog input
# Trình duyệt cho Playwright
pnpm --filter @tripory/web exec playwright install chromium
```

## Alternatives Considered

| Recommended | Alternative | Khi nào chọn alternative |
|---|---|---|
| shadcn + Base UI | shadcn + Radix (`radix-ui` 1.7.0, `-b radix`) | Khi cần block/ví dụ bên thứ ba chỉ có bản Radix |
| shadcn + Base UI | React Aria Components 1.22.0 | Khi ưu tiên accessibility/i18n sâu hơn tốc độ dựng UI |
| `@dnd-kit/core` 6.3.1 | `@dnd-kit/react` 0.5.x | Khi đã ra 1.0, hoặc cần kéo giữa nhiều danh sách với API mới |
| `@dnd-kit/core` 6.3.1 | `@atlaskit/pragmatic-drag-and-drop` 4.0.0 | Khi dnd-kit core lỗi với React 19.3 |
| React Hook Form | TanStack Form 1.33.5 | Khi muốn đồng bộ hệ TanStack; số form ít nên không đáng đổi |
| Cloudflare TURN | coturn trên VPS | Khi không muốn phụ thuộc tài khoản Cloudflare hoặc đã có VPS cho BE |
| VPS cho BE | Render Free + Neon Free | Khi bắt buộc $0 và BE chịu chuyển voice sang object storage |
| `jsdom` 29.1.1 | `happy-dom` 20.14.6 | Khi cần test DOM nhanh hơn và chấp nhận khác biệt nhỏ so với spec |

## What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| axios + localStorage token (FE cũ) | ESLint chặn `localStorage` ở api-client; token httpOnly đã chốt | `fetch` qua BFF, cookie httpOnly |
| `@tanstack/react-query-next-experimental` | Chỉ phẳng waterfall ở lần tải đầu, điều hướng sau vẫn bị waterfall (TanStack docs) | Prefetch trong RSC + `HydrationBoundary` |
| Server Action làm `queryFn` | Chạy tuần tự, query có thể kẹt pending (TanStack docs) | Route handler `/api/...` |
| `@microsoft/signalr` 11 preview / `withAuthenticationRefresh` | Cần server .NET 11 | 10.0.11 + `accessTokenFactory` |
| STUN Google hard-code, credential TURN tĩnh (Open Relay) | Không qua được NAT đối xứng hoặc 4G; lộ secret | `/api/rtc/ice-servers` mint qua Cloudflare |
| Twilio NTS, Metered free | Đắt hoặc free quá nhỏ; Metered mất tới 2 phút để credential có hiệu lực | Cloudflare Realtime TURN |
| `simple-peer`, PeerJS, `webrtc-adapter` | Thêm lớp không cần; signaling đã có ở hub | `RTCPeerConnection` native |
| `extendable-media-recorder`, `opus-media-recorder`, RecordRTC, ghi WAV | Safari 18.4+ đã ghi WebM/Opus; WAV vượt 4,5 MB rất nhanh | `MediaRecorder` native với `audio/webm;codecs=opus` |
| Mapbox GL / `react-map-gl` / `@turf/distance` | Chưa có token; quãng đường do BE tính | Bản đồ SVG port từ FE cũ, hiển thị `TotalDistanceKm`/`DayDistanceKm` của BE |
| shadcn `toast` cũ, `tailwindcss-animate` | Đã bị thay ở bản Tailwind 4 của shadcn | `sonner`, `tw-animate-css` |
| `jsdom` 30.x | Yêu cầu Node ^24.15; local là 24.14.1 | `jsdom` 29.1.1, hoặc nâng Node |
| MSW 3.x (ở milestone này) | Kiến trúc test bằng fake repo và tiêm `fetch` | Fake `HttpClient`/repository |
| Auth.js / NextAuth | BE tự cấp JWT access + refresh; FE chỉ bọc adapter (kiến trúc mục 2) | Route handler BFF đặt cookie |
| Azure App Service F1 cho BE | Tối đa 5 WebSocket, 60 phút CPU/ngày, không có DB | VPS hoặc Render + Neon |
| Render Postgres Free | Hết hạn sau 30 ngày, không có backup | Neon Free hoặc Postgres trên VPS |

## Stack Patterns by Variant

**Nếu BE chạy trên VPS cùng vùng với người dùng (khuyến nghị):**
- Đặt region của Vercel Functions gần VPS; SignalR dùng `wss://<api-domain>/hubs/chat`.
- Có thể chạy coturn cùng máy làm dự phòng TURN, nhưng mặc định vẫn dùng Cloudflare.

**Nếu BE chạy trên Render Free:**
- Hiển thị trạng thái "đang kết nối…" đủ lâu (khoảng 60 s) cho lần reconnect đầu; tăng các mốc `withAutomaticReconnect`.
- Voice message chỉ bền khi BE đã chuyển sang object storage. Trước đó, coi voice là tính năng có thể mất dữ liệu.

**Nếu người dùng ở Safari < 18.4:**
- Gọi thoại vẫn chạy; ghi voice thì hiện thông báo không hỗ trợ cho tới khi BE nhận `audio/mp4`.

## Version Compatibility

| Package A | Compatible With | Notes |
|---|---|---|
| `@tanstack/react-query@5.104.1` | `react ^18 \|\| ^19` | OK với 19.3.0 |
| `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0` | `react >=16.8`, sortable cần core `^6.3.0` | Bản publish cuối là 12/2024 (chế độ bảo trì); kiểm chứng với StrictMode ở Phase 1 |
| `@base-ui/react@1.8.0` | `react ^17 \|\| ^18 \|\| ^19` | `date-fns`, `@date-fns/tz` là optional peer |
| `@hookform/resolvers@5.9.1` | `react-hook-form ^7.55`, `zod ^3.25 \|\| ^4` | OK với zod 4.6.5 |
| `@testing-library/react@16.3.3` | React 19, `@testing-library/dom ^10` | Cài kèm `@testing-library/dom` 10.4.2 |
| `jsdom@30.1.2` | Node `^22.22.2 \|\| ^24.15.0 \|\| >=26` | **Không** chạy chính thức trên Node 24.14.1; dùng 29.1.1 |
| `vitest@4.1.11` | `@types/node ^20 \|\| ^22 \|\| >=24` | Vitest 5.0.3 cần `@types/node ^22 \|\| >=24` và Node `^22.12 \|\| ^24`; khi nâng thì đưa `@browser`/`@vitest/*` lên cùng major |
| `@microsoft/signalr@10.0.11` | ASP.NET Core 10 (BE `net10.0`) | Không nâng lên 11 trước BE |
| `next@16.4.0` | Node `>=20.9` | Vercel đã tắt Node 20; dùng 24.x |
| pnpm 11.6.0 | Vercel (docs ghi pnpm 6–10) | Deploy smoke sớm |

## Gaps / Cần kiểm chứng

- Thư mục `apps/web/node_modules/next/dist/docs/` hiện có 41 thư mục con nhưng **0 file**, nên AGENTS.md không làm theo được. Phần Next ở đây dựa trên nextjs.org (cập nhật 06/10/2026). Nên cài lại `next` (ví dụ `pnpm install --force`) trước khi code Phase 0a.
- BE từ chối `audio/webm;codecs=opus`: kết luận đến từ đọc code (so khớp nguyên chuỗi), chưa chạy thử.
- Cloudflare Realtime: chưa xác minh việc tạo TURN key ở gói free có đòi phương thức thanh toán hay không.
- Vercel với pnpm 11.6.0: chưa deploy thử.
- Giá VPS, Railway, Fly đổi thường xuyên (Hetzner đổi hai lần trong 2026): kiểm lại khi mua.
- Safari dưới 18.4 phát WebM/Opus do Chrome ghi: chưa xác minh (LOW).

## Sources

- npm registry (`npm view`, 2026-10-09): version, peerDependencies, engines và dist-tags của mọi package nêu trên. HIGH
- [TanStack Query: Advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr): `getQueryClient`, dehydrate query pending, cảnh báo về Server Action. HIGH
- [Next.js: Cache Components](https://nextjs.org/docs/app/getting-started/cache-components), [route.js](https://nextjs.org/docs/app/api-reference/file-conventions/route), [server/client components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [middleware → proxy](https://nextjs.org/docs/messages/middleware-to-proxy). HIGH
- [Tailwind: detecting classes / `@source`](https://tailwindcss.com/docs/detecting-classes-in-source-files). HIGH
- [shadcn: monorepo](https://ui.shadcn.com/docs/monorepo), [Base UI default (07/2026)](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default). HIGH
- [dnd kit changelog](https://dndkit.com/changelog), [discussion #1842](https://github.com/clauderic/dnd-kit/discussions/1842). MEDIUM
- [MS Learn: SignalR authn/authz](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz), [scale/sticky sessions](https://learn.microsoft.com/en-us/aspnet/core/signalr/scale), [configuration](https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration). HIGH
- [WebKit: Safari 18.4 features](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/): MediaRecorder WebM/Opus. HIGH
- [Cloudflare TURN: generate credentials](https://developers.cloudflare.com/realtime/turn/generate-credentials/), [FAQ](https://developers.cloudflare.com/realtime/turn/faq/), [pricing](https://developers.cloudflare.com/realtime/pricing/). HIGH
- [Twilio NTS pricing](https://www.twilio.com/en-us/stun-turn/pricing), [Twilio Tokens API](https://static1.twilio.com/docs/stun-turn/api), [Metered plans](https://www.metered.ca/stun-turn), [Metered create credential](https://www.metered.ca/docs/turn-rest-api/post-create-credential). MEDIUM-HIGH
- [Vercel: package managers](https://vercel.com/docs/package-managers), [vercel#17434](https://github.com/vercel/vercel/issues/17434), [Node 20 deprecation](https://vercel.com/changelog/node-js-20-is-being-deprecated), [body limit 4,5 MB](https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions), [regions](https://vercel.com/guides/choosing-deployment-regions), [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation). HIGH/MEDIUM
- [Render free](https://render.com/docs/free), [Neon free plan](https://neon.com/faqs/managed-postgres-databases-free-tier), [Neon PostGIS](http://neon.tech/docs/extensions/postgis), [Railway pricing](https://docs.railway.com/pricing), [Azure App Service quotas](https://learn.microsoft.com/en-us/azure/app-service/web-sites-monitor), [Azure Free WebSocket limit](https://learn.microsoft.com/en-us/answers/questions/892666/azure-app-service-web-app-websockets-enable-disabl), [Hetzner price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [InfoQ: Oracle free tier](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/). MEDIUM (giá: LOW)
- Code nội bộ (chỉ đọc): `tripory_be` (`Program.cs`, `*.csproj`, `ChatController.cs`, `LocalAudioStorageService.cs`, `docker-compose.yml`, tên key trong `appsettings.json`); `tripory` (`signalRService.ts`, `webrtcService.ts`, `chatService.ts`, `VoiceRecorder.tsx`, `package.json`); `tripory_fe` (`boundaries.mjs`, `next.config.ts`, `pnpm-workspace.yaml`, `turbo.json`). HIGH

Nội dung từ nguồn web đã được diễn đạt lại để tuân thủ giới hạn bản quyền.

---
*Stack research for: Tripory FE (Next.js 16.4 BFF + SignalR + WebRTC/TURN trên Vercel)*
*Researched: 2026-10-09*
