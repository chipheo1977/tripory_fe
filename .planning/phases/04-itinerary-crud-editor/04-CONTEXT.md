# Phase 4: Itinerary CRUD & Editor - Context

**Gathered:** 2026-10-23
**Updated:** 2026-10-30 (mở lại: form tạo lịch trình 4 khối, nhiều ảnh bìa, tự lưu "Thông tin chuyến đi"; D-52..D-101)
**Updated:** 2026-11-05 (mở lại lần 2: bản đồ MapLibre + OpenFreeMap trong editor, tab Tổng quan; PUB-06; D-111..D-140)
**Status:** Ready for planning (phần mở lại lần 2: bản đồ trong editor; phần mở lại ITIN-02/ITIN-03 đã xong 41/41 plan)

<domain>
## Phase Boundary

Phase này giao, cho người dùng đã đăng nhập và bằng API BE thật:

1. "Lịch trình của tôi" (`/itineraries/mine`): lưới thẻ, infinite scroll, lọc Tất cả/Nháp/Đã xuất bản, tạo nhanh, xóa (ITIN-01, 02, 12).
2. Editor `/itineraries/[id]/edit`: metadata (tiêu đề, mô tả, ngày khởi hành, ảnh bìa URL), tab ngày, thêm ngày, phụ đề ngày inline, thêm/sửa/xóa waypoint với undo 5 giây, kéo thả sắp xếp trong ngày, quãng đường theo ngày và tổng do BE tính, chỉ báo trạng thái lưu, cảnh báo rời trang (ITIN-03..10).
3. Xuất bản có xác nhận (ITIN-11, xem D-40 về hộp chia sẻ).
4. Chỉ chủ vào được editor; `canEdit` suy ra ở domain (ITIN-13).
5. Bố cục desktop hai vùng và mobile có bottom sheet nhiều mức cho timeline (ITIN-14).
6. Dựng đủ 4 tầng của `packages/itinerary` (domain, application, infrastructure, react) và composition `itinerary.client.ts` / `itinerary.server.ts`.

**Mở lại 2026-10-30 (làm trước, PUB-02 để sau):**

7. Thay hộp tạo nhanh bằng **form tạo 4 khối dạng accordion** trong một modal: Điểm đến (34 tỉnh/thành) → Tên chuyến đi → Thời gian (ngày khởi hành, số ngày) → Sở thích. BE lưu đủ trong một request và tạo sẵn Ngày 1..N (ITIN-02, D-52..D-78, D-92..D-101).
8. Ảnh bìa: mặc định theo điểm đến, lưu tối đa 5 ảnh, chọn một ảnh hiển thị trong "Thông tin chuyến đi" (ITIN-03, D-79..D-86).
9. "Thông tin chuyến đi" tự lưu khi có thay đổi, không còn nút Lưu/Hủy (ITIN-03, D-87..D-91).
10. Tài liệu đặc tả hợp đồng BE cho 7–9 (không kèm code); user tự sửa `tripory_be` trước, FE làm sau (D-52, D-57, D-58).

**Mở lại lần 2, 2026-11-05 (bản đồ trong editor, PUB-06):**

11. Component bản đồ dùng chung (MapLibre GL JS + nền OpenFreeMap, style riêng) thay `TripSummary` ở canvas desktop và làm nền phía sau bottom sheet trên mobile: pin theo ngày có số thứ tự, đường nối trong ngày, zoom/pan (chuột, hai ngón), chọn điểm đồng bộ với danh sách, tự canh khung (D-111..D-130).
12. Tab **"Tổng quan"** đứng trước "Ngày 1" trong dải tab ngày: bản đồ hiện mọi ngày; cột trái hiện thông tin chung của chuyến đi và một dòng tóm tắt cho mỗi ngày; chỉ xem, ngoại lệ là nút "Thêm điểm" có ô chọn ngày (D-131..D-140).
13. Cập nhật yêu cầu: PUB-06 vào Phase 4; PUB-02 về Phase 5 chỉ còn nút chuyển Bài viết/Bản đồ; bỏ chữ "SVG" (D-129, D-130).
Không cần thay đổi BE cho phần này: bản đồ chỉ đọc tọa độ waypoint đã có.

Nằm ngoài phase:
- ~~Bản đồ SVG trong editor và trang công khai (PUB-02, PUB-06 → Phase 5).~~ Đã đổi 2026-11-05: bản đồ trong editor (PUB-06) làm ở phần mở lại lần 2 dưới đây (mục 11). Phần còn lại ngoài phase: nút chuyển Bài viết/Bản đồ trên trang công khai (PUB-02 → Phase 5) và ảnh Open Graph (PUB-05 → Phase 5).
- Trang công khai `/itineraries/[id]`, copy link / Web Share / QR, **hộp chia sẻ sau khi xuất bản** (D-40 → Phase 5, cùng PUB-04).
- Tìm địa điểm theo tên (MAP-01), bấm lên bản đồ để chọn vị trí (MAP-02): v2.
- Kéo waypoint giữa các ngày, xóa/đổi thứ tự ngày, hủy xuất bản: BE không có endpoint.
- Ngày thực theo `startDate` (UX-03), khoảng cách từng chặng (UX-04), "Chuyển sang ngày…" (UX-07): v2.

</domain>

<decisions>
## Implementation Decisions

### Danh sách "Lịch trình của tôi" (ITIN-01, 12)
- **D-01:** Lưới thẻ có ảnh bìa: 1 cột trên mobile, 2 cột từ `sm`, 3 cột từ `lg`. Dùng `Card` của `ui-web`.
- **D-02:** **Chỉ infinite scroll, không có nút "Tải thêm"** (người dùng chốt). Tự tải trang kế khi cuộn gần cuối (IntersectionObserver trên phần tử sentinel), 12 mục mỗi trang (`pageSize=12`), dùng `useInfiniteQuery` theo `hasNextPage` của `PagedResult`. Đang tải trang kế thì hiện Skeleton thẻ ở cuối lưới. Hết trang thì không hiện gì thêm. **Lỗi khi tải trang kế: không hiện nút hay thông báo lỗi nào ở cuối lưới** (người dùng chốt). Các trang đã có giữ nguyên, skeleton cuối lưới tắt. Lần sau sentinel lọt vào viewport (người dùng cuộn chạm lại cuối) thì tự gọi `fetchNextPage` lần nữa. Đây là ngoại lệ có chủ đích so với FND-04, chỉ áp dụng cho trang kế. Lỗi ở trang đầu vẫn dùng `ErrorState` có "Thử lại" (D-08).
- **D-03:** Lọc bằng `Tabs` (Tất cả/Nháp/Đã xuất bản), **lưu trên URL** (`?status=all|draft|published`, map sang `isPublic` của BE). Reload và nút back giữ đúng tab. Giá trị lạ trên URL thì coi như "Tất cả".
- **D-04:** Mỗi thẻ: ảnh bìa (không có hoặc lỗi tải thì dùng nền dự phòng theo token), tiêu đề, badge "Nháp"/"Đã xuất bản", ngày khởi hành nếu có, tổng km (ẩn khi bằng 0). **Không hiện số ngày/số điểm** vì BE `/mine` trả `DaysCount`/`WaypointsCount` luôn bằng 0 (PITFALLS, thiếu `Include`). Ghi vào checklist phụ thuộc BE.
- **D-05:** Thứ tự theo BE (`UpdatedAt` giảm dần). FE không tự sắp lại.
- **D-06:** Xóa có ở **hai chỗ**: menu "⋯" trên thẻ (Mở, Xóa) và menu ⋯ trong editor. Dialog xác nhận dùng chung (D-42).
- **D-07:** Bấm thẻ thì vào `/itineraries/[id]/edit`, kể cả lịch trình đã xuất bản. Phase 5 có thể đổi đích cho thẻ đã xuất bản.
- **D-08:** Mỗi tab có empty state riêng. Tab "Tất cả" trống thì có CTA "Tạo lịch trình" (D-10). Loading dùng Skeleton dạng thẻ, lỗi dùng `ErrorState` có "Thử lại".

### Tạo nhanh (ITIN-02)
- **D-09:** Nút "Tạo lịch trình" mở `Dialog` có một ô tiêu đề, **điền sẵn "Chuyến đi mới" và bôi đen sẵn**. Enter là tạo. Validate 1–100 ký tự (theo validator BE), trim. **[Lệch 2026-10-30: thay bằng form 4 khối accordion D-62..D-75, D-92..D-101; Enter ở ô Tên không gửi form (D-68). Giữ giới hạn 1–100 và trim.]**
- **D-10:** Nút nằm ở đầu trang danh sách, cạnh tiêu đề "Lịch trình của tôi", và trong EmptyState. Không dùng FAB, không thêm lối tạo trên header.
- **D-11:** Tạo xong (`POST /itineraries` trả 201 kèm `ItineraryDetailDto`) thì chuyển thẳng tới `/itineraries/[id]/edit`, **không toast**. Editor mở ở Ngày 1 (BE tạo sẵn) có EmptyState hướng dẫn thêm điểm đầu tiên. Cache danh sách bị invalidate. **[Lệch 2026-10-30: vẫn chuyển thẳng vào editor ở Ngày 1, không toast; nay BE tạo sẵn Ngày 1..N theo số ngày đã chọn (D-56) trong cùng request tạo.]**
- **D-12:** Lúc đang gửi dùng lại mẫu Phase 3 (D-30, D-31 của Phase 3): nút đổi thành "Đang tạo…" kèm Spinner, `aria-busy`, chặn bấm lần hai. Sau khoảng 5 giây hiện dòng "Máy chủ đang khởi động, có thể mất tới 30 giây…". Lỗi hiện inline trong dialog (`errorToast: false`), lỗi có field thì gắn vào ô.

