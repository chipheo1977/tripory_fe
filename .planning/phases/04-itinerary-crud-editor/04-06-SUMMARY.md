---
phase: 04-itinerary-crud-editor
plan: 06
subsystem: itinerary-domain
tags: [domain, tdd, calendar-date, day-range, permissions, optimistic-updates, immutable, wave-2]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-02: packages/itinerary có zod, peer react và react-query, barrel domain rỗng"
provides:
  - "Type aggregate: `Itinerary`, `ItinerarySummary`, `Waypoint`, `ItineraryDay`, `DayView`, `Page<T>`, `StatusFilter`, `STATUS_FILTERS`, `parseStatusFilter`"
  - "`CalendarDate`, `parseCalendarDate`, `formatCalendarDateVi` (không qua `Date` local)"
  - "`buildDayRange`, `nextDayNumber`, `waypointsOfDay` (dải ngày thưa, D-27/D-28)"
  - "`canEdit`, `canPublish` (T-04-12, D-45)"
  - "Biến đổi bất biến: `moveItem`, `isSameOrder`, `isValidDayOrder`, `applyDayOrder`, `withoutWaypoint`, `appendWaypoint`, `withDaySubtitle`, `withDay`"
affects: [04-07, 04-08, 04-09, 04-10, 04-11, 04-12]

tech-stack:
  added: []
  patterns: [pure-domain-with-table-tests, frozen-immutable-transform, stable-sort-by-day-order]

key-files:
  created:
    - packages/itinerary/src/domain/itinerary.ts
    - packages/itinerary/src/domain/itinerary.test.ts
    - packages/itinerary/src/domain/calendar-date.ts
    - packages/itinerary/src/domain/calendar-date.test.ts
    - packages/itinerary/src/domain/day-range.ts
    - packages/itinerary/src/domain/day-range.test.ts
    - packages/itinerary/src/domain/permissions.ts
    - packages/itinerary/src/domain/permissions.test.ts
    - packages/itinerary/src/domain/updates.ts
    - packages/itinerary/src/domain/updates.test.ts
    - packages/itinerary/src/domain/test-fixtures.ts
  modified:
    - packages/itinerary/src/domain/index.ts

key-decisions:
  - "`applyDayOrder` trả nguyên lịch trình (cùng tham chiếu) khi thứ tự không hợp lệ, `withoutWaypoint` khi id lạ, `withDay` khi ngày đã có: cache không bị ghi dữ liệu hỏng và React Query không thấy thay đổi giả."
  - "`appendWaypoint` bỏ `orderIndex` của đầu vào và gán bằng số điểm đang có trong ngày (BE cũng đặt điểm mới ở cuối)."
  - "`withDaySubtitle` cắt khoảng trắng như `SetSubtitle` của BE, giữ `distanceKm` cũ vì BE không tính lại km khi đổi phụ đề."
  - "Dữ liệu mẫu dùng chung ở `domain/test-fixtures.ts`, không export qua barrel nên không lộ ra API công khai."

patterns-established:
  - "Biến đổi cache thuần: trả bản mới `Object.freeze` ở cấp aggregate, mảng và phần tử mới; sắp lại bằng sort ổn định theo (dayNumber, orderIndex) giống mapper."

requirements-completed: []

duration: ~12 min
completed: 2026-10-28
---

# Phase 4 Plan 6: Domain itinerary Summary

**Tầng domain thuần cho `packages/itinerary`: type aggregate, `CalendarDate` qua `Date.UTC`, dải ngày thưa, `canEdit`/`canPublish` và tám biến đổi bất biến cho optimistic update, tất cả có test bảng**

> Plan nền tảng domain nên `requirements-completed` để trống (frontmatter plan liệt kê ITIN-01, 03, 04, 08, 11, 13, nhưng hành vi người dùng do các plan application/UI sau giao; cùng cách làm với 04-02..04-05).

## Commits

