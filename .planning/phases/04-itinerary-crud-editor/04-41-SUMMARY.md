---
phase: 04-itinerary-crud-editor
plan: 41
subsystem: web-tests
tags: [tests, fixtures, typecheck, wave-18]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-30 read model mới (coverImages, destinationCode, interests)"
provides:
  - "12 test của app đồng bộ với read model mới; typecheck, lint, test toàn gói @tripory/web xanh"
affects: [04-31, 04-32]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - apps/web/src/modules/itinerary/ui/create-itinerary-dialog.test.tsx
    - apps/web/src/modules/itinerary/ui/editor-header.test.tsx
    - apps/web/src/modules/itinerary/ui/ellipsis-menu.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-card.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-hooks.test.tsx
    - apps/web/src/modules/itinerary/ui/my-itineraries-view.test.tsx
    - apps/web/src/modules/itinerary/ui/publish-button.test.tsx
    - apps/web/src/modules/itinerary/ui/timeline-panel.test.tsx
    - apps/web/src/modules/itinerary/ui/trip-info-dialog.test.tsx
    - apps/web/src/modules/itinerary/ui/trip-summary.test.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-list.test.tsx
key-decisions: []
requirements-completed: [ITIN-02, ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 41: Đồng bộ test app với read model Summary

**Thêm trường mới vào literal `Itinerary`/`ItinerarySummary` của 12 test; không đổi tên hay hành vi test.**

## Accomplishments

- Literal `Itinerary`: `coverImages`, `destinationCode: null`, `interests: []` (đặt `coverImages: [COVER]` ở `trip-info-dialog` và `trip-summary` nơi có ảnh bìa; bản `bare` của `trip-info-dialog` đặt `coverImages: []`).
- Literal `ItinerarySummary`: `destinationCode: null` (helper của `itinerary-card` và `my-itineraries-view` có trong giá trị mặc định).

## Deviations from Plan

None. Lệnh quét `coverImageUrl:` thiếu `destinationCode` in ra `form-schemas.test.ts`: đây là giá trị form (`MetadataValues`), không phải literal domain, nên không sửa; typecheck xác nhận không thiếu trường.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web typecheck` | exit 0 |
| `pnpm --filter @tripory/web lint` | exit 0 |
| `pnpm --filter @tripory/web test` | pass, 97 file, 1457 test |

## Self-Check: PASSED
