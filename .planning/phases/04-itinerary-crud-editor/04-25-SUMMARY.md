---
phase: 04-itinerary-crud-editor
plan: 25
subsystem: be-checkpoint
tags: [checkpoint, human-action, be-contract, itin-02, itin-03, wave-14]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-24: `04-BE-CONTRACT.md` (12 thay đổi C1..C12, mục 13 nghiệm thu thủ công)"
provides:
  - "Checkpoint 04-25 được qua bằng quyết định của người dùng (resume-signal `BE xong`), KHÔNG phải bằng việc đạt đủ acceptance criteria của plan"
  - "BE đã commit ở `tripory_be`, commit `bca0577`, nhánh `be/phase_4`: C1..C12 ghi Xong (code có và build được)"
  - "`04-BE-REVIEW.md`: review BE hai lượt (C1..C12 đối chiếu hợp đồng)"
  - "`04-BE-CONTRACT.md` mục 2 và mục 13 cập nhật trạng thái thật (1/12 mục tích, ghi chú lý do từng mục chưa tích)"
affects: [04-26, 04-27, 04-28, 04-29, 04-30, 04-31, 04-32, 04-33, 04-34, 04-35, 04-36, 04-37, 04-38, 04-39, 04-40, 04-41]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/04-itinerary-crud-editor/04-25-SUMMARY.md
    - .planning/phases/04-itinerary-crud-editor/04-BE-REVIEW.md
  modified:
    - .planning/phases/04-itinerary-crud-editor/04-BE-CONTRACT.md
key-decisions:
  - "Checkpoint qua bằng quyết định của người dùng: người dùng chủ động chấp nhận hoãn các mục nghiệm thu chưa làm và gõ đúng `BE xong`."
  - "Không tự tích thêm mục nào ở mục 13 và không thêm dòng `Đã deploy BE ngày`, vì BE chưa deploy."
  - "`04-BE-CONTRACT.md` vẫn là nguồn sự thật cho FE 04-26..04-41; các khác biệt BE so với plan FE ghi ở mục Deviations bên dưới."
requirements-completed: []
duration: n/a (checkpoint do người dùng thực hiện)
completed: 2026-11-04
---

# Phase 4 Plan 25: Checkpoint BE Summary

**Checkpoint 04-25 qua bằng quyết định của người dùng (`BE xong`) khi BE đã commit (`bca0577`, `be/phase_4`) và chạy được trên DB dev, nhưng hai tiêu chí nghiệm thu của plan (12 mục tích, dòng `Đã deploy BE ngày`) KHÔNG đạt.**

## Cách checkpoint được qua

Plan này là `checkpoint:human-action` (`autonomous: false`). Người dùng gõ đúng resume-signal `BE xong`. Việc qua cổng là quyết định của người dùng, không phải kết quả đạt acceptance criteria. Agent không sửa `tripory_be`, không tự tích checklist và không thêm dòng ngày deploy.

## Acceptance criteria: không đạt

| Tiêu chí của plan | Kết quả | Lý do |
|-------------------|---------|-------|
| Mục 13 có đúng 12 dòng `- [x]` và 0 dòng `- [ ]` | **KHÔNG đạt**: 1 tích, 11 chưa tích (đo bằng lệnh đếm trong ĐÚNG mục 13 ngày 2026-11-04) | Người dùng chủ động chấp nhận hoãn các mục bên dưới. Chỉ mục 12 được tích. |
| File chứa dòng `Đã deploy BE ngày` | **KHÔNG đạt**: không có dòng nào | BE chưa deploy. Thêm dòng này là sai sự thật. |
| Không có mojibake (`Select-String -CaseSensitive`) | Đạt: 0 kết quả | |
| Không có `Bearer ey` | Đạt: 0 kết quả | |

**Tình trạng 12 mục của mục 13** (nguồn: ghi chú trạng thái trong `04-BE-CONTRACT.md`):

- Mục 12 (xóa lịch trình thử, không để token trong file): ĐÃ tích. Lý do: chưa tạo lịch trình thử nào trong `tripory_db` (vẫn 16 dòng) và khóa JWT, mật khẩu không còn trong file cấu hình đã commit (đặt bằng user-secrets). Phải kiểm lại sau khi mục 6 đến 11 chạy.
- Mục 1, 2 (đối chiếu Nghị quyết 202/2025/QH15, duyệt slug, mã sở thích, alias, hạng): việc duyệt của người dùng, chưa tích.
- Mục 3 (sao lưu, chạy migration, kiểm sau khi chạy): mới làm trên DB dev `tripory_db`, chưa làm trên DB thật, chưa tích.
- Mục 4 (đặt `DestinationCatalog:CoverImageBaseUrl` ở mọi môi trường): có trong cấu hình và BE khởi động được ở Development; chưa đặt ở các môi trường khác, chưa tích.
- Mục 5 (deploy BE): chưa làm, chưa tích.
- Mục 6 đến 11 (gọi `POST`/`PUT` thật): người dùng quyết định hoãn đến khi ghép với FE rồi test cùng lúc. Chưa tích.

Hệ quả: các plan FE 04-26..04-41 chạy trên hợp đồng đã viết và BE đã commit nhưng CHƯA được kiểm bằng request thật. Mục 6 đến 11 phải được chạy khi ghép FE với BE (UAT cuối của phần mở lại).

