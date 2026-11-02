# Phase 4: Itinerary CRUD & Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-23
**Phase:** 04-itinerary-crud-editor
**Areas discussed:** Danh sách "Lịch trình của tôi", Tạo nhanh, Bố cục editor, Form waypoint và nhập vị trí, Cách lưu metadata và ngày, Undo xóa và an toàn dữ liệu, Xuất bản và hộp chia sẻ, Route và quyền

Chế độ text mode, câu hỏi gom theo từng mục; ★ là lựa chọn được đề xuất.

---

## Danh sách "Lịch trình của tôi"

| Câu hỏi | Lựa chọn đã trình bày | Chọn |
|---|---|---|
| Bố cục | ★ Lưới thẻ có ảnh bìa 1/2/3 cột · Danh sách hàng gọn | Lưới thẻ |
| Phân trang | ★ Nút "Tải thêm" · Trước/Sau + số trang trên URL | **Khác: infinite scroll** |
| Bộ lọc | ★ Tabs lưu trên URL · Tabs state cục bộ | Tabs lưu URL |
| Nội dung thẻ | ★ ảnh, tiêu đề, badge, ngày khởi hành, km · thêm mô tả 2 dòng · tối giản | ★ |
| Vị trí xóa | ★ menu ⋯ trên thẻ + editor · chỉ editor | ★ |
| Bấm thẻ | ★ luôn vào editor · nháp vào editor, đã xuất bản tạm vào editor | ★ |

**Notes:** Người dùng chọn infinite scroll thay "Tải thêm". Bản CONTEXT đầu tiên Claude tự thêm nút "Tải thêm" dự phòng; người dùng xác nhận lại là **không có nút tải thêm**, đã gỡ khỏi D-02. Sau đó người dùng bỏ luôn lỗi inline có "Thử lại" ở cuối lưới. Lỗi trang kế giờ im lặng, sentinel tự thử lại khi cuộn chạm cuối lần nữa (ngoại lệ FND-04, chỉ cho trang kế; trang đầu vẫn có ErrorState).

## Tạo nhanh

| Câu hỏi | Lựa chọn đã trình bày | Chọn |
|---|---|---|
| Cách tạo | ★ Dialog 1 ô điền sẵn "Chuyến đi mới" · tạo ngay không dialog · ô inline | ★ |
| Vị trí nút | ★ đầu trang + EmptyState · thêm lối trên header | ★ |
| Sau khi tạo | ★ vào editor, không toast · thêm toast | ★ |
| Đang gửi | ★ mẫu Phase 3, lỗi inline · đóng dialog, lỗi toast | ★ |

## Bố cục editor

| Câu hỏi | Lựa chọn đã trình bày | Chọn |
|---|---|---|
| Desktop | ★ hai vùng (timeline + canvas chừa cho bản đồ) · một cột giữa · làm bản đồ SVG sớm | ★ |
| Mobile | ★ ảnh bìa/tóm tắt + Sheet 3 mức · bỏ sheet (lệch ITIN-14) | ★ |
| Mức mặc định sheet | ★ medium · expanded · peek | ★ |
| Thanh hành động | ★ header editor dính trên · dùng AppHeader | ★ |
| Sửa metadata | ★ Dialog/Sheet "Thông tin chuyến đi" · inline · tab "Thông tin" | ★ |

## Form waypoint và nhập vị trí

| Câu hỏi | Lựa chọn đã trình bày | Chọn |
|---|---|---|
| Nơi mở form | ★ Dialog/Sheet modal · inline | ★ |
| Thứ tự ô | ★ hiện hết · gom "Thêm chi tiết" | ★ |
| Dạng vị trí | ★ lat,lng + link đầy đủ + resolve link rút gọn server-side · không resolve link rút gọn | ★ |
| Phản hồi khi dán | ★ "Đã nhận…" + tự điền Tên · không tự điền | ★ |
| Sau khi thêm | ★ đóng, cuộn + highlight · giữ form "Thêm & tiếp tục" · cả hai nút | ★ |
| Mở sửa | ★ bấm thẻ, Xóa trong menu, tay cầm riêng · nút Sửa/Xóa hiện thẳng | ★ |

**Notes:** Claude ghi thêm yêu cầu route resolve phải có phiên và kiểm Origin để không thành dịch vụ mở link/SSRF.

## Cách lưu metadata và ngày

