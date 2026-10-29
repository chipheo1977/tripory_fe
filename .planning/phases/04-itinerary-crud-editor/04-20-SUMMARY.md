---
phase: 04-itinerary-crud-editor
plan: 20
subsystem: itinerary-editor-frame
tags: [editor-layout, editor-header, forbidden, not-found, sheet-inset, resize-observer, wave-9]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-03: route groups (editor) + EditorSkeleton; 04-04: Sheet modal/dismissible/defaultSnap/insetTop; 04-13: SaveIndicator + UserMenu compact; 04-14: useMediaQuery; 04-15: PublishButton + PublishHintStrip"
provides:
  - "`NotFoundView` (apps/web/src/components): thân 404 dùng chung cho `app/not-found.tsx` và 404 phát hiện ở client của editor (D-46)"
  - "`EditorForbidden`: thân trang 403 (EmptyState icon Lock, link dạng nút về `/itineraries/mine`, title tài liệu riêng) (D-45)"
  - "`EditorHeader` + `EditorHeaderMinimal`: header toàn màn sticky `z-sticky` (D-16, D-41)"
  - "`EditorLayout({ header, timeline, canvas, summary })`: khung 4 slot, lưới hai cột từ `lg`, Sheet không modal đo header bằng ResizeObserver dưới `lg` (D-13..D-15)"
affects: [04-21]
tech-stack:
  added: []
  patterns: [shared-view-between-route-and-client, single-instance-responsive-rows, resize-observer-inset, sticky-measured-wrapper]
key-files:
  created:
    - apps/web/src/components/not-found-view.tsx
    - apps/web/src/modules/itinerary/ui/editor-forbidden.tsx
    - apps/web/src/modules/itinerary/ui/editor-forbidden.test.tsx
    - apps/web/src/modules/itinerary/ui/editor-header.tsx
    - apps/web/src/modules/itinerary/ui/editor-header.test.tsx
    - apps/web/src/modules/itinerary/ui/editor-layout.tsx
    - apps/web/src/modules/itinerary/ui/editor-layout.test.tsx
  modified:
    - apps/web/src/app/not-found.tsx
    - apps/web/src/app/not-found.test.tsx
key-decisions:
  - "`EditorHeader` và `EditorHeaderMinimal` nhận thêm prop bắt buộc `viewer: Viewer` (hợp đồng plan không liệt kê, nhưng `UserMenu` cần `viewer`; plan cho phép 'nhận qua prop viewer từ container'). 04-21 phải truyền `Viewer` đầy đủ, không chỉ `viewerId`."
  - "SaveIndicator và PublishButton chỉ render MỘT bản, đặt vào hàng 1 (từ `sm`) hoặc hàng 2 (dưới `sm`) bằng `useMediaQuery('(min-width: 640px)')`, thay vì render hai bản ẩn hiện bằng CSS: tránh trùng `aria-live` và trùng `hintId`. Header chỉ dựng sau khi dữ liệu tải ở client nên không lệch hydrate."
  - "Dải giải thích Xuất bản: `focused || pressed`; `pressed` bật khi `onBlockedPress` và tự tắt sau 4000ms (timer dọn khi unmount, bấm lại thì tính lại 4 giây)."
  - "`EditorLayout` bọc slot `header` trong `div` `sticky top-0 z-sticky` có ref để ResizeObserver đo; đo bằng `borderBoxSize` (có viền + vùng an toàn), làm tròn lên. Header sticky bên trong sẽ không dính nếu cha chỉ cao bằng nó, nên chính wrapper phải sticky."
  - "Chiều cao lưới desktop là inline style `calc(100dvh - ${headerHeight}px)` (plan chỉ định, tránh biến CSS tự đặt mà guard token 04-01 báo mồ côi). Chừa chỗ dưới `lg` bằng `pb-(--sheet-snap-peek)` (token đã khai báo, đúng bằng mức peek của Sheet)."
  - "Sheet chỉ render khi `!wide`; summary không render từ `lg`, canvas không render dưới `lg`."
requirements-completed: [ITIN-10, ITIN-11, ITIN-13, ITIN-14]
duration: ~10 phút
completed: 2026-10-29
---

# Phase 4 Plan 20: Khung editor toàn màn, header, 403 và 404 dùng chung Summary

**`EditorLayout` 4 slot (canvas thay được bằng bản đồ ở Phase 5) với lưới hai cột từ `lg` và Sheet timeline không modal đo chiều cao header bằng ResizeObserver, `EditorHeader` hai hàng dưới `sm`, `EditorForbidden` 403 và `NotFoundView` dùng chung cho 404**

## Commits

1. **Task 04-20-01 RED** — `b60e345` `test(04-20): add failing tests for NotFoundView and EditorForbidden`
2. **Task 04-20-01 GREEN** — `daa5520` `feat(04-20): add shared NotFoundView and EditorForbidden 403 body`
3. **Task 04-20-02 RED** — `5d458bb` `test(04-20): add failing tests for EditorHeader and EditorHeaderMinimal`
4. **Task 04-20-02 GREEN** — `7da3da2` `feat(04-20): add EditorHeader and EditorHeaderMinimal`
5. **Task 04-20-03 RED** — `dc71523` `test(04-20): add failing tests for EditorLayout`
6. **Task 04-20-03 GREEN** — `050005b` `feat(04-20): add EditorLayout with canvas slot and header-aware sheet`

## Accomplishments

