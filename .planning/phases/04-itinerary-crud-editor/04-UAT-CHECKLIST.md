# Phase 4: Kịch bản UAT thủ công (Itinerary CRUD & editor)

**Trạng thái: 23/23 bước đã được người chạy xác nhận PASS (checkpoint 04-23 Task 2).** Các bước 16 đến 23 được đánh PASS theo chỉ đạo trực tiếp của người chạy; công cụ tự động không tự chạy các bước này. Phần mở lại 2026-10-30 (form tạo 4 khối, nhiều ảnh bìa, tự lưu) chạy ở mục D, kết quả điền ở plan 04-40. Mục D đã chạy xong: 8/8 PASS trên BE local (2026-11-05), kết luận ở mục C'.

Nghiệm thu các hành vi cần thiết bị thật, BE thật và Google thật mà test tự động không phủ (mục "Manual-Only" của `04-VALIDATION.md`). Chốt 5 tiêu chí ROADMAP Phase 4 trước `/gsd-verify-work`.

Phạm vi: ITIN-01..ITIN-14. Theo D-40, UAT này KHÔNG kiểm hộp chia sẻ hay nút "Chia sẻ" (thuộc Phase 5). Các bước phụ thuộc BE đều ghi tham chiếu `04-BE-DEPENDENCIES.md` (số mục trong bảng của file đó).

Quy ước: không ghi mật khẩu hay token thật vào tệp này. Dùng mật khẩu thử tự đặt, chỉ nhớ trong đầu hoặc trình quản lý mật khẩu.

---

## A. Chuẩn bị

- [x] **BE thật**: repo `tripory_be`, nhánh `feat/be-fe-integration-group-a`. Với bước hết phiên (16, 20) chạy BE với `JwtOptions__ExpiryMinutes=5` (không đặt dưới 3 phút vì `PROACTIVE_LEAD_SEC` = 120 giây, xem `03-BE-DEPENDENCIES.md` mục 13):
  ```powershell
  $env:JwtOptions__ExpiryMinutes = "5"
  $env:ASPNETCORE_ENVIRONMENT = "Development"
  # rồi chạy BE (dotnet run ...) trong cùng cửa sổ
  ```
- [x] **FE bản deploy Vercel (HTTPS)** với `API_ORIGIN` trỏ tới BE thật và `BFF_SHARED_SECRET` khớp BE. Bản deploy là BẮT BUỘC cho bước 7 và 8 (resolve link rút gọn chạy ở server, cần chứng minh trên hạ tầng thật, T-04-69). Các bước còn lại có thể chạy local:
  ```powershell
  pnpm --filter @tripory/web exec next dev --experimental-https
  ```
  Mở `https://localhost:3000` (chấp nhận chứng chỉ tự ký nếu trình duyệt hỏi). Sửa `apps/web/.env.local` xong phải khởi động lại `next dev`.
- [x] **Hai tài khoản**: A (chủ lịch trình) và B (người khác). Đăng ký nhớ giới hạn BE: register 3 lần/giờ theo IP (`03-BE-DEPENDENCIES.md`); tạo sẵn hai tài khoản từ trước.
- [x] **Thiết bị thật**: iPhone (Safari) và Android (Chrome). Bước 8 và 12 BẮT BUỘC trên điện thoại thật; ghi model máy và phiên bản trình duyệt vào ô kết quả.
- [x] **Trình đọc màn hình**: VoiceOver (macOS/iOS) hoặc NVDA (Windows).
- [x] **DevTools → Network** (bật "Preserve log") và khả năng bật Offline / throttle Slow 3G.
- [x] Xóa cookie cũ của `localhost` (hoặc dùng cửa sổ ẩn danh) trước khi bắt đầu.

---

## B. Các bước

