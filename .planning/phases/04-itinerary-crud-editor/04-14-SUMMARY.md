---
phase: 04-itinerary-crud-editor
plan: 14
subsystem: itinerary-editor-trip-info-form
tags: [trip-info-dialog, responsive-form-surface, draft-storage, session-storage, react-hook-form, cover-preview, wave-7]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-11: metadataSchema/toMetadataInput/mapMetadataError/FormFieldRow; 04-13: useSaveStatusStore; 04-04: Dialog/Sheet; 04-09: itinerary.useUpdateMetadata"
provides:
  - "`draftKey`, `DraftKind`, `createDraftStorage`, `draftStorage` (modules/itinerary/ui/draft-storage.ts)"
  - "`useFormDraft({ key, getValues, enabled })` lưu bản nháp khi `sessionEvents` phát `expired`"
  - "`useMediaQuery(query)` (useSyncExternalStore, SSR false)"
  - "`ResponsiveFormSurface` (Dialog từ md, Sheet modal expanded dưới md, không đóng khi bấm scrim, `locked`)"
  - "`TripInfoDialog` (ITIN-03) với preview ảnh bìa, khôi phục bản nháp, `onDirtyChange`"
  - "`Sheet` nhận prop `disablePointerDismissal` (ui-web); `FormFieldRow` nhận `controlId`"
affects: [04-15, 04-16, 04-17, 04-18, 04-19, 04-20, 04-21]

tech-stack:
  added: []
  patterns: [adapter-with-injected-storage-and-clock, draft-envelope-ttl-zod, responsive-dialog-sheet-surface, debounced-validated-preview]

key-files:
  created:
    - apps/web/src/modules/itinerary/ui/draft-storage.ts
    - apps/web/src/modules/itinerary/ui/draft-storage.test.ts
    - apps/web/src/modules/itinerary/ui/use-form-draft.ts
    - apps/web/src/modules/itinerary/ui/use-media-query.ts
    - apps/web/src/modules/itinerary/ui/responsive-form-surface.tsx
    - apps/web/src/modules/itinerary/ui/responsive-form-surface.test.tsx
    - apps/web/src/modules/itinerary/ui/trip-info-dialog.tsx
    - apps/web/src/modules/itinerary/ui/trip-info-dialog.test.tsx
  modified:
    - packages/ui-web/src/molecules/sheet.tsx
    - packages/ui-web/src/molecules/sheet.test.tsx
    - apps/web/src/modules/itinerary/ui/form-field-row.tsx
    - apps/web/src/auth-invariants.test.ts

key-decisions:
  - "`findFirst` bỏ qua và dọn bản nháp quá hạn hoặc có `kind` lạ, nên bản hỏng không che bản còn hạn. Hết hạn khi `now - savedAt > 24h` (đúng 24h vẫn đọc được)."
  - "Mở dialog là `reset(giá trị itinerary)` rồi, nếu có bản nháp, `reset(bản nháp, { keepDefaultValues: true })`: nội dung khôi phục tính là bẩn so với dữ liệu BE. Dữ liệu itinerary refetch khi dialog đang mở đi qua ref, không ghi đè nội dung đang gõ."
  - "Mọi đường đóng không lưu (Hủy, Esc, nút đóng Sheet) xóa bản nháp; lưu thành công cũng xóa. Hết phiên thật unmount cây nên không đi qua đường này, bản nháp giữ lại."
  - "Nút Hủy là `Button` thường gọi `handleOpenChange(false)` (không dùng `DialogClose`) để chạy được trong cả Dialog lẫn Sheet."
  - "Nhãn Textarea thuần không tự liên kết với `Field.Label`: `FormFieldRow` có `controlId` tùy chọn, chỉ truyền `htmlFor` khi có."

requirements-completed: [ITIN-03, ITIN-10, ITIN-14]

duration: ~35 phút
completed: 2026-10-28
---

# Phase 4 Plan 14: TripInfoDialog + hạ tầng form dùng chung Summary

**`TripInfoDialog` sửa metadata (tiêu đề, mô tả, ngày, ảnh bìa https có preview debounce 400ms) trên `ResponsiveFormSurface` (Dialog từ `md`, Sheet modal dưới `md`), cùng adapter bản nháp `sessionStorage` khóa theo viewer/TTL 24h/Zod và `useFormDraft` gắn vào `sessionEvents.expired`**

## Commits

