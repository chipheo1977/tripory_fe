# Phase 5: Map & Public View - Research

**Researched:** 2026-11-09
**Domain:** trang công khai SSR (Next 16.4, Cache Components), bản đồ chỉ đọc dùng lại MapLibre của Phase 4, chia sẻ (clipboard, Web Share, QR), Open Graph/noindex
**Confidence:** HIGH cho kiến trúc và API Next (đọc docs 16.4 trong repo); MEDIUM cho hành vi crawler Zalo (xem Assumptions Log)

> Người thực hiện: orchestrator gsd-plan-phase tự làm vai researcher (môi trường không có công cụ spawn subagent). Mọi khẳng định có nhãn nguồn: `[VERIFIED: …]` đã kiểm bằng công cụ trong phiên này, `[CITED: …]` lấy từ docs/tài liệu, `[ASSUMED]` chưa kiểm.

## User Constraints (từ 05-CONTEXT.md, là nguồn chuẩn; bản này chỉ tóm tắt để planner đối chiếu)

**Locked (D-01..D-25):** xem `05-CONTEXT.md` §Implementation Decisions. Tóm tắt theo nhóm:
- Bố cục bài viết D-01..D-06: ảnh bìa lớn, tiêu đề, mô tả, ngày khởi hành, số ngày, tổng điểm, tổng km (ẩn khi 0); khối tác giả chỉ khi DTO có `author` (D-02); mỗi điểm có chấm màu ngày + số thứ tự, tên, địa chỉ, ghi chú `white-space: pre-line`, link Google Maps `https://www.google.com/maps/search/?api=1&query={lat},{lng}` (D-03); mục ngày "Ngày N · phụ đề" + "X điểm · Y km" (D-04); ngày trống vẫn hiện "Chưa có điểm" (D-05); dải chip ngày dính dưới header, cuộn tới ngày, `aria-current`, tôn trọng `prefers-reduced-motion` (D-06).
- Chuyển chế độ D-07..D-11: mặc định Bài viết, `?view=map`, đẩy lịch sử, nút viên thuốc đáy giữa ở mobile / thanh trên từ `lg`; chế độ Bản đồ giống editor nhưng chỉ đọc, tab Tổng quan + tab ngày; lỗi bản đồ có "Thử lại" và "Xem dạng bài viết".
- Chia sẻ D-12..D-17: hộp chia sẻ (Dialog từ `md`, Sheet dưới `md`) với ô link + "Sao chép link", QR + "Tải ảnh QR", Web Share chỉ khi hỗ trợ; nút "Chia sẻ" thế chỗ nút Xuất bản trong editor, tự mở sau khi xuất bản; chủ xem nháp thì ẩn nút Chia sẻ.
- Preview/noindex/403/404/nháp D-18..D-25: og:image = ảnh bìa người dùng tự thêm, ngược lại ảnh OG mặc định 1200×630; mô tả OG ~160 ký tự; **mọi** trang `/itineraries/[id]` `noindex`; 403 tự render (không `forbidden()`), không nút Đăng nhập; Bearer stale phải hồi phục phiên rồi tải lại; banner "Bản nháp – chỉ bạn thấy" + nút Sửa; menu thẻ "Xem trang công khai"; người không phải chủ mở editor của lịch trình đã xuất bản thì chuyển sang trang công khai.

**Claude's Discretion (đã chốt ở đây, xem các mục dưới):** cách lấy dữ liệu SSR, tách component bản đồ chỉ đọc, thư viện QR, biến môi trường gốc URL, hằng số tiền tố ảnh điểm đến, ảnh OG mặc định, ngưỡng chip ngày, toast sau xuất bản (để UI-SPEC chốt).

**Deferred (bỏ qua):** ảnh OG động (UX-02), index Google/sitemap, trang hồ sơ tác giả, nút chia sẻ từng mạng xã hội, ảnh bìa thật 34 điểm đến, hủy xuất bản. **Phase 5.1 (like/comment) nằm ngoài phạm vi.**

## Project Constraints (từ .kiro/steering và AGENTS.md)

- coding-rules: không token ở client; mọi lời gọi BE từ client đi qua BFF; không `dangerouslySetInnerHTML`; ESLint boundaries không sửa rule/allowlist; mutation xử lý lỗi BE bằng thông báo tiếng Việt; component dữ liệu đủ loading/empty/error; a11y (`aria-label`, bàn phím); chuỗi UI tiếng Việt.
- Biểu thức: tối đa 1 cấp `? :`/`&&`; không dùng `? :`/`&&` để ẩn/hiện component trong JSX, dùng prop `visible` hoặc early return. Bảng ánh xạ thay `if/switch` theo biến thể.
- SOLID: logic nghiệp vụ ở hàm thuần/hook; props hẹp (không truyền cả `itinerary` cho component chỉ cần vài trường, trừ container); component > ~150 dòng hoặc > 7 prop thì tách; UI không gọi trực tiếp `fetch`/`localStorage`/`window.location`/`navigator.*`, đi qua hook.
- Docs Next phải đối chiếu `apps/web/node_modules/next/dist/docs/` (Next 16.4.0 `[VERIFIED: pnpm-workspace.yaml catalog]`).
- Gate cuối mỗi plan: `pnpm lint`, `pnpm typecheck`, `pnpm test` từ gốc repo.

## Summary

