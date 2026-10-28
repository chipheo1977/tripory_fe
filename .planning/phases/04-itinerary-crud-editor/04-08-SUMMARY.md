---
phase: 04-itinerary-crud-editor
plan: 08
subsystem: itinerary-application-infrastructure
tags: [ports, use-case, zod-acl, mapper, http-repository, short-link, tdd, wave-4]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-06: domain itinerary (Itinerary, Page, CalendarDate, isValidDayOrder); 04-07: parser vị trí; 04-10: route POST /api/maps/resolve"
provides:
  - "Port `ItineraryRepository` (11 lệnh) và `ShortLinkResolver`, cùng các type `ListMineQuery`, `MetadataInput`, `WaypointFields`, `AddWaypointInput`, `ReorderInput`"
  - "Use case `reorderWaypoints` từ chối tập id lệch ngày trước khi gọi BE"
  - "Zod DTO (`itineraryDetailDto`, `itinerarySummaryDto`, `waypointDto`, `pagedDto`, `resolvedLinkDto`) và mapper ACL (`toItinerary`, `toSummary`, `toSummaryPage`, `toWaypoint`)"
  - "`createHttpItineraryRepository(http, { unloadHttp? })` và `createHttpShortLinkResolver(http)`"
  - "Subpath `@tripory/itinerary/http` (chỉ composition được import)"
  - "Fixture BE `fixtures.ts` (không qua barrel)"
affects: [04-09, 04-11, 04-12, 04-13, 04-14, 04-15, 04-16, 04-17]

tech-stack:
  added: []
  patterns: [zod-acl-before-mapper, hardcoded-body-field-whitelist, keepalive-via-injected-unload-client, frozen-domain-results]

key-files:
  created:
    - packages/itinerary/src/application/ports.ts
    - packages/itinerary/src/application/use-cases.ts
    - packages/itinerary/src/application/use-cases.test.ts
    - packages/itinerary/src/infrastructure/dto.ts
    - packages/itinerary/src/infrastructure/dto.test.ts
    - packages/itinerary/src/infrastructure/mappers.ts
    - packages/itinerary/src/infrastructure/mappers.test.ts
    - packages/itinerary/src/infrastructure/fixtures.ts
    - packages/itinerary/src/infrastructure/http-itinerary-repository.ts
    - packages/itinerary/src/infrastructure/http-itinerary-repository.test.ts
    - packages/itinerary/src/infrastructure/http-short-link-resolver.ts
    - packages/itinerary/src/infrastructure/http-short-link-resolver.test.ts
  modified:
    - packages/itinerary/src/application/index.ts
    - packages/itinerary/src/infrastructure/index.ts

key-decisions:
  - "`listMine` map `status` thành `isPublic` (`all` → `undefined` để client bỏ khỏi query, `draft` → false, `published` → true)."
  - "Body của mọi lệnh ghi dựng từ field đặt tên cứng (không spread input), nên trường thừa của form không rời trình duyệt (T-04-18)."
  - "`deleteWaypoint(..., { keepalive: true })` đi qua `deps.unloadHttp ?? http` với `keepalive: true, sessionRefresh: false` (D-32); mặc định dùng client chính, không có khóa `keepalive`."
  - "`ApiError` từ `http.send` lan nguyên cùng tham chiếu; body sai hình dạng làm Zod/mapper ném."
  - "Barrel `./http` chỉ xuất factory, mapper vào và các schema cần cho composition; fixture không xuất."

patterns-established:
  - "Adapter HTTP: `http.send` → `schema.parse` → mapper, không bao giờ trả JSON thô."
  - "Test adapter bằng `fakeHttp`/`failingHttp` + `it.each` cho body sai hình dạng, theo `http-session-gateway.test.ts` của identity."

requirements-completed: []

duration: ~1h (Task 1-2 trước đó, Task 3 phiên này)
completed: 2026-10-28
---

# Phase 4 Plan 8: Application + infrastructure của itinerary Summary

**Port 11 lệnh, use case `reorderWaypoints`, Zod ACL + mapper (ngày thưa, `updatedAt` 7 chữ số lẻ có offset), repository HTTP đủ 11 endpoint với `keepalive` cho xóa lúc unload, resolver link rút gọn qua `/api/maps/resolve`, và subpath `./http`**

> `requirements-completed` để trống, cùng cách làm với 04-02..04-07: ITIN-* là hành vi người dùng, do các plan hook/UI sau (04-09 trở đi) giao. Plan này chỉ cấp port, ACL và adapter.

