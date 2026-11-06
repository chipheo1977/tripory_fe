# Roadmap: Tripory Frontend

## Overview

Milestone 1 đi từ khung giao diện có deploy Vercel ngay từ đầu, qua nền HTTP/kernel và phiên đăng nhập BFF, tới luồng chính của Core Value: tạo, sửa, xuất bản lịch trình, xem trang công khai có bản đồ, quản lý hồ sơ/danh bạ, rồi chat realtime, tin nhắn thoại và gọi thoại qua TURN. Milestone kết thúc bằng một gate nghiệm thu trên URL production để vài người quen dùng thử và góp ý, trong khi FE Vite cũ vẫn chạy song song.

Thứ tự phase giữ đúng lộ trình đã chốt (0a → 0b → 0c → 1 → 2 → 3 → 4 → deploy), đánh số lại thành Phase 1–8.

| Phase GSD | Tên trong PROJECT.md |
|-----------|----------------------|
| 1 | 0a — UI skeleton + walking skeleton |
| 2 | 0b — HTTP + shared kernel |
| 3 | 0c — Identity + session (BFF) |
| 4 | 1 — Itinerary CRUD + editor |
| 5 | 2 — Bản đồ + public view |
| 6 | 3 — Profile + users |
| 7 | 4 — Chat realtime + voice + gọi thoại |
| 8 | Deploy & nghiệm thu |

**Phụ thuộc bên ngoài:** Deploy BE thuộc repo `tripory_be`, không có phase riêng ở đây. Roadmap FE chỉ cần một URL BE công khai (HTTPS + WSS, CORS cho domain Vercel và FE cũ). Các phase có ghi chú "External dependency" chỉ nghiệm thu đầy đủ được khi URL đó sẵn sàng; code vẫn phát triển được với BE local.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Design System, UI Skeleton & Walking Skeleton** - pnpm 10, preset `uiPackage()`, design token, base components theo atomic design, khung giao diện responsive và bản deploy Vercel đầu tiên
- [x] **Phase 2: HTTP & Shared Kernel** - `api-client` chuẩn hóa lỗi BE, single-flight refresh và `shared-kernel` dùng chung (completed 2026-10-12)
- [x] **Phase 3: Identity & Session (BFF)** - Đăng ký, đăng nhập, phiên cookie httpOnly, refresh im lặng và BFF có allowlist
 (completed 2026-10-23)
- [x] **Phase 4: Itinerary CRUD & Editor** - "Lịch trình của tôi" và editor đầy đủ tới bước xuất bản (reopened 2026-10-30: form tạo 4 khối thay tạo nhanh (ITIN-02), nhiều ảnh bìa và tự lưu "Thông tin chuyến đi" (ITIN-03) đã xong 41/41 plan; mở lại lần 2 2026-11-05: bản đồ MapLibre + OpenFreeMap trong editor và tab Tổng quan (PUB-06), chưa lập plan)
 (completed 2026-11-05)
- [ ] **Phase 5: Map & Public View** - Trang công khai SSR, chuyển Bài viết/Bản đồ (dùng lại bản đồ của editor), chia sẻ và Open Graph
- [ ] **Phase 6: Profile & Users** - Hồ sơ thật, tab lịch trình, danh bạ và lối vào hội thoại
- [ ] **Phase 7: Chat, Voice & Calls** - Chat realtime, tin nhắn thoại và gọi thoại 1-1 qua TURN
- [ ] **Phase 8: Deploy & Acceptance Gate** - Production Vercel trỏ BE công khai, smoke E2E và kênh góp ý

## Phase Details

