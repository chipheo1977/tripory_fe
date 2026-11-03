---
phase: 04-itinerary-crud-editor
plan: 24
subsystem: docs
tags: [be-contract, documentation, itin-02, itin-03, destinations, cover-images, wave-13]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-23: UAT gốc 23/23 PASS (D-108); 04-RESEARCH.md R1 (34 đơn vị, alias, hạng), R5 (hợp đồng BE)"
provides:
  - "`04-BE-CONTRACT.md`: 14 mục + 3 phụ lục; 12 thay đổi C1..C12 mỗi thay đổi đủ What/Why/Who/When/Where/How; 34 slug `vn-*`, 7 mã sở thích, 14 mã lỗi, bảng `PUT` thiếu/null/có giá trị, DTO mới, cấu hình `DestinationCatalog:CoverImageBaseUrl`, migration bằng lời"
  - "Mục 13 'Điều kiện nghiệm thu thủ công' (12 dòng `- [ ]`) cho checkpoint 04-25"
  - "`04-BE-DEPENDENCIES.md`: mục #12..#15 và dẫn chiếu `04-BE-CONTRACT.md`; #2 và #5 ghi nhận trường mới; ảnh thật ở Deferred (D-105, D-106)"
affects: [04-25]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/04-itinerary-crud-editor/04-BE-CONTRACT.md
  modified:
    - .planning/phases/04-itinerary-crud-editor/04-BE-DEPENDENCIES.md
key-decisions:
  - "Tài liệu không có code C#/SQL và không có ca kiểm thử (D-52, D-57); chỉ JSON ví dụ cho request/response."
  - "Mọi `file:dòng` của BE đã đọc lại trên nhánh `feat/be-fe-integration-group-a` (chỉ đọc, không sửa `tripory_be`) và khớp R5.1."
  - "Ảnh mặc định dùng đuôi `.jpg` (Open Graph Phase 5); `.webp` trong D-106 chỉ là minh họa."
  - "`PUT` có gửi `destinationCode`/`interests` thì validate rồi ghi (R5.2); `interests: []` xóa hết sở thích; FE phase này không gửi hai trường đó (D-77)."
requirements-completed: []
duration: ~15 phút
completed: 2026-11-03
---

# Phase 4 Plan 24: Tài liệu hợp đồng BE Summary

**`04-BE-CONTRACT.md` đặc tả đủ 12 thay đổi BE (danh mục 34 điểm đến và 7 sở thích, POST mở rộng tạo Ngày 1..N, danh sách tối đa 5 ảnh bìa, PUT giữ nguyên trường thiếu, DTO, 14 mã lỗi, migration, cấu hình) để user tự sửa `tripory_be`, kèm checklist nghiệm thu thủ công cho checkpoint 04-25**

## Performance

- **Duration:** ~15 phút
- **Completed:** 2026-11-03
- **Tasks:** 3
- **Files modified:** 2 (1 tạo mới, 1 sửa)

## Accomplishments

- `04-BE-CONTRACT.md` (14 mục, 3 phụ lục): mục 1 phạm vi và hiện trạng BE, mục 2 bảng C1..C12 cùng thứ tự làm đề xuất, mục 3 đúng 12 khối 5W1H (72 dòng), mục 4 bảng 34 slug (6 thành phố + 28 tỉnh), mục 5 bảy mã sở thích, mục 6 `POST`, mục 7 `PUT`, mục 8 hai DTO, mục 9 14 mã lỗi, mục 10 migration 6 bước, mục 11 cấu hình, mục 12 sửa `API_ENDPOINTS.md`, mục 13 nghiệm thu thủ công, mục 14 quyết định đã chốt và câu hỏi còn lại; Phụ lục A alias (67 dòng duyệt được), B hạng phổ biến và thứ tự "Tất cả", C Deferred (ảnh thật, D-105).
- Các quyết định khóa được phản ánh: D-102 (`destinationCode` bắt buộc khi tạo mới, `null` với dữ liệu cũ, `PUT` không bắt buộc), D-103 (`dayCount` thiếu = 1), D-104 (URL cũ không `https://` bị bỏ khi migration), D-106 (URL cố định theo slug, 404 chấp nhận), D-54 (PUT giữ nguyên trường thiếu), D-99 (giữ `coverImageUrl` là ảnh đang hiển thị).
- `04-BE-DEPENDENCIES.md`: thêm mục "Hợp đồng mở lại 2026-10-30" với #12..#15 (#15 là Deferred), ghi chú ở #2 và #5, bullet trong "Ghi chú chuyển sang DEPL-02".

