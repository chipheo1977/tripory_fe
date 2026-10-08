---
title: Kiến trúc DDD cho tripory-fe — bounded context + Ports & Adapters
description: Mỗi bounded context là một module 4 tầng domain/application/infrastructure/ui, nối bằng composition root client/server; use case điều phối, domain là type + pure function; luật import cưỡng chế bằng ESLint + Vitest node
projects: [tripory-fe]
type: architecture
created: 2026-10-08
tags: [ddd, clean-architecture, hexagonal, ports-and-adapters, nextjs, react-query, composition-root, use-case]
---

**Trạng thái:** Đề xuất, chưa dựng code. Stack hiện tại của repo: Next.js 16.4.0, React 19.3.0, Tailwind 4, `app/` đang ở gốc, alias `@/*` → `./*`.

Liên quan: mở rộng từ mô hình 3 vòng của [tc-ims-fe](./tc-ims-fe-core-architecture.md). `domain/` = core, `ui/` = React glue, `infrastructure/` = infrastructure, thêm tầng `application/` (use case) và `composition.*.ts` (composition root).

## 1. DDD ở frontend: áp dụng gì, bỏ gì

Backend là nguồn sự thật của invariant. Domain ở FE chỉ gồm luật phục vụ người dùng: quyền thao tác, giá trị dẫn xuất (số ngày, số waypoint mỗi ngày, tiến độ check-in), validate sớm, chuyển trạng thái.

Ví dụ quyền: `canEdit = itinerary.userId === viewerId`. BE không trả cờ quyền trong DTO, chỉ chặn bằng 403, nên FE tự suy ra để ẩn/hiện thao tác.

| Khái niệm | Áp dụng | Cách làm |
|---|---|---|
| Ubiquitous Language | Có | Tên file/type/hàm theo thuật ngữ nghiệp vụ, thống nhất với BE, ghi trong `docs/glossary.md` |
| Bounded Context | Có | 1 context = 1 folder trong `src/modules/` |
| Subdomain core/supporting/generic | Có | Quyết định mức đầu tư (mục 2) |
| Anti-Corruption Layer | Có | Mapper DTO → domain trong `infrastructure/` |
| Value Object, Entity, Domain Service | Có | `type` readonly + pure function, **không dùng class** |
| Repository | Có, dạng port | Interface ở `application/ports.ts`, cài đặt ở `infrastructure/` |
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
| `maps` | ITINERARY_01 PT-02 (waypoint search), PT-05 (vẽ tuyến) | Generic | Không qua BE, FE gọi thẳng Mapbox | Adapter Mapbox GL + Geocoding, port `PlaceSearch` |
| `provider`, `affiliate`, `notification` | BRD Feature #4, Sprint 4.1, 5.1 | Chưa xếp | Chưa có module spec | Chưa tạo |

Ghi chú:
- Chat phức tạp nhưng là supporting: không phải lý do người dùng chọn Tripory. Độ phức tạp không làm một subdomain thành core.
- **Cần chốt với BE:** `ARCHITECTURE.md` của BE dự định đặt Fork chung Like/Comment trong `UseCases/V1/Social/`. FE đặt Fork trong `itinerary` vì kết quả fork là một Itinerary mới, `ForkCredit` (root author + parent author, PR-03 của PT-02) là lineage của itinerary, và PT-02 dẫn thẳng vào trình chỉnh sửa sau khi fork.
- Check-in + review (PT-04) thuộc `itinerary`: tác giả check-in trên waypoint của chính lịch trình mình, biến bản kế hoạch thành nhật ký hành trình.
- `identity` không dùng auth provider dựng sẵn (Auth.js...) như một generic hoàn chỉnh: BE tự cấp JWT access + refresh (ADR-001 của BE), FE chỉ bọc adapter.

## 3. Cấu trúc folder

```
src/
├── app/                                # routing Next.js, chỉ ghép, không logic
│   ├── (public)/itineraries/[id]/page.tsx         # public view (GET /itineraries/{id} không cần đăng nhập)
│   └── (dashboard)/itineraries/[id]/edit/page.tsx # trình chỉnh sửa map + timeline
├── modules/
│   ├── itinerary/
│   │   ├── domain/                     # .ts thuần, chạy Vitest environment node
│   │   │   ├── itinerary.ts            #   type + rules + calculations
│   │   │   └── errors.ts
│   │   ├── application/                # use case + port, không biết React/HTTP
│   │   │   ├── ports.ts
│   │   │   └── add-waypoint.ts
│   │   ├── infrastructure/             # adapter
│   │   │   ├── itinerary.dto.ts        #   Zod schema response API
│   │   │   ├── itinerary.mapper.ts     #   ACL: DTO → domain
│   │   │   └── itinerary.http-repository.ts
│   │   ├── ui/                         # React glue: hooks, components
│   │   ├── composition.client.ts       # nối infra → use case cho browser
│   │   ├── composition.server.ts       # nối infra → use case cho server ('server-only')
│   │   ├── index.ts                    # public API dùng được ở client
│   │   └── server.ts                   # public API chỉ cho server (re-export composition.server)
│   ├── chat/                           # cùng khung 4 tầng; infrastructure gồm REST + SignalR
│   ├── social/  discovery/  profile/   # bản rút gọn
│   ├── identity/                       # adapter token + auth gate
│   └── maps/                           # adapter Mapbox GL + Geocoding, port PlaceSearch
├── shared-kernel/                      # VO dùng chung thật sự: Wgs84Coordinate, branded Id (UserId, ItineraryId)
├── shared/ui/                          # design system
└── shared/infrastructure/              # http client (client/server), clock, logger
```

