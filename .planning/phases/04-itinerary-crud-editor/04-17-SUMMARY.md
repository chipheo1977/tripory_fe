---
phase: 04-itinerary-crud-editor
plan: 17
subsystem: itinerary-editor-waypoint-form
tags: [location-field, waypoint-form-dialog, short-link-resolve, place-autofill, react-hook-form, draft, wave-8]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-07: parseLocationInput/formatCoordinate/PlaceHint; 04-09: useAddWaypoint/useUpdateWaypoint/useResolveShortLink; 04-10: /api/maps/resolve; 04-11: waypointSchema/mapWaypointError/FormFieldRow; 04-13: useSaveStatusStore; 04-14: ResponsiveFormSurface/draftStorage/useFormDraft"
provides:
  - "`useLocationState(raw, onPlace)` → `{ state, flush() }` và `LocationField` (modules/itinerary/ui/location-field.tsx), kèm các hằng copy `LOCATION_*`"
  - "`WaypointFormDialog` + `WaypointFormMode` (modules/itinerary/ui/waypoint-form-dialog.tsx): form thêm/sửa điểm đến dùng chung"
affects: [04-19, 04-20, 04-21]

tech-stack:
  added: []
  patterns: [debounced-resolve-with-stale-guard, controlled-location-field-over-rhf-controller, retained-mode-for-exit-animation]

key-files:
  created:
    - apps/web/src/modules/itinerary/ui/location-field.tsx
    - apps/web/src/modules/itinerary/ui/location-field.test.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-form-dialog.tsx
    - apps/web/src/modules/itinerary/ui/waypoint-form-dialog.test.tsx
  modified: []

key-decisions:
  - "`useLocationState` suy ra trạng thái đồng bộ từ `parseLocationInput(raw)`; chỉ link rút gọn mới có state resolve, lưu theo URL nguồn nên kết quả của chuỗi cũ không bao giờ hiện cho chuỗi mới. Job resolve nằm trong ref (timer + promise), `flush()` dùng lại đúng job đó nên không gọi route hai lần."
  - "Link rút gọn resolve ra link POI không tọa độ: gọi `onPlace` (D-49) và trả lỗi D-48. Link đích vẫn là link rút gọn hoặc không phải Google Maps thì coi là resolve thất bại."
  - "`LocationField` nhận thêm `error?` (lỗi từ Zod/BE/kiểm lúc gửi) và `inputRef?` so với hợp đồng trong plan; lỗi ưu tiên `error`, sau đó mới tới lỗi suy ra từ `state` khi `showError`."
  - "Form sửa giữ nguyên tọa độ đầy đủ đã lưu khi ô Vị trí không bị đụng tới: ô chỉ hiển thị 4 chữ số thập phân (khoảng 11 m), gửi lại giá trị làm tròn sẽ làm lệch điểm đến âm thầm."
  - "Footer dùng DOM order [gửi, Hủy, Xóa điểm đến] với `md:flex-row-reverse` để giao diện từ `md` đúng UI-SPEC (Xóa bên trái, Hủy, gửi bên phải) mà thứ tự Tab và bố cục cột dưới `md` vẫn tự nhiên."

requirements-completed: [ITIN-05, ITIN-06, ITIN-10]

duration: ~25 phút
completed: 2026-10-29
---

# Phase 4 Plan 17: Ô "Vị trí" và form thêm/sửa điểm đến Summary

**`LocationField` parse tọa độ hoặc link Google Maps ngay khi dán, resolve link rút gọn qua `/api/maps/resolve` (debounce 400ms, bỏ kết quả cũ), và `WaypointFormDialog` dùng chung cho thêm/sửa với tự điền Tên/Địa chỉ từ link địa điểm (D-48, D-49)**

## Commits

1. **Task 04-17-01 RED** — `bfda013` `test(04-17): add tests for useLocationState and LocationField`
2. **Task 04-17-01 GREEN** — `a03d92a` `feat(04-17): add useLocationState and LocationField`
3. **Task 04-17-02 RED** — `0a68f6a` `test(04-17): add tests for WaypointFormDialog`
4. **Task 04-17-02 GREEN** — `251e5e1` `feat(04-17): add WaypointFormDialog for adding and editing waypoints`

## Accomplishments

