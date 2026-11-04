---
phase: 04-itinerary-crud-editor
plan: 26
subsystem: itinerary-domain
tags: [domain, destination-search, interests, day-count, trip-title, wave-15]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-BE-CONTRACT.md mục 4, 5 (slug điểm đến, 7 mã sở thích)"
provides:
  - "type Destination, POPULAR_GROUP_SIZE = 8"
  - "normalizeSearchText, searchDestinations (tên rồi alias, không dấu), popularDestinations"
  - "defaultTripTitle, initialTripTitle, onDestinationChanged, onTitleInput, onTitleBlur"
  - "DAY_COUNT_MIN/MAX/DEFAULT, isValidDayCount, clampDayCount"
  - "INTERESTS (7 mã), InterestCode, isInterestCode, interestLabel, normalizeInterests"
affects: [04-27, 04-29, 04-34]
tech-stack:
  added: []
  patterns: ["hàm thuần, Object.freeze kết quả tìm, không đồng hồ/browser global trong domain"]
key-files:
  created:
    - packages/itinerary/src/domain/destination.ts
    - packages/itinerary/src/domain/destination-search.ts
    - packages/itinerary/src/domain/destination-search.test.ts
    - packages/itinerary/src/domain/trip-title.ts
    - packages/itinerary/src/domain/trip-title.test.ts
    - packages/itinerary/src/domain/day-count.ts
    - packages/itinerary/src/domain/day-count.test.ts
    - packages/itinerary/src/domain/interests.ts
    - packages/itinerary/src/domain/interests.test.ts
  modified:
    - packages/itinerary/src/domain/index.ts
    - packages/itinerary/src/exports.test.ts
key-decisions:
  - "Mã sở thích dùng đúng 04-BE-CONTRACT.md mục 5 (history-culture, nature, shopping, food-drink, entertainment, wellness, other); checkpoint 04-25 không đổi mã."
requirements-completed: [ITIN-02]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 26: Domain form tạo lịch trình Summary

**Domain thuần cho form tạo: tìm điểm đến không dấu theo tên rồi alias, tên mặc định theo điểm đến, số ngày 1-30, 7 sở thích có mã cố định; export từ entry gốc `@tripory/itinerary`.**

## Accomplishments

- `searchDestinations` chuẩn hóa NFD, bỏ dấu, `đ` thành `d`, dấu câu thành khoảng trắng; xếp mức tên bắt đầu/tên chứa/alias, rồi hạng phổ biến (null sau cùng), rồi thứ tự khai báo. Trả `matchedAlias` gốc có dấu chỉ khi khớp qua alias.
- `trip-title` đóng gói 4 chuyển trạng thái (đổi điểm đến, gõ, rời ô) theo D-93.
- `normalizeInterests` bỏ mã lạ và trùng, sắp theo danh mục.

## Deviations from Plan

None. Việc thực hiện đúng kế hoạch.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/itinerary test` | pass, 17 file, 352 test |
| `pnpm --filter @tripory/itinerary typecheck` | exit 0 |
| `pnpm --filter @tripory/itinerary lint` | exit 0 |

Commit: `91f7819` (task 1), `5b41e7c` (task 2).

## Self-Check: PASSED
