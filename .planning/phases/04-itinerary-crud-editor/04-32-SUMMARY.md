---
phase: 04-itinerary-crud-editor
plan: 32
subsystem: itinerary-metadata
tags: [metadata, put, optimistic, wave-19]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-30 read model; 04-BE-CONTRACT.md mục 7 (PUT)"
provides:
  - "domain/metadata.ts: ItineraryMetadata, metadataOf, withMetadata, isSameMetadata"
  - "MetadataInput = ItineraryMetadata (coverImages + selectedCoverIndex)"
  - "PUT body đúng 5 khóa, không coverImageUrl/destinationCode/interests"
  - "useUpdateMetadata optimistic + rollback"
affects: [04-35, 04-36, 04-38]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - packages/itinerary/src/domain/metadata.ts
    - packages/itinerary/src/domain/metadata.test.ts
  modified:
    - packages/itinerary/src/domain/index.ts
    - packages/itinerary/src/application/ports.ts
    - packages/itinerary/src/infrastructure/http-itinerary-repository.ts
    - packages/itinerary/src/infrastructure/http-itinerary-repository.test.ts
    - packages/itinerary/src/react/index.ts
    - packages/itinerary/src/exports.test.ts
    - apps/web/src/modules/itinerary/ui/form-schemas.ts
    - apps/web/src/modules/itinerary/ui/form-schemas.test.ts
    - apps/web/src/modules/itinerary/ui/itinerary-hooks.test.tsx
    - apps/web/src/modules/itinerary/ui/trip-info-dialog.test.tsx
key-decisions:
  - "toMetadataInput ánh xạ tạm ô URL ảnh đơn thành danh sách một phần tử; 04-38 thay bằng lưới ảnh."
requirements-completed: [ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 32: Hợp đồng ghi metadata Summary

**Một lệnh `PUT` mang tên, mô tả, ngày, danh sách ảnh bìa và chỉ số ảnh hiển thị, có optimistic và rollback.**

## Accomplishments

- Hàm thuần `metadataOf`/`withMetadata`/`isSameMetadata` có test (bất biến: danh sách không rỗng luôn có ảnh được chọn).
- Repository dựng body từ field đặt tên cứng; test khóa 5 khóa và vắng `coverImageUrl`, `destinationCode`, `interests`.
- `useUpdateMetadata` có test optimistic và rollback.

## Deviations from Plan

None. Lưu ý: trước 04-38, hộp thoại "Thông tin chuyến đi" hiện tại khi lưu sẽ thu danh sách ảnh về một phần tử (ảnh trong ô URL), vì form còn ô URL đơn.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/itinerary test` / `typecheck` / `lint` | pass 394 test / exit 0 / exit 0 |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |
| `pnpm --filter @tripory/web test` | pass, 98 file, 1479 test |

## Self-Check: PASSED
