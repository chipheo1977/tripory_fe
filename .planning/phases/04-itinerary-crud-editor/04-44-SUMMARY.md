---
phase: 04-itinerary-crud-editor
plan: 44
subsystem: web-map-style
tags: [maplibre, openfreemap, sovereignty, catalog, wave-26]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-RESEARCH R9.1/R9.2 (URL OpenFreeMap, mask, nhãn riêng), UI-SPEC mục Style nền"
provides:
  - "maplibre-gl 6.16.0 và react-map-gl 8.1.3 trong catalog pnpm (pin cứng), chỉ apps/web dùng"
  - "BASEMAP_STYLE, SOVEREIGNTY_MASK, SOVEREIGNTY_LABEL_TEXTS, hằng URL tile/glyph"
affects: [04-46, 04-52, 04-53]
tech-stack:
  added: [maplibre-gl@6.16.0, react-map-gl@8.1.3]
  patterns: ["Style JSON riêng của repo, đổi nguồn tile chỉ sửa hai hằng URL", "Lọc chủ quyền bằng within + thuộc tính ranh giới"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/map/basemap-style.ts
    - apps/web/src/modules/itinerary/ui/map/basemap-style.test.ts
  modified:
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
    - apps/web/package.json
key-decisions:
  - "Không bật install script cho gói mới (pnpm không hỏi duyệt build); boundaries.mjs không đổi"
  - "OUTSIDE_MASK ép kiểu qua unknown vì type FilterSpecification không nhận MultiPolygon literal của within (một chỗ, có comment ngữ cảnh ở đầu file)"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 44: Dependency bản đồ và style nền Summary
**Hai dependency bản đồ pin cứng qua catalog và style nền OpenFreeMap riêng, lọc nhãn/ranh giới Hoàng Sa, Trường Sa theo vùng và thuộc tính, thêm hai nhãn "Quần đảo … (Việt Nam)"; 25 test style tự động.**
## Accomplishments
- Lockfile cập nhật (+48 gói), `pnpm install --frozen-lockfile` xanh; worker, CSS và `react-map-gl/package.json` có trong `apps/web/node_modules`.
- Style: 17 lớp (nền, nước, công viên, tòa nhà, đường, hai lớp ranh giới, năm lớp chữ, nhãn riêng); không sprite, không POI/sân bay/núi/số nhà.
- Test: `name:vi` → `name` ở mọi lớp chữ; ranh giới lọc maritime/disputed/claimed_by/within; mọi lớp chữ từ tile lọc theo mask; 6 điểm mẫu từ tile thật trong mask, 8 điểm đất liền/nước khác ngoài mask; cỡ chữ 14/16.
## Task Commits
1. Task 1: `b6f766e`
2. Task 2: `eae57e8`
## Deviations from Plan
None.
## Chưa kiểm
- Nhãn "Biển Đông" (lớp `water_name`) có bị mask che hay không, và việc hiển thị thật Hoàng Sa/Trường Sa: chỉ kiểm được bằng tile/trình duyệt thật (04-52, UAT 04-53).
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm --filter @tripory/web lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/web test -- --run` | 115 file, 1766 test (baseline ~1741, +25) |
| `pnpm --filter @tripory/design-tokens test -- --run` | 32/32 |
| `pnpm --filter @tripory/ui-web test -- --run token-guard` | 44/44 |
## Self-Check: PASSED
