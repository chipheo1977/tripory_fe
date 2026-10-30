---
status: testing
phase: 04-itinerary-crud-editor
source: [04-UAT-CHECKLIST.md, 04-01-SUMMARY.md … 04-22-SUMMARY.md, 04-VERIFICATION.md]
started: 2026-10-26T00:00:00Z
updated: 2026-10-26T01:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Trang trống, tab trạng thái và reload
expected: |
  Đăng nhập tài khoản mới (chưa có lịch trình), mở /itineraries/mine.
  Trang trống hiện EmptyState "Chưa có lịch trình nào" kèm nút tạo lịch trình.
  Tab "Nháp" và tab "Đã xuất bản" mỗi tab có empty state riêng.
  Reload giữ nguyên ?status trên URL và tab đang chọn.
awaiting: user response

## Prerequisites (từ 04-UAT-CHECKLIST.md §A)

- BE thật (tripory_be, nhánh feat/be-fe-integration-group-a). Bước 16, 20 cần BE chạy với JwtOptions__ExpiryMinutes=5.
- FE bản deploy Vercel HTTPS cho bước 7, 8 (resolve link rút gọn chạy ở server). Các bước khác có thể chạy local: `pnpm --filter @tripory/web exec next dev --experimental-https`.
- Hai tài khoản A (chủ) và B (người khác). Điện thoại thật iPhone Safari + Android Chrome cho bước 8, 12. VoiceOver/NVDA cho bước 11. DevTools Network (Preserve log).

## Tests

### 1. Trang trống, tab trạng thái và reload
expected: Tài khoản mới mở /itineraries/mine thấy EmptyState "Chưa có lịch trình nào" + nút tạo. Tab "Nháp" và "Đã xuất bản" có empty state riêng. Reload giữ ?status và tab. (ITIN-01, D-03, D-08)
result: [pending]

### 2. Tạo nhanh và vào editor
expected: Bấm "Tạo lịch trình", tiêu đề điền sẵn và bôi đen, Enter gửi. Tạo xong chuyển thẳng vào editor ở "Ngày 1", KHÔNG có toast. Tạo ít nhất 13 lịch trình. (ITIN-02, D-09, D-11)
result: issue
reported: "Sau khi tạo lịch trình, click icon back -> Button luôn loading đang tạo, không thể bấm hủy"
severity: major

### 3. Cuộn vô hạn, không nút "Tải thêm", lỗi trang kế im lặng
expected: Cuộn xuống cuối, trang 2 tự tải kèm skeleton ở cuối lưới, KHÔNG có nút "Tải thêm". Offline + cuộn chạm cuối: không có thông báo lỗi nào. Bật mạng, cuộn lên rồi xuống: tải tiếp bình thường. Mục trùng/bỏ sót khi sửa ở tab khác là giới hạn BE (phân trang offset), chỉ ghi nhận. (D-02, D-05)
result: [pending]

### 4. Thẻ lịch trình
expected: Thẻ có ảnh bìa https hiện ảnh; thẻ không có hiện nền dự phòng. Có badge "Nháp"/"Đã xuất bản", "Khởi hành …" khi có ngày, tổng km (ẩn khi bằng 0). KHÔNG có số ngày và số điểm trên thẻ. (D-04)
result: [pending]

### 5. Bố cục desktop và dialog "Thông tin chuyến đi"
expected: Desktop 1440x900: hai vùng, cột trái ~400px và canvas phải có tóm tắt. Sửa tiêu đề, mô tả, ngày khởi hành (rồi "Xóa ngày" về rỗng), ảnh bìa https có preview, URL ảnh hỏng báo "Không tải được ảnh từ link" nhưng vẫn lưu được. Reload giữ dữ liệu. (ITIN-03, D-24, D-25, D-26)
result: [pending]

### 6. Thêm ngày và phụ đề ngày
expected: "Thêm ngày" nhiều lần, chọn ngày đổi danh sách điểm. Phụ đề: Enter và blur lưu, Esc hủy về giá trị cũ, xóa sạch + Enter lưu rỗng. Reload vẫn còn các ngày và phụ đề. (ITIN-04, D-27, D-28, D-29)
result: [pending]

### 7. Nhập vị trí: tọa độ, link đầy đủ, link rút gọn ghim (bản deploy)
expected: Dán (a) "10.7769, 106.7009", (b) link Google Maps đầy đủ có !3d…!4d…, (c) link maps.app.goo.gl của GHIM THẢ TAY (trên bản deploy HTTPS). Cả ba hiện "Đã nhận: …" kèm tọa độ, lưu được; (c) resolve qua /api/maps/resolve trong vài giây. Điểm xuất hiện đúng ngày, cuối danh sách. (ITIN-05, D-20, D-21)
result: [pending]

