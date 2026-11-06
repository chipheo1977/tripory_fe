---
phase: 04-itinerary-crud-editor
plan: 42
subsystem: design-tokens
tags: [tokens, map, a11y, wave-26]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "UI-SPEC mục Bản đồ trong editor và tab Tổng quan (token mới, bảng màu theo ngày)"
provides:
  - "7 primitive màu -700, 8 token màu ngày --map-day-1..8, 6 token kích thước/độ mờ bản đồ, ánh xạ Tailwind --color-map-day-N"
affects: [04-45, 04-46, 04-47]
tech-stack:
  added: []
  patterns: ["Màu ngày là component token trỏ primitive, không có biến thể tối (D-116)"]
key-files:
  created: []
  modified:
    - packages/design-tokens/src/primitives.css
    - packages/design-tokens/src/components.css
    - packages/design-tokens/src/theme.css
    - packages/design-tokens/src/tokens.test.ts
key-decisions:
  - "Giữ nguyên 8 màu của UI-SPEC: cả 8 đạt ≥ 4.5:1 với chữ trắng nên không phải đổi màu (FLAG 2 chưa kích hoạt)"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 42: Token bản đồ trong editor Summary
**21 token mới (7 primitive, 8 màu ngày, 6 kích thước/độ mờ) và 8 ánh xạ Tailwind, có test tồn tại, trỏ primitive, tương phản WCAG và utility sinh CSS thật.**
## Accomplishments
- `primitives.css`: blue/emerald/pink/purple/cyan/lime/slate -700. `components.css`: `--map-pin-size` 28px, `--map-pin-size-selected` 36px, `--map-day-dot-size` 12px, `--map-label-max-width` 240px, `--overview-cover-thumb-width` 112px, `--map-dimmed-opacity` 0.35, `--map-day-1..8`. `theme.css`: `--color-map-day-1..8`. `dark.css` không đổi.
- Test: 8 ca `it.each` tương phản (tính luminance WCAG), 8 primitive khác nhau và ngày 2 là amber-700, `dark.css` không có `--map-`, ánh xạ theme, utility `bg-map-day-N`, `size-(--map-pin-size)`, `opacity-(--map-dimmed-opacity)`.
## Task Commits
1. Task 1 + Task 2 (token và test cùng một commit vì inventory test đỏ nếu thiếu một trong hai) - `3b58328`
## Deviations from Plan
**[Rule 3 - Blocker] Fixture `--semantic-size-touch-min` lệch với CSS đã commit** - Found during: baseline trước Task 2 | Issue: commit `a621893` (người dùng) đổi `touch-min` 44px sang 24px ở `semantic.css`/`dark.css` nhưng `tokens.test.ts` vẫn chờ 44px nên design-tokens đã đỏ 1/20 trước khi bắt đầu | Fix: đổi fixture thành `'24px'` cho khớp CSS đã commit, không đổi CSS | Files: `packages/design-tokens/src/tokens.test.ts` | Verification: 32/32 xanh | Commit `3b58328`.
Hệ quả cần biết: `--semantic-size-touch-min` đang là 24px (không phải 44px mà UI-SPEC/WCAG mục tiêu chạm nêu); đó là quyết định của người dùng ở `a621893`, không thuộc plan này.
**Total deviations:** 1 auto-fixed (Rule 3). **Impact:** không đổi hành vi CSS.
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/design-tokens lint` | exit 0 |
| `pnpm --filter @tripory/design-tokens typecheck` | exit 0 |
| `pnpm --filter @tripory/design-tokens test -- --run` | 32/32 (baseline 20, +12) |
| `pnpm --filter @tripory/ui-web test -- --run token-guard` | 44/44 xanh |
## Self-Check: PASSED
