---
phase: 04-itinerary-crud-editor
plan: 11
subsystem: itinerary-ui-forms
tags: [forms, zod, react-hook-form, dialog, create, delete, wave-6]

requires:
  - phase: 04-itinerary-crud-editor
    provides: "04-09: hook `itinerary.useCreateItinerary` / `useDeleteItinerary` và composition `itinerary.client`; 04-05: `mapFormError`, `SubmitStatus`, helper test; 04-04: InlineAlert, Dialog dùng lại; 04-10: lỗi BE đã có trong ERROR_MESSAGES"
provides:
  - "`form-schemas.ts`: `createItinerarySchema`, `metadataSchema`, `waypointSchema`, `validateSubtitle`, `toMetadataInput`, `isHttpsUrl`, hằng copy lỗi và danh sách tên ô"
  - "`form-error-mapping.ts`: `mapCreateItineraryError`, `mapMetadataError`, `mapWaypointError`, `mapPublishError`, `mapDeleteItineraryError`"
  - "`format.ts` (`formatKm`, `formatStartDate`), `entry-flag.ts` (cờ vào từ danh sách), `form-field-row.tsx` (vỏ một ô form)"
  - "`CreateItineraryDialog` và `DeleteItineraryDialog` (+ `DeleteTarget`)"
affects: [04-12, 04-13, 04-14, 04-15, 04-16, 04-17, 04-18, 04-19]

tech-stack:
  added: []
  patterns:
    - "schema đếm độ dài trên giá trị thô, mỗi ô phát một lỗi (như identity)"
    - "bảng mã BE → ô theo từng form, chuẩn hóa key ValidationProblemDetails (PascalCase → tên ô) trước khi tra"
    - "dialog khóa khi đang gửi bằng `handleOpenChange` bỏ qua yêu cầu đóng; dọn form ở `onOpenChangeComplete`"

key-files:
  created:
    - apps/web/src/modules/itinerary/ui/form-schemas.ts
    - apps/web/src/modules/itinerary/ui/form-schemas.test.ts
    - apps/web/src/modules/itinerary/ui/form-error-mapping.ts
    - apps/web/src/modules/itinerary/ui/form-error-mapping.test.ts
    - apps/web/src/modules/itinerary/ui/form-field-row.tsx
    - apps/web/src/modules/itinerary/ui/format.ts
    - apps/web/src/modules/itinerary/ui/format.test.ts
    - apps/web/src/modules/itinerary/ui/entry-flag.ts
    - apps/web/src/modules/itinerary/ui/create-itinerary-dialog.tsx
    - apps/web/src/modules/itinerary/ui/create-itinerary-dialog.test.tsx
    - apps/web/src/modules/itinerary/ui/delete-itinerary-dialog.tsx
    - apps/web/src/modules/itinerary/ui/delete-itinerary-dialog.test.tsx
  modified: []

key-decisions:
  - "Dialog tạo giữ khóa (readOnly, nút \"Đang tạo…\") cả sau khi tạo xong cho tới khi trang đổi, vì `router.push` trả về trước khi điều hướng xong và người dùng có thể bấm tạo lần hai."
  - "Dọn form của dialog tạo và alert của dialog xóa ở `onOpenChangeComplete(false)` thay vì effect: không chớp nội dung lúc đóng, không cần setState trong effect."
  - "`DeleteItineraryDialog` nhớ target gần nhất khác null (điều chỉnh state trong render) để tiêu đề không biến mất trong animation đóng."
  - "Publish và xóa không có ô: bảng đích chỉ chứa mã gắn alert, mọi mã khác cũng ra alert qua `mapFormError`."

patterns-established:
  - "`FormFieldRow` là vỏ ô dùng chung của module itinerary (nhãn, control, mô tả, lỗi), theo `AuthField` nhưng không phụ thuộc identity."
  - "`DeleteTarget` + `onDeleted(id)` để thẻ và editor tự quyết focus/điều hướng sau khi xóa."

requirements-completed: []

duration: ~20 phút
completed: 2026-10-28
---

# Phase 4 Plan 11: Nền form itinerary + dialog tạo/xóa Summary

**Schema Zod đếm độ dài thô cho mọi form itinerary, bảng map lỗi BE → ô, format km/ngày, cờ vào từ danh sách, và hai dialog: tạo nhanh (tiêu đề điền sẵn bôi đen, Enter gửi, chuyển thẳng tới editor không toast) và xóa có xác nhận (focus đầu ở "Hủy", thêm câu link chia sẻ khi đã xuất bản)**

> `requirements-completed` để trống, cùng cách làm với 04-02..04-09: ITIN-* là hành vi người dùng, chỉ hoàn tất khi dialog được gắn vào trang danh sách và editor ở các plan UI sau.

## Commits

1. **Task 04-11-01 (RED)** — `c67a391` `test(04-11): add failing tests for itinerary form schemas, error mapping and format`
2. **Task 04-11-01 (GREEN)** — `3f6e539` `feat(04-11): nen form itinerary (schema Zod, map loi BE, format km/ngay, co vao tu danh sach)`
3. **Task 04-11-02 (RED)** — `8f2230a` `test(04-11): add failing tests for CreateItineraryDialog`
4. **Task 04-11-02 (GREEN)** — `c48c2cf` `feat(04-11): CreateItineraryDialog tao nhanh lich trinh`
5. **Task 04-11-03 (RED)** — `85753b1` `test(04-11): add failing tests for DeleteItineraryDialog`
6. **Task 04-11-03 (GREEN)** — `614ba52` `feat(04-11): DeleteItineraryDialog xac nhan xoa lich trinh`