Cột "Kết quả" điền `PASS`, `FAIL` kèm ghi chú, hoặc `N/A` kèm lý do. Để trống nghĩa là chưa chạy.

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| 1 | Đăng nhập tài khoản mới (chưa có lịch trình), mở `/itineraries/mine`. Chuyển qua tab "Nháp" rồi "Đã xuất bản", rồi reload trang. | Trang trống hiện EmptyState "Chưa có lịch trình nào" kèm nút CTA tạo lịch trình. Tab "Nháp" và tab "Đã xuất bản" mỗi tab có empty state riêng. Reload giữ nguyên `?status` trên URL và tab đang chọn. | ITIN-01, D-03, D-08 | PASS |
| 2 | Bấm "Tạo lịch trình", gõ tiêu đề, bấm Enter. Lặp lại để tạo ít nhất 13 lịch trình (nhiều hơn một trang). | Hộp tạo nhanh có tiêu đề điền sẵn và được bôi đen; Enter gửi. Mỗi lần tạo xong chuyển thẳng vào editor ở "Ngày 1", KHÔNG có toast. | ITIN-02, D-09, D-11 | PASS (trước đây FAIL do hộp tạo bị kẹt; đã sửa và chạy lại PASS) — đã được thay bởi bước 2' ở mục D (mở lại 2026-10-30) |
| 3 | Quay lại `/itineraries/mine` (tab chứa ≥ 13 mục), cuộn xuống cuối danh sách. Sau đó bật Offline trong DevTools, cuộn chạm cuối để kích hoạt trang kế. Bật mạng lại, cuộn lên rồi cuộn xuống lại. | Trang 2 tự tải khi cuộn tới cuối, có skeleton ở cuối lưới, KHÔNG có nút "Tải thêm". Khi offline và cuộn chạm cuối: không có thông báo lỗi nào hiện ra. Bật mạng, cuộn lên rồi xuống: danh sách tải tiếp bình thường. Bước phụ thuộc BE: phân trang theo offset (`04-BE-DEPENDENCIES.md` mục 3), nên có thể thấy mục trùng hoặc bỏ sót nếu sửa lịch trình ở tab khác khi đang cuộn; ghi nhận nếu gặp, không tính FAIL. | D-02, D-05 | PASS |
| 4 | Quan sát thẻ lịch trình trong danh sách: có thẻ có ảnh bìa và thẻ không có. | Thẻ có ảnh bìa https hiện ảnh; thẻ không có hiện nền dự phòng. Có badge "Nháp"/"Đã xuất bản", "Khởi hành …" khi có ngày, tổng km (ẩn khi bằng 0). KHÔNG có số ngày và số điểm trên thẻ (BE trả `DaysCount`/`WaypointsCount` bằng 0, `04-BE-DEPENDENCIES.md` mục 1). | D-04 | PASS |
| 5 | Mở editor trên desktop 1440×900. Quan sát bố cục. Mở "Thông tin chuyến đi": sửa tiêu đề, mô tả, ngày khởi hành (rồi bấm nút X "Xóa Ngày khởi hành" bên phải ô; biểu tượng lịch nằm bên trái ô), nhập ảnh bìa https và xem preview. Thử một URL ảnh hỏng rồi lưu. | Hai vùng: cột trái ~400px (danh sách) và canvas bên phải có tóm tắt chuyến đi. Sửa và lưu thành công, reload vẫn giữ. Nút X "Xóa Ngày khởi hành" làm ngày khởi hành về rỗng và trả focus về ô; bấm biểu tượng lịch bên trái mở bộ chọn ngày; ô "Ảnh bìa" cũng có nút X "Xóa Ảnh bìa" ở bên phải. Ảnh bìa https có preview. URL ảnh hỏng: preview báo "Không tải được ảnh từ link" nhưng vẫn lưu được. Giới hạn độ dài ở FE khớp BE (`04-BE-DEPENDENCIES.md` mục 2). | ITIN-03, D-24, D-25, D-26 | PASS — đã được thay bởi bước 5a-5c ở mục D (mở lại 2026-10-30) |
| 6 | Bấm "Thêm ngày" vài lần, chọn từng ngày. Sửa phụ đề ngày: gõ rồi Enter; gõ rồi blur; gõ rồi Esc; xóa sạch rồi Enter. Reload. | Ngày mới xuất hiện ở tab, chọn ngày đổi danh sách điểm. Enter và blur lưu phụ đề; Esc hủy và trả giá trị cũ; xóa sạch lưu thành rỗng (hiển thị như không có phụ đề, `04-BE-DEPENDENCIES.md` mục 10). Reload vẫn còn các ngày và phụ đề. | ITIN-04, D-27, D-28, D-29 | PASS |
| 7 | Trong form thêm điểm, lần lượt dán: (a) `10.7769, 106.7009`; (b) một link Google Maps đầy đủ có `!3d…!4d…`; (c) một link `maps.app.goo.gl` của vị trí GHIM THẢ TAY, chia sẻ từ app Google Maps trên điện thoại. Thực hiện (c) trên BẢN DEPLOY HTTPS. | Cả ba cách hiện "Đã nhận: …" kèm tọa độ và cho phép lưu điểm. Với (c), link rút gọn được resolve thành tọa độ qua `/api/maps/resolve` (chạy trên Vercel) trong vài giây. Điểm xuất hiện đúng ngày, đúng thứ tự cuối. | ITIN-05, D-20, D-21 | PASS |
| 8 | **Trên điện thoại thật**: trong app Google Maps, mở một quán/địa điểm (POI, có tên, KHÔNG phải ghim thả tay), bấm Chia sẻ, sao chép link `maps.app.goo.gl`. Dán link đó vào form thêm điểm của bản deploy. Ghi lại cảm nhận về rủi ro UX. | Hiện đúng câu: "Link này chỉ có tên địa điểm, không có tọa độ. Trong Google Maps, nhấn giữ vào địa điểm để lấy tọa độ rồi dán vào đây." Ô Tên và Địa chỉ tự điền từ link (tách từ `/place/<tên, địa chỉ>/`). Không thể lưu điểm cho tới khi có tọa độ. Người chạy ghi chú: câu hướng dẫn có đủ rõ không, có dễ bỏ cuộc không. Phụ thuộc BE: không (giới hạn của Google, `04-BE-DEPENDENCIES.md` mục 8). Ghi thiết bị và trình duyệt đã dùng. | ITIN-05, D-48, D-49, D-51 | PASS |
| 9 | Sửa một điểm (kiểm tra form KHÔNG có ô chọn ngày). Xóa một điểm; bấm "Hoàn tác" trong 5 giây. Xóa lần nữa, KHÔNG bấm Hoàn tác, chờ hết 5 giây rồi reload. | Sửa lưu đúng. Xóa: điểm biến mất ngay và có toast với nút "Hoàn tác" trong 5 giây. Hoàn tác trả điểm về ĐÚNG vị trí cũ. Để hết 5 giây: reload thấy điểm đã mất thật trên BE. | ITIN-06, ITIN-07, D-31 | PASS |
| 10 | Mở DevTools → Network (Preserve log). Xóa một điểm rồi ĐÓNG TAB NGAY (trong vòng 5 giây, không bấm Hoàn tác). Mở lại lịch trình đó. Lặp lại một lần nữa nhưng giữ tab để xem request. | Điểm đã mất trên BE khi mở lại. Trong Network có `DELETE /api/bff/itineraries/{id}/waypoints/{wid}` được gửi bằng `keepalive` (cột Initiator/Request có cờ keepalive) VÀ có header `Origin` (BFF chặn request thiếu Origin). Đây là bằng chứng giảm T-04-66. Phụ thuộc BE: `04-BE-DEPENDENCIES.md` mục 11 (không có hoàn tác phía BE). | ITIN-07, D-32, D-50, T-04-66 | PASS |
| 11 | Sắp xếp điểm trong một ngày: (a) kéo bằng chuột; (b) bằng bàn phím: Tab tới tay cầm, Space để nhấc, ↑/↓ để di chuyển, Space để thả, Esc để hủy. Bật VoiceOver (hoặc NVDA) và nghe thông báo. | (a) Kéo thả đổi thứ tự và lưu ("Đã lưu"). (b) Thứ tự đổi đúng, Esc trả về thứ tự cũ. Trình đọc màn hình đọc các thông báo (nhấc, di chuyển qua vị trí, thả, hủy) bằng TIẾNG VIỆT. Reload giữ thứ tự mới. | ITIN-08, D-34 | PASS |
| 12 | **Trên iPhone Safari và Android Chrome**: mở editor. Quan sát sheet. Thử ở 320×568 (máy nhỏ hoặc responsive mode) và 390×844. Vuốt, hoặc giữ và kéo thanh kéo lên/xuống, để đổi mức sheet qua 3 mức thấp (peek) / vừa (medium) / mở rộng (expanded) (không còn nút Thu gọn/Mở rộng/Đóng bảng). Nhấn giữ ~180ms trên tay cầm của một điểm rồi kéo; sau đó vuốt ở chỗ khác trong sheet. Mở form thêm điểm và bật bàn phím ảo. Thêm bước thử: (a) timeline ở mức medium, vuốt lên ở vùng trống của sheet lên mở rộng, vuốt xuống về vừa rồi thấp; ở mức thấp vuốt xuống tiếp thì sheet giữ nguyên (không đóng); (b) giữ và kéo thanh kéo (SheetHandle) lên/xuống, sheet đi theo ngón tay và dừng ở mức gần nhất khi thả; (c) ở mức mở rộng cuộn nội dung dài bình thường, kéo xuống khi đang ở đầu nội dung thì hạ mức, không đóng; (d) form "Thêm điểm đến" và "Thông tin chuyến đi" mở ở mức mở rộng, vuốt xuống về vừa, thấp rồi lên lại mở rộng, bấm nền tối không đóng, vuốt xuống mạnh từ mức thấp thì đóng; (e) mở form khi bàn phím ảo đang bật (ô Tên có focus) rồi lặp lại (d). | Editor mở sheet ở mức medium. Vuốt hoặc kéo thanh kéo đổi được đủ ba mức thấp (peek) / vừa (medium) / mở rộng (expanded), header của trang KHÔNG bị sheet che ở cả 320×568 và 390×844. Nhấn giữ ~180ms trên tay cầm bắt đầu kéo điểm và sheet KHÔNG bị kéo theo; vuốt ở chỗ khác chỉ cuộn nội dung hoặc snap sheet; có auto-scroll khi kéo gần mép. Bàn phím ảo không che nút gửi trong form. Ở mức thấp/vừa nội dung không cuộn, vuốt (kể cả kéo lên) hoặc giữ-kéo thanh kéo đổi được mức; ở mức mở rộng nội dung cuộn bình thường. "Thêm điểm đến" và "Thông tin chuyến đi" đều vuốt được đủ ba mức, kể cả khi bàn phím ảo bật. Ghi model máy và trình duyệt. | ITIN-08, ITIN-14, D-14, D-15, D-34 | PASS |
| 13 | Quan sát km ở dòng thứ hai của tab ngày và "Tổng quãng đường". Thực hiện: thêm điểm, sửa vị trí điểm, xóa điểm, kéo đổi thứ tự. Sau mỗi thao tác xem lại số. | Km theo ngày và tổng quãng đường đổi đúng sau mỗi thao tác (số do BE tính, FE hiển thị lại sau khi tải lại). Ngày không đủ 2 điểm hiển thị 0 hoặc ẩn đúng như thiết kế. Ghi nhận nếu số chỉ đổi sau khi reload. | ITIN-09, D-28 | PASS |
| 14 | Tắt mạng (Offline), sửa phụ đề ngày rồi bấm lưu. Bật mạng lại, bấm "Thử lại". | Hiện trạng thái "Lỗi – Thử lại" và toast lỗi. Bật mạng, bấm "Thử lại" thì chuyển "Đã lưu" và dữ liệu đúng. | ITIN-10, D-30 | PASS |
| 15 | Throttle "Slow 3G", sửa một trường để vào trạng thái đang lưu; ngay lúc đó bấm nút back của editor. Lặp lại, nhưng lần này reload tab khi đang lưu. | Back: hiện dialog "Thay đổi đang được lưu. Rời trang?" với lựa chọn ở lại/rời. Reload: trình duyệt hiện hộp `beforeunload` mặc định. Khi không còn gì đang lưu thì không bị chặn. | ITIN-10, D-35 | PASS |
| 16 | Mở form thêm điểm (gõ dở vài ký tự). Để hết phiên: chờ token hết hạn (BE 5 phút) rồi gây một thao tác trả 401 mà không refresh được, hoặc xóa cookie refresh trong DevTools. Đăng nhập lại. | Sau đăng nhập lại, được đưa về đúng editor, form thêm điểm mở lại kèm thông báo "Đã khôi phục nội dung chưa lưu" và nội dung gõ dở còn nguyên. Bản nháp hết hạn sau 24 giờ và chỉ thuộc đúng người dùng đó. | ITIN-10, D-36 | PASS |
| 17 | Mở cùng một lịch trình ở hai tab (tab 1, tab 2). Ở tab 1 xóa một điểm (chờ hết 5 giây hoặc để flush). Quay lại tab 2 (focus lại). Sau đó, ở tab 2 (khi chưa focus lại, danh sách còn cũ) kéo đổi thứ tự. | Tab 2 khi focus lại tự thấy dữ liệu mới (điểm đã xóa biến mất). Reorder dựa trên danh sách cũ bị BE từ chối: hiện toast info "Danh sách đã thay đổi, đã tải lại" và danh sách được tải lại đúng. Phụ thuộc BE: không có ETag, bản ghi sau thắng (`04-BE-DEPENDENCIES.md` mục 4); ghi nhận hành vi quan sát được. | ITIN-08, D-37 | PASS |
| 18 | Mở lịch trình nháp CHƯA có điểm nào: hover/focus nút Xuất bản. Thêm một điểm. Bấm Xuất bản, xác nhận trong hộp thoại. Quan sát toàn bộ editor sau đó. | 0 điểm: nút mờ (`aria-disabled`, vẫn Tab tới được), focus/hover thấy "Thêm ít nhất 1 điểm đến để xuất bản". Có điểm: hộp xác nhận mở với focus đầu ở "Hủy". Bấm Xuất bản: toast "Đã xuất bản lịch trình", badge đổi thành "Đã xuất bản", nút Xuất bản biến mất, có dòng "Thay đổi hiển thị ngay với người xem". Không có hộp hay nút chia sẻ nào (thuộc Phase 5). Không có nút "Hủy xuất bản" (`04-BE-DEPENDENCIES.md` mục 6). | ITIN-11, D-38, D-39, D-40, D-41 | PASS |
| 19 | Đăng nhập tài khoản B. Mở `/itineraries/{id}/edit` của lịch trình tài khoản A: thử với cả bản đã xuất bản và bản nháp. Thử một id sai/không tồn tại. Thử lúc chưa đăng nhập. | Lịch trình của A (cả đã xuất bản lẫn nháp): trang 403 "Bạn không có quyền sửa lịch trình này", không lộ nội dung. Id không tồn tại hoặc không phải GUID: trang 404. Khách: chuyển tới `/login?next=…` rồi quay lại sau khi đăng nhập. | ITIN-13, D-44, D-45, D-46, T-04-67 | PASS |
| 20 | Đăng nhập tài khoản A (chủ). Để access token hết hạn (BE 5 phút, không thao tác trong khoảng đó) rồi mở thẳng `/itineraries/{id}/edit` của BẢN NHÁP của chính A (dán URL hoặc reload). | Vào được editor, KHÔNG bị 403 oan "Bạn không có quyền sửa". Đây là kiểm tra token cũ (stale Bearer): `GET /itineraries/{id}` của BE coi Bearer hết hạn là ẩn danh và trả 403 (`04-BE-DEPENDENCIES.md` mục 7); FE phải né bằng cách tải qua BFF có refresh và phát lại. Nếu thấy 403 oan thì ghi FAIL kèm bản nháp hay đã xuất bản. | D-45, D-46, Pitfall 11, T-04-68 | PASS |
| 21 | Xóa lịch trình: (a) từ menu trên thẻ ở danh sách; (b) từ trong editor. Làm với cả bản nháp và bản đã xuất bản. | Hộp xác nhận mở với focus đầu ở "Hủy". (a) Sau khi xóa, focus chuyển sang thẻ kế tiếp. (b) Sau khi xóa, về `/itineraries/mine` và có toast "Đã xóa lịch trình". Với bản đã xuất bản, hộp có thêm dòng "Link chia sẻ sẽ không còn mở được." Bản nháp không có dòng đó. | ITIN-12, D-42 | PASS |
| 22 | Ở `/itineraries/mine` chọn tab "Nháp", cuộn xuống sâu (qua trang 2), mở một thẻ vào editor, rồi bấm nút back của trình duyệt. | Quay về đúng tab "Nháp" và đúng vị trí cuộn trước đó (không về đầu danh sách). | D-47 | PASS |
| 23 | Smoke giao diện ở 320, 390, 768, 1440px cho `/itineraries/mine` và editor (cả mở các hộp thoại). Bật `prefers-reduced-motion: reduce` trong hệ điều hành hoặc DevTools (Rendering). | Không tràn ngang ở mọi cỡ. Vùng chạm ≥ 44px. Với `prefers-reduced-motion`: cuộn mượt và hiệu ứng làm nổi điểm (highlight) được tắt. Điều khiển bằng bàn phím được; Esc đóng hộp thoại và trả focus về phần tử mở nó. | UI-SPEC (Accessibility Checklist) | PASS |

