# Phase 4: Itinerary CRUD & Editor - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase này giao, cho người dùng đã đăng nhập và bằng API BE thật:

1. "Lịch trình của tôi" (`/itineraries/mine`): lưới thẻ, infinite scroll, lọc Tất cả/Nháp/Đã xuất bản, tạo nhanh, xóa (ITIN-01, 02, 12).
2. Editor `/itineraries/[id]/edit`: metadata (tiêu đề, mô tả, ngày khởi hành, ảnh bìa URL), tab ngày, thêm ngày, phụ đề ngày inline, thêm/sửa/xóa waypoint với undo 5 giây, kéo thả sắp xếp trong ngày, quãng đường theo ngày và tổng do BE tính, chỉ báo trạng thái lưu, cảnh báo rời trang (ITIN-03..10).
3. Xuất bản có xác nhận (ITIN-11, xem D-40 về hộp chia sẻ).
4. Chỉ chủ vào được editor; `canEdit` suy ra ở domain (ITIN-13).
5. Bố cục desktop hai vùng và mobile có bottom sheet nhiều mức cho timeline (ITIN-14).
6. Dựng đủ 4 tầng của `packages/itinerary` (domain, application, infrastructure, react) và composition `itinerary.client.ts` / `itinerary.server.ts`.

Nằm ngoài phase:
- Bản đồ SVG trong editor và trang công khai (PUB-02, PUB-06 → Phase 5). Phase 4 chỉ chừa vùng "canvas" để Phase 5 thay bằng bản đồ.
- Trang công khai `/itineraries/[id]`, copy link / Web Share / QR, **hộp chia sẻ sau khi xuất bản** (D-40 → Phase 5, cùng PUB-04).
- Tìm địa điểm theo tên (MAP-01), bấm lên bản đồ để chọn vị trí (MAP-02): v2.
- Kéo waypoint giữa các ngày, xóa/đổi thứ tự ngày, hủy xuất bản: BE không có endpoint.
- Ngày thực theo `startDate` (UX-03), khoảng cách từng chặng (UX-04), "Chuyển sang ngày…" (UX-07): v2.

</domain>

<decisions>
## Implementation Decisions

### Danh sách "Lịch trình của tôi" (ITIN-01, 12)
- **D-01:** Lưới thẻ có ảnh bìa: 1 cột trên mobile, 2 cột từ `sm`, 3 cột từ `lg`. Dùng `Card` của `ui-web`.
- **D-02:** **Infinite scroll**: tự tải trang kế khi cuộn gần cuối (IntersectionObserver), 12 mục mỗi trang (`pageSize=12`), dùng `useInfiniteQuery` theo `hasNextPage` của `PagedResult`. Có nút **"Tải thêm" dự phòng**, hiện khi lần tải tự động lỗi và dùng được bằng bàn phím/trình đọc màn hình, để không bị kẹt ở cuối trang. Lỗi tải trang kế không làm mất các trang đã có.
- **D-03:** Lọc bằng `Tabs` (Tất cả/Nháp/Đã xuất bản), **lưu trên URL** (`?status=all|draft|published`, map sang `isPublic` của BE). Reload và nút back giữ đúng tab. Giá trị lạ trên URL thì coi như "Tất cả".
- **D-04:** Mỗi thẻ: ảnh bìa (không có hoặc lỗi tải thì dùng nền dự phòng theo token), tiêu đề, badge "Nháp"/"Đã xuất bản", ngày khởi hành nếu có, tổng km (ẩn khi bằng 0). **Không hiện số ngày/số điểm** vì BE `/mine` trả `DaysCount`/`WaypointsCount` luôn bằng 0 (PITFALLS, thiếu `Include`). Ghi vào checklist phụ thuộc BE.
- **D-05:** Thứ tự theo BE (`UpdatedAt` giảm dần). FE không tự sắp lại.
- **D-06:** Xóa có ở **hai chỗ**: menu "⋯" trên thẻ (Mở, Xóa) và menu ⋯ trong editor. Dialog xác nhận dùng chung (D-42).
- **D-07:** Bấm thẻ thì vào `/itineraries/[id]/edit`, kể cả lịch trình đã xuất bản. Phase 5 có thể đổi đích cho thẻ đã xuất bản.
- **D-08:** Mỗi tab có empty state riêng. Tab "Tất cả" trống thì có CTA "Tạo lịch trình" (D-10). Loading dùng Skeleton dạng thẻ, lỗi dùng `ErrorState` có "Thử lại".

