# Phase 3: Identity & Session (BFF) - Pattern Map

**Mapped:** 2026-10-13
**Files analyzed:** ~70 file mới/sửa, gom thành 30 nhóm (file nguồn và test đi cặp đếm chung một nhóm)
**Analogs found:** 24 / 30 nhóm. 6 nhóm không có analog về logic (route handler `NextRequest`/`NextResponse`, `proxy.ts`, BFF `resolveBffTarget`/`forwardToBackend`, `session-store` cookie, Web Locks + `BroadcastChannel`, form React Hook Form). Phần logic lấy từ RESEARCH.md Pattern 2–9 và Code Examples; style lấy từ analog gần nhất.

Repo sau Phase 2: `api-client` đầy đủ (`createFetchHttpClient`, `withSessionRefresh`, `ApiError`, fixture BE), `shared-kernel` có `ids.ts`/`geo.ts`, `apps/web/src/lib/feedback/*` có bảng map và quyết định toast. `packages/itinerary` vẫn là khung rỗng 4 tầng (analog cấu trúc cho `packages/identity`). **Repo chưa có**: `apps/web/src/composition/**`, `apps/web/src/modules/**`, `proxy.ts`, `app/api/**`, `@tanstack/react-query`, `zod`, `react-hook-form`, test `@vitest-environment node` trong app, fake `navigator.locks`/`BroadcastChannel`.

Quy ước style theo vùng (giữ nguyên như 02-PATTERNS):
- `packages/*`: nháy đơn, có `;`, comment tiếng Việt giải thích *lý do* (`with-session-refresh.ts`, `boundaries.mjs`). Tên test tiếng Việt.
- `apps/web/src/**` (code app, gồm `composition/**`, `modules/**`, `app/**`, `proxy.ts`): nháy kép, có `;` (`user-menu.tsx`, `lib/feedback/*.ts`). Tên test tiếng Anh mô tả hành vi (`app-header.test.tsx`) hoặc tiếng Việt đều có; theo file kề bên.
- Không class, `type` readonly + hàm thuần, deps tiêm `makeX(deps)`; state sống trong closure, không module scope (trừ singleton có chủ đích ở `composition/*.client.ts`, ghi lý do).

## File Classification

