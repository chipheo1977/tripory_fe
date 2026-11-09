---
phase: 04-itinerary-crud-editor
plan: 55
subsystem: itinerary-domain
tags: [place-search, domain, application, sovereignty, wave-34]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-53"
provides:
  - "domain/place.ts: Place, PlaceCategory, phân loại OSM, ghép địa chỉ, khung VN/Hoàng Sa/Trường Sa, placeQueryText, coordinateInputOf, planPlaceAutofill"
  - "Port PlaceSearchProvider, PlaceReverseProvider, PlaceLookup và createPlaceSearchService"
affects: [04-56, 04-57]
tech-stack:
  added: []
  patterns: ["port + factory createX(deps), không class, không đồng hồ"]
key-files:
  created:
    - packages/itinerary/src/domain/place.ts
    - packages/itinerary/src/domain/place.test.ts
    - packages/itinerary/src/application/place-search-service.ts
    - packages/itinerary/src/application/place-search-service.test.ts
  modified:
    - packages/itinerary/src/domain/index.ts
    - packages/itinerary/src/application/ports.ts
    - packages/itinerary/src/application/index.ts
    - packages/itinerary/src/exports.test.ts
key-decisions:
  - "D-145: lọc theo countryCode VN + VIETNAM_SEARCH_BOUNDS + loại HOANG_SA_BOUNDS/TRUONG_SA_BOUNDS, không lọc theo từ khóa (TP.HCM có đường Hoàng Sa, Trường Sa)"
  - "D-148: composePlaceAddress bỏ đoạn trùng theo normalizeSearchText, nên 'Đà Lạt'/'Da Lat' bị gộp (test dùng 'Đà Lạt' vs 'Da Lat City')"
requirements-completed: []
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 55: Domain và application tìm địa điểm Summary
**Luật thuần của tìm địa điểm (danh mục, địa chỉ, chủ quyền, tự điền) và service ứng dụng `createPlaceSearchService` sau port `PlaceSearchProvider`; chưa có mạng, chưa có UI.**
## Đã làm
- `place.ts`: `placeCategoryOf` (lưu trú gồm `chalet`/`guest_house`, D-147), `composePlaceAddress` (D-148, tối đa 500 ký tự), `isSearchableCoordinate`/`isPlaceAllowed` (D-145), `PLACE_QUERY_MIN_LENGTH = 2`, `PLACE_QUERY_MAX_LENGTH = 100`, `placeQueryText`, `coordinateInputOf` (6 chữ số), `planPlaceAutofill` (D-149: Tên chỉ khi trống hoặc bằng giá trị tự điền lần trước, Địa chỉ ghi đè khi có).
- `ports.ts`: `PlaceSearchQuery`, `PlaceSuggestionQuery`, `PlaceSearchProvider`, `PlaceReverseProvider`, `PlaceLookup` (client → BFF).
- `createPlaceSearchService({ provider, reverseFallback })`: search 15 → lọc → bỏ trùng → 10; suggest 3 nhóm × 6 → tối đa 15, lỗi một phần trả phần còn lại, lỗi hết thì ném lỗi đầu; reverse trả `null` không gọi provider cho tọa độ ngoài VN hoặc trong Hoàng Sa/Trường Sa, fallback chỉ khi Photon không có địa chỉ và nuốt lỗi của fallback.
## Kết quả lệnh
- `pnpm --filter @tripory/itinerary lint` 0, `typecheck` 0, `test` 576/576 (baseline 523).
- Gốc `pnpm lint` 8/8 (0 lỗi, 1 cảnh báo cũ ở `day-tabs.test.tsx`), `pnpm typecheck` 8/8, `pnpm test` 8/8 (web 1995).
## Task Commits
1. Item 2 + 3: `6999099`
## Deviations from Plan
- Bullet test "'Đà Lạt'/'Da Lat' không gộp" trái với D-148 (gộp theo không dấu); test dùng 'Đà Lạt' và 'Da Lat City'.
## Self-Check: PASSED
