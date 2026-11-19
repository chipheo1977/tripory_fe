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
| 5.1 | (chèn 2026-11-09) Like + comment lịch trình |
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
- [x] **Phase 4: Itinerary CRUD & Editor** - "Lịch trình của tôi" và editor đầy đủ tới bước xuất bản (reopened 2026-10-30: form tạo 4 khối thay tạo nhanh (ITIN-02), nhiều ảnh bìa và tự lưu "Thông tin chuyến đi" (ITIN-03) đã xong 41/41 plan; mở lại lần 2 2026-11-05: bản đồ MapLibre + OpenFreeMap trong editor và tab Tổng quan (PUB-06), 12 plan 04-42..04-53 đã xong; UAT mục E 14/14 PASS do người dùng xác nhận; verify phase 2026-11-06; mở lại lần 3 2026-11-06: tìm địa điểm Photon/Nominatim trong form thêm/sửa điểm (MAP-01), 4 plan 04-55..04-58 đã xong)
 (completed 2026-11-07)
- [x] **Phase 5: Map & Public View** - Trang công khai SSR, chuyển Bài viết/Bản đồ (dùng lại bản đồ của editor), chia sẻ và Open Graph (code xong 2026-11-12, 19/19 plan; UAT thủ công còn mở: `05-HUMAN-UAT.md`)
- [ ] **Phase 5.1: Itinerary Likes & Comments (INSERTED)** - Like và comment lịch trình đã xuất bản trên trang công khai; cần BE thêm API trước (hợp đồng BE rồi checkpoint deploy `tripory_be`)
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
**Requirements**: ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05, ITIN-06, ITIN-07, ITIN-08, ITIN-09, ITIN-10, ITIN-11, ITIN-12, ITIN-13, ITIN-14, PUB-06, MAP-01 (MAP-01 chuyển từ v2 vào Phase 4 ngày 2026-11-06, mở lại lần 3)
**Success Criteria** (what must be TRUE):
  0. (PUB-06, mở lại lần 2 2026-11-05, đã lập kế hoạch 04-42..04-53) Editor hiển thị bản đồ dùng chung (MapLibre + OpenFreeMap, style riêng thể hiện Hoàng Sa, Trường Sa thuộc Việt Nam): pin màu theo ngày có số thứ tự, đường nối trong ngày, zoom/pan, chọn điểm đồng bộ với danh sách; dải tab ngày có tab "Tổng quan" hiện mọi ngày
  1. Người dùng thấy "Lịch trình của tôi" có phân trang và lọc Tất cả/Nháp/Đã xuất bản, tạo lịch trình trong một modal 4 khối accordion (điểm đến trong 34 tỉnh/thành, tên mặc định theo điểm đến, ngày khởi hành và số ngày, sở thích) rồi vào thẳng editor với đủ số ngày đã chọn và ảnh bìa mặc định theo điểm đến, và xóa được lịch trình sau khi xác nhận (thay tạo nhanh bằng tiêu đề, mở lại 2026-10-30; BE lưu điểm đến, sở thích, ngày khởi hành, số ngày và ảnh bìa mặc định trong một request)
  2. Trong editor, người dùng sửa metadata (tiêu đề, mô tả, ngày khởi hành, ảnh bìa URL có preview; mở lại 2026-10-30: tự lưu không có nút Lưu, tối đa 5 ảnh bìa dạng lưới và chọn một ảnh hiển thị), chuyển/thêm ngày, sửa phụ đề ngày inline, thêm/sửa waypoint bằng tìm địa điểm, hoặc dán tọa độ "lat, lng"/link Google Maps (mở lại lần 3 2026-11-06: tìm địa điểm là lối chính, xem tiêu chí 6), và thấy quãng đường theo ngày cùng tổng do BE tính
  3. Người dùng xóa waypoint và hoàn tác được trong 5 giây; kéo thả sắp xếp waypoint trong ngày bằng chuột, cảm ứng hoặc bàn phím, thấy rollback khi BE lỗi
  4. Người dùng luôn thấy trạng thái Đang lưu / Đã lưu / Lỗi – thử lại, được cảnh báo khi rời trang lúc còn request; xuất bản được khi có ≥ 1 waypoint sau khi xác nhận không thể hủy, rồi thấy lịch trình chuyển sang "Đã xuất bản" (hộp chia sẻ sau khi xuất bản chuyển sang Phase 5 theo `04-CONTEXT.md` D-40)
  5. Người không phải chủ không thấy thao tác sửa; trên mobile, timeline nằm trong bottom sheet nhiều mức và vẫn thao tác đủ các bước trên
  6. (MAP-01, mở lại lần 3 2026-11-06, đã lập kế hoạch 04-55..04-58) Trong form thêm/sửa điểm, ô "Vị trí" mặc định là ô tìm địa điểm trong phạm vi Việt Nam (Photon, dự phòng Nominatim cho reverse, gọi qua BFF `/api/places/*`): chưa gõ thì thấy gợi ý theo điểm đến (Tham quan, Ăn uống, Lưu trú), gõ từ 2 ký tự thì thấy kết quả; chọn một kết quả thì tự điền vị trí, địa chỉ và tên (chỉ khi Tên trống hoặc là giá trị tự điền), không đổi Ghi chú; lối phụ "Nhập tọa độ thủ công" vẫn nhận tọa độ/link Google Maps và tọa độ mới được tra địa chỉ để tự điền; không kết quả nào nằm ở Hoàng Sa, Trường Sa hoặc ngoài Việt Nam; nhà cung cấp lỗi thì có thông báo tiếng Việt, "Thử lại" và vẫn lưu được bằng tọa độ thủ công (D-141..D-153)
