# Phase 2: HTTP & Shared Kernel - Context

**Gathered:** 2026-10-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase này giao ba thứ:

1. `packages/api-client`: port `HttpClient` và bản cài đặt bằng `fetch`, bóc envelope `ApiResponse<T>`, chuẩn hóa mọi dạng lỗi BE về một `ApiError`, `withSessionRefresh` (single-flight, `Lock` tiêm vào).
2. `packages/shared-kernel`: branded id và `Wgs84Coordinate`.
3. Phần thuần (không UI) của cơ chế phản hồi FND-05: hàm chọn message hiển thị từ `ApiError` và hợp đồng chính sách toast cho mutation, kèm test.

Nằm ngoài phase: mount `<Toast />` và `QueryClientProvider` trong app, route BFF/`/api/auth/*`, cookie, Web Locks thật, refresh chủ động trước hạn, màn đăng nhập. Tất cả thuộc Phase 3.

**Điều chỉnh tiêu chí nghiệm thu:** Tiêu chí 1 của ROADMAP Phase 2 ("người dùng nhận toast...") chỉ được chứng minh bằng unit test ở Phase 2. Phần người dùng thấy toast thật được nghiệm thu ở Phase 3 bằng thao tác ghi thật (đăng ký/đăng nhập). Phase 2 không có route demo hay trigger debug, theo D-15 của Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Nghiệm thu toast
- **D-01:** Phase 2 không mount `<Toast />` (molecule Sonner trong `ui-web`) và không mount `QueryClientProvider`. Phase 3 mount cả hai và nối toast vào mutation khi có thao tác ghi thật đầu tiên.
- **D-02:** Phase 2 chứng minh FND-05 bằng unit test của các phần thuần: chuẩn hóa lỗi (`api-client`), chọn message và quyết định có hiện toast hay không. Không tạo route demo hay trigger debug.

### Nội dung message lỗi
- **D-03:** Copy hiển thị là **tiếng Việt do FE viết, map theo `errorCode`** của BE. Nếu `errorCode` không có trong bảng map thì dùng `message` của BE làm dự phòng.
- **D-04:** Lỗi không có `errorCode` khớp bảng map và cũng không có `message` BE (lỗi mạng, timeout, 5xx body rỗng, 401/404 body rỗng) thì hiện **một câu chung duy nhất: "Đã có lỗi xảy ra, vui lòng thử lại"**. Không chia câu riêng theo từng loại.
- **D-05:** Lỗi validation (`ValidationProblemDetails` và lỗi validate trong envelope) đi vào `ApiError.fieldErrors` để **gắn vào từng ô form**, không hiện thành toast.
- **D-06:** Nếu lỗi validation có field không khớp ô nào của form, hoặc thao tác không có form, thì hiện **toast lỗi với message của field đầu tiên**.

### Chính sách toast
- **D-07:** Toast thành công là **opt-in theo từng mutation, mặc định tắt**. Thao tác rời rạc như tạo, xóa, xuất bản, đổi mật khẩu thì bật. Autosave của editor (Phase 4) không bật, vì đã có trạng thái Đang lưu / Đã lưu.
- **D-08:** Nội dung toast thành công là **câu ngắn cố định do FE viết cho từng thao tác** (ví dụ "Đã xuất bản lịch trình"), không lấy `message` thành công trong envelope BE. *(Người dùng không chọn; áp dụng phương án mặc định đã báo trước trong lúc thảo luận.)*
- **D-09:** Toast lỗi cho thao tác ghi **mặc định bật**. Mutation tự xử lý lỗi (đã gắn lỗi validation vào form theo D-05, hoặc rollback có UI riêng) được tắt.
- **D-10:** Query đọc bị lỗi **chỉ hiện `ErrorState` kèm nút "Thử lại"** tại chỗ, không hiện toast.

