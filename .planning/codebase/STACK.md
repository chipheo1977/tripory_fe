# Technology Stack

**Analysis Date:** 2026-11-02

## Languages

**Primary:**
- TypeScript 5.9.3 (strict) - all app and package code (`apps/web/src/**`, `packages/*/src/**`)
  - App tsconfig: `apps/web/tsconfig.json` (`moduleResolution: bundler`, `jsx: react-jsx`, alias `@/*` -> `apps/web/src/*`)
  - Library tsconfig preset: `packages/config/tsconfig/library.json` (`target ES2022`, `verbatimModuleSyntax: true`, `noEmit`)
- TSX - React components and Next route files

**Secondary:**
- CSS (Tailwind v4 syntax) - `apps/web/src/app/globals.css`, `packages/design-tokens/src/*.css`, `packages/ui-web/src/styles.css`
- ESM JavaScript (`.mjs`) - config only: `packages/config/eslint/*.mjs`, `packages/config/vitest/*.mjs`, `apps/web/eslint.config.mjs`
- JSON - `turbo.json`, `package.json`, `apps/web/components.json`

## Runtime

**Environment:**
- Node.js 24.x (`apps/web/package.json` -> `engines.node: "24.x"`; dev machine ran v24.14.1). No `.nvmrc` or `.node-version`.
- Browser target: evergreen browsers (uses Web Locks `navigator.locks`, `BroadcastChannel`, `fetch` with `keepalive`).

**Package Manager:**
- pnpm 10.34.6 (pinned by `packageManager` in `package.json`). `README.md` says "pnpm 11", which disagrees with the pin; trust `package.json`.
- Workspaces: `pnpm-workspace.yaml` -> `apps/*`, `packages/*`
- Shared versions: every dependency uses `"catalog:"` in manifests; versions are declared once in the `catalog:` block of `pnpm-workspace.yaml`. Add or bump versions there only.
- `allowBuilds: { unrs-resolver: false }` in `pnpm-workspace.yaml` blocks install scripts except where explicitly allowed.
- Lockfile: present (`pnpm-lock.yaml`, lockfileVersion 9.0)

## Frameworks

**Core:**
- Next.js 16.4.0 (`catalog: next`) - App Router, Turbopack, React Server Components. Read `apps/web/node_modules/next/dist/docs/` before writing Next code (see `apps/web/AGENTS.md`).
- React 19.3.0 / React DOM 19.3.0 - UI
- Next config (`apps/web/next.config.ts`):
  ```ts
  const nextConfig: NextConfig = {
    cacheComponents: true,        // Cache Components: dynamic data must sit inside <Suspense>
    partialPrefetching: true,
    turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
  };
  ```
- Next 16 file conventions in use: `src/proxy.ts` (replaces middleware), `LayoutProps<"/">` typed layouts, `next typegen` in the `typecheck` script.

**UI / styling:**
- Tailwind CSS 4.3.3 via `@tailwindcss/turbopack` 4.3.3 (loader wired in `next.config.ts`; no `tailwind.config.*`, `components.json` has `"config": ""`)
- `@base-ui/react` 1.8.0 - headless primitives for `@tripory/ui-web` (pinned deliberately, comment D-02 in `pnpm-workspace.yaml`: do not bump to 1.9.0)
- `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `tw-animate-css` 1.4.0 - variants/class merging (in `packages/ui-web`)
- `lucide-react` 1.54.0 - icons (`iconLibrary: lucide` in `apps/web/components.json`)
- `sonner` 2.0.8 - toasts, exposed as `Toast` / `notify` from `@tripory/ui-web`
- shadcn CLI config: `apps/web/components.json` (style `base-nova`, `rsc: true`, `ui` alias `@tripory/ui-web`, `utils` alias `@tripory/ui-web/lib`)
- Font: `Inter` through `next/font/google` (subsets `latin`, `vietnamese`) in `apps/web/src/app/layout.tsx`, exposed as `--font-inter`.

**Data / forms / interaction:**
- `@tanstack/react-query` 5.104.2 - client-side server-state; `QueryClient` built in `apps/web/src/composition/query-client.ts` (`retry: false`, `staleTime: 60_000`)
- `react-hook-form` 7.89.0 + `@hookform/resolvers` 5.9.1 + `zod` 4.6.7 - forms and DTO validation (`apps/web/src/modules/*/ui/form-schemas.ts`, `packages/*/src/infrastructure/dto.ts`)
- `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/modifiers` 9.0.0, `@dnd-kit/utilities` 3.2.2 - waypoint drag-and-drop (`apps/web/src/modules/itinerary/ui/sortable-waypoint-item.tsx`, `waypoint-list.tsx`)

**Testing:**
- Vitest 4.1.11 - runner for every package (`vitest run`). Presets in `packages/config/vitest/preset.mjs` (node) and `packages/config/vitest/ui-preset.mjs` (jsdom).
- jsdom 29.1.1 (30.x not used: needs a newer Node than the pinned environment)
- Testing Library: `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7
- Web setup file: `apps/web/src/test/setup.ts` plus fakes (`fake-broadcast-channel.ts`, `fake-locks.ts`, `fake-resize-observer.ts`, `fake-intersection-observer.ts`)

