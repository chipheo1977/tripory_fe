# Phase 2: HTTP & Shared Kernel - Pattern Map

**Mapped:** 2026-10-12
**Files analyzed:** 33 file mới/sửa, gom thành 20 nhóm (file nguồn và test đi cặp đếm chung một nhóm)
**Analogs found:** 15 / 20 nhóm. 5 nhóm còn lại (`fetch-http-client`, `with-session-refresh`, type guard của body BE, branded id, bảng map errorCode) không có analog về logic, chỉ có analog về style. Phần logic lấy từ RESEARCH.md Pattern 1–4 và Code Examples.

Repo sau Phase 1 có `packages/config` (preset + self-test), `ui-web` và `design-tokens` đầy đủ, `apps/web` có route và test. `api-client` và `shared-kernel` vẫn là khung rỗng (`export {}`). **Repo chưa có code TS thuần không UI nào gọi I/O, chưa có test dùng fake timers, `expectTypeOf` hay fake dependency tiêm qua `deps`.** Analog gần nhất cho hàm thuần + test thuần là `packages/ui-web/src/molecules/sheet-snap.ts` và test của nó. Analog cho closure giữ state cục bộ (`isRefreshing`, hàng đợi) là FE cũ `tripory/src/services/api/apiClient.ts`, nhưng chỉ dùng làm **phản mẫu** (xem cuối mục `with-session-refresh.ts`).

Quy ước style theo vùng, giữ nguyên khi thêm file:
- `packages/*`: nháy đơn, có `;`, comment tiếng Việt giải thích *lý do* (xem `boundaries.mjs`, `preset.mjs`). Tên test tiếng Việt (`sheet-snap.test.ts`, `toast.test.tsx`).
- `apps/web/src/**` (code app): nháy kép, có `;` (`user-menu.tsx`, `error.test.tsx`). Riêng file config/setup (`vitest.config.ts`, `src/test/setup.ts`) đang dùng nháy đơn. File mới trong `src/lib/feedback/` theo **nháy kép** như code app.
- Không class (ngoại lệ duy nhất `DomainError extends Error`, `ai-memories/tripory-fe--ddd-architecture.md` mục 1). `ApiError` là plain object, phải ghi lý do trong comment (RESEARCH Pattern 1).

## File Classification