| File mới/sửa | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/identity/{package.json,eslint.config.mjs,tsconfig.json,vitest.config.ts}` (mới) | config | — | `packages/itinerary/*` cùng tên | exact |
| `packages/identity/src/index.ts` (mới) | barrel (domain + application) | — | `packages/itinerary/src/index.ts` | exact |
| `packages/identity/src/domain/viewer.ts` (mới) | model | transform | `packages/shared-kernel/src/ids.ts` | role-match |
| `packages/identity/src/domain/safe-next-path.ts` + test (mới) | utility (validator) | transform | `shared-kernel/src/ids.ts` (`parseX → T \| null`) + `ids.test.ts` | role-match |
| `packages/identity/src/domain/token-freshness.ts` + test (mới) | utility | transform | `shared-kernel/src/geo.ts` (hàm thuần, không đồng hồ) | role-match |
| `packages/identity/src/domain/password-rules.ts` + test (mới) | model (dữ liệu rule) | transform | `packages/design-tokens/src/index.ts` (hằng `as const`) + `ids.ts` | partial |
| `packages/identity/src/application/ports.ts` (mới) | port (type) | request-response | `packages/api-client/src/http-client.ts` (chỉ type) | role-match |
| `packages/identity/src/infrastructure/{dto,access-token-claims,mappers}.ts` + test (mới) | ACL (Zod schema + mapper) | transform | `api-client/src/response-shapes.ts` (type guard) — logic Zod: RESEARCH Code Examples | partial |
| `packages/identity/src/infrastructure/http-session-gateway.ts` + test (mới) | repository/adapter | request-response | `api-client/src/with-session-refresh.ts` (factory nhận `HttpClient`) + test fake `HttpClient` | role-match |
| `packages/identity/src/infrastructure/index.ts` (mới, → `./http`) | barrel | — | `api-client/src/http.ts` | exact |
| `packages/identity/src/react/index.ts` (mới, `createIdentityHooks`) | hook factory | request-response | không có (itinerary/react rỗng) — style `withSessionRefresh(inner, deps)` | partial |
| `packages/identity/src/exports.test.ts` (mới, khuyến nghị) | test | — | `packages/api-client/src/exports.test.ts` | exact |
| `pnpm-workspace.yaml` (thêm 4 catalog) | config | — | chính nó dòng 12–37 | exact |
| `apps/web/package.json` (thêm deps) | config | — | chính nó dòng 16–23 | exact |
| `packages/config/test/boundaries.test.ts` (thêm case identity + web) | test | batch | chính nó dòng 47–148 | exact |
| `packages/design-tokens/src/{semantic,dark,theme,components}.css` + `tokens.test.ts` | config (token) | — | `--semantic-size-content-sm` (semantic.css:47, theme.css:56), `components.css:1-6` | exact |
| `packages/ui-web/src/atoms/button.tsx` (+ `loadingLabel`) + test | component (atom) | — | chính nó dòng 28–43, `button.test.tsx` | exact |
| `packages/ui-web/src/molecules/password-input.tsx` + test (mới) | component (molecule) | — | `packages/ui-web/src/molecules/search-input.tsx` | exact |
| `packages/ui-web/src/molecules/inline-alert.tsx` + test (mới) | component (molecule) | — | `molecules/error-state.tsx` (variant `card`) | role-match |
| `packages/ui-web/src/molecules/dropdown-menu.tsx` (+ `DropdownMenuLinkItem`) + test, `index.ts`, `exports.test.ts` | component | — | `DropdownMenuItem` cùng file dòng 56–61 | exact |
| `apps/web/src/composition/session-cookies.ts` (mới) | config (hằng + helper) | — | `lib/feedback/error-messages.ts` (hằng export) | partial |
| `apps/web/src/composition/server/{env,upstream,session-store,request-guards,auth-handlers,bff}.ts` + test (mới) | service (route logic thuần) | request-response | `api-client/src/fetch-http-client.ts` (timeout + phân loại lỗi) + test fake fetch | partial |
| `apps/web/src/composition/viewer.server.ts` (mới) | service (server reader) | request-response | không có | none |
| `apps/web/src/composition/http.client.ts` + test (mới) | composition (client HTTP + lock) | request-response + single-flight | `with-session-refresh.ts` + `.test.ts` (fake lock, deferred) | role-match |
| `apps/web/src/composition/{identity.client,session-events.client,query-client}.ts` + test (mới) | composition / event-driven | pub-sub | `lib/feedback/mutation-feedback.ts` dòng 22–31 (sketch MutationCache) | partial |
| `apps/web/src/app/api/auth/{login,register,logout,refresh,change-password}/route.ts`, `api/bff/[...path]/route.ts` (mới) | route (vỏ mỏng) | request-response | không có route handler; vỏ mỏng như `(dashboard)/itineraries/mine/page.tsx` | none |
| `apps/web/src/proxy.ts` + `proxy.test.ts` + `proxy-coverage.test.ts` (mới) | middleware | request-response | không có; test đọc FS: `apps/web/src/app/layout.test.tsx` | partial |
| `apps/web/src/app/layout.tsx` (sửa) + `providers.tsx` (mới) + `layout.test.tsx` (sửa) | provider | — | chính nó dòng 1–21 | exact |
| `apps/web/src/app/(dashboard)/layout.tsx` (sửa), `(dashboard)/settings/password/page.tsx`, `(public)/login/page.tsx`, `(public)/register/page.tsx` (mới) | route/page | — | `(dashboard)/layout.tsx`, `itineraries/mine/page.tsx`, `route-layouts.test.tsx` | exact |
| `apps/web/src/components/{app-header,app-shell,user-menu}.tsx` (sửa) + test | component (organism) | — | chính chúng + `app-header.test.tsx` (`vi.mock("next/navigation")`) | exact |
| `apps/web/src/modules/identity/ui/*.tsx` (form, checklist, submit-status, recovery, effects, keeper, guest button) + test (mới) | component (organism client) | request-response / event-driven | `ui-web/molecules/search-input.tsx` (state client) + `error-state.test.tsx`; `(dashboard)/loading.tsx`, `error.tsx` | role-match |
| `apps/web/src/modules/identity/ui/{form-schemas,form-error-mapping}.ts` + test (mới) | utility (presentation policy) | transform | `apps/web/src/lib/feedback/resolve-form-error.ts` + `error-messages.ts` | exact |
| `apps/web/src/lib/feedback/error-messages.ts` (thêm hằng toast D-20) | config | — | chính nó dòng 10–14 | exact |
| `apps/web/src/test/next-request.ts`, fake lock/BroadcastChannel (mới) | test helper | — | `api-client/src/fetch-http-client.test.ts` dòng 13–49 (fake fetch), `with-session-refresh.test.ts` dòng 6–50 | role-match |

Không cần sửa: `packages/config/eslint/boundaries.mjs` (`contextPackage()` đã cho `zod` ở infrastructure, `react` + `@tanstack/react-query` ở react — dòng 117–125; `app()` không có allowlist module ngoài — dòng 169–172), `turbo.json`, `apps/web/vitest.config.ts`, `apps/web/eslint.config.mjs`, `apps/web/next.config.ts` (đã `cacheComponents: true`, dòng 5), `packages/api-client/**` (không đổi API `withSessionRefresh`).

## Pattern Assignments

### `packages/identity/` khung (config)

**Analog:** `packages/itinerary/package.json` dòng 1–27, `eslint.config.mjs` dòng 1–3, `tsconfig.json` dòng 1–4, `vitest.config.ts` dòng 1–3. Sao nguyên, đổi tên và thêm dependency theo RESEARCH §Installation:
```json
{
  "name": "@tripory/identity",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./http": "./src/infrastructure/index.ts",
    "./react": "./src/react/index.ts"
  },
  "scripts": { "lint": "eslint", "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "@tripory/api-client": "workspace:*", "@tripory/shared-kernel": "workspace:*", "zod": "catalog:" },
  "peerDependencies": { "@tanstack/react-query": "catalog:", "react": "catalog:" },
  "devDependencies": {
    "@tanstack/react-query": "catalog:", "@tripory/config": "workspace:*", "@types/node": "catalog:",
    "@types/react": "catalog:", "eslint": "catalog:", "react": "catalog:", "typescript": "catalog:", "vitest": "catalog:"
  }
}
```
```js
// eslint.config.mjs
import { contextPackage } from '@tripory/config/eslint';

export default contextPackage();
```
- `"test": "vitest run"` (không `--passWithNoTests`, package có test ngay từ đầu; như `api-client/package.json` dòng 13).
- `react`/`@tanstack/react-query` là **peer** + dev (tài liệu kiến trúc mục 9).
- Self-test `boundaries.test.ts` dòng 166–183 tự kiểm `packages/identity/eslint.config.mjs` có `@tripory/config/eslint`.

**Barrel `src/index.ts`** theo `packages/itinerary/src/index.ts` dòng 1–2:
```typescript
export * from './domain';
export * from './application';
```
Barrel gốc bị lint `pure: true` + cấm `./infrastructure`, `./react` (`boundaries.mjs` dòng 124). `domain/index.ts`, `application/index.ts` là `export * from './viewer';` …

---

### `packages/identity/src/domain/{viewer,safe-next-path,token-freshness,password-rules}.ts` + test (model/utility, transform)

**Analog:** `packages/shared-kernel/src/ids.ts` dòng 1–30: comment tiếng Việt giải thích lý do ở đầu, `type` export trước, hằng regex module-level, hàm trả `null` thay vì ném lỗi.
```typescript
// Trả `null` thay vì ném lỗi: chuỗi sai là chuyện bình thường ở route param, nơi gọi tự quyết 404 hay bỏ qua.
const parseGuid = <B extends string>(value: string): Brand<string, B> | null => {
  const trimmed = value.trim();

  return isGuid(trimmed) ? (trimmed.toLowerCase() as Brand<string, B>) : null;
};

export const parseUserId = (value: string): UserId | null => parseGuid<'UserId'>(value);
```
Áp dụng:
- `viewer.ts`: `export type Viewer = Readonly<{ id: UserId; email: string; fullName: string; handle: string; avatarUrl: string | null }>;` import `UserId` từ `@tripory/shared-kernel` (allowlist domain dòng 119). `viewerDisplayName(v) = v.fullName.trim() || v.email` (UI-SPEC §Trigger).
- `safe-next-path.ts`: `toSafeNextPath(raw: string | null | undefined): string | null` theo RESEARCH Pattern 5 (bảng luật + bảng ca). **Không dùng `URL`**, chỉ kiểm chuỗi.
- `token-freshness.ts`: `STALE_AT_SEC = 30`, `REFRESH_IF_BELOW_SEC = 150`, `PROACTIVE_LEAD_SEC = 120`, `remainingSeconds(exp, nowSec)`, `isFresh(exp, nowSec, minSec)`. **`nowSec` là tham số** — domain bị cấm `Date.now`/`new Date()` (`boundaries.mjs` dòng 87–103).
- `password-rules.ts`: lấy nguyên RESEARCH §Code Examples "Rule mật khẩu dạng dữ liệu" (6 rule đổi mật khẩu theo D-34, regex `special` = `/[!?*@#$%^&+=]/`). Comment nguồn file:dòng validator BE như mẫu.

**Test:** theo `packages/shared-kernel/src/ids.test.ts` / `ui-web/molecules/sheet-snap.test.ts` (`it.each([...] as const)` bảng biên, `describe` tiếng Việt, chỉ import `vitest` + file cùng thư mục). Ca bắt buộc: bảng `toSafeNextPath` của RESEARCH Pattern 5 (gồm `/\t/evil.com`, `/login?next=/x`, `/api/bff/users`), `special` không nhận `-`, `_`, `.`; `differentFromCurrent` với rỗng.

---

### `packages/identity/src/application/ports.ts` (port, type-only)

**Analog:** `packages/api-client/src/http-client.ts` dòng 1–23 (comment đầu file giải thích, chỉ `type`, `Readonly<{...}>`):
```typescript
export type HttpClient = Readonly<{ send(request: HttpRequest): Promise<unknown> }>;
```
Áp dụng:
```typescript
export type SessionGateway = Readonly<{
  login(input: LoginInput): Promise<Viewer>;
  register(input: RegisterInput): Promise<Viewer>;
  logout(): Promise<void>;
  changePassword(input: ChangePasswordInput): Promise<void>;
}>;
export type ProfileReader = Readonly<{ me(): Promise<Viewer> }>;
```
Application không import `@tripory/api-client` (allowlist chỉ `KERNEL`, dòng 120). Không viết use case chuyển tiếp (tài liệu kiến trúc mục 6: chỉ gọi thẳng port).

---

### `packages/identity/src/infrastructure/{dto,access-token-claims,mappers}.ts` + test (ACL, transform)

**Analog style:** `packages/api-client/src/response-shapes.ts` (type guard tay cho body BE) — Phase 3 thay bằng Zod (allowlist `zod` dòng 121). **Logic:** lấy nguyên RESEARCH §Code Examples "Schema claim JWT (tolerant)" (URI dài `nameidentifier`/`emailaddress` ưu tiên, fallback `nameid`/`sub`/`email`, `exp` số nguyên dương, trả `null` khi không hợp lệ).
- `dto.ts`: `authResponseDto = z.object({ accessToken, refreshToken, expiresAt, user: userDto })`, `tokenResponseDto` (không có `user`), `userDto`, `userProfileDto` theo RESEARCH §Contract BE. `viewerDto` là hình dạng `{ viewer }` mà route `/api/auth/login|register` trả cho browser.
- `mappers.ts`: `toViewer(userDto)`, `normalizeAvatarUrl(url)` map đúng `"https://api.dicebear.com/7.x/identicon/svg?seed=tripory"` và rỗng → `null`.
- Giải mã base64url **không** nằm ở package (cần `Buffer`, server-only): `parseAccessTokenClaims(payload: unknown)` nhận object đã giải mã.

**Fixture:** theo `packages/api-client/src/fixtures/be-responses.ts` (export `const` có tên, không import `vitest`, không export từ barrel). Đặt `packages/identity/src/infrastructure/fixtures.ts` hoặc `src/fixtures/be-auth.ts`: payload JWT thật (RESEARCH §Tên claim JWT), `authResponse`, `tokenResponse`, `userProfile`, `name` tiếng Việt có dấu.

**Test:** `it.each` bảng payload (URI thật, dạng ngắn, thiếu id, thiếu email, `role` mảng, `exp` thiếu) như `ids.test.ts`.

---

### `packages/identity/src/infrastructure/http-session-gateway.ts` + test (adapter, request-response)

**Analog:** factory nhận client rồi trả object method — `packages/api-client/src/with-session-refresh.ts` dòng 41, 77–123:
```typescript
export function withSessionRefresh(inner: HttpClient, deps: SessionRefreshDeps): HttpClient {
  // State nằm trong closure, không ở module scope ...
  return {
    async send(request) {
      if (request.sessionRefresh === false) {
        const response = await inner.send(request);
```
Áp dụng: `createHttpSessionGateway(http: HttpClient): SessionGateway`. `http` là `authHttp` (base `/api/auth`), `login`/`register`/`logout` đặt `sessionRefresh: false` (dòng 80; 401 ở đó không có nghĩa là hết phiên). **Ngoại lệ đã chốt khi lập plan:** `changePassword` KHÔNG đặt cờ này và đi qua `authHttp` đã bọc `withSessionRefresh`, vì route trả 401 `session.expired` khi access token stale và client cần refresh rồi phát lại. Client gọi chính route `/refresh` là `authRawHttp` không bọc (tránh đệ quy, RESEARCH Anti-Patterns). Response parse bằng `viewerDto.parse` → `Viewer`. `createHttpProfileReader(http)` gọi `GET /users/me` qua `bffHttp`, parse `userProfileDto` → `toViewer` + `normalizeAvatarUrl`.

**Test:** fake `HttpClient` như `with-session-refresh.test.ts` dòng 27–37:
```typescript
const send = vi.fn(async (request: HttpRequest): Promise<unknown> => { /* ... */ });
const inner: HttpClient = { send };
```
Kiểm `send` được gọi với `{ method: 'POST', path: '/login', body, sessionRefresh: false }`; body BE sai hình dạng → ném lỗi parse (không trả Viewer hỏng).

**`infrastructure/index.ts`** theo `api-client/src/http.ts` dòng 1–4 (comment "Chỉ composition được import subpath này").

---

### `packages/identity/src/react/index.ts` (hook factory)

**Không có analog logic** (`itinerary/src/react/index.ts` là `export {}`). Style: factory `createIdentityHooks(deps)` (tài liệu kiến trúc mục 6), `identityKeys = { me: ['identity', 'me'] } as const` (như `design-tokens/src/index.ts` `as const`). Hook nhận `options` từ app để app gắn `meta: { feedback }` (package không biết `MutationFeedback`):
```typescript
export function createIdentityHooks(deps: Readonly<{ gateway: SessionGateway; profile: ProfileReader }>) {
  return {
    useLogin: (options?: Omit<UseMutationOptions<Viewer, unknown, LoginInput>, 'mutationFn'>) =>
      useMutation({ ...options, mutationFn: deps.gateway.login }),
    useMyProfile: (enabled: boolean) => useQuery({ queryKey: identityKeys.me, queryFn: deps.profile.me, enabled, staleTime: 5 * 60_000 }),
    // useRegister, useChangePassword, useLogout cùng dạng
  };
}
```
Lint: chỉ `react`, `@tanstack/react-query`, `KERNEL` + import tương đối `../application`, `../domain` (dòng 122). Cấm `../infrastructure`, `next/*`, `react-dom`. Test (nếu có) cần `// @vitest-environment jsdom` đầu file (preset node, `packages/config/vitest/preset.mjs` dòng 6–8) — khuyến nghị không test hook ở package, test qua component ở app.

---

### `packages/identity/src/exports.test.ts` (khuyến nghị)

**Analog:** `packages/api-client/src/exports.test.ts` dòng 1–33:
```typescript
import * as httpApi from './http';
import * as publicApi from './index';

const missingFrom = (module: object, names: readonly string[]) => names.filter((name) => !(name in module));

it('entry gốc không có factory client hay helper nội bộ', () => {
  expect('createFetchHttpClient' in publicApi).toBe(false);
```
Áp dụng: `./index` có `toSafeNextPath`, `CHANGE_PASSWORD_RULES`, `REGISTER_PASSWORD_RULES`, `evaluatePasswordRules`, `viewerDisplayName`, hằng freshness; **không** có `createHttpSessionGateway`, `parseAccessTokenClaims`, `authResponseDto`. `./infrastructure` có hai factory + `parseAccessTokenClaims`.

---

### `pnpm-workspace.yaml`, `apps/web/package.json` (config)

**Analog:** `pnpm-workspace.yaml` dòng 12–37 (một dòng mỗi package, có comment lý do khi pin không phải bản mới nhất):
```yaml
  "@base-ui/react": 1.8.0 # D-02: giữ bản đã kiểm, không tự nâng lên 1.9.0
```
Thêm: `"@tanstack/react-query": 5.104.2`, `zod: 4.6.7`, `react-hook-form: 7.89.0 # 7.90.0 mới ra 2 ngày, chưa cần`, `"@hookform/resolvers": 5.9.1`.

`apps/web/package.json` dòng 16–23: thêm `"@hookform/resolvers": "catalog:"`, `"@tanstack/react-query": "catalog:"`, `"@tripory/identity": "workspace:*"`, `"react-hook-form": "catalog:"`, `"zod": "catalog:"` theo alphabet. Rồi `pnpm install`.

---

### `packages/config/test/boundaries.test.ts` (test, batch) — chỉ thêm case

**Analog:** chính file. Thêm hằng `const identity = 'packages/identity';` sau dòng 52. Định dạng một dòng như dòng 56–124 và 128–147:
```typescript
{ name: 'api-client: navigator (Web Locks phải tiêm qua deps)', dir: apiClient, file: 'src/x.ts', code: "...", violations: [{ rule: 'no-restricted-globals', includes: "'navigator'" }] },
```
Case đề xuất (RESEARCH Wave 0):
- `bad`: `identity domain: zod` (`src/domain/x.ts` → `imp("'zod'")`); `identity react: next/navigation` (`src/react/x.ts` → `imp("'next/navigation'")`); `identity infrastructure: Buffer/next/headers` (`imp("'next/headers'")`); `identity domain: Date.now`; `web: /http trong modules/identity/ui` (`src/modules/identity/ui/x.ts` import `@tripory/identity/http`); `web: api-client /http trong proxy.ts` (`src/proxy.ts`).
- `ok`: `identity infrastructure: zod + api-client`; `identity react: react-query + ../domain`; `web: composition import @tripory/identity/http`; `web: proxy.ts import @tripory/identity + @/composition/session-cookies`.

Không sửa `boundaries.mjs`. Nếu `proxy.ts` hoặc `app/api/**/route.ts` cần `/http`: sai tầng — đưa vào `composition/server/*` (AGENTS.md).

---

### Token `max-w-form`, `--user-menu-name-max-width` (config)

**Analog:** `--semantic-size-content-sm: 640px;` ở `semantic.css:47` + `dark.css:47`, alias `--spacing-content-sm: var(--semantic-size-content-sm);` ở `theme.css:56`, kỳ vọng ở `tokens.test.ts:111`. Thêm `--semantic-size-form: 400px` cùng ba file + `'--semantic-size-form': '400px'` vào map test.

Component token theo `components.css` dòng 1–6 (`:root { --sheet-side-width: ...; }`) và test `tokens.test.ts` dòng 177–184 (`toEqual` toàn bộ khai báo — **phải thêm** `'--user-menu-name-max-width': '160px'` vào object, nếu không test đỏ).

---

### `packages/ui-web/src/atoms/button.tsx` (+ `loadingLabel`)

**Analog:** chính nó dòng 28–43:
```tsx
export type ButtonProps = BaseButtonProps & VariantProps<typeof buttonVariants> & { loading?: boolean };

export function Button({ children, className, disabled, loading = false, size, variant, ...props }: ButtonProps) {
  return (
    <BaseButton {...props} aria-busy={loading || undefined} className={buttonVariants({ className, size, variant })}
      disabled={disabled || loading} focusableWhenDisabled={loading}>
      <span className={loading ? 'invisible' : undefined}>{children}</span>
      {loading ? <span aria-hidden className="absolute size-(--spinner-size-sm) animate-spin ..." /> : null}
    </BaseButton>
  );
}
```
Thêm `loadingLabel?: ReactNode`. Khi `loading && loadingLabel`: render `<Spinner decorative size="sm" />` + `<span>{loadingLabel}</span>` (gap đã có `gap-control-gap` trong cva dòng 8), không render children. Atom được import `../atoms/spinner`? — Spinner là atom cùng tầng, import tương đối `./spinner` hợp lệ (zone atoms chỉ cấm `molecules`, dòng 153–158). Giữ nhánh cũ khi không có `loadingLabel`.

**Test:** theo `button.test.tsx` dòng 14–27 (`it.each` trạng thái, `userEvent.setup().click`, `aria-busy`, `tabIndex`). Thêm ca: label "Đang lưu…" thấy được, children ẩn, click lần hai không gọi.

---

### `packages/ui-web/src/molecules/password-input.tsx` + test (mới)

**Analog:** `packages/ui-web/src/molecules/search-input.tsx` dòng 1–82 — đúng mẫu Input + IconButton đặt tuyệt đối bên phải:
```tsx
'use client';

import { Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Icon } from '../atoms/icon';
import { IconButton } from '../atoms/icon-button';
import { Input } from '../atoms/input';
import type { InputProps } from '../atoms/input';
// ...
    <div className="relative w-full">
      <Input {...props} ref={inputRef} className={cn('pl-section pr-page-block', className)} ... />
      <span className="absolute right-inline-xs top-1/2 flex -translate-y-1/2 items-center">
        {clearable && currentValue ? (
          <IconButton aria-label="Xóa tìm kiếm" onClick={clear} size="sm" type="button">
            <Icon icon={X} size="sm" />
          </IconButton>
        ) : null}
      </span>
    </div>
```
Áp dụng: `Eye`/`EyeOff`, state `visible`, `type={visible ? 'text' : 'password'}`, `size="lg"`, padding phải `pr-page-block` (48px, cùng utility SearchInput dùng). IconButton `aria-label` "Hiện mật khẩu"/"Ẩn mật khẩu", `aria-pressed={visible}`, `aria-controls={id}`, `type="button"`, `disabled={props.readOnly}`. Reset `visible` khi value rỗng (theo dõi `value` controlled như `currentValue` dòng 38). Phải chuyển `ref` (RHF `register`) — SearchInput Omit `ref`, PasswordInput **không** Omit; dùng `ref` prop của React 19.

**Test:** theo `search-input.test.tsx` dòng 6–42 (`userEvent.setup()`, `getByRole('button', { name })`, kiểm focus). Ca: toggle đổi `type` + `aria-pressed`; nằm trong `<form onSubmit={spy}>` click toggle không gọi spy; `readOnly` → toggle disabled; rerender value `''` → về ẩn.

---

### `packages/ui-web/src/molecules/inline-alert.tsx` + test (mới)

**Analog:** `molecules/error-state.tsx` dòng 4–31 (type props có `className?`, `variant` union, `cn(...)` theo variant, copy không nằm trong package — ở đây nội dung truyền qua `children`):
```tsx
variant === 'card' && 'rounded-container border border-danger bg-danger-subtle p-stack-lg',
```
Áp dụng: `InlineAlert({ children, className, variant = 'danger' })`: `if (children == null || children === '') return null;` `<div role="alert" className={cn('flex items-start gap-control-gap rounded-control border border-danger bg-danger-subtle p-stack-md text-body text-danger', className)}>` + `<Icon icon={CircleAlert} ... />` (decorative). Thêm vào `src/index.ts` và `exports.test.ts` (mảng `molecules`, dòng ~109).

---

### `DropdownMenuLinkItem` (`molecules/dropdown-menu.tsx`)

**Analog:** cùng file dòng 56–61:
```tsx
export type DropdownMenuItemProps = Omit<ComponentProps<typeof Menu.Item>, 'className'> &
  VariantProps<typeof menuItemVariants> & { className?: string };

export function DropdownMenuItem({ className, variant, ...props }: DropdownMenuItemProps) {
  return <Menu.Item {...props} className={menuItemVariants({ className, variant })} data-variant={variant ?? 'default'} />;
}
```
Thêm `DropdownMenuLinkItem` bọc `Menu.LinkItem` cùng `menuItemVariants`, nhận `render` (app truyền `<Link href=... />`). Không import `next/link` trong ui-web (bị chặn, self-test dòng 110). Thêm tên vào `exports.test.ts` dòng 60–73.

Lưu ý `DropdownMenuContent` dòng 41 cứng `align="start"`; UI-SPEC yêu cầu `align="end"` cho UserMenu → thêm prop `align?` (mặc định `'start'`) chuyển xuống `Menu.Positioner`. Mục disabled D-15 dùng `DropdownMenuItem disabled` (class `data-disabled:text-disabled` đã có dòng 12); test phải kiểm phím mũi tên tới được (UI-SPEC).

**Test:** theo `dropdown-menu.test.tsx` dòng 17–40 (component `ExampleMenu`, mở bằng Enter, `userEvent`).

---

### `apps/web/src/composition/session-cookies.ts` (config + helper, dùng chung proxy/server/client)

**Analog:** `apps/web/src/lib/feedback/error-messages.ts` dòng 1–14 (comment lý do đầu file, hằng export có JSDoc, nháy kép):
```typescript
/** D-04: câu chung, cố ý không có dấu chấm cuối. */
export const GENERIC_ERROR_MESSAGE = "Đã có lỗi xảy ra, vui lòng thử lại";
```
Áp dụng: `sessionCookieNames(secure: boolean)` → `{ access: "__Host-tripory_at" | "tripory_at", refresh, accessExp }`, `isSecureCookieEnv()` (`process.env.NODE_ENV === "production"`), `hasSessionCookie(cookies: { has(name: string): boolean })`. **Không** `import "server-only"`, không `next/headers` (proxy và client cùng import). Comment ghi lý do prefix `__Host-` và bỏ prefix ở dev (RESEARCH §Thiết kế cookie).

---

### `apps/web/src/composition/server/*.ts` + test (service thuần, request-response)

**Không có analog route handler.** Analog gần nhất về timeout + phân loại lỗi là `packages/api-client/src/fetch-http-client.ts` dòng 65–110:
```typescript
  const doFetch = deps.fetch;
  // ...
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs ?? deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      try {
        const response = await doFetch(buildUrl(deps.baseUrl, request), { ... signal: controller.signal });
        const text = await response.text();
        return parseResponse(response.status, text);
      } catch (error) {
        if (isApiError(error)) throw error;
        if (timedOut) throw clientError('timeout');
        // ...
        throw clientError('network');
      } finally {
        clearTimeout(timer);
      }
```
Áp dụng cho `upstream.ts` `callBackend(path, init, deps)`: cùng cơ chế `AbortController` + cờ `timedOut` + `clearTimeout` trong `finally`, timeout **28 000 ms**, `cache: "no-store"`, trả `{ kind: "response", status, body, contentType } | { kind: "timeout" } | { kind: "network" }` (không ném `ApiError`: route cần status + body nguyên để chuyển tiếp). Gọi `deps.fetch` như hàm trần (comment "Illegal invocation" dòng 66–67).

Phần còn lại lấy RESEARCH:
- `session-store.ts`: `writeSession`/`clearSession` nguyên Pattern 2 (`set(name, "", { ...base, maxAge: 0 })`, **không** `delete()`), `decodeJwtPayload` bằng `Buffer.from(part, "base64url").toString("utf8")`, `readSession(get, nowSec)` → `{ state: "none" | "invalid" | "stale" | "fresh", ... }` dùng `parseAccessTokenClaims` từ `@tripory/identity/http` (composition được import `/http`, `boundaries.mjs` dòng 171) và ngưỡng từ `@tripory/identity`.
- `request-guards.ts`: `checkSameOrigin` nguyên Pattern 8, helper `errorEnvelope(status, errorCode)` → `NextResponse.json({ status: "error", data: null, message: null, errorCode, timestamp }, { status, headers: { "cache-control": "no-store" } })`.
- `auth-handlers.ts`: `handleLogin/Register/Logout/Refresh/ChangePassword(request: NextRequest, deps)` theo Pattern 2–3 (thứ tự kiểm của refresh).
- `bff.ts`: `resolveBffTarget`, `forwardToBackend` nguyên Pattern 8.
- `env.ts`: Zod parse `API_ORIGIN`, `serverDeps()` = `{ env, fetch: globalThis.fetch.bind(globalThis), nowMs: () => Date.now(), secure }`.
- **Không** `import "server-only"` trong thư mục này (Pitfall 9).

**Test:** đầu file `// @vitest-environment node` (app mặc định jsdom, `apps/web/vitest.config.ts` dòng 1–11). Fake fetch theo `fetch-http-client.test.ts` dòng 13–36:
```typescript
type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];
const fixtureFetch = (f: BeFixture) => vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => responseOf(f));
/** Fetch không bao giờ trả lời, chỉ reject khi signal abort (giống fetch thật). */
const hangingFetch = () => vi.fn((_input, init?: RequestInit) => new Promise<Response>((_resolve, reject) => { /* ... */ }));
```
Ca timeout dùng `vi.useFakeTimers()` + `const settled = p.catch((e) => e)` trước `await vi.advanceTimersByTimeAsync(28_000)` (cùng file dòng 215–236), `afterEach(() => vi.useRealTimers())`. Ca bắt buộc: bảng "AUTH-01..AUTH-08" của RESEARCH §Validation Architecture (Set-Cookie đủ thuộc tính, body không có `accessToken`/`refreshToken`/`expiresAt`, refresh còn > 150 s gọi fetch 0 lần, 400 `Token.*` → xóa + 401, 5xx → giữ cookie + 503, BFF header không có `cookie`/`host`, response không có `set-cookie`, Origin lạ → 403).

---

### `apps/web/src/test/next-request.ts` (test helper, mới)

**Analog:** helper cục bộ trong `fetch-http-client.test.ts` dòng 13–49 (`urlOf`, `responseOf`, `rejection`). Đưa ra file dùng chung vì nhiều test dùng: `makeRequest(path, { method, origin, cookies, body, headers })` → `new NextRequest("https://app.test" + path, ...)` với header `cookie`; `setCookiesOf(res: NextResponse)` → `res.headers.getSetCookie()` parse thành map. File không có `.test.` nên lint app thường; không import `vitest` (để import được từ cả jsdom/node test).

---

### `apps/web/src/composition/viewer.server.ts` (server reader)

**Không có analog.** Lấy nguyên RESEARCH Pattern 1:
```tsx
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { readViewerFromCookie } from "./server/session-store";

