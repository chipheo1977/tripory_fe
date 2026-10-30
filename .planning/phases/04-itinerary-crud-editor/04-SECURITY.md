---
phase: 04
slug: itinerary-crud-editor
status: closed
threats_total: 70
threats_closed: 70
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-10-29
---

# Phase 04 — Security

> Hợp đồng bảo mật của phase: sổ đăng ký mối đe dọa, rủi ro đã chấp nhận, và nhật ký kiểm tra.
> Kiểm tra này chỉ xác nhận các biện pháp đã khai báo trong `<threat_model>` của 23 plan (04-01 … 04-23) có mặt trong code. Không quét lớp đe dọa mới. Các phát hiện bảo mật thật từ `04-REVIEW.md` được ghi ở mục "Unregistered Flags".
> File implementation chỉ đọc, không sửa.

**Kết luận:** 70/70 CLOSED, 0/70 OPEN. Bốn mục từng OPEN (T-04-66 … T-04-69) có biện pháp khai báo là bước UAT thủ công của plan 04-23; nay đã đóng bằng kết quả UAT (bước 10, 19, 20, 7–8). Nguồn bằng chứng của bốn mục này là UAT thủ công do người chạy xác nhận PASS 2026-10-30, không đính kèm ảnh chụp, nên chưa có tệp đối chứng độc lập. Kiểm soát kỹ thuật bên dưới các mục đó đã được xác nhận trong code (xem cột Bằng chứng). Các Unregistered Flags UF-01 … UF-04 vẫn OPEN, không chặn (không có mục nào ở mức `high`, không vượt ngưỡng `block_on: high`).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → `/api/bff/*` | Mọi lệnh đọc/ghi itinerary đi qua BFF cùng origin (cookie phiên, BFF gắn Bearer) | Dữ liệu lịch trình của người dùng, Bearer (chỉ phía server) |
| browser → `/api/maps/resolve` | URL Google Maps rút gọn do người dùng dán | URL tùy ý (có thể chứa vị trí riêng) |
| server FE → Internet (Google) | Server gọi `maps.app.goo.gl` / `goo.gl/maps` để đọc `Location` | Chỉ header `accept`; không cookie/header người dùng |
| browser → `/api/bff` (keepalive DELETE) | Lệnh xóa waypoint lúc trang ẩn/đóng | Id itinerary, id waypoint |
| BE/BFF → FE (JSON) | Phản hồi mạng không tin cậy | Dữ liệu lịch trình, tọa độ, URL ảnh bìa |
| người dùng → form / URL ảnh bìa | Text và URL tùy ý, host ảnh tùy ý | Tiêu đề, mô tả, ghi chú, URL ảnh |
| `sessionStorage` | Bản nháp form khi phiên hết hạn thật | Giá trị form (không có token/mật khẩu) |
| route `/itineraries/{id}/edit` | Khách / người không phải chủ | Quyền truy cập editor |
| npm registry → workspace | Gói `@dnd-kit/*` mới | Mã chạy trong bundle |

---

## Threat Register

Cấu hình: ASVS level 1, `block_on: high`. Trạng thái: CLOSED = biện pháp có trong code (hoặc rủi ro đã ghi vào Accepted Risks Log); OPEN = chưa có bằng chứng.

