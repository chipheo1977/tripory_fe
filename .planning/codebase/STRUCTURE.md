# Codebase Structure

**Analysis Date:** 2026-11-02

## Directory Layout

```
tripory_fe/
├── apps/
│   └── web/                         # Next.js 16.4 app (@tripory/web), only app so far
│       ├── src/
│       │   ├── app/                 # routing only: route groups, layouts, Route Handlers
│       │   │   ├── (public)/        # guest-visible pages, AppShell variant="public"
│       │   │   ├── (dashboard)/
│       │   │   │   ├── (shell)/     # signed-in pages inside AppShell
│       │   │   │   └── (editor)/    # full-screen editor layout (no AppShell)
│       │   │   └── api/             # auth/*, bff/[...path], maps/resolve (thin shells)
│       │   ├── components/          # cross-module shell pieces (header, shell, user menu)
│       │   ├── composition/         # composition root (client + server wiring)
│       │   │   └── server/          # pure server handlers (BFF, auth, maps, session store)
│       │   ├── lib/feedback/        # toast + error-message policy
│       │   ├── modules/
│       │   │   ├── identity/ui/     # auth forms, session gate/keeper/recovery
│       │   │   └── itinerary/ui/    # my-itineraries list + editor
│       │   ├── test/                # shared test setup, fakes, fixtures
│       │   └── proxy.ts             # Next 16 proxy (optimistic route gate)
│       ├── next.config.ts  eslint.config.mjs  vitest.config.ts  tsconfig.json
│       ├── components.json  .env.example  AGENTS.md
├── packages/
│   ├── api-client/                  # HttpClient port, ApiError, fetch adapter, refresh wrapper
│   ├── config/                      # ESLint boundaries, tsconfig, vitest presets, self-test
│   ├── design-tokens/               # CSS token layers + TS constants
│   ├── identity/                    # bounded context: session/viewer (4 layers)
│   ├── itinerary/                   # bounded context: itinerary/day/waypoint (4 layers)
│   ├── shared-kernel/               # branded ids, Wgs84Coordinate
│   └── ui-web/                      # atoms + molecules (Base UI, Tailwind 4)
├── ai-memories/                     # architecture decision doc (read before adding code)
├── .planning/                       # GSD planning artifacts (roadmap, phases, codebase maps)
├── .agents/  .claude/  .vercel/     # tooling metadata, not application code
├── package.json  pnpm-workspace.yaml  pnpm-lock.yaml  turbo.json
├── AGENTS.md  README.md  .gitignore
└── .env.local                       # local env, never read or commit values
```

## Directory Purposes

