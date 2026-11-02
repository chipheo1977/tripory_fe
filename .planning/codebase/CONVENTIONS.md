# Coding Conventions

**Analysis Date:** 2026-10-25

Authoritative sources: `AGENTS.md`, `ai-memories/tripory-fe--ddd-architecture.md` (layer placement, sections 4-8), `packages/config/eslint/boundaries.mjs` (enforced import rules). This document records the style conventions observed in code; it does not restate the architecture.

## Naming Patterns

**Files:**
- kebab-case for every source file: `save-status.ts`, `publish-button.tsx`, `itinerary-editor.tsx`, `form-error-mapping.ts`.
- Tests are co-located with the same stem plus `.test.ts` / `.test.tsx`: `save-status.test.ts`.
- Server-only composition files carry `.server.ts`: `apps/web/src/composition/viewer.server.ts`. Browser composition files carry `.client.ts`: `apps/web/src/composition/itinerary.client.ts`, `http.client.ts`.
- Next route files keep framework names (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`) under route groups `(public)`, `(dashboard)/(shell)`, `(dashboard)/(editor)`.
- React hooks live in `use-*.ts`: `use-media-query.ts`, `use-form-draft.ts`, `use-pending-delete.ts`.
- Test helpers/fakes that are not tests: `apps/web/src/test/fake-*.ts`, `be-*-fixtures.ts`, `next-request.ts`; domain fixtures `packages/itinerary/src/domain/test-fixtures.ts` (not exported from the barrel).

**Functions:**
- camelCase. Domain predicates are `canX`/`isX`: `canEdit`, `canPublish` in `packages/itinerary/src/domain/permissions.ts`.
- Parsers that return `null` on invalid input start with `parse`: `parseItineraryId`, `parseUserId`, `parseCalendarDate`, `parseLocationInput`.
- Factories start with `create`/`make`: `createSaveStatusStore`, `createItineraryHooks`, `createHttpItineraryRepository`, `makeQueryClient`, `makeRequest`.
- Use cases are verb + noun (`addWaypoint`, `reorderWaypoints`, `publishItinerary`) as `makeX(deps) => (input) => result` closures.

**Variables:**
- camelCase for locals; SCREAMING_SNAKE_CASE for module constants: `PUBLISH_BLOCKED_HINT`, `LG_QUERY`, `BASE_CLASSES`, `ITINERARY_ID`.
- Lookup tables are `X_BY_Y` objects with `as const`: `PRESENTATION_BY_FROM_MD`, `CLASSES_BY_PRESENTATION`, `VARIANT_BY_PRESENTATION` in `apps/web/src/modules/itinerary/ui/publish-button.tsx`.

**Types:**
- PascalCase `type` aliases, not `interface`. Props types are exported as `XProps`: `ButtonProps`, `TabsProps`, `PublishButtonProps`.
- Domain shapes are `Readonly<{ ... }>` plain objects: `Viewer` in `packages/identity/src/domain/viewer.ts`, `SaveStatusSnapshot` in `apps/web/src/modules/itinerary/ui/save-status.ts`. Do not use classes (RSC props must serialize); the only class allowed is `DomainError extends Error`.
- Branded ids and value objects come from `@tripory/shared-kernel` (`ItineraryId`, `UserId`, `createWgs84Coordinate`).

## Code Style

**Formatting:**
- No Prettier, Biome or `.editorconfig` is present. Formatting is by convention only (match the neighboring file).
- Always semicolons, trailing commas in multi-line literals, 2-space indent, arrow-function-heavy.
- Quote style differs by area. `apps/web/src/**` uses double quotes (`"use client"`, `"@/composition/..."`). `packages/*/src/**` and `packages/ui-web/src/**` use single quotes. Follow the style of the directory you edit; do not reformat existing files.
- Line width is loose (~120 for app code, long Tailwind class strings stay on one line in `packages/ui-web/src/atoms/button.tsx`).

**Linting:**
- ESLint 9 flat config. Each package/app has a one-line `eslint.config.mjs` that calls a preset from `packages/config/eslint/boundaries.mjs` (`contextPackage()`, `kernelPackage()`, `httpPackage()`, `uiPackage({ role })`, `app()`). Base TypeScript rules in `packages/config/eslint/base.mjs` (`typescript-eslint` recommended).
- `apps/web/eslint.config.mjs` layers `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, then `...app()`.
- Boundary rules are `error`, default-deny. A blocked import means wrong layer; read the error and architecture doc section 5 before touching the allowlist (`AGENTS.md`).
- Domain and application layers also ban `fetch`, `Date.now`, `new Date()` without arguments, `Math.random`, browser globals and dynamic `import()`.
- TypeScript: `strict`, `verbatimModuleSyntax`, `isolatedModules`, `moduleResolution: "bundler"` (`packages/config/tsconfig/library.json`). Use `import type` / inline `type` for type-only imports.
- Run before reporting done: `pnpm lint`, `pnpm typecheck`, `pnpm test` from the repo root (Turborepo).

## Import Organization

**Order (observed, not tool-enforced):**
1. Workspace packages and external libraries (`@tripory/*`, `@tanstack/react-query`, `@testing-library/*`, `lucide-react`, `next/*`, `react`).
2. App alias imports `@/composition/...`, `@/modules/...`, `@/components/...`, `@/test/...`.
3. Relative imports (`./publish-button`).

Type-only imports use `import type` and often come first.

**Path Aliases:**
- `@/*` → `apps/web/src/*` (`apps/web/tsconfig.json`; Vitest resolves it with `resolve.tsconfigPaths: true`).
- Workspace packages are consumed only through their `exports`: `@tripory/itinerary` (domain + application), `@tripory/itinerary/react` (hooks), `@tripory/itinerary/http` (only in `apps/web/src/composition/**`), `@tripory/ui-web`, `@tripory/shared-kernel`. Never `@tripory/*/src/**`.
- Inside a package, import siblings relatively; each layer folder exposes `index.ts`.

## Error Handling

**Patterns:**
- Parsers return `null` rather than throw, callers branch: `const itineraryId = parseItineraryId(id); if (itineraryId === null) notFound();` (`apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/page.tsx`).
- Invariant violations in programmer-controlled code throw plain `Error` with a clear message: `throw new Error("useSaveStatusStore phải nằm trong SaveStatusProvider")`.
- DTO validation uses Zod in each package's `infrastructure/`; mappers translate DTO → domain (anti-corruption layer): `packages/itinerary/src/infrastructure/mappers.ts`.
- HTTP failures become typed `ApiError` via `packages/api-client/src/to-api-error.ts`; the app maps codes to user copy through `apps/web/src/lib/feedback/*` (`error-messages.ts`, `form-error.ts`, `resolve-form-error.ts`, `mutation-feedback.ts`).
- Form errors map server codes to field errors in `form-error-mapping.ts` next to the form (itinerary and identity both have one).
- BFF route handlers return JSON `{ errorCode }` with explicit status (e.g. `Bff.MethodNotAllowed` 405); see `apps/web/src/composition/server/bff.ts`, `request-guards.ts`.
- Route-level boundaries: each route group has `error.tsx`, `loading.tsx`; global `apps/web/src/app/global-error.tsx`, `not-found.tsx`.

## Logging

**Framework:** None. No logging library and no `console` usage convention; do not add `console.log` to committed code. User feedback goes through `Toast` from `@tripory/ui-web` and inline alerts (`InlineAlert`, `ErrorState`).

## Comments

**When to Comment:**
- Comments are written in Vietnamese and explain WHY (decision, pitfall, threat), usually referencing planning IDs: `D-46`, `D-30`, `Pitfall 11`, `T-04-59`, `PITFALLS P13`. Keep that style when changing code tied to those decisions, and cite the new decision ID for new behavior.
- File-top comment blocks describe a module's role and wiring conventions (see `apps/web/src/modules/itinerary/ui/save-status.ts`).
- Test fixtures and helpers note that they intentionally avoid importing `vitest` when they must work in node and jsdom (`apps/web/src/test/next-request.ts`).

**JSDoc/TSDoc:**
- Short `/** ... */` on exported constants, props fields and helpers: `/** Trùng breakpoint \`lg\` của Tailwind (1024px). */`. No `@param` / `@returns` tags.

**User-facing copy:**
- UI strings, metadata titles and test titles for UI are Vietnamese ("Sửa lịch trình", "Xuất bản"). Test titles for pure logic in `apps/web` are often English. Source files are UTF-8; keep diacritics intact.

## Function Design

**Size:** Small, single-purpose. Components extract presentation lookups into constants and helper functions (`stateAttributes` in `publish-button.tsx`) instead of nested conditionals.

**Parameters:** Components take one props object, typed with `Readonly<{ ... }>` or a named `XProps`. Factories take a `deps` object. Callbacks are named `onX`.

**Return Values:** Pure functions return plain readonly data; no mutation of arguments. Boolean `visible` / early `return null` for conditional UI (`Button` returns `null` when `visible` is false).

## Module Design

**Exports:**
- Named exports only (no default) except Next route files that require `export default` (`page.tsx`, `layout.tsx`).
- Compound components in `packages/ui-web/src/molecules` export each part as a named export (`Tabs`, `TabsList`, `TabsTrigger`, `Dialog*`) so Server Components can use them; never `Tabs.Panel`-style static properties (architecture doc section 9).
- Components are wrapped over Base UI (`@base-ui/react`) with `cva` variants and `cn` from `packages/ui-web/src/lib/cn.ts`:

```tsx
// packages/ui-web/src/atoms/button.tsx
'use client';
const buttonVariants = cva('relative inline-flex ...', {
  variants: { variant: { primary: '...', ghost: '...' }, size: { sm: '...', md: '...' } },
  defaultVariants: { variant: 'primary', size: 'md' },
});
export type ButtonProps = BaseButtonProps & VariantProps<typeof buttonVariants> & { loading?: boolean };
export function Button({ className, size, variant, ...props }: ButtonProps) {
  return <BaseButton {...props} className={buttonVariants({ className, size, variant })} />;
}
```

**Barrel Files:**
- `packages/ui-web/src/index.ts` re-exports atoms, molecules, `lib/cn` with `export *`. Every new ui-web component must be added there and covered by `packages/ui-web/src/exports.test.ts`.
- `packages/itinerary/src/index.ts` exposes only domain + application; infrastructure and react go through `./http` and `./react` (guarded by `packages/itinerary/src/exports.test.ts`).
- Test-only fixtures are not re-exported.

## React / Next Conventions

- `"use client"` is the first line of any file using state, effects, context or Base UI parts (all of `ui-web` atoms/molecules, most of `apps/web/src/modules/*/ui`). Pages, layouts and `composition/*.server.ts` stay server.
- `page.tsx` stays thin: validate params, fetch viewer, render a module component. Example `apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/page.tsx` (`params` is a `Promise`, awaited).
- Cache Components is on: any component using `usePathname`, `useSearchParams`, `cookies()` or awaited `params` must sit under `<Suspense>` (see `apps/web/src/app/providers.tsx`, `(editor)/layout.tsx`). Check `apps/web/node_modules/next/dist/docs/` before adding routes.
- Server → Client props must be serializable plain data; no functions or class instances.
- Server data access goes through the BFF (`/api/bff/[...path]`); browser code uses `bffHttp`/`appHttp` from `apps/web/src/composition/http.client.ts`. Tokens live in httpOnly cookies and never reach client JS. Server Components do not call the BE (`page.test.tsx` asserts this).
- One `QueryClient` per browser session created with `makeQueryClient` (`apps/web/src/composition/query-client.ts`) inside `useState` in `providers.tsx`.
- Hooks come from composed factories (`itinerary` in `apps/web/src/composition/itinerary.client.ts`); components do not build repositories.
- External-store UI state uses `useSyncExternalStore` with a referentially stable snapshot (`save-status.ts`).

## Styling and Design Tokens

- Tailwind 4 with semantic token utilities from `@tripory/design-tokens` (`bg-surface`, `text-muted`, `min-h-touch`, `rounded-control`, `gap-control-gap`, `duration-(--semantic-motion-duration-fast)`).
- `packages/ui-web/src/token-guard.test.ts` forbids in `ui-web/src/atoms`, `molecules` and `apps/web/src/components`: hard-coded colors, `--primitive-*`, Tailwind palette colors (`text-red-500`), numeric spacing/size (`p-4`, `h-10`), numeric `z-*`/`duration-*`, arbitrary px/rem values, and `dark:` variants. Use semantic tokens instead.
- Variant state selectors use Base UI data attributes (`data-disabled:`, `data-active:`) and ARIA (`aria-disabled:`).
- Responsive branches read `useMediaQuery` with the Tailwind breakpoint (`(min-width: 1024px)` = `lg`, 768px = `md`).
- Minimum touch target is `min-h-touch` / `min-w-touch` (44px).

## Accessibility

- Disabled-but-explained actions use `aria-disabled` + `aria-describedby` to a hint element, not the `disabled` attribute (`publish-button.tsx`).
- Loading buttons set `aria-busy` and `focusableWhenDisabled` so keyboard users keep focus.
- Decorative icons/spinners are `aria-hidden`; drag-and-drop has announcements in `dnd-announcements.ts`.

---

*Convention analysis: 2026-10-25*
