# Architecture

**Analysis Date:** 2026-11-02

Source of truth for the rules below: `ai-memories/tripory-fe--ddd-architecture.md` (placement rules, section 5 = dependency table) and `packages/config/eslint/boundaries.mjs` (enforcement). This file describes the code as it exists on branch `phase_4`; it does not replace those two files.

## Pattern Overview

**Overall:** pnpm + Turborepo monorepo. Each bounded context is a package with Ports & Adapters layering (`domain` / `application` / `infrastructure` / `react`). The Next.js app is the composition root and the only place that wires adapters to hooks. The browser never talks to the backend directly: all REST traffic goes through a same-origin BFF (Route Handlers) that holds tokens in httpOnly cookies.

**Key Characteristics:**
- Layer boundaries are enforced by ESLint presets (`contextPackage()`, `kernelPackage()`, `httpPackage()`, `uiPackage()`, `app()` in `packages/config/eslint/boundaries.mjs`), default-deny import allowlists, and a self-test (`packages/config/test/boundaries.test.ts`). A blocked import means the code is in the wrong layer.
- Packages export TypeScript source directly via `exports` (no build step). Subpaths: `.` (domain + application, pure), `./http` (adapters, composition only), `./react` (hook factory).
- Domain is plain `type` + pure functions (no classes). Hooks are produced by factories that receive ports, so packages never know about HTTP, cookies, or Next.
- Auth tokens live only in httpOnly cookies written by Route Handlers. Client JS holds no access or refresh token.
- Next.js 16.4.0 with Cache Components (`cacheComponents: true`, `partialPrefetching: true` in `apps/web/next.config.ts`), Turbopack, React 19.3.0. Anything reading `cookies()` / `params` must sit under `<Suspense>`.
- Only `apps/web` exists. `apps/admin` and `apps/mobile` from the architecture doc are not created yet.

## Layers

**Domain (`packages/<context>/src/domain`):**
- Purpose: business rules and derived values (permissions, day ranges, optimistic cache transforms, password rules).
- Location: `packages/itinerary/src/domain/`, `packages/identity/src/domain/`
- Contains: readonly types and pure functions, e.g. `canEdit`, `buildDayRange`, `isValidDayOrder`, `applyDayOrder`, `withoutWaypoint` (`packages/itinerary/src/domain/*.ts`), `toSafeNextPath`, `isFresh` (`packages/identity/src/domain/*.ts`).
- Depends on: `@tripory/shared-kernel` only. No `fetch`, browser globals, `Date.now`, `new Date()` without args, `Math.random`.
- Used by: application, infrastructure, react, and (types/pure helpers) the app UI.

**Application (`packages/<context>/src/application`):**
- Purpose: ports (interfaces to the outside) and use cases that orchestrate several steps.
- Location: `packages/itinerary/src/application/ports.ts`, `use-cases.ts`; `packages/identity/src/application/ports.ts`
- Contains: `ItineraryRepository`, `ShortLinkResolver`, `SessionGateway`, `ProfileReader` types; `reorderWaypoints(repo, itinerary, input)`.
- Depends on: domain, `@tripory/shared-kernel`.
- Used by: infrastructure (implements ports), react (consumes ports).
- Rule: use cases only for multi-step or rule-checking writes. Simple reads go straight to the repository; hooks call ports directly.

**Infrastructure (`packages/<context>/src/infrastructure`, subpath `/http`):**
- Purpose: Anti-Corruption Layer. Zod DTO schemas, mappers DTO -> domain, HTTP repository implementations over `HttpClient`.
- Location: `packages/itinerary/src/infrastructure/{dto,mappers,http-itinerary-repository,http-short-link-resolver}.ts`, `packages/identity/src/infrastructure/{dto,mappers,http-session-gateway,access-token-claims}.ts`
- Depends on: `@tripory/shared-kernel`, `@tripory/api-client`, `zod`, plus application/domain of the same package.
- Used by: only `apps/web/src/composition/**` (rule `httpOnlyInComposition`). Server composition code also uses `@tripory/identity/http` (`parseAccessTokenClaims`).