### Phase 1: Design System, UI Skeleton & Walking Skeleton
**Goal**: Có một design system dùng chung (token mới + base components theo atomic design) làm nền cho mọi màn sau; người dùng mở được một URL Vercel thật và thấy khung giao diện responsive dựng từ các component đó; toolchain (pnpm 10, boundaries) không chặn các phase sau
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-06, FND-07, DS-01, DS-02, DS-03, DS-04, DS-05, DS-06, DS-07
**Success Criteria** (what must be TRUE):
  1. Từ gốc repo, `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` chạy xanh bằng pnpm 10; self-test của `boundaries.mjs` xanh với preset `uiPackage()` cho `ui-web` và `design-tokens`
  2. `design-tokens` xuất bộ token semantic mới qua Tailwind 4 `@theme` và CSS variables; đổi giá trị một token (ví dụ `--color-primary`) thì mọi component dùng nó đổi theo, không có màu/spacing hard-code trong `ui-web`
  3. `ui-web` có đủ atoms và molecules của DS-03/DS-04, mỗi component có test render, role/aria và bàn phím chạy xanh; người dùng chỉ dùng bàn phím mở/đóng được Dialog và Sheet (focus bị giữ, Esc đóng), mọi ô form có label
  4. Người dùng mở URL Vercel (Root Directory `apps/web`, Node 24) trên điện thoại và desktop, thấy AppShell + AppHeader + UserMenu (slot tĩnh) cho `(public)`/`(dashboard)` không tràn màn, vùng chạm ≥ 44px, không có link tới route chưa tồn tại
  5. Người dùng gõ một route sai thì thấy trang 404; các màn khung có trạng thái loading (Skeleton), empty (EmptyState) và error (ErrorState kèm nút "Thử lại")
**Plans**: 8 plans

Plans:
- [x] 01-01-PLAN.md — Wave 0: pnpm 10, boundaries, Vitest UI và package skeletons
- [x] 01-02-PLAN.md — Design tokens và compile/guard tests
- [x] 01-03-PLAN.md — Atoms
- [x] 01-04-PLAN.md — Molecules form/navigation
- [x] 01-05-PLAN.md — Molecules feedback/content/Dialog
- [x] 01-06-PLAN.md — Sheet và public exports
- [x] 01-07-PLAN.md — AppShell, organisms và Next route conventions
- [x] 01-08-PLAN.md — Vercel checkpoint, production deploy và smoke
**UI hint**: yes
**Note**: Phase này nặng hơn sau khi thêm Design System (13 requirement). Khi plan, chia plan theo thứ tự toolchain (pnpm 10, `uiPackage()`) → design tokens → atoms/molecules → organisms + AppShell → deploy Vercel. Bộ token thiết kế mới từ đầu, nên chạy `/gsd-ui-phase 1` để chốt design contract (màu, typography, spacing) trước khi plan. Test component trong `ui-web` cần môi trường DOM (jsdom + Testing Library) theo preset `uiPackage()`; đây khác với quyết định không mở Testing Library cho tầng `react` của context package.

### Phase 2: HTTP & Shared Kernel
**Goal**: Mọi lời gọi BE đi qua một client thống nhất, lỗi BE ở mọi dạng biến thành thông báo đọc được cho người dùng, và refresh token không bao giờ chạy trùng
**Depends on**: Phase 1
**Requirements**: FND-05
**Success Criteria** (what must be TRUE):
  1. Khi BE trả lỗi ở bất kỳ dạng nào trong 4 dạng đã biết (envelope, ProblemDetails, validation, lỗi mạng/timeout), người dùng nhận toast thất bại chứa message lấy từ BE; thao tác thành công có toast thành công
  2. Test chứng minh N request 401 song song qua `withSessionRefresh` chỉ dẫn tới đúng 1 lần gọi refresh rồi phát lại các request
  3. `shared-kernel` (branded id, `Wgs84Coordinate`) và `api-client` có test, không dùng browser global trong package, lint ranh giới xanh
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — shared-kernel: `UserId`, `ItineraryId`, `Wgs84Coordinate` và test
- [x] 02-02-PLAN.md — api-client lõi: `ApiError`, `toApiError` + fixture BE, fetch client timeout 30 s, subpath `./http`
- [x] 02-03-PLAN.md — `withSessionRefresh`: single-flight + epoch, phân loại hết phiên/lỗi tạm thời
- [x] 02-04-PLAN.md — `apps/web/src/lib/feedback` (bảng map, chọn message, lỗi form, chính sách toast), self-test ranh giới, full suite
**Note**: Theo `02-CONTEXT.md`, tiêu chí 1 chỉ được chứng minh bằng unit test ở Phase 2 (chuẩn hóa lỗi, chọn message, chính sách toast). Phần người dùng thấy toast thật được nghiệm thu ở Phase 3 bằng thao tác ghi thật, khi đã mount `Toast` và `QueryClientProvider`.

