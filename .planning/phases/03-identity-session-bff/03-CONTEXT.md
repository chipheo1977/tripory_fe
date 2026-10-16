# Phase 3: Identity & Session (BFF) - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase này giao:

1. Đăng ký, đăng nhập, đăng xuất, đổi mật khẩu với BE thật (AUTH-01, 02, 04, 06).
2. Phiên trong cookie httpOnly, refresh im lặng single-flight trong tab và Web Locks giữa các tab, refresh chủ động trước hạn (AUTH-03, Phase 2 D-15).
3. Auth gate cho `(dashboard)` với `?next=` chỉ nhận path nội bộ (AUTH-05).
4. Menu user theo phiên thật (AUTH-07, xem D-16 về phần hoàn tất dần).
5. BFF `/api/bff/[...path]` có allowlist `users|itineraries|chat`, chặn `auth/*`, kiểm Origin (AUTH-08).
6. Mount `Toast` và `QueryClientProvider` (`retry: false`), nối chính sách toast của Phase 2 vào mutation thật. Đây là nơi nghiệm thu toast thật mà Phase 2 đã chuyển sang.

Nằm ngoài phase:
- Trang hồ sơ (Phase 6), tin nhắn và SignalR (Phase 7).
- `GET /api/auth/token` cho SignalR thuộc CHAT-09, Phase 7. Planner có thể dựng sẵn nếu rẻ, nhưng không bắt buộc.
- Ngắt realtime khi đăng xuất (AUTH-04) chỉ là chỗ móc. Phase 7 nối vào.
- Quên mật khẩu, xác thực email: BE không có.
- Revoke refresh token khi logout: giới hạn đã chấp nhận.

</domain>

<decisions>
## Implementation Decisions

### Màn đăng nhập / đăng ký
- **D-01:** Hai trang riêng `/login` và `/register` thuộc `(public)`, có link qua lại. Link qua lại **giữ nguyên `?next=`**.
- **D-02:** Đăng ký thành công thì **tự đăng nhập luôn**. Nếu `POST /auth/register` của BE trả token thì dùng token đó. Nếu không, route `/api/auth/register` tự gọi login bằng credential vừa nhập. Researcher kiểm response của BE.
- **D-03:** Sau khi đăng nhập hoặc đăng ký, đi tới `next` hợp lệ. Không có `next` thì tới **`/itineraries/mine`**. `next` không hợp lệ (ra ngoài origin, `//host`, scheme lạ…) thì bỏ qua và dùng đích mặc định.
- **D-04:** Người đã đăng nhập mở `/login` hoặc `/register` thì `proxy.ts` **redirect ngay** sang `next` hợp lệ, không có thì sang `/itineraries/mine`. Đây là kiểm tra lạc quan theo sự có mặt của cookie.
- **D-05:** Đăng nhập sai (hoặc lỗi không gắn được vào field) hiện **thông báo inline ở đầu form, có `role="alert"`**. Giữ email đã nhập, xóa ô mật khẩu. Mutation đăng nhập và đăng ký đặt `errorToast: false`, đúng ngoại lệ D-09 của Phase 2 (mutation tự xử lý lỗi). Lỗi có field thì gắn vào ô theo D-05 và D-05a của Phase 2.
- **D-06:** Bố cục: hai trang nằm trong **AppShell public (có AppHeader)**. Form là `Card` căn giữa, rộng tối đa khoảng 400px.
- **D-07:** **Có toast thành công**. Đăng nhập hiện "Chào mừng, {tên}", đăng ký hiện "Tạo tài khoản thành công". Đây là opt-in theo D-07 và D-08 của Phase 2.

### Auth gate và trạng thái khách
- **D-08:** Khách thấy **một nút "Đăng nhập"** ở vị trí UserMenu, trỏ tới `/login?next=<path hiện tại>`. Không có nút "Đăng ký" trên header. Trên `/login` thì không cần gắn `next` trỏ về chính nó.
- **D-09:** Trang `/` **giữ nguyên cho mọi người**, không redirect và không thêm CTA (giữ D-13 của Phase 1).
- **D-10:** **Cả route group `(dashboard)` được gate theo mặc định**, còn `(public)` mở. Route mới thêm vào `(dashboard)` tự được bảo vệ. `/settings/password` (D-17) cũng nằm trong `(dashboard)`. `proxy.ts` chỉ kiểm tra lạc quan. Trang vẫn phải tự xử lý trường hợp có cookie nhưng phiên đã chết (D-24, D-25).
- **D-11:** Lúc đang đọc phiên (Suspense fallback do `cacheComponents`), header hiện **Skeleton tròn cỡ avatar** ở chỗ UserMenu, không để nháy nút "Đăng nhập".

