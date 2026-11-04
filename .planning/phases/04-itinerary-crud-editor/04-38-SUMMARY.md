---
phase: 04-itinerary-crud-editor
plan: 38
subsystem: web-itinerary-editor
tags: [autosave, trip-info, cover-grid, drafts, wave-23]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-35 autosave; 04-36 CoverImageField; 04-28 InlineAlert action, Dialog X; 04-37 create dialog; 04-31 destination cover"
provides:
  - "TripInfoDialog tự lưu (không Lưu/Hủy), useTripInfoForm"
  - "Editor host useMetadataAutosave, cảnh báo rời trang theo autosave.state.dirty"
  - "DraftKind không còn metadata; draftPrefix"
  - "Dọn export cũ của hộp tạo nhanh và metadataSchema"
affects: [04-39, 04-40]
tech-stack:
  added: []
  patterns: ["adjust-state-during-render thay setState trong effect"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/use-trip-info-form.ts
  modified:
    - apps/web/src/modules/itinerary/ui/trip-info-dialog.tsx
    - apps/web/src/modules/itinerary/ui/trip-info-dialog.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.test.tsx
    - apps/web/src/modules/itinerary/ui/draft-storage.ts
    - apps/web/src/modules/itinerary/ui/draft-storage.test.ts
    - apps/web/src/modules/itinerary/ui/form-schemas.ts
    - apps/web/src/modules/itinerary/ui/form-schemas.test.ts
    - apps/web/src/modules/itinerary/ui/form-error-mapping.ts
    - apps/web/src/modules/itinerary/ui/form-error-mapping.test.ts
    - apps/web/src/modules/itinerary/ui/metadata-autosave.ts
    - apps/web/src/modules/itinerary/ui/metadata-autosave.test.ts
key-decisions:
  - "Lỗi nền chỉ báo một lần cho mỗi đợt lỗi (cờ reportedBackground): blur sau lỗi gửi lại, nếu lỗi tiếp sau khi đã đóng form thì không toast lần hai."
  - "retry không gửi trùng khi payload bằng lệnh đang chạy."
requirements-completed: [ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 38: Thông tin chuyến đi tự lưu Summary

**Hộp "Thông tin chuyến đi" không còn nút Lưu/Hủy: ô chữ lưu sau 800 ms hoặc khi blur, ngày và thao tác ảnh lưu ngay, lỗi hiện trong form kèm "Thử lại", đóng khi còn lỗi thì thành lỗi nền ở header.**

## Accomplishments

- Form chỉ có Tiêu đề, Mô tả, Ngày khởi hành, lưới Ảnh bìa; không điểm đến và sở thích.
- Editor host `useMetadataAutosave` (cấp editor), tiêu đề trên tóm tắt đổi ngay nhờ optimistic.
- Bản nháp `sessionStorage` của metadata bị bỏ; khóa `metadata` cũ được `findFirst` dọn.

## Deviations from Plan

1. **`metadata-autosave.ts` được sửa** (ngoài `files_modified`): thêm cờ `reportedBackground` và chặn `retry` gửi trùng. Phát hiện khi viết test dialog: sau lỗi chung, blur gửi lại (đúng thiết kế) và nếu lỗi tiếp sau khi đóng form thì toast hiện hai lần. Thêm 3 test controller.
2. Test dialog dùng `fireEvent` cho các bước gõ khi cần kiểm lỗi, vì `user.type` kèm click làm blur ô trước và kích hoạt gửi lại (hành vi đúng).
3. Chuỗi `sessionStorage` trong comment của `use-trip-info-form.ts` bị bất biến `auth-invariants` bắt (khớp text), đã diễn đạt lại.

## Chưa kiểm với BE thật

`PUT /itineraries/{id}` với `coverImages`/`selectedCoverIndex` chưa gọi BE thật; test dùng repository giả.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web test` | pass, 110 file, 1720 test |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |

## Self-Check: PASSED