| File mới/sửa | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/shared-kernel/src/ids.ts` (mới) | model (branded type + parser) | transform | `packages/ui-web/src/molecules/sheet-snap.ts` (hàm thuần export tên) | partial |
| `packages/shared-kernel/src/ids.test.ts` (mới) | test | transform | `packages/ui-web/src/molecules/sheet-snap.test.ts` | role-match |
| `packages/shared-kernel/src/geo.ts` (mới) | model (value object) | transform | `sheet-snap.ts` + `packages/design-tokens/src/index.ts` (`as const`) | partial |
| `packages/shared-kernel/src/geo.test.ts` (mới) | test | transform | `sheet-snap.test.ts` (`it.each` bảng biên) | role-match |
| `packages/shared-kernel/src/index.ts` (thay `export {}`) | barrel | — | `packages/itinerary/src/index.ts`, `packages/ui-web/src/index.ts` | exact |
| `packages/shared-kernel/package.json` (bỏ `--passWithNoTests`) | config | — | `packages/ui-web/package.json` (`"test": "vitest run"`) | exact |
| `packages/api-client/src/http-client.ts` (mới, chỉ type) | port | request-response | — | none (RESEARCH §Recommended Project Structure) |
| `packages/api-client/src/api-error.ts` + `.test.ts` (mới) | model (error) | transform | `sheet-snap.ts` (hàm thuần), FE cũ `apiClient.ts` dòng 14–19 (hình dạng cũ) | partial |
| `packages/api-client/src/response-shapes.ts` (mới) | utility (type guard) | transform | — | none |
| `packages/api-client/src/to-api-error.ts` + `.test.ts` (mới) | utility | transform | FE cũ `apiClient.ts` dòng 163–190 (logic chuẩn hóa cũ, phản mẫu) | partial |
| `packages/api-client/src/fixtures/be-responses.ts` (mới) | test fixture | — | `packages/config/test/boundaries.test.ts` dòng 54–136 (mảng case khai báo tĩnh) | partial |
| `packages/api-client/src/fetch-http-client.ts` + `.test.ts` (mới) | service (adapter) | request-response | — | none (RESEARCH Pattern 3) |
| `packages/api-client/src/with-session-refresh.ts` + `.test.ts` (mới) | middleware (decorator) | request-response + single-flight | FE cũ `apiClient.ts` dòng 22–35, 115–160 (phản mẫu) | partial |
| `packages/api-client/src/index.ts` (thay `export {}`) | barrel (UI-safe) | — | `packages/itinerary/src/index.ts` | exact |
| `packages/api-client/src/http.ts` (mới) | barrel (chỉ composition) | — | `packages/itinerary/package.json` `"./http"` | exact |
| `packages/api-client/src/exports.test.ts` (mới, khuyến nghị) | test | — | `packages/ui-web/src/exports.test.ts` | exact |
| `packages/api-client/package.json` (thêm `./http`, bỏ `--passWithNoTests`) | config | — | `packages/itinerary/package.json` | exact |
| `apps/web/src/lib/feedback/error-messages.ts` (mới) | config (bảng copy) | — | `packages/design-tokens/src/index.ts` (hằng `as const`) | partial |
| `apps/web/src/lib/feedback/{select-error-message,resolve-form-error,mutation-feedback}.ts` + `.test.ts` (mới) | utility (presentation policy) | transform | `sheet-snap.ts` + test; `ErrorState`/`notify` là đích hiển thị | role-match |
| `apps/web/package.json` (thêm `@tripory/api-client`), `pnpm-lock.yaml` (sinh lại) | config | — | chính nó (`@tripory/ui-web: workspace:*`) | exact |
| `packages/config/test/boundaries.test.ts` (thêm case, không sửa rule) | test | batch | chính nó | exact |

Không cần sửa: `packages/config/eslint/boundaries.mjs` (rule hiện có đã đủ, xem Shared Patterns), `turbo.json` (`test`/`lint`/`typecheck` đã `dependsOn: ["transit"]`, graph tự cập nhật theo dependency workspace mới), `packages/*/tsconfig.json`, `packages/*/vitest.config.ts`, `apps/web/vitest.config.ts`, `apps/web/eslint.config.mjs`, `pnpm-workspace.yaml` (không thêm catalog).

## Pattern Assignments

### `packages/shared-kernel/src/ids.ts`, `geo.ts`, `index.ts` (model, transform)

**Analog style:** `packages/ui-web/src/molecules/sheet-snap.ts` (dòng 1–20): type export trước, hàm thuần export tên, không default export, không class.
```typescript
export type SheetSnapDirection = 'expand' | 'collapse';

export const resolveSnapPoints = (viewportHeight: number) =>
  [ /* ... */ ] as const;

export function stepSnapPoint<T>(points: readonly T[], current: T, direction: SheetSnapDirection): T {
  // ...
  return points[nextIndex] ?? current;
}
```

**Logic:** lấy nguyên RESEARCH §shared-kernel (`Brand`, `UserId`, `ItineraryId`, `isGuid`, `parseUserId`, `parseItineraryId`, `Wgs84Coordinate`, `createWgs84Coordinate`). Hàm trả `null` khi không hợp lệ, không ném lỗi.

**Ràng buộc lint (`kernelPackage()` = `zone('src', { allowed: [], pure: true })`, `boundaries.mjs` dòng 128):** không import package nào, cấm `fetch`, `Date.now`, `new Date()`, `Math.random`, browser global. `Object.freeze`, `Number.isFinite`, regex đều hợp lệ. Không dùng `crypto.randomUUID`.

**Barrel `index.ts`:** theo `packages/itinerary/src/index.ts`:
```typescript
export * from './ids';
export * from './geo';
```

**`package.json` dòng 12:** `"test": "vitest run --passWithNoTests"` → `"test": "vitest run"` (giống `packages/ui-web/package.json` dòng 14). Không thêm dependency.

---

### `packages/shared-kernel/src/ids.test.ts`, `geo.test.ts` (test, transform)

**Analog:** `packages/ui-web/src/molecules/sheet-snap.test.ts` (dòng 1–34). Import `vitest` rồi file cùng thư mục, `describe` tiếng Việt, `it.each` với tuple `as const` cho bảng biên:
```typescript
import { describe, expect, it } from 'vitest';
import { resolveSnapPoints, stepSnapPoint } from './sheet-snap';

