# Phase 5: Map & Public View - Context

**Gathered:** 2026-11-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase này giao, bằng API BE thật:

1. Trang công khai SSR `/itineraries/[id]` (route group `(public)`, không bị gate) cho khách chưa đăng nhập đọc lịch trình đã xuất bản, bố cục bài viết theo ngày (PUB-01).
2. Nút chuyển chế độ Bài viết/Bản đồ, chế độ Bản đồ dùng lại component bản đồ MapLibre + OpenFreeMap của Phase 4 ở dạng chỉ đọc (PUB-02, dùng lại PUB-06).
3. Nháp của người khác trả trang 403, id sai trả 404; chủ xem nháp thấy banner "Bản nháp – chỉ bạn thấy" và nút Sửa (PUB-03).
4. Chia sẻ bằng copy link, Web Share (khi trình duyệt hỗ trợ) và mã QR; trong editor: nút "Chia sẻ" và hộp chia sẻ tự mở sau khi xuất bản (PUB-04, phần còn lại của ITIN-11 theo 04-CONTEXT D-40).
5. Metadata Open Graph (tiêu đề, mô tả, ảnh) để link hiện preview trong Zalo/Messenger; `noindex` (PUB-05).
6. Hai thay đổi điều hướng hoãn từ Phase 4: menu thẻ đã xuất bản có "Xem trang công khai" (04 D-07), người không phải chủ mở editor của lịch trình đã xuất bản được chuyển sang trang công khai (04 D-45).

Nằm ngoài phase: ảnh OG động vẽ đường đi (UX-02, v2); bấm bản đồ chọn vị trí (MAP-02, v2); like/comment/fork; trang hồ sơ tác giả; nút chia sẻ riêng cho từng mạng xã hội (Facebook/Zalo/X).

</domain>

<decisions>
## Implementation Decisions

