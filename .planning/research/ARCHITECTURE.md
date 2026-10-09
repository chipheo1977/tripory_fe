# Architecture Research

**Domain:** Web app lập và chia sẻ lịch trình du lịch (Next.js 16 BFF + backend .NET riêng, chat realtime SignalR, gọi thoại WebRTC/TURN)
**Researched:** 2026-10-09
**Confidence:** MEDIUM-HIGH (Next.js, Vercel, SignalR, Cloudflare TURN đối chiếu docs chính chủ; hành vi BE đọc trực tiếp từ code `tripory_be`; một số điểm runtime chưa chạy thử được đánh dấu riêng)

> Ghi chú nguồn: thư mục docs cục bộ `apps/web/node_modules/next/dist/docs/` hiện **chỉ có thư mục rỗng** (0 file .md), và `node_modules/next/dist/server` cũng không có file nào ở cấp gốc, `dist/bin/next` không tồn tại. Bản cài Next có vẻ không đầy đủ. Vì vậy mọi điểm về Next.js dưới đây được đối chiếu với nextjs.org (các trang cập nhật 2026, khớp nhánh 16.x). Nên chạy lại `pnpm install` và kiểm tra docs cục bộ trước khi bắt đầu Phase 0a.

## Kết luận trước

1. **Một điểm duy nhất được phép xoay vòng refresh token: `POST /api/auth/refresh`, và chỉ client gọi nó, tuần tự hóa bằng Web Locks.** BE xoay refresh token và coi việc dùng lại token cũ là bị xâm phạm (`RefreshTokenCommandHandler`: token đã revoke → `RevokeAllRefreshTokens` → `Token.Compromised`). Hai request refresh song song với cùng refresh token sẽ đăng xuất người dùng khỏi mọi thiết bị. Vì vậy `proxy.ts`, Server Component và BFF proxy **không bao giờ** tự refresh. (HIGH, đọc từ code BE)
2. **BFF = Route Handler catch-all `app/api/bff/[...path]/route.ts`**, không dùng `rewrites`. Rewrites không gắn được `Authorization` lấy từ cookie httpOnly. Route Handler cho phép allowlist path, kiểm tra Origin, rút gọn 401 và đặt function cùng region với BE. (HIGH)
3. **Server Component gọi thẳng BE** qua `apps/web/src/composition/*.server.ts` (đọc `await cookies()`, gắn Bearer), không đi vòng qua `/api/bff`. Docs Next khuyên fetch từ nguồn trực tiếp, vì gọi Route Handler từ RSC thêm một round trip và làm hỏng build khi prerender. Với `cacheComponents: true` (đang bật trong `next.config.ts`), mọi chỗ đọc `cookies()` phải nằm trong `<Suspense>`. (HIGH)
4. **`proxy.ts` (Next 16 đổi tên từ middleware) chỉ làm kiểm tra lạc quan**: có cookie access hay không, rồi redirect. Không gọi BE. (HIGH)
5. **Adapter SignalR, WebRTC, MediaRecorder nằm ở `apps/web/src/composition/chat/`.** Port, state machine cuộc gọi, schema Zod cho payload hub nằm trong `packages/chat`. Không cần sửa `boundaries.mjs`. Lý do quyết định: adapter phải parse payload hub bằng schema/mapper trong `@tripory/chat/http`, mà chỉ `composition/**` được import `/http`. (HIGH, suy ra từ preset ESLint)
6. **Voice upload đi qua BFF**, kèm giới hạn phía client để file luôn dưới 4 MB (Opus 32 kbps, tối đa 5 phút ≈ 1,2 MB). Vercel Function giới hạn body 4,5 MB. Chỉ khi sản phẩm cần file > 4 MB mới chuyển sang upload thẳng BE bằng token ngắn hạn. (HIGH cho giới hạn; MEDIUM cho mức bitrate/thời lượng đề xuất)
7. **Nên deploy "walking skeleton" lên Vercel ngay cuối Phase 0a**, không đợi đến sau Phase 4. Vercel hiện có issue mở về việc không hỗ trợ pnpm 11 ([vercel/vercel#17434](https://github.com/vercel/vercel/issues/17434)), mà repo pin `pnpm@11.6.0`. Đây là rủi ro deploy phải gỡ sớm. (MEDIUM, nguồn là issue cộng đồng)

## Standard Architecture

### System Overview

```
 Trình duyệt (tab A, tab B …)                                     Vercel (region = gần BE)
┌──────────────────────────────────────────────┐   same-origin   ┌──────────────────────────────────────────────┐
│ Client Components (modules/<ctx>/ui)          │ ─────────────▶ │ proxy.ts  (chỉ đọc cookie → redirect)          │
│   └─ hooks @tripory/<ctx>/react               │                │ Server Components (app/**/page.tsx)            │
│        └─ use case / repository (package)     │                │   └─ composition/*.server.ts ── cookies() ──┐  │
│             └─ HttpClient (browser)           │  /api/bff/*    │ Route Handlers                              │  │
│                  base=/api/bff, 401→refresh ──┼──────────────▶ │   /api/bff/[...path]  (proxy có allowlist)  │  │
│                  Web Locks giữa các tab       │  /api/auth/*   │   /api/auth/{login,register,logout,         │  │
│ composition/chat (client-only)                │──────────────▶ │              refresh,token,change-password} │  │
│   ├─ SignalR gateway ── GET /api/auth/token ──┼──────────────▶ │   /api/rtc/ice-servers  (TURN, server env)  │  │
│   ├─ WebRTC call media                        │                └───────────────┬──────────────────┬──────────┼──┘
│   └─ MediaRecorder (voice)                    │                     Bearer      │      HTTPS        │ Bearer   │
└───────┬───────────────────────┬───────────────┘                                 ▼                   ▼          ▼
        │ wss://BE/hubs/chat     │ <audio src=BE/uploads/…>      ┌──────────────────────────────────────────────┐
        │ ?access_token=…        │                               │ Backend .NET 10 (repo tripory_be, deploy riêng)│
        └────────────────────────┴──────────────────────────────▶│ /api/v1/* REST · /hubs/chat · /uploads/voices │
                                                                 └──────────────────────────────────────────────┘
        WebRTC media (UDP/TCP/TLS) ◀────────────▶ TURN provider (Cloudflare Realtime TURN hoặc coturn)
```

### Component Responsibilities

| Component | Trách nhiệm | Nói chuyện với | Nằm ở |
|---|---|---|---|
| `proxy.ts` | Redirect lạc quan cho route dashboard dựa trên sự có mặt của cookie access | Không gọi ai | `apps/web/src/proxy.ts` |
| Route Handlers `/api/auth/*` | Đổi credential lấy token từ BE, đặt/xóa cookie httpOnly, xoay token, cấp access token ngắn hạn cho SignalR | BE `/auth/*` qua `composition/identity.server.ts` | `apps/web/src/app/api/auth/**/route.ts` (mỏng) |
| BFF proxy `/api/bff/[...path]` | Allowlist path, kiểm tra Origin, gắn Bearer, rút gọn 401 khi token hết hạn, chuyển nguyên envelope `ApiResponse<T>` | BE `/api/v1/*` | `app/api/bff/[...path]/route.ts` → `composition/server/bff.server.ts` |
| `/api/rtc/ice-servers` | Xác thực viewer rồi phát credential TURN ngắn hạn; secret nhà cung cấp chỉ ở server env | BE `/users/me` (xác thực), API TURN | `app/api/rtc/ice-servers/route.ts` → `composition/server/rtc.server.ts` |
| Server Components | Trang công khai (SEO), shell, dữ liệu lần đầu | `composition/*.server.ts` | `app/(public)/**`, `app/(dashboard)/**` |
| Composition root (web) | Chọn implementation theo môi trường: HttpClient browser/server, lắp repository → use case → hooks, adapter realtime | Mọi entry của package (`.`, `/http`, `/react`) | `apps/web/src/composition/**` |
| `packages/api-client` | Port `HttpClient`, bản `fetch`, bóc envelope, chuẩn hóa `ApiError`, wrapper refresh single-flight (lock được tiêm vào) | `shared-kernel` | `httpPackage()` |
| `packages/identity` | Kiểu `Viewer`, luật `isAccessTokenFresh`, DTO Zod của `/auth/*`, giải mã claim JWT, hooks session | `api-client`, `shared-kernel` | `contextPackage()` (rút gọn) |
| `packages/itinerary` | Core: domain (quyền, dẫn xuất), use case (waypoint, reorder, publish), ACL Zod, hooks | như trên | đủ 4 tầng |
| `packages/profile` | Hồ sơ, tìm người dùng | như trên | rút gọn (infrastructure + react) |
| `packages/chat` | Domain: state machine cuộc gọi, gộp tin nhắn lạc quan; application: port realtime/media/ICE/voice + call controller; infrastructure: REST repository + schema payload hub | như trên | đủ 4 tầng |
| `modules/<ctx>/ui` | Component trình bày, toast, điều hướng | hooks do composition xuất | `apps/web/src/modules/**` |

## Recommended Project Structure

```
apps/web/src/
├── proxy.ts                                  # optimistic gating, matcher theo URL (route group không có trong URL)
├── app/
│   ├── layout.tsx                            # <Providers> (QueryClientProvider) bọc {children}
│   ├── providers.tsx                         # 'use client'
│   ├── (public)/
│   │   ├── page.tsx                          # trang chủ tạm
│   │   ├── login/page.tsx  register/page.tsx
│   │   └── itineraries/[id]/page.tsx         # public view, RSC + Suspense, optional auth
│   ├── (dashboard)/
│   │   ├── layout.tsx                        # shell; mount <RealtimeProvider> từ Phase 4
│   │   ├── itineraries/mine/page.tsx         # static segment thắng [id] của (public)
│   │   ├── itineraries/[id]/edit/page.tsx
│   │   ├── profile/page.tsx  users/page.tsx
│   │   └── messages/[[...conversationId]]/page.tsx
│   └── api/
│       ├── auth/login/route.ts  auth/register/route.ts  auth/logout/route.ts
│       ├── auth/refresh/route.ts             # POST, nơi DUY NHẤT xoay refresh token
│       ├── auth/token/route.ts               # GET, access token cho SignalR (Phase 4)
│       ├── auth/change-password/route.ts     # PUT, xóa cookie sau khi thành công
│       ├── rtc/ice-servers/route.ts          # GET, TURN credential (Phase 4)
│       └── bff/[...path]/route.ts            # GET POST PUT DELETE
├── composition/
│   ├── server/                               # mọi file: import 'server-only'
│   │   ├── env.server.ts                     # Zod parse: API_ORIGIN, TURN_*, ...
│   │   ├── session.server.ts                 # tên cookie, đọc/ghi/xóa, độ tươi của access token
│   │   ├── backend-http.server.ts            # HttpClient cho RSC: base `${API_ORIGIN}/api/v1`, Bearer từ cookie
│   │   ├── bff.server.ts                     # forwardToBackend()
│   │   └── rtc.server.ts                     # IceServerIssuer (Cloudflare | coturn)
│   ├── session-cookie-names.ts               # hằng số dùng chung cho proxy.ts và server
│   ├── http.client.ts                        # HttpClient browser: base '/api/bff' + withSessionRefresh + navigator.locks
│   ├── identity.client.ts  identity.server.ts
│   ├── itinerary.client.ts itinerary.server.ts
│   ├── profile.client.ts
│   └── chat/
│       ├── chat.client.ts                    # lắp use case + hooks; tạo gateway lười (lazy) theo singleton
│       ├── signalr-chat-gateway.ts           # implements ChatRealtimeGateway (@microsoft/signalr)
│       ├── webrtc-call-media.ts              # implements CallMedia (RTCPeerConnection, getUserMedia)
│       ├── voice-recorder.ts                 # MediaRecorder, chuẩn hóa MIME
│       └── ice-servers.client.ts             # gọi /api/rtc/ice-servers
└── modules/
    ├── identity/ui/   itinerary/ui/   profile/ui/
    └── chat/ui/                              # ConversationList, Thread, VoiceRecorderButton, CallOverlay, RealtimeProvider

packages/
├── shared-kernel/   src/{ids.ts, geo.ts}                       # UserId, ItineraryId, ConversationId (branded), Wgs84Coordinate
├── api-client/      src/{http-client.ts, fetch-http-client.ts, api-response.ts, api-error.ts, with-session-refresh.ts}
├── identity/        src/{domain, application, infrastructure, react}
├── itinerary/       src/{domain, application, infrastructure, react}
├── profile/         src/{infrastructure, react}
└── chat/            src/{domain, application, infrastructure, react}
```

### Structure Rationale

- **Route Handler chỉ là vỏ.** `app/**` bị cấm import `/http` (preset `app()`), nên mọi logic gọi BE của route nằm trong `composition/**`. Route chỉ parse request, gọi hàm composition và trả `Response`. Logic dạng hàm thuần (allowlist path, kiểm tra Origin, độ tươi token) để test được bằng Vitest.
- **`composition/server/` gom code chỉ chạy server** (`cookies()`, secret env). Tài liệu kiến trúc mục 9 đã chốt: code riêng server chỉ nằm trong `composition/*.server.ts`. Việc cài package `server-only` là tùy chọn vì Next tự xử lý import này ([Next docs](https://nextjs.org/docs/app/getting-started/server-and-client-components)). (HIGH)
- **`composition/chat/` là chỗ của adapter realtime**, vì đây là phần riêng theo nền tảng (mobile sau này dùng `react-native-webrtc`). Adapter cũng phải import `@tripory/chat/http` để parse payload hub. `modules/chat/ui` giữ thuần trình bày.
- **Route group** `(public)`/`(dashboard)` chỉ để tách layout. `proxy.ts` match theo URL thật, không theo tên group.

## Architectural Patterns

### Pattern 1: Session trong hai cookie httpOnly, access cookie sống bằng refresh

**What:** Login/register route handler gọi BE, nhận `AuthResponse { accessToken, refreshToken, expiresAt, user }`, đặt hai cookie, rồi trả về trình duyệt **chỉ `user`**.

- `tripory_at`: JWT access. `Path=/`, `Max-Age` bằng thời hạn refresh. BE cần access token cũ (dù đã hết hạn) trong body `refresh-token` (`RefreshTokenCommand(AccessToken, RefreshToken)` + `GetPrincipalFromExpiredToken`), nên cookie access không được hết hạn theo JWT.
- `tripory_rt`: refresh token. `Path=/api/auth` để không bị gửi kèm mọi request RSC hay BFF.
- Cả hai đều `HttpOnly`, `SameSite=Lax`, `Secure` ở production.

Bẫy contract: trường `ExpiresAt` BE trả về là **hạn của refresh token** (`UtcNow.AddDays(7)` trong cả login lẫn refresh handler), không phải hạn access. Hạn access phải đọc từ claim `exp` của JWT (`JwtOptions.ExpiryMinutes`, mặc định 15 phút, `ClockSkew = 0`). (HIGH, đọc code BE)

**When:** Phase 0c.
**Trade-offs:** Giải mã JWT phía server không kiểm chữ ký, chỉ dùng để lên lịch refresh và hiện tên người dùng. Quyền thật vẫn do BE kiểm. FE không giữ secret ký JWT; chia sẻ HMAC secret với FE đồng nghĩa FE tự đúc được token.

```typescript
// apps/web/src/composition/server/session.server.ts (trích)
import 'server-only';
import { cookies } from 'next/headers';
import { decodeAccessTokenClaims } from '@tripory/identity/http';
import { isAccessTokenFresh } from '@tripory/identity';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../session-cookie-names';

const base = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } as const;

export async function writeSession(t: { accessToken: string; refreshToken: string; refreshExpiresAt: string }) {
  const jar = await cookies(); // Next 16: cookies() là async; .set chỉ dùng trong Route Handler / Server Function
  const maxAge = Math.max(0, Math.floor((Date.parse(t.refreshExpiresAt) - Date.now()) / 1000));
  jar.set(ACCESS_COOKIE, t.accessToken, { ...base, path: '/', maxAge });
  jar.set(REFRESH_COOKIE, t.refreshToken, { ...base, path: '/api/auth', maxAge });
}

export async function clearSession() {
  const jar = await cookies();
  // Cookie khác path mặc định: xóa bằng cách ghi đè maxAge 0 với đúng path
  jar.set(ACCESS_COOKIE, '', { ...base, path: '/', maxAge: 0 });
  jar.set(REFRESH_COOKIE, '', { ...base, path: '/api/auth', maxAge: 0 });
}

export async function readSession(nowSec = Date.now() / 1000) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const claims = decodeAccessTokenClaims(token); // Zod parse payload; null nếu hỏng
  return claims ? { accessToken: token, claims, isFresh: isAccessTokenFresh(claims.exp, nowSec, 60) } : null;
}
```

Nguồn: [cookies()](https://nextjs.org/docs/app/api-reference/functions/cookies). Hàm này async, đọc được trong Server Component nhưng chỉ ghi được trong Server Function hoặc Route Handler; tùy chọn `path` mặc định `/`. (HIGH)

### Pattern 2: Refresh single-flight phía client, tuần tự hóa giữa các tab bằng Web Locks

**What:** Chỉ HttpClient của trình duyệt khởi động refresh.

1. Gặp 401 từ `/api/bff/*` → gom mọi request trong tab vào một promise.
2. Xin `navigator.locks.request('tripory-session-refresh')`.
3. Gọi `POST /api/auth/refresh` → retry request gốc đúng một lần.

Route refresh có tính idempotent: no-op (204) nếu access token trong cookie còn hơn 60 giây. Client gửi `force: true` khi 401 đến từ chính BE (lệch đồng hồ, token bị thu hồi), khác với 401 `Session.Expired` do BFF tự trả.

**Vì sao an toàn:** Web Locks xếp hàng yêu cầu cùng tên giữa các tab cùng origin ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)). Tab B chỉ gửi refresh sau khi response của tab A (kèm `Set-Cookie`) đã vào cookie jar, nên tab B luôn mang refresh token mới. Không có hai lần dùng cùng một refresh token, nên không kích hoạt reuse detection của BE. Các IdP lớn giải bài toán này bằng một "overlap period" phía server ([Auth0: Rotation Overlap Period](https://auth0.com/docs/tokens/guides/configure-refresh-token-rotation)). BE Tripory không có, nên FE phải tự tuần tự hóa.

**Không được refresh ở:**
- `proxy.ts`: chạy cho mọi request kể cả prefetch, song song, và trên Vercel được deploy ra mọi region.
- Server Component: không ghi được cookie khi render.
- BFF proxy: nhiều function instance song song, không có khóa chung.

**When:** Phase 0b (wrapper trong `api-client`), Phase 0c (route + nối lock trong composition).

```typescript
// packages/api-client/src/with-session-refresh.ts — không dùng navigator (bị ESLint cấm): lock được tiêm vào
export type Lock = <T>(name: string, task: () => Promise<T>) => Promise<T>;

export function withSessionRefresh(
  inner: HttpClient,
  deps: { refresh: (force: boolean) => Promise<boolean>; lock: Lock; onSessionExpired: () => void },
): HttpClient {
  let inFlight: Promise<boolean> | null = null;
  const refreshOnce = (force: boolean) =>
    (inFlight ??= deps.lock('tripory-session-refresh', () => deps.refresh(force)).finally(() => (inFlight = null)));

  return {
    async send(request) {
      try {
        return await inner.send(request);
      } catch (error) {
        if (!isApiError(error) || error.status !== 401) throw error;
        const ok = await refreshOnce(error.errorCode !== 'Session.Expired');
        if (!ok) deps.onSessionExpired(); // cookie đã bị route refresh xóa → lần thử lại chạy ẩn danh
        return inner.send(request); // đúng 1 lần; endpoint public vẫn chạy được sau khi phiên hết
      }
    },
  };
}

// apps/web/src/composition/http.client.ts
const lock: Lock = (name, task) => (navigator.locks ? navigator.locks.request(name, task) : task());
```

### Pattern 3: BFF proxy bằng Route Handler catch-all có allowlist

**What:** `/api/bff/<path>` → `${API_ORIGIN}/api/v1/<path>`. Path ở hai phía khớp 1-1, nên repository trong package dùng cùng path tương đối cho cả browser (base `/api/bff`) lẫn server (base BE).

Nhiệm vụ:
- **Allowlist** tiền tố `users|itineraries|chat`. **Chặn `auth/*`**: response login/refresh chứa token, không được lọt về JS.
- **Kiểm tra Origin** cho method khác GET. Docs Next chỉ tự kiểm Origin cho Server Action, Route Handler phải tự làm ([Data Security](https://nextjs.org/docs/app/guides/data-security)).
- **Bỏ cookie** khỏi request đi BE.
- **Rút gọn 401**: nếu cookie access đã hết hạn thì trả 401 `Session.Expired` mà không gọi BE. Lý do: với endpoint `[AllowAnonymous]` như `GET /itineraries/{id}`, BE xử lý token hết hạn như ẩn danh và trả 403 cho bản nháp của chính chủ, thay vì 401 để client biết cần refresh.
- **Timeout** 15 giây. Lỗi do BFF sinh ra dùng cùng dạng envelope `{ status:'error', errorCode, message }` để `api-client` chuẩn hóa một kiểu.

**Vì sao không dùng `rewrites` hay rewrite trong `proxy.ts`:**
- `rewrites` không gắn được header lấy từ cookie.
- `proxy.ts` gắn được header upstream qua `NextResponse.rewrite`/`next({ request: { headers } })` ([proxy docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)). Nhưng nó không chặn được response (không xử lý 401, không lọc token), chạy cả cho prefetch, và Vercel deploy Routing Middleware ra mọi region bất kể cấu hình region ([Vercel regions](https://vercel.com/docs/functions/configuring-functions/region)).

(HIGH cho các luận điểm docs; MEDIUM cho việc "rewrites không gắn header từ cookie", suy ra từ việc API rewrites chỉ map path/điều kiện.)

```typescript
// apps/web/src/app/api/bff/[...path]/route.ts — vỏ mỏng
import type { NextRequest } from 'next/server';
import { forwardToBackend } from '@/composition/server/bff.server';

async function handler(request: NextRequest, ctx: RouteContext<'/api/bff/[...path]'>) {
  const { path } = await ctx.params; // params là Promise trong Next 15+
  return forwardToBackend(request, path);
}
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
```

```typescript
// apps/web/src/composition/server/bff.server.ts (trích)
import 'server-only';
const ALLOWED = /^(users|itineraries|chat)(\/|$)/;
const MAX_BODY = 4 * 1024 * 1024; // dưới trần 4,5 MB của Vercel Function

export async function forwardToBackend(request: NextRequest, segments: string[]) {
  const path = segments.map(encodeURIComponent).join('/');
  if (!ALLOWED.test(path)) return apiError(404, 'Bff.NotFound');
  if (request.method !== 'GET' && request.headers.get('origin') !== request.nextUrl.origin)
    return apiError(403, 'Bff.CrossOrigin');
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return apiError(413, 'Bff.PayloadTooLarge');

  const session = await readSession();
  if (session && !session.isFresh) return apiError(401, 'Session.Expired');

  const headers = new Headers({ accept: 'application/json' });
  const contentType = request.headers.get('content-type'); // giữ nguyên boundary của multipart
  if (contentType) headers.set('content-type', contentType);
  if (session) headers.set('authorization', `Bearer ${session.accessToken}`);

  try {
    const upstream = await fetch(new URL(`/api/v1/${path}${request.nextUrl.search}`, env.API_ORIGIN), {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    const out = new Headers();
    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) out.set('content-type', upstreamType); // không chuyển set-cookie của BE
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch {
    return apiError(502, 'Bff.UpstreamUnavailable');
  }
}
```

Với Cache Components, GET Route Handler đọc request hoặc cookie thì tự chạy lúc request, không cần `export const dynamic` (option này đã bị bỏ khi bật Cache Components) ([Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [segment config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)). Không đặt `runtime = 'edge'` vì đã deprecated. `preferredRegion` cũng deprecated, nên đặt region trong `vercel.json` hoặc dashboard. (HIGH)

### Pattern 4: Server Component lấy dữ liệu qua `composition/*.server.ts`, không bao giờ refresh

**What:**
- `createBackendHttpClient()` đọc cookie và chỉ gắn Bearer khi token còn tươi; kết quả trả kèm cờ `sessionStale`.
- Hàm đọc được bọc `React.cache` để dedupe trong một lượt render (page + `generateMetadata`).
- Nếu token đã cũ và kết quả cần quyền (draft của chính chủ trả 403), RSC render client component `<RefreshSessionThenReload/>`. Component này gọi `refreshOnce()` (cùng lock ở Pattern 2) rồi `router.refresh()`.
- Header/UserMenu lấy viewer bằng cách giải mã claim `tripory_at` (`nameid`/`name`/`handle`, cần xác nhận tên claim, xem Gaps), không gọi BE.

**Ràng buộc Next 16:**
- Với `cacheComponents: true`, đọc `cookies()`, `await params` hoặc fetch chưa cache bên ngoài `<Suspense>` sẽ báo lỗi "Uncached data was accessed outside of `<Suspense>`" ([blocking-route](https://nextjs.org/docs/messages/blocking-route)).
- Auth check trong layout không chạy lại khi điều hướng ([Authentication guide](https://nextjs.org/docs/app/guides/authentication)), nên kiểm tra đặt gần chỗ lấy dữ liệu.

(HIGH)

```tsx
// apps/web/src/app/(public)/itineraries/[id]/page.tsx
import { Suspense } from 'react';
import { getItineraryForPage } from '@/composition/itinerary.server';

export default function Page({ params }: PageProps<'/itineraries/[id]'>) {
  return (
    <Suspense fallback={<ItinerarySkeleton />}>
      <PublicItinerary params={params} />
    </Suspense>
  );
}

async function PublicItinerary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { result, sessionStale } = await getItineraryForPage(id); // React.cache, gọi thẳng BE
  if (result.kind === 'forbidden') return sessionStale ? <RefreshSessionThenReload /> : <DraftForbidden />;
  if (result.kind === 'not-found') return <ItineraryNotFound />;
  return <PublicItineraryView itinerary={result.value} />; // plain object, serialize được
}
```

Màn dashboard (editor, chat, profile) lấy dữ liệu phía client bằng TanStack Query qua BFF, vì đây là màn tương tác nhiều. Prefetch trên server + `HydrationBoundary` là tối ưu tùy chọn. Nó chạy được vì repository server và client cùng implement một port và dùng cùng query key. Hook trong package dùng `useQuery`, không dùng `useSuspenseQuery`, để tránh fetch URL tương đối `/api/bff` trong lúc SSR client component. (MEDIUM)

### Pattern 5: `proxy.ts` chỉ chặn lạc quan

```typescript
// apps/web/src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE } from '@/composition/session-cookie-names';

export function proxy(request: NextRequest) {
  if (request.cookies.has(ACCESS_COOKIE)) return NextResponse.next();
  const login = new URL('/login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search); // /login chỉ nhận path tương đối
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/itineraries/mine', '/itineraries/:id/edit', '/profile/:path*', '/messages/:path*'],
};
```

Theo [proxy docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy): proxy mặc định chạy Node.js runtime và không cho cấu hình `runtime`. Matcher phải là hằng số. Đặt file trong `src/` khi app dùng `src`. Proxy cũng chạy cho request RSC/prefetch, nên chỉ đọc cookie. `/api/**` không vào matcher: BFF tự trả 401 để client refresh. Không dùng cookie refresh để gating vì nó có `Path=/api/auth`, trình duyệt không gửi lên `/profile`. (HIGH)

### Pattern 6: SignalR kết nối thẳng BE bằng `accessTokenFactory` → `GET /api/auth/token`

**What:**
- `GET /api/auth/token` không có side effect. Access còn tươi → trả `{ accessToken, expiresAtEpoch }` với `Cache-Control: no-store`. Đã cũ → 401, client chạy `refreshOnce()` rồi gọi lại.
- Adapter cache token trong bộ nhớ đến `exp - 60s`. `accessTokenFactory` được gọi trước mọi HTTP request của SignalR, gồm negotiate và mỗi lần reconnect ([MS Learn](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-9.0)).
- Trình duyệt không gắn được header vào WebSocket, nên token đi qua query `access_token`. BE đã đọc nó trong `JwtBearerEvents.OnMessageReceived` cho `/hubs/*`.

**Hết hạn token:** mặc định kết nối WebSocket vẫn sống khi token hết hạn, trừ khi BE bật `CloseOnAuthenticationExpiration`; BE hiện không bật (HIGH, docs MS + `Program.cs`). Vì vậy không cần refresh giữa chừng. Cơ chế auth refresh tại chỗ chỉ có từ .NET 11, BE đang .NET 10, nên không áp dụng.

**Reconnect:** `withAutomaticReconnect()` mặc định thử 0/2/10/30 giây rồi bỏ cuộc. Mỗi lần reconnect, server cấp `connectionId` mới, tức group cũ mất ([JS client docs](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0)). Do đó:
- Dùng retry policy trả backoff không bao giờ `null`.
- Tự lặp lại `start()` khi lần start đầu thất bại.
- Trong `onreconnected`: gọi lại `JoinConversation` cho hội thoại đang mở, rồi invalidate query `chat` để lấy tin nhắn bị lỡ, vì SignalR không phát lại.
- Nếu negotiate trả 401 sau khi refresh thất bại → `onSessionExpired`, dừng kết nối.

(HIGH)

**Vòng đời:**
- Một connection mỗi tab: singleton lười trong `composition/chat/chat.client.ts`, tạo trong `useEffect` của `<RealtimeProvider>` ở layout `(dashboard)`. Không tạo khi module được evaluate hay khi render, vì client component cũng chạy SSR.
- Đếm tham chiếu để chịu được StrictMode mount hai lần.
- `stop()` khi logout và khi đổi mật khẩu. BE thu hồi mọi refresh token khi đổi mật khẩu (`User.ChangePassword` → `RevokeAllRefreshTokens`).

```typescript
// apps/web/src/composition/chat/signalr-chat-gateway.ts (trích, client-only)
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { parseHubEvent, HUB_EVENTS } from '@tripory/chat/http'; // chỉ composition được import /http
import type { ChatRealtimeGateway } from '@tripory/chat';

export function createSignalRChatGateway(deps: {
  hubUrl: string; // `${process.env.NEXT_PUBLIC_API_ORIGIN}/hubs/chat` (NEXT_PUBLIC_ được inline lúc build)
  getAccessToken: () => Promise<string>;
  onSessionExpired: () => void;
}): ChatRealtimeGateway {
  const connection = new HubConnectionBuilder()
    .withUrl(deps.hubUrl, { accessTokenFactory: deps.getAccessToken })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
        Math.min(30_000, 1_000 * 2 ** previousRetryCount) + Math.random() * 1_000, // không trả null
    })
    .configureLogging(LogLevel.Warning)
    .build();
  // Đăng ký handler TRƯỚC start(); mỗi event: parseHubEvent(name, payload) → domain event → listeners
  // ...
}
```

### Pattern 7: Gọi thoại: call controller thuần trong `packages/chat`, media adapter ở app, TURN qua route server

**What:**
- `packages/chat/src/domain/call.ts` chứa reducer state machine: `idle → outgoing-ringing | incoming-ringing → connecting → in-call → ended`.
- `packages/chat/src/application/call-controller.ts` điều phối qua các port `CallSignaling` (hub), `CallMedia` (peer connection), `IceServerSource`, `ChatRepository` (call-log), `Timers`. Ngoài ra nó **đệm ICE candidate cho tới khi đã set remote description**.
- Hook React đọc controller qua `useSyncExternalStore`.

**Vì sao phải đệm candidate:** FE cũ chỉ tạo `RTCPeerConnection` khi người nhận bấm nghe. `addIceCandidate` lúc chưa có peer connection bị bỏ qua (`webrtcService.addIceCandidate` kiểm `this.peerConnection`), trong khi BE chuyển `ReceiveIceCandidate` ngay khi caller sinh ra. Các candidate relay (TURN) đến sớm bị mất, đúng loại kết nối cần cho người dùng ở mạng khác nhau. (HIGH, đọc code FE cũ + BE hub)

**Luồng:**
- **Caller:** `GET /api/rtc/ice-servers` → `getUserMedia` → tạo peer connection → offer → `CallUser(targetUserId, offer)`.
- **Callee:** nhận `IncomingCall { callerId, offer }`. Payload **không có `conversationId`**, nên phải tra từ danh sách hội thoại theo partner. Callee đệm candidate, prefetch ICE servers, chờ bấm nghe → set remote → xả candidate → answer → `AcceptCall`.
- **Kết thúc:** `EndCall`. **Chỉ caller ghi `call-log`** (BR_CHAT_05, theo `ChatRealtimeContext.tsx` của FE cũ).
- **Nhiều tab:** BE `Clients.User` đổ chuông mọi tab của người nhận. Dùng `BroadcastChannel` trong adapter để tắt chuông ở tab khác khi một tab đã nghe (nice-to-have).

**TURN route:** `GET /api/rtc/ice-servers` xác thực viewer bằng cách gọi BE `GET /users/me` với token. Không tự verify JWT vì FE không giữ secret ký. Sau đó gọi nhà cung cấp, trả `{ iceServers, expiresAt }` với `no-store`.
- Cloudflare Realtime TURN: server gọi `POST https://rtc.live.cloudflare.com/v1/turn/keys/$TURN_KEY_ID/credentials/generate-ice-servers` với API token và `ttl`, nhận lại mảng `iceServers` dùng thẳng cho `RTCPeerConnection`. TTL nên dài hơn cuộc gọi dài nhất; có thể làm mới giữa cuộc gọi bằng `setConfiguration()` ([Cloudflare docs](https://developers.cloudflare.com/realtime/turn/generate-credentials/)). (HIGH)
- coturn tự host: credential HMAC theo TURN REST API (`username = expiry:userId`, `credential = base64(HMAC-SHA1(secret, username))`) tính bằng `node:crypto` trong `rtc.server.ts` ([draft-uberti-behave-turn-rest](https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00)). (MEDIUM)
- Chọn nhà cung cấp thuộc STACK.md. Kiến trúc chỉ cần interface `IceServerIssuer` trong `composition/server/rtc.server.ts`.
- Thêm cờ debug `?relay=1` → `iceTransportPolicy: 'relay'` để nghiệm thu rằng TURN thật sự hoạt động giữa 4G và Wi-Fi.

```typescript
// packages/chat/src/application/call-controller.ts (trích) — không browser global, test được bằng fake port
const pendingRemote: IceCandidateInit[] = [];
let remoteReady = false;

async function onRemoteCandidate(candidate: IceCandidateInit) {
  if (!remoteReady) return void pendingRemote.push(candidate);
  await deps.media.addRemoteCandidate(candidate);
}

async function applyRemoteDescription(description: SessionDescriptionInit) {
  await deps.media.setRemoteDescription(description);
  remoteReady = true;
  for (const candidate of pendingRemote.splice(0)) await deps.media.addRemoteCandidate(candidate);
}
```

### Pattern 8: Voice message qua BFF với trần kích thước phía client

**What:** `voice-recorder.ts` (composition) chọn MIME bằng `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')`, ghi với `audioBitsPerSecond: 32000`, dừng ở 5 phút. Blob được tạo lại với `type: 'audio/webm'`, **bỏ tham số codecs**. Use case `sendVoiceMessage`:
1. `VoiceStorage.upload(blob)` → `POST /api/bff/chat/voice` (multipart, kiểm `blob.size < 4 MB` trước khi gửi) → `voiceUrl`.
2. `POST /api/bff/chat/conversations/{id}/messages/voice { voiceUrl, voiceDuration }`.

**Vì sao chuẩn hóa MIME:** `ChatController.ValidateAudioFile` so `file.ContentType` khớp chính xác với danh sách `audio/webm, audio/wav, audio/ogg, audio/mp3, audio/mpeg`. FE cũ gửi `mediaRecorder.mimeType`, mà Chrome thường trả `audio/webm;codecs=opus`. **Suy luận từ code, chưa chạy thử: chuỗi đó có thể bị từ chối.** Kiểm ngay ở Phase 4. Safari dưới 18.4 chỉ ghi được `audio/mp4`, mà BE không nhận ([LambdaTest](https://www.lambdatest.com/web-technologies/mediarecorder-chrome), LOW). Khi đó hiện thông báo không hỗ trợ hoặc nhờ BE thêm MIME.

**Vì sao qua BFF:** giữ đúng quyết định "REST qua BFF", không lộ token cho REST, chạy giống nhau ở local và production. Vercel trả `413 FUNCTION_PAYLOAD_TOO_LARGE` khi body vượt 4,5 MB ([Vercel limits](https://vercel.com/docs/functions/limitations)), nên trần client là bắt buộc. Nếu sau này cần file lớn, Vercel khuyên upload thẳng tới nguồn ([Vercel KB](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)): `VoiceStorage` đổi sang adapter gọi thẳng `${API_ORIGIN}/api/v1/chat/voice` với Bearer từ `/api/auth/token`. Chỉ sửa composition. (HIGH cho giới hạn; MEDIUM cho mức bitrate)

**Phát lại:** `voiceUrl` là URL tuyệt đối do BE tự dựng từ `Request.Scheme/Host`. Phát bằng `<audio src>`, không `fetch()` + `decodeAudioData`: `UseStaticFiles()` đứng trước `UseCors()` trong `Program.cs`, nên file tĩnh không có header CORS. (HIGH, đọc code)

## Data Flow

### Request Flow (REST từ client)

```
[Click lưu waypoint]
  → hook @tripory/itinerary/react (useMutation)
  → use case addWaypoint (application: kiểm canEdit, validate sớm)
  → repository HTTP (infrastructure: build path /itineraries/{id}/waypoints)
  → HttpClient browser (base /api/bff, withSessionRefresh)
  → Route Handler /api/bff/[...path] (allowlist, Origin, Bearer từ cookie)
  → BE /api/v1/itineraries/{id}/waypoints
  ← ApiResponse<T> (chuyển nguyên) ← api-client bóc envelope/chuẩn hóa lỗi ← Zod parse + mapper (ACL)
  ← domain type ← invalidate query key của aggregate root itinerary
```

### Session / refresh

```
401 (BFF Session.Expired hoặc BE) ─▶ refreshOnce() [promise chung trong tab]
   ─▶ navigator.locks 'tripory-session-refresh' [xếp hàng giữa các tab]
   ─▶ POST /api/auth/refresh ─▶ còn tươi & !force ? 204 : BE /auth/refresh-token ─▶ writeSession | clearSession
   ─▶ retry request gốc 1 lần ─▶ thất bại ⇒ onSessionExpired: xóa cache viewer, ngắt hub, dashboard → /login
```

### Key Data Flows

1. **Login/Register:** `LoginForm` → `POST /api/auth/login` → `composition/identity.server.ts` → `@tripory/identity/http` gọi BE `/auth/login` → `writeSession` → response `{ user }` (không token) → client đặt query `['identity','viewer']` → `router.replace(next)`.
2. **Logout:** `POST /api/auth/logout` → `clearSession` → client `queryClient.clear()`, `gateway.stop()`, phát `BroadcastChannel('tripory-auth')` để tab khác cùng đăng xuất. BE **không có endpoint revoke**, nên refresh token còn hiệu lực trong DB tới hạn. Chấp nhận được ở quy mô thử nghiệm; ghi thành phụ thuộc BE.
3. **Đổi mật khẩu:** `PUT /api/auth/change-password` → BE thành công → `clearSession` → client về `/login`.
4. **Public view:** RSC → `getItineraryForPage` → BE `GET /itineraries/{id}` (Bearer tùy chọn, BE cho chủ xem bản nháp) → render. Khách xem bản nháp nhận 403 → trang "bản nháp/không có quyền".
5. **Realtime chat:** `<RealtimeProvider>` → gateway start → hub event → `parseHubEvent` → `useRealtimeSync` vá cache TanStack (append tin, dedupe theo id thật/tạm, cập nhật `MessageRead`/`ConversationUpdated`).
6. **Gọi thoại:** như Pattern 7. Signaling đi qua hub; media đi P2P hoặc qua TURN; credential lấy từ `/api/rtc/ice-servers`.

## Scaling Considerations

| Mối lo | Vài chục người quen (milestone này) | ~1k người dùng | 10k+ |
|---|---|---|---|
| Độ trễ BFF | **Đặt Function region cùng vùng BE** (mặc định Vercel là `iad1`; BE ở châu Á thì mỗi request BFF thêm hai lần vượt Thái Bình Dương) | Như trên; cân nhắc prefetch server | Cache public itinerary bằng `'use cache'` + `cacheTag`, invalidate khi mutation qua BFF |
| Refresh race | Web Locks + route idempotent đủ dùng | Xin BE thêm overlap period cho token vừa xoay | Như trên |
| SignalR | 1 instance BE, kết nối WS thẳng | BE cần sticky session hoặc backplane (Redis/Azure SignalR) khi scale ngang (phía BE) | Như trên |
| TURN | Free tier đủ | Theo dõi băng thông relay | Ngân sách TURN theo GB |
| File voice | Đĩa local của BE (rủi ro mất khi redeploy container) | Object storage (phía BE) | Như trên |

### Scaling Priorities

1. **Nghẽn đầu tiên là độ trễ**, không phải tải: region function lệch BE, cộng cold start. Chọn region ngay khi biết nơi deploy BE.
2. **Hỏng thứ hai là phiên đăng nhập**, khi người dùng mở nhiều tab hoặc nhiều thiết bị (reuse detection). Pattern 2 xử lý được phía FE; overlap period phía BE là lớp bảo hiểm.

## Anti-Patterns

### Anti-Pattern 1: Refresh token ở `proxy.ts`, Server Component hoặc BFF

**What people do:** Theo mẫu "middleware refresh session" phổ biến (đọc cookie, gọi refresh, set cookie trên response).
**Why it's wrong:** Proxy và BFF chạy song song cho prefetch và nhiều request cùng lúc. Hai lần dùng cùng refresh token → BE `Token.Compromised` + thu hồi mọi phiên. RSC không ghi được cookie.
**Do this instead:** Chỉ `POST /api/auth/refresh`, chỉ client gọi, trong Web Lock.

### Anti-Pattern 2: BFF chuyển tiếp mọi path, hoặc login trả token về JSON

**What people do:** `/api/bff/[...path]` chuyển cả `auth/*`, hoặc route login trả nguyên `AuthResponse`.
**Why it's wrong:** Token lọt vào JS, mất toàn bộ lợi ích của cookie httpOnly.
**Do this instead:** Allowlist tiền tố. Route auth chỉ trả `user`. `/api/auth/token` là ngoại lệ duy nhất có chủ đích (cho SignalR), kèm kiểm Origin và `no-store`.

### Anti-Pattern 3: RSC fetch `/api/bff/...` của chính app

**Why it's wrong:** Thêm một round trip, hỏng khi prerender lúc build ([BFF guide](https://nextjs.org/docs/app/guides/backend-for-frontend)), và phải tự chuyển cookie.
**Do this instead:** `composition/*.server.ts` gọi thẳng `${API_ORIGIN}/api/v1`.

### Anti-Pattern 4: Nới allowlist ESLint để đặt SignalR/WebRTC vào `packages/chat/src/infrastructure`

**Why it's wrong:** WebRTC/MediaRecorder là API riêng nền tảng (`navigator` bị chặn có chủ đích); mobile sẽ dùng `react-native-webrtc`. Sửa `boundaries.mjs` là quyết định kiến trúc, không phải sửa cho qua lint.
**Do this instead:** Port trong `application`, adapter trong `apps/web/src/composition/chat`. Nếu khi làm mobile thấy `@microsoft/signalr` dùng chung được thì mới cân nhắc thêm nó vào allowlist `infrastructure` của riêng `chat`.

### Anti-Pattern 5: Dùng `ExpiresAt` của BE làm hạn access token

**Why it's wrong:** Đó là hạn refresh (7 ngày). Coi là hạn access thì sẽ gửi token hết hạn suốt một tuần (401 liên tục), hoặc xóa cookie access sớm làm refresh không chạy được.
**Do this instead:** Hạn access đọc từ `exp` của JWT. `Max-Age` của cả hai cookie = `ExpiresAt`.

### Anti-Pattern 6: Tạo `HubConnection` hoặc `RTCPeerConnection` ở module scope hay trong render

**Why it's wrong:** Client component vẫn SSR (không có `window`); StrictMode/HMR tạo hai kết nối và nhận event hai lần.
**Do this instead:** Singleton lười + đếm tham chiếu, khởi tạo trong `useEffect`.

### Anti-Pattern 7: Kiểm tra auth trong layout `(dashboard)`

**Why it's wrong:** Layout không render lại khi điều hướng, và không ngăn segment con chạy ([Authentication guide](https://nextjs.org/docs/app/guides/authentication)).
**Do this instead:** Proxy (lạc quan) + BE (quyết định) + kiểm gần dữ liệu trong `*.server.ts`.

### Anti-Pattern 8: TURN credential tĩnh trong `NEXT_PUBLIC_*`

**Why it's wrong:** Giá trị bị inline vào bundle lúc build ([env docs](https://nextjs.org/docs/app/guides/environment-variables)), ai cũng dùng được relay bằng tiền của mình.
**Do this instead:** `/api/rtc/ice-servers` + credential có TTL.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---|---|---|
| BE REST `/api/v1` | BFF (client), fetch trực tiếp (RSC, route auth) | Server env `API_ORIGIN` (Zod-validate trong `env.server.ts`). Envelope `ApiResponse<T>`; lỗi → 400/401/403/404/409 |
| BE hub `/hubs/chat` | `@microsoft/signalr` từ trình duyệt, WSS thẳng | `NEXT_PUBLIC_API_ORIGIN` (inline lúc build, đặt riêng cho Preview/Production). Phụ thuộc BE: host hỗ trợ WebSocket; CORS cho domain Vercel (hiện `SetIsOriginAllowed(_ => true)` + `AllowCredentials`, chạy được nhưng quá rộng); không log query string (`access_token`) |
| BE static `/uploads/voices` | `<audio src>` | Phụ thuộc BE: bật Forwarded Headers sau reverse proxy. Nếu không, `BuildPublicUrl` dựng `http://…` và trang HTTPS chặn mixed content. Đĩa container mất file khi redeploy |
| TURN (Cloudflare/coturn) | Route server phát credential TTL | Secret chỉ ở Vercel server env (`TURN_KEY_ID`, `TURN_KEY_API_TOKEN` hoặc `TURN_SHARED_SECRET` + `TURN_URLS`) |
| Vercel | Root Directory `apps/web`, Turborepo, `regions` trong `vercel.json` | Rủi ro pnpm 11 (Gaps). Hobby: 1 region; body ≤ 4,5 MB; duration mặc định 300 giây |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `app/**` ↔ `composition/**` | import trực tiếp `@/composition/*` | `app/**` cấm `/http` (ESLint `httpOnlyInComposition`) |
| `composition/**` ↔ packages | factory: `createHttpXRepository(http)` → `createXUseCases(deps)` → `createXHooks(useCases)` | Nơi duy nhất import `/http` |
| `proxy.ts` ↔ server code | hằng tên cookie dùng chung | Proxy không import module `server-only` hay gọi BE |
| `api-client` ↔ trình duyệt | `Lock`, `fetch` tiêm qua deps | `navigator`, `window` bị ESLint chặn trong package |
| `chat` ↔ `itinerary` | không import nhau; thẻ lịch trình trong tin nhắn do app ghép bằng hook `itinerary` | Theo mục 7 tài liệu kiến trúc |
| `chat` application ↔ adapter web | port `ChatRealtimeGateway`, `CallSignaling`, `CallMedia`, `IceServerSource`, `VoiceStorage`, `Timers` | Đồng hồ/timer qua deps (domain/application cấm `Date.now`, `Math.random`) |
| Tab ↔ tab | Web Locks (refresh), `BroadcastChannel` (logout, tắt chuông) | Cùng origin |

## Suggested Build Order (map theo phase)

| Phase | Kiến trúc cần dựng | Nghiệm thu kiến trúc |
|---|---|---|
| **0a** UI skeleton | Route group `(public)`/`(dashboard)` + mọi trang placeholder; `providers.tsx` (QueryClient); `ui-web`, `design-tokens`. Cài lại Next nếu docs/dist vẫn trống. **Deploy skeleton lên Vercel** (Root Directory `apps/web`, kiểm pnpm 11, chọn region dự kiến) | Build xanh trên Vercel; URL preview mở được mọi route |
| **0b** HTTP + kernel | `shared-kernel` (branded id, `Wgs84Coordinate`); `api-client`: port `HttpClient`, `createFetchHttpClient` (base, headers, FormData), bóc envelope, `ApiError` (gồm ProblemDetails `errors`), `withSessionRefresh` với `Lock` tiêm vào | Test: N request 401 song song → 1 lần refresh; refresh fail → `onSessionExpired` + retry ẩn danh 1 lần; multipart không bị set content-type thủ công |
| **0c** Identity + session | `packages/identity` (DTO Zod auth, `decodeAccessTokenClaims`, `isAccessTokenFresh`, hooks viewer); `composition/server/{env,session,backend-http,bff}.server.ts`; route `auth/{login,register,logout,refresh,change-password}`, `bff/[...path]`; `proxy.ts`; `http.client.ts` + `navigator.locks`; UserMenu đọc viewer từ claim. Thêm Vitest cho `apps/web` (helper thuần của BFF/session) | Cookie `HttpOnly` (DevTools); 2 tab cùng hết hạn access → chỉ 1 lệnh refresh tới BE; POST BFF khác Origin → 403; `auth/*` qua BFF → 404 |
| **1** Itinerary | 4 tầng `itinerary`; `composition/itinerary.client.ts`; UI editor dashboard (dữ liệu client qua BFF) | Use case test bằng fake repo; CRUD + reorder + publish với BE thật qua BFF |
| **2** Public view + SVG map | `composition/itinerary.server.ts` (`React.cache`, optional auth, `sessionStale`); page RSC trong `<Suspense>`; `generateMetadata`; `<RefreshSessionThenReload/>` | Khách xem được bản đã xuất bản; nháp → trang 403; chủ xem nháp được sau khi access hết hạn (tự refresh rồi reload) |
| **3** Profile/users | `profile` rút gọn; ghép tab "lịch trình của tôi" bằng hook `itinerary` ở app; change-password xóa phiên | Sửa profile lưu BE; đổi mật khẩu → về `/login` |
| **4** Chat realtime + gọi | `chat` 4 tầng (call controller, schema hub); `composition/chat/*`; route `auth/token`, `rtc/ice-servers`; `<RealtimeProvider>`; voice qua BFF với trần client | Text/voice realtime giữa 2 tài khoản; reconnect sau khi tắt mạng 30 giây thì vào lại group + có tin bị lỡ; gọi thoại thành công với `?relay=1` giữa 4G và Wi-Fi |
| **Deploy** | Env Production/Preview trên Vercel (`API_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, TURN secrets); `vercel.json` `regions`; checklist phụ thuộc BE (CORS, WebSocket, Forwarded Headers, lưu trữ voice) | Smoke test end-to-end trên URL công khai với vài người quen |

Lý do thứ tự: refresh wrapper (0b) phải có trước route session (0c), vì mọi màn sau dựa vào nó. Pattern RSC + `Suspense` + optional auth chỉ cần ở Phase 2, nhưng helper `backend-http.server.ts` dựng từ 0c. Route `auth/token` và `rtc/ice-servers` để tới Phase 4, khi có consumer thật. Deploy sớm ở 0a tách rủi ro nền tảng (pnpm 11, monorepo) khỏi rủi ro tích hợp BE.

## Gaps / cần xác minh

- **Docs Next cục bộ trống và bản cài Next không đầy đủ** (`dist/docs` chỉ có thư mục, `dist/bin/next` không có). Kiểm tra bằng `pnpm install` rồi `pnpm build` trước Phase 0a. (HIGH, đã kiểm thư mục)
- **Vercel + pnpm 11:** issue [#17434](https://github.com/vercel/vercel/issues/17434) (08/2026) báo không deploy được. Thử `ENABLE_EXPERIMENTAL_COREPACK=1` (repo đã có `packageManager: pnpm@11.6.0`) hoặc override Install Command. Nếu không được, hạ pnpm 10 cho CI. Spike ở 0a. (LOW, chưa thử)
- **Tên claim JWT:** BE tạo `ClaimTypes.NameIdentifier`, `handle`, `name` qua `JwtSecurityTokenHandler`. Tên trong payload (`nameid` hay URI đầy đủ) phụ thuộc outbound claim map, nên giải mã một token thật ở 0c trước khi chốt schema Zod. (MEDIUM)
- **MIME voice khớp chính xác** (`audio/webm;codecs=opus` có bị 400 không): thử với Chrome thật ở Phase 4. (MEDIUM, suy luận từ code)
- **Phụ thuộc BE (ngoài repo, chỉ ghi nhận):** CORS giới hạn domain Vercel/preview; Forwarded Headers để URL voice là HTTPS; lưu trữ voice bền; tùy chọn overlap period cho refresh rotation; tùy chọn endpoint revoke cho logout; tùy chọn nhận `audio/mp4`.
- **Region BE** quyết định `regions` của Vercel. Chờ kết quả nghiên cứu nơi deploy BE (STACK.md).

## Sources

- Next.js: [proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) · [cookies()](https://nextjs.org/docs/app/api-reference/functions/cookies) · [Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) · [Authentication](https://nextjs.org/docs/app/guides/authentication) · [Data Security](https://nextjs.org/docs/app/guides/data-security) · [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) · [route.js](https://nextjs.org/docs/app/api-reference/file-conventions/route) · [Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config) · [Uncached data outside Suspense](https://nextjs.org/docs/messages/blocking-route) · [Environment Variables](https://nextjs.org/docs/app/guides/environment-variables) · [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components). HIGH
- Vercel: [Functions limitations (4,5 MB)](https://vercel.com/docs/functions/limitations) · [Bypass body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) · [Function regions](https://vercel.com/docs/functions/configuring-functions/region) · [Issue pnpm 11](https://github.com/vercel/vercel/issues/17434). HIGH / MEDIUM
- SignalR: [Authentication and authorization](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-9.0) · [JavaScript client](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0). HIGH
- TURN: [Cloudflare generate credentials](https://developers.cloudflare.com/realtime/turn/generate-credentials/) (HIGH) · [TURN REST API draft](https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00) (MEDIUM)
- Web platform: [Web Locks API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) (HIGH) · [MediaRecorder/Safari WebM](https://www.lambdatest.com/web-technologies/mediarecorder-chrome) (LOW)
- Refresh rotation: [Auth0 Rotation Overlap Period](https://auth0.com/docs/tokens/guides/configure-refresh-token-rotation). MEDIUM
- Code đã đọc (read-only): `tripory_be` `Program.cs`, `ChatHub.cs`, `ChatController.cs`, `AuthController.cs`, `LoginCommandHandler.cs`, `RefreshTokenCommandHandler.cs`, `JwtTokenService.cs`, `JwtOptions.cs`, `LocalAudioStorageService.cs`, `ChatNotificationService.cs`, `GetItineraryByIdQueryHandler.cs`, `User.cs`; FE cũ `apiClient.ts`, `chatService.ts`, `signalRService.ts`, `webrtcService.ts`, `VoiceRecorder.tsx`, `ChatRealtimeContext.tsx`; repo này `boundaries.mjs`, `next.config.ts`, `package.json`, `pnpm-workspace.yaml`. HIGH

*Nội dung từ các nguồn đã được diễn đạt lại để tuân thủ giới hạn trích dẫn.*

---
*Architecture research for: Tripory FE (Next.js 16 BFF + SignalR + WebRTC)*
*Researched: 2026-10-09*