### Timeout, retry và refresh
- **D-11:** Timeout mặc định của request là **30 giây** (BE có thể chạy trên host free, cold start lâu). Hết thời gian thì request trả `ApiError` dạng timeout, hiển thị câu chung theo D-04.
- **D-12:** **Không tự retry** khi gặp lỗi mạng hoặc 5xx, kể cả với query đọc. Người dùng tự bấm "Thử lại". Phase 3 khi tạo `QueryClient` phải đặt `retry: false` cho query và mutation cho khớp quyết định này. Ngoại lệ duy nhất là phát lại request sau khi refresh token thành công (D-13), vì đây không phải retry lỗi.
- **D-13:** `withSessionRefresh` chỉ làm **refresh phản ứng**: gặp 401 thì gộp mọi request vào **một promise refresh duy nhất (single-flight)** chạy trong `Lock` tiêm vào, rồi phát lại các request. Test chứng minh N request 401 song song chỉ dẫn tới đúng 1 lần gọi refresh, dùng fake lock.
- **D-14:** Refresh thất bại thì `withSessionRefresh` **từ chối mọi request đang chờ bằng `ApiError` có code `session.expired`**, rồi gọi callback **`onSessionExpired`** do composition tiêm vào. Chuyển sang trang đăng nhập và thông báo cho người dùng là việc của Phase 3.
- **D-15:** **Refresh chủ động trước hạn để sang Phase 3**, vì cần cookie `tripory_at_exp` và route `/api/auth/refresh`, hai thứ chưa tồn tại.

### Claude's Discretion
- Phạm vi `shared-kernel`: chọn branded id nào (tối thiểu `UserId`, `ItineraryId` theo tài liệu kiến trúc; thêm id khác chỉ khi có ≥ 2 context dùng cùng nghĩa), cách tạo/validate branded id, phạm vi và độ chính xác của `Wgs84Coordinate`. Làm theo quy tắc "shared-kernel không thành bãi rác" ở mục 9 tài liệu kiến trúc.
- Hình dạng cụ thể của `ApiError` (research đề xuất `{ status, code, message, fieldErrors? }` cộng với cách phân biệt network/timeout/session.expired) và cách nhận diện từng dạng lỗi BE bằng type guard viết tay. `api-client` không dùng `zod`, theo allowlist của `httpPackage()`.
- Nơi đặt bảng map `errorCode` → copy tiếng Việt, hàm chọn message và hợp đồng chính sách toast (ví dụ `meta` của mutation). Đây là phần trình bày, nên đặt ở app (`apps/web`), không đặt trong `api-client`. Planner chọn vị trí đúng ranh giới ESLint. Bảng map khởi đầu chỉ cần những `errorCode` đã biết từ BE; Phase 3+ bổ sung dần.
- Cho phép override timeout theo từng request, và cách kết hợp `AbortSignal` của caller với timeout.
- API tiêm `Lock` (interface tối thiểu để Phase 3 cài bằng `navigator.locks`) và cách tiêm hàm refresh vào `withSessionRefresh`.

</decisions>

<canonical_refs>
## Canonical References

**Agent ở bước sau BẮT BUỘC đọc các tài liệu này trước khi plan hoặc triển khai.**

### Phạm vi và tiêu chí
- `.planning/ROADMAP.md` §Phase 2: goal và 3 success criteria. Tiêu chí 1 được điều chỉnh theo mục Phase Boundary của file này.
- `.planning/REQUIREMENTS.md`: FND-05. AUTH-03 (Phase 3) là bên tiêu thụ `withSessionRefresh`.
- `.planning/PROJECT.md` §Constraints, §Key Decisions: BFF cùng origin, cookie httpOnly, viết tay schema.

### Kiến trúc và ranh giới
- `ai-memories/tripory-fe--ddd-architecture.md`:
  - mục 4: vai trò `shared-kernel` và `api-client`.
  - mục 5: `api-client` chỉ phụ thuộc `shared-kernel`.
  - mục 6: composition root chọn `HttpClient`.
  - mục 8: preset `kernelPackage()` và `httpPackage()`.
  - mục 9: bẫy `shared-kernel` thành bãi rác, không có `next/*` trong package.
- `packages/config/eslint/boundaries.mjs`: allowlist của `httpPackage()` và `kernelPackage()`. Cấm `navigator`/`window`/`localStorage` trong package.
- `packages/config/test/boundaries.test.ts`: self-test ranh giới, phải xanh.
- `packages/api-client/`, `packages/shared-kernel/`: khung rỗng hiện có (`export {}`, `vitest run --passWithNoTests`). Bỏ cờ `--passWithNoTests` khi có test đầu tiên.

