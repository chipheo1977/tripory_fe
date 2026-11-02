# Testing Patterns

**Analysis Date:** 2026-10-25

## Test Framework

**Runner:**
- Vitest 4.x (catalog version in `pnpm-workspace.yaml`; Vitest 5 is deferred until `@types/node` >= 22, see architecture doc section 9).
- Configs: each workspace has `vitest.config.ts` built from presets in `packages/config/vitest/`:
  - `packages/config/vitest/preset.mjs` (import `@tripory/config/vitest`): `environment: 'node'`, `include: ['src/**/*.test.{ts,tsx}']`. Used by `packages/itinerary`, `identity`, `shared-kernel`, `api-client`, `design-tokens`, `config`.
  - `packages/config/vitest/ui-preset.mjs` (import `@tripory/config/vitest/ui`): `environment: 'jsdom'`. Used by `packages/ui-web/vitest.config.ts` and `apps/web/vitest.config.ts`, both adding `setupFiles: ['./src/test/setup.ts']`; the app also sets `resolve.tsconfigPaths: true` for the `@/*` alias.

**Assertion Library:**
- Vitest `expect` (no `@testing-library/jest-dom`). Assert with plain matchers: `expect(el.getAttribute('aria-busy')).toBe('true')`, `expect(screen.queryByText('Lưu')).toBeNull()`, `expect(screen.getByText('x')).toBeTruthy()`.