Không cần endpoint BE mới: `GET /api/v1/itineraries/{id}` là `[AllowAnonymous]` và đã trả 404/403/200 đúng như D-21 cần `[CITED: 05-CONTEXT.md §Phụ thuộc BE, đã kiểm nhánh dev feb288e]`. Trang công khai là chỗ đầu tiên gọi BE từ RSC, nên rủi ro chính là **Bearer stale**: BE coi Bearer hết hạn là ẩn danh và trả 403 cho chủ xem bản nháp của chính mình `[CITED: 04-BE-DEPENDENCIES.md mục 7, 04-CONTEXT D-46]`. Giải pháp: server chỉ gắn Bearer khi `readSession().state === "fresh"`; gặp 403 mà phiên `stale` thì render `SessionRecovery` (đã có từ Phase 3) để client refresh rồi `router.refresh()`; phiên `none`/`invalid` thì 403 thật.

Phần lớn UI dùng lại được từ Phase 4 mà không phải sửa editor: `TripMap`, `LazyTripMap`, `useMapCamera`, `useMapSelection`, `DayOverviewRow`, `CoverImage`, `ResponsiveFormSurface`, `Sheet`. Phần gắn chặt với editor (`DayTabs` gọi `useAddDay` + store lưu, `OverviewPanel` có nút Thêm, `OverviewSummary` có nhấp-để-sửa, `WaypointList` dùng dnd-kit, `EditorLayout` giả định là toàn trang) phải có bản chỉ đọc riêng; chỉ `EditorMapArea` cần thêm hai prop tùy chọn (copy lỗi và hành động phụ) và `EditorLayout` cần xuất lại hai thân bố cục để dùng chung.

Hai phát hiện làm đổi kế hoạch so với kỳ vọng ban đầu:
1. **`(public)/layout.tsx` bọc AppShell có `main` giới hạn `max-w-content-lg`**, trong khi chế độ Bản đồ cần toàn màn hình (sheet mobile, hai vùng desktop). Cần tách `(public)` thành `(site)` (trang chủ, login, register, giữ AppShell) và `(viewer)` (trang `/itineraries/[id]`, layout riêng toàn màn hình).
2. **Bot Zalo không nằm trong danh sách "HTML-limited bots" mặc định của Next 16.4** `[VERIFIED: next/dist/shared/lib/router/utils/html-bots.js]`: với metadata streaming, thẻ `<meta og:*>` được nối vào `<body>` thay vì `<head>` cho bot lạ, nên preview Zalo có thể trống. `facebookexternalhit` (Messenger) có trong danh sách. Cần đặt `htmlLimitedBots` ghi đè (mở rộng danh sách mặc định) và kiểm bằng UAT thật.

**Primary recommendation:** RSC `page.tsx` + `generateMetadata` dùng chung một hàm `loadPublicItinerary` bọc `React.cache`, gọi BE bằng `callBackend` (đã khóa origin, timeout 28 s) với Bearer chỉ khi phiên `fresh`; trả union `ok | forbidden | not-found | recover | error`; truyền plain object sang một client container có chế độ lưu trên URL bằng `history.pushState` + `useSearchParams` (không gọi lại server khi đổi chế độ).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tải lịch trình công khai (cookie → Bearer → BE) | Frontend Server (RSC, `composition/*.server.ts`) | API/BE | Cần SSR cho OG và HTML; Bearer đọc từ cookie httpOnly, không rời server |
| Phân loại 200/403/404/lỗi, hồi phục phiên | Frontend Server (hàm thuần trong `composition/server/`) | Browser (`SessionRecovery`) | RSC không refresh được cookie; client refresh rồi `router.refresh()` |
| Metadata OG, `robots`, `metadataBase` | Frontend Server (`generateMetadata`) | CDN/Static (ảnh OG) | Crawler đọc HTML đầu |
| Bố cục bài viết theo ngày | Frontend Server (SSR) | Browser (chip ngày, IntersectionObserver) | PUB-01 cần HTML có nội dung khi chưa chạy JS |
| Chuyển Bài viết/Bản đồ | Browser (URL search param, `pushState`) | Frontend Server (đọc `?view` chỉ để SSR mặc định) | Không được gọi lại BE khi đổi chế độ |
| Bản đồ MapLibre chỉ đọc | Browser (`next/dynamic` `ssr:false`) | CDN (tile/glyph OpenFreeMap) | WebGL; không gửi dữ liệu lịch trình ra ngoài (D-115 Phase 4) |
| Sao chép link, Web Share, tải QR | Browser (hook bọc `navigator.*`) | — | Chỉ có ở trình duyệt; UI không gọi trực tiếp |
| Sinh QR | Browser (thư viện thuần JS, ma trận → SVG/Canvas) | — | Không gửi link cho dịch vụ ngoài (D-14) |
| Ảnh OG mặc định | CDN/Static (route tạo PNG lúc build) | — | URL tuyệt đối, 1200×630 |
| Hiện tác giả | BE (nhúng `author` vào DTO) | FE ACL (trường tùy chọn) | BE-05-01 không chặn; FE ẩn khi thiếu |
| Quyền hiển thị Sửa/Chia sẻ | Domain (`canEdit`) | UI | Chỉ ẩn/hiện; BE vẫn chặn ghi |

## Standard Stack