### Research
- `.planning/research/PITFALLS.md`:
  - P1: race refresh, single-flight, Web Locks tiêm từ composition, chỉ một đường refresh.
  - §"Nhiều dạng lỗi từ BE": 4 dạng lỗi (envelope, `ValidationProblemDetails`, 401 body rỗng, 404 body rỗng), FluentValidation chỉ trả lỗi đầu tiên.
  - P12: ranh giới ESLint.
  - Mục ngày giờ: `ValidationProblemDetails` khi gửi sai `DateOnly`.
- `.planning/research/SUMMARY.md` §Phase 0b: deliverable dự kiến, type guard viết tay trong `api-client`.
- `.planning/research/ARCHITECTURE.md`: vị trí `api-client`, `withSessionRefresh`, `Lock` tiêm vào.
- `.planning/research/STACK.md`: version `zod` (dùng ở context, không dùng ở `api-client`), test bằng fake `HttpClient` thay vì MSW.

### Contract BE và code cũ
- `.agents/tasks/tripory-fe-quick-proposal.md`:
  - §3: envelope `ApiResponse<T>` (`status, data, message, errorCode, timestamp`), map lỗi sang HTTP (NotFound→404, Conflict→409, Unauthorized→401, Forbidden→403, còn lại→400).
  - §4: dòng "Nền HTTP". Port logic chuẩn hóa lỗi và hàng đợi refresh từ `tripory/src/services/api/apiClient.ts` của FE cũ, viết lại bằng `fetch`, không mang theo localStorage.
- `tripory_be/API_ENDPOINTS.md` (repo BE riêng): nguồn danh sách `errorCode` cho bảng map tiếng Việt.

### UI liên quan (Phase 3 sẽ dùng)
- `packages/ui-web/src/molecules/toast.tsx`: `Toast` (Sonner, unstyled) và `notify.success/error/info/warning`. Toast lỗi và toast có action tự kéo dài thời gian hiển thị.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `notify` và `Toast` trong `@tripory/ui-web`: đích hiển thị của chính sách toast (D-07..D-09). App chưa mount `Toast`.
- `ErrorState` trong `ui-web` (có `onRetry`, copy cố định): đích hiển thị lỗi query đọc (D-10).
- `packages/config/vitest/preset.mjs` (environment `node`): test `api-client` và `shared-kernel` chạy trên Node, không cần DOM.

### Established Patterns
- Package export thẳng TypeScript qua `exports`, không có bước build. Mọi version khai báo trong `catalog:`, pin cứng.
- Không dùng class, chỉ dùng `type` readonly + pure function. Ngoại lệ duy nhất là `DomainError extends Error`. Nếu `ApiError` là class thì phải ghi lý do; mặc định nên là plain object để serialize được qua ranh giới server/client.
- Dependency nền tảng (Lock, clock, refresh) tiêm qua deps theo dạng `makeX(deps)`.

### Integration Points
- `apps/web/src/composition/**`: nơi Phase 3 lắp `HttpClient` cho client (fetch tới `/api/bff`, `Lock` bằng `navigator.locks`, `onSessionExpired`) và cho server (`getAccessToken` qua deps). Phase 2 không cần tạo file composition, trừ khi planner thấy cần để test tích hợp.
- `apps/web/src/app/layout.tsx` / providers: Phase 3 mount `Toast` và `QueryClientProvider` (với `retry: false` theo D-12).

</code_context>

<specifics>
## Specific Ideas

- Người dùng muốn thông báo lỗi thân thiện bằng tiếng Việt và ít câu chữ. Một câu chung cho mọi lỗi không rõ nguyên nhân là đủ, không cần chia nhỏ theo loại.
- Không muốn bị spam toast: toast thành công chỉ hiện cho thao tác rời rạc, lỗi đọc dữ liệu hiện ngay tại chỗ.
- Ưu tiên để người dùng chủ động bấm "Thử lại" thay vì app tự thử lại ngầm.

</specifics>

<deferred>
## Deferred Ideas

- Mount `Toast` + `QueryClientProvider`, nối chính sách toast vào `MutationCache` và nghiệm thu toast thật → Phase 3.
- Refresh chủ động trước hạn (exp − 120 s), cookie `tripory_at_exp`, Web Locks thật giữa các tab → Phase 3.
- Bổ sung bảng map `errorCode` → tiếng Việt cho từng context mới → Phase 3 trở đi, khi có consumer.

### Reviewed Todos (not folded)
Không có todo nào khớp với Phase 2.

</deferred>

---

*Phase: 02-http-shared-kernel*
*Context gathered: 2026-10-12*