### Tạo nhanh (ITIN-02)
- **D-09:** Nút "Tạo lịch trình" mở `Dialog` có một ô tiêu đề, **điền sẵn "Chuyến đi mới" và bôi đen sẵn**. Enter là tạo. Validate 1–100 ký tự (theo validator BE), trim.
- **D-10:** Nút nằm ở đầu trang danh sách, cạnh tiêu đề "Lịch trình của tôi", và trong EmptyState. Không dùng FAB, không thêm lối tạo trên header.
- **D-11:** Tạo xong (`POST /itineraries` trả 201 kèm `ItineraryDetailDto`) thì chuyển thẳng tới `/itineraries/[id]/edit`, **không toast**. Editor mở ở Ngày 1 (BE tạo sẵn) có EmptyState hướng dẫn thêm điểm đầu tiên. Cache danh sách bị invalidate.
- **D-12:** Lúc đang gửi dùng lại mẫu Phase 3 (D-30, D-31 của Phase 3): nút đổi thành "Đang tạo…" kèm Spinner, `aria-busy`, chặn bấm lần hai. Sau khoảng 5 giây hiện dòng "Máy chủ đang khởi động, có thể mất tới 30 giây…". Lỗi hiện inline trong dialog (`errorToast: false`), lỗi có field thì gắn vào ô.

### Bố cục editor (ITIN-14)
- **D-13:** Desktop (từ `lg`) chia **hai vùng**. Bên trái là cột timeline rộng khoảng 400px: tab ngày, phụ đề, danh sách waypoint, nút thêm điểm. Bên phải là vùng **canvas**: Phase 4 hiện ảnh bìa lớn và tóm tắt chuyến đi (tiêu đề, mô tả, ngày khởi hành, tổng km, badge). Phase 5 thay canvas bằng bản đồ SVG, còn ảnh bìa và tóm tắt chuyển vào đầu cột trái. Cấu trúc component phải tách canvas thành một slot để Phase 5 thay mà không dựng lại.
- **D-14:** Mobile: ảnh bìa và tóm tắt nằm ở nửa trên làm nền. Timeline nằm trong `Sheet` **không modal** của `ui-web`, có 3 mức peek/medium/expanded. Nền vẫn tương tác được (Phase 1 đã có `disablePointerDismissal` cho sheet không modal). Phase 5 thay nền bằng bản đồ.
- **D-15:** Mở editor trên mobile thì sheet ở mức **medium**.
- **D-16:** Editor dùng **layout toàn màn**: **header riêng của editor thay AppHeader**, dính trên cùng. Header có nút back, tiêu đề rút gọn (ellipsis), chỉ báo trạng thái lưu (D-30), nút "Xuất bản" (D-38), menu ⋯ (Thông tin chuyến đi, Xóa lịch trình) và avatar UserMenu thu gọn. Trên mobile header giữ nguyên, không bị sheet che. Vẫn nằm trong `(dashboard)` để có gate. Cách tách layout (route group lồng hay layout riêng) do planner chốt theo docs Next 16.4.
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
- **D-24:** Dialog "Thông tin chuyến đi" có hai nút "Lưu" và "Hủy". Đang lưu thì nút loading và chặn gửi lần hai. Lưu xong đóng dialog, không toast. Lỗi field gắn vào ô theo mẫu Phase 3. Validate client bằng Zod theo validator BE: tiêu đề 1–100, mô tả ≤ 1000.
- **D-25:** Ảnh bìa: preview hiện ngay khi URL hợp lệ (debounce), **chỉ nhận `https://`**. Ảnh không tải được thì hiện nền dự phòng kèm dòng "Không tải được ảnh từ link này", **nhưng vẫn cho lưu**. Có nút xóa ảnh bìa. Dùng thẻ `<img>` thường (host tùy ý), không dùng `next/image` với `remotePatterns`; planner chốt chính sách `referrerPolicy`/CSP nếu cần.
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
- **D-41:** Editor của lịch trình đã xuất bản vẫn sửa đầy đủ được (BE không chặn). Header có dòng nhỏ "Thay đổi hiển thị ngay với người xem".
- **D-42:** Xóa lịch trình: dialog "Xóa lịch trình "{tên}"?" với nội dung "Thao tác này không hoàn tác được." Nếu đã xuất bản thì thêm câu "Link chia sẻ sẽ không còn mở được." Nút "Xóa" dùng variant danger, **focus mặc định ở "Hủy"**. Xóa trong editor thì về `/itineraries/mine` kèm toast "Đã xóa lịch trình". Xóa từ thẻ thì thẻ biến mất kèm cùng toast. Danh sách và chi tiết bị invalidate hoặc gỡ khỏi cache.
- **D-43:** Lịch trình đã xuất bản mà người dùng xóa hết waypoint: cho phép (BE cho phép), không cảnh báo thêm, undo 5 giây vẫn áp dụng.