### Bố cục editor (ITIN-14)
- **D-13:** Desktop (từ `lg`) chia **hai vùng**. Bên trái là cột timeline rộng khoảng 400px: tab ngày, phụ đề, danh sách waypoint, nút thêm điểm. Bên phải là vùng **canvas**: Phase 4 hiện ảnh bìa lớn và tóm tắt chuyến đi (tiêu đề, mô tả, ngày khởi hành, tổng km, badge). Phase 5 thay canvas bằng bản đồ SVG, còn ảnh bìa và tóm tắt chuyển vào đầu cột trái. Cấu trúc component phải tách canvas thành một slot để Phase 5 thay mà không dựng lại.
- **D-14:** Mobile: ảnh bìa và tóm tắt nằm ở nửa trên làm nền. Timeline nằm trong `Sheet` **không modal** của `ui-web`, có 3 mức peek/medium/expanded. Nền vẫn tương tác được (Phase 1 đã có `disablePointerDismissal` cho sheet không modal). Phase 5 thay nền bằng bản đồ.
- **D-15:** Mở editor trên mobile thì sheet ở mức **medium**.
- **D-16:** Editor dùng **layout toàn màn**: **header riêng của editor thay AppHeader**, dính trên cùng. Header có nút back, tiêu đề rút gọn (ellipsis), chỉ báo trạng thái lưu (D-30), nút "Xuất bản" (D-38), menu ⋯ (Thông tin chuyến đi, Xóa lịch trình) và avatar UserMenu thu gọn. **[Lệch: header hiện tại là [back] [tiêu đề] [nút "i" mở Thông tin chuyến đi] ... [SaveIndicator] [Xuất bản: icon Globe trần dưới md, nút primary có chữ từ md] [nút xóa Trash2 ngoài]. Không còn menu ⋯, không còn avatar UserMenu ở EditorHeader (chỉ header rút gọn tải/lỗi/403 còn `UserMenu compact`); icon header cỡ sm. Theo yêu cầu user 2026-10-30; nội dung quyết định giữ nguyên làm lịch sử.]** Trên mobile header giữ nguyên, không bị sheet che. Vẫn nằm trong `(dashboard)` để có gate. Cách tách layout (route group lồng hay layout riêng) do planner chốt theo docs Next 16.4.
- **D-17:** Sửa metadata trong dialog **"Thông tin chuyến đi"** (desktop là `Dialog`, mobile là `Sheet` modal), mở từ menu ⋯ hoặc khi bấm vào vùng tóm tắt/canvas.

### Form waypoint và nhập vị trí (ITIN-05, 06)
- **D-18:** Form thêm và sửa dùng chung. Desktop là `Dialog`, mobile là `Sheet` modal ở mức expanded. Ô Tên được focus sẵn.
- **D-19:** Thứ tự ô, hiện cùng lúc: **Tên** (bắt buộc), **Vị trí** (bắt buộc, một ô dán), **Địa chỉ**, **Ghi chú** (textarea). Giới hạn độ dài theo validator/entity BE; researcher xác nhận (FEATURES ghi tên ≤ 200).
- **D-20:** Ô Vị trí nhận:
  - Chuỗi "lat, lng": có hoặc không có khoảng trắng, dấu thập phân là chấm, kiểm khoảng hợp lệ bằng `Wgs84Coordinate` của `shared-kernel`.
  - Link Google Maps đầy đủ: các mẫu `@lat,lng`, `?q=lat,lng`, `!3d<lat>!4d<lng>`, `ll=`. Researcher liệt kê mẫu thật và thứ tự ưu tiên khi một link có nhiều mẫu (ví dụ ưu tiên `!3d!4d` của địa điểm hơn `@` của tâm khung nhìn).
  - **Link rút gọn `maps.app.goo.gl`** (và `goo.gl/maps`) được resolve qua **route handler server-side** của app. Route chỉ theo redirect (không tải hay trả nội dung trang), có allowlist host nguồn và host đích (`google.com/maps`, `maps.google.com`…), giới hạn số bước redirect, timeout ngắn. Route **bắt buộc có phiên** và **kiểm Origin** như BFF, trả `Cache-Control: no-store`, chỉ trả URL đích hoặc tọa độ đã parse. Như vậy nó không thành dịch vụ mở link/SSRF cho người lạ.
  - Logic parse là hàm thuần (domain hoặc application của `itinerary`, có test bảng mẫu). Route handler chỉ resolve redirect.
- **D-21:** Dán hợp lệ thì ngay dưới ô hiện "Đã nhận: 10.7769, 106.7009" kèm icon thành công. Nếu link có tên địa điểm (`/place/<tên>/`) mà ô Tên đang trống thì **tự điền Tên** (decode URL, `+` thành khoảng trắng) để người dùng sửa. Không parse được thì hiện lỗi dưới ô kèm ví dụ đúng.
- **D-22:** Thêm xong thì đóng form. Waypoint mới nằm cuối ngày đang chọn; danh sách cuộn tới điểm đó và làm nổi nó trong chốc lát (tôn trọng `prefers-reduced-motion`). Không toast. Lỗi BE hiện inline trong form, form vẫn mở.
- **D-23:** Bấm vào thẻ waypoint thì mở form sửa. "Xóa" nằm trong menu ⋯ của thẻ và trong form sửa. **Tay cầm kéo tách riêng** và có `aria-label` (ví dụ "Kéo để sắp xếp {tên}"). `UpdateWaypoint` không đổi được ngày, nên form sửa không có ô ngày.

### Cách lưu metadata và ngày (ITIN-03, 04, 09, 10)
- **D-24:** Dialog "Thông tin chuyến đi" có hai nút "Lưu" và "Hủy". Đang lưu thì nút loading và chặn gửi lần hai. Lưu xong đóng dialog, không toast. Lỗi field gắn vào ô theo mẫu Phase 3. Validate client bằng Zod theo validator BE: tiêu đề 1–100, mô tả ≤ 1000. **[Lệch 2026-10-30: bỏ nút "Lưu"/"Hủy", tự lưu theo D-87..D-91. Giữ validate Zod và lỗi field gắn vào ô.]**
- **D-25:** Ảnh bìa: preview hiện ngay khi URL hợp lệ (debounce), **chỉ nhận `https://`**. Ảnh không tải được thì hiện nền dự phòng kèm dòng "Không tải được ảnh từ link này", **nhưng vẫn cho lưu**. Có nút xóa ảnh bìa. Dùng thẻ `<img>` thường (host tùy ý), không dùng `next/image` với `remotePatterns`; planner chốt chính sách `referrerPolicy`/CSP nếu cần. **[Lệch 2026-10-30: một ảnh bìa thành lưới tối đa 5 ảnh, chọn một ảnh hiển thị (D-79..D-86). Giữ: chỉ `https://`, preview, ảnh lỗi vẫn cho thêm, thẻ `<img>` thường.]**
- **D-26:** Ngày khởi hành dùng `<input type="date">` gốc của trình duyệt, xóa được (để trống thì gửi `null`). Giá trị giữ bằng value object `CalendarDate` (`YYYY-MM-DD`, không qua `new Date()` local; PITFALLS). Không hiện ngày thực theo từng ngày (UX-03, v2).
- **D-27:** "Thêm ngày" **lưu lên BE ngay** bằng `PUT /itineraries/{id}/days/{max+1}/subtitle` với `subtitle: null`. Đã kiểm code BE: `SetDaySubtitle` gọi `GetOrCreateDay`, nên ngày được tạo thật và reload vẫn còn. Ngày mới được chọn ngay. **Ngày đã thêm không xóa được** (BE không có endpoint); không thêm xác nhận. Researcher kiểm giới hạn `InvalidDayNumber` của BE (dayNumber tối đa?).
- **D-28:** Tab ngày **luôn vẽ đủ dải từ Ngày 1 tới ngày lớn nhất**; ngày thiếu trong DTO (ngày thưa) hiện như ngày trống. Mapper ACL sắp `days` theo `dayNumber` và `waypoints` theo `(dayNumber, orderIndex)` vì BE không `OrderBy`. Mỗi tab hiện "Ngày N" và km của ngày (`dayDistanceKm`, nếu có). Thanh tab cuộn ngang trên mobile, nút "+ Thêm ngày" nằm cuối thanh. Tổng km (`totalDistanceKm`) hiện ở vùng tóm tắt. Km luôn lấy số của BE sau refetch; FE không tự tính rồi coi là số thật.
- **D-29:** Phụ đề ngày hiện dưới tab đang chọn, placeholder "Thêm phụ đề cho ngày này". Bấm vào thì thành ô nhập. Enter hoặc blur để lưu, Esc để hủy, để trống là xóa phụ đề (gửi `null`). Tối đa 100 ký tự (validator BE).
- **D-30:** Chỉ báo lưu trên header editor có 3 trạng thái: "Đang lưu…" (còn mutation đang chạy), "Đã lưu", "Lỗi – Thử lại". Chỉ báo có `aria-live="polite"`. Thao tác nền (phụ đề, reorder, xóa, thêm ngày) lỗi thì chỉ báo chuyển sang "Lỗi – Thử lại" kèm toast lỗi theo chính sách Phase 2. Bấm "Thử lại" là **gửi lại đúng thao tác đã lỗi**. Lỗi trong form (thêm/sửa waypoint, metadata) hiện trong form và form vẫn mở. Theo dõi trạng thái lưu bằng `useMutationState`/`useIsMutating` hay cơ chế khác do planner chốt.

