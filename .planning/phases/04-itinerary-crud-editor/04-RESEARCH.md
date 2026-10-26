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