### Core (đã có, dùng lại)
| Library | Version | Purpose | Nguồn |
|---------|---------|---------|-------|
| next | 16.4.0 | RSC, `generateMetadata`, `notFound`, route group | `[VERIFIED: catalog]` |
| react | 19.3.0 | `cache`, Suspense | `[VERIFIED: catalog]` |
| maplibre-gl / react-map-gl | 6.16.0 / 8.1.3 | bản đồ (dùng lại `TripMap`) | `[VERIFIED: catalog]` |
| @base-ui/react | 1.8.0 | Dialog/Sheet/Tabs (qua `@tripory/ui-web`) | `[VERIFIED: catalog]` |
| zod | 4.6.7 | parse envelope BE phía server | `[VERIFIED: catalog]` |

### Mới
| Library | Version | Purpose | Vì sao |
|---------|---------|---------|--------|
| uqr | 0.1.3 (pin cứng trong `catalog:`) | sinh ma trận QR (`encode`) | unjs, MIT, zero dependency, ESM, cập nhật 2026-04-03; `encode()` trả `boolean[][]` để tự vẽ `<svg><rect>` và canvas PNG, **không cần HTML thô** `[VERIFIED: npm view uqr; unpkg index.d.mts]` |

### Alternatives Considered
| Thay vì | Có thể dùng | Đánh đổi |
|---------|-------------|----------|
| uqr | `qrcode` 1.5.4 | Có PNG sẵn nhưng kéo thêm phụ thuộc Node/canvas, lớn hơn; không cần |
| uqr | `qrcode-generator` 2.0.4 | Cũng zero-dep nhưng API cũ (class), cập nhật 2025-08 |
| uqr | tự viết (như FE cũ `src/lib/qr.ts`, ~400 dòng Reed-Solomon) | Đã có nhưng phải bảo trì và test mã hóa; uqr rẻ hơn |
| `renderSVG` của uqr | dựng `<svg>` bằng JSX từ `encode().data` | `renderSVG` trả chuỗi → cần `dangerouslySetInnerHTML` (cấm). Dùng `encode` + JSX |

**Cài đặt:** thêm `uqr: 0.1.3` vào `catalog:` ở `pnpm-workspace.yaml`, `"uqr": "catalog:"` vào `apps/web/package.json`, chạy `pnpm install`. Chỉ `apps/web` import (QR là việc của trình duyệt, không đặt vào `packages/*`).

## Architecture Patterns

### Luồng dữ liệu

```
Zalo/Messenger bot ──GET /itineraries/{id}──┐        Trình duyệt (khách/chủ)
                                             ▼                    │
                          proxy.ts (không gate /itineraries/{id}) │
                                             ▼                    ▼
        (public)/(viewer)/itineraries/[id]/page.tsx  ◄─ generateMetadata cùng gọi loadPublicItinerary
              │ await params → parseItineraryId ─ sai dạng ─► notFound()  (404 thật, chưa stream)
              ▼
     <Suspense> (loading.tsx)  →  PublicItineraryPage (async RSC)
              │ cookies() → readSession(now)  ── none/invalid/stale → không Bearer;  fresh → Bearer
              ▼
     callBackend GET /api/v1/itineraries/{id}   (origin khóa, timeout 28 s, no-store)
              │
     ┌────────┼──────────────┬───────────────┬───────────────┐
     200      404            403             khác/timeout
   parse Zod  notFound()   stale? ─ yes ─► <SessionRecovery> (client refresh → router.refresh)
   + toItinerary          └ no ─► PublicForbidden (200, noindex)         ErrorState "Thử lại"
     │
     ▼
 PublicItineraryView (client, props = plain object)
   ├─ ArticleView (SSR HTML: hero, tác giả, ngày, điểm, chip ngày)
   └─ MapView (lazy: TripMap + tab Tổng quan/ngày chỉ đọc + bottom sheet)
   ?view=map  ◄── history.pushState, không refetch
```

### Cấu trúc thư mục đề xuất

```
apps/web/src/
├── app/(public)/
│   ├── (site)/{layout.tsx, page.tsx, login/, register/}      # chuyển từ (public)/ (AppShell)
│   ├── (viewer)/layout.tsx                                    # toàn màn hình, không AppShell
│   ├── (viewer)/itineraries/[id]/{page,loading,error}.tsx
│   └── error.tsx, loading.tsx                                 # giữ ở (public)
├── app/og-default.png/route.tsx                               # ảnh OG mặc định (Pattern 6)
├── composition/
│   ├── itinerary.server.ts                                    # import "server-only", React.cache, cookies()
│   └── server/public-itinerary.ts                             # hàm thuần, test được (không server-only)
└── modules/itinerary/ui/
    ├── public-*.tsx / use-public-view.ts / share-*.tsx / qr-*.tsx / public-metadata.ts
```

### Pattern 1: `loadPublicItinerary` (hàm thuần + bọc `React.cache`)
**What:** `composition/server/public-itinerary.ts` nhận `deps: ServerDeps`, `id`, `session: SessionState`; gọi `callBackend`, parse envelope bằng Zod, dùng `itineraryDetailDto` + `toItinerary` (đã export ở `@tripory/itinerary/http`); trả
`{ kind: "ok", itinerary } | { kind: "forbidden" } | { kind: "not-found" } | { kind: "recover" } | { kind: "error" }`.
`composition/itinerary.server.ts` (`import "server-only"`) đọc `cookies()`, gọi `connection()` trước `Date.now()` (cùng mẫu `getSessionKind`), bọc `cache()`.
**Quy tắc:** 200 → ok; 404 → not-found; 403 và `session.state === "stale"` → recover; 403 khác → forbidden; mọi thứ còn lại (400 lạ, 5xx, timeout, network, body sai hình) → error. Không log Bearer/URL.
**Vì sao `callBackend` mà không `createFetchHttpClient`:** `callBackend` khóa origin vào `API_ORIGIN` + `/api/v1/`, `redirect: "manual"`, timeout 28 s, `cache: "no-store"` `[VERIFIED: composition/server/upstream.ts]`.
**Dedupe:** `React.cache` giữa `generateMetadata` và page trong một request; docs Next cho phép `[CITED: generate-metadata.md "React cache can be used"]`. Không dùng `"use cache"` (dữ liệu theo người xem, PITFALLS P5).