describe('Sheet snap adapter', () => {
  it.each([
    [400, ['160px', 0.6, 0.92]],
    [1000, ['250px', 0.6, 0.92]],
  ] as const)('resolve viewport %ipx thành snap point Base UI hợp lệ', (viewportHeight, expected) => {
    expect(resolveSnapPoints(viewportHeight)).toEqual(expected);
  });
});
```
Áp dụng: `it.each` cho biên `±90`/`±180` hợp lệ, `90.0001`, `NaN`, `Infinity` → `null`; GUID chữ hoa → chữ thường.

**Chưa có analog:** `expectTypeOf` (chưa file nào dùng). Import từ `vitest` cùng dòng với `describe/expect/it`; allowlist test của kernel là `['vitest']` (`boundaries.mjs` dòng 107–114) nên hợp lệ. Ca "không gán chéo" viết bằng `expectTypeOf<UserId>().not.toEqualTypeOf<ItineraryId>()` và `// @ts-expect-error` cho phép gán chuỗi trần. `pnpm typecheck` là nơi bắt `@ts-expect-error` thừa.

Môi trường: preset node (`packages/config/vitest/preset.mjs`), không cần sửa `vitest.config.ts`.

---

### `packages/api-client/src/api-error.ts` + `api-error.test.ts` (model, transform)

**Hình dạng cũ cần thay** (FE cũ `tripory/src/services/api/apiClient.ts` dòng 14–19):
```typescript
export interface ApiError {
  errorCode: string;
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}
```
Thay bằng RESEARCH Pattern 1: `type` readonly có `type: 'ApiError'`, `kind`, `status: number | null`, `code: string | null`, `message: string | null`, `fieldErrors?`. Thêm `makeApiError(fields)`, `isApiError(value)`, `SESSION_EXPIRED`, `sessionExpiredError()`. Khác FE cũ ở ba điểm: `message` được phép `null` (không nhét câu mặc định vào tầng HTTP), không có câu tiếng Việt trong `api-client` (copy thuộc app, D-03), không lưu raw body/header.

Style hàm thuần theo `sheet-snap.ts`. Test theo `sheet-snap.test.ts`: `isApiError` đúng với kết quả `makeApiError`, sai với `new Error()`, `null`, object thiếu `kind`, object `{ type: 'ApiError' }` không có `kind`.

---

### `packages/api-client/src/response-shapes.ts`, `to-api-error.ts` + `to-api-error.test.ts`, `fixtures/be-responses.ts` (utility, transform)

**Logic chuẩn hóa cũ (phản mẫu, FE cũ `apiClient.ts` dòng 163–190):**
```typescript
let message = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
let errorCode = 'General.Error';
if (errorData) {
  if (errorData.message) message = errorData.message;
  if (errorData.errorCode) errorCode = errorData.errorCode;
  if (errorData.errors && typeof errorData.errors === 'object') {
    errors = errorData.errors;
    const firstErrorKey = Object.keys(errorData.errors)[0];
    if (firstErrorKey && errorData.errors[firstErrorKey]?.length > 0) {
      message = errorData.errors[firstErrorKey][0];   // đưa message tiếng Anh của ProblemDetails ra người dùng
    }
  }
}
```
Giữ ý tưởng "một hàm nhận body, ra một dạng lỗi". Bỏ: đọc thuộc tính trên `any` không kiểm kiểu, câu mặc định trong tầng HTTP, lấy `errors[0]` làm `message` (vi phạm D-05a). Thay bằng RESEARCH Pattern 2: `isApiEnvelope` (khóa phân biệt là `status` **chuỗi** `"success"|"error"` so với `status` **số** của ProblemDetails), `isValidationProblemDetails`, `isProblemDetails`, `isRecord`, `toApiError(status, body)`, `normalizeFieldKey`.