Trong cùng module import bằng đường dẫn tương đối; sang module khác chỉ qua `@/modules/<tên>` hoặc `@/modules/<tên>/server`.

## 4. Quy tắc phụ thuộc

| Tầng | Được import |
|---|---|
| `domain` | `domain` cùng module, `shared-kernel` |
| `application` | `domain`, `shared-kernel` |
| `infrastructure` | `application` (implement port), `domain`, `shared/infrastructure` |
| `ui` | `application` (type), `domain`, `composition.*`, `shared/ui`. **Cấm `infrastructure`** |
| `composition.*` | Mọi tầng của chính module |
| `app/` (page) | `index.ts`, `server.ts` của module |

## 5. Vai trò từng tầng

| Tầng | Trả lời câu hỏi | Ví dụ |
|---|---|---|
| Domain | Luật nào luôn đúng ở mọi màn? | Chỉ xuất bản được khi có ít nhất 1 waypoint (BE: `CannotPublishEmpty`), dùng để disable nút Xuất bản |
| Use case | Hành động này gồm bước nào, thứ tự nào? | `reorderWaypoints`: kiểm tra quyền → danh sách ID khớp đúng các waypoint của ngày → gửi server |
| UI hook | React cần gì? | `isPending`, invalidate query, toast |
| Infrastructure | Nói chuyện với bên ngoài thế nào? | Endpoint, bóc envelope `ApiResponse<T>`, parse Zod |

**Use case** (Clean Architecture; DDD gọi là Application Service) = một hành động của người dùng, tên động từ + danh từ (`addWaypoint`, `reorderWaypoints`, `publishItinerary`, `forkItinerary`). Nó điều phối, không chứa luật (domain) và không biết HTTP (infra). Dạng: `makeX(deps) => (input) => result`, closure chính là DI.

Khi nào tạo use case:
- Lệnh ghi có ≥ 2 bước hoặc có kiểm tra luật → có.
- Query đọc đơn giản → gọi thẳng repository, không viết use case chuyển tiếp.
- Query gộp nhiều nguồn/tính toán → có.

Phép thử: đổi React sang Vue/React Native thì `domain/` + `application/` giữ nguyên. Use case nào phải sửa là đang chứa thứ không thuộc về nó.

**Composition root** (`composition.*.ts`) = nơi duy nhất chọn implementation cụ thể và cắm vào use case (DI thủ công). Nhờ nó `ui` không bao giờ import `infrastructure`; đổi implementation (mock cho Storybook, offline, REST → GraphQL) chỉ sửa một chỗ; test tự lắp composition riêng bằng fake repository. Next.js cần 2 bản vì 2 môi trường: client (cookie tự gửi, URL tương đối) và server (đọc `cookies()`, URL tuyệt đối, secret, `import 'server-only'`). React + Vite thuần chỉ cần 1 file `composition.ts`. Cần đổi dependency theo cây component thì dùng Provider làm composition root.

## 6. Giao tiếp giữa context

- Tham chiếu bằng ID, không nhúng entity của context khác. Ví dụ: `chat` gửi thẻ lịch trình (USER_CHAT_01 PT-01) chỉ giữ `itineraryId`, lấy dữ liệu qua public API của `itinerary` rồi map sang type riêng `ItineraryCardRef` (chỉ các field thẻ cần hiển thị): ACL nhỏ ở phía tiêu thụ.
- `itinerary` tìm địa điểm qua port `PlaceSearch` của `maps`. Kết quả chuyển thành waypoint chỉ giữ tên, địa chỉ, tọa độ; không giữ `mapbox_id` (BR_01 của ITINERARY_01 PT-02) để đổi sang Google Maps không vỡ schema.
- Không import chéo `domain/` giữa module. Thứ dùng chung thật sự (≥ 2 context, cùng nghĩa) mới lên `shared-kernel`.

## 7. Cưỡng chế bằng máy

ESLint flat config: khi nhiều block cùng set `no-restricted-imports` cho một file, block sau **ghi đè** block trước (không merge), nên mỗi block phải tự liệt kê đủ pattern.