### Undo khi xóa và an toàn dữ liệu (ITIN-07, 08, 10)
- **D-31:** Xóa waypoint thì nó **biến mất khỏi danh sách ngay**, toast "Đã xóa "{tên}"" kèm nút "Hoàn tác" hiện 5 giây (`role="status"`, dùng được bằng bàn phím). **Hết 5 giây mới gửi `DELETE`** (hoãn commit). Hoàn tác thì waypoint hiện lại đúng vị trí cũ, không gọi BE. Lưu ý code: `notify` của `ui-web` ép toast có `action` thành 8 giây và không cho truyền `duration`; planner phải tách bộ đếm 5 giây khỏi thời lượng toast (đóng toast khi commit) hoặc mở rộng `notify` có kèm test.
- **D-32:** Rời trang khi còn lệnh xóa đang chờ: **gửi `DELETE` ngay**. Điều hướng trong app thì flush khi unmount/rời route. Đóng hoặc reload tab thì gửi bằng `fetch` với `keepalive: true` qua BFF (vẫn qua kiểm Origin). Rủi ro chấp nhận: lúc unload không refresh token được, nên nếu access token đã stale thì lệnh xóa có thể không tới BE.
- **D-33:** Bắt đầu kéo trong ngày còn lệnh xóa đang chờ thì **flush `DELETE` ngay** (đóng toast undo), rồi mới tính reorder trên tập còn lại. Như vậy `orderedWaypointIds` luôn khớp đúng tập của BE (`InvalidReorderList`). Lệnh reorder gửi sau khi DELETE xong.
- **D-34:** Kéo thả dùng **dnd-kit với 3 cảm biến**. Chuột kéo ngay. Cảm ứng cần nhấn giữ khoảng 150–200ms **trên tay cầm** để không lẫn với cuộn sheet. Bàn phím: Space để nhấc, mũi tên để di chuyển, Space để thả, Esc để hủy, kèm announcements tiếng Việt cho trình đọc màn hình. Thứ tự đổi ngay (optimistic, `onMutate` + snapshot). BE lỗi thì trả lại thứ tự cũ, toast lỗi, rồi refetch. Thêm dnd-kit vào `catalog:` với version pin cứng. Researcher kiểm dnd-kit với React 19.3 StrictMode (research flag của ROADMAP) và nơi đặt nó (app `modules/itinerary/ui`, không vào package `react` nếu cần DOM).
- **D-35:** Cảnh báo rời trang (ITIN-10):
  - Còn request đang chạy, hoặc dialog có thay đổi chưa lưu, mà đóng hay reload tab thì dùng `beforeunload` (cảnh báo gốc của trình duyệt).
  - Điều hướng trong app (nút back của editor, link trong header/menu) thì hiện `Dialog` "Thay đổi đang được lưu. Rời trang?".
  - Lệnh xóa đang chờ **không** tính là lý do cảnh báo, vì nó được flush ngay theo D-32.
  - Cách chặn điều hướng client trong Next 16.4 do researcher chốt.
- **D-36:** Hết phiên thật lúc form waypoint hoặc metadata đang mở thì **giữ bản nháp form trong `sessionStorage`**, khóa theo itinerary id và loại form (thêm / sửa {waypointId} / metadata). Đăng nhập lại và quay về `next` thì mở lại form với dữ liệu cũ, kèm dòng "Đã khôi phục nội dung chưa lưu". Gửi thành công hoặc bấm Hủy thì xóa bản nháp. Thao tác nền (reorder, phụ đề) thì chấp nhận mất. Adapter `sessionStorage` nằm ở app (`composition/**` hoặc `modules/itinerary/ui`), không nằm trong package.
- **D-37:** Nhiều tab hoặc thiết bị cùng sửa: refetch khi cửa sổ focus lại (`refetchOnWindowFocus` cho query chi tiết). Không có cơ chế giải quyết xung đột (BE không có ETag). BE trả `InvalidReorderList` thì refetch và báo "Danh sách đã thay đổi, đã tải lại".

### Xuất bản (ITIN-11)
- **D-38:** Nút "Xuất bản" khi chưa có waypoint nào: **không dùng `disabled` thật** mà dùng `aria-disabled` (vẫn focus được). Bấm hoặc focus thì giải thích "Thêm ít nhất 1 điểm đến để xuất bản": tooltip trên desktop, dòng chữ trên mobile. `canPublish` (≥ 1 waypoint, không tính waypoint đang chờ xóa) là luật domain. BE `CannotPublishEmpty` vẫn được map nếu lọt qua.
- **D-39:** Hộp xác nhận: tiêu đề "Xuất bản lịch trình?", nội dung "Ai có link đều xem được lịch trình này. Bạn vẫn sửa được nội dung sau khi xuất bản, nhưng không thể chuyển lại về nháp." Hai nút "Xuất bản" và "Hủy", **focus mặc định ở "Hủy"**.
- **D-40:** **Hộp chia sẻ sau khi xuất bản chuyển sang Phase 5** (người dùng chọn, lệch chữ của ITIN-11 và tiêu chí 4). Lý do: trang công khai chưa có nên link chia sẻ sẽ là 404. Xuất bản xong ở Phase 4 thì có toast thành công "Đã xuất bản lịch trình", badge đổi thành "Đã xuất bản", nút "Xuất bản" biến mất. Phase 5 thêm nút "Chia sẻ" và mở sẵn hộp chia sẻ sau khi xuất bản (cùng PUB-04). ROADMAP §Phase 4 tiêu chí 4 và ITIN-11 trong REQUIREMENTS đã được ghi chú.
- **D-41:** Editor của lịch trình đã xuất bản vẫn sửa đầy đủ được (BE không chặn). Header có dòng nhỏ "Thay đổi hiển thị ngay với người xem". **[Lệch: dòng này đã bị bỏ khỏi header theo yêu cầu user 2026-10-30; nội dung quyết định giữ nguyên làm lịch sử.]**
- **D-42:** Xóa lịch trình: dialog "Xóa lịch trình "{tên}"?" với nội dung "Thao tác này không hoàn tác được." Nếu đã xuất bản thì thêm câu "Link chia sẻ sẽ không còn mở được." Nút "Xóa" dùng variant danger, **focus mặc định ở "Hủy"**. Xóa trong editor thì về `/itineraries/mine` kèm toast "Đã xóa lịch trình". Xóa từ thẻ thì thẻ biến mất kèm cùng toast. Danh sách và chi tiết bị invalidate hoặc gỡ khỏi cache.
- **D-43:** Lịch trình đã xuất bản mà người dùng xóa hết waypoint: cho phép (BE cho phép), không cảnh báo thêm, undo 5 giây vẫn áp dụng.

### Route và quyền (ITIN-13)
- **D-44:** Route editor là `/itineraries/[id]/edit` trong `(dashboard)`, có gate đăng nhập sẵn (Phase 3 D-10). Path `/itineraries/[id]` để dành cho trang công khai Phase 5.
- **D-45:** Người không phải chủ mở editor của lịch trình đã xuất bản (BE trả 200) thì `canEdit(itinerary, viewerId)` (domain) bằng false, và trang hiện **403** "Bạn không có quyền sửa lịch trình này" kèm nút "Về Lịch trình của tôi". Editor chỉ dành cho chủ. Phase 5 đổi thành chuyển hướng sang trang công khai. Trang 403 tự render (không dùng `forbidden()` experimental), trừ khi researcher thấy Next 16.4 đã ổn định nó.
- **D-46:** Bản nháp của người khác (BE 403 `Itinerary.Forbidden`) thì hiện cùng trang 403. Id không đúng dạng GUID (`ItineraryId` của `shared-kernel` trả null) hoặc BE 404 thì dùng `not-found` sẵn có. Lỗi mạng hoặc 5xx thì dùng `ErrorState` có "Thử lại". **Bẫy (PITFALLS):** `GET /{id}` là AllowAnonymous, nên Bearer hết hạn khiến chủ nhận 403 với chính bản nháp của mình. Đường server (RSC) và đường BFF không được gửi Bearer stale; stale thì phải đi qua cơ chế hồi phục phiên của Phase 3 (D-24) trước khi kết luận 403.
- **D-47:** Nút back của editor: vào từ danh sách thì quay lại đúng trang danh sách cũ (giữ tab lọc trên URL và vị trí cuộn nhờ cache infinite query). Mở thẳng từ URL thì về `/itineraries/mine`.

### Bổ sung sau research (2026-10-24)
- **D-48:** Link rút gọn của địa điểm (POI) resolve ra `/maps/place/<tên>/data=…` không có tọa độ (`04-RESEARCH.md` Pitfall 1, đã gọi thật). Giữ D-20 (chỉ theo redirect, không geocoding). Kết quả `no-coordinate` thì vẫn tự điền Tên/Địa chỉ theo D-49 và hiện lỗi dưới ô Vị trí: **"Link này chỉ có tên địa điểm, không có tọa độ. Trong Google Maps, nhấn giữ vào địa điểm để lấy tọa độ rồi dán vào đây."** UAT phải có ca link chia sẻ từ app điện thoại thật và ghi rủi ro UX này.
- **D-49:** Tách `/place/<…>/`: phần **trước dấu phẩy đầu tiên** là Tên, phần **sau** (trim) là Địa chỉ. Chỉ điền ô đang trống; không có dấu phẩy thì chỉ điền Tên. Mở rộng D-21 (trước chỉ điền Tên).
- **D-50:** Lệnh xóa đang chờ được gửi ngay cả khi tab bị ẩn (`visibilitychange` → `hidden`), không chỉ khi `pagehide`. Lý do: trình duyệt mobile có thể kill tab ở nền. Mở rộng D-32.
- **D-51:** Route resolve link rút gọn **không có rate limit** ở Phase 4 (chỉ cần phiên + Origin + allowlist host + giới hạn hop/timeout). Rủi ro chấp nhận ghi vào threat model: người đã đăng nhập có thể dùng server gọi `maps.app.goo.gl`.

