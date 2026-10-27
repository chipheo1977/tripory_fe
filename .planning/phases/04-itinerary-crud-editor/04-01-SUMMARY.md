---
phase: 04-itinerary-crud-editor
plan: 01
subsystem: design-tokens
tags: [tailwind-4, design-tokens, z-index, text-color, guard-test, vitest, wave-0]

requires:
  - phase: 01-foundation
    provides: "`@tripory/design-tokens` (semantic.css, theme.css, components.css), `@tripory/ui-web` molecules, token guard của ui-web"
provides:
  - "Alias `--text-color-muted|subtle|disabled` trong `theme.css`: `text-muted|subtle|disabled` sinh CSS thật, `bg-muted` không sinh rule"
  - "Thang `--z-index-*` (base, sticky, dropdown, overlay, modal, toast) trỏ tới `--semantic-z-*`, kèm reset `--z-index-*: initial;`"
  - "Token sizing mới `--editor-timeline-width: 400px` và `--itinerary-cover-ratio: 16 / 9` trong `components.css`"
  - "Mọi `z-(--z-*)` đổi thành `z-*`; `max-w-(--size-content-sm)` đổi thành `max-w-content-sm`"
  - "Guard test trong `tokens.test.ts`: utility có CSS thật, không `var()` mồ côi, không z-index thô"
affects: [04-02, 04-03, 04-04, 04-05, phase-04-itinerary]

tech-stack:
  added: []
  patterns: [tailwind-alias-theme-namespace, compile-and-build-guard, static-source-guard]

key-files:
  created:
    - .planning/phases/04-itinerary-crud-editor/04-01-HUMAN.md
  modified:
    - packages/design-tokens/src/theme.css
    - packages/design-tokens/src/components.css
    - packages/design-tokens/src/tokens.test.ts
    - packages/ui-web/src/molecules/dialog.tsx
    - packages/ui-web/src/molecules/dropdown-menu.tsx
    - packages/ui-web/src/molecules/select.tsx
    - packages/ui-web/src/molecules/sheet.tsx
    - packages/ui-web/src/molecules/tooltip.tsx
    - apps/web/src/components/app-shell.tsx
    - apps/web/src/components/app-header.tsx

key-decisions:
  - "Giữ nguyên các `--color-text-*` cũ; thêm alias `--text-color-*` riêng để `text-muted` có CSS mà không sinh `bg-muted`."
  - "Chặn z-index thô bằng guard tĩnh trên mã nguồn thay vì dựa vào reset `--z-index-*: initial;`."

patterns-established:
  - "Guard test dùng `compile` + `build` của Tailwind trên class thật của ui-web và apps/web, rồi đối chiếu mọi `var(--x)` với khai báo trong `packages/design-tokens/src/*.css`."
  - "Guard tĩnh: production file chỉ được dùng `z-base|sticky|dropdown|overlay|modal|toast|auto`."

requirements-completed: [ITIN-10, ITIN-11, ITIN-14]

duration: không đo (làm tay)
completed: 2026-10-27
---

# Phase 4 Plan 1: Token Wave 0 Summary

**Alias `text-muted|subtle|disabled` và thang `z-*` có CSS thật trong theme Tailwind 4, hai token sizing editor (`--editor-timeline-width`, `--itinerary-cover-ratio`), 8 file component bỏ `z-(--z-*)`, và guard test chặn utility không sinh CSS, `var()` mồ côi và z-index thô**

> Plan này do developer tự implement bằng tay, lead review từng task. Không có executor tự động.

## Performance

- **Duration:** không đo (làm tay)
- **Completed:** 2026-10-27 (commit `58b9ee8`)
- **Tasks:** 2
- **Files:** 11 trong commit (10 file code theo plan, thêm `04-01-HUMAN.md`)

## Accomplishments

- `theme.css` thêm `--z-index-*: initial;`, ba alias `--text-color-*` và sáu `--z-index-*` trỏ tới `--semantic-z-*`.
- `components.css` thêm `--editor-timeline-width: 400px;` và `--itinerary-cover-ratio: 16 / 9;`.
- 7 file component (`dialog`, `dropdown-menu`, `select`, `sheet`, `tooltip`, `app-shell`, `app-header`) đổi `z-(--z-*)` thành `z-*`; `sheet.tsx` đổi `max-w-(--size-content-sm)` thành `max-w-content-sm`.
- `tokens.test.ts` tăng thêm 167 dòng (19 test xanh): ca biên dịch cho utility Phase 4, ca đột biến cho `hasRule`, guard `var()` mồ côi, guard z-index thô.

## Task Commits

Cả hai task nằm trong một commit duy nhất (xem Deviations):

1. **Task 04-01-01 và 04-01-02** — `58b9ee8` `fix(04-01)`

## Files Created/Modified

- `packages/design-tokens/src/theme.css` - reset `--z-index-*`, alias `--text-color-*`, `--z-index-*`
- `packages/design-tokens/src/components.css` - hai token sizing mới
- `packages/design-tokens/src/tokens.test.ts` - toàn bộ guard của plan
- `packages/ui-web/src/molecules/{dialog,dropdown-menu,select,sheet,tooltip}.tsx` - đổi class z-index và `max-w-content-sm`
- `apps/web/src/components/{app-shell,app-header}.tsx` - đổi class z-index
- `.planning/phases/04-itinerary-crud-editor/04-01-HUMAN.md` - brief của lead cho người tự code

