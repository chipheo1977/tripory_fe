# Codebase Concerns

**Analysis Date:** 2026-11-02

Scope: `apps/web` and `packages/*` on branch `phase_4` (Phases 1-4 complete). Architecture and placement rules live in `ai-memories/tripory-fe--ddd-architecture.md`; this file does not restate them. Focus is on what Phase 5 (public itinerary page, SVG map, sharing, Open Graph) will hit.

## Tech Debt

**No server-side data path for Server Components (blocks SSR for Phase 5):**
- Issue: The architecture doc plans `apps/web/src/composition/itinerary.server.ts` (server `HttpClient`), but only `apps/web/src/composition/itinerary.client.ts` and `identity.client.ts` exist. Every itinerary read goes browser -> `/api/bff` -> BE. The edit page deliberately avoids RSC data loading (`apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/page.tsx`: "không gọi BE từ RSC").
- Files: `apps/web/src/composition/server/upstream.ts` (`callBackend`), `apps/web/src/composition/server/bff.ts`, `packages/api-client/src/fetch-http-client.ts` (`getHeaders` hook documented as "Phase 3 phía server" but unused).
- Impact: A public `/itineraries/[id]` page that must be SSR/SEO/OG-friendly has no existing way to fetch from BE inside a Server Component. `callBackend` returns `{ kind, status, body }` (not an `HttpClient`), and `BFF_ALLOWED_ROOTS` forwards only for browser callers.
- Fix approach: Add `apps/web/src/composition/itinerary.server.ts` that builds `createFetchHttpClient({ baseUrl: <API_ORIGIN>/api/v1, fetch, getHeaders })` and reuses `createHttpItineraryRepository` from `@tripory/itinerary/http`, then call it from the page. Keep `import "server-only"` and `/http` imports confined to `src/composition/**` (ESLint-enforced). Use `parseServerEnv`/`serverDeps()` from `apps/web/src/composition/server/env.ts` so `API_ORIGIN` stays server-only. Decide explicitly whether the public fetch is anonymous (no Bearer) or per-viewer (draft owner view), see Security below.

**`getById` mixes owner and public reads in one repository method:**
- Issue: `packages/itinerary/src/infrastructure/http-itinerary-repository.ts` has a single `getById` returning `Itinerary` via `itineraryDetailDto`. The 403 (draft, not owner) and 404 distinctions that Phase 5 needs (ROADMAP success criteria 2) are only surfaced as `ApiError` kinds mapped in UI (`apps/web/src/modules/itinerary/ui/editor-forbidden.tsx`, `apps/web/src/components/not-found-view.tsx`).
- Impact: A server page must translate `ApiError` status 403/404 into `forbidden()`/`notFound()`; no helper for that exists.
- Fix approach: Add a small server helper in `apps/web/src/composition/` that maps `ApiError` status to Next navigation errors; do not add Next imports inside `packages/itinerary`.

**Editor owns the only "canvas" slot, SVG map not started:**
- Issue: `apps/web/src/modules/itinerary/ui/editor-layout.tsx` reserves a 4-slot layout with a canvas for Phase 5 (plan 04-20), and PUB-02 (SVG map, pin per day, polyline, zoom/pan, selection sync) was moved from Phase 5 to a not-yet-planned Phase 4 addition (`.planning/ROADMAP.md`, Phase 4 success criterion 0). No SVG map component exists in `packages/ui-web/src` or `apps/web/src/modules/itinerary/ui`.
- Impact: The map component must be shared between editor and public page. Roadmap status for Phase 4 is still "reopened"; the working branch name `phase_4` and the open PUB-02 plan overlap with Phase 5 planning.
- Fix approach: Put the pure projection (lat/lng -> SVG coords, bounds, polyline) in `packages/itinerary/src/domain/` (no DOM) and the SVG renderer in `apps/web/src/modules/itinerary/ui/` (needs DOM; `react/` layer must stay DOM-free per boundaries).