**Fixture:** không có analog fixture. Khai báo như mảng case tĩnh của `packages/config/test/boundaries.test.ts` dòng 54–136 (object literal có `name`, dữ liệu, kỳ vọng), nhưng đặt trong file thường `src/fixtures/be-responses.ts`, export `const` có tên theo dạng lỗi (`envelopeNotFound`, `envelopeServerError`, `envelopeFluentValidation`, `validationProblemPascal`, `validationProblemJsonPath`, `validationProblemBodyBroken`, `problemDetails415`, `htmlBadGateway`, `envelopeSuccess`, `refreshSuccess`). Body lấy đúng chuỗi trong RESEARCH §"Hình dạng lỗi BE". File này **không import `vitest`**: nó là source file nên allowlist là `[KERNEL]` (`boundaries.mjs` dòng 131), và nó không được export từ `index.ts`/`http.ts`.

**Test:** `it.each` một dòng cho mỗi dạng, mẫu `boundaries.test.ts` dòng 139–147 (`it.each(bad)('$name', ...)` với mảng object có `name`):
```typescript
describe('lớp cưỡng chế bắt vi phạm', () => {
  it.each(bad)('$name', async ({ dir, file, code, violations }) => {
    // ...
  });
});
```

---

### `packages/api-client/src/http-client.ts`, `fetch-http-client.ts` + `.test.ts` (service, request-response)

**Không có analog logic.** Dùng RESEARCH Pattern 3 (timeout bằng `AbortController` + `setTimeout`, cờ `timedOut`, `clearTimeout` trong `finally` sau `response.text()`, `doFetch = deps.fetch` gọi như hàm trần).

**So với FE cũ** (`apiClient.ts` dòng 40–46): axios instance có `baseURL`, `timeout: 15000`, header cố định. Bản mới nhận `baseUrl`, `fetch`, `timeoutMs = 30_000` (D-11), `getHeaders?` qua `deps`, không đọc `localStorage` (dòng 49–55 cũ bị `no-restricted-globals` cấm, `boundaries.mjs` dòng 71–82). Factory theo dạng `makeX(deps)` của tài liệu kiến trúc mục 6: `createFetchHttpClient(deps): HttpClient`.

**Ràng buộc lint (`httpPackage()`, `boundaries.mjs` dòng 131):** chỉ import tương đối và `@tripory/shared-kernel`. `fetch`, `AbortController`, `setTimeout`, `URLSearchParams`, `Response` không bị cấm. Cấm `import()` động.

**Test:** chưa có test dùng fake timers trong repo. Mẫu tối thiểu theo cấu trúc file test hiện có (`toast.test.tsx` dòng 1–10: import `vitest` gồm `afterEach`, dọn trong `afterEach`):
```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
});
```
Fake fetch là `vi.fn(async (url, init) => new Response(body, { status, headers }))`; ca timeout cho fake fetch lắng nghe `init.signal` rồi reject, test gọi `await vi.advanceTimersByTimeAsync(30_000)` (RESEARCH Pitfall 6). Test của `api-client` chỉ được import `vitest`, `@tripory/shared-kernel` và file tương đối (`zone()` dòng 107–114, testAllowed mặc định `['vitest']`), **không có `node:*`**.

---

### `packages/api-client/src/with-session-refresh.ts` + `.test.ts` (middleware, single-flight)