### Phase 3: Identity & Session (BFF)
**Goal**: Người dùng đăng ký, đăng nhập, giữ phiên và đăng xuất an toàn; token không bao giờ lọt về JavaScript phía client
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08
**Success Criteria** (what must be TRUE):
  1. Người dùng đăng ký bằng email, mật khẩu, họ tên (thấy lỗi validate của BE), đăng nhập, thấy menu user với avatar và tên thật; `document.cookie` không đọc được access/refresh token
  2. Người dùng reload hoặc để access token hết hạn rồi thao tác tiếp mà không bị đăng xuất; mở nhiều tab cùng lúc vẫn chỉ có 1 lần refresh và BE không kích hoạt reuse detection
  3. Người dùng mở trang cần đăng nhập khi chưa có phiên thì được đưa tới đăng nhập rồi quay lại đúng trang; `?next=` trỏ ra ngoài bị bỏ qua
  4. Người dùng đổi mật khẩu (thấy rule trước khi nhập) và đăng xuất được từ mọi trang; cookie bị xóa
  5. Request tới BFF ngoài allowlist (`users`, `itineraries`, `chat`), tới `auth/*`, hoặc sai Origin đều bị từ chối
**Plans**: 15 plans
**UI hint**: yes
**Research flag**: cần research sâu khi plan (tên claim JWT, thiết kế cookie `__Host-`/`__Secure-`, Web Locks trên iOS)

Plans:
- [x] 03-01-PLAN.md — Wave 0: catalog (4 dependency, pin cứng), khung `packages/identity`, self-test ranh giới, helper test (NextRequest, fake Web Locks, fake BroadcastChannel)
- [x] 03-02-PLAN.md — `design-tokens` + `ui-web`: token form/user-menu, `Button.loadingLabel`, `PasswordInput`, `InlineAlert`, `DropdownMenuLinkItem`
- [x] 03-03-PLAN.md — `identity` domain/application: `toSafeNextPath`, ngưỡng token, rule mật khẩu (6 mục đổi mật khẩu), port
- [x] 03-04-PLAN.md — `identity` infrastructure/react: DTO Zod, claim JWT thật, gateway, hook factory
- [x] 03-05-PLAN.md — Lõi server: cookie `__Host-`, env, Origin guard, upstream 28 s, session-store
- [x] 03-06-PLAN.md — Composition client: Web Locks + `refreshSession`, `sessionEvents`/BroadcastChannel, `QueryClient`
- [x] 03-07-PLAN.md — Route `/api/auth/{login,register,logout,refresh,change-password}`
- [x] 03-08-PLAN.md — BFF `/api/bff/[...path]` (allowlist, chống traversal, Origin)
- [x] 03-09-PLAN.md — `proxy.ts`, `viewer.server.ts`, `decideDashboardGate`
- [x] 03-10-PLAN.md — Nền form: schema Zod, map lỗi, `PasswordChecklist`, `SubmitStatus`, `AuthFormCard`
- [x] 03-11-PLAN.md — Vòng đời phiên UI: `Providers`, `SessionEffects`, `SessionKeeper`, `SessionRecovery`
- [x] 03-12-PLAN.md — `LoginForm`, `RegisterForm`, `ChangePasswordForm` và 3 trang
- [x] 03-13-PLAN.md — `UserMenu`, nút khách, `AccountSlot`, `AppShell`, gate `(dashboard)`
- [x] 03-14-PLAN.md — Test đối chiếu gate, bất biến bảo mật, checklist phụ thuộc BE, full suite + build
- [x] 03-15-PLAN.md — UAT thủ công với BE thật (checkpoint; gồm `user@gmail.com` cho D-33)