**React hooks (`packages/<context>/src/react`, subpath `/react`):**
- Purpose: platform-neutral React Query hooks (shareable with React Native later). No DOM, no Next.
- Location: `packages/itinerary/src/react/index.ts` (`createItineraryHooks`, `itineraryKeys`), `packages/identity/src/react/index.ts` (`createIdentityHooks`, `identityKeys`)
- Depends on: `react`, `@tanstack/react-query`, `@tripory/shared-kernel`, application/domain.
- Used by: `apps/web/src/composition/*.client.ts` which call the factory once.

**Shared kernel (`packages/shared-kernel/src`):**
- Purpose: value objects used by 2+ contexts: branded ids (`ItineraryId`, `UserId`, `parseItineraryId`) in `ids.ts`, `Wgs84Coordinate` in `geo.ts`. Depends on nothing.

**HTTP client (`packages/api-client/src`):**
- Purpose: `HttpClient` port (`http-client.ts`), `ApiError` model (`api-error.ts`, `to-api-error.ts`), fetch adapter (`fetch-http-client.ts`), refresh-on-401 wrapper (`with-session-refresh.ts`). Root entry exports types and `isApiError`/`makeApiError`; `./http` exports adapters (composition only). May use `fetch`.

**UI kit (`packages/ui-web/src`, `packages/design-tokens/src`):**
- `ui-web`: atoms (`src/atoms/`) and molecules (`src/molecules/`) on Base UI + Tailwind 4 + cva. Atoms never import molecules. Exports via `src/index.ts` and `./styles.css`.
- `design-tokens`: CSS token layers (`primitives.css`, `semantic.css`, `components.css`, `theme.css`, `dark.css`) and a few TS constants (`sheetSnapPoints`, `overlayOffsetPx`). Imported by `apps/web/src/app/globals.css`.
- Guarded by `packages/ui-web/src/token-guard.test.ts` (no hard-coded colors/orphan CSS variables) and `packages/design-tokens/src/tokens.test.ts`.

**App composition root (`apps/web/src/composition/`):**
- Purpose: the only place that imports `/http` adapters, builds `HttpClient` instances, and calls hook factories.
- Client side: `http.client.ts` (browser `HttpClient`s + session refresh lock), `itinerary.client.ts`, `identity.client.ts`, `query-client.ts`, `session-events.client.ts`, `session-cookies.ts` (shared pure cookie names).
- Server side: `viewer.server.ts` (the only file with `import "server-only"`, uses `cookies()` and `React.cache`), and `server/*.ts` (pure, testable handlers: `bff.ts`, `auth-handlers.ts`, `maps-handlers.ts`, `maps-resolve.ts`, `session-store.ts`, `upstream.ts`, `env.ts`, `request-guards.ts`, `dashboard-gate.ts`, `client-ip.ts`, `json-body.ts`).

**App UI modules (`apps/web/src/modules/<context>/ui`):**
- Web-only components, hooks and form logic per context: `modules/itinerary/ui/` (editor, timeline, dialogs, list), `modules/identity/ui/` (auth forms, session gate/keeper/recovery). Import hooks only from `@/composition/*`, never from `/http`.

**App shell and routing (`apps/web/src/app`, `apps/web/src/components`, `apps/web/src/proxy.ts`):**
- `app/` only assembles. Route Handlers are thin shells (<= 25 lines, enforced by `apps/web/src/auth-invariants.test.ts`) over `@/composition/server/*`.
- `components/`: cross-module shell pieces (`app-shell.tsx`, `app-header.tsx`, `account-slot.tsx`, `user-menu.tsx`, `navigation-guard.tsx`, `not-found-view.tsx`, `submit-status.tsx`).
- `lib/feedback/`: toast/error-message policy shared by mutations (`mutation-feedback.ts`, `error-messages.ts`, `form-error.ts`).

## Data Flow

**Authenticated read/write (editor, my itineraries):**

