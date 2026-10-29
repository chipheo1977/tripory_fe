---
phase: 04-itinerary-crud-editor
plan: 21
subsystem: itinerary-editor-assembly
tags: [editor, timeline-panel, itinerary-editor, route-page, canEdit, forbidden, draft-restore, wave-10]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-20: EditorLayout/EditorHeader/EditorHeaderMinimal/EditorForbidden/NotFoundView; 04-19: WaypointList; 04-18: usePendingDelete; 04-17: WaypointFormDialog; 04-16: DayTabs/DaySubtitle; 04-15: PublishDialog/PublishButton/TripSummary; 04-14: TripInfoDialog/draftStorage; 04-13: SaveStatus/leave guard; 04-12: useItinerary; 04-11: DeleteItineraryDialog/entry-flag"
provides:
  - "`TimelinePanel`: DayTabs sticky + DaySubtitle + WaypointList + thanh \"Thêm điểm đến\" (một nút duy nhất, `addButtonRef` trỏ vào nó)"
  - "`ItineraryEditor({ itineraryId, viewer })`: container tải ở client, nhánh đang tải / 404 / 403 / lỗi / không phải chủ / editor đầy đủ, nối mọi dialog, xóa có hoàn tác, leave guard, khôi phục bản nháp, back D-47"
  - "Route `/itineraries/[id]/edit` (RSC): `parseItineraryId` → `notFound()`, `getViewer()`, `<ItineraryEditor key={viewer.id} />`; không gọi BE từ server"
affects: [04-22, 04-23]
tech-stack:
  added: []
  patterns: [client-fetch-through-bff, state-branch-container, draft-restore-lazy-init, single-add-button-ref]
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/timeline-panel.tsx
    - apps/web/src/modules/itinerary/ui/timeline-panel.test.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.tsx
    - apps/web/src/modules/itinerary/ui/itinerary-editor.test.tsx
    - apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/page.tsx
    - apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/page.test.tsx
  modified: []
key-decisions:
  - "`ItineraryEditor` nhận `viewer: Viewer` (không phải `viewerId`): `EditorHeader`/`EditorHeaderMinimal` bắt buộc `viewer` cho `UserMenu` (ghi chú của 04-20). `canEdit` dùng `viewer.id`, dialog dùng `viewer.id` làm `viewerId` bản nháp."
  - "Có `data` thì luôn hiện editor, kể cả khi lần tải lại nền lỗi (status query = error nhưng data còn): mất mạng thoáng qua không đóng form đang mở. Nhánh lỗi chỉ khi chưa có data."
  - "Cờ `entry-flag` được xóa ngay khi nút back dùng nó (`navigateBack`), không xóa trong cleanup effect như plan mô tả: StrictMode (dev) và Activity chạy cleanup giả lúc mount nên cleanup effect sẽ xóa cờ trước khi người dùng bấm back."
  - "Xóa lịch trình thành công → state `leaving` giữ khung chờ cho tới khi `router.replace` xong: `useDeleteItinerary` đã `removeQueries`, một lần render lại sẽ tải lại và ra 404 nháy NotFoundView."
  - "Mở hộp xóa lịch trình gọi `pending.flush()` trước: DELETE điểm đang chờ hoàn tác phải đi trước DELETE lịch trình (không chung scope nên không tự nối đuôi)."
  - "Bản nháp đọc một lần bằng `useState` initializer lúc mount (editor chỉ dựng sau khi có data nên không chạy phía server), thay vì effect + setState; bản nháp `add:N` có N ngoài dải ngày, hoặc `edit:W` có W không còn tồn tại, bị xóa và không mở gì."
  - "Xuất bản xong: cờ `focusMenuAfterPublish` là state, effect `[isPublic, flag]` trả focus về nút ⋯ khi nút Xuất bản đã biến mất (an toàn kể cả khi refetch xong trước `onPublished`)."
requirements-completed: [ITIN-03, ITIN-04, ITIN-05, ITIN-06, ITIN-07, ITIN-08, ITIN-09, ITIN-10, ITIN-11, ITIN-12, ITIN-13, ITIN-14]
duration: ~25 phút
completed: 2026-10-29
---

# Phase 4 Plan 21: Lắp editor hoàn chỉnh và route `/itineraries/[id]/edit` Summary

