# Phase 4: Itinerary CRUD & Editor - Pattern Map

**Mapped:** 2026-10-24
**Files analyzed:** khoảng 95 file mới/sửa, gom thành 38 nhóm (file nguồn và test đi cặp tính một nhóm)
**Analogs found:** 32 / 38 nhóm. 6 nhóm không có analog về logic: parse vị trí Google Maps, resolve link rút gọn (theo redirect), pending-delete controller (đồng hồ hoãn), dnd-kit, cảnh báo rời trang (`Link onNavigate` + `beforeunload`), adapter `sessionStorage` cho bản nháp form. Logic lấy từ 04-RESEARCH Pattern 7–9, 12, 14, 18; style lấy từ analog gần nhất.

Repo sau Phase 3: `packages/identity` đủ 4 tầng (analog chính cho `packages/itinerary`), `composition/{http.client,identity.client,query-client,session-events.client,viewer.server}.ts`, `composition/server/*` (BFF, guard, envelope), `modules/identity/ui/*` (form RHF + Zod, `SubmitStatus`, gate), `ui-web` đã có `InlineAlert`, `DropdownMenuLinkItem`, `Button loadingLabel`, `Sheet` snap. **Repo chưa có**: `useInfiniteQuery`/optimistic mutation ở bất kỳ đâu, route handler gọi host ngoài BE, controller có timer hoãn commit, dnd-kit, route group lồng, `Activity`-aware cleanup, fake `IntersectionObserver`/`ResizeObserver`.

Quy ước style theo vùng (giữ như 03-PATTERNS):
- `packages/*`: nháy đơn, có `;`, comment tiếng Việt giải thích *lý do*, tên test tiếng Việt (`http-session-gateway.test.ts`, `sheet-snap.test.ts`).
- `apps/web/src/**`: nháy kép, có `;`. Tên test tiếng Anh mô tả hành vi (`change-password-form.test.tsx`, `user-menu.test.tsx`) hoặc tiếng Việt theo file kề bên.
- Không class (trừ `DomainError`), `type` readonly + hàm thuần, deps tiêm `makeX(deps)`/`createX(deps)`; state sống trong closure. Singleton có chủ đích chỉ ở `composition/*.client.ts`, có comment lý do.

## File Classification