### Phase 4: Itinerary CRUD & Editor
**Goal**: Người dùng đã đăng nhập tạo, sửa, sắp xếp và xuất bản một lịch trình thật bằng API BE, trên cả desktop và mobile
**Depends on**: Phase 3
**Requirements**: ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05, ITIN-06, ITIN-07, ITIN-08, ITIN-09, ITIN-10, ITIN-11, ITIN-12, ITIN-13, ITIN-14, PUB-06
**Success Criteria** (what must be TRUE):
  0. (PUB-06, mở lại lần 2 2026-11-05, đã lập kế hoạch 04-42..04-53) Editor hiển thị bản đồ dùng chung (MapLibre + OpenFreeMap, style riêng thể hiện Hoàng Sa, Trường Sa thuộc Việt Nam): pin màu theo ngày có số thứ tự, đường nối trong ngày, zoom/pan, chọn điểm đồng bộ với danh sách; dải tab ngày có tab "Tổng quan" hiện mọi ngày
  1. Người dùng thấy "Lịch trình của tôi" có phân trang và lọc Tất cả/Nháp/Đã xuất bản, tạo lịch trình trong một modal 4 khối accordion (điểm đến trong 34 tỉnh/thành, tên mặc định theo điểm đến, ngày khởi hành và số ngày, sở thích) rồi vào thẳng editor với đủ số ngày đã chọn và ảnh bìa mặc định theo điểm đến, và xóa được lịch trình sau khi xác nhận (thay tạo nhanh bằng tiêu đề, mở lại 2026-10-30; BE lưu điểm đến, sở thích, ngày khởi hành, số ngày và ảnh bìa mặc định trong một request)
  2. Trong editor, người dùng sửa metadata (tiêu đề, mô tả, ngày khởi hành, ảnh bìa URL có preview; mở lại 2026-10-30: tự lưu không có nút Lưu, tối đa 5 ảnh bìa dạng lưới và chọn một ảnh hiển thị), chuyển/thêm ngày, sửa phụ đề ngày inline, thêm/sửa waypoint bằng cách dán tọa độ "lat, lng" hoặc link Google Maps, và thấy quãng đường theo ngày cùng tổng do BE tính
  3. Người dùng xóa waypoint và hoàn tác được trong 5 giây; kéo thả sắp xếp waypoint trong ngày bằng chuột, cảm ứng hoặc bàn phím, thấy rollback khi BE lỗi
  4. Người dùng luôn thấy trạng thái Đang lưu / Đã lưu / Lỗi – thử lại, được cảnh báo khi rời trang lúc còn request; xuất bản được khi có ≥ 1 waypoint sau khi xác nhận không thể hủy, rồi thấy lịch trình chuyển sang "Đã xuất bản" (hộp chia sẻ sau khi xuất bản chuyển sang Phase 5 theo `04-CONTEXT.md` D-40)
  5. Người không phải chủ không thấy thao tác sửa; trên mobile, timeline nằm trong bottom sheet nhiều mức và vẫn thao tác đủ các bước trên
**Plans**: 41 plans, đã xong cả 41 (23 plan đầu + 18 plan mở lại 04-24..04-41 cho ITIN-02, ITIN-03: tài liệu hợp đồng BE, checkpoint BE 04-25, rồi FE và UAT; 04-41 tách từ 04-30 nên xếp ở wave 18, trước 04-31; UAT mục D 8/8 PASS trên BE local 2026-11-05) + 12 plan mở lại lần 2 (04-42..04-53, bản đồ trong editor và tab Tổng quan, PUB-06; quyết định ở `04-CONTEXT.md` D-111..D-140, research ở `04-RESEARCH.md` mục "Mở lại lần 2 (2026-11-05): bản đồ"; wave 26-33, 04-53 là checkpoint UAT)
**UI hint**: yes
**Research flag**: cần research sâu khi plan (parse link Google Maps, dnd-kit với React 19 StrictMode, `CalendarDate`, mapper ngày thưa)