| Threat ID | Category | Component | Disposition | Mitigation / Bằng chứng | Status |
|-----------|----------|-----------|-------------|--------------------------|--------|
| T-04-01 | Spoofing (UI) | nút `aria-disabled`, z-index dialog | mitigate | Token `--text-color-disabled`, `--z-index-modal` trong `packages/design-tokens/src/theme.css:23,107`; guard `var()` mồ côi trong `tokens.test.ts` | CLOSED |
| T-04-02 | Tampering | dnd-kit (supply chain) | mitigate | `pnpm-workspace.yaml` catalog ghim cứng `@dnd-kit/core 6.3.1`, `modifiers 9.0.0`, `sortable 10.0.0`, `utilities 3.2.2`; chỉ `apps/web/package.json` khai báo (`catalog:`); `pnpm-lock.yaml:12-21,119-128,600-620` khớp; `git ls-files` không có `package-lock.json`/`yarn.lock` | CLOSED |
| T-04-03 | Elevation | domain dùng DOM/đồng hồ | mitigate | `itinerary-invariants.test.ts:72-84` (không `@dnd-kit` trong `packages/*/src`), boundaries ESLint + self-test (`packages/config/eslint/boundaries.mjs`) | CLOSED |
| T-04-04 | Spoofing | keepalive DELETE bỏ qua Origin | mitigate | `keepalive` chỉ là cờ fetch (`packages/api-client/src/fetch-http-client.ts:95`); request vẫn đi `/api/bff` (`apps/web/src/composition/http.client.ts:114`) nên qua `checkSameOrigin` (`bff.ts:111`) và `readSession` (`bff.ts:113-121`). BFF không đổi | CLOSED |
| T-04-05 | Elevation | `/itineraries/{id}/edit` không được gate | mitigate | `apps/web/src/proxy.ts:26` `PROTECTED_PATTERNS = [/^\/itineraries\/[^/]+\/edit(?:\/|$)/]`, `proxy.ts:31-33` `isProtectedPath`, `proxy.ts:63`; `proxy.test.ts:46-50,117-120`; `proxy-coverage.test.ts` | CLOSED |
| T-04-06 | Elevation | `(editor)` layout quên gate | mitigate | `apps/web/src/app/(dashboard)/(editor)/layout.tsx:10` bọc `DashboardSessionGate`; page còn lưới thứ hai `edit/page.tsx:20` (redirect `/login` nếu `viewer === null`) | CLOSED |
| T-04-07 | Information Disclosure | gate quá rộng chặn trang công khai | accept | Ghi ở Accepted Risks (AR-02). Bằng chứng: `proxy.ts:22-26` không thêm tiền tố `/itineraries`; `proxy-coverage.test.ts:54` `isProtectedPath("/itineraries/x") === false`; `proxy.test.ts:120` `/editx` không bị gate | CLOSED |
| T-04-08 | Repudiation | toast hoàn tác tự đóng sớm | mitigate | `packages/ui-web/src/molecules/toast.tsx:37` `duration: Infinity`; đồng hồ 5 s thuộc app (`use-pending-delete.ts` + controller 04-18) | CLOSED |
| T-04-09 | Tampering | `onDismiss` gọi lại gây commit lặp | mitigate | Controller idempotent: `pending = null` trước mọi side effect (đã xác nhận trong `04-REVIEW.md` "Not flagged"); test `dismiss(id)` → `onDismiss` | CLOSED |
| T-04-10 | Information Disclosure | fixture chứa dữ liệu thật | mitigate | `packages/itinerary/src/infrastructure/fixtures.ts` chỉ có GUID và tên mẫu (Sài Gòn mẫu, `address` mẫu), không token/email | CLOSED |
| T-04-11 | Tampering | tách `mapFormError` đổi hành vi | mitigate | 04-05-SUMMARY: test identity cũ chạy nguyên và xanh sau refactor; `04-REVIEW.md`: vitest `apps/web` 95 file / 1417 test pass | CLOSED |
| T-04-12 | Elevation (UI) | `canEdit` sai | mitigate | `packages/itinerary/src/domain/permissions.ts:6-7` (`viewerId !== null && ownerId === viewerId`, id đã chuẩn hóa chữ thường); test ba ca; BE là nơi chặn ghi (BE dependency ghi ở `04-BE-DEPENDENCIES.md`) | CLOSED |
| T-04-13 | Tampering | `orderedWaypointIds` lệch tập BE | mitigate | `packages/itinerary/src/domain/updates.ts:42` `isValidDayOrder` (6 ca bất hợp lệ trong test) | CLOSED |
| T-04-14 | Tampering | tên tự điền chứa ký tự điều khiển/HTML | mitigate | `packages/itinerary/src/domain/location-input.ts:55` bỏ ký tự ≤ 0x1f và 0x7f, cắt 200/500 (`:21-22,133`); render bằng text node React | CLOSED |
| T-04-15 | Denial of Service | `%` hỏng ném `URIError` | mitigate | `decodeURIComponent` bọc try/catch trong `location-input.ts` (`:72` vùng giải mã); `04-REVIEW.md` "Not flagged" xác nhận có guard; test ca `%` hỏng | CLOSED |
| T-04-16 | Spoofing | host giả `evil.com/maps/...` | mitigate | `location-input.ts:35` regex host Google khớp chính xác (không bypass, xác nhận ở `04-REVIEW.md`); test host lạ → invalid | CLOSED |
| T-04-17 | Tampering | JSON BE sai hình dạng | mitigate | Zod `.parse` ở mọi phản hồi: `http-itinerary-repository.ts:34,40,46,79`, `http-short-link-resolver.ts:14`; mapper ném khi id/tọa độ hỏng (`mappers.ts:19-22`, `createWgs84Coordinate` kiểm khoảng ở `packages/shared-kernel/src/geo.ts:19-21`) | CLOSED |
| T-04-18 | Tampering | mass assignment | mitigate | Body dựng từ field đặt tên cứng: `http-itinerary-repository.ts:73-76,86` (`name, address, longitude, latitude, notes`) | CLOSED |
| T-04-19 | Spoofing | keepalive DELETE thở refresh lúc unload | accept | AR-03 (D-32). Bằng chứng hành vi: `http-itinerary-repository.ts:93-95` `sessionRefresh: false`; stale → BFF 401 (`bff.ts:119-121`), lệnh mất | CLOSED |
| T-04-20 | Injection | id trong path | mitigate | `parseItineraryId` (GUID chuẩn hóa) ở `edit/page.tsx:14-16`; BFF `resolveBffTarget` chặn `%2f/%5c/%2e`, `.`/`..`, ký tự điều khiển và `encodeURIComponent` từng segment (`bff.ts:24-48`) | CLOSED |
| T-04-21 | Spoofing | Bearer stale → 403 oan (D-46) | mitigate | Editor chỉ fetch qua `bffHttp` (`itinerary.client.ts:8`); BFF trả 401 `session.expired` khi `stale`/`invalid`, không gọi BE (`bff.ts:119-121`); `itinerary-invariants.test.ts:113-118` cấm `fetch(`/`@tripory/itinerary/http` ở page RSC | CLOSED |
| T-04-22 | Tampering | lệnh ghi lệch thứ tự | mitigate | `packages/itinerary/src/react/index.ts:22-23,45,89` `mutationKey` + `scope { id: 'itinerary:'+id }` chạy nối đuôi | CLOSED |
| T-04-23 | Information Disclosure | cache tài khoản trước | mitigate | `queryClient.clear()` khi hết phiên: `session-events.client.ts:127`, `session-effects.tsx:46,65`; `edit/page.tsx:23` `key={viewer.id}` | CLOSED |
| T-04-24 | Info Disclosure / SSRF | `resolveShortMapsLink` | mitigate | Xem "Chi tiết kiểm tra `/api/maps/resolve`" bên dưới (`maps-resolve.ts:13-24,50-54,61-92`) | CLOSED |
| T-04-25 | Spoofing (CSRF) | route resolve | mitigate | Route chỉ export `POST` (`app/api/maps/resolve/route.ts:6`); `checkSameOrigin` (`maps-handlers.ts:27`); `itinerary-invariants.test.ts:87-93` | CLOSED |
| T-04-26 | Elevation | khách dùng route làm dịch vụ mở link | mitigate | `maps-handlers.ts:29-36`: `none` → 401 `Auth.Unauthorized`, `stale`/`invalid` → 401 `session.expired`; chỉ `fresh` đi tiếp; test `maps-handlers.test.ts:74-116` | CLOSED |
| T-04-27 | Denial of Service | lạm dụng resolve (không rate limit) | accept | AR-01 (D-51), xem Accepted Risks Log | CLOSED |
| T-04-28 | Information Disclosure | cache phản hồi | mitigate | `request-guards.ts:28-37,51-75` `cache-control: no-store` + `x-content-type-options: nosniff` cho mọi envelope; test `maps-handlers.test.ts:55,70,84,103,136` | CLOSED |
| T-04-29 | Tampering (XSS) | tiêu đề/mô tả người dùng | mitigate | Không `dangerouslySetInnerHTML` trong `modules/itinerary` (grep sạch; `itinerary-invariants.test.ts:48-54`) | CLOSED |
| T-04-30 | Tampering | ảnh bìa `javascript:`/`http:` | mitigate | `form-schemas.ts:32` `isHttpsUrl = /^https:\/\/[^\s]+$/i`, `:55-56`; `cover-image.tsx:18` `startsWith("https://")` | CLOSED |
| T-04-31 | Denial of Service | chuỗi vượt cột DB | mitigate | `form-schemas.ts:22-28` TITLE 100, DESCRIPTION 1000, COVER 500, SUBTITLE 100, NAME 200, ADDRESS 500, NOTES 2000; kiểm khớp BE ở `04-BE-DEPENDENCIES.md` | CLOSED |
| T-04-32 | Repudiation | xóa nhầm lịch trình | mitigate | `delete-itinerary-dialog.tsx:82` focus mặc định; dialog xác nhận danger variant | CLOSED |
| T-04-33 | Information Disclosure | ảnh bìa gửi Referer | mitigate | `cover-image.tsx:34` `referrerPolicy="no-referrer"`; chỉ render khi `https://` (`:18,23`) | CLOSED |
| T-04-34 | Tampering (XSS) | tiêu đề trong thẻ | mitigate | React escape, không HTML thô (grep sạch) | CLOSED |
| T-04-35 | Tampering | `?status` lạ | mitigate | `parseStatusFilter` (`packages/itinerary/src/domain/itinerary.ts:11`, dùng ở `my-itineraries-view.tsx:7,102,183`) rơi về `'all'` | CLOSED |
| T-04-36 | Repudiation | rời trang mất thay đổi | mitigate | `leave-guard.tsx:5,20-29` `beforeunload` khi dirty + `LeaveEditorDialog` (`:43`) | CLOSED |
| T-04-37 | Denial of Service (UX) | `beforeunload` phá bfcache | mitigate | `leave-guard.tsx:20-29` chỉ gắn khi dirty, gỡ trong cleanup | CLOSED |
| T-04-38 | Tampering | nút back bỏ qua guard | accept | AR-04 (RESEARCH Pattern 14) | CLOSED |
| T-04-39 | Information Disclosure | preview ảnh gọi Referer/IP tới host lạ | mitigate | `trip-info-dialog.tsx:68` `referrerPolicy="no-referrer"`, `:141` chỉ preview khi `isHttpsUrl`; `<img>` thường, không qua `next/image` (D-25). Lộ IP cho host ảnh là rủi ro còn lại, ghi ở AR-05 | CLOSED |
| T-04-40 | Tampering | `javascript:`/`data:` URL | mitigate | `form-schemas.ts:32,55` (Zod) và `trip-info-dialog.tsx:141` | CLOSED |
| T-04-41 | Information Disclosure | bản nháp rò sang tài khoản khác | mitigate | `draft-storage.ts:13-14` khóa có `viewerId`; `:9,68` TTL 24 h; `:62,84` xóa khi hỏng/sai schema; `:82` đọc qua Zod `safeParse`; chỉ `sessionStorage` (`:117`); không có token/mật khẩu trong schema nháp (`metadataSchema`/`waypointSchema`) | CLOSED |
| T-04-42 | Repudiation | xuất bản nhầm | mitigate | `publish-dialog.tsx:75` focus mặc định "Hủy", xác nhận không hoàn tác | CLOSED |
| T-04-43 | Elevation (UI) | nút xuất bản cho người không phải chủ | mitigate | `itinerary-editor.tsx:178-181` `canEdit` false → `EditorForbidden`; BE kiểm quyền | CLOSED |
| T-04-44 | Tampering (XSS) | tiêu đề/mô tả trong tóm tắt | mitigate | `trip-summary.tsx:9,78` dùng `whitespace-pre-line` (không HTML) | CLOSED |
| T-04-45 | Tampering (XSS) | phụ đề | mitigate | React escape, grep không có `dangerouslySetInnerHTML` | CLOSED |
| T-04-46 | Denial of Service | thêm ngày vô hạn | accept | AR-06; chỉ ảnh hưởng dữ liệu của chính người dùng | CLOSED |
| T-04-47 | Tampering (XSS) | tên/địa chỉ/ghi chú, tên tự điền | mitigate | `location-input.ts:55` lọc ký tự điều khiển + cắt độ dài; render text node | CLOSED |
| T-04-48 | Information Disclosure | URL dán gọi lên server | accept | AR-07; server không log URL (`maps-handlers.ts:4`, `maps-resolve.ts:6`, `json-body.ts:2`) | CLOSED |
| T-04-49 | Denial of Service | resolve mỗi phím gõ | mitigate | `location-field.tsx:27,118` `RESOLVE_DEBOUNCE_MS = 400`, bỏ kết quả cũ | CLOSED |
| T-04-50 | Spoofing (CSRF) | DELETE keepalive | mitigate | Đi `/api/bff` cùng origin; `checkSameOrigin` (`bff.ts:111`, `request-guards.ts:19-26`): có `Origin` phải trùng, không có thì request ghi cần `Sec-Fetch-Site: same-origin`; cookie `SameSite=Lax` là lớp thứ hai | CLOSED |
| T-04-51 | Repudiation | xóa lặp do commit hai lần | mitigate | Controller idempotent (xem T-04-09); `use-pending-delete.ts:66-89` | CLOSED |
| T-04-52 | Denial of Service | token stale lúc unload → DELETE không tới BE | accept | AR-03 (D-32); xem thêm Unregistered Flag UF-01 về `visibilitychange` | CLOSED |
| T-04-53 | Tampering | `orderedWaypointIds` lệch tập BE | mitigate | `isValidDayOrder` (`updates.ts:42`), flush pending trước khi kéo, scope tuần tự (`react/index.ts:89`); `InvalidReorderList` → refetch | CLOSED |
| T-04-54 | Tampering (XSS) | tên trong announcements/aria-label | mitigate | dnd-kit ghi vào live region bằng text; `dnd-announcements.ts` trả chuỗi thuần; không HTML | CLOSED |
| T-04-55 | Repudiation | đổi thứ tự thất bại âm thầm | mitigate | Rollback + toast + "Lỗi – Thử lại" (`react/index.ts` rollback, `save-indicator.tsx`) | CLOSED |
| T-04-56 | Elevation (UI) | người không phải chủ thấy thao tác sửa | mitigate | `itinerary-editor.tsx:167,178-181` `EditorForbidden`; `editor-forbidden.tsx:10` | CLOSED |
| T-04-57 | Information Disclosure | trang 403 lộ nội dung nháp | mitigate | `EditorForbidden` không nhận/hiện tiêu đề hay nội dung (04-20/04-21 SUMMARY, test) | CLOSED |
| T-04-58 | Elevation (UI) | không phải chủ mở editor lịch trình công khai | mitigate | `itinerary-editor.tsx:178` `canEdit(data, viewer.id)`; BE chặn ghi | CLOSED |
| T-04-59 | Spoofing | Bearer stale → 403 oan | mitigate | Cùng T-04-21; `edit/page.tsx:9-10` không gọi BE từ RSC; `itinerary-invariants.test.ts:113-118` | CLOSED |
| T-04-60 | Tampering | `[id]` không phải GUID / path traversal | mitigate | `edit/page.tsx:14-16` `parseItineraryId` null → `notFound()` trước khi đụng cookie và tải JS editor | CLOSED |
| T-04-61 | Information Disclosure | state/bản nháp người trước | mitigate | `edit/page.tsx:23` `key={viewer.id}`; khóa nháp có `viewerId` (`draft-storage.ts:13-14`) | CLOSED |
| T-04-62 | Tampering (XSS) | HTML thô trong module itinerary | mitigate | Invariant 1: `itinerary-invariants.test.ts:48-54` | CLOSED |
| T-04-63 | Information Disclosure | ảnh không no-referrer | mitigate | Invariant 2: `itinerary-invariants.test.ts:58-69`; cả hai `<img>` (`cover-image.tsx:34`, `trip-info-dialog.tsx:68`) đạt | CLOSED |
| T-04-64 | Spoofing (CSRF) | route resolve thêm GET | mitigate | Invariant 4: `itinerary-invariants.test.ts:87-93` | CLOSED |
| T-04-65 | Elevation | dnd-kit/DOM lọt vào package | mitigate | Invariant 3: `itinerary-invariants.test.ts:72-84` + boundaries self-test | CLOSED |
| T-04-66 | Spoofing (CSRF) | DELETE keepalive thiếu Origin bị BFF chặn | mitigate | UAT bước 10 (keepalive DELETE khi đóng tab, header `Origin`): PASS. Nguồn bằng chứng: UAT thủ công do người chạy xác nhận PASS 2026-10-30, không đính kèm ảnh chụp Network. Kiểm soát code: T-04-04, T-04-50 | CLOSED |
| T-04-67 | Elevation (UI) | người không phải chủ sửa được | mitigate | UAT bước 19 với BE thật (người khác mở editor: 403 không lộ nội dung; id sai: 404): PASS. Nguồn bằng chứng: UAT thủ công do người chạy xác nhận PASS 2026-10-30, không đính kèm ảnh chụp. Code: `itinerary-editor.tsx:178`, `permissions.ts:6-7` | CLOSED |
| T-04-68 | Spoofing | Bearer stale → 403 oan | mitigate | UAT bước 20 (chủ mở thẳng editor bản nháp khi access token đã hết hạn, không bị 403 oan): PASS. Nguồn bằng chứng: UAT thủ công do người chạy xác nhận PASS 2026-10-30, không đính kèm ảnh chụp. Code: `bff.ts:119-121`, `edit/page.tsx:9-10` | CLOSED |
| T-04-69 | Info Disclosure / SSRF | resolve link trên hạ tầng Vercel | mitigate | UAT bước 7–8 trên bản deploy Vercel HTTPS (resolve link rút gọn ghim; link POI không tọa độ hiện câu hướng dẫn): PASS. Nguồn bằng chứng: UAT thủ công do người chạy xác nhận PASS 2026-10-30, không đính kèm ảnh chụp. Code + test tự động: `maps-resolve.ts`, `maps-resolve.test.ts:117-190` | CLOSED |
| T-04-70 | Denial of Service | lạm dụng route resolve (không rate limit) | accept | AR-01 (D-51); UAT kết luận phải ghi nhận khi chạy 04-23 | CLOSED |

