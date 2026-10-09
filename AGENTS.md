# tripory-fe (monorepo)

- Kiến trúc và luật đặt code: `ai-memories/tripory-fe--ddd-architecture.md`. Đọc trước khi thêm code.
- App Next.js nằm ở `apps/web`. Trước khi viết code Next, đọc docs đúng phiên bản trong `apps/web/node_modules/next/dist/docs/` (xem `apps/web/AGENTS.md`, file do `next dev` quản lý).
- Package manager: pnpm workspace, version dùng chung khai báo bằng `catalog:` trong `pnpm-workspace.yaml`. Task runner: Turborepo (`turbo.json`).
- Chạy từ gốc repo: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. Chạy `lint`, `typecheck`, `test` trước khi báo xong.
- Ranh giới giữa các tầng/package được ESLint cưỡng chế (`packages/config/eslint/boundaries.mjs`) và có self-test. Import bị chặn nghĩa là đặt sai tầng: đọc thông báo lỗi và mục 5 của tài liệu kiến trúc trước khi nghĩ đến việc sửa rule hay thêm vào allowlist.