### Menu user
- **D-12:** Nút mở menu: **mobile chỉ có avatar**. **Từ `sm` trở lên có avatar kèm tên**, tên dài thì cắt bằng ellipsis. Không có `avatarUrl` thì hiện chữ cái đầu (fallback sẵn có của `Avatar`). Vùng chạm ≥ 44px, có tên truy cập.
- **D-13:** Đầu menu: **tên kèm email** (chữ nhỏ, màu phụ), sau đó là separator.
- **D-14:** Các mục trong Phase 3: "Lịch trình của tôi" (`/itineraries/mine`), "Đổi mật khẩu" (`/settings/password`), "Đăng xuất".
- **D-15:** "Hồ sơ" và "Tin nhắn" **hiện dạng mục disabled** (`aria-disabled`, không có `href`, không điều hướng), kèm badge **"Sắp có"**. Phase 6 bật "Hồ sơ", Phase 7 bật "Tin nhắn". Đây là **ngoại lệ có chủ đích** do người dùng chọn, so với nguyên tắc "không dựng thứ giả". Nó không phạm luật "không link tới route chưa tồn tại" của Phase 1, vì không phải link. Mục disabled vẫn phải đọc được bằng trình đọc màn hình.
- **D-16:** AUTH-07 được **hoàn tất dần**: Phase 3 giao avatar, tên, Đăng xuất và hai mục disabled. Phase 6 và 7 bật mục tương ứng. Nguồn tên, avatar, email (claim JWT hay `GET /users/me`) do researcher chốt.

### Đổi mật khẩu
- **D-17:** Trang riêng **`/settings/password`** trong `(dashboard)`. Có nút phụ "Hủy" quay về `/itineraries/mine`.
- **D-18:** Đổi thành công thì **đăng xuất, chuyển sang `/login`, toast "Đã đổi mật khẩu, vui lòng đăng nhập lại"**. Làm vậy bất kể BE có revoke refresh token hay không. Cookie bị xóa, broadcast đăng xuất giống D-22.
- **D-19:** Sai mật khẩu hiện tại thì lỗi **gắn dưới ô "Mật khẩu hiện tại"** và focus chuyển về ô đó, các ô khác giữ nguyên. Nếu BE chỉ trả `errorCode` mà không có tên field, FE map mã đó sang field này. Lỗi "mật khẩu mới trùng mật khẩu cũ" gắn vào ô "Mật khẩu mới" theo cùng cách. Researcher liệt kê `errorCode` thật.

### Hết phiên và đăng xuất
- **D-20:** Hết phiên thật (`onSessionExpired`, Phase 2 D-14 và D-14a) thì **chuyển sang `/login?next=<path hiện tại>` kèm toast "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"**. Lỗi refresh tạm thời (mạng, timeout, 5xx/cold start) **không** đăng xuất: giữ cookie, hiện câu chung D-04, đúng D-14a. Thay đổi chưa lưu có thể mất. Rủi ro này được chấp nhận, Phase 4 tự cân nhắc.
- **D-21:** Đăng xuất **không cần xác nhận**. Xong thì **về `/`, không toast**. Phase 7 có thể thêm xác nhận nếu đang trong cuộc gọi.
- **D-22:** **Đồng bộ giữa các tab qua `BroadcastChannel`** (cùng origin):
  - Đăng xuất ở một tab thì các tab khác chuyển về `/`, không toast.
  - Đăng nhập ở một tab thì các tab khác làm mới header. Tab đang ở `/login` hoặc `/register` thì chuyển theo `next` hợp lệ, không có thì sang `/itineraries/mine`.
  - Đổi mật khẩu phát cùng tín hiệu với đăng xuất.
  - Đây là kênh riêng cho phiên, không phải UX-06 (chuông cuộc gọi). Adapter `BroadcastChannel` nằm ở `apps/web/src/composition/**`, không nằm trong package.