1. A client component calls a hook from `apps/web/src/composition/itinerary.client.ts`, e.g. `itinerary.useItinerary(id)` (`modules/itinerary/ui/itinerary-editor.tsx`).
2. The hook calls `ItineraryRepository` built by `createHttpItineraryRepository(bffHttp, { unloadHttp: bffUnloadHttp })`.
3. `bffHttp` = `withSessionRefresh(createFetchHttpClient({ baseUrl: "/api/bff" }), ...)` in `composition/http.client.ts`. On 401 it takes a Web Lock, calls `POST /api/auth/refresh` once, then replays the request.
4. `app/api/bff/[...path]/route.ts` -> `forwardToBackend` (`composition/server/bff.ts`): method check -> path allowlist (`users`, `itineraries`, `chat`) and traversal check -> same-Origin check -> session cookie state -> bounded body (4 MB) -> `callBackend` with server-attached Bearer -> response with only `content-type` and `cache-control: no-store`.
5. Stale/invalid access cookie returns 401 `session.expired` without calling the backend; no cookie forwards anonymously so public endpoints still work.
6. The mapper in `packages/itinerary/src/infrastructure/mappers.ts` validates with Zod DTOs and returns domain `Itinerary`.

**Login / session:**

1. `useLogin` (`identity.client.ts`) -> `authHttp` (`/api/auth`) -> `app/api/auth/login/route.ts` -> `handleLogin` (`composition/server/auth-handlers.ts`).
2. Handler calls the backend, then `writeSession` (`composition/server/session-store.ts`) sets three cookies: access (httpOnly), refresh (httpOnly), `at_exp` (JS-readable number used to schedule refresh). Names come from `composition/session-cookies.ts` (`__Host-` prefix in production, plain names over http dev).
3. Response body returns only a `Viewer`, never tokens.

**Route protection (three layers, all UX only; real authorization is BFF + backend):**
1. `apps/web/src/proxy.ts`: optimistic redirect to `/login?next=` by cookie presence. Protected set is `PROTECTED_PREFIXES` (`/itineraries/mine`, `/settings`) plus `PROTECTED_PATTERNS` (`/itineraries/{id}/edit`). `/itineraries/{id}` is deliberately not protected (Phase 5 public page). `proxy-coverage.test.ts` fails CI if a `(dashboard)` page is not covered.
2. `modules/identity/ui/dashboard-session-gate.tsx` (async Server Component in each `(dashboard)` layout, inside `<Suspense>`): `decideDashboardGate(kind)` -> `LoginRedirect` | `SessionRecovery` (silent client refresh then `router.refresh()`) | render.
3. Page-level `getViewer()` (`composition/viewer.server.ts`) in `edit/page.tsx`.

**Editor write path:**
- All editor mutations in `createItineraryHooks` share `mutationKey = itineraryKeys.write(id)` and `scope: { id: "itinerary:<id>" }` so TanStack runs them serially. Optimistic update with snapshot rollback in `useWriteMutation`; `settle()` invalidates detail + lists only after the last in-flight write. Pending waypoint delete is held client-side for undo (`modules/itinerary/ui/use-pending-delete.ts`) and flushed with `keepalive` on page hide (`itineraryUnload` in `itinerary.client.ts`).
- Server renders only `parseItineraryId(id)` + `getViewer()`; itinerary data loads client-side through the BFF so an expired Bearer is refreshed before a 403 verdict.

**State Management:**
- Server state: one browser `QueryClient` per session (`makeQueryClient` in `composition/query-client.ts`, held with `useState` in `app/providers.tsx`). No server-side QueryClient and no shared cache across requests. Defaults: `retry: false`, `staleTime: 60_000`. `MutationCache` routes `meta.feedback` to toasts; `QueryCache` has no toast.
- Local UI state: React state/context in modules (e.g. `modules/itinerary/ui/save-status.ts` store + provider, `draft-storage.ts` for form drafts in storage, `entry-flag.ts`).
- Forms: `react-hook-form` + `zod` resolvers, schemas in `modules/*/ui/form-schemas.ts`.

## Key Abstractions

