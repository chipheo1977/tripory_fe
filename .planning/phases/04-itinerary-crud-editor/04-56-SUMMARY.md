---
phase: 04-itinerary-crud-editor
plan: 56
subsystem: itinerary-infrastructure, bff
tags: [place-search, photon, nominatim, bff, rate-limit, cache, wave-35]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-55"
provides:
  - "Adapter createPhotonPlaceSearchProvider, createNominatimReverseProvider, createHttpPlaceLookup ('@tripory/itinerary/http')"
  - "BFF GET /api/places/search|suggestions|reverse (Origin, phiên, 30 request/60 s mỗi user, cache TTL, User-Agent riêng)"
  - "Mã lỗi Places.RateLimited, Places.Unavailable, Bff.InvalidQuery"
affects: [04-57]
tech-stack:
  added: []
  patterns: ["handler thuần (NextRequest, deps) => NextResponse + route ≤ 25 dòng", "timeout AbortController + setTimeout"]
key-files:
  created:
    - packages/itinerary/src/infrastructure/photon-dto.ts
    - packages/itinerary/src/infrastructure/photon-place-search.ts
    - packages/itinerary/src/infrastructure/nominatim-reverse.ts
    - packages/itinerary/src/infrastructure/place-dto.ts
    - packages/itinerary/src/infrastructure/place-provider-http.ts
    - packages/itinerary/src/infrastructure/http-place-lookup.ts
    - apps/web/src/composition/server/places-handlers.ts
    - apps/web/src/composition/server/places-runtime.ts
    - apps/web/src/lib/in-memory/ttl-cache.ts
    - apps/web/src/lib/in-memory/rate-limit.ts
    - apps/web/src/app/api/places/search/route.ts
    - apps/web/src/app/api/places/suggestions/route.ts
    - apps/web/src/app/api/places/reverse/route.ts
  modified:
    - packages/itinerary/src/infrastructure/index.ts
    - packages/itinerary/src/exports.test.ts
    - apps/web/src/composition/server/env.ts
    - apps/web/src/lib/feedback/error-messages.ts
    - apps/web/src/itinerary-invariants.test.ts
key-decisions:
  - "Photon lang=default (lang=vi trả 400); gợi ý dùng include= không có q; UA 'Tripory/0.1 (+https://triporyv1.vercel.app)'"
  - "Nominatim chỉ reverse dự phòng, cổng tối thiểu 1100 ms mỗi tiến trình (đóng thì bỏ qua, không xếp hàng); NOMINATIM_BASE_URL=off tắt hẳn"
requirements-completed: []
duration: n/a
completed: 2026-11-06
---
# Phase 4 Plan 56: Photon, Nominatim và BFF /api/places Summary
**Nhà cung cấp địa điểm nằm sau BFF của app: trình duyệt chỉ gọi `/api/places/*`, BFF kiểm Origin, phiên, giới hạn theo user, cache rồi mới gọi Photon (Nominatim chỉ khi Photon không có địa chỉ).**
## Đã làm
- Adapter Photon (search, suggest theo `include`, reverse), Nominatim reverse `jsonv2`, lookup HTTP cho client; header chỉ `accept` + `user-agent`, `redirect: 'error'`, timeout 5 s; mọi lỗi thành `Error('place-provider-failed')`.
- `PlacesDeps = { server, service, cache, limiter, destinations }`; thứ tự guard: method → `checkSameOrigin` → `readSession` (401 `Auth.Unauthorized` / `session.expired`) → limiter (429 + `retry-after`) → validate (400 `Bff.InvalidQuery`) → cache (search 10 phút, gợi ý 24 h, reverse 24 h, LRU 500) → service (502 `Places.Unavailable`, không cache lỗi). Không log truy vấn hay tọa độ.
- Env `PHOTON_BASE_URL`, `NOMINATIM_BASE_URL` (tùy chọn; mặc định áp ở `places-runtime.ts`); route gọi `await connection()` để `next build` không prerender GET.
## Kết quả lệnh
- `pnpm --filter @tripory/itinerary lint` 0, `typecheck` 0, `test` 615/615.
- `pnpm --filter @tripory/web test -- places-handlers ttl-cache rate-limit env error-messages itinerary-invariants auth-invariants` 174/174.
- Gốc `pnpm lint` 8/8 (0 lỗi, 1 cảnh báo cũ), `pnpm typecheck` 8/8, `pnpm --filter @tripory/web build` 0; gốc `pnpm test` 8/8 sau `3381d64` (web 2084/2084; test 'tên đổi theo điểm đến' của create-itinerary-dialog được nâng timeout riêng 15 s vì chậm do máy, cùng lỗi ở `6999099`).
## Task Commits
1. Item 4 + 5: `ab1653a`
2. Sửa timeout một test cũ: `3381d64`
## Deviations from Plan
- `ttl-cache.ts`, `rate-limit.ts` (+ test) đặt ở `apps/web/src/lib/in-memory/` thay vì `composition/server/`: bất biến auth cấm `.delete(` trong `composition/server` (luật cookie), mà LRU/limiter cần `Map.delete`; bất biến không đổi.
- Trường env tùy chọn, mặc định áp ở `places-runtime.ts` (phương án plan cho phép), nên không phải sửa fixture `ServerEnv`.
- Thêm `place-provider-http.ts` (fetch dùng chung) và `places-runtime.test.ts`; body Nominatim `{ error }` thì ném (service nuốt vì là fallback).
## Self-Check: PASSED
