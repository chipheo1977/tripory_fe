---
phase: 04-itinerary-crud-editor
plan: 15
subsystem: itinerary-editor-summary-publish
tags: [trip-summary, publish, aria-disabled, tooltip, confirm-dialog, canvas, wave-8]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-06: canPublish; 04-09: itinerary.usePublish; 04-11: formatKm, formatStartDate, mapPublishError; 04-12: CoverImage; 04-13: useSaveStatusStore; 04-14: useMediaQuery"
provides:
  - "`TripSummary({ itinerary, variant: 'canvas' | 'compact', onEdit })`: ảnh bìa (hoặc nền + 'Thêm ảnh bìa'), badge, 'Khởi hành dd/MM/yyyy', 'Tổng quãng đường: x km', tiêu đề, mô tả pre-line, nút 'Sửa thông tin'"
  - "`PublishButton` (aria-disabled + giải thích, null khi đã xuất bản) và `PublishHintStrip` (phần tử `hintId` luôn có trong DOM)"
  - "`PublishDialog({ itineraryId, open, onOpenChange, onPublished })`: hộp xác nhận D-39, không có chia sẻ (D-40)"
affects: [04-20, 04-21]

tech-stack:
  added: []
  patterns: [aria-disabled-with-persistent-description, stable-tree-tooltip-toggle, plain-area-click-without-fake-role]

key-files:
  created:
    - apps/web/src/modules/itinerary/ui/trip-summary.tsx
    - apps/web/src/modules/itinerary/ui/trip-summary.test.tsx
    - apps/web/src/modules/itinerary/ui/publish-button.tsx
    - apps/web/src/modules/itinerary/ui/publish-button.test.tsx
    - apps/web/src/modules/itinerary/ui/publish-dialog.tsx
    - apps/web/src/modules/itinerary/ui/publish-dialog.test.tsx
  modified: []

key-decisions:
  - "`PublishHintStrip` là chủ duy nhất của phần tử `id={hintId}` (luôn có trong DOM, `hidden` khi chưa cần, `lg:hidden`). Nút chỉ trỏ `aria-describedby` vào đó khi bị chặn; tooltip từ `lg` lặp cùng câu nhưng không mang id đó, nên không trùng id dù header render nút hai lần (hai hàng)."
  - "Tooltip bọc nút bằng `TooltipTrigger render={<span />}` thay vì làm chính nút là trigger: `TooltipTrigger` của ui-web luôn ghi đè `aria-describedby` bằng id của popup (chỉ tồn tại lúc mở), còn D-38 cần nút luôn trỏ vào lời giải thích. Cây giữ nguyên khi `canPublish` đổi (Tooltip chỉ bị `disabled`), nên nút không bị dựng lại và không mất focus."
  - "Tooltip điều khiển bằng state + `closeOnClick={false}`: bấm khi bị chặn mở tooltip và giữ nó mở; Esc và rời focus vẫn đóng qua `onOpenChange`."
  - "Thêm hai prop tùy chọn cho `PublishButton`: `onBlockedPress` (plan yêu cầu) và `onHintFocusChange` (UI-SPEC: dải hiện 'khi nút đang focus hoặc 4 giây sau khi chạm'). Header (04-20) giữ state `visible` và timer 4 giây."

requirements-completed: [ITIN-09, ITIN-11, ITIN-14]

duration: ~25 phút
completed: 2026-10-29
---

# Phase 4 Plan 15: Tóm tắt chuyến đi và luồng xuất bản Summary

**`TripSummary` cho canvas desktop và nền mobile, nút "Xuất bản" `aria-disabled` có lời giải thích (tooltip từ `lg`, dải chữ dưới `lg`), và hộp xác nhận xuất bản với focus đầu ở "Hủy"; không có hộp hay nút chia sẻ (D-40)**

## Commits

1. **Task 04-15-01 RED** — `e8a1946` `test(04-15): add tests for TripSummary` (viết cùng lúc với bản cài đặt, nên commit này đã xanh khi có file cài đặt trong cây làm việc; xem Deviations)
2. **Task 04-15-01 GREEN** — `1cd7f29` `feat(04-15): add TripSummary canvas and compact variants`
3. **Task 04-15-02 RED** — `1df92c3` `test(04-15): add failing tests for PublishButton and PublishDialog` (đã chạy thấy đỏ: module chưa có)
4. **Task 04-15-02 GREEN** — `e3a73d3` `feat(04-15): add PublishButton, PublishHintStrip and PublishDialog`

## Accomplishments