- **Task 1:** thân 404 tách sang `NotFoundView` (giữ nguyên copy/class), `app/not-found.tsx` = `AppShell` bọc `NotFoundView`, test cũ vẫn xanh; thêm test render riêng (không có banner/main). `EditorForbidden` không nhận prop, không hiện tiêu đề hay nội dung lịch trình (T-04-57), link `next/link` + `buttonVariants` (không có role button), `<title>` "Không có quyền truy cập · Tripory" (React 19 hoist, `document.title` kiểm được trong test). 5 test.
- **Task 2:** `EditorHeader` đủ back (`aria-label` "Về Lịch trình của tôi"), `h1` truncate, dòng D-41 khi đã xuất bản, SaveIndicator, PublishButton (tự ẩn khi đã xuất bản, không có chữ "Chia sẻ"), menu ⋯ "Thao tác lịch trình" (Thông tin chuyến đi, separator, Xóa lịch trình `danger`), `UserMenu compact`, `menuTriggerRef`. `EditorHeaderMinimal`: back + h1 (hoặc Skeleton khi không có `title`) + UserMenu, không có thao tác sửa (T-04-56). 12 test.
- **Task 3:** `EditorLayout` với `h2.sr-only` "Lịch trình theo ngày" ở cột trái và `SheetTitle` sr-only ở sheet. Test ghi lại props Sheet (`open`, `modal:false`, `dismissible:false`, `defaultSnap:"medium"`, `insetTop` theo `ResizeObserver` 0 → 108 → 64), kiểm `disconnect` khi unmount, kiểm chuyển qua ngưỡng `lg`. 6 test.

## Verification

- `pnpm --filter @tripory/web test -- not-found editor-forbidden editor-header editor-layout`: 23 test xanh (2 + 3 + 12 + 6).
- `pnpm --filter @tripory/web lint | typecheck`: sạch. `pnpm --filter @tripory/design-tokens test`: 19 xanh. Web đầy đủ: 91 file, 1382 test xanh (guard token 04-01 xanh, không có `z-<số>` hay `var()` mồ côi mới).
- `node_modules\@turbo\windows-64\bin\turbo.exe run lint typecheck test`: 24/24 task thành công. `packages/config/eslint/boundaries.mjs` không đổi.
- Acceptance: `Chỉ người tạo lịch trình mới sửa được.` có trong `editor-forbidden.tsx`; `Thay đổi hiển thị ngay với người xem` có trong `editor-header.tsx` và `z-(--z-` không có; `dismissible={false}`, `defaultSnap="medium"`, `insetTop=` có trong `editor-layout.tsx`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `UserMenu` cần `viewer` nhưng hợp đồng `EditorHeader`/`EditorHeaderMinimal` không có prop này**
- **Found during:** Task 2
- **Fix:** thêm `viewer: Viewer` (bắt buộc) vào cả hai component, đúng ghi chú trong action của plan ("nhận qua prop viewer từ container").
- **Commit:** 7da3da2

### Khác với chữ của plan

- Acceptance Task 1 `Select-String … -Pattern 'forbidden()'` (regex, không phân biệt hoa thường) luôn khớp tên hàm `EditorForbidden`. Ý đồ là không gọi `forbidden()` của Next; kiểm bằng `-SimpleMatch -CaseSensitive` thì không có kết quả.
- Plan mô tả header dùng class trong hàng để thay đổi bố cục; thay vì render hai bản SaveIndicator/PublishButton ẩn hiện bằng CSS, dùng `useMediaQuery` chọn hàng (xem key-decisions).
- Menu ⋯ dùng `DropdownMenuTrigger` (cùng mẫu `ItineraryCard`, `SortableWaypointItem`) thay vì `IconButton`; `ref` truyền thẳng vào trigger, typecheck chấp nhận `Ref<HTMLButtonElement>`.

## Notes cho 04-21 (ItineraryEditor)

- Phải có `Viewer` đầy đủ để truyền cho `EditorHeader`/`EditorHeaderMinimal` (`viewerId` trong plan 04-21 không đủ cho `UserMenu`). `page.tsx` đã gọi `getViewer()`, nên truyền `viewer` thay vì (hoặc cùng với) `viewerId`.
- `EditorLayout` render `summary` chỉ dưới `lg` và `canvas` chỉ từ `lg`: truyền `TripSummary variant="compact"` / `"canvas"` như UI-SPEC.
- `EditorForbidden` không kèm header; container dựng `EditorHeaderMinimal` bên trên. 404 phát hiện ở client dùng `NotFoundView` (h1, link "Về trang chủ").
- Wrapper header của `EditorLayout` đã sticky; không cần bọc thêm.

## Notes cho người xem trình duyệt (UAT máy thật, jsdom không kiểm được)

- Dưới `lg`, Sheet ở cả ba mức snap không che header (kể cả khi header hai hàng cao 108px); xoay màn hình và bàn phím ảo không làm sheet chồng header.
- Header dính trên cùng khi cuộn nền summary trên mobile; desktop cột timeline và canvas cuộn riêng, header cố định.
- Hàng 2 (Đã lưu, Xuất bản) hiện đúng dưới 640px; dải giải thích hiện 4 giây sau khi chạm nút Xuất bản bị chặn.

## Known Stubs

None. Các component chưa được lắp vào route: `ItineraryEditor` (04-21) là nơi nối.

## Threat Flags

None. T-04-56 (403 thay editor, `EditorHeaderMinimal` không có menu sửa) và T-04-57 (403 không hiện tiêu đề/nội dung lịch trình) được đáp ứng ở mức component; phần nối `canEdit` thuộc 04-21.

## Self-Check: PASSED

- FOUND: not-found-view.tsx, editor-forbidden.tsx (+test), editor-header.tsx (+test), editor-layout.tsx (+test), not-found.tsx, not-found.test.tsx
- FOUND commits: b60e345, daa5520, 5d458bb, 7da3da2, dc71523, 050005b
