---
phase: 04-itinerary-crud-editor
plan: 36
subsystem: web-itinerary-ui
tags: [cover-images, radiogroup, grid, wave-21]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-27 Radio/RadioGroup; 04-33 validateCoverUrl, surface data-escape-scope"
provides:
  - "domain/cover-images.ts: COVER_IMAGE_LIMIT, galleryOf, canAddCoverImage, addCoverImage, removeCoverImage, selectCoverImage, coverSlots, focusTargetAfterRemove"
  - "CoverPreview, CoverUrlPanel, CoverChoiceGroup, CoverTileActions, useCoverField, CoverImageField"
affects: [04-38]
tech-stack:
  added: []
  patterns: ["lưới hai lớp: radiogroup chỉ chứa radio, nút X/thêm là anh em đứng sau", "rootRef tạo ở component, truyền vào hook (react-hooks/refs)"]
key-files:
  created:
    - packages/itinerary/src/domain/cover-images.ts
    - packages/itinerary/src/domain/cover-images.test.ts
    - apps/web/src/modules/itinerary/ui/cover-preview.tsx
    - apps/web/src/modules/itinerary/ui/cover-url-panel.tsx
    - apps/web/src/modules/itinerary/ui/cover-url-panel.test.tsx
    - apps/web/src/modules/itinerary/ui/cover-choice-group.tsx
    - apps/web/src/modules/itinerary/ui/cover-tile-actions.tsx
    - apps/web/src/modules/itinerary/ui/use-cover-field.ts
    - apps/web/src/modules/itinerary/ui/cover-image-field.tsx
    - apps/web/src/modules/itinerary/ui/cover-image-field.test.tsx
  modified:
    - packages/itinerary/src/domain/index.ts
    - packages/itinerary/src/exports.test.ts
key-decisions:
  - "useCoverField nhận rootRef từ component thay vì trả về: ESLint react-hooks/refs coi object trả về chứa ref là ref và báo lỗi mọi truy cập thuộc tính trong render."
requirements-completed: [ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 36: Lưới ảnh bìa Summary

**Lưới 5 ô ảnh bìa với thao tác thêm, xóa, chọn là hàm thuần có test; radiogroup chỉ chứa radio; khung trống bấm được bằng chuột và không là điểm dừng Tab.**

## Accomplishments

- Domain: chọn lại ảnh đầu khi xóa ảnh đang chọn, danh sách rỗng thì ảnh mới được chọn, ảnh mặc định không bao giờ vào danh sách.
- UI: focus sau xóa (cùng vị trí, liền trước, nút thêm), thông báo cho trình đọc màn hình, `CoverUrlPanel` chặn `http:`, `javascript:`, quá 500 ký tự, trùng; ảnh preview lỗi vẫn cho thêm.
- `cover-image-field.tsx` 78 dòng, `use-cover-field.ts` 119 dòng.

## Deviations from Plan

1. **`useCoverField` nhận `rootRef` qua tham số** và không trả `rootRef` (xem key-decisions); `CoverImageField` tạo `useRef`.
2. **`CoverPreview`** viết lại bằng component con (`PreviewError`, `PreviewImage`, `PreviewBody`) để không dùng `? :` chọn component; hành vi như bản cũ trong `trip-info-dialog.tsx` (bản cũ còn đó tới 04-38).

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/itinerary test` / `typecheck` / `lint` | pass 422 test / exit 0 / exit 0 |
| `pnpm --filter @tripory/web test` | pass, 109 file, 1692 test |
| `pnpm --filter @tripory/web typecheck` / `lint` | exit 0 / exit 0 |

## Self-Check: PASSED