**Duplicated form-mapping modules across contexts:**
- Issue: `apps/web/src/modules/identity/ui/form-error-mapping.ts` / `form-schemas.ts` and `apps/web/src/modules/itinerary/ui/form-error-mapping.ts` / `form-schemas.ts` have parallel structure, plus `apps/web/src/lib/feedback/*` helpers.
- Impact: Low; new forms (share dialog, profile in Phase 6) will copy the pattern again.
- Fix approach: Route new mapping through `apps/web/src/lib/feedback` rather than a third copy.

**Documented versions drift from the repo:**
- Issue: `ai-memories/tripory-fe--ddd-architecture.md` says pnpm 11.6.0 and turbo 2.11.7; root `package.json` declares `"packageManager": "pnpm@10.34.6"` and `"turbo": "2.11.10"`. `pnpm-workspace.yaml` has a comment saying `allowBuilds` is supported from pnpm 10.26, so the doc's "pnpm 11" framing of `allowBuilds` does not match the pinned version.
- Impact: Misleading when reproducing installs; the codemod failure the user hit (expected 2.11.10, installed 2.11.7) matches this drift.
- Fix approach: Treat `package.json` and `pnpm-workspace.yaml` as source of truth; update the memory doc when versions are bumped.

**Stray formatting in a shared package file:**
- Issue: `packages/api-client/src/fetch-http-client.ts` line 1 begins with a leading space before `import`.
- Impact: Cosmetic; indicates no formatter (Prettier/Biome) runs in CI.
- Fix approach: Remove the space; consider adding a formatter if the team grows.

## Known Bugs

**Browser back button cannot be guarded in the editor:**
- Symptoms: Leaving the editor with the browser back button while a write is in flight does not prompt; the write still reaches BE but optimistic rollback UI is lost.
- Files: `apps/web/src/modules/itinerary/ui/leave-guard.tsx` (header comment: "Giới hạn đã biết").
- Trigger: Press browser back during a pending mutation.
- Workaround: In-app navigation is guarded; back is a documented limitation (App Router `popstate`).

**Unload DELETE can be lost when the access token is stale:**
- Symptoms: Deleting a waypoint while closing the tab silently fails if the cookie session is stale.
- Files: `packages/itinerary/src/infrastructure/http-itinerary-repository.ts` (`deleteWaypoint` with `keepalive`), `apps/web/src/composition/http.client.ts` (`bffUnloadHttp` without refresh).
- Trigger: Close tab within the pending-delete window (5 s undo) after the access token is within `STALE_AT_SEC` of expiry.
- Workaround: Accepted risk (T-04-19 noted in code).

## Security Considerations

**BFF returns 401 to anonymous-capable GETs when the cookie is stale:**
- Risk: In `apps/web/src/composition/server/bff.ts`, `session.state === "stale" | "invalid"` returns 401 `session.expired` before calling BE. This is correct for editor reads (client refreshes and replays) but any public view fetched through `/api/bff` by a visitor with leftover expired cookies is blocked until refresh succeeds.
- Files: `apps/web/src/composition/server/bff.ts`, `apps/web/src/composition/server/session-store.ts` (`readSession`).
- Current mitigation: Client `withSessionRefresh` (`packages/api-client/src/with-session-refresh.ts`) refreshes and retries.
- Recommendations: For the public page do not rely on BFF. Fetch server-side anonymously, and only add Bearer in a separate owner-aware step (to show the "Bản nháp – chỉ bạn thấy" banner and Edit button). Never forward the viewer cookie into a shared/cached render.