```js
// eslint.config.mjs (trích, thêm sau config của eslint-config-next)
const crossModule = {
  group: ['@/modules/*/*', '!@/modules/*/server'],
  message: 'Sang module khác chỉ qua @/modules/<tên> hoặc @/modules/<tên>/server.',
};
const pureTs = {
  group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'next', 'next/*', '@tanstack/*', 'axios',
    '**/infrastructure/**', '**/ui/**', '**/composition.*', '@/shared/infrastructure/*', '@/shared/ui/*'],
  message: 'domain/application phải là TypeScript thuần.',
};
const noInfraFromUi = { group: ['**/infrastructure/**'], message: 'ui gọi use case qua composition.*' };
const noAppFromDomain = { group: ['**/application/**'], message: 'domain không biết application.' };

const restrict = (...patterns) => ['error', { patterns }];
const pureGlobals = {
  'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'fetch'],
  'no-restricted-properties': ['error',
    { object: 'Date', property: 'now', message: 'Truyền today/clock vào qua deps.' },
    { object: 'Math', property: 'random', message: 'Truyền id generator vào qua deps.' }],
};

export default [
  // ...eslint-config-next
  { files: ['src/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': restrict(crossModule) } },
  { files: ['src/modules/*/ui/**'], rules: { 'no-restricted-imports': restrict(crossModule, noInfraFromUi) } },
  { files: ['src/modules/*/application/**'], rules: { 'no-restricted-imports': restrict(crossModule, pureTs), ...pureGlobals } },
  { files: ['src/modules/*/domain/**', 'src/shared-kernel/**'], rules: { 'no-restricted-imports': restrict(crossModule, pureTs, noAppFromDomain), ...pureGlobals } },
];
```

Đã chạy thử trên ESLint 9.39.5 (2026-10-08): bắt đúng 9/9 vi phạm mẫu (ui → infrastructure, domain → react/application/`Date.now`, application → infrastructure/composition/shared-ui, import sâu sang module khác); `@/modules/<tên>`, `@/modules/<tên>/server` và import tương đối hợp lệ đều qua.

Vitest: test `domain/`, `application/`, `shared-kernel/` chạy `environment: 'node'` (file nào lén import React/DOM tự vỡ); test `ui/` chạy `jsdom`. Tách bằng `test.projects`. Rule để `error`, không `warn` (bài học `EMPTY_DISPLAY` ở tc-ims-fe: để `warn` còn 54 vi phạm).

## 8. Bẫy

- **Sao chép luật của BE** → hai bên lệch dần. Ví dụ `TotalDistanceKm`/`DayDistanceKm`: BE tính (`Itinerary.RecalculateDistances`, Haversine, không cộng quãng qua đêm giữa ngày N và N+1 theo BR_01 của ITINERARY_01 PT-05). FE chỉ map và hiển thị. Nếu cần preview ngay khi kéo thả thì coi là giá trị tạm, thay bằng số của BE sau khi refetch.
- **Đủ 4 tầng cho context CRUD** → tầng rỗng chỉ thêm nhiễu. Chỉ core subdomain mới đủ tầng.
- **`shared-kernel` thành bãi rác** → chỉ VO ≥ 2 context dùng cùng nghĩa.
- **Client vô tình kéo code server**: `index.ts` không được re-export `composition.server.ts`; mọi thứ server đi qua `server.ts`, và `composition.server.ts` luôn có `import 'server-only'` để build báo lỗi.
- **Compound component qua ranh giới server/client** (theo docs Next 16.4 `server-and-client-boundary`): Server Component import Client Component chỉ nhận client reference, nên `Tabs.Panel` dạng static property thành `undefined`. Component trong `ui/` dùng được từ Server Component thì export các phần con bằng **named export**.
- **Truyền function từ Server sang Client Component** sẽ throw (trừ Server Function `'use server'`). Đây là lý do domain trả plain object, không trả object có method.

**Why:** Muốn codebase hướng DDD nhưng FE không sở hữu domain thật. Áp dụng đầy đủ strategic DDD (ngôn ngữ chung, bounded context, ACL) để code nói đúng nghiệp vụ và chặn thay đổi API lan vào app; tactical chỉ giữ phần hợp với React/RSC (type + pure function, repository dạng port). Composition root tách riêng khỏi page vì Next có 2 môi trường chạy cần 2 bản lắp ráp, đồng thời biến luật "glue không gọi infra" (mơ hồ trong tài liệu tc-ims-fe) thành luật lint kiểm tra được.

**How to apply:** Khi tạo hoặc sửa feature trong tripory-fe: xác định context trước, đặt code đúng tầng theo bảng mục 4–5, chỉ tạo use case cho lệnh ghi hoặc query phức tạp, mọi lời gọi infra từ UI đi qua `composition.*`. Kiểm tra docs trong `node_modules/next/dist/docs/` trước khi viết code Next (yêu cầu của AGENTS.md trong repo).