### 8. Link POI không có tọa độ (điện thoại thật, bản deploy)
expected: Trên điện thoại, link maps.app.goo.gl của một quán/địa điểm có tên (không phải ghim). Dán vào form thêm điểm: hiện đúng câu "Link này chỉ có tên địa điểm, không có tọa độ. Trong Google Maps, nhấn giữ vào địa điểm để lấy tọa độ rồi dán vào đây." Tên và Địa chỉ tự điền từ link. Không lưu được cho tới khi có tọa độ. Ghi nhận câu hướng dẫn có đủ rõ không, thiết bị và trình duyệt. (ITIN-05, D-48, D-49, D-51)
result: [pending]

### 9. Sửa điểm, xóa và hoàn tác 5 giây
expected: Form sửa KHÔNG có ô chọn ngày. Xóa điểm: biến mất ngay + toast "Hoàn tác" 5 giây; Hoàn tác trả đúng vị trí cũ. Không bấm Hoàn tác, hết 5 giây, reload: điểm đã mất thật trên BE. (ITIN-06, ITIN-07, D-31)
result: [pending]

### 10. Đóng tab trong 5 giây sau khi xóa (keepalive + Origin)
expected: DevTools Network (Preserve log). Xóa một điểm rồi ĐÓNG TAB NGAY. Mở lại: điểm đã mất trên BE. Trong Network có DELETE /api/bff/itineraries/{id}/waypoints/{wid} gửi bằng keepalive và có header Origin. (ITIN-07, D-32, D-50, T-04-66)
result: [pending]

### 11. Kéo thả bằng chuột, bàn phím, trình đọc màn hình tiếng Việt
expected: (a) Kéo chuột đổi thứ tự và lưu ("Đã lưu"). (b) Bàn phím: Tab tới tay cầm, Space nhấc, mũi tên di chuyển, Space thả, Esc hủy trả thứ tự cũ. VoiceOver/NVDA đọc các thông báo bằng TIẾNG VIỆT. Reload giữ thứ tự mới. (ITIN-08, D-34)
result: [pending]

### 12. Mobile thật: sheet 3 mức, kéo cảm ứng, bàn phím ảo
expected: iPhone Safari và Android Chrome (320x568, 390x844). Editor mở sheet ở mức medium; vuốt hoặc giữ và kéo thanh kéo lên/xuống đổi được đủ 3 mức thấp (peek) / vừa (medium) / mở rộng (expanded) (không có nút Thu gọn/Mở rộng/Đóng bảng); header không bị che. Nhấn giữ ~180ms trên tay cầm bắt đầu kéo điểm và sheet KHÔNG bị kéo theo; vuốt chỗ khác chỉ cuộn/snap sheet; có auto-scroll gần mép. Bàn phím ảo không che nút gửi trong form. Ở mức thấp/vừa nội dung không cuộn, vuốt (kể cả kéo lên) hoặc giữ-kéo thanh kéo đổi được mức; ở mức mở rộng nội dung cuộn bình thường. "Thêm điểm đến" và "Thông tin chuyến đi" đều vuốt được đủ ba mức, kể cả khi bàn phím ảo bật. Thêm bước thử: (a) timeline ở mức medium, vuốt lên ở vùng trống của sheet lên mở rộng, vuốt xuống về vừa rồi thấp; ở mức thấp vuốt xuống tiếp thì sheet giữ nguyên (không đóng); (b) giữ và kéo thanh kéo (SheetHandle) lên/xuống, sheet đi theo ngón tay và dừng ở mức gần nhất khi thả; (c) ở mức mở rộng cuộn nội dung dài bình thường, kéo xuống khi đang ở đầu nội dung thì hạ mức, không đóng; (d) form "Thêm điểm đến" và "Thông tin chuyến đi" mở ở mức mở rộng, vuốt xuống về vừa, thấp rồi lên lại mở rộng, bấm nền tối không đóng, vuốt xuống mạnh từ mức thấp thì đóng; (e) mở form khi bàn phím ảo đang bật (ô Tên có focus) rồi lặp lại (d). Ghi model máy và trình duyệt. (ITIN-08, ITIN-14, D-14, D-15, D-34)
result: [pending]

### 13. Quãng đường theo ngày và tổng
expected: Km ở dòng thứ hai của tab ngày và "Tổng quãng đường" đổi đúng sau thêm, sửa vị trí, xóa, kéo đổi thứ tự (số do BE tính). Ghi nhận nếu số chỉ đổi sau reload. (ITIN-09, D-28)
result: [pending]

### 14. Lỗi lưu và "Thử lại"
expected: Offline, sửa phụ đề ngày rồi lưu: hiện "Lỗi – Thử lại" + toast lỗi. Bật mạng, bấm "Thử lại": chuyển "Đã lưu", dữ liệu đúng. (ITIN-10, D-30)
result: [pending]

### 15. Cảnh báo rời trang khi đang lưu
expected: Slow 3G, sửa một trường để đang lưu, bấm nút back của editor: dialog "Thay đổi đang được lưu. Rời trang?". Reload khi đang lưu: hộp beforeunload mặc định của trình duyệt. Không còn gì đang lưu thì không bị chặn. (ITIN-10, D-35)
result: [pending]