## Decisions Made

- Hai quyết định ở `key-decisions`; còn lại theo đúng `<action>` của plan.

## Deviations from Plan

### Thay đổi so với plan

**1. [Sai tiền đề của plan] Bỏ test "`z-50` không sinh rule"**
- **Found during:** Task 1
- **Issue:** Tailwind 4 luôn chấp nhận số nguyên trần cho `z-*`, nên `--z-index-*: initial;` không chặn được `z-50` (tiền đề của RESEARCH Pattern 17 sai).
- **Fix:** Bỏ ca đó. Thay bằng guard tĩnh trên mã nguồn: test đỏ nếu production file chứa `z-<số>`, `z-[...]` hoặc `z-(...)`; chỉ cho phép `z-base|sticky|dropdown|overlay|modal|toast|auto`.
- **Files modified:** `packages/design-tokens/src/tokens.test.ts`

**2. [Mở rộng guard] Guard `var()` mồ côi bỏ qua thêm `--default-` và đọc thêm `styles.css`**
- **Issue:** `--default-*` là biến của preflight Tailwind (luôn có fallback); `packages/ui-web/src/styles.css` cũng là nơi khai báo biến.
- **Fix:** Ngoài `--tw-` và `--drawer-`, guard bỏ qua tiền tố `--default-`, và đọc `packages/ui-web/src/styles.css` làm nguồn khai báo.
- **Files modified:** `packages/design-tokens/src/tokens.test.ts`

**3. [Quy trình] Một commit duy nhất thay vì commit theo từng task**
- Toàn bộ công việc nằm trong `58b9ee8`.

**4. [Acceptance grep] `git grep "z-(--z-"` phải loại file test**
- Hai dòng khớp (`tokens.test.ts` dòng 394 và 399) là chuỗi mẫu cho guard z-index thô. Acceptance grep của plan cần loại `packages/design-tokens/src/tokens.test.ts`; ngoài file đó kết quả rỗng.

---

**Total deviations:** 4 (1 sai tiền đề plan, 1 mở rộng guard, 2 quy trình/acceptance). **Impact:** không đổi phạm vi; hành vi cuối đúng ý định của plan.

## Issues Encountered

- `packages/ui-web/src/token-guard.test.ts` > "không có Storybook hoặc route showcase" timeout 5000ms ở một số lần chạy. Đã có sẵn từ trước, `58b9ee8` không đổi file này. Chi tiết ở Self-Check; đề xuất sửa nằm trong `deferred-items.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Các plan UI Phase 4 dùng được `text-muted|subtle|disabled`, `z-modal|overlay|dropdown|sticky|toast`, `max-w-content-sm`, `w-(--editor-timeline-width)`, `aspect-(--itinerary-cover-ratio)`.
- Guard sẽ đỏ nếu utility mới trỏ tới biến chưa khai báo.
- Ready for 04-02.

---
*Phase: 04-itinerary-crud-editor*
*Completed: 2026-10-27*

## Self-Check

**Trạng thái: PASSED có điều kiện.** Mọi kiểm tra liên quan tới thay đổi của plan đều xanh. Chỉ một test có sẵn từ trước của `ui-web` có thể timeout.

- `pnpm lint`: PASSED (8/8).
- `pnpm typecheck`: PASSED (8/8).
- `pnpm --filter @tripory/design-tokens test`: PASSED (19/19).
- `pnpm turbo test --continue`: `@tripory/config` 104, `design-tokens` 19, `api-client` 95, `shared-kernel` 32, `identity` 244, `web` 916 đều PASSED. `@tripory/ui-web` FAILED 1/181 do timeout ở `token-guard.test.ts` (đã có sẵn từ trước, xem Issues Encountered).
- `pnpm --filter @tripory/ui-web test` chạy riêng: lần đầu FAILED (timeout 5000ms, test chạy ~13s); hai lần chạy lại sau đó PASSED 181/181. Tổng cộng `pnpm test` gốc FAILED 3 lần liên tiếp do cùng timeout, `turbo test --continue` FAILED 1 lần.
- Nguyên nhân đo được: `productionFiles(apps)` dùng `readdirSync` đệ quy và đi vào `apps/web/node_modules` (~54.000 mục, 2-7,5s mỗi lần quét), cộng tải máy (nhiều tiến trình node chạy song song) nên vượt timeout mặc định 5000ms. `git diff 58b9ee8~1 58b9ee8` không đổi `token-guard.test.ts`.
- Acceptance grep: `git grep "z-(--z-" -- packages apps` chỉ khớp 2 dòng chuỗi mẫu trong `tokens.test.ts` (loại file này thì rỗng); `git grep "size-content-sm)" -- packages/ui-web/src` rỗng; `theme.css` có `--text-color-muted: var(--semantic-color-text-muted);`, `--z-index-modal: var(--semantic-z-modal);`, `--z-index-*: initial;`; `components.css` có `--itinerary-cover-ratio: 16 / 9;` và `--editor-timeline-width: 400px;`.
