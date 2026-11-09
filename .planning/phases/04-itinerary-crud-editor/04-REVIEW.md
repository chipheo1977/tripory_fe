---
phase: 04-itinerary-crud-editor
reviewed: 2026-11-05T00:00:00Z
depth: standard
focus: "Mục E UAT (Bổ sung mở lại lần 2, bản đồ), plan 04-42..04-53, PUB-06"
files_reviewed: 28
files_reviewed_list:
  - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
  - apps/web/src/modules/itinerary/ui/day-overview-row.tsx
  - apps/web/src/modules/itinerary/ui/day-panel.tsx
  - apps/web/src/modules/itinerary/ui/day-tabs.tsx
  - apps/web/src/modules/itinerary/ui/destination-cover.ts
  - apps/web/src/modules/itinerary/ui/editor-layout.tsx
  - apps/web/src/modules/itinerary/ui/editor-map-area.tsx
  - apps/web/src/modules/itinerary/ui/editor-map-pins.ts
  - apps/web/src/modules/itinerary/ui/editor-map-viewport.ts
  - apps/web/src/modules/itinerary/ui/editor-timeline-body.tsx
  - apps/web/src/modules/itinerary/ui/map-edit-info-button.tsx
  - apps/web/src/modules/itinerary/ui/map-status-overlay.tsx
  - apps/web/src/modules/itinerary/ui/map/basemap-style.ts
  - apps/web/src/modules/itinerary/ui/map/day-colors.ts
  - apps/web/src/modules/itinerary/ui/map/map-attribution.tsx
  - apps/web/src/modules/itinerary/ui/map/map-camera.ts
  - apps/web/src/modules/itinerary/ui/map/map-control-column.tsx
  - apps/web/src/modules/itinerary/ui/map/pin-markers.tsx
  - apps/web/src/modules/itinerary/ui/map/route-layer.tsx
  - apps/web/src/modules/itinerary/ui/map/trip-map.lazy.tsx
  - apps/web/src/modules/itinerary/ui/map/trip-map.tsx
  - apps/web/src/modules/itinerary/ui/map/use-map-camera.ts
  - apps/web/src/modules/itinerary/ui/map/use-map-canvas.ts
  - apps/web/src/modules/itinerary/ui/overview-format.ts
  - apps/web/src/modules/itinerary/ui/overview-panel.tsx
  - apps/web/src/modules/itinerary/ui/overview-summary.tsx
  - apps/web/src/modules/itinerary/ui/timeline-panel.tsx
  - apps/web/src/modules/itinerary/ui/use-editor-tab.ts
  - apps/web/src/modules/itinerary/ui/use-map-camera.ts
  - apps/web/src/modules/itinerary/ui/use-map-selection.ts
  - apps/web/src/modules/itinerary/ui/use-tab-strip.ts
  - apps/web/src/modules/itinerary/ui/waypoint-day-field.tsx
  - apps/web/src/modules/itinerary/ui/timeline-add-bar.tsx
  - packages/ui-web/src/molecules/map-pin.tsx
  - packages/ui-web/src/molecules/map-zoom-controls.tsx
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 4: Code Review Report (mục E, bản đồ)

**Reviewed:** 2026-11-05
**Depth:** standard
**Phạm vi:** file theo `git diff 9dddc79~1..HEAD` (plan 04-42..04-53, bỏ test, md, lockfile) và đọc kỹ các file có logic bản đồ. File ngoài danh sách (waypoint-form-dialog, waypoint-list, sortable-waypoint-item, sheet.tsx, trip-cover, trip-summary, editor-skeleton, viewer.server.ts, token CSS) chỉ đối chiếu khi cần, chưa rà từng dòng.
**Quy tắc áp dụng:** `.kiro/steering/code-review.md` và coding-rules của workspace.

## Summary

Không có lỗ hổng bảo mật. Token không xuất hiện ở client. Bản đồ không gửi dữ liệu lịch trình ra ngoài: style chỉ trỏ tới tile/glyph OpenFreeMap, pin và đường là marker và GeoJSON cục bộ. Tên điểm hiển thị bằng text node React, không dùng `dangerouslySetInnerHTML`. Lọc chủ quyền Hoàng Sa/Trường Sa áp lên mọi lớp symbol nguồn `openmaptiles` và lớp ranh giới. Có một lỗi hành vi thật (focus bị cướp), hai vi phạm quy tắc SOLID/JSX, và vài điểm nhỏ.

## Warnings

### WR-01: `focusRequest` không bao giờ bị xóa, nên cướp focus khi quay lại tab Tổng quan