**`apps/web/src/app/`:**
- Purpose: routing only. Compose modules; no business logic.
- Contains: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`, with co-located `*.test.tsx`.
- Key files: `layout.tsx` (root, static), `providers.tsx` (client QueryClient + Toast + session components), `globals.css` (Tailwind + tokens + ui-web styles), `global-error.tsx`, `not-found.tsx`.

**`apps/web/src/app/(public)/`:**
- Purpose: pages open to guests. Layout wraps `AppShell variant="public"`.
- Contains: `page.tsx` (home placeholder), `login/page.tsx`, `register/page.tsx`, `loading.tsx`, `error.tsx`.
- Phase 5 target: add `itineraries/[id]/page.tsx` here.

**`apps/web/src/app/(dashboard)/(shell)/`:**
- Purpose: signed-in pages with header. Layout = `AppShell variant="dashboard"` + `<Suspense>` + `DashboardSessionGate`.
- Contains: `itineraries/mine/page.tsx`, `settings/password/page.tsx`, `loading.tsx`, `error.tsx`.

**`apps/web/src/app/(dashboard)/(editor)/`:**
- Purpose: full-screen editor. Layout = `min-h-dvh` div + `<Suspense fallback={<EditorSkeleton/>}>` + `DashboardSessionGate`.
- Contains: `itineraries/[id]/edit/{page,loading,error}.tsx`.

**`apps/web/src/app/api/`:**
- Purpose: Route Handlers. Each is a thin shell (<= 25 lines) calling `@/composition/server/*`; must not import `@tripory/identity/http` or `@tripory/api-client/http` (asserted in `apps/web/src/auth-invariants.test.ts`).
- Contains: `auth/{login,register,logout,refresh,change-password}/route.ts`, `bff/[...path]/route.ts`, `maps/resolve/route.ts`.

**`apps/web/src/components/`:**
- Purpose: web-only shell components shared by several modules.
- Key files: `app-shell.tsx`, `app-header.tsx`, `account-slot.tsx` (reads cookie, inside Suspense), `user-menu.tsx`, `navigation-guard.tsx`, `not-found-view.tsx`, `submit-status.tsx`.

**`apps/web/src/composition/`:**
- Purpose: composition root; the only place importing `@tripory/*/http`.
- Client: `http.client.ts`, `itinerary.client.ts`, `identity.client.ts`, `query-client.ts`, `session-events.client.ts`.
- Shared pure: `session-cookies.ts` (cookie names, `hasSessionCookie`, `isSecureCookieEnv`).
- Server: `viewer.server.ts` (`import "server-only"`, `getViewer`, `getSessionKind`), `server/*` (pure, no `server-only`, testable).
- Naming: `*.client.ts` for browser wiring, `*.server.ts` for files that import `server-only`/`next/headers`, `server/` for pure server logic.

**`apps/web/src/modules/<context>/ui/`:**
- Purpose: web-only UI for one context. Flat folder (no sub-folders yet), kebab-case files, co-located tests.
- `modules/itinerary/ui/`: editor (`itinerary-editor.tsx`, `editor-layout.tsx`, `editor-header.tsx`, `editor-skeleton.tsx`, `editor-forbidden.tsx`), timeline (`timeline-panel.tsx`, `day-tabs.tsx`, `day-subtitle.tsx`, `waypoint-list.tsx`, `sortable-waypoint-item.tsx`, `dnd-announcements.ts`, `add-button.tsx`), dialogs (`create-itinerary-dialog.tsx`, `delete-itinerary-dialog.tsx`, `publish-dialog.tsx`, `trip-info-dialog.tsx`, `waypoint-form-dialog.tsx`, `responsive-form-surface.tsx`), list (`my-itineraries-view.tsx`, `itinerary-card.tsx`, `cover-image.tsx`), summary (`trip-summary.tsx`, `publish-button.tsx`), state/helpers (`save-status.ts`, `save-indicator.tsx`, `leave-guard.tsx`, `use-pending-delete.ts`, `pending-delete.ts`, `draft-storage.ts`, `use-form-draft.ts`, `entry-flag.ts`, `use-media-query.ts`, `format.ts`, `form-schemas.ts`, `form-error-mapping.ts`, `location-field.tsx`, `form-field-row.tsx`).
- `modules/identity/ui/`: `login-form.tsx`, `register-form.tsx`, `change-password-form.tsx`, `auth-form-card.tsx`, `auth-fields.tsx`, `password-checklist.tsx`, `guest-login-button.tsx`, `dashboard-session-gate.tsx`, `login-redirect.tsx`, `session-keeper.tsx`, `session-effects.tsx`, `session-recovery.tsx`, `use-session-actions.ts`, `form-schemas.ts`, `form-error-mapping.ts`.

**`apps/web/src/lib/feedback/`:**
- Purpose: error-message selection and mutation toast policy, re-exported from `index.ts`; consumed by `composition/query-client.ts` and forms.

**`apps/web/src/test/`:**
- Purpose: Vitest helpers. `setup.ts` (global setup, loaded by `vitest.config.ts`), `fake-broadcast-channel.ts`, `fake-locks.ts`, `fake-resize-observer.ts`, `fake-intersection-observer.ts`, `next-request.ts`, `be-auth-fixtures.ts`, `be-itinerary-fixtures.ts`. Excluded from the static invariant scans.

**`packages/itinerary/` and `packages/identity/` (bounded contexts):**
```
packages/<context>/
├── package.json         # exports: "." | "./http" | "./react"
├── eslint.config.mjs    # export default contextPackage();
├── tsconfig.json  vitest.config.ts
└── src/
    ├── index.ts         # export * from './domain'; export * from './application';
    ├── domain/          # types + pure functions, index.ts barrel
    ├── application/     # ports.ts (types only), use-cases.ts, index.ts
    ├── infrastructure/  # dto.ts, mappers.ts, http-*.ts, fixtures.ts, index.ts (the "/http" entry)
    ├── react/           # index.ts (hook factory + query keys)
    └── exports.test.ts  # asserts the public surface
```
- `packages/identity/src/react/index.ts` is the only file in its `react/` folder; `packages/itinerary/src/react/` also has `keys.test.ts`.

**`packages/shared-kernel/src/`:** `ids.ts`, `geo.ts`, `index.ts` (flat, no layers).

**`packages/api-client/src/`:** flat. `http-client.ts` (types), `api-error.ts`, `to-api-error.ts`, `fetch-http-client.ts`, `with-session-refresh.ts`, `response-shapes.ts`, `http.ts` (the `./http` entry), `index.ts` (root entry), `fixtures/be-responses.ts`.

**`packages/ui-web/src/`:**
- `atoms/`: `avatar`, `badge`, `button`, `checkbox`, `field-adornments`, `icon`, `icon-button`, `input`, `label`, `separator`, `skeleton`, `spinner`, `switch`, `textarea` (`.tsx` + `.test.tsx`).
- `molecules/`: `card`, `dialog`, `dropdown-menu`, `empty-state`, `error-state`, `form-field`, `inline-alert`, `password-input`, `search-input`, `select`, `sheet` (+ `sheet-snap.ts`), `tabs`, `toast`, `tooltip`.
- `lib/cn.ts` (clsx + tailwind-merge), `styles.css` (component CSS variables + `tw-animate-css`), `index.ts` (explicit barrel; add every new component here), `token-guard.test.ts`.

**`packages/design-tokens/src/`:** `primitives.css`, `semantic.css`, `components.css`, `theme.css`, `dark.css`, `index.css` (imports the layers), `index.ts` (TS constants), `tokens.test.ts`.

**`packages/config/`:**
- `eslint/boundaries.mjs` (presets, with `boundaries.d.mts`), `eslint/base.mjs`, `tsconfig/library.json`, `vitest/preset.mjs` (node env) and `vitest/ui-preset.mjs` (jsdom env), `test/boundaries.test.ts` (self-test), `turbo.json` (extra test inputs). Exposed as `@tripory/config/eslint`, `/tsconfig/*`, `/vitest`, `/vitest/ui`.

## Key File Locations

**Entry Points:**
- `apps/web/src/app/layout.tsx`: root layout (static).
- `apps/web/src/app/providers.tsx`: client providers.
- `apps/web/src/proxy.ts`: request gate and `PROTECTED_PREFIXES` / `PROTECTED_PATTERNS`.
- `apps/web/src/app/api/bff/[...path]/route.ts`: BFF entry.

**Configuration:**
- `pnpm-workspace.yaml`: workspaces (`apps/*`, `packages/*`), `catalog:` versions, `allowBuilds`.
- `turbo.json`: tasks `build` (env `API_ORIGIN`, `APP_ORIGIN`, `BFF_SHARED_SECRET`; outputs `.next/**`), `transit`, `lint`, `typecheck`, `test`, `dev`.
- `apps/web/next.config.ts`: `cacheComponents`, `partialPrefetching`, Tailwind loader for Turbopack.
- `apps/web/tsconfig.json`: alias `@/*` -> `./src/*`, `moduleResolution: bundler`.
- `apps/web/.env.example`: documents `API_ORIGIN`, `APP_ORIGIN`, `BFF_SHARED_SECRET` (names only).
- `packages/config/eslint/boundaries.mjs`: boundary rules (edit only as an architecture decision).

**Core Logic:**
- `packages/itinerary/src/domain/`: `itinerary.ts` (types `Itinerary`, `Waypoint`, `DayView`, `StatusFilter`, `Page<T>`), `day-range.ts` (`buildDayRange`, `isValidDayOrder`), `updates.ts` (immutable cache transforms), `permissions.ts` (`canEdit`), `calendar-date.ts`, `location-input.ts` (lat/lng and Google Maps link parsing).
- `packages/itinerary/src/react/index.ts`: all itinerary hooks and `itineraryKeys`.
- `packages/itinerary/src/infrastructure/http-itinerary-repository.ts`: endpoints and DTO parsing.
- `apps/web/src/composition/server/bff.ts`: BFF forwarding logic.
- `apps/web/src/composition/server/session-store.ts`: cookie read/write.
- `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx`: editor container.

**Testing:**
- Co-located `*.test.ts` / `*.test.tsx` beside each source file.
- Cross-cutting static tests: `apps/web/src/auth-invariants.test.ts`, `itinerary-invariants.test.ts`, `proxy-coverage.test.ts`, `proxy.test.ts`; `packages/config/test/boundaries.test.ts`; `packages/ui-web/src/token-guard.test.ts`.
- `packages/*/src/exports.test.ts` pin each package's public surface.
- Fixtures: `packages/itinerary/src/infrastructure/fixtures.ts`, `packages/itinerary/src/domain/test-fixtures.ts`, `packages/api-client/src/fixtures/be-responses.ts`, `apps/web/src/test/be-*.ts`.

## Naming Conventions

**Files:**
- kebab-case everywhere: `itinerary-editor.tsx`, `http-itinerary-repository.ts`, `use-pending-delete.ts`.
- Tests: `<name>.test.ts(x)` next to the source; `// @vitest-environment node` header for node-only tests.
- Hooks files: `use-*.ts(x)`. Client wiring: `*.client.ts`. Server-only: `*.server.ts`.
- Next special files keep Next names (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`).
- Barrels named `index.ts`; each package layer exposes one.

**Directories:**
- Route groups in parentheses: `(public)`, `(dashboard)`, `(shell)`, `(editor)`. Dynamic segments `[id]`, catch-all `[...path]`.
- Contexts are lowercase single words matching package names: `itinerary`, `identity`.
- Layer folders inside a context package: exactly `domain`, `application`, `infrastructure`, `react`.

**Symbols:**
- Components PascalCase, hooks `useX`, factories `createXHooks` / `createHttpXRepository`, query key groups `xKeys`, ports are `Readonly<{...}>` function-bag types, domain types are `Readonly<{...}>`.
- Package scope: `@tripory/<name>`; app is `@tripory/web`.

## Where to Add New Code

**New domain rule or derived value (e.g. public-view visibility, map projection math):**
- Pure function + type in `packages/itinerary/src/domain/<topic>.ts`, export from `packages/itinerary/src/domain/index.ts`, test in `<topic>.test.ts`. No `Date.now()`, `fetch`, or browser globals. Add to `exports.test.ts` if it becomes public.

**New backend call or DTO field:**
- Zod schema in `packages/itinerary/src/infrastructure/dto.ts`, mapping in `mappers.ts`, method on the port in `packages/itinerary/src/application/ports.ts`, implementation in `http-itinerary-repository.ts`, hook in `packages/itinerary/src/react/index.ts` (add a key to `itineraryKeys`). Update fixtures and tests.

**New multi-step write use case:**
- `packages/itinerary/src/application/use-cases.ts` (`makeX`/plain async function taking `Pick<ItineraryRepository, ...>`), exported through `application/index.ts`.

**New page:**
- Under `apps/web/src/app/` in the right group. Guest-visible: `(public)`. Needs a session: `(dashboard)/(shell)` or `(editor)`, and add the URL prefix/pattern to `PROTECTED_PREFIXES` / `PROTECTED_PATTERNS` in `apps/web/src/proxy.ts` (otherwise `proxy-coverage.test.ts` fails). Keep `page.tsx` thin; put logic in `modules/<context>/ui`. Add `loading.tsx` / `error.tsx` beside it when the group lacks one. Reading `cookies()` or awaiting `params` requires an enclosing `<Suspense>` (Cache Components). Read the version-matched docs in `apps/web/node_modules/next/dist/docs/` first (`apps/web/AGENTS.md`).

**New UI feature component (web-only, context-specific):**
- `apps/web/src/modules/<context>/ui/<kebab-name>.tsx` with `"use client"` only when needed, test beside it. Use hooks from `@/composition/<context>.client`, types from `@tripory/<context>`, primitives from `@tripory/ui-web`.

**Phase 5 public itinerary page + SVG map + sharing (guidance):**
- Route: `apps/web/src/app/(public)/itineraries/[id]/page.tsx` (+ `loading.tsx`, `error.tsx`, `not-found` handling for 404/403). Keep it out of `PROTECTED_*`; `proxy-coverage.test.ts` already asserts `/itineraries/x` is public.
- Data for SSR: create `apps/web/src/composition/itinerary.server.ts` (`import "server-only"`) that builds `createHttpItineraryRepository` over a server `HttpClient` (`createFetchHttpClient` from `@tripory/api-client/http`, `baseUrl` from `serverDeps().env.apiOrigin`, Bearer from `cookies()` for the owner draft banner). Only `composition/**` may import `/http`. Keep it free of the browser refresh lock.
- Domain: add pure helpers (visibility/draft decision, SVG projection of `Wgs84Coordinate` into viewport, per-day grouping already available via `buildDayRange`) in `packages/itinerary/src/domain/`.
- Shared SVG map: the editor needs the same component as the public page (roadmap criterion 4). Pure-presentational map component with props (waypoints by day, selected id, callbacks) belongs in `packages/ui-web/src/molecules/` (or a new `packages/ui-web/src/` folder allowed by `uiPackage()` rules) so both `modules/itinerary/ui` and the public page import it from `@tripory/ui-web`; export it from `packages/ui-web/src/index.ts`. Map uses design tokens only (guarded by `token-guard.test.ts`). The editor slot is `canvas` in `modules/itinerary/ui/editor-layout.tsx` (wide: right column, narrow: `summary` + Sheet timeline).
- Sharing UI (copy link, Web Share, QR, publish-success dialog, "Chia sẻ" button): `apps/web/src/modules/itinerary/ui/` next to `publish-dialog.tsx` and `publish-button.tsx`. Open Graph/`noindex` via `generateMetadata` in the page file. A QR library would be a new dependency: add to `pnpm-workspace.yaml` catalog and the importing package's `package.json`, and extend the allowlist in `packages/config/eslint/boundaries.mjs` only if used inside a package.
- Compound components used from a Server Component must use named exports (no `Tabs.Panel` statics); `packages/ui-web/src/molecules/tabs.tsx` already exports `TabsPanel`.
- Server Component props must be serializable: pass plain domain objects, no functions or class instances.

**New shared UI primitive:**
- Atom in `packages/ui-web/src/atoms/<name>.tsx`, molecule in `packages/ui-web/src/molecules/<name>.tsx`, plus test, plus an `export *` line in `packages/ui-web/src/index.ts`. Atoms must not import molecules. Colors/spacing from tokens (`packages/design-tokens/src/semantic.css`), not literals.

**New design token:**
- Add to the matching layer in `packages/design-tokens/src/*.css` and, if needed, expose in `theme.css`; `tokens.test.ts` verifies structure.

**New bounded context package (e.g. `profile`, `chat`):**
- Create `packages/<context>/` with `package.json` (exports `.`, `./http`, `./react`; `@tripory/config: workspace:*`; deps via `catalog:`), `eslint.config.mjs` (`contextPackage()`), `tsconfig.json` extending `@tripory/config/tsconfig/library.json`, `vitest.config.ts` (from `@tripory/config/vitest`), and the four layer folders. Add `@tripory/<context>: workspace:*` to `apps/web/package.json`, then a `composition/<context>.client.ts`. The self-test picks up new packages automatically.

**Utilities:**
- Used by 2+ contexts with identical meaning: `packages/shared-kernel/src/`. Web-only helpers: `apps/web/src/lib/<topic>/`. Do not put generic helpers in a context package.

## Special Directories

**`apps/web/.next/`, `.turbo/`, `node_modules/`:**
- Purpose: build output, Turbo cache, dependencies. Generated: Yes. Committed: No.

**`.planning/`:**
- Purpose: GSD roadmap, state, per-phase plans and research (`phases/*`), and these codebase maps. Generated: by GSD workflows. Committed: yes (per repo workflow).

**`ai-memories/`:**
- Purpose: architecture decision document `tripory-fe--ddd-architecture.md`. Hand-written, committed.

**`.vercel/`, `.agents/`, `.claude/`:**
- Purpose: Vercel project link, agent tasks, spec-workflow agent configs. Not application code.

**`apps/web/next-env.d.ts`, `.next/types`:**
- Purpose: generated by `next typegen` (run in the `typecheck` script). Generated: Yes. Not edited by hand.

**`.env.local` / `apps/web/.env.example`:**
- `.env.local` holds local secrets (not to be read or committed); `.env.example` is the template with variable names.

## Commands (run from repo root)

```bash
pnpm dev          # turbo run dev  (next dev in apps/web)
pnpm build        # turbo run build
pnpm lint         # turbo run lint (ESLint + boundary presets)
pnpm typecheck    # turbo run typecheck (apps/web: next typegen && tsc --noEmit)
pnpm test         # turbo run test (Vitest; includes boundaries self-test)
```

Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before reporting work done (root `AGENTS.md`).

---

*Structure analysis: 2026-11-02*
