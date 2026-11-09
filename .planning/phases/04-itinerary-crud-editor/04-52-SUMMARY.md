---
phase: 04-itinerary-crud-editor
plan: 52
subsystem: verification
tags: [gate, build, bundle, uat-checklist, wave-32]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-42..04-51"
provides:
  - "Cổng kiểm từng gói + build thật xanh; worker MapLibre phát thành asset; bản đồ tách khỏi route danh sách"
  - "04-UAT-CHECKLIST.md mục E (14 bước, cột kết quả để trống)"
affects: [04-53]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - .planning/phases/04-itinerary-crud-editor/04-UAT-CHECKLIST.md
key-decisions:
  - "A2 (Turbopack phát worker) đúng: không cần dự phòng public/ cho workerUrl"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 52: Cổng kiểm, build và checklist UAT bản đồ Summary
**Mọi gói lint/typecheck/test xanh, `next build` xanh với worker MapLibre là asset có hash, mã bản đồ chỉ thuộc route editor; mục E của checklist UAT có 14 bước.**
## Kết quả lệnh (Windows, pnpm --filter từng gói)
| Gói | lint | typecheck | test | Số test (baseline) |
|-----|------|-----------|------|--------------------|
| @tripory/design-tokens | 0 | 0 | 0 | 32 (20) |
| @tripory/itinerary | 0 | 0 | 0 | 523 (427) |
| @tripory/ui-web | 0 | 0 | 0 | 377 (342) |
| @tripory/config | - | - | 0 | 114 (self-test boundaries, không đổi) |
| @tripory/web | 0 | 0 | 0 | 1943 trong 124 file (~1741) |
| `pnpm --filter @tripory/web build` | exit 0, 12 giây, Next 16.4.0 (Turbopack), 15 trang |
## Worker và tách bundle
- Worker: `.next/static/media/maplibre-gl-worker.247mnn5i12bew.mjs` (519 KB, bản production) và `maplibre-gl-worker-dev.*.mjs` (1.2 MB). Bước 7 đạt.
- Chunk chứa mã MapLibre: `static/chunks/2__2yk47x4fdn.js` (24 KB, loader/react-map-gl) và `1t--mz85z0m2x.js` (1.09 MB, lõi maplibre-gl). Cả hai chỉ được tham chiếu từ `react-loadable-manifest.json` của route `/itineraries/[id]/edit` (và chunk `2gxszmrgh8lit.js` của editor); không manifest client nào khác, gồm `/itineraries/mine`, nhắc tên chúng. Bước 8 đạt.
- `packages/config/eslint/boundaries.mjs`: 0 commit thay đổi từ lúc lập kế hoạch. Bước 9 đạt.
## Task Commits
1. Task 1 (cổng kiểm, không đổi file): không có commit riêng
2. Task 2 (mục E checklist): `6b5dd10`
## Deviations from Plan
None.
## Chưa kiểm (cần trình duyệt thật, thuộc 04-53)
- Hiển thị Hoàng Sa/Trường Sa, nhãn "Biển Đông" có bị mask che hay không, ghi công theo mức sheet, phân biệt màu ngày 3/6/7, lỗi tải thật và Network không mang dữ liệu lịch trình.
## Self-Check: PASSED