*Status: OPEN · CLOSED*
*Disposition: mitigate (cần implementation) · accept (rủi ro đã ghi nhận) · transfer (bên thứ ba)*

### Chi tiết kiểm tra `/api/maps/resolve` (T-04-24 … T-04-28)

| Kiểm tra | Kết quả | Bằng chứng |
|----------|---------|------------|
| Chỉ POST | Đạt | `app/api/maps/resolve/route.ts:6` chỉ export `POST` (Next tự trả 405 cho verb khác); handler còn kiểm `maps-handlers.ts:26` |
| Origin | Đạt | `maps-handlers.ts:27` → 403 `Bff.CrossOrigin`; `request-guards.ts:19-26` |
| Yêu cầu phiên fresh | Đạt | `maps-handlers.ts:29-36`: `none` → 401 `Auth.Unauthorized`; `stale`/`invalid` → 401 `session.expired`, không xóa cookie |
| Hình dạng + kích thước body | Đạt một phần | `maps-handlers.ts:38-41`: `pickStrings(["url"])` chỉ nhận chuỗi `url`, giới hạn 2048 ký tự. Giới hạn áp dụng SAU khi `request.json()` đã buffer cả body (xem UF-02) |
| Chỉ `https:` | Đạt | `maps-resolve.ts:22,28` (nguồn và đích) |
| Allowlist host nguồn | Đạt | `maps-resolve.ts:13,21-24`: chỉ `maps.app.goo.gl`, `goo.gl` (path `/maps/`) |
| Allowlist host đích | Đạt | `maps-resolve.ts:15,26-29`: `google.<tld>` (+ `www.`/`maps.`), path `/maps` hoặc host `maps.` |
| Kiểm host mỗi hop, redirect thủ công | Đạt | `maps-resolve.ts:62-67` `redirect: "manual"`; `:80-82` mỗi `Location` phải là đích Google, `consent.google.com` hoặc nguồn allowlist, còn lại → FAILED |
| Số hop / timeout | Đạt | `MAX_HOPS = 3` (`:17,61`); `TOTAL_TIMEOUT_MS = 5000` bằng `AbortController` (`:18,57-58`); lỗi mạng/abort → `{ ok: false }` (`:88-89`) |
| `consent.google.com` | Đạt | `maps-resolve.ts:31-40,81`: chỉ nhận `continue` nếu là đích Google Maps hợp lệ |
| Không tải body đích, không trả nội dung upstream | Đạt | `HEAD` (`:63`), `response.body?.cancel()` (`:71`); dừng ngay khi `Location` là Google Maps, không fetch đích (`:80`); phản hồi chỉ `{ url }` do server tạo (`maps-handlers.ts:46`); test "KHÔNG fetch URL đích" `maps-resolve.test.ts:57` |
| Header gửi đi | Đạt | Chỉ `accept: text/html` (`:67`); không cookie/Authorization của người dùng |
| `Cache-Control: no-store` | Đạt | `request-guards.ts:30-37` |
| SSRF tới IP private/loopback/metadata | Đạt | Host chỉ so khớp tên với allowlist (`maps-resolve.ts:21-29`); mọi redirect bị kiểm trước khi theo; IP literal, `localhost`, `169.254.169.254` không thể qua allowlist. Không cấu hình DNS riêng của người dùng nên không có đường rebinding tới host nội bộ |
| Lỗi không lộ nội bộ | Đạt | Mọi thất bại → 422 `Maps.UnresolvableLink` chung (`maps-handlers.ts:47`), `message: null`; không log URL |
| Rate limit | Không có, chấp nhận | AR-01 (D-51) |

