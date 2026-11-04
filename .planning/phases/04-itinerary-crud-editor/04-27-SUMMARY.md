---
phase: 04-itinerary-crud-editor
plan: 27
subsystem: ui-web
tags: [ui-web, accordion, toggle-chip, number-stepper, radio-group, base-ui, wave-15]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-01 token alias và guard utility; 04-UI-SPEC.md bổ sung 2026-10-30"
provides:
  - "Accordion, AccordionItem, AccordionTrigger (title, summary, invalid, ref), AccordionPanel"
  - "ToggleChipGroup (multiple mặc định, bắt buộc aria-label/aria-labelledby), ToggleChip"
  - "NumberStepper (kẹp biên, blur trống khôi phục, aria-roledescription tiếng Việt, labels gom prop phụ)"
  - "RadioGroup, Radio (primitive không áp hình dạng)"
affects: [04-34, 04-36]
tech-stack:
  added: []
  patterns: ["ẩn hiện bằng data-* CSS thay vì điều kiện JSX", "Accordion generic theo Value để onValueChange giữ kiểu"]
key-files:
  created:
    - packages/ui-web/src/molecules/accordion.tsx
    - packages/ui-web/src/molecules/accordion.test.tsx
    - packages/ui-web/src/molecules/toggle-chip.tsx
    - packages/ui-web/src/molecules/toggle-chip.test.tsx
    - packages/ui-web/src/molecules/number-stepper.tsx
    - packages/ui-web/src/molecules/number-stepper.test.tsx
    - packages/ui-web/src/molecules/radio-group.tsx
    - packages/ui-web/src/molecules/radio-group.test.tsx
  modified:
    - packages/ui-web/src/index.ts
    - packages/ui-web/src/exports.test.ts
    - packages/design-tokens/src/tokens.test.ts
    - .planning/phases/04-itinerary-crud-editor/04-UI-SPEC.md
key-decisions:
  - "NumberStepper giữ draft + lastValid trong component; onValueChange không bao giờ nhận null."
  - "AccordionTrigger bỏ prop `title` HTML gốc, dùng `title: ReactNode` làm tiêu đề khối."
requirements-completed: [ITIN-02]
duration: n/a
completed: 2026-11-04
---

# Phase 4 Plan 27: Molecule Accordion, ToggleChip, NumberStepper, RadioGroup Summary

**Bốn molecule generic trên Base UI 1.8.0 đã export từ `@tripory/ui-web`, có test hành vi bàn phím và aria; UI-SPEC khớp Base UI 1.8.0 (D-109).**

## Accomplishments

- `Accordion` một khối mở mặc định, dòng tóm tắt ẩn bằng `group-data-panel-open:hidden`, `invalid` đổi màu và hiện icon lỗi bằng CSS; `ref` tới `button`.
- `ToggleChipGroup` chọn nhiều, chip bật hiện dấu tích (`group-data-pressed`) và `aria-pressed`.
- `NumberStepper` nút 48px, kẹp biên khi gõ, blur trống hiện lại giá trị trước, ghi đè `aria-roledescription`.
- `RadioGroup`/`Radio` truyền tiếp prop; test khóa `onClick` không chạy khi đổi bằng phím mũi tên.

## Deviations from Plan

1. **[Rule 3 - blocking] `packages/design-tokens/src/tokens.test.ts`**: guard "mọi var() đều có khai báo" báo `--accordion-panel-height` (biến Base UI gán lúc chạy). Thêm biến này vào `runtimeVariables`. File không nằm trong `files_modified` của plan.
2. **`Accordion` generic theo `Value`** (`Accordion<Value = string>`): bọc không generic làm `onValueChange` mất kiểu (`unknown[]`), typecheck test lỗi. Tương thích ngược (mặc định `string`).
3. **`className` kiểu `string`** cho các bản bọc (Base UI cho phép hàm); theo mẫu `tabs.tsx`.

Hành vi Base UI 1.8.0 quan sát khớp dự kiến của plan (Shift+↑ +10, mũi tên chỉ di chuyển focus trong `ToggleChipGroup`), không cần đổi test.

## Verification

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/ui-web test` | pass, 35 file, 313 test |
| `pnpm --filter @tripory/ui-web typecheck` | exit 0 |
| `pnpm --filter @tripory/ui-web lint` | exit 0 |
| `pnpm --filter @tripory/design-tokens test` / `lint` | pass 20 test / exit 0 |

Commit: `9643dae`, `749a514`, `6e3bb81`.

## Self-Check: PASSED
