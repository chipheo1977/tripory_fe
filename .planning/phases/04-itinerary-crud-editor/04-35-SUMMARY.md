---
phase: 04-itinerary-crud-editor
plan: 35
subsystem: web-itinerary-autosave
tags: [autosave, debounce, single-flight, wave-21]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-32 MetadataInput, useUpdateMetadata optimistic; 04-33 metadataFieldsSchema, mapMetadataError"
provides:
  - "buildAutosavePayload, invalidMetadataFields (hàm thuần)"
  - "createMetadataAutosave: debounce 800 ms, single-flight + trailing, lỗi field/chung, lỗi nền"
  - "useMetadataAutosave(itineraryId): nối useUpdateMetadata, SaveStatusStore, notify.error"
affects: [04-36, 04-38]
tech-stack:
  added: []
  patterns: ["controller thuần + hook mỏng; latest đồng bộ bằng useLayoutEffect để effect con gọi request() đã có mutate thật"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/metadata-autosave-payload.ts
    - apps/web/src/modules/itinerary/ui/metadata-autosave-payload.test.ts
    - apps/web/src/modules/itinerary/ui/metadata-autosave.ts
    - apps/web/src/modules/itinerary/ui/metadata-autosave.test.ts
    - apps/web/src/modules/itinerary/ui/use-metadata-autosave.ts
    - apps/web/src/modules/itinerary/ui/use-metadata-autosave.test.tsx
  modified: []
key-decisions:
  - "closeForm khi còn lỗi chung chuyển thẳng thành lỗi nền mà không gửi lại tự động; người dùng bấm 'Thử lại' trên header."
requirements-completed: [ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 35: Cơ chế tự lưu metadata Summary

**Tự lưu tách khỏi giao diện: payload không bao giờ chứa ô sai, chuỗi đổi ảnh sinh tối đa 2 `PUT`, lỗi chưa xử lý còn lại sau khi đóng form thành lỗi nền.**

## Accomplishments

- 11 + 20 + 10 test (payload, controller với fake timers, hook với repository giả).
- Hook dùng callback cấp hook nên lệnh vẫn hoàn tất sau khi component unmount (test riêng).

## Deviations from Plan

1. `useLayoutEffect` thay `useEffect` để đồng bộ `latest.mutate` (plan ghi "effect không dependency"); lý do ghi trong chú thích hook.
2. `closeForm` khi có lỗi chung không gọi `flush` gửi lại (tránh gửi hai lần trong khi vẫn báo lỗi nền).

## Chưa kiểm với BE thật

Chưa gọi `PUT /itineraries/{id}` thật; test dùng repository giả.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web test -- metadata-autosave use-metadata-autosave` | pass, 41 test |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |

## Self-Check: PASSED