**Token never reaches client JS, keep it that way for SSR:**
- Risk: Access and refresh cookies are `HttpOnly`; `at_exp` is the only JS-readable cookie (`apps/web/src/composition/server/session-store.ts` `writeSession`). A Server Component that reads `cookies()` and passes a token or a response containing a token as a prop would leak it.
- Files: `apps/web/src/composition/viewer.server.ts`, `apps/web/src/composition/server/session-store.ts`.
- Current mitigation: `viewer.server.ts` only returns a `Viewer` (id, email, name, handle, `avatarUrl: null`) decoded from claims; JWT signature is not verified (FE has no secret).
- Recommendations: Treat `getViewer()` as display-only identity, never as authorization. Authorization for draft access must come from BE 403/404 on the BE call. Do not use `canEdit` (`packages/itinerary/src/domain/permissions.ts`) as a security gate; it only hides UI.

**Viewer from unsigned JWT claims:**
- Risk: `readViewerFromCookie` trusts decoded claims of a cookie the browser can set. A forged `at` cookie yields a fake Viewer in UI (not authorization; BE rejects the token).
- Files: `apps/web/src/composition/server/session-store.ts`.
- Current mitigation: Comment in `apps/web/src/proxy.ts` states proxy is UX only, BFF/BE authenticate. `key={viewer.id}` in the edit page resets editor state per viewer.
- Recommendations: On the public page, only use the viewer for showing "owner" affordances after BE confirms ownership (compare BE `ownerId` to viewer id, as `canEdit` does), and never include viewer data in cached output.