export const getViewer = cache(async () => {
  const jar = await cookies();
  return readViewerFromCookie((name) => jar.get(name)?.value);
});
```
Kèm `getSessionState()` cho `DashboardSessionGate`. Đây là file duy nhất có `server-only` (tài liệu kiến trúc mục 9). Không test trực tiếp; test `readViewerFromCookie`/`readSession` ở `session-store.test.ts`.

---

### `apps/web/src/composition/http.client.ts` + test (composition, single-flight + lock)

**Analog:** `packages/api-client/src/with-session-refresh.ts` (closure `inFlight ??=`, dòng 62–75) và cách nối mà file này chờ (dòng 19–23: refresh không được đi qua client đã bọc):
```typescript
  const refreshOnce = (): Promise<RefreshOutcome> =>
    (inFlight ??= deps
      .lock(deps.lockName ?? DEFAULT_SESSION_LOCK_NAME, deps.refresh)
      .then((outcome) => { /* ... */ })
      .finally(() => {
        inFlight = null;
      }));
```
Code đầy đủ: RESEARCH Pattern 3 (`fallbackLock`, `lock` với `navigator.locks` + `AbortController` 40 s, `callRefreshRoute` dùng `authHttp` + `sessionRefresh: false`, `refreshSession`, `bffHttp = withSessionRefresh(...)`). Import `createFetchHttpClient`, `withSessionRefresh`, `DEFAULT_SESSION_LOCK_NAME` từ `@tripory/api-client/http` — đúng ca `ok` sẵn có ở `boundaries.test.ts` dòng 147 (`src/composition/http.client.ts`). Type `Lock`, `RefreshOutcome`, `isApiError` từ `@tripory/api-client`.

Để test được (state module-level là singleton có chủ đích): tách `makeBrowserHttp(deps: { fetch, locks?: LockManager, onExpired })` thuần, file export singleton `browserHttp = makeBrowserHttp({...globals})`. Ghi comment lý do singleton (một khóa/một inFlight cho cả tab).

**Test:** theo `with-session-refresh.test.ts` dòng 6–60 (`deferred<T>()`, fake lock `vi.fn((name, task) => task())`, `Promise.all` 5 request). Thêm fake `LockManager` xếp hàng theo tên (`request(name, opts, cb)` nối promise tail) để mô phỏng hai "tab" dùng chung lock + fake cookie jar. Ca fallback và hết 40 s dùng fake timers như `fetch-http-client.test.ts` dòng 215+.

---

### `apps/web/src/composition/{query-client,session-events.client,identity.client}.ts` + test (composition, pub-sub)

**Analog cho `query-client.ts`:** sketch đã ghi sẵn trong `apps/web/src/lib/feedback/mutation-feedback.ts` dòng 22–31:
```typescript
// Cách Phase 3 nối (không cài @tanstack/react-query và không mount provider ở Phase 2, D-01):
//   declare module "@tanstack/react-query" {
//     interface Register { mutationMeta: { feedback?: MutationFeedback } }
//   }
//   new MutationCache({
//     onSuccess: (_d, _v, _c, m) => { const d = decideMutationSuccess(m.meta?.feedback); if (d) notify[d.variant](d.message); },
//     onError: (e, _v, _c, m) => { const d = decideMutationError(e, m.meta?.feedback); if (d) notify[d.variant](d.message); },
//   });
// D-12: Phase 3 đặt `retry: false` cho QueryClient.
```
Code: RESEARCH Pattern 9 (`makeQueryClient()`). Kiểm chữ ký callback MutationCache 5.104 bằng typecheck (A6) — 5.x mới có thể có tham số `context` thứ 5; dùng tham số `mutation` theo đúng vị trí type yêu cầu. Xóa block comment sketch trong `mutation-feedback.ts` khi đã nối (hoặc đổi thành tham chiếu `composition/query-client.ts`). `notify` từ `@tripory/ui-web` (`toast.tsx` dòng 26–32), `decide*` từ `@/lib/feedback`.

**`session-events.client.ts`:** không có analog. RESEARCH Pattern 7: emitter thuần trong closure `makeSessionEvents({ channel?: BroadcastChannelLike })`, cờ chống lặp `expired`, `registerLogoutHandler(fn) → unsubscribe`, `runLogoutHandlers()` = `Promise.allSettled`. Không dùng React ở file này.

**`identity.client.ts`:** `export const identity = createIdentityHooks({ gateway: createHttpSessionGateway(authHttp), profile: createHttpProfileReader(bffHttp) });` — mẫu "composition import /http, /react và entry gốc" ở `boundaries.test.ts` dòng 144.

**Test:** `query-client.test.ts` spy `notify` bằng `vi.mock("@tripory/ui-web", ...)` theo `route-layouts.test.tsx` dòng 6–10; ca: `successMessage` → `notify.success`, mặc định lỗi → `notify.error`, `errorToast: false` → không gọi, `session_expired` → không gọi, `getDefaultOptions().queries.retry === false`. `session-events.test.ts` dùng fake BroadcastChannel (object `{ postMessage, onmessage, close }`).

---

### `apps/web/src/app/api/**/route.ts` (route, vỏ mỏng)

**Không có analog route handler.** Vỏ mỏng như mọi page Phase 1 (`(dashboard)/itineraries/mine/page.tsx` dòng 1–5: import một thứ, return một dòng). Lấy nguyên RESEARCH Pattern 2:
```ts
import type { NextRequest } from "next/server";
import { handleLogin } from "@/composition/server/auth-handlers";
import { serverDeps } from "@/composition/server/env";

