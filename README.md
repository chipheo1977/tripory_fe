# tripory-fe

Frontend monorepo của Tripory (pnpm workspaces + Turborepo). Backend: `tripory_be` (repo riêng).

## Cấu trúc

```text
apps/
└── web/              # Next.js 16: traveler + trang công khai
packages/
├── config/           # ESLint preset (ranh giới kiến trúc), tsconfig, Vitest preset + self-test
├── shared-kernel/    # value object dùng chung (khung rỗng)
├── api-client/       # HTTP client dùng chung (khung rỗng)
└── itinerary/        # bounded context đầu tiên (khung rỗng)
```

Kiến trúc chi tiết: [ai-memories/tripory-fe--ddd-architecture.md](ai-memories/tripory-fe--ddd-architecture.md).

## Chạy local

Yêu cầu: Node.js 24, pnpm 11 (`corepack enable` sẽ dùng đúng version trong `packageManager`).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Lệnh | Việc |
|---|---|
| `pnpm build` | Build mọi app |
| `pnpm lint` | ESLint mọi app/package |
| `pnpm typecheck` | `tsc --noEmit` mọi package (web chạy thêm `next typegen`) |
| `pnpm test` | Vitest mọi package, gồm self-test của luật kiến trúc |
| `pnpm --filter @tripory/web <script>` | Chạy script của riêng một app |
