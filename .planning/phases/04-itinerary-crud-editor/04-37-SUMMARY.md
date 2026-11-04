---
phase: 04-itinerary-crud-editor
plan: 37
subsystem: web-itinerary-create
tags: [create-form, accordion, dialog, wave-22]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-29 catalog; 04-33 schemas, block helpers, surface; 04-34 blocks and footer"
provides:
  - "CreateItineraryInput (title, destinationCode, dayCount, startDate, interests); repository.create gửi đúng 5 khóa"
  - "useCreateBlocks, useCreateItineraryForm, toCreateTripInput"
  - "CreateItineraryAccordion và CreateItineraryDialog 4 khối (giữ tên export và props)"
affects: [04-38, 04-40]
tech-stack:
  added: []
  patterns: ["yêu cầu mở khối lỗi + focus đợi hết isSubmitting (ô bị khóa không focus được)"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/use-create-blocks.ts
    - apps/web/src/modules/itinerary/ui/use-create-itinerary-form.ts
    - apps/web/src/modules/itinerary/ui/use-create-itinerary-form.test.tsx
    - apps/web/src/modules/itinerary/ui/create-itinerary-accordion.tsx
  modified:
    - packages/itinerary/src/application/ports.ts
    - packages/itinerary/src/infrastructure/http-itinerary-repository.ts
    - packages/itinerary/src/infrastructure/http-itinerary-repository.test.ts
    - packages/itinerary/src/react/index.ts
    - apps/web/src/modules/itinerary/ui/itinerary-hooks.test.tsx
    - apps/web/src/modules/itinerary/ui/create-itinerary-dialog.tsx
    - apps/web/src/modules/itinerary/ui/create-itinerary-dialog.test.tsx
key-decisions:
  - "Xóa trắng tên rồi bấm Tạo: blur điền lại tên mặc định (D-93) nên vẫn gửi được; lỗi tên chỉ còn ca quá 100 ký tự."
  - "Mở khối lỗi + focus ô lỗi chạy trong effect sau khi isSubmitting về false, vì NumberStepper bị disabled (native) khi đang gửi."
requirements-completed: [ITIN-02]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 37: Modal tạo lịch trình 4 khối Summary

**Hộp tạo nhanh được thay bằng modal 4 khối accordion gửi MỘT `POST /itineraries` với điểm đến, tên, ngày khởi hành, số ngày và sở thích rồi vào editor.**

## Accomplishments

- Hợp đồng tạo mới ở package, test khóa 5 khóa body.
- Dialog: 25 ca (khối, tóm tắt, chọn điểm đến, tên mặc định, Enter, lỗi client và BE theo khối, gửi, khóa khi đang gửi, cold start, đóng/mở lại là form mới, Esc, Sheet dưới `md`).

## Deviations from Plan

1. **Focus ô lỗi qua effect** sau khi form mở khóa (xem key-decisions); `onInvalid` của hook vì vậy chạy sau render, không đồng bộ trong handler.
2. **Test "tên rỗng"** của kế hoạch được thay bằng ca "tên quá 100 ký tự" cộng ca "xóa trắng rồi gửi vẫn gửi được" (hệ quả D-93).
3. `create-itinerary-dialog.tsx` dài 167 dòng (kế hoạch gợi ý ≤ ~150); logic đã ở hook, phần còn lại là dựng `model` cho accordion.
4. `my-itineraries-view.test.tsx` không phải sửa (vẫn xanh).
5. Các export cũ `createItinerarySchema`, `CREATE_ITINERARY_FIELDS`, `mapCreateItineraryError` còn nguyên (mã chết), xóa ở 04-38 theo kế hoạch.

## Chưa kiểm với BE thật

`POST /itineraries` với body mới chưa gọi BE thật (BE local do người dùng chạy); test dùng repository giả.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/itinerary test` / `typecheck` / `lint` | pass 423 test / exit 0 / exit 0 |
| `pnpm --filter @tripory/web test` | pass, 110 file, 1721 test |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |

## Self-Check: PASSED
