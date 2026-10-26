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
> Nguồn: `04-RESEARCH.md` §Validation Architecture. Planner điền cột Task ID / Plan / Wave và Threat Ref khi tạo plan.

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
| TBD | TBD | 0 | (Wave 0) | — | Utility `text-muted/subtle/disabled`, `z-*` có CSS; không `var()` mồ côi | unit (node) | `pnpm --filter @tripory/design-tokens test` | ✅ mở rộng | ⬜ pending |
| TBD | TBD | 0 | (Wave 0) | — | `itinerary` thêm zod/react/react-query; `/http` chỉ import trong composition | lint self-test | `pnpm --filter @tripory/config test` | ✅ | ⬜ pending |
| TBD | TBD | TBD | ITIN-01 | — | DTO `/mine` parse, `isPublic` theo status, `getNextPageParam`, khử trùng id | unit (node) | `pnpm --filter @tripory/itinerary test -- http-itinerary-repository` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ITIN-01 | — | `?status` đọc/ghi, giá trị lạ → Tất cả, sentinel `fetchNextPage`, lỗi trang kế không render gì, trang đầu lỗi → ErrorState (D-02) | component (jsdom) | `pnpm --filter @tripory/web test -- my-itineraries-view` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-02 | — | trim 1–100, Enter gửi, 201 → `router.push`, không toast, invalidate | component | `pnpm --filter @tripory/web test -- create-itinerary-dialog` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-03 | — | `CalendarDate` (29/02, tháng 13, rỗng), `z.iso.date()`, `datetime({ offset: true })` | unit | `pnpm --filter @tripory/itinerary test -- calendar-date dto` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-03 | ảnh bìa URL | https-only, ≤ 500, preview debounce, ảnh lỗi vẫn lưu, `referrerPolicy=no-referrer` | component | `pnpm --filter @tripory/web test -- trip-info-dialog` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-04 | — | `buildDayRange` ngày thưa, `nextDayNumber`, mapper sắp xếp, subtitle `""` → null | unit | `pnpm --filter @tripory/itinerary test -- day-range mappers` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-04 | — | Thêm ngày optimistic + rollback; phụ đề Enter/blur/Esc/rỗng/>100 | component | `pnpm --filter @tripory/web test -- day-tabs day-subtitle` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-05 | — | `parseLocationInput` bảng mẫu (gồm URL thật); `/place/<tên, địa chỉ>/` tách Tên/Địa chỉ (D-49); `no-coordinate` (D-48) | unit | `pnpm --filter @tripory/itinerary test -- location-input` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-05 | SSRF/open proxy | `resolveShortMapsLink`: host lạ, http, > 3 hop, timeout, consent `continue`, không đọc body, không fetch đích | unit (node, fake fetch) | `pnpm --filter @tripory/web test -- maps-resolve` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-05 | SSRF/open proxy | Route `/api/maps/resolve`: 405 GET, 403 Origin lạ, 401 không phiên/stale, 400 body sai, `no-store` | route (node) | `pnpm --filter @tripory/web test -- api/maps/resolve` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-05/06 | XSS text người dùng | Thứ tự field, "Đã nhận", tự điền Tên/Địa chỉ, giới hạn 200/500/2000, lỗi khi blur/gửi | component | `pnpm --filter @tripory/web test -- waypoint-form-dialog location-field` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-07 | — | Pending delete: 5 s commit, hoàn tác không gọi BE, xóa thứ hai commit cái trước, idempotent, flush khi rời route và khi `visibilitychange` hidden (D-50) | unit (fake timers) | `pnpm --filter @tripory/web test -- pending-delete` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-07 | — | `notify.undoable`: không tự đóng sau 10 s, action 1 lần, `onDismiss`, `role=status` | component | `pnpm --filter @tripory/ui-web test -- toast` | ✅ mở rộng | ⬜ pending |
| TBD | TBD | TBD | ITIN-07 | keepalive DELETE | `keepalive` truyền vào `fetch` init; vẫn qua kiểm Origin của BFF | unit | `pnpm --filter @tripory/api-client test -- fetch-http-client` | ✅ mở rộng | ⬜ pending |
| TBD | TBD | TBD | ITIN-08 | — | `moveItem`, use case reorder kiểm tập ID; hook optimistic + rollback + `scope` (DELETE trước reorder) | unit / hook (jsdom) | `pnpm --filter @tripory/itinerary test -- reorder react` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-08 | — | Kéo bằng bàn phím trong `StrictMode`, announcements tiếng Việt, flush khi bắt đầu kéo, `InvalidReorderList` → refetch + báo | component | `pnpm --filter @tripory/web test -- waypoint-list` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-09 | — | Km từ DTO sau refetch, ẩn khi 0/null, `Intl` vi-VN | component | `pnpm --filter @tripory/web test -- trip-summary itinerary-card` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-10 | — | SaveIndicator 4 trạng thái, retry đúng biến; `beforeunload` chỉ khi bẩn; link trong editor → LeaveEditorDialog | component | `pnpm --filter @tripory/web test -- save-indicator leave-guard` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-11 | — | `canPublish` trừ pending; nút `aria-disabled`; dialog focus Hủy; không có hộp chia sẻ (D-40) | unit + component | `pnpm --filter @tripory/web test -- permissions publish` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-12 | — | Dialog xóa có câu thêm khi đã xuất bản, focus Hủy, `removeQueries` + invalidate | component | `pnpm --filter @tripory/web test -- delete-itinerary-dialog` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-13 | Elevation (UI) | `canEdit`; GUID sai → `notFound`; BE 403 → EditorForbidden; 404 → not-found; 5xx → ErrorState; Bearer stale không thành 403 | unit + component | `pnpm --filter @tripory/web test -- edit-page itinerary-editor` | ❌ | ⬜ pending |
| TBD | TBD | TBD | ITIN-13 | Auth gate | Proxy bảo vệ `/itineraries/x/edit`, không gate `/itineraries/x` | unit (node) | `pnpm --filter @tripory/web test -- proxy` | ✅ mở rộng | ⬜ pending |
| TBD | TBD | TBD | ITIN-14 | — | `resolveSnapPoints(vh, insetTop)`; Sheet `dismissible`/`defaultSnap`; layout `(editor)` không AppShell | unit + component | `pnpm --filter @tripory/ui-web test -- sheet`; `pnpm --filter @tripory/web test -- route-layouts` | ✅ mở rộng | ⬜ pending |

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
