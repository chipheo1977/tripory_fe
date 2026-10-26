---
phase: 4
slug: itinerary-crud-editor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-24
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Nguồn: `04-RESEARCH.md` §Validation Architecture. Cột Task ID / Plan / Wave / Threat Ref đã điền theo 23 plan (04-01..04-23).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 + Testing Library 16.3.3; jsdom 29.1.1 ở `apps/web`, `ui-web` và test hook có `// @vitest-environment jsdom`; package mặc định node |
| **Config file** | `packages/*/vitest.config.ts`, `apps/web/vitest.config.ts` (setup `src/test/setup.ts`) |
| **Quick run command** | `pnpm --filter <pkg> test -- <tên file>` (ví dụ `pnpm --filter @tripory/itinerary test -- location-input`) |
| **Full suite command** | `pnpm lint && pnpm typecheck && pnpm test` |
| **Estimated runtime** | ~120 giây (full suite, ước lượng) |

Quy ước: fake `HttpClient` (object có `send`), không MSW; fake timers cho 5 giây/debounce; route handler dùng `// @vitest-environment node`; fake IntersectionObserver trong `apps/web/src/test`.

---

## Sampling Rate

- **After every task commit:** test của file vừa sửa (`pnpm --filter <pkg> test -- <file>`)
- **After every plan wave:** `pnpm lint && pnpm typecheck && pnpm test`
- **Before `/gsd-verify-work`:** Full suite xanh, rồi UAT thủ công
- **Max feedback latency:** 60 giây cho quick run

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01, 04-01-02 | 04-01 | 1 | (Wave 0) ITIN-10/11/14 | T-04-01 | Utility `text-muted/subtle/disabled`, `z-*` có CSS; không `var()` mồ côi; không còn `z-(--z-` | unit (node) | `pnpm --filter @tripory/design-tokens test` | ✅ mở rộng | ⬜ pending |
| 04-02-01, 04-02-02 | 04-02 | 1 | (Wave 0) ITIN-08 | T-04-02, T-04-03 | dnd-kit pin cứng chỉ ở app; `itinerary` thêm zod/react/react-query; `/http` chỉ trong composition | lint self-test | `pnpm --filter @tripory/config test` | ✅ | ⬜ pending |
| 04-02-03 | 04-02 | 1 | ITIN-07 | T-04-04 | `keepalive` truyền vào `fetch` init; vẫn qua kiểm Origin của BFF | unit | `pnpm --filter @tripory/api-client test -- fetch-http-client` | ✅ mở rộng | ⬜ pending |
| 04-03-01 | 04-03 | 1 | ITIN-13 | T-04-05 | Proxy bảo vệ `/itineraries/x/edit`, không gate `/itineraries/x` | unit (node) | `pnpm --filter @tripory/web test -- proxy` | ✅ mở rộng | ⬜ pending |
| 04-03-02 | 04-03 | 1 | ITIN-14 | T-04-06 | Layout `(editor)` có gate, không AppShell; `(shell)` giữ URL cũ | component | `pnpm --filter @tripory/web test -- route-layouts` | ✅ mở rộng | ⬜ pending |
| 04-10-01 | 04-10 | 1 | ITIN-05 | T-04-24 | `resolveShortMapsLink`: host lạ, http, > 3 hop, timeout, consent `continue`, không đọc body, không fetch đích | unit (node, fake fetch) | `pnpm --filter @tripory/web test -- maps-resolve` | ❌ W0 | ⬜ pending |
| 04-10-02 | 04-10 | 1 | ITIN-05 | T-04-25, T-04-26, T-04-28 | Route `/api/maps/resolve`: 405 GET, 403 Origin lạ, 401 không phiên/stale, 400 body sai, 422, `no-store` | route (node) | `pnpm --filter @tripory/web test -- maps-handlers` | ❌ W0 | ⬜ pending |
| 04-10-03 | 04-10 | 1 | ITIN-11, ITIN-13 | — | Mã lỗi itinerary theo copy UI-SPEC | unit | `pnpm --filter @tripory/web test -- error-messages` | ✅ mở rộng | ⬜ pending |
| 04-04-01 | 04-04 | 2 | ITIN-07 | T-04-08, T-04-09 | `notify.undoable`: không tự đóng sau 10 s, action 1 lần, `onDismiss`, `role=status` | component | `pnpm --filter @tripory/ui-web test -- toast` | ✅ mở rộng | ⬜ pending |
| 04-04-02 | 04-04 | 2 | ITIN-10 | — | `InlineAlert variant="info"` `role=status` | component | `pnpm --filter @tripory/ui-web test -- inline-alert` | ✅ mở rộng | ⬜ pending |
| 04-04-03 | 04-04 | 2 | ITIN-14 | — | `resolveSnapPoints(vh, insetTop)`; Sheet `dismissible`/`defaultSnap` | unit + component | `pnpm --filter @tripory/ui-web test -- sheet` | ✅ mở rộng | ⬜ pending |
| 04-05-01, 04-05-02 | 04-05 | 2 | (Wave 0) ITIN-01/02 | T-04-10, T-04-11 | Fake IO/RO, fixture JSON itinerary; `SubmitStatus` chuyển chỗ; `mapFormError` dùng chung | unit | `pnpm --filter @tripory/web test -- test-helpers submit-status form-error` | ❌ W0 | ⬜ pending |
| 04-05-03 | 04-05 | 2 | (Wave 0) ITIN-08 | — | Spike dnd-kit StrictMode + KeyboardSensor (A7) | component (jsdom) | `pnpm --filter @tripory/web test -- dnd-strict-mode` | ❌ W0 | ⬜ pending |
| 04-06-01 | 04-06 | 2 | ITIN-01, ITIN-03, ITIN-04, ITIN-11, ITIN-13 | T-04-12 | `parseStatusFilter`, `CalendarDate` (29/02, tháng 13, rỗng), `buildDayRange` ngày thưa, `canEdit`, `canPublish` trừ pending | unit | `pnpm --filter @tripory/itinerary test -- itinerary calendar-date day-range permissions` | ❌ W0 | ⬜ pending |
| 04-06-02 | 04-06 | 2 | ITIN-08 | T-04-13 | `moveItem`, `isValidDayOrder`, `applyDayOrder`, `withoutWaypoint`… bất biến | unit | `pnpm --filter @tripory/itinerary test -- updates` | ❌ W0 | ⬜ pending |
| 04-07-01, 04-07-02 | 04-07 | 3 | ITIN-05, ITIN-06 | T-04-14, T-04-15, T-04-16 | `parseLocationInput` bảng mẫu (gồm URL thật); `/place/<tên, địa chỉ>/` tách Tên/Địa chỉ (D-49); `no-coordinate` (D-48) | unit | `pnpm --filter @tripory/itinerary test -- location-input` | ❌ W0 | ⬜ pending |
| 04-08-01 | 04-08 | 4 | ITIN-08 | T-04-13 | Use case reorder kiểm tập ID | unit | `pnpm --filter @tripory/itinerary test -- use-cases` | ❌ W0 | ⬜ pending |
| 04-08-02 | 04-08 | 4 | ITIN-03, ITIN-04 | T-04-17 | DTO `z.iso.date()`, `datetime({ offset: true })`; mapper sắp xếp, subtitle `""` → null | unit | `pnpm --filter @tripory/itinerary test -- dto mappers` | ❌ W0 | ⬜ pending |
| 04-08-03 | 04-08 | 4 | ITIN-01, ITIN-07 | T-04-18, T-04-19, T-04-20 | Repository chép đúng field, `isPublic` theo status, DELETE keepalive qua client unload | unit (node) | `pnpm --filter @tripory/itinerary test -- http-itinerary-repository http-short-link-resolver` | ❌ W0 | ⬜ pending |
| 04-09-01 | 04-09 | 5 | ITIN-01..12 | — | Keys, exports theo subpath | unit | `pnpm --filter @tripory/itinerary test -- keys exports` | ❌ W0 | ⬜ pending |
| 04-09-02 | 04-09 | 5 | ITIN-05, ITIN-07 | T-04-21 | `appHttp` refresh, `bffUnloadHttp` không refresh | unit | `pnpm --filter @tripory/web test -- http.client` | ✅ mở rộng | ⬜ pending |
| 04-09-03 | 04-09 | 5 | ITIN-01, ITIN-08 | T-04-22, T-04-23 | Hook optimistic + rollback + `scope` (DELETE trước reorder), settle 1 lần, infinite `getNextPageParam` | hook (jsdom) | `pnpm --filter @tripory/web test -- itinerary-hooks` | ❌ W0 | ⬜ pending |
| 04-11-01 | 04-11 | 6 | ITIN-03, ITIN-05, ITIN-09 | T-04-30, T-04-31 | Schema đếm thô, https-only, map lỗi BE → ô, `formatKm` vi-VN | unit | `pnpm --filter @tripory/web test -- form-schemas form-error-mapping format` | ❌ | ⬜ pending |
| 04-11-02 | 04-11 | 6 | ITIN-02 | T-04-29 | trim 1–100, Enter gửi, chặn gửi 2 lần, cold start, 201 → `router.push`, không toast | component | `pnpm --filter @tripory/web test -- create-itinerary-dialog` | ❌ | ⬜ pending |
| 04-11-03 | 04-11 | 6 | ITIN-12 | T-04-32 | Dialog xóa có câu thêm khi đã xuất bản, focus Hủy, `removeQueries` + invalidate | component | `pnpm --filter @tripory/web test -- delete-itinerary-dialog` | ❌ | ⬜ pending |
| 04-13-01 | 04-13 | 6 | ITIN-10 | — | SaveIndicator 4 trạng thái, retry đúng biến | component | `pnpm --filter @tripory/web test -- save-status save-indicator` | ❌ | ⬜ pending |
| 04-13-02 | 04-13 | 6 | ITIN-10 | — | UserMenu `compact`; link qua guard `onNavigate` | component | `pnpm --filter @tripory/web test -- user-menu` | ✅ mở rộng | ⬜ pending |
| 04-13-03 | 04-13 | 6 | ITIN-10 | T-04-36, T-04-37, T-04-38 | `beforeunload` chỉ khi bẩn; link trong editor → LeaveEditorDialog, tự đi tiếp | component | `pnpm --filter @tripory/web test -- leave-guard` | ❌ | ⬜ pending |
| 04-12-01 | 04-12 | 7 | ITIN-01, ITIN-09 | T-04-33, T-04-34 | Thẻ: ảnh no-referrer, fallback, km ẩn khi 0, không số ngày/điểm | component | `pnpm --filter @tripory/web test -- cover-image itinerary-card` | ❌ | ⬜ pending |
| 04-12-02 | 04-12 | 7 | ITIN-01, ITIN-12 | T-04-35 | `?status` đọc/ghi, giá trị lạ → Tất cả, sentinel `fetchNextPage`, lỗi trang kế không render gì, trang đầu lỗi → ErrorState (D-02) | component (jsdom) | `pnpm --filter @tripory/web test -- my-itineraries-view` | ❌ | ⬜ pending |
| 04-12-03 | 04-12 | 7 | ITIN-01 | — | Page dùng view trong Suspense; build xanh | component + build | `pnpm --filter @tripory/web test -- itineraries/mine` | ✅ viết lại | ⬜ pending |
| 04-14-01 | 04-14 | 7 | ITIN-10 (D-36) | T-04-41 | Bản nháp sessionStorage khóa theo viewer, TTL, lưu khi `expired` | unit | `pnpm --filter @tripory/web test -- draft-storage` | ❌ | ⬜ pending |
| 04-14-02 | 04-14 | 7 | ITIN-14 | — | Dialog từ `md`, Sheet modal expanded dưới `md`, khóa khi gửi | component | `pnpm --filter @tripory/web test -- responsive-form-surface` | ❌ | ⬜ pending |
| 04-14-03 | 04-14 | 7 | ITIN-03 | T-04-39, T-04-40 | https-only, ≤ 500, preview debounce, ảnh lỗi vẫn lưu, `referrerPolicy=no-referrer` | component | `pnpm --filter @tripory/web test -- trip-info-dialog` | ❌ | ⬜ pending |
| 04-16-01 | 04-16 | 7 | ITIN-04, ITIN-09 | T-04-46 | Dải ngày thưa, km dòng 2, thêm ngày optimistic + rollback | component | `pnpm --filter @tripory/web test -- day-tabs` | ❌ | ⬜ pending |
| 04-16-02 | 04-16 | 7 | ITIN-04 | T-04-45 | Phụ đề Enter/blur/Esc/rỗng/>100 | component | `pnpm --filter @tripory/web test -- day-subtitle` | ❌ | ⬜ pending |
| 04-18-01 | 04-18 | 7 | ITIN-07 | T-04-51 | Pending delete: 5 s commit, hoàn tác không gọi BE, xóa thứ hai commit cái trước, idempotent | unit (fake timers) | `pnpm --filter @tripory/web test -- pending-delete` | ❌ | ⬜ pending |
| 04-18-02 | 04-18 | 7 | ITIN-07 | T-04-50, T-04-52 | Flush khi unmount, `pagehide`, `visibilitychange` hidden (D-50) qua keepalive | component | `pnpm --filter @tripory/web test -- use-pending-delete` | ❌ | ⬜ pending |
| 04-15-01 | 04-15 | 8 | ITIN-09 | T-04-44 | Tóm tắt: tổng km BE, ẩn khi 0, mô tả pre-line | component | `pnpm --filter @tripory/web test -- trip-summary` | ❌ | ⬜ pending |
| 04-15-02 | 04-15 | 8 | ITIN-11 | T-04-42, T-04-43 | `canPublish` trừ pending; nút `aria-disabled`; dialog focus Hủy; không có hộp chia sẻ (D-40) | component | `pnpm --filter @tripory/web test -- publish` | ❌ | ⬜ pending |
| 04-17-01 | 04-17 | 8 | ITIN-05 | T-04-49 | "Đã nhận", resolve rút gọn (debounce, bỏ kết quả cũ), lỗi resolve, câu D-48 | component | `pnpm --filter @tripory/web test -- location-field` | ❌ | ⬜ pending |
| 04-17-02 | 04-17 | 8 | ITIN-05, ITIN-06 | T-04-47, T-04-48 | Thứ tự field, tự điền Tên/Địa chỉ, giới hạn 200/500/2000, lỗi khi blur/gửi, khôi phục bản nháp | component | `pnpm --filter @tripory/web test -- waypoint-form-dialog` | ❌ | ⬜ pending |
| 04-19-01 | 04-19 | 8 | ITIN-08 | T-04-54 | Announcements tiếng Việt | unit | `pnpm --filter @tripory/web test -- dnd-announcements` | ❌ | ⬜ pending |
| 04-19-02 | 04-19 | 8 | ITIN-07, ITIN-08 | T-04-53, T-04-55 | Kéo bằng bàn phím trong `StrictMode`, flush khi bắt đầu kéo, rollback, `InvalidReorderList` → refetch + báo info | component | `pnpm --filter @tripory/web test -- waypoint-list` | ❌ | ⬜ pending |
| 04-20-01 | 04-20 | 9 | ITIN-13 | T-04-56, T-04-57 | 403 tự render, 404 client dùng chung `NotFoundView` | component | `pnpm --filter @tripory/web test -- not-found editor-forbidden` | ✅ mở rộng | ⬜ pending |
| 04-20-02 | 04-20 | 9 | ITIN-10, ITIN-11 | — | Header: back, h1, SaveIndicator, Xuất bản ẩn khi đã xuất bản, dòng D-41, menu ⋯ | component | `pnpm --filter @tripory/web test -- editor-header` | ❌ | ⬜ pending |
| 04-20-03 | 04-20 | 9 | ITIN-14 | — | Grid desktop; Sheet không modal `dismissible=false` `defaultSnap=medium` `insetTop` đo header | component | `pnpm --filter @tripory/web test -- editor-layout` | ❌ | ⬜ pending |
| 04-21-01 | 04-21 | 10 | ITIN-04, ITIN-05 | — | Timeline: tabs + phụ đề + list + thanh thêm điểm | component | `pnpm --filter @tripory/web test -- timeline-panel` | ❌ | ⬜ pending |
| 04-21-02 | 04-21 | 10 | ITIN-03..14 | T-04-58, T-04-59, T-04-61 | `canEdit`; BE 403 → EditorForbidden; 404 → NotFoundView; 5xx → ErrorState; luồng thêm/xóa/hoàn tác/xuất bản/xóa lịch trình; back D-47; khôi phục bản nháp | component (tích hợp) | `pnpm --filter @tripory/web test -- itinerary-editor` | ❌ | ⬜ pending |
| 04-21-03 | 04-21 | 10 | ITIN-13 | T-04-60 | GUID sai → `notFound`; không gọi BE từ RSC; `key` theo viewer | component + build | `pnpm --filter @tripory/web test -- edit/page` | ❌ | ⬜ pending |
| 04-22-01 | 04-22 | 11 | ITIN-01, ITIN-05, ITIN-07, ITIN-11, ITIN-13 | T-04-62..T-04-65 | Bất biến tĩnh: không HTML thô, ảnh no-referrer, dnd-kit chỉ ở app, route chỉ POST, không "Tải thêm"/"Chia sẻ" | unit (node) | `pnpm --filter @tripory/web test -- itinerary-invariants` | ❌ | ⬜ pending |
| 04-22-02 | 04-22 | 11 | (gate) | — | Full suite + build | full | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | ✅ | ⬜ pending |
| 04-23-01, 04-23-02 | 04-23 | 12 | ITIN-01..14 | T-04-66..T-04-70 | UAT thủ công (Manual-Only) | manual checkpoint | `Select-String -Path .planning/phases/04-itinerary-crud-editor/04-UAT-CHECKLIST.md -Pattern 'maps.app.goo.gl'` | ❌ | ⬜ pending |
*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Sửa `packages/design-tokens/src/theme.css` (`--text-color-*`, `--z-index-*`), đổi `z-(--z-*)` → `z-*`, sửa `max-w-(--size-content-sm)`; guard trong `tokens.test.ts`
- [ ] `packages/itinerary/package.json`: `zod`, peer/dev `react`, `@tanstack/react-query`, `@types/react`; bỏ `--passWithNoTests`
- [ ] Catalog dnd-kit (pin cứng) + spike StrictMode/keyboard dưới jsdom
- [ ] `HttpRequest.keepalive` ở `api-client` + test
- [ ] Proxy pattern `/edit` + `proxy-coverage.test.ts`; `route-layouts.test.tsx` theo cấu trúc `(shell)`/`(editor)`
- [ ] Fixture DTO itinerary + fake IntersectionObserver trong `apps/web/src/test`
- [ ] Chuyển `SubmitStatus` sang `apps/web/src/components`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Kéo thả cảm ứng trong sheet | ITIN-08, ITIN-14 | jsdom không mô phỏng touch thật | iOS Safari + Android Chrome: nhấn giữ tay cầm ~180 ms, sheet không kéo theo, auto-scroll |
| Sheet 3 mức, không che header | ITIN-14 | Bố cục viewport thật | 320×568 và 390×844; bàn phím ảo không che nút gửi |
| Resolve `maps.app.goo.gl` thật | ITIN-05 | Phụ thuộc Google | Từ bản deploy: link ghim (có tọa độ) và link POI (D-48 hiện câu hướng dẫn, tự điền Tên/Địa chỉ) |
| Đóng tab trong 5 giây sau khi xóa | ITIN-07 | Vòng đời trình duyệt | Xóa điểm, đóng tab, mở lại: điểm đã mất trên BE; DevTools thấy request `keepalive` có `Origin` |
| Hết phiên khi form mở | ITIN-10 (D-36) | Cần BE thật + hết hạn token | Form mở → hết phiên → đăng nhập lại → form khôi phục kèm "Đã khôi phục nội dung chưa lưu" |
| Hai tab cùng sửa | ITIN-08 (D-37) | Cần BE thật | Focus lại thấy dữ liệu mới; reorder cũ → "Danh sách đã thay đổi, đã tải lại" |
| Km theo ngày/tổng | ITIN-09 | Số do BE tính | Đổi sau thêm, sửa, xóa, reorder |
| Announcements kéo thả | ITIN-08 | Cần trình đọc màn hình thật | VoiceOver/NVDA đọc tiếng Việt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
