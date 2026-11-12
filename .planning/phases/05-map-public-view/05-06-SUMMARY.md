---
phase: 05-map-public-view
plan: 06
subsystem: ssr-data-layer
tags: [server-only, react-cache, bearer-stale, site-url, wave-2]
provides:
  - "`loadPublicItinerary(deps, id, session)` -> `ok | forbidden | not-found | recover | error`"
  - "`getPublicItinerary(id)` (`itinerary.server.ts`, `server-only` + `React.cache`)"
  - "`parsePublicSiteUrl` / `publicSiteUrl` (`PUBLIC_SITE_URL`, mặc định `https://triporyv1.vercel.app`)"
key-files:
  created:
    - apps/web/src/composition/server/public-itinerary.ts
    - apps/web/src/composition/server/public-itinerary.test.ts
    - apps/web/src/composition/server/site-url.ts
    - apps/web/src/composition/server/site-url.test.ts
    - apps/web/src/composition/itinerary.server.ts
  modified:
    - apps/web/src/auth-invariants.test.ts
requirements-completed: [PUB-01, PUB-03]
completed: 2026-11-11
---
# Phase 5 Plan 06: Tầng dữ liệu SSR cho trang công khai Summary

**Loader thuần phân loại kết quả BE (D-21), chỉ gắn Bearer khi phiên tươi và báo `recover` khi 403 với phiên stale (D-22).**

## Accomplishments
- `loadPublicItinerary` dùng `callBackend` (khóa origin, GET, timeout 28 giây) và bảng ánh xạ status → hàm. Body sai hình, không phải JSON, tọa độ ngoài miền, 4xx/5xx lạ, mạng và timeout đều ra `error`. Kết quả không chứa phiên hay token (có test).
- `itinerary.server.ts`: `import "server-only"`, `React.cache` theo id, thứ tự `cookies()` → `connection()` → `Date.now()`; không dùng cache dùng chung.
- `site-url.ts`: một origin http(s), production cần https hoặc loopback, lỗi tiếng Việt không chép giá trị.
- Test: 27 ca loader, 14 ca site-url.

## Deviations
`auth-invariants.test.ts` có invariant "chỉ `composition/viewer.server.ts` import `server-only`". Plan bắt buộc thêm `composition/itinerary.server.ts` có `server-only`, nên invariant đỏ. Đã sửa test để liệt kê tường minh hai file (`itinerary.server.ts`, `viewer.server.ts`), vẫn khóa quy tắc kiến trúc mục 9 (`server-only` chỉ ở `composition/*.server.ts`). Không sửa ESLint hay allowlist. File này ngoài `files_modified` của plan.

## Verification
Gate gốc xanh: lint (0 lỗi, 1 cảnh báo cũ), typecheck, test (web 2220).