### Route và quyền (ITIN-13)
- **D-44:** Route editor là `/itineraries/[id]/edit` trong `(dashboard)`, có gate đăng nhập sẵn (Phase 3 D-10). Path `/itineraries/[id]` để dành cho trang công khai Phase 5.
- **D-45:** Người không phải chủ mở editor của lịch trình đã xuất bản (BE trả 200) thì `canEdit(itinerary, viewerId)` (domain) bằng false, và trang hiện **403** "Bạn không có quyền sửa lịch trình này" kèm nút "Về Lịch trình của tôi". Editor chỉ dành cho chủ. Phase 5 đổi thành chuyển hướng sang trang công khai. Trang 403 tự render (không dùng `forbidden()` experimental), trừ khi researcher thấy Next 16.4 đã ổn định nó.
- **D-46:** Bản nháp của người khác (BE 403 `Itinerary.Forbidden`) thì hiện cùng trang 403. Id không đúng dạng GUID (`ItineraryId` của `shared-kernel` trả null) hoặc BE 404 thì dùng `not-found` sẵn có. Lỗi mạng hoặc 5xx thì dùng `ErrorState` có "Thử lại". **Bẫy (PITFALLS):** `GET /{id}` là AllowAnonymous, nên Bearer hết hạn khiến chủ nhận 403 với chính bản nháp của mình. Đường server (RSC) và đường BFF không được gửi Bearer stale; stale thì phải đi qua cơ chế hồi phục phiên của Phase 3 (D-24) trước khi kết luận 403.
- **D-47:** Nút back của editor: vào từ danh sách thì quay lại đúng trang danh sách cũ (giữ tab lọc trên URL và vị trí cuộn nhờ cache infinite query). Mở thẳng từ URL thì về `/itineraries/mine`.

### Claude's Discretion
- Hình dạng 4 tầng của `packages/itinerary`: tên type, use case, port, Zod DTO (`z.iso.datetime({ offset: true })`, `z.iso.date()`), mapper ACL, query key, `createItineraryHooks`.
- Dữ liệu editor lấy bằng RSC prefetch kèm hydrate React Query hay chỉ fetch ở client có skeleton. Chọn theo `cacheComponents` và bẫy Bearer stale ở D-46.
- Optimistic cho thêm/sửa waypoint (ngoài reorder và xóa) hay chờ BE trả về rồi refetch.
- Debounce refetch sau chuỗi reorder liên tiếp (PITFALLS, mục hiệu năng).
- Tên và vị trí route handler resolve link rút gọn (ví dụ `/api/maps/resolve`), thời gian timeout, số bước redirect tối đa.
- Copy phụ chưa chốt (tiêu đề trang, nhãn menu, empty state từng tab, thông báo lỗi parse vị trí), miễn theo giọng copy Phase 1 và Phase 3. Nên chạy `/gsd-ui-phase 4` để chốt UI-SPEC.
- Ngưỡng "gần cuối" của infinite scroll, ngưỡng nhấn giữ cảm ứng trong khoảng 150–200ms.

</decisions>

<canonical_refs>
## Canonical References

**Agent ở bước sau BẮT BUỘC đọc các tài liệu này trước khi plan hoặc triển khai.**

### Phạm vi và tiêu chí
- `.planning/ROADMAP.md` §Phase 4: goal, 5 success criteria (tiêu chí 4 đã ghi chú theo D-40), research flag (parse link Google Maps, dnd-kit với React 19 StrictMode, `CalendarDate`, mapper ngày thưa).
- `.planning/REQUIREMENTS.md`: ITIN-01..14 (ITIN-11 có ghi chú D-40); Out of Scope (kéo giữa các ngày, xóa/đổi thứ tự ngày, hủy xuất bản).
- `.planning/PROJECT.md` §Constraints, §Key Decisions: nhập vị trí chỉ bằng ô dán, giữ bản đồ SVG, không dựng mock, BE là nguồn sự thật.

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

### FE cũ (tham khảo UX, không port code mock)
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

### Reviewed Todos (not folded)
Không có todo nào khớp với Phase 4.

</deferred>

---

*Phase: 04-itinerary-crud-editor*
*Context gathered: 2026-10-23*