**Phản mẫu từ FE cũ** (`apiClient.ts` dòng 22–35 và 115–160): state module-level `isRefreshing` + `failedQueue`, request trong hàng đợi không đặt `_retry`, `window.dispatchEvent` và `localStorage.removeItem` ngay trong client, mọi lỗi refresh đều thành `Token.Expired`.
```typescript
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (reason: any) => void }> = [];
// ...
if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
  if (isRefreshing) {
    return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
      .then((newToken) => apiClient(originalRequest));   // không đặt _retry → vòng lặp (Pitfall 3)
  }
  // ...
  } catch (refreshErr) {
    processQueue(refreshErr, null);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);  // bị lint cấm trong package
    window.dispatchEvent(new CustomEvent('tripory:auth:expired'));
```
Giữ ý tưởng: gộp request chờ vào một lượt refresh, endpoint auth không đi vào nhánh refresh (`isAuthEndpoint` → cờ `sessionRefresh: false` trên request). Thay bằng RESEARCH Pattern 4: state nằm trong closure của `withSessionRefresh(inner, deps)` (không module-level), `inFlight ??= deps.lock(...)`, bộ đếm `epoch`, phát lại đúng một lần, `RefreshOutcome = 'refreshed' | 'expired'`, `onSessionExpired` tiêm vào và chỉ gọi khi `'expired'` (D-14, D-14a).

**Test:** fake `HttpClient` và fake `Lock` bằng `vi.fn`, cùng kiểu `const onRetry = vi.fn();` rồi `expect(onRetry).toHaveBeenCalledTimes(1)` ở `packages/ui-web/src/molecules/error-state.test.tsx` dòng 16–22:
```typescript
it('click Thử lại gọi onRetry đúng một lần', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  render(<ErrorState onRetry={onRetry} />);
  await user.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
```
Áp dụng cho `refresh`, `lock`, `onSessionExpired`, `inner.send`. Fake lock: `vi.fn((name, task) => task())`. Ca "A chậm, B..N nhanh" cần promise điều khiển tay (deferred) để giữ 401 của A sau khi lượt refresh xong; repo chưa có helper này, viết cục bộ trong file test.

---

### `packages/api-client/src/index.ts`, `http.ts`, `package.json`, `exports.test.ts` (barrel, config)

**Analog:** `packages/itinerary/package.json` dòng 6–10, entry gốc và subpath `/http`:
```json
"exports": {
  ".": "./src/index.ts",
  "./http": "./src/infrastructure/index.ts",
  "./react": "./src/react/index.ts"
},
```
Áp dụng:
```json
"exports": {
  ".": "./src/index.ts",
  "./http": "./src/http.ts"
},
```
- `index.ts`: type `HttpClient`, `HttpRequest`, `HttpMethod`, `ApiError`, `ApiErrorKind`, `FieldErrors`, `Lock`, `RefreshOutcome` và helper thuần `isApiError`, `SESSION_EXPIRED`. UI và `apps/web/src/lib/feedback` import từ đây.
- `http.ts`: `createFetchHttpClient`, `withSessionRefresh`. Chỉ `apps/web/src/composition/**` được import (rule `httpOnlyInComposition` khớp glob `@tripory/*/http`, `boundaries.mjs` dòng 52–55). `toApiError` có thể để nội bộ hoặc export từ `index.ts`; planner chọn và ghi rõ.
- `"test": "vitest run --passWithNoTests"` → `"vitest run"`. `dependencies` giữ nguyên `@tripory/shared-kernel`.

**`exports.test.ts` (khuyến nghị):** theo `packages/ui-web/src/exports.test.ts` dòng 105–115, import `* as` rồi kiểm tên bằng `in`:
```typescript
import * as publicUi from './index';
const hasEveryExport = (names: readonly string[]) => names.filter((name) => !(name in publicUi));

it('export Sheet snap adapter và feedback helpers', () => {
  expect(hasEveryExport(['resolveSnapPoints', 'stepSnapPoint', 'notify', 'toastDurations'])).toEqual([]);
});
```
Áp dụng: `index.ts` có `isApiError`, `SESSION_EXPIRED` và **không** có `createFetchHttpClient`, `withSessionRefresh` (`expect('createFetchHttpClient' in publicApi).toBe(false)`); `http.ts` có cả hai. Phần đọc file `readFileSync` của analog (dòng 117–123) không dùng được vì test `api-client` không được import `node:*`.

---

### `apps/web/src/lib/feedback/error-messages.ts` (config, bảng copy)

