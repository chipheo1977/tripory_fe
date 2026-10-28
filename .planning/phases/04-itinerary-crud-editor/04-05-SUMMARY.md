---
phase: 04-itinerary-crud-editor
plan: 05
subsystem: web-test-infra
tags: [vitest, fixtures, intersection-observer, resize-observer, dnd-kit, strict-mode, submit-status, form-error, wave-0]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-02: dnd-kit 6.3.1 trong catalog và `apps/web`"
provides:
  - "`installFakeIntersectionObserver()` (instances, trigger, restore) và `installFakeResizeObserver()` (resize, restore) dùng chung cho test app"
  - "Fixture JSON BE itinerary: `itineraryDetailJson`, `summaryJson`, `summaryPageJson`, `itineraryEnvelope`, hằng id"
  - "`SubmitStatus` + `COLD_START_MESSAGE` ở `apps/web/src/components/submit-status.tsx`"
  - "`mapFormError`, `FORM_ALERT`, `FormErrorTarget`, `FormErrorMapping` ở `@/lib/feedback`"
  - "Kết quả spike A7: dnd-kit 6.3.1 sắp lại được bằng bàn phím trong `<StrictMode>` dưới jsdom"
affects: [04-06, 04-11, 04-17, 04-19, 04-20, 04-21]

tech-stack:
  added: []
  patterns: [fake-global-with-restore, shared-component-move, generic-form-error-policy]

key-files:
  created:
    - apps/web/src/test/fake-intersection-observer.ts
    - apps/web/src/test/fake-resize-observer.ts
    - apps/web/src/test/be-itinerary-fixtures.ts
    - apps/web/src/test/dnd-strict-mode.test.tsx
    - apps/web/src/lib/feedback/form-error.ts
    - apps/web/src/lib/feedback/form-error.test.ts
  modified:
    - apps/web/src/test/test-helpers.test.ts
    - apps/web/src/lib/feedback/index.ts
    - apps/web/src/modules/identity/ui/form-error-mapping.ts
    - apps/web/src/modules/identity/ui/login-form.tsx
    - apps/web/src/modules/identity/ui/register-form.tsx
    - apps/web/src/modules/identity/ui/change-password-form.tsx
  moved:
    - "apps/web/src/modules/identity/ui/submit-status.tsx -> apps/web/src/components/submit-status.tsx"
    - "apps/web/src/modules/identity/ui/submit-status.test.tsx -> apps/web/src/components/submit-status.test.tsx"

key-decisions:
  - "`mapFormError` export thêm `FORM_ALERT` và `FormErrorTarget` để module của form khai báo bảng map mà không phải biết chuỗi 'alert'; identity import lại bằng alias `ALERT`/`Target`, chữ ký export của identity không đổi."
  - "Fake observer gán thẳng `globalThis.X` và `restore()` trả bản gốc (kể cả undefined); không import `vitest` nên dùng được cả môi trường node lẫn jsdom."
  - "Spike A7 mock `Element.prototype.getBoundingClientRect` chỉ cho `LI` theo chỉ số trong DOM; các phần tử khác gọi hàm gốc."

patterns-established:
  - "Test dnd-kit bàn phím trong jsdom: mock rect `li` theo vị trí DOM (cao 40, cách 50), focus tay cầm, ' ' / ArrowDown / ' '."

requirements-completed: []

duration: ~15 min
completed: 2026-10-28
---

# Phase 4 Plan 5: Helper test app, SubmitStatus dùng chung, mapFormError generic, spike dnd-kit Summary

**Fake IntersectionObserver/ResizeObserver, fixture JSON BE itinerary, `SubmitStatus` chuyển sang `components`, `mapFormError` generic ở `lib/feedback`, và spike chứng minh dnd-kit 6.3.1 sắp lại được bằng bàn phím trong React StrictMode**

> Plan hạ tầng Wave 0 nên `requirements-completed` để trống (frontmatter plan liệt kê ITIN-01, ITIN-02, ITIN-08, nhưng hành vi người dùng do các plan UI sau giao; cùng cách làm với 04-02..04-04).

## Commits

1. **Task 04-05-01** — `0ef865a` `test(04-05): thêm fake IntersectionObserver, ResizeObserver và fixture JSON itinerary`
2. **Task 04-05-02** — `3a8e9e7` `refactor(04-05): chuyển SubmitStatus sang components và tách mapFormError ra lib/feedback` (chỉ chứa 2 lệnh `git mv`, xem Deviations)
3. **Task 04-05-02** — `a27b756` `refactor(04-05): tách mapFormError ra lib/feedback và nối import SubmitStatus mới`
4. **Task 04-05-03** — `0973d7e` `test(04-05): spike dnd-kit 6.3.1 trong StrictMode, sắp lại bằng bàn phím`

## Accomplishments