1. **Task 04-14-01 RED** — `8239740` `test(04-14): add failing tests for draft storage and useFormDraft`
2. **Task 04-14-01 GREEN** — `c8fc250` `feat(04-14): draft-storage va useFormDraft luu ban nhap khi het phien`
3. **Task 04-14-02 (hạ tầng ui-web)** — `989c5ca` `feat(04-14): Sheet nhan disablePointerDismissal de form modal khong dong khi bam scrim`
4. **Task 04-14-02 RED** — `4b8b686` `test(04-14): add failing tests for useMediaQuery and ResponsiveFormSurface`
5. **Task 04-14-02 GREEN** — `a9ecb09` `feat(04-14): useMediaQuery va ResponsiveFormSurface Dialog tu md, Sheet modal duoi md`
6. **Task 04-14-03 RED** — `9834fd5` `test(04-14): add failing tests for TripInfoDialog` (kèm `controlId` của `FormFieldRow`)
7. **Task 04-14-03 GREEN** — `13476ef` `feat(04-14): TripInfoDialog sua metadata voi preview anh bia va ban nhap khi het phien`
8. `57933af` `docs(04-14): bo nhac next/image trong comment TripInfoDialog de khop tieu chi chap nhan`
9. `c05c507` `fix(04-14): invariant luu tru web cho phep sessionStorage chi o adapter ban nhap D-36`

## Accomplishments

- **Task 1:** `createDraftStorage({ storage, nowMs })` nhận storage và đồng hồ tiêm vào, mọi truy cập bọc try/catch (storage `null`, quota, `SecurityError` đều không ném). Giá trị lưu `{ savedAt, values }`, đọc qua Zod, sai schema/JSON hỏng/quá 24 giờ thì xóa khóa. `useFormDraft` đăng ký `sessionEvents.on("expired", …)`, đọc `getValues` qua ref, gỡ khi `enabled=false` hoặc unmount. 17 test.
- **Task 2:** `useMediaQuery` bằng `useSyncExternalStore`. `ResponsiveFormSurface`: `(min-width: 768px)` → `DialogContent size="md"` với `disablePointerDismissal`, ngược lại `Sheet modal defaultSnap="expanded"`; `locked` chặn Esc, nút "Đóng bảng", scrim. 12 test.
- **Task 3:** `TripInfoDialog` đủ field theo UI-SPEC (Input lg, Textarea, `type="date"` + "Xóa ngày", `type="url" inputMode="url"` + "Xóa ảnh bìa"), focus Tiêu đề (cả Dialog và Sheet), "Lưu"/"Hủy" với `loadingLabel` "Đang lưu…", `SubmitStatus`, lỗi BE gắn vào ô hoặc `InlineAlert`, lưu xong đóng và không toast, `InlineAlert info` "Đã khôi phục nội dung chưa lưu", `onDirtyChange`. Preview: chỉ khi URL qua `isHttpsUrl` và ≤ 500, debounce 400ms, `referrerPolicy="no-referrer"`, Skeleton khi tải, lỗi → nền dự phòng + "Không tải được ảnh từ link này" và vẫn lưu được. 16 test.
- **Threat model:** T-04-39 (chỉ https, no-referrer, thẻ `img` thường, không `next/image`), T-04-40 (preview không bao giờ render `javascript:`/`data:`/`http:`, có test), T-04-41 (khóa có `viewerId`, TTL 24h, xóa khi lưu/Hủy, đọc qua Zod).

## Verification

