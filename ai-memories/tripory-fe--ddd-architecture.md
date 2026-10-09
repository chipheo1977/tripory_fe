---
title: Kiến trúc DDD cho tripory-fe — monorepo Turborepo + bounded context package + Ports & Adapters
description: Monorepo pnpm + Turborepo (apps web/admin/mobile); mỗi bounded context là một package 4 tầng domain/application/infrastructure/react dùng chung cho mọi app; composition root nằm trong từng app; luật import cưỡng chế bằng exports + ESLint preset + Vitest node
projects: [tripory-fe]
type: architecture
created: 2026-10-08
tags: [ddd, clean-architecture, hexagonal, ports-and-adapters, monorepo, turborepo, pnpm, nextjs, expo, react-native, react-query, composition-root, use-case]
---

**Trạng thái (2026-10-08):** Đã dựng khung monorepo và lớp cưỡng chế (mục 8). `apps/web` (Next.js 16.4.0, React 19.3.0, Tailwind 4, code trong `src/`, alias `@/*` → `./src/*`), pnpm 11.6.0, turbo 2.11.7, version chung qua `catalog:`. Packages: `config` (preset + self-test), và ba khung rỗng `shared-kernel`, `api-client`, `itinerary` (mới có `export {}`). Chưa có code nghiệp vụ.

**Quyết định 2026-10-08:** monorepo **pnpm workspaces + Turborepo**. App: `web` (Next.js), `admin` (Next.js), `mobile` (Expo / React Native, làm sau).

Liên quan: mở rộng từ mô hình 3 vòng của [tc-ims-fe](./tc-ims-fe-core-architecture.md). `domain/` = core, UI trong app = React glue, `infrastructure/` = infrastructure, thêm tầng `application/` (use case), `react/` (hooks dùng chung) và `composition/` của app (composition root).

## 1. DDD ở frontend: áp dụng gì, bỏ gì

Backend là nguồn sự thật của invariant. Domain ở FE chỉ gồm luật phục vụ người dùng: quyền thao tác, giá trị dẫn xuất (số ngày, số waypoint mỗi ngày, tiến độ check-in), validate sớm, chuyển trạng thái.

Ví dụ quyền: `canEdit = itinerary.userId === viewerId`. BE không trả cờ quyền trong DTO, chỉ chặn bằng 403, nên FE tự suy ra để ẩn/hiện thao tác.

| Khái niệm | Áp dụng | Cách làm |
|---|---|---|
| Ubiquitous Language | Có | Tên file/type/hàm theo thuật ngữ nghiệp vụ, thống nhất với BE, ghi trong `docs/glossary.md` |
| Bounded Context | Có | 1 context = 1 package `packages/<context>` |
| Subdomain core/supporting/generic | Có | Quyết định mức đầu tư (mục 2) |
| Anti-Corruption Layer | Có | Mapper DTO → domain trong `src/infrastructure/` của package |
| Value Object, Entity, Domain Service | Có | `type` readonly + pure function, **không dùng class** |
| Repository | Có, dạng port | Interface ở `src/application/ports.ts`, cài đặt ở `src/infrastructure/` |
| Aggregate | Một phần | Ranh giới cache: 1 aggregate root = 1 nhóm query key; sửa entity con thì invalidate key của root |
| Domain Events | Tùy chọn | Thường chỉ cần invalidate query |
| Unit of Work, generic `Repository<T>` | Không | Vô nghĩa ở FE |

Không dùng class vì: props Server → Client Component phải serialize được (class instance không qua được); React/React Query dựa trên immutable + so sánh tham chiếu; function dễ tree-shake và test hơn. Ngoại lệ duy nhất: `DomainError extends Error`.

## 2. Subdomain

Đối chiếu ngày 2026-10-08 với `tripory_be` (`ARCHITECTURE.md`, `API_ENDPOINTS.md`, `Itinerary.cs`, `ItinerariesController.cs`, DTO của Itineraries) và đặc tả nghiệp vụ `tripory/docs` (BRD + các module). Ubiquitous language theo BE: `Itinerary`, `ItineraryDay`, `Waypoint`. Trạng thái chỉ có `IsPublic` (nháp / đã xuất bản). Không có khái niệm chi phí/budget.

