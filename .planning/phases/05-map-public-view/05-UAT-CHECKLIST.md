# Phase 5: Kịch bản UAT thủ công (Bản đồ & trang công khai)

**Trạng thái: chưa chạy (0/51).**

Nghiệm thu những hành vi cần thiết bị thật, BE thật, Zalo/Messenger thật và trình đọc màn hình mà test tự động không phủ. Chốt các tiêu chí ROADMAP Phase 5 trước `/gsd-verify-work 5`.

Phạm vi: PUB-01..PUB-05 (PUB-06 đã xong ở Phase 4, Phase 5 dùng lại code bản đồ). Phase 5.1 (thích/bình luận) KHÔNG nằm trong UAT này.

Quy ước: không ghi mật khẩu hay token thật vào tệp này. Cột "Kết quả" điền `PASS`, `FAIL` kèm ghi chú, hoặc `N/A` kèm lý do. Để trống nghĩa là chưa chạy. Không tự đánh `PASS` cho thứ chưa mở bằng thiết bị thật.

---

## A. Chuẩn bị

- [ ] **FE bản deploy (HTTPS)** hoặc `next start`. `PUBLIC_SITE_URL` đặt đúng origin deploy để ảnh OG và `og:url` là URL tuyệt đối. `API_ORIGIN` trỏ BE thật.
- [ ] **BE thật** (`tripory_be`). Ghi lại BE-05-01 (nhúng `author` vào `ItineraryDetailDto`, xem `05-BE-GUIDE.md`) đã deploy hay chưa, để biết khối tác giả có hiện. Cách kiểm: gọi `GET {API_ORIGIN}/api/v1/itineraries/{id}` của một lịch trình đã xuất bản và xem JSON có khóa `author`.
- [ ] **Hai tài khoản**: A (chủ lịch trình) và B (người khác). Một lịch trình nháp và một lịch trình đã xuất bản của A (có ít nhất 3 ngày, một ngày trống, có ghi chú nhiều dòng).
- [ ] **Thiết bị thật**: iPhone (Safari) và Android (Chrome). Ghi model máy và phiên bản trình duyệt vào ô kết quả của bước dùng.
- [ ] **Tài khoản Zalo và Messenger** để dán link thật.
- [ ] **Trình đọc màn hình**: VoiceOver (macOS/iOS) hoặc NVDA (Windows).
- [ ] **DevTools** (Network, giả lập 320×568, tắt WebGL/Offline) và cửa sổ ẩn danh cho vai khách.
- [ ] **Các tồn đọng Phase 4** theo bảng ở mục J (4 dòng của `05-BE-DEPENDENCIES.md`) được xem trước khi chạy các bước dưới.

---

## B. Bài viết (PUB-01)

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| B1 | Khách (cửa sổ ẩn danh) mở `/itineraries/{id}` đã xuất bản. | Thấy ảnh bìa, tiêu đề, meta (ngày, quãng đường), mô tả, các mục theo ngày với từng điểm. Mỗi điểm có link Google Maps, mở tab mới. Không bị chuyển sang `/login`. | PUB-01, D-01 | |
| B2 | Mở lịch trình có ngày không có điểm. | Ngày đó hiện "Chưa có điểm", không mất mục ngày. | PUB-01, D-04 | |
| B3 | Bấm chip ngày; cuộn bài viết lên xuống. | Bấm chip nhảy tới đúng ngày. Chip đang đọc đổi theo vị trí cuộn. Bật `prefers-reduced-motion` thì nhảy thẳng, không cuộn mượt. | PUB-01, D-05 | |
| B4 | Xem khối tác giả với khách rồi với chủ (A). | Khách thấy avatar + tên tác giả khi BE-05-01 đã có. Chủ thấy Badge "Lịch trình của bạn". | PUB-01, D-02 | |
| B5 | Mở lịch trình có ghi chú nhiều dòng và chứa `<b>x</b>` hoặc `<script>`. | Ghi chú xuống dòng đúng; ký tự `<` hiện nguyên văn, không thành HTML hay chạy script. | PUB-01, T-05 (XSS) | |

---