**File:** `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx:436-440`
**Issue:** Effect chạy lại mỗi khi `activeTab` đổi, và điều kiện chỉ xét `activeTab === "overview"` cùng `focusRequest?.target === "add"`. `focusRequest` được đặt `{target:"add"}` sau khi thêm điểm (`handleAdded`) hoặc xóa điểm cuối ngày (`removeWaypoint`), và không có chỗ nào đặt lại về `null` (`WaypointList` chỉ đọc). Kịch bản tái hiện: xóa điểm cuối cùng của Ngày 1 (focus đúng về nút thêm), rồi chuyển sang tab "Tổng quan" bằng chuột hoặc bàn phím. Focus nhảy khỏi tab sang nút "Thêm điểm đến" của Tổng quan. Người dùng bàn phím và trình đọc màn hình mất vị trí trong hàng tab (E12, D-128). Lặp lại mỗi lần vào Tổng quan cho tới khi `focusRequest` được thay.
**Fix:** Chỉ áp focus một lần cho mỗi yêu cầu, bằng cách xóa yêu cầu sau khi xử lý hoặc gắn `seq`:
```tsx
useEffect(() => {
  if (activeTab !== "overview" || focusRequest?.target !== "add") return;
  addButtonRef.current?.focus();
  setFocusRequest(null);
}, [activeTab, focusRequest]);
```
Phương án thay thế: đưa `seq` vào `WaypointFocusRequest` và lưu `appliedSeq` trong ref, giống `DayTabs.focusRequest`.

### WR-02: `LoadedEditor` gộp quá nhiều mối quan tâm (SOLID-S/I)

**File:** `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx:241-540`
**Issue:** Một component dài khoảng 300 dòng, 16 `useState`, 2 timer ref, các handler cho chọn pin, camera, tab, form, highlight, xóa chờ hoàn tác, publish và xóa lịch trình. Plan 04-51 thêm khoảng 10 handler và state (`sheetRequest`, `tabFocus`, `recentDay`, `flashRecentDay`, `handlePinSelect`, `handleActivate`, `rowEmphasis`...). Vượt ngưỡng 150 dòng của coding-rules (S, I) và làm lỗi như WR-01 khó thấy.
**Fix:** Tách thành các hook một việc: `useWaypointFeedback` (highlight, recentDay, liveMessage, timer), `useEditorMapInteraction` (selection, camera, sheetRequest, `handlePinSelect`, `handleActivate`, `changeTab`, `selectDayFromRow`), `useEditorDialogs` (form, tripInfo, publish, delete). `LoadedEditor` chỉ ghép lại. Có thể làm sau khi sửa WR-01.

### WR-03: Lệnh `fit` trong `useMapCamera` bị dùng kèm tính toán dư ở mỗi lần render

**File:** `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx:~273`
**Issue:** `useMapCamera(fitTargetFor(itinerary, emptyPending, tab, destinationBounds))` tính `fitTargetFor` ở mọi lần render, nhưng hook chỉ dùng giá trị khởi tạo (`useState` initial). Phần tính toán còn lại bị bỏ đi. Không sai kết quả, nhưng gây hiểu nhầm là camera bám theo lịch trình. Mức Warning vì người sửa sau dễ kỳ vọng camera tự cập nhật khi dữ liệu đổi (hiện chỉ đổi qua `changeTab`).
**Fix:** Truyền hàm khởi tạo lười (`useMapCamera(() => fitTargetFor(...))`) hoặc ghi chú rõ trong JSDoc của hook rằng tham số chỉ là giá trị đầu.

## Info

### IN-01: Hiển thị JSX bằng `? :` trái luật

**File:** `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx:160`
**Issue:** `{withTitle ? <title>{TITLE_FALLBACK}</title> : null}` dùng `? :` để ẩn/hiện phần tử, trái luật "không dùng `? :`/`&&` để ẩn/hiện trong JSX".
**Fix:** Tách `TitleOrNothing({ visible, children })` (tương tự các component dùng prop `visible` khác) hoặc để `EditorForbidden` tự đặt title và bỏ prop `withTitle`.

### IN-02: Vùng bấm mở "Thông tin chuyến đi" cũng chạy khi người dùng bôi đen chữ

**File:** `apps/web/src/modules/itinerary/ui/overview-summary.tsx:46-50, 65`
**Issue:** `onClick` trên `div` mở dialog khi bấm vào nền. Kéo chuột để chọn đoạn mô tả cũng sinh `click` và mở dialog. Thiết kế đã ghi nhận việc bỏ role/tabindex (bàn phím có nút bánh răng), nên không phải lỗi a11y, nhưng gây khó chịu khi sao chép mô tả.
**Fix:** Bỏ qua khi `window.getSelection()?.toString() !== ""`.

### IN-03: Nhãn chủ quyền biến mất ở zoom ≥ 10 trong khi bước E2 yêu cầu thấy nhãn ở zoom ~12