export function POST(request: NextRequest) {
  return handleLogin(request, serverDeps());
}
```
- `change-password/route.ts` export `PUT`; `bff/[...path]/route.ts` export `GET`, `POST`, `PUT`, `DELETE` cùng một hàm, đọc `params` bằng `await ctx.params` (Next 16 async; docs `route.md`).
- Không `export const dynamic/runtime` (RESEARCH §Deprecated với Cache Components).
- Không test file route (logic test ở `composition/server`).

---

### `apps/web/src/proxy.ts` + `proxy.test.ts` + `proxy-coverage.test.ts` (middleware)

**Không có analog.** Code: RESEARCH Pattern 5 (`PROTECTED_PREFIXES`, `AUTH_PAGES`, `config.matcher` hằng số, lọc `_rsc` khi dựng `next` theo Pitfall 8). Import `toSafeNextPath` từ `@tripory/identity` (entry gốc, được phép ngoài composition) và `hasSessionCookie` từ `@/composition/session-cookies`.

**Test `proxy.test.ts`:** `// @vitest-environment node`, `new NextRequest(...)` qua helper `src/test/next-request.ts`, kiểm `res.status === 307` và `res.headers.get("location")`; ca theo bảng AUTH-05 của RESEARCH.

**Test `proxy-coverage.test.ts`:** analog đọc file system là `apps/web/src/app/layout.test.tsx` dòng 1–7:
```typescript
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
```
Áp dụng: `readdirSync(path.join(appDir, "(dashboard)"), { recursive: true })` lọc `page.tsx`, đổi thành URL (bỏ `(group)`, `[id]` → `x`), `expect(PROTECTED_PREFIXES.some(...)).toBe(true)` cho từng URL bằng `it.each`. `node:*` hợp lệ ở app (lint `app()` không có allowlist).