- **D-23:** Hook cho AUTH-04 "ngắt realtime khi đăng xuất": composition có một chỗ móc (danh sách callback khi đăng xuất). Phase 7 đăng ký SignalR và cuộc gọi vào đó. Phase 3 không có kết nối realtime nào để ngắt.
- **D-24:** Mở hoặc reload trang dashboard đúng lúc access token vừa hết hạn mà refresh token còn: **hồi phục im lặng**. RSC không refresh (theo research). Trang render một client component nhỏ, chạy refresh qua đúng đường single-flight và Web Locks, xong thì `router.refresh()`. Người dùng chỉ thấy skeleton lâu hơn một chút. Refresh thất bại thật thì theo D-20. Cơ chế cụ thể do researcher chốt.
- **D-25:** `proxy.ts` **không** redirect sang `/login` chỉ vì access token hết hạn. Chỉ redirect khi không còn cookie phiên nào. Điều này để giữ tiêu chí 2 "reload không bị đăng xuất".

### Form và mật khẩu
- **D-26:** Rule mật khẩu là **checklist dưới ô mật khẩu mới, tự đánh dấu khi gõ**. Đạt hay chưa thể hiện bằng icon kèm chữ, không chỉ dựa vào màu. Khu vực có `aria-live="polite"`. Rule được thấy **trước khi nhập** (AUTH-06).
- **D-27:** **Cùng một component checklist** cho đăng ký và đổi mật khẩu, rule truyền vào theo **đúng validator BE của từng form**. Theo research: đăng ký ≥ 8 ký tự. Đổi mật khẩu: chữ hoa, chữ thường, số, ký tự đặc biệt, khác mật khẩu cũ. FE **không tự thêm rule mạnh hơn BE**. Researcher xác nhận rule thật từ validator BE.
- **D-28:** **Ô "Nhập lại mật khẩu" có ở cả `/register` và `/settings/password`**. **Mọi ô mật khẩu** (kể cả login) có nút hiện/ẩn: `IconButton` với `aria-label` "Hiện mật khẩu"/"Ẩn mật khẩu" và `aria-pressed`. Ô dùng `autocomplete` đúng chuẩn (`email`, `current-password`, `new-password`, `name`).
- **D-29:** **Validate đầy đủ phía client bằng Zod**: email đúng dạng, họ tên 1–100 ký tự, rule mật khẩu theo D-27, nhập lại phải khớp. Lỗi hiện **khi blur và khi Gửi**, đã có lỗi thì cập nhật khi gõ. **Nút Gửi luôn bấm được**. Bấm mà còn lỗi thì focus vào ô lỗi đầu tiên. BE vẫn là nguồn sự thật: lỗi BE lọt qua thì xử lý theo D-05 và D-19.

### Trạng thái gửi và cold start
- **D-30:** Khi đang gửi, nút có `Spinner` và chữ đổi thành "Đang đăng nhập…", "Đang tạo tài khoản…" hoặc "Đang lưu…". Nút có `aria-busy`, **chặn gửi lần hai**. Các ô ở chế độ chỉ đọc (không sửa được) cho tới khi xong.
- **D-31:** Request chạy quá **khoảng 5 giây** thì dưới nút hiện dòng **"Máy chủ đang khởi động, có thể mất tới 30 giây…"** (`aria-live="polite"`). Hết 30 giây (timeout D-11 của Phase 2) thì hiện câu chung D-04 inline theo D-05.

### Copy
- **D-32:** Copy đã chốt:
  - `/login`: tiêu đề "Đăng nhập", nút "Đăng nhập", link "Chưa có tài khoản? Đăng ký".
  - `/register`: tiêu đề "Tạo tài khoản", nút "Đăng ký", link "Đã có tài khoản? Đăng nhập".
  - `/settings/password`: tiêu đề "Đổi mật khẩu", nút "Đổi mật khẩu", nút phụ "Hủy".
  - Nhãn ô: "Email", "Mật khẩu", "Họ và tên", "Nhập lại mật khẩu", "Mật khẩu hiện tại", "Mật khẩu mới".
  - Toast: xem D-07, D-18, D-20. Dòng cold start: xem D-31. Header khách: "Đăng nhập".

