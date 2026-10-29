---
phase: 04-itinerary-crud-editor
plan: 22
subsystem: testing
tags: [invariants, static-tests, vitest, security, be-dependencies, validation, wave-11]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-01..04-21: toàn bộ module itinerary, route resolve, editor assembly và route /itineraries/[id]/edit"
provides:
  - "`apps/web/src/itinerary-invariants.test.ts`: 7 bất biến tĩnh (XSS, ảnh no-referrer, ranh giới dnd-kit, route resolve chỉ POST, không 'Tải thêm'/'Chia sẻ', không `z-(--z-`, trang editor không gọi BE)"
  - "`04-BE-DEPENDENCIES.md`: 11 mục phụ thuộc BE của Phase 4, dẫn chiếu 03-BE-DEPENDENCIES"
  - "`04-VALIDATION.md` xanh (`status: green`, `nyquist_compliant: true`, `wave_0_complete: true`)"
  - "Cổng đầy đủ xanh: lint + typecheck + test (24/24 task, `--force`) + next build"
affects: [04-23]
tech-stack:
  added: []
  patterns: [static-invariant-test, own-walker-skipping-node_modules]
key-files:
  created:
    - apps/web/src/itinerary-invariants.test.ts
    - .planning/phases/04-itinerary-crud-editor/04-BE-DEPENDENCIES.md
  modified:
    - .planning/phases/04-itinerary-crud-editor/04-VALIDATION.md
key-decisions:
  - "Invariant 2 khớp `<img\\b[\\s\\S]*?\\/>` (kết thúc ở `/>`), không phải `>` đầu tiên: thẻ `<img` của `cover-image.tsx` và `trip-info-dialog.tsx` chứa `=>` trong `onError`, nên regex `[\\s\\S]*?>` của plan cắt nhầm trước `referrerPolicy`."
  - "Test tự duyệt thư mục và bỏ qua `node_modules`/`.next`/`.turbo`/`dist` (cùng cách với sửa `919ab37` ở token-guard), thay vì `readdirSync(..., { recursive: true })` của auth-invariants, để quét `packages/*/src` không chậm."
  - "Invariant 5 so khớp phân biệt hoa thường bằng `includes`, nên 'Đang tải thêm lịch trình…' và 'Link chia sẻ sẽ không còn mở được.' (D-42) hợp lệ."
requirements-completed: [ITIN-01, ITIN-05, ITIN-07, ITIN-11, ITIN-13]
duration: ~20 phút
completed: 2026-10-29
---

# Phase 4 Plan 22: Cổng bất biến tĩnh cuối Phase 4 Summary

**Test tĩnh khóa các quyết định bảo mật/phạm vi dễ bị lùi (XSS, no-referrer, ranh giới dnd-kit, resolve chỉ POST, không 'Tải thêm'/'Chia sẻ'), checklist 11 phụ thuộc BE, và cổng lint + typecheck + test + build xanh toàn repo**

## Performance

- **Duration:** ~20 phút
- **Completed:** 2026-10-29
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `itinerary-invariants.test.ts` có 7 `it(`, mỗi cái ứng một mối đe dọa của plan: T-04-62 (không `dangerouslySetInnerHTML` trong `modules/itinerary`), T-04-63 (mọi `<img` có `referrerPolicy="no-referrer"`; hiện có 2: `cover-image.tsx`, `trip-info-dialog.tsx`), T-04-65 (`@dnd-kit/*` chỉ import dưới `modules/itinerary/ui/`, không có trong `packages/*/src`), T-04-64 (`/api/maps/resolve` chỉ export `POST`), D-02/D-40 (không 'Tải thêm'/'Chia sẻ' trong `modules/itinerary/ui`), không `z-(--z-` ở `apps/web/src` và `packages/ui-web/src`, trang editor không chứa `@tripory/itinerary/http` hay `fetch(`.
- `04-BE-DEPENDENCIES.md`: 11 mục (bug `DaysCount`/`WaypointsCount` của `/mine`, ba giới hạn chỉ-ở-DB 500/2000/500, offset theo `UpdatedAt` trôi, thiếu ETag, thiếu `UpdatedAt` trong summary DTO, endpoint đã hoãn, Bearer stale → 403, link POI không tọa độ, và ba ghi chú). Dẫn chiếu `03-BE-DEPENDENCIES.md`.
- `04-VALIDATION.md`: 52 dòng tự động `✅ green`, cột File Exists `✅`, Wave 0 và Sign-Off tick, frontmatter xanh. Dòng 04-23 (UAT thủ công) và mục Manual-Only giữ nguyên.

