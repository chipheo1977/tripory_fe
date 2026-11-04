---
phase: 04-itinerary-crud-editor
plan: 28
subsystem: ui-web
tags: [ui-web, inline-alert, dialog, sheet, backward-compatible, wave-15]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "ui-web molecule InlineAlert, Dialog, Sheet từ Phase 1-4"
provides:
  - "InlineAlert prop action (nút Thử lại của lỗi tự lưu)"
  - "DialogContent showCloseButton, closeDisabled (nút X Đóng)"
  - "Sheet fixedSnap; sheet-snap resolveFixedSnapPoints, snapPointsFor"
affects: [04-33, 04-34, 04-37]
tech-stack:
  added: []
  patterns: ["ẩn hiện bằng component trả null (AlertAction, DialogCloseButton)", "chọn mức snap bằng hàm thuần early return"]
key-files:
  created: []
  modified:
    - packages/ui-web/src/molecules/inline-alert.tsx
    - packages/ui-web/src/molecules/inline-alert.test.tsx
    - packages/ui-web/src/molecules/dialog.tsx
    - packages/ui-web/src/molecules/dialog.test.tsx
    - packages/ui-web/src/molecules/sheet.tsx
    - packages/ui-web/src/molecules/sheet.test.tsx
    - packages/ui-web/src/molecules/sheet-snap.ts
    - packages/ui-web/src/molecules/sheet-snap.test.ts
key-decisions:
  - "Mọi prop mới là tùy chọn, mặc định giữ hành vi cũ; test cũ không phải sửa."
requirements-completed: [ITIN-02, ITIN-03]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 28: Mở rộng InlineAlert, Dialog, Sheet Summary

**Ba molecule có prop mới tương thích ngược: `InlineAlert action`, `DialogContent showCloseButton`/`closeDisabled`, `Sheet fixedSnap`.**

## Accomplishments

- `InlineAlert` thêm khe `action` (xuống dòng dưới nội dung khi hẹp, căn phải từ `sm`); role theo `variant` không đổi; không render khi không có nội dung.
- `DialogContent` thêm nút X `aria-label="Đóng"` dùng `Dialog.Close` nên chung đường đóng với Esc và trả focus về trigger; `closeDisabled` vô hiệu nút khi đang gọi.
- `Sheet fixedSnap` chỉ còn một mức (expanded), chỉ số snap luôn 0 kể cả sau đóng/mở lại, popup cuộn được.

## Deviations from Plan

None.

## Ghi chú kiểm thử

- Vuốt xuống để đóng sheet `fixedSnap` không mô phỏng được trong jsdom; kiểm bằng UAT trên điện thoại (04-40).

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/ui-web test` | pass, 35 file, 334 test |
| `pnpm --filter @tripory/ui-web typecheck` | exit 0 |
| `pnpm --filter @tripory/ui-web lint` | exit 0 |

## Self-Check: PASSED
