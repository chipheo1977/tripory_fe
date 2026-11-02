# External Integrations

**Analysis Date:** 2026-11-02

## APIs & External Services

**Backend (tripory_be, .NET, separate repo at `c:\Users\OS\Documents\personal\tripory_be`):**
- REST API under `${API_ORIGIN}/api/v1/*`. The browser never calls it directly; only server code does, through one function.
  - Single entry: `callBackend(deps, pathWithQuery, init)` in `apps/web/src/composition/server/upstream.ts`
  - Locks: resulting URL must keep the `API_ORIGIN` origin and a pathname starting `/api/v1/` (anti open-proxy, T-03-18); `redirect: "manual"`; `cache: "no-store"`; timeout `UPSTREAM_TIMEOUT_MS = 28_000`
  - Returns `{ kind: "response" | "timeout" | "network" }`, never throws on upstream failure
  - Auth: `Authorization: Bearer <access token from cookie>`, attached by the server only
  - Config: `API_ORIGIN` (env, server-only)
- Endpoints used (paths as seen from the BFF; the client packages omit the prefix):
  - Auth (via `apps/web/src/composition/server/auth-handlers.ts`): `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/refresh-token`, `PUT /api/v1/auth/change-password`
  - Users: `GET /api/v1/users/me` (`packages/identity/src/infrastructure/http-session-gateway.ts`)
  - Itineraries (`packages/itinerary/src/infrastructure/http-itinerary-repository.ts`): `GET /itineraries/mine`, `POST /itineraries`, `GET|PUT|DELETE /itineraries/{id}`, `PUT /itineraries/{id}/publish`, `POST /itineraries/{id}/waypoints`, `PUT|DELETE /itineraries/{id}/waypoints/{waypointId}`, `PUT /itineraries/{id}/days/{n}/reorder-waypoints`, `PUT /itineraries/{id}/days/{n}/subtitle`
  - `chat` root is allowlisted in the BFF but has no FE caller yet.
- Contract documentation lives in the BE-facing research notes: `.planning/phases/03-*/03-RESEARCH.md` and `.planning/phases/04-*/04-RESEARCH.md` (section "Contract BE"). DTO shapes are validated with Zod in `packages/identity/src/infrastructure/dto.ts` and `packages/itinerary/src/infrastructure/dto.ts` (anti-corruption layer; mappers in `mappers.ts`).
- BE error format: ProblemDetails-style `errorCode`; the FE wraps its own envelope in `errorEnvelope(...)` (`apps/web/src/composition/server/request-guards.ts`). Codes the FE originates: `Bff.MethodNotAllowed`, `Bff.NotFound`, `Bff.BadPath`, `Bff.CrossOrigin`, `Bff.PayloadTooLarge`, `Bff.UpstreamTimeout`, `Bff.UpstreamUnavailable`, `Bff.InvalidUpstream`, `Bff.UpstreamError`, `session.expired`.

**Google Maps short links (outbound, unauthenticated):**
- `POST /api/maps/resolve` (`apps/web/src/app/api/maps/resolve/route.ts` -> `apps/web/src/composition/server/maps-handlers.ts` -> `maps-resolve.ts`)
  - Follows up to 3 redirects with `HEAD` from `maps.app.goo.gl` or `goo.gl/maps/*` until a Google Maps host; handles `consent.google.com?continue=`
  - SSRF defenses: https only, source host allowlist, host check at every hop, `redirect: "manual"`, 5 s total timeout, 2,048-char input cap, never fetches the destination, never logs the URL
  - Client side: `createHttpShortLinkResolver(appHttp)` from `@tripory/itinerary/http`, wired in `apps/web/src/composition/itinerary.client.ts`
  - Auth: none; protected by Origin check only (no rate limit, accepted risk D-51)

**Fonts:**
- Google Fonts through `next/font/google` (`Inter`) in `apps/web/src/app/layout.tsx`. Next downloads the font at build time and self-hosts it; no runtime request to Google from the browser.

**Third-party image host (data, not code dependency):**
- `https://api.dicebear.com/7.x/identicon/svg?seed=tripory` is the default avatar URL in `packages/identity/src/infrastructure/mappers.ts` (`DEFAULT_AVATAR_URL`) and fixtures. If Phase 5 renders avatars or cover images with `next/image`, remote hosts will need `images.remotePatterns` in `apps/web/next.config.ts` (not configured today).

## Data Storage

**Databases:**
- None in the frontend. All persistence is in the BE.

**File Storage:**
- None. Cover images are URLs from BE data (`apps/web/src/modules/itinerary/ui/cover-image.tsx`). Phase 7 (voice, images) is expected to add binary transport; `apps/web/src/composition/server/upstream.ts` and `bff.ts` currently allow JSON only and cap bodies at 4 MB (`BFF_MAX_BODY_BYTES`).

**Caching:**
- Next Cache Components is on (`cacheComponents: true`) but no `"use cache"` directive or `next/cache` API is used in source today.
- Session data is deliberately not cached across requests: `React.cache` only (per request) in `apps/web/src/composition/viewer.server.ts`.
- Client: TanStack Query in memory (`apps/web/src/composition/query-client.ts`); there is no server-side `QueryClient` or prefetch/hydration yet.
- Browser storage: `sessionStorage` for form drafts on session expiry (`apps/web/src/modules/itinerary/ui/draft-storage.ts`). Cross-tab session events use `BroadcastChannel` (`apps/web/src/composition/session-events.client.ts`) and Web Locks for refresh (`apps/web/src/composition/http.client.ts`).

## Authentication & Identity