### Bổ sung sau research (2026-10-13)
- **D-33:** Lỗi regex email của BE (`Email.cs` là `^[^@s]+@[^@s]+.[^@s]+$`, chặn mọi email có chữ "s") được **người dùng sửa ở repo `tripory_be` trước UAT Phase 3**, thành `^[^@\s]+@[^@\s]+\.[^@\s]+$`. FE **không** chép regex lỗi này. Validate email phía client theo dạng chuẩn. Plan có một bước UAT kiểm lại bằng email có chữ "s" (ví dụ `user@gmail.com`). Mục này vẫn ghi vào checklist phụ thuộc BE (DEPL-02).
- **D-34:** Checklist đổi mật khẩu có **6 mục**, gồm thêm `MinimumLength(8)` của BE mà D-27 bỏ sót. Copy cho mục ký tự đặc biệt là **"Có một trong các ký tự ! ? * @ # $ % ^ & + ="**. Regex FE phải giống hệt tập ký tự của BE: `/[!?*@#$%^&+=]/`.
- **D-35:** BE (commit `e3ed7f9`) giới hạn tốc độ theo IP: register 3/3600 s, login 5/60 s, refresh-token 20/60 s. BE chỉ tin `X-Forwarded-For` khi request có `X-Bff-Secret` khớp `AuthRateLimitOptions:BffSharedSecret`. Quyết định FE: (1) biến server-only tùy chọn `BFF_SHARED_SECRET` (rỗng = chưa đặt, không bao giờ `NEXT_PUBLIC_`, khai báo trong `turbo.json`); (2) `callBackend` nhận `clientIp` và gửi `X-Bff-Secret` + `X-Forwarded-For` CHỈ cho login, register, refresh, không cho change-password hay proxy `/api/bff`, để secret lộ ra ít nhất; chưa có secret hoặc không suy ra được IP hợp lệ thì không gửi gì (BE quay về IP socket); (3) IP lấy từ `x-vercel-forwarded-for` → `x-real-ip` → `x-forwarded-for`, là các header Vercel đặt/ghi đè, mỗi giá trị phải đúng MỘT IP hợp lệ (`node:net`), chuỗi nhiều IP bị bỏ; (4) `callBackend` loại mọi `x-bff-secret`/`x-forwarded-for` có sẵn trong headers truyền vào, nên trình duyệt không nhét được qua `/api/bff`; (5) BE 429 trên login/register chuyển nguyên status + body + `Retry-After` (số giây), UI hiện message tiếng Việt của BE; refresh giữ nguyên D-14a (429 → 503, giữ cookie). Secret không bao giờ vào log, response, thông điệp lỗi hay bundle client; `auth-invariants.test.ts` khóa việc này.

### Claude's Discretion
- Tên cookie, prefix `__Host-`/`__Secure-`, `SameSite`, `Max-Age`, cookie `tripory_at_exp` cho refresh chủ động, tên claim JWT. Research flag của ROADMAP, researcher chốt theo PITFALLS P1 và P2.
- Cơ chế Web Locks trên iOS Safari và fallback nếu không có `navigator.locks`.
- Hình dạng `packages/identity` (rút gọn theo ARCHITECTURE.md), vị trí schema Zod của form (context package hay app), nơi đặt `isSafeNextPath`.
- Cách tách client component hồi phục phiên (D-24) và chỗ đặt nó trong layout `(dashboard)`.
- Có dựng `/api/auth/token` ngay Phase 3 hay để Phase 7.
- Ngưỡng 5 giây (D-31) có thể chỉnh nhẹ nếu research thấy hợp lý hơn.

</decisions>

<canonical_refs>
## Canonical References

**Agent ở bước sau BẮT BUỘC đọc các tài liệu này trước khi plan hoặc triển khai.**

