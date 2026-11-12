---
phase: 05-map-public-view
plan: 05
subsystem: editor-map-reuse
tags: [editor-map-area, editor-layout, cover-image, backward-compatible, wave-1]
provides:
  - "`EditorMapArea`: `errorHint?`, `errorActions?`, `emptyMessage?`, `fallback?` tùy chọn"
  - "`MapStatusOverlay`: `message?`"
  - "`editor-layout.tsx`: xuất `WideBody`, `NarrowBody` (có `reopenCompanion?`), `useHeaderHeight`; dải đáy chip dùng `z-sticky`"
  - "`CoverImage`: `loading?: 'lazy' | 'eager'` (mặc định lazy)"
key-files:
  modified:
    - apps/web/src/modules/itinerary/ui/editor-map-area.tsx
    - apps/web/src/modules/itinerary/ui/editor-map-area.test.tsx
    - apps/web/src/modules/itinerary/ui/map-status-overlay.tsx
    - apps/web/src/modules/itinerary/ui/editor-layout.tsx
    - apps/web/src/modules/itinerary/ui/editor-layout.test.tsx
    - apps/web/src/modules/itinerary/ui/cover-image.tsx
    - apps/web/src/modules/itinerary/ui/cover-image.test.tsx
requirements-completed: [PUB-02]
completed: 2026-11-11
---
# Phase 5 Plan 05: Mở rộng tương thích ngược cho bản đồ, bố cục, ảnh bìa Summary

**Bốn component của editor nhận prop tùy chọn để trang công khai dùng lại; editor không đổi hành vi.**

## Accomplishments
- `EditorMapArea`: lỗi bản đồ có thể đổi dòng hướng dẫn, thêm hành động cạnh "Thử lại" (cùng vùng hành động), bỏ khối dự phòng khi không có `fallback` (`FallbackSlot` early return), đổi chữ chip rỗng. Không truyền prop mới thì copy và DOM như Phase 4.
- `editor-layout.tsx`: `useHeaderHeight` trích từ `EditorLayout` (cùng logic ResizeObserver, `disconnect` khi unmount); `WideBody`/`NarrowBody` được export; `ReopenChip` nhận `companion` đứng sau chip trong cùng dải, lớp `z-modal` đổi `z-sticky` để dải nổi dưới scrim của Dialog/Sheet modal.
- `CoverImage` có `loading`, `referrerPolicy="no-referrer"` giữ nguyên trong cùng thẻ `<img … />` (invariant T-04-63 xanh).
- Test: +5 (map-area), +5 (layout), +1 (cover); toàn bộ test cũ giữ nguyên.

## Verification
Gate gốc xanh: lint (0 lỗi, 1 cảnh báo cũ), typecheck, test (web 2177, ui-web 388, itinerary 636).

## Deviations
Không có.
