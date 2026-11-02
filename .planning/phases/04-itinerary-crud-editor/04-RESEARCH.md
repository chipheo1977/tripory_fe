# Phase 4: Itinerary CRUD & Editor - Research

**Researched:** 2026-10-24
**Domain:** Bounded context `itinerary` đủ 4 tầng trên Next.js 16.4 (Cache Components, Activity), TanStack Query 5.104 (infinite, optimistic, `scope`), dnd-kit, parse/resolve link Google Maps, xóa hoãn có hoàn tác, chặn rời trang, sửa token Tailwind 4.3
**Confidence:** HIGH cho contract BE (đọc code C# nhánh `feat/be-fe-integration-group-a`). HIGH cho hành vi Next 16.4 (docs cục bộ), Zod 4.6.7, Tailwind 4.3.3, Sonner 2.0.8, TanStack 5.104.2 (chạy thử hoặc đọc mã trong `node_modules`). HIGH cho hành vi link rút gọn Google Maps (gọi thật ngày 2026-10-24). MEDIUM cho dnd-kit trên React 19.3 (không có tuyên bố hỗ trợ chính thức, typecheck nhờ `skipLibCheck`), Base UI Drawer khi kéo thả trong sheet.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Danh sách "Lịch trình của tôi" (ITIN-01, 12)
- **D-01:** Lưới thẻ có ảnh bìa: 1 cột trên mobile, 2 cột từ `sm`, 3 cột từ `lg`. Dùng `Card` của `ui-web`.
- **D-02:** **Chỉ infinite scroll, không có nút "Tải thêm"** (người dùng chốt). Tự tải trang kế khi cuộn gần cuối (IntersectionObserver trên phần tử sentinel), 12 mục mỗi trang (`pageSize=12`), dùng `useInfiniteQuery` theo `hasNextPage` của `PagedResult`. Đang tải trang kế thì hiện Skeleton thẻ ở cuối lưới. Hết trang thì không hiện gì thêm. **Lỗi khi tải trang kế: không hiện nút hay thông báo lỗi nào ở cuối lưới** (người dùng chốt). Các trang đã có giữ nguyên, skeleton cuối lưới tắt. Lần sau sentinel lọt vào viewport (người dùng cuộn chạm lại cuối) thì tự gọi `fetchNextPage` lần nữa. Đây là ngoại lệ có chủ đích so với FND-04, chỉ áp dụng cho trang kế. Lỗi ở trang đầu vẫn dùng `ErrorState` có "Thử lại" (D-08).
- **D-03:** Lọc bằng `Tabs` (Tất cả/Nháp/Đã xuất bản), **lưu trên URL** (`?status=all|draft|published`, map sang `isPublic` của BE). Reload và nút back giữ đúng tab. Giá trị lạ trên URL thì coi như "Tất cả".
- **D-04:** Mỗi thẻ: ảnh bìa (không có hoặc lỗi tải thì dùng nền dự phòng theo token), tiêu đề, badge "Nháp"/"Đã xuất bản", ngày khởi hành nếu có, tổng km (ẩn khi bằng 0). **Không hiện số ngày/số điểm** vì BE `/mine` trả `DaysCount`/`WaypointsCount` luôn bằng 0 (PITFALLS, thiếu `Include`). Ghi vào checklist phụ thuộc BE.
- **D-05:** Thứ tự theo BE (`UpdatedAt` giảm dần). FE không tự sắp lại.
- **D-06:** Xóa có ở **hai chỗ**: menu "⋯" trên thẻ (Mở, Xóa) và menu ⋯ trong editor. Dialog xác nhận dùng chung (D-42).
- **D-07:** Bấm thẻ thì vào `/itineraries/[id]/edit`, kể cả lịch trình đã xuất bản. Phase 5 có thể đổi đích cho thẻ đã xuất bản.
- **D-08:** Mỗi tab có empty state riêng. Tab "Tất cả" trống thì có CTA "Tạo lịch trình" (D-10). Loading dùng Skeleton dạng thẻ, lỗi dùng `ErrorState` có "Thử lại".

#### Tạo nhanh (ITIN-02)
- **D-09:** Nút "Tạo lịch trình" mở `Dialog` có một ô tiêu đề, **điền sẵn "Chuyến đi mới" và bôi đen sẵn**. Enter là tạo. Validate 1–100 ký tự (theo validator BE), trim.
- **D-10:** Nút nằm ở đầu trang danh sách, cạnh tiêu đề "Lịch trình của tôi", và trong EmptyState. Không dùng FAB, không thêm lối tạo trên header.
- **D-11:** Tạo xong (`POST /itineraries` trả 201 kèm `ItineraryDetailDto`) thì chuyển thẳng tới `/itineraries/[id]/edit`, **không toast**. Editor mở ở Ngày 1 (BE tạo sẵn) có EmptyState hướng dẫn thêm điểm đầu tiên. Cache danh sách bị invalidate.
- **D-12:** Lúc đang gửi dùng lại mẫu Phase 3 (D-30, D-31 của Phase 3): nút đổi thành "Đang tạo…" kèm Spinner, `aria-busy`, chặn bấm lần hai. Sau khoảng 5 giây hiện dòng "Máy chủ đang khởi động, có thể mất tới 30 giây…". Lỗi hiện inline trong dialog (`errorToast: false`), lỗi có field thì gắn vào ô.

#### Bố cục editor (ITIN-14)
- **D-13:** Desktop (từ `lg`) chia **hai vùng**. Bên trái là cột timeline rộng khoảng 400px: tab ngày, phụ đề, danh sách waypoint, nút thêm điểm. Bên phải là vùng **canvas**: Phase 4 hiện ảnh bìa lớn và tóm tắt chuyến đi (tiêu đề, mô tả, ngày khởi hành, tổng km, badge). Phase 5 thay canvas bằng bản đồ SVG, còn ảnh bìa và tóm tắt chuyển vào đầu cột trái. Cấu trúc component phải tách canvas thành một slot để Phase 5 thay mà không dựng lại.
- **D-14:** Mobile: ảnh bìa và tóm tắt nằm ở nửa trên làm nền. Timeline nằm trong `Sheet` **không modal** của `ui-web`, có 3 mức peek/medium/expanded. Nền vẫn tương tác được (Phase 1 đã có `disablePointerDismissal` cho sheet không modal). Phase 5 thay nền bằng bản đồ.
- **D-15:** Mở editor trên mobile thì sheet ở mức **medium**.
- **D-16:** Editor dùng **layout toàn màn**: **header riêng của editor thay AppHeader**, dính trên cùng. Header có nút back, tiêu đề rút gọn (ellipsis), chỉ báo trạng thái lưu (D-30), nút "Xuất bản" (D-38), menu ⋯ (Thông tin chuyến đi, Xóa lịch trình) và avatar UserMenu thu gọn. Trên mobile header giữ nguyên, không bị sheet che. Vẫn nằm trong `(dashboard)` để có gate. Cách tách layout (route group lồng hay layout riêng) do planner chốt theo docs Next 16.4.
- **D-17:** Sửa metadata trong dialog **"Thông tin chuyến đi"** (desktop là `Dialog`, mobile là `Sheet` modal), mở từ menu ⋯ hoặc khi bấm vào vùng tóm tắt/canvas.

#### Form waypoint và nhập vị trí (ITIN-05, 06)
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

#### Cách lưu metadata và ngày (ITIN-03, 04, 09, 10)
- **D-24:** Dialog "Thông tin chuyến đi" có hai nút "Lưu" và "Hủy". Đang lưu thì nút loading và chặn gửi lần hai. Lưu xong đóng dialog, không toast. Lỗi field gắn vào ô theo mẫu Phase 3. Validate client bằng Zod theo validator BE: tiêu đề 1–100, mô tả ≤ 1000.
- **D-25:** Ảnh bìa: preview hiện ngay khi URL hợp lệ (debounce), **chỉ nhận `https://`**. Ảnh không tải được thì hiện nền dự phòng kèm dòng "Không tải được ảnh từ link này", **nhưng vẫn cho lưu**. Có nút xóa ảnh bìa. Dùng thẻ `<img>` thường (host tùy ý), không dùng `next/image` với `remotePatterns`; planner chốt chính sách `referrerPolicy`/CSP nếu cần.
- **D-26:** Ngày khởi hành dùng `<input type="date">` gốc của trình duyệt, xóa được (để trống thì gửi `null`). Giá trị giữ bằng value object `CalendarDate` (`YYYY-MM-DD`, không qua `new Date()` local; PITFALLS). Không hiện ngày thực theo từng ngày (UX-03, v2).
- **D-27:** "Thêm ngày" **lưu lên BE ngay** bằng `PUT /itineraries/{id}/days/{max+1}/subtitle` với `subtitle: null`. Đã kiểm code BE: `SetDaySubtitle` gọi `GetOrCreateDay`, nên ngày được tạo thật và reload vẫn còn. Ngày mới được chọn ngay. **Ngày đã thêm không xóa được** (BE không có endpoint); không thêm xác nhận. Researcher kiểm giới hạn `InvalidDayNumber` của BE (dayNumber tối đa?).
- **D-28:** Tab ngày **luôn vẽ đủ dải từ Ngày 1 tới ngày lớn nhất**; ngày thiếu trong DTO (ngày thưa) hiện như ngày trống. Mapper ACL sắp `days` theo `dayNumber` và `waypoints` theo `(dayNumber, orderIndex)` vì BE không `OrderBy`. Mỗi tab hiện "Ngày N" và km của ngày (`dayDistanceKm`, nếu có). Thanh tab cuộn ngang trên mobile, nút "+ Thêm ngày" nằm cuối thanh. Tổng km (`totalDistanceKm`) hiện ở vùng tóm tắt. Km luôn lấy số của BE sau refetch; FE không tự tính rồi coi là số thật.
- **D-29:** Phụ đề ngày hiện dưới tab đang chọn, placeholder "Thêm phụ đề cho ngày này". Bấm vào thì thành ô nhập. Enter hoặc blur để lưu, Esc để hủy, để trống là xóa phụ đề (gửi `null`). Tối đa 100 ký tự (validator BE).
- **D-30:** Chỉ báo lưu trên header editor có 3 trạng thái: "Đang lưu…" (còn mutation đang chạy), "Đã lưu", "Lỗi – Thử lại". Chỉ báo có `aria-live="polite"`. Thao tác nền (phụ đề, reorder, xóa, thêm ngày) lỗi thì chỉ báo chuyển sang "Lỗi – Thử lại" kèm toast lỗi theo chính sách Phase 2. Bấm "Thử lại" là **gửi lại đúng thao tác đã lỗi**. Lỗi trong form (thêm/sửa waypoint, metadata) hiện trong form và form vẫn mở. Theo dõi trạng thái lưu bằng `useMutationState`/`useIsMutating` hay cơ chế khác do planner chốt.

#### Undo khi xóa và an toàn dữ liệu (ITIN-07, 08, 10)
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

#### Xuất bản (ITIN-11)
- **D-38:** Nút "Xuất bản" khi chưa có waypoint nào: **không dùng `disabled` thật** mà dùng `aria-disabled` (vẫn focus được). Bấm hoặc focus thì giải thích "Thêm ít nhất 1 điểm đến để xuất bản": tooltip trên desktop, dòng chữ trên mobile. `canPublish` (≥ 1 waypoint, không tính waypoint đang chờ xóa) là luật domain. BE `CannotPublishEmpty` vẫn được map nếu lọt qua.
- **D-39:** Hộp xác nhận: tiêu đề "Xuất bản lịch trình?", nội dung "Ai có link đều xem được lịch trình này. Bạn vẫn sửa được nội dung sau khi xuất bản, nhưng không thể chuyển lại về nháp." Hai nút "Xuất bản" và "Hủy", **focus mặc định ở "Hủy"**.
- **D-40:** **Hộp chia sẻ sau khi xuất bản chuyển sang Phase 5** (người dùng chọn, lệch chữ của ITIN-11 và tiêu chí 4). Lý do: trang công khai chưa có nên link chia sẻ sẽ là 404. Xuất bản xong ở Phase 4 thì có toast thành công "Đã xuất bản lịch trình", badge đổi thành "Đã xuất bản", nút "Xuất bản" biến mất. Phase 5 thêm nút "Chia sẻ" và mở sẵn hộp chia sẻ sau khi xuất bản (cùng PUB-04). ROADMAP §Phase 4 tiêu chí 4 và ITIN-11 trong REQUIREMENTS đã được ghi chú.
- **D-41:** Editor của lịch trình đã xuất bản vẫn sửa đầy đủ được (BE không chặn). Header có dòng nhỏ "Thay đổi hiển thị ngay với người xem".
- **D-42:** Xóa lịch trình: dialog "Xóa lịch trình "{tên}"?" với nội dung "Thao tác này không hoàn tác được." Nếu đã xuất bản thì thêm câu "Link chia sẻ sẽ không còn mở được." Nút "Xóa" dùng variant danger, **focus mặc định ở "Hủy"**. Xóa trong editor thì về `/itineraries/mine` kèm toast "Đã xóa lịch trình". Xóa từ thẻ thì thẻ biến mất kèm cùng toast. Danh sách và chi tiết bị invalidate hoặc gỡ khỏi cache.
- **D-43:** Lịch trình đã xuất bản mà người dùng xóa hết waypoint: cho phép (BE cho phép), không cảnh báo thêm, undo 5 giây vẫn áp dụng.

#### Route và quyền (ITIN-13)
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

### Deferred Ideas (OUT OF SCOPE)
- Hộp chia sẻ sau khi xuất bản và nút "Chia sẻ" trong editor → Phase 5 (cùng PUB-04, D-40).
- Chuyển hướng người không phải chủ từ editor sang trang công khai → Phase 5 (D-45).
- Bấm thẻ đã xuất bản trong danh sách mở trang công khai → Phase 5 cân nhắc (D-07).
- Hiện số ngày/số điểm trên thẻ → khi BE sửa `Include` ở `/mine`.
- Ngày thực theo `startDate` (UX-03), khoảng cách từng chặng (UX-04), "Chuyển sang ngày…" (UX-07) → v2.
- Tìm địa điểm theo tên (MAP-01), chọn vị trí trên bản đồ (MAP-02) → v2.
- Đề xuất BE: endpoint xóa ngày, hủy xuất bản, chuyển waypoint sang ngày khác, `UpdatedAt` trong `ItinerarySummaryDto`, ETag/version.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ITIN-01 | "Lịch trình của tôi" có phân trang và lọc Tất cả/Nháp/Đã xuất bản | §Contract BE (`GET /mine?pageIndex&pageSize&isPublic`, `PagedResult.hasNextPage`), Pattern 6 (infinite + sentinel + lỗi trang kế im lặng), Pitfall 6 (offset trôi khi sắp theo `UpdatedAt`) |
| ITIN-02 | Tạo nhanh bằng tiêu đề, vào thẳng editor | §Contract BE (201 + `ItineraryDetailDto`; BFF bỏ header `Location` nên dùng `data.id`), Pattern 2 (hook factory) |
| ITIN-03 | Sửa metadata, ảnh bìa URL có preview | §Contract BE (`PUT /{id}` thay toàn bộ 4 trường; `coverImageUrl` chỉ giới hạn 500 ở cột DB), Pattern 3 (`CalendarDate`), §Security (ảnh bìa) |
| ITIN-04 | Tab ngày, thêm ngày, phụ đề inline | Pattern 4 (mapper ngày thưa), §Contract BE (`dayNumber` chỉ chặn < 1, không có trần; `SetSubtitle` trim, không tính lại km) |
| ITIN-05 | Thêm waypoint, dán tọa độ hoặc link Google Maps | Pattern 7 (bảng mẫu URL + thứ tự ưu tiên), Pattern 8 (route resolve link rút gọn), Pitfall 1 (link rút gọn của địa điểm **không có tọa độ**) |
| ITIN-06 | Sửa waypoint | §Contract BE (`PUT /waypoints/{wid}` thay toàn bộ, không đổi ngày) |
| ITIN-07 | Xóa waypoint, hoàn tác 5 giây | Pattern 9 (pending-delete controller), Pattern 10 (`notify.undoable` với Sonner `duration: Infinity`), Pattern 11 (`keepalive` qua BFF) |
| ITIN-08 | Kéo thả chuột/cảm ứng/bàn phím, optimistic + rollback | Pattern 12 (dnd-kit 6.3.1 + `MouseSensor`/`TouchSensor`/`KeyboardSensor`), Pattern 5 (`scope` tuần tự hóa, `onMutate` snapshot) |
| ITIN-09 | Km theo ngày và tổng do BE tính | §Contract BE (`RecalculateDistances` sau add/update/delete/reorder, không sau subtitle), Pattern 5 (invalidate khi mutation cuối cùng xong) |
| ITIN-10 | Trạng thái lưu, cảnh báo rời trang | Pattern 13 (SaveIndicator theo `mutationKey`), Pattern 14 (`beforeunload` + `Link onNavigate`; Next 16.4 không có navigation guard) |
| ITIN-11 | Xuất bản khi ≥ 1 waypoint, xác nhận không hủy được (hộp chia sẻ → Phase 5) | §Contract BE (`PUT /publish`, `CannotPublishEmpty`), domain `canPublish(itinerary, pendingDeleteIds)` |
| ITIN-12 | Xóa lịch trình sau khi xác nhận | §Contract BE (`DELETE /{id}` xóa mềm, 200), Pattern 2 (gỡ detail khỏi cache + invalidate list) |
| ITIN-13 | Người không phải chủ không thấy thao tác sửa | Pattern 1 (client fetch qua BFF, 401 stale → refresh → phát lại), domain `canEdit`, `EditorForbidden` |
| ITIN-14 | Editor dùng được trên mobile với bottom sheet nhiều mức | Pattern 15 (route group lồng cho layout toàn màn), Pattern 16 (Sheet `dismissible`/`defaultSnap`/`insetTop`), Pitfall 8 (dnd-kit trong Drawer có transform) |
</phase_requirements>

## Summary

Phase này dựng context `itinerary` đầy đủ bốn tầng theo đúng khuôn của `packages/identity` (Zod DTO + mapper ACL ở `infrastructure`, port ở `application`, `createItineraryHooks(deps)` ở `react`), lắp một lần trong `apps/web/src/composition/itinerary.client.ts` qua `bffHttp`. Editor nên **chỉ fetch ở client** qua BFF chứ không prefetch RSC: BFF đã trả 401 `session.expired` khi access stale mà không gọi BE, `withSessionRefresh` refresh rồi phát lại, nên bẫy "chủ nhận 403 với bản nháp của mình" (D-46) tự được xử lý mà không cần thêm cơ chế nào. Server Component của trang chỉ kiểm GUID (`notFound()`), đọc `getViewer()` để truyền `viewerId` cho `canEdit`.

Ba phát hiện thay đổi cách plan. (1) **Link rút gọn `maps.app.goo.gl` của một địa điểm (POI) chia sẻ từ app điện thoại redirect tới `/maps/place/<tên>/data=!4m2!3m1!1s<featureId>` không có tọa độ nào**, và HTML đích cũng không chứa tọa độ (đã gọi thật). Link ghim thả tay thì có (`/maps/search/lat,+lng`). Vậy route resolve chỉ cứu được một phần link rút gọn; với link POI, FE chỉ lấy được tên. Đây là giới hạn cứng nếu không dùng API của Google. (2) Với `cacheComponents: true`, **Next 16.4 không unmount trang khi điều hướng mà ẩn bằng React `<Activity>`** (giữ tối đa 3 route). Effect cleanup vẫn chạy khi trang bị ẩn, nên "flush khi rời route" (D-32) đặt trong cleanup của `useEffect` là đúng; còn vị trí cuộn và tab của danh sách (D-47) được giữ sẵn khi `router.back()`. (3) **Next 16.4 không có navigation guard**: chỉ có `Link onNavigate` với `e.preventDefault()`. Nút back của trình duyệt trong SPA không chặn được; bù lại, điều hướng SPA không hủy request đang chạy.

Wave 0 phải sửa token: Tailwind 4.3.3 lấy màu cho `text-*` theo `['--text-color', '--color']` và z-index theo `--z-index-*` (đã đọc mã và biên dịch thử). Thêm `--text-color-{muted,subtle,disabled}` và `--z-index-{base,sticky,dropdown,overlay,modal,toast}` vào `@theme inline` làm `text-muted`… có CSS thật mà không sinh `bg-muted`; đổi `z-(--z-*)` thành `z-*`. Biên dịch thử còn lộ thêm `max-w-(--size-content-sm)` trong `SheetContent` trỏ tới biến không tồn tại. Guard test nên kiểm mọi `var(--x)` trong CSS sinh ra phải được khai báo trong `design-tokens`.

**Primary recommendation:** Client-fetch editor qua BFF + hook factory một lần; mọi lệnh ghi dùng chung `mutationKey: ['itinerary','write',id]` và `scope: { id: 'itinerary:'+id }` để tuần tự hóa (DELETE trước reorder tự động đúng D-33) và để SaveIndicator/cảnh báo rời trang đọc từ một nguồn; dnd-kit 6.3.1 chỉ ở `apps/web/src/modules/itinerary/ui`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Gate đăng nhập route editor | Frontend Server (proxy + layout gate) | Browser (`SessionRecovery`) | Proxy lạc quan theo cookie; gate `(dashboard)` xử lý stale (Phase 3 D-24). Phải thêm pattern `/itineraries/{id}/edit` vào proxy |
| Kiểm GUID `[id]` | Frontend Server (page RSC) | — | Rẻ, trả `notFound()` trước khi tải JS editor |
| Tải danh sách / chi tiết | Browser (TanStack Query qua BFF) | API (BE) | BFF chặn Bearer stale; editor tương tác cao, không cần SEO |
| `canEdit`, `canPublish`, dải ngày, sắp xếp | Browser (domain thuần của package) | — | Luật phục vụ UI; BE chỉ trả 403 |
| Parse "lat, lng" / URL Google Maps | Browser (domain thuần) | — | D-20, test bảng mẫu, không cần mạng |
| Resolve link rút gọn | Frontend Server (route handler) | — | Trình duyệt không đọc được `Location` của redirect cross-origin (CORS) |
| Quãng đường km | API (BE `RecalculateDistances`) | Browser (chỉ hiển thị) | D-28: số thật luôn của BE |
| Hoãn DELETE, hoàn tác, flush khi rời trang | Browser (controller ở app) | Frontend Server (BFF, `keepalive`) | Cần `window`, timer, `notify` |
| Kéo thả | Browser (dnd-kit ở app) | — | Cần DOM; package `react` cấm DOM |
| Bản nháp form khi hết phiên | Browser (`sessionStorage` adapter ở app) | — | D-36 |
| Token CSS (`text-muted`, `z-*`) | CDN/Static (CSS build) | — | `@theme inline` của `design-tokens` |

## Standard Stack

### Core (đã có trong catalog)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | 5.104.2 | Infinite query, optimistic, `scope`, `useIsMutating`/`useMutationState` | Đã pin Phase 3; `scope` và `isFetchNextPageError` có trong bản này [VERIFIED: đọc `query-core` 5.104.2 .d.ts] |
| `zod` | 4.6.7 | DTO ACL, schema form | `z.iso.date()` chặn `2026-02-29`, nhận `2024-02-29`; `z.iso.datetime({ offset: true })` nhận `…08.8812345+00:00` của .NET, từ chối chuỗi không offset [VERIFIED: chạy thử 4.6.7] |
| `react-hook-form` + `@hookform/resolvers` | 7.89.0 / 5.9.1 | Form waypoint, metadata, tạo nhanh | Mẫu Phase 3 |
| `@base-ui/react` | 1.8.0 | Drawer (Sheet), Dialog, Tabs, Menu, Tooltip | Có `snapPoints` px/tỉ lệ, `onOpenChange(open, eventDetails)` với `reason` (`swipe`, `escape-key`…) và `cancel()`, thuộc tính `data-base-ui-swipe-ignore` [VERIFIED: đọc .d.ts và `internals/constants.js`] |
| `sonner` | 2.0.8 | Toast hoàn tác | `duration === Infinity` thì không đặt timer; `onDismiss` gọi khi bấm nút đóng, vuốt bỏ, và khi `toast.dismiss(id)`; bấm action không gọi `onDismiss` [VERIFIED: đọc `dist/index.mjs`] |
| `tailwindcss` / `@tailwindcss/node` | 4.3.3 | Utility + test biên dịch | Xem Pattern 17 |

### Mới (thêm vào `catalog:`, pin cứng, chỉ `apps/web` dùng)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/core` | 6.3.1 (2024-12-05) | `DndContext`, sensor, `DragOverlay`, accessibility | Bản ổn định cuối; peer `react >=16.8.0` [VERIFIED: npm registry] |
| `@dnd-kit/sortable` | 10.0.0 | `SortableContext`, `useSortable`, `sortableKeyboardCoordinates`, `arrayMove` | Peer `@dnd-kit/core ^6.3.0` [VERIFIED: npm registry] |
| `@dnd-kit/utilities` | 3.2.2 | `CSS.Transform.toString` | Dependency của sortable, khai báo trực tiếp vì app import [VERIFIED: npm registry] |
| `@dnd-kit/modifiers` | 9.0.0 | `restrictToVerticalAxis`, `restrictToFirstScrollableAncestor` | Peer `@dnd-kit/core ^6.3.0` [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/core` 6.3.1 | `@dnd-kit/react` 0.5.1 (2026-10-15, peer `react ^18 \|\| ^19`) | API mới, viết cho React 19, nhưng vẫn 0.x và còn ra bản beta liên tục (nhiều bản `0.5.1-beta-*` trong tháng 10/2026) [VERIFIED: npm registry]. FE cũ và research Phase 0 đã dùng bộ 6.x. Chọn 6.3.1 |
| Client fetch editor | RSC prefetch + `HydrationBoundary` (docs Next 16.4 có mẫu dehydrate pending query) | Phải dựng `QueryClient` server mỗi request (Phase 3 cố ý không có, T-03-25), map 403/404 hai nơi, token phải fresh ở server. Lợi ích nhỏ vì editor không cần SEO |
| Route resolve chỉ theo redirect | Tải HTML đích để tìm tọa độ | Đã thử: HTML không chứa tọa độ của POI (chỉ có `center=` theo IP người gọi). Vi phạm D-20 và ToS. Không làm |

**Installation:**
```bash
# pnpm-workspace.yaml → catalog: thêm 4 dòng pin cứng, rồi:
pnpm --filter @tripory/web add @dnd-kit/core@catalog: @dnd-kit/sortable@catalog: @dnd-kit/utilities@catalog: @dnd-kit/modifiers@catalog:
pnpm --filter @tripory/itinerary add zod@catalog:
pnpm --filter @tripory/itinerary add -D react@catalog: @types/react@catalog: @tanstack/react-query@catalog:
# và thêm peerDependencies react, @tanstack/react-query vào packages/itinerary/package.json (khuôn identity)
```

## Contract BE (đọc code, 2026-10-24)

Gốc: `tripory_be/src/Services/Tripory/`. Controller `[Authorize]` toàn lớp, riêng `GET /{id}` là `[AllowAnonymous]`. JSON camelCase, envelope `ApiResponse` như Phase 2/3.

| Endpoint | Body | `data` khi thành công | Lỗi chính |
|---|---|---|---|
| `POST /itineraries` | `{ title }` | `ItineraryDetailDto`, **201** + `Location` (BFF bỏ `location`) | `NotEmptyValidator`, `MaximumLengthValidator`, `ItineraryTitle.Empty/TooLong` |
| `GET /itineraries/mine?pageIndex&pageSize&isPublic` | — | `PagedResult<ItinerarySummaryDto>` | `pageIndex ≥ 1`, `pageSize 1–100` |
| `GET /itineraries/{id:guid}` | — | `ItineraryDetailDto` | 404 `Itinerary.NotFound`; 403 `Itinerary.Forbidden` khi nháp và không phải chủ **hoặc không có user** (Bearer stale bị coi là ẩn danh) |
| `PUT /itineraries/{id}` | `{ title, description?, startDate?, coverImageUrl? }` | `null` | Validator: title 1–100, description ≤ 1000. **Không validate `coverImageUrl`/`startDate`** |
| `PUT /itineraries/{id}/publish` | — | `null` | `Itinerary.CannotPublishEmpty` (400) |
| `DELETE /itineraries/{id}` | — | `null` | Xóa mềm (`HasQueryFilter(!IsDeleted)`) |
| `POST /itineraries/{id}/waypoints` | `{ dayNumber, name, address?, longitude, latitude, notes? }` | `WaypointDto` (200, không phải 201) | `dayNumber > 0`, name 1–200, lat/lng khoảng đóng; `Coordinate.InvalidLatitude/InvalidLongitude` |
| `PUT /itineraries/{id}/waypoints/{wid}` | `{ name, address?, longitude, latitude, notes? }` | `null` | `Waypoint.NotFound` |
| `DELETE /itineraries/{id}/waypoints/{wid}` | — | `null` | `Waypoint.NotFound`; BE chuẩn hóa lại `orderIndex` 0..N-1 của ngày |
| `PUT /itineraries/{id}/days/{n:int}/reorder-waypoints` | `{ orderedWaypointIds }` | `null` | `NotEmptyValidator` khi mảng rỗng; `Itinerary.InvalidReorderList` khi số lượng/tập ID lệch |
| `PUT /itineraries/{id}/days/{n:int}/subtitle` | `{ subtitle }` | `null` | `n > 0`; subtitle ≤ 100 khi không rỗng |

Nguồn: `ItinerariesController.cs`, `Validators/*.cs`, `Itinerary.cs`, `ItineraryDay.cs`, `Waypoint.cs`, `Persistence/Configurations/*.cs`, `ItineraryRepository.cs`, `ItineraryRepositoryExtensions.cs` [VERIFIED: đọc code].

Chi tiết ảnh hưởng plan:
- **DTO:** `ItineraryDetailDto { id, userId, title, description?, coverImageUrl?, startDate? (DateOnly), isPublic, totalDistanceKm, createdAt, updatedAt (DateTimeOffset), days[], waypoints[] }`; `ItineraryDayDto { id, dayNumber, subtitle?, dayDistanceKm? }`; `WaypointDto { id, dayNumber, orderIndex, name, address?, longitude, latitude, notes? }` (longitude đứng trước); `ItinerarySummaryDto` có `daysCount`/`waypointsCount` (luôn 0, bỏ qua) và `createdAt`, **không có `updatedAt`**; `PagedResult { items, pageIndex, pageSize, totalCount, totalPages, hasNextPage, hasPreviousPage }`.
- **Giới hạn độ dài thật:** tên waypoint ≤ 200 (validator + `WaypointName.MaxLength`), địa chỉ ≤ 500 và ghi chú ≤ 2000 **chỉ ở cột DB** (`HasMaxLength`), ảnh bìa ≤ 500 **chỉ ở cột DB**. Vượt các giới hạn chỉ-ở-DB sẽ thành lỗi DB (5xx) chứ không phải 400 có mã, nên Zod phía FE là lớp chặn duy nhất cho chúng. UI-SPEC đã ghi đúng 500/2000/500.
- **Trim:** BE trim tên, địa chỉ, ghi chú, phụ đề, tiêu đề, mô tả. Mô tả chỉ có khoảng trắng → `null`. Phụ đề `""` được lưu là `""` (không phải `null`), nên FE gửi `null` khi rỗng (D-29) và mapper coi `""` như không có phụ đề.
- **`dayNumber`:** chỉ chặn `< 1` (`InvalidDayNumber`), không có trần (trả lời câu hỏi D-27). `AddWaypoint` cũng gọi `GetOrCreateDay`, nên thêm điểm vào ngày chưa có cũng tạo ngày.
- **Km:** `RecalculateDistances` chạy sau add/update/delete/reorder waypoint, **không** chạy sau `SetDaySubtitle`. Ngày mới thêm có `dayDistanceKm = 0`. Entity giữ `double` không null, DTO khai báo `double?`.
- **Thứ tự:** `ToDetailDto` không `OrderBy` (đúng D-28). `/mine` sắp `UpdatedAt` giảm dần, và mọi thao tác ghi (kể cả tính lại km) đều cập nhật `UpdatedAt`.
- **Quyền khi ghi:** `GetOwnedItineraryAsync` trả `Auth.Unauthorized` khi không có user, `Itinerary.NotFound`, `Itinerary.Forbidden`.
- **Lỗi mới cần map:** `Coordinate.InvalidLatitude`, `Coordinate.InvalidLongitude` (message BE có giới hạn động → để nguyên message BE theo quy ước `error-messages.ts`), `ItineraryTitle.TooLong`, `ItineraryDescription.TooLong`, `WaypointName.TooLong` (cũng có giới hạn động).

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────── Browser ─────────────────────────────────────────────┐
 URL /itineraries/mine ─▶│ MyItinerariesView ── useInfiniteQuery(list(status)) ──┐               │
   ?status=…             │   sentinel (IntersectionObserver) → fetchNextPage       │               │
                         │                                                        ▼               │
 URL /itineraries/{id}/  │ EditorPage(RSC) ─ GUID? ─no─▶ notFound()        itinerary hooks         │
        edit ──proxy────▶│   │ yes, getViewer() → viewerId                (createItineraryHooks)  │
   (cookie?) ─no─▶/login │   ▼                                                 │                   │
                         │ ItineraryEditor(client) ─ useItinerary(id) ─────────┤ HttpClient        │
                         │   │ data → toItinerary (ACL) → buildDayRange        │ (bffHttp,         │
                         │   │ canEdit(it, viewerId)? ─no─▶ EditorForbidden    │  withSessionRefresh)
                         │   ▼ yes                                             ▼                   │
                         │ Timeline/Sheet ─ dnd-kit ─▶ useReorder (optimistic, scope)  /api/bff/*  │──▶ BFF ──▶ BE /api/v1/itineraries/*
                         │ WaypointForm ─ LocationField ─ parseLocationInput (domain)              │     (Origin, phiên,   (401 stale
                         │                     │ short link? ─▶ POST /api/maps/resolve ───────────│──▶  allowlist)        không gọi BE)
                         │                     │                 (route: phiên + Origin,          │
                         │                     │                  HEAD/GET redirect:manual,       │──▶ maps.app.goo.gl ─302─▶ (dừng ở
                         │                     │                  ≤3 bước, 5s, allowlist host)    │                          google.com/maps/…)
                         │ PendingDeleteController ─5s─▶ useDeleteWaypoint ─────────────────────▶ │
                         │   pagehide/visibility hidden ─▶ fetch(keepalive) DELETE /api/bff/…   ─▶│
                         │ SaveIndicator / LeaveGuard ◀─ useIsMutating(['itinerary','write',id]) │
                         └─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
packages/itinerary/src/
├── domain/
│   ├── itinerary.ts          # type Itinerary, ItineraryDay, Waypoint, ItinerarySummary (readonly)
│   ├── calendar-date.ts      # CalendarDate brand, parse/format, không new Date() local
│   ├── day-range.ts          # buildDayRange, nextDayNumber, waypointsOfDay
│   ├── permissions.ts        # canEdit, canPublish
│   ├── reorder.ts            # moveItem (arrayMove thuần), isSameOrder
│   ├── location-input.ts     # parseLocationInput, parseGoogleMapsUrl, isShortMapsLink
│   └── index.ts
├── application/
│   ├── ports.ts              # ItineraryRepository (port), ShortLinkResolver (port)
│   ├── use-cases.ts          # reorderWaypoints (kiểm tập ID khớp ngày), addDay (= setDaySubtitle(max+1, null))
│   └── index.ts
├── infrastructure/
│   ├── dto.ts                # Zod: itineraryDetailDto, summaryDto, pagedResultDto, waypointDto
│   ├── mappers.ts            # toItinerary (sắp days, waypoints), toSummary
│   ├── http-itinerary-repository.ts
│   ├── fixtures.ts           # DTO mẫu cho test app (khuôn identity)
│   └── index.ts
├── react/index.ts            # itineraryKeys, createItineraryHooks(deps)
└── index.ts                  # export domain + application

apps/web/src/
├── composition/
│   ├── http.client.ts        # (sửa) thêm appHttp base "/api" bọc refresh cho /maps/resolve
│   ├── itinerary.client.ts   # export const itinerary = createItineraryHooks({...})
│   └── server/maps-resolve.ts# hàm thuần resolveShortMapsLink(deps, input) — test được
├── app/
│   ├── api/maps/resolve/route.ts
│   └── (dashboard)/
│       ├── (shell)/layout.tsx            # AppShell dashboard + Suspense + gate (chuyển từ (dashboard)/layout.tsx)
│       ├── (shell)/loading.tsx, error.tsx
│       ├── (shell)/itineraries/mine/page.tsx
│       ├── (shell)/settings/password/page.tsx
│       ├── (editor)/layout.tsx           # Suspense + gate, KHÔNG AppShell
│       └── (editor)/itineraries/[id]/edit/{page,loading,error}.tsx
├── components/submit-status.tsx          # chuyển từ modules/identity/ui
└── modules/itinerary/ui/                 # toàn bộ organism (UI-SPEC), dnd, pending-delete, leave-guard, draft-storage
```

### Pattern 1: Editor fetch ở client qua BFF (giải bẫy D-46)

**What:** Page RSC chỉ kiểm GUID và lấy `viewerId`; dữ liệu tải bằng `useQuery` trong client component.
**Why:** `forwardToBackend` trả 401 `session.expired` khi phiên `stale|invalid` mà không gọi BE; `withSessionRefresh` refresh trong Web Lock rồi phát lại một lần [VERIFIED: đọc `bff.ts`, `http.client.ts`]. Nên 403 về tới UI luôn là 403 thật. Gate `(dashboard)` đã bảo đảm phiên `fresh` trước khi render. Với `cacheComponents`, `params` là runtime data, phải đọc trong `<Suspense>` [CITED: docs 16.4 `dynamic-routes.md` §With Cache Components]; gate layout đã bọc Suspense.

```tsx
// app/(dashboard)/(editor)/itineraries/[id]/edit/page.tsx (Server Component)
import { notFound } from "next/navigation";
import { parseItineraryId } from "@tripory/shared-kernel"; // shared-kernel/ids.ts
import { getViewer } from "@/composition/viewer.server";
import { ItineraryEditor } from "@/modules/itinerary/ui/itinerary-editor";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itineraryId = parseItineraryId(id);
  if (itineraryId === null) notFound(); // render app/not-found.tsx
  const viewer = await getViewer();     // gate đã chặn khách; null ở đây chỉ là phòng hờ
  // key theo viewer: Activity giữ state, đổi tài khoản không được thấy state cũ (Pitfall 4)
  return <ItineraryEditor key={viewer?.id ?? "guest"} itineraryId={itineraryId} viewerId={viewer?.id ?? null} />;
}
```

`notFound()` chỉ được docs 16.4 nêu cho Server Component, Server Function, Route Handler [CITED: `04-functions/not-found.md`]. BE 404 phát hiện ở client thì render một `NotFoundView` dùng chung nội dung với `app/not-found.tsx` (tách component), không gọi `notFound()` trong client. `forbidden()` vẫn `version: experimental` và cần `experimental.authInterrupts` [CITED: `04-functions/forbidden.md`] → giữ D-45: tự render `EditorForbidden`.

### Pattern 2: Hook factory + query key theo aggregate

```ts
// packages/itinerary/src/react/index.ts (trích)
export const itineraryKeys = {
  all: ['itinerary'] as const,
  lists: () => ['itinerary', 'list'] as const,
  list: (status: StatusFilter) => ['itinerary', 'list', status] as const,
  detail: (id: ItineraryId) => ['itinerary', 'detail', id] as const,
  write: (id: ItineraryId) => ['itinerary', 'write', id] as const, // mutationKey chung của editor
};

export function createItineraryHooks(deps: Readonly<{ repository: ItineraryRepository }>) {
  return {
    useMyItineraries: (status: StatusFilter) =>
      useInfiniteQuery({
        queryKey: itineraryKeys.list(status),
        queryFn: ({ pageParam, signal }) => deps.repository.listMine({ pageIndex: pageParam, pageSize: 12, status }, signal),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.hasNextPage ? last.pageIndex + 1 : undefined),
      }),
    useItinerary: (id: ItineraryId) =>
      useQuery({
        queryKey: itineraryKeys.detail(id),
        queryFn: ({ signal }) => deps.repository.getById(id, signal),
        staleTime: 0, // D-37: focus lại là refetch; staleTime 60s mặc định sẽ chặn
        refetchOnWindowFocus: 'always',
      }),
    // mutation: nhận options (meta.feedback) như identity; mutationFn do hook đặt
  };
}
```

- `refetchOnWindowFocus` nhận hàm `(query) => boolean | 'always'` [VERIFIED: .d.ts 5.104.2]; app có thể trả `false` khi còn mutation chạy để refetch không đè optimistic (dùng `queryClient.isMutating({ mutationKey })`).
- Repository nhận `AbortSignal` từ `queryFn` (HttpRequest đã có `signal`).
- Xóa lịch trình: `removeQueries(detail(id))` + `invalidateQueries(lists())`. Tạo: `setQueryData(detail(id), mapped)` rồi `invalidateQueries(lists())` để editor mở ngay không cần fetch lại.
- Side effect cache đặt ở option **cấp hook** (`useMutation({ onSuccess })`), không ở `mutate(vars, { onSuccess })`: callback cấp `mutate` bị bỏ khi component unmount/ẩn (bài học 03-11).

### Pattern 3: `CalendarDate` không qua `Date` local

```ts
// domain/calendar-date.ts
export type CalendarDate = string & { readonly __brand: 'CalendarDate' };
const RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function parseCalendarDate(value: string): CalendarDate | null {
  const m = RE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = new Date(Date.UTC(y, mo - 1, d)); // có tham số: không bị luật "new Date() không tham số" chặn
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === mo - 1 && utc.getUTCDate() === d ? (value as CalendarDate) : null;
}
export const formatCalendarDateVi = (d: CalendarDate): string => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
```

`<input type="date">` cho giá trị `YYYY-MM-DD` trực tiếp, nên form không cần chuyển đổi. DTO dùng `z.iso.date().nullable()`; mapper gọi `parseCalendarDate`. `createdAt/updatedAt` giữ chuỗi ISO (`z.iso.datetime({ offset: true })`), Phase 4 không hiển thị.

### Pattern 4: Mapper ngày thưa và luật domain

```ts
// infrastructure/mappers.ts
export function toItinerary(dto: ItineraryDetailDto): Itinerary {
  const days = [...dto.days].sort((a, b) => a.dayNumber - b.dayNumber)
    .map((d) => ({ dayNumber: d.dayNumber, subtitle: d.subtitle?.trim() ? d.subtitle : null, distanceKm: d.dayDistanceKm ?? null }));
  const waypoints = [...dto.waypoints]
    .sort((a, b) => a.dayNumber - b.dayNumber || a.orderIndex - b.orderIndex)
    .map(toWaypoint); // createWgs84Coordinate({ latitude, longitude }) null → throw (ACL)
  return Object.freeze({ id, ownerId, title, /*…*/ days, waypoints });
}

