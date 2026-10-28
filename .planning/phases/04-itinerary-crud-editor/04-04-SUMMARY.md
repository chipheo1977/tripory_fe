---
phase: 04-itinerary-crud-editor
plan: 04
subsystem: ui-web
tags: [sonner, toast, inline-alert, sheet, base-ui-drawer, tdd]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "plan 04-01: token z-* và text-muted/subtle/disabled có CSS thật"
provides:
  - "`notify.undoable(title, { actionLabel, onAction, onDismiss })`: toast `role=status` không tự đóng (`duration: Infinity`), trả id để `notify.dismiss(id)`"
  - "`InlineAlert variant=\"info\"` (`role=status`, icon `Info` `text-muted`); mặc định vẫn `danger` + `role=alert`"
  - "`Sheet` props `dismissible`, `defaultSnap`, `insetTop` và `resolveSnapPoints(viewportHeight, insetTop = 0)`"
affects: [04-18, 04-19, 04-20, 04-21]

tech-stack:
  added: []
  patterns: [snap-state-by-index, cancel-close-via-event-details, app-owned-undo-clock]

key-files:
  created: []
  modified:
    - packages/ui-web/src/molecules/toast.tsx
    - packages/ui-web/src/molecules/toast.test.tsx
    - packages/ui-web/src/molecules/inline-alert.tsx
    - packages/ui-web/src/molecules/inline-alert.test.tsx
    - packages/ui-web/src/molecules/sheet.tsx
    - packages/ui-web/src/molecules/sheet.test.tsx
    - packages/ui-web/src/molecules/sheet-snap.ts
    - packages/ui-web/src/molecules/sheet-snap.test.ts

key-decisions:
  - "Hủy đóng khi `dismissible={false}` bằng `details.cancel()` trong `onOpenChange` (đã đo: Esc không đóng cả khi uncontrolled lẫn `open` controlled, caller không nhận `open=false`); không cần giữ `open` controlled nội bộ."
  - "Mức snap lưu theo chỉ số (peek 0, medium 1, expanded 2) thay vì theo giá trị, để `resize`/đổi `insetTop` tính lại px mà mức đang mở không lệch (`stepSnapPoint` dùng `indexOf` nên giá trị cũ sẽ rơi về 0)."
  - "Bỏ qua `onSnapPointChange` của Base UI trong lúc đóng (cờ `closingRef`, xóa ở `onOpenChangeComplete` hoặc khi mở lại): Base UI báo thêm một lần về peek (`close-press`) ngay sau `onOpenChange(false)`, ghi đè mức `defaultSnap` vừa đặt lại."
  - "`disablePointerDismissal = !modal || !dismissible`: Sheet không đóng được thì bấm scrim cũng không thử đóng."

patterns-established:
  - "Component generic của ui-web nhận nhãn/copy qua prop (`actionLabel`), không chứa copy nghiệp vụ."

requirements-completed: []

duration: 25 min
completed: 2026-10-28
---

# Phase 4 Plan 4: Mở rộng ui-web (toast hoàn tác, InlineAlert info, Sheet) Summary

**`notify.undoable` không tự hết hạn (app giữ đồng hồ 5 giây), `InlineAlert variant="info"`, và `Sheet` có `dismissible`/`defaultSnap`/`insetTop` với `resolveSnapPoints(vh, insetTop)` kẹp expanded theo header**

## Commits

1. **Task 04-04-01 RED** — `93a8be0` `test(04-04): thêm test failing cho notify.undoable`
2. **Task 04-04-01 GREEN** — `0f6160e` `feat(04-04): thêm notify.undoable không tự hết hạn`
3. **Task 04-04-02 RED** — `bbfea1b` `test(04-04): thêm test failing cho InlineAlert variant info`
4. **Task 04-04-02 GREEN** — `0094b76` `feat(04-04): InlineAlert thêm variant info`
5. **Task 04-04-03 RED** — `e2a59df` `test(04-04): thêm test failing cho Sheet dismissible, defaultSnap, insetTop`
6. **Task 04-04-03 GREEN** — `0f8238b` `feat(04-04): Sheet thêm dismissible, defaultSnap, insetTop`

## Accomplishments

