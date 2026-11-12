---
phase: 05-map-public-view
plan: 02
subsystem: ui
tags: [ui-web, segmented-control, base-ui, wave-1]
provides:
  - "`SegmentedControl` + `SegmentedControlItem` trong `@tripory/ui-web` (nhóm chọn một, không bao giờ rỗng)"
key-files:
  created:
    - packages/ui-web/src/molecules/segmented-control.tsx
    - packages/ui-web/src/molecules/segmented-control.test.tsx
  modified:
    - packages/ui-web/src/index.ts
requirements-completed: [PUB-02]
completed: 2026-11-11
---
# Phase 5 Plan 02: SegmentedControl Summary

**Molecule nhóm chọn một viết tay trên Base UI `toggle-group`/`toggle`, theo mẫu `ToggleChip`.**

## Accomplishments
- `SegmentedControl` dùng `ToggleGroup multiple={false} value={[value]}`; bỏ qua mảng rỗng và giá trị trùng, nên bấm lại đoạn đang chọn không gọi `onValueChange` và không bỏ chọn.
- Mũi tên chỉ chuyển focus; Space/Enter chọn; một điểm dừng Tab; `aria-pressed` từng đoạn; tên truy cập bắt buộc ở mức kiểu (`aria-label` hoặc `aria-labelledby`).
- `SegmentedControlItem` có `icon`/`iconClassName` tùy chọn (ẩn bằng early return trong `ItemIcon`, không `? :`/`&&`). Component không chứa chuỗi tiếng Việt.
- 9 test hợp đồng; export từ `index.ts`.

## Verification
Gate gốc xanh: `pnpm lint`, `pnpm typecheck`, `pnpm test` (ui-web 40 file / 388 test, web 137 / 2165).

## Deviations
Không có (`Icon` tự đặt `aria-hidden` khi không có `label`, nên không cần bọc span).
