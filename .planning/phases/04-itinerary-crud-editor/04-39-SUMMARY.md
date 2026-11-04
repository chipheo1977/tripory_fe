---
phase: 04-itinerary-crud-editor
plan: 39
subsystem: docs-and-invariants
tags: [uat, docs, invariants, full-gate, wave-24]
requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-37 create dialog; 04-38 autosave trip info"
provides:
  - "04-UAT-CHECKLIST.md mục D (8 bước mở lại 2026-10-30), cột kết quả để trống cho 04-40"
  - "Ghi chú dòng lỗi thời trong 04-VALIDATION.md"
  - "04-BE-DEPENDENCIES.md mục 12-14 cập nhật theo trạng thái thật"
  - "PT-01_metadata.md (repo tripory) sửa theo luồng 4 khối, nhiều ảnh, tự lưu; không commit"
  - "4 bất biến tĩnh mới (it 8-11)"
affects: [04-40]
key-files:
  modified:
    - .planning/phases/04-itinerary-crud-editor/04-UAT-CHECKLIST.md
    - .planning/phases/04-itinerary-crud-editor/04-VALIDATION.md
    - .planning/phases/04-itinerary-crud-editor/04-BE-DEPENDENCIES.md
    - apps/web/src/itinerary-invariants.test.ts
requirements-completed: [ITIN-02, ITIN-03]
completed: 2026-11-04
---

# Phase 4 Plan 39: Tài liệu, bất biến và full gate Summary

**UAT mục D sẵn sàng cho 04-40, PT-01 sửa ở repo `tripory` mà không commit, bất biến tĩnh khóa thêm 4 quyết định, lint/typecheck/test/build xanh.**

## Commits

- `c3688fd` docs: UAT mục D + ghi chú VALIDATION.
- `e320a4d` docs: BE-DEPENDENCIES.
- `e8a5ce5` test: 4 bất biến mới.

## Kết quả

- UAT: đủ 8 dòng 2', 2a, 2b, 4a, 5a, 5b, 5c, 16a. 23 dòng PASS cũ còn nguyên (đếm lại = 23). Bước 2 và 5 được nối ghi chú "đã được thay bởi …". Dòng trạng thái đầu file và mục C có câu về phần mở lại. Kiểm danh mục nằm trong bước 2b.
- VALIDATION: chỉ thêm mục "Ghi chú mở lại 2026-10-30"; không tạo file VALIDATION mới.
- PT-01 (`tripory`): HEAD trước = sau = `aedc0798925d08f11f9158c34a2463e9d84da809`. `diff --cached --stat` rỗng. `status --short` theo pathspec: ` M docs/traveler/ITINERARY_01_MAP+TIMELINE/PT-01_metadata.md`. Không có mojibake. Trạng thái khác của repo đó trước khi sửa: `?? docs/common/` (không đụng).
- Bất biến 8-11 trong `itinerary-invariants.test.ts` (11 `it`): không kind `metadata` trong draft; `packages/itinerary/src` không dùng env/browser global; `updateMetadata` không có `destinationCode`/`interests`/`coverImageUrl` còn `create` có đủ 5 khóa; gốc URL ảnh là hằng https, `destinationCatalog` chỉ dùng ở 3 file UI cho phép.

## Full gate

- `turbo.exe run lint typecheck test --force`: exit 0, 24/24 task xanh.
- Test: shared-kernel 32, design-tokens 20, api-client 98, config 114, identity 244, itinerary 423, ui-web 334, web 110 file / 1724 test.
- `turbo.exe run build`: exit 0 (Next build của `@tripory/web` thành công).
- `git status --short -- packages/config`: rỗng (không đụng `boundaries.mjs`).

## Deviations

1. **BE-DEPENDENCIES #12-14**: plan yêu cầu ghi "Đã xong (BE deploy ngày …)". `04-BE-CONTRACT.md` mục 13 chỉ tick 1/12 và mục 14 không có ngày deploy; BE chưa deploy, migration mới chạy trên DB phát triển `tripory_db`, mục nghiệm thu 6-11 hoãn đến khi ghép FE. Đã ghi đúng thực tế: "Đã xong theo user ("BE xong", 04-25); BE CHƯA deploy …", kèm ghi chú lệch dưới bảng. Vì vậy acceptance grep `Đã xong \(BE deploy ngày` không khớp theo chủ ý.
2. **Mục D**: đoạn dẫn nói "chạy trên BE theo hợp đồng `04-BE-CONTRACT.md`" thay vì "BE đã deploy".
3. **Bất biến 11**: bỏ comment trước khi quét `NEXT_PUBLIC`/`process.env` vì comment của `destination-catalog.ts` nhắc tới `NEXT_PUBLIC_*`.

## Chưa kiểm với BE thật

Mọi bước mục D (tạo 4 khối, PUT 5 khóa, lưới ảnh, mã lỗi `Itinerary.*`) chưa chạy với BE thật: chưa kiểm với BE thật.
