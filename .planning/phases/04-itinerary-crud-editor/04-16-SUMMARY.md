---
phase: 04-itinerary-crud-editor
plan: 16
subsystem: itinerary-editor-day-tabs-and-subtitle
tags: [day-tabs, add-day, day-subtitle, optimistic, save-status, wave-7]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-06: buildDayRange/nextDayNumber; 04-09: itinerary.useAddDay/useSetDaySubtitle (optimistic + rollback); 04-11: formatKm, validateSubtitle; 04-13: useSaveStatusStore"
provides:
  - "`DayTabs({ itinerary, selectedDay, onSelectDay })`: tab Ngày 1..max, km theo ngày, nút 'Thêm ngày' sau TabsList"
  - "`DaySubtitle({ itineraryId, day })`: phụ đề ngày sửa tại chỗ (D-29)"
affects: [04-18, 04-19, 04-20, 04-21]

tech-stack:
  added: []
  patterns: [ref-guard-against-double-commit, closure-vs-latest-ref-in-mutation-callbacks, focus-after-optimistic-render]

key-files:
  created:
    - apps/web/src/modules/itinerary/ui/day-tabs.tsx
    - apps/web/src/modules/itinerary/ui/day-tabs.test.tsx
    - apps/web/src/modules/itinerary/ui/day-subtitle.tsx
    - apps/web/src/modules/itinerary/ui/day-subtitle.test.tsx
  modified: []

key-decisions:
  - "Lỗi thêm ngày chỉ lùi về ngày trước khi người dùng vẫn đang chọn tab vừa bị gỡ (đọc ngày đang chọn qua ref cập nhật trong effect, vì callback mutation chụp closure lúc bấm)."
  - "Focus tab mới dùng `focusDayRef` + effect theo [selectedDay, số ngày]: cache optimistic ghi sau `onMutate` nên tab chưa có trong DOM ở lần render đầu."
  - "Phụ đề: `finishedRef` mỗi phiên sửa, nên Enter rồi blur (hoặc Esc rồi blur do input bị gỡ) không gửi/hủy hai lần; độ dài kiểm trên giá trị thô (khớp BE, Pitfall 10)."

requirements-completed: [ITIN-04, ITIN-09, ITIN-10]

duration: ~25 phút
completed: 2026-10-28
---

# Phase 4 Plan 16: Tab ngày, thêm ngày, phụ đề inline Summary

**`DayTabs` vẽ đủ Ngày 1..max kèm km của BE và thêm ngày optimistic có rollback + "Lỗi – Thử lại", `DaySubtitle` sửa phụ đề tại chỗ với Enter/blur/Esc, validate 100 ký tự và rollback**

## Commits

1. **Task 04-16-01 RED** — `ef56bb5` `test(04-16): add failing tests for DayTabs`
2. **Task 04-16-01 GREEN** — `baa2d68` `feat(04-16): DayTabs va them ngay optimistic voi rollback`
3. **Task 04-16-02 RED** — `58788b0` `test(04-16): add failing tests for DaySubtitle`
4. **Task 04-16-02 GREEN** — `1e7f171` `feat(04-16): DaySubtitle sua phu de ngay tai cho`

## Accomplishments

- **Task 1 (`DayTabs`):** `Tabs variant="line"` với `value = String(selectedDay)`; mỗi `TabsTrigger` hai dòng ("Ngày N" + km `tabular-nums`, bỏ dòng km khi không có), `aria-label` "Ngày 2, 12,4 km" hoặc "Ngày 2". Nút "Thêm ngày" (`Button ghost sm` + `Plus`) nằm trong thanh `overflow-x-auto` nhưng ngoài `TabsList`, nên không có role tab và không thuộc roving focus. Thêm ngày: `onSelectDay(next)` ngay, focus tab mới, `PUT …/subtitle null` qua `useAddDay`; lỗi gỡ tab (rollback ở hook), chọn lại ngày trước, focus về nút, `store.markFailed(retry)`. Tab chọn tự `scrollIntoView({ inline: "nearest", block: "nearest", behavior })` (`auto` khi reduced motion). 8 test.
- **Task 2 (`DaySubtitle`):** nút xem (accessible name "Thêm phụ đề cho Ngày N" / "Sửa phụ đề Ngày N: …"), `Input` `aria-label` "Phụ đề Ngày N" trong `FormField` + `FormFieldError`, con trỏ cuối. Enter/blur lưu (trim, rỗng → `null`, không đổi → không gửi), Esc hủy và trả focus về nút, > 100 ký tự ở lại sửa với "Phụ đề tối đa 100 ký tự." + `aria-invalid`. Lỗi lưu: cache trả giá trị cũ ở hook, `markFailed` với retry gửi lại đúng biến. 12 test.
- **Threat model:** T-04-45 (phụ đề chỉ render qua React, không `dangerouslySetInnerHTML`); T-04-46 (không đặt trần số ngày, đã chấp nhận).

## Verification

- `pnpm --filter @tripory/web exec vitest run day-tabs` (8) và `day-subtitle` (12): xanh.
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 79 file, 1241 test xanh. ESLint boundaries không đổi.
- Acceptance: `markFailed` có trong `day-tabs.tsx`; `Thêm phụ đề cho ngày này` có trong `day-subtitle.tsx`; ≥ 5 và ≥ 7 test.

## Deviations from Plan

None - plan executed exactly as written. (Hai điểm bổ sung nhỏ trong phạm vi plan: `TabsList aria-label="Các ngày"`, và chỉ lùi ngày chọn khi người dùng vẫn ở tab bị gỡ, xem key-decisions.)

## Known Stubs

None. Hai component chưa được ghép vào editor; việc ghép thuộc các plan sau (04-18 trở đi).

## Notes cho người xem trình duyệt

- Thanh `overflow-x-auto` của tab: `TabsList` giữ viền dưới riêng, nút "Thêm ngày" nằm sau nó nên đường viền dưới chỉ chạy hết phần tab; kiểm bằng mắt khi ghép vào editor (04-18+).
- `scrollIntoView` mượt, focus vào tab mới sau khi thêm ngày, và Esc trong ô phụ đề khi nằm trong Sheet không modal chỉ kiểm được trong trình duyệt thật (jsdom không có layout).

## Self-Check: PASSED

- FOUND: day-tabs.tsx, day-tabs.test.tsx, day-subtitle.tsx, day-subtitle.test.tsx
- FOUND commits: ef56bb5, baa2d68, 58788b0, 1e7f171