**File:** `apps/web/src/modules/itinerary/ui/map/basemap-style.ts:257`; `.planning/phases/04-itinerary-crud-editor/04-UAT-CHECKLIST.md` (E2)
**Issue:** Lớp `sovereignty-labels` có `maxzoom: 10` đúng theo UI-SPEC D-113 mục 4, còn E2 viết "phóng tới zoom ~12 quanh đảo Phú Lâm/Ba Bình ... Thấy nhãn". Ở zoom 12 nhãn đó không vẽ, còn nhãn OSM đã bị lọc, nên vùng đảo trống chữ. Hoặc spec hoặc câu chữ E2 cần sửa cho khớp; kết quả PASS đã ghi cho E2 nên nên xác nhận lại người kiểm nhìn thấy gì ở zoom 12.
**Fix:** Hoặc nâng `maxzoom` lên 13-14 (và cập nhật UI-SPEC, plan 04-44, test style), hoặc sửa E2 thành "thấy nhãn ở mức thu nhỏ; ở zoom ~12 không có nhãn tên nước ngoài hay ranh giới".

### IN-04: Nhánh không bao giờ chạy trong `centerOf`

**File:** `apps/web/src/modules/itinerary/ui/map/map-camera.ts:65-68`
**Issue:** `cameraCallFor` đã xử lý `fit`+`bounds` và `fit`+`point` ở trên, nên nhánh `command.kind === "fit"` trong `centerOf` không đạt được (và `bounds[0]` không phải tâm). Chỉ tồn tại để thỏa kiểu.
**Fix:** Cho `centerOf` nhận kiểu `Extract<MapCameraCommand, {kind: "focus" | "reveal"}>`, hoặc dùng `switch` có `never` ở nhánh còn lại.

### IN-05: `statusRef` thừa và comment sai ở `use-tab-strip`

**File:** `apps/web/src/modules/itinerary/ui/map/trip-map.tsx:80-87`; `apps/web/src/modules/itinerary/ui/use-tab-strip.ts:9-10`
**Issue:** `TripMap` giữ `statusRef` chỉ để gọi `"loading"` một lần lúc mount, trong khi `handleLoad`/`handleError` gọi thẳng `onStatusChange`. `EditorMapArea.handleStatus` đã ổn định (`useCallback`), nên `statusRef` và effect không deps chạy mỗi render không cần. Ở `use-tab-strip`, JSDoc nói "chuột phải di chuyển" nhưng ý là di chuyển ngang; hai comment liền nhau về cùng một hằng.
**Fix:** Gọi `onStatusChange("loading")` trực tiếp trong effect mount, bỏ `statusRef`. Sửa JSDoc thành "Quãng chuột di chuyển ngang (px) mới tính là kéo".

### IN-06: Ép kiểu `as never`, hex trong style, định dạng không đồng nhất

**File:** `apps/web/src/modules/itinerary/ui/map/route-layer.tsx:48`; `apps/web/src/modules/itinerary/ui/map/basemap-style.ts` (cả file); `apps/web/src/modules/itinerary/ui/day-tabs.tsx:106-139`
**Issue:** `data={... as never}` tắt kiểm tra kiểu của nguồn GeoJSON; màu route có thể thành chuỗi rỗng `""` nếu token thiếu (`colors[...] ?? ""`), khi đó MapLibre ghi lỗi style. `basemap-style.ts` dùng nháy đơn và `ExpressionSpecification` như phần còn lại của `ui-web`, khác nháy kép của `apps/web` (hex ở đây đã được ghi chú là cố ý). `day-tabs.tsx` có `<div className="relative">` thụt lề sai so với nội dung bên trong.
**Fix:** Khai báo `RouteCollection` tương thích `GeoJSON.FeatureCollection` thay cho `as never`; bỏ qua feature có màu rỗng. Chạy formatter cho hai file.

## Đối chiếu quy tắc

| Quy tắc | Kết quả |
|---|---|
| Không token ở client, chỉ qua BFF | Đạt: file trong phạm vi không gọi BE. Request ra ngoài chỉ có tile/glyph OpenFreeMap. |
| `dangerouslySetInnerHTML` | Đạt: không dùng. |
| Chuỗi tiếng Việt | Đạt. |
| Loading / empty / error | Đạt: skeleton, chip rỗng, `MapErrorFallback` có "Thử lại", timeout 15 giây. |
| a11y | Đạt: pin `aria-hidden`, canvas có nhãn, nút zoom và bánh răng có `aria-label`. Lưu ý WR-01 (focus). |
| `? :` / `&&` tối đa 1 cấp, không ẩn/hiện JSX | Một vi phạm (IN-01). Phần còn lại dùng prop `visible` hoặc early return. |
| SOLID | WR-02. `DayOverviewRow`, `OverviewPanel`, `EditorMapArea`, `MapPin` đạt. `DayPanel` nhận cả `itinerary` và `day` nhưng chỉ cần `itinerary.id` và `day` (nhẹ, bỏ qua). |
| Ranh giới tầng | Đạt: `ui-web` nhận props, không gọi API. Không thấy import xuyên tầng. |

_Reviewed: 2026-11-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