### Bố cục bài viết (PUB-01)
- **D-01 (đầu trang):** ảnh bìa lớn rộng hết khung nội dung (ảnh đang hiển thị `coverImageUrl`; không có hoặc lỗi tải thì nền dự phòng theo token như editor), dưới là tiêu đề, mô tả, ngày khởi hành (nếu có), số ngày, tổng số điểm, tổng km (`totalDistanceKm` của BE, ẩn khi bằng 0). Không hiện điểm đến, sở thích, ngày kết thúc (giữ 04 D-74, D-76).
- **D-02 (tác giả):** hướng đã chọn là BE nhúng `author { id, displayName, avatarUrl }` vào `ItineraryDetailDto` của `GET /api/v1/itineraries/{id}` (không dùng `GET /users/{id}` riêng). Phase 5 **không chờ BE**: DTO có `author` thì hiện avatar + tên người tạo ở đầu trang (dưới tiêu đề); DTO chưa có `author` thì ẩn khối tác giả. Chủ xem (viewer.id === userId) thì luôn có dòng "Lịch trình của bạn" (thay khối tác giả hoặc bên cạnh, UI-SPEC chốt). ACL parse `author` là trường tùy chọn, không làm vỡ parse khi thiếu; avatar mặc định chung của BE (dicebear seed=tripory) chuyển thành `null` để hiện chữ cái đầu, giống quy tắc Phase 3 (03-04). Không nhận và không hiện email. Hợp đồng đề xuất ở mục Phụ thuộc BE.
- **D-03 (mỗi điểm):** số thứ tự trong ngày trên chấm màu của ngày (cùng bảng màu ngày của bản đồ, 04 D-123), tên, địa chỉ (nếu có), ghi chú (nếu có; giữ xuống dòng bằng CSS `white-space: pre-line`, render chữ thường, **không** HTML, không `dangerouslySetInnerHTML`), link "Mở trong Google Maps" mở tab mới: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`, `rel="noopener noreferrer"`, `aria-label` có tên điểm.
- **D-04 (mỗi ngày):** một mục "Ngày N · phụ đề" (không có phụ đề thì chỉ "Ngày N"), dòng phụ "X điểm · Y km" (`dayDistanceKm` của BE). Vẽ đủ dải Ngày 1..ngày lớn nhất như editor (ngày thưa, 04 D-28).
- **D-05 (ngày trống):** ngày không có điểm **vẫn hiện** "Ngày N" kèm "Chưa có điểm".
- **D-06 (thanh nhảy nhanh):** dải chip ngày dính dưới header, cuộn ngang trên mobile; bấm chip thì cuộn tới mục ngày đó (tôn trọng `prefers-reduced-motion`: nhảy thẳng); chip của ngày đang đọc được tô (theo vị trí cuộn). Chip là link/nút dùng được bằng bàn phím, có trạng thái hiện tại cho trình đọc màn hình (`aria-current`).

### Chuyển Bài viết/Bản đồ (PUB-02)
- **D-07:** làm đủ cả hai chế độ; mở link thì **mặc định Bài viết**, người xem tự chuyển.
- **D-08:** chế độ lưu trên URL: `?view=map` là Bản đồ, không có hoặc giá trị lạ là Bài viết. Chuyển chế độ đẩy một mục lịch sử để nút back của trình duyệt quay lại chế độ trước. Gửi link có `?view=map` thì mở sẵn bản đồ.
- **D-09 (vị trí nút):** mobile: nút viên thuốc nổi ở đáy giữa màn hình (như `ModeTogglePill` của FE cũ), luôn thấy ở cả hai chế độ, không bị bottom sheet che; desktop (từ `lg`): nút chuyển đặt ở thanh trên cùng của vùng nội dung. Là nhóm chọn một (2 lựa chọn "Bài viết" | "Bản đồ"), dùng được bằng bàn phím, có tên truy cập.
- **D-10 (chế độ Bản đồ):** giống bố cục editor nhưng **chỉ đọc**: desktop hai vùng (cột trái danh sách ngày/điểm, bản đồ bên phải); mobile bản đồ toàn màn phía sau bottom sheet không modal 3 mức (mở ở mức giữa, 04 D-15). Có tab "Tổng quan" và tab từng ngày như editor (04 D-131..D-136): Tổng quan hiện mọi ngày, mỗi dòng ngày bấm được để sang tab ngày; tab ngày làm đậm ngày đang chọn, mờ ngày khác; bấm pin thì hiện tên điểm cạnh pin, làm nổi và cuộn tới dòng điểm (mobile đưa sheet lên mức giữa); bấm dòng điểm thì bản đồ di chuyển tới pin. Tự canh khung theo tab (04 D-127). **Không** có nút thêm/sửa/xóa/kéo thả, không ô phụ đề, không nút "Sửa thông tin". Tab mặc định khi vào chế độ Bản đồ: Tổng quan (lịch trình công khai luôn có ít nhất 1 điểm lúc xuất bản; nếu không còn điểm nào thì căn theo điểm đến như 04 D-121).
- **D-11 (bản đồ lỗi):** không WebGL hoặc OpenFreeMap lỗi thì hiện "Không tải được bản đồ" kèm "Thử lại" và nút "Xem dạng bài viết" (chuyển về `?view` Bài viết). Ghi công bản đồ giữ như editor (nút "i", 04 D-114). Hoàng Sa/Trường Sa theo style riêng đã có (04 D-113).

### Chia sẻ (PUB-04, phần còn lại của ITIN-11)
- **D-12 (nút Chia sẻ trên trang công khai):** desktop ở thanh trên cùng của nội dung, cạnh nút chuyển chế độ; mobile là nút biểu tượng trên header (`aria-label` "Chia sẻ lịch trình"), để đáy màn hình chỉ có viên thuốc chuyển chế độ.
- **D-13 (hộp chia sẻ):** bấm Chia sẻ **luôn mở hộp chia sẻ** (Dialog từ `md`, Sheet modal dưới `md`, như `ResponsiveFormSurface`), gồm: ô link chỉ đọc (URL tuyệt đối của trang công khai, không kèm `?view`) + nút "Sao chép link" (thành công: toast/nhãn "Đã sao chép link"; clipboard lỗi: chọn sẵn chữ trong ô và báo "Không sao chép được, hãy chép thủ công"); mã QR; nút "Chia sẻ qua ứng dụng" gọi Web Share (`navigator.share` với title + url), **chỉ hiện khi trình duyệt hỗ trợ** (prop `visible`); người dùng hủy bảng chia sẻ (`AbortError`) thì im lặng.
- **D-14 (QR):** hiện QR của link kèm nút "Tải ảnh QR" (PNG, tên file theo tiêu đề đã chuẩn hóa hoặc id). QR sinh tại client, không gửi link cho dịch vụ ngoài.
- **D-15 (editor):** lịch trình đã xuất bản thì nút **"Chia sẻ" thế đúng chỗ nút Xuất bản** trên header editor (icon dưới `md`, nút có chữ từ `md`, như nút Xuất bản hiện tại). Xuất bản thành công thì hộp chia sẻ **tự mở** (giữ toast "Đã xuất bản lịch trình" hay bỏ do UI-SPEC chốt, không hiện hai thông báo chồng nhau gây rối).
- **D-16:** hộp chia sẻ mở từ editor có thêm link "Mở trang công khai" (tab mới). Hộp ở trang công khai không cần link này.
- **D-17:** chủ xem **bản nháp** ở trang công khai thì **ẩn nút Chia sẻ** (người khác mở sẽ gặp 403).

### Preview link, noindex, trang lỗi, nháp (PUB-03, PUB-05)
- **D-18 (ảnh OG):** lịch trình có ảnh bìa do người dùng tự thêm thì dùng ảnh đó làm `og:image`; ảnh bìa vẫn là ảnh mặc định theo điểm đến (URL `{CoverImageBaseUrl}{slug}.jpg`, hiện là ảnh giữ chỗ có thể 404, 04 D-106) hoặc không có ảnh thì dùng **một ảnh OG mặc định của Tripory** 1200×630, file tĩnh trong app, URL tuyệt đối. Cách nhận biết "ảnh mặc định theo điểm đến": so tiền tố URL với gốc ảnh điểm đến đã biết ở FE (Claude's Discretion về hằng số). Ảnh OG động vẫn v2 (UX-02).
- **D-19 (mô tả OG):** dùng mô tả lịch trình, chuẩn hóa khoảng trắng, cắt khoảng 160 ký tự kèm "…"; mô tả trống thì "Lịch trình N ngày · X điểm trên Tripory". Tiêu đề OG là tiêu đề lịch trình. Có `og:url`, `og:type`, `twitter:card` `summary_large_image`.
- **D-20 (noindex):** **mọi** trang công khai `/itineraries/[id]` đặt `noindex` (kể cả đã xuất bản) trong đợt thử với bạn bè, vì chỉ ai có link mới xem. Trang 403/404 cũng `noindex` với metadata trung tính (không lộ tiêu đề nháp). OG vẫn có cho trang đã xuất bản (noindex không chặn preview).
- **D-21 (403):** khách hoặc người không phải chủ mở nháp: trang tự render (không dùng `forbidden()`, vẫn experimental ở Next 16.4), chỉ có câu "Lịch trình này chưa được xuất bản" + "Chỉ người tạo xem được bản nháp." và nút "Về trang chủ". **Không** có nút Đăng nhập. Id sai dạng GUID hoặc BE 404 dùng trang not-found sẵn có. Lỗi mạng/5xx dùng `ErrorState` có "Thử lại".
- **D-22 (Bearer stale):** chủ có phiên nhưng access token đã hết hạn mở nháp của mình thì không được kết luận 403 ngay: phải hồi phục phiên (refresh qua cơ chế Phase 3, single-flight) rồi tải lại, như bẫy 04 D-46 và mẫu `<RefreshSessionThenReload/>` ở `research/ARCHITECTURE.md`. Khách không có phiên thì 403 ngay.
- **D-23 (chủ xem trang công khai):** nháp: banner "Bản nháp – chỉ bạn thấy" + nút "Sửa" (tới `/itineraries/{id}/edit`); đã xuất bản: nút "Sửa" nhỏ ở thanh trên cùng nội dung. Người khác không thấy nút Sửa (`canEdit` của domain).
- **D-24 (thẻ đã xuất bản, đổi 04 D-07):** bấm thẻ vẫn vào editor; menu ⋯ của thẻ đã xuất bản thêm mục "Xem trang công khai". Thẻ nháp không có mục này.
- **D-25 (không phải chủ mở editor, đổi 04 D-45):** lịch trình đã xuất bản mà viewer không phải chủ thì editor **chuyển hướng sang trang công khai** `/itineraries/{id}` (thay trang 403 "Bạn không có quyền sửa lịch trình này"). Nháp của người khác vẫn hiện trang 403 của editor.

### Claude's Discretion
- Cách lấy dữ liệu SSR: RSC gọi thẳng BE qua helper server (`composition/*.server.ts`, `server-only`), Bearer chỉ gắn khi còn tươi, `React.cache` dedupe giữa page và `generateMetadata`, không dùng cache dùng chung (`"use cache"`) vì nháp chỉ chủ xem; phần đọc cookie nằm trong `<Suspense>` theo `cacheComponents`. Có hydrate React Query cho chế độ Bản đồ (client) hay truyền plain object qua props do planner chốt; không dùng chung query key giữa RSC và client nếu gây lệch (PITFALLS P13).
- Cách tách component bản đồ chỉ đọc: tách phần chung của `EditorMapArea`/`TripMap`/`use-map-selection`/`use-map-camera` ra để trang công khai dùng mà không kéo code editor (dnd-kit, form) vào bundle; vị trí code theo ranh giới tầng (ESLint), không sửa rule.
- Thư viện QR (pin cứng trong `catalog:`) hoặc tự sinh; định dạng PNG tải về.
- Biến môi trường gốc URL công khai cho `metadataBase`/link chia sẻ (server-only hay `NEXT_PUBLIC_*`), mặc định `https://triporyv1.vercel.app`.
- Hằng số tiền tố ảnh điểm đến để nhận ra ảnh giữ chỗ (D-18); kích thước và nội dung ảnh OG mặc định (logo + chữ Tripory theo token).
- Copy phụ (tiêu đề hộp chia sẻ, nhãn nút tải QR, empty/error) theo giọng copy Phase 1/3/4; nên chạy `/gsd-ui-phase 5` để chốt UI-SPEC (config `ui_phase: true`).
- Ngưỡng đánh dấu chip ngày đang đọc (IntersectionObserver), khoảng cách dính dưới header.
- Có hay không giữ toast "Đã xuất bản lịch trình" khi hộp chia sẻ tự mở (D-15).

</decisions>

<be_dependencies>
## Phụ thuộc BE (repo `tripory_be`, phụ thuộc ngoài; user tự sửa BE, agent chỉ đặc tả)

Đã kiểm code nhánh `dev` (commit `feb288e`) ngày 2026-11-07:
- `GET /api/v1/itineraries/{id}` có `[AllowAnonymous]` (`Tripory.API/Controllers/V1/ItinerariesController.cs`); `GetItineraryByIdQueryHandler`: không tìm thấy → `Itinerary.NotFound` (404); `IsPublic == false` và viewer không phải chủ → `Itinerary.Forbidden` (403); còn lại 200 `ItineraryDetailDto`. **Không cần endpoint mới để làm trang công khai.**
- `ItineraryDetailDto` hiện có `Id, UserId, Title, Description, CoverImageUrl, CoverImages, SelectedCoverIndex, DestinationCode, Interests, StartDate, IsPublic, TotalDistanceKm, CreatedAt, UpdatedAt, Days, Waypoints`. Không có thông tin tác giả. `UsersController` chỉ có `GET /` (danh sách/tìm, AllowAnonymous), `GET /me`, `PUT /profile`; không có `GET /users/{id}`.

**BE-05-01 (không chặn Phase 5): nhúng tác giả vào DTO chi tiết.**
- What: `ItineraryDetailDto` thêm `author: { id: Guid, displayName: string, avatarUrl: string | null }`.
- Why: trang công khai hiện người tạo cho khách (D-02); FE chỉ có `userId`.
- Where: `GetItineraryByIdQueryHandler` / `ToDetailDto` (nạp user theo `UserId`), áp cho `GET /api/v1/itineraries/{id}`; các endpoint trả `ItineraryDetailDto` khác có thể trả cùng trường.
- How: `displayName` lấy từ `FullName` của user (rỗng thì `Handle`); `avatarUrl` là `AvatarUrl` hiện có. **Không** đưa `email`, `roles`, `status` vào. User đã xóa thì `author` là `null`. Trường mới không đổi tên hay nghĩa trường cũ.
- FE: `author` tùy chọn trong schema Zod; thiếu thì ẩn khối tác giả.

**Tồn đọng Phase 4 phải kiểm trước UAT Phase 5 (không phải công việc mới):**
- Chưa kiểm BE đã deploy các mục 6-11 của `04-BE-CONTRACT.md` (hợp đồng POST/PUT, DTO, mã lỗi, migration, `CoverImageBaseUrl`). Phase 5 đọc `coverImages`, `selectedCoverIndex`, `destinationCode` của DTO và gốc ảnh `CoverImageBaseUrl` (D-18), nên UAT trang công khai cần BE đã deploy đúng các mục này.
- UAT mục F của Phase 4 (F1..F12, tìm địa điểm) và sửa `738c9a2` chỉ được chấp nhận theo xác nhận người dùng; chưa review độc lập plan 04-42..04-58. Trang công khai dùng lại code bản đồ của 04-42..04-53, nên researcher/planner nên đọc `04-REVIEW.md`, `04-UI-REVIEW.md`, `deferred-items.md` trước khi tách component.
- `/mine` đếm sai `DaysCount`/`WaypointsCount` (`04-BE-DEPENDENCIES.md`) không ảnh hưởng trang công khai (dùng DTO chi tiết).

</be_dependencies>

<canonical_refs>
## Canonical References

**Agent ở bước sau BẮT BUỘC đọc các tài liệu này trước khi plan hoặc triển khai.**

### Phạm vi và yêu cầu
- `.planning/ROADMAP.md` §Phase 5: goal, 4 success criteria.
- `.planning/REQUIREMENTS.md`: PUB-01..PUB-05, PUB-06 (đã xong, dùng lại), ITIN-11 (ghi chú D-40), UX-02 (OG động, v2).
- `.planning/PROJECT.md` §Constraints, §Key Decisions (BFF, MapLibre + OpenFreeMap thay SVG, không mock).

### Quyết định phase trước
- `.planning/phases/04-itinerary-crud-editor/04-CONTEXT.md`: D-07, D-16 (route group `(dashboard)/(shell)`, `(editor)`), D-28 (ngày thưa), D-40 (hộp chia sẻ sang Phase 5), D-45, D-46 (bẫy Bearer stale), D-106 (ảnh giữ chỗ), D-111..D-140 (bản đồ, tab Tổng quan, đồng bộ chọn, ghi công, Hoàng Sa/Trường Sa).
- `.planning/phases/04-itinerary-crud-editor/04-UI-SPEC.md`: copy, header editor, nút Xuất bản, bản đồ.
- `.planning/phases/04-itinerary-crud-editor/04-BE-CONTRACT.md` §6-11, `04-BE-DEPENDENCIES.md`, `04-REVIEW.md`, `04-UI-REVIEW.md`, `deferred-items.md`.
- `.planning/phases/03-identity-session-bff/03-CONTEXT.md`: D-24 (hồi phục phiên), mẫu refresh single-flight; `03-UI-SPEC.md`.
- `.planning/phases/02-http-shared-kernel/02-CONTEXT.md`: chính sách lỗi/toast, `ERROR_MESSAGES`.
- `.planning/phases/01-design-system-ui-skeleton-walking-skeleton/01-CONTEXT.md`, `01-UI-SPEC.md`: AppShell `variant="public"`, Sheet, token.

### Research
- `.planning/research/ARCHITECTURE.md`: public view RSC + optional auth, `React.cache`, `sessionStale`, `<RefreshSessionThenReload/>`, cây `(public)/itineraries/[id]/page.tsx`.
- `.planning/research/FEATURES.md` §D (public view, chia sẻ, OG), §Khoảng trống BE (không có author).
- `.planning/research/PITFALLS.md`: P5 (không `"use cache"` cho dữ liệu theo người xem), P11 (SSR UTC vs client), P13 (query key RSC/client), Bearer stale → 403.

### Kiến trúc và luật
- `ai-memories/tripory-fe--ddd-architecture.md` (mục 3, 5, 9: `server-only` chỉ ở `composition/*.server.ts`).
- `packages/config/eslint/boundaries.mjs`; `.kiro/steering/coding-rules.md`, `.kiro/steering/code-review.md`.
- `AGENTS.md`, `apps/web/AGENTS.md`. Docs Next 16.4: `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`, `03-api-reference/04-functions/generate-metadata.md` (streaming metadata, `robots`), `03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`, `03-api-reference/04-functions/forbidden.md` (experimental, không dùng), dynamic routes `params` Promise.

### BE (repo `C:\Users\OS\Documents\personal\tripory_be`, nhánh `dev`)
- `src/Services/Tripory/Tripory.API/Controllers/V1/ItinerariesController.cs` (`GetById` AllowAnonymous).
- `src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Handlers/GetItineraryByIdQueryHandler.cs`.
- `src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Responses/ItineraryDetailDto.cs`.
- `src/Services/Tripory/Tripory.Application/Common/Models/UserDto.cs` (`FullName`, `Handle`, `AvatarUrl`).
- `API_ENDPOINTS.md` §2 Users, §6 Itinerary.

### FE cũ (tham khảo UX, không port code mock)
- `C:\Users\OS\Documents\personal\tripory\src\components\public-itinerary\*` (`PublicMapView`, `ModeTogglePill`, `StickyBottomActionBar`), `ShareModal`, `QrCodeSvg`, `src\lib\qr.ts`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Bản đồ: `apps/web/src/modules/itinerary/ui/map/{trip-map,trip-map.lazy,pin-markers,route-layer,map-attribution,basemap-style,day-colors,map-camera}.tsx|ts`; `editor-map-area.tsx` (trạng thái loading/ready/error, "Thử lại", dự phòng), `editor-map-pins.ts`, `editor-map-viewport.ts`, `use-map-camera.ts`, `use-map-selection.ts`; `ui-web` `MapPin`, `MapZoomControls`. Test giả lập `apps/web/src/test/fake-react-map-gl.tsx`.
- Tab/ngày: `day-tabs.tsx`, `overview-panel.tsx`, `overview-summary.tsx`, `day-overview-row.tsx`, `day-panel.tsx`, `waypoint-list.tsx`, `use-editor-tab.ts`, `trip-cover.tsx`, `cover-image.tsx`, `trip-summary.tsx`, `format.ts`, `overview-format.ts`.
- Bố cục: `editor-layout.tsx` (slot canvas/summary/timeline, sheet không modal 3 mức), `responsive-form-surface.tsx` (Dialog/Sheet cho hộp chia sẻ), `use-media-query.ts`.
- Editor: `editor-header.tsx`, `publish-button.tsx`, `publish-dialog.tsx` (chỗ đặt nút Chia sẻ, mở hộp sau xuất bản), `editor-forbidden.tsx` (403 editor), `itinerary-card.tsx` + `ellipsis-menu` (thêm "Xem trang công khai").
- `@tripory/itinerary`: DTO/mapper ACL, `canEdit`, `VIETNAM_VIEW_BOUNDS`, mô hình pin/đường (`DayRouteModel`, `MapPinModel`), danh mục điểm đến có tâm/bbox.
- `apps/web/src/composition/viewer.server.ts` (`getViewer`, `getSessionKind`, `React.cache`, `server-only`), `composition/server/upstream.ts`/`session-store.ts` (gọi BE từ server), `components/app-shell.tsx` (`variant="public"`), `components/not-found-view.tsx`, `app/not-found.tsx`.
- `ui-web`: `Dialog`, `Sheet`, `Button`, `IconButton`, `Tabs`, `Avatar`, `Badge`, `InlineAlert`, `ErrorState`, `Skeleton`, `notify`.

### Established Patterns
- `proxy.ts` chỉ chặn `/itineraries/mine`, `/settings`, và regex `/itineraries/{id}/edit`; `/itineraries/{id}` không bị gate.
- `(public)/layout.tsx` bọc `AppShell variant="public"`; chưa có `(public)/itineraries/[id]`.
- Editor không gọi BE từ RSC (dữ liệu tải ở client qua BFF); trang công khai cần SSR nên là chỗ đầu tiên gọi BE từ RSC: phải tránh Bearer stale (D-22).
- Ẩn/hiện component bằng prop `visible`, không `? :`/`&&` trong JSX; chuỗi UI tiếng Việt; nạp MapLibre chỉ ở client (`next/dynamic` `ssr: false` trong Client Component).

### Integration Points
- Mới: `apps/web/src/app/(public)/itineraries/[id]/page.tsx` (+ `loading`/`error`, `generateMetadata`), `composition/itinerary.server.ts`, `modules/itinerary/ui/public-*` (bài viết, chế độ bản đồ chỉ đọc, hộp chia sẻ, banner nháp, 403).
- Sửa: `editor-header.tsx`/`publish-button.tsx` (nút Chia sẻ, mở hộp sau xuất bản), `itinerary-editor.tsx` (không phải chủ + đã xuất bản → `redirect`), menu thẻ trong `my-itineraries-view.tsx`/`itinerary-card.tsx`.
- File tĩnh: ảnh OG mặc định trong `apps/web/public/`.

</code_context>

<specifics>
## Specific Ideas

- Người xem chính là bạn bè mở link từ Zalo/Messenger trên điện thoại: chế độ Bài viết đọc bằng cách cuộn là mặc định; bản đồ là lựa chọn.
- Chế độ Bản đồ phải "giống editor nhưng chỉ đọc" để người dùng thấy cùng một bản đồ ở cả hai nơi.
- Trang 403 tối giản: không mời đăng nhập.
- Tác giả: người dùng muốn hiện người tạo bài, chấp nhận ẩn tới khi BE nhúng `author`.

</specifics>

<deferred>
## Deferred Ideas

- Ảnh OG động vẽ đường đi bằng `ImageResponse`/SVG (UX-02, v2).
- Cho Google index trang đã xuất bản, sitemap (sau đợt thử với bạn bè; hiện `noindex` toàn bộ, D-20).
- Trang hồ sơ tác giả / link từ khối tác giả (Phase 6 Profile cân nhắc).
- Nút chia sẻ riêng Facebook/Zalo/X (URL share của Zalo chưa kiểm chứng).
- Ảnh bìa thật cho 34 điểm đến (từ 04 deferred, D-105/D-106); khi có thì D-18 có thể dùng ảnh điểm đến làm OG.
- Hủy xuất bản (BE chưa có endpoint).

### Reviewed Todos (not folded)
Không có todo nào khớp với Phase 5.

</deferred>

---

*Phase: 05-map-public-view*
*Context gathered: 2026-11-07*