### Pattern 2: Metadata là hàm thuần
`modules/itinerary/ui/public-metadata.ts` (hoặc `composition/`): `buildPublicMetadata(result, siteUrl)` trả `Metadata`. Mọi nhánh có `robots: { index: false, follow: false }` (D-20). 403/404/recover/error: tiêu đề trung tính "Lịch trình · Tripory", không `openGraph` riêng (không lộ tiêu đề nháp). Nhánh ok: `title` (template `%s · Tripory` của root), `description` (D-19), `openGraph { type: "website", url, siteName, images: [{ url, width, height }] }` `[ASSUMED: type website]`, `twitter: { card: "summary_large_image" }`. `metadataBase: new URL(siteUrl)` để URL tương đối thành tuyệt đối `[CITED: generate-metadata.md metadataBase]`.
**Chọn ảnh OG (D-18):** ảnh bìa hiển thị hợp lệ (`https://`) và **không** bắt đầu bằng gốc ảnh điểm đến (`DESTINATION_IMAGE_BASE_URL`, hiện `https://triporyv1.vercel.app/destinations`, cần `export` từ `composition/destination-catalog.ts`) thì dùng; ngược lại ảnh mặc định.
**Cảnh báo cache metadata:** docs Cache Components: `generateMetadata` đọc runtime data (`params`, `cookies`) thì chạy lúc request; vì page đã tự động (đọc cookie trong Suspense) nên không cần `DynamicMarker` `[CITED: generate-metadata.md "With Cache Components"]`. Nếu build báo "blocking-prerender-metadata-runtime" thì thêm marker `<Suspense><Connection/></Suspense>` đúng mẫu docs.

### Pattern 3: Chế độ Bài viết/Bản đồ không gọi lại server
`use-public-view.ts` (client hook): `useSearchParams()` đọc `view`, `setView` dùng `window.history.pushState(null, "", url)`; Next tích hợp pushState/replaceState với `useSearchParams` `[CITED: 04-linking-and-navigating.md "Native History API"]`. Nút back của trình duyệt quay lại chế độ trước vì mỗi lần chuyển đẩy một mục. Bọc component dùng `useSearchParams` trong `<Suspense>` với fallback là bài viết (để HTML đầu vẫn có nội dung) `[CITED: use-search-params.md "Prerendering"]`. Không dùng `router.push` cho đổi chế độ (sẽ refetch RSC và BE).
Hai khung (bài viết, bản đồ) là hai component có prop `visible` (không `? :`): bài viết luôn được dựng và chỉ ẩn bằng `hidden` khi ở chế độ Bản đồ (giữ vị trí cuộn khi quay lại), bản đồ chỉ dựng lần đầu khi `visible` (tránh nạp WebGL cho người chỉ đọc bài).

### Pattern 4: Tách bản đồ chỉ đọc (không kéo code editor)
- **Dùng lại nguyên:** `map/trip-map.tsx`, `map/trip-map.lazy.tsx`, `use-map-camera.ts`, `use-map-selection.ts`, `editor-map-pins.ts`, `editor-map-viewport.ts`, `day-overview-row.tsx`, `cover-image.tsx`, `responsive-form-surface.tsx`, `use-media-query.ts`, domain `buildMapPins/buildDayRoutes/fitTargetFor/summarizeDays/buildDayRange`.
- **Sửa nhỏ, tương thích ngược (OCP):** `editor-map-area.tsx` thêm hai prop tùy chọn `errorHint?: string` (mặc định "Bạn vẫn sửa lịch trình như bình thường.") và để `fallback` (children dưới cảnh báo) mang nút "Xem dạng bài viết"; `editor-layout.tsx` xuất `WideBody`, `NarrowBody`, hook đo chiều cao header (di chuyển nguyên, không đổi hành vi) để `PublicStageLayout` ghép lại.
- **Viết mới (chỉ đọc):** `PublicDayTabs` (dùng `useTabStrip`, `Tabs`, `MapToneDot`; không `useAddDay`), `PublicOverviewPanel` (đầu Tổng quan + `DayOverviewRow`), `PublicDayPanel` + danh sách điểm chọn được (không dnd-kit; `itinerary-invariants` cấm `@dnd-kit` ngoài `modules/itinerary/ui`, vẫn hợp lệ nhưng không cần).
- `DayTabs` hiện export `EdgeFade`/`TabKmLine` là hàm nội bộ; nếu muốn dùng chung thì tách ra file nhỏ rồi cho `day-tabs.tsx` import lại (thay đổi thuần di chuyển) hoặc chấp nhận bản chép ngắn trong `PublicDayTabs`. Planner chọn phương án ít rủi ro cho test hiện có.