**`TimelinePanel` + container `ItineraryEditor` (tải ở client qua BFF, nhánh 404/403/lỗi/không phải chủ, nối đủ dialog, xóa có hoàn tác, leave guard, khôi phục bản nháp) và page RSC chỉ kiểm GUID + lấy viewer, không gọi BE từ server**

## Commits

1. **Task 04-21-01 RED** — `c56ada9` `test(04-21): add failing tests for TimelinePanel`
2. **Task 04-21-01 GREEN** — `c0b83e7` `feat(04-21): add TimelinePanel with day tabs, subtitle, waypoint list and add bar`
3. **Task 04-21-02 RED** — `18337df` `test(04-21): add failing tests for ItineraryEditor`
4. **Task 04-21-02 GREEN** — `517d211` `feat(04-21): add ItineraryEditor container with state branches and dialog wiring`
5. **Task 04-21-03 RED** — `4cf552b` `test(04-21): add failing tests for editor route page`
6. **Task 04-21-03 GREEN** — `68f7db9` `feat(04-21): add editor route page with GUID guard and viewer key`

## Accomplishments

- **Task 1 (`TimelinePanel`, 5 test):** tab ngày sticky `bg-surface border-b`, `DaySubtitle` (key theo ngày để đóng ô sửa khi đổi tab), `WaypointList` với `emptyAction`. Ngày có điểm hiển thị: thanh dưới sticky `Button secondary w-full` "Thêm điểm đến" (padding đáy dùng `--semantic-space-stack-md` + `env(safe-area-inset-bottom)`); ngày trống (kể cả khi mọi điểm đang chờ xóa): chỉ EmptyState CTA. Luôn đúng một nút "Thêm điểm đến", `addButtonRef` trỏ vào đó.
- **Task 2 (`ItineraryEditor`, 17 test):**
  - Nhánh: đang tải (EditorSkeleton + `<title>` "Sửa lịch trình · Tripory"), 5xx → `ErrorState` "Thử lại" (gọi lại `getById`), 404 → `NotFoundView`, 403 hoặc `canEdit` false → `EditorForbidden` (không có "Xuất bản", "Thông tin chuyến đi", menu ⋯, không lộ tiêu đề). Các nhánh lỗi dùng `EditorHeaderMinimal` với `viewer`.
  - Editor: mở ở Ngày 1, `<title>` "{tiêu đề} · Tripory", thêm điểm (điểm mới cuối ngày, highlight 1500ms rồi mất, live region "Đã thêm Chợ vào Ngày 1", focus về nút thêm), Thông tin chuyến đi từ menu ⋯ và từ vùng tóm tắt, xóa điểm (toast hoàn tác, focus thẻ kế tiếp, hoàn tác trả focus nút chính của thẻ), xóa lịch trình (`router.replace('/itineraries/mine')` + toast "Đã xóa lịch trình"), xuất bản (nút biến mất, dòng D-41 hiện, focus nút ⋯).
  - Back: `enteredFromList()` → `router.back()`, ngược lại `router.push('/itineraries/mine')`; còn lệnh ghi đang chạy → `LeaveEditorDialog`, "Rời trang" mới đi.
  - Bản nháp (D-36): `add:1` mở lại đúng form kèm InlineAlert "Đã khôi phục nội dung chưa lưu"; `edit:{id}` của điểm không còn tồn tại thì khóa bị xóa, không mở; bản nháp của viewer khác bị bỏ qua.
- **Task 3 (page RSC, 5 test):** id sai GUID → `notFound()` trước khi đọc cookie; id chữ hoa → `itineraryId` chữ thường; `key={viewer.id}`; không viewer → `redirect('/login?next=…')` (lưới thứ hai sau gate của layout); không import `@tripory/itinerary/http`, không `fetch(`. `(editor)/layout` đã bọc children trong `<Suspense>` nên đọc `params`/cookie hợp lệ với Cache Components; `pnpm --filter @tripory/web build` không cần `generateStaticParams` hay Suspense thêm (route hiện `◐` partial prerender).

## Verification