| Context FE | Nguồn đặc tả | Loại | Trạng thái BE | Mức đầu tư FE |
|---|---|---|---|---|
| `itinerary` | ITINERARY_01 (map, timeline, reorder, quãng đường); ITINERARY_02 PT-01 public view, PT-02 fork, PT-04 check-in + review | Core | Lập lịch trình xong (11 endpoint, Phase 03). Fork, check-in chưa có | Đủ 4 tầng |
| `chat` | USER_CHAT_01 | Supporting | Xong (REST + SignalR, voice, call WebRTC) | Có domain + application thật: state machine cuộc gọi, optimistic message |
| `social` | ITINERARY_02 PT-03 (like, share, comment) | Supporting | Chưa có | Rút gọn |
| `discovery` | DISCOVERY_FEED_01 | Supporting | Chưa có | Rút gọn, read model |
| `profile` | USER_PROFILE_01, AUTH_AND_USER_01 PT-02 | Supporting | `GET /users/me`, `PUT /users/profile`, `GET /users` | Rút gọn |
| `identity` | AUTH_AND_USER_01 PT-01, PT-03 (auth gate, modal) | Generic | Xong (JWT access + refresh) | Adapter token + auth gate |
| `maps` | ITINERARY_01 PT-02 (waypoint search), PT-05 (vẽ tuyến) | Generic | Không qua BE, FE gọi thẳng Mapbox | Adapter Mapbox Geocoding, port `PlaceSearch`; UI bản đồ viết riêng mỗi nền tảng |
| `provider`, `affiliate`, `notification` | BRD Feature #4, Sprint 4.1, 5.1 | Chưa xếp | Chưa có module spec | Chưa tạo |

Ghi chú:
- Chat phức tạp nhưng là supporting: không phải lý do người dùng chọn Tripory. Độ phức tạp không làm một subdomain thành core.
- **Cần chốt với BE:** `ARCHITECTURE.md` của BE dự định đặt Fork chung Like/Comment trong `UseCases/V1/Social/`. FE đặt Fork trong `itinerary` vì kết quả fork là một Itinerary mới, `ForkCredit` (root author + parent author, PR-03 của PT-02) là lineage của itinerary, và PT-02 dẫn thẳng vào trình chỉnh sửa sau khi fork.
- Check-in + review (PT-04) thuộc `itinerary`: tác giả check-in trên waypoint của chính lịch trình mình, biến bản kế hoạch thành nhật ký hành trình.
- `identity` không dùng auth provider dựng sẵn (Auth.js...) như một generic hoàn chỉnh: BE tự cấp JWT access + refresh (ADR-001 của BE), FE chỉ bọc adapter.

## 3. Monorepo: pnpm workspaces + Turborepo

Ba app cùng gọi một BE và cùng một domain, nên `domain`, `application`, adapter HTTP và hooks React Query viết một lần trong package, dùng cho cả ba. Một PR đổi được cả contract lẫn mọi app, CI báo app nào vỡ.

**Điều kiện:** mobile dùng React Native (Expo). Nếu chọn Flutter/Kotlin/Swift thì không dùng lại được package TypeScript nào, chỉ chung OpenAPI contract; khi đó mobile tách repo riêng.

**BE (.NET) giữ repo riêng.** Contract lấy từ Swagger của BE (Swashbuckle 7.3.1, `/swagger/v1/swagger.json`), tùy chọn sinh type vào `packages/api-contract`. Zod ở `infrastructure/` vẫn là lớp kiểm tra lúc chạy.

**Vì sao Turborepo, không Nx** (version tra trên npm 2026-10-08: turbo 2.11.7, nx 23.3.0, expo 57.0.27 với React Native 0.86, react-native 0.87.1):
- Turborepo chỉ chạy script sẵn có của từng app/package và cache kết quả. Next/Expo nâng cấp theo tài liệu chính chủ, không phụ thuộc công cụ monorepo.
- Nx đi qua plugin: `@nx/next` 23.3.0 chỉ nhận `next >=14 <17`, lên Next 17 phải chờ Nx. Hướng dẫn monorepo của Expo dùng workspace thuần.
- BRD ghi phát triển một mình; ranh giới đã ép bằng `exports` + ESLint (mục 8), không cần tag boundaries của Nx.
- Khi team lớn có thể thêm Nx vào chính workspace pnpm này, không phải dựng lại.

