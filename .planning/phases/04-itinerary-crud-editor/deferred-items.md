# Deferred Items - Phase 04

## Từ plan 04-01

- [ĐÃ SỬA - `919ab37`] `packages/ui-web/src/token-guard.test.ts` > "không có Storybook hoặc route showcase" timeout 5000ms không ổn định (có sẵn từ trước, không do `58b9ee8`). Nguyên nhân đo được: `productionFiles(apps)` đệ quy vào `apps/web/node_modules` (~54.000 mục, 2-7,5s) và bị ảnh hưởng bởi tải máy khi turbo chạy song song.
  - Cách sửa: `productionFiles` tự đệ quy và bỏ qua `node_modules`, `.next`, `.turbo` ngay ở cấp thư mục (`IGNORED_DIRS`); không tăng timeout, không đổi assertion.
  - Đo: trước 1937ms (chạy riêng) → sau 2ms (2 lần chạy). `pnpm test` ở gốc: ui-web 181/181, không còn timeout.
  - Kiểm tra vẫn bắt lỗi: tạo tạm `apps/web/src/app/dev/ui/page.tsx` và `apps/web/src/app/x-bite.stories.tsx` thì test fail đúng, xóa đi thì pass.
  - `packages/design-tokens/src/tokens.test.ts` không cần sửa: mọi `sourceRoots` đều nằm trong `src`, không chạm `node_modules`/`.next`/`.turbo`.