| Câu hỏi | Lựa chọn đã trình bày | Chọn |
|---|---|---|
| Lưu dialog metadata | ★ nút Lưu/Hủy · tự lưu khi blur | ★ |
| Ảnh bìa | ★ preview, chỉ https, lỗi ảnh vẫn cho lưu · chặn lưu khi ảnh lỗi | ★ |
| Ngày khởi hành | ★ input date gốc · date picker tự dựng | ★ |
| Thêm ngày | ★ lưu BE ngay qua subtitle null · chỉ ở client · như ★ + xác nhận | ★ |
| Ngày thưa | ★ vẽ đủ 1..max · chỉ ngày BE trả | ★ |
| Phụ đề inline | ★ bấm thành input, Enter/blur lưu · dialog nhỏ | ★ |
| Lỗi thao tác nền | ★ "Lỗi – Thử lại" trên header + toast · chỉ toast | ★ |

**Notes:** Đã kiểm code BE: `SetDaySubtitle` gọi `GetOrCreateDay`, nên thêm ngày lưu thật được; BE không có endpoint xóa ngày.

## Undo xóa và an toàn dữ liệu

| Câu hỏi | Lựa chọn đã trình bày | Chọn |
|---|---|---|
| Hiển thị undo | ★ ẩn ngay + toast Hoàn tác 5 giây · làm mờ tại chỗ | ★ |
| Rời trang khi chờ xóa | ★ gửi DELETE ngay (keepalive) · hủy xóa | ★ |
| Kéo khi chờ xóa | ★ flush DELETE rồi reorder · khóa kéo 5 giây | ★ |
| Kéo thả | ★ dnd-kit 3 sensor, cảm ứng trên tay cầm · cảm ứng trên cả thẻ | ★ |
| Cảnh báo rời trang | ★ beforeunload + Dialog khi điều hướng trong app · chỉ beforeunload | ★ |
| Hết phiên khi sửa | ★ giữ nháp form trong sessionStorage · chấp nhận mất | ★ |
| Nhiều tab | ★ refetch khi focus + xử lý InvalidReorderList · chỉ refetch sau mutation | ★ |

## Xuất bản và hộp chia sẻ

| Câu hỏi | Lựa chọn đã trình bày | Chọn |
|---|---|---|
| Nút khi chưa có waypoint | ★ aria-disabled + giải thích · ẩn nút | ★ |
| Hộp xác nhận | ★ copy chốt, focus "Hủy" · thêm checkbox "Tôi hiểu" | ★ |
| Hộp chia sẻ Phase 4 | ★ URL chỉ đọc + Sao chép (link 404 tới Phase 5) · **dời hộp chia sẻ sang Phase 5** · kéo trang công khai tối thiểu lên Phase 4 | **Dời sang Phase 5** |
| Editor sau xuất bản | ★ badge + nút Chia sẻ + dòng nhắc · không dòng nhắc | ★ (bỏ nút Chia sẻ do chọn dời hộp) |
| Xóa lịch trình | ★ dialog + câu link chia sẻ, toast · không toast | ★ |
| Xóa hết waypoint khi đã xuất bản | ★ cho phép · cảnh báo | ★ |

**Notes:** Lựa chọn dời hộp chia sẻ lệch chữ của ITIN-11 và tiêu chí 4 của Phase 4. Claude đã báo trước và ghi chú vào `ROADMAP.md` (Phase 4 tiêu chí 4, Phase 5 tiêu chí 3) và `REQUIREMENTS.md` (ITIN-11).

## Route và quyền

Người dùng chọn "7" hai lần; Claude hiểu là có chọn mục 8 và hỏi tiếp, người dùng trả lời đầy đủ.

| Câu hỏi | Lựa chọn đã trình bày | Chọn |
|---|---|---|
| Route editor | ★ `/itineraries/[id]/edit` · `/itineraries/[id]` | ★ |
| Không phải chủ (đã xuất bản) | ★ trang 403 · editor chỉ xem | ★ |
| Nháp người khác / id sai | ★ 403 / not-found / ErrorState · mọi trường hợp 404 | ★ |
| Header editor | ★ layout toàn màn, header editor thay AppHeader · giữ AppHeader | ★ |
| Nút back | ★ về đúng danh sách cũ · luôn về "Tất cả" | ★ |

## Claude's Discretion

- Hình dạng 4 tầng `packages/itinerary`, query key, hook factory.
- RSC prefetch + hydrate hay fetch ở client.
- Optimistic cho thêm/sửa waypoint, debounce refetch sau reorder.
- Tên/vị trí route resolve link rút gọn, timeout, số bước redirect.
- Copy phụ, ngưỡng infinite scroll, ngưỡng nhấn giữ cảm ứng.

## Deferred Ideas