**Analog:** `packages/design-tokens/src/index.ts` (hằng export tên, `as const`):
```typescript
export const sheetSnapPoints = {
  peek: 0.25,
  medium: 0.6,
  expanded: 0.92,
} as const;
```
Áp dụng: `export const GENERIC_ERROR_MESSAGE = "Đã có lỗi xảy ra, vui lòng thử lại";` (đúng câu D-04, không dấu chấm cuối) và `FIELD_INVALID_MESSAGE = "Giá trị không hợp lệ."` (D-05a). Bảng `ERROR_MESSAGES` dựng bằng `new Map<string, string>([...])` hoặc object tra bằng `Object.hasOwn` (D-16). Nội dung lấy đúng bảng RESEARCH §"Danh sách errorCode và copy tiếng Việt đề xuất"; mã "câu chung D-04" (`User.InvalidPassword`, `Itinerary.InvalidUserId`, `Conversation.InvalidUser`, `ChatMessage.InvalidVoiceUrl`, `ChatMessage.NullCallLogData`, `Server.Error`, `Error.NullValue`) map tới `GENERIC_ERROR_MESSAGE`; mã "không map" thì **không có key**. Đối chiếu với `C:\Users\OS\Documents\personal\tripory\docs\common\MESSAGE_LIST.md` §3. Nháy kép theo style app.

`apps/web/tsconfig.json` có `"lib": ["dom", "dom.iterable", "esnext"]`, nên `Object.hasOwn` có type dù `target` là ES2017.

---

### `apps/web/src/lib/feedback/{select-error-message,resolve-form-error,mutation-feedback}.ts` + `.test.ts` (utility, transform)

**Analog logic:** `sheet-snap.ts` (hàm thuần, type export cạnh hàm). Code mẫu lấy nguyên RESEARCH §Code Examples (`selectErrorMessage`, `FormErrorResolution`/`resolveFormError`, `MutationFeedback`/`decideMutationSuccess`/`decideMutationError`). Điều chỉnh theo D-05a: field từ `ValidationProblemDetails` ra `FIELD_INVALID_MESSAGE` ở ô form, toast dùng `GENERIC_ERROR_MESSAGE`, không hiện chuỗi tiếng Anh.

**Import pattern** (nháy kép, như `apps/web/src/components/user-menu.tsx` dòng 1):
```typescript
import { Avatar } from "@tripory/ui-web";
```
→
```typescript
import { isApiError, type ApiError } from "@tripory/api-client";
import { ERROR_MESSAGES, GENERIC_ERROR_MESSAGE } from "./error-messages";
```
Không import `@tripory/api-client/http` (bị chặn ngoài composition). Không import `@tripory/ui-web` hay `sonner`: hàm trả `ToastDecision`, Phase 3 mới gọi `notify.success/error` (`packages/ui-web/src/molecules/toast.tsx` dòng 27–33). Chữ ký đích:
```typescript
export const notify = {
  success: (title: ReactNode, options?: NotifyOptions) => showToast('success', title, options),
  error: (title: ReactNode, options?: NotifyOptions) => showToast('error', title, options),
  // ...
} as const;
```
nên `ToastDecision = { variant: 'success' | 'error'; message: string } | null` khớp `notify[variant](message)`.

**Test:** theo `apps/web/src/app/(dashboard)/error.test.tsx` (nháy kép, `it` trơn, tên test mô tả hành vi) và `apps/web/src/components/app-shell.test.tsx` dòng 5 (`it.each([...] as const)`):
```typescript
import { expect, it, vi } from "vitest";
// ...
it.each(["public", "dashboard"] as const)("renders the %s shell with accessible landmarks", (variant) => {
```
`ApiError` dựng trong test bằng object literal có `type: "ApiError"` (hoặc `makeApiError` nếu planner export từ `index.ts`). Ca bắt buộc: mã có map, mã không map (`NotEmptyValidator`, `Auth.UserBanned`) → message BE, network/timeout/rỗng/`new Error()` → câu chung, `aborted` → `null`, `code: "toString"` và `"__proto__"` không khớp nhầm, `session_expired` → không toast, `errorToast: false` → `null`, `successMessage` vắng → `null`.