## C. Bản đồ (PUB-02, PUB-06)

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| C1 | Desktop (≥ 1024): bấm "Bản đồ" ở header. Mobile: bấm viên thuốc đáy màn hình. | Chuyển giữa Bài viết và Bản đồ; nút/viên thuốc đang chọn rõ ràng. | PUB-02, D-08 | |
| C2 | Mở thẳng `/itineraries/{id}?view=map`, rồi bấm Back của trình duyệt. | Mở sẵn bản đồ; Back về chế độ Bài viết, không rời trang. | PUB-02, D-08 | |
| C3 | Bấm pin; bấm dòng điểm; đổi tab Tổng quan/ngày; ở mobile kéo sheet 3 mức rồi đóng sheet. | Pin và dòng điểm làm nổi bật lẫn nhau. Viên thuốc luôn thấy ở cả ba mức sheet và khi đóng sheet, không đè nút ghi công "i". | PUB-02, D-09, D-10 | |
| C4 | Tắt WebGL hoặc Offline rồi mở chế độ Bản đồ. | Hiện "Không tải được bản đồ" với "Thử lại" và "Xem dạng bài viết"; bấm "Xem dạng bài viết" đưa focus về đoạn "Bài viết". | PUB-02, D-11 | |
| C5 | Kiểm vùng Hoàng Sa/Trường Sa và ghi công bản đồ. | Giống Phase 4 (không đổi). | PUB-06 | |
| C6 | DevTools → Network khi xem bản đồ. | Chỉ có tile/glyph của OpenFreeMap và chunk JS của bản đồ; không gọi BE từ trình duyệt. | PUB-02 | |

---

## D. Nháp, 403, 404 (PUB-03)

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| D1 | Khách mở link của lịch trình nháp. | Trang 403 tối giản "Lịch trình này chưa được xuất bản" / "Chỉ người tạo xem được bản nháp." kèm "Về trang chủ". Không có nút Đăng nhập, không lộ tiêu đề hay ảnh. | PUB-03, D-21 | |
| D2 | Tài khoản B (đã đăng nhập) mở nháp của A. | Cùng trang 403 như D1. | PUB-03, D-21 | |
| D3 | Chủ (A) mở nháp của mình. | Thấy dải "Bản nháp – chỉ bạn thấy" và nút Sửa; KHÔNG có nút Chia sẻ. | PUB-03, D-20 | |
| D4 | Chủ mở nháp khi access token vừa hết hạn (chờ hết hạn, hoặc xóa cookie access và giữ cookie refresh). | Không thấy 403; trang tự hồi phục phiên rồi tải lại thành nội dung nháp của chủ. | PUB-03, D-22 | |
| D5 | Mở `/itineraries/khong-phai-guid` và một GUID đúng dạng nhưng không tồn tại. | Cả hai ra trang "Không tìm thấy trang". Ghi mã HTTP thực đo (xem mục K: nháp và BE 404 có thể là 200 kèm `noindex` do stream, đã chấp nhận). | PUB-03, D-21 | |

---

## E. Chia sẻ (PUB-04)

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| E1 | Trang công khai → "Chia sẻ" → "Sao chép link"; dán thử. Rồi thử khi trình duyệt chặn clipboard. | Link không có `?view`. Nhãn nút đổi 2 giây rồi trở lại. Khi bị chặn, ô link được chọn sẵn để tự sao chép. | PUB-04, D-14 | |
| E2 | Web Share trên iPhone Safari và Android Chrome. Rồi thử trên desktop không hỗ trợ. | Điện thoại có nút Web Share, mở bảng chia sẻ của hệ điều hành; hủy thì im lặng. Desktop không hỗ trợ thì không có nút. | PUB-04, D-15 | |
| E3 | QR: quét bằng camera điện thoại; bấm "Tải ảnh QR"; quét lại ảnh tải về. | Mở đúng trang lịch trình. Tải về PNG tên `tripory-...png`; ảnh tải về quét được. | PUB-04, D-16 | |
| E4 | Editor sau khi xuất bản. | Nút "Chia sẻ" thế chỗ nút "Xuất bản". | PUB-04, D-17 | |
| E5 | Xuất bản từ editor: xác nhận xuất bản. | Hộp chia sẻ tự mở (có "Mở trang công khai"); đóng hộp thì hiện MỘT toast "Đã xuất bản lịch trình" và focus về nút Chia sẻ. Ở 320×568 toast không chồng lên hộp. | PUB-04, D-17 | |
| E6 | Mở hộp chia sẻ bằng nút Chia sẻ (đã xuất bản) rồi đóng. | Không có toast. | PUB-04, D-17 | |
| E7 | Xuất bản khi tắt mạng. | Giữ hộp xác nhận xuất bản và báo lỗi tiếng Việt; không mở hộp chia sẻ. | PUB-04, D-17 | |

---

