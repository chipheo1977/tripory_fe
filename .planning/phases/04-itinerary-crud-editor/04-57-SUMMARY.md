---
phase: 04-itinerary-crud-editor
plan: 57
subsystem: itinerary-ui
tags: [place-search, combobox, autofill, react-query, wave-36]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-56"
provides:
  - "createPlaceHooks(lookup) + placeKeys ('@tripory/itinerary/react'); composition apps/web/src/composition/places.client.ts"
  - "SearchInput: prop tùy chọn inputRef (tương thích ngược)"
  - "Khối Vị trí hai chế độ (Tìm / Nhập tọa độ thủ công) trong WaypointFormDialog, tự điền Tên/Địa chỉ, reverse cho tọa độ nhập tay"
affects: [04-58]
tech-stack:
  added: []
  patterns: ["combobox ARIA 1.2 inline (listbox ngay dưới ô)", "ẩn/hiện qua prop visible", "điều chỉnh state theo prop thay vì effect"]
key-files:
  created:
    - packages/itinerary/src/react/place-hooks.ts
    - apps/web/src/composition/places.client.ts
    - apps/web/src/modules/itinerary/ui/place/place-list-state.ts
    - apps/web/src/modules/itinerary/ui/place/combobox-navigation.ts
    - apps/web/src/modules/itinerary/ui/place/location-mode.ts
    - apps/web/src/modules/itinerary/ui/place/use-debounced-value.ts
    - apps/web/src/modules/itinerary/ui/place/use-place-results.ts
    - apps/web/src/modules/itinerary/ui/place/use-location-session.ts
    - apps/web/src/modules/itinerary/ui/place/place-option.tsx
    - apps/web/src/modules/itinerary/ui/place/place-list-message.tsx
    - apps/web/src/modules/itinerary/ui/place/place-attribution.tsx
    - apps/web/src/modules/itinerary/ui/place/place-search-field.tsx
    - apps/web/src/modules/itinerary/ui/place/picked-place-summary.tsx
    - apps/web/src/modules/itinerary/ui/place/use-place-autofill.ts
    - apps/web/src/modules/itinerary/ui/place/use-reverse-autofill.ts
    - apps/web/src/modules/itinerary/ui/waypoint-location-block.tsx
  modified:
    - packages/itinerary/src/react/index.ts
    - packages/itinerary/src/exports.test.ts
    - packages/ui-web/src/molecules/search-input.tsx
    - apps/web/src/modules/itinerary/ui/location-field.tsx
    - apps/web/src/modules/itinerary/ui/destination-cover.ts
    - apps/web/src/modules/itinerary/ui/form-schemas.ts
    - apps/web/src/modules/itinerary/ui/waypoint-form-dialog.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
key-decisions:
  - "Reverse chỉ chạy cho tọa độ trần (source 'coordinates') mới, không cho link Google Maps (giữ D-49) và không cho giá trị lúc mở form hoặc tọa độ của địa điểm vừa chọn"
  - "'Đổi địa điểm' xóa ô Vị trí và đưa focus về ô tìm; chọn xong focus về nút 'Đổi địa điểm'"
requirements-completed: [MAP-01]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 57: Form thêm điểm tìm địa điểm Summary
**Ô "Vị trí" mặc định là combobox tìm địa điểm ở Việt Nam qua BFF, có gợi ý theo điểm đến, tự điền Tên/Địa chỉ theo D-149 và ghi công OSM; ô dán tọa độ/link cũ vẫn còn ở "Nhập tọa độ thủ công".**
## Đã làm
- `createPlaceHooks`: `usePlaceSearch` (bật khi ≥ 2 ký tự, 5 phút, giữ kết quả cũ khi tải), `usePlaceSuggestions` (bật khi có điểm đến, 1 giờ), `useReversePlace` (1 giờ). `places.client.ts` lắp `createHttpPlaceLookup(appHttp)`; 17 mock `createItineraryHooks` không đổi.
- Helper thuần: `placeListState` + `placeErrorMessage` + `placeStatusText`, `nextActiveIndex`, `initialLocationMode`, `destinationNameFor`.
- `PlaceSearchField` (combobox, debounce 300 ms, ↓/↑ vòng, Enter chọn và không gửi form, Esc bỏ mục → xóa chữ → đóng form khi trống, `data-escape-scope`, vùng `role=status`), `PlaceListbox`/`PlaceOption`, `PlaceListMessage` (đang tìm / nhắc / không thấy / lỗi + "Thử lại"), `PlaceAttribution`, `PickedPlaceSummary`.
- `usePlaceAutofill` (`applyPicked`, `applyReverse`, `applyLinkHint` giữ D-49, `forget`), `useReverseAutofill` (dòng trạng thái reverse 4 câu), `useLocationSession` (chế độ + địa điểm đã chọn, reset khi mở lại form).
- `WaypointLocationBlock` (`useFormContext` + `Controller name="location"`) thay block cũ trong `WaypointFormDialog` (bọc `FormProvider`, prop tùy chọn `destinationCode`); editor truyền `itinerary.destinationCode`; `LOCATION_REQUIRED` = "Vui lòng chọn địa điểm hoặc nhập tọa độ.".
## Kết quả lệnh
- `pnpm --filter @tripory/web test -- place-list-state combobox-navigation location-mode destination-cover place-search-field waypoint-form-dialog itinerary-editor form-schemas` 228/228 (9 file).
- Gốc `pnpm lint` 8/8 (0 lỗi, 1 cảnh báo cũ `day-tabs.test.tsx`), `pnpm typecheck` 8/8, `pnpm test` 8/8: config 114, shared-kernel 32, design-tokens 33, api-client 98, identity 244, itinerary 617, ui-web 378, web 2138 (136 file).
- `pnpm --filter @tripory/web build` thoát 0; `/api/places/*` là route động.
## Task Commits
1. Item 6..9 + SUMMARY 04-55..04-57 + ROADMAP: commit `feat(04-57)` (sha trong `git log`)
## Deviations from Plan
- `PlaceSearchField` nhận `visible` và `errorId` (có lỗi thì `aria-invalid` + `aria-describedby`) thay cho cặp `invalid`/`describedById`, để giữ ≤ 7 prop.
- Trong `FormField`, Base UI gắn `aria-labelledby` = nhãn "Vị trí" và thắng `aria-label`, nên combobox dùng nhãn `sr-only` "Tìm địa điểm" qua `aria-labelledby` để có đúng tên ở bảng copy.
- `LocationField` thêm prop tùy chọn `visible` (mặc định `true`); thêm `use-location-session.ts`; hàm `onNameTyped` đặt tên `forget` (cũng gọi khi đóng form).
- React Hook Form 7.89 `setFocus` chạy trong `setTimeout`: test focus sau khi đổi chế độ dùng `waitFor`.
- Chỉ `itinerary-editor.test.tsx` (ngoài `waypoint-form-dialog.test.tsx`) cần mock `places.client`; các file khác render form không đỏ.
## Chưa kiểm (thuộc 04-58)
- Gọi Photon/Nominatim thật, giới hạn thật, trình đọc màn hình, iPhone Safari/Android Chrome, sheet 320×568 có bàn phím ảo.
## Self-Check: PASSED
