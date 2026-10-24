---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Phase 4 UI-SPEC approved
last_updated: "2026-10-24T08:08:08.881Z"
last_activity: 2026-10-23
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 27
  completed_plans: 27
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-09)

**Core value:** Người dùng có thể tạo, chỉnh sửa và chia sẻ một lịch trình du lịch thật trên bản triển khai công khai, rồi trao đổi về chuyến đi với người khác.
**Current focus:** Phase 4 — Itinerary CRUD & Editor

## Current Position

Phase: 4
Plan: Not started
Status: Phase 3 verified complete; ready to discuss Phase 4
Last activity: 2026-10-23

Phase 1 progress: [██████████] 100% — verified complete

## Performance Metrics

**Velocity:**

- Total plans completed: 27
- Average duration: 18m (7 plans with recorded duration; deployment checkpoint excluded)
- Total execution time: 2h 5m (recorded execution plans)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 8 | 2h 5m recorded | 18m recorded |
| 2 | 4 | - | - |
| 3 | 15 | - | - |

**Recent Trend:**

- Last 5 execution plans with recorded duration: 8m, 9m, 7m, 20m; Plan 08 was an external deployment checkpoint without duration metadata
- Trend: Phase 1 completed and verified

*Updated after each plan completion*
| Phase 01 P01 | 1h 14m | 3 tasks | 30 files |
| Phase 01 P02 | 3 min | 2 tasks | 9 files |
| Phase 01 P03 | 4 min | 3 tasks | 30 files |
| Phase 01 P04 | 8 min | 3 tasks | 14 files |
| Phase 01 P05 | 9 min | 3 tasks | 12 files |
| Phase 01 P06 | 7 min | 3 tasks | 6 files |
| Phase 01 P07 | 20 min | 3 tasks | 36 files |
| Phase 01 P08 | external checkpoint | 3 tasks | 5 metadata files |
| Phase 02 P01 | 6 min | 2 tasks | 6 files |
| Phase 02 P02 | 16 min | 3 tasks | 13 files |
| Phase 02 P03 | 10 min | 2 tasks | 5 files |
| Phase 02 P04 | 6 min | 3 tasks | 11 files |
| Phase 3 P01 | 9 min | 3 tasks | 22 files |
| Phase 3 P02 | 71 min | 3 tasks | 15 files |
| Phase 3 P03 | 6 min | 2 tasks | 12 files |
| Phase 3 P04 | 8 min | 2 tasks | 12 files |
| Phase 3 P10 | 10 min | 3 tasks | 13 files |
| Phase 3 P05 | 9 min | 3 tasks | 11 files |
| Phase 3 P06 | 35 min | 3 tasks | 10 files |
| Phase 3 P07 | 12 min | 3 tasks | 9 files |
| Phase 3 P08 | 15min | 2 tasks | 4 files |
| Phase 3 P09 | 10min | 2 tasks | 5 files |
| Phase 03 P11 | 35min | 3 tasks | 14 files |
| Phase 03 P12 | 25min | 3 tasks | 13 files |
| Phase 3 P13 | 20min | 3 tasks | 15 files |
| Phase 3 P14 | 25min | 3 tasks | 4 files |
| Phase 03 P15 | 5m (Task 1; UAT do người dùng chạy) | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Giữ thứ tự 0a → 0b → 0c → 1 → 2 → 3 → 4 → deploy, đánh số lại thành Phase 1–8
- [Roadmap]: Chat + Voice + Call gộp một phase (Phase 7) để không vượt 8 phase; chia plan theo nhóm CHAT → VOICE → CALL
- [Phase 1]: Hạ pnpm về 10 và thêm preset `uiPackage()` vào `boundaries.mjs` ngay trong Phase 1
- [Phase 1]: Thêm Design System (DS-01..07): token mới, atoms/molecules ở `ui-web`, organisms ở app, không showcase, test từng component
- [Roadmap]: Deploy BE là phụ thuộc ngoài (repo `tripory_be`), không có phase riêng
- [Phase 01]: Retain allowBuilds with unrs-resolver disabled under pnpm 10.34.6.
- [Phase 01]: Use role-aware default-deny uiPackage boundaries for components and tokens.
- [Phase 01]: Use internal --semantic-* variables so Tailwind public namespaces never self-reference.
- [Phase 01]: Keep dark.css complete but outside the public CSS import chain until runtime dark mode is implemented.
- [Phase 01]: Expose Sheet viewport ratios in TypeScript because Base UI Drawer cannot consume dvh or CSS var snap points.
- [Phase 01]: Require labels directly in Checkbox and Switch props while Input and Textarea use native htmlFor/id association.
- [Phase 01]: Keep display atoms static unless Base UI owns behavior and keep the public barrel server-safe.
- [Phase 01]: Use stable component variables only for approved atom dimensions absent from shared semantic namespaces.
- [Phase 01]: Delegate popup keyboard and focus management to Base UI 1.8 primitives.
- [Phase 01]: Keep SearchInput synchronous and business-agnostic with explicit onValueChange.
- [Phase 01]: Link supplementary Tooltip content explicitly while requiring an accessible trigger name.
- [Phase 01]: Delegate Dialog modal behavior and focus management to Base UI 1.8.
- [Phase 01]: Require native button semantics for interactive Card variants while keeping content states server-safe.
- [Phase 01]: Keep ErrorState fixed-copy with only an optional onRetry callback and no technical error input.
- [Phase 01]: Use Sonner unstyled mode so Toast presentation consumes approved semantic tokens only.
- [Phase 01]: Resolve only Sheet peek to pixels; keep medium and expanded as Base UI viewport ratios.
- [Phase 01]: Force disablePointerDismissal for persistent background-interactive non-modal Sheets.
- [Phase 01]: Expose all ui-web compound children as named exports through a server-safe barrel.
- [Phase 01]: Keep UserMenu static and non-interactive until real identity is available.
- [Phase 01]: Use Next.js 16.4 retry() for route error recovery without exposing Error details.
- [Phase 01]: Centralize unmatched URL handling in root app/not-found.tsx only.
- [Phase 02]: Kernel chỉ có UserId, ItineraryId (GUID trim + chữ thường, sai trả null) và Wgs84Coordinate khoảng đóng, frozen, không làm tròn
- [Phase 02]: api-client: ApiError plain object frozen (type/kind/status/code/message/fieldErrors), toApiError giữ errorCode/message BE, ProblemDetails → message null; fetch client timeout 30s bao cả đọc body, không retry, factory chỉ ở ./http
- [Phase 02]: withSessionRefresh: single-flight inFlight trong Lock + epoch; chi 'expired' goi onSessionExpired (1 lan/lo), refresh throw giu loi goc (D-14a); replay 1 lan, replay 401 -> session.expired
- [Phase 02]: lib/feedback: ERROR_MESSAGES la Map 39 ma D-16; selectErrorMessage map -> message BE -> cau chung (aborted -> null); resolveFormError gan 'Gia tri khong hop le.', field la -> toast cau chung; decideMutationError im lang voi errorToast:false, session_expired, aborted
- [Phase 3]: 03-01: `@tripory/identity` dựng theo `contextPackage()`; catalog pin cứng react-query 5.104.2, zod 4.6.7, react-hook-form 7.89.0, resolvers 5.9.1; `API_ORIGIN` server-only (`.env.example` + `env` của turbo build/dev) — Không nới allowlist: boundaries.mjs không đổi, self-test thêm 15 case khóa identity và web.
- [Phase 3]: 03-01: test route/BFF/proxy dùng `// @vitest-environment node` trong app; `setup.ts` chỉ polyfill matchMedia khi có `window` — Preset app mặc định jsdom nhưng route handler cần node; setup.ts cũ vỡ ngoài DOM.
- [Phase 3]: 03-01: helper test `setCookiesOf` giữ nguyên giá trị cookie, hạ chữ thường tên thuộc tính và SameSite; fake lock reject bằng `signal.reason`; fake BroadcastChannel chuyển tin đồng bộ qua structuredClone — Đúng đặc tả Web Locks/BroadcastChannel, tin không clone được lộ ngay trong test, test khỏi phải flush.
- [Phase 3]: 03-02: `DropdownMenuLinkItem` mặc định `closeOnClick = true`, khác `Menu.LinkItem` gốc (`false`) — UserMenu nằm trong layout nên điều hướng client không unmount nó, menu sẽ kẹt mở; truyền `closeOnClick={false}` để giữ.
- [Phase 3]: 03-02: Không thêm `focusableWhenDisabled` cho `DropdownMenuItem`; Base UI 1.8.0 `Menu.Item` đã focusable khi disabled — Đã đo: ArrowDown/ArrowUp tới được mục disabled (D-15). Ngoại lệ: mở menu bằng phím thì focus đầu bỏ qua mục disabled đứng đầu; UserMenu bắt đầu bằng link enabled nên không ảnh hưởng.
- [Phase 3]: 03-02: `PasswordInput` chỉ tự reset về ẩn khi `value` controlled là rỗng — `resetField` của React Hook Form ghi thẳng vào DOM nên component không thấy; plan 03-12 phải dùng value controlled hoặc đổi `key` khi xóa mật khẩu đăng nhập sai.
- [Phase 3]: 03-02: `Button` có `loadingLabel` thì thay hẳn children bằng Spinner decorative + nhãn — Nhãn đang gửi phải đọc được (D-30); không truyền `loadingLabel` thì giữ nhánh cũ (children `invisible` + spinner phủ).
- [Phase 3]: 03-03: toSafeNextPath so khớp theo đoạn path, chặn /login, /register, /api, /_next cùng con của chúng; /loginfoo, /registered, /apix vẫn hợp lệ — Tránh vòng lặp chuyển trang và route nội bộ mà không chặn oan route khác có chung tiền tố.
- [Phase 3]: 03-03: Ký tự điều khiển/khoảng trắng trong toSafeNextPath kiểm bằng vòng lặp charCodeAt (<= 0x20 hoặc 0x7f), không dùng regex — Khỏi vướng no-control-regex mà không cần eslint-disable; cùng tập ký tự bị chặn.
- [Phase 3]: 03-03: Rule mật khẩu là dữ liệu { id, min?, test } và evaluatePasswordRules bỏ khóa min khi rule không có; ports export bằng export type * — Checklist UI và schema Zod ở app dùng chung predicate; ports chỉ có type nên không sinh runtime.
- [Phase 3]: 03-04: Gateway chỉ chép đúng trường hợp đồng vào body (login, register, changePassword), nên confirmPassword của form không rời trình duyệt — Form có ô nhập lại mật khẩu (D-28); truyền nguyên object RHF làm body không bị kiểu chặn vì object khác literal vẫn khớp kiểu.
- [Phase 3]: 03-04: sessionRefresh: false đúng 3 chỗ (login, register, logout); changePassword và me() để mặc định để 401 session.expired được refresh rồi phát lại — Login/register/logout trả 401 không có nghĩa phiên hết hạn (tránh refresh lặp, T-03-13); đổi mật khẩu và users/me đi qua client có refresh.
- [Phase 3]: 03-04: toViewer chỉ chép 5 trường và ném Error khi id sai GUID; viewerDto bỏ khóa lạ; avatar mặc định chung của BE (dicebear seed=tripory) thành null — Token hay trường thừa không đi tiếp vào Viewer (T-03-12); mọi người chưa đổi ảnh cùng một URL nên UI hiện chữ cái đầu (D-12).
- [Phase 3]: 03-04: Hook factory dùng DefaultError của TanStack Query; viewerResponseDto là nội bộ (không export khỏi ./infrastructure) — Khi app khai báo Register defaultError ở 03-06, kiểu lỗi của form tự theo mà không xung đột; route server chỉ cần viewerDto.
- [Phase 3]: 03-10: Mỗi ô form chỉ phát đúng một lỗi Zod (ô rỗng chỉ báo 'Vui lòng nhập…'); rule cần hai ô (độ mạnh mật khẩu mới + differentFromCurrent, nhập lại khớp) ở superRefine của object — Form hiện đúng câu theo UI-SPEC, không phụ thuộc thứ tự issue.
- [Phase 3]: 03-10: Bảng mã lỗi BE → ô là Map riêng từng form trong form-error-mapping.ts, trả null cho session_expired/aborted; ERROR_MESSAGES toàn cục không thêm mã *Validator — Cùng mã MinimumLengthValidator nghĩa khác giữa form; onSessionExpired đã chuyển trang và toast (D-20) nên form không hiện thêm lỗi.
- [Phase 3]: 03-10: PasswordChecklist render div + ul, nên 03-12 truyền render={<div />} cho FormFieldDescription (Base UI Field.Description là <p>) hoặc đặt checklist ngoài nó và nối aria-describedby bằng id; apps/web thêm lucide-react (catalog) để truyền Circle/CircleCheck cho Icon — Tránh HTML lồng sai; Icon nhận LucideIcon nên glyph do app import.
- [Phase 3]: 03-05: Tên cookie viết thành hai hằng đầy đủ (__Host-tripory_at|rt|at_exp và không prefix), không ghép prefix lúc chạy; clearSession ghi lại đủ thuộc tính với Max-Age=0, không dùng delete — Grep được tên cookie thật khi debug; trình duyệt từ chối lệnh xóa cookie __Host- thiếu Secure và Path=/ nên đăng xuất sẽ không có tác dụng (T-03-16).
- [Phase 3]: 03-05: callBackend ném Error không kèm đường dẫn khi URL ra ngoài API_ORIGIN hoặc không bắt đầu /api/v1/, dùng redirect manual và timeout 28 giây tính cả đọc body — Đường dẫn có thể chứa dữ liệu do client gửi; 3xx của BE không dẫn server tới host khác (T-03-18); 28 giây để client nhận 504 có cấu trúc trước timeout 30 giây.
- [Phase 3]: 03-05: readSession trả stale không kèm accessToken (route refresh dùng readRawTokens); writeSession trả ok false và không ghi cookie nào khi expiresAt không parse được hoặc access token thiếu claim — Không để lại phiên nửa vời, và Bearer hết hạn không lọt vào BFF.
- [Phase 3]: 03-05: Fixture auth của app ở apps/web/src/test/be-auth-fixtures.ts (bearerPair, beAuthResponse, beTokenResponse, beErrorEnvelope, 7 envelope lỗi BE, jsonResponse) không import vitest — 03-07/08/09/13 dùng chung; không import xuyên package bằng đường tương đối nên app giữ bản riêng.
- [Phase 3]: 03-06: refreshSession() chỉ trả refreshed|expired hoặc ném lỗi tạm thời, không tự gọi onSessionExpired; caller (SessionKeeper, SessionRecovery ở 03-11) phát sessionEvents.emitExpired() — withSessionRefresh vẫn báo cho request 401, sessionEvents đã chống lặp nên không sinh hai toast.
- [Phase 3]: 03-06: Hết hạn xin khóa Web Locks (40 giây) đổi AbortError thành ApiError kind timeout chỉ khi khóa chưa được cấp (cờ granted); lỗi của tác vụ refresh trong khóa lan nguyên — Lỗi tạm thời không bao giờ phát expired (D-14a) và DOMException không lọt ra ngoài; 503 vẫn là 503.
- [Phase 3]: 03-06: makeBrowserHttp(deps) thuần + singleton ở cuối file; mutex dự phòng nằm trong closure từng instance — Test dựng nhiều tab độc lập (chung fake lock + cookie jar), beCalls === 1 chứng minh khóa cùng route idempotent; chuỗi đường dẫn route refresh chỉ có ở http.client.ts (Pitfall 3).
- [Phase 3]: 03-06: sessionEvents tạo BroadcastChannel lazy, expired không đi qua channel, createChannel chỉ được hỏi một lần kể cả khi trả null, dispose giữ handler đăng xuất — Node 24 có BroadcastChannel toàn cục nên SSR không được mở channel; cookie bị xóa nên tab khác tự phát hiện ở request kế tiếp.
- [Phase 3]: 03-06: makeQueryClient() luôn trả client mới với retry false, staleTime 60 giây, MutationCache theo chữ ký 5.104.2 (data, variables, onMutateResult, mutation, context); QueryCache không toast (D-10); SESSION_EXPIRED_TOAST là hằng riêng khác dấu câu với SESSION_EXPIRED_MESSAGE — Mutation chỉ khai báo meta.feedback; mount QueryClientProvider và Toast thuộc 03-11.
- [Phase 3]: 03-07: Body gửi BE dựng lại từ các field chuỗi đặt tên cứng (login/register/change-password), thiếu hoặc sai kiểu thì 400 Bff.InvalidBody; chuỗi rỗng vẫn qua để BE validate, mật khẩu không trim — Chống mass-assignment (T-03-32) và giữ confirmPassword ở lại trình duyệt; lỗi validate vẫn do BE trả để form gắn vào ô (D-19).
- [Phase 3]: 03-07: Lỗi upstream: 4xx/5xx chuyển nguyên status+body+content-type và bỏ mọi header khác của BE (set-cookie); timeout 504, mạng 502; 3xx hoặc BE 2xx sai hình dạng thành 502 Bff.InvalidUpstream không kèm cookie — BE không được đặt cookie lên origin của FE (T-03-33); redirect manual của callBackend không được trở thành response hợp lệ; không để lại phiên nửa vời.
- [Phase 3]: 03-07: handleRefresh kiểm Origin trước cookie, no-op theo đồng hồ server khi còn hơn 150 giây, chỉ BE 400/401/403 xóa phiên còn mọi thứ khác (5xx, 404, 429, 3xx, timeout, mạng) giữ cookie và trả 503 Bff.RefreshUnavailable; BE 200 hỏng thì 502 giữ cookie — Origin lạ không được xóa cookie của người dùng; không đăng xuất oan khi BE cold start (D-14a, T-03-30); route idempotent làm mọi lần refresh lặp giữa các tab vô hại (T-03-29).
- [Phase 3]: 03-07: handleChangePassword: none/stale trả 401 session.expired không gọi BE và không xóa cookie, invalid xóa cookie; BE 2xx xóa cả 3 cookie bất kể body; BE 401 thành session.expired của FE; lỗi BE khác chuyển nguyên và giữ cookie — Stale cần giữ refresh token để client refresh rồi phát lại; BE thu hồi mọi refresh token khi đổi mật khẩu nên cookie cũ phải bị xóa ngay (D-18, T-03-34); đổi mật khẩu thất bại không được đăng xuất người dùng (D-19).
- [Phase 3]: 03-08: BFF kiểm theo thứ tự method → allowlist/traversal → Origin → phiên → body; stale/invalid 401 không gọi BE; BE 3xx → 502 Bff.InvalidUpstream; trần body 4 MB
- [Phase 3]: 03-09: proxy chỉ kiểm sự có mặt cookie phiên (không giải mã JWT), cho qua khi access hết hạn (D-25); next lọc _rsc/__next*
- [Phase 03]: 03-11: useLogout onSuccess ở mức hook (mutate-level callback mất khi menu unmount); SessionRecovery chặn StrictMode bằng ref
- [Phase 03]: 03-12: ô mật khẩu dùng Controller (controlled) để PasswordInput tự ẩn lại khi form xóa ô; nút Hủy là next/link + buttonVariants thay vì Button render Link (tránh role=button)
- [Phase 03]: 03-13: GuestLoginButton là next/link + buttonVariants (tránh role=button); AccountSlot là chỗ duy nhất đọc cookie của header, AppShell bọc trong Suspense với Skeleton tròn; DashboardSessionGate nhận loading qua prop
- [Phase 3]: 03-14: bất biến bảo mật tĩnh khớp `import "server-only"` (không khớp comment) và literal có nháy kép "/refresh" (không đếm nhầm đường BE `refresh-token`); VALIDATION map đã ✅, còn 03-15 UAT thủ công
- [Phase 03]: UAT thủ công 19/19 PASS trên BE thật; Phase 3 nghiệm thu, sẵn sàng verify-work

### Pending Todos

None yet.

### Blockers/Concerns

- External dependency: URL BE công khai (HTTPS + WSS, CORS cho Vercel và FE cũ) chặn nghiệm thu Phase 7 (SignalR, TURN giữa hai mạng) và Phase 8
- Tài khoản TURN (free tier hoặc coturn) phải có trước khi plan Phase 7; kiểm Cloudflare TURN có đòi phương thức thanh toán không
- Phase cần research sâu khi plan: 3, 4, 7, 8

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-10-24T08:08:08.876Z
Stopped at: Phase 4 UI-SPEC approved
Resume file: .planning/phases/04-itinerary-crud-editor/04-UI-SPEC.md
