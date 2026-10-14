---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 03-04-PLAN.md
last_updated: "2026-10-14T15:05:54.618Z"
last_activity: 2026-10-14
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 27
  completed_plans: 16
  percent: 59
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-09)

**Core value:** Người dùng có thể tạo, chỉnh sửa và chia sẻ một lịch trình du lịch thật trên bản triển khai công khai, rồi trao đổi về chuyến đi với người khác.
**Current focus:** Phase 3 — Identity & Session (BFF)

## Current Position

Phase: 3 (Identity & Session (BFF)) — EXECUTING
Plan: 5 of 15
Status: Ready to execute
Last activity: 2026-10-14

Phase 1 progress: [██████████] 100% — verified complete

## Performance Metrics

**Velocity:**

- Total plans completed: 12
- Average duration: 18m (7 plans with recorded duration; deployment checkpoint excluded)
- Total execution time: 2h 5m (recorded execution plans)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 8 | 2h 5m recorded | 18m recorded |
| 2 | 4 | - | - |

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

Last session: 2026-10-14T15:05:54.614Z
Stopped at: Completed 03-04-PLAN.md
Resume file: None
