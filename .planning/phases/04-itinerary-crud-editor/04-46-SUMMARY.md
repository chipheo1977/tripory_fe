---
phase: 04-itinerary-crud-editor
plan: 46
subsystem: web-map
tags: [maplibre, react-map-gl, camera, attribution, wave-28]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-43 map-view (MapPinModel, DayRouteModel, MapFitTarget), 04-44 BASEMAP_STYLE, 04-45 MapPin/MapZoomControls"
provides:
  - "TripMap (react-map-gl/maplibre), LazyTripMap (next/dynamic ssr:false), TripMapPin, MapStatus"
  - "map-camera.ts: hằng, cameraCallFor, isInsideSafeArea, prefersReducedMotion, MapViewport, MapCameraCommand"
  - "readDayColors/readDimmedOpacity từ token; MapAttribution; fake react-map-gl cho test"
affects: [04-49, 04-50, 04-51, 04-52, 04-53]
tech-stack:
  added: []
  patterns: ["Camera là lệnh có seq, chạy một lần mỗi seq, giữ lại tới khi load", "Mức thu nhỏ tối đa qua prop minZoom", "Thư viện bản đồ chỉ ở thư mục modules/itinerary/ui/map"]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/map/map-camera.ts
    - apps/web/src/modules/itinerary/ui/map/day-colors.ts
    - apps/web/src/modules/itinerary/ui/map/map-attribution.tsx
    - apps/web/src/modules/itinerary/ui/map/trip-map.tsx
    - apps/web/src/modules/itinerary/ui/map/trip-map.lazy.tsx
    - apps/web/src/modules/itinerary/ui/map/route-layer.tsx
    - apps/web/src/modules/itinerary/ui/map/pin-markers.tsx
    - apps/web/src/modules/itinerary/ui/map/use-map-camera.ts
    - apps/web/src/modules/itinerary/ui/map/use-map-canvas.ts
    - apps/web/src/test/fake-react-map-gl.tsx
  modified: []
key-decisions:
  - "Mức thu nhỏ tối đa đi qua prop minZoom của Map: MapRef của react-map-gl loại setMinZoom (ghi chú 'may break the react binding')"
  - "Tách RouteLayer, PinMarkers, useMapCamera, useMapCanvas để trip-map.tsx ngắn (~130 dòng)"
  - "Pin mờ có pointer-events none cả ở Marker lẫn MapPin; click lọt vào vẫn bị bỏ qua"
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 46: TripMap và helper camera Summary
**TripMap chỉ nạp phía client, vẽ pin/đường từ dữ liệu domain, canh khung bằng lệnh camera có seq, nút zoom và ghi công riêng; 22 test với react-map-gl giả.**
## Accomplishments
- `TripMap`: style riêng, worker `new URL(..., import.meta.url)`, không xoay/nghiêng, không AttributionControl/NavigationControl, locale `Map.Title`, canvas `aria-describedby`, Esc trên canvas bỏ chọn.
- Lệnh camera `fit`/`focus`/`reveal`: `fitBounds` tối đa zoom 15, một điểm zoom 14, focus/reveal giữ zoom, reduced motion đọc lúc gọi, `reveal` chỉ dời khi pin + nhãn ra ngoài vùng an toàn.
- Đường nối: nguồn GeoJSON cục bộ, màu và độ mờ đọc từ token; nút zoom và ghi công chỉ hiện sau `load`.
## Task Commits
1. Task 1 (camera, màu ngày, ghi công): `439b068`
2. Task 2 (TripMap, lazy, fake, hook/phần con): `ac4ba28`
## Deviations from Plan
**[Rule 3 - Blocker] `setMinZoom` không có trên `MapRef`** - Found during: Task 2 typecheck | Issue: react-map-gl loại `setMinZoom` khỏi `MapRef` | Fix: TripMap giữ `minZoom` trong state, lấy từ `cameraForBounds(VIETNAM_VIEW_BOUNDS)` lúc load và mỗi lần `resize`, truyền qua prop `minZoom`; test kiểm `props.minZoom === 4` thay cho `setMinZoom` được gọi | Files: use-map-canvas.ts, trip-map.tsx, trip-map.test.tsx.
**[Rule 3 - Lint] Gán biến module trong lúc render của fake** - rule `react-hooks/immutability` | Fix: ghi qua hàm `capture` ở `fake-react-map-gl.tsx`.
Thêm 4 file nhỏ (route-layer, pin-markers, use-map-camera, use-map-canvas) so với danh sách files_modified của plan để giữ mỗi file ngắn (plan cho phép tách).
**Total deviations:** 2 auto-fixed (Rule 3). **Impact:** hành vi đúng thiết kế; không đổi hợp đồng của `TripMapProps`.
## Chưa kiểm
- Hiển thị thật trên trình duyệt (WebGL, worker, tile, ghi công, zoom): jsdom không có WebGL; kiểm ở 04-52 (build, worker trong `.next/static`) và UAT 04-53.
## Verification
| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @tripory/web lint` / `typecheck` | exit 0 |
| `pnpm --filter @tripory/web test -- --run` | 118 file, 1816 test (baseline ~1741) |
| `pnpm --filter @tripory/design-tokens test -- --run` | 32/32 |
| Thư viện bản đồ ngoài thư mục map | không có; `boundaries.mjs` không đổi |
## Self-Check: PASSED
