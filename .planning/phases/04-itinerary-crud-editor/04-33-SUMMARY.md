---
phase: 04-itinerary-crud-editor
plan: 33
subsystem: web-itinerary-forms
tags: [zod, schemas, error-mapping, responsive-surface, wave-20]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-26 domain; 04-27 ui-web molecules; 04-28 Dialog showCloseButton, Sheet fixedSnap; 04-32 MetadataInput"
provides:
  - "createTripSchema, CREATE_TRIP_FIELDS, metadataFieldsSchema, METADATA_TEXT_FIELDS, validateCoverUrl"
  - "create-itinerary-blocks.ts: CREATE_BLOCKS, BLOCK_TITLES, invalidBlocks, firstInvalidBlock, focusTargetOfBlock, blockSummary"
  - "mapCreateTripError; 11 mã lỗi BE mới trong ERROR_MESSAGES (51 mã)"
  - "ResponsiveFormSurface: closeButton, fixedSnap, onOpenChangeComplete, details cho onOpenChange, data-escape-scope, useIsWide"
affects: [04-34, 04-35, 04-36, 04-37, 04-38]
tech-stack:
  added: []
  patterns: ["additive: giữ createItinerarySchema, metadataSchema, mapCreateItineraryError cho tới 04-37/04-38"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/create-itinerary-blocks.ts
    - apps/web/src/modules/itinerary/ui/create-itinerary-blocks.test.ts
  modified:
    - apps/web/src/modules/itinerary/ui/form-schemas.ts
    - apps/web/src/modules/itinerary/ui/form-schemas.test.ts
    - apps/web/src/modules/itinerary/ui/form-error-mapping.ts
    - apps/web/src/modules/itinerary/ui/form-error-mapping.test.ts
    - apps/web/src/modules/itinerary/ui/responsive-form-surface.tsx
    - apps/web/src/modules/itinerary/ui/responsive-form-surface.test.tsx
    - apps/web/src/lib/feedback/error-messages.ts
    - apps/web/src/lib/feedback/error-messages.test.ts
    - apps/web/src/lib/feedback/select-error-message.test.ts
    - apps/web/src/lib/feedback/mutation-feedback.test.ts
key-decisions:
  - "Số ngày NaN báo DAY_COUNT_INVALID bằng z.number({ error }) thay vì câu mặc định của Zod."
requirements-completed: [ITIN-02, ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 33: Nền schema, khối, lỗi và surface Summary

**Schema Zod mới, hàm thuần chọn khối, bảng map lỗi BE và `ResponsiveFormSurface` mở rộng; code cũ vẫn chạy.**

## Accomplishments

- Mỗi ô một lỗi, copy lấy từ UI-SPEC; `validateCoverUrl` chặn `javascript:`, `http:`, `data:`, URL quá 500 ký tự, trùng.
- `mapCreateTripError` gắn mã BE vào ô; 11 mã mới có câu tiếng Việt, `CoverSelectionInvalid` dùng câu chung.
- `ResponsiveFormSurface` không đóng khi Esc xảy ra trong `data-escape-scope`; `locked` vô hiệu cả nút X của Dialog.

## Deviations from Plan

1. **Test ngoài `files_modified`:** `select-error-message.test.ts` và `mutation-feedback.test.ts` đều khẳng định "đúng 40 mã"; cập nhật thành 51 và thêm 11 dòng vào bảng EXPECTED.
2. **`error-messages.test.ts`:** quy tắc "không mã nào chứa TooLong" cần ngoại lệ `Itinerary.CoverImageTooLong` (giới hạn cố định 500, câu cố định).

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web test` | pass, 99 file, 1566 test |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |

## Self-Check: PASSED