// domain/day-range.ts
export function buildDayRange(it: Itinerary): readonly DayView[] {
  const max = Math.max(1, ...it.days.map((d) => d.dayNumber), ...it.waypoints.map((w) => w.dayNumber));
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const day = it.days.find((d) => d.dayNumber === n);
    return { dayNumber: n, subtitle: day?.subtitle ?? null, distanceKm: day?.distanceKm ?? null,
             waypoints: it.waypoints.filter((w) => w.dayNumber === n) };
  });
}
export const nextDayNumber = (it: Itinerary) => buildDayRange(it).length + 1;
// domain/permissions.ts
export const canEdit = (it: Itinerary, viewerId: UserId | null) => viewerId !== null && it.ownerId === viewerId;
export const canPublish = (it: Itinerary, pendingDeleteIds: ReadonlySet<string>) =>
  !it.isPublic && it.waypoints.some((w) => !pendingDeleteIds.has(w.id));
```

So sánh `ownerId === viewerId` cần cả hai đã chuẩn hóa chữ thường (`UserId` của kernel đã chuẩn hóa; viewer id của Phase 3 đi qua `toViewer`) [VERIFIED: STATE.md 02, 03-04].

### Pattern 5: Lệnh ghi tuần tự theo `scope`, optimistic có snapshot, refetch khi lệnh cuối xong

```ts
useReorderWaypoints: (id, options) => {
  const qc = useQueryClient();
  return useMutation({
    ...options,
    mutationKey: itineraryKeys.write(id),
    scope: { id: `itinerary:${id}` },                 // chạy nối đuôi với DELETE/thêm ngày/phụ đề
    mutationFn: (v: { dayNumber: number; orderedIds: readonly string[] }) => deps.repository.reorder(id, v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: itineraryKeys.detail(id) });
      const previous = qc.getQueryData<Itinerary>(itineraryKeys.detail(id));
      if (previous) qc.setQueryData(itineraryKeys.detail(id), applyDayOrder(previous, v.dayNumber, v.orderedIds));
      return { previous };
    },
    onError: (_e, _v, result) => { if (result?.previous) qc.setQueryData(itineraryKeys.detail(id), result.previous); },
    onSettled: () => {
      // chỉ refetch khi đây là lệnh ghi cuối cùng còn chạy: chuỗi kéo liên tiếp chỉ gây một lần GET
      if (qc.isMutating({ mutationKey: itineraryKeys.write(id) }) === 1) void qc.invalidateQueries({ queryKey: itineraryKeys.detail(id) });
    },
  });
}
```

- `scope` có trong 5.104.2: mutation cùng `scope.id` chạy tuần tự [VERIFIED: .d.ts `MutationCache` "queued in that scope"]. Hệ quả: D-33 "reorder gửi sau khi DELETE xong" đúng tự nhiên; hai reorder liền nhau không thể tới BE lệch thứ tự.
- Mẫu `isMutating === 1` theo bài "Concurrent Optimistic Updates in React Query" của TkDodo [CITED: tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query] [ASSUMED: chưa mở lại bài trong phiên này].
- Thêm waypoint: không optimistic (form đang mở, có loading); `onSuccess` chèn `WaypointDto` trả về vào cache rồi invalidate để lấy km. Sửa waypoint: chờ BE rồi invalidate. Phụ đề, thêm ngày: optimistic + rollback.
- `InvalidReorderList` (D-37): `meta.feedback` của reorder đặt `errorToast: false` cho mã này, tự `notify.info("Danh sách đã thay đổi, đã tải lại")` + invalidate, không bật trạng thái "Lỗi".

### Pattern 6: Infinite scroll im lặng khi lỗi trang kế (D-02)

```tsx
const q = itinerary.useMyItineraries(status);
const items = dedupeById(q.data?.pages.flatMap((p) => p.items) ?? []); // Pitfall 6
const firstPageError = q.isError && !q.isFetchNextPageError && q.data === undefined;
useEffect(() => {
  const el = sentinelRef.current;
  if (!el) return;
  const io = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
  }, { rootMargin: '0px 0px 400px 0px' });
  io.observe(el);
  return () => io.disconnect();
}, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]);
// skeleton cuối lưới: chỉ khi q.isFetchingNextPage; lỗi trang kế không render gì
```

- Observer chỉ gọi callback khi trạng thái giao cắt đổi, nên "lần sau sentinel lọt vào viewport" đúng nghĩa D-02. Khi effect chạy lại (đổi `isFetchingNextPage`), observer mới gọi callback ngay lần đầu nếu sentinel đang trong viewport [ASSUMED: hành vi IntersectionObserver phát entry đầu tiên khi `observe`], nên có thể tự thử lại ngay sau lỗi. Nếu không muốn thử lại liền, giữ observer ổn định (dep rỗng, đọc state qua ref).
- `useSearchParams` đọc `status` phải nằm trong `<Suspense>` [CITED: docs `use-search-params.md` §Prerendering]. Đổi tab: `router.replace(`?status=${v}`, { scroll: false })`.
- Mỗi tab một query key, nên đổi tab không xóa trang đã tải của tab khác.

### Pattern 7: Parse vị trí (domain thuần, bảng mẫu)

Kết quả dạng discriminated union:

```ts
export type LocationParse =
  | { kind: 'coordinate'; coordinate: Wgs84Coordinate; placeName: string | null; source: LocationSource }
  | { kind: 'short-link'; url: string }                    // cần gọi route resolve
  | { kind: 'no-coordinate'; placeName: string | null }     // link Maps hợp lệ nhưng không có tọa độ
  | { kind: 'out-of-range' } | { kind: 'empty' } | { kind: 'invalid' };
```

Thứ tự thử (dừng ở mẫu đầu tiên khớp). Cột "Nguồn" ghi bằng chứng:

| # | Mẫu | Ví dụ | Ghi chú | Nguồn |
|---|-----|-------|---------|-------|
| 0 | Chuỗi tọa độ trần `lat, lng` | `10.7769, 106.7009`, `10.7769,106.7009`, `-33.8,151.2` | Regex `^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$`. Dấu thập phân chỉ là chấm (D-20) | D-20 |
| 1 | Host rút gọn | `https://maps.app.goo.gl/<id>`, `https://goo.gl/maps/<id>` | → `short-link`. `goo.gl` chỉ khi path bắt đầu `/maps/`. Link `goo.gl/maps` cũ không hoạt động nữa ngoài các link Google giữ lại | [VERIFIED: gọi thật; CITED: blog.google/technology/developers/googl-link-shortening-update] |
| 2 | `!3d<lat>!4d<lng>` trong `data=` | `/maps/place/Ch%E1%BB%A3+B%E1%BA%BFn+Th%C3%A0nh/@10.77,106.69,17z/data=!3m1!4b1!4m6!3m5!1s0x…!8m2!3d10.7725!4d106.6980!16s…` | Tọa độ ghim của địa điểm, ưu tiên hơn `@` (tâm khung nhìn). Lấy cặp **cuối** nếu có nhiều | D-20; [ASSUMED: định dạng `data=` không có tài liệu chính thức] |
| 3 | Tọa độ trong path `/maps/place/<lat,lng>` hoặc `/maps/search/<lat,+lng>` | `https://www.google.com/maps/search/29.996966,+68.748251?entry=tts` | Đích thực tế của link rút gọn "ghim thả tay" | [VERIFIED: resolve `maps.app.goo.gl/wsmXZrYfP8V3ur2RA`] |
| 4 | Query `query=` (Maps URLs API), `q=`, `ll=`, `destination=`, `center=` | `…/maps/search/?api=1&query=47.5951518%2C-122.3316393`, `maps.google.com/?q=10.77,106.70`, `?ll=…`, `/maps/dir/?api=1&destination=…`, `/maps/@?api=1&map_action=map&center=…` | Chỉ nhận khi giá trị là tọa độ; `query=tên` thì không có tọa độ | [CITED: developers.google.com/maps/documentation/urls/get-started] |
| 5 | `@lat,lng,<zoom>z` | `https://www.google.com/maps/@10.7769,106.7009,15z` | Tâm khung nhìn, ưu tiên thấp nhất (D-20 vẫn nhận) | D-20 |
| 6 | URL Google Maps hợp lệ mà không có mẫu nào | `/maps/place/Brandenburg+Gate,+…/data=!4m2!3m1!1s0x47a8…:0x26bb…` | → `no-coordinate` kèm `placeName` | [VERIFIED: đích của `maps.app.goo.gl/PJdcARfqULFnpENj7`] |

- Host Google hợp lệ: `google.com`, `www.google.com`, `maps.google.com`, và tên miền quốc gia `google.<cc>`/`google.com.<cc>` (ví dụ `www.google.com.vn`) với path bắt đầu `/maps`; `maps.google.<cc>`. Nhận cả không có scheme (`www.google.com/maps/...`) bằng cách thêm `https://` trước khi kiểm.
- Tên từ `/maps/place/<tên>/`: thay `+` thành khoảng trắng rồi `decodeURIComponent` trong `try/catch` (chuỗi `%` hỏng ném `URIError`); bỏ qua nếu bản thân là tọa độ; cắt còn ≤ 200 ký tự. Tên thường kèm địa chỉ sau dấu phẩy ("Brandenburg Gate, Pariser Platz, 10117 Berlin, Germany"); D-21 khóa "tự điền Tên", planner có thể chọn chỉ lấy phần trước dấu phẩy đầu tiên làm Tên và phần còn lại gợi ý cho Địa chỉ (copy phụ, discretion).
- Domain không dùng `new URL()`: phép thử "domain chạy được trên React Native" (kiến trúc mục 6) và `URL` của RN không đầy đủ [ASSUMED]. Parse bằng regex/chuỗi thuần là đủ cho các mẫu trên. Route handler (Node) thì dùng `URL` thoải mái.
- Kiểm khoảng bằng `createWgs84Coordinate`; ngoài khoảng → `out-of-range` (copy UI-SPEC).

### Pattern 8: Route resolve link rút gọn

Hành vi thật (2026-10-24, từ máy dev): `maps.app.goo.gl/<id>` trả **một** `302` thẳng tới `https://www.google.com/maps/...`; `HEAD` cũng trả 302 với cùng `Location`; id sai trả `404`. Không thấy bước trung gian `consent.google.com` từ IP Việt Nam [VERIFIED: fetch `redirect: "manual"` bằng Node 24]. Region Vercel (US mặc định) có thể khác; IP châu Âu được ghi nhận là hay bị chuyển qua `consent.google.com/ml?continue=<url>` [ASSUMED].

```ts
// composition/server/maps-resolve.ts (thuần, test bằng fake fetch)
const SOURCE = new Set(["maps.app.goo.gl", "goo.gl"]);
const isGoogleMapsDestination = (u: URL) =>
  u.protocol === "https:" && /^(?:www\.|maps\.)?google\.(?:com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/.test(u.hostname)
  && (u.hostname.startsWith("maps.") || u.pathname.startsWith("/maps"));
const MAX_HOPS = 3, TOTAL_TIMEOUT_MS = 5_000, MAX_INPUT = 2_048;

export async function resolveShortMapsLink(deps: { fetch: typeof fetch }, raw: string): Promise<ResolveResult> {
  if (raw.length > MAX_INPUT || !URL.canParse(raw)) return { ok: false };
  let current = new URL(raw);
  if (current.protocol !== "https:" || !SOURCE.has(current.hostname) || (current.hostname === "goo.gl" && !current.pathname.startsWith("/maps/"))) return { ok: false };
  const signal = AbortSignal.timeout(TOTAL_TIMEOUT_MS); // server Node 24: có sẵn
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const res = await deps.fetch(current, { method: "HEAD", redirect: "manual", signal, headers: { accept: "text/html" }, cache: "no-store" });
    void res.body?.cancel();                                  // không đọc nội dung
    const location = res.headers.get("location");
    if (res.status < 300 || res.status > 399 || location === null) return { ok: false };
    const next = new URL(location, current);
    if (isGoogleMapsDestination(next)) return { ok: true, url: next.toString() }; // dừng, KHÔNG fetch đích
    if (next.hostname === "consent.google.com") {                                // [ASSUMED] luồng EU
      const cont = next.searchParams.get("continue");
      if (cont && URL.canParse(cont) && isGoogleMapsDestination(new URL(cont))) return { ok: true, url: cont };
      return { ok: false };
    }
    if (next.protocol !== "https:" || !SOURCE.has(next.hostname)) return { ok: false }; // host lạ → dừng
    current = next;
  }
  return { ok: false };
}
```

Route `app/api/maps/resolve/route.ts`: chỉ `POST` (request ghi luôn có `Origin`, nên `checkSameOrigin` không cho trang lạ kích hoạt; `GET` không có Origin sẽ lọt nhánh "GET được qua"), thứ tự kiểm như BFF: method → Origin → phiên (`readSession`; `none` → 401, `stale|invalid` → 401 `session.expired` để client refresh rồi phát lại) → body JSON `{ url: string }` dựng lại từ field đặt tên cứng → resolve → `successEnvelope({ url })` hoặc `errorEnvelope(422, "Maps.UnresolvableLink")`. Envelope của `request-guards.ts` đã có `no-store` + `nosniff`. Client gọi qua một `HttpClient` base `/api` bọc `withSessionRefresh` (thêm vào `http.client.ts`, chung `refreshDeps`). Client parse URL trả về bằng chính `parseLocationInput` (một đường code).

`fetch` của Node không gửi cookie/header của người dùng, nên route không làm lộ gì ra Google ngoài IP server.

### Pattern 9: Pending-delete controller (app)

Tách khỏi cache: cache vẫn giữ waypoint, view lọc theo `pendingIds`. Như vậy refetch (focus, invalidate) không làm điểm "sống lại" và hoàn tác chỉ là bỏ id khỏi tập.

```ts
// modules/itinerary/ui/pending-delete.ts — thuần, tiêm timer/notify/commit để test bằng fake timers
type Pending = { waypointId: string; name: string; toastId: string | number; timer: ReturnType<typeof setTimeout> };
export function createPendingDeleteController(deps: {
  commit: (waypointId: string) => void;        // gọi mutation DELETE (cấp hook) hoặc keepalive khi unload
  showUndo: (name: string, h: { onUndo: () => void; onDismiss: () => void }) => string | number;
  dismissToast: (id: string | number) => void;
  onChange: (pendingIds: ReadonlySet<string>) => void;
  windowMs?: number;
}) {
  let pending: Pending | null = null;
  const finish = (mode: "commit" | "undo") => {
    const p = pending; if (!p) return; pending = null;  // idempotent: onDismiss sẽ gọi lại
    clearTimeout(p.timer); deps.dismissToast(p.toastId);
    if (mode === "commit") deps.commit(p.waypointId);
    deps.onChange(new Set());
  };
  return {
    remove(waypointId: string, name: string) {
      finish("commit");                                  // UI-SPEC: lệnh cũ commit ngay
      const toastId = deps.showUndo(name, { onUndo: () => finish("undo"), onDismiss: () => finish("commit") });
      pending = { waypointId, name, toastId, timer: setTimeout(() => finish("commit"), deps.windowMs ?? 5_000) };
      deps.onChange(new Set([waypointId]));
    },
    flush: () => finish("commit"),                        // bắt đầu kéo, rời route, pagehide
    pendingId: () => pending?.waypointId ?? null,
  };
}
```

- `notify.dismiss(id)` làm Sonner gọi `onDismiss` (đặt `toast.delete` → effect gọi `onDismiss`) [VERIFIED: sonner 2.0.8], nên `finish` phải idempotent như trên.
- Gắn trong editor: `useEffect(() => () => controller.flush(), [])` chạy khi rời route; với Activity, cleanup chạy khi trang bị ẩn [CITED: docs 16.4 `preserving-ui-state.md`: "When Activity hides this component, the cleanup function runs"].
- Commit lúc ẩn trang vẫn đi qua `mutate` của hook: TanStack vẫn chạy mutation sau khi observer gỡ, chỉ callback cấp `mutate` bị bỏ [ASSUMED: theo mã MutationObserver v5; nên có test]. Nếu không muốn phụ thuộc, `commit` gọi thẳng use case `deleteWaypoint` rồi `queryClient.invalidateQueries`.
- Lỗi DELETE (D-31 bước 7): `onError` cấp hook ghi "lệnh lỗi" vào store của SaveIndicator; view hiện lại điểm vì cache chưa bao giờ xóa nó (chỉ cần optimistic removal ở `onMutate` được rollback).

### Pattern 10: `notify.undoable` trong `ui-web`

```tsx
undoable: (title: ReactNode, o: { actionLabel: string; onAction: () => void; onDismiss?: () => void }) =>
  sonnerToast.info(<ToastAnnouncement variant="info">{title}</ToastAnnouncement>, {
    duration: Infinity,                                   // Sonner không đặt timer khi Infinity
    action: { label: o.actionLabel, onClick: () => o.onAction() }, // Sonner tự đóng sau onClick, không gọi onDismiss
    onDismiss: () => o.onDismiss?.(),
  }),
```

Đồng hồ 5 giây là của app (D-31), nên không bị Sonner tạm dừng khi hover hoặc tab ẩn (Sonner tạm dừng timer khi `isDocumentHidden` và khi hover) [VERIFIED: sonner `index.mjs`]. Không mở `duration` cho các `notify.*` khác.

### Pattern 11: Flush khi đóng/reload tab bằng `keepalive`

- Thêm `keepalive?: boolean` vào `HttpRequest` của `api-client` và truyền vào `fetch` init trong `createFetchHttpClient` (kèm test). Repository có `deleteWaypoint(id, wid, { keepalive: true })` gọi qua client **trần** (không `withSessionRefresh`: không thể refresh lúc unload).
- Lắng nghe `pagehide` và `visibilitychange` (`document.visibilityState === 'hidden'`). MDN Page Lifecycle khuyên dùng `visibilitychange` vì mobile Safari thường không bắn `beforeunload`/`unload`/đôi khi `pagehide` khi tắt app [ASSUMED: hướng dẫn chung của MDN/web.dev]. Đánh đổi: chuyển tab là commit sớm, chấp nhận được vì người dùng đã chọn xóa (cùng tinh thần D-32).
- `DELETE` là method không an toàn nên trình duyệt luôn gửi `Origin` (kể cả cùng origin) và `Sec-Fetch-Site: same-origin`; `credentials` mặc định `same-origin` nên cookie đi kèm → `checkSameOrigin` và `readSession` của BFF qua bình thường [ASSUMED: theo Fetch spec "append a request Origin header"]. Phiên stale → BFF 401, lệnh mất (rủi ro đã chấp nhận ở D-32).
- `keepalive` giới hạn tổng body 64 KiB đang bay cho mỗi document [CITED: github.com/whatwg/fetch/issues/679]; DELETE không có body. Firefox hỗ trợ `keepalive` từ 133 (11/2024) [CITED: mozilla.org/firefox/133.0/releasenotes].

### Pattern 12: dnd-kit 6.3.1 trong `modules/itinerary/ui`

```tsx
const sensors = useSensors(
  useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
  accessibility={{ announcements: viAnnouncements(() => orderedIdsRef.current, nameOf), screenReaderInstructions: { draggable: VI_INSTRUCTIONS } }}
  onDragStart={() => pendingDelete.flush()}               // D-33: trước khi tính thứ tự
  onDragEnd={({ active, over }) => { /* over null hoặc cùng chỗ → không gửi; else reorder.mutate */ }}
>
  <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>…</SortableContext>
  {createPortal(<DragOverlay>{activeItem ? <WaypointCardOverlay … /> : null}</DragOverlay>, document.body)}
</DndContext>
```

- **Dùng `MouseSensor` + `TouchSensor`, không dùng `PointerSensor`**: `PointerSensor` cũng nhận pointer event từ ngón tay, sẽ kích hoạt theo ngưỡng 4px thay vì nhấn giữ 180ms. Docs dnd-kit nêu hai ràng buộc `distance`/`delay`+`tolerance` loại trừ nhau trong một sensor [CITED: dndkit.com/api-documentation/sensors/touch].
- Tay cầm: `useSortable({ id })` → `setActivatorNodeRef` + `{...attributes} {...listeners}` gắn vào **nút tay cầm**, `setNodeRef` vào `li`. Đặt `attributes.roleDescription` tiếng Việt (mặc định "sortable"). `aria-describedby` của dnd-kit đã trỏ tới hướng dẫn `screenReaderInstructions` → dùng nó, không làm thêm phần tử hướng dẫn thứ hai.
- `touch-action`: docs khuyên `manipulation` cho phần tử kéo dùng `TouchSensor` [CITED: dndkit.com/api-documentation/sensors/touch]; UI-SPEC khóa `touch-none` trên tay cầm 44×44 — vẫn được vì tay cầm chỉ dùng để kéo.
- **Thêm `data-base-ui-swipe-ignore`** vào tay cầm (và vào `ol` trong lúc kéo) để Drawer của Base UI không coi cử chỉ là vuốt sheet [VERIFIED: hằng `BASE_UI_SWIPE_IGNORE_ATTRIBUTE` trong `@base-ui/react` 1.8.0; ASSUMED: được dùng bởi logic vuốt của Drawer, cần test trên máy thật].
- **`DragOverlay` phải portal ra `document.body`**: popup của Sheet có `transform: translateY(...)` nên `position: fixed` bên trong bị lệch theo tổ tiên có transform [ASSUMED: quy tắc containing block của CSS]. Overlay cần z-index trên `--semantic-z-modal`.
- Announcements nhận `{ active, over }`; vị trí `{i}/{n}` tính từ mảng id hiện tại qua ref (callback chạy ngoài render).
- React 19 + StrictMode: dnd-kit 6.3.1 không khai báo hỗ trợ React 19 (peer `>=16.8.0` vẫn khớp), `.d.ts` dùng namespace `JSX` toàn cục mà `@types/react` 19 đã bỏ; `skipLibCheck: true` ở cả app và library tsconfig nên không chặn typecheck [VERIFIED: grep `.d.ts` của 4 gói, đọc tsconfig]. StrictMode chạy effect đăng ký hai lần; dnd-kit đăng ký droppable/draggable bằng effect có cleanup nên chịu được [ASSUMED]. Wave 0 nên có một spike: render `SortableContext` trong `StrictMode` dưới jsdom và kéo bằng bàn phím (KeyboardSensor chạy được trong jsdom).
- Kéo bằng bàn phím dùng được trong jsdom; kéo chuột/cảm ứng kiểm qua hàm thuần (`onDragEnd` → `moveItem`) và UAT trên máy thật (UI-SPEC Testing Contract).

### Pattern 13: SaveIndicator và lệnh lỗi để "Thử lại"

- "Đang lưu…": `useIsMutating({ mutationKey: itineraryKeys.write(id) }) > 0`. Lệnh trong `scope` đang xếp hàng cũng là `pending` nên được đếm.
- "Lỗi – Thử lại": store nhỏ ở app `{ failed: { kind, retry: () => void } | null }` do `onError` của thao tác nền ghi (phụ đề, reorder, xóa, thêm ngày); form mutation không ghi vào (D-30). `retry` gọi lại đúng `mutate(variables)`; thành công thì xóa `failed`. Có thể dùng `useMutationState({ filters: { mutationKey, status: 'error' } })` để lấy `variables`, nhưng store riêng rõ hơn vì phải phân biệt thao tác nền với form.
- "Đã lưu": cờ `hasSaved` bật ở `onSuccess` đầu tiên.
- Lệnh xóa đang chờ 5 giây không phải mutation nên tự nhiên không tính; lúc commit thì tính.

### Pattern 14: Cảnh báo rời trang trong Next 16.4

Next 16.4 không có API chặn điều hướng toàn cục (đã grep docs: chỉ có `Link onNavigate`, `useLinkStatus`, `router.bfcacheId`) [VERIFIED: grep `dist/docs`].

- **Đóng/reload tab:** `beforeunload` chỉ gắn khi `isDirty` (đang có lệnh ghi hoặc form có thay đổi), gỡ ngay khi hết, để không phá bfcache: `e.preventDefault(); e.returnValue = "";`. Safari iOS không hiện hộp `beforeunload` [ASSUMED].
- **Điều hướng trong app có kiểm soát:** mọi `Link` của editor header và `UserMenu` truyền `onNavigate={(e) => { if (guard.shouldBlock()) { e.preventDefault(); guard.ask(href); } }}` [CITED: docs 16.4 `link.md` §onNavigate: có `preventDefault()`, chỉ chạy cho điều hướng SPA cùng origin, không chạy khi Ctrl/Cmd+click]. Nút back của editor là `button` gọi `guard.run(() => goBack())`. `UserMenu` nhận `onNavigate?` hoặc đọc `NavigationGuardContext` (đặt ở `apps/web/src/components`), mặc định no-op.
- `LeaveEditorDialog` lắng nghe `useIsMutating`; về 0 khi đang mở thì tự đóng và đi tiếp (UI-SPEC).
- **Nút back của trình duyệt:** không chặn được sạch sẽ trong App Router (popstate do router của Next xử lý). Không làm hack `pushState` sentinel. Điều hướng SPA không hủy `fetch` đang chạy (cùng document), nên lệnh ghi vẫn tới BE; chỉ mất UI rollback. Ghi rõ là giới hạn đã biết của D-35.
- Đăng xuất từ menu khi còn lệnh ghi: ngoài phạm vi D-35, giữ hành vi Phase 3.

### Pattern 15: Layout toàn màn bằng route group lồng (D-16)

```
app/(dashboard)/
  (shell)/layout.tsx      → <AppShell variant="dashboard"><Suspense fallback={<Loading/>}><DashboardSessionGate loading={<Loading/>}>{children}</…>
  (shell)/loading.tsx, error.tsx, itineraries/mine/page.tsx, settings/password/page.tsx
  (editor)/layout.tsx     → <Suspense fallback={<EditorSkeleton/>}><DashboardSessionGate loading={<EditorSkeleton/>}>{children}</…>  (không AppShell)
  (editor)/itineraries/[id]/edit/page.tsx, loading.tsx, error.tsx
(xóa app/(dashboard)/layout.tsx, loading.tsx, error.tsx cũ)
```

- Route group không đổi URL; hai group lồng vẫn chung root layout nên chuyển giữa danh sách và editor **không** reload toàn trang (chỉ khác root layout mới reload) [CITED: docs 16.4 `route-groups.md` §Caveats].
- `(dashboard)/itineraries/mine` (tĩnh) và `(dashboard)/(editor)/itineraries/[id]/edit` không trùng URL. Phase 5 đặt `(public)/itineraries/[id]/page.tsx`, cũng không trùng.
- **Phải sửa `proxy.ts`:** `PROTECTED_PREFIXES` hiện chỉ có `/itineraries/mine`, `/settings`; `/itineraries/x/edit` không được bảo vệ và `proxy-coverage.test.ts` sẽ đỏ (đúng chủ đích của test). Không thêm tiền tố `/itineraries` vì Phase 5 có trang công khai `/itineraries/[id]`. Thêm danh sách pattern (`/^\/itineraries\/[^/]+\/edit(?:\/|$)/`) và export một `isProtectedPath` dùng chung cho proxy và test; test thêm ca `/itineraries/x` (Phase 5) không bị gate.
- `route-layouts.test.tsx` import `./(dashboard)/layout` → đổi sang `(shell)/layout` và thêm ca `(editor)/layout` không có AppShell.
- D-47: trang danh sách được Activity giữ nguyên DOM và cuộn (tối đa 3 route) [CITED: `preserving-ui-state.md`]. Thẻ danh sách đặt cờ "vào từ danh sách" (module store ở `modules/itinerary/ui`, đặt trong `onNavigate` của link thẻ và sau `router.push` khi tạo); nút back của editor: có cờ → `router.back()`, không → `router.push('/itineraries/mine')`. Không dùng `document.referrer`/`history.length` (không đáng tin trong SPA).

