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

**Notes:** Người dùng chọn infinite scroll thay "Tải thêm". Bản CONTEXT đầu tiên Claude tự thêm nút "Tải thêm" dự phòng; người dùng xác nhận lại là **không có nút tải thêm**, đã gỡ khỏi D-02. Chỉ giữ lỗi inline có "Thử lại" khi tải trang kế thất bại, theo FND-04.

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