- **Task 1 (`TripSummary`):** `section aria-labelledby` trỏ `h2.sr-only` "Thông tin chuyến đi"; tiêu đề là `p` (`text-display` canvas, `text-heading` compact, `break-words`); hàng Badge "Nháp"/"Đã xuất bản" + "Khởi hành 12/10/2026" + "Tổng quãng đường: 12,4 km" (số của BE qua `formatKm`, ẩn khi 0); mô tả `whitespace-pre-line` (compact thêm `line-clamp-3`), ẩn khi null. Không có ảnh https: nền `surface-muted` + icon `ImagePlus` + nút "Thêm ảnh bìa". Bấm phần nền của vùng hoặc ảnh gọi `onEdit`; bấm nút gọi đúng một lần (handler bỏ qua target nằm trong `button, a`). Vùng bấm không có `tabindex`/`role`. 13 test.
- **Task 2 (`PublishButton`, `PublishHintStrip`):** `canPublish` false (0 waypoint hoặc mọi waypoint đang chờ xóa): `aria-disabled="true"`, không `disabled`, Tab tới được, `aria-describedby=hintId`, class `aria-disabled:bg-surface-muted aria-disabled:text-disabled`, bấm/Enter/Space không gọi `onRequestPublish`. Từ `lg` câu giải thích là tooltip (mở khi focus, giữ khi bấm, đóng bằng Esc); dưới `lg` dải `bg-surface-muted text-label text-muted` hiện khi `visible`. Đã xuất bản: `null`. 14 test.
- **Task 2 (`PublishDialog`):** tiêu đề và mô tả đúng chữ D-39, focus đầu ở "Hủy", "Đang xuất bản…" khi gửi (Esc/scrim/Hủy không đóng, `SubmitStatus` báo cold start sau 5 s), lỗi vào `InlineAlert` trong hộp không toast lỗi (gồm `Itinerary.CannotPublishEmpty` → "Thêm ít nhất 1 điểm đến để xuất bản."), thành công: toast "Đã xuất bản lịch trình" đúng một lần qua `meta.feedback.successMessage`, `store.markSaved()`, `onPublished`, đóng hộp. 8 test.
- **Threat model:** T-04-42 (xác nhận, focus mặc định "Hủy", có test); T-04-43 (không đổi ở plan này: editor chỉ render khi `canEdit`, thuộc 04-21; BE kiểm quyền); T-04-44 (title/mô tả là text node, có test với `<b>`/`<img onerror>`).

## Verification

- `pnpm --filter @tripory/web test -- trip-summary publish`: 3 file, 35 test xanh (trip-summary 13, publish-button 14, publish-dialog 8).
- `pnpm --filter @tripory/web lint | typecheck | test`: sạch; web 84 file, 1299 test xanh.
- `node_modules\@turbo\windows-64\bin\turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công. ESLint boundaries không đổi.
- Acceptance: `Tổng quãng đường: ` có trong trip-summary.tsx; `dangerouslySetInnerHTML` không có; `aria-disabled` có trong publish-button.tsx; `Select-String 'Chia sẻ' -CaseSensitive` trên `publish-*.tsx` không có kết quả (test dùng `/Chia s\u1EBB/`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `TooltipTrigger` của ui-web ghi đè `aria-describedby`**
- **Found during:** Task 2 (thiết kế)
- **Issue:** dùng nút làm trigger thì `aria-describedby` luôn là id popup (chỉ có khi tooltip mở), trái D-38 "luôn có trong DOM".
- **Fix:** trigger là `span` bọc nút; nút tự mang `aria-describedby=hintId`. Không sửa ui-web.
- **Commit:** e3a73d3

**2. [Rule 2 - Missing critical] Thiếu tín hiệu focus cho dải giải thích dưới `lg`**
- **Issue:** interface của plan chỉ có `onBlockedPress`, còn UI-SPEC yêu cầu dải hiện cả khi nút đang focus.
- **Fix:** prop tùy chọn `onHintFocusChange(focused)`. Không ảnh hưởng plan khác nếu header bỏ qua.
- **Commit:** e3a73d3

### Process

- Task 1 không có commit RED đỏ thật: bản cài đặt `trip-summary.tsx` được viết trước khi commit, nên `e8a1946` chứa test đã xanh khi chạy cùng file cài đặt chưa commit. Task 2 làm đúng thứ tự (test đỏ, rồi cài đặt).

## Known Stubs

None. Ba component chưa được ghép vào editor: 04-20 (`EditorHeader` dùng `PublishButton`/`PublishHintStrip`, `EditorLayout` nhận `TripSummary` ở `canvas` và `summary`) và 04-21 (container mở `PublishDialog`, focus về nút ⋯ sau khi xuất bản, refetch `isPublic`).

## Notes cho 04-20 / 04-21

- Header render `PublishHintStrip` đúng một lần (dù có hai `PublishButton` cho hai hàng) và giữ `visible` = (nút đang focus) hoặc (trong 4 giây sau `onBlockedPress`).
- `PublishDialog` đóng và gọi `onPublished()` ngay khi BE trả 2xx; badge/nút chỉ đổi sau khi container refetch `isPublic` (hook itinerary invalidate detail ở `onSettled`).

## Self-Check: PASSED

- FOUND: trip-summary.tsx, trip-summary.test.tsx, publish-button.tsx, publish-button.test.tsx, publish-dialog.tsx, publish-dialog.test.tsx
- FOUND commits: e8a1946, 1cd7f29, 1df92c3, e3a73d3