## Commits

1. **Task 04-08-01 RED** — `daed9cf` `test(04-08): add failing test for reorderWaypoints use case`
2. **Task 04-08-01 GREEN** — `5ad8051` `feat(04-08): port ItineraryRepository, ShortLinkResolver và use case reorderWaypoints`
3. **Task 04-08-02 RED** — `fa25c81` `test(04-08): add failing tests for Zod DTO and mapper ACL`
4. **Task 04-08-02 GREEN** — `c984529` `feat(04-08): Zod DTO và mapper ACL cho lịch trình`
5. **Task 04-08-03 RED** — `17cf740` `test(04-08): add failing tests for HTTP itinerary repository and short-link resolver`
6. **Task 04-08-03 GREEN** — `a6202c2` `feat(04-08): HTTP itinerary repository, short-link resolver va barrel ./http`

## Accomplishments

- **Task 1 (đã có, xác minh lại):** `ports.ts` có `export type ItineraryRepository` và `ShortLinkResolver`; `reorderWaypoints` gọi repo đúng một lần khi `isValidDayOrder`, ngược lại ném 'Thứ tự không khớp danh sách điểm đến của ngày.' và không gọi repo.
- **Task 2 (đã có, xác minh lại):** `dto.ts` dùng `z.iso.datetime({ offset: true })` và `z.iso.date()`, không có chuỗi `daysCount`; mapper sắp `days` theo `dayNumber`, `waypoints` theo (`dayNumber`, `orderIndex`), `subtitle` rỗng/khoảng trắng → null, id hoặc tọa độ hỏng → ném; `toSummaryPage` trả `{ items, pageIndex, hasNextPage }`.
- **Task 3:** `createHttpItineraryRepository` phủ 11 endpoint: `GET /itineraries/mine`, `GET /{id}`, `POST /itineraries {title}`, `PUT /{id}` (4 khóa), `PUT /publish`, `DELETE /{id}`, `POST /waypoints` (6 khóa), `PUT /waypoints/{wid}` (5 khóa), `DELETE /waypoints/{wid}`, `PUT /days/{n}/reorder-waypoints {orderedWaypointIds}`, `PUT /days/{n}/subtitle {subtitle}`. `createHttpShortLinkResolver` gọi `POST /maps/resolve {url}` và trả `data.url`.
- **Mitigation threat model:** T-04-17 (mọi phản hồi qua Zod `.parse` rồi mapper; test body sai hình dạng cho `listMine`, `getById`, `create`, `addWaypoint`, resolver), T-04-18 (test từng lệnh ghi kiểm `Object.keys(body)` đúng bộ khóa, input chứa trường thừa vẫn không lọt), T-04-19 (chấp nhận, ghi chú trong file: `sessionRefresh: false` cho keepalive), T-04-20 (`ItineraryId` đã chuẩn hóa GUID; path dựng từ id đó).

## Verification

- RED Task 3 xác nhận trước khi cài đặt: cả hai file test fail vì chưa có module.
- `pnpm --filter @tripory/itinerary test`: 12 file, 289 test xanh; `lint` và `typecheck` xanh.
- `pnpm --filter @tripory/config test`: 114 test xanh (self-test ranh giới, không sửa `boundaries.mjs`).
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 62 file, 1002 test xanh.
- Acceptance Task 3: `orderedWaypointIds` và `keepalive: true` có trong `http-itinerary-repository.ts`; Task 2: `z.iso.datetime({ offset: true })` có, `daysCount` không có trong `dto.ts`.
- TDD gate: ba cặp `test(04-08)` nằm trước `feat(04-08)`.

## Deviations from Plan

None - plan executed exactly as written. (Hai commit message của Task 3 viết không dấu để tránh vấn đề mã hóa trên PowerShell; không ảnh hưởng nội dung.)

Ghi chú môi trường: `pnpm lint|typecheck|test` ở gốc vẫn crash `3221226505` trên máy này; dùng `turbo.exe` trực tiếp và `pnpm --filter`.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check

**Trạng thái: PASSED.**

- Cả 12 file tạo mới và 2 file sửa đều tồn tại.
- Sáu commit `daed9cf`, `5ad8051`, `fa25c81`, `c984529`, `17cf740`, `a6202c2` có trong `git log`, mỗi RED nằm trước GREEN tương ứng.