## Task Commits

1. **Task 04-24-01: mục 1-5** - `a832e7d` (docs)
2. **Task 04-24-02: mục 6-14 và phụ lục** - `3e90807` (docs)
3. **Task 04-24-03: BE-DEPENDENCIES** - `0717bf2` (docs)

**Plan metadata:** commit `docs(04-24): complete ...` (SUMMARY, STATE, ROADMAP).

## Files Created/Modified

- `.planning/phases/04-itinerary-crud-editor/04-BE-CONTRACT.md` - hợp đồng BE (tiếng Việt), không code C#/SQL
- `.planning/phases/04-itinerary-crud-editor/04-BE-DEPENDENCIES.md` - mục #12..#15 và dẫn chiếu

## Verification

- 12 tiêu đề `### C1..C12`; 72 dòng `- **What|Why|Who|When|Where|How**`; 34 slug `vn-*` duy nhất; đủ 7 mã sở thích và 14 mã lỗi; 12 mục + 3 phụ lục (`## 6..14` và `Phụ lục A-C`) có mặt.
- Mục 13 có đúng 12 dòng `- [ ]` (đếm riêng trong khoảng `## 13.`..`## 14.`), tiêu đề chứa "Điều kiện nghiệm thu thủ công" và "không phải ca kiểm thử", có câu trích D-57.
- Không có khối `csharp`/`sql`, `[Fact]`, `Assert.`; không có `U+FFFD`/mojibake/`?` thay chữ có dấu; không có chuỗi `Bearer ey`.
- `04-BE-DEPENDENCIES.md`: 9 lần nhắc `04-BE-CONTRACT`, các dòng `| 1 |`..`| 15 |` đủ (15 dòng), có `Deferred` và `D-105`.
- Frontmatter của `04-24-PLAN.md` parse bằng js-yaml: `must_haves.artifacts` là mảng 2 đối tượng có `path`.
- Chỉ đọc `tripory_be` (nhánh `feat/be-fe-integration-group-a`); không sửa repo đó; không đụng code FE; không `git push`.

## Deviations from Plan

None - plan executed exactly as written. Hai bổ sung nhỏ cùng phạm vi tài liệu (không đổi hợp đồng đã khóa): thêm "Thứ tự làm đề xuất" 9 bước ở mục 2 và ví dụ response `POST` đầy đủ ở mục 6, theo yêu cầu "tự đủ cho người sửa BE".

Ghi chú trạng thái: ITIN-02 và ITIN-03 (frontmatter của plan) KHÔNG được đánh dấu hoàn tất trong `REQUIREMENTS.md`, vì plan này chỉ giao tài liệu hợp đồng; hai yêu cầu hoàn tất khi các plan FE 04-26..04-41 xong. `gsd-tools state advance-plan` tự đổi `status` và `Resume file` của STATE.md; đã sửa tay lại cho đúng (next = checkpoint 04-25).

## Known Stubs

None. (Phụ lục A, B, C là nội dung duyệt/hoãn có chủ đích, không phải stub.)

## Threat Flags

None. T-04-71..T-04-76 đều có biện pháp trong tài liệu: https-only và `CoverImageInvalidUrl` (T-04-71, mục 7), allowlist slug và mã sở thích (T-04-72, C1/C2), giới hạn 30 ngày / 7 sở thích / 5 ảnh / 500 ký tự (T-04-73, mục 6-7), thông điệp lỗi không lộ chi tiết nội bộ (T-04-74, mục 9 quy tắc 3), sao lưu và đếm trước khi migration (T-04-75, mục 10), ghi chồng hai tab chấp nhận (T-04-76, mục 7).

## Self-Check: PASSED

- FOUND: 04-BE-CONTRACT.md, 04-BE-DEPENDENCIES.md
- FOUND commits: a832e7d, 3e90807, 0717bf2