**Hook factory (`createItineraryHooks`, `createIdentityHooks`):**
- Purpose: build hooks from injected ports; called once at module scope in the composition file.
- Examples: `packages/itinerary/src/react/index.ts`, `apps/web/src/composition/itinerary.client.ts`
- Pattern:
```ts
// apps/web/src/composition/itinerary.client.ts
const repository = createHttpItineraryRepository(bffHttp, { unloadHttp: bffUnloadHttp });
export const itinerary = createItineraryHooks({ repository, shortLinks: createHttpShortLinkResolver(appHttp) });
```

**Port + adapter (`ItineraryRepository`, `SessionGateway`):**
- Purpose: contract between application and infrastructure; fakes used in tests.
- Examples: `packages/itinerary/src/application/ports.ts`, `packages/identity/src/application/ports.ts`

**Query keys (`itineraryKeys`, `identityKeys`):**
- Purpose: one key group per aggregate root; UI reads save state via `useIsMutating` on `itineraryKeys.write(id)`.
- Examples: `packages/itinerary/src/react/index.ts`

**Branded ids and coordinates:**
- Purpose: `ItineraryId`, `UserId` (parsed with `parseItineraryId`), `Wgs84Coordinate` in `packages/shared-kernel/src/ids.ts`, `geo.ts`.

**Pure server handlers:**
- Purpose: logic testable under Vitest without `next/headers`; Route Handlers and `viewer.server.ts` are thin wrappers. Dependencies injected via `ServerDeps` (`env`, `fetch`, `nowMs`, `secure`) from `composition/server/env.ts` (`serverDeps()`).

## Entry Points

**Root layout:**
- Location: `apps/web/src/app/layout.tsx`
- Triggers: every request. Static; does not read cookies. Wraps children in `Providers`.
- Responsibilities: Inter font (`latin`, `vietnamese`), `<html lang="vi">`, title template `%s · Tripory`.

**Providers:**
- Location: `apps/web/src/app/providers.tsx` (client)
- Responsibilities: `QueryClientProvider`, `Toast`, and `SessionEffects` + `SessionKeeper` inside `<Suspense fallback={null}>` (they use `usePathname`/`useSearchParams`).

**Route groups:**
- `apps/web/src/app/(public)/` -> `AppShell variant="public"`: `/`, `/login`, `/register`.
- `apps/web/src/app/(dashboard)/(shell)/` -> `AppShell variant="dashboard"` + `DashboardSessionGate`: `/itineraries/mine`, `/settings/password`.
- `apps/web/src/app/(dashboard)/(editor)/` -> full-screen layout (no AppShell) + `DashboardSessionGate`: `/itineraries/[id]/edit`.
- Route Handlers: `app/api/auth/{login,register,logout,refresh,change-password}/route.ts`, `app/api/bff/[...path]/route.ts` (GET/POST/PUT/DELETE only), `app/api/maps/resolve/route.ts` (POST).

**Proxy:**
- Location: `apps/web/src/proxy.ts` (Next 16 replacement for middleware), matcher excludes `api/`, static assets.

**Phase 5 insertion points (not implemented):** public page `/itineraries/[id]` belongs in `app/(public)/itineraries/[id]/page.tsx` (SSR, must not be added to `PROTECTED_*`), per the architecture doc section 4. Public reads can use `createHttpItineraryRepository` from a server composition file (`composition/itinerary.server.ts`, to be created with `import "server-only"`), since BFF forwards anonymously when no cookie exists but RSC cannot use the browser `HttpClient`.

## Error Handling

**Strategy:** Errors from the backend are normalized to `ApiError` (`packages/api-client/src/api-error.ts`, `to-api-error.ts`) with a `kind`, status, code, and field errors. UI maps them to messages.