## Accomplishments

- BE đã commit ở `tripory_be`: commit `bca0577`, nhánh `be/phase_4`. C1..C12 đều ghi **Xong** (code có và solution build được; chưa tính nghiệm thu mục 13).
- Hai migration đã áp dụng lên DB dev `tripory_db` (sao lưu trước; kiểm sau khi chạy đạt; dữ liệu thử không có dòng nào có ảnh bìa nên phần chuyển ảnh chưa được thử trên dữ liệu thật):
  - `20261103085252_Add_Itinerary_Destination_Interests_CoverImages`
  - `20261104034058_Clean_Itinerary_Cover_Images`
- Review BE ở `04-BE-REVIEW.md` (hai lượt, 28 file BE). Review không chạy `POST`/`PUT` thật vào API với PostgreSQL; kết quả có từ harness ngoài repo.
- `04-BE-CONTRACT.md` mục 2 và mục 13 phản ánh đúng trạng thái trên.

## Task Commits

1. **Task 1: checkpoint (human-action)** - qua bằng `BE xong` của người dùng. Commit tài liệu của plan này: xem dòng cuối của mục "Self-Check".

**Plan metadata:** cùng commit nêu trên (BE-CONTRACT, BE-REVIEW, SUMMARY).

## Files Created/Modified

- `.planning/phases/04-itinerary-crud-editor/04-25-SUMMARY.md` - tài liệu này
- `.planning/phases/04-itinerary-crud-editor/04-BE-REVIEW.md` - báo cáo review BE
- `.planning/phases/04-itinerary-crud-editor/04-BE-CONTRACT.md` - trạng thái làm BE (mục 2) và ghi chú nghiệm thu (mục 13)

## Deviations from Plan

Mục này ghi các khác biệt giữa BE đã commit và những gì các plan FE 04-26..04-41 giả định. **`04-BE-CONTRACT.md` là nguồn sự thật**; plan FE nào lệch với danh sách dưới đây phải theo hợp đồng.

1. **`PUT /itineraries/{id}` KHÔNG còn nhận `coverImageUrl`.** Không còn nhánh dự phòng cho FE cũ. FE luôn gửi `coverImages` + `selectedCoverIndex`:
   - `coverImages` null hoặc thiếu: giữ ảnh bìa hiện có.
   - `coverImages: []`: xóa hết ảnh; khi đó `selectedCoverIndex` phải là `null`.
   - `destinationCode` null hoặc thiếu: giữ nguyên. `interests` null hoặc thiếu: giữ nguyên.
2. **`title` thiếu hoặc `null` trả `ItineraryTitle.Empty`** (`Title` là `string?` ở request và command), không trả ProblemDetails.
3. **Thêm mã lỗi `Itinerary.InvalidId`** (id rỗng ở `PUT`), ngoài 14 mã của mục 9. FE chưa cần ánh xạ riêng.
4. **BE giới hạn thân request `POST`/`PUT` ở 32 KB**; vượt thì trả 413.
5. **Kiểm URL ảnh của BE:** `https`, có host, không khoảng trắng và không ký tự điều khiển, tối đa 500 ký tự, tối đa 5 ảnh, không trùng (phân biệt hoa thường, so sau khi `trim`).
6. **`ItineraryDetailDto`** có `coverImages` (không bao giờ `null`), `selectedCoverIndex` (`int` hoặc `null`), `destinationCode` (chuỗi, hoặc `null` với lịch trình cũ) và `interests` (mảng).
7. **`ItinerarySummaryDto` KHÔNG có `interests`** (có `coverImages`, `selectedCoverIndex`, `destinationCode`).
8. **`GET /itineraries/mine` vẫn trả `daysCount = 0`.** Đây là nợ cũ, ngoài phạm vi (xem `04-BE-DEPENDENCIES.md` mục 1); FE ẩn chỉ số này khi bằng 0 như đã thiết kế.

## Known Stubs

None.

## Threat Flags

None. T-04-77 (token trong tài liệu): không có `Bearer ey` trong `04-BE-CONTRACT.md`. T-04-78 (dữ liệu thử lẫn dữ liệu thật): chưa tạo lịch trình thử nào. T-04-79 (migration mất dữ liệu): đã sao lưu `tripory_db` trước khi chạy hai migration trên DB dev; DB thật chưa chạm tới. T-04-80 (FE chạy khi BE chưa đúng hợp đồng): cổng `BE xong` được người dùng qua bằng quyết định có ghi nhận ở trên, kèm rủi ro mục 6 đến 11 chưa kiểm bằng request thật.

## Ghi chú trạng thái yêu cầu

ITIN-02 và ITIN-03 KHÔNG được đánh dấu hoàn tất: plan này chỉ là checkpoint BE; hai yêu cầu hoàn tất khi các plan FE 04-26..04-41 xong.

## Self-Check: PARTIAL

- PASS: không mojibake, không `Bearer ey`, đúng 3 file tài liệu của plan này.
- FAIL (chấp nhận bởi người dùng): 12 mục tích (thực tế 1/12); dòng `Đã deploy BE ngày` (không có, BE chưa deploy).
- Không `git push`; không sửa hay commit `tripory_be`; không đụng `.agents/tasks/`.