Plans:
- [x] 04-01-PLAN.md — Wave 0: alias token `text-muted|subtle|disabled`, `z-*`, 2 token sizing, guard `var()` mồ côi, đổi `z-(--z-*)`
- [x] 04-02-PLAN.md — Wave 0: catalog dnd-kit (pin cứng), dependency `packages/itinerary`, self-test ranh giới, `HttpRequest.keepalive`
- [x] 04-03-PLAN.md — Route group `(shell)`/`(editor)` (layout toàn màn có gate), proxy `isProtectedPath` cho `/itineraries/{id}/edit`, `EditorSkeleton`
- [x] 04-10-PLAN.md — Route `/api/maps/resolve` (phiên + Origin + allowlist host, ≤ 3 hop, 5 s), mã lỗi itinerary theo UI-SPEC
- [x] 04-04-PLAN.md — `ui-web`: `notify.undoable`, `InlineAlert variant="info"`, `Sheet` `dismissible`/`defaultSnap`/`insetTop`
- [x] 04-05-PLAN.md — Wave 0 app: fake IntersectionObserver/ResizeObserver, fixture JSON BE, chuyển `SubmitStatus`, `mapFormError` dùng chung, spike dnd-kit StrictMode
- [x] 04-06-PLAN.md — Domain (TDD): type aggregate, `StatusFilter`, `CalendarDate`, dải ngày thưa, `canEdit`/`canPublish`, biến đổi optimistic
- [x] 04-07-PLAN.md — Domain (TDD): `parseLocationInput` (tọa độ, link Google Maps, link rút gọn, `no-coordinate` + tách Tên/Địa chỉ D-48/D-49)
- [x] 04-08-PLAN.md — Application + infrastructure: port, use case reorder, Zod DTO, mapper ACL, repository HTTP, short-link resolver
- [x] 04-09-PLAN.md — `createItineraryHooks` (infinite, optimistic, `scope`), composition `itinerary.client.ts`, `appHttp`/`bffUnloadHttp`, test hook
- [x] 04-11-PLAN.md — Nền form itinerary (schema, map lỗi, format) + `CreateItineraryDialog` + `DeleteItineraryDialog`
- [x] 04-13-PLAN.md — `SaveIndicator` + store, chặn rời trang (`beforeunload`, `Link onNavigate`, `LeaveEditorDialog`), `UserMenu compact`
- [x] 04-12-PLAN.md — "Lịch trình của tôi": `CoverImage`, `ItineraryCard`, `MyItinerariesView` (Tabs theo URL, infinite scroll im lặng khi lỗi trang kế), page
- [x] 04-14-PLAN.md — Bản nháp form `sessionStorage` (D-36), bề mặt Dialog/Sheet responsive, `TripInfoDialog` (metadata, preview ảnh bìa)
- [x] 04-16-PLAN.md — `DayTabs` (ngày thưa, km, thêm ngày optimistic) + `DaySubtitle` inline
- [x] 04-18-PLAN.md — Xóa waypoint hoãn 5 giây có hoàn tác, flush khi rời route/`pagehide`/`visibilitychange` (keepalive)
- [x] 04-15-PLAN.md — `TripSummary`, `PublishButton` (`aria-disabled`), `PublishDialog` (không có hộp chia sẻ, D-40)
- [x] 04-17-PLAN.md — `LocationField` (parse + resolve link rút gọn) + `WaypointFormDialog` thêm/sửa
- [x] 04-19-PLAN.md — `WaypointList` kéo thả dnd-kit (chuột, cảm ứng 180ms, bàn phím + announcements tiếng Việt), rollback, `InvalidReorderList`
- [x] 04-20-PLAN.md — `EditorLayout` 4 slot (canvas cho Phase 5), `EditorHeader`, `EditorForbidden` (403), `NotFoundView` dùng chung
- [x] 04-21-PLAN.md — `TimelinePanel`, container `ItineraryEditor` (tải/403/404/lỗi, dialog, khôi phục bản nháp, back D-47), page RSC `/itineraries/[id]/edit`
- [x] 04-22-PLAN.md — Bất biến tĩnh Phase 4, `04-BE-DEPENDENCIES.md`, full suite + build, VALIDATION xanh
- [x] 04-23-PLAN.md — UAT thủ công với BE thật và điện thoại thật (checkpoint; 23/23 bước PASS)
- [x] 04-24-PLAN.md — Tài liệu hợp đồng BE (không code, không ca kiểm thử, 5W1H) cho form tạo 4 khối, danh sách ảnh bìa, `PUT` giữ nguyên trường thiếu; cập nhật `04-BE-DEPENDENCIES.md`
- [x] 04-25-PLAN.md — Checkpoint: user duyệt tài liệu, tự sửa và deploy `tripory_be`, xác nhận bằng một lần tạo thật (mọi plan FE phụ thuộc plan này)
- [x] 04-26-PLAN.md — Domain thuần: `Destination`, tìm không dấu + alias, tên mặc định, số ngày 1-30, 7 sở thích
- [x] 04-27-PLAN.md — `ui-web`: `Accordion`, `ToggleChipGroup`, `NumberStepper`, `RadioGroup`/`Radio`; sửa phần `NumberStepper` của UI-SPEC (D-109)
- [x] 04-28-PLAN.md — `ui-web`: `InlineAlert action`, `DialogContent showCloseButton`/`closeDisabled`, `Sheet fixedSnap`
- [x] 04-29-PLAN.md — Port `DestinationCatalog`, adapter tĩnh 34 điểm đến, composition `destination-catalog.ts` (file riêng, không động `itinerary.client.ts`)
- [x] 04-30-PLAN.md — Read model: điểm đến, sở thích, danh sách ảnh bìa (domain, DTO, mapper, fixture package) + fixture BE của app và 2 test literal (wave 17)
- [x] 04-41-PLAN.md — Đồng bộ 12 test còn lại của app với read model mới, typecheck/lint/test toàn gói app xanh (tách từ 04-30; wave 18)
- [x] 04-31-PLAN.md — Chuỗi ảnh dự phòng (ảnh hiển thị, ảnh mặc định của điểm đến, nền token) cho thẻ và tóm tắt (wave 19)
- [x] 04-32-PLAN.md — `MetadataInput` phương án A (`coverImages` + `selectedCoverIndex`), `withMetadata` optimistic (sửa LW-02) (wave 19)
- [x] 04-33-PLAN.md — Nền chung: schema tạo + khối + map lỗi/`ERROR_MESSAGES` + `ResponsiveFormSurface` mở rộng (wave 20)
- [x] 04-34-PLAN.md — Khối UI form tạo: Điểm đến, Tên, Thời gian, Sở thích, chân form dính đáy (wave 21)
- [x] 04-35-PLAN.md — Cơ chế tự lưu: payload, bộ điều khiển (debounce 800 ms, single-flight + trailing), hook (wave 21)
- [x] 04-36-PLAN.md — Lưới 5 ảnh bìa: domain `cover-images`, `CoverImageField`, khung "Link ảnh", khung trống bấm được bằng chuột/chạm (wave 21)
- [x] 04-37-PLAN.md — Hợp đồng tạo một request + `CreateItineraryDialog` 4 khối accordion (wave 22)
- [x] 04-38-PLAN.md — `TripInfoDialog` tự lưu + lưới ảnh, editor host tự lưu, bỏ bản nháp metadata, dọn export cũ của hộp tạo nhanh (wave 23)
- [x] 04-39-PLAN.md — UAT bổ sung, ghi chú VALIDATION, BE-DEPENDENCIES, PT-01 (repo `tripory`, không commit), bất biến tĩnh, full suite + build (wave 24)
- [x] 04-40-PLAN.md — UAT thủ công cuối phần mở lại (BE thật; desktop, iPhone Safari, Android Chrome; checkpoint; wave 25)