**No Content-Security-Policy or security headers configured:**
- Risk: `apps/web/next.config.ts` sets only `cacheComponents`, `partialPrefetching` and Turbopack CSS rules. No `headers()` with CSP, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`. The BFF sets `nosniff` on its own responses only.
- Files: `apps/web/next.config.ts`, `apps/web/src/proxy.ts`.
- Current mitigation: User-supplied cover URLs are https-only and rendered with `referrerPolicy="no-referrer"` (`apps/web/src/modules/itinerary/ui/cover-image.tsx`); BFF only passes JSON content types (`isPassableUpstreamBody` in `apps/web/src/composition/server/upstream.ts`).
- Recommendations: Before shipping a public, indexable page, add baseline headers (frame-ancestors, referrer policy) and consider a CSP that allows `img-src https:`. Anything rendering BE text (title, description, notes, waypoint names) must stay as React text nodes. `dangerouslySetInnerHTML` currently appears nowhere in `apps/web/src` or `packages/`; keep it that way, including for JSON-LD or OG tags (serialize with escaping of `<`).

**User-controlled image URLs bypass `next/image`:**
- Risk: Cover image URL is user input (`coverImageUrl`), rendered via raw `<img>` with two `eslint-disable-next-line @next/next/no-img-element` comments in `apps/web/src/modules/itinerary/ui/cover-image.tsx` and `apps/web/src/modules/itinerary/ui/trip-info-dialog.tsx`. The public page can be used as an unauthenticated tracking pixel host (visitors fetch an attacker-chosen URL).
- Files: same as above; `apps/web/next.config.ts` has no `images.remotePatterns`.
- Current mitigation: https-only check (`isHttps`), `no-referrer`, `loading="lazy"`.
- Recommendations: For Open Graph `og:image`, validate the URL server-side (https, optional host allowlist) before emitting metadata. Do not feed arbitrary user URLs to `next/image` without `remotePatterns`.

**Short-link resolver is an SSRF-sensitive endpoint without rate limiting:**
- Risk: `apps/web/src/app/api/maps/resolve/route.ts` follows redirects for Google Maps short links.
- Files: `apps/web/src/composition/server/maps-resolve.ts`, `apps/web/src/composition/server/maps-handlers.ts`.
- Current mitigation: https only, host allowlist each hop (`maps.app.goo.gl`, `goo.gl/maps/*`), `redirect: "manual"`, max 3 hops, 5 s total, HEAD only, no body read. Explicitly "Không rate limit (D-51, rủi ro chấp nhận)".
- Recommendations: Keep this route out of any public/anonymous prefetch path in Phase 5. If the share page ever embeds it, add per-IP limiting (see `apps/web/src/composition/server/client-ip.ts`).

**`X-Bff-Secret` / client IP only on three auth endpoints:**
- Risk: Rate limiting on BE depends on `BFF_SHARED_SECRET` + `X-Forwarded-For`. Proxy `/api/bff` intentionally does not forward them (`withRateLimitHeaders` in `apps/web/src/composition/server/upstream.ts`), so anonymous public reads are counted under the FE server IP at BE.
- Impact: A server-side public page fetch will share one BE rate bucket across all visitors if BE rate-limits that endpoint.
- Recommendations: Confirm with `c:\Users\OS\Documents\personal\tripory_be` which limits apply to `GET /itineraries/{id}` before relying on SSR for traffic.

**Env files:**
- `.env.local` exists at repo root (ignored by `.gitignore` via `.env*`); it contains a Vercel-CLI-generated OIDC token variable (`VERCEL_OIDC_TOKEN`). Values not recorded here. Required runtime variables per `apps/web/src/composition/server/env.ts` and `turbo.json`: `API_ORIGIN` (required), `APP_ORIGIN`, `BFF_SHARED_SECRET` (optional). `.env.local` does not define `API_ORIGIN`, so `next dev` at the repo root relies on a shell variable or an `apps/web` env file.
- `.vercel/` is ignored and holds `project.json`; do not commit.

## Performance Bottlenecks

**All itinerary data is client-fetched; no first-paint data for the public page:**
- Problem: Editor shows `EditorSkeleton` until the client queries `/api/bff/itineraries/{id}` (`packages/itinerary/src/react/index.ts` `useItinerary`, `staleTime: 0`, refetch on focus).
- Files: `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx` (348 lines), `packages/itinerary/src/react/index.ts`.
- Cause: Design decision D-46 (avoid RSC fetch so expired Bearer is refreshed before a 403 verdict). Fine for the editor, wrong for a public SEO page: crawlers and link unfurlers (Zalo/Messenger) would see only a skeleton and no `og:*` tags.
- Improvement path: Public page and `generateMetadata` must fetch on the server. Consider hydrating TanStack Query via `HydrationBoundary`/initial data from the server result so the map renders without a second request.

**Cache Components: dynamic access must be inside Suspense:**
- Problem: `cacheComponents: true` in `apps/web/next.config.ts`. Reading `cookies()`, `Date.now()` or `params` outside `<Suspense>` breaks prerender. Existing code already follows this: `apps/web/src/app/layout.tsx` stays static, `apps/web/src/composition/viewer.server.ts` calls `cookies()` before `Date.now()`, `apps/web/src/app/providers.tsx` wraps `SessionEffects`/`SessionKeeper` in `<Suspense fallback={null}>`.
- Files: `apps/web/src/app/(dashboard)/(editor)/layout.tsx`, `apps/web/src/app/(public)/layout.tsx`, `apps/web/src/composition/viewer.server.ts`.
- Cause: New public route `apps/web/src/app/(public)/itineraries/[id]/page.tsx` will fetch BE data (dynamic at request time) and read `params`.
- Improvement path: Read the matching guides in `apps/web/node_modules/next/dist/docs/` first (`use cache`, `cacheLife`, `cacheTag`, `generateStaticParams`, `generateMetadata` under Cache Components). No `use cache`, `cacheLife`, `cacheTag` or `generateStaticParams` is used anywhere in `apps/web/src` today, so there is no local precedent. If the public fetch is cached, key it only by itinerary id and never include cookies/tokens (the comment in `apps/web/src/composition/viewer.server.ts` already warns that tokens would land in cache keys). Invalidate with `cacheTag` from publish/update flows, which currently only invalidate TanStack keys (`settle()` in `packages/itinerary/src/react/index.ts`).

**BE cold start and timeouts:**
- Problem: BE is on a free host; client timeout 30 s (`DEFAULT_TIMEOUT_MS` in `packages/api-client/src/fetch-http-client.ts`), BFF upstream timeout 28 s (`UPSTREAM_TIMEOUT_MS` in `apps/web/src/composition/server/upstream.ts`). A server-rendered public page waiting on a cold BE can hold a Vercel function for up to 28 s.
- Improvement path: Give the server public fetch a shorter `timeoutMs` and a `loading.tsx`/Suspense boundary (`apps/web/src/app/(public)/loading.tsx` exists as a generic fallback).

**Large SVG map rendering:**
- Problem: Not implemented yet; many waypoints with per-pin React state could re-render the whole SVG on every hover/select.
- Improvement path: Memoize projected coordinates (pure function from domain), keep selection state outside the SVG tree, avoid re-creating polyline `points` on each render.

## Fragile Areas

**Session refresh coordination (Web Locks + idempotent route):**
- Files: `apps/web/src/composition/http.client.ts`, `apps/web/src/composition/session-events.client.ts`, `apps/web/src/composition/server/auth-handlers.ts`, `packages/api-client/src/with-session-refresh.ts`, `apps/web/src/modules/identity/ui/session-keeper.tsx`.
- Why fragile: BE rotates refresh tokens with reuse detection; two concurrent refreshes cause `Token.Compromised` and revoke all sessions. Correctness depends on a single module-level singleton (`makeBrowserHttp`), `navigator.locks`, and the refresh route being a no-op when the cookie is fresh. A new client that calls `/api/auth/refresh` directly (for example a Phase 5 owner-check component) will break it. Without `navigator.locks` (HTTP over LAN IP) only a per-tab mutex exists.
- Safe modification: Always go through `refreshSession`/`bffHttp` from `apps/web/src/composition/http.client.ts`. Never call refresh from a Server Component or from `fetch` in a new place.
- Test coverage: Strong (`http.client.test.ts` 350 lines, `with-session-refresh.test.ts`, `auth-handlers.refresh.test.ts`).

**Proxy protection list is hand-maintained:**
- Files: `apps/web/src/proxy.ts` (`PROTECTED_PREFIXES`, `PROTECTED_PATTERNS`), `apps/web/src/proxy-coverage.test.ts`.
- Why fragile: The proxy cannot see route groups. `/itineraries` is deliberately not a protected prefix because Phase 5 adds the public `/itineraries/[id]`; only `/itineraries/{id}/edit` and `/itineraries/mine` are protected. A new route such as `/itineraries/[id]/share` or `/itineraries/new` would silently be public.
- Safe modification: Add any new authenticated path to `PROTECTED_PREFIXES`/`PROTECTED_PATTERNS` and keep `proxy-coverage.test.ts` green. The matcher regex excludes any path containing a dot-extension (`.*\\.[a-zA-Z0-9]+$`), so route segments like `/itineraries/abc.def` skip the proxy entirely.

**BFF allowlist and path handling:**
- Files: `apps/web/src/composition/server/bff.ts` (`BFF_ALLOWED_ROOTS = users, itineraries, chat`), `apps/web/src/app/api/bff/[...path]/route.ts`.
- Why fragile: The BFF is the only barrier against open proxying. New BE roots (for example a future `social` or `discovery`) require an explicit allowlist edit; the `auth` root is deliberately excluded. Traversal checks run on the raw pathname (`ENCODED_TRAVERSAL = /%2f|%5c|%2e/i`), so any legitimate id containing a dot or encoded slash would be rejected with 400.
- Safe modification: Keep the order method -> path -> origin -> session -> body. Update `bff.forward.test.ts` (510 lines) when adding roots.

**Same-origin check depends on hosting:**
- Files: `apps/web/src/composition/server/request-guards.ts` (`checkSameOrigin`).
- Why fragile: Compares `Origin` with `request.nextUrl.origin`; behind a reverse proxy that rewrites Host every write is 403 `Bff.CrossOrigin`. `APP_ORIGIN` exists for that case. Preview deployments on Vercel with different hostnames work only if the platform sets the public host.
- Safe modification: Set `APP_ORIGIN` for any self-hosted or custom-domain setup; Share/Web Share actions should not POST cross-origin.

**Editor container size and drag-and-drop:**
- Files: `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx` (348 lines), `waypoint-form-dialog.tsx` (321), `waypoint-list.tsx` (231), `sortable-waypoint-item.tsx` (137), `trip-info-dialog.tsx` (248), `my-itineraries-view.tsx` (234).
- Why fragile: Many interacting concerns (draft restore, leave guard, pending delete with 5 s undo, optimistic reorder, dialogs, forbidden/not-found states). Adding the SVG map canvas and share dialog here raises the risk of regressions in save-state (`save-indicator.tsx`, `save-status.ts`) and the single write scope `['itinerary','write',id]` in `packages/itinerary/src/react/index.ts`.
- Safe modification: Add new write mutations only through `useWriteMutation`; they must share `itineraryKeys.write(id)` and the `scope` so ordering (delete before reorder) and `useIsMutating` indicators stay correct. Publish already uses this path; the share dialog (opened after publish, ROADMAP Phase 5 criterion 3) should subscribe to publish success via `usePublish` options, not poll.

**Optimistic cache and refetch race:**
- Files: `packages/itinerary/src/react/index.ts` (`settle`, `useItinerary`).
- Why fragile: `settle` invalidates only when `isMutating(...) <= 1`; `refetchOnWindowFocus` is disabled while a write is pending. Introducing another query on the same key (for example the public page reusing `itineraryKeys.detail`) can replace optimistic data during a write.
- Safe modification: Use a distinct key such as `itineraryKeys.public(id)` for public data; add it to the `itineraryKeys` factory and cover it in `packages/itinerary/src/react/keys.test.ts`.

**ESLint boundary preset is a single large file:**
- Files: `packages/config/eslint/boundaries.mjs` (158 lines), `packages/config/test/boundaries.test.ts` (197 lines).
- Why fragile: Flat-config blocks override each other for `no-restricted-imports`; every region must list all patterns. Adding a dependency (for example a QR code library or `next` helpers in a package) requires editing the allowlist plus the self-test. A library for QR must live in `apps/web` (DOM/React), not in `packages/itinerary` layers.
- Safe modification: Follow section 8 of `ai-memories/tripory-fe--ddd-architecture.md`; extend the self-test with a violating and a valid case.

## Scaling Limits

**BFF body buffering:**
- Current capacity: 4 MB cap (`BFF_MAX_BODY_BYTES` in `apps/web/src/composition/server/bff.ts`), body read fully via `arrayBuffer()`, upstream response read as text.
- Limit: Voice upload / image upload in Phase 7 will not fit and responses other than JSON are rejected (`Bff.InvalidUpstream`).
- Scaling path: Separate route handler with streaming for binary, as the code comments already state.

**Draft storage in `sessionStorage`:**
- Current capacity: Per-tab, 24 h TTL, keyed by viewer/itinerary/kind (`apps/web/src/modules/itinerary/ui/draft-storage.ts`).
- Limit: Lost on tab close; quota errors are swallowed silently.
- Scaling path: None needed now.

## Dependencies at Risk

**Pinned versions with known upgrade constraints (`pnpm-workspace.yaml`):**
- `vitest` 4.1.11: Vitest 5 needs `@types/node` >= 22 while the catalog pins `@types/node` 20.19.43; upgrade both together.
- `jsdom` 29.1.1: 30.x needs a newer Node than the environment.
- `@base-ui/react` 1.8.0: deliberately not upgraded to 1.9.0.
- `next` 16.4.0 / `react` 19.3.0 / `eslint-config-next` 16.4.0: breaking-change Next version; `apps/web/AGENTS.md` requires reading `apps/web/node_modules/next/dist/docs/` before Next code. Relevant for Phase 5: metadata API (`generateMetadata`, `opengraph-image`), `use cache`, `forbidden()`/`unauthorized()`.
- `allowBuilds: unrs-resolver: false` in `pnpm-workspace.yaml`; a different pnpm version may re-inject a duplicate `allowBuilds` key (see doc section 9).
- `engines.node` is `24.x` in `apps/web/package.json`; the `@types/node` 20 types lag the runtime.

## Missing Critical Features

**Public itinerary route and metadata:**
- Problem: No `apps/web/src/app/(public)/itineraries/[id]/page.tsx`, no `generateMetadata`, no `opengraph-image`, no `robots`/`noindex` handling for drafts, no `sitemap`.
- Blocks: PUB-01, PUB-03..PUB-06 (Phase 5), Zalo/Messenger link previews.

**Share UX:**
- Problem: No copy-link, Web Share API, or QR code code exists; the post-publish share dialog was moved to Phase 5 (`04-CONTEXT.md` D-40).
- Blocks: Sharing success criterion (ROADMAP Phase 5 item 3). `apps/web/src/modules/itinerary/ui/publish-dialog.tsx` and `publish-button.tsx` are where the hand-off will occur.

**SVG map component and map data model:**
- Problem: No projection, pin, polyline, zoom/pan. Waypoint coordinates are `Wgs84Coordinate` (`packages/shared-kernel/src/geo.ts`); distances come from BE only.
- Blocks: PUB-02 (currently assigned to a not-yet-planned Phase 4 plan), Phase 5 criterion 4 (editor and public page share the component).

**Owner-aware public view:**
- Problem: "Bản nháp – chỉ bạn thấy" banner and Edit button need a viewer-vs-owner comparison on a server-rendered page, while the cached/static shell must not depend on cookies.
- Blocks: ROADMAP Phase 5 criterion 2.

**Tests do not cover rendering under real Next:**
- Problem: Page tests such as `apps/web/src/app/(public)/page.test.tsx` and route-layout tests run in Vitest/jsdom (`apps/web/src/app/route-layouts.test.tsx`). Cache Components errors (dynamic access outside Suspense) appear only in `next build`/`next dev`.
- Blocks: Confidence for SSR work; run `pnpm build` (which depends on `API_ORIGIN` env in `turbo.json`) in addition to lint/typecheck/test.

## Test Coverage Gaps

**Files with no co-located test:**
- Files: `apps/web/src/modules/itinerary/ui/sortable-waypoint-item.tsx`, `editor-skeleton.tsx`, `form-field-row.tsx`, `entry-flag.ts`, `use-form-draft.ts`, `use-media-query.ts`, `apps/web/src/components/navigation-guard.tsx`, `apps/web/src/components/not-found-view.tsx`, `packages/ui-web/src/atoms/field-adornments.tsx`, `apps/web/src/app/(dashboard)/(editor)/layout.tsx`, `apps/web/src/app/api/*/route.ts` (covered indirectly via `composition/server/*.test.ts`).
- Risk: Low to medium; `sortable-waypoint-item.tsx` is exercised through `waypoint-list.test.tsx`.
- Priority: Low.

**No E2E or visual tests:**
- What's not tested: Real browser flows (cookie writes, Web Locks across tabs, drag-and-drop on touch, Web Share). ROADMAP defers Playwright smoke to Phase 8.
- Files: none (absent).
- Risk: SSR/OG regressions in Phase 5 can only be caught manually or by `next build`.
- Priority: Medium for Phase 5.

**Sensitive paths rely on string-level tests:**
- What's tested heavily: BFF (`bff.forward.test.ts`, `bff.resolve.test.ts`), session store, env, upstream, request guards, proxy; invariants in `apps/web/src/auth-invariants.test.ts` and `apps/web/src/itinerary-invariants.test.ts`.
- Gap: The invariants tests are static checks over source; a new public route needs its own invariant (no `cookies()` outside Suspense, no token in props, no `dangerouslySetInnerHTML`).
- Priority: High when Phase 5 starts.

---

*Concerns audit: 2026-11-02*
