# Deferred Items - Phase 04

## Từ plan 04-01

- `packages/ui-web/src/token-guard.test.ts` > "không có Storybook hoặc route showcase" timeout 5000ms không ổn định (có sẵn từ trước, không do `58b9ee8`). Nguyên nhân đo được: `productionFiles(apps)` đệ quy vào `apps/web/node_modules` (~54.000 mục, 2-7,5s) và bị ảnh hưởng bởi tải máy khi turbo chạy song song.
  - Đề xuất (chưa làm, ngoài phạm vi 04-01): loại `node_modules` và `.next` khỏi `productionFiles`, hoặc chỉ quét `apps/web/src`; phương án phụ là tăng timeout của test đó.
