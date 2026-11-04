---
phase: 04-itinerary-crud-editor
plan: 34
subsystem: web-itinerary-ui
tags: [create-form, blocks, destination-search, sticky-footer, wave-21]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-26 domain; 04-27 Radio/ToggleChip/NumberStepper; 04-29 catalog; 04-33 schemas, block helpers, surface"
provides:
  - "DestinationBlock (+ DestinationOption, BlockError, handle focusFirstOption/getSearchElement/focusSearch)"
  - "TripNameBlock, TripDatesBlock (startRef/daysRef), InterestsBlock"
  - "StickyFormFooter"
affects: [04-37]
tech-stack:
  added: []
  patterns: ["ref của ô truyền riêng, không lồng trong object giá trị (react-hooks/refs)"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/block-error.tsx
    - apps/web/src/modules/itinerary/ui/destination-option.tsx
    - apps/web/src/modules/itinerary/ui/destination-block.tsx
    - apps/web/src/modules/itinerary/ui/destination-block.test.tsx
    - apps/web/src/modules/itinerary/ui/trip-name-block.tsx
    - apps/web/src/modules/itinerary/ui/trip-name-block.test.tsx
    - apps/web/src/modules/itinerary/ui/trip-dates-block.tsx
    - apps/web/src/modules/itinerary/ui/trip-dates-block.test.tsx
    - apps/web/src/modules/itinerary/ui/interests-block.tsx
    - apps/web/src/modules/itinerary/ui/interests-block.test.tsx
    - apps/web/src/modules/itinerary/ui/sticky-form-footer.tsx
    - apps/web/src/modules/itinerary/ui/sticky-form-footer.test.tsx
  modified: []
key-decisions:
  - "TripDatesBlock nhận startRef và daysRef là prop riêng thay vì inputRef trong start/days: ESLint react-hooks/refs báo lỗi khi object giá trị có field ref."
  - "Enter ở TripDatesBlock chỉ bị chặn khi target là input, để nút −/+ vẫn kích hoạt được bằng Enter."
requirements-completed: [ITIN-02]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 34: Khối trình bày form tạo Summary

**Bốn khối (Điểm đến, Tên, Thời gian, Sở thích) và chân form dính đáy, có test hành vi bàn phím, aria và Enter/Esc; chưa có container.**

## Accomplishments

- `DestinationBlock` tìm không dấu theo tên và alias, nhóm Phổ biến/Tất cả/Kết quả, phân biệt commit (bấm, Space, Enter) với đổi bằng mũi tên, Esc trong ô có chữ không đóng modal.
- Các khối khác không gửi form khi Enter; sở thích đọc nhãn từ `INTERESTS`.

## Deviations from Plan

1. **`TripDatesBlockProps`**: `inputRef` của `start`/`days` đổi thành prop riêng `startRef`, `daysRef` (xem key-decisions). Plan 04-37 dùng chữ ký này.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web test -- destination-block trip-name-block trip-dates-block interests-block sticky-form-footer` | pass, 57 test |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |

## Self-Check: PASSED