### Pattern 5: Chia sẻ qua hook, không gọi `navigator.*` từ component
`use-share-url.ts` (ghép `${origin}/itineraries/${id}`; trên client lấy `window.location.origin` qua `useSyncExternalStore`, đúng cả khi chạy ở LAN/dev và production, **không cần env ở client**), `use-copy-link.ts` (`navigator.clipboard.writeText`, trả `copied | failed | idle`), `use-native-share.ts` (`supported = typeof navigator.share === "function"`, bỏ qua `AbortError`). `ShareDialog` dựng trên `ResponsiveFormSurface` (Dialog từ `md`, Sheet modal dưới `md`) với `locked={false}`.
QR: `qr-matrix.ts` (thuần: `encode(url, { ecc: "M", border: 2 })` → `boolean[][]`), `QrCode` vẽ `<svg viewBox>` bằng `<rect>`/`<path>` JSX, `use-qr-download.ts` vẽ cùng ma trận lên `<canvas>` rồi `canvas.toBlob` → `<a download>`. Tên file: tiêu đề chuẩn hóa (bỏ dấu, `-`) hoặc id (D-14).

### Pattern 6: Ảnh OG mặc định (URL tuyệt đối, 1200×630)
Tạo PNG bằng `next/og` `ImageResponse` trong route handler `app/og-default.png/route.tsx` (GET, nội dung chữ "Tripory" bằng token màu; **chỉ ASCII** vì font mặc định của satori không đảm bảo glyph tiếng Việt) `[CITED: image-response.md "Route Handlers"; ASSUMED: tên thư mục có đuôi .png hoạt động và route được tiền kết xuất tĩnh dưới cacheComponents → xác nhận bằng next build]`. Phương án thay thế nếu không ổn: executor sinh PNG tĩnh một lần và commit vào `apps/web/public/og-default.png` (file có đuôi nên `proxy.ts` matcher đã bỏ qua `[VERIFIED: proxy.ts matcher]`). **Không** dùng file `opengraph-image.*` trong cùng segment với trang vì file-based metadata ghi đè `generateMetadata` `[CITED: generate-metadata.md "File-based metadata has the higher priority"]`.

### Anti-Patterns to Avoid
- **Gửi Bearer stale/expired từ RSC** → chủ nhận 403 với bản nháp của mình. Chỉ gắn khi `fresh`.
- **`router.push` cho `?view`** → refetch BE mỗi lần chuyển.
- **Truyền `Itinerary` frozen có method/Date sang client:** domain trả plain object, chuỗi và số, an toàn serialize `[CITED: architecture §9 "Truyền function từ Server sang Client Component"]`; không đặt hàm vào props.
- **Dùng `forbidden()`** (experimental trong 16.4, D-21).
- **Dùng `"use cache"` cho loader** (dữ liệu theo người xem, P5).
- **Query key chung giữa RSC và client** (P13): trang công khai không dùng React Query, truyền props.
- **`renderSVG` của uqr + `dangerouslySetInnerHTML`.**

## Don't Hand-Roll

| Vấn đề | Đừng tự viết | Dùng | Vì sao |
|--------|--------------|------|--------|
| Mã hóa QR (Reed-Solomon, mask) | thuật toán riêng | `uqr` `encode` | Lỗi mã hóa làm QR không quét được, khó test |
| Gọi BE từ server an toàn | `fetch` thô | `callBackend` | Đã khóa origin, redirect manual, timeout |
| Hồi phục phiên khi stale | refresh ở server | `SessionRecovery` + `refreshSession` | BE xoay refresh token, chỉ một đường refresh (Pitfall 3) |
| Dialog/Sheet responsive | modal mới | `ResponsiveFormSurface` | Đã xử lý focus, scrim, Esc, safe-area |
| Màu theo ngày, pin, đường, khung canh | tính lại | `@tripory/itinerary` map-view + `TripMap` | Đã UAT 14/14 ở Phase 4 |
| Parse GUID id | regex | `parseItineraryId` (`@tripory/shared-kernel`) | Cùng quy tắc editor |
| Định dạng ngày/km | `Intl`/`Date` mới | `format.ts`, `formatCalendarDateVi` | Tránh lệch UTC (P11) |

## Common Pitfalls

### Pitfall 1: 403 giả cho chủ lịch trình (Bearer stale)
**Gì sai:** access token hết hạn, BE coi là ẩn danh, trả 403 cho chủ xem nháp.
**Tránh:** `fresh` mới gắn Bearer; 403 + `stale` → `SessionRecovery`; nhớ `SessionRecovery` gọi `emitExpired` nếu refresh thật sự hết hạn (chuyển /login, D-20 Phase 3), chấp nhận cho chủ có cookie nhưng hết hạn hẳn.
**Dấu hiệu:** test "stale + 403 → recover" đỏ.

### Pitfall 2: Mã trạng thái HTTP khi đã stream
`loading.tsx` làm phản hồi bắt đầu bằng 200; `notFound()` sau điểm suspend vẫn trả 200 kèm `<meta name="robots" content="noindex">`. Chỉ `notFound()` trước khi stream giữ 404 `[CITED: loading.md "Status codes"]`. Hệ quả: id sai dạng GUID (kiểm trước mọi `await` dữ liệu) trả **404 thật**; id đúng dạng nhưng BE 404, và trang 403 tự render, sẽ là 200 + `noindex`. Chấp nhận (D-20 đã đặt noindex mọi trạng thái). Ghi vào UAT để người dùng biết.

