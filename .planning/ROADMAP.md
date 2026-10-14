# Roadmap: Tripory Frontend

## Overview

Milestone 1 đi từ khung giao diện có deploy Vercel ngay từ đầu, qua nền HTTP/kernel và phiên đăng nhập BFF, tới luồng chính của Core Value: tạo, sửa, xuất bản lịch trình, xem trang công khai có bản đồ SVG, quản lý hồ sơ/danh bạ, rồi chat realtime, tin nhắn thoại và gọi thoại qua TURN. Milestone kết thúc bằng một gate nghiệm thu trên URL production để vài người quen dùng thử và góp ý, trong khi FE Vite cũ vẫn chạy song song.

Thứ tự phase giữ đúng lộ trình đã chốt (0a → 0b → 0c → 1 → 2 → 3 → 4 → deploy), đánh số lại thành Phase 1–8.

| Phase GSD | Tên trong PROJECT.md |
|-----------|----------------------|
| 1 | 0a — UI skeleton + walking skeleton |
| 2 | 0b — HTTP + shared kernel |
| 3 | 0c — Identity + session (BFF) |
| 4 | 1 — Itinerary CRUD + editor |
| 5 | 2 — Bản đồ SVG + public view |
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
- [ ] **Phase 3: Identity & Session (BFF)** - Đăng ký, đăng nhập, phiên cookie httpOnly, refresh im lặng và BFF có allowlist
- [ ] **Phase 4: Itinerary CRUD & Editor** - "Lịch trình của tôi" và editor đầy đủ tới bước xuất bản
- [ ] **Phase 5: SVG Map & Public View** - Trang công khai SSR, bản đồ SVG dùng chung, chia sẻ và Open Graph
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
- [ ] 03-02-PLAN.md — `design-tokens` + `ui-web`: token form/user-menu, `Button.loadingLabel`, `PasswordInput`, `InlineAlert`, `DropdownMenuLinkItem`
- [ ] 03-03-PLAN.md — `identity` domain/application: `toSafeNextPath`, ngưỡng token, rule mật khẩu (6 mục đổi mật khẩu), port
- [ ] 03-04-PLAN.md — `identity` infrastructure/react: DTO Zod, claim JWT thật, gateway, hook factory
- [ ] 03-05-PLAN.md — Lõi server: cookie `__Host-`, env, Origin guard, upstream 28 s, session-store
- [ ] 03-06-PLAN.md — Composition client: Web Locks + `refreshSession`, `sessionEvents`/BroadcastChannel, `QueryClient`
- [ ] 03-07-PLAN.md — Route `/api/auth/{login,register,logout,refresh,change-password}`
- [ ] 03-08-PLAN.md — BFF `/api/bff/[...path]` (allowlist, chống traversal, Origin)
- [ ] 03-09-PLAN.md — `proxy.ts`, `viewer.server.ts`, `decideDashboardGate`
- [ ] 03-10-PLAN.md — Nền form: schema Zod, map lỗi, `PasswordChecklist`, `SubmitStatus`, `AuthFormCard`
- [ ] 03-11-PLAN.md — Vòng đời phiên UI: `Providers`, `SessionEffects`, `SessionKeeper`, `SessionRecovery`
- [ ] 03-12-PLAN.md — `LoginForm`, `RegisterForm`, `ChangePasswordForm` và 3 trang
- [ ] 03-13-PLAN.md — `UserMenu`, nút khách, `AccountSlot`, `AppShell`, gate `(dashboard)`
- [ ] 03-14-PLAN.md — Test đối chiếu gate, bất biến bảo mật, checklist phụ thuộc BE, full suite + build
- [ ] 03-15-PLAN.md — UAT thủ công với BE thật (checkpoint; gồm `user@gmail.com` cho D-33)

### Phase 4: Itinerary CRUD & Editor
**Goal**: Người dùng đã đăng nhập tạo, sửa, sắp xếp và xuất bản một lịch trình thật bằng API BE, trên cả desktop và mobile
**Depends on**: Phase 3
**Requirements**: ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05, ITIN-06, ITIN-07, ITIN-08, ITIN-09, ITIN-10, ITIN-11, ITIN-12, ITIN-13, ITIN-14
**Success Criteria** (what must be TRUE):
  1. Người dùng thấy "Lịch trình của tôi" có phân trang và lọc Tất cả/Nháp/Đã xuất bản, tạo nhanh bằng tiêu đề rồi vào thẳng editor, và xóa được lịch trình sau khi xác nhận
  2. Trong editor, người dùng sửa metadata (tiêu đề, mô tả, ngày khởi hành, ảnh bìa URL có preview), chuyển/thêm ngày, sửa phụ đề ngày inline, thêm/sửa waypoint bằng cách dán tọa độ "lat, lng" hoặc link Google Maps, và thấy quãng đường theo ngày cùng tổng do BE tính
  3. Người dùng xóa waypoint và hoàn tác được trong 5 giây; kéo thả sắp xếp waypoint trong ngày bằng chuột, cảm ứng hoặc bàn phím, thấy rollback khi BE lỗi
  4. Người dùng luôn thấy trạng thái Đang lưu / Đã lưu / Lỗi – thử lại, được cảnh báo khi rời trang lúc còn request; xuất bản được khi có ≥ 1 waypoint sau khi xác nhận không thể hủy, rồi thấy hộp chia sẻ
  5. Người không phải chủ không thấy thao tác sửa; trên mobile, timeline nằm trong bottom sheet nhiều mức và vẫn thao tác đủ các bước trên
**Plans**: TBD
**UI hint**: yes
**Research flag**: cần research sâu khi plan (parse link Google Maps, dnd-kit với React 19 StrictMode, `CalendarDate`, mapper ngày thưa)

### Phase 5: SVG Map & Public View
**Goal**: Khách chưa đăng nhập mở link chia sẻ và đọc được lịch trình đã xuất bản dưới dạng bài viết hoặc bản đồ SVG; link hiển thị preview đẹp khi dán vào ứng dụng nhắn tin
**Depends on**: Phase 4
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06
**Success Criteria** (what must be TRUE):
  1. Khách chưa đăng nhập mở link lịch trình đã xuất bản và thấy trang SSR bố cục bài viết theo ngày; chuyển sang Bản đồ SVG thấy pin theo ngày, polyline, zoom/pan, chọn điểm đồng bộ với danh sách
  2. Khách mở lịch trình nháp thấy trang 403, id sai thấy 404; chủ mở nháp thấy banner "Bản nháp – chỉ bạn thấy" và nút Sửa
  3. Người xem chia sẻ được bằng copy link, Web Share trên mobile và mã QR; dán link vào Zalo/Messenger hiện preview với tiêu đề, mô tả, ảnh bìa; trang nháp có `noindex`
  4. Editor hiển thị cùng component bản đồ SVG với trang công khai
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
| 2. HTTP & Shared Kernel | 4/4 | Complete | 2026-10-12 |
| 3. Identity & Session (BFF) | 0/TBD | Not started | - |
| 4. Itinerary CRUD & Editor | 0/TBD | Not started | - |
| 5. SVG Map & Public View | 0/TBD | Not started | - |
| 6. Profile & Users | 0/TBD | Not started | - |
| 7. Chat, Voice & Calls | 0/TBD | Not started | - |
| 8. Deploy & Acceptance Gate | 0/TBD | Not started | - |