**Plans**: 41 plans, đã xong cả 41 (23 plan đầu + 18 plan mở lại 04-24..04-41 cho ITIN-02, ITIN-03: tài liệu hợp đồng BE, checkpoint BE 04-25, rồi FE và UAT; 04-41 tách từ 04-30 nên xếp ở wave 18, trước 04-31; UAT mục D 8/8 PASS trên BE local 2026-11-05) + 12 plan mở lại lần 2, đã xong cả 12 (04-42..04-53, bản đồ trong editor và tab Tổng quan, PUB-06; quyết định ở `04-CONTEXT.md` D-111..D-140, research ở `04-RESEARCH.md` mục "Mở lại lần 2 (2026-11-05): bản đồ"; wave 26-33, 04-53 là checkpoint UAT) + 4 plan mở lại lần 3, đã xong cả 4 (04-55..04-58; tìm địa điểm, MAP-01; quyết định ở `04-CONTEXT.md` D-141..D-153; wave 34-37, 04-58 là checkpoint UAT mục F, đóng theo xác nhận hoàn thành của người dùng 2026-11-07). Mã 04-54 đã dùng cho commit nút ghi công "i" (D-114, không có file plan)
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
- [x] 04-47-PLAN.md — Tab "Tổng quan" trong `DayTabs`, `OverviewSummary`, `DayOverviewRow`, `OverviewPanel`, chuỗi dòng ngày (wave 28)
- [x] 04-49-PLAN.md — `EditorLayout` slot bản đồ dùng chung desktop/mobile, vùng an toàn theo mức sheet; `EditorMapArea` tải/rỗng/lỗi → TripSummary (wave 29)
- [x] 04-50-PLAN.md — Danh sách chọn điểm khi bản đồ sẵn sàng (D-126), tách `DayPanel`, điểm nối cho editor (wave 30)
- [x] 04-51-PLAN.md — Nối bản đồ + Tổng quan vào editor: tab mặc định, đồng bộ chọn pin↔danh sách, canh khung, thêm từ Tổng quan (wave 31)
- [x] 04-52-PLAN.md — Cổng lint/typecheck/test từng gói + `next build` (worker, tách bundle) + mục E checklist UAT (wave 32)
- [x] 04-53-PLAN.md — UAT thủ công bản đồ, gồm kiểm bằng mắt Hoàng Sa/Trường Sa (checkpoint; wave 33)