---

### `apps/web/src/app/layout.tsx` (sửa) + `providers.tsx` (mới) + `layout.test.tsx` (sửa)

**Analog:** chính `layout.tsx` dòng 1–21. Sửa `metadata.title` thành `{ default: "Tripory", template: "%s · Tripory" }` (UI-SPEC) và bọc children:
```tsx
      <body className="min-h-full font-sans"><Providers>{children}</Providers></body>
```
`providers.tsx`: `"use client"` (như `(dashboard)/error.tsx` dòng 1), `const [queryClient] = useState(() => makeQueryClient());`, render `<QueryClientProvider client={queryClient}>{children}<SessionEffects /><SessionKeeper /></QueryClientProvider><Toast />`. `SessionEffects` dùng `usePathname`/`useSearchParams` → phải nằm trong `<Suspense fallback={null}>` (Cache Components). Không đọc `cookies()` ở root layout (Anti-Patterns).

**`layout.test.tsx`** dòng 9–16 kiểm chuỗi nguồn `'title: "Tripory"'` → **sẽ đỏ**; cập nhật thành kiểm `default: "Tripory"` và `template: "%s · Tripory"`, thêm `toContain("<Providers>")`.

---

### `apps/web/src/app/(dashboard)/layout.tsx`, `(public)/{login,register}/page.tsx`, `(dashboard)/settings/password/page.tsx`