- **Helper test:** `installFakeIntersectionObserver` giữ callback, `targets`, `options`; `trigger(isIntersecting)` gọi mọi observer chưa disconnect, mỗi target một entry. `installFakeResizeObserver.resize(target, height)` gọi callback với `contentRect.height` và `borderBoxSize[0].blockSize`. `test-helpers.test.ts` thêm 9 ca (tổng 25): trigger, disconnect không gọi, restore, resize đúng target, fixture `days[0].dayNumber === 3`, `orderIndex` lộn, `subtitle: ""`, `updatedAt` 7 chữ số lẻ, cờ trang `/mine`.
- **Fixture:** `be-itinerary-fixtures.ts` ghi nguồn BE, không có chữ `vitest`, id là GUID bịa và tên địa điểm công khai (T-04-10).
- **SubmitStatus:** `git mv` giữ lịch sử (rename 100%), ba form identity import `@/components/submit-status`, không còn file ở `modules/identity/ui`.
- **mapFormError:** phần generic chuyển nguyên văn sang `lib/feedback/form-error.ts`, export qua `lib/feedback/index.ts`. Test identity cũ (`form-error-mapping.test.ts`) chạy nguyên không sửa và xanh (T-04-11). `form-error.test.ts` thêm 11 ca generic bằng form giả hai ô (null cho session_expired/aborted, câu chung, mã trong bảng → ô/alert, mã lạ, fieldErrors khớp/lạ/hỗn hợp, `__proto__`, mã `toString`).
- **Spike A7 (xanh, không phải `it.skip`):** trong `<StrictMode>`, `DndContext` + `KeyboardSensor(sortableKeyboardCoordinates)` + `SortableContext(verticalListSortingStrategy)` + `useSortable` với `setActivatorNodeRef` trên `button`: Space, ArrowDown, Space đổi `A,B,C` thành `B,A,C`; Escape giữa chừng giữ `A,B,C`.

## Verification

- `turbo.exe run lint typecheck test` (toàn repo): 24/24 task thành công; `@tripory/web` 62 file, 1002 test xanh.
- Acceptance: `Test-Path modules/identity/ui/submit-status.tsx` False, `components/submit-status.tsx` True; `git grep "identity/ui/submit-status"` rỗng; `export function mapFormError` có trong `form-error.ts`; `be-itinerary-fixtures.ts` không chứa `vitest`; `StrictMode` và `KeyboardSensor` có trong test spike.
- `pnpm --filter @tripory/web exec tsc --noEmit` xanh (dnd-kit `.d.ts` qua nhờ `skipLibCheck`). Không đụng `boundaries.mjs`.

## Rủi ro A7

Đã đo: **không còn rủi ro đã biết ở mức bàn phím + jsdom**. Spike xanh ngay lần đầu, không cần mock `coordinateGetter` tự viết, không cần `it.skip`. Phạm vi chưa kiểm được trong jsdom và vẫn thuộc UAT máy thật (04-19): kéo chuột/cảm ứng, `DragOverlay` portal, `data-base-ui-swipe-ignore` với Drawer (A8). Không có `ResizeObserver` trong jsdom mà dnd-kit vẫn chạy (dnd-kit tự kiểm sự tồn tại).

## Deviations from Plan

1. **[Hình envelope] Plan ghi `{ isSuccess: true, data, errorCode: null, message: null, ... }`, nhưng cũng yêu cầu 'theo đúng hình envelope của `be-auth-fixtures.ts`'.** Hai điều mâu thuẫn; chọn hình thật của fixture auth `{ status: "success", data, message: null, errorCode: null, timestamp }` vì đó là contract BE đã được kiểm ở Phase 3. `successEnvelope` của file auth không export nên `itineraryEnvelope` tự dựng cùng hình.
2. **[Lỗi thao tác] Commit `3a8e9e7` chỉ chứa 2 lệnh rename.** Lệnh `git add` gộp thất bại toàn bộ vì có đường dẫn đã bị `git mv` (`pathspec ... did not match`), nên commit đầu thiếu phần sửa import và `mapFormError`. Đã làm commit bổ sung `a27b756` (không amend theo quy tắc git). Ở `3a8e9e7` riêng lẻ, 3 form identity chưa import đúng; trạng thái cuối cùng (HEAD) nhất quán và xanh.
3. **[Rule 1 - Bug] `FakeIO.options` optional làm lệch kiểu với interface instance:** sửa `options?:` trong kiểu `FakeIntersectionObserverInstance` để `tsc` xanh.
4. Bỏ chữ `vitest` khỏi comment đầu `be-itinerary-fixtures.ts` vì tiêu chí acceptance dùng `Select-String` trên chính chữ đó.
5. `pnpm lint|typecheck|test` ở gốc vẫn crash `3221226505` trên máy này (đã ghi ở 04-02); dùng `turbo.exe` trực tiếp và `pnpm --filter`.

## Known Stubs

None.

## Threat Flags

None. T-04-10: fixture chỉ có GUID và tên mẫu. T-04-11: test identity cũ không đổi và xanh sau refactor.

## Self-Check

**Trạng thái: PASSED.**

- Có đủ file created/modified trong `key-files`; `submit-status.tsx` ở vị trí mới, vị trí cũ không còn.
- Commit `0ef865a`, `3a8e9e7`, `a27b756`, `0973d7e` có trong `git log`.