- `pnpm --filter @tripory/web test`: 94 file, 1410 test xanh (kể cả guard token 04-01, `proxy-coverage`: `/itineraries/x/edit` được `isProtectedPath`, `auth-invariants`).
- `node_modules\@turbo\windows-64\bin\turbo.exe run lint typecheck test`: 24/24 task thành công. `packages/config/eslint/boundaries.mjs` không đổi, không thêm allowlist.
- `pnpm --filter @tripory/web build`: xanh.
- Acceptance: `canEdit(` có trong `itinerary-editor.tsx`; `from "@/app/` và `notFound(` không có; `Thêm điểm đến` có trong `timeline-panel.tsx`; `parseItineraryId` có trong `page.tsx`, `itinerary/http` không có.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `EditorHeader`/`EditorHeaderMinimal` cần `Viewer` đầy đủ, hợp đồng plan chỉ có `viewerId`**
- **Found during:** Task 2 (đã được 04-20-SUMMARY báo trước)
- **Fix:** `ItineraryEditor` nhận `viewer: Viewer`; page truyền `viewer`. Khi `getViewer()` trả `null` (không xảy ra sau gate), page `redirect` về `/login?next=…` thay vì render với `viewerId: null`.
- **Commit:** 517d211, 68f7db9

**2. [Rule 1 - Bug] Cleanup effect xóa cờ `entry-flag` làm nút back luôn là `push` trong dev**
- **Found during:** Task 2 (thiết kế)
- **Issue:** plan yêu cầu "cleanup effect gọi `clearEnteredFromList()`"; StrictMode/Activity chạy cleanup giả ngay khi mount nên cờ bị xóa trước khi người dùng bấm back.
- **Fix:** xóa cờ khi `navigateBack` dùng nó. Rời editor bằng đường khác (link UserMenu) để cờ còn `true`, nhưng mọi đường client-side vào editor hiện tại (`ItineraryCard`, `CreateItineraryDialog`) đều đặt lại cờ, nên không sai hướng.
- **Commit:** 517d211

**3. [Rule 2 - Missing critical] Chống nháy 404 sau khi xóa lịch trình và lệnh DELETE điểm chạy sau**
- **Fix:** state `leaving` giữ khung chờ; `pending.flush()` khi mở hộp xóa lịch trình.
- **Commit:** 517d211

### Khác với chữ của plan

- Trạng thái đang tải dùng `EditorSkeleton` có sẵn (kèm `<title>` chung) thay vì `EditorHeaderMinimal` + skeleton riêng: skeleton đã có header giả, tránh nhảy bố cục so với `loading.tsx`.
- Nhánh 404 có hai `h1` (header rút gọn "Sửa lịch trình" và "Không tìm thấy trang" của `NotFoundView`). `NotFoundView` là thân trang dùng chung với `app/not-found.tsx` nên không đổi ở plan này.
- Plan ghi `useMemo(createSaveStatusStore)`; dùng `useState(createSaveStatusStore)` (initializer) để store ổn định tuyệt đối.

## Notes cho người xem trình duyệt (UAT máy thật, jsdom không kiểm được)

- Focus sau khi đóng form thêm điểm (nút "Thêm điểm đến" của thanh dưới) và sau xuất bản (nút ⋯) cạnh tranh với việc Base UI trả focus khi dialog đóng; jsdom với animation tắt cho kết quả đúng, cần xác nhận trên trình duyệt thật.
- Thanh "Thêm điểm đến" sticky trong Sheet mobile (ba mức snap) và trong cột trái desktop; padding đáy theo vùng an toàn của iOS.
- Sau khi xóa lịch trình, chuyển về danh sách không nháy 404.

## Known Stubs

None.

## Threat Flags

None. T-04-58 (`canEdit` → `EditorForbidden`, không lộ tiêu đề), T-04-59 (không fetch ở RSC; tải qua BFF có refresh), T-04-60 (`parseItineraryId` null → `notFound()` trước mọi đọc cookie), T-04-61 (`key={viewer.id}`, khóa bản nháp có `viewerId`, bản nháp của viewer khác bị bỏ qua) đều có test.

## Self-Check: PASSED

- FOUND: timeline-panel.tsx (+test), itinerary-editor.tsx (+test), edit/page.tsx (+test)
- FOUND commits: c56ada9, c0b83e7, 18337df, 517d211, 4cf552b, 68f7db9
