---
phase: 04-itinerary-crud-editor
plan: 09
subsystem: itinerary-react-composition
tags: [react-query, hook-factory, scope, optimistic-update, composition, keepalive, wave-5]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-08: port ItineraryRepository/ShortLinkResolver, repository HTTP, subpath ./http; 04-05: helper test; 04-06: biến đổi thuần của domain (applyDayOrder, withoutWaypoint, withDaySubtitle, withDay, appendWaypoint)"
provides:
  - "`createItineraryHooks({ repository, shortLinks })` ở `@tripory/itinerary/react`: `useMyItineraries`, `useItinerary` và 11 mutation hook"
  - "`itineraryKeys` (all, lists, list, detail, write, remove) và `ITINERARY_PAGE_SIZE = 12`"
  - "`appHttp` (base `/api`, bọc refresh) và `bffUnloadHttp` (base `/api/bff`, trần, cho DELETE keepalive) trong `http.client.ts`"
  - "`itinerary` (hook đã lắp) và `itineraryUnload.deleteWaypoint` trong `composition/itinerary.client.ts`"
affects: [04-11, 04-12, 04-13, 04-14, 04-15, 04-16, 04-17, 04-18, 04-19]

tech-stack:
  added: ["@tripory/shared-kernel (workspace:*) vào apps/web"]
  patterns: [shared-write-mutation-key-and-scope, snapshot-optimistic-rollback, settle-on-last-write, hook-level-callbacks-then-caller-callbacks]

key-files:
  created:
    - packages/itinerary/src/react/keys.test.ts
    - apps/web/src/composition/itinerary.client.ts
    - apps/web/src/modules/itinerary/ui/itinerary-hooks.test.tsx
  modified:
    - packages/itinerary/src/react/index.ts
    - packages/itinerary/src/exports.test.ts
    - apps/web/src/composition/http.client.ts
    - apps/web/src/composition/http.client.test.ts
    - apps/web/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Mọi lệnh ghi của editor đi qua một helper nội bộ `useWriteMutation` (chung `mutationKey ['itinerary','write',id]` và `scope { id: 'itinerary:'+id }`), nên không có lệnh ghi nào quên scope."
  - "`useDeleteItinerary` dùng key `remove()` riêng, không scope: xóa cả lịch trình không phải lệnh ghi của editor."
  - "Reorder gọi thẳng `repository.reorderWaypoints` thay vì use case: use case cần snapshot, mà lệnh nằm trong hàng đợi scope nên cache lúc chạy có thể đã khác lúc kéo; caller kiểm bằng `isValidDayOrder` trước khi mutate."
  - "`settle` invalidate khi `isMutating(write) <= 1` (mutation hiện tại còn được đếm trong `onSettled`), cả chi tiết lẫn danh sách."
  - "`useItinerary` trả `refetchOnWindowFocus: false` khi còn lệnh ghi của itinerary đó, ngược lại `'always'`, để refetch không đè bản optimistic."
  - "`@tripory/shared-kernel` thêm làm dependency của apps/web (cần cho type `ItineraryId` ở composition và id mẫu trong test); không đụng allowlist ESLint."

patterns-established:
  - "Callback cấp hook chạy logic cache rồi gọi `options?.onX` sau; callback cấp `mutate()` không còn là nơi giữ side effect."
  - "Test hành vi hook ở app với repository giả và `makeQueryClient()` thật, vì package chỉ được `vitest`."

requirements-completed: []

duration: ~35 phút
completed: 2026-10-28
---

# Phase 4 Plan 9: Hook factory itinerary + composition Summary

**`createItineraryHooks` với infinite query 12 mục/trang, chi tiết `staleTime: 0`, 11 mutation chạy nối đuôi theo `scope` (optimistic có snapshot, rollback, chỉ lệnh cuối mới refetch), lắp đúng một lần trong composition cùng `appHttp` và `bffUnloadHttp` (DELETE keepalive không refresh)**

> `requirements-completed` để trống, cùng cách làm với 04-02..04-08: ITIN-* là hành vi người dùng, do các plan UI sau giao. Plan này chỉ cấp nguồn dữ liệu và lệnh ghi.

## Commits