| App | Framework | Người dùng | Ghi chú |
|---|---|---|---|
| `apps/web` | Next.js 16 | Traveler + khách (trang công khai, SEO) | Composition client + server |
| `apps/admin` | Next.js | Role Admin (`UserRoleType.Admin` ở BE) | Chọn Next thay Vite SPA: refresh token nằm trong cookie httpOnly do route handler đặt (JS không đọc được), dùng lại adapter `identity`, deploy riêng nên mã admin không vào bundle công khai |
| `apps/mobile` | Expo (React Native) | Traveler | Token trong `expo-secure-store`. Mapbox (`@rnmapbox/maps`) và WebRTC là native module: cần development build, không chạy trong Expo Go |
| (sau) `apps/provider` | Chưa chọn | Role ServiceProvider (BRD Feature #4) | Cân nhắc khi có module spec |

Chỉ tạo app khi bắt đầu làm app đó; không tạo app rỗng.

| Phần | Dùng chung |
|---|---|
| `domain`, `application`, adapter `/http`, hooks `/react` | Cả 3 app |
| Component UI | web + admin qua `@tripory/ui-web`; mobile viết riêng (RN không có DOM), chỉ chung `@tripory/design-tokens` |
| Composition root | Mỗi app một bản |

## 4. Cấu trúc folder

```
tripory_fe/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/                              # routing Next.js, chỉ ghép, không logic
│   │   │   │   ├── (public)/itineraries/[id]/page.tsx         # public view (GET /itineraries/{id} không cần đăng nhập)
│   │   │   │   └── (dashboard)/itineraries/[id]/edit/page.tsx # trình chỉnh sửa map + timeline
│   │   │   ├── modules/<context>/ui/             # component riêng của web
│   │   │   └── composition/                      # composition root của web
│   │   │       ├── itinerary.client.ts
│   │   │       └── itinerary.server.ts           # import 'server-only', đọc cookies()
│   │   ├── eslint.config.mjs                     # app()
│   │   └── next.config.ts
│   ├── admin/                                    # cùng khung với web
│   └── mobile/                                   # Expo Router; src/modules/<context>/ui + src/composition
├── packages/
│   ├── itinerary/                                # 1 bounded context = 1 package
│   │   ├── src/
│   │   │   ├── domain/                           # type + rules + calculations, TS thuần
│   │   │   ├── application/                      # use case + port (ports.ts)
│   │   │   ├── infrastructure/                   # DTO Zod, mapper (ACL), http repository dùng HttpClient của api-client
│   │   │   └── react/                            # createItineraryHooks(useCases): React Query, không DOM/RN/Next
│   │   ├── package.json                          # exports ".", "./http", "./react"
│   │   └── eslint.config.mjs                     # contextPackage()
│   ├── chat/  social/  discovery/  profile/  identity/  maps/
│   ├── shared-kernel/                            # Wgs84Coordinate, branded Id (UserId, ItineraryId)
│   ├── api-client/                               # port HttpClient + bản fetch, bóc ApiResponse<T>, refresh token
│   ├── api-contract/                             # (tùy chọn) type sinh từ swagger.json của BE
│   ├── ui-web/                                   # shadcn/Tailwind cho web + admin
│   ├── design-tokens/                            # màu, spacing → Tailwind (web) và NativeWind/StyleSheet (mobile)
│   └── config/                                   # eslint/{base,boundaries}.mjs, tsconfig/library.json, vitest/preset.mjs, test/boundaries.test.ts
├── pnpm-workspace.yaml
└── turbo.json                                    # task: dev, build, lint, typecheck, test
```

Package export thẳng mã TypeScript (không có bước build riêng): theo docs Next 16.4 (`transpilePackages`), Turbopack tự transpile workspace package; Metro của Expo xử lý TypeScript trong workspace (việc Metro đọc `exports` cần kiểm tra lại khi tạo app mobile).

```jsonc
// packages/itinerary/package.json (trích)
{
  "name": "@tripory/itinerary",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",                       // domain + application
    "./http": "./src/infrastructure/index.ts",
    "./react": "./src/react/index.ts"
  },
  "dependencies": {
    "@tripory/shared-kernel": "workspace:*",
    "@tripory/api-client": "workspace:*",
    "zod": "catalog:"
  },
  "peerDependencies": {
    "react": "catalog:",
    "@tanstack/react-query": "catalog:"
  }
}
```

Khung `itinerary` hiện chỉ khai báo hai dependency workspace. `zod`, `react`, `@tanstack/react-query` thêm khi có code đầu tiên dùng chúng (allowlist ESLint của các tầng tương ứng đã có sẵn tên này).

```yaml
# pnpm-workspace.yaml (trích) — một phiên bản React cho cả monorepo
packages:
  - apps/*
  - packages/*
catalog:
  react: 19.3.0
  react-dom: 19.3.0
```

## 5. Quy tắc phụ thuộc

Trong package context (`packages/<context>/src`). Cột "Được import" là **allowlist cưỡng chế bằng ESLint (default-deny)**: ngoài import tương đối trong package (trừ tầng bị cấm ở cột cuối), mọi module khác không có trong danh sách đều là lỗi. File `*.test.ts` dùng cùng allowlist, thêm `vitest`.

| Tầng | Được import (ngoài import tương đối) | Cấm thêm |
|---|---|---|
| `domain` | `@tripory/shared-kernel` | Tầng `application`, `infrastructure`, `react`; `fetch`, browser global, `Date.now`, `new Date()` không tham số, `Math.random` |
| `application` | `@tripory/shared-kernel` | Tầng `infrastructure`, `react`; cùng nhóm `fetch`/browser global/đồng hồ/ngẫu nhiên như domain |
| `infrastructure` | `@tripory/shared-kernel`, `@tripory/api-client`, `zod` | Tầng `react`; browser global. `infrastructure` được import `application` (implement port) và `domain` |
| `react` | `@tripory/shared-kernel`, `react`, `@tanstack/react-query` | Tầng `infrastructure`; browser global. Vì default-deny nên `react-dom`, `react-native`, `next/*`, `expo*` đều bị chặn. `react` được import `application` và `domain` |
| `src/index.ts` (entry gốc) | `@tripory/shared-kernel` | Tầng `infrastructure`, `react`: entry gốc chỉ phơi domain + application, còn infrastructure và hooks đi qua `/http` và `/react` |

Mọi tầng: cấm `import()` động và cấm import sâu `@tripory/*/src/**`.

Trong app (`apps/<app>/src`):

| Nơi | Được import |
|---|---|
| `composition/**` | Mọi entry của package: `@tripory/<context>`, `/http`, `/react` |
| Phần còn lại (`app/`, `modules/*/ui`...) | `@tripory/<context>` (type), `@tripory/<context>/react`, `@/composition/*`, `@tripory/ui-web`. **Cấm `/http`** |
| Mọi nơi | Chỉ qua `exports`; cấm `@tripory/*/src/**` |

Package context không import lẫn nhau (kể cả `maps`); ghép giữa các context ở app (mục 7). `shared-kernel` không phụ thuộc package nào; `api-client` chỉ phụ thuộc `shared-kernel`.

## 6. Vai trò từng tầng

| Tầng | Trả lời câu hỏi | Ví dụ |
|---|---|---|
| Domain | Luật nào luôn đúng ở mọi màn? | Chỉ xuất bản được khi có ít nhất 1 waypoint (BE: `CannotPublishEmpty`), dùng để disable nút Xuất bản |
| Use case | Hành động này gồm bước nào, thứ tự nào? | `reorderWaypoints`: kiểm tra quyền → danh sách ID khớp đúng các waypoint của ngày → gửi server |
| Hook (`src/react`, dùng chung) | React cần gì, chung mọi nền tảng? | `isPending`, query key theo aggregate root, invalidate |
| Component UI (app) | Hiển thị thế nào trên nền tảng này? | Toast, điều hướng, bản đồ Mapbox GL JS / `@rnmapbox/maps` |
| Infrastructure | Nói chuyện với bên ngoài thế nào? | Endpoint, bóc envelope `ApiResponse<T>`, parse Zod |

**Use case** (Clean Architecture; DDD gọi là Application Service) = một hành động của người dùng, tên động từ + danh từ (`addWaypoint`, `reorderWaypoints`, `publishItinerary`, `forkItinerary`). Nó điều phối, không chứa luật (domain) và không biết HTTP (infra). Dạng: `makeX(deps) => (input) => result`, closure chính là DI.

Khi nào tạo use case:
- Lệnh ghi có ≥ 2 bước hoặc có kiểm tra luật → có.
- Query đọc đơn giản → gọi thẳng repository, không viết use case chuyển tiếp.
- Query gộp nhiều nguồn/tính toán → có.

Phép thử: `domain/`, `application/`, `react/` của package chạy được trên cả web lẫn React Native mà không sửa. Thứ nào phải sửa theo nền tảng là đang đặt sai tầng.

**Composition root** nằm trong từng app (`apps/<app>/src/composition/`) và là nơi duy nhất import adapter `/http`. Package chỉ export factory: `createItineraryUseCases(deps)`, `createHttpItineraryRepository(http)`, `createItineraryHooks(useCases)`. App chọn `HttpClient` cho môi trường của mình (web client: cookie tự gửi; web server: đọc `cookies()` + `import 'server-only'`; mobile: token từ `expo-secure-store` gắn header Bearer), lắp repository → use case → hooks, rồi export hooks cho UI. Hooks trong package nhận use case qua factory vì package không biết app lắp implementation nào. Đổi implementation (mock cho Storybook, offline) chỉ sửa composition; test tự lắp bằng fake repository.

## 7. Giao tiếp giữa context

- Package context không phụ thuộc nhau; app ghép chúng ở UI. Ví dụ tin nhắn chat có thẻ lịch trình (USER_CHAT_01 PT-01): `chat` chỉ giữ `itineraryId`, component thẻ trong app dùng hook của `itinerary` để lấy dữ liệu. Nếu logic của `chat` thật sự cần dữ liệu lịch trình thì infrastructure của `chat` tự gọi API và map sang type riêng `ItineraryCardRef` (ACL phía tiêu thụ), không import `@tripory/itinerary`.
- Tìm địa điểm: UI của app dùng port `PlaceSearch` của `maps` (Mapbox Geocoding); người dùng chọn kết quả rồi app gọi `addWaypoint` của `itinerary` với tên, địa chỉ, tọa độ. Không giữ `mapbox_id` (BR_01 của ITINERARY_01 PT-02) để đổi sang Google Maps không vỡ schema.
- Thứ dùng chung thật sự (≥ 2 context, cùng nghĩa) mới lên `shared-kernel`.

## 8. Cưỡng chế bằng máy

Đã dựng và kiểm chứng ngày 2026-10-08 (ESLint 9.39.5, Vitest 4.1.11, Turbo 2.11.7). Nguồn sự thật là code trong `packages/config/`; mục này chỉ ghi lý do và các phát hiện không đọc ra được từ code.

Bốn lớp, từ sớm đến muộn:
1. **`exports` + `moduleResolution: "bundler"`** (`tsconfig/library.json`): import sâu vào `src/` của package khác lỗi TS2307 ở typecheck.
2. **pnpm cài kiểu isolated** (mặc định): package không import được thứ chưa khai báo trong `package.json` (TS2307 với `react`, `react-dom`, package khác). Mất lớp này nếu phải chuyển `nodeLinker: hoisted` (mục 9).
3. **ESLint preset** (`eslint/boundaries.mjs`). Mỗi package/app có `eslint.config.mjs` một dòng gọi preset:

| Preset | Dùng cho | Luật chính |
|---|---|---|
| `contextPackage()` | `packages/<context>` | Theo bảng mục 5: allowlist import (default-deny), cấm import chéo tầng, cấm import sâu `src`, cấm browser global. Domain/application thêm: cấm `fetch`, `Date.now`, `new Date()` không tham số, `Math.random` |
| `kernelPackage()` | `shared-kernel` | Như domain, không import package nào |
| `httpPackage()` | `api-client` | Chỉ import `shared-kernel`; được dùng `fetch` |
| `app()` | `apps/*`, thêm sau config của framework | Cấm import sâu `src`; `/http` chỉ trong `src/composition/**` |

4. **Vitest `environment: 'node'`** (`vitest/preset.mjs`): file test của package nào lén dùng DOM/React sẽ vỡ khi chạy. Test hook cần DOM thì đặt `// @vitest-environment jsdom` ở đầu file (khi đó cài thêm jsdom).

Quy tắc để mức `error`, không `warn` (bài học `EMPTY_DISPLAY` ở tc-ims-fe: để `warn` còn 54 vi phạm).

**Phát hiện khi dựng (không hiển nhiên):**
- `no-restricted-imports` chỉ kiểm import tĩnh (docs ESLint ghi rõ). `import('react')` lách được allowlist, đã chứng minh bằng đột biến. Preset bịt bằng `no-restricted-syntax` với selector `ImportExpression`; package không dùng `import()` động, lazy-load để ở app.
- Pattern kiểu gitignore không có dấu `/` (như `react`, `next`) khớp theo mọi đoạn đường dẫn, nên báo nhầm `./next` hay `../react/hooks`. Vì vậy preset không chặn thư viện bằng tên trần mà dùng `regex` default-deny cho module ngoài, còn `**/<tầng>` chỉ để chặn import tương đối chéo tầng.
- Flat config: nhiều block cùng set `no-restricted-imports` cho một file thì block sau **ghi đè hoàn toàn** (không merge), nên mỗi vùng tự liệt kê đủ pattern. File test là block riêng (allowlist thêm `vitest`). `files` tính tương đối với thư mục chứa `eslint.config.mjs`.
- Allowlist là chủ đích: thêm thư viện vào một tầng = sửa `boundaries.mjs` (và `package.json` của package). Đó là quyết định kiến trúc, không phải sửa cho qua lint.
- TS vẫn thấy `window`, `localStorage` vì `lib` có DOM (cần cho `fetch` ở `api-client`); chỉ ESLint chặn các global này.

**Kiểm chứng:**
- Self-test `packages/config/test/boundaries.test.ts`: 58 test = 42 vi phạm phải bắt + 11 import hợp lệ không được báo nhầm + 5 kiểm tra mỗi package/app đã nối preset. Nó chạy ESLint thật bằng `eslint.config.mjs` của từng package/app, nên kiểm cả phần nối dây.
- Đột biến: phá lần lượt 6 luật trong preset (bỏ `ImportExpression`, `noDeepImport`, `httpOnlyInComposition`, `vitest` cho file test, `pure` của domain, allowlist) thì đúng các test tương ứng vỡ (1, 1, 2, 1, 4, 13 test). Self-test không xanh rỗng.
- Trên repo thật, thêm 5 file sai (domain và react của itinerary, shared-kernel, api-client, web): `pnpm turbo run lint typecheck` đỏ 7 task, xóa file thì xanh lại. Vi phạm `localStorage` ở api-client chỉ ESLint bắt.
- Cache: sửa preset thì `lint` của cả 5 package bị bỏ cache; sửa `eslint.config.mjs` của một package thì `@tripory/config#test` bị bỏ cache nhờ `$TURBO_ROOT$` trong `packages/config/turbo.json`. Task `lint`, `typecheck`, `test` nối với nhau qua transit node.

**Thêm package/app mới:** tạo `package.json` (devDependency `@tripory/config: workspace:*`), `eslint.config.mjs` gọi preset, `tsconfig.json` extends `@tripory/config/tsconfig/library.json`, `vitest.config.ts` lấy preset. Self-test tự kiểm `eslint.config.mjs` của mọi thư mục trong `packages/*` và `apps/*`. Khung rỗng hiện chạy `vitest run --passWithNoTests`: bỏ cờ này khi package có test đầu tiên.

## 9. Bẫy

Monorepo:
- **Một phiên bản React cho cả monorepo.** Docs Expo: hai bản React trong một app gây lỗi runtime; hai phiên bản `react-native` trong một monorepo không được hỗ trợ. Chốt bằng `catalog:` của pnpm, nâng React của Next và Expo cùng lúc. Ngày 2026-10-08: web dùng 19.3.0, nằm trong `^19.2.3` mà React Native 0.86 (Expo SDK 57) yêu cầu; khi tạo app mobile chạy `npx expo install --check`.
- **`react`, `@tanstack/react-query` là `peerDependencies` của package** (thêm vào `devDependencies` để typecheck trong package), không phải `dependencies`. Thư viện tạo React context bị cài hai bản sẽ hỏng.
- **Vitest 5.0 (ra 09/2026) đòi `@types/node` >= 22**, trong khi catalog pin `@types/node` 20.19.43 theo app web, nên đang dùng Vitest 4.1.11 (bản cuối nhánh 4). Nâng hai thứ này cùng lúc.
- **pnpm isolated vs hoisted:** theo docs Expo, một số thư viện React Native lỗi với cài isolated, phải chuyển `nodeLinker: hoisted` trong `pnpm-workspace.yaml`. Khi đó ESLint (mục 8) là lớp chặn còn lại.
- **pnpm 11 chặn install script mặc định:** `pnpm install` dừng với `ERR_PNPM_IGNORED_BUILDS` và tự chèn `allowBuilds: { <pkg>: set this to true or false }` vào `pnpm-workspace.yaml`; nếu đã có khối `allowBuilds` thì thành trùng key, lần install sau lỗi `duplicated mapping key`. Quyết định từng package trong một khối `allowBuilds` duy nhất. Hiện có `unrs-resolver: false` (postinstall chỉ kiểm tra native binding, binding đã có qua optionalDependencies; `pnpm lint` vẫn chạy).
- **Không có `server-only`, `next/*`, `cookies()` trong `packages/*`.** Code riêng server chỉ ở `apps/web/src/composition/*.server.ts`.
- **Docs Next theo AGENTS.md:** trong monorepo, gói `next` có thể không thấy từ gốc repo; đọc docs ở `apps/web/node_modules/next/dist/docs/`.

DDD và Next:
- **Sao chép luật của BE** → hai bên lệch dần. Ví dụ `TotalDistanceKm`/`DayDistanceKm`: BE tính (`Itinerary.RecalculateDistances`, Haversine, không cộng quãng qua đêm giữa ngày N và N+1 theo BR_01 của ITINERARY_01 PT-05). FE chỉ map và hiển thị. Nếu cần preview ngay khi kéo thả thì coi là giá trị tạm, thay bằng số của BE sau khi refetch.
- **Đủ 4 tầng cho context CRUD** → tầng rỗng chỉ thêm nhiễu. Chỉ core subdomain mới đủ tầng.
- **`shared-kernel` thành bãi rác** → chỉ VO ≥ 2 context dùng cùng nghĩa.
- **Compound component qua ranh giới server/client** (theo docs Next 16.4 `server-and-client-boundary`): Server Component import Client Component chỉ nhận client reference, nên `Tabs.Panel` dạng static property thành `undefined`. Component trong `ui-web` hoặc `apps/web/src/modules/*/ui` dùng được từ Server Component thì export các phần con bằng **named export**.
- **Truyền function từ Server sang Client Component** sẽ throw (trừ Server Function `'use server'`). Đây là lý do domain trả plain object, không trả object có method.

**Why:** Muốn codebase hướng DDD nhưng FE không sở hữu domain thật. Áp dụng đầy đủ strategic DDD (ngôn ngữ chung, bounded context, ACL) để code nói đúng nghiệp vụ và chặn thay đổi API lan vào app; tactical chỉ giữ phần hợp với React/RSC (type + pure function, repository dạng port). Sẽ có thêm admin và mobile React Native, nên bounded context thành package dùng chung và composition root chuyển vào từng app: mỗi nền tảng chỉ viết UI và phần lắp ráp. Chọn Turborepo thay Nx vì phát triển một mình và không muốn việc nâng Next/Expo phụ thuộc plugin của công cụ monorepo.

**How to apply:** Khi tạo hoặc sửa feature trong tripory-fe: xác định context (mục 2), đặt code nghiệp vụ vào `packages/<context>/src` đúng tầng (mục 5–6), UI vào `apps/<app>/src/modules/<context>/ui`, nối qua `apps/<app>/src/composition`. Chỉ tạo use case cho lệnh ghi hoặc query phức tạp. Chỉ tạo app mới khi bắt đầu làm app đó. Trước khi báo xong chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`. Cần thư viện mới trong một tầng của package thì sửa allowlist ở `packages/config/eslint/boundaries.mjs` và thêm dependency vào `package.json` của package, đừng tắt rule. Kiểm tra docs trong `apps/web/node_modules/next/dist/docs/` trước khi viết code Next (yêu cầu của AGENTS.md).