Môi trường: `apps/web/vitest.config.ts` dùng `uiPreset` (jsdom) + `src/test/setup.ts`. Hàm thuần chạy được trên jsdom, không cần sửa config. Lệnh nhanh: `pnpm --filter @tripory/web exec vitest run src/lib/feedback`.

---

### `apps/web/package.json`, `pnpm-lock.yaml` (config)

**Analog:** chính file, dòng 15–17. Thêm theo thứ tự alphabet, cùng kiểu workspace:
```json
"dependencies": {
  "@tripory/api-client": "workspace:*",
  "@tripory/design-tokens": "workspace:*",
  "@tripory/ui-web": "workspace:*",
```
Sau đó `pnpm install` để sinh lại `pnpm-lock.yaml`. Không thêm `@tripory/shared-kernel` trừ khi code app import trực tiếp nó.

---

### `packages/config/test/boundaries.test.ts` (test, batch) — chỉ thêm case

**Analog:** chính file. Biến `dir` đã có ở dòng 47–52 (`kernel`, `apiClient`, `web`). Thêm vào mảng `bad` (sau dòng 99 cho api-client/kernel, sau dòng 116 cho web) và `ok` (sau dòng 128, 135), đúng định dạng một dòng:
```typescript
{ name: 'api-client: localStorage', dir: apiClient, file: 'src/x.ts', code: "export const t = localStorage.getItem('token');", violations: [{ rule: 'no-restricted-globals', includes: "'localStorage'" }] },
{ name: 'web: /http ngoài composition', dir: web, file: 'src/app/x.ts', code: "import r from '@tripory/itinerary/http';\nexport const x = r;", violations: [imp("'@tripory/itinerary/http'")] },
{ name: 'web: composition import /http, /react và entry gốc', dir: web, file: 'src/composition/itinerary.client.ts', code: "..." },
```
Case cần thêm (RESEARCH §Validation Architecture, CONTEXT `navigator`):
- `bad`: `api-client: navigator` (`navigator.locks.request(...)` → `no-restricted-globals` chứa `'navigator'`); `api-client: zod` (`import { z } from 'zod'` → `imp("'zod'")`); `kernel: fetch` (pure → `no-restricted-globals` chứa `'fetch'`); `api-client test: node:fs` (file `src/x.test.ts` → `imp("'node:fs'")`); `web: api-client /http trong lib/feedback` (file `src/lib/feedback/x.ts`, `import { createFetchHttpClient } from '@tripory/api-client/http'` → `imp("'@tripory/api-client/http'")`).
- `ok`: `web: lib/feedback import entry gốc api-client` (`src/lib/feedback/x.ts`); `web: composition import api-client /http` (`src/composition/http.client.ts`); `api-client: AbortController + setTimeout` (`src/x.ts`).

ESLint `no-restricted-imports` không resolve module, nên case `web` chạy được kể cả trước khi thêm dependency. Không sửa `boundaries.mjs`; nếu một case `ok` đỏ thì đọc message và mục 5 tài liệu kiến trúc trước (AGENTS.md).

## Shared Patterns

### Ranh giới import và global
**Source:** `packages/config/eslint/boundaries.mjs` dòng 107–131.
**Apply to:** mọi file trong `packages/api-client/src`, `packages/shared-kernel/src`.
```js
/** Một vùng = 2 block: mã nguồn, và file test với allowlist test đã duyệt. */
const zone = (root, options) => [
  { files: [`${root}/**/*.{ts,tsx}`], ignores: [`${root}/**/*.test.{ts,tsx}`], rules: rulesFor(options) },
  {
    files: [`${root}/**/*.test.{ts,tsx}`],
    rules: rulesFor({ ...options, allowed: [...options.allowed, ...(options.testAllowed ?? ['vitest'])] }),
  },
];

/** @tripory/shared-kernel: không phụ thuộc package nào. */
export const kernelPackage = () => [...base, ...zone('src', { allowed: [], pure: true })];

/** @tripory/api-client: chỉ phụ thuộc shared-kernel; được dùng fetch. */
export const httpPackage = () => [...base, ...zone('src', { allowed: [KERNEL] })];
```
Hệ quả: source `api-client` chỉ import `@tripory/shared-kernel` + tương đối; test thêm `vitest`. Kernel không import gì, test chỉ thêm `vitest`. Cả hai cấm `window`, `document`, `localStorage`, `sessionStorage`, `navigator` (dòng 57, 71–82). Kernel cấm thêm `fetch`, `Date.now`, `new Date()`, `Math.random` (dòng 80, 84–104).