- **Task 1:** `useLocationState` + `LocationField`. "Đã nhận: lat, lng" (`CircleCheck` `text-success`, vùng `aria-live="polite"` nối `aria-describedby`) hiện ngay khi parse được, không chờ blur; lỗi parse chỉ hiện sau blur/gửi (`aria-invalid`). Link rút gọn: "Đang đọc link…" + Spinner, gọi resolve sau 400ms, URL trả về parse lại bằng `parseLocationInput`. Link POI không tọa độ: lỗi D-48 đúng nguyên văn, `onPlace` gọi đúng một lần. `flush()` ép resolve ngay (không gọi lần hai khi hết debounce). Input `type="text"`, `autoComplete`/`autoCapitalize="off"`, `spellCheck={false}`. 13 test.
- **Task 2:** `WaypointFormDialog` trên `ResponsiveFormSurface`: Tên (focus khi mở), Vị trí, Địa chỉ, Ghi chú; "Thêm điểm đến vào Ngày N" / "Sửa điểm đến" (không có ô ngày); thêm xong gọi `onAdded(waypoint)`, đóng form, không toast; sửa gọi `onUpdated(id)`; "Xóa điểm đến" (chỉ ở form sửa) đóng form và gọi `onDeleteRequested` mà không gửi gì. Tự điền Tên/Địa chỉ chỉ khi ô trống, kèm "Đã lấy tên từ link, bạn có thể sửa.". Gửi khi link đang resolve thì chờ `flush()` rồi mới validate. Lỗi BE: `Coordinate.Invalid*` gắn dưới ô Vị trí, lỗi khác thành `InlineAlert`, form giữ nguyên giá trị. Bản nháp: `restored` hiện "Đã khôi phục nội dung chưa lưu"; Hủy/thành công xóa khóa `add:{ngày}`/`edit:{id}`; hết phiên ghi bản nháp qua `useFormDraft`. Scrim không đóng, đang gửi không đóng được (Esc, Hủy). 21 test.
- **Threat model:** T-04-47 (chuỗi dán không bao giờ render lại; parser bỏ ký tự điều khiển và cắt độ dài; chỉ tọa độ chuẩn hóa được hiện), T-04-49 (debounce 400ms, id job bỏ kết quả cũ, một route call mỗi chuỗi), T-04-48 chấp nhận (chỉ URL rút gọn tới route cùng origin).

## Verification

- `pnpm --filter @tripory/web exec vitest run location-field waypoint-form-dialog`: 13 + 21 = 34 test xanh.
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 86 file, 1333 test xanh (gồm guard design token và auth-invariants). ESLint boundaries không đổi.
- Acceptance: `nhấn giữ vào địa điểm để lấy tọa độ` có trong `location-field.tsx`; câu cũ "Chọn một địa điểm trong Google Maps rồi chia sẻ lại" không có; `Đã lấy tên từ link, bạn có thể sửa.` có trong `waypoint-form-dialog.tsx`; `notify.` không có trong file đó.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gửi lại tọa độ làm tròn khi sửa không đụng ô Vị trí**
- **Found during:** Task 2 (thiết kế form sửa)
- **Issue:** plan điền ô bằng `formatCoordinate` (4 chữ số thập phân). Sửa tên rồi lưu sẽ parse lại chuỗi đó và ghi đè tọa độ đầy đủ bằng giá trị làm tròn (lệch tới khoảng 11 m).
- **Fix:** khi `values.location.trim()` bằng chuỗi hiển thị ban đầu thì gửi `waypoint.coordinate` gốc; đổi ô thì gửi tọa độ mới. Có 2 test (giữ nguyên / đổi).
- **Files modified:** waypoint-form-dialog.tsx
- **Commit:** 251e5e1

**2. [Mở rộng chữ ký, theo hợp đồng plan] `LocationField` thêm `error?` và `inputRef?`**
- Hợp đồng liệt kê `showError` nhưng form cần hiện lỗi từ Zod/BE/kiểm lúc gửi trong cùng khối và cần ref để RHF focus ô lỗi. Cả hai là prop tùy chọn, không phá hợp đồng.

**3. [Bố cục] Footer dùng `md:flex-row-reverse` thay vì `md:flex-row`**
- Plan gợi ý `flex flex-col gap-inline-sm md:flex-row md:items-center`. Để thứ tự DOM/Tab là gửi → Hủy → Xóa mà hình thức từ `md` vẫn là Xóa (trái), Hủy, gửi (phải) đúng UI-SPEC, dùng đảo hàng từ `md`. Dưới `md` là cột đúng spec; footer `sticky bottom-0` chỉ dưới `md`.

## Known Stubs

None. `restored`, `onDirtyChange`, `onAdded`, `onUpdated`, `onDeleteRequested` là prop do editor (plan sau) nối: đọc bản nháp bằng `draftStorage.findFirst`, làm nổi điểm mới, chạy luồng xóa có hoàn tác bằng `usePendingDelete` (04-18) và trả focus.

## Notes cho plan sau

- Editor truyền `mode` mới mỗi lần mở; `WaypointFormDialog` giữ `mode` cuối trong lúc hiệu ứng đóng. `onClose` luôn được gọi trước `onAdded`/`onUpdated` khi thành công.
- Focus về nút đã mở form và live region "Đã thêm {tên} vào Ngày N" là việc của editor, không nằm trong dialog.
- Chưa kiểm bằng trình duyệt thật: Sheet dưới `md` với bàn phím ảo, dán link thật từ app Google Maps (link rút gọn qua BE thật), footer sticky.

## Self-Check: PASSED