### 16. Hết phiên khi form đang mở: khôi phục nháp
expected: Mở form thêm điểm, gõ dở. Để hết phiên (BE 5 phút hoặc xóa cookie refresh). Đăng nhập lại: về đúng editor, form mở lại kèm "Đã khôi phục nội dung chưa lưu" và nội dung gõ dở còn nguyên. (ITIN-10, D-36)
result: [pending]

### 17. Hai tab cùng sửa
expected: Tab 1 xóa một điểm; tab 2 khi focus lại tự thấy dữ liệu mới. Ở tab 2 (danh sách còn cũ) kéo đổi thứ tự: BE từ chối, hiện toast info "Danh sách đã thay đổi, đã tải lại" và danh sách tải lại đúng. (ITIN-08, D-37)
result: [pending]

### 18. Xuất bản
expected: Nháp 0 điểm: nút Xuất bản mờ (aria-disabled, vẫn Tab tới được), focus/hover thấy "Thêm ít nhất 1 điểm đến để xuất bản". Có điểm: hộp xác nhận, focus đầu ở "Hủy". Xuất bản: toast "Đã xuất bản lịch trình", badge "Đã xuất bản", nút Xuất bản biến mất, có dòng "Thay đổi hiển thị ngay với người xem". Không có hộp/nút chia sẻ. (ITIN-11, D-38, D-39, D-40, D-41)
result: [pending]

### 19. Quyền: người khác, id sai, khách
expected: Tài khoản B mở /itineraries/{id}/edit của A (cả đã xuất bản và nháp): trang 403 "Bạn không có quyền sửa lịch trình này", không lộ nội dung. Id sai/không phải GUID: 404. Khách: chuyển tới /login?next=… rồi quay lại sau đăng nhập. (ITIN-13, D-44, D-45, D-46, T-04-67)
result: [pending]

### 20. Chủ mở bản nháp khi access token đã hết hạn
expected: Tài khoản A, để access token hết hạn (BE 5 phút, không thao tác) rồi mở thẳng /itineraries/{id}/edit của BẢN NHÁP của chính A (dán URL hoặc reload). Vào được editor, KHÔNG bị 403 oan. (D-45, D-46, T-04-68)
result: [pending]

### 21. Xóa lịch trình
expected: Xóa (a) từ menu thẻ ở danh sách, (b) từ trong editor; cả bản nháp và đã xuất bản. Hộp xác nhận focus đầu ở "Hủy". (a) Sau xóa focus sang thẻ kế tiếp. (b) Về /itineraries/mine + toast "Đã xóa lịch trình". Bản đã xuất bản có thêm dòng "Link chia sẻ sẽ không còn mở được."; bản nháp không có. (ITIN-12, D-42)
result: [pending]

### 22. Nút back giữ tab và vị trí cuộn
expected: Tab "Nháp", cuộn sâu qua trang 2, mở một thẻ vào editor, bấm back của trình duyệt: về đúng tab "Nháp" và đúng vị trí cuộn. (D-47)
result: [pending]

### 23. Smoke giao diện nhiều cỡ và reduced-motion
expected: 320, 390, 768, 1440px cho /itineraries/mine và editor (cả các hộp thoại): không tràn ngang, vùng chạm >= 44px. Với prefers-reduced-motion: reduce, cuộn mượt và hiệu ứng làm nổi điểm tắt. Bàn phím điều khiển được, Esc đóng hộp thoại và trả focus về phần tử mở nó. (UI-SPEC Accessibility Checklist)
result: [pending]

## Summary

total: 23
passed: 0
issues: 1
pending: 22
skipped: 0

## Gaps

- truth: "Tạo xong chuyển thẳng vào editor; khi Back về /itineraries/mine, dialog tạo đã đóng và form sạch"
  status: failed
  reason: "User reported: Sau khi tạo lịch trình, click icon back -> Button luôn loading đang tạo, không thể bấm hủy. Nguyên nhân gốc: CreateItineraryDialog giữ state `navigating` và không đóng dialog sau khi thành công, dựa vào việc trang unmount; với cacheComponents trang danh sách bị Activity ẩn nên `createOpen` và `navigating` sống sót, `locked` chặn đóng và khóa nút Hủy. Đã sửa: dialog tự đóng và reset khi thành công (bỏ `navigating`). Chi tiết: .agents/tasks/uat2-create-dialog-stuck.md"
  severity: major
  test: 2
  artifacts:
    - path: "apps/web/src/modules/itinerary/ui/create-itinerary-dialog.tsx"
      issue: "navigating không bao giờ reset, dialog không tự đóng khi thành công (đã sửa)"
    - path: "apps/web/src/modules/itinerary/ui/create-itinerary-dialog.test.tsx"
      issue: "test cũ khẳng định hành vi lỗi 'keeps the form locked after success' (đã viết lại, thêm test wrapper mô phỏng Activity)"
  missing:
    - "Chạy lại UAT bước 2 trên trình duyệt: tạo, Back, dialog đóng và mở lại là form mới"