**Analog layout:** `(dashboard)/layout.tsx` dòng 1–6:
```tsx
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell variant="dashboard">{children}</AppShell>;
}
```
Áp dụng RESEARCH Pattern 5 bước 2: `<AppShell variant="dashboard"><Suspense fallback={<Loading />}><DashboardSessionGate>{children}</DashboardSessionGate></Suspense></AppShell>`, `Loading` import từ `./loading` (`(dashboard)/loading.tsx` dòng 1–14 là skeleton UI-SPEC yêu cầu dùng lại). `DashboardSessionGate` (server, async) đặt ở `modules/identity/ui/dashboard-session-gate.tsx`; quyết định tách thành hàm thuần `decideDashboardGate(state)` để test.

**`route-layouts.test.tsx`** dòng 6–19 render `DashboardLayout` đồng bộ với mock AppShell → layout mới có async gate trong Suspense: mock thêm `@/modules/identity/ui/dashboard-session-gate` thành `({ children }) => children` để test giữ nguyên.

**Analog page:** `(dashboard)/itineraries/mine/page.tsx` dòng 1–5 (một component, import từ `@tripory/ui-web`). Page mới:
```tsx
import type { Metadata } from "next";
import { LoginForm } from "@/modules/identity/ui/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>; // LoginForm dùng useSearchParams
}
```
Page test theo `(dashboard)/itineraries/mine/page.test.tsx` (render + kiểm heading).