## F. Xem trước link và noindex (PUB-05)

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| F1 | Dán link lịch trình đã xuất bản vào Messenger. | Thẻ xem trước có tiêu đề, mô tả, ảnh (ảnh bìa người dùng tự thêm). | PUB-05, D-18 | |
| F2 | Dán cùng link vào Zalo. | Có thẻ xem trước. NẾU TRỐNG: lấy User-Agent thật của Zalo từ log máy chủ (Vercel), đối chiếu regex `htmlLimitedBots` trong `apps/web/next.config.ts`, thêm token UA đúng (RESEARCH A1), deploy lại và thử lại. | PUB-05, A1 | |
| F3 | Dán link của lịch trình chỉ có ảnh giữ chỗ theo điểm đến hoặc không có ảnh. | Thẻ dùng ảnh OG mặc định của Tripory (1200×630). | PUB-05, D-18 | |
| F4 | Dán link của lịch trình không có mô tả. | Mô tả là "Lịch trình N ngày · X điểm trên Tripory". | PUB-05, D-19 | |
| F5 | Xem mã nguồn trang công khai (View Source). | Có `<meta name="robots" content="noindex, nofollow">`. | PUB-05, D-22 | |
| F6 | Dán link của lịch trình NHÁP vào Zalo/Messenger. | Thẻ xem trước KHÔNG lộ tiêu đề hay ảnh của lịch trình. | PUB-05, T-05-72 | |
| F7 | Nếu thẻ xem trước cũ/sai: dùng Facebook Sharing Debugger và xóa cache Zalo. | Ghi lại link đã xóa cache để thử lại. | PUB-05 | |

---

## G. Điều hướng Phase 4 đã đổi

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| G1 | `/itineraries/mine`: menu ⋯ của thẻ đã xuất bản; của thẻ nháp; bấm thẻ. | Thẻ đã xuất bản có "Xem trang công khai" (mở ở tab hiện tại); thẻ nháp không có; bấm thẻ vẫn vào editor. | D-23, D-24 | |
| G2 | Tài khoản B mở `/itineraries/{id}/edit` của lịch trình ĐÃ XUẤT BẢN của A; rồi của lịch trình NHÁP của A. | Đã xuất bản: chuyển sang trang công khai, không nháy 403. Nháp: trang "Bạn không có quyền sửa lịch trình này". | D-25 | |

---

## H. Giao diện và truy cập

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| H1 | Smoke ở 320×568, 390×844, 768×1024, 1440×900, cả Bài viết và Bản đồ. | Không tràn ngang (header, dải chip, dải đáy, hộp chia sẻ). | UI-SPEC | |
| H2 | FLAG 2: ở 320×568, sheet đóng, đo dải đáy [chip "Lịch trình" + viên thuốc]. | Vừa trong 288px, không tràn, không bị che nút ghi công. | UI-SPEC FLAG 2 | |
| H3 | FLAG 1: kiểm nút "Sửa" bằng trình đọc màn hình. | Tên truy cập là "Sửa lịch trình" (kể cả khi dưới `md` chỉ còn icon). | UI-SPEC FLAG 1 | |
| H4 | Chỉ dùng bàn phím: Tab qua header, viên thuốc (←/→ di chuyển, Space/Enter chọn), chip ngày, link Maps, hộp chia sẻ. | Viên thuốc là một điểm dừng Tab; hộp chia sẻ focus đầu ở "Sao chép link", Esc đóng và trả focus về nút Chia sẻ. | UI-SPEC a11y | |
| H5 | VoiceOver/NVDA trên cả hai chế độ. | Mỗi chế độ có một `h1`; chip đọc "đang chọn"; hộp chia sẻ đọc tiêu đề + mô tả; QR đọc "Mã QR của link lịch trình". | UI-SPEC a11y | |
| H6 | Bật `prefers-reduced-motion`. | Cuộn tới ngày và canh khung bản đồ nhảy thẳng, không hiệu ứng mượt. | UI-SPEC a11y | |

---

## I. Tác giả (BE-05-01)

| # | Hành động | Kết quả mong đợi | Tiêu chí / Quyết định | Kết quả (PASS/FAIL + ghi chú) |
|---|-----------|------------------|-----------------------|-------------------------------|
| I1 | Khi BE CHƯA có `author`: mở trang công khai. | Không có khối tác giả, không lỗi; chủ chỉ thấy Badge "Lịch trình của bạn". | BE-05-01, D-02 | |
| I2 | Khi BE đã có `author`: mở trang công khai; kiểm DOM. | Hiện avatar + tên; avatar mặc định hiện chữ cái đầu; không có email ở bất kỳ đâu trong DOM. | BE-05-01, D-02 | |