Mở lại lần 3 (2026-11-06, tìm địa điểm trong form thêm điểm, MAP-01; D-141..D-153):
- [x] 04-55-PLAN.md — Domain `place.ts` (phân loại, ghép địa chỉ, chủ quyền Hoàng Sa/Trường Sa, tự điền) + port `PlaceSearchProvider`/`PlaceLookup` + `createPlaceSearchService` (wave 34)
- [x] 04-56-PLAN.md — Adapter Photon, Nominatim reverse, HTTP lookup + BFF `/api/places/{search,suggestions,reverse}` (phiên, Origin, giới hạn theo user, cache TTL, env `PHOTON_BASE_URL`/`NOMINATIM_BASE_URL`) + mã lỗi (wave 35)
- [x] 04-57-PLAN.md — `createPlaceHooks`, `places.client.ts`, `SearchInput inputRef`, combobox tìm địa điểm + gợi ý + tự điền + reverse cho tọa độ nhập tay, nối vào `WaypointFormDialog` (wave 36)
- [x] 04-58-PLAN.md — Mục F checklist UAT tìm địa điểm và UAT thủ công (checkpoint; wave 37). Mục F (F1..F12) có trong `04-UAT-CHECKLIST.md`; ngày 2026-11-07 người dùng xác nhận hoàn thành phase, F1..F12 ghi "chấp nhận theo xác nhận của người dùng, agent không kiểm độc lập" (không phải PASS từng bước)

### Phase 5: Map & Public View
**Goal**: Khách chưa đăng nhập mở link chia sẻ và đọc được lịch trình đã xuất bản dưới dạng bài viết hoặc bản đồ; link hiển thị preview đẹp khi dán vào ứng dụng nhắn tin
**Depends on**: Phase 4
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05 (PUB-06 chuyển sang Phase 4 ngày 2026-11-05; PUB-02 về lại đây, chỉ còn nút chuyển Bài viết/Bản đồ)
**Success Criteria** (what must be TRUE):
  1. Khách chưa đăng nhập mở link lịch trình đã xuất bản và thấy trang SSR bố cục bài viết theo ngày
  2. Khách mở lịch trình nháp thấy trang 403, id sai thấy 404; chủ mở nháp thấy banner "Bản nháp – chỉ bạn thấy" và nút Sửa
  3. Người xem chia sẻ được bằng copy link, Web Share trên mobile và mã QR; chủ xuất bản xong trong editor thì hộp chia sẻ mở sẵn và editor có nút "Chia sẻ" (phần ITIN-11 chuyển từ Phase 4); dán link vào Zalo/Messenger hiện preview với tiêu đề, mô tả, ảnh bìa; trang nháp có `noindex`
  4. Trang công khai có nút chuyển Bài viết/Bản đồ, dùng lại component bản đồ đã làm cho editor ở Phase 4 (PUB-02; PUB-06)
**Plans**: 19 plans in 7 waves (lập 2026-11-11; 6 plan wave 1 độc lập; chỉ phụ thuộc BE-05-01 `author`, không chặn; không có plan cho Phase 5.1 like/comment)