### Phạm vi và tiêu chí
- `.planning/ROADMAP.md` §Phase 3: goal, 5 success criteria, research flag (claim JWT, cookie `__Host-`/`__Secure-`, Web Locks trên iOS). Lưu ý: file còn marker merge conflict ở §Phase 2, cần dọn.
- `.planning/REQUIREMENTS.md`: AUTH-01..08. CHAT-09 (`/api/auth/token`) thuộc Phase 7.
- `.planning/PROJECT.md` §Constraints, §Key Decisions: BFF cùng origin, cookie httpOnly, SignalR thẳng BE, giới hạn chấp nhận (logout không revoke).

### Quyết định phase trước
- `.planning/phases/02-http-shared-kernel/02-CONTEXT.md`: D-01 (mount Toast và QueryClient ở Phase 3), D-04, D-05/D-05a/D-06 (lỗi form), D-07..D-10 (chính sách toast), D-11 (timeout 30 giây), D-12 (`retry: false`), D-13/D-14/D-14a (refresh và `onSessionExpired`), D-15 (refresh chủ động), D-16 (bảng map errorCode).
- `.planning/phases/01-design-system-ui-skeleton-walking-skeleton/01-CONTEXT.md`: D-13 (trang `/` không CTA), D-14 (`/itineraries/mine`), D-15 (file convention, không có trigger debug).
- `.planning/phases/01-design-system-ui-skeleton-walking-skeleton/01-UI-SPEC.md`: token, AppHeader, UserMenu, copy và a11y nền.

### Research
- `.planning/research/ARCHITECTURE.md`: kết luận 1–5 (một đường refresh duy nhất, BFF catch-all, RSC gọi thẳng BE, `proxy.ts` lạc quan, `cacheComponents` và `cookies()` trong `<Suspense>`), bảng Component Responsibilities, pattern 1–5.
- `.planning/research/PITFALLS.md`: P1 (race refresh, reuse detection), P2 (`Max-Age` cookie theo hạn refresh, lỗi refresh 400 thì đăng xuất, 5xx thì 503), P3 (Cache Components + cookies + GET route), P4, P14, BFF open proxy.
- `.planning/research/SUMMARY.md` §Phase 0c: deliverable dự kiến (`packages/identity`, `composition/server/{env,session,backend-http,bff}.server.ts`, route `auth/*`, `proxy.ts`, `http.client.ts` + Web Locks).
- `.planning/research/FEATURES.md` §Auth: contract register `{email, password ≥8, fullName ≤100}`, access 60 phút, refresh 7 ngày, body refresh `{accessToken, refreshToken}`, rule đổi mật khẩu mạnh hơn.
- `.planning/research/STACK.md`: version `zod`, TanStack Query.

### Kiến trúc và ranh giới
- `ai-memories/tripory-fe--ddd-architecture.md`: mục 4–6, 8, 9 (composition root, chỉ `composition/**` import `/http`, không có `next/*` hay browser global trong package).
- `packages/config/eslint/boundaries.mjs`, `packages/config/test/boundaries.test.ts`: preset `contextPackage()` cho `packages/identity` mới, self-test phải xanh.
- `AGENTS.md`, `apps/web/AGENTS.md`: đọc docs Next 16.4 tại `apps/web/node_modules/next/dist/docs/` (`proxy.ts`, `cookies()`, Route Handlers, `cacheComponents`).
- `apps/web/next.config.ts`: `cacheComponents: true`.