---

## C. Kết luận

Điền sau khi chạy xong.

- Ngày chạy: 2026-10-30
- Người chạy: LoiNH
- Môi trường (BE local / deploy, bản FE Vercel / local HTTPS, trình duyệt desktop, model iPhone + Safari, model Android + Chrome, VoiceOver / NVDA): BE `tripory_be` chạy local với `JwtOptions__ExpiryMinutes=5`, bản FE deploy Vercel HTTPS (bước 7, 8), điện thoại thật và trình đọc màn hình theo yêu cầu bước 8, 11, 12. Model máy, phiên bản trình duyệt và công cụ đọc màn hình cụ thể: người chạy điền tay (chưa được cung cấp).
- Bằng chứng bước 10 (có `keepalive` và `Origin` trong Network): có (suy ra từ kết quả PASS của bước 10; ảnh chụp Network chưa đính kèm)
- Ghi chú rủi ro UX của link POI (bước 8): người chạy không ghi nhận rủi ro nào ngoài kết quả PASS; câu hướng dẫn được xem là đủ rõ.

**Kết luận chung:** `PASS toàn bộ`

Phần mở lại 2026-10-30: điền ở plan 04-40 (mục D).

Danh sách bước FAIL (nếu có), kèm số bước và mô tả:

- Không có. Lỗi phát sinh trong lúc chạy đã sửa trước khi chốt: bước 2 (hộp tạo bị kẹt "Đang tạo...") và lỗi BE khi lưu phụ đề ngày / thêm điểm (`DbUpdateConcurrencyException`).