Ghi chú nhỏ (không phải lỗ hổng, xem UF-05): `isSourceUrl` so khớp `hostname` mà không kiểm cổng/userinfo, nên `https://maps.app.goo.gl:8443/...` vẫn qua. Host vẫn là máy chủ của Google nên không mở đường SSRF nội bộ.

### Chi tiết BFF + keepalive (T-04-04, T-04-21, T-04-50, T-04-59)

- Allowlist gốc đường dẫn `users|itineraries|chat`, verb `GET|POST|PUT|DELETE`, chống traversal mã hóa (`bff.ts:14-17,24-48`).
- Thứ tự kiểm: method → allowlist/traversal → Origin → phiên → body → gọi BE (`bff.ts:101-141`). Request keepalive đi cùng đường nên không bỏ qua Origin.
- Header gửi BE chỉ gồm `accept`, `content-type` và `authorization` do server gắn từ cookie (`bff.ts:123-129`); header `cookie`, `host`, `origin`, `x-forwarded-*`, `authorization` của client không chuyển tiếp. Phản hồi chỉ giữ `content-type`, `no-store`, `nosniff`; 5xx của BE bị thay bằng envelope FE (`bff.ts:160-175`).
- Phiên `stale`/`invalid` → 401 `session.expired` mà không gọi BE (`bff.ts:119-121`), nên Bearer stale không bao giờ tới BE và chủ không nhận 403 oan (D-46).
- Token chỉ có trong cookie httpOnly phía server; client không nhận token (envelope `data` không chứa token; `request-guards.ts:64`).
- `bffUnloadHttp` là client trần cùng `/api/bff` (`http.client.ts:114`), không bọc refresh (D-32).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Residual impact | Accepted By | Date |
|---------|------------|-----------|-----------------|-------------|------|
| AR-01 | T-04-27, T-04-70 | D-51: route `/api/maps/resolve` không có rate limit ở Phase 4. Người dùng đã đăng nhập (phiên fresh) vượt Origin + allowlist + giới hạn 3 hop / 5 s / 2048 ký tự mới gọi được; server chỉ gọi `HEAD` tới `maps.app.goo.gl` / `goo.gl`, không trả nội dung upstream | Một tài khoản có thể dùng server FE tạo lưu lượng `HEAD` tới Google và chiếm tài nguyên serverless (chi phí, quota). Không lộ dữ liệu, không SSRF nội bộ. Nên thêm rate limit theo user/IP ở phase sau hoặc ở edge | Product owner (quyết định D-51, `04-CONTEXT.md`) | 2026-10 (phase 4 discuss) |
| AR-02 | T-04-07 | Gate quá rộng chặn trang công khai không phải lỗ hổng bảo mật; được khóa bằng test | Không | Kế hoạch 04-03 | 2026-10 |
| AR-03 | T-04-19, T-04-52 | D-32: lúc unload không refresh được token; nếu access token đã stale, BFF trả 401 và lệnh DELETE keepalive mất | Một waypoint đã "xóa" trong UI có thể vẫn còn ở BE. Chỉ ảnh hưởng dữ liệu của chính người dùng. Lưu ý: hành vi này áp dụng cả cho `visibilitychange` (xem UF-01) | Product owner (D-32) | 2026-10 |
| AR-04 | T-04-38 | Nút back trình duyệt vượt guard do giới hạn App Router; fetch đang chạy vẫn tới BE | Người dùng có thể rời trang mà không có cảnh báo; không mất dữ liệu | Kế hoạch 04-13 (RESEARCH Pattern 14) | 2026-10 |
| AR-05 | T-04-39 | Ảnh bìa là URL ngoài do người dùng nhập, tải thẳng từ trình duyệt (D-25, không proxy) | IP của người xem lộ cho host ảnh đó; Referer đã bị chặn bằng `no-referrer` | Product owner (D-25) | 2026-10 |
| AR-06 | T-04-46 | BE không có trần số ngày | Người dùng chỉ làm đầy dữ liệu của chính mình | Kế hoạch 04-16 | 2026-10 |
| AR-07 | T-04-48 | URL rút gọn dán vào form được gửi lên route cùng origin | Server FE thấy URL nhưng không log; URL không rời FE ngoài chuỗi `Location` của Google | Kế hoạch 04-17 | 2026-10 |