## Accomplishments

- **Task 1:** `form-schemas.ts` giữ nguyên văn 12 câu lỗi của UI-SPEC; tiêu đề 1–100, mô tả ≤ 1000, ngày qua `parseCalendarDate`, ảnh bìa chỉ `https://` rồi ≤ 500, tên 1–200, vị trí không rỗng, địa chỉ ≤ 500, ghi chú ≤ 2000, phụ đề ≤ 100. Tất cả đếm trên chuỗi thô (99 ký tự + 2 khoảng trắng = 101 → lỗi). `toMetadataInput` trim, rỗng thành `null`, ngày thành `CalendarDate`. `form-error-mapping.ts` có 5 hàm map; `format.ts` có `formatKm` (12,4 km; 1.234,6 km; 0/null ẩn) và `formatStartDate`; `entry-flag.ts` là biến module (D-47); `form-field-row.tsx` là vỏ ô.
- **Task 2:** `CreateItineraryDialog`: mở với "Chuyến đi mới" được chọn toàn bộ (0..13) và focus; Enter gửi giá trị đã trim; rỗng/quá dài chặn ở client; đang gửi thì "Đang tạo…", `aria-busy`, ô `readOnly`, "Hủy" disabled, Esc/scrim không đóng, sau 5 giây có dòng cold start; thành công gọi `markEnteredFromList` + `router.push(/itineraries/{id}/edit)`, không toast; `ItineraryTitle.Empty` gắn dưới ô, lỗi 500 hiện InlineAlert và gửi lại được.
- **Task 3:** `DeleteItineraryDialog`: tiêu đề `Xóa lịch trình "{tên}"?` (`break-words`), mô tả "Thao tác này không hoàn tác được." (+ " Link chia sẻ sẽ không còn mở được." khi `isPublic`), focus đầu ở "Hủy", nút "Xóa" `danger`/"Đang xóa…", khóa đóng khi đang xóa, thành công gọi `onDeleted(id)` rồi đóng và toast "Đã xóa lịch trình" (qua `meta.feedback.successMessage`, đúng một lần), lỗi hiện InlineAlert trong dialog không toast.
- **Mitigation threat model:** T-04-30 (`javascript:`, `http:`, `ftp:`, `https://a b` đều bị `isHttpsUrl` chặn, có test), T-04-31 (giới hạn 100/1000/500/200/500/2000 đếm thô), T-04-32 (dialog xác nhận, focus mặc định "Hủy", nút danger), T-04-29 (không có `dangerouslySetInnerHTML`; tên và message BE chỉ ra qua text node).

## Verification

- `pnpm --filter @tripory/web test -- form-schemas form-error-mapping format create-itinerary-dialog delete-itinerary-dialog`: xanh (9 test mỗi dialog; 110 test cho schema/map/format).
- `turbo.exe run lint typecheck test` toàn repo: 24/24 task thành công; `@tripory/web` 68 file, 1103 test xanh (trước plan: 1018).
- Acceptance: `Link ảnh phải bắt đầu bằng https://.` có trong `form-schemas.ts`; `git grep "modules/identity" -- apps/web/src/modules/itinerary` không có kết quả; `loadingLabel="Đang tạo…"` và `errorToast: false` có trong `create-itinerary-dialog.tsx`; `Link chia sẻ sẽ không còn mở được.` có trong `delete-itinerary-dialog.tsx`.
- Không đụng `boundaries.mjs`, allowlist hay phụ thuộc mới.

## Deviations from Plan

### Auto-added

**1. [Rule 2 - Missing critical functionality] Chuẩn hóa key ValidationProblemDetails trước khi map**
- **Found during:** Task 1
- **Issue:** Plan yêu cầu map field `Title`/`Name`/`Latitude`... (PascalCase) về ô, nhưng `resolveFormError` so key chính xác với tên ô (camelCase), nên key PascalCase của ASP.NET sẽ rơi vào alert thay vì gắn đúng ô. Ngoài ra `Latitude`/`Longitude` không có ô riêng (form chỉ có ô `location`).
- **Fix:** `normalizeFieldKeys` hạ chữ đầu của key (và gom `latitude`/`longitude` về `location` cho form waypoint) trước khi gọi `mapFormError`. Có test cho cả PascalCase lẫn camelCase.
- **Files modified:** `form-error-mapping.ts`, `form-error-mapping.test.ts`
- **Commits:** `c67a391`, `3f6e539`

### TDD gate của Task 2

Task 2 được viết cả code lẫn test trước khi commit. Để giữ đúng thứ tự RED → GREEN, tạm chuyển `create-itinerary-dialog.tsx` ra ngoài, chạy test (fail: "Failed to resolve import ./create-itinerary-dialog"), commit test `8f2230a`, trả file về rồi commit `c48c2cf`. Task 1 và 3 viết test trước, chạy RED thật rồi mới viết code.

Ngoài hai mục trên: None - plan thực hiện đúng như viết. `WaypointValues` và `MetadataValues` suy ra bằng `z.infer` (cùng hình dạng với contract trong plan).

Ghi chú môi trường: `pnpm lint|typecheck|test` ở gốc vẫn crash `3221226505`; dùng `turbo.exe` trực tiếp và `pnpm --filter`.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check

**Trạng thái: PASSED.**

- 12 file nguồn và test liệt kê trong `key-files.created` đều tồn tại.
- Sáu commit `c67a391`, `3f6e539`, `8f2230a`, `c48c2cf`, `85753b1`, `614ba52` có trong `git log` của `phase_4`.