Mở lại lần 2 (2026-11-05, bản đồ trong editor + tab Tổng quan, PUB-06; D-111..D-140):
- [x] 04-42-PLAN.md — Token bản đồ: 8 màu ngày (trỏ primitive, test tương phản ≥ 4.5:1), kích thước pin/chấm/nhãn, độ mờ (wave 26)
- [x] 04-43-PLAN.md — Domain thuần: màu ngày, pin, đường, nhấn mạnh, khung canh, tab mặc định, tóm tắt ngày; tâm/bbox 34 tỉnh (OSM, ODbL) (wave 26)
- [x] 04-44-PLAN.md — Catalog `maplibre-gl` 6.16.0 + `react-map-gl` 8.1.3; style nền riêng OpenFreeMap có lọc Hoàng Sa/Trường Sa theo vùng + test (wave 26)
- [x] 04-48-PLAN.md — Ô "Ngày" trong form thêm mở từ Tổng quan; form sửa không đổi (wave 26)
- [x] 04-45-PLAN.md — `ui-web`: `MapPin`, `MapToneDot`, `MapZoomControls`, `Sheet snap/onSnapChange`, `snapHeightPx` (wave 27)
- [x] 04-46-PLAN.md — `TripMap` (react-map-gl, worker Turbopack, client-only), camera, ghi công, fake cho test jsdom (wave 28)
- [ ] 04-47-PLAN.md — Tab "Tổng quan" trong `DayTabs`, `OverviewSummary`, `DayOverviewRow`, `OverviewPanel`, chuỗi dòng ngày (wave 28)
- [ ] 04-49-PLAN.md — `EditorLayout` slot bản đồ dùng chung desktop/mobile, vùng an toàn theo mức sheet; `EditorMapArea` tải/rỗng/lỗi → TripSummary (wave 29)
- [ ] 04-50-PLAN.md — Danh sách chọn điểm khi bản đồ sẵn sàng (D-126), tách `DayPanel`, điểm nối cho editor (wave 30)
- [ ] 04-51-PLAN.md — Nối bản đồ + Tổng quan vào editor: tab mặc định, đồng bộ chọn pin↔danh sách, canh khung, thêm từ Tổng quan (wave 31)
- [ ] 04-52-PLAN.md — Cổng lint/typecheck/test từng gói + `next build` (worker, tách bundle) + mục E checklist UAT (wave 32)
- [ ] 04-53-PLAN.md — UAT thủ công bản đồ, gồm kiểm bằng mắt Hoàng Sa/Trường Sa (checkpoint; wave 33)