### Pitfall 3: Bot Zalo không nhận metadata streaming
Danh sách HTML-limited mặc định có `facebookexternalhit`, `Twitterbot`, `Slackbot`, `Discordbot`, `WhatsApp`… nhưng **không có Zalo** `[VERIFIED: html-bots.js]`. Cấu hình `htmlLimitedBots` **thay** danh sách mặc định, không cộng thêm `[CITED: htmlLimitedBots.md]`, nên phải chép regex mặc định rồi thêm `|Zalo|Facebot|meta-externalagent`. Đặt `htmlLimitedBots: /.*/` (tắt hẳn streaming metadata) bị loại vì khi BE cold start tới 30 s người xem thật không thấy skeleton. UAT dán link thật vào Zalo là cách kiểm duy nhất `[ASSUMED: UA thật của Zalo chứa "zalo"]`.

### Pitfall 4: Layout AppShell hẹp
`AppShell` đặt `main` `max-w-content-lg`, nên chế độ Bản đồ không toàn màn được. Tách route group (xem Summary). Việc `git mv` phải kéo theo test cạnh file (`login/page.test.tsx`, `register/page.test.tsx`, `page.test.tsx`, `layout`, `route-layouts.test.tsx` import `./(public)/layout`).

### Pitfall 5: Test bất biến Phase 4 cấm chữ "Chia sẻ"
`itinerary-invariants.test.ts` có `has no "Tải thêm" or "Chia sẻ" text in modules/itinerary/ui` (khóa D-40 chuyển cho Phase 5). Phase 5 phải **thu hẹp** test này (chỉ còn "Tải thêm"), cập nhật chú thích và thêm khẳng định mới tương ứng; không được để Phase 5 xanh bằng cách tránh chữ "Chia sẻ". Cũng cập nhật comment đầu `publish-dialog.tsx` ("Không có hộp hay nút chia sẻ").

### Pitfall 6: Hai dialog nối tiếp sau xuất bản
`PublishDialog` đóng bằng `onOpenChange(false)` ngay sau thành công; mở `ShareDialog` cùng nhịp có thể tranh focus trap của Base UI. Mở hộp chia sẻ sau `onOpenChangeComplete(false)` của hộp xuất bản (hoặc `queueMicrotask`/state trung gian) và bỏ effect `focusMenuAfterPublish` đang trả focus về nút "i" khi hộp chia sẻ sắp mở. Nút "Chia sẻ" chỉ xuất hiện sau khi dữ liệu tải lại (`isPublic` thành `true`).

### Pitfall 7: `useSearchParams` ngoài Suspense (Cache Components)
Production build lỗi nếu thiếu Suspense `[CITED: use-search-params.md]`; dev không báo. Luôn kiểm bằng `next build` ở plan cuối.

### Pitfall 8: Ngày thưa, ngày trống, km bằng 0
`buildDayRange` trả đủ Ngày 1..max; `formatKm` ẩn khi 0/`null`; `totalDistanceKm` 0 thì ẩn ở hero (D-01). Dùng đúng hàm có sẵn.

### Pitfall 9: Avatar mặc định của BE
`author.avatarUrl` bằng `https://api.dicebear.com/7.x/identicon/svg?seed=tripory` phải thành `null` để hiện chữ cái đầu `[CITED: 03-04 trong STATE.md; hằng DEFAULT_AVATAR_URL ở packages/identity]`. `packages/itinerary` không import được `identity` (context không import lẫn nhau), nên khai báo hằng riêng trong mapper và test. Không nhận/hiện email.

### Pitfall 10: Ảnh bìa của người dùng làm `og:image`
Chỉ dùng URL `https://`; ảnh hết hạn/404 không ảnh hưởng trang. Không gửi thông tin nào khác cho máy chủ ảnh (đã `referrerPolicy="no-referrer"` ở `CoverImage`, invariant T-04-63 áp cho mọi `<img` mới).

## Code Examples

### Phân loại kết quả BE (hàm thuần, `composition/server/public-itinerary.ts`)
```typescript
// Mẫu: cùng hình dạng với composition/server/auth-handlers.ts (zod envelope + callBackend)
const envelope = z.object({ status: z.literal("success"), data: itineraryDetailDto });

export type PublicItineraryResult =
  | Readonly<{ kind: "ok"; itinerary: Itinerary }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "recover" }>
  | Readonly<{ kind: "error" }>;

export async function loadPublicItinerary(deps: ServerDeps, id: ItineraryId, session: SessionState): Promise<PublicItineraryResult> {
  const headers = session.state === "fresh" ? { authorization: `Bearer ${session.accessToken}` } : undefined;
  const upstream = await callBackend(deps, `/api/v1/itineraries/${id}`, { method: "GET", headers });
  if (upstream.kind !== "response") return { kind: "error" };
  if (upstream.status === 404) return { kind: "not-found" };
  if (upstream.status === 403) return session.state === "stale" ? { kind: "recover" } : { kind: "forbidden" };
  if (upstream.status !== 200) return { kind: "error" };
  // parse + toItinerary trong try/catch → error khi body sai hình
}
```

### Pushstate cho `?view`
```typescript
// Source: 01-app/01-getting-started/04-linking-and-navigating.md "Native History API"
const params = new URLSearchParams(searchParams.toString());
params.set("view", "map");
window.history.pushState(null, "", `?${params.toString()}`);
```