Plans:
- [x] 05-01-PLAN.md — Nền tảng: `uqr` 0.1.3 (pin cứng trong `catalog:`), token `--share-qr-size`, `htmlLimitedBots` thêm Zalo/Facebot/meta-externalagent + test (wave 1)
- [x] 05-02-PLAN.md — `ui-web`: `SegmentedControl` chọn một (bàn phím, `aria-pressed`, không rỗng) cho viên thuốc Bài viết/Bản đồ (wave 1)
- [x] 05-03-PLAN.md — ACL `author` tùy chọn (DTO, mapper, avatar dicebear → null), fixture domain cho test UI, tài liệu `05-BE-DEPENDENCIES.md` (BE-05-01 và tồn đọng Phase 4) (wave 1)
- [x] 05-04-PLAN.md — Tách route group `(public)` thành `(site)` (giữ AppShell) để chừa chỗ `(viewer)` toàn màn hình; sửa `route-layouts.test.tsx` (wave 1)
- [x] 05-05-PLAN.md — Mở rộng tương thích ngược `EditorMapArea`, `EditorLayout` (xuất `WideBody`/`NarrowBody`/đo header, slot cạnh chip "Lịch trình", `z-sticky`), `CoverImage` `loading` (wave 1)
- [x] 05-06-PLAN.md — Loader SSR `loadPublicItinerary` (ok/forbidden/not-found/recover/error, Bearer chỉ khi phiên tươi), `itinerary.server.ts` (`React.cache`), `PUBLIC_SITE_URL` (wave 2)
- [x] 05-07-PLAN.md — Metadata OG + `noindex` thuần (trung tính khi không phải ok), ảnh OG mặc định `/og-default.png` (`ImageResponse`, dự phòng PNG tĩnh) (wave 3)
- [x] 05-08-PLAN.md — Chế độ Bài viết: hàm định dạng, `AuthorLine`, `ArticleHero`, `ArticleWaypoint`, `ArticleDaySection` (wave 2)
- [x] 05-09-PLAN.md — Chia sẻ phần động cơ: ma trận QR (`uqr`), `QrCode` JSX, tải PNG, hook sao chép/Web Share/URL gốc (wave 2)
- [x] 05-10-PLAN.md — Dải chip ngày (IntersectionObserver, nhảy ngày không đổi hash), `PublicArticle` (wave 3)
- [x] 05-11-PLAN.md — `ShareDialog` + `ShareButton` (sao chép, Web Share điều kiện, QR, "Mở trang công khai"), thu hẹp invariant "Chia sẻ" (wave 3)
- [x] 05-12-PLAN.md — `usePublicView` (`?view` + `pushState`), `ViewModeToggle` (giữ focus khi đổi chỗ), `PublicHeader`, `DraftStrip`, `EditLink` (wave 2)
- [x] 05-13-PLAN.md — Trạng thái: `PublicForbidden` (403), `PublicItinerarySkeleton` (cold start), `PublicLoadError`, khung `PublicStatusFrame` (wave 3)
- [x] 05-14-PLAN.md — Thân chỉ đọc của chế độ Bản đồ: `PublicDayTabs`, Tổng quan, tab Ngày, `PublicWaypointItem`, `MapsLink` dùng chung (wave 4)
- [x] 05-15-PLAN.md — `usePublicMapState` + `PublicMapMode` (bản đồ chỉ đọc, sheet 3 mức, viên thuốc trong sheet/dải đáy, lỗi + "Xem dạng bài viết") (wave 5)
- [x] 05-16-PLAN.md — Điều hướng đổi từ Phase 4: menu thẻ "Xem trang công khai" (D-24), không phải chủ + đã xuất bản → chuyển sang trang công khai (D-25) (wave 1)
- [x] 05-17-PLAN.md — Editor: nút "Chia sẻ" thế nút Xuất bản, xuất bản → hộp chia sẻ tự mở → toast sau khi đóng (D-15, U-04) (wave 4)
- [x] 05-18-PLAN.md — Ghép trang công khai: route `(viewer)/itineraries/[id]` (`generateMetadata`, loading, error), RSC phân loại kết quả, container client hai chế độ (wave 6)
- [x] 05-19-PLAN.md — Bất biến tĩnh Phase 5, cổng kiểm toàn repo + `next build` + kiểm chứng SSR/OG/bot/bundle bằng BE giả, `05-UAT-CHECKLIST.md` (wave 7)

**UI hint**: yes