Ghi nhận chấp nhận rủi ro (D-51, T-04-70): route `/api/maps/resolve` chưa có rate limit riêng; người chạy xác nhận đã đọc và chấp nhận cho v1. Ghi nhận: có (người chạy đã quyết định không thêm rate limit cho route này ở phiên thảo luận D-51)

Bước phụ thuộc BE cần xử lý ở `tripory_be` (tham chiếu `04-BE-DEPENDENCIES.md`):

- Danh sách đầy đủ ở `04-BE-DEPENDENCIES.md` (mục 1, 2, 3, 4, 5, 7 là việc sẽ chuyển sang `tripory_be` ở Phase 8, DEPL-02). Ghi thêm ở đây nếu UAT phát hiện điểm BE mới.

Khi có FAIL: lập kế hoạch sửa bằng `/gsd-plan-phase 4 --gaps`.

### C'. Kết luận phần mở lại 2026-10-30 (mục D)

- Ngày chạy: 2026-11-05
- Người chạy: LoiNH
- Môi trường: BE `tripory_be` chạy local ở chế độ Development (commit `bca0577`, nhánh `be/phase_4`, hai migration đã áp dụng lên DB phát triển `tripory_db`); FE chạy local bằng `next dev`, mở qua `http://localhost:3000` và `http://192.168.30.44:3000` (IP LAN, `allowedDevOrigins` và `APP_ORIGIN` nhận hai origin). KHÔNG chạy trên BE đã deploy và KHÔNG chạy trên bản FE Vercel production (production chưa được deploy lại sau Phase 4). Model máy, phiên bản trình duyệt và trình đọc màn hình dùng cho các bước 2a và 5b: người chạy chưa cung cấp, ghi bổ sung tay nếu cần.
- Kết quả mục D: **8/8 PASS** (2', 2a, 2b, 4a, 5a, 5b, 5c, 16a). Bước 2a được người chạy xác nhận PASS sau khi ô kết quả ghi nhầm `X`.
- Bước 4a PASS theo kỳ vọng D-106: ảnh mặc định theo điểm đến chưa có trên `triporyv1.vercel.app` nên UI rơi về nền dự phòng. 34 ảnh minh họa Unsplash đã nằm trong `apps/web/public/destinations/` (kèm `CREDITS.md`) nhưng chưa deploy production.
- Lỗi phát hiện trong lúc chạy UAT và đã sửa trước khi chốt (đã commit): ô link ảnh bìa không gõ/dán được và bottom sheet bị cắt đáy (`2b5cd63`); BFF trả 403 `Bff.CrossOrigin` khi mở qua IP LAN, `APP_ORIGIN` nhận nhiều origin (`3e51b44`); focus và luật link ảnh, tự lưu offline (WR-01..WR-04: `fb92fea`, `09780af`, `fcfe3ee`, `3c87732`); nút chân form tạo không dính đáy (`549902a`); lỗi tự lưu hiện bằng toast (`f29f66e`, `6d478bc`); nút của khung link ảnh (`9883be2`); bỏ chữ "Không bắt buộc." (`5fa3f7f`).
- Chưa kiểm, không tính vào kết quả PASS: các lời gọi `POST`/`PUT`/`GET` thật tới BE đã deploy (mục 6 đến 11 của mục 13 trong `04-BE-CONTRACT.md` chưa chạy, mục 13 mới tick 1/12); ảnh mặc định thật trên production; Safari/iOS và Android khác ngoài thiết bị người chạy đã dùng; trình đọc màn hình cho các thông báo mới của lưới ảnh bìa.
- Ghi nhận rủi ro đã chấp nhận: `/mine` vẫn trả `daysCount` bằng 0 (nợ BE cũ, `04-BE-DEPENDENCIES.md`); PUB-02 chưa có plan.

**Kết luận chung phần mở lại:** `PASS toàn bộ mục D` (trên BE local). Danh sách bước FAIL: không có.

---

## D. Bổ sung mở lại 2026-10-30 (form tạo 4 khối, nhiều ảnh bìa, tự lưu)

Phạm vi: ITIN-02, ITIN-03. Chạy trên BE theo hợp đồng `04-BE-CONTRACT.md` (xem mục 13-14 của file đó cho trạng thái BE tại checkpoint 04-25). Thiết bị: desktop, iPhone Safari, Android Chrome. Theo D-106, UAT này KHÔNG kiểm ảnh thật: ảnh mặc định theo điểm đến có thể 404 và UI rơi về nền dự phòng theo token. Việc cung cấp 34 ảnh và bản ghi giấy phép nằm ở Deferred. Cột kết quả để trống, điền ở plan 04-40.

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| 2' | Bấm "Tạo lịch trình" trên desktop (≥ 768px) rồi trên điện thoại (bottom sheet). Gõ "da lat" vào ô tìm, chọn Lâm Đồng bằng chuột. Ở khối Tên: sửa tên rồi đổi lại điểm đến; xóa trắng tên rồi rời ô. Mở khối Thời gian: bấm −/+ tới 1 và 30, gõ 45 rồi rời ô, để trống rồi rời ô; chọn ngày khởi hành trong quá khứ. Mở khối Sở thích, bật 2 chip. Bấm "Tạo lịch trình". Lặp lại (không cần đủ 4 khối) để có ít nhất 13 lịch trình. | Modal có 4 khối, khối Điểm đến mở sẵn, chỉ một khối mở; "da lat" ra Lâm Đồng kèm "gồm Đà Lạt"; chọn xong khối Điểm đến đóng, khối Tên mở, focus ở trigger khối Tên; tên tự là "Chuyến đi Lâm Đồng" cho tới khi sửa, xóa trắng rồi rời ô thì điền lại; số ngày kẹp 1-30, nút − mờ ở 1, + mờ ở 30, 45 thành 30, để trống trả giá trị trước; ngày quá khứ được nhận; dòng tóm tắt các khối đúng; nút "Tạo lịch trình" luôn thấy ở đáy; tạo xong vào thẳng editor, dải Ngày 1..N đúng số ngày đã chọn, KHÔNG toast; Network có đúng một `POST /api/bff/itineraries`. | ITIN-02, D-59..D-75, D-92..D-97, D-56. Phụ thuộc BE: `04-BE-CONTRACT.md` | PASS |
| 2a | Mở form tạo, không chọn gì, bấm "Tạo lịch trình". Rồi chọn điểm đến bằng bàn phím: Tab vào nhóm, ↓ vài lần, Enter. Thử Esc khi ô tìm có chữ, rồi Esc khi ô trống. Đóng form giữa chừng rồi mở lại. Trên iPhone: mở bàn phím ảo ở ô Tên (chân form còn thấy, một hàng), vuốt xuống đóng form, cuộn danh sách 34 điểm đến trong sheet. | Khối Điểm đến mở, focus dòng đầu nhóm "Phổ biến", lỗi "Vui lòng chọn điểm đến.", tiêu đề khối có dấu lỗi; mũi tên đổi lựa chọn mà không tự chuyển khối, Enter chuyển; Esc có chữ chỉ xóa chữ, Esc khi trống đóng modal; đóng không hỏi, mở lại là form mới (khối Điểm đến mở, tên "Chuyến đi mới", 3 ngày); chân form không bị bàn phím che; vuốt xuống đóng được sheet. | D-64, D-65, D-66, D-69, D-95 | PASS |
| 2b | Trên danh sách điểm đến kiểm đếm: nhóm "Tất cả" có đúng 34 mục; đối chiếu tên với Nghị quyết 202/2025/QH15 (đã làm ở 04-25, ghi lại đã xác nhận); nhóm "Phổ biến" đúng 8 mục theo thứ tự Đà Nẵng, TP. Hồ Chí Minh, Hà Nội, Khánh Hòa, Lâm Đồng, Quảng Ninh, An Giang, Lào Cai. | Đủ 34 mục "Tất cả", 8 mục "Phổ biến" đúng thứ tự. | D-60, D-61, D-92 | PASS |
| 4a | Thẻ không có ảnh bìa người dùng nhưng có điểm đến (lịch trình tạo bằng form mới): Network gọi ảnh mặc định `…/destinations/<slug>.jpg`. | Vì ảnh thật chưa có (D-106), mong đợi nền dự phòng theo token, không lỗi, không hiện tên điểm đến trên thẻ, và editor không hiện điểm đến hay sở thích. | D-76, D-78, D-86, D-106 | PASS |
| 5a | Mở "Thông tin chuyến đi". Sửa tiêu đề, ngừng gõ khoảng 1 giây. Sửa mô tả rồi Tab ra ngoài. Đổi ngày khởi hành, rồi xóa ngày. Xóa trắng tiêu đề rồi đóng form. Mở lại. | Không có nút Lưu/Hủy, chân form trống, có nút X; Network mỗi lần ngừng gõ ~800 ms hoặc rời ô có một `PUT`, đổi/xóa ngày gửi ngay; header "Đang lưu…" rồi "Đã lưu", trong form không hiện "Đã lưu"; tiêu đề trên header đổi sau mỗi lần lưu; tiêu đề trống báo lỗi dưới ô và không gửi; đóng rồi mở lại thấy tiêu đề đã lưu gần nhất; body `PUT` có đúng 5 khóa và không có điểm đến/sở thích. | ITIN-03, D-87..D-91, D-54, D-77 | PASS |
| 5b | Trong "Thông tin chuyến đi": thêm ảnh bằng link https tới khi đủ 5 (một link ảnh hỏng; lần đầu bấm nút "Thêm ảnh bìa", các lần sau thử bấm thẳng vào khung trống nét đứt bằng chuột và bằng chạm, rồi dùng Tab để kiểm khung trống không phải điểm dừng bàn phím); chọn ảnh khác bằng chuột rồi bằng phím mũi tên; xóa ảnh đang hiển thị; xóa hết ảnh; reload sau mỗi nhóm thao tác; bật VoiceOver/NVDA. Thử thêm link `http://`, link trùng, link > 500 ký tự. | Lưới 5 ô, ảnh đang hiển thị có viền và dấu tích; bấm khung trống nét đứt (chuột/chạm) mở khung "Link ảnh" và focus ô nhập giống nút "Thêm ảnh bìa", còn Tab chỉ dừng ở nút "Thêm ảnh bìa" (D-82, D-84); ảnh hỏng vẫn thêm được và hiện nền dự phòng; đủ 5 ảnh thì không còn nút thêm và có ghi chú; mỗi thao tác lưu ngay (chuỗi phím mũi tên không sinh quá 2 `PUT` liên tiếp); xóa ảnh đang hiển thị thì ảnh đầu còn lại được chọn; xóa hết thì lưới trống, thẻ và canvas hiện nền dự phòng của điểm đến; reload giữ đúng; trình đọc màn hình đọc "Ảnh bìa N, đang hiển thị", "Chọn ảnh N làm ảnh bìa", "Đã thêm/Đã xóa ảnh bìa N". Link `http://`, link trùng, link > 500 ký tự: báo lỗi dưới ô. | ITIN-03, D-81..D-86, D-99, D-100 | PASS |
| 5c | Bật Offline, sửa tiêu đề rồi rời ô. Bấm "Thử lại" khi đã bật mạng. Lặp lại nhưng đóng form khi còn lỗi, rồi bấm "Lỗi – Thử lại" trên header. Reload khi còn debounce chưa gửi. | Lỗi hiện `InlineAlert` "Chưa lưu được thay đổi. …" trong form kèm "Thử lại", giá trị vẫn trong ô; thử lại thành công thì alert biến mất; đóng khi còn lỗi thì header "Lỗi – Thử lại" + toast, thử lại gửi giá trị cuối; reload khi còn debounce hiện cảnh báo gốc của trình duyệt. | D-90, D-30, D-35 | PASS |
| 16a | Hết phiên khi "Thông tin chuyến đi" đang mở rồi đăng nhập lại. | Form metadata KHÔNG khôi phục bản nháp (D-107); form thêm điểm vẫn khôi phục như bước 16. | D-101, D-107, D-36 | PASS |

Kiểm danh mục: bước 2b ở trên là phần kiểm danh mục 34 đơn vị cấp tỉnh/thành.
