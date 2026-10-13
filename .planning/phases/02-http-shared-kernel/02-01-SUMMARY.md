---
phase: 02-http-shared-kernel
plan: 01
subsystem: shared-kernel
tags: [shared-kernel, branded-type, value-object, guid, wgs84, vitest, expect-type, tdd]

requires: []
provides:
  - "`Brand<T, B>`, `UserId`, `ItineraryId`, `isGuid`, `parseUserId`, `parseItineraryId` trong `@tripory/shared-kernel`"
  - "`Wgs84Coordinate`, `createWgs84Coordinate`, `isWgs84Coordinate` trong `@tripory/shared-kernel`"
  - "Barrel `packages/shared-kernel/src/index.ts` export `./ids` và `./geo`"
  - "Script test kernel chạy thật (`vitest run`, bỏ `--passWithNoTests`)"
affects: [02-02, 02-03, phase-03-identity, phase-04-maps, itinerary, chat, profile]

tech-stack:
  added: []
  patterns: [branded-type-unique-symbol, parse-returns-null, frozen-value-object, named-field-coordinate, expectTypeOf-type-test]

key-files:
  created:
    - packages/shared-kernel/src/ids.ts
    - packages/shared-kernel/src/ids.test.ts
    - packages/shared-kernel/src/geo.ts
    - packages/shared-kernel/src/geo.test.ts
  modified:
    - packages/shared-kernel/src/index.ts
    - packages/shared-kernel/package.json

key-decisions:
  - "Kernel chỉ có `UserId`, `ItineraryId` (dùng ở ≥ 2 context); `ConversationId`, `WaypointId`, `ItineraryDayId`, `MessageId` để trong context của chúng."
  - "Parser id trim, chuẩn hóa chữ thường, regex GUID neo `^...$` không kiểm version nibble, sai trả `null` thay vì ném lỗi."
  - "`createWgs84Coordinate` nhận object có tên field, khoảng đóng lat [-90, 90] / lng [-180, 180], không làm tròn, trả bản copy `Object.freeze`."

patterns-established:
  - "Branded id: `declare const brand: unique symbol` + `Brand<T, B>`, kiểm bằng `expectTypeOf(...).not.toExtend` và `// @ts-expect-error` trong file test (tsconfig include `src` nên `tsc` bắt directive thừa)."
  - "Factory value object trả `T | null`, type guard dùng chung hàm kiểm nội bộ (`inRange`) với factory."

requirements-completed: [FND-05]

duration: 6 min
completed: 2026-10-12
---

# Phase 2 Plan 1: Shared Kernel (branded id + Wgs84Coordinate) Summary

**`@tripory/shared-kernel` có branded `UserId`/`ItineraryId` với parser GUID chuẩn hóa chữ thường và value object `Wgs84Coordinate` khoảng đóng, frozen, kèm 32 test thật, lint `kernelPackage()` xanh**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-12T10:07:30Z
- **Completed:** 2026-10-12T10:13:00Z
- **Tasks:** 2 (TDD, mỗi task một cặp commit RED/GREEN)
- **Files:** 6 (4 tạo mới, 2 sửa)

## Accomplishments

- `ids.ts`: `Brand<T, B>` qua `unique symbol`, `UserId`, `ItineraryId`, `isGuid`, `parseUserId`, `parseItineraryId`. GUID chữ hoa hay có khoảng trắng hai đầu trả về id chữ thường; chuỗi rỗng, thiếu/thừa ký tự, có ngoặc, có ký tự `g`, không có gạch nối đều trả `null`.
- Kiểu branded không gán chéo được: `UserId` ↛ `ItineraryId`, `string` ↛ `UserId`, `UserId` → `string` (kiểm bằng `expectTypeOf` và `@ts-expect-error`).
- `geo.ts`: `Wgs84Coordinate`, `createWgs84Coordinate`, `isWgs84Coordinate`. Biên ±90/±180 hợp lệ, `10.762622, 106.660172` giữ nguyên; vượt biên 0.0001, `NaN`, `±Infinity` ở từng trục trả `null`; kết quả frozen và khác tham chiếu với đầu vào.
- `index.ts` thay `export {}` bằng `export * from './ids';` và `export * from './geo';`. `package.json` đổi `"test"` thành `"vitest run"`.

## Task Commits

1. **Task 02-01-01: Branded id UserId, ItineraryId và parser GUID**
   - RED `ae017e4` `test(02-01): add failing test for branded GUID ids`
   - GREEN `cde26cf` `feat(02-01): implement branded UserId/ItineraryId with GUID parser`
2. **Task 02-01-02: Wgs84Coordinate, barrel kernel và bật test thật**
   - RED `13c16f4` `test(02-01): add failing test for Wgs84Coordinate`
   - GREEN `85be131` `feat(02-01): implement Wgs84Coordinate and kernel barrel`

