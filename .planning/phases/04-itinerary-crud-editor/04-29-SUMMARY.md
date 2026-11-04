---
phase: 04-itinerary-crud-editor
plan: 29
subsystem: itinerary-infrastructure
tags: [destination-catalog, port, adapter, composition, wave-16]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-26 domain Destination, searchDestinations; 04-BE-CONTRACT.md mục 4, Phụ lục A, B"
provides:
  - "port DestinationCatalog { list, findBySlug } ở application"
  - "createStaticDestinationCatalog({ imageBaseUrl }) với 34 điểm đến, alias, hạng, thứ tự 'Tất cả'"
  - "apps/web/src/composition/destination-catalog.ts: destinationCatalog"
affects: [04-31, 04-34, 04-37]
tech-stack:
  added: []
  patterns: ["composition riêng cho dữ liệu tĩnh, không sửa itinerary.client.ts"]
key-files:
  created:
    - packages/itinerary/src/infrastructure/static-destination-catalog.ts
    - packages/itinerary/src/infrastructure/static-destination-catalog.test.ts
    - apps/web/src/composition/destination-catalog.ts
  modified:
    - packages/itinerary/src/application/ports.ts
    - packages/itinerary/src/infrastructure/index.ts
    - packages/itinerary/src/exports.test.ts
key-decisions:
  - "Alias dùng đúng bảng mặc định của plan (khớp Phụ lục A, trừ 'Thủ đô' của Hà Nội là tùy chọn nên không đưa vào); checkpoint 04-25 do người dùng chốt 'BE xong', không gạch alias nào."
  - "Gốc ảnh mặc định https://triporyv1.vercel.app/destinations (không / cuối, adapter chuẩn hóa) khớp 04-BE-CONTRACT.md mục 11."
requirements-completed: [ITIN-02]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 29: Danh mục điểm đến Summary

**Danh mục tĩnh 34 điểm đến có test khóa dữ liệu, thứ tự, hạng, URL ảnh; `destinationCatalog` sẵn ở composition riêng.**

## Accomplishments

- Port `DestinationCatalog` chỉ là type; adapter ở `@tripory/itinerary/http`.
- Test khóa 34 slug (6 thành phố + 28 tỉnh), thứ tự "Tất cả", 8 mục "Phổ biến", alias không trùng tên đơn vị khác, tìm 'da lat' và 'phu quoc'.
- `itinerary.client.ts` không bị sửa.

## Deviations from Plan

None.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/itinerary test` | pass, 18 file, 363 test |
| `pnpm --filter @tripory/itinerary lint` / `typecheck` | exit 0 / exit 0 |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |
| `pnpm --filter @tripory/web test -- auth-invariants` | pass, 21 test |

## Self-Check: PASSED