### Contract BE và code cũ
- `.agents/tasks/tripory-fe-quick-proposal.md` §3, §4: envelope `ApiResponse<T>`, map lỗi sang HTTP, endpoint Auth.
- `tripory_be/API_ENDPOINTS.md` (repo BE riêng): `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/change-password`, `/users/me`, errorCode Auth/Token/User.
- Validator BE cho register và change-password (repo `tripory_be`): nguồn rule cho D-27.
- `C:\Users\OS\Documents\personal\tripory\docs\common\MESSAGE_LIST.md` §3: bảng message cho người đọc.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/api-client/src/with-session-refresh.ts`: single-flight + epoch, `Lock` tiêm vào, hàm refresh trả `'expired'` hoặc lỗi tạm thời, callback `onSessionExpired`. Phase 3 cài `Lock` bằng `navigator.locks` và nối `onSessionExpired` vào D-20.
- `packages/api-client/src/fetch-http-client.ts` (`./http`): client fetch, timeout 30 giây, factory chỉ import từ `composition/**`.
- `apps/web/src/lib/feedback/*`: `ERROR_MESSAGES`, `selectErrorMessage`, `resolveFormError`, `decideMutationError`. Bảng map đã có mã Auth/Token/User. Phase 3 nối vào `MutationCache`.
- `@tripory/ui-web`: `Toast`/`notify`, `Card`, `FormField`, `Input`, `Button`, `IconButton`, `Spinner`, `Skeleton`, `Avatar` (fallback theo `name`), `Badge` (cho "Sắp có"), `DropdownMenu`, `Separator`, `ErrorState`.
- `apps/web/src/components/user-menu.tsx`: slot tĩnh, sẽ thay bằng menu thật. `app-header.tsx`: client component dùng `usePathname`, nơi đặt UserMenu và nút "Đăng nhập".

### Established Patterns
- Không dùng class, `type` readonly + pure function, deps tiêm theo dạng `makeX(deps)`.
- Mọi version vào `catalog:`, pin cứng. Package export TS trực tiếp, không có bước build.
- File convention `loading`/`error`/`not-found` đã có cho `(public)` và `(dashboard)`. Không có trigger debug.
- Test bằng Vitest (jsdom ở `apps/web`, node ở package). Fake `HttpClient` và fake lock, không dùng MSW.

### Integration Points
- `apps/web/src/app/layout.tsx`: mount `Toast` và `QueryClientProvider` (`retry: false`).
- `apps/web/src/proxy.ts` (mới): gate `(dashboard)` (D-10), redirect khỏi `/login` và `/register` khi đã có phiên (D-04).
- `apps/web/src/app/api/auth/**/route.ts` và `apps/web/src/app/api/bff/[...path]/route.ts` (mới), mỏng, gọi vào `composition/server/*.server.ts`.
- `apps/web/src/app/(public)/login`, `(public)/register`, `(dashboard)/settings/password` (mới).
- `apps/web/src/composition/**` (mới): HttpClient cho browser (base `/api/bff`, Web Locks, `onSessionExpired`), cho server (`cookies()`), adapter `BroadcastChannel` (D-22), danh sách callback khi đăng xuất (D-23).
- `packages/identity` (mới): `Viewer`, schema Zod của DTO `/auth/*`, giải mã claim, `isAccessTokenFresh`.

</code_context>

<specifics>
## Specific Ideas

- Người dùng muốn luồng auth không gây bất ngờ:
  - Thấy rule mật khẩu trước khi nhập, và biết rule nào chưa đạt.
  - Biết vì sao bị chuyển trang khi hết phiên.
  - Không bị đăng xuất khi reload.
- Bạn bè dùng thử sẽ gặp BE cold start trên host free. Dòng "Máy chủ đang khởi động…" là để họ không tưởng app bị treo.
- Hai mục "Hồ sơ" và "Tin nhắn" disabled kèm "Sắp có" là lựa chọn có ý thức, để người thử biết app sẽ có những gì.
- Thử chat bằng nhiều tài khoản trên cùng máy là tình huống thật. Vì vậy đầu menu có email, và trạng thái đăng nhập được đồng bộ giữa các tab.

</specifics>

<deferred>
## Deferred Ideas

- Xác nhận trước khi đăng xuất nếu đang trong cuộc gọi → Phase 7.
- Ngắt SignalR và kết thúc cuộc gọi khi đăng xuất (nối vào chỗ móc D-23) → Phase 7.
- `GET /api/auth/token` cho SignalR (CHAT-09) → Phase 7, trừ khi planner dựng sẵn.
- Đề xuất BE: thêm tên field vào envelope validate (Phase 2 D-05a), endpoint logout/revoke refresh token.
- Quên mật khẩu, xác thực email → chờ BE.
- Dọn marker merge conflict trong `.planning/ROADMAP.md` và `.planning/STATE.md` → việc vặt trước khi plan, không phải tính năng.

### Reviewed Todos (not folded)
Không có todo nào khớp với Phase 3.

</deferred>

---

*Phase: 03-identity-session-bff*
*Context gathered: 2026-10-13*
