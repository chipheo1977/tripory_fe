---
phase: 05-map-public-view
plan: 11
subsystem: share-dialog
tags: [share, dialog, sheet, qr, clipboard, wave-3]
provides:
  - "`ShareDialog`, `ShareButton`, `ShareLinkField`, `ShareQrSection`"
  - "`ResponsiveFormSurface`: prop tùy chọn `description`"
  - "Invariant Phase 4 thu hẹp: chỉ còn cấm \"Tải thêm\", thêm khẳng định `share-button.tsx` tồn tại"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/share-link-field.tsx
    - apps/web/src/modules/itinerary/ui/share-qr-section.tsx
    - apps/web/src/modules/itinerary/ui/share-dialog.tsx
    - apps/web/src/modules/itinerary/ui/share-button.tsx
    - "(+ 3 file test)"
  modified:
    - apps/web/src/modules/itinerary/ui/responsive-form-surface.tsx
    - apps/web/src/modules/itinerary/ui/responsive-form-surface.test.tsx
    - apps/web/src/itinerary-invariants.test.ts
requirements-completed: [PUB-04]
completed: 2026-11-11
---
# Phase 5 Plan 11: Hộp chia sẻ và nút Chia sẻ Summary

**Bấm "Chia sẻ" luôn mở hộp (Dialog từ `md`, Sheet modal dưới `md`) có ô link, sao chép, Web Share điều kiện và mã QR; không toast trong hộp.**

## Accomplishments
- `ShareLinkField`: nhãn "Link lịch trình" gắn ô chỉ đọc (chọn hết chữ khi focus), nhãn nút "Đã sao chép link" 2000ms + dòng `aria-live="polite"` luôn có trong DOM, clipboard lỗi thì focus + chọn sẵn chữ và báo chép tay; "Chia sẻ qua ứng dụng" dùng prop `visible` theo `navigator.share`, `AbortError` im lặng. Hàm thuần `feedbackOf` được export để test.
- `ShareQrSection`: QR, câu hướng dẫn, "Tải ảnh QR" (lỗi báo ở dòng riêng). `ShareDialog`: mô tả gắn `aria-describedby`, focus đầu ở "Sao chép link", link "Mở trang công khai" chỉ khi `showPublicLink`; `ShareBody` trả `null` khi chưa có origin.
- `ShareButton`: một cây duy nhất (không remount khi đổi breakpoint), `aria-label` "Chia sẻ lịch trình", không accent, `visible=false` không render.
- Test tích hợp: bấm nút mở hộp, Esc đóng và focus trở về nút (Base UI trả focus được trong jsdom, không cần `finalFocus`).
- 25 test mới ở dialog/button, 9 ở link field, 2x2 ở surface.

## Deviations
- Test `share-link-field` đặt lại `navigator.clipboard` sau `userEvent.setup()` vì user-event tự thay clipboard bằng bản giả của nó (ghi chú trong test).
- Không có thay đổi nào khác so với plan.

## Verification
Gate gốc: xem báo cáo wave 3. Hiển thị hộp trên điện thoại thật và Web Share thật chỉ người dùng kiểm được (UAT).
