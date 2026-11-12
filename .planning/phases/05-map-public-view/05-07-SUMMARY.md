---
phase: 05-map-public-view
plan: 07
subsystem: og-metadata
tags: [open-graph, noindex, metadata, image-response, wave-3]
provides:
  - "`buildPublicMetadata`, `neutralPublicMetadata`, `ogDescription`, `chooseOgImage` (hàm thuần)"
  - "Route `/og-default.png` (`ImageResponse` 1200x630, tiền kết xuất tĩnh)"
  - "`DESTINATION_IMAGE_BASE_URL` được export"
key-files:
  created:
    - apps/web/src/composition/server/public-metadata.ts
    - apps/web/src/composition/server/public-metadata.test.ts
    - apps/web/src/app/og-default.png/route.tsx
    - apps/web/src/app/og-default.png/route.test.ts
  modified:
    - apps/web/src/composition/destination-catalog.ts
requirements-completed: [PUB-05]
completed: 2026-11-11
---
# Phase 5 Plan 07: Metadata OG + noindex và ảnh OG mặc định Summary

**Chỉ nhánh `ok` có thẻ OG; mọi nhánh khác trung tính; `noindex, nofollow` ở tất cả; ảnh mặc định phục vụ tĩnh ở `/og-default.png`.**

## Accomplishments
- `ogDescription`: chuẩn hóa khoảng trắng, cắt 160 ký tự tại ranh giới từ (trong 20 ký tự cuối) kèm "…"; trống thì "Lịch trình N ngày · X điểm trên Tripory".
- `chooseOgImage`: chỉ nhận `https://` và không bắt đầu bằng `https://triporyv1.vercel.app/destinations/` (có tiền tố kết thúc `/`, nên host na ná như `triporyv1.vercel.app.evil.test` không bị nhận nhầm là ảnh giữ chỗ).
- Test khẳng định `JSON.stringify(metadata)` của 403/404/hồi phục/lỗi không chứa tiêu đề nháp và không có khóa `openGraph`/`twitter`/`description`.
- Không đặt file `opengraph-image` trong segment trang (sẽ ghi đè `generateMetadata`).
- **Phương án ảnh:** route `ImageResponse` chạy được dưới `cacheComponents` (không cần PNG tĩnh dự phòng). `next build` (với `API_ORIGIN=http://localhost:5000`) ghi `○ /og-default.png` = tiền kết xuất tĩnh. Test đọc IHDR: 1200x630, dưới 500 KB. `proxy.ts` không gate đường dẫn này nên không cần sửa.

## Deviations
Không có. Giả định `ImageResponse` dưới `cacheComponents` (RESEARCH) đã được kiểm bằng build thật, không vỡ.

## Verification
Gate gốc: xem báo cáo wave 3. Ảnh OG thật hiển thị trong Zalo/Messenger chỉ người dùng kiểm được (UAT).