### Pattern 16: Mở rộng `Sheet` (Base UI 1.8 Drawer)

- `defaultSnap`: khởi tạo `useState` theo `snapPoints[index]` thay vì hằng `0.6` hiện tại.
- `insetTop`: `resolveSnapPoints(vh, insetTop)` trả expanded = `${Math.min(0.92 * vh, vh - insetTop)}px` (Base UI nhận chuỗi `px`) [VERIFIED: chú thích `snapPoints` trong `DrawerRoot.d.ts`]. Sheet hiện chỉ đọc `window.innerHeight` một lần trong effect; nên lắng nghe `resize` (xoay máy, thanh địa chỉ).
- `dismissible={false}`: không render `BaseDrawer.Close` trong `SheetControls`; `onOpenChange(open, details)` với `!open` → `details.cancel()` (Base UI event details có `cancel`) hoặc giữ `open` controlled `true` [VERIFIED: `DrawerRootChangeEventReason` có `swipe`, `escape-key`; ASSUMED: drawer bật về mức peek sau khi hủy, cần test].
- Sheet timeline không modal đang ở trong Portal. Khi trang editor bị Activity ẩn, cần kiểm sheet portal có bị ẩn theo không [ASSUMED: React Activity ẩn cả nội dung portal]; nếu không, render timeline sheet có điều kiện theo một cờ "visible" đặt bằng `useLayoutEffect` cleanup (mẫu của docs cho style toàn cục).

### Pattern 17: Sửa token Tailwind và guard (Wave 0)

Tailwind 4.3.3: utility `text-*` (màu) tra `['--text-color', '--color']`, `bg-*` tra `['--background-color', '--color']`, `z-*` tra `['--z-index']`; namespace `--text` không gồm `--text-color-*` nên reset `--text-*: initial` không xóa chúng và chúng không thành cỡ chữ [VERIFIED: đọc `tailwindcss/dist/lib.js` 4.3.3]. Biên dịch thử với `@tailwindcss/node`:

| Thêm vào `@theme inline` | Kết quả |
|---|---|
| (hiện tại) | `text-muted`, `text-subtle`, `text-disabled`, `z-modal` **không có CSS**; `z-(--z-modal)` → `z-index: var(--z-modal)` (biến không tồn tại); `max-w-(--size-content-sm)` → biến không tồn tại; `text-text-muted` có CSS |
| `--text-color-muted/subtle/disabled: var(--semantic-color-text-…)` | `text-muted` → `color: var(--semantic-color-text-muted)` …; `bg-muted` vẫn **không** sinh (đúng ý) |
| `--z-index-sticky/modal…: var(--semantic-z-…)` | `z-modal` → `z-index: var(--semantic-z-modal)` |

[VERIFIED: chạy `compile()` ngày 2026-10-24]

Cách sửa khuyến nghị (gộp a + b của UI checker):
1. `theme.css` thêm `--text-color-muted`, `--text-color-subtle`, `--text-color-disabled` và `--z-index-base|sticky|dropdown|overlay|modal|toast` (trỏ `--semantic-*`). Thêm reset `--z-index-*: initial;` để bỏ thang số mặc định nếu muốn (test hiện kiểm danh sách reset; cập nhật test).
2. Đổi mọi `z-(--z-x)` thành `z-x` (dropdown, modal, overlay, sticky đang dùng). Sửa `max-w-(--size-content-sm)` trong `SheetContent` thành `max-w-content-sm`.
3. Guard trong `packages/design-tokens/src/tokens.test.ts` (tầng này được phép `@tailwindcss/node` và module Node theo `uiPackage({ role: 'tokens' })`): đọc mọi `.tsx` không phải test trong `packages/ui-web/src/{atoms,molecules}` và `apps/web/src/{components,modules,app}`, tách token trong chuỗi, `compiler.build(tokens)`, rồi:
   - mọi `var(--x)` trong CSS sinh ra phải được khai báo trong `design-tokens/src/*.css`, trừ tiền tố runtime `--tw-` (Tailwind) và `--drawer-` (Base UI đặt inline);
   - mọi token có tiền tố utility màu/z/spacing đã biết (`text-`, `bg-`, `border-`, `z-`, `rounded-`, `shadow-`, `gap-`, `p*-`, `m*-`, `max-w-`, `min-h-`…) sau khi bỏ variant (`hover:`…) phải sinh ra ít nhất một rule; danh sách ngoại lệ ghi tay nếu có.
   - Test đột biến: xóa `--text-color-muted` thì test đỏ.

### Anti-Patterns to Avoid
- **Prefetch editor bằng RSC với token hiện tại:** token có thể fresh ở gate nhưng phải dựng QueryClient server và map 403/404 hai nơi; Phase 3 cố ý không có QueryClient server.
- **Xóa waypoint khỏi cache ngay lúc bấm "Xóa":** refetch khi focus làm điểm hiện lại hoặc hoàn tác phải ghép lại vị trí. Giữ tập `pendingIds` riêng.
- **`PointerSensor` + `TouchSensor` cùng lúc:** ngón tay kích hoạt PointerSensor trước.
- **`DragOverlay` nằm trong popup Sheet:** lệch vị trí do `transform`.
- **Chặn điều hướng bằng `history.pushState` sentinel:** xung đột router Next.
- **Dùng `staleTime` 60 giây mặc định cho chi tiết:** `refetchOnWindowFocus` mặc định chỉ refetch query đã stale, D-37 không xảy ra.
- **Callback side effect ở `mutate(vars, {...})`:** mất khi editor bị ẩn/unmount.
- **`new URL()` trong domain:** vỡ phép thử RN.

### Pattern 18: Bản nháp form khi hết phiên (D-36)

- Adapter ở `modules/itinerary/ui/draft-storage.ts`: khóa `tripory:draft:v1:{viewerId}:{itineraryId}:{kind}` với `kind` = `add:{dayNumber}` | `edit:{waypointId}` | `metadata`. Có `viewerId` trong khóa để đăng nhập tài khoản khác cùng tab không thấy bản nháp cũ. Giá trị `{ savedAt, values }`, parse lại bằng Zod schema của form khi đọc (bỏ nếu sai hoặc cũ hơn 24 giờ; ngưỡng là discretion).
- Ghi: form đang mở đăng ký `sessionEvents.on("expired", () => save(getValues()))` (chỉ sự kiện hết phiên thật, không phải đăng xuất chủ động). Listener chạy đồng bộ trước `router.replace` của `SessionEffects` vì cùng một lượt emit [VERIFIED: đọc `session-effects.tsx`, listener đăng ký qua `sessionEvents.on`].
- Đọc: khi editor có dữ liệu (`useItinerary` thành công), tìm bản nháp của itinerary này, mở đúng form (sửa: waypoint còn tồn tại; không còn thì bỏ bản nháp) với `InlineAlert variant="info"`. Gửi thành công hoặc Hủy thì xóa khóa.
- Với Activity, sau khi đăng nhập lại `router.replace(next)` có thể khôi phục chính editor đang ẩn với form vẫn mở. Khôi phục phải idempotent: form đã mở cùng `kind` thì chỉ gắn alert, không mở lần hai. `key={viewerId}` ở page (Pattern 1) bảo đảm đổi tài khoản thì state cũ bị bỏ.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Kéo thả có bàn phím + announcements | Tự xử lý pointer/keyboard, live region | `@dnd-kit/core` + `sortable` (`KeyboardSensor`, `sortableKeyboardCoordinates`, `accessibility.announcements`) | Va chạm, auto-scroll, focus sau khi thả, trình đọc màn hình |
| Tuần tự hóa lệnh ghi | Hàng đợi promise tự viết | TanStack `scope: { id }` | Đã có trong 5.104.2, cộng tác với `useIsMutating`, retry, devtools |
| Timer toast | Toast riêng cho hoàn tác | Sonner `duration: Infinity` + đồng hồ app | Giữ một vùng toast, phím tắt và a11y sẵn có |
| Kiểm ngày | `new Date(str)` | `z.iso.date()` + `CalendarDate` | `new Date('2026-10-12')` là UTC nửa đêm, hiển thị local lệch ngày ở múi giờ âm |
| Kiểm tọa độ | So sánh tay | `createWgs84Coordinate` của kernel | Khoảng đóng, frozen, đúng BE |
| Resolve redirect | Proxy chung `?url=` | Route chuyên biệt, allowlist host, không đọc body | Open proxy/SSRF |
| Chặn rời trang | Hack `history` | `beforeunload` + `Link onNavigate` | Next 16.4 không có guard; hack phá router |
| Giữ cuộn danh sách | Lưu `scrollY` vào storage | Activity của Next 16.4 + `router.back()` | Có sẵn với `cacheComponents` |

**Key insight:** phần khó của phase này là đồng bộ thời gian (5 giây hoãn, xếp hàng ghi, refetch, ẩn trang), không phải giao diện. Mọi thứ có thể thuần thì đưa vào hàm thuần có fake timers.

## Common Pitfalls

### Pitfall 1: Link rút gọn của địa điểm không có tọa độ
**What goes wrong:** người dùng chia sẻ một quán từ app Google Maps (link `maps.app.goo.gl/...`), route resolve thành công nhưng URL đích là `/maps/place/<tên>/data=!4m2!3m1!1s0x…:0x…` không có `@`, `!3d!4d` hay `q=`. HTML đích cũng không có tọa độ (chỉ có `center=` theo vị trí IP của máy gọi) [VERIFIED: gọi thật 2026-10-24].
**Why it happens:** link chia sẻ POI mới chỉ chứa feature id; tọa độ được tải bằng request sau của web app.
**How to avoid:** `parseLocationInput` trả `no-coordinate` kèm `placeName`; UI tự điền Tên (D-21) và báo lỗi cụ thể. Câu UI-SPEC hiện tại "Link này không có vị trí. Chọn một địa điểm trong Google Maps rồi chia sẻ lại." sai với ca này (người dùng đã chọn địa điểm). Đề xuất câu thay (cần người dùng chốt, xem Open Questions): "Link này chỉ có tên địa điểm, không có tọa độ. Trong Google Maps, nhấn giữ vào địa điểm để lấy tọa độ rồi dán vào đây."
**Warning signs:** UAT với link chia sẻ từ điện thoại thật thất bại dù link mở được.

### Pitfall 2: Activity giữ trang thay vì unmount
**What goes wrong:** tưởng rời editor là unmount, đặt flush trong `pagehide` hoặc dựa vào state reset; hoặc `beforeunload` listener của trang ẩn vẫn còn.
**Why it happens:** `cacheComponents` dùng `<Activity>` giữ tối đa 3 route [CITED: `preserving-ui-state.md`].
**How to avoid:** mọi listener toàn cục (`beforeunload`, `pagehide`, `visibilitychange`, IntersectionObserver) gắn trong `useEffect` có cleanup; flush DELETE trong cleanup. Dialog đang mở khi rời trang sẽ vẫn mở khi quay lại: đóng dialog trong cleanup (mẫu `useLayoutEffect` của docs) nếu không muốn.
**Warning signs:** quay lại editor thấy form cũ còn mở; hộp `beforeunload` hiện khi đang ở trang danh sách.

### Pitfall 3: `proxy.ts` không bảo vệ route editor
**What goes wrong:** `/itineraries/{id}/edit` không nằm trong `PROTECTED_PREFIXES` → khách tải được JS editor, gate layout mới đẩy đi (vẫn an toàn nhưng chậm, và test coverage đỏ).
**How to avoid:** Pattern 15: pattern riêng cho `/edit`, export `isProtectedPath`, test cả ca công khai `/itineraries/x` của Phase 5.

### Pitfall 4: State của người dùng trước rò sang người sau trong cùng tab
**What goes wrong:** hết phiên → `/login` → đăng nhập tài khoản khác → `router.replace(next)` khôi phục editor đang ẩn với form và state cũ.
**How to avoid:** `key={viewerId}` cho cây editor, khóa bản nháp có `viewerId`, `queryClient.clear()` đã có ở `SessionEffects` [CITED: `preserving-ui-state.md` §State and authentication].

### Pitfall 5: `onDismiss` của Sonner gọi lại khi app tự đóng toast
**What goes wrong:** commit DELETE → `notify.dismiss(id)` → Sonner gọi `onDismiss` → controller commit lần hai.
**How to avoid:** `finish()` idempotent (Pattern 9); test "commit đúng một lần" với fake timers [VERIFIED: luồng `toast.delete` → `onDismiss` trong sonner 2.0.8].

### Pitfall 6: Phân trang offset trôi vì sắp theo `UpdatedAt`
**What goes wrong:** sửa một lịch trình (kể cả BE tự tính lại km) đẩy nó lên đầu; trang 2 tải sau đó lặp mục của trang 1 hoặc bỏ sót một mục.
**How to avoid:** khử trùng theo `id` khi gộp trang; mọi lệnh ghi thành công invalidate `itineraryKeys.lists()` (infinite query refetch lại các trang đã tải từ đầu theo thứ tự). Chấp nhận có thể sót một mục cho tới lần refetch sau; ghi vào checklist BE (cursor theo `UpdatedAt,Id`).

### Pitfall 7: Lệnh ghi lệch thứ tự và `InvalidReorderList`
**What goes wrong:** reorder gửi trong khi DELETE của cùng ngày chưa xong (BE còn thấy điểm đã xóa) → `InvalidReorderList`; hai reorder liền nhau tới BE ngược thứ tự.
**How to avoid:** flush pending delete ở `onDragStart` (D-33) + `scope` chung cho mọi lệnh ghi của itinerary; `orderedWaypointIds` tính trên tập **đang hiển thị** (đã trừ pending, mà pending đã được commit trước đó).

### Pitfall 8: dnd-kit trong Drawer có transform
**What goes wrong:** overlay lệch, Drawer vuốt theo ngón tay khi đang kéo, cuộn sheet bị khóa.
**How to avoid:** portal `DragOverlay`; `data-base-ui-swipe-ignore` trên tay cầm; `restrictToFirstScrollableAncestor`; chỉ tay cầm `touch-none`. Kiểm bằng UAT trên iOS Safari và Android Chrome.

### Pitfall 9: Utility không sinh CSS
**What goes wrong:** class viết đúng ngữ nghĩa nhưng Tailwind bỏ qua (`text-muted`) hoặc sinh `var()` tới biến không tồn tại (`z-(--z-modal)`, `max-w-(--size-content-sm)`). Không có lỗi build.
**How to avoid:** Pattern 17, guard trước mọi UI của phase.

### Pitfall 10: Giới hạn độ dài chỉ ở DB
**What goes wrong:** địa chỉ > 500, ghi chú > 2000, ảnh bìa > 500 không bị validator BE chặn → lỗi DB → 5xx → BFF trả `Bff.UpstreamError` với câu chung, người dùng không biết sửa gì.
**How to avoid:** Zod phía FE đếm trên giá trị **chưa trim** để không lọt chuỗi có khoảng trắng cuối (BE trim rồi mới lưu, nhưng cột tính trên chuỗi đã trim nên đếm thô là an toàn hơn).

### Pitfall 11: Bearer stale trên endpoint AllowAnonymous
**What goes wrong:** gọi `GET /{id}` bằng Bearer hết hạn → BE coi là ẩn danh → 403 với chính bản nháp của chủ.
**How to avoid:** không gọi BE từ RSC cho editor; luôn qua BFF (đã trả 401 khi stale). Test: BFF stale + `GET itineraries/{id}` → 401 và không gọi BE (đã có ở Phase 3 cho mọi path, thêm một ca cụ thể làm tài liệu).

### Pitfall 12: `UserMenu` link không đi qua guard
**What goes wrong:** người dùng bấm "Lịch trình của tôi" trong `UserMenu compact` khi còn lệnh ghi, không có hỏi.
**How to avoid:** `UserMenu` nhận `onNavigate` hoặc đọc context guard; test bấm link khi `isMutating > 0` mở `LeaveEditorDialog`.

## Code Examples

### Zod DTO (ACL)
```ts
// packages/itinerary/src/infrastructure/dto.ts
import { z } from 'zod';
export const waypointDto = z.object({
  id: z.string(), dayNumber: z.number().int(), orderIndex: z.number().int(), name: z.string(),
  address: z.string().nullish(), longitude: z.number(), latitude: z.number(), notes: z.string().nullish(),
});
export const itineraryDayDto = z.object({ id: z.string(), dayNumber: z.number().int(), subtitle: z.string().nullish(), dayDistanceKm: z.number().nullish() });
export const itineraryDetailDto = z.object({
  id: z.string(), userId: z.string(), title: z.string(), description: z.string().nullish(), coverImageUrl: z.string().nullish(),
  startDate: z.iso.date().nullish(), isPublic: z.boolean(), totalDistanceKm: z.number(),
  createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }),
  days: z.array(itineraryDayDto), waypoints: z.array(waypointDto),
});
export const itinerarySummaryDto = itineraryDetailDto.omit({ updatedAt: true, days: true, waypoints: true });
export const pagedDto = <T extends z.ZodType>(item: T) => z.object({
  items: z.array(item), pageIndex: z.number().int(), pageSize: z.number().int(), totalCount: z.number().int(), hasNextPage: z.boolean(),
});
```

### Repository chép đúng field hợp đồng (khuôn identity)
```ts
async updateWaypoint(id, waypointId, input) {
  await http.send({ method: 'PUT', path: `/itineraries/${id}/waypoints/${waypointId}`,
    body: { name: input.name, address: input.address, latitude: input.coordinate.latitude, longitude: input.coordinate.longitude, notes: input.notes } });
},
async listMine({ pageIndex, pageSize, status }, signal) {
  const data = await http.send({ method: 'GET', path: '/itineraries/mine', signal,
    query: { pageIndex, pageSize, isPublic: status === 'all' ? undefined : status === 'published' } });
  return toSummaryPage(pagedDto(itinerarySummaryDto).parse(data));
},
```
Path nối sau base `/api/bff`; id đã là `ItineraryId` (GUID chuẩn hóa) nên không cần `encodeURIComponent`, nhưng BFF vẫn encode lại từng segment.

### `beforeunload` chỉ khi bẩn
```ts
useEffect(() => {
  if (!isDirty) return;
  const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', onBeforeUnload);
  return () => window.removeEventListener('beforeunload', onBeforeUnload);
}, [isDirty]);
```

