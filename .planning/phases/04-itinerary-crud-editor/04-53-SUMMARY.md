---
phase: 04-itinerary-crud-editor
plan: 53
subsystem: verification
tags: [uat, human-checkpoint, map, sheet, wave-33]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-42..04-52"
provides:
  - "UAT mục E (E1..E14) của bản đồ và tab Tổng quan: người dùng xác nhận PASS toàn bộ"
  - "Các sửa lỗi phát sinh trong lượt UAT (xem Task Commits)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Token cỡ chữ caption 12px (primitive-font-size-0 → semantic-font-size-caption → text-caption)"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/timeline-add-bar.tsx
    - apps/web/src/modules/itinerary/ui/map-edit-info-button.tsx
    - apps/web/src/modules/itinerary/ui/map/map-control-column.tsx
  modified:
    - .planning/phases/04-itinerary-crud-editor/04-UAT-CHECKLIST.md
    - .planning/phases/04-itinerary-crud-editor/04-UI-SPEC.md
key-decisions:
  - "Lớp `park` của OSM gần Hoàng Sa: người dùng duyệt giữ nguyên, không đổi style bản đồ."
  - "Pin bản đồ giữ theo D-128: `aria-hidden`, không focusable; đường bàn phím là danh sách điểm."
  - "Thêm token `caption` (12px) vào design system thay vì dùng `label` 14px cho dòng km của tab."
requirements-completed: [PUB-06]
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 53: UAT bản đồ và tab Tổng quan Summary
**Người dùng chạy UAT mục E (E1..E14) trên trình duyệt thật và xác nhận tất cả PASS sau khi các lỗi phát sinh được sửa.**

## Cách ghi nhận kết quả (trung thực)
- Mọi dòng PASS ở mục E của `04-UAT-CHECKLIST.md` dựa trên **xác nhận của người dùng**. Agent không tự đánh PASS. Người dùng tự ghi phần lớn các dòng; orchestrator ghi E6, E7, E12, E13, E14 theo yêu cầu của người dùng.
- Agent **không tự kiểm** E12 (bàn phím + trình đọc màn hình), E13 (smoke 320/390/768/1440 với mọi mức sheet) và E14 (console WebGL/worker, một canvas, không tải chunk maplibre ở trang danh sách). Agent cũng **không kiểm** iOS Safari và thiết bị cảm ứng thật (home indicator, thanh địa chỉ co giãn). Các mục này chỉ có xác nhận của người dùng.
- Agent đã chạy Chrome headless thật (CDP, touch/chuột giả lập) cho từng sửa lỗi bên dưới; phạm vi từng lần kiểm nằm trong commit message.

## Kết quả lệnh (HEAD trước commit tài liệu, Windows, `pnpm --filter`)
| Gói | lint | typecheck | test | Số test |
|-----|------|-----------|------|---------|
| @tripory/design-tokens | 0 | 0 | 0 | 33 |
| @tripory/itinerary | 0 | 0 | 0 | 523 (lần chạy ở 04-52, không đổi) |
| @tripory/ui-web | 0 | 0 | 0 | 377 |
| @tripory/config | - | - | 0 | 114 (không đổi) |
| @tripory/web | 0 (1 warning cũ `day-tabs.test.tsx`) | 0 | 0 | 1986 trong 128 file |
| `pnpm --filter @tripory/web build` | exit 0 |

## Task Commits
Sửa lỗi theo kết quả UAT:
1. `b2b4228`: crash `disableRotation` (`MapRef` không có `touchZoomRotate`/`keyboard`, dùng `getMap()`) và lỗi prerender `Date.now()` của cổng phiên (`connection()`).
2. `d229e8b`: hàng tab ngày cuộn ngang bằng vuốt/kéo chuột thay thanh cuộn.
3. `0b94d9c`, `cb8812e`: thanh "Thêm điểm đến" thấy được và sát đáy màn hình ở cả ba mức sheet.
4. `55a168e`: nút zoom 48px → 32px.
5. `252d047`: nút chữ "Sửa thông tin" ở Tổng quan thay bằng nút bánh răng trên bản đồ (cột điều khiển phải trên, trên nút "+"); dòng E5 cập nhật.
6. `afe3de2`: sheet timeline một vùng cuộn (thân tab), tay cầm và hàng tab đứng yên, peek không cuộn, vuốt thân chỉ cuộn; kèm `font-regular` của dòng km.
7. `814ef46`: pin không chọn được sau khi từng bị mờ (react-map-gl không xóa style cũ của `Marker`); fake `Marker` trong test bắt chước thư viện thật.
8. `ccf6291`: token `caption` 12px. `bfc5bcd`: dòng km của tab dùng `text-caption`.
Mục E đã có từ 04-52 (`6b5dd10`).

## Deviations from Plan
1. **Rule 1 (lỗi), nhiều lần:** các sửa ở mục Task Commits không nằm trong plan; mỗi lỗi do UAT phát hiện, có test hồi quy khi hợp lý.
2. **Thêm token `caption` (12px)** vào design system theo lựa chọn của người dùng. Số cỡ chữ trong UI-SPEC từ 4 thành 5; chỉ dùng cho dòng km của tab.
3. **Thay đổi sản phẩm theo yêu cầu người dùng trong lượt UAT:** nút "Sửa thông tin" thành bánh răng trên bản đồ; hành vi cử chỉ sheet (vuốt nội dung không kéo sheet; kéo bằng tay cầm hoặc hàng tab).
4. **UI-SPEC** cập nhật các mục tương ứng (nút zoom 32px, `MapEditInfoButton`/`MapControlColumn`, cuộn trong sheet timeline, thanh Thêm điểm đến, typography caption).
5. Bản sửa `afe3de2` thay cách làm của `cb8812e`/`0b94d9c` (nâng `bottom` bằng ngữ cảnh) bằng vùng cuộn riêng của `TimelinePanel`.

## Chưa kiểm bởi agent
- iOS Safari và thiết bị cảm ứng thật (vùng an toàn, thanh địa chỉ).
- E12, E13, E14 (chỉ có xác nhận của người dùng).
- Dữ liệu BE thật trong editor (agent dùng BFF giả lập bằng CDP).
- Dòng ngày ở Tổng quan được làm nổi khi bấm pin, và cuộn thẻ điểm vào khung: chỉ có unit test.

## Thay đổi chưa commit của người dùng (không thuộc plan này)
- `apps/web/src/modules/itinerary/ui/day-overview-row.tsx` và `overview-panel.tsx` (kiểu dáng/padding dòng ngày): không commit theo yêu cầu.

## Self-Check: PASSED