### Chặn UI tự dựng client
**Source:** `boundaries.mjs` dòng 52–55 và 169–172.
**Apply to:** `apps/web/src/**` ngoài `src/composition/**`.
```js
const httpOnlyInComposition = {
  group: ['@tripory/*/http'],
  message: 'Chỉ src/composition/** được import adapter /http; UI dùng hook/use case do composition xuất ra.',
};

export const app = () => [
  { files: ['src/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', { patterns: [noDeepImport, httpOnlyInComposition] }] } },
  { files: ['src/composition/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', { patterns: [noDeepImport] }] } },
];
```
Vì vậy đặt `createFetchHttpClient`/`withSessionRefresh` ở `@tripory/api-client/http` là đủ, không cần rule mới.

### Test preset
**Source:** `packages/config/vitest/preset.mjs` (node), `packages/config/vitest/ui-preset.mjs` (jsdom).
**Apply to:** `api-client`, `shared-kernel` dùng preset node qua `vitest.config.ts` có sẵn (`import preset from '@tripory/config/vitest'; export default preset;`). `apps/web/src/lib/feedback` dùng cấu hình app có sẵn. `include: ['src/**/*.test.{ts,tsx}']` nên test đặt cạnh file nguồn.

### Dependency tiêm qua `deps`
**Source:** `ai-memories/tripory-fe--ddd-architecture.md` mục 6 (`makeX(deps) => (input) => result`, closure là DI; composition root ở `apps/<app>/src/composition/`).
**Apply to:** `createFetchHttpClient({ baseUrl, fetch, timeoutMs, getHeaders })`, `withSessionRefresh(inner, { refresh, lock, onSessionExpired, lockName })`. State (`epoch`, `inFlight`) sống trong closure, không ở module scope như FE cũ.

### Copy hiển thị
**Source:** `packages/ui-web/src/molecules/error-state.tsx` dòng 24–25 (copy cố định "Không thể tải nội dung", "Đã xảy ra sự cố. Vui lòng thử lại.", nút "Thử lại").
**Apply to:** `apps/web/src/lib/feedback`. Lỗi query đọc (D-10) dùng `ErrorState` có sẵn, không cần hàm mới. Copy toast lỗi chung là câu D-04 riêng, không dùng lại câu của `ErrorState`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `packages/api-client/src/fetch-http-client.ts` | service (adapter) | request-response | Repo chưa gọi mạng ở đâu; chưa có test fake timers. Dùng RESEARCH Pattern 3, Pitfall 5–6 |
| `packages/api-client/src/with-session-refresh.ts` | middleware | single-flight | Chỉ có FE cũ (phản mẫu). Dùng RESEARCH Pattern 4, Pitfall 1–3 |
| `packages/api-client/src/response-shapes.ts` | utility (type guard) | transform | Chưa có type guard tay nào. Dùng RESEARCH §"Hình dạng lỗi BE" |
| `packages/api-client/src/http-client.ts` | port (type) | request-response | Chưa có port nào. Dùng RESEARCH §Recommended Project Structure + System Architecture Diagram |
| `packages/shared-kernel/src/ids.ts` (branded type) | model | transform | Chưa có `unique symbol`/`Brand` hay `expectTypeOf`. Dùng RESEARCH §shared-kernel |

## Metadata

**Analog search scope:** `packages/*` (config, ui-web, design-tokens, itinerary, api-client, shared-kernel), `apps/web/src`, `apps/web/{package.json,tsconfig.json,vitest.config.ts,eslint.config.mjs}`, `turbo.json`, `ai-memories/tripory-fe--ddd-architecture.md`, FE cũ `tripory/src/services/api/apiClient.ts`
**Files scanned:** 31
**Pattern extraction date:** 2026-10-12

## PATTERN MAPPING COMPLETE