- `notify.undoable` đi riêng khỏi `showToast` (không bị ép 8 giây), `success/info/error/warning` giữ nguyên thời lượng và `type NotifyOptions = Omit<ExternalToast, 'duration'>`. 5 test mới: còn sau 10 giây (fake timers), `role=status`, bấm chuột gọi `onAction` một lần và không gọi `onDismiss`, Tab+Enter, `dismiss(id)` gọi `onDismiss`, nút đóng gọi `onDismiss`.
- `InlineAlert`: prop `variant`, class và icon tách bằng `cn`, `role` theo variant; 8 test mới (kể cả không render khi rỗng với `info`).
- `resolveSnapPoints(844, 64)` = `['211px', 0.6, '776.48px']`, `(568, 108)` = `['160px', 0.6, '460px']`, `(844)` như insetTop 0, và ca kẹp `(400, 300)` = `['100px','100px','100px']`. Expanded luôn là px; medium giữ tỉ lệ trừ khi vượt expanded.
- `Sheet`: `dismissible` (không có "Đóng bảng", Esc/scrim không đóng, test cả modal và non-modal, cả uncontrolled và `open` controlled), `defaultSnap` (mở đầu, và quay về sau khi đóng), `insetTop`, listener `resize` có cleanup (test gỡ listener khi unmount).

## Verification

- `pnpm --filter @tripory/ui-web test`: 31 file, 206 test xanh. `pnpm --filter @tripory/web test`: 60 file, 979 test xanh. `typecheck` và `lint` của ui-web xanh.
- Toàn repo qua `turbo.exe run lint|typecheck|test`: 8/8 thành công cho cả ba (chạy binary trực tiếp vì `pnpm` ở gốc crash trên máy này).
- Acceptance: `duration: Infinity` và `type NotifyOptions = Omit<ExternalToast, 'duration'>` còn trong `toast.tsx`; `insetTop` có trong `sheet-snap.ts`; `dismissible` có trong `sheet.tsx`; bảng test có `776.48px` và `460px`. Tiêu chí `role={variant === 'info' ? 'status' : 'alert'}` được thỏa bằng biểu thức tương đương `role={info ? 'status' : 'alert'}` và khóa bằng test role theo variant.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test toast bấm chuột lỗi `setPointerCapture is not a function`**
- **Found during:** Task 1 (GREEN)
- **Issue:** Sonner gọi `setPointerCapture` ở pointerdown của toast; jsdom không có.
- **Fix:** `beforeAll` trong `describe('notify.undoable')` gán stub `setPointerCapture`/`releasePointerCapture` khi thiếu.
- **Files modified:** `packages/ui-web/src/molecules/toast.test.tsx`
- **Commit:** `0f6160e`

**2. [Rule 1 - Bug] Mức `defaultSnap` bị ghi đè sau khi đóng Sheet**
- **Found during:** Task 3 (GREEN), test "đóng rồi mở lại thì trở về mức defaultSnap"
- **Issue:** Base UI phát `onSnapPointChange('192px', close-press)` ngay sau `onOpenChange(false)`, làm lần mở sau vào peek (lỗi này đã có sẵn ở code cũ với mức 0.6, chưa bị test lộ).
- **Fix:** cờ `closingRef`; bỏ qua sự kiện snap khi đang đóng, xóa cờ ở `onOpenChangeComplete`/khi mở.
- **Files modified:** `packages/ui-web/src/molecules/sheet.tsx`
- **Commit:** `0f8238b`

**3. [Rule 1 - Bug] Mức đang mở lệch sau `resize`**
- **Issue:** state lưu theo giá trị snap; sau khi `resize` tính lại px, giá trị cũ không còn trong mảng nên `stepSnapPoint` về mức 0.
- **Fix:** lưu theo chỉ số (xem key-decisions). Test cũ "bottom mở ở medium…" cập nhật: expanded nay là `${0.92 * innerHeight}px` thay vì `0.92` (theo contract mới của `resolveSnapPoints`).
- **Commit:** `0f8238b`

**Requirements chưa đánh dấu hoàn thành:** frontmatter plan liệt kê ITIN-07, ITIN-10, ITIN-14, nhưng plan này chỉ giao điểm mở rộng generic của ui-web; hành vi xóa/hoàn tác, form và editor mobile nằm ở các plan sau (04-18..04-21), nên không chạy `requirements mark-complete` (như 04-02, 04-03).

Chưa kiểm được trong jsdom: vuốt xuống ở mức peek của `dismissible={false}` thực sự dừng ở peek (A10 trong RESEARCH, drawer có bật lại peek sau `cancel()` hay không). Test chỉ khẳng định Esc và scrim không đóng. Nên xác nhận bằng tay trên thiết bị khi làm timeline mobile (04-21).

## Known Stubs

None.

## Threat Flags

None. T-04-08 (`duration: Infinity`, test 10 giây) và T-04-09 (test `dismiss(id)` gọi `onDismiss`, để controller 04-18 làm `finish()` idempotent) được giảm nhẹ như kế hoạch.

## Self-Check

**Trạng thái: PASSED.**

- Có đủ 8 file trong `key-files.modified`.
- Commit `93a8be0`, `0f6160e`, `bbfea1b`, `0094b76`, `e2a59df`, `0f8238b` có trong `git log`.