- `pnpm --filter @tripory/web exec vitest run draft-storage responsive-form-surface trip-info-dialog`: 17 + 12 + 16 test xanh. `pnpm --filter @tripory/ui-web exec vitest run src/molecules/sheet.test.tsx`: 23 test xanh (thêm 2).
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 77 file, 1221 test xanh. ESLint boundaries không đổi.
- Acceptance: `tripory:draft:v1:` có trong `draft-storage.ts`; `(min-width: 768px)` có trong `responsive-form-surface.tsx`; `Không tải được ảnh từ link này` có và `next/image` không có trong `trip-info-dialog.tsx`; `sessionEvents.on("expired"` có trong `use-form-draft.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `Sheet` không cho tắt đóng-khi-bấm-scrim riêng**
- **Found during:** Task 2
- **Issue:** `Sheet` đặt `disablePointerDismissal={!modal || !dismissible}`, nên Sheet modal + dismissible luôn đóng khi bấm scrim. Chỉ bỏ qua sự kiện ở `onOpenChange` thì `Sheet` đã kịp đặt `closingRef` và reset snap, làm các lần vuốt đổi mức sau đó bị bỏ qua.
- **Fix:** thêm prop tùy chọn `disablePointerDismissal` (mặc định `false`, hành vi cũ giữ nguyên) vào `Sheet` của `ui-web`, kèm 2 test (có/không có prop). Esc và "Đóng bảng" vẫn đóng được.
- **Files modified:** packages/ui-web/src/molecules/sheet.tsx, packages/ui-web/src/molecules/sheet.test.tsx
- **Commit:** 989c5ca

**2. [Rule 3 - Blocking] Nhãn của Textarea không liên kết với `Field.Label`**
- **Found during:** Task 3
- **Issue:** `Textarea` là thẻ thuần, không đăng ký control với `Field` của Base UI nên `getByLabelText("Mô tả")` và trình đọc màn hình không thấy nhãn.
- **Fix:** `FormFieldRow` nhận `controlId?` và chỉ truyền `htmlFor` khi có (giá trị `undefined` có thể đè liên kết tự động của Base UI). Form khác không đổi.
- **Files modified:** apps/web/src/modules/itinerary/ui/form-field-row.tsx
- **Commit:** 9834fd5

**3. [Rule 3 - Blocking] Test bất biến auth cấm mọi `sessionStorage` trong `src`**
- **Found during:** verification toàn repo (`@tripory/web#test`, `src/auth-invariants.test.ts`, T-03-72)
- **Issue:** quy tắc "không lưu token vào web storage" dùng regex cấm cả `sessionStorage`, mâu thuẫn với D-36 (đã khóa) mà plan này phải làm.
- **Fix:** thu hẹp chứ không nới lỏng: `sessionStorage` chỉ được phép ở `modules/itinerary/ui/draft-storage.ts`; `localStorage` và `NEXT_PUBLIC_*TOKEN/API` vẫn cấm mọi nơi; thêm test khẳng định adapter không chứa `token`, `document.cookie`, `localStorage`. Các comment nhắc tên `sessionStorage` ở file khác đổi sang `draftStorage`.
- **Files modified:** apps/web/src/auth-invariants.test.ts, trip-info-dialog.tsx, use-form-draft.ts
- **Commit:** c05c507

**4. [Rule 1 - Bug] Tiêu chí chấp nhận `next/image` không có kết quả**
- **Found during:** Task 3 (acceptance grep)
- **Issue:** comment đầu file nhắc tên `next/image` nên grep tìm thấy.
- **Fix:** đổi lời comment.
- **Commit:** 57933af

**5. [Mở rộng chữ ký, theo plan] `initialFocus` tùy chọn trên `ResponsiveFormSurface`**
- Plan liệt kê chữ ký không có prop này, nhưng "Tiêu đề focus khi mở" cần nó ở Sheet (nút "Thu gọn bảng" nằm trước ô đầu). Prop tùy chọn, không phá hợp đồng.

## Known Stubs

None. `restored` và `onDirtyChange` là prop tùy chọn do editor (plan sau) nối: tìm bản nháp bằng `draftStorage.findFirst(prefix)` + `load(key, metadataSchema)`, truyền `restored`, và xóa `restored` ở cha khi đóng.

## Notes cho plan sau

- Chỉ khi hết phiên lúc form đang mở mới ghi bản nháp; đọc lại là việc của editor khi `useItinerary` thành công (RESEARCH Pattern 18). `WaypointFormDialog` (04-17) dùng lại `ResponsiveFormSurface`, `useFormDraft`, `draftKey({ kind: "add:N" | "edit:id" })`.
- Giới hạn đã biết: nếu `locked` chặn một lần đóng trên Sheet bằng Esc, `Sheet` đã đặt `closingRef` nội bộ cho tới `onOpenChangeComplete` kế tiếp (chỉ ảnh hưởng vuốt đổi mức sau lần Esc bị chặn đó, trong lúc đang gửi).
- Chưa kiểm bằng trình duyệt thật: Sheet dưới `md` (vuốt, bàn phím ảo che ô), `input type="date"` trên Safari iOS, preview ảnh với host chặn hotlink, luồng hết phiên thật → đăng nhập lại → khôi phục (phần đọc lại thuộc plan sau).

## Self-Check: PASSED
