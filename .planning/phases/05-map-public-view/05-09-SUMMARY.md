---
phase: 05-map-public-view
plan: 09
subsystem: share-engine
tags: [qr, uqr, clipboard, web-share, canvas, wave-2]
provides:
  - "`qrMatrix`, `qrFileName`, `paintQr` (hàm thuần), `QrCode` (svg JSX), `useQrDownload`"
  - "`useShareUrl`, `useCopyLink`, `useNativeShare`"
key-files:
  created:
    - apps/web/src/modules/itinerary/ui/qr-matrix.ts
    - apps/web/src/modules/itinerary/ui/qr-file-name.ts
    - apps/web/src/modules/itinerary/ui/qr-canvas.ts
    - apps/web/src/modules/itinerary/ui/qr-code.tsx
    - apps/web/src/modules/itinerary/ui/use-qr-download.ts
    - apps/web/src/modules/itinerary/ui/use-share-url.ts
    - apps/web/src/modules/itinerary/ui/use-copy-link.ts
    - apps/web/src/modules/itinerary/ui/use-native-share.ts
    - "(+ 6 file test tương ứng)"
requirements-completed: [PUB-04]
completed: 2026-11-11
---
# Phase 5 Plan 09: Động cơ chia sẻ (QR, sao chép, Web Share) Summary

**QR sinh tại client bằng `uqr`, vẽ bằng JSX; tải PNG 512×512; ba hook bọc API trình duyệt, không có chuỗi hiển thị.**

## Accomplishments
- `qrMatrix` dùng `encode(text, { ecc: "M", border: 2 })`; kích thước ma trận đã gồm viền (test khóa viền 2 module sáng ở 4 cạnh).
- `QrCode` chỉ có `rect` nền + `path` module (gộp module liền nhau theo hàng), `role="img"`, `aria-label` "Mã QR của link lịch trình", `size-(--share-qr-size)`, fill bằng token `fill-surface`/`fill-text`.
- `useQrDownload`: canvas 512×512, `#000000` trên `#FFFFFF`, mọi nhánh lỗi (không có context, `toBlob` null, ném) trả `"failed"`; `revokeObjectURL` trong `finally`; anchor gắn vào `document.body` rồi gỡ (Safari).
- `qrFileName`: slug `[a-z0-9-]` tối đa 60 ký tự, rỗng thì dùng id.
- `useCopyLink` (2000ms, đặt lại đồng hồ khi sao chép lại, `failed` giữ nguyên), `useNativeShare` (`AbortError` thành `cancelled`), `useShareUrl` (origin trình duyệt, không `?view`).
- 44 test mới.

## Deviations
Không có.