### Phase 5: Map & Public View
**Goal**: Khách chưa đăng nhập mở link chia sẻ và đọc được lịch trình đã xuất bản dưới dạng bài viết hoặc bản đồ; link hiển thị preview đẹp khi dán vào ứng dụng nhắn tin
**Depends on**: Phase 4
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05 (PUB-06 chuyển sang Phase 4 ngày 2026-11-05; PUB-02 về lại đây, chỉ còn nút chuyển Bài viết/Bản đồ)
**Success Criteria** (what must be TRUE):
  1. Khách chưa đăng nhập mở link lịch trình đã xuất bản và thấy trang SSR bố cục bài viết theo ngày
  2. Khách mở lịch trình nháp thấy trang 403, id sai thấy 404; chủ mở nháp thấy banner "Bản nháp – chỉ bạn thấy" và nút Sửa
  3. Người xem chia sẻ được bằng copy link, Web Share trên mobile và mã QR; chủ xuất bản xong trong editor thì hộp chia sẻ mở sẵn và editor có nút "Chia sẻ" (phần ITIN-11 chuyển từ Phase 4); dán link vào Zalo/Messenger hiện preview với tiêu đề, mô tả, ảnh bìa; trang nháp có `noindex`
  4. Trang công khai có nút chuyển Bài viết/Bản đồ, dùng lại component bản đồ đã làm cho editor ở Phase 4 (PUB-02; PUB-06)
**Plans**: TBD
**UI hint**: yes

### Phase 6: Profile & Users
**Goal**: Người dùng quản lý hồ sơ thật, xem lịch trình của mình từ hồ sơ, và tìm được người quen để bắt đầu nhắn tin
**Depends on**: Phase 5
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04
**Success Criteria** (what must be TRUE):
  1. Người dùng xem và sửa họ tên, bio, avatar URL; email hiển thị chỉ đọc
  2. Hồ sơ có tab lịch trình Tất cả/Nháp/Công khai với thao tác nhanh mở, sửa, xóa, chia sẻ
  3. Người dùng đã đăng nhập gõ tìm người khác (có debounce) và không thấy email của họ
  4. Từ danh bạ, bấm "Nhắn tin" mở hội thoại sẵn có hoặc tạo mới với người đó
**Plans**: TBD
**UI hint**: yes