**Patterns:**
- Read queries: `ErrorState` with a retry button, no toast (`composition/query-client.ts`, decision D-10). Mutations: `meta.feedback` -> toast via `lib/feedback/mutation-feedback.ts`.
- Form errors: `modules/*/ui/form-error-mapping.ts` map `ApiError.fieldErrors` onto form fields; copy in `lib/feedback/error-messages.ts`.
- Editor branches: loading -> `EditorSkeleton`, 404 -> `NotFoundView`, 403 or `!canEdit` -> `EditorForbidden`, else `ErrorState` (`modules/itinerary/ui/itinerary-editor.tsx`).
- Route boundaries: `error.tsx` / `loading.tsx` in `(public)`, `(shell)`, and `edit/`; `app/global-error.tsx`; `app/not-found.tsx`.
- Domain errors: only `DomainError extends Error` is allowed as a class (architecture doc section 1); `reorderWaypoints` throws `Error` on invalid id sets before any network call.
- BFF: errors use an envelope from `composition/server/request-guards.ts` (`errorEnvelope`, `upstreamServerError`); non-JSON upstream bodies become 502 `Bff.InvalidUpstream`.

## Cross-Cutting Concerns

**Logging:** No `console.*` allowed in `composition/**` or `modules/**` (asserted by `apps/web/src/auth-invariants.test.ts`). Tokens and passwords must never be logged; `bff.ts` and `session-store.ts` log nothing.

**Validation:** Zod at trust boundaries: DTOs in `packages/*/src/infrastructure/dto.ts`, server env in `composition/server/env.ts` (`parseServerEnv`), form schemas in `modules/*/ui/form-schemas.ts`. Domain pre-checks (e.g. `isValidDayOrder`) avoid wasted round trips.

**Authentication:** BE issues JWT access + refresh. FE stores them in cookies via `/api/auth/*` only. Refresh is single-path: the literal `"/refresh"` appears only in `composition/http.client.ts` (invariant test), guarded by a cross-tab Web Lock because the backend rotates refresh tokens with reuse detection. `SessionKeeper` refreshes proactively from the `at_exp` cookie; `session-events.client.ts` broadcasts expiry to other tabs over `BroadcastChannel("tripory-session")` (lazy, `null` on SSR/old Safari).

**Authorization:** `canEdit` (`packages/itinerary/src/domain/permissions.ts`) only hides UI; the backend returns 403 for non-owners.

**Security headers/CSRF:** Same-Origin check on writes in the BFF (`checkSameOrigin`), optional `APP_ORIGIN` env; `X-Bff-Secret` + `X-Forwarded-For` are attached only by `callBackend` (`composition/server/upstream.ts`) when the caller passes `clientIp` (login, register, refresh in `auth-handlers.ts`); the generic `/api/bff` proxy never sends them (`BFF_SHARED_SECRET`). Env variable names used: `API_ORIGIN`, `APP_ORIGIN`, `BFF_SHARED_SECRET` (declared in `turbo.json` for `build`/`dev`). `.env.local` exists locally; values are not recorded here.

**SSRF protection:** `composition/server/maps-resolve.ts` resolves short Google Maps links with an allowlist, https-only, manual redirects, max 3 hops, 5 s budget.

**Static invariants as tests:** `apps/web/src/auth-invariants.test.ts`, `itinerary-invariants.test.ts` (no `dangerouslySetInnerHTML`, `<img referrerPolicy="no-referrer">`, etc.), `proxy-coverage.test.ts`. Fix the offending source instead of loosening the test.

**Backend contract:** separate repo `tripory_be` (.NET, `/api/v1/...`, envelope `ApiResponse<T>`). The BFF maps `/api/bff/<root>/...` to `${API_ORIGIN}/api/v1/<root>/...`.

## Discrepancies to Know

- `ai-memories/tripory-fe--ddd-architecture.md` header says pnpm 11.6.0 / turbo 2.11.7. The repo manifests say `packageManager: pnpm@10.34.6` and `turbo: 2.11.10` (`package.json`); `.planning/ROADMAP.md` also targets pnpm 10. Trust `package.json`.
- The architecture doc lists `chat`, `social`, `discovery`, `profile`, `maps` contexts and `apps/admin`, `apps/mobile`. None exist yet; only `identity` and `itinerary` contexts exist. `maps` behavior currently lives in the app (`composition/server/maps-resolve.ts`, `modules/itinerary/ui/location-field.tsx`).
- The architecture doc shows `composition/itinerary.server.ts`; the code has `composition/viewer.server.ts` and `composition/server/*` instead. No itinerary server-side repository composition exists yet.

---

*Architecture analysis: 2026-11-02*