---

### `apps/web/src/components/{app-header,app-shell,user-menu}.tsx` (sửa) + test

**Analog:** chính chúng. `app-header.tsx` dòng 7–24 là client, `<UserMenu />` ở dòng 20 → đổi thành prop `account: ReactNode`; `app-shell.tsx` dòng 21 (server) truyền `account={<Suspense fallback={<Skeleton aria-hidden className="size-control-sm" variant="circle" />}><AccountSlot /></Suspense>}` (Skeleton `circle` mặc định `size-control-md`, `skeleton.tsx` dòng 8 → ghi đè `size-control-sm` = 32px cỡ `Avatar sm`). `AccountSlot` async server: `getViewer()` → `<UserMenu viewer={viewer} />` hoặc `<GuestLoginButton />`.

**`user-menu.tsx`** dòng 1–10 thay toàn bộ: `"use client"`, nhận `viewer: Viewer`, dùng `DropdownMenu*`, `Avatar` (`name={viewerDisplayName(viewer)}`, `src` từ `useMyProfile` hoặc `undefined`), `Badge` "Sắp có", `DropdownMenuLinkItem render={<Link href=... />}`. Trigger ghi đè class ghost `border-transparent` qua `className` (`DropdownMenuTrigger` dòng 26–36 nhận `className`, `cn` merge).

**Test:** `app-header.test.tsx` dòng 5–11 là mẫu mock `next/navigation`:
```typescript
const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn<() => string>() }));
vi.mock("next/navigation", () => ({ usePathname }));
```
Thêm `useRouter`, `useSearchParams` vào cùng mock khi cần. `user-menu.test.tsx` dòng 5–14 (kiểm "không có button/menu/link") **phải viết lại** theo UI-SPEC Testing Contract. `app-header.test.tsx` dòng 13–23 kiểm `getAllByRole("link")` có đúng 1 và không có button → cập nhật vì header nhận slot `account` (test truyền `account={null}` để giữ ca cũ). `app-shell.test.tsx` cần mock `AccountSlot`/`viewer.server` (`server-only` không chạy trong jsdom).

---

### `apps/web/src/modules/identity/ui/*.tsx` + test (organism client)

**Không có analog form.** Thư mục `modules/` chưa có; đường dẫn đã được self-test dự kiến (`boundaries.test.ts` dòng 120, 145). Khung LoginForm: RESEARCH §Code Examples "Form đăng nhập (khung)". Component ui-web dùng: `Card padding="lg"` (`card.tsx` dòng 37–56), `FormField`/`FormFieldLabel`/`FormFieldDescription`/`FormFieldError` (`form-field.tsx` dòng 18–37 — `FormFieldError` đã có `aria-live="polite" role="status"`), `Input size="lg"`, `PasswordInput`, `InlineAlert`, `Button loading loadingLabel`.

Lưu ý `FormField` là `Field.Root` của Base UI: `Field.Error` chỉ hiện khi Base UI coi field invalid. Với RHF, truyền `invalid={!!errors.x}` cho `FormField` (prop của `Field.Root`) và luôn render `FormFieldError` khi có message; executor xác minh bằng test (không có analog dùng FormField + lỗi ngoài trong repo).

Analog state client: `search-input.tsx` dòng 36–48 (`useState`, handler nội bộ, `ref.focus()`).

- `session-recovery.tsx`: RESEARCH Pattern 6; hiển thị `(dashboard)/loading.tsx` (import default `Loading`) và `ErrorState variant="page" onRetry` như `(dashboard)/error.tsx` dòng 11–13.
- `submit-status.tsx`: `<p aria-live="polite" className="text-label text-muted text-center">` luôn có trong DOM; `useEffect` + `setTimeout(5_000)` khi `pending`, `clearTimeout` khi xong.
- `password-checklist.tsx`: nhận `{ id, label, met }[]`; icon `Circle`/`CircleCheck` qua `Icon`, tiền tố `<span className="sr-only">Đã đạt: </span>`.
- `session-keeper.tsx`, `session-effects.tsx`, `login-redirect.tsx`, `guest-login-button.tsx`, `dashboard-session-gate.tsx`: RESEARCH Pattern 4–7, UI-SPEC §UserMenu (nút khách `Button variant="secondary" size="md" render={<Link ... />}`).

**Test:** analog `ui-web/molecules/error-state.test.tsx` (`userEvent.setup()`, `vi.fn()`, `toHaveBeenCalledTimes(1)`) và `app-header.test.tsx` (mock `next/navigation`). Fake `HttpClient`/gateway tiêm qua `vi.mock("@/composition/identity.client", ...)` — không MSW. Cold start dùng `vi.useFakeTimers({ shouldAdvanceTime: true })` để `userEvent` không treo (repo chưa có ca userEvent + fake timers; tạo `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`). Bọc render trong `QueryClientProvider` với `makeQueryClient()`.

---

### `apps/web/src/modules/identity/ui/{form-schemas,form-error-mapping}.ts` + test (utility, transform)

**Analog:** `apps/web/src/lib/feedback/resolve-form-error.ts` dòng 1–32 (comment đầu file giải thích D-05/D-05a, type `Readonly` kết quả, nhánh `fieldErrors` rồi fallback `selectErrorMessage`):
```typescript
export type FormErrorResolution = Readonly<{
  fieldErrors: Readonly<Record<string, string>>;
  toastMessage: string | null;
}>;

export function resolveFormError(error: unknown, fieldNames: readonly string[]): FormErrorResolution {
  if (isApiError(error) && error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
```
Áp dụng: `mapLoginError`, `mapRegisterError`, `mapChangePasswordError(error) → { field: F; message: string } | { alert: string } | null` (`null` khi `session_expired` hoặc `aborted`). Bảng theo RESEARCH §errorCode (map **theo form**, dùng `Map` như `error-messages.ts` dòng 6–7, 16). Nội dung ô = `ERROR_MESSAGES.get(code) ?? error.message ?? GENERIC_ERROR_MESSAGE`; nhánh `fieldErrors` gọi lại `resolveFormError(error, FIELDS)`, không viết lại.