**UI libraries:** `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `jsdom` (declared per package that needs DOM, because pnpm isolated linking resolves from the owning package).

**Run Commands:**
```bash
pnpm test                                   # all workspaces via Turborepo (turbo run test)
pnpm --filter @tripory/web test             # one workspace (runs `vitest run`)
pnpm --filter @tripory/ui-web exec vitest   # watch mode in a workspace
pnpm --filter @tripory/web exec vitest run src/modules/itinerary/ui/publish-button.test.tsx   # one file
pnpm lint && pnpm typecheck && pnpm test    # required before reporting a task done
```
Coverage tooling is not configured (no `@vitest/coverage-*`, no coverage script).

## Test File Organization

**Location:**
- Co-located with source, same folder, same stem: `apps/web/src/modules/itinerary/ui/publish-button.tsx` ↔ `publish-button.test.tsx`; `packages/itinerary/src/domain/permissions.ts` ↔ `permissions.test.ts`.
- Cross-cutting static/invariant tests sit at the app src root: `apps/web/src/itinerary-invariants.test.ts`, `auth-invariants.test.ts`, `proxy-coverage.test.ts`, `proxy.test.ts`.
- Shared test support is in `apps/web/src/test/` (not shipped) and `packages/ui-web/src/test/`.

**Naming:**
- `*.test.ts` for logic, `*.test.tsx` for anything rendering JSX. Only files matching `src/**/*.test.{ts,tsx}` run.

**Structure:**
```
apps/web/src/
├── app/**/page.test.tsx, layout/route tests   # call the server component as a function
├── components/*.test.tsx
├── composition/*.test.ts, server/*.test.ts    # BFF, handlers, env, session (node env)
├── lib/feedback/*.test.ts
├── modules/{identity,itinerary}/ui/*.test.ts(x)
└── test/                                      # setup.ts, fakes, fixtures, helpers
packages/*/src/{domain,application,infrastructure,react}/*.test.ts
packages/ui-web/src/{atoms,molecules}/*.test.tsx
packages/config/test/boundaries.test.ts        # ESLint boundary self-test
```

## Test Structure

**Suite Organization:**
```tsx
// apps/web/src/modules/itinerary/ui/save-status.test.ts
import { expect, it, vi } from "vitest";
import { createSaveStatusStore } from "./save-status";

it("starts empty", () => {
  const store = createSaveStatusStore();
  expect(store.getSnapshot()).toEqual({ hasSaved: false, failure: null });
});
```
- Explicit `import { describe, expect, it, vi } from 'vitest'` (globals are not enabled). Flat top-level `it(...)` is common; use `describe` to group by unit/decision: `describe('loadingLabel (D-30)', ...)`, `describe('canEdit', ...)`.
- `it.each` for parameterized cases: `it.each(['{Enter}', ' '])('kích hoạt bằng %s', ...)`.
- Titles: Vietnamese for UI behavior in `packages/ui-web` and domain tests; English sentences in many `apps/web` tests. Reference decision/threat IDs in titles when the test locks one (`(T-04-12)`, `(D-30)`).

**Patterns:**
- Setup: `beforeEach(() => { h.getViewer.mockReset().mockResolvedValue(viewer); })`.
- Teardown: `afterEach(() => { vi.restoreAllMocks(); window.matchMedia = originalMatchMedia; })`. React Testing Library `cleanup` is registered globally in both `src/test/setup.ts` files.
- Sample data that must be valid is guarded with a throw instead of `!`: `if (ID === null || OWNER === null) throw new Error("dữ liệu mẫu phải hợp lệ");`.
- Assertions use `getByRole(..., { name })` first, then `getByText` / `getByTestId`; presence checks via `queryBy*` → `toBeNull()`.
- User interaction: `const user = userEvent.setup(); await user.click(button);` (or `userEvent.setup().keyboard(key)`).
- Async state: `await waitFor(() => expect(...))`, `act(async () => ...)` with `renderHook`.

## Global Setup (`src/test/setup.ts`)

Both `apps/web/src/test/setup.ts` and `packages/ui-web/src/test/setup.ts`:
- `afterEach(cleanup)` from Testing Library.
- `globalThis.BASE_UI_ANIMATIONS_DISABLED = true` so Base UI (Dialog, Sheet, Tabs, Tooltip) unmounts synchronously.
- Polyfill `window.matchMedia` returning `matches: false` (the app version guards `typeof window !== "undefined"` because route/BFF tests run in `node`). `useMediaQuery`-driven components therefore render their narrow (mobile) branch by default.
- `setup.test.ts` next to each file asserts these polyfills exist.
- Environment override per file: first line `// @vitest-environment node` for route handlers, BFF, proxy, static invariant tests; keep the default jsdom for components.

jsdom lacks `ResizeObserver`, `IntersectionObserver`, `BroadcastChannel`, `navigator.locks`; use fakes from `apps/web/src/test/`:
- `fake-resize-observer.ts` → `installFakeResizeObserver()` returns `{ resize(target, height), restore() }`
- `fake-intersection-observer.ts`, `fake-broadcast-channel.ts`, `fake-locks.ts`
- These helpers deliberately do not import `vitest`.

## Mocking

**Framework:** Vitest `vi` (`vi.fn`, `vi.mock`, `vi.hoisted`, `vi.spyOn`).

**Patterns:**
```tsx
// apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/page.test.tsx
const h = vi.hoisted(() => ({ getViewer: vi.fn() }));
vi.mock("@/composition/viewer.server", () => ({ getViewer: () => h.getViewer() }));
vi.mock("@/modules/itinerary/ui/itinerary-editor", () => ({ ItineraryEditor: () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  redirect: (target: string) => { throw new Error(`NEXT_REDIRECT:${target}`); },
}));
```
- Hoist handles with `vi.hoisted` into an object named `h`, delegate in the factory, reset in `beforeEach`.
- Server pages/layouts are tested by calling the async component directly (`await EditItineraryPage({ params: Promise.resolve({ id }) })`) and inspecting the returned element's `props` and `key`.
- Layout tests stub `AppShell` and `DashboardSessionGate` (`apps/web/src/app/route-layouts.test.tsx`) because `viewer.server` imports `server-only`.
- `next/navigation` hooks: `vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn(), back: vi.fn() }) }))`.
- Browser APIs: swap and restore `window.matchMedia`, e.g. `setWide(true)` / `setFromMd()` helpers in `publish-button.test.tsx` to exercise the `lg`/`md` branches.
- Use `satisfies` on fakes so they stay in sync with the port: `const repository = { ... } satisfies ItineraryRepository;`.
- Server handlers receive injected deps (`ServerDeps` with `fetch`, `nowMs`, `env`, `secure`) instead of module mocks: `depsWith(fetchReturning(redirectTo(GOOGLE)))` in `apps/web/src/composition/server/maps-handlers.test.ts`.

**What to Mock:**
- Next navigation/server modules, `server-only` consumers, network `fetch`, time (`nowMs`), `window.matchMedia`, observers.
- Heavy child components when the unit under test is a page/layout.

**What NOT to Mock:**
- React Query: tests use the real `makeQueryClient()` with a fake repository to validate optimistic update, rollback and ordering (`apps/web/src/modules/itinerary/ui/itinerary-hooks.test.tsx`).
- `@tripory/ui-web` components in feature tests; render the real ones.
- Domain functions: test them directly with fixtures.

## Fixtures and Factories

**Test Data:**
```ts
// packages/itinerary/src/domain/test-fixtures.ts (not exported from the barrel)
export const makeWaypoint = (id: string, dayNumber: number, orderIndex: number, overrides: Partial<Waypoint> = {}): Waypoint => ...
export const makeItinerary = (overrides: Partial<Itinerary> = {}): Itinerary => ...
```
- `Partial<T>` overrides factories (`makeItinerary`, `makeWaypoint`, `makeDay`).
- Local `const waypoint = (id) => ({...})` and `const draft: Itinerary = {...}` are common inside UI tests; ids come from `parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f")` / `parseUserId("3f2504e0-...")`.
- Deferred promises for ordering tests: `deferred<T>()` returning `{ promise, resolve, reject }`.

**Location:**
- BE-shaped JSON fixtures: `apps/web/src/test/be-itinerary-fixtures.ts` (`ITINERARY_ID`, `OWNER_ID`, `WAYPOINT_IDS`, `ItineraryDetailJson` types; intentionally "dirty" like the real BE: sparse days, unordered `orderIndex`, 7-digit fractional timestamps) and `apps/web/src/test/be-auth-fixtures.ts` (`bearerPair(nowSec, expiresInSec)`).
- Request builder: `apps/web/src/test/next-request.ts` (`makeRequest(path, { method, origin, cookies, headers, body })`, `setCookiesOf(response)`, `TEST_ORIGIN = "https://app.test"`).
- Fixtures contain no real tokens, emails or secrets; keep it that way.

## Coverage

**Requirements:** None enforced; no coverage config. Compensating controls are static/invariant tests and per-package export tests.

**View Coverage:** Not available.

## Test Types

**Unit Tests:**
- Domain/application/infrastructure in `packages/*` run in node: pure functions, use cases against fake repositories (`packages/itinerary/src/application/use-cases.test.ts`), Zod DTOs and mappers (`dto.test.ts`, `mappers.test.ts`), HTTP repository with fake `HttpClient` (`http-itinerary-repository.test.ts`).
- Design-system atoms/molecules render in jsdom and check roles, keyboard activation, `aria-*`, and `data-*` states (`packages/ui-web/src/atoms/button.test.tsx`, `molecules/dialog.test.tsx`).

**Integration Tests:**
- Hook behavior in app with real React Query + fake repository: `itinerary-hooks.test.tsx`, `use-pending-delete.test.tsx`.
- Component trees of editor features: `itinerary-editor.test.tsx`, `timeline-panel.test.tsx`, `waypoint-form-dialog.test.tsx`, `dnd-strict-mode.test.tsx`.
- BFF/auth route flows with injected deps in `apps/web/src/composition/server/*.test.ts` (node env).

**Architecture/Invariant Tests (static):**
- `packages/config/test/boundaries.test.ts`: runs real ESLint against crafted snippets (violations must be caught, valid imports must not be flagged, every package/app wired to a preset). Do not loosen; fix the source or the preset deliberately.
- `apps/web/src/itinerary-invariants.test.ts`, `auth-invariants.test.ts`: walk source files (`readdirSync` + regex) to assert security/scope rules (no BE calls from RSC, no token leakage, no `/http` outside composition). Header says to fix the violating source rather than relax the test.
- `packages/ui-web/src/token-guard.test.ts`: forbids hard-coded colors/spacing in UI sources (`findTokenViolations`).
- `*/src/exports.test.ts`: assert public API names exist on each barrel (`packages/itinerary/src/exports.test.ts`, `packages/identity/src/exports.test.ts`, `packages/api-client/src/exports.test.ts`, `packages/ui-web/src/exports.test.ts`).
- `apps/web/src/proxy-coverage.test.ts`: proxy matcher coverage.

**E2E Tests:** Not used (no Playwright/Cypress).

## Common Patterns

**Async Testing:**
```tsx
const { result } = renderHook(() => itinerary.useAddWaypoint(ID), { wrapper });
await act(async () => { await result.current.mutateAsync(input); });
await waitFor(() => expect(repository.addWaypoint).toHaveBeenCalledTimes(1));
```
Wrap hook tests in `QueryClientProvider` with `makeQueryClient()`.

**Error Testing:**
```ts
await expect(render("not-a-guid")).rejects.toThrow("NEXT_NOT_FOUND");
expect(h.getViewer).not.toHaveBeenCalled();
```
Mocked `notFound`/`redirect` throw marker errors; assert the marker, and assert side effects did not happen. Server error responses: read JSON and compare `errorCode` (`errorCodeOf(res)` in `maps-handlers.test.ts`).

**Static source assertions:**
```ts
const source = readFileSync(path.join(__dirname, "page.tsx"), "utf8");
expect(source).not.toContain("@tripory/itinerary/http");
```

## Guidance for Phase 5 (public itinerary page, SVG map, sharing)

- New Server Component page (e.g. under `apps/web/src/app/(public)/itineraries/[id]/page.tsx`): test by calling the async function with `params: Promise.resolve({ id })`, mock `next/navigation`, `@/composition/*.server` and heavy children, and assert `metadata`/`generateMetadata` output. Add `// @vitest-environment node` if it touches request APIs.
- New client UI under `apps/web/src/modules/itinerary/ui/*.tsx` or `packages/ui-web`: add `<name>.test.tsx` beside it using Testing Library + `userEvent.setup()`; reuse `makeItinerary`-style factories (the app tests build their own local factories since `packages/itinerary/src/domain/test-fixtures.ts` is package-private).
- SVG map: jsdom has no layout (`getBoundingClientRect` is zeros) and no `ResizeObserver`; use `installFakeResizeObserver()` and assert on SVG attributes (`points`, `d`, `aria-label`) and pure projection functions tested in node rather than pixels.
- Share/clipboard features: stub `navigator.clipboard` / `navigator.share` per test with `vi.stubGlobal` and restore in `afterEach`.
- Any new UI code in `ui-web/src/atoms|molecules` or `apps/web/src/components` must pass `token-guard.test.ts` (semantic tokens only) and be exported + listed in `exports.test.ts`.
- Add new static guarantees (e.g. public page never reads auth cookies unnecessarily) to the invariants tests rather than prose.
- Pure logic (distance formatting, route projection, share URL building) belongs in `packages/itinerary/src/domain` with node-environment tests; only React glue is tested in jsdom.

---

*Testing analysis: 2026-10-25*
