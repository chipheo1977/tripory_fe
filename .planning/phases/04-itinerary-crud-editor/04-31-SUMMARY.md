---
phase: 04-itinerary-crud-editor
plan: 31
subsystem: web-itinerary-ui
tags: [cover-image, fallback, destination-cover, wave-19]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-29 destinationCatalog (composition riêng); 04-30 destinationCode trong read model; 04-41 test đồng bộ"
provides:
  - "defaultCoverFor(destinationCode)"
  - "CoverImage fallbackSrc: ảnh hiển thị → ảnh mặc định điểm đến → nền + icon, mỗi URL lỗi chỉ thử một lần"
  - "ItineraryCard và TripSummary dùng chuỗi dự phòng; không hiện tên điểm đến/sở thích"
affects: [04-33, 04-37]
tech-stack:
  added: []
  patterns: ["chọn khối JSX bằng component early return (CoverContent, TripCover), không dùng ? : để chọn component"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/destination-cover.ts
    - apps/web/src/modules/itinerary/ui/destination-cover.test.ts
  modified:
    - apps/web/src/modules/itinerary/ui/cover-image.tsx
    - apps/web/src/modules/itinerary/ui/cover-image.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-card.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-card.test.tsx
    - apps/web/src/modules/itinerary/ui/trip-summary.tsx
    - apps/web/src/modules/itinerary/ui/trip-summary.test.tsx
key-decisions:
  - "Khối 'Thêm ảnh bìa' của TripSummary chỉ hiện khi không có cả ảnh hiển thị lẫn ảnh mặc định."
requirements-completed: [ITIN-02, ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 31: Chuỗi ảnh dự phòng Summary

**Thẻ danh sách và tóm tắt chuyến đi rơi về ảnh mặc định của điểm đến, rồi nền dự phòng khi ảnh 404; ảnh mặc định chỉ để hiển thị.**

## Accomplishments

- `CoverImage` giữ danh sách URL đã lỗi; URL mới (đổi `src`) được thử lại. Chỉ nhận `https://`, giữ `referrerPolicy="no-referrer"`.
- `TripSummary` đổi `? :` chọn giữa hai khối JSX thành `TripCover` (early return).
- Hai test mock `itinerary.client` (`my-itineraries-view`, `itinerary-editor`) vẫn xanh không đổi factory.

## Deviations from Plan

None.

## Chưa kiểm với BE/ảnh thật

Ảnh mặc định `https://triporyv1.vercel.app/destinations/*.jpg` hiện có thể 404 (file ảnh hoãn, Phụ lục C hợp đồng); đã kiểm bằng test `fireEvent.error`, chưa kiểm trên trình duyệt.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web test` (toàn gói) | pass, 98 file, 1477 test |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |

## Self-Check: PASSED