### Chip ngày đang đọc (IntersectionObserver)
Mẫu giả lập sẵn ở `apps/web/src/test/fake-intersection-observer.ts`; `scrollIntoView` phải gọi tùy chọn (`element.scrollIntoView?.(…)`) vì jsdom không có, như `day-overview-row.tsx`. `behavior` lấy từ `prefersReducedMotion()` ở `map/map-camera.ts`.

## State of the Art

| Cách cũ | Cách hiện tại | Ảnh hưởng |
|---------|---------------|-----------|
| `forbidden()` cho 403 | vẫn experimental ở 16.4 | tự render trang 403 (D-21) |
| `middleware.ts` | `proxy.ts` | Đã đúng ở repo |
| `searchParams` đồng bộ | Promise (v15+) | Page async; client dùng `useSearchParams` |
| metadata blocking | streaming metadata mặc định (bot lạ nhận ở `<body>`) | cần `htmlLimitedBots` cho Zalo |

## Assumptions Log

| # | Claim | Mục | Rủi ro nếu sai |
|---|-------|-----|----------------|
| A1 | UA của bot link preview Zalo chứa chuỗi "zalo" (không phân biệt hoa thường) | Pitfall 3, `next.config` | Preview Zalo vẫn trống; sửa regex sau UAT |
| A2 | Meta dùng UA `meta-externalagent`/`Facebot` song song `facebookexternalhit` | Pitfall 3 | Chỉ thừa regex, không hại |
| A3 | Route handler ở thư mục `og-default.png` hoạt động và được tiền kết xuất dưới `cacheComponents` | Pattern 6 | Build lỗi hoặc ảnh sinh mỗi request; fallback PNG tĩnh trong `public/` |
| A4 | `og:type` = `website` cho trang lịch trình | Pattern 2 | Preview không đổi; `article` cũng chấp nhận được |
| A5 | Hồi phục phiên bằng `SessionRecovery` hiển thị đủ mượt trên trang công khai (skeleton rồi reload) | Pitfall 1 | Có thể nháy; UI-SPEC chọn skeleton |
| A6 | Nhà cung cấp Zalo/Messenger lấy ảnh OG từ URL không có đuôi ảnh nếu `content-type` đúng | Pattern 6 | Dùng đuôi `.png` để tránh rủi ro |

## Open Questions (RESOLVED)

Đánh dấu đã giải quyết khi lập kế hoạch Phase 5 (2026-11-11); nội dung gốc giữ nguyên, chỉ thêm kết luận.

1. **Toast "Đã xuất bản lịch trình" khi hộp chia sẻ tự mở (D-15, để UI-SPEC chốt).** Khuyến nghị: bỏ toast (hộp mở là phản hồi), giữ `aria-live` trong hộp. Planner đặt công tắc ở một chỗ (`PublishDialog` meta feedback) để đổi dễ. **RESOLVED:** người dùng chốt U-04 trong `05-UI-SPEC.md`: GIỮ toast nhưng chỉ phát SAU khi hộp chia sẻ tự mở đóng xong; công tắc là prop `successToast` của `PublishDialog` (plan 05-17).
2. **Bố cục header công khai.** D-12 nói "thanh trên cùng của vùng nội dung" (desktop) và "header" (mobile); khuyến nghị một `PublicHeader` dùng chung (thương hiệu, tiêu đề rút gọn, nhóm chuyển chế độ từ `lg`, Chia sẻ, Sửa, tài khoản) thay cho `AppHeader`. UI-SPEC chốt. **RESOLVED:** U-02 trong `05-UI-SPEC.md`: một hàng 64px `PublicHeader` (logo, viên thuốc từ `lg`, Sửa, Chia sẻ, tài khoản), không `AppHeader` (plan 05-12).
3. **Hành vi khi `SessionRecovery` kết luận hết phiên thật** trên trang công khai: hiện tại chuyển /login (D-20 Phase 3). Chấp nhận cho chủ có cookie hết hạn; khách không bị ảnh hưởng. **RESOLVED:** chấp nhận hành vi hiện tại của `SessionRecovery` (plan 05-18 dùng nguyên component; kịch bản D4 trong `05-UAT-CHECKLIST.md`).
4. **BE chưa deploy mục 6-11 của 04-BE-CONTRACT:** ảnh bìa nhiều ảnh và `destinationCode` có thể thiếu; FE đã chịu `nullish`. Ghi vào `05-BE-DEPENDENCIES.md`, không chặn. **RESOLVED:** ghi ở `05-BE-DEPENDENCIES.md` (plan 05-03) và mục J của `05-UAT-CHECKLIST.md` (plan 05-19).

## Environment Availability

| Dependency | Cần cho | Có | Ghi chú |
|------------|---------|----|---------|
| Node 24 / pnpm 10 | build/test | ✓ | theo repo |
| npm registry (uqr 0.1.3) | QR | ✓ | `[VERIFIED: npm view uqr]` |
| BE có `GET /itineraries/{id}` anonymous | trang công khai | ✓ | đã kiểm nhánh `dev` (CONTEXT) |
| BE nhúng `author` | khối tác giả | ✗ | không chặn: FE ẩn khối (D-02) |
| OpenFreeMap tile/glyph | bản đồ | ✓ (đã dùng ở Phase 4) | |
| Thiết bị thật + Zalo/Messenger | UAT preview | người dùng | không tự động hóa được |

## Test Strategy (nyquist_validation = false trong config, nên **không** tạo `05-VALIDATION.md`)