### Phase 5.1: Itinerary Likes & Comments (INSERTED)
**Goal**: Người xem trang công khai `/itineraries/[id]` like và comment được lịch trình đã xuất bản bằng API thật của BE; khách chưa đăng nhập vẫn xem được
**Depends on**: Phase 5 (like/comment hiện trên trang công khai `/itineraries/[id]` do Phase 5 dựng); API like/comment của `tripory_be` (phụ thuộc ngoài, chưa có, xem External dependency)
**Requirements**: SOC-01, SOC-02 (chuyển từ v2 BE-02 "Like, comment" vào v1 ngày 2026-11-09, chèn phase 5.1)
**Success Criteria** (what must be TRUE; phạm vi chi tiết đã chốt ở `05.1-CONTEXT.md` D-01..D-29, giao diện ở `05.1-UI-SPEC.md`):
  1. Người đã đăng nhập like và bỏ like được một lịch trình đã xuất bản trên trang công khai và thấy số like
  2. Người đã đăng nhập đọc và gửi được comment trên trang công khai
  3. Khách chưa đăng nhập xem được trang công khai cùng số like và comment
  4. Mọi người đã đăng nhập (kể cả chủ) like được một lần mỗi lịch trình; comment phẳng 1..500 ký tự hiển thị như chữ thường, tác giả hoặc chủ lịch trình xóa được, phân trang 10, mới nhất trước; khách bấm tim hoặc muốn bình luận được dẫn sang đăng nhập rồi quay lại đúng trang; bản nháp không có like/comment
**Plans**: 19 plans in 10 waves (lập 2026-11-12). Thứ tự bắt buộc: 05.1-01 là tài liệu hợp đồng BE (không code, không ca kiểm thử, theo mẫu 04-24), 05.1-02 là checkpoint người dùng tự sửa và deploy `tripory_be`, xác nhận bằng lời gọi thật (theo mẫu 04-25); MỌI plan FE (05.1-03..05.1-19) phụ thuộc 05.1-02, test dùng fixture DTO đúng hợp đồng và repository giả, không mock ở runtime