### Thông báo kéo thả tiếng Việt
```ts
export const viAnnouncements = (ids: () => readonly string[], nameOf: (id: string) => string): Announcements => {
  const pos = (id: UniqueIdentifier) => `${ids().indexOf(String(id)) + 1} trên ${ids().length}`;
  return {
    onDragStart: ({ active }) => `Đã nhấc ${nameOf(String(active.id))}, đang ở vị trí ${pos(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(String(active.id))} đang ở vị trí ${pos(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Đã thả ${nameOf(String(active.id))} ở vị trí ${pos(over.id)}.` : undefined),
    onDragCancel: ({ active }) => `Đã hủy. ${nameOf(String(active.id))} trở lại vị trí ${pos(active.id)}.`,
  };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Trang unmount khi điều hướng | `<Activity>` giữ 3 route khi bật Cache Components | Next 16.x | Flush trong effect cleanup; cuộn danh sách tự giữ |
| `Router.events` / `beforePopState` (Pages Router) | `Link onNavigate` + `preventDefault()` | App Router | Chỉ chặn được link của mình |
| `forbidden()` | Vẫn experimental (`authInterrupts`) ở 16.4 | — | Tự render 403 (D-45) |
| `goo.gl` ngừng toàn bộ 25/08/2025 | Google giữ link còn hoạt động; link chưa hoạt động cuối 2024 bị tắt | Thông báo 01/08/2025 | `goo.gl/maps/*` cũ có thể 404; `maps.app.goo.gl` vẫn chạy [CITED: blog.google] |
| `@dnd-kit/core` 6 | `@dnd-kit/react` 0.x (API mới) | 2025–2026 | Chưa 1.0; dùng 6.3.1 |
| Tailwind 3 `theme.extend` | Tailwind 4 `@theme` namespace (`--text-color-*`, `--z-index-*`) | 4.0 | Alias theo utility, không tạo nhầm `bg-muted` |

**Deprecated/outdated:**
- Global `JSX` namespace trong `.d.ts` của dnd-kit 6: `@types/react` 19 không còn; chạy nhờ `skipLibCheck`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Region Vercel châu Âu bị chuyển qua `consent.google.com` khi resolve | Pattern 8 | Thấp: code đã xử lý `continue`; nếu không có thì nhánh đó không chạy |
| A2 | `URL` của React Native không đầy đủ nên domain parse bằng chuỗi | Pattern 7 | Thấp: chỉ ảnh hưởng cách viết |
| A3 | Định dạng `data=!3d!4d` ổn định (không có tài liệu chính thức) | Pattern 7 | Trung bình: Google đổi thì mẫu #2 hỏng, còn `@` làm dự phòng |
| A4 | TanStack vẫn chạy mutation khi gọi `mutate` sau khi observer đã gỡ (trang ẩn) | Pattern 9 | Trung bình: lệnh xóa khi rời route có thể không gửi; có phương án gọi use case trực tiếp |
| A5 | DELETE `keepalive` mang `Origin` + `Sec-Fetch-Site: same-origin` + cookie | Pattern 11 | Trung bình: nếu thiếu, BFF trả 403 và lệnh xóa lúc đóng tab mất; kiểm bằng DevTools ở UAT |
| A6 | `visibilitychange` hidden là sự kiện cuối đáng tin trên mobile | Pattern 11 | Thấp |
| A7 | dnd-kit 6.3.1 ổn trong React 19.3 StrictMode | Pattern 12 | Trung bình: spike Wave 0 xác nhận |
| A8 | `data-base-ui-swipe-ignore` được logic vuốt của Drawer 1.8 tôn trọng | Pattern 12 | Trung bình: sheet bị kéo theo khi kéo điểm trên mobile |
| A9 | Activity ẩn cả nội dung portal (sheet timeline không modal) | Pattern 16 | Trung bình: sheet của editor đè lên trang danh sách |
| A10 | Hủy `onOpenChange` bằng `details.cancel()` làm Drawer bật lại mức peek | Pattern 16 | Thấp: dùng `open` controlled |
| A11 | Safari iOS không hiện hộp `beforeunload` | Pattern 14 | Thấp: chỉ mất cảnh báo, lệnh vẫn chạy |
| A12 | Mẫu `isMutating === 1` của TkDodo | Pattern 5 | Thấp |
| A13 | IntersectionObserver phát entry đầu khi `observe` | Pattern 6 | Thấp: chỉ ảnh hưởng thời điểm thử lại |

## Open Questions

1. **Copy cho link POI không có tọa độ (Pitfall 1)**
   - What we know: phần lớn link chia sẻ từ app là dạng này; không lấy được tọa độ nếu không dùng API.
   - What's unclear: người dùng có chấp nhận chỉ tự điền tên và yêu cầu dán tọa độ không, hay muốn đưa geocoding (MAP-01) lên sớm.
   - Recommendation: Phase 4 giữ D-20 (chỉ redirect), thêm một mã kết quả `no-coordinate` với câu riêng; ghi rủi ro UX vào UAT. Planner nên hỏi người dùng chốt câu hoặc chấp nhận câu đề xuất.
2. **Commit sớm khi tab bị ẩn (`visibilitychange`)**
   - Recommendation: chấp nhận (cùng tinh thần D-32); nếu người dùng muốn giữ đúng 5 giây khi chuyển tab trên desktop thì chỉ dùng `pagehide`.
3. **Tách tên/địa chỉ từ `/place/<tên, địa chỉ>/`**
   - Recommendation: lấy phần trước dấu phẩy đầu làm Tên, không tự điền Địa chỉ (D-21 chỉ khóa Tên).
4. **Rate limit route resolve**
   - What we know: route đòi phiên và Origin; serverless không có bộ nhớ chung để đếm.
   - Recommendation: không làm ở Phase 4; ghi vào threat model là rủi ro chấp nhận (người đã đăng nhập có thể dùng server làm máy gọi `maps.app.goo.gl`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/test, route resolve | ✓ | 24.14.1 | — |
| pnpm | workspace | ✓ | 10.34.6 | — |
| npm registry (dnd-kit) | cài thư viện | ✓ | core 6.3.1, sortable 10.0.0, utilities 3.2.2, modifiers 9.0.0 | — |
| Mạng ra `maps.app.goo.gl` từ server | Route resolve | ✓ (máy dev) | — | Trên Vercel chưa kiểm; UAT phải thử trên bản deploy |
| BE thật (`tripory_be`) | UAT | chưa kiểm trong phiên này | — | Không có mock (PROJECT) |
| Thiết bị cảm ứng thật | UAT kéo thả, sheet | ngoài máy | — | Không có fallback, bắt buộc UAT |

**Missing dependencies with no fallback:** không có cho việc code; UAT cần BE và điện thoại thật.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (+ Testing Library 16.3.3, jsdom 29.1.1 ở app/ui-web) |
| Config file | `packages/*/vitest.config.ts` (preset node), `apps/web/vitest.config.ts` (preset ui, jsdom, `src/test/setup.ts`) |
| Quick run command | `pnpm --filter @tripory/itinerary test` / `pnpm --filter @tripory/web test -- <tên file>` |
| Full suite command | `pnpm lint && pnpm typecheck && pnpm test` |

Quy ước sẵn có: package dùng môi trường node, hook cần DOM thì `// @vitest-environment jsdom` (thêm `jsdom` vào devDependencies của `itinerary` nếu test hook trong package); route handler trong app dùng `// @vitest-environment node`; fake `HttpClient` (object có `send`), không MSW; fake timers cho 5 giây/debounce.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ITIN-01 | DTO `/mine` parse, `isPublic` theo status, `getNextPageParam`, khử trùng id | unit (node) | `pnpm --filter @tripory/itinerary test -- http-itinerary-repository` | ❌ Wave 0 |
| ITIN-01 | `MyItinerariesView`: `?status` đọc/ghi, giá trị lạ → Tất cả, sentinel gọi `fetchNextPage`, lỗi trang kế không render gì, trang đầu lỗi → ErrorState | component (jsdom, fake IntersectionObserver) | `pnpm --filter @tripory/web test -- my-itineraries-view` | ❌ |
| ITIN-02 | Tạo: trim 1–100, Enter gửi, 201 → `router.push`, không toast, invalidate list | component | `... -- create-itinerary-dialog` | ❌ |
| ITIN-03 | `CalendarDate` bảng ca (29/02, tháng 13, rỗng), DTO `z.iso.date()`/`datetime offset` | unit | `pnpm --filter @tripory/itinerary test -- calendar-date dto` | ❌ |
| ITIN-03 | `TripInfoDialog`: https-only, ≤ 500, preview debounce 400ms, ảnh lỗi vẫn lưu, Xóa ngày → null | component | `... -- trip-info-dialog` | ❌ |
| ITIN-04 | `buildDayRange` ngày thưa, `nextDayNumber`, mapper sắp xếp, `""` subtitle → null | unit | `... -- day-range mappers` | ❌ |
| ITIN-04 | `DayTabs` thêm ngày optimistic + rollback; `DaySubtitle` Enter/blur/Esc/rỗng/>100 | component | `... -- day-tabs day-subtitle` | ❌ |
| ITIN-05 | `parseLocationInput` bảng mẫu (Pattern 7, gồm 2 URL thật đã resolve) | unit | `pnpm --filter @tripory/itinerary test -- location-input` | ❌ |
| ITIN-05 | `resolveShortMapsLink`: host lạ, http, >3 bước, timeout, 404, consent `continue`, không đọc body, không fetch đích | unit (node, fake fetch) | `pnpm --filter @tripory/web test -- maps-resolve` | ❌ |
| ITIN-05 | Route `/api/maps/resolve`: 405 GET, 403 Origin lạ, 401 không phiên/stale, 400 body sai, `no-store` | route (node) | `... -- api/maps/resolve` | ❌ |
| ITIN-05/06 | `WaypointFormDialog`/`LocationField`: thứ tự field, "Đã nhận", tự điền tên, resolve giả, lỗi khi blur/gửi, giới hạn 200/500/2000 | component | `... -- waypoint-form-dialog location-field` | ❌ |
| ITIN-07 | `createPendingDeleteController`: 5s commit, hoàn tác không gọi BE, xóa thứ hai commit thứ nhất, `onDismiss` sau `dismiss` không commit lần hai, flush | unit (fake timers) | `... -- pending-delete` | ❌ |
| ITIN-07 | `notify.undoable`: không tự đóng sau 10s, action một lần, `onDismiss`, `role=status` | component | `pnpm --filter @tripory/ui-web test -- toast` | ✅ (mở rộng) |
| ITIN-07 | `keepalive` được truyền vào `fetch` init | unit | `pnpm --filter @tripory/api-client test -- fetch-http-client` | ✅ (mở rộng) |
| ITIN-08 | `moveItem`, use case `reorderWaypoints` kiểm tập ID; hook optimistic + rollback + `scope` (DELETE trước reorder) | unit / hook (jsdom) | `pnpm --filter @tripory/itinerary test -- reorder react` | ❌ |
| ITIN-08 | `WaypointList` kéo bằng bàn phím trong `StrictMode`, announcements tiếng Việt, flush khi bắt đầu kéo, `InvalidReorderList` → info + refetch | component | `pnpm --filter @tripory/web test -- waypoint-list` | ❌ |
| ITIN-09 | Km hiển thị từ DTO sau refetch, ẩn khi 0/null, `Intl` vi-VN | component | `... -- trip-summary itinerary-card` | ❌ |
| ITIN-10 | `SaveIndicator` 4 trạng thái, retry gửi lại đúng biến; `beforeunload` chỉ khi bẩn; `Link onNavigate` → `LeaveEditorDialog`, tự đi tiếp khi hết mutation | component | `... -- save-indicator leave-guard` | ❌ |
| ITIN-11 | `canPublish` trừ pending; `PublishButton` `aria-disabled`; `PublishDialog` focus Hủy, `CannotPublishEmpty` inline | unit + component | `... -- permissions publish` | ❌ |
| ITIN-12 | `DeleteItineraryDialog` câu thêm khi đã xuất bản, `removeQueries` + invalidate, focus sau xóa thẻ | component | `... -- delete-itinerary-dialog` | ❌ |
| ITIN-13 | `canEdit`; page: GUID sai → `notFound`; BE 403 → `EditorForbidden`; BE 404 → NotFoundView; 5xx → ErrorState | unit + component | `... -- edit-page itinerary-editor` | ❌ |
| ITIN-13 | proxy bảo vệ `/itineraries/x/edit`, không gate `/itineraries/x` | unit (node) | `pnpm --filter @tripory/web test -- proxy` | ✅ (mở rộng `proxy-coverage`) |
| ITIN-14 | `resolveSnapPoints(vh, insetTop)` bảng giá trị; `Sheet` `dismissible`/`defaultSnap`; layout `(editor)` không AppShell | unit + component | `pnpm --filter @tripory/ui-web test -- sheet`; `... -- route-layouts` | ✅ (mở rộng) |
| Wave 0 | Token guard: `text-muted`… có CSS, không `var()` mồ côi | unit (node) | `pnpm --filter @tripory/design-tokens test` | ✅ (mở rộng) |
| Wave 0 | Boundaries: `itinerary` thêm zod/react/react-query vẫn xanh, `/http` chỉ trong composition | lint self-test | `pnpm --filter @tripory/config test` | ✅ |

**Chỉ kiểm được thủ công (UAT với BE thật trên bản deploy):**
- Kéo thả bằng cảm ứng trên iOS Safari và Android Chrome trong sheet (nhấn giữ 180ms, không kéo sheet theo, auto-scroll).
- Sheet 3 mức không che header ở 320×568 và 390×844, bàn phím ảo không che nút gửi.
- Resolve link `maps.app.goo.gl` thật từ server Vercel (cả link POI và link ghim).
- Đóng tab trong 5 giây sau khi xóa → điểm thật sự mất trên BE (`keepalive`), kiểm request trong DevTools có `Origin`.
- Hết phiên khi form đang mở → đăng nhập lại → form khôi phục.
- Hai tab cùng sửa → focus lại thấy dữ liệu mới; `InvalidReorderList` → toast info.
- Km theo ngày/tổng thay đổi đúng sau thêm, sửa, xóa, reorder.
- Trình đọc màn hình (VoiceOver/NVDA) đọc announcements kéo thả tiếng Việt.

### Sampling Rate
- **Per task commit:** test của file vừa sửa (`pnpm --filter <pkg> test -- <file>`).
- **Per wave merge:** `pnpm lint && pnpm typecheck && pnpm test`.
- **Phase gate:** toàn bộ xanh trước `/gsd-verify-work`, rồi UAT thủ công.

### Wave 0 Gaps
- [ ] Sửa `theme.css` + đổi `z-(--z-*)` + `max-w-(--size-content-sm)`; guard trong `tokens.test.ts`.
- [ ] `packages/itinerary/package.json`: `zod`, peer/dev `react`, `@tanstack/react-query`, `@types/react`; bỏ `--passWithNoTests` khi có test đầu.
- [ ] Catalog dnd-kit (4 gói) + spike StrictMode/keyboard dưới jsdom.
- [ ] `HttpRequest.keepalive` ở `api-client` + test.
- [ ] Proxy pattern `/edit` + `proxy-coverage.test.ts` + `route-layouts.test.tsx` theo cấu trúc group mới.
- [ ] `apps/web/src/test`: fixture DTO itinerary (hoặc `@tripory/itinerary/http` export `fixtures` như identity), fake IntersectionObserver.
- [ ] Chuyển `SubmitStatus` sang `apps/web/src/components`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | gián tiếp | Phiên cookie Phase 3; route resolve đòi phiên |
| V3 Session Management | yes | `withSessionRefresh`; `keepalive` không refresh (chấp nhận D-32); bản nháp khóa theo `viewerId` |
| V4 Access Control | yes | BE là nơi chặn (`GetOwnedItineraryAsync`); FE `canEdit` chỉ để ẩn UI; BFF allowlist `itineraries` |
| V5 Input Validation | yes | Zod ở form và ACL; route resolve dựng body từ field đặt tên cứng, giới hạn 2048 ký tự |
| V6 Cryptography | no | — |
| V12/V13 Files & API (SSRF) | yes | Route resolve: https only, allowlist host nguồn/đích, ≤ 3 bước, 5 giây, `redirect: "manual"`, không đọc body, không fetch đích |
| V14 Config | yes | `Cache-Control: no-store`, `nosniff` qua `errorEnvelope`/`successEnvelope` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Route resolve thành open proxy/SSRF (`?url=http://169.254.169.254`) | Spoofing/Info disclosure | Chỉ `https:` + host nguồn `maps.app.goo.gl`/`goo.gl/maps`, mỗi bước kiểm host trước khi theo, dừng khi tới host đích Google, không trả body |
| Trang lạ kích hoạt resolve bằng phiên của nạn nhân | CSRF | Chỉ `POST` + `checkSameOrigin`; phản hồi chỉ chứa URL Google công khai |
| Lạm dụng tài nguyên server (đã đăng nhập) | DoS | Timeout 5 giây, không đọc body; không rate limit (rủi ro chấp nhận, Open Question 4) |
| `keepalive` DELETE giả mạo từ site khác | CSRF | Cùng kiểm Origin của BFF; `SameSite=Lax` không gửi cookie cho DELETE cross-site |
| XSS qua tên/ghi chú/phụ đề/mô tả | Tampering | React escape; cấm `dangerouslySetInnerHTML`; `whitespace-pre-line` thay vì chèn HTML |
| Ảnh bìa URL: theo dõi người xem, `javascript:` | Info disclosure | Chỉ `https://`; `<img referrerPolicy="no-referrer" loading="lazy">`; không `next/image` proxy (D-25). Host ảnh vẫn thấy IP người xem (chấp nhận; nghiêm trọng hơn ở Phase 5 khi công khai). Chưa có CSP trong `next.config.ts`; nếu thêm thì `img-src https: data:` |
| Rò state/bản nháp giữa hai tài khoản cùng tab | Info disclosure | `key={viewerId}`, khóa bản nháp có `viewerId`, `queryClient.clear()` khi hết phiên |
| Tên tự điền từ URL chứa ký tự điều khiển | Tampering | `decodeURIComponent` trong `try/catch`, bỏ ký tự điều khiển, cắt 200 ký tự |
| Người không phải chủ thấy thao tác sửa | Elevation (UI) | `canEdit` false → `EditorForbidden`; BE vẫn chặn mọi lệnh ghi |

## Project Constraints (from AGENTS.md / kiến trúc)

- Đọc `ai-memories/tripory-fe--ddd-architecture.md` trước khi thêm code; đọc docs Next tại `apps/web/node_modules/next/dist/docs/`.
- pnpm workspace, version qua `catalog:` pin cứng; Turborepo.
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test` trước khi báo xong.
- Ranh giới ESLint (`boundaries.mjs`) có self-test; import bị chặn = đặt sai tầng, không sửa rule/allowlist cho qua. Phase này thêm dependency đúng allowlist sẵn có (`zod` ở infrastructure, `react` + `@tanstack/react-query` ở react). dnd-kit chỉ ở app.
- Không class (trừ `DomainError`), type readonly + pure function, `makeX(deps)`.
- `/http` chỉ import trong `apps/web/src/composition/**`; `server-only` chỉ ở `composition/*.server.ts`.
- Compound component dùng từ Server Component export phần con bằng named export.
- Không có `.kiro/steering/` hay `.agents/skills/` trong repo (không thấy khi liệt kê).

## Sources

### Primary (HIGH confidence)
- Code BE `tripory_be` nhánh `feat/be-fe-integration-group-a`: `ItinerariesController.cs`, `Validators/*.cs`, `Responses/*.cs`, `Itinerary.cs`, `ItineraryDay.cs`, `Waypoint.cs`, `WaypointName.cs`, `ItineraryTitle.cs`, `ItineraryDescription.cs`, `Wgs84Coordinate.cs`, `Persistence/Configurations/*.cs`, `ItineraryRepository.cs`, `ItineraryRepositoryExtensions.cs`, `GetItineraryByIdQueryHandler.cs`, `DomainErrors.cs`, `PagedResult.cs`, `API_ENDPOINTS.md` §6.
- Docs Next 16.4 cục bộ: `02-guides/preserving-ui-state.md`, `03-api-reference/02-components/link.md` (§onNavigate), `04-functions/forbidden.md`, `04-functions/not-found.md`, `03-file-conventions/route-groups.md`, `dynamic-routes.md`, `use-search-params.md`, `02-guides/client-side-data-fetching/tanstack-query.md`, `use-router.md` (§bfcacheId).
- Mã trong `node_modules`: `tailwindcss@4.3.3/dist/lib.js` (themeKeys), `@tailwindcss/node` compile thử, `sonner@2.0.8/dist/index.mjs`, `@base-ui/react@1.8.0` (`DrawerRoot.d.ts`, `internals/constants.js`), `@tanstack/query-core@5.104.2` (.d.ts), `zod@4.6.7` (chạy thử).
- npm registry: `@dnd-kit/core` 6.3.1, `sortable` 10.0.0, `utilities` 3.2.2, `modifiers` 9.0.0, `accessibility` 3.1.1, `@dnd-kit/react` 0.5.1.
- Gọi thật `maps.app.goo.gl` (2026-10-24): `PJdcARfqULFnpENj7` → `/maps/place/…/data=!4m2!3m1!1s…`; `wsmXZrYfP8V3ur2RA` → `/maps/search/29.996966,+68.748251`; id sai → 404; HEAD cũng 302.
- Code FE: `bff.ts`, `request-guards.ts`, `http.client.ts`, `viewer.server.ts`, `dashboard-gate.ts`, `session-effects.tsx`, `session-events.client.ts`, `proxy.ts`, `proxy-coverage.test.ts`, `route-layouts.test.tsx`, `toast.tsx`, `sheet.tsx`, `sheet-snap.ts`, `inline-alert.tsx`, `theme.css`, `components.css`, `tokens.test.ts`, `token-guard.test.ts`, `error-messages.ts`, `fetch-http-client.ts`, `boundaries.mjs`.

### Secondary (MEDIUM confidence)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started): `search/?api=1&query=lat,lng`, `dir/?api=1&destination=`, `@?api=1&map_action=map&center=`.
- [dnd-kit Touch sensor](https://dndkit.com/api-documentation/sensors/touch): `delay`/`tolerance`, khuyến nghị `touch-action`.
- [Google blog: cập nhật kế hoạch goo.gl](https://blog.google/technology/developers/googl-link-shortening-update/) (01/08/2025).
- [Firefox 133 release notes](https://www.mozilla.org/firefox/133.0/releasenotes/): hỗ trợ `keepalive`.
- [whatwg/fetch#679](https://github.com/whatwg/fetch/issues/679): trần 64 KiB cho `keepalive`.
- [dnd-kit issue #1559](https://github.com/clauderic/dnd-kit/issues/1559): `Cannot find namespace 'JSX'` với React 19 types.

### Tertiary (LOW confidence)
- Luồng `consent.google.com` cho IP châu Âu; định dạng `data=!3d!4d`; hành vi Activity với portal; TkDodo concurrent optimistic updates (chưa mở lại bài).

Nội dung từ nguồn web đã được diễn đạt lại để tuân thủ giới hạn trích dẫn.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — version kiểm trên registry, tính năng kiểm trong mã cài sẵn.
- Contract BE: HIGH — đọc code.
- Architecture (Activity, layout, guard): HIGH theo docs 16.4; MEDIUM cho tương tác Activity với portal/mutation.
- Google Maps: HIGH cho hai dạng đã gọi thật; MEDIUM cho các mẫu còn lại.
- dnd-kit trong sheet trên mobile: MEDIUM, cần UAT.

**Research date:** 2026-10-24
**Valid until:** 2026-11-23 (30 ngày; hành vi link rút gọn của Google có thể đổi sớm hơn)


---

# Mở lại 2026-10-30: form tạo 4 khối, nhiều ảnh bìa, tự lưu

**Researched:** 2026-11-02 (cho phần mở lại theo `04-CONTEXT.md` D-52..D-101)
**Domain:** form tạo accordion (Base UI 1.8.0), danh mục 34 điểm đến, ảnh bìa tự lưu trữ, tự lưu với TanStack Query, hợp đồng BE mới
**Confidence:** HIGH cho danh mục 34 đơn vị, mã số, hành vi Base UI và code BE (đều đã đọc nguồn); MEDIUM cho alias thành phố du lịch và giấy phép ảnh; LOW cho vài hành vi trình duyệt (ghi rõ ở từng chỗ).

Phạm vi: chỉ ITIN-02 và ITIN-03 phần mở lại. PUB-02 nằm ngoài. Mọi quyết định D-52..D-101 đã khóa, phần này không đề xuất phương án thay thế cho chúng.

<user_constraints>
## Ràng buộc của user cho phần mở lại (tóm tắt, nguyên văn ở `04-CONTEXT.md`)

### Quyết định đã khóa
- **Cách làm BE (D-52, D-57, D-58):** user tự sửa `tripory_be`. Agent chỉ viết tài liệu đặc tả hợp đồng: endpoint, JSON, luật validate kèm mã lỗi đề xuất, trường DTO mới, cách `PUT` giữ nguyên trường thiếu, danh mục mã điểm đến và sở thích, migration mô tả bằng lời. **Không có code, không có ca kiểm thử.** Mỗi thay đổi có giải thích 5W1H. Plan đầu chỉ viết tài liệu rồi dừng ở checkpoint; mọi plan FE chạy sau checkpoint.
- **Dữ liệu (D-53..D-56):** 34 điểm đến là hằng số C# kèm validator; FE và BE dùng chung slug có tiền tố quốc gia (`vn-da-nang`), không dùng mã số hành chính làm id. `PUT /itineraries/{id}` thiếu điểm đến hoặc sở thích thì BE giữ nguyên. Sở thích là `text[]` mã cố định, không trùng, tối đa 7. Request tạo nhận số ngày 1–30, BE tạo đủ Ngày 1..N.
- **Form tạo (D-59..D-75, D-92..D-97):** một modal, 4 khối accordion chỉ mở một khối (Điểm đến → Tên chuyến đi → Thời gian → Sở thích), khối Điểm đến mở sẵn; chọn điểm đến xong tự đóng và mở khối Tên; Enter ở ô Tên không gửi form; nút "Tạo lịch trình" dính đáy; bấm Tạo khi lỗi thì mở khối lỗi đầu tiên và focus ô lỗi; `ResponsiveFormSurface`; tên mặc định "Chuyến đi {Tên điểm đến}"; số ngày −/+ 1–30 mặc định 3; ngày khởi hành tùy chọn, không chặn quá khứ, không hiện ngày kết thúc; 7 sở thích dạng chip; đóng giữa chừng không hỏi; gửi một request; không có khối ảnh bìa; điểm đến và sở thích chưa hiện và chưa sửa được sau khi tạo; thẻ danh sách chưa hiện điểm đến; cập nhật PT-01 trong `tripory/docs`.
- **Danh mục (D-92, D-59..D-61):** 34 đơn vị theo Nghị quyết 202/2025/QH15, đối chiếu văn bản gốc; tìm theo alias đã xác minh; nhóm "Phổ biến" (khoảng 8) theo bảng tĩnh D-61 và "Tất cả" theo chữ cái; tìm không dấu.
- **Ảnh bìa (D-79..D-86, D-99, D-100):** 34 ảnh tuyển sẵn, tự lưu trữ, URL https tuyệt đối dùng được cho Open Graph, giấy phép từng ảnh phải xác minh, không dùng Unsplash API hay Wikimedia động. Lúc tạo BE ghi ảnh mặc định thành ảnh 1 và chọn nó. Tối đa 5 ảnh, chọn một ảnh hiển thị, DTO giữ `coverImageUrl` = ảnh đang hiển thị, `CoverImageUrl` cũ thành ảnh 1. Chỉ nhập URL https, không upload. Chỉ sửa trong "Thông tin chuyến đi". Lưới 5 ô dạng radio, nút X xóa, xóa ảnh đang chọn thì chọn ảnh đầu còn lại, xóa hết thì hiện ảnh điểm đến làm dự phòng nhưng không ghi vào danh sách.
- **Tự lưu (D-87..D-91, D-101):** không còn nút Lưu/Hủy; ô chữ lưu khi blur và sau khoảng 800 ms ngừng gõ; ngày khởi hành và thao tác ảnh lưu ngay; lệnh ghi xếp hàng chung scope `itinerary:{id}`; giá trị sai không gửi; đóng form khi còn lỗi thì bỏ giá trị sai; trong form chỉ báo khi lưu lỗi (kèm "Thử lại"); chỉ báo header giữ D-30.

### Claude's Discretion (phần mở lại)
Hình dạng type `Destination`, port danh mục và adapter tĩnh, tên hàm thuần; vị trí 34 ảnh (app `public/` hay CDN) miễn URL https tuyệt đối ổn định; component mới trong `ui-web`; số mục nhóm "Phổ biến"; giá trị debounce; giữ hay bỏ bản nháp D-36 cho form metadata; tên file tài liệu BE; mã lỗi BE chính xác (chỉ đề xuất).

### Ngoài phạm vi
PUB-02/PUB-06; hiện điểm đến và sở thích trong editor/thẻ; sửa điểm đến và sở thích sau khi tạo; upload ảnh; điểm đến ngoài Việt Nam; chọn nhiều điểm đến; hạng phổ biến theo thống kê BE.
</user_constraints>

<phase_requirements>
## Yêu cầu của phần mở lại

| ID | Mô tả (REQUIREMENTS.md, viết lại 2026-10-30) | Mục hỗ trợ trong phần này |
|----|------|------|
| ITIN-02 | Tạo lịch trình trong một modal 4 khối accordion (điểm đến trong 34 tỉnh/thành, tên mặc định theo điểm đến, ngày khởi hành và số ngày 1–30, sở thích), vào thẳng editor với đủ số ngày | §R1 (danh mục, alias, hạng), §R3 (Accordion, RadioGroup, ToggleGroup, NumberField), §R5 (request tạo một lần, Day 1..N), §R6 (vị trí code), §R7 (test, UAT) |
| ITIN-03 | "Thông tin chuyến đi" tự lưu, tối đa 5 ảnh bìa dạng lưới, chọn một ảnh hiển thị, ảnh mặc định theo điểm đến | §R2 (bộ ảnh, giấy phép, URL), §R4 (thiết kế tự lưu), §R5 (hợp đồng `PUT` có danh sách ảnh), §R6, §R7 |
</phase_requirements>

## Tóm tắt phần mở lại

Danh sách 34 đơn vị cấp tỉnh và mã số đã đối chiếu được với bảng của Quyết định 19/2025/QĐ-TTg do Báo Chính phủ đăng lại (tên chính thức có tiền tố "Thành phố"/"Tỉnh", mã hai chữ số). Danh sách tỉnh cũ gộp vào từng đơn vị lấy từ Đề án của Chính phủ (Báo Chính phủ, 04/2025) và khớp với tóm tắt Nghị quyết 202/2025/QH15 trên Wikipedia; chưa tải được nguyên văn Nghị quyết (thuvienphapluat trả 403), nên plan đầu nên kèm một bước để user liếc văn bản gốc. Mã số tự kiểm được: đơn vị sáp nhập mang mã của tỉnh đặt trụ sở (Lào Cai mang 15 của Yên Bái, Gia Lai mang 52 của Bình Định...), khớp đúng nguyên tắc trong Quyết định 19.

Bốn phát hiện đổi cách plan. (1) **BE chỉ trả lỗi validate đầu tiên, với `errorCode` mặc định của FluentValidation** (`NotEmptyValidator`, `MaximumLengthValidator`...) và không có tên field (`ValidationPipelineBehavior.cs`). Vì vậy mọi rule mới phải có `.WithErrorCode("Itinerary.…")` thì FE mới gắn lỗi vào đúng khối được; và mã không được chứa chuỗi `NotFound`, `Conflict`, `AlreadyExists`, `Unauthorized`, `Forbidden`, vì `ApiController.HandlerFailure` chọn HTTP status theo chuỗi con của mã. (2) **Base UI 1.8.0 không phân biệt được "chọn bằng mũi tên" với "bấm" qua `onValueChange` của RadioGroup** (reason luôn là `none`). Muốn tự chuyển khối chỉ khi bấm/Space/Enter (UI-SPEC), phải bắt `onClick` và `onKeyDown` trên chính `Radio`. (3) **`NumberField` để trống rồi blur thì trả `null`** (reason `input-clear`), không tự quay về giá trị cũ như UI-SPEC viết; và `NumberField.Input` gắn sẵn `aria-roledescription="Number field"` bằng tiếng Anh. (4) **Esc của Dialog/Drawer Base UI không xét `defaultPrevented`**, nên `SearchInput` gọi `preventDefault` khi Esc vẫn không ngăn được modal đóng; phải hủy trong `onOpenChange` theo `eventDetails.reason === 'escape-key'` và phần tử nguồn.

Về tự lưu: `onMutate` của TanStack Query 5.104.2 chạy ngay lúc `mutate()` kể cả khi lệnh còn xếp hàng trong scope, và biến của lệnh bị chốt tại thời điểm đó. Mỗi lệnh `PUT` vì vậy phải mang ảnh chụp đầy đủ của form tại lúc gửi, lệnh cuối thắng. Đề xuất một bộ "single-flight + trailing" cho riêng form metadata để chuỗi đổi ảnh bằng phím mũi tên không thành N lệnh `PUT`.

**Khuyến nghị chính:** hợp đồng `PUT /itineraries/{id}` nhận cả danh sách `coverImages` và ảnh đang chọn trong một lệnh (không làm endpoint thêm/xóa/chọn riêng); ảnh mặc định đặt ở `apps/web/public/destinations/<slug>.jpg` trên alias production `https://triporyv1.vercel.app`, gốc URL cấu hình ở cả FE và BE; form tạo dựng trên 4 component `ui-web` mới bọc Base UI; chia 7 plan với plan 04-24 (tài liệu BE) và plan ảnh là `autonomous: false`.

## Bản đồ trách nhiệm (phần mở lại)

| Năng lực | Tầng chính | Tầng phụ | Lý do |
|---|---|---|---|
| Danh mục 34 điểm đến (nguồn sự thật) | API/Backend (hằng số C# + validator) | Browser (bản sao tĩnh trong `packages/itinerary`) | D-53: BE kiểm mã; FE cần danh mục offline để tìm và hiển thị |
| Tìm không dấu, alias, xếp hạng | Browser (domain thuần) | — | D-60, không gọi mạng |
| Tên mặc định, cờ "đã sửa tên" | Browser (domain thuần) | — | D-93 |
| Tạo Ngày 1..N, ảnh mặc định lúc tạo | API/Backend | — | D-56, D-80: một request, BE tạo đủ |
| Kiểm danh sách ảnh (≤ 5, https, không trùng, ảnh chọn thuộc danh sách) | API/Backend | Browser (Zod + hàm thuần) | BE là chốt chặn; FE chặn sớm để không gửi giá trị sai (D-89) |
| Lưu trữ 34 ảnh mặc định | CDN/Static (Vercel, `public/`) | — | D-79 |
| Tự lưu, debounce, xếp hàng | Browser (hook ở app + `useWriteMutation`) | Frontend Server (BFF chuyển tiếp) | Cần timer, focus, vòng đời dialog |
| Chuỗi ảnh dự phòng (ảnh chọn → ảnh điểm đến → nền) | Browser (component `CoverImage`) | — | Chỉ hiển thị, không ghi |

## R1. Danh mục 34 đơn vị cấp tỉnh

### Nguồn
- Danh mục và mã số: Quyết định 19/2025/QĐ-TTg, hiệu lực 01/07/2025, bảng 34 đơn vị đăng lại trên [Báo Chính phủ](https://baochinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-3321-don-vi-hanh-chinh-cap-xa-moi-102250704153652947.htm) [VERIFIED: web_fetch 2026-11-02]. Bài này cũng nêu nguyên tắc: tỉnh hợp nhất mang mã của tỉnh có trụ sở UBND, mã còn lại bị đóng; đổi tên thì mã không đổi.
- Tỉnh cũ gộp vào: Đề án sắp xếp của Chính phủ trên [Báo Chính phủ bản tiếng Anh](https://en.baochinhphu.vn/names-and-administrative-centers-of-34-provinces-and-centrally-run-cities-specified-111250415094350491.htm) (15/04/2025) [VERIFIED: web_fetch], đối chiếu với danh sách tỉnh giải thể năm 2025 trên [Wikipedia "Provinces of Vietnam"](https://en.wikipedia.org/wiki/Provinces_of_Vietnam) và các trang xã trích Nghị quyết 202 (Hà Giang vào Tuyên Quang, Bình Định vào Gia Lai, Tiền Giang vào Đồng Tháp, Bà Rịa–Vũng Tàu vào TP. Hồ Chí Minh) [VERIFIED: web search, nguồn thứ cấp].
- **Chưa tải được nguyên văn Nghị quyết 202/2025/QH15** (thuvienphapluat 403; bản PDF của HĐND TP.HCM chỉ trích căn cứ). Văn bản toàn văn được Wikipedia dẫn tới `xaydungchinhsach.chinhphu.vn` ("TOÀN VĂN: Nghị quyết số 202/2025/QH15...", 16/07/2025) [UNVERIFIED: chưa mở được]. Rủi ro thấp vì hai nguồn độc lập khớp nhau và mã số khớp nguyên tắc trụ sở, nhưng D-92 đòi văn bản gốc: plan 04-24 nên có một dòng trong checkpoint để user xác nhận đã đối chiếu.
- Ngày hiệu lực: Wikipedia ghi Nghị quyết 202 có hiệu lực từ ngày thông qua 12/06/2025; chính quyền cấp tỉnh mới và Quyết định 19 chạy từ 01/07/2025 [VERIFIED cho QĐ 19; ngày hiệu lực của NQ 202 UNVERIFIED]. Không ảnh hưởng tới code.

### Bảng 34 đơn vị (thứ tự theo mã của QĐ 19)

Tên hiển thị bỏ tiền tố "Thành phố"/"Tỉnh", riêng TP. Hồ Chí Minh viết "TP. Hồ Chí Minh" (D-61). `kind`: `municipality` = thành phố trực thuộc trung ương, `province` = tỉnh. Slug theo D-53: `vn-` + tên không dấu, chữ thường, nối gạch. Mã số chỉ để tham chiếu, không làm id.

| Mã | Tên chính thức (QĐ 19) | Tên hiển thị | Loại | Slug đề xuất | Gộp từ (Đề án 04/2025) |
|---|---|---|---|---|---|
| 01 | Thành phố Hà Nội | Hà Nội | municipality | `vn-ha-noi` | giữ nguyên |
| 04 | Tỉnh Cao Bằng | Cao Bằng | province | `vn-cao-bang` | giữ nguyên |
| 08 | Tỉnh Tuyên Quang | Tuyên Quang | province | `vn-tuyen-quang` | Tuyên Quang, Hà Giang |
| 11 | Tỉnh Điện Biên | Điện Biên | province | `vn-dien-bien` | giữ nguyên |
| 12 | Tỉnh Lai Châu | Lai Châu | province | `vn-lai-chau` | giữ nguyên |
| 14 | Tỉnh Sơn La | Sơn La | province | `vn-son-la` | giữ nguyên |
| 15 | Tỉnh Lào Cai | Lào Cai | province | `vn-lao-cai` | Lào Cai, Yên Bái |
| 19 | Tỉnh Thái Nguyên | Thái Nguyên | province | `vn-thai-nguyen` | Thái Nguyên, Bắc Kạn |
| 20 | Tỉnh Lạng Sơn | Lạng Sơn | province | `vn-lang-son` | giữ nguyên |
| 22 | Tỉnh Quảng Ninh | Quảng Ninh | province | `vn-quang-ninh` | giữ nguyên |
| 24 | Tỉnh Bắc Ninh | Bắc Ninh | province | `vn-bac-ninh` | Bắc Ninh, Bắc Giang |
| 25 | Tỉnh Phú Thọ | Phú Thọ | province | `vn-phu-tho` | Phú Thọ, Vĩnh Phúc, Hòa Bình |
| 31 | Thành phố Hải Phòng | Hải Phòng | municipality | `vn-hai-phong` | Hải Phòng, Hải Dương |
| 33 | Tỉnh Hưng Yên | Hưng Yên | province | `vn-hung-yen` | Hưng Yên, Thái Bình |
| 37 | Tỉnh Ninh Bình | Ninh Bình | province | `vn-ninh-binh` | Ninh Bình, Hà Nam, Nam Định |
| 38 | Tỉnh Thanh Hóa | Thanh Hóa | province | `vn-thanh-hoa` | giữ nguyên |
| 40 | Tỉnh Nghệ An | Nghệ An | province | `vn-nghe-an` | giữ nguyên |
| 42 | Tỉnh Hà Tĩnh | Hà Tĩnh | province | `vn-ha-tinh` | giữ nguyên |
| 44 | Tỉnh Quảng Trị | Quảng Trị | province | `vn-quang-tri` | Quảng Trị, Quảng Bình |
| 46 | Thành phố Huế | Huế | municipality | `vn-hue` | giữ nguyên |
| 48 | Thành phố Đà Nẵng | Đà Nẵng | municipality | `vn-da-nang` | Đà Nẵng, Quảng Nam |
| 51 | Tỉnh Quảng Ngãi | Quảng Ngãi | province | `vn-quang-ngai` | Quảng Ngãi, Kon Tum |
| 52 | Tỉnh Gia Lai | Gia Lai | province | `vn-gia-lai` | Gia Lai, Bình Định |
| 56 | Tỉnh Khánh Hòa | Khánh Hòa | province | `vn-khanh-hoa` | Khánh Hòa, Ninh Thuận |
| 66 | Tỉnh Đắk Lắk | Đắk Lắk | province | `vn-dak-lak` | Đắk Lắk, Phú Yên |
| 68 | Tỉnh Lâm Đồng | Lâm Đồng | province | `vn-lam-dong` | Lâm Đồng, Đắk Nông, Bình Thuận |
| 75 | Tỉnh Đồng Nai | Đồng Nai | province | `vn-dong-nai` | Đồng Nai, Bình Phước |
| 79 | Thành phố Hồ Chí Minh | TP. Hồ Chí Minh | municipality | `vn-ho-chi-minh` | TP. Hồ Chí Minh, Bình Dương, Bà Rịa–Vũng Tàu |
| 80 | Tỉnh Tây Ninh | Tây Ninh | province | `vn-tay-ninh` | Tây Ninh, Long An |
| 82 | Tỉnh Đồng Tháp | Đồng Tháp | province | `vn-dong-thap` | Đồng Tháp, Tiền Giang |
| 86 | Tỉnh Vĩnh Long | Vĩnh Long | province | `vn-vinh-long` | Vĩnh Long, Bến Tre, Trà Vinh |
| 91 | Tỉnh An Giang | An Giang | province | `vn-an-giang` | An Giang, Kiên Giang |
| 92 | Thành phố Cần Thơ | Cần Thơ | municipality | `vn-can-tho` | Cần Thơ, Sóc Trăng, Hậu Giang |
| 96 | Tỉnh Cà Mau | Cà Mau | province | `vn-ca-mau` | Cà Mau, Bạc Liêu |

Kiểm đếm: 11 đơn vị giữ nguyên + 23 đơn vị sáp nhập = 34; 6 thành phố, 28 tỉnh [VERIFIED: đếm trên bảng QĐ 19]. Mã của 23 đơn vị sáp nhập đều là mã của tỉnh đặt trụ sở theo Đề án (Lào Cai 15 = Yên Bái, Bắc Ninh 24 = Bắc Giang, Quảng Trị 44 = Quảng Bình, Gia Lai 52 = Bình Định, Tây Ninh 80 = Long An, Đồng Tháp 82 = Tiền Giang, An Giang 91 = Kiên Giang) [VERIFIED: đối chiếu chéo hai nguồn trên].

Slug: chuyển `đ` thành `d` (`vn-da-nang`, `vn-dak-lak`, `vn-dien-bien`, `vn-dong-nai`, `vn-dong-thap`); `vn-ho-chi-minh` không kèm "tp" để slug không đổi nếu tên hiển thị đổi. Slug là quyết định thiết kế, không phải dữ liệu chính thức [ASSUMED: user duyệt ở checkpoint 04-24].

### Alias (D-59)

Quy ước trạng thái: **VERIFIED** = có nguồn cho thấy địa danh thuộc đơn vị mới; **SUY RA** = nguồn xác nhận tỉnh cũ đã gộp vào đơn vị mới, còn việc địa danh thuộc tỉnh cũ là kiến thức chung chưa tra trong phiên này (planner coi như UNVERIFIED, user duyệt). Tên tỉnh cũ đều VERIFIED theo bảng trên.

| Đơn vị | Alias tỉnh cũ (VERIFIED) | Alias địa danh du lịch | Trạng thái và nguồn |
|---|---|---|---|
| Hà Nội | — | Thủ đô | ghi chú: alias không phải địa danh, tùy chọn [ASSUMED] |
| Tuyên Quang | Hà Giang | Đồng Văn, Mèo Vạc | Hà Giang: VERIFIED ([Wikipedia Hà Giang 1/2](https://en.wikipedia.org/wiki/H%C3%A0_Giang_2), phường Hà Giang 1/2 thuộc Tuyên Quang); Đồng Văn, Mèo Vạc: SUY RA |
| Lào Cai | Yên Bái | Sa Pa, Mù Cang Chải | Sa Pa: VERIFIED ([Wikipedia Sa Pa](https://en.wikipedia.org/wiki/Sa_Pa): phường của tỉnh Lào Cai; vietnam.vn "Sa Pa Ward Police in Lao Cai Province"); Mù Cang Chải: SUY RA |
| Thái Nguyên | Bắc Kạn | Ba Bể | SUY RA |
| Quảng Ninh | — | Hạ Long | SUY RA (tỉnh không đổi) |
| Bắc Ninh | Bắc Giang | — | — |
| Phú Thọ | Vĩnh Phúc, Hòa Bình | Tam Đảo, Mai Châu | SUY RA |
| Hải Phòng | Hải Dương | Cát Bà | SUY RA |
| Hưng Yên | Thái Bình | — | — |
| Ninh Bình | Hà Nam, Nam Định | Tràng An, Tam Cốc | SUY RA |
| Quảng Trị | Quảng Bình | Phong Nha, Đồng Hới | Phong Nha: VERIFIED ([Wikipedia Phong Nha](https://en.wikipedia.org/wiki/Phong_Nha): xã của tỉnh Quảng Trị); Đồng Hới: VERIFIED (trụ sở tỉnh mới theo Đề án) |
| Đà Nẵng | Quảng Nam | Hội An | Hội An: VERIFIED ([Wikipedia Hội An, Da Nang](https://en.wikipedia.org/wiki/H%E1%BB%99i_An,_Da_Nang): phường của Đà Nẵng) |
| Quảng Ngãi | Kon Tum | Măng Đen, Lý Sơn | SUY RA |
| Gia Lai | Bình Định | Quy Nhơn, Pleiku | Quy Nhơn: VERIFIED (trụ sở tỉnh mới theo Đề án; "phường Quy Nhơn" trên [Trường Chính trị tỉnh Gia Lai](https://truongchinhtri.gialai.org.vn/)); Pleiku: SUY RA |
| Khánh Hòa | Ninh Thuận | Nha Trang, Phan Rang | Nha Trang: VERIFIED (trụ sở theo Đề án); Phan Rang: SUY RA |
| Đắk Lắk | Phú Yên | Buôn Ma Thuột, Tuy Hòa | Buôn Ma Thuột: VERIFIED (trụ sở theo Đề án); Tuy Hòa: SUY RA |
| Lâm Đồng | Đắk Nông, Bình Thuận | Đà Lạt, Mũi Né, Phan Thiết | Đà Lạt: VERIFIED (trụ sở theo Đề án); Mũi Né: VERIFIED ([Wikipedia Mũi Né](https://en.wikipedia.org/wiki/M%C5%A9i_N%C3%A9): phường của Lâm Đồng); Phan Thiết: VERIFIED ([Wikipedia Phan Thiết](https://en.wikipedia.org/wiki/Phan_Thi%E1%BA%BFt) trích NQ 1671 về xã của Lâm Đồng) |
| Đồng Nai | Bình Phước | — | — |
| TP. Hồ Chí Minh | Bình Dương, Bà Rịa–Vũng Tàu | Sài Gòn, Vũng Tàu, Côn Đảo, HCM | Vũng Tàu: VERIFIED ([Wikipedia Bà Rịa–Vũng Tàu](https://en.wikipedia.org/wiki/B%C3%A0_R%E1%BB%8Ba%E2%80%93V%C5%A9ng_T%C3%A0u_province)); Côn Đảo: VERIFIED ([Wikipedia Côn Đảo](https://en.wikipedia.org/wiki/C%C3%B4n_%C4%90%E1%BA%A3o): đặc khu duy nhất của TP. Hồ Chí Minh); Sài Gòn, HCM: tên gọi khác [ASSUMED] |
| Tây Ninh | Long An | — | — |
| Đồng Tháp | Tiền Giang | Mỹ Tho | Mỹ Tho: VERIFIED (trụ sở theo Đề án) |
| Vĩnh Long | Bến Tre, Trà Vinh | — | — |
| An Giang | Kiên Giang | Phú Quốc, Hà Tiên, Rạch Giá, Châu Đốc | Phú Quốc: VERIFIED (cổng `phuquoc.angiang.gov.vn` của đặc khu Phú Quốc thuộc An Giang); Rạch Giá: VERIFIED (trụ sở theo Đề án); Hà Tiên, Châu Đốc: SUY RA |
| Cần Thơ | Sóc Trăng, Hậu Giang | — | — |
| Cà Mau | Bạc Liêu | — | — |
| Các đơn vị còn lại (Cao Bằng, Điện Biên, Lai Châu, Sơn La, Lạng Sơn, Thanh Hóa, Nghệ An, Hà Tĩnh, Huế) | — | Mộc Châu (Sơn La), Sầm Sơn (Thanh Hóa) | SUY RA |

Ghi chú cho planner:
- Alias phải viết có dấu đúng chính tả ("Bà Rịa – Vũng Tàu" và "Vũng Tàu" là hai alias; gạch nối được chuẩn hóa thành khoảng trắng khi so khớp).
- "Thừa Thiên Huế" là tên tỉnh cũ của Huế trước khi Huế thành thành phố trực thuộc trung ương (đầu năm 2025) [ASSUMED]; nên thêm làm alias của Huế nếu user đồng ý.
- Dòng phụ "gồm {alias}" chỉ hiện khi khớp qua alias (UI-SPEC §Khối Điểm đến). Một từ khóa có thể khớp alias của nhiều đơn vị (ví dụ "Quảng" khớp Quảng Nam và Quảng Bình); dòng phụ lấy alias đầu tiên khớp của chính đơn vị đó.

### Hạng phổ biến (D-61) và nhóm "Phổ biến"

| Hạng | Tên hiển thị | Slug |
|---|---|---|
| 1 | Đà Nẵng | `vn-da-nang` |
| 2 | TP. Hồ Chí Minh | `vn-ho-chi-minh` |
| 3 | Hà Nội | `vn-ha-noi` |
| 4 | Khánh Hòa | `vn-khanh-hoa` |
| 5 | Lâm Đồng | `vn-lam-dong` |
| 6 | Quảng Ninh | `vn-quang-ninh` |
| 7 | An Giang | `vn-an-giang` |
| 8 | Lào Cai | `vn-lao-cai` |
| 9 | Huế | `vn-hue` |
| 10 | Ninh Bình | `vn-ninh-binh` |
| — | 24 đơn vị còn lại | `popularityRank: null`, xếp theo chữ cái |

Cả 10 tên trong D-61 đều trùng tên hiển thị của bảng QĐ 19 [VERIFIED]. Nhóm "Phổ biến" lấy **8 mục đầu** (UI-SPEC đã ghi "8 dòng theo hạng D-61"); hạng 9–10 vẫn dùng để xếp kết quả tìm khi cùng mức khớp. Nếu user muốn nhóm 10 mục thì chỉ đổi một hằng số.

Thứ tự "Tất cả": nên khai báo sẵn trong file dữ liệu theo thứ tự chữ cái tiếng Việt so từng ký tự (a < ă < â < b < c < d < đ < e < ê < ... ; khoảng trắng đứng trước chữ), có test khóa nguyên mảng, thay vì sắp lúc chạy bằng `localeCompare('vi')` (kết quả ICU có thể khác giữa Node và trình duyệt) [ASSUMED: chưa so ICU thực tế]. TP. Hồ Chí Minh xếp theo "Hồ Chí Minh". Thứ tự đề xuất: An Giang, Bắc Ninh, Cà Mau, Cao Bằng, Cần Thơ, Đà Nẵng, Đắk Lắk, Điện Biên, Đồng Nai, Đồng Tháp, Gia Lai, Hà Nội, Hà Tĩnh, Hải Phòng, TP. Hồ Chí Minh, Huế, Hưng Yên, Khánh Hòa, Lai Châu, Lạng Sơn, Lào Cai, Lâm Đồng, Nghệ An, Ninh Bình, Phú Thọ, Quảng Ngãi, Quảng Ninh, Quảng Trị, Sơn La, Tây Ninh, Thái Nguyên, Thanh Hóa, Tuyên Quang, Vĩnh Long. Cách sắp này không coi "ng", "nh", "th" là một chữ cái như từ điển truyền thống; user duyệt ở checkpoint [ASSUMED].

### Mã sở thích (D-55, D-70)

| Thứ tự | Nhãn (UI) | Mã đề xuất |
|---|---|---|
| 1 | Lịch sử & Văn hóa | `history-culture` |
| 2 | Thiên nhiên | `nature` |
| 3 | Mua sắm | `shopping` |
| 4 | Ẩm thực & Đồ uống | `food-drink` |
| 5 | Giải trí | `entertainment` |
| 6 | Sức khỏe | `wellness` |
| 7 | Khác | `other` |

Hai mã đầu lấy từ ví dụ của D-55; năm mã sau là đề xuất [ASSUMED: user chốt trong tài liệu BE].

<!-- Gộp 2026-11-02 từ hai lượt nghiên cứu song song: R2+R5 và R3+R4+R6+R7+R8 -->

# Phase 04 mở lại (2026-10-30): nghiên cứu R2 và R5

**Researched:** 2026-11-02
**Phạm vi:** chỉ R2 (bộ 34 ảnh bìa mặc định) và R5 (hợp đồng BE). R1 (danh mục 34 đơn vị, slug, alias, mã sở thích) đã có ở `04-RESEARCH.md` §R1 và không làm lại; mọi slug và mã sở thích dưới đây lấy từ đó.
**Nguồn code:** FE `tripory_fe` (đọc trực tiếp). BE `tripory_be` nhánh `feat/be-fe-integration-group-a`, HEAD `9339749`, cây làm việc sạch (`git status` rỗng). Đường dẫn BE tính từ `tripory_be/src/Services/Tripory/`. Chỉ đọc, không sửa BE, không sửa code app, không commit.
**Quy ước:** `[VERIFIED]` = đã đọc code hoặc trang nguồn trong phiên này; `[CITED: url]` = trang chính thức; **CHƯA XÁC MINH** = suy luận hoặc kiến thức có sẵn, cần user xác nhận.
**Confidence:** HIGH cho sự thật code BE/FE; MEDIUM cho điều khoản giấy phép (đọc tóm tắt chính thức, không phải tư vấn pháp lý); MEDIUM cho thiết kế hợp đồng (là đề xuất, user chốt).

Nội dung từ nguồn web đã được diễn đạt lại để tuân thủ giới hạn trích dẫn.

---

## R2. Bộ ảnh bìa mặc định

### R2.1 Giấy phép theo nguồn (kiểm 2026-11-02)

| Nguồn | Dùng thương mại | Tự lưu bản sao | Ghi công | Hạn chế liên quan Tripory | Nguồn kiểm |
|---|---|---|---|---|---|
| **Unsplash License** (ảnh miễn phí, không phải Unsplash+) | Có | Có (license cho phép tải, sao chép, phân phối) | Không bắt buộc, khuyến khích | (1) Không được gom ảnh Unsplash để dựng dịch vụ tương tự hoặc cạnh tranh với Unsplash; (2) không bán ảnh khi chưa chỉnh sửa đáng kể; (3) hạn chế dùng cho ML/AI và nhận diện người; (4) license chỉ cấp quyền của nhiếp ảnh gia, không cấp quyền nhãn hiệu, người trong ảnh hay công trình có bản quyền | [unsplash.com/license](https://unsplash.com/license) (trang trả 401 cho công cụ fetch, đọc qua kết quả tìm kiếm), [Help: compiling images](https://help.unsplash.com/en/articles/2612332-what-do-you-mean-by-compiling-images-to-replicate-a-similar-or-competing-service) (08/2025) [VERIFIED: web_fetch], [Help: brand/identifiable person](https://help.unsplash.com/en/articles/2646379-what-if-there-s-a-brand-or-identifiable-person-depicted-in-an-image-that-i-download), [Help: Releases and Trademarks](https://help.unsplash.com/en/articles/2612329-releases-and-trademarks) |
| **Pexels License** | Có | Có | Không bắt buộc | Không bán/phân phối "standalone" (giữ nguyên hoặc chỉ lọc màu, đổi cỡ, cắt); không gom nội dung để dựng dịch vụ tương tự/cạnh tranh; không sao chép hàng loạt; người nhận diện được không bị đặt vào ngữ cảnh xấu | [Help: Terms and Conditions](https://help.pexels.com/hc/en-us/articles/900005880463-What-are-the-Terms-and-Conditions), [Help: rules](https://help.pexels.com/hc/en-us/articles/360042332714-What-are-the-rules-for-using-Pexels-photos-or-videos) (trang trả 403 cho fetch, đọc qua kết quả tìm kiếm) |
| **Pixabay Content License** | Có | Có | Không bắt buộc | Không phân phối standalone; ảnh có nhãn hiệu hoặc công trình có thể cần xin phép chủ sở hữu khi dùng thương mại | [pixabay.com/service/license-summary](https://pixabay.com/service/license-summary/) |
| **Wikimedia Commons, CC BY** | Có | Có | **Bắt buộc**: tên tác giả, link hoặc tên giấy phép, ghi rõ nếu đã sửa (cắt, nén cũng là sửa) | Không được ngụ ý tác giả bảo trợ | [Commons: Reusing content/licenses](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/licenses/en) [VERIFIED: web_fetch] |
| **Wikimedia Commons, CC BY-SA** | Có | Có | Bắt buộc như CC BY | **ShareAlike**: bản đã chỉnh (cắt 16:9, nén JPEG) phải phát hành lại theo CC BY-SA hoặc tương thích | Cùng trang trên [VERIFIED] |
| **CC0 / public domain** | Có | Có | Không bắt buộc (CC0 là công cụ hiến tặng, không phải license) | Quyền nhân thân và quyền với vật thể trong ảnh có thể vẫn còn | [CC Certificate 4.3](https://creativecommons.org/course/cc-cert-edu/unit-4-using-cc-licenses-and-cc-licensed-works/4-3-finding-and-reusing-cc-licensed-work/); [Commons: public domain](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/licenses/en) |
| **Ảnh user tự chụp** | Có | Có | Tùy user | Vẫn chịu luật quyền tác giả của vật thể trong ảnh (xem R2.2) | — |

Đánh giá cho Tripory:
- Một ứng dụng lập lịch trình dùng 34 ảnh làm ảnh bìa mặc định **không phải** là thư viện ảnh hay dịch vụ cạnh tranh với Unsplash/Pexels. Rủi ro điều khoản "compile to replicate" thấp, nhưng không dựng trang "bộ sưu tập ảnh điểm đến" cho người dùng tải về. **CHƯA XÁC MINH** về mặt pháp lý (không phải tư vấn luật).
- Open Graph ở Phase 5 hiển thị ảnh trên Facebook/Zalo: đó là "sử dụng" ảnh, không phải bán standalone. Rủi ro thấp, **CHƯA XÁC MINH**.
- CC BY/CC BY-SA đòi ghi công **ở chỗ ảnh hiển thị** hoặc trang ghi công dễ tìm. App hiện không có chỗ ghi công trên thẻ, canvas hay OG. Khuyến nghị: **ưu tiên Unsplash/Pexels/CC0/ảnh tự chụp**; chỉ dùng CC BY/BY-SA khi không còn lựa chọn, và khi đó phải có trang `/credits` (ngoài phạm vi phase này). Nếu user không muốn làm trang ghi công thì loại CC BY/BY-SA khỏi bộ 34.
- D-79 cấm Unsplash API và Wikimedia động; việc tải tay một lần rồi tự lưu trữ là đúng D-79. Lưu ý: guideline ghi công của Unsplash (bắt buộc ghi tên và link) chỉ áp cho ứng dụng dùng **API** [CITED: [Help: Guideline Attribution](https://help.unsplash.com/en/articles/2511315-guideline-attribution)]; tải tay không chịu ràng buộc đó.

### R2.2 Rủi ro riêng của Việt Nam: quyền tự do toàn cảnh (FoP)

Wikimedia Commons ghi rằng từ 01/01/2023, Luật Sở hữu trí tuệ sửa đổi 2022 chỉ còn cho phép chụp công trình kiến trúc và tác phẩm mỹ thuật đặt nơi công cộng cho mục đích **phi thương mại**; Commons xóa các ảnh như vậy tải lên sau ngày đó [CITED: [Template:NoFoP-Vietnam](https://commons.wikimedia.org/wiki/Template:NoFoP-Vietnam), VERIFIED: web_fetch]. Đây là diễn giải của cộng đồng Commons; **CHƯA XÁC MINH** với nguyên văn điều luật.

Hệ quả cho việc chọn ảnh, độc lập với license của nhiếp ảnh gia:
- **Tránh ảnh lấy công trình hiện đại còn bảo hộ làm chủ thể**: Cầu Vàng (bàn tay), Cầu Rồng, Landmark 81, tượng đài mới, cầu kính, khu vui chơi. Unsplash/Pexels cũng nói license không bao trùm quyền với công trình hoặc nhãn hiệu trong ảnh.
- **Ưu tiên phong cảnh tự nhiên** (núi, ruộng bậc thang, biển, sông, hang động) hoặc công trình đã hết thời hạn bảo hộ (di tích cổ). Không có người nhận diện được ở cận cảnh, không có logo, biển hiệu thương hiệu.
- Ghi cột "Chủ thể" trong hồ sơ giấy phép (R2.3) để người duyệt kiểm điều này.

### R2.3 Quy trình tìm và xác minh (thủ công)

1. Với mỗi slug của R1, tìm 1 ảnh theo thứ tự ưu tiên: ảnh tự chụp → Unsplash → Pexels → CC0 trên Commons → (chỉ khi đã có trang ghi công) CC BY trên Commons. Không lấy ảnh từ Google Images, blog, báo, trang tỉnh.
2. Kiểm trang nguồn: license hiện trên trang tải; với Commons, đọc khung license trên trang file và cảnh báo NoFoP nếu có.
3. Kiểm chủ thể theo R2.2.
4. Tải bản gốc, lưu ảnh chụp màn hình trang nguồn có license (bằng chứng nếu ảnh bị gỡ sau này; Unsplash từng nêu ảnh có thể bị gỡ khỏi nền tảng khi có khiếu nại bản quyền [CITED: [Unsplash blog](https://unsplash.com/blog/why-we-moved-from-the-creative-commons-zero-license-to-the-unsplash-license/)]).
5. Xử lý theo R2.4, đặt tên `<slug>.jpg`.
6. Điền một dòng hồ sơ giấy phép.

**Hồ sơ giấy phép đề xuất:** file `apps/web/public/destinations/LICENSES.md` (hoặc `.json`) nằm cạnh ảnh để cùng commit, mỗi slug một dòng:

| Cột | Ví dụ | Bắt buộc |
|---|---|---|
| `slug` | `vn-lam-dong` | có |
| `file` | `vn-lam-dong.jpg` | có |
| `sourceUrl` | trang ảnh gốc (không phải link file) | có (trừ ảnh tự chụp) |
| `author` | tên hiển thị + link hồ sơ | có |
| `license` | `Unsplash License` / `Pexels License` / `CC0 1.0` / `CC BY 4.0` / `Tự chụp` | có |
| `licenseUrl` | link văn bản license | có (trừ tự chụp) |
| `retrievedAt` | `2026-11-05` | có |
| `subject` | "Đồi thông, phong cảnh tự nhiên" | có (kiểm FoP) |
| `modifications` | "Cắt 16:9, đổi cỡ 1600×900, nén JPEG q80" | có (CC BY bắt buộc ghi) |
| `evidence` | đường dẫn ảnh chụp màn hình lưu ngoài repo | nên có |
| `approvedBy` / `approvedAt` | user | có |

Một test (plan FE) đọc thư mục và hồ sơ để khóa: đủ 34 file, mỗi slug trong danh mục có file và có dòng hồ sơ đủ cột bắt buộc, không có file thừa. Test không kiểm được tính đúng của license; đó là việc của user ở checkpoint.

### R2.4 Định dạng và kích thước

- **Chỉ một định dạng: JPEG**, không làm WebP kèm JPEG dự phòng. Lý do: URL ảnh mặc định được BE lưu vào danh sách ảnh bìa và sẽ là `og:image` ở Phase 5. Nhiều nguồn ghi Facebook hay không hiển thị WebP trong thẻ chia sẻ và khuyên dùng JPG/PNG [nguồn thứ cấp: [sequel.sh](https://sequel.sh/tools/og-image-verifier/facebook), [sangfroidwebdesign](https://www.sangfroidwebdesign.com/web-design/facebook-share-image-is-wrong/); **CHƯA XÁC MINH** với tài liệu Meta; Zalo chưa kiểm]. Một URL cho mọi chỗ thì không cần `<picture>` và không cần BE biết hai URL.
- **1600×900 (16:9)**, khớp token `--itinerary-cover-ratio: 16 / 9` (UI-SPEC). Lớn hơn mức 1200 px bề ngang mà các hướng dẫn OG khuyên; thẻ OG 1.91:1 sẽ cắt nhẹ trên/dưới, chấp nhận được. **CHƯA XÁC MINH** cho Zalo.
- JPEG progressive, chất lượng khoảng 78–82, sRGB, **xóa EXIF/GPS** (ảnh tự chụp có thể lộ vị trí nhà riêng). Ngân sách: **≤ 250 KB mỗi ảnh**, trần cứng 400 KB; tổng khoảng 34 × 250 KB ≈ 8,5 MB trong repo, không cần Git LFS. Con số là đề xuất, **CHƯA XÁC MINH** bằng ảnh thật.
- Không dùng `next/image` cho ảnh này: code hiện dùng `<img>` thường ở `cover-image.tsx:30-37` và test bất biến `itinerary-invariants.test.ts:58-66` buộc mọi `<img` trong `modules/itinerary` có `referrerPolicy="no-referrer"` [VERIFIED]. Giữ nguyên, ảnh mặc định đi chung đường với ảnh người dùng nhập.

### R2.5 Nơi lưu trữ và URL tuyệt đối

**Khuyến nghị: `apps/web/public/destinations/<slug>.jpg`, phục vụ bởi bản deploy Vercel production, URL tuyệt đối `https://triporyv1.vercel.app/destinations/<slug>.jpg`.**

Sự thật đã kiểm:
- `apps/web/public/` chưa tồn tại [VERIFIED: liệt kê thư mục].
- Next 16.4: file trong `public/` phục vụ từ `/`, header mặc định `Cache-Control: public, max-age=0` [CITED: `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md`]. Vì vậy thay ảnh cùng tên thì có hiệu lực sau deploy kế tiếp, trình duyệt không giữ bản cũ lâu. Hành vi cache ở edge của Vercel với `public/`: **CHƯA XÁC MINH**.
- `proxy.ts:76` có matcher bỏ qua mọi đường dẫn có đuôi file (`.*\.[a-zA-Z0-9]+$`), nên `/destinations/x.jpg` không đi qua proxy/gate đăng nhập [VERIFIED]. Ảnh công khai, crawler OG đọc được.
- Không có CSP, `Referrer-Policy` hay `images` trong `next.config.ts` (chỉ `cacheComponents`, `partialPrefetching`, `turbopack`) và không route nào đặt CSP [VERIFIED: đọc file, grep `content-security|referrer-policy`]. **Ảnh tự lưu trữ không cần đổi cấu hình nào.** Nếu sau này thêm CSP thì `img-src` phải có `https:` (ảnh người dùng nhập từ host bất kỳ) nên ảnh cùng origin tự được phép.
- Alias production là `https://triporyv1.vercel.app` [VERIFIED: `.planning/phases/01-.../01-08-deploy.json:4`].

**Cách ghép URL (FE và BE):**

| Bên | Cần gì | Cách làm đề xuất |
|---|---|---|
| FE hiển thị dự phòng (chuỗi ảnh §ItineraryCard bước 2) | Ảnh của điểm đến khi `coverImageUrl` rỗng/lỗi | Danh mục tĩnh FE giữ **đường dẫn tương đối** `/destinations/<slug>.jpg` (hoặc chỉ slug, hàm thuần ghép). Cùng origin nên chạy đúng ở local, preview, production. **Không thêm biến `NEXT_PUBLIC_*`**: `auth-invariants.test.ts:108-119` đang chặn `NEXT_PUBLIC_*APP_ORIGIN`, và `APP_ORIGIN` chỉ được đọc trong `composition/server/**` (`:127-129`) [VERIFIED]. |
| BE ghi ảnh 1 lúc tạo (D-80) | URL https tuyệt đối | Cấu hình BE, ví dụ `DestinationCatalog:CoverImageBaseUrl = https://triporyv1.vercel.app/destinations/`. Danh mục C# chỉ giữ slug; BE ghép `{base}{slug}.jpg`. Kiểm lúc khởi động: tuyệt đối, `https`, kết thúc bằng `/`. |
| FE Phase 5 (OG) | URL tuyệt đối | Ảnh trong danh sách đã tuyệt đối. Riêng dự phòng (danh sách rỗng) thì RSC ghép với origin phía server (`metadataBase`); để Phase 5 quyết. |

**Bẫy cấu hình:** BE ở **mọi môi trường** (kể cả Development) phải dùng base `https://` trỏ production. Nếu dev đặt `http://localhost:3000/destinations/`, ảnh 1 sẽ là URL `http`, và lần tự lưu kế tiếp gửi lại cả danh sách sẽ bị chính validator `https` của BE từ chối (R5 `Itinerary.CoverImageInvalidUrl`): người dùng không lưu được tiêu đề. Ảnh trên production là file công khai nên dev dùng chung được.

**Rủi ro gắn URL vào domain:**
- URL lưu trong DB trỏ tới `triporyv1.vercel.app`. Nếu sau này đổi sang domain riêng, các bản ghi cũ vẫn chạy chừng nào alias `.vercel.app` của project còn (Vercel giữ alias này khi gắn domain riêng: **CHƯA XÁC MINH**). Nếu mất alias thì sửa bằng **một câu SQL thay tiền tố** trên cột danh sách ảnh và cột ảnh đang hiển thị (ghi vào tài liệu BE như thủ tục vận hành).
- Ảnh bị gỡ vì vấn đề giấy phép: **thay file cùng tên** (không gắn hash vào tên) để mọi lịch trình đã lưu URL đó đổi theo sau deploy. Đây là lý do không dùng tên có hash.
- Đổi slug sau khi đã có dữ liệu sẽ làm gãy URL đã lưu: slug là bất biến (khớp D-53).
- Thứ tự deploy: file ảnh (hoặc placeholder, R2.6) phải có trên production **trước** khi BE bắt đầu ghi URL. Nếu không, ảnh 1 của lịch trình mới là link 404 (UI vẫn chịu được: `onError` → ô `ImageOff`, nhưng xấu).

**Phương án CDN ngoài (R2, Cloudinary, S3) bị loại cho phase này:** thêm tài khoản, bí mật và một domain nữa mà không giải quyết được gì `public/` chưa giải quyết; chỉ đáng khi có upload ảnh (ngoài phạm vi, D-81).

### R2.6 Checkpoint thủ công và placeholder

Agent không tạo hay chọn được ảnh thật. Đề xuất:

**Placeholder để FE và BE không bị chặn (làm trong plan FE, autonomous):**
- Sinh **34 file JPEG gradient** đúng tên thật `<slug>.jpg`, 1600×900, mỗi slug một cặp màu xác định từ slug (băm slug → hue), không chữ, không ảnh nguồn. Ảnh do script tạo không có vấn đề giấy phép. Hồ sơ giấy phép ghi `license: placeholder`, test cho phép giá trị này nhưng plan ảnh thật phải xóa hết.
- Công cụ: `sharp` hiện chỉ có dạng phụ thuộc bắc cầu (`node_modules/.pnpm/sharp@0.35.5...`, qua Next) [VERIFIED], chưa khai báo. Hoặc khai báo devDependency qua `catalog:` cho script, hoặc tạo một lần trên máy rồi commit file (script không cần chạy lại). Khuyến nghị cách sau, script đặt trong `scripts/` ở gốc repo, không vào bundle.
- Phương án nhẹ hơn: một file `placeholder.jpg` chung. Bị loại vì URL lưu trong DB sẽ là URL chung đó, không tự đổi khi có ảnh thật; dùng đúng tên thật thì thay file là xong.
- Placeholder dùng màu cố định trong ảnh, không phải token CSS (ảnh raster không đọc token). Nền dự phòng bước 3 của UI vẫn là token `surface-muted`.

**Checkpoint `autonomous: false` (plan ảnh, chạy sau hoặc song song plan FE):**
1. User cung cấp hoặc chọn 34 ảnh theo R2.3, hoặc duyệt danh sách ứng viên agent đưa ra dưới dạng **link trang nguồn** (agent được tìm link, không tải hay xác nhận license thay user).
2. User điền hồ sơ giấy phép, cột `approvedBy/approvedAt`.
3. Agent chạy script xử lý (cắt 16:9, đổi cỡ, xóa EXIF, nén) đè lên placeholder, chạy test đủ 34 file và ngân sách byte.
4. User xác nhận trên preview: mỗi ảnh đúng tỉnh, không có công trình hiện đại làm chủ thể, không có người cận mặt/logo.
5. Deploy production trước hoặc cùng lúc BE bật `CoverImageBaseUrl`.

Ảnh thật có thể giao sau khi phase đã xong code; không plan FE nào phụ thuộc nội dung ảnh.

---

## R5. Hợp đồng BE

### R5.1 Sự thật đã kiểm lại (file:line)

**Tạo lịch trình**
- `Tripory.API/Controllers/V1/ItinerariesController.cs:23-39`: `POST` gửi `CreateQuickDraftItineraryCommand(request.Title)` (`:31`), trả `CreatedAtAction(GetById)` 201 kèm `ItineraryDetailDto` (`:35-38`). Controller `[Authorize]` cấp lớp (`:13`).
- `Tripory.API/Contracts/V1/Itineraries/Requests/CreateItineraryRequest.cs:3`: `record CreateItineraryRequest(string Title)`.
- `Tripory.Application/UseCases/V1/Itineraries/Commands/CreateQuickDraftItineraryCommand.cs:6`: `(string Title) : ICommand<ItineraryDetailDto>`.
- `.../Validators/CreateQuickDraftItineraryCommandValidator.cs:10-13`: chỉ `Title` `NotEmpty`/`MinimumLength(1)`/`MaximumLength(100)`, **không có `WithErrorCode`**.
- `.../Handlers/CreateQuickDraftItineraryCommandHandler.cs:34-49`: kiểm user (`Auth.Unauthorized`), `ItineraryTitle.Create`, `Itinerary.CreateQuickDraft`, `AddAsync`, `SaveChangesAsync`, trả `ToDetailDto()`.

**Sửa metadata**
- Controller `:78-97`: `PUT {id:guid}` → `UpdateItineraryMetadataCommand(id, Title, Description, StartDate, CoverImageUrl)` (`:90-91`), trả `ApiResponse.Success(...)`.
- `.../Requests/UpdateItineraryMetadataRequest.cs:3-8`: `Title`, `Description?`, `StartDate?` (`DateOnly`), `CoverImageUrl?`.
- `.../Commands/UpdateItineraryMetadataCommand.cs:6-12`.
- `.../Validators/UpdateItineraryMetadataCommandValidator.cs:10-19`: `ItineraryId` NotEmpty, `Title` 1–100, `Description` ≤ 1000. **Không kiểm `CoverImageUrl`, `StartDate`.**
- `.../Handlers/UpdateItineraryMetadataCommandHandler.cs:33-52`: `GetOwnedItineraryAsync(..., includeDetails: false)` (`:33-34`, không nạp ngày/waypoint), value object title/description, `itinerary.UpdateMetadata(...)` (`:48`) ghi đè cả 4 trường.

**DTO**
- `.../Responses/ItineraryDetailDto.cs:3-16`: `Id, UserId, Title, Description?, CoverImageUrl?, StartDate?, IsPublic, TotalDistanceKm, CreatedAt, UpdatedAt, Days, Waypoints`.
- `.../Responses/ItinerarySummaryDto.cs:3-17`: như trên nhưng thay `UpdatedAt/Days/Waypoints` bằng `DaysCount, WaypointsCount`, có `CreatedAt`, **không có `UpdatedAt`**.
- `.../Extensions/ItineraryExtensions.cs:32-47` (`ToSummaryDto`, `Days.Count` ở `:43`), `:49-65` (`ToDetailDto`, không `OrderBy`).
- `Tripory.Persistence/Repositories/ItineraryRepository.cs:26-38`: `/mine` không `Include` ngày/waypoint (gốc của bug đếm = 0), sắp `UpdatedAt` giảm dần.

**Entity**
- `Tripory.Domain/Entities/Itinerary.cs:15`: `string? CoverImageUrl`; `:16` `DateOnly? StartDate`.
- `:48-66` `CreateQuickDraft(userId, title)`: description null, `GetOrCreateDay(1)` (`:64`).
- `:68-81` `UpdateMetadata(title, description, startDate, coverImageUrl)`: gán thẳng, không kiểm.
- `:230-239` `GetOrCreateDay` là `private`, id ngày `Guid.NewGuid()`.

**Persistence**
- `Tripory.Persistence/Configurations/ItineraryConfiguration.cs:12` bảng `itinerary.itineraries`; `:30` `CoverImageUrl` `HasMaxLength(500)`; `:32` `StartDate` `date`; `:39` query filter xóa mềm.
- `ItineraryDayConfiguration.cs:14` `Id` `ValueGeneratedNever()`; `:24` unique `(ItineraryId, DayNumber)`.
- Migration: `Tripory.Persistence/Migrations/20261005085513_Add_Itinerary_PostGIS_Tables.cs:19-28` tạo `itineraries` với cột **PascalCase** (`CoverImageUrl character varying(500)`, `StartDate date`); không dùng snake_case convention. Có `ApplicationDbContextModelSnapshot.cs`. `DependencyInjection.cs:25` đặt `MigrationsAssembly`. Không thấy `Migrate()` lúc khởi động (grep `Migrate\(|MigrateAsync` rỗng), nên migration chạy tay. EF Core `10.0.11`, `Npgsql.EntityFrameworkCore.PostgreSQL 10.0.3` (`Tripory.Persistence.csproj:10,15`).
- **Chưa có tiền lệ** cột mảng, `jsonb` hay owned collection trong BE (grep `OwnsMany|ToJson|jsonb|PrimitiveCollection` rỗng). Npgsql ánh xạ `List<string>`/`string[]` sang mảng PostgreSQL và từ EF 8 hỗ trợ truy vấn đầy đủ [CITED: [npgsql.org/efcore/mapping/array](https://www.npgsql.org/efcore/mapping/array.html), [release notes 8.0](https://www.npgsql.org/efcore/release-notes/8.0.html)].

**Lỗi**
- `Tripory.Domain/Errors/DomainErrors.cs:35-71`: `Itinerary.NotFound`, `Itinerary.Forbidden`, `Itinerary.CannotPublishEmpty`, `Itinerary.InvalidUserId`, `Itinerary.InvalidDayNumber`, `Itinerary.InvalidReorderList`. Kiểu đặt tên `Aggregate.PascalCaseReason`, message tiếng Việt.
- Value object dùng tiền tố riêng: `ItineraryTitle.Empty/TooLong` (`Tripory.Domain/ValueObjects/ItineraryTitle.cs:21,25`).
- `Tripory.Application/Behaviors/ValidationPipelineBehavior.cs:33-41`: gom lỗi của mọi validator, **chỉ trả lỗi đầu tiên**, mã = `ErrorCode` của FluentValidation (mặc định kiểu `NotEmptyValidator`), không có tên field.
- `Tripory.API/Controllers/ApiController.cs:26-33`: HTTP status chọn theo **chuỗi con** của mã (`NotFound` → 404, `Conflict`/`AlreadyExists` → 409, `Unauthorized` → 401, `Forbidden` → 403, còn lại 400).
- `Tripory.API/Common/Responses/ApiResponse.cs:31-32`: thành công không dữ liệu trả `data: {}` (object rỗng), không phải `null`. (Ghi chú `04-RESEARCH.md` §Contract BE viết `null`; FE không đọc body của các lệnh này nên không ảnh hưởng.)
- Không có cấu hình JSON tùy chỉnh (grep `AddJsonOptions|JsonSerializerOptions|UnmappedMemberHandling` rỗng): System.Text.Json mặc định, **bỏ qua khóa lạ, khóa thiếu thành `null`/mặc định**. Hệ quả: với record C# thường, BE **không phân biệt** "thiếu khóa" với "gửi `null`" [VERIFIED: grep; hành vi mặc định của System.Text.Json là kiến thức có sẵn, **CHƯA XÁC MINH** bằng chạy thử].

**Tài liệu**
- `tripory_be/API_ENDPOINTS.md:91-109` (bảng Itinerary; `:97` POST `{ title }`, `:100` PUT 4 trường, `:109` ghi chú ảnh bìa là URL string); `:113-127` envelope và bảng HTTP status.

### R5.2 Thiết kế hợp đồng đề xuất

#### (a) `POST /itineraries` mở rộng

Request:

```json
{
  "title": "Chuyến đi Đà Nẵng",
  "destinationCode": "vn-da-nang",
  "dayCount": 3,
  "startDate": "2026-11-12",
  "interests": ["nature", "food-drink"]
}
```

| Trường | Kiểu | Luật | Mã lỗi đề xuất |
|---|---|---|---|
| `title` | string | giữ 1–100 sau trim | thêm `WithErrorCode("ItineraryTitle.Empty")` / `("ItineraryTitle.TooLong")` cho validator để khớp mã value object FE đã map (`form-error-mapping.ts:38-39`) |
| `destinationCode` | string? | nếu có: thuộc 34 slug của danh mục C# (so khớp chính xác, chữ thường) | `Itinerary.DestinationRequired` (nếu bắt buộc), `Itinerary.DestinationUnknown` |
| `dayCount` | int? | 1–30 | `Itinerary.DayCountOutOfRange` |
| `startDate` | `DateOnly?` | không chặn quá khứ (D-75), chỉ cần parse được | lỗi parse do model binding (400 không có mã domain), FE đã chặn bằng `CalendarDate` |
| `interests` | string[]? | mỗi phần tử thuộc 7 mã R1, không trùng, ≤ 7 | `Itinerary.InterestUnknown`, `Itinerary.InterestDuplicated`, `Itinerary.TooManyInterests` |

Hành vi:
- BE tạo đủ bản ghi Ngày 1..N (D-56) trong cùng aggregate, một `SaveChanges`. `DaysCount` của `/mine` sau này sẽ đúng N khi sửa `Include` (BE-DEPENDENCIES #1).
- BE ghi ảnh mặc định `{CoverImageBaseUrl}{slug}.jpg` thành ảnh 1 và chọn nó (D-80). Không có `destinationCode` → danh sách rỗng.
- Response: `ItineraryDetailDto` mở rộng (mục b), 201 như cũ.
- **Thứ tự rule trong validator nên theo thứ tự khối form** (điểm đến → tên → số ngày/ngày → sở thích): pipeline chỉ trả lỗi đầu tiên (`ValidationPipelineBehavior.cs:40`), nên lỗi BE trả về sẽ trỏ đúng "khối lỗi đầu tiên" của D-69. Thứ tự lỗi giữa các rule trong một validator theo thứ tự khai báo: **CHƯA XÁC MINH** bằng chạy thử (là hành vi mặc định của FluentValidation theo hiểu biết có sẵn).

Hai điểm cần user chốt (tương thích với FE cũ đang chạy trong khoảng giữa deploy BE và deploy FE):
- **`destinationCode` bắt buộc ở BE hay không.** Khuyến nghị: **không bắt buộc ở BE** (cột vẫn nullable vì dữ liệu cũ không có điểm đến), FE bắt buộc (D-92). Nếu BE bắt buộc thì FE cũ không tạo được lịch trình cho tới khi FE mới lên.
- **Mặc định khi thiếu `dayCount`.** Form luôn gửi (mặc định 3, D-73). Khuyến nghị BE: **thiếu → 1** (giữ hành vi `CreateQuickDraft` hiện tại cho FE cũ). Nếu user muốn BE mặc định 3 như brief thì FE cũ sẽ tạo 3 ngày; vô hại nhưng là đổi hành vi.

#### (b) Ảnh bìa: danh sách tối đa 5 và ảnh đang hiển thị

**Lưu trữ đề xuất (gọn nhất):**
- Thêm cột `CoverImageUrls text[] NOT NULL DEFAULT '{}'`.
- **Giữ cột `CoverImageUrl`** với nghĩa "ảnh đang hiển thị" (đúng D-99). Không thêm cột chỉ số.
- Bất biến do aggregate giữ trong **một** phương thức thay thế cả hai: danh sách rỗng ⇔ `CoverImageUrl` null; danh sách không rỗng ⇒ `CoverImageUrl` là một phần tử của danh sách. URL không trùng nên vị trí đang chọn suy ra duy nhất.
- Lý do giữ cột cũ: `/mine`, `ToSummaryDto`, `ToDetailDto` và Phase 5 OG đọc thẳng một cột, không phải tính từ mảng; migration không mất dữ liệu; rollback dễ.

**DTO (detail và summary đều có):**

```json
{
  "coverImageUrl": "https://img.example/b.jpg",
  "coverImages": ["https://triporyv1.vercel.app/destinations/vn-da-nang.jpg", "https://img.example/b.jpg"],
  "selectedCoverIndex": 1,
  "destinationCode": "vn-da-nang",
  "interests": ["nature"]
}
```

- `coverImageUrl`: giữ, = ảnh đang hiển thị (code cũ, thẻ, tóm tắt không vỡ).
- `coverImages`: mảng, không bao giờ `null` (rỗng là `[]`).
- `selectedCoverIndex`: `int?`, suy ra từ hai cột, `null` khi danh sách rỗng. Có cho đối xứng với request; FE cũng suy ra được.
- `destinationCode`: `string?`, có ở **cả** detail và summary (UI-SPEC §ItineraryCard cần nó cho bước dự phòng 2; D-78 chỉ cấm hiện tên, không cấm dùng mã).
- `interests`: `string[]`, chỉ cần ở detail (phase này không hiện, D-76), nhưng nên có để PUT/discovery sau dùng. Summary không cần.

**Migration (mô tả bằng lời, tên gợi ý `Add_Itinerary_Destination_Interests_CoverImages`):**
1. Sao lưu bảng `itinerary.itineraries` trước khi chạy.
2. Thêm cột `DestinationCode varchar(64) NULL` (đủ cho slug có tiền tố quốc gia), `Interests text[] NOT NULL DEFAULT '{}'`, `CoverImageUrls text[] NOT NULL DEFAULT '{}'`. Index trên `DestinationCode` để lọc discovery sau này là tùy chọn.
3. Chuyển dữ liệu: với mỗi dòng (kể cả dòng xóa mềm, vì SQL thô không qua query filter), nếu `CoverImageUrl` không rỗng, bắt đầu bằng `https://` và dài ≤ 500 thì `CoverImageUrls = ARRAY[CoverImageUrl]`; ngược lại đặt `CoverImageUrls = '{}'` và `CoverImageUrl = NULL`.
4. Trước bước 3, đếm số dòng có `CoverImageUrl` rỗng hoặc không phải `https://` để user quyết: BE chưa từng validate trường này (`UpdateItineraryMetadataCommandValidator.cs:10-19`), FE chỉ chặn từ phía mình. Nếu giữ nguyên URL `http://` vào danh sách, mọi lần tự lưu sau đó của lịch trình đó bị validator mới từ chối (người dùng không sửa được tiêu đề). Vì vậy bước 3 bỏ chúng. Khuyến nghị kèm câu SQL đếm trong tài liệu, **CHƯA XÁC MINH** số lượng thực tế trên DB.
5. Không đổi cột `StartDate`, không đụng `itinerary_days`.

#### (c) `PUT /itineraries/{id}` giữ nguyên trường thiếu (D-54)

Request:

```json
{
  "title": "Chuyến đi Đà Nẵng",
  "description": null,
  "startDate": "2026-11-12",
  "coverImages": ["https://triporyv1.vercel.app/destinations/vn-da-nang.jpg", "https://img.example/b.jpg"],
  "selectedCoverIndex": 1
}
```

| Trường | Thiếu / `null` | Có giá trị |
|---|---|---|
| `title` | lỗi như hiện nay (bắt buộc) | ghi |
| `description`, `startDate` | `null` = xóa (giữ ngữ nghĩa hiện tại; FE luôn gửi) | ghi |
| `destinationCode`, `interests` | **giữ nguyên** (D-54). Vì BE không phân biệt thiếu với `null` (R5.1), `null` cũng là giữ nguyên; phase này không có cách xóa, đúng D-77 | phase này FE không gửi; nếu gửi thì validate như (a) rồi ghi |
| `coverImages` | xem dòng dưới | thay toàn bộ danh sách; `[]` = xóa hết (khác `null` nên phân biệt được) |
| `selectedCoverIndex` | bắt buộc khi `coverImages` không rỗng | phải nằm trong `[0, n-1]`; phải `null` khi `coverImages = []` |
| `coverImageUrl` (cũ) | **dự phòng cho FE cũ**: chỉ đọc khi `coverImages` là `null`. Khi đó BE làm như hiện nay: `coverImageUrl` có giá trị → danh sách = `[coverImageUrl]` chọn 0; `null` → danh sách rỗng | bị bỏ qua khi có `coverImages` |

Lý do giữ nhánh dự phòng `coverImageUrl`: FE đang chạy gửi đúng 4 khóa (`http-itinerary-repository.ts:49-54`). Nếu BE lên trước mà bỏ qua trường này, người dùng đổi ảnh bìa trên FE cũ sẽ mất thay đổi trong im lặng. Nhánh này xóa được sau khi FE mới lên (ghi vào tài liệu BE là "deprecated").

Luật danh sách ảnh (validator, mỗi rule có `WithErrorCode`):

| Luật | Mã lỗi đề xuất |
|---|---|
| ≤ 5 phần tử (`COVER_IMAGE_LIMIT`) | `Itinerary.TooManyCoverImages` |
| mỗi phần tử: không rỗng sau trim, URL tuyệt đối, scheme `https` | `Itinerary.CoverImageInvalidUrl` |
| mỗi phần tử ≤ 500 ký tự (giữ giới hạn cột cũ; mảng `text[]` không có giới hạn ở DB nên validator là chốt duy nhất, sửa luôn BE-DEPENDENCIES #2 cho trường này) | `Itinerary.CoverImageTooLong` |
| không trùng (so sau trim) | `Itinerary.CoverImageDuplicated` |
| `selectedCoverIndex` khớp danh sách | `Itinerary.CoverSelectionInvalid` |

Tránh các chuỗi con `NotFound`, `Conflict`, `AlreadyExists`, `Unauthorized`, `Forbidden` trong mã mới (`ApiController.cs:26-33`), nếu không status sẽ sai (ví dụ `Itinerary.CoverImageNotFound` thành 404). BE trim từng URL trước khi lưu, như các trường chữ khác.

#### (d) Tự lưu: `PUT` cả danh sách hay endpoint riêng

| Tiêu chí | **PUT metadata mang cả danh sách + chỉ số chọn** | Endpoint riêng (thêm/xóa/chọn) |
|---|---|---|
| Số endpoint mới | 0 (mở rộng PUT có sẵn) | 3 (`POST /{id}/cover-images`, `DELETE /{id}/cover-images/{index or url}`, `PUT /{id}/cover-images/selected`) |
| Bất biến "ảnh chọn thuộc danh sách" | Một lệnh, một validator, nguyên tử | Mỗi lệnh phải tự giữ; xóa ảnh đang chọn phải chọn lại ở BE |
| Cùng tab, hàng đợi tuần tự `scope: itinerary:{id}` (D-88) | Lệnh cuối mang ảnh chụp cuối của form, luôn nhất quán. Gộp lệnh chưa chạy thành một (single-flight + trailing của `04-RESEARCH.md`) là hợp lệ vì PUT idempotent | Không gộp được lệnh delta; chuỗi ← → trên lưới thành N lệnh "chọn" |
| Optimistic/rollback | Snapshot một object | Phải đảo từng delta |
| Hai tab/thiết bị, không ETag (BE-DEP #4) | Ghi sau thắng toàn bộ metadata, gồm cả danh sách ảnh. **Đã là hành vi hiện tại** của title/description (D-37) | Delta trộn được thêm từ hai tab, nhưng xóa/chọn theo **vị trí** từ tab cũ có thể xóa nhầm ảnh; theo URL thì an toàn hơn nhưng vẫn ghi đè title qua PUT riêng. Không hết race, chỉ đổi kiểu race |
| Tương tác với tiêu đề đang debounce | Mỗi PUT ghép giá trị hợp lệ gần nhất của mọi ô (UI-SPEC §TripInfoDialog) | Lệnh ảnh không chạm tiêu đề (ưu điểm duy nhất đáng kể) |
| Công BE | Nhỏ | Vừa (3 command, 3 validator, 3 route, tài liệu) |

**Khuyến nghị: PUT metadata mang cả `coverImages` và `selectedCoverIndex`.** Race nhiều tab không được giải bởi endpoint riêng, chỉ ETag giải được (BE-DEPENDENCIES #4, ngoài phạm vi). Trong một tab, hàng đợi tuần tự cộng với payload ảnh chụp đầy đủ là đúng và đơn giản nhất. Trùng khuyến nghị đã ghi ở phần tóm tắt `04-RESEARCH.md` (mở lại).

Bẫy FE cần ghi vào plan (không phải hợp đồng): `onMutate` chạy ngay lúc `mutate()` dù lệnh còn xếp hàng, biến bị chốt lúc đó (`04-RESEARCH.md`), nên payload phải dựng tại thời điểm gọi từ trạng thái form mới nhất, không đọc lại cache trong `mutationFn`.

#### (e) Bảng mã lỗi đề xuất

| Mã | Endpoint | HTTP | Message tiếng Việt gợi ý | Khối/ô FE gắn vào |
|---|---|---|---|---|
| `Itinerary.DestinationRequired` | POST (nếu user chọn bắt buộc) | 400 | "Vui lòng chọn điểm đến." | Điểm đến |
| `Itinerary.DestinationUnknown` | POST, PUT | 400 | "Điểm đến không hợp lệ." | Điểm đến |
| `ItineraryTitle.Empty` / `ItineraryTitle.TooLong` | POST, PUT (gắn vào rule validator) | 400 | giữ message hiện có | Tên |
| `Itinerary.DayCountOutOfRange` | POST | 400 | "Số ngày phải từ 1 đến 30." | Thời gian |
| `Itinerary.InterestUnknown` | POST, PUT | 400 | "Sở thích không hợp lệ." | Sở thích |
| `Itinerary.InterestDuplicated` | POST, PUT | 400 | "Sở thích bị trùng." | Sở thích |
| `Itinerary.TooManyInterests` | POST, PUT | 400 | "Chọn tối đa 7 sở thích." | Sở thích |
| `ItineraryDescription.TooLong` | PUT (gắn vào rule validator, hiện đang là `MaximumLengthValidator`) | 400 | giữ | Mô tả |
| `Itinerary.TooManyCoverImages` | PUT | 400 | "Tối đa 5 ảnh bìa." | lưới ảnh |
| `Itinerary.CoverImageInvalidUrl` | PUT | 400 | "Link ảnh phải bắt đầu bằng https://." | lưới ảnh |
| `Itinerary.CoverImageTooLong` | PUT | 400 | "Link ảnh tối đa 500 ký tự." | lưới ảnh |
| `Itinerary.CoverImageDuplicated` | PUT | 400 | "Ảnh này đã có trong danh sách." | lưới ảnh |
| `Itinerary.CoverSelectionInvalid` | PUT | 400 | "Ảnh bìa đang chọn không hợp lệ." | lưới ảnh |

Lỗi `Validation.Error` (fallback ở `ValidationPipelineBehavior.cs:41`) và mã mặc định của FluentValidation sẽ còn xuất hiện nếu BE quên `WithErrorCode`; FE map chúng về lỗi chung (không gắn ô).

### R5.3 Dàn ý tài liệu hợp đồng BE (plan 04-24 viết, không có code C#, không có ca kiểm thử)

Tên gợi ý `.planning/phases/04-itinerary-crud-editor/04-BE-CONTRACT.md`, kèm cập nhật `04-BE-DEPENDENCIES.md` (thêm dòng trỏ sang tài liệu, đánh dấu #2 đã gồm `coverImages`).

1. **Mục đích và phạm vi** — ITIN-02/ITIN-03 mở lại; danh sách D-xx được đáp ứng; ngoài phạm vi (upload, sửa điểm đến/sở thích, ETag).
2. **Tóm tắt thay đổi** — bảng một dòng mỗi thay đổi: C1 danh mục điểm đến, C2 danh mục sở thích, C3 mở rộng POST, C4 tạo Ngày 1..N, C5 ảnh mặc định lúc tạo, C6 danh sách ảnh bìa, C7 PUT giữ trường thiếu và nhánh dự phòng `coverImageUrl`, C8 trường DTO mới, C9 mã lỗi, C10 migration, C11 cấu hình `CoverImageBaseUrl`, C12 cập nhật `API_ENDPOINTS.md`.
3. **Mỗi thay đổi Cn** theo cùng khuôn 5W1H:
   - *What*: thay đổi hợp đồng (trường, kiểu, luật).
   - *Why*: quyết định D-xx và lý do.
   - *Who*: tầng BE chịu trách nhiệm (Contracts/Request, Command, Validator, Domain entity, Persistence/Migration, Extensions/DTO) và phía FE tiêu thụ.
   - *When*: thứ tự triển khai và điều kiện tương thích (BE trước, FE sau; nhánh dự phòng xóa khi nào).
   - *Where*: file BE hiện có liên quan (đường dẫn của R5.1) và vị trí gợi ý cho file mới, không viết code.
   - *How*: mô tả hành vi bằng lời, ví dụ JSON request/response, luật validate theo thứ tự, mã lỗi.
4. **Danh mục điểm đến** — bảng 34 slug (từ R1, chỉ slug, tên hiển thị, loại; mã số QĐ 19 để tham chiếu), luật so khớp chính xác, quy tắc slug bất biến, ghép URL ảnh từ `CoverImageBaseUrl`.
5. **Danh mục sở thích** — 7 mã và thứ tự (R1).
6. **Hợp đồng `POST /itineraries`** — request, response, luật, mã lỗi, mặc định khi thiếu, thứ tự rule theo khối form.
7. **Hợp đồng `PUT /itineraries/{id}`** — bảng "thiếu/null/có giá trị" của R5.2(c), luật danh sách ảnh, nhánh dự phòng.
8. **DTO** — `ItineraryDetailDto`, `ItinerarySummaryDto` sau thay đổi (bảng trường, kiểu, nullable, nguồn dữ liệu); trường cũ giữ nguyên.
9. **Mã lỗi** — bảng R5.2(e), quy tắc đặt tên và cảnh báo chuỗi con của `HandlerFailure`, yêu cầu `WithErrorCode` cho mọi rule (kể cả title/description hiện có).
10. **Migration** — các bước bằng lời của R5.2(b), câu SQL đếm để user xem trước, sao lưu, cách rollback.
11. **Cấu hình** — `DestinationCatalog:CoverImageBaseUrl`, kiểm lúc khởi động, giá trị cho từng môi trường (đều là https production), thủ tục thay tiền tố khi đổi domain.
12. **Cập nhật `API_ENDPOINTS.md`** — dòng `:97` và `:100` mới, ghi chú `:109`.
13. **Checklist xác nhận cho checkpoint** — user đánh dấu: đã đối chiếu NQ 202 (R1), đã chạy migration, đã đặt cấu hình, đã deploy, `POST` mẫu trả đủ N ngày và ảnh 1, `PUT` thiếu `destinationCode` giữ nguyên, `PUT` 6 ảnh trả `Itinerary.TooManyCoverImages`. (Là bước user tự kiểm bằng tay, không phải ca kiểm thử tự động.)
14. **Câu hỏi mở cho user** — `destinationCode` bắt buộc ở BE?, mặc định `dayCount`, xử lý URL cũ không phải https, có cần `interests` trong summary.

### R5.4 File FE phụ thuộc hình dạng DTO cũ

| File | Dòng | Phụ thuộc | Việc cần làm |
|---|---|---|---|
| `packages/itinerary/src/infrastructure/dto.ts` | `:34-47`, `:53-63` | `itineraryDetailDto`, `itinerarySummaryDto` | Thêm trường mới dạng chịu được BE cũ (xem dưới) |
| `packages/itinerary/src/infrastructure/dto.test.ts` | `:104-118` | Khóa **chính xác** danh sách khóa của summary sau parse | Thêm khóa mới vào danh sách mong đợi |
| `packages/itinerary/src/infrastructure/mappers.ts` + `mappers.test.ts` | `mappers.test.ts:98-102` | `coverImageUrl ''` → `null` | Thêm suy ra danh sách khi BE cũ, lọc mã lạ |
| `packages/itinerary/src/infrastructure/http-itinerary-repository.ts` | `:43-47` (create body `{ title }`), `:49-54` (PUT 4 khóa) | Body dựng từ field đặt tên cứng (T-04-18) | Thêm khóa mới, vẫn đặt tên cứng; PUT bỏ `coverImageUrl`, gửi `coverImages` + `selectedCoverIndex` |
| `packages/itinerary/src/infrastructure/http-itinerary-repository.test.ts` | `:130-137` (khóa body create = `['title']`), `:149-175` (PUT đúng 4 khóa), `:348` | Khóa chính xác body | Cập nhật danh sách khóa |
| `packages/itinerary/src/application/ports.ts` | `:10-15` (`MetadataInput` 4 trường), `:32` (`create({ title })`) | Port | Mở rộng type |
| `packages/itinerary/src/domain/itinerary.ts` | `:32-43`, `:45-52` | `Itinerary`, `ItinerarySummary` có `coverImageUrl` | Thêm `coverImages`, `selectedCoverIndex`, `destinationCode`, `interests` (tên do planner chọn) |
| `packages/itinerary/src/infrastructure/fixtures.ts` (`:24`, `:74`), `packages/itinerary/src/domain/test-fixtures.ts` (`:54`) | | Fixture JSON/domain | Thêm trường |
| `apps/web/src/test/be-itinerary-fixtures.ts` | `:37-64` | Type JSON BE cho test app | Thêm trường |
| `apps/web/src/modules/itinerary/ui/form-schemas.ts` + test | `:66`, `:75`, `:98-105`; test `:20`, `:83-99`, `:158-177` | `METADATA_FIELDS` có `coverImageUrl`, `toMetadataInput` | Thay bằng mô hình lưới ảnh |
| `apps/web/src/modules/itinerary/ui/trip-info-dialog.tsx` + test | `:43`, `:139`, `:152`, `:195`, `:238`; test `:61-68`, `:281`, `:298`, `:332`, `:357` | Form 4 ô có nút Lưu | Viết lại theo D-87..D-91 |
| `apps/web/src/modules/itinerary/ui/form-error-mapping.ts` | `:37-47` | `CREATE_TARGETS`, `METADATA_TARGETS` | Thêm mã R5.2(e) |
| `create-itinerary-dialog.test.tsx` | `:25` (`create: (input: { title })`) | Port create cũ | Thay theo form mới |
| `itinerary-card.tsx:35`, `trip-summary.tsx:48-49`, các test đặt `coverImageUrl: null` (`day-subtitle`, `day-tabs`, `editor-header`, `ellipsis-menu`, `itinerary-editor`, `itinerary-hooks`, `my-itineraries-view`, `publish-button`, `timeline-panel`, `waypoint-list`) | | Đọc `coverImageUrl` | Không phải sửa nếu `coverImageUrl` giữ nghĩa ảnh đang hiển thị; fixture có thể cần trường mới nếu type domain bắt buộc chúng (planner cân nhắc cho trường mới mặc định trong helper fixture để không phải sửa hàng loạt) |

**Giữ Zod DTO tương thích ngược** (FE mới chạy được với BE cũ lẫn BE mới, phòng khi deploy lệch):
- `coverImages: z.array(z.string()).nullish()`; mapper: có mảng thì dùng, không có thì suy ra `coverImageUrl ? [coverImageUrl] : []`.
- `selectedCoverIndex: z.number().int().nullish()`; mapper ưu tiên `indexOf(coverImageUrl)` trong danh sách, bỏ qua chỉ số ngoài khoảng.
- `destinationCode: z.string().nullish()`, **không dùng `z.enum`** của 34 slug: BE có thể thêm mã trước FE; mapper đổi mã không có trong danh mục FE thành `null` (UI rơi về dự phòng bước 3) thay vì làm hỏng cả trang.
- `interests: z.array(z.string()).nullish()`, mapper lọc mã lạ và trùng.
- `z.object` mặc định bỏ khóa lạ (`dto.ts:5`), nên BE thêm trường trước FE không làm vỡ FE đang chạy [VERIFIED: chú thích và test `dto.test.ts:104-118`].
- Request vẫn dựng từ field đặt tên cứng; không gửi `destinationCode`/`interests` trong PUT (D-54, D-77).

### R5.5 Thứ tự triển khai đề xuất

1. Ảnh (placeholder hoặc thật) lên production (R2.6).
2. User sửa BE theo tài liệu, chạy migration, đặt `CoverImageBaseUrl`, deploy. FE cũ vẫn chạy nhờ trường mới tùy chọn và nhánh dự phòng `coverImageUrl`.
3. Checkpoint plan 04-24: user xác nhận checklist mục 13.
4. Plan FE chạy, deploy FE.
5. (Sau) BE gỡ nhánh dự phòng `coverImageUrl` trong request PUT.

---

## Assumptions Log (R2, R5)

| # | Nội dung | Mục | Rủi ro nếu sai |
|---|---|---|---|
| A1 | Dùng 34 ảnh Unsplash/Pexels làm ảnh bìa mặc định không bị coi là "dịch vụ tương tự/cạnh tranh" | R2.1 | Phải thay nguồn ảnh |
| A2 | Diễn giải NoFoP Việt Nam của Commons đúng với luật 2022 | R2.2 | Thu hẹp hoặc nới tiêu chí chọn ảnh |
| A3 | Facebook/Zalo hiển thị ảnh JPEG 1600×900 tốt, WebP kém tin cậy | R2.4 | Đổi định dạng ở Phase 5 |
| A4 | Ngân sách ≤ 250 KB đạt được ở q≈80 | R2.4 | Nới ngân sách |
| A5 | Vercel giữ alias `.vercel.app` khi gắn domain riêng; edge không giữ bản cũ của file `public/` sau deploy | R2.5 | Cần SQL thay tiền tố sớm hơn; thay ảnh chậm có hiệu lực |
| A6 | System.Text.Json không phân biệt khóa thiếu với `null` trong record | R5.1, R5.2(c) | Có thể làm "null = xóa, thiếu = giữ" chặt hơn |
| A7 | FluentValidation trả lỗi theo thứ tự khai báo rule | R5.2(a) | Lỗi BE trỏ sai khối đầu tiên (FE vẫn hiện được) |
| A8 | DB có thể có `CoverImageUrl` không phải https | R5.2(b) | Bước lọc migration thừa nhưng vô hại |

## Câu hỏi mở cho user

1. `destinationCode` bắt buộc ở BE hay chỉ ở FE? Đề xuất: chỉ FE (tránh vỡ FE cũ, dữ liệu cũ vẫn null).
2. BE mặc định `dayCount` khi thiếu: 1 (giữ hành vi cũ, đề xuất) hay 3?
3. URL ảnh bìa cũ không phải `https://` khi migration: bỏ (đề xuất) hay giữ?
4. Có chấp nhận ảnh CC BY/BY-SA (cần trang ghi công) hay chỉ Unsplash/Pexels/CC0/tự chụp (đề xuất)?
5. Ảnh thật giao trong phase này hay để placeholder gradient và thay sau?

### Tóm tắt của lượt nghiên cứu này
**Tóm tắt:**
- **R2:** Unsplash, Pexels, Pixabay cho dùng thương mại và tự lưu trữ không cần ghi công, nhưng cấm phân phối nguyên bản và cấm gom ảnh dựng dịch vụ cạnh tranh; CC BY/BY-SA bắt buộc ghi công (BY-SA còn đòi ShareAlike bản đã cắt). Rủi ro lớn hơn là luật Việt Nam từ 2023 (theo Commons) không còn cho chụp công trình/tác phẩm nơi công cộng để dùng thương mại, nên chọn phong cảnh tự nhiên. Đề xuất JPEG 1600×900 ≤ 250 KB, xóa EXIF, đặt ở `apps/web/public/destinations/<slug>.jpg` trên `https://triporyv1.vercel.app`; FE dùng đường dẫn tương đối, BE ghép từ cấu hình `CoverImageBaseUrl` https ở mọi môi trường. Không cần đổi CSP/`next.config` (không có CSP; proxy bỏ qua file có đuôi). Placeholder gradient đúng tên file để không chặn FE; checkpoint thủ công cho 34 ảnh và hồ sơ giấy phép.
- **R5:** Đã kiểm lại file:line cho POST/PUT/DTO/entity/migration/lỗi; phát hiện thêm: thành công trả `data: {}`, cột PascalCase, chưa có tiền lệ cột mảng, BE không phân biệt khóa thiếu với `null`. Hợp đồng đề xuất: POST thêm `destinationCode`, `dayCount`, `startDate`, `interests`, BE tạo Ngày 1..N và ảnh 1; lưu `CoverImageUrls text[]` và giữ `CoverImageUrl` làm ảnh đang hiển thị; PUT nhận `coverImages` + `selectedCoverIndex`, giữ nguyên điểm đến/sở thích khi thiếu, nhánh dự phòng `coverImageUrl` cho FE cũ; **chọn PUT cả danh sách thay vì endpoint riêng**; 13 mã lỗi theo kiểu `DomainErrors`, tránh chuỗi con đổi HTTP status. Có dàn ý 14 mục cho `04-BE-CONTRACT.md` và bảng file/test FE phải sửa cùng cách giữ Zod tương thích ngược.

# Phase 04 mở lại 2026-10-30: nghiên cứu R3, R4, R6, R7, R8

**Ngày:** 2026-11-02
**Phạm vi:** R3 (Base UI 1.8.0), R4 (tự lưu "Thông tin chuyến đi"), R6 (vị trí code), R7 (test và UAT), R8 (rủi ro, câu hỏi mở, chia plan). R1 đã có trong `04-RESEARCH.md`; R2 và R5 do researcher khác viết ở `.agents/tasks/04-research-r2-r5.md` (lúc viết file này file đó chưa tồn tại).
**Quy ước nhãn:** `[VERIFIED: nguồn]` là đã đọc mã nguồn hoặc file trong phiên này. `CHƯA XÁC MINH` là suy luận hoặc kiến thức chưa kiểm, planner phải coi là giả định.

Nguồn Base UI đã đọc: `node_modules/.pnpm/@base-ui+react@1.8.0_@types_0727c1b6c3b38411787f98c090a19758/node_modules/@base-ui/react/` (gọi tắt `BASE/`). `packages/ui-web/package.json` khai báo `@base-ui/react: catalog:` và đây là bản duy nhất trong `node_modules/.pnpm` [VERIFIED: liệt kê thư mục]. TanStack Query core 5.104.2 [VERIFIED: `node_modules/.pnpm/@tanstack+query-core@5.104.2`].

---

## R3. Base UI 1.8.0: Accordion, RadioGroup, ToggleGroup, NumberField

### R3.1 Accordion (`@base-ui/react/accordion`)

Parts: `Accordion.Root` (div), `Accordion.Item` (div), `Accordion.Header` (**h3**), `Accordion.Trigger` (button), `Accordion.Panel` (div `role="region"`, `aria-labelledby` = id trigger) [VERIFIED: `BASE/accordion/*/*.d.ts`, `AccordionPanel.js`].

| Prop (Root) | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `value` | `Value[]` | — | Controlled. Luôn là **mảng**, kể cả khi `multiple={false}` (0 hoặc 1 phần tử). Truyền `[]` để không khối nào mở; truyền `undefined` là chuyển sang uncontrolled (cảnh báo của `useControlled`) |
| `defaultValue` | `Value[]` | — | Không dùng (form cần controlled để tự mở khối, D-64, D-69) |
| `onValueChange` | `(value: Value[], details) => void` | — | `details.reason` chỉ có `'trigger-press'` hoặc `'none'` |
| `multiple` | `boolean` | `false` | `false` = mở khối khác thì khối đang mở tự đóng (D-62) |
| `disabled` | `boolean` | `false` | Dùng khi `locked` (đang gửi) |
| `keepMounted` | `boolean` | `false` | Panel đóng vẫn trong DOM, có thuộc tính `hidden` |
| `hiddenUntilFound` | `boolean` | `false` | Ghi đè `keepMounted`, dùng `hidden="until-found"`. **Không dùng**: Ctrl+F tự mở panel qua `beforematch`, sẽ mở khối mà không qua state controlled của form (CHƯA XÁC MINH là `beforematch` gọi `onValueChange`; đọc thấy listener trong `useCollapsiblePanel.js:281-295`) |
| `orientation`, `loopFocus` | — | — | **Deprecated, không còn tác dụng**. Bản 1.8.0 bỏ roving focus theo cập nhật APG: các trigger là điểm dừng Tab thường, không có phím mũi tên giữa các trigger [VERIFIED: JSDoc trong `AccordionRoot.d.ts`] |

`Accordion.Item`: `value` (bắt buộc truyền chuỗi cố định `destination | name | dates | interests`), `disabled`, `onOpenChange(open, details)`. Data attribute trên trigger: `data-panel-open`, `data-disabled` [VERIFIED: `AccordionTriggerDataAttributes.d.ts`]. Panel: CSS var `--accordion-panel-height`, `--accordion-panel-width` (giá trị `auto` khi chưa đo), `data-starting-style`/`data-ending-style` cho hoạt ảnh [VERIFIED: `AccordionPanelCssVars.d.ts`, `AccordionPanel.js`].

Ghi chú dùng:
- **Heading level:** `Accordion.Header` luôn render `h3`. `DialogTitle`/`SheetTitle` là tiêu đề modal nên h3 bên dưới hợp lý. Muốn đổi thì dùng prop `render` của Header (CHƯA XÁC MINH: không cần, UI-SPEC không đòi).
- **Ẩn panel khi đóng:** `hidden = !open && !mounted` [VERIFIED: `useCollapsiblePanel.js:63`]. Khi `value` đổi sang mở, ngay lần render đó panel bỏ `hidden`. Khi đóng, `mounted` còn `true` trong lúc chạy hoạt ảnh thoát, xong mới `hidden`. Hệ quả: phần tử đang có focus trong panel vừa đóng sẽ mất focus về `body` sau khi hoạt ảnh xong, nên phải chuyển focus trước (D-64).
- **Reduced motion:** Base UI không tự đọc `prefers-reduced-motion`; hoạt ảnh do CSS của mình (`transition-[height] duration-(--semantic-motion-duration-normal)`). Token motion về 0ms khi reduced motion (theo UI-SPEC), nên đủ. Base UI đợi `transitionend`/animation; khi duration 0 thì kết thúc ngay (CHƯA XÁC MINH trên trình duyệt thật, test jsdom không đo được).
- **StrictMode / React 19:** không thấy cảnh báo riêng cho Accordion. Base UI dùng `useIsoLayoutEffect` để đăng ký id panel và dọn trong cleanup, nên chịu được vòng mount-unmount-mount của StrictMode [VERIFIED: `AccordionPanel.js`, effect có cleanup]. Không cần xử lý thêm.

**Mở khối kế tiếp bằng code (D-64):**
1. Trong handler chọn điểm đến: `setOpenBlocks(["name"])` rồi focus trigger "Tên chuyến đi". Trigger luôn render (không nằm trong panel), nên focus được ngay, không cần chờ.
2. Thứ tự đúng: chuyển focus **trước hoặc cùng lúc** khối Điểm đến đóng. Gọi `flushSync(() => setOpenBlocks(["name"]))` rồi `nameTriggerRef.current?.focus()` và `scrollIntoView({ block: "nearest" })`. `flushSync` có trong `react-dom` (app được import).
3. Không dùng `requestAnimationFrame` làm cơ chế chính: khó test với fake timers và dễ chạy sau khi panel cũ đã `hidden`.

**Focus ô lỗi đầu tiên trong panel đang đóng (D-69):**
- Tắt `shouldFocusError` của React Hook Form cho form tạo (RHF focus ô lỗi đầu theo thứ tự đăng ký, ô nằm trong panel `hidden` thì `focus()` không có tác dụng, không báo lỗi). Truyền handler `onInvalid` thứ hai cho `handleSubmit(onValid, onInvalid)`.
- `onInvalid(errors)`: tính khối lỗi đầu bằng hàm thuần `firstInvalidBlock(errors)` (thứ tự cố định D-72), rồi `flushSync(() => setOpenBlocks([block]))`, sau đó `form.setFocus(fieldOf(block))`. Vì panel bỏ `hidden` ngay trong lần render đó (`hidden = !open && !mounted`), focus sau `flushSync` có tác dụng [VERIFIED về `hidden`; CHƯA XÁC MINH bằng test chạy thật trong phiên này].
- `setFocus(name)` gọi `ref.focus()` của ref đã đăng ký. Với `Controller`, phải gắn `field.ref` vào phần tử **nhìn thấy và focus được**:
  - Điểm đến: dòng đầu tiên của nhóm "Phổ biến" (UI-SPEC bước 2); nếu đang có từ khóa thì xóa từ khóa trước (state của khối) rồi mới focus.
  - Số ngày: `NumberField.Input` (ô số nhìn thấy). **Không** gắn vào prop `inputRef` của `NumberField.Root`: đó là `input` ẩn [VERIFIED: `NumberFieldRoot.d.ts`, "A ref to access the hidden input element"].
  - Sở thích: chip đầu tiên.
- Lỗi BE gắn field (bước 4 UI-SPEC) đi cùng đường: `setError` cho từng ô (không `shouldFocus`), rồi gọi cùng hàm mở khối + focus.

**Accordion trong `ResponsiveFormSurface` và chân form dính đáy (D-66, D-67):**
- `DialogContent` hiện là popup `overflow-y-auto` với `max-h-[calc(100dvh-…)]`, padding `p-stack-lg` [VERIFIED: `packages/ui-web/src/molecules/dialog.tsx`]. Popup là vùng cuộn, nên `sticky bottom-0` của `StickyFormFooter` bám theo popup.
- `SheetContent` bottom: popup có `overflow-y-auto` **chỉ khi ở mức cao nhất** (`isTopSnap`), các mức khác `overflow-y-hidden`; padding đáy có `env(safe-area-inset-bottom)`; nút X nằm trong luồng nội dung ở hàng cao 0 đầu popup và cuộn theo nội dung [VERIFIED: `sheet.tsx`, `sheet-snap.ts`].
- **Bẫy `fixedSnap` (prop mới theo UI-SPEC):** `Sheet` lưu mức theo chỉ số `snapIndexes[defaultSnap]` (`expanded` = 2). Nếu `fixedSnap` thu `snapPoints` còn một phần tử mà vẫn giữ chỉ số 2 thì `snapPoints[2]` là `undefined`, `snapPoint` thành `null` và `isTopSnap(…, 2, 1)` vẫn `true` nhưng Drawer nhận `snapPoint={null}`. Implementation phải đặt chỉ số 0 khi `fixedSnap`, và chỗ reset chỉ số khi đóng (`setSnapIndex(snapIndexes[defaultSnap])`) cũng phải theo [VERIFIED: đọc `sheet.tsx`].
- **Chiều cao sheet đổi theo accordion:** popup bottom không có chiều cao cố định trừ khi `fillSnap`; comment trong `sheet.tsx` ghi Base UI giới hạn mức snap theo chiều cao popup. Khi khối mở/đóng, chiều cao nội dung đổi, popup co giãn và chân form nhảy lên xuống. Khuyến nghị form tạo dùng `fixedSnap` **kèm** `fillSnap` để popup luôn cao bằng mức expanded, chân form nằm cố định ở đáy màn hình (CHƯA XÁC MINH trên thiết bị thật; cần UAT).
- **Sticky và padding của vùng cuộn:** phần tử `sticky bottom-0` trong vùng cuộn có padding dưới có thể dừng cách mép dưới một khoảng bằng padding hoặc không, tùy cách trình duyệt tính vùng dính (CHƯA XÁC MINH). UI-SPEC đã yêu cầu bù bằng margin âm; plan nên có bước kiểm bằng mắt trên Chrome và Safari iOS, và test chỉ kiểm class.
- **Phần tử sticky chỉ dính trong khối cha:** `StickyFormFooter` phải là con trực tiếp cuối cùng của `form`, và `form` phải kéo dài tới cuối nội dung cuộn. Nếu bọc footer trong `div` riêng ngắn hơn thì sticky không có tác dụng [CSS chuẩn; CHƯA XÁC MINH bằng thử thật].
- **Esc của ô tìm điểm đến:** `ResponsiveFormSurface.handleOpenChange(next)` hiện bỏ mất `eventDetails` [VERIFIED: `responsive-form-surface.tsx`]. Để làm theo phát hiện (4) của phần R1 (Esc của Dialog/Drawer không xét `defaultPrevented`), prop `onOpenChange` của surface phải nhận và chuyển tiếp `(open, details)`, để container gọi `details.cancel()` khi `details.reason === "escape-key"` và ô tìm đang có chữ. Đây là thay đổi tương thích ngược (thêm tham số).
- Bàn phím ảo iOS che chân form dính đáy khi focus ô Tên: chưa kiểm (CHƯA XÁC MINH). Đưa vào UAT.

### R3.2 RadioGroup + Radio (`@base-ui/react/radio-group`, `@base-ui/react/radio`)

| Part | Prop chính | Ghi chú |
|---|---|---|
| `RadioGroup` (div, `CompositeRoot`) | `value`, `defaultValue`, `onValueChange(value, details)`, `disabled`, `readOnly`, `required`, `name`, `form`, `inputRef` | `details.reason` luôn `'none'` [VERIFIED: `RadioGroup.d.ts`]. `value={null}` là controlled "chưa chọn"; `undefined` là uncontrolled [VERIFIED: `@base-ui/utils/useControlled.js:24-31`, controlled khi `!== undefined`] |
| `Radio.Root` (span `role="radio"` + `input type="radio"` ẩn bên cạnh) | `value` (bắt buộc), `disabled`, `readOnly`, `required`, `inputRef` | Data attr: `data-checked`, `data-unchecked`, `data-disabled`, `data-readonly` [VERIFIED: `RadioRootDataAttributes.d.ts`] |
| `Radio.Indicator` | — | Không cần: UI-SPEC vẽ dấu tích bằng CSS theo `data-checked` |

Hành vi bàn phím đã đọc trong mã [VERIFIED: `RadioRoot.js:119-145`, `RadioGroup.js:196-224`]:
- Một điểm dừng Tab: radio đang chọn mang `ACTIVE_COMPOSITE_ITEM`; `CompositeRoot` dùng roving tabindex.
- Mũi tên: `onKeyDownCapture` của group đặt `touched = true` khi phím bắt đầu bằng `Arrow`; khi focus tới radio mới, `onFocus` thấy `touched` thì `input.click()` → chọn. Vì vậy **focus bằng code không chọn** (đúng như UI-SPEC dùng cho ô ảnh mới).
- `Home`/`End` **tắt** (`enableHomeAndEndKeys: false`).
- `Enter` bị `preventDefault` trên radio: không chọn và không gửi form. Chỉ `Space` (qua `useButton`) và click chọn.
- Click/Space đi qua `onClick` của **root** (span) rồi `dispatchClickWithModifiers(input)`. Click do mũi tên gây ra gọi `input.click()` trực tiếp, và `onClick` của `input` có `stopPropagation`; `input` là anh em của span, không phải con. Nên **`onClick` của `Radio.Root` chỉ chạy khi bấm chuột/chạm hoặc Space, không chạy khi đổi bằng mũi tên**.

Cách phân biệt nguồn chọn cho D-64 (tự chuyển khối chỉ khi bấm/Space/Enter):
- Gắn `onClick` của chính `DestinationOption` (Radio) → `onCommit(value)` (chọn + đóng khối + mở khối Tên). Handler của người gọi chạy **trước** handler của Base UI (mergeProps gọi từ phải sang trái, prop của người gọi đứng sau) [VERIFIED: JSDoc `BASE/merge-props/mergeProps.d.ts`], nên lúc đó giá trị group chưa đổi; `onCommit` tự ghi giá trị vào form, việc Base UI ghi lại cùng giá trị sau đó vô hại.
- Gắn `onKeyDown` của Radio: `Enter` → `onCommit(value)` (Base UI đã chặn hành vi mặc định của Enter, mình chỉ thêm hành vi).
- `onValueChange` của `RadioGroup` → chỉ ghi giá trị (đường mũi tên), không chuyển khối.
- Bấm lại đúng dòng đang chọn: `onValueChange` không chạy (giá trị không đổi) nhưng `onClick` vẫn chạy, nên vẫn chuyển khối như UI-SPEC yêu cầu.

Kết hợp với Field: `RadioGroupState extends FieldRootState`, nên RadioGroup tự gắn với `Field.Root` nếu nằm trong đó. Khối Điểm đến có **hai hoặc ba** RadioGroup cùng một giá trị. Không bọc cả khối trong một `FormField` (`Field.Root`): nhiều control trong một Field có thể tranh id labelable và trạng thái validity (CHƯA XÁC MINH). Dùng `aria-labelledby` trỏ nhãn nhóm và `aria-describedby` trỏ một phần tử lỗi riêng có `id` (không dùng `FormFieldError` vì nó cần context Field).

Lưới ảnh bìa (D-85): `Radio value` nên là **URL ảnh** (đã bắt buộc không trùng) thay vì vị trí: vị trí dồn khi xóa, giá trị theo vị trí làm radio đang chọn đổi nghĩa giữa hai lần render. Nhãn `aria-label` vẫn theo vị trí N.

### R3.3 ToggleGroup + Toggle cho chip sở thích

| Part | Prop | Ghi chú |
|---|---|---|
| `ToggleGroup` | `value: readonly Value[]`, `defaultValue`, `onValueChange(groupValue: Value[], details)`, `multiple` (mặc định **false**), `disabled`, `orientation` (mặc định `horizontal`), `loopFocus` (mặc định `true`) | `Value extends string` [VERIFIED: `ToggleGroup.d.ts`]. Bên trong là `CompositeRoot` với `enableHomeAndEndKeys: true` [VERIFIED: `ToggleGroup.js:98`] |
| `Toggle` (button) | `value`, `pressed`, `defaultPressed`, `onPressedChange`, `disabled` | Data attr `data-pressed`, `data-disabled`; render `aria-pressed` (CHƯA XÁC MINH tên thuộc tính, UI-SPEC ghi `aria-pressed`; test sẽ khóa) |

- **Thứ tự giá trị là thứ tự bấm:** với `multiple`, giá trị mới = mảng cũ `push(newValue)` hoặc `splice` [VERIFIED: `ToggleGroup.js:51-60`]. Dòng tóm tắt và payload phải sắp lại theo thứ tự danh mục bằng hàm thuần `normalizeInterests(codes)` (dedupe + sắp theo `INTERESTS`). Nếu không, "Mua sắm, Thiên nhiên" sẽ hiện theo thứ tự bấm, trái UI-SPEC.
- `ToggleChipGroup` của `ui-web` phải đặt `multiple` mặc định `true` (khác mặc định Base UI).
- Mũi tên trái/phải (và lên/xuống) di chuyển focus trong nhóm, không đổi trạng thái; Space/Enter bật tắt (button gốc) (CHƯA XÁC MINH phím lên/xuống khi `orientation="horizontal"`; test sẽ khóa đúng hành vi đọc được).
- Kết hợp RHF: `Controller name="interests"` → `value={field.value}`, `onValueChange={(next) => field.onChange(normalizeInterests(next))}`, `field.ref` vào chip đầu.

### R3.4 NumberField cho số ngày

| Prop (Root) | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `id` | `string` | — | id của **ô nhập nhìn thấy**; dùng cho `htmlFor` của nhãn |
| `value` | `number \| null` | — | Controlled |
| `onValueChange` | `(value: number \| null, details) => void` | — | `details.reason`: `input-change`, `input-clear`, `input-blur`, `input-paste`, `keyboard`, `increment-press`, `decrement-press`, `wheel`, `scrub`, `none` |
| `onValueCommitted` | `(value, details) => void` | — | Chạy khi blur sau khi gõ, khi nhả nút −/+; chạy cùng lúc `onValueChange` với bàn phím |
| `min`, `max`, `step` (mặc định 1), `largeStep` (mặc định 10), `smallStep` (0.1) | | | |
| `allowOutOfRange` | `boolean` | `false` | `false` = **kẹp ngay cả khi đang gõ**: `shouldClampValue = !allowOutOfRange || !isInputReason` [VERIFIED: `NumberFieldRoot.js:180-182`] |
| `allowWheelScrub` | `boolean` | `false` | Đã tắt sẵn |
| `format`, `locale`, `required`, `disabled`, `readOnly`, `name`, `inputRef` (input ẩn) | | | |

Parts: `NumberField.Group`, `NumberField.Input`, `NumberField.Increment`, `NumberField.Decrement`, `NumberField.ScrubArea`, `NumberField.ScrubAreaCursor` [VERIFIED: liệt kê `BASE/number-field/`].

Phát hiện ảnh hưởng UI-SPEC:
- **Để trống rồi blur trả `null`** (reason `input-clear`), không tự quay về giá trị trước [VERIFIED: `NumberFieldInput.js:139-157`]. UI-SPEC ghi "để trống rồi blur thì trả về giá trị trước". `NumberStepper` phải tự làm: giữ `lastValidRef`, khi `onValueCommitted(null)` thì gọi `onValueChange(lastValidRef.current)`. Trong lúc đang gõ (ô trống tạm thời) không đẩy `null` ra form, hoặc đẩy rồi để Zod báo lỗi; chọn cách không đẩy để tóm tắt khối không nhấp nháy.
- **PageUp/PageDown không được xử lý**: mã ghi "Let the browser handle multi-character keys we don't act on (PageUp, Insert, F-keys…)" [VERIFIED: `NumberFieldInput.js:305-306`]. `largeStep` áp cho **Shift + ↑/↓**. UI-SPEC ghi PageUp/PageDown ±10 là sai với 1.8.0; sửa thành Shift+↑/↓ hoặc bỏ dòng đó.
- **Home/End** về `min`/`max` khi có định nghĩa [VERIFIED: `NumberFieldInput.js:297-302`].
- Ô số render `type="text"`, `autoComplete="off"`, `aria-roledescription="Number field"` (tiếng Anh, cứng trong mã), `aria-invalid` theo Field [VERIFIED: `NumberFieldInput.js:104-118`]. Luật chuỗi tiếng Việt: truyền `aria-roledescription="ô số"` (hoặc chuỗi tiếng Việt planner chốt) vào `NumberField.Input`; prop của người gọi đứng sau trong `useRenderElement` nên ghi đè được (CHƯA XÁC MINH; test phải khóa thuộc tính).
- Không có `aria-valuemin/max/now` (ô là textbox, không phải spinbutton) (CHƯA XÁC MINH vai trò ARIA cuối cùng; đọc thấy không đặt `role`). Mô tả "Từ 1 đến 30 ngày." qua `aria-describedby` là đủ.
- Nút −/+ tự `data-disabled` ở biên (UI-SPEC); CHƯA XÁC MINH bằng mã, test khóa.
- Gõ "45": sau ký tự "4" giá trị 4, sau "45" giá trị kẹp 30 ngay (do `allowOutOfRange=false`), chữ trong ô chuẩn hóa về "30" khi blur [VERIFIED về kẹp; CHƯA XÁC MINH chữ hiển thị trước blur].
- Kết hợp Field: NumberField đọc `labelId`, `invalid` từ `Field.Root`, nên đặt trong `FormFieldRow` được; `FormFieldRow` không cần `controlId` vì Base UI tự liên kết (CHƯA XÁC MINH với `NumberField.Root` lồng trong `Field.Root`; test `getByLabelText("Số ngày")` sẽ chứng minh).

### R3.5 Kết hợp với React Hook Form và `FormFieldRow`

- `FormFieldRow` bọc `Field.Root` của Base UI, nhận `error` từ RHF [VERIFIED: `form-field-row.tsx`]. Ô `Input`/`Textarea` dùng `form.register`. Control Base UI (NumberField, RadioGroup, ToggleGroup) dùng `Controller`/`useController`.
- `mode: "onTouched"`: cần gọi `field.onBlur` khi focus rời control. RadioGroup có `onBlur` khi focus rời hẳn nhóm [VERIFIED: `RadioGroup.js:196-203`]; NumberField có `onBlur` trên Input; ToggleGroup: gắn `onBlur` vào root div (CHƯA XÁC MINH sự kiện blur nổi lên từ button con trong React 19, React dùng focusout nên có nổi).
- `field.value` của Destination là `string | null`; truyền thẳng làm `value` (null = controlled chưa chọn).
- Form tạo có `keepMounted` nên mọi ô đã đăng ký luôn có trong DOM; `reset()` sau `onOpenChangeComplete(false)` như bản cũ.
- Chặn Enter gửi form: dùng `onKeyDown` ở `form`: nếu `event.key === "Enter"` và `event.target` không phải nút submit thì `preventDefault()`. Một chỗ thay cho từng ô (UI-SPEC bước 1). Enter trong ô tìm vẫn chạy handler riêng (chọn kết quả đầu) vì handler của ô chạy trước khi sự kiện nổi lên form.

---

## R4. Tự lưu "Thông tin chuyến đi" (D-87..D-91, D-101)

### R4.1 Hiện trạng [VERIFIED: đọc code]

- `trip-info-dialog.tsx` (269 dòng): RHF + `metadataSchema`, nút Lưu/Hủy, `mutateAsync` rồi đóng; `useFormDraft` lưu bản nháp khi phiên hết hạn; reset form khi mở qua ref `latest` (refetch không đè ô đang gõ); preview ảnh debounce 400 ms; dùng `? :` để ẩn hiện preview và nút (trái luật `visible` mới).
- `useUpdateMetadata` = `useWriteMutation` không có `optimistic`, không có `spec.onSuccess` [VERIFIED: `packages/itinerary/src/react/index.ts`]. Cache chi tiết chỉ đổi khi `settle()` invalidate lúc lệnh ghi cuối xong. Đây là LW-02: tiêu đề trên header và `TripSummary` chỉ đổi sau refetch.
- `useWriteMutation`: `mutationKey ['itinerary','write',id]`, `scope { id: 'itinerary:'+id }`; callback cấp hook vẫn chạy khi component unmount (callback cấp `mutate()` thì không) [VERIFIED: comment và code].
- TanStack 5.104.2: `onMutate` (của MutationCache và của mutation) chạy **trước** khi retryer chờ scope; `mutationFn` chỉ chạy khi `canRun` (đến lượt trong scope) [VERIFIED: `query-core/build/modern/mutation.js:171-189`]. Biến của lệnh chốt tại lúc `mutate()`.
- `SaveIndicator`: "Đang lưu" = `useIsMutating(write key) > 0`; lệnh đang chờ trong scope cũng ở trạng thái `pending` nên được tính.
- `save-status.ts`: `markSaved()` đặt `failure: null`, tức là **một lần lưu thành công bất kỳ xóa luôn lỗi của thao tác nền khác** [VERIFIED]. Đây là hành vi sẵn có; tự lưu metadata sẽ gọi `markSaved` thường xuyên hơn nên dễ lộ hơn.
- Leave guard: `beforeunload` khi còn lệnh ghi hoặc `formDirty`; điều hướng trong app chỉ hỏi khi còn lệnh ghi [VERIFIED: `leave-guard.tsx`].
- `draft-storage.ts`: `findFirst` tự xóa khóa có kind lạ (`!isDraftKind(kind)`) [VERIFIED: dòng 101-103].

### R4.2 Thiết kế đề xuất

**Tách ba phần (coding-rules S, D):**

1. **Hàm thuần ở domain** (`packages/itinerary/src/domain/metadata.ts`):
   - `withMetadata(itinerary, input): Itinerary`: optimistic cho `useUpdateMetadata` (sửa LW-02). Gồm cả danh sách ảnh và ảnh chọn khi hợp đồng có.
   - `isSameMetadata(a: MetadataInput, b: MetadataInput): boolean`.
2. **Hàm thuần ở app** (`apps/web/src/modules/itinerary/ui/metadata-autosave-payload.ts`, hoặc domain nếu planner muốn dùng chung mobile): `buildAutosavePayload({ lastSent, values, invalidFields }): MetadataInput`. Ô đang sai lấy giá trị của `lastSent`, ô hợp lệ lấy giá trị đã trim; danh sách ảnh và ảnh chọn luôn lấy trạng thái hiện tại của `CoverImageField` (đã kiểm khi thêm). Không gửi điểm đến, sở thích (D-54).
3. **Controller không phụ thuộc React** (`metadata-autosave.ts`, mẫu `pending-delete.ts`) + hook mỏng `useMetadataAutosave` (mẫu `use-pending-delete.ts`). Controller giữ:
   - `timer` debounce 800 ms của ô chữ;
   - `lastSent: MetadataInput` (mốc so sánh, khởi tạo từ dữ liệu đã lưu lúc mở);
   - `inFlight: boolean` và `pending: MetadataInput | null` (single-flight + trailing);
   - `failure: { error, payload } | null`.

**Luồng:**

| Sự kiện | Hành động |
|---|---|
| Gõ ô Tiêu đề/Mô tả | `form` cập nhật; controller `schedule()` khởi động lại timer 800 ms |
| Blur ô chữ | `flush()`: hủy timer, gọi `request()` ngay |
| Đổi ngày khởi hành (ngày hợp lệ hoặc xóa) | `request()` ngay |
| Thêm/xóa/chọn ảnh | `request()` ngay |
| `request()` | `trigger()` RHF cho ô liên quan; ghép payload bằng `buildAutosavePayload` với `form.getValues()` **đọc tại thời điểm chạy** (không dùng giá trị chụp trong closure); nếu `isSameMetadata(payload, lastSentOrPending)` thì bỏ; nếu `inFlight` thì ghi đè `pending = payload` (gộp); ngược lại `send(payload)` |
| `send(payload)` | `inFlight = true; lastSent = payload; mutation.mutate(payload)` |
| Mutation settled (callback **cấp hook**) | `inFlight = false`; nếu `pending` khác `lastSent` thì `send(pending)`, `pending = null` |
| Thành công | `failure = null`, `store.markSaved()` |
| Lỗi field BE | `setError` vào ô (nếu form còn mở); không có "Thử lại" (D-90); `lastSent` lùi về giá trị đã lưu thật (để lần blur sau gửi lại) |
| Lỗi không gắn field | `failure = { error, payload }`; form mở thì `InlineAlert` + "Thử lại"; "Thử lại" gửi **payload mới nhất** (`buildAutosavePayload` lúc bấm), không phải payload cũ |
| Đóng dialog | `flush()` nếu còn timer và ô hợp lệ; ô sai thì bỏ (D-89). Nếu `failure` còn thì chuyển thành lỗi nền: `store.markFailed(retryLatest)` + toast lỗi theo chính sách Phase 2 |
| Rời route / editor unmount (cleanup) | `flush()`; mẫu cleanup của `use-pending-delete.ts` (chịu được StrictMode vì không có việc chờ thì không làm gì) |
| `visibilitychange` → hidden | `flush()` (gửi bằng `mutate` thường; không cần keepalive, vì `beforeunload` đã cảnh báo khi còn việc) (CHƯA XÁC MINH là cần; đề xuất cho đồng bộ với D-50) |

Vì sao gộp ("coalescing") an toàn: `PUT` ghi đè toàn bộ và payload luôn là ảnh chụp đầy đủ, nên lệnh cuối mang trạng thái cuối; bỏ các ảnh chụp trung gian chưa gửi không mất dữ liệu (UI-SPEC cho phép). Lệnh đã `mutate()` thì không hủy được (đã có `onMutate`), nên chỉ gộp phần **chưa gửi**. Như vậy chuỗi đổi ảnh bằng phím mũi tên chỉ sinh tối đa 2 lệnh `PUT` (một đang chạy, một trailing).

**Nơi đặt controller:** controller phải sống **ở cấp editor**, không ở trong `TripInfoDialog`. Lý do: đóng dialog khi còn trailing hoặc còn lệnh đang chạy thì dialog unmount (Base UI Dialog/Drawer không `keepMounted`), mà trailing cần được gửi sau khi lệnh trước xong. Đặt `useMetadataAutosave(itineraryId)` trong `ItineraryEditor` (cạnh `usePendingDelete`), truyền xuống dialog các hàm `schedule`, `flush`, `request`, `retry` và trạng thái `failure` (qua `useSyncExternalStore` từ controller). Dialog chỉ nối form với controller.

**Hằng số:** `TEXT_AUTOSAVE_DEBOUNCE_MS = 800` (D-88, Claude's Discretion "khoảng 800 ms"), đặt cạnh `PREVIEW_DEBOUNCE_MS` trong module UI.

**"Có thay đổi chưa lưu" cho leave guard (D-35):** `formDirty = controller.hasPendingTimer || controller.pending !== null || controller.failure !== null`. Lệnh đang chạy đã được `useIsMutating` tính. Không dùng `isDirty` của RHF nữa (sau mỗi lần lưu RHF vẫn coi là dirty so với `defaultValues`). Điều hướng trong app vẫn chỉ hỏi khi còn lệnh ghi (giữ hành vi sẵn có), còn debounce chưa chạy thì cleanup sẽ flush.

**`SaveIndicator` (D-30, D-90):** không đổi code. Lệnh tự lưu đi qua write key nên header hiện "Đang lưu…" rồi "Đã lưu". Trong form không hiện trạng thái thành công.

**Bản nháp `sessionStorage` (D-36, D-101): khuyến nghị bỏ cho form metadata** (mặc định của UI-SPEC):
- Gỡ `useFormDraft` khỏi `TripInfoDialog`, gỡ prop `restored` và nhánh `metadata` trong `readRestoredDraft` của `itinerary-editor.tsx`.
- Bỏ `"metadata"` khỏi `DraftKind`. Bản nháp metadata cũ còn trong `sessionStorage` của người dùng sẽ bị `findFirst` tự dọn vì kind lạ [VERIFIED: `draft-storage.ts:101-103`], không cần migration.
- Rủi ro chấp nhận: phiên hết hạn thật đúng lúc một lệnh tự lưu đang chờ thì giá trị đó mất sau khi đăng nhập lại (tối đa phần gõ trong ~800 ms hoặc một thao tác ảnh). Ghi vào threat/UAT.

### R4.3 Bẫy

1. **Closure cũ:** timer debounce và trailing phải đọc `form.getValues()` và trạng thái ảnh **lúc chạy**. Controller nhận getter (`getSnapshot: () => …`) cập nhật qua ref/effect như `use-pending-delete.ts`, không nhận giá trị.
2. **StrictMode chạy effect hai lần:** dựng controller trong `useState(() => create…)` không side effect; effect đăng ký `visibilitychange` có cleanup; cleanup gọi `flush()` chỉ gửi khi có việc. Timer phải `clearTimeout` trong cleanup để không bắn hai lần.
3. **Callback cấp `mutate()` bị bỏ khi unmount:** mọi logic trailing/failure đặt ở callback **cấp hook** của `useUpdateMetadata(id, { onSuccess, onError, onSettled })`, hoặc trong controller qua `mutateAsync` có `.then/.catch` (promise vẫn resolve sau unmount). Chọn một; khuyến nghị cấp hook cho đồng bộ với bài học 03-11.
4. **Optimistic và rollback trong hàng đợi:** `onMutate` của lệnh B chạy ngay lúc `mutate()`, nên snapshot `previous` của B đã chứa optimistic của A. A lỗi sau khi B đã `mutate` thì rollback của A ghi đè cache bằng trạng thái trước A, làm mất optimistic của B cho tới khi B xong và `settle()` refetch. Chấp nhận được vì `settle()` refetch khi lệnh ghi cuối xong; nhờ single-flight thì trường hợp này hiếm (B chỉ được `mutate` sau khi A settled). Không cố "sửa" rollback.
5. **Reset form khi mở dùng cache optimistic:** mở lại dialog sẽ thấy giá trị đã gửi gần nhất (đúng D-89 "giá trị đã lưu gần nhất" khi lệnh thành công). Nếu lệnh cuối lỗi thì rollback trả cache về giá trị BE, mở lại thấy giá trị BE; thay đổi lỗi vẫn còn trong `failure.payload` cho "Thử lại" ở header.
6. **Refetch trong lúc form mở:** `refetchOnWindowFocus` bị tắt khi còn lệnh ghi; khi không có lệnh ghi mà cache đổi (tab khác sửa), form không reset (giữ mẫu ref sẵn có). Lần tự lưu sau ghi đè thay đổi của tab khác (D-37, không ETag, chấp nhận).
7. **Blur ngay sau debounce gửi lại trùng:** so với `lastSent` (hoặc `pending`), không so với giá trị của cache.
8. **Tiêu đề trên header cập nhật:** với `withMetadata` optimistic, header đổi khi lệnh được `mutate` (sau debounce hoặc blur), không đổi theo từng phím. Đủ cho LW-02; không làm "live theo phím" vì phải đẩy state form lên cache.
9. **Giá trị sai không gửi (D-89):** `trigger()` trước khi ghép; ô sai lấy giá trị `lastSent`. Nếu mọi ô chữ đều sai và chỉ ảnh đổi thì vẫn gửi (payload dùng chữ cũ + ảnh mới).
10. **`markSaved` xóa lỗi nền khác:** xem R4.1. Nếu planner muốn tránh thì đổi store thành map lỗi theo thao tác; ngoài phạm vi phần mở lại (ghi vào câu hỏi mở).
11. **Lỗi BE trả mã validator mặc định** (`NotEmptyValidator`…) và chỉ lỗi đầu tiên (phát hiện (1) của R1/R5): bảng `METADATA_TARGETS` phải theo mã cuối cùng trong tài liệu BE; mã lạ rơi vào `InlineAlert` + "Thử lại", mà thử lại một payload sai sẽ lỗi mãi. Payload đã qua Zod nên hiếm; vẫn cần test ca này.
12. **Toast khi đóng form còn lỗi:** `meta.feedback.errorToast` đặt ở cấp hook, không đổi theo từng lệnh. Giữ `errorToast: false` và tự gọi `notify.error(...)` khi chuyển lỗi sang header lúc đóng.

### R4.4 Nếu hợp đồng ảnh dùng endpoint riêng (phương án B của R2/R5)

- Thao tác ảnh không đi qua payload `PUT` nữa; mỗi thao tác là một mutation riêng trong cùng scope (`useAddCoverImage`, `useRemoveCoverImage`, `useSelectCoverImage`), optimistic bằng hàm thuần của danh sách ảnh, rollback khi lỗi.
- Không gộp được thêm/xóa (mỗi lệnh là một bước). Chỉ "chọn" gộp được: debounce chọn khoảng 300 ms hoặc single-flight + trailing riêng cho chọn.
- `PUT` metadata bỏ trường ảnh (BE giữ nguyên khi thiếu, cần ghi trong hợp đồng như D-54).
- `CoverImageField` không đổi (vẫn `onChange(next)`); chỉ container đổi cách nối: so `prev` và `next` để biết thao tác nào. Hàm thuần `diffCoverChange(prev, next)` → `add | remove | select`.

Với phương án A (một `PUT` mang cả danh sách và ảnh chọn), thiết kế R4.2 dùng nguyên.

---

## R6. Kiến trúc FE: đặt code ở đâu

Nguồn luật: `ai-memories/tripory-fe--ddd-architecture.md` mục 5, 6, 8; `.kiro/steering/coding-rules.md`; `packages/config/eslint/boundaries.mjs` [VERIFIED: đã đọc].

Ràng buộc liên quan:
- `domain`: chỉ import `@tripory/shared-kernel`; cấm `Date.now`, `new Date()` không tham số, browser global. Dữ liệu tĩnh và hàm thuần đặt được ở đây.
- `application`: port (chỉ type) + use case.
- `infrastructure`: `shared-kernel`, `api-client`, `zod`; chỉ `apps/*/src/composition/**` import được subpath `/http`.
- `react`: `react`, `@tanstack/react-query`, `shared-kernel`.
- `ui-web`: `@base-ui/react` kèm subpath đã nằm trong allowlist (`allowOnly` cho phép `name(?:/|$)`) [VERIFIED: `boundaries.mjs:9-17, 36-39`], nên `@base-ui/react/accordion`, `/radio-group`, `/radio`, `/toggle-group`, `/toggle`, `/number-field` không cần sửa allowlist.

### R6.1 Danh mục điểm đến

| Phần | File | Nội dung |
|---|---|---|
| Type + hằng | `packages/itinerary/src/domain/destination.ts` (mới) | `DestinationSlug` (string, có thể brand), `DestinationKind = 'municipality' \| 'province'`, `Destination = Readonly<{ slug; name; officialName; kind; adminCode; popularityRank: number \| null; aliases: readonly string[]; defaultCoverImageUrl: string \| null }>`, `POPULAR_GROUP_SIZE = 8` |
| Hàm thuần tìm | `packages/itinerary/src/domain/destination-search.ts` (mới) | `normalizeSearchText(s)` (NFD, bỏ dấu kết hợp, `đ→d`, chữ thường, trim, gộp khoảng trắng, gạch nối → khoảng trắng); `searchDestinations(list, query): readonly DestinationMatch[]` với `DestinationMatch = { destination, matchedAlias: string \| null }`, thứ tự: tên bắt đầu bằng từ khóa → tên chứa → alias, rồi theo hạng, rồi theo thứ tự chữ cái đã khai báo; `popularDestinations(list, size)`; `alphabeticalDestinations(list)` (giữ thứ tự khai báo, không `localeCompare`, theo khuyến nghị R1) |
| Tên mặc định | `packages/itinerary/src/domain/trip-title.ts` (mới) | `defaultTripTitle(destinationName: string \| null)` → "Chuyến đi {Tên}" / "Chuyến đi mới"; `TitleState = { title; edited }`; `onDestinationChanged(state, name)`, `onTitleInput(state, value, currentDefault)`, `onTitleBlur(state, currentDefault)` (xóa trắng → điền lại, `edited=false`) |
| Số ngày | `packages/itinerary/src/domain/day-count.ts` (mới) | `DAY_COUNT_MIN = 1`, `DAY_COUNT_MAX = 30`, `DAY_COUNT_DEFAULT = 3`, `isValidDayCount(n)`, `clampDayCount(n)` |
| Sở thích | `packages/itinerary/src/domain/interests.ts` (mới) | `INTERESTS: readonly { code: InterestCode; label: string }[]` theo thứ tự D-70; `normalizeInterests(codes)` (dedupe, sắp theo danh mục, bỏ mã lạ). Nhãn tiếng Việt đặt ở domain vì là ngôn ngữ chung và mobile dùng lại; nếu planner muốn copy ở app thì tách bảng nhãn sang `modules/itinerary/ui` |
| Danh sách ảnh bìa | `packages/itinerary/src/domain/cover-images.ts` (mới) | `COVER_IMAGE_LIMIT = 5`; `addCoverImage(state, url)` (kiểm trùng, giới hạn; danh sách rỗng thì chọn ảnh mới); `removeCoverImage(state, index)` (xóa ảnh đang chọn thì chọn ảnh đầu còn lại; xóa hết thì không chọn); `selectCoverImage`; `coverActionSlots(n)` (n ô X, ô thêm, 4−n ô trống); `focusTargetAfterRemove(N, m)`; `resolveCoverDisplay(selected, destinationDefault)` cho chuỗi dự phòng |
| Optimistic metadata | `packages/itinerary/src/domain/metadata.ts` (mới) | `withMetadata`, `isSameMetadata` (R4) |
| Port | `packages/itinerary/src/application/ports.ts` (sửa) | `DestinationCatalog = Readonly<{ list(): readonly Destination[]; findBySlug(slug: string): Destination \| null }>`. Đồng bộ, vì dữ liệu tĩnh; nếu sau này lấy từ BE (D-61) thì đổi port sang async có hook query. `CreateItineraryInput = Readonly<{ title; destinationCode; dayCount; startDate: CalendarDate \| null; interests: readonly InterestCode[] }>`; `MetadataInput` thêm danh sách ảnh và ảnh chọn (tên trường theo R5) |
| Adapter tĩnh | `packages/itinerary/src/infrastructure/static-destination-catalog.ts` (mới) | 34 bản ghi của R1 (slug, tên, tên chính thức, loại, mã, hạng, alias) và `createStaticDestinationCatalog({ imageBaseUrl }): DestinationCatalog`, ghép `${imageBaseUrl}/${slug}.jpg` (đường dẫn theo R2). Không đọc `process.env` trong package |
| Export | `packages/itinerary/src/infrastructure/index.ts` (sửa) | thêm `createStaticDestinationCatalog` |
| Composition | `apps/web/src/composition/itinerary.client.ts` (sửa) | `export const destinationCatalog = createStaticDestinationCatalog({ imageBaseUrl: <hằng hoặc env theo R2> })`. UI import `@/composition/itinerary.client` (được phép) |

Lý do để dữ liệu trong adapter thay vì domain: URL ảnh phụ thuộc môi trường (gốc URL cấu hình, R2), và D-61 đã dự kiến đổi nguồn sang BE. Hàm tìm vẫn ở domain và nhận `readonly Destination[]`, test không cần adapter. Nếu planner thấy port là thừa (YAGNI), phương án đơn giản hơn là đặt mảng 34 bản ghi (không có URL) ở domain và ghép URL ở composition; cả hai đều qua ESLint.

**Mapper ACL:** `destinationCode` lạ từ BE (mã đã bỏ, dữ liệu cũ) map thành `null`, không ném lỗi; mapper không cần catalog (chỉ giữ chuỗi), tra catalog ở UI.

### R6.2 Tạo lịch trình một request

- Không cần use case riêng: lệnh có một bước, luật kiểm đã nằm trong Zod và hàm domain (mục 6 tài liệu kiến trúc: "Lệnh ghi có ≥ 2 bước hoặc có kiểm tra luật → có"). Nếu planner muốn chặn ở package như `reorderWaypoints` thì thêm `createItinerary(repo, input)` kiểm `isValidDayCount` + `normalizeInterests`; khuyến nghị **không** thêm (Zod đã chặn, BE là chốt).
- `ports.ts`: `create(input: CreateItineraryInput): Promise<Itinerary>`.
- `http-itinerary-repository.ts`: body dựng từ field đặt tên cứng (mẫu sẵn có, dòng 13-14): `{ title, destinationCode, dayCount, startDate, interests }` (tên JSON theo R5).
- `react/index.ts`: `useCreateItinerary(options?: MutationOptions<Itinerary, CreateItineraryInput>)`; giữ seed cache chi tiết + invalidate danh sách.
- `dto.ts`: `itineraryDetailDto` thêm `destinationCode: z.string().nullish()`, `interests: z.array(z.string()).nullish()`, danh sách ảnh (tên theo R5) với `.nullish()` để chịu được BE chưa deploy hoặc dữ liệu cũ; `itinerarySummaryDto` thêm `destinationCode` (để thẻ dùng ảnh dự phòng). `coverImageUrl` giữ nguyên.
- `mappers.ts`: map trường mới; `interests` qua `normalizeInterests`.
- `domain/itinerary.ts`: `Itinerary` thêm `destinationCode: string | null`, `interests: readonly InterestCode[]`, `coverImages: readonly string[]` (+ ảnh chọn theo R5); `ItinerarySummary` thêm `destinationCode`. **Thêm trường bắt buộc vào type làm vỡ typecheck của khoảng 17 file test tự dựng literal `Itinerary`** (xem R7.1); plan phải sửa cùng lúc.

### R6.3 Component `ui-web` mới (generic, không copy nghiệp vụ)

| Component | File | Base UI | Ghi chú |
|---|---|---|---|
| `Accordion`, `AccordionItem`, `AccordionTrigger` (`title`, `summary?`, `invalid?`), `AccordionPanel` | `packages/ui-web/src/molecules/accordion.tsx` | `accordion` | Named export từng phần (bẫy compound qua ranh giới server/client, mục 9). `AccordionTrigger` nhận `ref` (cần để focus khi tự chuyển) |
| `ToggleChipGroup`, `ToggleChip` | `molecules/toggle-chip.tsx` | `toggle-group`, `toggle` | `multiple` mặc định `true` |
| `NumberStepper` | `molecules/number-stepper.tsx` | `number-field` | Tự khôi phục giá trị trước khi blur trống (R3.4); ghi đè `aria-roledescription`; nhận `inputRef` (ref ô nhìn thấy, dùng cho RHF) |
| `RadioGroup`, `Radio` | `molecules/radio-group.tsx` | `radio-group`, `radio` | Primitive; truyền tiếp `onClick`, `onKeyDown`, `className`, `aria-*` (luật L) |
| `InlineAlert` + `action?` | `molecules/inline-alert.tsx` (sửa) | — | Prop tùy chọn |
| `DialogContent` + `showCloseButton?`, `closeDisabled?` | `molecules/dialog.tsx` (sửa) | — | Mặc định `false` |
| `Sheet` + `fixedSnap?` | `molecules/sheet.tsx`, `sheet-snap.ts` (sửa) | — | Bẫy chỉ số snap (R3.1) |
| Export | `packages/ui-web/src/index.ts`, `exports.test.ts` (sửa) | — | Thêm vào danh sách `molecules`/`compoundParts` của test |

Component chỉ dùng trong itinerary để ở `apps/web/src/modules/itinerary/ui`: `DestinationBlock`, `DestinationOption` (+ `AliasLine`), `TripNameBlock`, `TripDatesBlock`, `InterestsBlock`, `StickyFormFooter`, `CoverImageField`, `CoverChoiceGroup`, `CoverTileActions`/`CoverAddTile`, `CoverUrlPanel`, `CoverPreview` (tách từ `trip-info-dialog.tsx`). Chúng chứa copy tiếng Việt và luật hiển thị riêng. `StickyFormFooter` có thể lên `ui-web` nếu bỏ copy ra props, nhưng hiện chỉ một form dùng: để ở module (YAGNI).

### R6.4 File ở app cần tạo/sửa

| File | Việc |
|---|---|
| `apps/web/src/modules/itinerary/ui/create-itinerary-dialog.tsx` | Viết lại thành container: nối `ResponsiveFormSurface` (`fixedSnap`), hook form, mutation, điều hướng, khối đang mở. Giữ tên export và props `open`, `onOpenChange` |
| `.../ui/use-create-itinerary-form.ts` (mới) | RHF + Zod + luật tên mặc định (gọi hàm domain) + submit + map lỗi → khối. Một hook một việc: tách `use-accordion-focus.ts` (mở khối rồi focus) nếu hook dài |
| `.../ui/create-itinerary-blocks.ts` (mới) | `CREATE_BLOCKS` theo thứ tự D-72, `blockOfField`, `firstInvalidBlock(errors)`, `blockSummary(...)` (chuỗi tóm tắt). Đặt ở app vì "khối" là khái niệm UI; UI-SPEC ghi "hàm thuần ở domain" cho chọn khối lỗi đầu, planner chọn (câu hỏi mở 9) |
| `.../ui/destination-block.tsx`, `destination-option.tsx`, `trip-name-block.tsx`, `trip-dates-block.tsx`, `interests-block.tsx`, `sticky-form-footer.tsx` (mới) | Trình bày; mỗi file dưới ~150 dòng, ≤ 7 prop |
| `.../ui/form-schemas.ts` | Thay `createItinerarySchema` bằng `{ destinationCode, title, startDate, dayCount, interests }` + copy lỗi mới ("Vui lòng chọn điểm đến.", số ngày ngoài 1–30); `CREATE_ITINERARY_FIELDS` mới; `toCreateItineraryInput(values)`; bỏ `coverImageUrl` khỏi `metadataSchema`, thêm `coverUrlSchema` cho ô "Link ảnh" (https, ≤ 500, không trùng qua tham số) |
| `.../ui/form-error-mapping.ts` | `CREATE_TARGETS` thêm mã mới (`Itinerary.DestinationUnknown` → `destinationCode`, `Itinerary.DayCountOutOfRange` → `dayCount`, `Itinerary.InterestUnknown` → `interests`, mã ngày khởi hành) theo tài liệu BE; `METADATA_TARGETS` thêm mã lỗi danh sách ảnh → trường giả `coverImages` |
| `apps/web/src/lib/feedback/*` (`ERROR_MESSAGES`) | Câu tiếng Việt cho mã mới |
| `.../ui/trip-info-dialog.tsx` | Viết lại: bỏ chân form, bỏ draft, `closeButton`, nối controller tự lưu; dưới ~150 dòng (tách `CoverPreview`, `CoverImageField`) |
| `.../ui/metadata-autosave.ts` + `use-metadata-autosave.ts` (mới) | Controller + hook (R4.2) |
| `.../ui/cover-image-field.tsx`, `cover-choice-group.tsx`, `cover-tile-actions.tsx`, `cover-url-panel.tsx`, `cover-preview.tsx` (mới) | Lưới ảnh |
| `.../ui/cover-image.tsx` | Chuỗi dự phòng (ảnh chọn → ảnh điểm đến → nền) qua prop `fallbackSrc` |
| `.../ui/itinerary-card.tsx`, `trip-summary.tsx` | Truyền ảnh dự phòng từ `destinationCatalog.findBySlug(destinationCode)` (tra ở container hoặc hook nhỏ `useDestinationCover(code)`) |
| `.../ui/itinerary-editor.tsx` | Gỡ nhánh draft metadata; host `useMetadataAutosave`; `formDirty` theo controller |
| `.../ui/draft-storage.ts` | Bỏ `"metadata"` khỏi `DraftKind` |
| `.../ui/responsive-form-surface.tsx` | Prop `closeButton?`, `fixedSnap?`; `onOpenChange(open, details)` |
| `.../ui/my-itineraries-view.tsx` | Không đổi props của dialog; không cần sửa (UI-SPEC). Chỉ sửa nếu thẻ cần catalog để ảnh dự phòng |

Luật hiển thị: ẩn/hiện (dòng alias, empty state, lỗi, nhóm theo chế độ tìm, `CoverUrlPanel`, `CoverAddTile`, preview) đi qua prop `visible` hoặc CSS theo `data-*`; không `? :`/`&&` chọn component. Code cũ trong `trip-info-dialog.tsx` và `form-field-row.tsx` đang dùng `? :` để ẩn hiện; viết lại `trip-info-dialog.tsx` thì bỏ, còn `form-field-row.tsx` là code sẵn có (không bắt buộc sửa, không mở rộng thêm).

---

## R7. Test và UAT

### R7.1 Test đang khóa hành vi cũ, phải viết lại [VERIFIED: grep]

| File | Ca bị ảnh hưởng | Việc |
|---|---|---|
| `apps/web/src/modules/itinerary/ui/create-itinerary-dialog.test.tsx` (10 test) | Giá trị đầu "Chuyến đi mới" bôi đen, Enter gửi `{ title }`, khóa khi gửi, cold start, lỗi field/500, mở lại | Viết lại toàn bộ theo bảng `CreateItineraryDialog` của UI-SPEC §Testing Contract. Giữ ca không toast, chặn gửi lần hai, cold start 5 giây, InlineAlert |
| `.../ui/form-schemas.test.ts` | `createItinerarySchema` (dòng 32-46), `metadataSchema` ca `coverImageUrl` (83-101), `toMetadataInput` (158-180) | Schema tạo mới; bỏ ca ảnh của metadata, chuyển sang `coverUrlSchema`; `toMetadataInput` thay bằng ghép payload |
| `.../ui/form-error-mapping.test.ts` | `forms` (dòng 19-20), `mapCreateItineraryError` (60-74) | Thêm mã mới → ô |
| `.../ui/trip-info-dialog.test.tsx` (18 test) | Lưu trim rồi đóng; khóa khi lưu, Hủy disabled; preview ô URL; xóa ảnh bằng X của ô; khôi phục draft; draft khi phiên hết hạn; `onDirtyChange`; Sheet X bỏ draft; X disabled khi lưu | Viết lại theo bảng `TripInfoDialog (tự lưu)` + `CoverImageField`. Giữ ca focus ô Tiêu đề, Sheet dưới `md`, lỗi field BE gắn vào ô |
| `.../ui/itinerary-editor.test.tsx` | Mở "Thông tin chuyến đi" (dòng 242-255, 363-377): kiểm `getByLabelText(/^Tiêu đề/)` và đóng | Có thể giữ; sửa phần đóng nếu đang bấm "Hủy" (dialog mới không có Hủy, đóng bằng X). Thêm ca draft metadata không còn được khôi phục |
| `.../ui/draft-storage.test.ts` | Dùng kind `metadata` (dòng 38, 99-121, 152-171) | Đổi sang kind còn hợp lệ; thêm ca bản nháp `metadata` cũ bị `findFirst` dọn |
| `.../ui/itinerary-hooks.test.tsx` | `tạo lịch trình seed cache` (352-) dùng input `{ title }` | Input mới; thêm ca `useUpdateMetadata` optimistic + rollback (LW-02) |
| `.../ui/my-itineraries-view.test.tsx` | Tìm dialog "Lịch trình mới" (226-240) | Giữ tên dialog "Lịch trình mới" thì không phải sửa. Nhưng dialog mới dùng `ResponsiveFormSurface`: dưới `md` thành Drawer. Kiểm `useMediaQuery` trong jsdom trả gì; nếu ra Sheet, role vẫn là `dialog` (CHƯA XÁC MINH Drawer popup có `role="dialog"`) |
| `packages/itinerary/src/infrastructure/http-itinerary-repository.test.ts` | `create` body `{ title }` (129-144), `updateMetadata` body | Body mới |
| `packages/itinerary/src/infrastructure/dto.test.ts`, `mappers.test.ts`, `fixtures.ts` | Hình dạng DTO | Trường mới, ca `nullish`, mã điểm đến lạ → `null`, sở thích sắp lại |
| `packages/itinerary/src/exports.test.ts` | Danh sách tên export | Thêm hàm domain mới và `createStaticDestinationCatalog` |
| `packages/ui-web/src/exports.test.ts` | Danh sách molecules | Thêm `Accordion`, `ToggleChipGroup`, `NumberStepper`, `RadioGroup` |
| Fixture `Itinerary`/`ItinerarySummary` dựng tay | `editor-header`, `day-tabs`, `day-subtitle`, `ellipsis-menu`, `itinerary-card`, `itinerary-editor`, `itinerary-hooks`, `my-itineraries-view`, `publish-button`, `timeline-panel`, `trip-summary`, `waypoint-list`, `create-itinerary-dialog`, `trip-info-dialog` (`.test.tsx`), `packages/itinerary/src/domain/test-fixtures.ts`, `infrastructure/fixtures.ts`, `http-itinerary-repository.test.ts`, `mappers.test.ts` | Thêm trường bắt buộc mới. Gợi ý: mỗi file dùng `{ ...baseItinerary, ... }` từ một helper test của app, nhưng không bắt buộc (sửa cơ học) |
| Fake repository trong test | `itinerary-editor.test.tsx:33-34`, `my-itineraries-view.test.tsx:60-61`, `itinerary-hooks.test.tsx:57-58` | Chữ ký `create` đổi; `unused` vẫn hợp lệ |

### R7.2 Test mới theo tầng

| Tầng | File | Nội dung chính |
|---|---|---|
| Domain | `destination-search.test.ts` | "da lat", "Đà Lạt", "DA LAT" cùng kết quả; `đ→d`; gạch nối; thứ tự 3 mức + hạng; `matchedAlias`; "Quảng" khớp nhiều đơn vị; chuỗi rỗng |
| Domain | `destination.test.ts` hoặc test của adapter | Đủ 34 slug, không trùng slug/alias trong cùng đơn vị, khóa nguyên mảng thứ tự "Tất cả", 8 mục phổ biến đúng D-61 |
| Domain | `trip-title.test.ts` | Mặc định, đổi điểm đến khi chưa sửa, đã sửa thì giữ, xóa trắng + blur điền lại |
| Domain | `day-count.test.ts`, `interests.test.ts` | Biên 1/30, kẹp; dedupe + sắp, bỏ mã lạ |
| Domain | `cover-images.test.ts` | Thêm (trùng, giới hạn 5, rỗng → tự chọn), xóa (chọn lại ảnh đầu, xóa hết), chọn, slot lớp 2, đích focus 3 trường hợp |
| Domain | `metadata.test.ts` | `withMetadata`, `isSameMetadata` |
| Infrastructure | `static-destination-catalog.test.ts`, `dto.test.ts`, `mappers.test.ts`, `http-itinerary-repository.test.ts` | URL ảnh ghép đúng gốc; DTO mới; body create/update |
| React | `itinerary-hooks.test.tsx` (app) | Optimistic metadata + rollback; create input mới |
| ui-web | `accordion.test.tsx`, `toggle-chip.test.tsx`, `number-stepper.test.tsx`, `radio-group.test.tsx`, bổ sung `inline-alert.test.tsx`, `dialog.test.tsx`, `sheet.test.tsx`, `sheet-snap.test.ts` | Theo cột Contract của UI-SPEC; thêm: NumberStepper trống + blur trả giá trị trước; `aria-roledescription` tiếng Việt; Radio `onClick` không chạy khi đổi bằng mũi tên; `fixedSnap` chỉ một snap và vẫn cuộn được |
| App (thuần) | `create-itinerary-blocks.test.ts`, `metadata-autosave.test.ts`, `metadata-autosave-payload.test.ts` | Khối lỗi đầu; controller với fake timers: 800 ms, blur flush, gộp trailing, không gửi trùng, ô sai không gửi, retry gửi payload mới nhất, flush khi đóng/unmount, StrictMode không gửi đôi |
| App (component) | `create-itinerary-dialog.test.tsx`, `destination-block.test.tsx`, `trip-dates-block.test.tsx`, `interests-block.test.tsx`, `trip-info-dialog.test.tsx`, `cover-image-field.test.tsx`, `cover-image.test.tsx`, `itinerary-card.test.tsx` | Theo UI-SPEC §Testing Contract |
| ESLint boundaries | `packages/config/test/boundaries.test.ts` | Không cần đổi nếu không thêm thư viện (subpath Base UI đã được phép) |

Lệnh: `pnpm --filter @tripory/itinerary test`, `pnpm --filter @tripory/ui-web test`, `pnpm --filter @tripory/web test -- <tên file>`; trước khi báo xong `pnpm lint`, `pnpm typecheck`, `pnpm test` ở gốc (AGENTS.md).

### R7.3 Nháp delta cho `04-UAT-CHECKLIST.md`

Bước 2 viết lại:

| # | Thao tác | Kỳ vọng | Truy vết |
|---|---|---|---|
| 2 | Bấm "Tạo lịch trình". Trên desktop (≥ 768px) và trên điện thoại (bottom sheet). Gõ "da lat" vào ô tìm; chọn Lâm Đồng bằng chuột. Ở khối Tên, sửa tên rồi đổi lại điểm đến; xóa trắng tên rồi rời ô. Mở khối Thời gian: bấm −/+ tới 1 và 30, gõ 45 rồi rời ô, để trống rồi rời ô; chọn ngày khởi hành trong quá khứ. Mở khối Sở thích, bật 2 chip. Bấm "Tạo lịch trình". Lặp lại (không cần đủ 4 khối) để có ít nhất 13 lịch trình | Modal có 4 khối, khối Điểm đến mở sẵn, chỉ một khối mở. "da lat" ra Lâm Đồng kèm "gồm Đà Lạt". Chọn xong khối Điểm đến đóng, khối Tên mở, focus ở tiêu đề khối Tên. Tên tự là "Chuyến đi Lâm Đồng" cho tới khi sửa; xóa trắng rồi rời ô thì điền lại. Số ngày kẹp 1–30, nút − mờ ở 1, + mờ ở 30, 45 thành 30, trống trở lại giá trị trước. Ngày quá khứ được nhận. Dòng tóm tắt các khối đúng. Nút "Tạo lịch trình" luôn thấy ở đáy. Tạo xong vào thẳng editor, dải Ngày 1..N đúng số ngày, ảnh bìa là ảnh của điểm đến, KHÔNG toast. Network: đúng một `POST /api/bff/itineraries` | ITIN-02, D-59..D-75, D-92..D-97, D-56, D-80 |

Bước mới (chèn sau bước 5, bước 5 đổi phần "nhập ảnh bìa ... rồi lưu" thành tham chiếu bước 5a–5c):

| # | Thao tác | Kỳ vọng | Truy vết |
|---|---|---|---|
| 2a | Mở form tạo, không chọn gì, bấm "Tạo lịch trình". Rồi chọn điểm đến bằng bàn phím: Tab vào nhóm, ↓ vài lần, Enter. Thử Esc khi ô tìm có chữ, rồi Esc khi ô trống. Đóng form giữa chừng rồi mở lại | Khối Điểm đến mở, focus dòng đầu nhóm "Phổ biến", lỗi "Vui lòng chọn điểm đến.", tiêu đề khối có dấu lỗi. Mũi tên đổi lựa chọn mà không tự chuyển khối; Enter chuyển. Esc có chữ chỉ xóa chữ; Esc khi trống đóng modal. Đóng không hỏi, mở lại là form mới | D-64, D-65, D-69, D-95 |
| 5a | Mở "Thông tin chuyến đi". Sửa tiêu đề, ngừng gõ khoảng 1 giây. Sửa mô tả rồi Tab ra ngoài. Đổi ngày khởi hành, rồi xóa ngày. Xóa trắng tiêu đề rồi đóng form. Mở lại | Không có nút Lưu/Hủy, chân form trống, có nút X. Network: mỗi lần ngừng gõ ~800 ms hoặc rời ô có một `PUT`; đổi/xóa ngày gửi ngay. Header: "Đang lưu…" rồi "Đã lưu"; trong form không hiện "Đã lưu". Tiêu đề trên header đổi theo sau mỗi lần lưu. Tiêu đề trống báo lỗi dưới ô và không gửi; đóng rồi mở lại thấy tiêu đề đã lưu gần nhất | ITIN-03, D-87..D-91 |
| 5b | Trong "Thông tin chuyến đi": thêm ảnh bằng link https tới khi đủ 5 (một link ảnh hỏng); chọn ảnh khác bằng chuột rồi bằng phím mũi tên; xóa ảnh đang hiển thị; xóa hết ảnh. Reload sau mỗi nhóm thao tác. Bật VoiceOver/NVDA | Lưới 5 ô, ảnh đang hiển thị có viền và dấu tích. Ảnh hỏng vẫn thêm được và hiện nền dự phòng. Đủ 5 ảnh thì không còn nút thêm và có ghi chú. Mỗi thao tác lưu ngay (chuỗi phím mũi tên không sinh quá 2 `PUT` liên tiếp). Xóa ảnh đang hiển thị thì ảnh đầu còn lại được chọn. Xóa hết: lưới trống, thẻ ở danh sách và canvas hiện ảnh mặc định của điểm đến. Reload giữ đúng. Trình đọc màn hình đọc "Ảnh bìa N, đang hiển thị" / "Chọn ảnh N làm ảnh bìa", "Đã thêm/Đã xóa ảnh bìa N" | ITIN-03, D-79..D-86, D-99, D-100 |
| 5c | Bật Offline, sửa tiêu đề rồi rời ô. Bấm "Thử lại" trong form khi đã bật mạng. Lặp lại nhưng đóng form khi còn lỗi, rồi bấm "Lỗi – Thử lại" trên header. Thử reload khi còn debounce chưa gửi | Lỗi hiện `InlineAlert` trong form kèm "Thử lại", giá trị vẫn trong ô; thử lại thành công thì alert biến mất. Đóng khi còn lỗi: header "Lỗi – Thử lại" + toast; thử lại gửi giá trị cuối. Reload khi còn debounce: cảnh báo gốc của trình duyệt | D-90, D-30, D-35 |

Bước khác: bước 4 thêm "thẻ không có ảnh bìa nhưng có điểm đến hiện ảnh mặc định của điểm đến"; bước 16 giữ nguyên (form waypoint) và thêm một dòng: form "Thông tin chuyến đi" không còn khôi phục bản nháp (D-101). Thêm bước kiểm danh mục: đếm 34 mục ở nhóm "Tất cả", đối chiếu văn bản gốc NQ 202 (D-92) và giấy phép ảnh (D-79) bằng bản ghi giấy phép của R2.

### R7.4 Dòng `04-VALIDATION.md` bị lỗi thời (Nyquist tắt, không tạo VALIDATION mới)

[VERIFIED: grep `04-VALIDATION.md`]
- Dòng 61 (`04-08-02`): DTO/mapper; thiếu trường mới (điểm đến, sở thích, danh sách ảnh).
- Dòng 66 (`04-11-01`): "https-only" cho một ô ảnh bìa; nay là ô "Link ảnh" của lưới.
- Dòng 67 (`04-11-02`): "trim 1–100, Enter gửi, chặn gửi 2 lần…" của hộp tạo nhanh; Enter không còn gửi, form 4 khối.
- Dòng 75 (`04-14-01`): bản nháp gồm kind `metadata`; nay chỉ còn form waypoint.
- Dòng 77 (`04-14-03`): "ảnh lỗi vẫn lưu" cho dialog có nút Lưu; nay tự lưu, lưới 5 ảnh.
- Dòng 121 (Manual-Only "Hết phiên khi form mở"): không còn áp cho form metadata.

---

## R8. Rủi ro, câu hỏi mở, chia plan

### R8.1 Rủi ro

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| 1 | Sticky footer + bàn phím ảo iOS + sheet bottom: chân form bị che hoặc nhảy | Cao | `fixedSnap` + `fillSnap`; UAT trên iPhone thật; margin âm bù padding (CHƯA XÁC MINH) |
| 2 | `fixedSnap` sai chỉ số snap (R3.1) | Trung bình | Test `sheet.test.tsx` kiểm `snapPoints` một phần tử và popup cuộn được |
| 3 | Vuốt Drawer lẫn với cuộn danh sách 34 điểm đến trong sheet | Trung bình | Danh sách nằm trong popup cuộn ở mức top (hành vi đã có ở form waypoint); UAT (CHƯA XÁC MINH Base UI Drawer bỏ qua vuốt khi nội dung còn cuộn được) |
| 4 | Hợp đồng BE chưa chốt (ảnh A/B, tên trường, mã lỗi); BE chỉ trả lỗi validate đầu tiên với mã mặc định | Cao | Plan FE sau checkpoint; DTO `.nullish()`; bảng mã lỗi chỉ điền sau khi tài liệu BE chốt |
| 5 | Thêm trường bắt buộc vào `Itinerary` làm vỡ ~17 file test | Trung bình (công sức) | Một plan sửa read model + fixture cùng lúc, typecheck xanh |
| 6 | Đổi chữ ký `create`/`MetadataInput` làm vỡ dialog cũ giữa các plan | Trung bình | Đổi chữ ký trong cùng plan viết lại dialog tương ứng (R8.3) |
| 7 | Trailing write mất khi dialog unmount | Cao nếu đặt sai chỗ | Controller ở cấp editor, callback cấp hook (R4.2) |
| 8 | `markSaved` xóa lỗi nền khác | Thấp | Chấp nhận hoặc tách store (câu hỏi 6) |
| 9 | Phiên hết hạn khi còn lệnh tự lưu chờ: mất giá trị | Thấp | Chấp nhận, ghi threat model; bỏ draft metadata |
| 10 | Ảnh 34 điểm đến chưa có khi FE xong | Thấp | URL trỏ đường dẫn cố định; ảnh 404 rơi về nền dự phòng (`onError`); plan ảnh chạy song song |
| 11 | `aria-roledescription` tiếng Anh của NumberField; UI-SPEC sai về PageUp/PageDown và về blur trống | Thấp | Ghi đè thuộc tính; sửa UI-SPEC (hoặc ghi lệch) trong plan ui-web |
| 12 | Ctrl+F mở panel nếu dùng `hiddenUntilFound` | Thấp | Dùng `keepMounted`, không dùng `hiddenUntilFound` |
| 13 | ToggleGroup trả giá trị theo thứ tự bấm | Thấp | `normalizeInterests` |
| 14 | Sửa tài liệu ở repo khác (`tripory/docs` PT-01, D-98) | Thấp | Plan docs ghi rõ đường dẫn tuyệt đối và việc commit ở repo đó do user quyết |

### R8.2 Câu hỏi mở (theo thứ tự cần trả lời)

1. **Hợp đồng ảnh bìa A (một `PUT` mang danh sách + ảnh chọn) hay B (endpoint riêng)?** Do R2/R5 quyết. Thiết kế FE theo A ở R4.2; B ở R4.4. Ảnh chọn biểu diễn bằng URL hay vị trí trong DTO?
2. `destinationCode` bắt buộc ở request tạo? (UI bắt buộc theo D-92; BE nên bắt buộc với lịch trình mới, `null` cho dữ liệu cũ.)
3. User duyệt slug, alias "SUY RA", mã sở thích, thứ tự "Tất cả" (R1) ở checkpoint 04-25 trước khi sửa BE.
4. Gốc URL ảnh (env hay hằng) và đường dẫn ảnh: theo R2.
5. Bỏ bản nháp metadata (khuyến nghị) hay giữ?
6. Có tách lỗi nền theo thao tác trong `save-status` không (R4.3 mục 10)? Khuyến nghị: không, ngoài phạm vi.
7. `04-24` phụ thuộc `04-23` (UAT checkpoint gốc, chưa có SUMMARY)? Khuyến nghị `depends_on: ["04-23"]` để giữ thứ tự wave; nếu 04-23 coi như xong thì để `[]`.
8. Sửa UI-SPEC cho NumberStepper (PageUp/PageDown, blur trống) hay chỉ ghi lệch trong SUMMARY?
9. `firstInvalidBlock` và tóm tắt khối đặt ở app (khuyến nghị, vì "khối" là khái niệm UI) hay domain (chữ của UI-SPEC)?
10. Nhãn sở thích ở domain (khuyến nghị) hay app?
11. Plan docs có được sửa repo `C:\Users\OS\Documents\personal\tripory` (PT-01) và có commit ở đó không?

### R8.3 Đề xuất chia plan 04-24 trở đi

Mỗi plan vừa một phiên executor (khoảng 2–3 task, ≤ ~12 file sửa chính). Wave tính tiếp sau 04-23 (wave 12).

| Plan | Wave | depends_on | autonomous | Nội dung | File chính |
|---|---|---|---|---|---|
| 04-24 | 13 | `["04-23"]` (câu hỏi 7) | true | **Chỉ tài liệu hợp đồng BE** (D-52, D-57): endpoint tạo + `PUT`, JSON, luật validate + mã lỗi đề xuất (có `.WithErrorCode`, tránh chuỗi con `NotFound`/`Conflict`…), trường DTO mới, `PUT` giữ nguyên khi thiếu, danh mục 34 slug + mã sở thích, migration bằng lời, 5W1H từng thay đổi. Không code, không test case | `04-BE-CONTRACT.md` (mới), `04-BE-DEPENDENCIES.md` (thêm mục) |
| 04-25 | 14 | `["04-24"]` | **false** | **Checkpoint**: user duyệt tài liệu (slug, alias, mã, thứ tự), đối chiếu văn bản gốc NQ 202, tự sửa `tripory_be`, deploy; xác nhận bằng một lần gọi tạo thật (201, có Ngày 1..N). Resume signal: "BE xong" | không sửa code |
| 04-26 | 14 | `["04-24"]` | **false** | **Checkpoint ảnh**: 34 ảnh + bản ghi giấy phép (R2), đặt vào nơi lưu trữ. Không chặn FE: không plan FE nào phụ thuộc 04-26 trừ UAT cuối | `apps/web/public/destinations/*` (theo R2), tài liệu giấy phép |
| 04-27 | 15 | `["04-25"]` | true | Domain + danh mục: `destination*.ts`, `trip-title.ts`, `day-count.ts`, `interests.ts`, `cover-images.ts`, `metadata.ts` + test; port `DestinationCatalog`; adapter tĩnh + test; composition export `destinationCatalog`; `exports.test.ts` | `packages/itinerary/src/domain/*`, `application/ports.ts`, `infrastructure/static-destination-catalog.ts`, `infrastructure/index.ts`, `apps/web/src/composition/itinerary.client.ts` |
| 04-28 | 15 | `["04-25"]` | true | Component `ui-web`: Accordion, ToggleChip, NumberStepper, RadioGroup, `InlineAlert action`, `DialogContent showCloseButton/closeDisabled`, `Sheet fixedSnap` + test + export. Song song 04-27 (không chung file) | `packages/ui-web/src/molecules/*`, `index.ts`, `exports.test.ts` |
| 04-29 | 16 | `["04-27"]` | true | Read model: `Itinerary`/`ItinerarySummary` trường mới, DTO `.nullish()`, mapper, `useUpdateMetadata` optimistic `withMetadata` (LW-02), sửa mọi fixture test; `CoverImage` chuỗi dự phòng + thẻ/summary dùng catalog. Chưa đổi chữ ký `create` và `MetadataInput` | `domain/itinerary.ts`, `infrastructure/dto.ts`, `mappers.ts`, `fixtures.ts`, `react/index.ts`, `cover-image.tsx`, `itinerary-card.tsx`, `trip-summary.tsx`, ~17 test |
| 04-30 | 17 | `["04-28", "04-29"]` | true | Form tạo: `CreateItineraryInput` (port, repo, hook), schema + mapping lỗi + `ERROR_MESSAGES`, `ResponsiveFormSurface` (`fixedSnap`, `onOpenChange(open, details)`), container + 5 khối + `StickyFormFooter` + test | `ports.ts`, `http-itinerary-repository.ts`, `react/index.ts`, `form-schemas.ts`, `form-error-mapping.ts`, `create-itinerary-*.ts(x)`, các block |
| 04-31 | 18 | `["04-30"]` | true | Tự lưu: controller + hook ở editor, `TripInfoDialog` viết lại không chân form (`closeButton`), bỏ draft metadata (`draft-storage.ts`, `itinerary-editor.tsx`), leave guard nối controller + test. Ô ảnh tạm thời giữ một ô URL hoặc ẩn cho tới 04-32 | `metadata-autosave*.ts`, `use-metadata-autosave.ts`, `trip-info-dialog.tsx`, `itinerary-editor.tsx`, `draft-storage.ts` + test |
| 04-32 | 19 | `["04-31"]` | true | Lưới ảnh: `MetadataInput` + repo + DTO ghi danh sách ảnh (phương án A) hoặc 3 mutation riêng (B); `CoverImageField` + phần con + test; nối vào tự lưu | `ports.ts`, repo, `react/index.ts`, `cover-*.tsx`, `trip-info-dialog.tsx` |
| 04-33 | 20 | `["04-32"]` | true | Tài liệu: delta `04-UAT-CHECKLIST.md` (R7.3), ghi chú dòng lỗi thời `04-VALIDATION.md` (R7.4), sửa UI-SPEC NumberStepper nếu được duyệt, PT-01 ở `tripory/docs` (D-98), `04-BE-DEPENDENCIES.md` trạng thái | tài liệu |
| 04-34 | 21 | `["04-33", "04-26"]` | **false** | **UAT cuối**: các bước 2, 2a, 4, 5a–5c và kiểm danh mục, ảnh, giấy phép trên BE thật, desktop + iPhone Safari + Android Chrome | `04-UAT-CHECKLIST.md` (điền kết quả) |

Ghi chú chia plan:
- 04-27 và 04-28 song song; 04-30 và 04-31 **không** song song vì cùng sửa `form-schemas.ts`, `form-error-mapping.ts`, `responsive-form-surface.tsx`, `ERROR_MESSAGES`.
- Nếu 04-29 quá lớn vì fixture, tách phần `CoverImage`/thẻ sang đầu 04-32.
- Nếu hợp đồng chọn phương án B, 04-32 lớn hơn (3 mutation + diff), cân nhắc tách thành 04-32a (mutation + test) và 04-32b (component).
- Mọi plan FE chạy sau 04-25 (D-58), kể cả domain thuần.

---

### Tóm tắt của lượt nghiên cứu này
**Tóm tắt:**
- **R3:** Accordion 1.8.0 luôn dùng `value: Value[]` và không còn phím mũi tên giữa trigger. Panel bỏ `hidden` ngay khi mở, nên `flushSync` mở khối rồi `setFocus` là đủ cho D-69. Ref của RHF phải gắn vào phần tử nhìn thấy (ô số, dòng đầu, chip đầu), không vào input ẩn. `onClick` của Radio chỉ chạy khi bấm chuột/chạm hoặc Space, không chạy khi đổi bằng mũi tên, nên dùng nó cho tự chuyển khối D-64. ToggleGroup trả giá trị theo thứ tự bấm. NumberField không xử lý PageUp/PageDown, trả `null` khi blur ô trống và có `aria-roledescription` tiếng Anh; UI-SPEC cần chỉnh. `Sheet fixedSnap` có bẫy chỉ số snap; nên kèm `fillSnap`. `ResponsiveFormSurface` cần chuyển tiếp `eventDetails` để chặn Esc.
- **R4:** Controller tự lưu theo kiểu single-flight + trailing, đặt ở cấp editor. Lệnh luôn gửi ảnh chụp đầy đủ, ô sai thì dùng giá trị đã gửi gần nhất. Debounce 800 ms, blur và cleanup đều flush. `useUpdateMetadata` thêm optimistic `withMetadata` để sửa LW-02. Khuyến nghị bỏ bản nháp metadata; `findFirst` tự dọn khóa cũ.
- **R6:** Bảng file cụ thể cho domain, port `DestinationCatalog`, adapter tĩnh và composition, cùng 4 component `ui-web` mới. Subpath Base UI đã có trong allowlist ESLint, không cần sửa rule.
- **R7:** Danh sách test cần viết lại, trong đó có khoảng 17 file fixture vỡ typecheck khi `Itinerary` thêm trường. Có nháp UAT cho bước 2, 2a, 5a–5c và 6 dòng lỗi thời của `04-VALIDATION.md`.
- **R8:** 14 rủi ro, 11 câu hỏi mở và cách chia 11 plan (04-24..04-34). Ba plan `autonomous: false`: 04-25 chờ BE, 04-26 ảnh, 04-34 UAT cuối.