## Task Commits

1. **Task 04-22-01: `itinerary-invariants.test.ts`** - `54342de` (test)
2. **Task 04-22-02: BE dependencies + VALIDATION** - `b583128` (docs)

**Plan metadata:** commit `docs(04-22): complete ...` (SUMMARY, STATE, ROADMAP).

## Files Created/Modified

- `apps/web/src/itinerary-invariants.test.ts` - 7 bất biến tĩnh, `// @vitest-environment node`
- `.planning/phases/04-itinerary-crud-editor/04-BE-DEPENDENCIES.md` - checklist phụ thuộc BE (tiếng Việt)
- `.planning/phases/04-itinerary-crud-editor/04-VALIDATION.md` - trạng thái xanh

## Verification

- `pnpm --filter @tripory/web test -- itinerary-invariants`: 7/7 xanh.
- `node_modules\@turbo\windows-64\bin\turbo.exe run lint typecheck test --force`: 24/24 task thành công; `@tripory/web` 95 file, 1417 test xanh (dùng turbo trực tiếp vì `pnpm exec turbo` crash 3221226505 trên máy này, không phải lỗi repo).
- `pnpm --filter @tripory/web build`: exit 0; có `/api/maps/resolve` (dynamic) và `/itineraries/[id]/edit` (partial prerender).
- `packages/config/eslint/boundaries.mjs` không đổi, không thêm allowlist.
- Acceptance: `Select-String ... 'DaysCount'` ở BE-DEPENDENCIES có kết quả; `nyquist_compliant: true` ở VALIDATION có kết quả.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Regex `<img` của plan cắt tại `=>`**
- **Found during:** Task 1 (lần chạy đầu: invariant 2 đỏ với `cover-image.tsx`, `trip-info-dialog.tsx`)
- **Issue:** `<img[\s\S]*?>` dừng ở `>` của `onError={() => …}`, trước `referrerPolicy`, nên báo vi phạm sai. Mã nguồn đã đúng.
- **Fix:** sửa test (không sửa mã): kết thúc ở `/>`. Thêm `expect(found).toBeGreaterThan(0)` để test không rỗng ý nghĩa.
- **Files modified:** `apps/web/src/itinerary-invariants.test.ts`
- **Commit:** 54342de

### Khác với chữ của plan

- Plan ghi `pnpm lint && pnpm typecheck && pnpm test && pnpm build` từ gốc; thay bằng turbo.exe trực tiếp + `pnpm --filter @tripory/web build` do lỗi môi trường Windows nêu trên. Cùng tập task (24).
- Chạy cổng đầy đủ một lần với `--force`, sau commit test và trước khi viết tài liệu; hai commit docs sau đó không đổi mã nên không chạy lại.

Không có lỗi thật nào của mã trước 04-22 được phát hiện: không cần sửa mã nguồn.

## Known Stubs

None.

## Threat Flags

None. T-04-62..T-04-65 đều có invariant tương ứng.

## Self-Check: PASSED

- FOUND: apps/web/src/itinerary-invariants.test.ts, 04-BE-DEPENDENCIES.md, 04-VALIDATION.md
- FOUND commits: 54342de, b583128