**Build/Dev:**
- Turborepo 2.11.10 (root devDependency, `turbo.json`) - task graph and caching
- ESLint 9.39.5 (flat config) + `eslint-config-next` 16.4.0 + `typescript-eslint` 8.71.1
- Architecture boundary rules: `packages/config/eslint/boundaries.mjs` (self-tested by `packages/config/test/boundaries.test.ts`)
- Turbopack for `next dev` / `next build`

## Key Dependencies

**Critical:**
- `next` 16.4.0 / `react` 19.3.0 - runtime framework; Cache Components changes how `cookies()`, `Date.now()` and `usePathname` may be used (see `apps/web/src/composition/viewer.server.ts`, `apps/web/src/app/providers.tsx`)
- `zod` 4.6.7 - env parsing in `apps/web/src/composition/server/env.ts` and DTO anti-corruption layer in `packages/identity/src/infrastructure/dto.ts`, `packages/itinerary/src/infrastructure/dto.ts`
- `@tanstack/react-query` 5.104.2 - listed as `peerDependencies` in `packages/identity` and `packages/itinerary`
- `@base-ui/react` 1.8.0 - all interactive primitives (dialogs, menus) via `packages/ui-web`

**Infrastructure:**
- Workspace packages (all `private`, `version 0.0.0`, source-exported TypeScript with no build step; consumed through `exports` maps):
  - `@tripory/shared-kernel` - `packages/shared-kernel` (value objects such as `ItineraryId`)
  - `@tripory/api-client` - `packages/api-client` (`.` and `./http`: `createFetchHttpClient`, `withSessionRefresh`, `ApiError`)
  - `@tripory/identity` - `packages/identity` (`.`, `./http`, `./react`: viewer, session rules, `parseAccessTokenClaims`, `toSafeNextPath`)
  - `@tripory/itinerary` - `packages/itinerary` (`.`, `./http`, `./react`: repository, short-link resolver, hooks factory)
  - `@tripory/design-tokens` - `packages/design-tokens` (CSS tokens `primitives/semantic/theme/dark/components.css`, `style` export)
  - `@tripory/ui-web` - `packages/ui-web` (`atoms/`, `molecules/`, `lib/`, `styles.css`)
  - `@tripory/config` - `packages/config` (ESLint presets, tsconfig preset, Vitest presets)
- `server-only` is imported in exactly one composition file: `apps/web/src/composition/viewer.server.ts`.
- Not present: any map library, SVG/chart library, image-optimization config, i18n library, date library, state manager other than React Query. Phase 5 (SVG map) has nothing to build on yet.

## Configuration

**Environment:**
- Server-only variables read at call time by `serverDeps()` in `apps/web/src/composition/server/env.ts` (never at import, so `next build` works without them):
  - `API_ORIGIN` (required; http(s) origin of the BE; https required in production except loopback)
  - `APP_ORIGIN` (optional; own public origin for CSRF Origin check; leave empty on Vercel)
  - `BFF_SHARED_SECRET` (optional; shared with BE for per-IP rate limiting; never log or echo)
  - `NODE_ENV` (standard)
- No `NEXT_PUBLIC_*` variable exists; the browser never learns the BE address.
- Files: `apps/web/.env.example` (committed template), `apps/web/.env.local` and repo-root `.env.local` (git-ignored, exist locally; contain `API_ORIGIN` and `BFF_SHARED_SECRET` names only here). Do not read or quote values.
- Turborepo declares `API_ORIGIN`, `APP_ORIGIN`, `BFF_SHARED_SECRET` in `env` of the `build` and `dev` tasks in `turbo.json` so they invalidate the cache.

**Build:**
- `turbo.json` tasks: `build` (outputs `.next/**` excluding `.next/cache/**`, depends on `^build` and `transit`), `transit` (empty graph-only task), `lint`, `typecheck`, `test` (each depends on `transit`), `dev` (`cache: false`, `persistent: true`).
- `packages/config/turbo.json` extends root and adds `inputs` for `test` so changes to other packages' `eslint.config.mjs` bust the boundaries self-test cache.
- Root scripts (`package.json`): `pnpm dev|build|lint|typecheck|test` -> `turbo run <task>`.
- Web scripts (`apps/web/package.json`): `next dev`, `next build`, `next start`, `eslint`, `next typegen && tsc --noEmit`, `vitest run`.
- Per-package scripts are only `lint` (`eslint`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`); packages have no `build`.
- Local HTTPS certs exist at `apps/web/certificates/` (`localhost.pem`, `localhost-key.pem`, git-ignored via `*.pem`); never read or commit.

## Platform Requirements

**Development:**
- Node.js 24, pnpm 10.34.6 (`corepack enable` honors `packageManager`)
- A running BE at `API_ORIGIN` (default example `http://localhost:5000`, repo `c:\Users\OS\Documents\personal\tripory_be`)
- Dev server: `pnpm dev` -> `http://localhost:3000`. Dev cookies drop the `__Host-` prefix and `Secure` (`apps/web/src/composition/session-cookies.ts`); use `next dev --experimental-https` to test the prefix.

**Production:**
- Vercel (`.vercel/` directory present, git-ignored; `apps/web/.env.example` says "On Vercel leave `APP_ORIGIN` empty"). No `vercel.json`.
- Must use https for `API_ORIGIN` (non-loopback) and `APP_ORIGIN`; `parseServerEnv` throws otherwise.
- No CI configuration: `.github/` does not exist. The agreed gate is local `pnpm lint && pnpm typecheck && pnpm test` (root `AGENTS.md`).

---

*Stack analysis: 2026-11-02*