- Hộp chia sẻ và nút "Chia sẻ" → Phase 5.
- Chuyển hướng người không phải chủ sang trang công khai → Phase 5.
- Số ngày/số điểm trên thẻ → khi BE sửa `/mine`.
- UX-03, UX-04, UX-07, MAP-01, MAP-02 → v2.
- Đề xuất BE: xóa ngày, hủy xuất bản, chuyển ngày, `UpdatedAt` trong summary, ETag.

---

# Phiên mở lại 2026-10-30: form tạo lịch trình, ảnh bìa, tự lưu

> **Chỉ là nhật ký.** Không dùng làm đầu vào cho research, plan hay execute. Quyết định nằm ở `04-CONTEXT.md` D-52..D-101.

**Chế độ:** `/gsd-discuss-phase 4 --batch`, cập nhật CONTEXT (giữ D-01..D-51). Phạm vi: chỉ ITIN-02 (và ITIN-03 phát sinh), PUB-02 để sau.
**Đầu vào trước phiên:** `.agents/tasks/create-itinerary-wizard-proposal.md`; user đã chọn phương án B (BE trước, một request), 34 tỉnh/thành, một điểm đến, bắt buộc, số ngày mặc định 3 (1–30), danh sách sở thích; các mặc định Q7–Q12 của đề xuất được áp (ngày khởi hành tùy chọn, không xác nhận khi đóng, tên "Chuyến đi {điểm đến}", bảng phổ biến tĩnh, sửa đặc tả PT-01). User đổi Q10: đưa vào Phase 4 thay vì chèn 4.1.

## Hợp đồng BE và cách làm BE

| Câu hỏi | Lựa chọn đưa ra | Chọn |
|---|---|---|
| Ai sửa `tripory_be` | a) agent sửa trên nhánh mới, không commit; b) agent viết tài liệu kèm code chính xác, user áp; c) agent sửa và commit | **Khác:** user tự sửa BE; agent viết tài liệu nhưng **không kèm code chính xác** |
| Danh mục điểm đến ở BE | a) hằng số C# + validator; b) bảng seed bằng migration | a |
| `PUT` metadata với điểm đến/sở thích | a) thiếu trường thì giữ nguyên; b) ghi đè, FE gửi lại | a |
| Lưu sở thích | a) `text[]` mã cố định, tối đa 7; b) `jsonb` | a |
| Số ngày ở BE | a) tạo đủ Ngày 1..N, 1–30; b) chỉ Ngày 1 và N | a |
| Nội dung tài liệu BE | a) hợp đồng + ca kiểm thử; b) hợp đồng, không ca kiểm thử | **b, kèm giải thích 5W1H** |
| Thứ tự FE/BE | a) FE song song theo hợp đồng, checkpoint trước UAT; b) chờ BE xong rồi làm FE | b |

## Bước chọn điểm đến

| Câu hỏi | Lựa chọn đưa ra | Chọn |
|---|---|---|
| Tìm theo alias | a) có (Đà Lạt → Lâm Đồng); b) không | a |
| Cách hiển thị | a) một danh sách theo hạng; b) nhóm "Phổ biến" + "Tất cả" theo chữ cái; c) lưới thẻ có ảnh | b |
| Bảng xếp hạng | a) dùng bản nháp; b) user gửi thứ tự khác | a |
| Chọn xong thì sao | a) đánh dấu, bấm Tiếp tục; b) tự sang bước 2 | **Khác:** cả 4 bước nằm trên một modal bottom, 4 khối từ trên xuống, toggle đóng/mở, chỉ mở một khối mỗi lúc |

## Accordion (thay wizard)

| Câu hỏi | Lựa chọn đưa ra | Chọn |
|---|---|---|
| Khối đóng hiển thị gì | a) tiêu đề + tóm tắt giá trị + dấu lỗi; b) chỉ tiêu đề | a |
| Chọn xong một khối | a) chỉ Điểm đến tự chuyển; b) không tự chuyển; c) khối nào cũng tự chuyển | **Khác:** chọn một thì tự đóng và mở khối tiếp; chọn nhiều và số ngày thì người dùng tự mở khối tiếp |
| Mở khối tùy ý | a) mở bất kỳ, Điểm đến mở sẵn; b) phải chọn điểm đến trước | a |
| Vị trí nút Tạo | a) dính đáy, luôn thấy; b) cuối nội dung | Lần đầu "giữ như hiện tại", sau chốt **a** |
| Desktop | a) cùng accordion trong Dialog; b) desktop cũng bottom sheet | a |
| Khối Tên | a) không tự chuyển, Enter không gửi; b) Enter mở khối Thời gian | a |
| Bấm Tạo khi thiếu | a) mở khối lỗi đầu tiên, focus, lỗi dưới ô; b) chỉ đánh dấu tiêu đề | a |