### Mở lại 2026-10-30: hợp đồng BE và cách làm BE (ITIN-02, ITIN-03)
- **D-52:** **User tự sửa `tripory_be`.** Agent chỉ viết tài liệu đặc tả, **không kèm code chính xác**, không sửa repo BE.
- **D-53:** Danh mục 34 điểm đến ở BE là **hằng số C# kèm validator**. FE và BE dùng chung **mã slug có tiền tố quốc gia** (ví dụ `vn-da-nang`, `vn-lam-dong`) để mở rộng ra global sau. Không dùng mã số hành chính làm id.
- **D-54:** `PUT /itineraries/{id}` (Thông tin chuyến đi) **thiếu trường điểm đến hoặc sở thích thì BE giữ nguyên**, không xóa.
- **D-55:** Sở thích lưu ở cột `text[]`, mỗi phần tử là mã cố định (ví dụ `history-culture`, `nature`), không trùng, tối đa 7 mục (bằng số lựa chọn).
- **D-56:** Request tạo nhận số ngày; BE **tạo đủ bản ghi Ngày 1..N** ngay khi tạo. Validator 1–30.
- **D-57:** Tài liệu BE chỉ đặc tả hợp đồng: endpoint, JSON request/response, luật validate kèm mã lỗi đề xuất (ví dụ `Itinerary.DestinationUnknown`, `Itinerary.DayCountOutOfRange`, `Itinerary.InterestUnknown`, lỗi danh sách ảnh bìa), trường mới trong `ItineraryDetailDto`/`ItinerarySummaryDto`, cách `PUT` giữ nguyên, danh mục mã điểm đến và mã sở thích, migration mô tả bằng lời. **Không có ca kiểm thử, không có code.** Mỗi thay đổi có giải thích **5W1H** (What, Why, Who, When, Where, How).
- **D-58:** **Làm tuần tự:** plan đầu chỉ viết tài liệu BE rồi dừng ở checkpoint chờ user xác nhận BE đã sửa xong; mọi plan FE chạy sau checkpoint đó.

### Mở lại 2026-10-30: form tạo lịch trình (ITIN-02)
- **D-92:** Khối Điểm đến: chọn **đúng một** trong **34 đơn vị cấp tỉnh** sau sắp xếp 2025 (Nghị quyết 202/2025/QH15), **bắt buộc**. Danh sách và tên chính thức phải đối chiếu văn bản gốc (và mã theo Quyết định 19/2025/QĐ-TTg chỉ để tham chiếu) trước khi code; researcher không được đoán.
- **D-59:** Tìm theo **alias**: tên tỉnh cũ và vài thành phố du lịch lớn. Gõ "Đà Lạt" ra Lâm Đồng, kèm dòng phụ "gồm Đà Lạt". Danh sách vẫn chỉ có 34 mục. Ánh xạ alias phải được xác minh.
- **D-60:** Danh sách chia **hai nhóm**: "Phổ biến" (khoảng 8 mục đầu theo hạng) và "Tất cả" (theo chữ cái). Ô tìm ở trên, lọc tại chỗ, tìm không dấu (bỏ dấu, `đ→d`, chữ thường).
- **D-61:** Hạng phổ biến là **bảng tĩnh** (user duyệt): Đà Nẵng, TP. Hồ Chí Minh, Hà Nội, Khánh Hòa, Lâm Đồng, Quảng Ninh, An Giang, Lào Cai, Huế, Ninh Bình, rồi các tỉnh còn lại theo chữ cái. Sau này có thể đổi sang thống kê của BE.
- **D-62:** **Không làm wizard từng bước.** Cả 4 phần nằm trên **một modal**, chia **4 khối xếp từ trên xuống**, mỗi khối bấm để đóng/mở, **chỉ mở được một khối tại một thời điểm** (accordion).
- **D-72:** Thứ tự khối: **Điểm đến → Tên chuyến đi → Thời gian → Sở thích**.
- **D-63:** Khối đang đóng hiện tiêu đề khối, **giá trị đã chọn dạng tóm tắt** (ví dụ "Điểm đến · Đà Nẵng", "Thời gian · 3 ngày, từ 12/11/2026", "Sở thích · Thiên nhiên, Mua sắm") và **dấu báo lỗi** nếu khối còn thiếu.
- **D-64:** Khối **chọn một** (Điểm đến) chọn xong thì **tự đóng và mở khối kế tiếp**. Khối **chọn nhiều** (Sở thích) và khối **Thời gian** không tự chuyển; người dùng tự bấm mở khối khác.
- **D-68:** Khối Tên không tự chuyển. **Enter trong ô Tên không gửi form.**
- **D-65:** Mở được khối bất kỳ, theo thứ tự nào cũng được. Mở modal thì **khối Điểm đến mở sẵn**.
- **D-66:** Nút **"Tạo lịch trình" dính ở đáy modal, luôn thấy được** (cạnh "Hủy").
- **D-69:** Bấm Tạo khi còn thiếu/sai (chưa chọn điểm đến, tên trống...) thì **mở khối lỗi đầu tiên, focus ô lỗi, hiện lỗi dưới ô**. Lỗi field do BE trả về cũng xử lý như vậy.
- **D-67:** Bề mặt dùng `ResponsiveFormSurface`: `Dialog` giữa màn hình từ `md`, bottom `Sheet` modal dưới `md` (có nút X đóng). Cùng accordion ở cả hai.
- **D-93:** Tên mặc định **"Chuyến đi {Tên điểm đến}"**; chưa chọn điểm đến thì "Chuyến đi mới". Đổi điểm đến thì tên đổi theo **cho tới khi người dùng tự sửa tên**; xóa trắng rồi rời ô thì coi như chưa sửa và điền lại mặc định. Logic là hàm thuần ở domain.
- **D-73:** Số ngày: nút **"−" / "+"** hai bên con số, gõ số trực tiếp được, **1–30, mặc định 3**, mỗi nút vùng chạm 44px.
- **D-75:** Ngày khởi hành **tùy chọn**, **không chặn ngày quá khứ**. Dùng `Input type="date"` có sẵn (icon lịch bên trái, `allowClear`, `clearLabel="Xóa Ngày khởi hành"`), giá trị qua `CalendarDate`.
- **D-74:** **Không hiện ngày kết thúc.**
- **D-94:** Khối Sở thích **chọn nhiều, tùy chọn**.
- **D-70:** Danh sách sở thích (theo thứ tự): **Lịch sử & Văn hóa, Thiên nhiên, Mua sắm, Ẩm thực & Đồ uống, Giải trí, Sức khỏe, Khác**. "Food & Drink" đổi thành "Ẩm thực & Đồ uống" (luật chuỗi tiếng Việt). "Khác" chỉ là một nhãn, không có ô nhập.
- **D-71:** Sở thích là **chip chữ**, bấm để bật/tắt, xếp nhiều dòng.
- **D-95:** Đóng modal giữa chừng **không hỏi xác nhận**, bỏ dữ liệu; mở lại là form mới.
- **D-96:** Gửi **một request duy nhất** ở cuối (không tạo sớm). Trạng thái gửi, khóa khi đang gửi, dòng cold start giữ như D-12. Thành công thì chuyển vào editor, không toast (D-11).
- **D-97:** Modal tạo **không có khối ảnh bìa**; ảnh bìa mặc định lấy theo điểm đến (D-79, D-80).
- **D-76:** Điểm đến và sở thích **chưa hiện trong editor** ở phase này, chỉ lưu lên BE.
- **D-77:** **Chưa sửa được** điểm đến và sở thích sau khi tạo; "Thông tin chuyến đi" không có hai trường này.
- **D-78:** Thẻ trong "Lịch trình của tôi" **chưa hiện điểm đến**.
- **D-98:** Cập nhật đặc tả nghiệp vụ `tripory/docs` PT-01 ("chỉ nhập Tên chuyến đi") theo luồng mới.

### Mở lại 2026-10-30: ảnh bìa (ITIN-03)
- **D-79:** Ảnh mặc định lấy từ **bộ 34 ảnh tuyển sẵn, tự lưu trữ** (mỗi tỉnh/thành một ảnh, trong app hoặc CDN của mình, URL https tuyệt đối dùng được cho Open Graph Phase 5). Danh mục điểm đến ở FE và BE mang URL ảnh này. **Giấy phép từng ảnh phải được xác minh** (ảnh tự chụp hoặc giấy phép cho phép dùng thương mại và tự lưu trữ). Không dùng Unsplash API hay Wikimedia động.
- **D-80:** Lúc tạo, **BE ghi ảnh mặc định thành ảnh 1 và đặt làm ảnh đang hiển thị**. Ảnh này tính vào giới hạn 5, xóa/thay được như ảnh thường.
- **D-99:** Lưu **tối đa 5 ảnh bìa**, chọn **một ảnh đang hiển thị**. DTO giữ trường `coverImageUrl` = ảnh đang hiển thị (code cũ, thẻ, tóm tắt không vỡ); thêm danh sách ảnh và ảnh đang chọn. Dữ liệu `CoverImageUrl` cũ chuyển thành ảnh 1 và được chọn.
- **D-81:** Ảnh bìa vẫn **chỉ nhập bằng URL https**. Không có tải ảnh lên.
- **D-100:** **Chỉ sửa ảnh bìa trong "Thông tin chuyến đi".**
- **D-82:** Ảnh bìa hiện dạng **lưới 5 ô**. Bấm ảnh để chọn ảnh hiển thị; ô trống bấm để dán URL.
- **D-84:** Bấm ô trống thì mở **ô nhập URL ngay dưới lưới** (`allowClear`, preview, nút "Thêm" và "Hủy"). Ảnh không tải được vẫn báo "Không tải được ảnh từ link" và vẫn cho thêm (giữ quy tắc D-25). Không mở modal chồng.
- **D-85:** Ảnh đang hiển thị có **viền nhấn và dấu tích**. Lưới là nhóm **chọn một (radio)**: mũi tên di chuyển, Space chọn. Nhãn đọc màn hình "Ảnh bìa N, đang hiển thị" / "Chọn ảnh N làm ảnh bìa".
- **D-86:** Mỗi ô có ảnh có **nút X** để xóa. Thay ảnh = xóa rồi thêm. Xóa ảnh đang hiển thị thì **ảnh đầu tiên còn lại tự được chọn**. Xóa hết thì giao diện hiện **ảnh của điểm đến làm dự phòng**, nhưng không tự ghi ảnh đó vào danh sách.