`form-schemas.ts`: Zod schema + copy UI-SPEC §Lỗi validate client; mật khẩu dùng `evaluatePasswordRules` từ `@tripory/identity` để checklist và schema không lệch; email `z.string().trim()` + kiểm dạng chuẩn (D-33, **không** chép regex BE), không trim mật khẩu; họ tên kiểm độ dài trên giá trị thô.

**Test:** theo `lib/feedback/resolve-form-error.test.ts` / `select-error-message.test.ts` (nháy kép, `it.each([...] as const)`); `ApiError` dựng bằng `makeApiError` từ `@tripory/api-client`.

---

### `apps/web/src/lib/feedback/error-messages.ts` (thêm hằng)

**Analog:** chính file dòng 10–14. Thêm:
```typescript
/** D-20: toast hết phiên, khác dấu câu với SESSION_EXPIRED_MESSAGE (bảng map) có chủ đích. */
export const SESSION_EXPIRED_TOAST = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại";
```
Giữ nguyên `SESSION_EXPIRED_MESSAGE` và bảng (Pitfall 12). Toast thành công khác (D-07, D-18) đặt cạnh form ở `modules/identity/ui` (copy nghiệp vụ, không phải lỗi).

## Shared Patterns

### Ranh giới import
**Source:** `packages/config/eslint/boundaries.mjs` dòng 117–125 (`contextPackage`) và 169–172 (`app`).
**Apply to:** mọi file `packages/identity/src/**` và `apps/web/src/**`.
```js
export const contextPackage = () => [
  ...base,
  ...zone('src/domain', { allowed: [KERNEL], layers: ['application', 'infrastructure', 'react'], pure: true }),
  ...zone('src/application', { allowed: [KERNEL], layers: ['infrastructure', 'react'], pure: true }),
  ...zone('src/infrastructure', { allowed: [KERNEL, API_CLIENT, 'zod'], layers: ['react'] }),
  ...zone('src/react', { allowed: [KERNEL, 'react', '@tanstack/react-query'], layers: ['infrastructure'] }),
  { files: ['src/index.ts'], rules: rulesFor({ allowed: [KERNEL], layers: ['infrastructure', 'react'], pure: true }) },
];
```
Hệ quả: domain không `zod`, không `Date.now` (đồng hồ truyền vào), không `navigator`/`window` ở mọi tầng; `/http` của `identity` và `api-client` chỉ ở `apps/web/src/composition/**`. `proxy.ts`, `app/api/**/route.ts`, `modules/**` import `@/composition/*` và entry gốc `@tripory/identity`, không import `/http`.

### Composition root + DI
**Source:** `ai-memories/tripory-fe--ddd-architecture.md` mục 6; `withSessionRefresh(inner, deps)` (`with-session-refresh.ts` dòng 18–41).
**Apply to:** `createHttpSessionGateway(http)`, `createIdentityHooks(deps)`, `makeBrowserHttp(deps)`, `makeSessionEvents(deps)`, `handleX(request, deps)`, `forwardToBackend(request, segments, deps)`. Global (`fetch`, `navigator.locks`, `BroadcastChannel`, `Date.now`) chỉ được đọc ở chỗ lắp singleton/`serverDeps()`.

### Một đường refresh
**Source:** `with-session-refresh.ts` dòng 19–23, 62–75; RESEARCH Pattern 3, Pitfall 3.
**Apply to:** `SessionKeeper`, `SessionRecovery`, `bffHttp`. Mọi lời gọi `/api/auth/refresh` đi qua `refreshSession()` hoặc `withSessionRefresh` (cùng `lock`). Chuỗi `"/refresh"` chỉ xuất hiện ở `composition/http.client.ts`.

### Lỗi và toast
**Source:** `apps/web/src/lib/feedback/{select-error-message,resolve-form-error,mutation-feedback}.ts`; `ui-web/molecules/toast.tsx` dòng 26–32.
**Apply to:** mọi mutation (qua `MutationCache`), ba form (`errorToast: false`, map tại form), `SessionEffects` (`notify.info(SESSION_EXPIRED_TOAST)`). `session_expired` không hiện ở form và không toast lỗi (`mutation-feedback.ts` dòng 16–17).

### Envelope response của route FE
**Source:** `api-client/src/fetch-http-client.ts` dòng 51–59 (`parseResponse` chỉ bóc `status: 'success'` envelope, lỗi qua `toApiError`).
**Apply to:** mọi `/api/auth/*` và lỗi BFF do FE sinh. Trả envelope `{ status, data, message: null, errorCode, timestamp }` để `createFetchHttpClient` phía browser bóc như BE; 204/không body thì `data: null` (body rỗng 2xx cũng hợp lệ, dòng 54). Luôn `cache-control: no-store`.

### Test
**Source:** `packages/config/vitest/preset.mjs` (node), `ui-preset.mjs` (jsdom), `apps/web/vitest.config.ts` dòng 1–11, `apps/web/src/test/setup.ts`.
**Apply to:** package `identity` dùng preset node (hook không test ở package). App mặc định jsdom; file test route/proxy/BFF/session-store đặt `// @vitest-environment node` dòng đầu. Fake fetch/lock/deferred theo `fetch-http-client.test.ts` dòng 13–49 và `with-session-refresh.test.ts` dòng 6–50. Không MSW.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/web/src/composition/server/{auth-handlers,bff,session-store,request-guards}.ts` | service | request-response | Chưa có Route Handler/`NextResponse.cookies` nào. Dùng RESEARCH Pattern 2, 3, 8; chỉ mượn cơ chế timeout của `fetch-http-client.ts` |
| `apps/web/src/proxy.ts` | middleware | request-response | Chưa có proxy/middleware. Dùng RESEARCH Pattern 5 + docs `proxy.md` |
| `apps/web/src/composition/viewer.server.ts` | server reader | request-response | Chưa có `cookies()`/`server-only`. Dùng RESEARCH Pattern 1 |
| `apps/web/src/composition/session-events.client.ts` | event bus | pub-sub | Chưa có `BroadcastChannel`/emitter. Dùng RESEARCH Pattern 7 |
| `packages/identity/src/react/index.ts` | hook factory | request-response | `itinerary/react` rỗng, chưa có React Query. Dùng RESEARCH Pattern 9 + tài liệu kiến trúc mục 6 |
| `apps/web/src/modules/identity/ui/{login,register,change-password}-form.tsx` | form | request-response | Chưa có form/RHF. Dùng RESEARCH §Code Examples "Form đăng nhập" + UI-SPEC Interaction Contract |

## Metadata

**Analog search scope:** `packages/{api-client,shared-kernel,itinerary,ui-web,design-tokens,config}`, `apps/web/src/{app,components,lib,test}`, `apps/web/{package.json,vitest.config.ts,eslint.config.mjs,next.config.ts}`, `pnpm-workspace.yaml`, `ai-memories/tripory-fe--ddd-architecture.md`, `02-PATTERNS.md`
**Files scanned:** 48
**Pattern extraction date:** 2026-10-13

## PATTERN MAPPING COMPLETE