*Rủi ro đã chấp nhận không xuất hiện lại ở các lần kiểm sau.*

---

## Unregistered Flags

Các phát hiện từ `04-REVIEW.md` có tác động bảo mật nhưng không nằm trong sổ đăng ký. Không phát hiện lớp đe dọa mới ngoài các mục dưới đây. Các `## Threat Flags` trong 04-03 … 04-22 SUMMARY đều ghi "None" hoặc ánh xạ về threat ID hiện có (04-14 … 04-18 không có mục Threat Flags). Không cái nào là blocker theo `block_on: high`.

| Flag | Nguồn | Mức | Loại | Trạng thái | Mô tả và cách sửa |
|------|-------|-----|------|------------|-------------------|
| UF-01 | MD-01, `use-pending-delete.ts:70-73,92-94` | Medium | Toàn vẹn / sẵn sàng (không ảnh hưởng bảo mật thông tin) | OPEN, không chặn | `visibilitychange → hidden` đi `flush("unload")` qua `itineraryUnload.deleteWaypoint` (không refresh, `.catch(() => undefined)`, không cập nhật cache/save-status). Trang vẫn sống nên khi chuyển tab với token stale, BFF trả 401, lệnh bị nuốt, waypoint hiện lại khi quay về mà không có "Lỗi – Thử lại". Mở rộng phạm vi rủi ro AR-03 (D-32 chỉ chấp nhận mất lệnh khi đóng tab). Sửa: `pagehide` giữ `flush("unload")`; `visibilitychange → hidden` dùng `flush("normal")` (đường `useDeleteWaypoint` có refresh + save indicator), hoặc chạy cả hai |
| UF-02 | LW-04, `maps-handlers.ts:38` | Low | DoS nhẹ | OPEN, không chặn | `readJsonObject` buffer cả body trước khi áp `MAX_URL_LENGTH = 2048` (`:41`). Chỉ người đăng nhập, cùng origin mới tới được; nền tảng hosting thường có trần body riêng. Sửa: kiểm `content-length` ≤ ~4 KB trước khi đọc, trả 400 `Bff.InvalidBody` (hoặc 413); khi thiếu header thì đọc có trần như `readBoundedBody` ở `bff.ts:64-74` |
| UF-03 | LW-01, `itinerary-editor.tsx:307-311` | Low | Toàn vẹn (UX) | OPEN, không chặn | `handleDeleteItinerary` flush waypoint delete khi mở dialog, không tuần tự với DELETE itinerary (khác scope) nên có thể ra lỗi `NotFound` giả. Sửa: flush khi xác nhận hoặc bỏ flush |
| UF-04 | LW-05, `maps-resolve.ts:15`, `location-input.ts:35` | Low | Bảo trì phòng thủ | OPEN, không chặn | Regex host Google nhân đôi ở hai lớp; nhánh `[a-z]{2}` rộng hơn danh sách tên miền Google thật. Không khai thác được hôm nay (server chỉ theo redirect do Google điều khiển và trả URL dạng text). Sửa: một định nghĩa duy nhất xuất từ `@tripory/itinerary`, tùy chọn giới hạn danh sách TLD |
| UF-05 | phát hiện khi audit, `maps-resolve.ts:21-24` | Info | Phòng thủ chiều sâu | Ghi nhận | `isSourceUrl`/`isGoogleMapsDestination` không từ chối cổng khác 443 hay userinfo. Host vẫn thuộc allowlist Google nên không mở SSRF nội bộ; có thể thêm `url.port === ""`, `url.username === ""` để chặt hơn |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-29 | 70 | 66 | 4 | gsd-security-auditor (/gsd-secure-phase 4) |
| 2026-10-30 | 70 | 70 | 0 | Đóng T-04-66 … T-04-69 theo kết quả UAT thủ công (người chạy xác nhận PASS, không ảnh chụp); không chạy lại auditor |