## Khối Sở thích

| Câu hỏi | Lựa chọn đưa ra | Chọn |
|---|---|---|
| Nhãn "Food & Drink" | a) "Ẩm thực & Đồ uống"; b) giữ nguyên | a |
| "Khác" | a) chỉ là nhãn; b) mở ô nhập tự do | a |
| Hình thức | a) chip chữ; b) chip có icon; c) checkbox | a |

## Khối Thời gian và thứ tự khối

| Câu hỏi | Lựa chọn đưa ra | Chọn |
|---|---|---|
| Thứ tự khối | a) Điểm đến → Tên → Thời gian → Sở thích; b) khác | a (user ghi "4a", hiểu là câu 1 = a) |
| Chọn số ngày | a) nút −/+ và gõ số, 1–30; b) chip nhanh + ô số; c) chỉ ô số | a |
| Ngày kết thúc | a) hiện "Về ngày …"; b) không hiện | b |
| Ô ngày khởi hành | a) ô ngày có sẵn, để trống được; b) bắt buộc | a |

## Hiển thị lại sau khi tạo

| Câu hỏi | Lựa chọn đưa ra | Chọn |
|---|---|---|
| Hiện trong editor | a) chưa, chỉ lưu; b) hiện trong `TripSummary` | a |
| Sửa sau khi tạo | a) chưa; b) thêm vào "Thông tin chuyến đi" | a |
| Hiện trên thẻ | a) chưa; b) có | a |

## Yêu cầu bổ sung: ảnh bìa

User thêm: ảnh bìa mặc định theo điểm đến; lưu tối đa 5 ảnh; chỉ sửa ở "Thông tin chuyến đi", tích chọn ảnh hiển thị. So sánh nguồn: bộ 34 ảnh tuyển sẵn tự lưu trữ / Unsplash API / Wikimedia.

| Câu hỏi | Lựa chọn đưa ra | Chọn |
|---|---|---|
| Nguồn ảnh mặc định | a) bộ 34 ảnh tự lưu trữ; b) Unsplash API; c) Wikimedia | a |
| Ghi ảnh mặc định vào danh sách lúc tạo | a) có, ảnh 1 và được chọn, tính vào 5; b) không, chỉ dự phòng | a |
| Chỉ nhập URL | a) đúng, không upload; b) cần upload | a |
| Giao diện | a) danh sách 5 dòng URL + radio; b) lưới 5 ô | b |
| Phạm vi | a) gộp vào lần mở lại Phase 4; b) tách ra sau | a |
| Bấm ô trống | a) ô nhập URL ngay dưới lưới; b) hộp thoại nhỏ | a |
| Đánh dấu và bàn phím | a) viền + dấu tích, nhóm radio; b) chỉ viền | a |
| Xóa/thay ảnh | a) nút X trên ô, xóa ảnh đang chọn thì chọn ảnh đầu; b) giữ lâu / menu | a |
| Lúc lưu | a) cùng nút Lưu của form; b) lưu ngay mỗi thao tác | **b, và mở rộng:** cả "Thông tin chuyến đi" lưu luôn khi có thay đổi, không có nút Lưu |

## Tự lưu "Thông tin chuyến đi"

| Câu hỏi | Lựa chọn đưa ra | Chọn |
|---|---|---|
| Ô chữ lưu khi nào | a) blur + ngừng gõ ~800 ms, ngày/ảnh lưu ngay, xếp hàng tuần tự; b) chỉ blur | a |
| Giá trị không hợp lệ | a) không gửi, lỗi dưới ô, đóng thì bỏ giá trị lỗi; b) không cho đóng | a |
| Trạng thái lưu | a) chỉ báo header + dòng trạng thái trong form; b) chỉ header | **Khác:** chỉ báo khi lưu lỗi |
| Chân form | a) chỉ nút "Xong"; b) không có nút | b |

## Claude's Discretion
Hình dạng type/port/adapter điểm đến, vị trí lưu 34 ảnh, component mới của `ui-web`, số mục nhóm "Phổ biến", giá trị debounce, có giữ bản nháp D-36 cho form metadata hay không, tên file tài liệu BE, mã lỗi BE chính xác.

## Deferred Ideas
Hiện/sửa điểm đến và sở thích; điểm đến trên thẻ; tải ảnh lên; global, nhiều điểm đến, chọn thẳng điểm du lịch; xếp hạng theo thống kê BE; dùng sở thích ở Discovery; PUB-02 và câu hỏi PUB-06.