Plans:
- [x] 05.1-01-PLAN.md — Hợp đồng BE (tài liệu, không code, không ca kiểm thử, 5W1H): 6 endpoint dưới `/api/v1/itineraries` (PUT/DELETE/GET like, GET/POST comments, DELETE comment), DTO, mã lỗi, phân trang, giới hạn tần suất theo người dùng, ba trường đếm của chi tiết, tác giả comment dùng chung kiểu với `author` (wave 1)
- [x] 05.1-02-PLAN.md — Checkpoint: người dùng tự sửa và deploy `tripory_be`, xác nhận bằng 15 điều kiện nghiệm thu thủ công (wave 2, `autonomous: false`)
- [x] 05.1-03-PLAN.md — Package `@tripory/social`: domain (luật nội dung, quyền xóa, trạng thái like, trộn trang), application (port + use case gửi comment), fixture dùng chung (wave 3)
- [x] 05.1-04-PLAN.md — `ERROR_MESSAGES` thêm 6 mã like/comment, `selectErrorMessage`/`MutationFeedback` có câu dự phòng theo ngữ cảnh (wave 3)
- [x] 05.1-05-PLAN.md — ACL `itinerary`: ba trường đếm thành `Itinerary.engagement` tùy chọn, fixture, loader SSR (wave 3)
- [x] 05.1-06-PLAN.md — Nền UI social: định dạng số/thời gian, chuỗi UI khóa, phím tắt Ctrl/Cmd+Enter, nhận biết macOS, đường dẫn đăng nhập của khách (wave 3)
- [x] 05.1-07-PLAN.md — Infrastructure `social`: DTO Zod, mapper ACL, repository HTTP qua BFF (wave 4)
- [x] 05.1-08-PLAN.md — Hook React Query: like tuần tự ý định cuối thắng + đồng bộ D-27, danh sách comment phân trang bỏ trùng, gửi, xóa (wave 4)
- [x] 05.1-09-PLAN.md — Điểm chèn slot tùy chọn trong hero, bài viết, tab Tổng quan và `PublicItineraryPage` nhận factory social (wave 4)
- [x] 05.1-10-PLAN.md — Mảnh trình bày danh sách comment: `CommentItem`, `CommentList`, skeleton/rỗng/lỗi, "Xem thêm" (wave 4)
- [x] 05.1-11-PLAN.md — Composition `social.client` và `SocialProvider` (một nguồn trạng thái cho hai chế độ) (wave 5)
- [x] 05.1-12-PLAN.md — Nút tim `LikeControl` và `ConnectedLikeControl` (khách là link, nhánh Suspense riêng) (wave 6)
- [x] 05.1-13-PLAN.md — `CommentComposer` (đếm sau trim, phím tắt an toàn với bộ gõ) và `CommentGuestPrompt` (wave 4)
- [x] 05.1-14-PLAN.md — `DeleteCommentDialog` (xác nhận xóa, focus an toàn) (wave 4)
- [x] 05.1-15-PLAN.md — `CommentSection`: controller, khung section, mọi trạng thái, gửi/xóa/tải thêm, focus và cuộn từ "Xem bình luận" (wave 6)
- [x] 05.1-16-PLAN.md — `OverviewSocialRow` cho tab Tổng quan và lớp keo `PublicSocialOverview` (wave 7)
- [ ] 05.1-17-PLAN.md — Tích hợp trang công khai: `makePublicSocial`, route truyền factory, test hai chế độ (wave 8)
- [ ] 05.1-18-PLAN.md — Bất biến tĩnh Phase 5.1, cổng kiểm toàn repo + `next build`, kiểm chứng SSR/BFF bằng BE giả (wave 9)
- [ ] 05.1-19-PLAN.md — `05.1-UAT-CHECKLIST.md` kịch bản UAT thủ công (wave 10)
**UI hint**: yes
**External dependency**: `tripory_be` chưa có API like/comment. FE không dựng mock (quyết định "Không dựng mock cho tính năng backend chưa hỗ trợ" ở PROJECT.md), nên không plan FE nào chạy trước khi BE có API thật.
**Note**: Chèn ngày 2026-11-09 theo yêu cầu người dùng "thêm like/comment ở milestone này". Phase 5 giữ nguyên phạm vi, `05-CONTEXT.md` không đổi. Roadmap từng ghi giới hạn 8 phase của granularity `standard` (xem Note của Phase 7); phase thập phân không thêm phase nguyên, Phase 6-8 giữ nguyên số nên giới hạn đó không bị vượt.

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
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 5.1 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design System, UI Skeleton & Walking Skeleton | 8/8 | Complete | 2026-10-12 |
| 2. HTTP & Shared Kernel | 4/4 | CompleComplete
| 3. Identity & Session (BFF) | 15/15 | Executed (UAT 19/19 PASS, chờ verify-work) | 2026-10-23 |
| 4. Itinerary CRUD & Editor | 57/57 (04-01..04-58, không có file plan 04-54) | Complete (UAT 23/23, mục D 8/8 và mục E 14/14 PASS do người dùng xác nhận; mục F tìm địa điểm F1..F12 và sửa chân form Sheet mobile 738c9a2 được người dùng chấp nhận khi xác nhận hoàn thành, agent không kiểm độc lập; chưa kiểm trên thiết bị cảm ứng thật, xem 04-VERIFICATION.md) | 2026-11-07 |
| 5. Map & Public View | 19/19 | Code complete, chờ UAT thủ công | 2026-11-12 |
| 5.1. Itinerary Likes & Comments (INSERTED) | 0/19 | Planned (19 plan, 10 wave; plan FE chờ checkpoint 05.1-02: người dùng sửa và deploy `tripory_be`) | - |
| 6. Profile & Users | 0/TBD | Not started | - |
| 7. Chat, Voice & Calls | 0/TBD | Not started | - |
| 8. Deploy & Acceptance Gate | 0/TBD | Not started | - |
