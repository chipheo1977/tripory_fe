---
phase: 04-itinerary-crud-editor
plan: 30
subsystem: itinerary-read-model
tags: [domain, dto, mapper, fixtures, wave-17]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-26 interests/normalizeInterests; 04-29 DestinationCatalog; 04-BE-CONTRACT.md mục 8"
provides:
  - "Itinerary: coverImages, destinationCode, interests; ItinerarySummary: destinationCode"
  - "DTO trường mới .nullish(), mapper chịu BE cũ, lọc ảnh rỗng/trùng, normalizeInterests, chỉ số ảnh ngoài khoảng cho null"
  - "Fixture package: itineraryDetailWithDestinationFixture, legacyDetailFixture; fixture BE của app có trường mới"
affects: [04-31, 04-32, 04-41]
tech-stack:
  added: []
  patterns: ["ACL tương thích BE cũ: suy coverImages từ coverImageUrl"]
key-files:
  created: []
  modified:
    - packages/itinerary/src/domain/itinerary.ts
    - packages/itinerary/src/domain/test-fixtures.ts
    - packages/itinerary/src/infrastructure/dto.ts
    - packages/itinerary/src/infrastructure/dto.test.ts
    - packages/itinerary/src/infrastructure/mappers.ts
    - packages/itinerary/src/infrastructure/mappers.test.ts
    - packages/itinerary/src/infrastructure/fixtures.ts
    - apps/web/src/test/be-itinerary-fixtures.ts
    - apps/web/src/modules/itinerary/ui/day-subtitle.test.tsx
    - apps/web/src/modules/itinerary/ui/day-tabs.test.tsx
key-decisions:
  - "Mã điểm đến giữ nguyên chuỗi lạ (không z.enum), UI tra catalog và rơi về nền dự phòng."
requirements-completed: [ITIN-02, ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 30: Read model điểm đến, sở thích, ảnh bìa Summary

**Domain, DTO, mapper và fixture mang điểm đến, sở thích và danh sách ảnh bìa; chịu được BE cũ và dữ liệu lạ.**

## Accomplishments

- `toItinerary` suy `coverImages` từ `coverImageUrl` khi BE cũ; ảnh đang hiển thị là `coverImageUrl` của BE, thiếu thì lấy theo `selectedCoverIndex` (ngoài khoảng cho `null`).
- Test khóa danh sách khóa của summary và itinerary, BE cũ/mới, `null`, mã lạ.

## Deviations from Plan

None. `pnpm --filter @tripory/web typecheck` còn 12 file test đỏ (create-itinerary-dialog, editor-header, ellipsis-menu, itinerary-card, itinerary-editor, itinerary-hooks, my-itineraries-view, publish-button, timeline-panel, trip-info-dialog, trip-summary, waypoint-list); đúng dự kiến, plan 04-41 đồng bộ.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/itinerary test` | pass, 18 file, 377 test |
| `pnpm --filter @tripory/itinerary typecheck` / `lint` | exit 0 / exit 0 |
| `pnpm --filter @tripory/web test` (toàn gói) | pass, 97 file, 1457 test |
| `pnpm --filter @tripory/web lint` | exit 0 |
| `pnpm --filter @tripory/web typecheck` | đỏ ở đúng 12 file test nêu trên (chủ ý, chờ 04-41) |

## Self-Check: PASSED