---

## J. Tồn đọng Phase 4 (từ `05-BE-DEPENDENCIES.md`)

| # | Hạng mục | Tình trạng ghi nhận | Kết quả (PASS/FAIL + ghi chú) |
|---|----------|---------------------|-------------------------------|
| J1 | BE đã deploy các mục 6-11 của `04-BE-CONTRACT.md` (POST/PUT, DTO `coverImages`/`selectedCoverIndex`/`destinationCode`, mã lỗi, migration). | Người dùng xác nhận 2026-11-11; agent chưa kiểm độc lập. | |
| J2 | `DestinationCatalog:CoverImageBaseUrl` của BE khớp `DESTINATION_IMAGE_BASE_URL` (`https://triporyv1.vercel.app/destinations`) trong `apps/web/src/composition/destination-catalog.ts`. | Người dùng xác nhận 2026-11-11; agent chưa kiểm độc lập. | |
| J3 | UAT mục F của Phase 4 (F1..F12): bản đồ Phase 5 dùng lại code 04-42..04-53. | Còn mở (xem `04-REVIEW.md`, `04-UI-REVIEW.md`, `deferred-items.md`). | |
| J4 | Chưa kiểm trên thiết bị cảm ứng thật. | Còn mở, kiểm ở các bước C3, E2, E3, H2 trên iPhone/Android. | |

---

## K. Kết quả đo ở máy (không chặn)

Đo ngày 2026-11-11 bằng `next start` bản build thật, BE giả cục bộ (không nằm trong repo, đã xóa). Đây là số đo của agent, không thay thế UAT trên bản deploy.

| # | Phép đo | Kết quả đo | Việc người dùng cần làm | Kết quả (PASS/FAIL + ghi chú) |
|---|---------|------------|--------------------------|-------------------------------|
| K1 | Mã HTTP và nội dung HTML: đã xuất bản; nháp (BE 403); BE 404; BE 500; id sai dạng GUID. | Mọi trường hợp đều 200 do stream sau điểm suspend (đã chấp nhận, RESEARCH Pitfall 2). Đã xuất bản có `h1`, 3 mục ngày, ngày trống, tác giả trong HTML đầu. Nháp có "Lịch trình này chưa được xuất bản" và không lộ tiêu đề. BE 500 có "Không tải được lịch trình" kèm "Thử lại". BE 404 và id sai dùng fallback 404 chuẩn của Next (client render). Tất cả có `noindex`. | Mở bằng trình duyệt thật (D1, D5) để xác nhận màn hình 404 hiện đúng. | |
| K2 | `og:*` trong `<head>` theo User-Agent: `Zalo`, `Facebot`, `meta-externalagent`, `facebookexternalhit`, so với `RandomBot` và trình duyệt thường. | Bốn UA bot: có trong `<head>`. `RandomBot` và trình duyệt thường: metadata nằm trong `<body>` (stream), đúng thiết kế `htmlLimitedBots`. Token `Zalo` được khớp; UA thật của Zalo chưa biết. | Làm F2 bằng Zalo thật; nếu trống thì chỉnh `htmlLimitedBots`. | |
| K3 | `/itineraries/{id}?view=map` có bài viết trong HTML; không chuyển sang `/login`. | Có bài viết (`id="ngay-1"`), không có lỗi bản đồ trong HTML, không redirect. | Không. | |
| K4 | `/og-default.png`. | 200, `image/png`, 1200×630, 23568 byte. | Xem bằng mắt ở F3. | |
| K5 | Tách bundle: MapLibre không nằm trong 20 chunk JS đầu; có chunk riêng và file `maplibre-gl-worker*.mjs` trong `.next/static`. | Đúng. | Xác nhận lại ở C6 trên bản deploy. | |
| K6 | Bản build `next build` (`API_ORIGIN` đặt). | Xanh; `/itineraries/[id]` là Partial Prerender (◐); `/og-default.png` tĩnh (○); không gặp `blocking-prerender-metadata-runtime`. | Không. | |
| K7 | ImageResponse dưới Cache Components, Zalo UA (RESEARCH A1). | Chưa dùng ImageResponse cho từng lịch trình; chỉ dùng `/og-default.png` tĩnh. A1 chưa kiểm với Zalo thật. | F2. | |

---

## L. Kết luận (điền sau UAT)

- Số bước PASS / FAIL / N/A: ______
- Vấn đề mở: ______
- Quyết định tiếp theo (`/gsd-verify-work 5`, sửa lỗi, hay chuyển Phase 5.1): ______