### Mở lại 2026-10-30: "Thông tin chuyến đi" tự lưu (ITIN-03)
- **D-87:** "Thông tin chuyến đi" **tự lưu khi có thay đổi**, **không có nút "Lưu"**. Áp cho mọi trường: tiêu đề, mô tả, ngày khởi hành, ảnh bìa.
- **D-88:** Ô chữ (tiêu đề, mô tả) lưu **khi rời ô (blur) và khi ngừng gõ khoảng 800 ms**. Ngày khởi hành và thao tác ảnh (thêm, xóa, chọn) **lưu ngay**. Lệnh ghi **xếp hàng tuần tự** như các lệnh ghi khác của editor (cùng scope `itinerary:{id}`), vì `PUT` ghi đè toàn bộ và BE không có ETag.
- **D-89:** Giá trị không hợp lệ (tiêu đề trống, quá 100 ký tự, URL không phải https...) **không gửi lên BE**, chỉ hiện lỗi dưới ô. Đóng form khi còn lỗi thì **bỏ giá trị lỗi, giữ giá trị đã lưu gần nhất**.
- **D-90:** Trong form **chỉ báo khi lưu lỗi** (lỗi field gắn vào ô, lỗi ảnh dưới lưới, giá trị vẫn còn trong ô). **[Cập nhật 2026-11: lỗi chung không còn là `InlineAlert` trong form mà là một toast error "Chưa lưu được thay đổi. …" kèm action "Thử lại", chỉ một toast, tắt khi lưu thành công; xem 04-UI-SPEC §Lỗi lưu.]** Không hiện "Đang lưu" hay "Đã lưu" trong form. Chỉ báo trên header editor vẫn như D-30.
- **D-91:** Chân form **không có nút nào**. Đóng bằng nút X hoặc vuốt xuống (sheet), Esc hoặc nút đóng (dialog).
- **D-101:** Thay thế D-24 (Lưu/Hủy) và phần "Lưu" của D-25. Bản nháp `sessionStorage` của form metadata (D-36) còn cần hay không do planner quyết theo cơ chế tự lưu (Claude's Discretion). **[Chốt 2026-11-02: bỏ, xem D-107.]**

### Mở lại 2026-10-30: chốt sau nghiên cứu (2026-11-02)
- **D-102:** `destinationCode` **bắt buộc ở BE với lịch trình tạo mới**; lịch trình cũ để `null`. Form cũng bắt buộc (D-92).
- **D-103:** Khi request tạo không gửi `dayCount`, BE mặc định **1** (giữ hành vi cũ). Form luôn gửi số ngày (mặc định 3, D-73).
- **D-104:** Khi chuyển `CoverImageUrl` cũ thành ảnh 1 trong danh sách, URL **không phải `https://` thì bỏ**.
- **D-105:** Khi có ảnh thật, chỉ nhận ảnh **Unsplash, Pexels, CC0 hoặc ảnh user tự chụp**; **không nhận CC BY / CC BY-SA** (tránh trang ghi công). Mỗi ảnh có bản ghi giấy phép.
- **D-106:** **Ảnh thật giao sau**, không thuộc Phase 4. Phase này dùng **ảnh giữ chỗ**: BE ghi URL cố định theo slug (ví dụ `/destinations/<slug>.webp`, gốc URL do hợp đồng BE chốt); khi ảnh chưa có (404) FE rơi về nền dự phòng theo token (`onError`). **Không có plan checkpoint ảnh** và UAT cuối không kiểm ảnh thật. Việc cung cấp 34 ảnh + bản ghi giấy phép chuyển vào Deferred. Thay đổi so với đề xuất 04-26 của nghiên cứu.
- **D-107:** **Bỏ bản nháp `sessionStorage` của form "Thông tin chuyến đi"** (phần metadata của D-36), vì form đã tự lưu. Bản nháp form waypoint (D-36) giữ nguyên.
- **D-108:** Plan **04-23 (UAT gốc) được đánh dấu xong** bằng `04-23-SUMMARY.md` (UAT 23/23 PASS, 2026-10-30) để plan mới phụ thuộc `04-23` và `/gsd-execute-phase 4` không chạy lại nó.
- **D-109:** Sửa `04-UI-SPEC.md` phần `NumberStepper` cho khớp Base UI 1.8.0 (không có PageUp/PageDown, ô trống khi blur trả `null`, `aria-roledescription` tiếng Anh cần ghi đè) trong plan component `ui-web`.
- **D-110:** Sửa đặc tả `tripory/docs` PT-01 (D-98) ở repo `C:\Users\OS\Documents\personal\tripory`: agent sửa file, **không commit ở repo đó** (user tự commit).

### Mở lại lần 2 (2026-11-05): nền bản đồ (PUB-06)
- **D-111:** Lớp hiển thị là **MapLibre GL JS** (BSD-3), nền vector tile **OpenFreeMap** (dữ liệu OSM, không key, miễn phí, không SLA). **Thay quyết định cũ "giữ bản đồ SVG port từ FE cũ, chỉ hiển thị"** (`.planning/PROJECT.md` Key Decisions, `research/STACK.md`, `research/SUMMARY.md`). Không dùng Mapbox, Google Maps cho phần hiển thị. Lý do và so sánh: `.agents/tasks/map-providers-comparison.md`.
- **D-112:** Dùng **style riêng** (JSON do repo giữ, không trỏ thẳng style mặc định của OpenFreeMap), trỏ nguồn tile OpenFreeMap. Đổi nguồn tile sau này (Goong, Vietmap, MapTiler, PMTiles tự host) chỉ đổi URL trong style, không viết lại component.
- **D-113 (Hoàng Sa, Trường Sa, bắt buộc):** dữ liệu OSM ghi quần đảo Hoàng Sa thuộc Trung Quốc. Style riêng phải: (1) nhãn lấy `name:vi` (dự phòng `name`); (2) ẩn ranh giới quốc gia tranh chấp trên biển; (3) ẩn nhãn quần đảo gốc của OSM ở hai vùng này; (4) thêm lớp nhãn riêng "Quần đảo Hoàng Sa (Việt Nam)" và "Quần đảo Trường Sa (Việt Nam)". Trước khi phát hành phải **kiểm bằng mắt** ở mức zoom thấy cả Biển Đông và ghi vào UAT. Căn cứ: Luật Đo đạc và bản đồ 2018 cấm phát hành bản đồ sai chủ quyền (mới đối chiếu qua bản tóm tắt, chưa đọc nguyên văn điều luật).
- **D-114:** Ghi công "© OpenStreetMap" (kèm OpenFreeMap) ở góc dưới phải, luôn hiện (ODbL). **[Lệch 2026-11-06 theo yêu cầu user: ghi công thu gọn thành nút biểu tượng "i" (`aria-label` "Ghi công bản đồ") ở góc dưới phải, bấm mới mở dòng ghi công đầy đủ "© OpenStreetMap · OpenFreeMap · OpenMapTiles" (3 link, tab mới). Nút "i" vẫn luôn thấy khi bản đồ sẵn sàng (không bị sheet hay chip che ở mức thấp, vừa, sheet đóng), nên nội dung ghi công vẫn ở một thao tác bấm, không bị bỏ. Lý do: user muốn giao diện gọn; đã được báo ràng buộc giấy phép OSM (ODbL) và OpenMapTiles (CC BY 4.0) đòi ghi công nhìn thấy được, nên nút phải luôn hiện và nội dung giữ đủ ba link. Văn bản gốc giữ làm lịch sử.]**
- **D-115:** Bản đồ chỉ hiển thị, **không** bấm lên bản đồ để chọn vị trí và **không** tìm POI (MAP-01, MAP-02 vẫn v2). Không gửi dữ liệu lịch trình cho OpenFreeMap; chỉ tải tile.
- **D-116:** Kiểu nền **sáng, nhạt màu** để pin nổi bật, nhãn tiếng Việt.
- **D-117:** Không khóa cứng biên; **mức thu nhỏ tối đa** chỉ vừa đủ thấy cả Việt Nam và Biển Đông.

### Mở lại lần 2: bố cục bản đồ
- **D-118 (desktop):** bản đồ chiếm cả canvas bên phải (thay `TripSummary` ở canvas, D-13). Tóm tắt chuyến đi chuyển lên **đầu cột trái**, chỉ ở tab Tổng quan (D-133).
- **D-119 (mobile):** bản đồ là **nền toàn màn phía sau bottom sheet 3 mức** (D-14, D-15 giữ nguyên: mở ở mức giữa). Mức thấp thấy gần hết bản đồ, mức giữa thấy nửa. Tóm tắt (thông tin chung) vào đầu nội dung sheet ở tab Tổng quan.
- **D-120:** Không tải được bản đồ (OpenFreeMap lỗi, không có WebGL): quay về hiện tóm tắt chuyến đi như hiện nay (`TripSummary` biến thể `canvas`/`compact`), kèm thông báo "Không tải được bản đồ" và nút "Thử lại". Editor vẫn dùng được đủ chức năng.
- **D-121:** Lịch trình chưa có điểm nào: căn bản đồ theo **tỉnh điểm đến**, kèm dòng "Thêm điểm đến để thấy trên bản đồ". Lịch trình cũ không có điểm đến thì căn cả Việt Nam. Danh mục 34 điểm đến cần thêm **tọa độ tâm và khung bao (bbox) xấp xỉ** cho mỗi tỉnh (dữ liệu tĩnh ở FE, không cần BE).

### Mở lại lần 2: pin, đường nối, ngày đang chọn
- **D-122:** Tab một ngày: ngày đang chọn hiện **đậm**, các ngày khác **mờ** (vẫn thấy). Tab Tổng quan: mọi ngày đậm như nhau (D-131).
- **D-123:** Pin **màu theo ngày** (bảng màu lấy từ token của `design-tokens`, lặp lại khi hết màu), **số thứ tự trong ngày** ghi trên pin (1, 2, 3... theo `orderIndex`). Màu ngày dùng chung cho chấm màu ở dòng ngày (D-135) và tab ngày nếu cần.
- **D-124:** Đường nối **chỉ trong cùng ngày**, đường thẳng giữa các điểm theo thứ tự, **không nối qua đêm** (khớp cách BE tính km). Áp dụng cả ở tab Tổng quan (mỗi ngày một đường riêng, màu của ngày).

### Mở lại lần 2: đồng bộ chọn và canh khung
- **D-125 (bấm pin, tab ngày):** hiện tên điểm cạnh pin, highlight dòng tương ứng trong danh sách và cuộn tới; trên mobile đưa sheet lên mức giữa. Không mở form sửa.
- **D-126 (bấm dòng điểm):** bấm vào vùng dòng (không phải nút Sửa/Xóa/tay cầm kéo) thì bản đồ di chuyển tới pin đó và highlight. Nút Sửa, Xóa, tay cầm kéo giữ hành vi cũ.
- **D-127 (tự canh khung):** mở editor và đổi tab: vừa khung các điểm của tab đó (Tổng quan: mọi điểm). Thêm hoặc sửa điểm: di chuyển tới điểm đó, giữ mức zoom. Xóa hoặc kéo thả: giữ nguyên khung. Tôn trọng `prefers-reduced-motion` (không bay, nhảy thẳng), giống D-47 của Phase 4.
- **D-128:** Truy cập bàn phím: danh sách bên trái là đường chính để chọn điểm bằng bàn phím và trình đọc màn hình; pin trên bản đồ là phần bổ trợ cho chuột/chạm (không bắt buộc focus được bằng Tab). Bản đồ có nút zoom +/− dùng được bằng bàn phím.

### Mở lại lần 2: ghi lại yêu cầu
- **D-129:** **PUB-06** chuyển vào Phase 4, mô tả mở rộng: "bản đồ dùng chung trong editor: pin theo ngày, đường nối, zoom/pan, đồng bộ chọn với danh sách". **PUB-02** về lại Phase 5, chỉ còn: "người xem chuyển giữa chế độ Bài viết và Bản đồ trên trang công khai" (dùng lại component của PUB-06).
- **D-130:** Đổi "Bản đồ SVG" thành "bản đồ" trong `REQUIREMENTS.md`, `ROADMAP.md` (tên Phase 5 và tiêu chí). Ghi trong `research/STACK.md` và `PROJECT.md` Key Decisions rằng quyết định "chỉ SVG" đã thay bằng D-111.

### Mở lại lần 2: tab Tổng quan
- **D-131:** Dải tab ngày thêm tab **"Tổng quan"** đứng trước "Ngày 1". Chọn Tổng quan: bản đồ hiện mọi ngày đậm như nhau, mỗi ngày màu và đường nối riêng (D-124), canh khung vừa mọi điểm.
- **D-132 (tab mặc định):** mở editor thì chọn sẵn **Tổng quan nếu lịch trình đã có ít nhất một điểm**, **Ngày 1 nếu chưa có điểm**. (Thay hành vi hiện tại "luôn Ngày 1".)
- **D-133 (thông tin chung):** đầu cột trái ở tab Tổng quan có: ảnh bìa, tiêu đề, mô tả, ngày khởi hành, số ngày, tổng số điểm, tổng km (BE), trạng thái Nháp/Đã xuất bản, nút "Sửa thông tin" (mở "Thông tin chuyến đi"). **Không** hiện điểm đến và sở thích (giữ D-76), **không** hiện ngày kết thúc (UX-03 vẫn v2). Chỉ hiện ở tab Tổng quan; ở tab ngày, cột trái chỉ có danh sách điểm của ngày (tiêu đề đã ở header).
- **D-134 (danh sách ở Tổng quan):** chỉ tóm tắt từng ngày, **không liệt kê điểm**.
- **D-135 (dòng ngày):** chấm màu của ngày, "Ngày N · phụ đề", "X điểm · Y km"; ngày chưa có điểm ghi "Chưa có điểm". **Bấm dòng thì chuyển sang tab ngày đó** (bản đồ canh khung ngày đó, D-127). Desktop: rê chuột hoặc focus vào dòng thì ngày đó nổi lên trên bản đồ.
- **D-136 (bấm pin ở Tổng quan):** hiện tên điểm cạnh pin kèm "Ngày N", làm nổi dòng của ngày đó. **Không** tự chuyển tab.
- **D-137 (chỉ xem):** tab Tổng quan chỉ để xem. Sửa/xóa/kéo thả điểm và sửa phụ đề ngày phải chuyển sang tab ngày. **Ngoại lệ duy nhất:** nút "Thêm điểm" (D-138).
- **D-138 (thêm điểm từ Tổng quan):** form thêm điểm có **thêm ô chọn ngày**, mặc định **ngày cuối cùng**. Ô chọn ngày chỉ có khi mở từ Tổng quan; form **sửa** điểm giữ nguyên không có ô chọn ngày (BE không chuyển điểm giữa ngày, UAT bước 9). Thêm vào ngày chưa có bản ghi vẫn theo cơ chế ngày thưa hiện có.
- **D-139 (sau khi thêm từ Tổng quan):** ở lại tab Tổng quan, bản đồ di chuyển tới điểm mới (D-127).
- **D-140:** Tab Tổng quan ghi **tổng km** dưới nhãn giống tab ngày, dùng `TotalDistanceKm` của BE.

### Claude's Discretion
- (Mở lại lần 2) Thư viện React cho MapLibre (`react-map-gl/maplibre` hay dùng `maplibre-gl` trực tiếp), cách nạp client-only (dynamic import, không SSR), cấu hình worker cho Turbopack; tách gói (bản đồ không nằm trong bundle của trang không cần); vị trí code (component trình bày ở `ui-web` nhận dữ liệu qua props, phép biến đổi lịch trình thành điểm/đường ở `packages/itinerary` domain, style JSON ở app) theo luật tầng; cách hiện tên điểm cạnh pin (tooltip hay popup); độ mờ của ngày không chọn; bảng màu ngày cụ thể trong token; tọa độ tâm/bbox 34 tỉnh (nguồn và cách lưu); cách kiểm Hoàng Sa/Trường Sa tự động được tới đâu (test style JSON) bên cạnh kiểm bằng mắt; CSP nếu có.
- Hình dạng 4 tầng của `packages/itinerary`: tên type, use case, port, Zod DTO (`z.iso.datetime({ offset: true })`, `z.iso.date()`), mapper ACL, query key, `createItineraryHooks`.
- Dữ liệu editor lấy bằng RSC prefetch kèm hydrate React Query hay chỉ fetch ở client có skeleton. Chọn theo `cacheComponents` và bẫy Bearer stale ở D-46.
- Optimistic cho thêm/sửa waypoint (ngoài reorder và xóa) hay chờ BE trả về rồi refetch.
- Debounce refetch sau chuỗi reorder liên tiếp (PITFALLS, mục hiệu năng).
- Tên và vị trí route handler resolve link rút gọn (ví dụ `/api/maps/resolve`), thời gian timeout, số bước redirect tối đa.
- Copy phụ chưa chốt (tiêu đề trang, nhãn menu, empty state từng tab, thông báo lỗi parse vị trí), miễn theo giọng copy Phase 1 và Phase 3. Nên chạy `/gsd-ui-phase 4` để chốt UI-SPEC.
- Ngưỡng "gần cuối" của infinite scroll, ngưỡng nhấn giữ cảm ứng trong khoảng 150–200ms.
- (Mở lại, chốt 2026-11-02) `firstInvalidBlock` và phần tóm tắt khối đặt ở app (vì "khối" là khái niệm UI); nhãn sở thích tiếng Việt đặt ở domain cùng mã sở thích; ảnh bìa dùng phương án A (một `PUT` metadata mang danh sách ảnh và ảnh đang chọn) theo `04-RESEARCH.md` R5.2(d); vị trí lưu ảnh giữ chỗ và gốc URL theo R2.5.
- (Mở lại 2026-10-30) Hình dạng type `Destination` (slug, tên hiển thị, loại, hạng, alias, URL ảnh), port danh mục điểm đến và adapter tĩnh, tên hàm thuần (tìm không dấu, tên mặc định, kiểm số ngày); vị trí đặt 34 ảnh (app `public/` hay CDN) miễn URL https tuyệt đối ổn định; component mới trong `ui-web` (accordion, chip chọn nhiều, nút −/+ số, lưới chọn ảnh) dựng trên Base UI 1.8.0; số mục nhóm "Phổ biến" (khoảng 8); giá trị debounce (khoảng 800 ms); có giữ bản nháp D-36 cho form metadata khi đã tự lưu hay không; tên file tài liệu BE (gợi ý cập nhật `04-BE-DEPENDENCIES.md` và thêm `04-BE-CONTRACT.md`); mã lỗi BE chính xác (chỉ đề xuất, user quyết khi sửa BE).

</decisions>

<canonical_refs>
## Canonical References

**Agent ở bước sau BẮT BUỘC đọc các tài liệu này trước khi plan hoặc triển khai.**

### Phạm vi và tiêu chí
- `.planning/ROADMAP.md` §Phase 4: goal, 5 success criteria (tiêu chí 4 đã ghi chú theo D-40), research flag (parse link Google Maps, dnd-kit với React 19 StrictMode, `CalendarDate`, mapper ngày thưa).
- `.planning/REQUIREMENTS.md`: ITIN-01..14 (ITIN-11 có ghi chú D-40); Out of Scope (kéo giữa các ngày, xóa/đổi thứ tự ngày, hủy xuất bản).
- `.planning/PROJECT.md` §Constraints, §Key Decisions: nhập vị trí chỉ bằng ô dán, ~~giữ bản đồ SVG~~ (thay bằng D-111: MapLibre + OpenFreeMap), không dựng mock, BE là nguồn sự thật.

### Quyết định phase trước
- `.planning/phases/03-identity-session-bff/03-CONTEXT.md`: D-10 (gate `(dashboard)`), D-20 (hết phiên), D-24 (hồi phục phiên khi access stale), D-30/D-31 (trạng thái gửi, dòng cold start), mẫu lỗi form.
- `.planning/phases/03-identity-session-bff/03-UI-SPEC.md`: copy và a11y của form, nút, inline alert.
- `.planning/phases/03-identity-session-bff/03-BE-DEPENDENCIES.md`: checklist phụ thuộc BE; thêm bug `DaysCount`/`WaypointsCount` của `/mine`.
- `.planning/phases/02-http-shared-kernel/02-CONTEXT.md`: D-04 (câu chung), D-05/D-05a/D-06 (lỗi form), D-07..D-10 (chính sách toast), D-11 (timeout 30 giây), D-12 (`retry: false`), D-16 (bảng map errorCode; thêm mã `Itinerary.*`, `Waypoint.*`).
- `.planning/phases/01-design-system-ui-skeleton-walking-skeleton/01-CONTEXT.md` và `01-UI-SPEC.md`: token, Sheet nhiều mức, AppShell, quy tắc "không link tới route chưa tồn tại", file convention loading/error/not-found.

### Research
- `.planning/research/FEATURES.md` §C (Itinerary: danh sách và editor), §Khoảng trống BE, §Quyết định cách nhập vị trí, §Dependency Notes.
- `.planning/research/PITFALLS.md`: Bearer hết hạn thì nhận 403 ở `GET /itineraries/{id}`; ngày giờ (`CalendarDate`, `DateOnly`, `DateTimeOffset`, Zod offset); dữ liệu itinerary (thứ tự, ngày thưa, `InvalidReorderList`, không ETag); `/mine` đếm sai; hook factory gọi một lần ở composition; hiệu năng reorder.
- `.planning/research/ARCHITECTURE.md` và `.planning/research/STACK.md`: RSC gọi thẳng BE, BFF, version thư viện (dnd-kit).

### Kiến trúc và ranh giới
- `ai-memories/tripory-fe--ddd-architecture.md`: mục 1 (luật domain như `canEdit`), 2, 3 (cây thư mục `(dashboard)/itineraries/[id]/edit`, `composition/itinerary.{client,server}.ts`), 4–6, 8, 9.
- `packages/config/eslint/boundaries.mjs`, `packages/config/test/boundaries.test.ts`: `packages/itinerary` theo `contextPackage()`; thêm dependency (`zod`, `react`, `@tanstack/react-query`) theo allowlist sẵn có.
- `AGENTS.md`, `apps/web/AGENTS.md`: đọc docs Next 16.4 tại `apps/web/node_modules/next/dist/docs/` (dynamic route `params` Promise, `notFound`, `forbidden`, route handler, layout lồng, chặn điều hướng).

### Contract BE (repo riêng `C:\Users\OS\Documents\personal\tripory_be`, nhánh `feat/be-fe-integration-group-a`)
- `tripory_be/API_ENDPOINTS.md` §6: 11 endpoint Itinerary (request/response, 201 khi tạo, 403 khi nháp không phải chủ).
- `tripory_be/src/Services/Tripory/Tripory.Application/UseCases/V1/Itineraries/Responses/*.cs`: `ItineraryDetailDto`, `ItinerarySummaryDto`, `ItineraryDayDto`, `WaypointDto`; `BuildingBlocks/.../PagedResult.cs`.
- `tripory_be/src/Services/Tripory/Tripory.Domain/Entities/Itinerary.cs`, `ItineraryDay.cs`: `GetOrCreateDay`, `Publish`/`CannotPublishEmpty`, `ReorderWaypointsInDay`/`InvalidReorderList`, `InvalidDayNumber`.
- `tripory_be/.../Validators/*Itinerary*`, `*Waypoint*`, `SetDaySubtitleCommandValidator.cs`: giới hạn độ dài (tiêu đề 1–100, mô tả ≤ 1000, phụ đề ≤ 100; tên/địa chỉ/ghi chú waypoint cần researcher xác nhận).
- `tripory_be/src/Services/Tripory/Tripory.Persistence/Repositories/ItineraryRepository.cs`: `/mine` sắp theo `UpdatedAt` giảm dần, thiếu `Include` (đếm sai).
- `DomainErrors` của BE: `Itinerary.NotFound`, `Itinerary.Forbidden`, `Itinerary.CannotPublishEmpty`, `Itinerary.InvalidUserId`, `Itinerary.InvalidDayNumber`, `Itinerary.InvalidReorderList`, `Waypoint.NotFound`.

### Mở lại 2026-10-30: form tạo, ảnh bìa, tự lưu
- `.agents/tasks/create-itinerary-wizard-proposal.md`: phân tích luồng tạo hiện tại và khả năng BE (có file:line), dữ liệu điểm đến, phương án A/B/C. Lưu ý: đề xuất trong đó là wizard từng bước; **D-62 đã đổi thành accordion một modal**, D-52/D-58 đổi cách làm BE.
- `.planning/REQUIREMENTS.md` ITIN-02, ITIN-03 (đã viết lại 2026-10-30); `.planning/ROADMAP.md` §Phase 4 tiêu chí 1, 2.
- `.planning/phases/04-itinerary-crud-editor/04-BE-DEPENDENCIES.md`: thêm mục cho hợp đồng mới (D-57).
- Nghị quyết 202/2025/QH15 (sắp xếp đơn vị hành chính cấp tỉnh, hiệu lực 01/07/2025) và Quyết định 19/2025/QĐ-TTg (danh mục, mã số đơn vị hành chính): nguồn chính thức cho 34 điểm đến (D-92). Researcher phải lấy văn bản gốc.
- BE: `tripory_be/src/Services/Tripory/Tripory.API/Controllers/V1/ItinerariesController.cs` (tạo `:23-39`, `PUT` metadata `:78-97`), `Tripory.API/Contracts/V1/Itineraries/Requests/CreateItineraryRequest.cs`, `Tripory.Domain/Entities/Itinerary.cs` (`CreateQuickDraft :48-66`, `UpdateMetadata :68-81`, `SetDaySubtitle :194-203`), `Tripory.Persistence/Configurations/ItineraryDayConfiguration.cs`.
- Đặc tả nghiệp vụ (repo `C:\Users\OS\Documents\personal\tripory`): `docs/traveler/ITINERARY_01_MAP+TIMELINE/PT-01_metadata.md` (cần sửa theo D-98), `docs/traveler/DISCOVERY_FEED_01/PT-01_hero_and_smart_search.md` (danh mục Discovery), BRD (lọc theo destination, duration, interests).
- `.kiro/steering/coding-rules.md`, `.kiro/steering/code-review.md`: không dùng `? :`/`&&` để ẩn/hiện component (dùng prop `visible`), SOLID, giới hạn khoảng 7 prop / 150 dòng.

### Mở lại lần 2 (2026-11-05): bản đồ trong editor
- `.agents/tasks/map-providers-comparison.md`: so sánh MapLibre/OpenFreeMap, Mapbox, Google, Goong, Vietmap, Leaflet, SVG; giá, điều khoản, rủi ro Hoàng Sa/Trường Sa, ghi chú tích hợp (react-map-gl 8.x, `setWorkerUrl` của MapLibre v6, hướng dẫn Next.js + Turbopack).
- Docs MapLibre GL JS (https://maplibre.org/maplibre-gl-js/docs/), react-map-gl (https://visgl.github.io/react-map-gl/docs/get-started), OpenFreeMap (https://openfreemap.org/). Researcher lấy bản hiện hành, kiểm phiên bản tương thích React 19 và Next 16.4.
- `apps/web/src/modules/itinerary/ui/editor-layout.tsx` (slot `canvas`, `summary`, `timeline`), `trip-summary.tsx` (biến thể `canvas`/`compact`, sẽ là dự phòng khi bản đồ lỗi, D-120), `day-tabs.tsx`, `waypoint-list.tsx`, `waypoint-form-dialog.tsx`.
- `packages/itinerary/src/infrastructure/static-destination-catalog.ts`: thêm tọa độ tâm/bbox 34 tỉnh (D-121).
- `.planning/REQUIREMENTS.md` PUB-02, PUB-06; `.planning/ROADMAP.md` §Phase 4, §Phase 5: sửa theo D-129, D-130.

### FE cũ (tham khảo UX, không port code mock)
- Bản đồ SVG cũ (tham khảo hành vi zoom 0,5–3, tự căn giữa khi chọn điểm, không port): `C:\Users\OS\Documents\personal\tripory\src\components\itinerary\{MapCanvas,MapPin,MapControls}.tsx`, `src\components\public-itinerary\PublicMapView.tsx`, `src\lib\projection.ts`.
- `C:\Users\OS\Documents\personal\tripory\src\pages\ItineraryEditorPage.tsx`
- `C:\Users\OS\Documents\personal\tripory\src\components\itinerary\{TimelineSheet,DaySwitcher,SortableWaypointList,SortableWaypointItem,WaypointItem,WaypointDetailModal,EmptyTimelineState,PublishModal}.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@tripory/ui-web`:
  - `Card`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsPanel`, `Dialog`, `DropdownMenu`, `Tooltip`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, `FormField`, `Input`, `Textarea`, `Button` (`loadingLabel`), `IconButton`, `InlineAlert`, `Avatar`.
  - `Sheet` (Base UI Drawer) có snap peek/medium/expanded (`resolveSnapPoints` trong `sheet-snap.ts`), `modal` bật/tắt, `SheetHandle`, `SheetControls`.
  - `notify` (Sonner): toast có `action` bị ép 8 giây và không cho truyền `duration`. Đây là điểm phải xử lý cho undo 5 giây (D-31).
- `@tripory/shared-kernel`: `ItineraryId` (GUID trim + chữ thường, sai trả null), `UserId`, `Wgs84Coordinate` (khoảng đóng, frozen).
- `@tripory/api-client`: `HttpClient`, `ApiError`, `withSessionRefresh`.
- `apps/web/src/lib/feedback/*`: `ERROR_MESSAGES` (thêm mã Itinerary/Waypoint), `selectErrorMessage`, `resolveFormError`, `decideMutationError`.
- `apps/web/src/composition/query-client.ts`: `makeQueryClient` (`retry: false`, `staleTime` 60 giây, `MutationCache` theo `meta.feedback`).
- `apps/web/src/composition/http.client.ts`: `bffHttp` (base `/api/bff`, refresh single-flight + Web Locks). `identity.client.ts` là mẫu lắp `createXHooks` một lần.
- `apps/web/src/composition/viewer.server.ts`: lấy viewer phía server, dùng cho `canEdit`.
- Form: React Hook Form + Zod + `@hookform/resolvers` (catalog), mẫu ở `apps/web/src/modules/identity/ui`.

### Established Patterns
- Không dùng class; type readonly + pure function; deps tiêm theo dạng `makeX(deps)`. Package export TS trực tiếp, mọi version vào `catalog:` và pin cứng.
- BFF `/api/bff/[...path]` đã có allowlist `itineraries`, kiểm Origin, stale/invalid trả 401 mà không gọi BE, trần body 4 MB.
- Test: Vitest (jsdom ở app, node ở package), fake `HttpClient`; route handler dùng `// @vitest-environment node`.
- Trang trong `(dashboard)` đã có `loading.tsx`/`error.tsx`; `/itineraries/mine/page.tsx` hiện chỉ là `EmptyState` sẽ bị thay.

### Integration Points
- `packages/itinerary/src/{domain,application,infrastructure,react}/index.ts`: khung rỗng, dựng đủ ở phase này.
- `apps/web/src/composition/itinerary.client.ts` (mới, `createItineraryHooks` qua `bffHttp`) và `itinerary.server.ts` (mới, `server-only`, nếu dùng RSC prefetch).
- `apps/web/src/app/(dashboard)/itineraries/mine/page.tsx` (thay) và `(dashboard)/itineraries/[id]/edit/page.tsx` (mới, layout toàn màn D-16).
- `apps/web/src/modules/itinerary/ui/*` (mới): thẻ, danh sách, editor, timeline, form waypoint, dnd.
- `apps/web/src/app/api/...` (mới): route resolve link rút gọn Google Maps (D-20).
- `pnpm-workspace.yaml` catalog: thêm dnd-kit (pin cứng).

### Mở lại 2026-10-30 (hiện trạng sau 23 plan và các sửa UAT)
- Luồng tạo hiện tại: `apps/web/src/modules/itinerary/ui/create-itinerary-dialog.tsx` (một ô tiêu đề, `Dialog size="sm"`, chưa dùng `ResponsiveFormSurface`), mở từ `AddButton` trong `my-itineraries-view.tsx`; schema `form-schemas.ts` (`createItinerarySchema`), hook `useCreateItinerary` (`packages/itinerary/src/react/index.ts`), port `create({ title })`, adapter `http-itinerary-repository.ts`, map lỗi `form-error-mapping.ts`.
- `responsive-form-surface.tsx`: Dialog từ `md`, Sheet modal dưới `md` mở `expanded`, `locked` chặn đóng; `Sheet` của `ui-web` có nút X "Đóng" ở góc trên phải, cuộn cùng nội dung.
- `trip-info-dialog.tsx`: form metadata đang có nút Lưu/Hủy, ô ngày và ô ảnh bìa dùng `allowClear` của `Input`; sẽ chuyển sang tự lưu (D-87) và lưới ảnh (D-82).
- `ui-web`: `Input`/`Textarea` có `allowClear`, `clearLabel`; `type="date"` có icon lịch bên trái (`atoms/field-adornments.tsx`); `SearchInput` (`clearable`); `Button` (`icon`, `visible`, `loading`); `IconButton`. Base UI 1.8.0 có `accordion`, `toggle-group`, `number-field`, `radio-group`.
- Lệnh ghi editor dùng `useWriteMutation` chung `mutationKey` và `scope: itinerary:{id}` (xếp hàng tuần tự); `SaveIndicator` đọc `useIsMutating` (D-30) — tự lưu metadata đi qua cùng cơ chế.
- `domain/calendar-date.ts` (`CalendarDate`), `domain/day-range.ts` (`buildDayRange`).

### Mở lại lần 2 (2026-11-05)
- Chưa có thư viện bản đồ nào trong repo; mọi version mới vào `catalog:` của `pnpm-workspace.yaml` và pin cứng.
- `EditorLayout` đã tách `canvas` (desktop) và `summary` (nền mobile sau sheet); bản đồ thế vào hai slot này, `TripSummary` giữ lại làm dự phòng (D-120).
- `DayTabs` hiện bắt đầu ở "Ngày 1" và ghi km dưới nhãn; tab Tổng quan thêm vào đầu (D-131, D-140). Lựa chọn ngày đang lưu ở state của editor (cần đổi kiểu thành "Tổng quan | số ngày").
- `WaypointFormDialog` hiện không có ô chọn ngày (cố ý); thêm ô chọn ngày chỉ khi mở từ Tổng quan (D-138).
- Danh mục 34 điểm đến là dữ liệu tĩnh ở `packages/itinerary` (`static-destination-catalog.ts`), chưa có tọa độ.
- `prefers-reduced-motion` đã được tôn trọng ở editor (UAT bước 23), bản đồ theo cùng quy tắc.

</code_context>

<specifics>
## Specific Ideas

- Bạn bè thường đã có sẵn link Google Maps chia sẻ từ app điện thoại, gần như luôn là link rút gọn. Vì vậy resolve `maps.app.goo.gl` là bắt buộc, không phải phần thêm.
- Tạo lịch trình phải nhanh bằng một chạm (tiêu đề điền sẵn, bôi đen), nhưng vẫn đặt tên ngay được.
- Bố cục Phase 4 phải là "bản đồ chưa lắp" chứ không phải bố cục tạm: Phase 5 chỉ thay canvas và nền sau sheet.
- Hành động phá hủy (xóa lịch trình, xuất bản không hoàn tác) luôn đặt focus mặc định ở "Hủy".
- Người dùng ưu tiên không mất dữ liệu: xóa thì tôn trọng ý định (flush khi rời trang), form đang mở thì khôi phục được sau khi hết phiên.

</specifics>

<deferred>
## Deferred Ideas

- Hộp chia sẻ sau khi xuất bản và nút "Chia sẻ" trong editor → Phase 5 (cùng PUB-04, D-40).
- Chuyển hướng người không phải chủ từ editor sang trang công khai → Phase 5 (D-45).
- Bấm thẻ đã xuất bản trong danh sách mở trang công khai → Phase 5 cân nhắc (D-07).
- Hiện số ngày/số điểm trên thẻ → khi BE sửa `Include` ở `/mine`.
- Ngày thực theo `startDate` (UX-03), khoảng cách từng chặng (UX-04), "Chuyển sang ngày…" (UX-07) → v2.
- Tìm địa điểm theo tên (MAP-01), chọn vị trí trên bản đồ (MAP-02) → v2.
- Đề xuất BE: endpoint xóa ngày, hủy xuất bản, chuyển waypoint sang ngày khác, `UpdatedAt` trong `ItinerarySummaryDto`, ETag/version.
- (Mở lại 2026-11-02) Cung cấp 34 ảnh bìa thật + bản ghi giấy phép (D-105, D-106) và thay ảnh giữ chỗ.
- (Mở lại 2026-10-30) Hiện điểm đến và sở thích trong editor/tóm tắt (D-76) và trên thẻ danh sách (D-78).
- Sửa điểm đến và sở thích sau khi tạo (D-77).
- Tải ảnh bìa lên (upload, cần kho lưu trữ) (D-81).
- Điểm đến ngoài Việt Nam (global), chọn nhiều điểm đến, chọn thẳng điểm du lịch (Đà Lạt, Phú Quốc...) thay vì tỉnh.
- Xếp hạng phổ biến theo thống kê BE thay bảng tĩnh (D-61).
- Dùng sở thích để lọc/gợi ý ở Discovery.
- ~~PUB-02 (chuyển từ Phase 5) và câu hỏi PUB-06: lập kế hoạch sau phần mở lại này.~~ Đã chốt 2026-11-05 (D-129): PUB-06 làm ở mở lại lần 2; PUB-02 về Phase 5.
- (Mở lại lần 2) Nút chuyển Bài viết/Bản đồ trên trang công khai → Phase 5 (PUB-02), dùng lại component bản đồ.
- (Mở lại lần 2) Ảnh Open Graph vẽ đường đi bằng `ImageResponse`/SVG, không dùng tile để tránh rủi ro biển đảo → Phase 5 (PUB-05).
- (Mở lại lần 2) Tìm POI theo tên qua Goong gọi từ BFF (cần đọc điều khoản lưu dữ liệu), dự phòng Photon/Nominatim; bấm bản đồ chọn vị trí → v2 (MAP-01, MAP-02).
- (Mở lại lần 2) Nét đứt nối điểm cuối ngày N sang điểm đầu ngày N+1; chuyển sang tab Danh sách/Bản đồ trên mobile thay sheet; sửa ngay ở tab Tổng quan (đã chọn chỉ xem); hiện điểm đến, sở thích, ngày kết thúc ở thông tin chung.

### Reviewed Todos (not folded)
Không có todo nào khớp với Phase 4.

</deferred>

---

*Phase: 04-itinerary-crud-editor*
*Context gathered: 2026-10-23*
*Context updated: 2026-10-30 (mở lại ITIN-02, ITIN-03)*
*Context updated: 2026-11-05 (mở lại lần 2: bản đồ MapLibre + OpenFreeMap trong editor, tab Tổng quan, PUB-06; D-111..D-140)*