### Phase 7: Chat, Voice & Calls
**Goal**: Hai người quen nhắn tin text và voice theo thời gian thực và gọi thoại được cho nhau dù ở hai mạng khác nhau, song song với FE cũ
**Depends on**: Phase 6
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09, VOICE-01, VOICE-02, VOICE-03, VOICE-04, CALL-01, CALL-02, CALL-03, CALL-04, CALL-05, CALL-06, CALL-07, CALL-08, CALL-09
**Success Criteria** (what must be TRUE):
  1. Người dùng thấy danh sách hội thoại và badge unread tổng cập nhật realtime, mở thread, tải tin cũ, gửi tin text optimistic (lỗi thì Thử lại/Xóa), không thấy tin trùng, thấy "đã xem" chỉ khi người kia đang mở thread ở tab hiển thị
  2. Khi mạng chập chờn, người dùng thấy trạng thái kết nối, app tự kết nối lại và đồng bộ hội thoại; trên mobile danh sách/thread tách riêng, có nút back, bàn phím không che ô nhập
  3. Người dùng ghi âm 1–120 giây rồi gửi, hủy hoặc thử lại khi upload lỗi mà không mất bản ghi; phát voice với play/pause/tua, mỗi lúc một bản; bị từ chối mic hoặc trình duyệt không hỗ trợ (iOS < 18.4) thì thấy thông báo rõ
  4. Hai người ở 4G và Wi-Fi gọi thoại 1-1 thành công với `iceTransportPolicy: 'relay'`, thấy đủ trạng thái đang gọi / đổ chuông / đã kết nối / kết thúc, modal cuộc gọi đến có tên và avatar, cuộc gọi không ngắt khi đổi route; credential TURN đến từ `GET /api/rtc/ice-servers`, secret không có trong bundle
  5. Cuộc gọi không ai nghe tự kết thúc và ghi "Nhỡ", cuộc thứ hai tới khi đang gọi bị từ chối "Bận", ICE disconnected hiện "Đang kết nối lại"; thread hiển thị call log kèm nút "Gọi lại"; FE cũ vẫn nhận đúng tin và cuộc gọi từ FE mới
**Plans**: TBD
**UI hint**: yes
**Research flag**: cần research sâu khi plan (MIME voice thật, TURN qua 4G/Wi-Fi, nhà cung cấp TURN free tier hoặc coturn, tương thích payload hub với FE cũ, transport SignalR)
**External dependency**: Nghiệm thu CHAT-07/CHAT-09 qua WSS, CALL-02 giữa hai mạng thật và CALL-09 cần URL BE công khai (repo `tripory_be`) với CORS cho domain Vercel; tài khoản TURN (free tier hoặc coturn tự chạy) phải có trước khi plan.
**Note**: Phase này gộp 22 requirement (Chat + Voice + Call). Tách thành hai phase sẽ vượt giới hạn 8 phase của granularity `standard`, nên giữ một phase; khi plan nên chia nhiều plan theo nhóm CHAT → VOICE → CALL.

### Phase 8: Deploy & Acceptance Gate
**Goal**: Vài người quen dùng được bản production trên Vercel với BE công khai và có chỗ gửi góp ý
**Depends on**: Phase 7
**Requirements**: DEPL-01, DEPL-02, DEPL-03, DEPL-04
**Success Criteria** (what must be TRUE):
  1. URL production trên Vercel gọi tới URL BE công khai qua biến môi trường; biến server-only và `NEXT_PUBLIC_*` tách rõ, khai báo trong `turbo.json`, không có secret trong bundle
  2. Smoke E2E Playwright chạy xanh trên URL deploy: đăng nhập → tạo và xuất bản lịch trình → xem trang public → nhắn tin giữa hai người
  3. Checklist phụ thuộc BE (HTTPS/WSS, CORS cho Vercel và FE cũ, một instance hoặc sticky session, lưu voice bền) đã được ghi và chuyển sang repo `tripory_be`
  4. Người dùng mở menu user thấy link góp ý và phiên bản build đang chạy
**Plans**: TBD
**UI hint**: yes
**Research flag**: cần research sâu khi plan (region Vercel theo nơi deploy BE, cold start BE)
**External dependency**: Gate này chỉ đóng được khi BE đã deploy công khai (repo `tripory_be`).

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design System, UI Skeleton & Walking Skeleton | 8/8 | Complete | 2026-10-12 |
| 2. HTTP & Shared Kernel | 4/4 | CompleComplete
| 3. Identity & Session (BFF) | 15/15 | Executed (UAT 19/19 PASS, chờ verify-work) | 2026-10-23 |
| 4. Itinerary CRUD & Editor | 41/53 | Reopened lần 2 (41 plan đã xong, UAT 23/23 + mục D 8/8 PASS; BE đã deploy Render; bản đồ trong editor PUB-06 đã lập 12 plan 04-42..04-53, chờ thực thi) | 2026-11-05 (41 plan) |
| 5. Map & Public View | 0/TBD | Not started | - |
| 6. Profile & Users | 0/TBD | Not started | - |
| 7. Chat, Voice & Calls | 0/TBD | Not started | - |
| 8. Deploy & Acceptance Gate | 0/TBD | Not started | - |