**Auth Provider:**
- Custom, owned by the BE (JWT access token + rotating refresh token with reuse detection). The FE is a BFF in front of it.
  - Implementation:
    - Login, register, logout, refresh and change-password go through `apps/web/src/app/api/auth/{login,register,logout,refresh,change-password}/route.ts`, thin wrappers over `apps/web/src/composition/server/auth-handlers.ts`.
    - Tokens are written only as cookies by `writeSession` / `clearSession` in `apps/web/src/composition/server/session-store.ts`. Token values never appear in a response body or client JS.
    - Cookies (names in `apps/web/src/composition/session-cookies.ts`): `__Host-tripory_at` (HttpOnly access), `__Host-tripory_rt` (HttpOnly refresh), `__Host-tripory_at_exp` (JS-readable `exp` seconds). Dev (non-production) names drop `__Host-` and `Secure`. All `SameSite=Lax`, `Path=/`; `Max-Age` of the access cookie equals the refresh expiry.
    - Session classes from `readSession(...)`: `none | invalid | stale | fresh` (stale threshold `STALE_AT_SEC` from `@tripory/identity`). Server clock decides.
    - JWT payload is decoded without signature check (`decodeJwtPayload`); the BE is the authority.
    - Route protection layers: `apps/web/src/proxy.ts` (optimistic cookie-presence redirect, `PROTECTED_PREFIXES = ["/itineraries/mine", "/settings"]`, `PROTECTED_PATTERNS` for `/itineraries/{id}/edit`), then `(dashboard)` layouts with `apps/web/src/composition/server/dashboard-gate.ts`, then BFF/BE Bearer validation. The coverage test `apps/web/src/proxy-coverage.test.ts` compares proxy lists against the `(dashboard)` folder.
    - Public itinerary page in Phase 5 must stay outside the proxy protected list: `/itineraries/[id]` is public, only `/itineraries/{id}/edit` is protected (comment in `proxy.ts`).
    - Client refresh: `withSessionRefresh` + Web Lock (`DEFAULT_SESSION_LOCK_NAME`) + idempotent `/api/auth/refresh`, from `apps/web/src/composition/http.client.ts`; UI keepers in `apps/web/src/modules/identity/ui/session-keeper.tsx`, `session-recovery.tsx`, `session-effects.tsx`.
    - Server Components read the viewer with `getViewer()` / `getSessionKind()` from `apps/web/src/composition/viewer.server.ts`; call only inside `<Suspense>` and call `cookies()` before `Date.now()`.

## BFF (browser-to-BE proxy)

- Route: `apps/web/src/app/api/bff/[...path]/route.ts` -> `forwardToBackend` in `apps/web/src/composition/server/bff.ts`
- Allowed roots: `users`, `itineraries`, `chat` (`BFF_ALLOWED_ROOTS`); methods `GET|POST|PUT|DELETE`; `auth/*` intentionally excluded
- Guards in order: method, path allowlist/traversal, same-origin check (`checkSameOrigin` in `request-guards.ts`, uses `APP_ORIGIN` when set), session state (`stale`/`invalid` -> 401 `session.expired` without calling BE), body cap 4 MB
- Forwards only `accept`, `content-type`, server-built `authorization`; returns only `content-type`, `cache-control: no-store`, `x-content-type-options: nosniff`; 5xx body replaced with an FE envelope; non-JSON upstream bodies rejected with 502
- Implication for Phase 5: a public itinerary page that renders on the server should not go through the browser BFF route. A server-side read path would need its own `callBackend` use (anonymous, no Bearer, allowed because the BE marks public endpoints `[AllowAnonymous]`) plus a decision about caching, since `callBackend` sets `cache: "no-store"`.

## Rate limiting handshake with BE

- `X-Bff-Secret` and `X-Forwarded-For` are added by `withRateLimitHeaders` in `apps/web/src/composition/server/upstream.ts` only for login, register and refresh, using `deriveClientIp` from `apps/web/src/composition/server/client-ip.ts` (trusted IP headers validated with `node:net` `isIP`). Browser-supplied values for these headers are stripped.
- Env: `BFF_SHARED_SECRET` here must equal `AuthRateLimitOptions:BffSharedSecret` on the BE.

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry or similar). `apps/web/src/app/global-error.tsx` and route `error.tsx` files only render UI.

**Logs:**
- No logging framework. Server code deliberately does not log URLs, headers, cookies or bodies (stated in comments in `upstream.ts`, `bff.ts`, `session-store.ts`, `maps-resolve.ts`). Keep it that way.

**Analytics:**
- None detected.

## CI/CD & Deployment

**Hosting:**
- Vercel (link metadata in git-ignored `.vercel/`); `VERCEL_OIDC_TOKEN` is git-ignored in `.gitignore`.

**CI Pipeline:**
- None (`.github/` absent). Quality gate is manual: `pnpm lint`, `pnpm typecheck`, `pnpm test` from the repo root.

**Build caching:**
- Turborepo local cache in `.turbo/` (git-ignored). No remote cache configured in the repo.

## Environment Configuration

**Required env vars:**
- `API_ORIGIN` - BE origin, e.g. `http://localhost:5000` locally

**Optional env vars:**
- `APP_ORIGIN` - own public origin when self-hosting behind a proxy that rewrites Host
- `BFF_SHARED_SECRET` - shared with BE for per-IP rate limiting

**Secrets location:**
- Local: `apps/web/.env.local` and repo-root `.env.local` (git-ignored via `.env*` with `!.env.example`)
- Production: Vercel project environment variables. Template and explanation: `apps/web/.env.example`.

## Webhooks & Callbacks

**Incoming:**
- None. Only first-party API routes: `/api/auth/*`, `/api/bff/*`, `/api/maps/resolve`.

**Outgoing:**
- None. Only the BE calls above and the Google Maps short-link `HEAD` requests.

---

*Integration audit: 2026-11-02*