1. **Task 04-09-01** — `b5bd3e3` `feat(04-09): hook factory createItineraryHooks voi keys, infinite query va 12 mutation`
2. **Task 04-09-02** — `61d9fe2` `feat(04-09): lap appHttp, bffUnloadHttp va itinerary.client trong composition`
3. **Task 04-09-03** — `39e0555` `test(04-09): khoa hanh vi hook itinerary (scope, optimistic, rollback, settle)`

## Accomplishments

- **Task 1:** `react/index.ts` có `itineraryKeys`, `ITINERARY_PAGE_SIZE`, `useMyItineraries` (`initialPageParam: 1`, `getNextPageParam` theo `hasNextPage`), `useItinerary`, 11 mutation theo đúng contract trong plan. `exports.test.ts` khóa ba tầng entry (domain ở gốc; adapter ở `./infrastructure`; hook ở `./react`; không lẫn nhau). `keys.test.ts` khóa khóa query và cỡ trang.
- **Task 2:** `BrowserHttp` thêm `appHttp` và `bffUnloadHttp` kèm JSDoc, singleton xuất cả hai. `itinerary.client.ts` gọi factory một lần, `repository` dùng `unloadHttp: bffUnloadHttp`. Hai test mới: `appHttp` refresh rồi phát lại khi 401; `bffUnloadHttp` gặp 401 thì không gọi `/api/auth/refresh` và không phát `onSessionExpired`.
- **Task 3:** 14 test hành vi hook thật (không mock React Query): DELETE rồi reorder tuần tự theo scope, `useIsMutating` đếm cả lệnh xếp hàng, optimistic và rollback, `options.onError` thấy cache đã hoàn lại, callback cấp hook vẫn chạy sau unmount, xóa/phụ đề/thêm ngày optimistic, hai reorder chỉ một `getById`, thêm waypoint chèn vào cuối ngày, infinite query (trang 1 cỡ 12, trang 2, hết trang, mỗi status một key), xóa lịch trình (gỡ chi tiết, invalidate danh sách), tạo lịch trình seed cache, resolve link không dùng khóa ghi.
- **Mitigation threat model:** T-04-21 (editor chỉ fetch qua `bffHttp`/`appHttp` có refresh; unload dùng client trần có chủ đích), T-04-22 (scope chung + test DELETE trước reorder), T-04-23 (khóa theo id; `queryClient.clear()` của Phase 3 giữ nguyên).

## Verification

- `pnpm --filter @tripory/itinerary test|typecheck|lint`: 13 file, 304 test xanh.
- `pnpm --filter @tripory/web test -- http.client`: 21 test xanh; `-- itinerary-hooks`: 14 test xanh; `typecheck` và `lint` của web xanh.
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 63 file, 1018 test xanh; `@tripory/config` 114 test xanh (không sửa `boundaries.mjs`).
- Acceptance: `scope: { id: \`itinerary:${id}\` }` và `staleTime: 0` có trong `react/index.ts`; `bffUnloadHttp` có trong `http.client.ts`; `createItineraryHooks(` chỉ gọi ở `itinerary.client.ts`; test hook không import `itinerary/http`.

## Deviations from Plan

### TDD gate của Task 3

Task 3 mang `tdd="true"` nhưng đứng sau Task 1 theo thứ tự plan, nên hook đã tồn tại khi viết test và một commit RED thuần không thể có. Thay vào đó đã chứng minh test có răng bằng đột biến: tạm xóa dòng `scope` khỏi `react/index.ts` thì 3 test fail (tuần tự theo scope, đếm lệnh xếp hàng, hai reorder một GET); sau đó khôi phục file (không commit đột biến). Chỉ có commit `test(04-09)`, không có `feat(04-09)` đi kèm cho task này.

Ngoài ra: None - các task còn lại làm đúng như plan. Ghi chú: `pnpm install --offline` được chạy để liên kết `@tripory/shared-kernel` vào apps/web (cập nhật `pnpm-lock.yaml`, chỉ thêm một importer link).

Ghi chú môi trường: `pnpm lint|typecheck|test` ở gốc vẫn crash `3221226505` trên máy này; dùng `turbo.exe` trực tiếp và `pnpm --filter`.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check

**Trạng thái: PASSED.**

- Các file tạo mới (`keys.test.ts`, `itinerary.client.ts`, `itinerary-hooks.test.tsx`) và file sửa đều tồn tại.
- Ba commit `b5bd3e3`, `61d9fe2`, `39e0555` có trong `git log` của `phase_4`.