Phương pháp: đọc `<threat_model>` của 23 plan, đối chiếu từng biện pháp `mitigate` với code (grep + đọc file), kiểm `accept` có mục trong Accepted Risks Log, đối chiếu `## Threat Flags` của SUMMARY và `04-REVIEW.md` (verdict `APPROVED`, 0 blocker, 0 high, 1 medium, 6 low). Chưa chạy lại test trong lần kiểm này; chỉ trích dẫn kết quả `04-REVIEW.md` (vitest `apps/web` 1417 test pass, `tsc` và `eslint` sạch).

---

## Sign-Off

- [x] Mọi mối đe dọa có disposition (mitigate / accept / transfer)
- [x] Rủi ro đã chấp nhận ghi trong Accepted Risks Log
- [x] `threats_open: 0` — T-04-66 … T-04-69 đóng theo UAT bước 10, 19, 20, 7–8 (2026-10-30)
- [ ] `status: verified` — còn chờ quyết định xử lý UF-01 (UAT bước 10 chỉ phủ đóng tab bình thường, không phủ `visibilitychange` với token stale)

**Approval:** pending (chờ quyết định UF-01)

Ghi chú: UAT PASS không đổi trạng thái UF-01 … UF-04; cả bốn vẫn OPEN, không chặn. Nên sửa UF-01 trước khi phát hành. Có thể chạy lại `/gsd-secure-phase 4` để kiểm độc lập.