| Thành phần | Loại | Cách |
|------------|------|------|
| `loadPublicItinerary` | unit, `// @vitest-environment node` | fake `deps.fetch` + `SessionState` cho 6 tình huống (200 khách, 200 chủ fresh, 403 khách, 403 stale → recover, 404, 5xx/timeout/body hỏng); khẳng định Bearer chỉ gắn khi fresh |
| `buildPublicMetadata`, mô tả OG, chọn ảnh OG | unit thuần | bảng ca: ảnh người dùng / ảnh điểm đến / không ảnh; mô tả rỗng; cắt 160; mọi nhánh `noindex` |
| `author` ACL | unit (`packages/itinerary`) | thiếu, `null`, dicebear → `null`, không có email trong kết quả |
| `usePublicView`, ViewToggle | jsdom | `pushState` được gọi, back khôi phục, giá trị lạ → bài viết |
| Bài viết, chip ngày | jsdom + `fake-intersection-observer` | ngày trống, ngày thưa, km 0 ẩn, ghi chú không HTML, link Maps `rel` + `aria-label` |
| Map mode | jsdom + `fake-react-map-gl` | chọn pin ↔ dòng, tab Tổng quan, nút "Xem dạng bài viết" khi lỗi |
| Share | jsdom, mock `navigator.clipboard/share`, `URL.createObjectURL` | copy ok/lỗi, Web Share ẩn khi không hỗ trợ, `AbortError` im lặng, QR có `<svg>` |
| Tĩnh | `itinerary-invariants` mở rộng | không `dangerouslySetInnerHTML`; `<img` có `referrerPolicy`; mọi biến thể metadata có `noindex`; `page.tsx` công khai không import `/http` trực tiếp (chỉ composition) |
| Route | `route-layouts.test.tsx`, `proxy-coverage.test.ts` | cập nhật đường dẫn; `/itineraries/x` vẫn không bị gate |
| Cổng cuối | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | `next build` bắt lỗi Suspense/metadata của Cache Components |

## Security Domain (ASVS L1)

| Hạng mục | Áp dụng | Kiểm soát |
|----------|---------|-----------|
| V4 Access Control | có | BE là nguồn quyết định 200/403/404; FE `canEdit` chỉ ẩn/hiện; nháp của người khác không lộ tiêu đề trong metadata/OG (D-20) |
| V3 Session | có | Bearer chỉ từ cookie httpOnly trên server, không đưa vào props/HTML; không log |
| V5 Input | có | `parseItineraryId`; Zod parse mọi body BE; ghi chú render text node (`pre-line`), không HTML |
| V13 API | có | chỉ GET, `callBackend` khóa origin |
| V14 Config | có | `PUBLIC_SITE_URL` server-only, không `NEXT_PUBLIC_*` cho secret |

| Mối đe dọa | STRIDE | Giảm thiểu |
|------------|--------|-----------|
| XSS qua tên điểm/ghi chú/mô tả/tác giả | Tampering | text node React, không `dangerouslySetInnerHTML`; QR vẽ bằng JSX |
| Lộ nháp qua OG/metadata/`noindex` thiếu | Information disclosure | metadata trung tính khi không phải ok; `noindex` mọi nhánh; test tĩnh |
| Mở link ngoài `target=_blank` | Tampering | `rel="noopener noreferrer"` (D-03) |
| Bearer stale làm lộ trạng thái | Spoofing/Repudiation | không gắn stale; recover rồi tải lại |
| Rò referrer qua ảnh bìa người dùng | Information disclosure | `referrerPolicy="no-referrer"` |
| SSRF/open-proxy | Elevation | `callBackend` khóa origin + `/api/v1/` |
| Link chia sẻ chứa dữ liệu nhạy cảm | Information disclosure | URL chỉ chứa id; không kèm `?view` (D-13) |

## Sources

### Primary (HIGH)
- `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` (metadataBase, robots, streaming, Cache Components, ghi đè file-based)
- `…/04-functions/not-found.md`, `…/03-file-conventions/loading.md` ("Status codes"), `…/03-file-conventions/not-found.md`
- `…/03-file-conventions/dynamic-routes.md` (params là runtime data), `…/04-functions/use-search-params.md`, `…/01-getting-started/04-linking-and-navigating.md` (Native History API)
- `…/05-config/01-next-config-js/htmlLimitedBots.md`, `next/dist/shared/lib/router/utils/html-bots.js`
- `…/04-functions/image-response.md`
- Code: `composition/server/{upstream,session-store,env,bff}.ts`, `composition/viewer.server.ts`, `modules/itinerary/ui/{itinerary-editor,editor-layout,editor-map-area,day-tabs,overview-*,publish-*,itinerary-card}.tsx`, `packages/itinerary/src/{domain,infrastructure}`
- npm registry: `uqr` 0.1.3 (MIT, unjs, 2026-04-03), `qrcode` 1.5.4, `qrcode-generator` 2.0.4

### Secondary (MEDIUM)
- `05-CONTEXT.md` §Phụ thuộc BE (đã kiểm BE nhánh dev); `04-BE-DEPENDENCIES.md` mục 7

### Tertiary (LOW)
- UA thực tế của Zalo/Meta (A1, A2): chưa kiểm

## Metadata

**Confidence:** Standard stack HIGH; kiến trúc HIGH; pitfalls HIGH; crawler Zalo MEDIUM.
**Research date:** 2026-11-09. **Valid until:** 2026-12-09 (Next 16.4 pin cứng).