| File mới/sửa | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/itinerary/package.json` (sửa: zod, peer react/react-query, bỏ `--passWithNoTests`) | config | — | `packages/identity/package.json` | exact |
| `packages/itinerary/src/domain/{itinerary,calendar-date,day-range,permissions,reorder}.ts` + test | model + utility | transform | `packages/identity/src/domain/{viewer,safe-next-path}.ts`, `shared-kernel/src/{ids,geo}.ts` + test | role-match |
| `packages/itinerary/src/domain/location-input.ts` + test (bảng mẫu) | utility (parser) | transform | `identity/src/domain/safe-next-path.ts` (chỉ chuỗi, không `URL`) + `safe-next-path.test.ts` | partial (logic: RESEARCH Pattern 7) |
| `packages/itinerary/src/domain/index.ts`, `application/index.ts`, `src/index.ts` | barrel | — | `packages/identity/src/{domain,application}/index.ts`, `src/index.ts` | exact |
| `packages/itinerary/src/application/ports.ts` | port (type) | request-response | `packages/identity/src/application/ports.ts` | exact |
| `packages/itinerary/src/application/use-cases.ts` + test (`reorderWaypoints`, `addDay`) | service (use case thuần) | transform | `identity/src/domain/password-rules.ts` (hàm thuần) — identity cố ý không có use case | partial |
| `packages/itinerary/src/infrastructure/dto.ts` + test | ACL (Zod) | transform | `packages/identity/src/infrastructure/dto.ts` + `dto.test.ts` | exact |
| `packages/itinerary/src/infrastructure/mappers.ts` + test | ACL (mapper) | transform | `packages/identity/src/infrastructure/mappers.ts` (`toViewer` ném khi id hỏng) | exact |
| `packages/itinerary/src/infrastructure/http-itinerary-repository.ts` + test | repository | CRUD | `packages/identity/src/infrastructure/http-session-gateway.ts` + test | exact |
| `packages/itinerary/src/infrastructure/fixtures.ts` | test fixture | — | `packages/identity/src/infrastructure/fixtures.ts` | exact |
| `packages/itinerary/src/infrastructure/index.ts` (→ `./http`) | barrel | — | `packages/identity/src/infrastructure/index.ts` | exact |
| `packages/itinerary/src/react/index.ts` (`itineraryKeys`, `createItineraryHooks`: infinite, optimistic, `scope`) | hook factory | CRUD + optimistic | `packages/identity/src/react/index.ts` | role-match (infinite/optimistic: RESEARCH Pattern 2, 5) |
| `packages/itinerary/src/exports.test.ts` | test | — | `packages/identity/src/exports.test.ts` | exact |
| `packages/api-client/src/http-client.ts` + `fetch-http-client.ts` + test (`keepalive`) | adapter | request-response | chính nó (`HttpRequest` dòng 8–22, `doFetch` init dòng 90–96) | exact |
| `pnpm-workspace.yaml` (4 gói dnd-kit), `apps/web/package.json` | config | — | chính nó dòng 12–42 | exact |
| `packages/config/test/boundaries.test.ts` (thêm case itinerary) | test | batch | chính nó dòng 93–99, 127–135, 145–164 | exact |
| `packages/design-tokens/src/{theme,components}.css` + `tokens.test.ts` (alias `--text-color-*`, `--z-index-*`, 2 token mới, guard `var()` mồ côi) | config (token) + guard test | batch | `tokens.test.ts` dòng 188–200 (`compile` + `build`), `ui-web/src/token-guard.test.ts` (quét `.tsx`) | role-match |
| `packages/ui-web/src/**` (đổi `z-(--z-*)` → `z-*`, `max-w-(--size-content-sm)` → `max-w-content-sm`) | component | — | `molecules/sheet.tsx` dòng 105, 130, 143 (và dialog/dropdown/select/tooltip) | exact |
| `packages/ui-web/src/molecules/toast.tsx` (`notify.undoable`) + test | component (adapter) | event-driven | chính nó dòng 22–33 + `toast.test.tsx` dòng 35–49 | exact |
| `packages/ui-web/src/molecules/inline-alert.tsx` (`variant`) + test | component | — | chính nó dòng 14–30, `error-state.tsx` (variant union) | exact |
| `packages/ui-web/src/molecules/{sheet,sheet-snap}.tsx/.ts` (`dismissible`, `defaultSnap`, `insetTop`) + test | component | event-driven | chính nó dòng 47–83, `sheet-snap.ts` dòng 5–10, `sheet-snap.test.ts` dòng 12–18 | exact |
| `apps/web/src/composition/http.client.ts` (+ `appHttp` base `/api`, client trần cho keepalive) + test | composition | request-response | chính nó dòng 81, 101–105, 117–121 | exact |
| `apps/web/src/composition/itinerary.client.ts` | composition | — | `apps/web/src/composition/identity.client.ts` | exact |
| `apps/web/src/composition/server/maps-resolve.ts` + test | service (thuần, fake fetch) | request-response | `composition/server/upstream.ts` + `bff.forward.test.ts` (fake fetch, `hangingFetch`) | role-match (logic: RESEARCH Pattern 8) |
| `apps/web/src/composition/server/maps-handlers.ts` (`handleMapsResolve`) + test | service (route logic) | request-response | `composition/server/auth-handlers.ts` `handleChangePassword` dòng 345–356 + `readJsonObject` dòng 38–49 | exact |
| `apps/web/src/app/api/maps/resolve/route.ts` | route (vỏ mỏng) | request-response | `apps/web/src/app/api/auth/refresh/route.ts` | exact |
| `apps/web/src/proxy.ts` (+ `isProtectedPath`, pattern `/edit`) + `proxy.test.ts` + `proxy-coverage.test.ts` | middleware | request-response | chính nó dòng 21–27; `proxy-coverage.test.ts` dòng 36–56 | exact |
| `apps/web/src/app/(dashboard)/(shell)/{layout,loading,error}.tsx` + test (chuyển từ `(dashboard)/`) | layout | — | `apps/web/src/app/(dashboard)/layout.tsx`, `loading.tsx`, `error.tsx` + test cùng tên | exact |
| `apps/web/src/app/(dashboard)/(editor)/layout.tsx`, `itineraries/[id]/edit/{page,loading,error}.tsx` + test | layout + page (RSC) | request-response | `(dashboard)/layout.tsx`, `settings/password/page.tsx`, `composition/viewer.server.ts` | role-match |
| `apps/web/src/app/(dashboard)/(shell)/itineraries/mine/page.tsx` (thay) + test | page | — | `(public)/login/page.tsx` (Suspense cho `useSearchParams`) | exact |
| `apps/web/src/app/route-layouts.test.tsx` (sửa đường import, thêm ca `(editor)`) | test | — | chính nó dòng 1–24 | exact |
| `apps/web/src/components/submit-status.tsx` + test (chuyển từ `modules/identity/ui`) | component (organism) | event-driven | `modules/identity/ui/submit-status.tsx` | exact (move) |
| `apps/web/src/components/user-menu.tsx` (`compact`, `onNavigate`) + test | component (organism) | — | chính nó + `user-menu.test.tsx` dòng 7–18 | exact |
| `apps/web/src/lib/feedback/error-messages.ts` (thêm mã) + test | config | — | chính nó dòng 33–45 | exact |
| `apps/web/src/modules/itinerary/ui/*-form*.tsx`, `*-dialog.tsx` (CreateItinerary, TripInfo, WaypointForm, Publish, DeleteItinerary, LeaveEditor) + test | component (form organism) | request-response | `modules/identity/ui/change-password-form.tsx` + `.test.tsx`, `auth-fields.tsx` | role-match |
| `apps/web/src/modules/itinerary/ui/{form-schemas,form-error-mapping}.ts` + test | utility (presentation policy) | transform | `modules/identity/ui/form-schemas.ts`, `form-error-mapping.ts` | exact |
| `apps/web/src/modules/itinerary/ui/{my-itineraries-view,itinerary-card,itinerary-editor,editor-layout,editor-header,save-indicator,trip-summary,day-tabs,day-subtitle,waypoint-list,sortable-waypoint-item,location-field,publish-button,editor-forbidden,not-found-view}.tsx` + test | component (organism client) | CRUD / event-driven | `components/user-menu.tsx`, `components/app-header.tsx`, `modules/identity/ui/session-keeper.tsx` (listener + cleanup) | role-match |
| `apps/web/src/modules/itinerary/ui/{pending-delete,leave-guard,draft-storage,dnd-announcements,entry-flag}.ts` + test | controller / adapter (thuần) | event-driven | `composition/session-events.client.ts` (`makeX(deps)`, state trong closure) | partial (logic: RESEARCH Pattern 9, 14, 18) |
| `apps/web/src/test/{be-itinerary-fixtures,fake-intersection-observer,fake-resize-observer}.ts` | test helper | — | `apps/web/src/test/be-auth-fixtures.ts`, `fake-broadcast-channel.ts`, `fake-locks.ts` | role-match |

Không cần sửa: `packages/config/eslint/boundaries.mjs` (`contextPackage()` đã cho `zod` ở infrastructure, `react` + `@tanstack/react-query` ở react; `app()` dòng 170–173 chỉ chặn deep import và `/http` ngoài composition, nên `modules/itinerary/ui` import `@dnd-kit/*` được), `apps/web/src/app/api/bff/[...path]/route.ts` (allowlist `itineraries` đã có ở `bff.ts` dòng 13), `turbo.json`, `apps/web/next.config.ts` (`cacheComponents: true`).

## Pattern Assignments

### `packages/itinerary/package.json` (config)

**Analog:** `packages/identity/package.json` dòng 1–36. Sao nguyên khối `dependencies`/`peerDependencies`/`devDependencies`, giữ `name` và `exports` hiện có của itinerary (đã đúng ba subpath):
```json
  "scripts": { "lint": "eslint", "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "@tripory/api-client": "workspace:*", "@tripory/shared-kernel": "workspace:*", "zod": "catalog:" },
  "peerDependencies": { "@tanstack/react-query": "catalog:", "react": "catalog:" },
  "devDependencies": {
    "@tanstack/react-query": "catalog:", "@tripory/config": "workspace:*", "@types/node": "catalog:",
    "@types/react": "catalog:", "eslint": "catalog:", "react": "catalog:", "typescript": "catalog:", "vitest": "catalog:"
  }
```
- Bỏ `--passWithNoTests` (hiện ở `packages/itinerary/package.json` dòng 14) ngay khi có test đầu.
- Nếu test hook trong package: thêm `jsdom: "catalog:"` và `@testing-library/react` vào dev, đầu file `// @vitest-environment jsdom` (preset node). Khuyến nghị như Phase 3: test hook qua component ở app, test package chỉ node.
- dnd-kit **không** vào package này (cần DOM, RESEARCH Pattern 12).

---

### `packages/itinerary/src/domain/*.ts` + test (model/utility, transform)

**Analog:** `packages/shared-kernel/src/ids.ts` dòng 24–33 (hàm parse trả `null`, chuẩn hóa) và `geo.ts` dòng 19–23 (nhận object có tên field, trả bản frozen):
```typescript
// Nhận object có tên field thay vì `(a, b)`: BE là `Create(longitude, latitude)`, GeoJSON là
// `[lng, lat]`, còn người dùng dán "lat, lng"; tham số theo vị trí rất dễ đảo trục mà không ai thấy.
export function createWgs84Coordinate(input: { latitude: number; longitude: number }): Wgs84Coordinate | null {
  const { latitude, longitude } = input;

  return inRange(latitude, longitude) ? Object.freeze({ latitude, longitude }) : null;
}
```
Và `packages/identity/src/domain/safe-next-path.ts` dòng 1–4 (comment đầu file nói rõ ràng buộc RN + không đồng hồ):
```typescript
// ... Chỉ kiểm chuỗi, không dùng `URL`
// (React Native có `URL` không đầy đủ) và không đọc đồng hồ: domain dùng chung web + mobile.
// Trả `null` thay vì ném lỗi: `next` sai là chuyện bình thường, nơi gọi rơi về đích mặc định.
```
Áp dụng:
- `itinerary.ts`: `type Itinerary = Readonly<{ id: ItineraryId; ownerId: UserId; title; description: string | null; coverImageUrl: string | null; startDate: CalendarDate | null; isPublic; totalDistanceKm; days: readonly ItineraryDay[]; waypoints: readonly Waypoint[] }>`, `Waypoint` có `coordinate: Wgs84Coordinate` (import type từ `@tripory/shared-kernel`), `ItinerarySummary`, `StatusFilter = 'all' | 'draft' | 'published'` + `parseStatusFilter(raw): StatusFilter` (giá trị lạ → `'all'`, D-03).
- `calendar-date.ts`: nguyên RESEARCH Pattern 3. `new Date(Date.UTC(...))` có tham số, không bị luật `new Date()` không tham số chặn (`boundaries.mjs`, cùng luật đã chặn `Date.now` — self-test dòng 98).
- `day-range.ts`, `permissions.ts`: nguyên RESEARCH Pattern 4 (`buildDayRange`, `nextDayNumber`, `canEdit`, `canPublish(it, pendingIds)`).
- `reorder.ts`: `moveItem(ids, from, to)` thuần (không import `@dnd-kit/sortable` `arrayMove`), `applyDayOrder(it, dayNumber, orderedIds)`, `isSameOrder`.
- `location-input.ts`: RESEARCH Pattern 7 (discriminated union `LocationParse`, thứ tự mẫu 0–6, tách Tên/Địa chỉ theo D-49, `decodeURIComponent` trong `try/catch`, bỏ ký tự điều khiển — dùng vòng lặp mã ký tự như `hasControlOrSpace` ở `safe-next-path.ts` dòng 9–17 thay vì regex để khỏi vướng `no-control-regex`). **Không `new URL()`**.

**Test:** theo `packages/identity/src/domain/viewer.test.ts` (`describe` tiếng Việt, `it.each([...] as const)`, `expectTypeOf` cho readonly):
```typescript
it.each([[''], ['   '], ['\t\n']] as const)('rơi về email khi họ tên rỗng: %j', (fullName) => {
  expect(viewerDisplayName(makeViewer({ fullName }))).toBe('lan@tripory.vn');
});
```
`location-input.test.ts`: bảng mẫu RESEARCH Pattern 7 gồm hai URL thật đã resolve (`/maps/search/29.996966,+68.748251`, `/maps/place/Brandenburg+Gate,+…/data=!4m2!3m1!1s…` → `no-coordinate`), `%` hỏng, ngoài khoảng → `out-of-range`, `goo.gl` không có `/maps/` → `invalid`. `calendar-date.test.ts`: `2026-02-29` null, `2024-02-29` hợp lệ, tháng 13, rỗng.

---

### `packages/itinerary/src/application/ports.ts` (port, type-only)

**Analog:** `packages/identity/src/application/ports.ts` dòng 1–27 (comment đầu file, chỉ `type`, `Readonly<{...}>`, input type riêng):
```typescript
// Hợp đồng giữa application và adapter. Chỉ có type: cài đặt HTTP nằm ở `infrastructure` (subpath `./http`),
// composition của app lắp vào. Không có use case chuyển tiếp, hook React gọi thẳng port (kiến trúc mục 6).
export type LoginInput = Readonly<{ email: string; password: string }>;
export type SessionGateway = Readonly<{
  login(input: LoginInput): Promise<Viewer>;
  ...
}>;
```
Áp dụng: `ItineraryRepository = Readonly<{ listMine(q, signal?): Promise<Page<ItinerarySummary>>; getById(id, signal?); create({ title }): Promise<Itinerary>; updateMetadata(id, input); publish(id); remove(id); addWaypoint(id, input): Promise<Waypoint>; updateWaypoint(id, wid, input); deleteWaypoint(id, wid, opts?: { keepalive?: boolean }); reorderWaypoints(id, { dayNumber, orderedIds }); setDaySubtitle(id, dayNumber, subtitle: string | null) }>`, `ShortLinkResolver = Readonly<{ resolve(url: string): Promise<string | null> }>`. Application chỉ import `KERNEL` + `../domain`.

---

### `packages/itinerary/src/application/use-cases.ts` + test (service thuần)

**Không có analog use case** (identity cố ý không có, kiến trúc mục 6). Chỉ viết use case có luật thật: `reorderWaypoints(repo, it, dayNumber, orderedIds)` kiểm tập ID khớp ngày trước khi gọi (`InvalidReorderList` sớm), `addDay(repo, it)` = `setDaySubtitle(id, nextDayNumber(it), null)` (D-27). Style hàm thuần như `identity/src/domain/password-rules.ts`. Test bằng fake repository dạng object `vi.fn` như `fakeHttp` ở dưới.

---

### `packages/itinerary/src/infrastructure/dto.ts` + test (ACL, Zod)

**Analog:** `packages/identity/src/infrastructure/dto.ts` dòng 1–18:
```typescript
import { z } from 'zod';

// ACL: hình dạng JSON của BE (tripory_be, 03-RESEARCH.md §Contract BE) và của route FE `/api/auth/*`.
// Mọi thứ vào từ mạng đều qua `.parse` ở đây, nên tên field BE không rò sang domain hay UI.
// Zod mặc định bỏ khóa lạ: token hay trường thừa ở phản hồi không lọt qua schema `viewerDto` (T-03-12).

/** `UserDto` trong `AuthResponse`. `bio` và `avatarUrl` nhận cả `null` để không vỡ khi BE đổi sang nullable. */
export const userDto = z.object({
  id: z.string(),
  ...
  bio: z.string().nullish(),
```
Áp dụng nguyên RESEARCH §Code Examples "Zod DTO (ACL)": `waypointDto`, `itineraryDayDto`, `itineraryDetailDto` (`z.iso.date().nullish()`, `z.iso.datetime({ offset: true })`), `itinerarySummaryDto` (**không có `updatedAt`**, bỏ qua `daysCount`/`waypointsCount`), `pagedDto(item)`. JSDoc mỗi schema ghi tên DTO C# + đường dẫn file BE như mẫu.

**Test:** theo `identity/src/infrastructure/dto.test.ts`; ca bắt buộc: `updatedAt` `…08.8812345+00:00` qua, chuỗi không offset bị từ chối, `startDate: '2026-02-29'` bị từ chối.

---

### `packages/itinerary/src/infrastructure/mappers.ts` + test (ACL, mapper)

**Analog:** `packages/identity/src/infrastructure/mappers.ts` dòng 28–46 (chỉ chép đúng field cần; id hỏng → ném, không trả object hỏng):
```typescript
export const toViewer = (source: ViewerSource): Viewer => {
  const id = parseUserId(source.id);

  if (id === null) throw new Error('Id người dùng trong phản hồi của BE không hợp lệ.');

  return {
    id,
    email: source.email,
    ...
  };
};
```
Áp dụng: `toItinerary(dto)` theo RESEARCH Pattern 4 (sắp `days` theo `dayNumber`, `waypoints` theo `(dayNumber, orderIndex)`, `subtitle` `""`/trim rỗng → `null`, `parseItineraryId`/`parseUserId` null → ném, `createWgs84Coordinate` null → ném, `parseCalendarDate`), `toSummary`, `toSummaryPage`, `toWaypoint`. `coverImageUrl` rỗng → `null` (giống `normalizeAvatarUrl` dòng 13–17).

---

### `packages/itinerary/src/infrastructure/http-itinerary-repository.ts` + test (repository, CRUD)

**Analog:** `packages/identity/src/infrastructure/http-session-gateway.ts` dòng 1–5, 21–49:
```typescript
import type { HttpClient } from '@tripory/api-client';
import type { ProfileReader, SessionGateway } from '../application';
import type { Viewer } from '../domain';
import { userProfileDto, viewerResponseDto } from './dto';
import { toViewer } from './mappers';

export function createHttpSessionGateway(http: HttpClient): SessionGateway {
  return {
    async login({ email, password }) {
      const data = await http.send({ method: 'POST', path: '/login', body: { email, password }, sessionRefresh: false });

      return toSessionViewer(data);
    },
```
Áp dụng: `createHttpItineraryRepository(http: HttpClient, deps?: { unloadHttp?: HttpClient })`. Path nối sau base `/api/bff` (`/itineraries/mine`, `/itineraries/${id}/waypoints/${wid}`…). Body **chép đúng field hợp đồng** (RESEARCH §Code Examples "Repository chép đúng field") — cùng lý do comment dòng 13–15 của gateway ("trường thừa của form không bao giờ ra khỏi trình duyệt"). `listMine` map `status` → `isPublic` (`'all'` → `undefined`, bị `QueryValue` bỏ khỏi query string theo `http-client.ts` dòng 13). Truyền `signal` từ `queryFn`. `deleteWaypoint(..., { keepalive: true })` đi qua client trần **không** bọc refresh (`unloadHttp`) và đặt `keepalive: true`. `POST /itineraries` lấy `data` (201, BFF đã bỏ `Location`).

**Test:** fake `HttpClient` y hệt `http-session-gateway.test.ts` dòng 7–30:
```typescript
const fakeHttp = (reply: unknown = viewerJsonFixture) => {
  const send = vi.fn<HttpClient['send']>(async () => reply);
  const http: HttpClient = { send };

  return { http, send };
};

/** Request đã gửi ở lần gọi đầu tiên. */
const firstRequest = (send: ReturnType<typeof fakeHttp>['send']): HttpRequest => { ... };
```
Ca theo mẫu cùng file: "chỉ gửi đúng field, bỏ trường thừa" (dòng 58–64), "body sai hình dạng thì ném" (`it.each` dòng 142–153), "ApiError lan nguyên cùng tham chiếu" (dòng 168–178), `isPublic` cho ba status, keepalive dùng client riêng và có `keepalive: true`.

---

### `packages/itinerary/src/infrastructure/{fixtures,index}.ts`

**Analog fixture:** `packages/identity/src/infrastructure/fixtures.ts` dòng 1–8 (header ghi nguồn + ngày đọc BE, không import `vitest`, không export ra barrel), `errorEnvelope(errorCode, message)` dòng 87–88. Fixture: `itineraryDetailFixture` (ngày thưa: `days` thiếu Ngày 2, `waypoints` lộn `orderIndex`, `subtitle: ""`), `summaryPageFixture`, envelope `Itinerary.Forbidden`, `Itinerary.InvalidReorderList`, `Itinerary.CannotPublishEmpty`.

**Analog barrel:** `packages/identity/src/infrastructure/index.ts` dòng 1–6:
```typescript
// Chỉ apps/<app>/src/composition/** được import subpath này (rule httpOnlyInComposition).
export { createHttpProfileReader, createHttpSessionGateway } from './http-session-gateway';
```

---

### `packages/itinerary/src/react/index.ts` (hook factory)

**Analog:** `packages/identity/src/react/index.ts` dòng 1–43 (comment lý do, `MutationOptions` bỏ `mutationFn`, keys `as const`):
```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import type { DefaultError, UseMutationOptions } from '@tanstack/react-query';
...
type MutationOptions<TData, TVariables> = Omit<UseMutationOptions<TData, DefaultError, TVariables>, 'mutationFn'>;

export function createIdentityHooks(deps: IdentityHooksDeps) {
  return {
    useLogin: (options?: MutationOptions<Viewer, LoginInput>) =>
      useMutation({ ...options, mutationFn: (input: LoginInput) => deps.gateway.login(input) }),
```
Phần mới (không có analog trong repo) lấy RESEARCH Pattern 2 + 5: `itineraryKeys` (`all`, `lists`, `list(status)`, `detail(id)`, `write(id)`), `useMyItineraries` (`useInfiniteQuery`, `initialPageParam: 1`, `getNextPageParam` theo `hasNextPage`), `useItinerary` (`staleTime: 0`, `refetchOnWindowFocus` dạng hàm trả `false` khi `isMutating(write(id)) > 0`), mutation ghi có `mutationKey: write(id)` + `scope: { id: 'itinerary:' + id }`; optimistic `onMutate` snapshot / `onError` rollback / `onSettled` invalidate khi `isMutating === 1` cho reorder, phụ đề, thêm ngày, xóa waypoint (rollback "điểm hiện lại"). Thêm/sửa waypoint, metadata, publish: chờ BE rồi `setQueryData`/invalidate. Tạo: `setQueryData(detail)` + invalidate `lists()`. Xóa lịch trình: `removeQueries(detail)` + invalidate `lists()`.
- Thứ tự spread giữ như identity: `{ ...options, mutationKey, scope, mutationFn, onMutate... }` — side effect cache ở **cấp hook**, app chỉ truyền `meta` (bài học 03-11, RESEARCH Anti-Patterns). Nếu app cần `onError` riêng (ghi store SaveIndicator), hook gọi `options?.onError` sau rollback của mình, không để spread ghi đè.
- Lint: chỉ `react`, `@tanstack/react-query`, `KERNEL`, `../application`, `../domain` (self-test `boundaries.test.ts` dòng 145).

---

### `packages/itinerary/src/exports.test.ts`

**Analog:** `packages/identity/src/exports.test.ts` dòng 1–46, 74–99 (ba bảng tên, `missingFrom`, `it.each` entry gốc không có tên infrastructure/react, khóa query):
```typescript
const missingFrom = (module: object, names: readonly string[]) => names.filter((name) => !(name in module));
...
it.each([...INFRASTRUCTURE_NAMES, ...REACT_NAMES])('entry gốc không có %s', (name) => {
  expect(name in publicApi).toBe(false);
});
```
Áp dụng: `DOMAIN_NAMES` = `canEdit`, `canPublish`, `buildDayRange`, `nextDayNumber`, `parseCalendarDate`, `formatCalendarDateVi`, `parseLocationInput`, `parseStatusFilter`, `moveItem`…; `INFRASTRUCTURE_NAMES` = `createHttpItineraryRepository`, `toItinerary`, `itineraryDetailDto`…; `REACT_NAMES` = `createItineraryHooks`, `itineraryKeys`. Kiểm `itineraryKeys.write(id)` = `['itinerary','write',id]`.

---

### `packages/api-client` (`keepalive`) — adapter

**Analog:** chính nó. `http-client.ts` dòng 8–22 thêm field có JSDoc cùng giọng:
```typescript
  signal?: AbortSignal;
  timeoutMs?: number;
  /** false: login/register/refresh không vào nhánh refresh phiên. */
  sessionRefresh?: boolean;
```
→ `/** true: gửi kèm fetch `keepalive` để lệnh còn tới server khi trang đang đóng (D-32). */ keepalive?: boolean;`. `fetch-http-client.ts` dòng 90–96 thêm `...(request.keepalive ? { keepalive: true } : {})` vào init của `doFetch`. Test theo `fetch-http-client.test.ts` dòng 13–36 (`fixtureFetch`, đọc `init` của lần gọi đầu).

---

### `pnpm-workspace.yaml`, `apps/web/package.json` (config)

**Analog:** `pnpm-workspace.yaml` dòng 12–42 (một dòng mỗi gói, comment lý do khi không phải bản mới nhất):
```yaml
  "@base-ui/react": 1.8.0 # D-02: giữ bản đã kiểm, không tự nâng lên 1.9.0
```
Thêm: `"@dnd-kit/core": 6.3.1 # bản ổn định cuối; @dnd-kit/react 0.x còn beta`, `"@dnd-kit/sortable": 10.0.0`, `"@dnd-kit/utilities": 3.2.2`, `"@dnd-kit/modifiers": 9.0.0`. `apps/web/package.json`: thêm 4 gói `catalog:` và `"@tripory/itinerary": "workspace:*"` theo alphabet.

---

### `packages/config/test/boundaries.test.ts` — chỉ thêm case

**Analog:** chính file. Hằng `itinerary` đã có (dòng 47); case web cho itinerary đã có (dòng 127–130, 157–158). Định dạng một dòng như dòng 94–99:
```typescript
  { name: 'identity domain: zod', dir: identity, file: 'src/domain/x.ts', code: "import { z } from 'zod';\nexport const x = z;", violations: [imp("'zod'")] },
```
Case đề xuất: `bad` — `itinerary domain: zod`, `itinerary react: @dnd-kit/core`, `itinerary react: react-dom`, `itinerary domain: Date.now`; `ok` — `itinerary infrastructure: zod + api-client`, `web: modules/itinerary/ui import @dnd-kit/core + @dnd-kit/sortable`, `web: composition/server/maps-resolve.ts import @tripory/itinerary` (entry gốc). Không sửa `boundaries.mjs`.

---

### Token Wave 0: `packages/design-tokens/src/{theme,components}.css` + `tokens.test.ts`

**Analog alias:** `theme.css` dòng 1–9 (khối reset) và dòng 10–39 (alias `--color-*: var(--semantic-*)`). Thêm sau khối màu:
```css
  --text-color-muted: var(--semantic-color-text-muted);
  --text-color-subtle: var(--semantic-color-text-subtle);
  --text-color-disabled: var(--semantic-color-text-disabled);

  --z-index-*: initial;
  --z-index-base: var(--semantic-z-base);
  --z-index-sticky: var(--semantic-z-sticky);
  ... dropdown, overlay, modal, toast
```
(Kiểm tên `--semantic-z-*` thật trong `semantic.css` trước khi viết.) `components.css`: `--editor-timeline-width: 400px; --itinerary-cover-ratio: 16 / 9;` — **phải** thêm hai khóa vào object `toEqual` ở `tokens.test.ts` dòng 178–187, nếu không test đỏ (cùng bẫy `--user-menu-name-max-width` của Phase 3). Danh sách reset ở dòng 231 thêm `'z-index'` nếu thêm reset.

**Analog guard biên dịch:** `tokens.test.ts` dòng 188–200:
```typescript
    const compiler = await compile('@import "tailwindcss"; @import "./index.css";', {
      base: srcDir,
      onDependency: () => undefined,
    });
    const css = compiler.build(['max-w-form']);

    expect(css).toContain('.max-w-form');
    expect(css).toContain('max-width: var(--semantic-size-form)');
```
**Analog quét file:** `packages/ui-web/src/token-guard.test.ts` dòng 8–13, 37–42 (`repoRoot`, `sourceRoots`, `productionFiles` bỏ `.test.tsx`). Guard mới ở `tokens.test.ts` (tầng tokens được `node:fs` + `@tailwindcss/node`, self-test dòng 157): gom class từ `packages/ui-web/src/{atoms,molecules}` và `apps/web/src/{components,modules,app}`, `compiler.build(tokens)`, rồi (1) mọi `var(--x)` trong CSS sinh ra phải khai báo trong `design-tokens/src/*.css` (ngoại lệ `--tw-`, `--drawer-`), (2) `text-muted`/`text-subtle`/`text-disabled`/`z-modal` sinh rule, `bg-muted` không sinh. Test đột biến: xóa `--text-color-muted` thì đỏ.

**Đổi class ở ui-web:** `molecules/sheet.tsx` dòng 105 (`z-(--z-overlay)`), 130 (`z-(--z-modal)`), 143 (`max-w-(--size-content-sm)` → `max-w-content-sm`); `dialog.tsx` dòng 9, 42, 55; `dropdown-menu.tsx` dòng 47; `select.tsx` dòng 51; `tooltip.tsx` dòng 49; `apps/web/src/components/app-header.tsx` dòng 16 (`z-(--z-sticky)`). Grep lại `z-(--z-` toàn repo trước khi xong. **Lưu ý:** UI-SPEC §EditorHeader vẫn viết `z-(--z-sticky)` — planner dùng `z-sticky` theo RESEARCH Pattern 17.

---

### `packages/ui-web/src/molecules/toast.tsx` (`notify.undoable`) + test

**Analog:** chính nó dòng 9–33:
```tsx
type NotifyOptions = Omit<ExternalToast, 'duration'>;
...
function showToast(variant: ToastVariant, title: ReactNode, options: NotifyOptions = {}) {
  const duration = variant === 'error' || options.action ? toastDurations.extended : toastDurations.default;
  return sonnerToast[variant](<ToastAnnouncement variant={variant}>{title}</ToastAnnouncement>, { ...options, duration });
}

export const notify = {
  success: (title: ReactNode, options?: NotifyOptions) => showToast('success', title, options),
  ...
  dismiss: sonnerToast.dismiss,
} as const;
```
Thêm `undoable` theo RESEARCH Pattern 10 (`duration: Infinity`, `action.onClick` gọi `onAction`, `onDismiss`), **không** đi qua `showToast` (để không bị ép 8 giây), không mở `duration` cho các hàm khác. Không chứa copy nghiệp vụ (`actionLabel` do app truyền).

**Test:** theo `toast.test.tsx` dòng 35–49 (`render(<Toast />)`, `findByRole('button', { name: 'Hoàn tác' })`, `user.keyboard('{Enter}')`, `afterEach(sonnerToast.dismiss)` dòng 8–10). Thêm: `vi.useFakeTimers()` + `advanceTimersByTime(10_000)` vẫn còn toast; `notify.dismiss(id)` gọi `onDismiss`; action gọi đúng một lần.

---

### `packages/ui-web/src/molecules/inline-alert.tsx` (`variant`) + test

**Analog:** chính nó dòng 9–30:
```tsx
export function InlineAlert({ children, className }: InlineAlertProps) {
  if (children == null || children === '' || children === false) return null;

  return (
    <div className={cn('flex items-start gap-control-gap rounded-control border border-danger bg-danger-subtle p-stack-md text-body text-danger', className)} role="alert">
      <Icon className="text-danger" icon={CircleAlert} size="md" />
```
Thêm `variant?: 'danger' | 'info'` (mặc định `danger`, giữ nguyên hành vi); `info`: `border-border bg-surface-muted text-text`, icon `Info` `text-muted`, `role="status"`. Tách class theo variant như `error-state.tsx` (`variant === 'card' && '...'`). Test: role theo variant, mặc định không đổi.

---

### `packages/ui-web/src/molecules/{sheet.tsx,sheet-snap.ts}` (`dismissible`, `defaultSnap`, `insetTop`) + test

**Analog:** `sheet.tsx` dòng 47–83:
```tsx
export function Sheet({ children, modal = true, onOpenChange, onSnapPointChange, position = 'bottom', ...props }: SheetProps) {
  const [viewportHeight, setViewportHeight] = useState(640);
  const snapPoints = useMemo(() => position === 'bottom' ? resolveSnapPoints(viewportHeight) : [], [position, viewportHeight]);
  const [snapPoint, setSnapPoint] = useState<SheetSnapPoint | null>(0.6);

  useEffect(() => {
    if (position === 'bottom') setViewportHeight(window.innerHeight);
  }, [position]);
  ...
        onOpenChange={(open, details) => {
          if (!open && position === 'bottom') setSnapPoint(snapPoints[1] ?? null);
          onOpenChange?.(open, details);
        }}
```
Áp dụng RESEARCH Pattern 16:
- `defaultSnap` thay hằng `0.6` (dòng 48) bằng `snapPoints[index]`; khi đóng cũng trả về mức `defaultSnap` thay `snapPoints[1]` (dòng 77).
- `insetTop` vào `resolveSnapPoints(viewportHeight, insetTop = 0)` ở `sheet-snap.ts` dòng 5–10; lắng nghe `resize` trong effect dòng 51–53 (có cleanup).
- `dismissible` qua `SheetContextValue` (dòng 10–16) để `SheetControls` (từ dòng 179) không render `BaseDrawer.Close`; `onOpenChange` với `!open` thì `details.cancel()` trước khi gọi `onOpenChange` của caller.

**Test:** `sheet-snap.test.ts` dòng 12–18 thêm bảng `(vh, insetTop)` → expanded px; `sheet.test.tsx` dòng 15–33 (`ExampleSheet`) thêm prop, ca `dismissible={false}` không có nút "Đóng bảng", Esc không đóng.

---

### `apps/web/src/composition/http.client.ts` (+ `appHttp`, client trần unload) + test

**Analog:** chính nó dòng 81 (client trần), 101–105 (bọc refresh chung `refreshDeps`), 117–121 (singleton export):
```typescript
  // Client trần, KHÔNG bọc `withSessionRefresh`: bọc thì refresh gặp 401 sẽ gọi lại refresh (đệ quy).
  const authRawHttp = createFetchHttpClient({ baseUrl: "/api/auth", fetch: deps.fetch });
  ...
  const authHttp = withSessionRefresh(createFetchHttpClient({ baseUrl: "/api/auth", fetch: deps.fetch }), refreshDeps);
  const bffHttp = withSessionRefresh(createFetchHttpClient({ baseUrl: "/api/bff", fetch: deps.fetch }), refreshDeps);
```
Thêm vào `BrowserHttp` (dòng 29–43, có JSDoc mỗi field): `appHttp` = `withSessionRefresh(createFetchHttpClient({ baseUrl: "/api", ... }), refreshDeps)` cho `/maps/resolve`; `bffUnloadHttp` = `createFetchHttpClient({ baseUrl: "/api/bff", ... })` **không** bọc (comment: lúc unload không refresh được, D-32). Export thêm ở dòng 117. Test theo `http.client.test.ts` hiện có (fake lock, đếm số lần refresh).

---

### `apps/web/src/composition/itinerary.client.ts`

**Analog:** `apps/web/src/composition/identity.client.ts` dòng 1–12:
```typescript
// Hook identity đã lắp (composition root phía browser). ...
import { createIdentityHooks } from "@tripory/identity/react";
import { createHttpProfileReader, createHttpSessionGateway } from "@tripory/identity/http";
import { authHttp, bffHttp } from "./http.client";

export const identity = createIdentityHooks({
  gateway: createHttpSessionGateway(authHttp),
  profile: createHttpProfileReader(bffHttp),
});
```
Áp dụng: `export const itinerary = createItineraryHooks({ repository: createHttpItineraryRepository(bffHttp, { unloadHttp: bffUnloadHttp }), shortLinks: createHttpShortLinkResolver(appHttp) })`. Factory gọi **một lần** ở đây (PITFALLS). Nếu thêm `itinerary.server.ts`: không cần ở Phase 4 (RESEARCH Pattern 1: editor fetch ở client), đừng tạo file rỗng.

---

### `apps/web/src/composition/server/maps-resolve.ts` + test (service thuần, fake fetch)

**Không có analog gọi host ngoài BE.** Logic nguyên RESEARCH Pattern 8 (`SOURCE`, `isGoogleMapsDestination`, `MAX_HOPS = 3`, `TOTAL_TIMEOUT_MS = 5_000`, `MAX_INPUT = 2_048`, `HEAD` + `redirect: "manual"`, `res.body?.cancel()`, consent `continue`). Style và deps lấy từ `composition/server/bff.ts` dòng 1–3 (comment "Hàm thuần, không `server-only` để test được"; không log). `deps.fetch` gọi như hàm trần (`env.ts` dòng 131–132 comment "Illegal invocation"). Thay `AbortSignal.timeout` bằng `AbortController` + `setTimeout` nếu muốn fake timers điều khiển được (lý do ở `fetch-http-client.ts` dòng 75–78).

**Test** `// @vitest-environment node`, fake fetch theo `bff.forward.test.ts` dòng 1–35:
```typescript
type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const fetchReturning = (response: Response) =>
  vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => response);

/** Fetch không bao giờ trả lời, chỉ reject khi signal abort (giống fetch thật). */
const hangingFetch = () => vi.fn((_input, init?: RequestInit) => new Promise<Response>((_resolve, reject) => { ... }));
```
Ca: `http:` → không gọi fetch; host lạ ở hop 2 → dừng; `goo.gl/x` (không `/maps/`) → `ok:false`; > 3 hop; timeout (`hangingFetch` + `vi.advanceTimersByTimeAsync`); 404; consent `continue`; khi tới host Google **không** fetch đích (đếm `fetch` = số hop); `method: "HEAD"`, `redirect: "manual"` trong init.

---

### `apps/web/src/composition/server/maps-handlers.ts` (`handleMapsResolve`) + test

**Analog:** `composition/server/auth-handlers.ts` `handleChangePassword` dòng 345–356 (Origin → phiên → body đặt tên cứng) và `readJsonObject` dòng 38–49:
```typescript
export async function handleChangePassword(request: NextRequest, deps: ServerDeps): Promise<NextResponse> {
  if (!checkSameOrigin(request, deps.env.appOrigin)) return crossOrigin(deps);

  const session = readSession(
    (name) => request.cookies.get(name)?.value,
    Math.floor(deps.nowMs() / 1000),
    deps.secure,
  );

  if (session.state === "invalid") return sessionEnded(deps);
  if (session.state !== "fresh") return errorEnvelope(401, SESSION_EXPIRED, deps.nowMs());

  const picked = pickStrings(await readJsonObject(request), ["currentPassword", "newPassword"]);

  if (picked === null) return invalidBody(deps);
```
Áp dụng thứ tự: method `POST` (khác → `errorEnvelope(405, "Bff.MethodNotAllowed")`, như `bff.ts` dòng 117) → `checkSameOrigin` → phiên (`none` → 401 `Auth.Unauthorized`; `stale|invalid` → 401 `session.expired`, **không** xóa cookie) → `{ url: string }` (≤ 2048) → `resolveShortMapsLink` → `successEnvelope({ url }, nowMs)` hoặc `errorEnvelope(422, "Maps.UnresolvableLink", nowMs)`. `readJsonObject`/`pickStrings` nên tách ra `server/json-body.ts` dùng chung thay vì chép (hiện là hàm private của `auth-handlers.ts`). Envelope đã có `no-store` + `nosniff` (`request-guards.ts` dòng 36–43).

**Test:** `// @vitest-environment node`, `makeRequest` từ `@/test/next-request` (dòng 27–58: `origin`, `cookies`, `body` object → JSON), cookie phiên bằng `bearerPair` của `@/test/be-auth-fixtures` như `bff.forward.test.ts` dòng 40–45. Ca: GET → 405; Origin lạ → 403 `Bff.CrossOrigin`; không cookie → 401; stale → 401 `session.expired`; body sai → 400; header `cache-control: no-store`; fetch không bị gọi ở mọi ca từ chối.

---

### `apps/web/src/app/api/maps/resolve/route.ts` (route vỏ mỏng)

**Analog:** `apps/web/src/app/api/auth/refresh/route.ts` dòng 1–7:
```typescript
import type { NextRequest } from "next/server";
import { handleRefresh } from "@/composition/server/auth-handlers";
import { serverDeps } from "@/composition/server/env";

export function POST(request: NextRequest) {
  return handleRefresh(request, serverDeps());
}
```
Chỉ export `POST` (Next tự trả 405 cho method khác, comment như `bff/[...path]/route.ts` dòng 5–6). Không import `@tripory/*/http` ở đây (self-test dòng 135).

---

### `apps/web/src/proxy.ts` + `proxy.test.ts` + `proxy-coverage.test.ts`

**Analog:** chính nó dòng 21–27:
```typescript
export const PROTECTED_PREFIXES = ["/itineraries/mine", "/settings"] as const;
...
const isProtected = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
```
Áp dụng RESEARCH Pattern 15: thêm `PROTECTED_PATTERNS = [/^\/itineraries\/[^/]+\/edit(?:\/|$)/] as const`, export `isProtectedPath(pathname)` (prefix **hoặc** pattern), dùng ở `proxy()` dòng 58. **Không** thêm prefix `/itineraries` (Phase 5 có `/itineraries/[id]` công khai).

**Test coverage:** `proxy-coverage.test.ts` dòng 36–56 đổi `isProtected` cục bộ (dòng 36–37) sang `import { isProtectedPath } from "./proxy"`; `listPages("(dashboard)")` đệ quy nên tự thấy `(shell)/…` và `(editor)/itineraries/[id]/edit` (→ `/itineraries/x/edit`, `toUrl` dòng 22–33 đã bỏ `(group)`). Thêm ca `/itineraries/x` **không** bị gate. `proxy.test.ts`: ca redirect `/itineraries/abc/edit` → `/login?next=…`.

---

### `apps/web/src/app/(dashboard)/(shell)/*` (chuyển) và `(editor)/*` (mới)

**Analog:** `apps/web/src/app/(dashboard)/layout.tsx` dòng 1–15:
```tsx
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { DashboardSessionGate } from "@/modules/identity/ui/dashboard-session-gate";
import Loading from "./loading";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Gate đọc cookie nên phải nằm trong Suspense (Cache Components); fallback dùng chính skeleton của loading.tsx.
  return (
    <AppShell variant="dashboard">
      <Suspense fallback={<Loading />}>
        <DashboardSessionGate loading={<Loading />}>{children}</DashboardSessionGate>
      </Suspense>
    </AppShell>
  );
}
```
- `(shell)/layout.tsx`: nguyên file trên (git mv). Chuyển cùng `loading.tsx`, `error.tsx`, `error.test.tsx`, `loading.test.tsx`, `itineraries/mine/*`, `settings/password/*` vào `(shell)/`. Xóa `(dashboard)/layout.tsx` cũ (hai layout cùng cấp sẽ lồng nhau và kéo AppShell vào editor).
- `(editor)/layout.tsx`: bỏ `AppShell`, giữ `Suspense` + `DashboardSessionGate`, fallback `EditorSkeleton` (= `(editor)/itineraries/[id]/edit/loading.tsx`). Root `min-h-dvh`.
- `(editor)/…/edit/error.tsx`: chép `(dashboard)/error.tsx` dòng 1–14 (`ErrorState variant="page"` + `onRetry={props.retry}`).

**`route-layouts.test.tsx`:** dòng 3 đổi import sang `./(dashboard)/(shell)/layout`; thêm ca `(editor)/layout` render children và **không** có `data-testid="shell"`. Giữ hai `vi.mock` dòng 6–15.

---

### `apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/page.tsx` (RSC)

**Analog style:** `(dashboard)/settings/password/page.tsx` (comment ngắn giải thích vì sao không/cần Suspense, `metadata`) + `composition/viewer.server.ts` `getViewer` (dòng 20–24, chỉ gọi trong Suspense — gate layout đã bọc). Logic: RESEARCH Pattern 1 (`await params`, `parseItineraryId` null → `notFound()`, `getViewer()`, `key={viewer?.id ?? "guest"}`). Không có QueryClient server, không gọi BE ở đây (Pitfall 11).

**Test:** `vi.mock("@/composition/viewer.server")` như `route-layouts.test.tsx` dòng 12–15 mock gate; `vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }))`.

---

### `apps/web/src/app/(dashboard)/(shell)/itineraries/mine/page.tsx` (thay)

**Analog:** `(public)/login/page.tsx` dòng 1–14:
```tsx
export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  // LoginForm đọc `?next=` bằng useSearchParams nên phải nằm trong Suspense (docs use-search-params).
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
```
Áp dụng: `metadata.title` "Lịch trình của tôi", `<Suspense fallback={<MyItinerariesSkeleton />}><MyItinerariesView /></Suspense>`. Test `page.test.tsx` hiện có (chỉ kiểm EmptyState) phải viết lại theo view mới.

---

### `apps/web/src/components/submit-status.tsx` (chuyển) + `user-menu.tsx` (sửa)

**SubmitStatus:** git mv nguyên `modules/identity/ui/submit-status.tsx` + `.test.tsx` sang `components/`; sửa import ở `login-form.tsx` dòng 17, `register-form.tsx`, `change-password-form.tsx` dòng 18 thành `@/components/submit-status`. Không đổi API, giữ `COLD_START_MESSAGE`.

**UserMenu:** `components/user-menu.tsx` dòng 23–45. Thêm `compact?: boolean` vào `UserMenuProps` (dòng 23): khi `compact` bỏ `span` tên (dòng 42–44) và chevron (dòng 45), giữ `aria-label`. Hai `DropdownMenuLinkItem render={<Link … />}` (dòng 55, 69) nhận `onNavigate` từ `NavigationGuardContext` (đặt ở `apps/web/src/components/navigation-guard.tsx`, mặc định no-op) — Pitfall 12. Test theo `user-menu.test.tsx` dòng 7–18 (mock `next/navigation`, `identity.client`, `use-session-actions`): ca `compact` không có text tên; ca guard chặn → `preventDefault` và gọi `ask(href)`.

---

### `apps/web/src/lib/feedback/error-messages.ts` (thêm mã)

**Analog:** chính nó dòng 33–45 (mục `// Itinerary / Waypoint` đã có `Itinerary.NotFound/Forbidden/CannotPublishEmpty/InvalidReorderList`, `Coordinate.*`). Thêm theo quy ước đầu file (dòng 1–4): mã giới hạn động `ItineraryTitle.TooLong`, `ItineraryDescription.TooLong`, `WaypointName.TooLong` **không** thêm key (dùng nguyên message BE); `Maps.UnresolvableLink`, `Bff.*` mới nếu có → câu riêng hoặc `GENERIC_ERROR_MESSAGE`. Copy hiện có của `Itinerary.InvalidReorderList` ("…Vui lòng tải lại rồi thử lại.") không dùng cho D-37: reorder đặt `errorToast: false` và tự `notify.info("Danh sách đã thay đổi, đã tải lại")`. Đối chiếu copy `CannotPublishEmpty` với UI-SPEC §PublishDialog trước khi giữ.

---

### Form organism (`create-itinerary-dialog`, `trip-info-dialog`, `waypoint-form-dialog`, `publish-dialog`, `delete-itinerary-dialog`) + test

**Analog:** `modules/identity/ui/change-password-form.tsx` dòng 22–75 — RHF + Zod, `meta.feedback.errorToast: false`, map lỗi BE vào ô hoặc InlineAlert, chặn gửi hai lần bằng ref:
```tsx
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const changePassword = identity.useChangePassword({ meta: { feedback: { errorToast: false } } });
  ...
  const handle = form.handleSubmit(async ({ currentPassword: current, newPassword: next }) => {
    setAlert(null);
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
    } catch (error) {
      const mapped = mapChangePasswordError(error);
      if (!mapped) return;
      const fields = Object.entries(mapped.fieldErrors) as [keyof ChangePasswordValues, string][];
      fields.forEach(([name, message], index) => {
        form.setError(name, { message }, { shouldFocus: index === 0 });
      });
      ...
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (submittingRef.current) { event.preventDefault(); return; }
    submittingRef.current = true;
    void handle(event).finally(() => { submittingRef.current = false; });
  };
```
Và nút + cold start dòng 109–119:
```tsx
          <Button className="w-full" loading={isSubmitting} loadingLabel="Đang lưu…" ref={setSubmitButton} size="lg" type="submit">
            Đổi mật khẩu
          </Button>
          <SubmitStatus pending={isSubmitting} />
```
Vỏ ô: `modules/identity/ui/auth-fields.tsx` dòng 20–39 (`FormField invalid` + `FormFieldLabel` + `FormFieldError match`) — tạo `modules/itinerary/ui/form-field-row.tsx` tương tự (không import chéo `modules/identity`). Áp dụng:
- `CreateItineraryDialog`: `defaultValues: { title: "Chuyến đi mới" }`, `onOpenAutoFocus`/effect `select()` input; thành công `router.push(`/itineraries/${created.id}/edit`)` và đặt cờ "vào từ danh sách" (RESEARCH Pattern 15 cuối).
- `TripInfoDialog`/`WaypointFormDialog`: Dialog từ `md`, Sheet `modal defaultSnap="expanded"` dưới `md`; `disablePointerDismissal`; đang gửi không đóng được; bản nháp `draft-storage` (D-36) + `InlineAlert variant="info"`.
- `PublishDialog`/`DeleteItineraryDialog`: không form, `initialFocus` vào nút "Hủy" (D-39, D-42); `Button variant="danger"`.

**Test:** theo `change-password-form.test.tsx` dòng 11–52: `vi.hoisted` + mock `@/composition/itinerary.client` bằng `createItineraryHooks({ repository: { … vi.fn } })` thật (dòng 20–29 làm với identity), bọc `QueryClientProvider client={makeQueryClient()}`, `userEvent.setup()`, `makeApiError({ kind: "http", status, code, message })` cho lỗi BE. Ca fake timers cho cold start dùng `vi.useFakeTimers({ shouldAdvanceTime: true })` như các test form Phase 3.

---

### `modules/itinerary/ui/{form-schemas,form-error-mapping}.ts` + test

**Analog schema:** `modules/identity/ui/form-schemas.ts` dòng 1–4 (comment nguồn copy), 15–24 (hằng copy), 39–44 (đếm độ dài trên giá trị **thô**):
```typescript
// Họ tên: BE đếm độ dài trước khi trim (RESEARCH §Họ tên) nên đếm trên giá trị thô, kể cả khoảng trắng cuối.
const fullNameField = z.string().superRefine((value, ctx) => {
  if (value.trim().length === 0) ctx.addIssue({ code: "custom", message: FULL_NAME_REQUIRED });
  else if (value.length > FULL_NAME_MAX_LENGTH) ctx.addIssue({ code: "custom", message: FULL_NAME_TOO_LONG });
});
```
Áp dụng (RESEARCH Pitfall 10): tiêu đề 1–100, mô tả ≤ 1000, phụ đề ≤ 100, tên waypoint 1–200, địa chỉ ≤ 500, ghi chú ≤ 2000, ảnh bìa `https://` ≤ 500, `startDate` qua `parseCalendarDate` hoặc rỗng → `null`. Export `*_FIELDS` như dòng 50–52.

**Analog mapping:** `modules/identity/ui/form-error-mapping.ts` dòng 50–79 (`mapFormError(error, fields, table)` generic) và bảng `Map<string, Target<F>>` dòng 85–120. Nên tách `mapFormError` + `FormErrorMapping` ra `apps/web/src/lib/feedback/` (dùng chung hai module) thay vì chép; bảng mã → ô là theo từng form của itinerary (`ItineraryTitle.Empty` → `title`, `WaypointName.Empty` → `name`, `Coordinate.*` → `location`, `Itinerary.CannotPublishEmpty` → alert).

---

### Organism client không phải form (list, card, editor, header, tabs, list kéo thả, indicator…)

**Analog cấu trúc:** `components/user-menu.tsx` dòng 1–21 (`"use client"`, import `@tripory/ui-web` theo nhóm, `@/composition/*.client`), dòng 25–29 (JSDoc nêu D-xx và ngoại lệ có chủ đích). `components/app-header.tsx` dòng 15–16 cho header sticky:
```tsx
    <header className="sticky top-0 z-(--z-sticky) border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-header w-full max-w-content-lg items-center justify-between gap-stack-md px-page-inline sm:px-page-inline-md lg:px-page-inline-lg">
```
(`EditorHeader` chép khối này, đổi `z-sticky` sau Wave 0.)

**Analog listener toàn cục + cleanup (Activity-safe):** `modules/identity/ui/session-keeper.tsx` dòng 24, 78–90:
```tsx
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    ...
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("online", schedule);

    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("online", schedule);
    };
  }, [pathname]);
```
Áp dụng cho `pagehide` + `visibilitychange` (flush keepalive, D-32/D-50), `beforeunload` chỉ khi bẩn (RESEARCH §Code Examples), IntersectionObserver sentinel (Pattern 6), `ResizeObserver` đo chiều cao header truyền `insetTop`.

**Analog ref "giá trị mới nhất" cho listener đăng ký một lần:** `modules/identity/ui/session-effects.tsx` dòng 26–31 (`location` ref cập nhật trong effect không deps) — dùng cho `orderedIdsRef` của announcements dnd-kit và state đọc trong IntersectionObserver ổn định.

**Phần không có analog** (lấy RESEARCH): `MyItinerariesView` Pattern 6 + `router.replace("?status=…", { scroll: false })`; `WaypointList`/`SortableWaypointItem` Pattern 12 (`MouseSensor` + `TouchSensor` + `KeyboardSensor`, tay cầm `setActivatorNodeRef` + `data-base-ui-swipe-ignore`, `DragOverlay` portal `document.body`); `SaveIndicator` Pattern 13 (`useIsMutating({ mutationKey: itineraryKeys.write(id) })` + store lệnh lỗi); `EditorLayout` 4 slot (UI-SPEC). **Mâu thuẫn cần planner chốt:** UI-SPEC §Hằng tương tác ghi "dnd-kit PointerSensor" cho chuột; RESEARCH Pattern 12 + Anti-Patterns khuyên `MouseSensor` (PointerSensor nhận cả ngón tay, phá nhấn giữ 180ms). Theo RESEARCH.

**`EditorForbidden`/`NotFoundView`:** chép bố cục `app/not-found.tsx` dòng 10–25 (section căn giữa, `h1 text-display`, `p text-muted`, Link kiểu nút), **bỏ** `AppShell` (editor không có AppShell). Tách phần thân của `not-found.tsx` thành component dùng chung để client render khi BE 404 (RESEARCH Pattern 1).

**Test:** `vi.mock("next/navigation")` như `user-menu.test.tsx` dòng 14; mock `@/composition/itinerary.client` như form; `QueryClientProvider` + `makeQueryClient()`. Fake `IntersectionObserver` đặt ở `src/test/` theo `fake-broadcast-channel.ts`. `WaypointList` kéo bằng bàn phím trong `<StrictMode>` (spike Wave 0).

---

### Controller/adapter thuần (`pending-delete`, `leave-guard`, `draft-storage`, `dnd-announcements`, `entry-flag`) + test

**Analog:** `composition/session-events.client.ts` dòng 39–57, 59–68, 88–104 — `makeX(deps)` trả object method, state trong closure, idempotent, singleton chỉ ở cuối file nếu cần:
```typescript
export function makeSessionEvents(deps: SessionEventsDeps): SessionEvents {
  const listeners: Record<SessionEventName, Set<() => void>> = { ... };
  let expiredEmitted = false;
  ...
  return {
    emitExpired() {
      if (expiredEmitted) return;

      expiredEmitted = true;
      emit("expired");
    },
```
Áp dụng:
- `pending-delete.ts`: nguyên RESEARCH Pattern 9 (`finish` idempotent vì `notify.dismiss` gọi lại `onDismiss`, Pitfall 5). Deps tiêm `commit`, `showUndo`, `dismissToast`, `onChange`, `windowMs`. Test bằng `vi.useFakeTimers()`: commit sau 5000 ms đúng một lần; hoàn tác không gọi `commit`; xóa thứ hai commit cái thứ nhất; `flush` rồi `onDismiss` không commit lần hai.
- `draft-storage.ts`: deps `storage: Pick<Storage, "getItem" | "setItem" | "removeItem">`, `nowMs`; khóa `tripory:draft:v1:{viewerId}:{itineraryId}:{kind}`; đọc lại bằng Zod schema form (RESEARCH Pattern 18). Ghi khi `sessionEvents.on("expired", …)` — cách đăng ký/gỡ như `session-effects.tsx` dòng 38–55.
- `leave-guard.ts`: `shouldBlock()`, `ask(href)`, `run(action)` (Pattern 14); context React ở `components/navigation-guard.tsx`.
- `dnd-announcements.ts`: nguyên RESEARCH §Code Examples "Thông báo kéo thả tiếng Việt".

---

### `apps/web/src/test/*` (helper)

**Analog:** `apps/web/src/test/be-auth-fixtures.ts` (bản fixture riêng của app vì không import xuyên package bằng đường tương đối — comment ở `identity/src/infrastructure/fixtures.ts` dòng 4–5) và `fake-broadcast-channel.ts`/`fake-locks.ts`. Thêm `be-itinerary-fixtures.ts` (DTO + envelope), `fake-intersection-observer.ts` (giữ callback, có `trigger(isIntersecting)`), `fake-resize-observer.ts`. Không import `vitest` trong helper (quy ước `next-request.ts` dòng 1–2).

## Shared Patterns

### Kiểm Origin + phiên cho route handler
**Source:** `apps/web/src/composition/server/request-guards.ts` dòng 19–25, `auth-handlers.ts` dòng 345–356
**Apply to:** `maps-handlers.ts`
```typescript
export function checkSameOrigin(request: NextRequest, appOrigin?: string): boolean {
  const origin = request.headers.get("origin");

  if (origin !== null) return origin === (appOrigin ?? request.nextUrl.origin);
  if (request.method === "GET" || request.method === "HEAD") return true;

  return request.headers.get("sec-fetch-site") === "same-origin";
}
```
Chỉ nhận `POST` để không lọt nhánh "GET không Origin được qua".

### Envelope phản hồi
**Source:** `request-guards.ts` dòng 50–77 (`errorEnvelope(status, errorCode, nowMs)`, `successEnvelope(data, nowMs)`, cả hai `no-store` + `nosniff`, `message: null`)
**Apply to:** route `/api/maps/resolve`; client bóc bằng `createFetchHttpClient` như mọi API.

### Toast theo `meta.feedback`, lỗi form inline
**Source:** `composition/query-client.ts` dòng 20–39, `lib/feedback/mutation-feedback.ts`
**Apply to:** mọi mutation itinerary
```typescript
      onError: (error, _variables, _result, mutation) => {
        const decision = decideMutationError(error, mutation.meta?.feedback);
        if (decision) notify[decision.variant](decision.message);
      },
```
Form (tạo, metadata, waypoint, publish): `meta: { feedback: { errorToast: false } }` (mẫu `change-password-form.tsx` dòng 29). Thao tác nền (phụ đề, reorder, xóa, thêm ngày): để toast mặc định, riêng `InvalidReorderList` tự xử lý (D-37). Thành công xóa lịch trình/xuất bản: `successMessage` ("Đã xóa lịch trình", "Đã xuất bản lịch trình"). `session_expired` không bao giờ toast (dòng 18 của `mutation-feedback.ts`).

### Hook factory lắp một lần ở composition
**Source:** `composition/identity.client.ts`, `packages/identity/src/react/index.ts`
**Apply to:** `itinerary.client.ts`; UI chỉ import `@/composition/itinerary.client` và `@tripory/itinerary` (entry gốc), không bao giờ `@tripory/itinerary/http` (self-test `boundaries.test.ts` dòng 128).

### Listener toàn cục có cleanup (an toàn với `<Activity>`)
**Source:** `modules/identity/ui/session-keeper.tsx` dòng 78–90
**Apply to:** pending-delete flush, `beforeunload`, sentinel, ResizeObserver, `sessionEvents.on("expired")` của form. Flush DELETE nằm trong cleanup của `useEffect` (RESEARCH Pattern 9, Pitfall 2).

### Chặn gửi hai lần + cold start
**Source:** `change-password-form.tsx` dòng 35, 62–72, 109–119; `components/submit-status.tsx` (sau khi chuyển)
**Apply to:** mọi dialog có nút gửi (D-12, D-24).

### Test route/server thuần ở môi trường node
**Source:** `bff.forward.test.ts` dòng 1–55, `test/next-request.ts`
**Apply to:** `maps-resolve.test.ts`, `maps-handlers.test.ts`, `proxy*.test.ts`. Dòng đầu `// @vitest-environment node`; `afterEach(() => vi.useRealTimers())`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/itinerary/src/domain/location-input.ts` | utility (parser) | transform | Chưa có parser URL nào; dùng RESEARCH Pattern 7 (bảng mẫu + thứ tự ưu tiên) |
| `apps/web/src/composition/server/maps-resolve.ts` | service | request-response | Chưa có route gọi host ngoài BE, chưa có theo redirect thủ công; RESEARCH Pattern 8 |
| `apps/web/src/modules/itinerary/ui/pending-delete.ts` | controller | event-driven | Chưa có hoãn commit có hoàn tác; RESEARCH Pattern 9 (style `makeSessionEvents`) |
| `apps/web/src/modules/itinerary/ui/{waypoint-list,sortable-waypoint-item}.tsx` | component | event-driven | Chưa có dnd-kit; RESEARCH Pattern 12 + spike StrictMode Wave 0 |
| `apps/web/src/modules/itinerary/ui/leave-guard.ts` + `components/navigation-guard.tsx` | controller | event-driven | Next 16.4 không có navigation guard; RESEARCH Pattern 14 (`Link onNavigate`) |
| `apps/web/src/modules/itinerary/ui/draft-storage.ts` | adapter | file-I/O (sessionStorage) | Chưa có storage adapter; RESEARCH Pattern 18 |

Phần infinite query/optimistic trong `packages/itinerary/src/react/index.ts` cũng không có analog logic (identity chỉ có `useQuery`/`useMutation` đơn); style lấy từ identity, logic từ RESEARCH Pattern 2, 5.

## Metadata

**Analog search scope:** `packages/{identity,itinerary,shared-kernel,api-client,ui-web,design-tokens,config}`, `apps/web/src/{app,components,composition,lib,modules,test}`, `apps/web/src/proxy*.ts`, `pnpm-workspace.yaml`
**Files scanned:** khoảng 60 file đọc trực tiếp, 280 file liệt kê qua `git ls-files`
**Pattern extraction date:** 2026-10-24