1. **Task 04-06-01 RED** — `ce57c98` `test(04-06): thêm test failing cho StatusFilter, CalendarDate, dải ngày, quyền`
2. **Task 04-06-01 GREEN** — `ff6b5f1` `feat(04-06): domain itinerary, CalendarDate, dải ngày thưa, canEdit và canPublish`
3. **Task 04-06-02 RED** — `45e37a7` `test(04-06): thêm test failing cho biến đổi bất biến optimistic`
4. **Task 04-06-02 GREEN** — `c21484a` `feat(04-06): biến đổi bất biến cho optimistic update`

## Accomplishments

- **Type và StatusFilter:** `parseStatusFilter` rơi về `'all'` với null, undefined, rỗng, sai hoa thường (`'DRAFT'`), có khoảng trắng (D-03).
- **CalendarDate:** regex `YYYY-MM-DD` rồi so lại từng trường UTC của `Date.UTC(y, m-1, d)`; bắt 29/02 năm không nhuận (kể cả 1900), tháng 0/13, 31/04, ngày 0, thiếu số 0 đệm, có phần giờ. `formatCalendarDateVi('2026-10-12')` = `12/10/2026`. Không có `new Date()` không tham số (D-26).
- **Dải ngày:** `buildDayRange` vẽ liền Ngày 1..max (max lấy cả từ `days` lẫn `waypoints`, tối thiểu 1), ngày thưa có `subtitle`/`distanceKm` null và `waypoints` rỗng; `nextDayNumber` = độ dài dải + 1.
- **Quyền:** `canEdit` true chỉ khi viewer khác null và bằng `ownerId` (T-04-12); `canPublish` false khi đã xuất bản, không có waypoint, hoặc mọi waypoint nằm trong `pendingIds` (D-45).
- **Biến đổi bất biến:** tám hàm trả bản mới đã freeze (aggregate, mảng, waypoint mới), có ca kiểm đầu vào không bị sửa (`JSON.stringify` trước/sau) và `Object.isFrozen`. `isValidDayOrder` chặn rỗng, thiếu, thừa, trùng, id ngày khác, id lạ (T-04-13). `updates.ts` không import dnd-kit.

## Verification

- `pnpm --filter @tripory/itinerary test`: 6 file, 82 test xanh; `lint` và `typecheck` xanh.
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 62 file, 1002 test xanh.
- Acceptance: `Date.UTC` có trong `calendar-date.ts`, `new Date()` không có; `export const canPublish` có trong `permissions.ts`; `@dnd-kit` không có trong `updates.ts`; test `Object.isFrozen` có. Không đụng `boundaries.mjs`.
- TDD gate: có commit `test(04-06)` trước `feat(04-06)` cho cả hai task (RED được xác nhận: 4 file test fail vì thiếu module, rồi `updates.test.ts` fail vì thiếu `./updates`).

## Deviations from Plan

1. **[Rule 3 - Blocking] Thêm `domain/test-fixtures.ts`.** Plan không liệt kê file này nhưng ba file test (day-range, permissions, updates) cần cùng một bộ dựng `Itinerary`/`Waypoint`/`ItineraryDay`; để chung tránh lặp ba lần. Không export qua barrel.
2. **[Rule 1 - Bug] Kiểu `it.each` ở `calendar-date.test.ts`.** Bảng hai cột (giá trị, lý do) làm `tsc` báo lỗi khi callback chỉ nhận một tham số; sửa thành nhận `(value, lyDo)` và dùng `lyDo` làm thông điệp của `expect`. Sửa trước commit GREEN nên nằm trong `ff6b5f1`, không phải commit RED.
3. `pnpm lint|typecheck|test` ở gốc vẫn crash `3221226505` trên máy này (đã ghi ở 04-02); dùng `turbo.exe` trực tiếp và `pnpm --filter`.

## Known Stubs

None.

## Threat Flags

None. T-04-12: `canEdit` có ba ca (null, khác chủ, chủ). T-04-13: `isValidDayOrder` có 6 ca bất hợp lệ, sẵn để use case 04-08 dùng.

## Self-Check

**Trạng thái: PASSED.**

- Đủ 11 file created và `index.ts` đã sửa trong `key-files`.
- Commit `ce57c98`, `ff6b5f1`, `45e37a7`, `c21484a` có trong `git log`; mỗi commit RED nằm trước commit GREEN tương ứng.
