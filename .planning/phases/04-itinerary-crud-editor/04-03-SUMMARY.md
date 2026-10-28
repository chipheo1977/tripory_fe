---
phase: 04-itinerary-crud-editor
plan: 03
subsystem: routing
tags: [next-route-groups, proxy, session-gate, editor-layout, skeleton, tdd]

requires:
  - phase: 03-identity
    provides: "proxy.ts, DashboardSessionGate, layout (dashboard) với AppShell"
provides:
  - "`isProtectedPath`, `PROTECTED_PATTERNS` trong proxy: `/itineraries/{id}/edit` cần phiên, `/itineraries/{id}` công khai không bị gate"
  - "Route group lồng `(dashboard)/(shell)` (AppShell, URL Phase 3 không đổi) và `(dashboard)/(editor)` (toàn màn, có gate, không AppShell)"
  - "`EditorSkeleton` cùng `loading.tsx` và `error.tsx` cho `/itineraries/[id]/edit`"
affects: [04-21, phase-05-public-itinerary]

tech-stack:
  added: []
  patterns: [nested-route-groups, regex-protected-patterns, git-mv-history-preserving]

key-files:
  created:
    - apps/web/src/app/(dashboard)/(editor)/layout.tsx
    - apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/loading.tsx
    - apps/web/src/app/(dashboard)/(editor)/itineraries/[id]/edit/error.tsx
    - apps/web/src/modules/itinerary/ui/editor-skeleton.tsx
  modified:
    - apps/web/src/proxy.ts
    - apps/web/src/proxy.test.ts
    - apps/web/src/proxy-coverage.test.ts
    - apps/web/src/app/route-layouts.test.tsx
  moved:
    - "apps/web/src/app/(dashboard)/{layout,loading,error}(.test).tsx và itineraries/mine, settings/password → (dashboard)/(shell)/"

key-decisions:
  - "Không thêm tiền tố `/itineraries` vào `PROTECTED_PREFIXES`; dùng `PROTECTED_PATTERNS` regex `^/itineraries/[^/]+/edit(?:/|$)` để trang công khai Phase 5 không bị gate."
  - "Không còn `layout.tsx` ở `(dashboard)/`, mỗi group con có layout riêng nên editor không kế thừa AppShell."

patterns-established:
  - "`proxy-coverage.test.ts` dùng `isProtectedPath` thật của proxy thay vì bản sao cục bộ."

requirements-completed: []

duration: 6 min
completed: 2026-10-28
---

# Phase 4 Plan 3: Route group (shell)/(editor) và proxy edit Summary

**Proxy gate `/itineraries/{id}/edit` bằng `isProtectedPath` (regex theo segment), `(dashboard)` tách thành `(shell)` có AppShell và `(editor)` toàn màn có gate + `EditorSkeleton`**

## Commits

1. **Task 04-03-01 RED** — `a66b309` `test(04-03): thêm test isProtectedPath cho /itineraries/{id}/edit`
2. **Task 04-03-01 GREEN** — `5ff83b5` `feat(04-03): bảo vệ /itineraries/{id}/edit bằng isProtectedPath`
3. **Task 04-03-02** — `d818e15` `feat(04-03): tách (dashboard) thành route group (shell) và (editor)`

## Accomplishments

- `proxy.ts` export `PROTECTED_PATTERNS` và `isProtectedPath`; `proxy()` dùng hàm này. Test: 7 ca `isProtectedPath` (edit, edit/, `/itineraries/abc`, `editx`, mine, settings, `/itineraries`), redirect `/itineraries/abc/edit` về `/login?next=%2Fitineraries%2Fabc%2Fedit`, và `/itineraries/abc` đi qua.
- `proxy-coverage.test.ts` import `isProtectedPath`, quét đệ quy mọi page dưới `(dashboard)` (bỏ cả group lồng), thêm ca `/itineraries/x` không bị gate.
- Chín file Phase 3 chuyển bằng `git mv` vào `(shell)` (git ghi nhận rename 100%). Build xác nhận `/itineraries/mine` và `/settings/password` vẫn có.
- `(editor)/layout.tsx`: `DashboardSessionGate` trong `Suspense`, fallback `EditorSkeleton`, không AppShell (D-16).
- `EditorSkeleton` (server component): header sticky token `z-sticky`, skeleton nút back và tiêu đề, bố cục desktop `lg:grid` với `--editor-timeline-width`, bố cục mobile, `role="status"` "Đang tải lịch trình…".
- `route-layouts.test.tsx`: import `(shell)/layout`, thêm ca editor không có `data-testid="shell"`.

## Verification

- `pnpm --filter @tripory/web test`: 58 file, 927 test xanh. `typecheck`, `lint`, `build` của web xanh.
- Toàn repo qua `turbo.exe run lint|typecheck|test`: 8/8 thành công cho cả ba (chạy binary trực tiếp vì `pnpm` ở gốc crash, như 04-02).

## Deviations from Plan

**Requirements chưa đánh dấu hoàn thành:** frontmatter plan liệt kê ITIN-13 và ITIN-14, nhưng plan này chỉ dựng gate và khung route; trang editor (04-21) và bottom sheet mobile chưa có nên không chạy equirements mark-complete (như 04-02). Hai yêu cầu sẽ đóng ở plan giao trang editor.

Ghi chú nhỏ: `(editor)` chưa có `page.tsx` (plan 04-21) nên `proxy-coverage` chưa kiểm được page editor; ca `isProtectedPath("/itineraries/abc/edit")` ở `proxy.test.ts` khóa hành vi này tới lúc đó. Plan không yêu cầu test riêng cho `EditorSkeleton`/`error.tsx` của editor nên không thêm.

## Known Stubs

None.

## Threat Flags

None. T-04-05 và T-04-06 được giảm nhẹ như kế hoạch (`PROTECTED_PATTERNS`, `DashboardSessionGate` trong `(editor)/layout.tsx`).

## Self-Check

**Trạng thái: PASSED.**

- Có: `(shell)/layout.tsx`, `(editor)/layout.tsx`, `editor-skeleton.tsx`, `(editor)/itineraries/[id]/edit/loading.tsx` và `error.tsx`.
- Không còn: `(dashboard)/layout.tsx`.
- `(editor)/layout.tsx` không chứa `AppShell`, có `DashboardSessionGate`; `editor-skeleton.tsx` có "Đang tải lịch trình…".
- Commit `a66b309`, `5ff83b5`, `d818e15` có trong `git log`.