Không cần commit REFACTOR.

## Files Created/Modified

- `packages/shared-kernel/src/ids.ts` — branded type và parser GUID.
- `packages/shared-kernel/src/ids.test.ts` — 11 test: chữ hoa, trim, bảng 7 chuỗi sai (`it.each`), version nibble, kiểm kiểu.
- `packages/shared-kernel/src/geo.ts` — value object tọa độ, `inRange` dùng chung cho factory và type guard.
- `packages/shared-kernel/src/geo.test.ts` — 21 test: 4 ca hợp lệ, 10 ca `null`, frozen, 1 ca guard đúng, 5 ca guard sai.
- `packages/shared-kernel/src/index.ts` — barrel công khai.
- `packages/shared-kernel/package.json` — bỏ `--passWithNoTests`.

## Decisions Made

- Theo mục 9 tài liệu kiến trúc, kernel chỉ chứa id có ≥ 2 context dùng cùng nghĩa: `UserId` (itinerary, chat, profile, identity) và `ItineraryId` (itinerary, chat). Không thêm id khác.
- Không sinh id ở FE (không `Math.random`, không `crypto`), kernel chỉ validate.
- Comment tiếng Việt ghi lý do: BE `Guid.NewGuid()` ghi chữ thường còn URL có thể tới chữ hoa; BE `Create(longitude, latitude)`, GeoJSON `[lng, lat]`, người dùng dán "lat, lng" nên dùng field có tên; làm tròn là việc của UI; parse chuỗi/link Google Maps thuộc Phase 4.
- `expect-type` đi kèm Vitest 4.1.11 là 1.4.0, có `toExtend`, nên không phải chuyển sang `toMatchTypeOf`.

## Deviations from Plan

None - plan executed exactly as written.

Ghi chú nhỏ (không phải deviation): bảng chuỗi sai của `ids.test.ts` có thêm một ca GUID không gạch nối (`3f2504e04f8911d39a0c0305e82c3301`) và ca trim có thêm `\t`/`\n`; đều nằm trong phạm vi behavior của plan.

## Issues Encountered

- `requirements mark-complete FND-05` đã đánh dấu FND-05 là Complete trong `REQUIREMENTS.md`. FND-05 là toast/message lỗi lấy từ BE, cả 4 plan của Phase 2 cùng gắn FND-05 và phần trình bày nằm ở 02-04, nên plan kernel này chưa giao requirement. Đã hoàn lại `REQUIREMENTS.md` (không commit thay đổi đó); đánh dấu FND-05 khi xong 02-04.

## Known Stubs

None.

## Threat Model Verification

- **T-02-01 (Tampering, parser id):** regex neo `^...$`, trim, chữ thường, sai trả `null`; bảng test có ngoặc, thừa/thiếu ký tự, ký tự `g`.
- **T-02-02 (Tampering, tọa độ):** `Number.isFinite` + khoảng đóng; `NaN`/`Infinity`/vượt biên trả `null`; kết quả `Object.freeze`.
- **T-02-03 (Elevation of Privilege, kernel):** `pnpm --filter @tripory/shared-kernel lint` xanh với `kernelPackage()` (`pure: true`); source không import gì, test chỉ import `vitest`.
- Không thêm endpoint, auth path, truy cập file hay schema mới.

## Verification

- `pnpm --filter @tripory/shared-kernel test` — PASS, 2 file, 32 test.
- `pnpm --filter @tripory/shared-kernel lint` — PASS.
- `pnpm --filter @tripory/shared-kernel typecheck` — PASS (directive `@ts-expect-error` có lỗi thật để chặn, vì tsconfig include `src`).
- `Select-String ... "from '(?!\./)"` — chỉ khớp `from 'vitest'` ở `ids.test.ts`, `geo.test.ts`.
- `Select-String` cho `ConversationId|WaypointId|MessageId|Math.random|crypto` (ids.ts), `toFixed|Math.round` (geo.ts), `passWithNoTests` (package.json) — không có kết quả.
- Gốc repo: `pnpm lint`, `pnpm typecheck`, `pnpm test` — 7/7 task thành công mỗi lệnh.

## User Setup Required

None.

## Next Phase Readiness

- `@tripory/api-client` (02-02, 02-03) có thể import `@tripory/shared-kernel` khi cần.
- Ready for 02-02.

---
*Phase: 02-http-shared-kernel*
*Completed: 2026-10-12*

## Self-Check: PASSED

Đã kiểm 5 file nguồn/test tồn tại và 4 commit `ae017e4`, `cde26cf`, `13c16f4`, `85be131` có trong git log; acceptance criteria của cả hai task chạy lại đều PASS.
