---
phase: 03-identity-session-bff
verified: 2026-10-23T07:30:00Z
status: passed
score: 5/5 success criteria verified (AUTH-01..AUTH-08 + FND-05 phần toast thật)
overrides_applied: 0
deferred:
  - truth: "Ngắt kết nối realtime (SignalR) và kết thúc cuộc gọi khi đăng xuất (phần realtime của AUTH-04)"
    addressed_in: "Phase 7"
    evidence: "03-CONTEXT D-23: Phase 3 chỉ dựng chỗ móc `registerLogoutHandler`/`runLogoutHandlers`; Phase 7 (CHAT-*, CALL-*) đăng ký SignalR vào đó. Phase 3 chưa có kết nối realtime nào để ngắt."
  - truth: "BE revoke refresh token khi đăng xuất (`POST /auth/logout`)"
    addressed_in: "Việc riêng sau nghiệm thu (nhánh BE feat/be-fe-integration-group-a) và Phase 8"
    evidence: "03-BE-DEPENDENCIES mục 3, 7, 8 và 03-UAT-CHECKLIST §C: giới hạn đã chấp nhận, không chặn nghiệm thu Phase 3."
---

# Phase 3: Identity & Session (BFF) Verification Report

**Phase Goal:** Người dùng đăng ký, đăng nhập, giữ phiên và đăng xuất an toàn; token không bao giờ lọt về JavaScript phía client.
**Verified:** 2026-10-23T07:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Automated Checks (chạy tại gốc repo, nhánh `phase_3`, worktree sạch)

| Lệnh | Kết quả thực tế |
|------|-----------------|
| `pnpm lint` | Exit 0. `Tasks: 8 successful, 8 total` |
| `pnpm typecheck` | Exit 0. `Tasks: 8 successful, 8 total` (Next sinh route types OK) |
| `pnpm test` | Exit 0. `Tasks: 8 successful, 8 total`. `design-tokens` 9, `shared-kernel` 32, `config` 104, `ui-web` 180 (31 file), `api-client` 95, `identity` 244 (9 file), `web` 845 (57 file); `itinerary` chưa có test (exit 0) |
| `pnpm build` | Exit 0. Next.js 16.4.0 (Turbopack), 13 trang sinh xong, route `/api/auth/{change-password,login,logout,refresh,register}`, `/api/bff/[...path]`, `Proxy (Middleware)` hiện đủ. Chạy hai lần, grep `Uncached data`: 0 kết quả |

**Regression Phase 1 và 2:** không có test nào của phase trước fail. `ui-web` 180/180 (gồm `token-guard.test.ts`, không flake lần này), `config` (self-test ranh giới) 104/104 (Phase 2 ghi 88, Phase 3 thêm case), `api-client` 95/95 và `shared-kernel` 32/32 giữ nguyên số lượng của Phase 2. Không sửa file nguồn nào trong lúc verify.

## Goal Achievement

### Roadmap Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Đăng ký (thấy lỗi validate BE), đăng nhập, menu user có avatar + tên thật; `document.cookie` không đọc được access/refresh token | ✓ VERIFIED | `session-store.ts` `writeSession`: access và refresh `httpOnly: true`, `secure`, `sameSite: "lax"`, `path: "/"`; chỉ `*_at_exp` (số giây `exp`) `httpOnly: false`. `session-cookies.ts` dùng prefix `__Host-` khi production. `register-form.tsx` + `form-error-mapping.ts` gắn lỗi field của BE. `components/user-menu.tsx` có tên, email, Hồ sơ/Tin nhắn (disabled + Badge "Sắp có", D-15), Đổi mật khẩu, Đăng xuất. `auth-invariants.test.ts` khóa: không `localStorage`/`sessionStorage`/`NEXT_PUBLIC_*TOKEN`, không `console.*` trong `composition/**` và `modules/**`. UAT bước 3, 5, 6: PASS |
| 2 | Reload hoặc hết hạn access token vẫn giữ phiên; nhiều tab chỉ 1 lần refresh, BE không kích hoạt reuse detection | ✓ VERIFIED | `composition/http.client.ts`: một `lock` (Web Locks, chờ tối đa 40 s, fallback mutex trong tab), `authHttp`/`bffHttp` bọc `withSessionRefresh`, `refreshSession` dùng chung `lock` + route `/api/auth/refresh` idempotent. `auth-invariants.test.ts` khẳng định literal `"/refresh"` chỉ nằm trong `composition/http.client.ts` (Pitfall 3). `proxy.ts` không redirect khi chỉ access token hết hạn (D-25). `SessionKeeper` hẹn refresh chủ động, `SessionRecovery` hồi phục (D-24). **UAT bước 8 (BE thật, expiry 5 phút, 3 tab): đúng 1 dòng `refresh-token` mỗi lần hết hạn, không có `Token.Compromised`**; bước 7, 9, 17: PASS |
| 3 | Trang cần đăng nhập khi chưa có phiên → đăng nhập → quay lại đúng trang; `?next=` ngoại bị bỏ qua | ✓ VERIFIED | `proxy.ts`: `PROTECTED_PREFIXES` + `login?next=` đã lọc tham số nội bộ Next; `toSafeNextPath` (package `identity`) dùng cả khi redirect khỏi `/login`. `proxy-coverage.test.ts` đối chiếu `PROTECTED_PREFIXES` với thư mục `(dashboard)`. Lưới thứ hai: `dashboard-gate.ts` + `DashboardSessionGate`. UAT bước 1, 2: PASS |
| 4 | Đổi mật khẩu (thấy rule trước khi nhập) và đăng xuất từ mọi trang; cookie bị xóa | ✓ VERIFIED | `handleLogout` (kiểm Origin chống CSRF logout) + `clearSession` ghi lại từng cookie với đủ thuộc tính và `maxAge: 0`; `auth-invariants` cấm `.delete(` trong `composition/server`. `handleChangePassword` xóa phiên khi thành công, giữ cookie khi lỗi. `change-password-form.tsx` + `password-checklist.tsx` hiện 6 rule. `UserMenu` ở header chung nên có ở mọi trang. UAT bước 10, 14, 15: PASS. Phần "ngắt realtime" xem Deferred |
| 5 | Request BFF ngoài allowlist, tới `auth/*`, hoặc sai Origin đều bị từ chối | ✓ VERIFIED | `bff.ts`: `BFF_ALLOWED_ROOTS = users, itineraries, chat`; `auth/*` và `admin` → 404 `Bff.NotFound`; traversal (`%2e`, `%2f`, `%5c`, `..`, rỗng, ký tự điều khiển) → 400 `Bff.BadPath`; method ngoài GET/POST/PUT/DELETE → 405; `checkSameOrigin` sai Origin → 403 `Bff.CrossOrigin`; body trần 4 MB → 413. Header đi chỉ `accept`, `content-type`, `authorization` do server gắn; response chỉ giữ `content-type` + `no-store`. UAT bước 16 (404/404/400/200/403 đúng kỳ vọng): PASS |

**Score:** 5/5 tiêu chí verified.

### Observable Truths (PLAN must_haves, đối chiếu bổ sung)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Refresh 401 song song trên N request/N tab chỉ gọi BE một lần | ✓ VERIFIED | `withSessionRefresh` (Phase 2, 19 case) + `http.client.ts` cùng `lock`; route refresh no-op khi cookie còn tươi theo đồng hồ server. UAT bước 8 |
| 2 | Lỗi tạm thời (mạng, 5xx, 429, cold start) KHÔNG đăng xuất | ✓ VERIFIED | `handleRefresh`: chỉ 400/401/403 xóa cookie, còn lại 503 + giữ cookie (D-14a); `callRefreshRoute` chỉ trả `'expired'` khi 401. UAT bước 9, 19 |
| 3 | Route `/api/auth/*` là lớp vỏ mỏng trên `composition/server` | ✓ VERIFIED | 5 route file mỗi file 7 dòng; `auth-invariants` ép ≤ 25 dòng, phải import `@/composition/server/`, cấm import `@tripory/*/http` |
| 4 | Không dựng `/api/auth/token` (thuộc Phase 7, CHAT-09) | ✓ VERIFIED | `auth-invariants`: thư mục `app/api/auth/token` không tồn tại |
| 5 | `proxy.ts` chỉ nhìn cookie, không gọi mạng, không giải mã token | ✓ VERIFIED | Đọc `proxy.ts`: chỉ `hasSessionCookie` + `toSafeNextPath`; invariant cấm `fetch(` và `@tripory/identity/http` |
| 6 | D-35: `BFF_SHARED_SECRET` chỉ ở `composition/server/**`, không `NEXT_PUBLIC_`, không inline qua `next.config` | ✓ VERIFIED | 3 invariant trong `auth-invariants.test.ts` xanh; `bff.ts` không truyền `clientIp` nên proxy chung không mang `X-Bff-Secret`; `03-15b-REVIEW.md` verdict APPROVED |
| 7 | Toast và `QueryClientProvider` được mount (FND-05 chuyển từ Phase 2) | ✓ VERIFIED | `app/providers.tsx` mount `QueryClientProvider`, `SessionEffects`, `SessionKeeper` (trong `Suspense`) và `<Toast />`. UAT bước 3, 13, 14: toast thật hiện sau thao tác ghi và còn thấy sau khi chuyển trang |
| 8 | Đồng bộ đa tab (đăng nhập/đăng xuất/đổi mật khẩu) | ✓ VERIFIED | `session-events.client.ts` (`remote-logged-in`/`remote-logged-out` qua BroadcastChannel) nối vào router bởi `SessionEffects`. UAT bước 10, 11, 15: PASS |
| 9 | Build không in `Uncached data was accessed outside of <Suspense>` | ✓ VERIFIED | Hai lần `pnpm build`, grep 0 kết quả |

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/composition/server/{bff,request-guards,session-store,upstream,env,auth-handlers,client-ip,dashboard-gate}.ts` | Lõi server: BFF, guard, cookie, upstream 28 s, env, handler | ✓ VERIFIED | Tồn tại, có nội dung thật (24 đến 337 dòng), đọc trực tiếp `bff.ts`, `request-guards.ts`, `session-store.ts` |
| `apps/web/src/composition/{http.client,session-cookies,session-events.client,query-client,identity.client,viewer.server}.ts` | Composition client và viewer server | ✓ VERIFIED | Đọc `http.client.ts`, `session-cookies.ts`; `viewer.server.ts` là file duy nhất import `server-only` (invariant) |
| `apps/web/src/app/api/auth/{login,register,logout,refresh,change-password}/route.ts`, `api/bff/[...path]/route.ts` | Route handler | ✓ VERIFIED | Cả 6 hiện trong bảng route của `pnpm build` |
| `apps/web/src/proxy.ts` | Gate lạc quan | ✓ VERIFIED | Hiện trong build là `Proxy (Middleware)` |
| `apps/web/src/modules/identity/ui/*` | Form, gate, keeper, recovery, effects | ✓ VERIFIED | Login, register, đổi mật khẩu, checklist, `SessionKeeper`, `SessionRecovery`, `SessionEffects` có nội dung thật |
| `apps/web/src/components/user-menu.tsx` + `(dashboard)/settings/password`, `(public)/login`, `(public)/register` | UI | ✓ VERIFIED | Route hiện trong build; menu đúng spec D-12..D-15 |
| `packages/identity/src/*` (domain/application/infrastructure/react) | `toSafeNextPath`, rule mật khẩu, DTO Zod, gateway, hook factory | ✓ VERIFIED | `identity` 244 test pass |
| `apps/web/src/auth-invariants.test.ts`, `proxy-coverage.test.ts` | Khóa bất biến tĩnh | ✓ VERIFIED | Nằm trong 845 test của `web`, pass |

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `providers.tsx` | `QueryClientProvider`, `Toast`, `SessionKeeper`, `SessionEffects` | JSX mount | ✓ WIRED | Đọc trực tiếp |
| `http.client.ts` | `/api/auth/refresh` | `authRawHttp.send({ path: "/refresh", sessionRefresh: false })` trong `lock` | ✓ WIRED | Đường refresh duy nhất (invariant) |
| `bff.ts` | `readSession` → `callBackend` | Bearer gắn từ cookie server | ✓ WIRED | `stale`/`invalid` → 401 `session.expired` không gọi BE |
| `proxy.ts` | `hasSessionCookie` + `toSafeNextPath` | import | ✓ WIRED | |
| `UserMenu` "Đăng xuất" | `useSessionActions().logout` → `/api/auth/logout` → `clearSession` | `signOut()` | ✓ WIRED | |
| `session-events.client.ts` | `SessionEffects` | `sessionEvents` | ✓ WIRED | Chỗ móc `registerLogoutHandler` sẵn cho Phase 7 |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `UserMenu` | `viewer` (tên, email, avatar) | `viewer.server.ts` đọc claim từ cookie, hồ sơ thật từ `users/me` qua BFF (`identityKeys.me`) | Có (UAT bước 5, 16: `users/me` 200 có dữ liệu) | ✓ FLOWING |
| Form đăng nhập/đăng ký/đổi mật khẩu | `fieldErrors`, toast | `ApiError` chuẩn hóa từ envelope BE (Phase 2) | Có (UAT bước 4, 12, 14) | ✓ FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Bất biến bảo mật tĩnh | `pnpm test` (gồm `auth-invariants.test.ts`) | 845/845 web pass | ✓ PASS |
| Build sạch Suspense | `pnpm build` x2, grep `Uncached data` | 0 kết quả | ✓ PASS |
| Hành vi trên BE thật | `03-UAT-CHECKLIST.md` | 19/19 PASS (chủ dự án chạy ngày 23/10/2026, BE local `localhost:5251`, `ExpiryMinutes=5`) | ✓ PASS (bằng chứng UAT, không chạy lại) |

## Requirements Coverage

Đối chiếu `requirements:` trong frontmatter 15 PLAN với `.planning/REQUIREMENTS.md`:

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| AUTH-01 | 03-04, 03-07, 03-10, 03-12, 03-14, 03-15 | Đăng ký, thấy lỗi validate BE | ✓ SATISFIED | `register-form.tsx`, `form-error-mapping.ts`; UAT 3, 4 |
| AUTH-02 | 03-01, 03-04, 03-05, 03-06, 03-07, 03-08, 03-12, 03-14, 03-15 | Token chỉ trong cookie httpOnly | ✓ SATISFIED | `session-store.ts`, invariants; UAT 6 |
| AUTH-03 | 03-01, 03-03, 03-05, 03-06, 03-07, 03-08, 03-09, 03-11, 03-13, 03-14, 03-15 | Giữ phiên, refresh im lặng single-flight | ✓ SATISFIED | `http.client.ts`; UAT 7, 8, 9, 17 |
| AUTH-04 | 03-01, 03-05, 03-06, 03-07, 03-11, 03-13, 03-14, 03-15 | Đăng xuất, xóa cookie, ngắt realtime | ✓ SATISFIED (phần realtime = chỗ móc D-23, deferred Phase 7) | `handleLogout`, `clearSession`; UAT 10, 11 |
| AUTH-05 | 03-01, 03-03, 03-09, 03-11, 03-12, 03-13, 03-14, 03-15 | Redirect đăng nhập, `?next=` nội bộ | ✓ SATISFIED | `proxy.ts`, `toSafeNextPath`; UAT 1, 2, 12 |
| AUTH-06 | 03-02, 03-03, 03-04, 03-07, 03-10, 03-12, 03-14, 03-15 | Đổi mật khẩu, thấy rule trước | ✓ SATISFIED | `change-password-form.tsx`, `password-checklist.tsx`; UAT 14, 15 |
| AUTH-07 | 03-02, 03-03, 03-04, 03-09, 03-13, 03-14, 03-15 | Menu user theo phiên thật | ✓ SATISFIED | `user-menu.tsx`; UAT 5, 18 |
| AUTH-08 | 03-01, 03-05, 03-08, 03-14, 03-15 | BFF allowlist, chặn `auth/*`, kiểm Origin | ✓ SATISFIED | `bff.ts`, `request-guards.ts`; UAT 16 |
| FND-05 (toast thật) | 03-06, 03-11, 03-12, 03-15 | Toast cho thao tác ghi | ✓ SATISFIED | `providers.tsx`; UAT 3, 13, 14 |

Cả 8 ID AUTH và FND-05 đều xuất hiện trong ít nhất một PLAN. **Orphaned requirements: không có.** Bảng traceability trong `REQUIREMENTS.md` đã đánh dấu AUTH-01..08 là Phase 3 / Complete (các dòng bị lặp ở bảng traceability là lỗi tài liệu nhỏ, không ảnh hưởng nội dung). Đã kiểm `ROADMAP.md`: không còn marker merge conflict.

## Quyết định D-01..D-35

Kiểm có đối chứng trong code với các quyết định rủi ro cao: D-04/D-10/D-25 (`proxy.ts`), D-14a/D-20 (`handleRefresh`, `callRefreshRoute`, `SessionRecovery`), D-15 (menu disabled + "Sắp có"), D-19 (`handleChangePassword` giữ cookie khi lỗi), D-22 (BroadcastChannel), D-23 (chỗ móc đăng xuất, không dựng `/api/auth/token`), D-24 (recovery client), D-35 (secret server-only, `03-15b-REVIEW.md` APPROVED). Không thấy quyết định nào bị vi phạm.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (không có) | | Quét `TODO/FIXME/placeholder/console.log` trong `composition/**`, `modules/**`: invariant cấm `console.*`, không phát hiện stub | ℹ️ Info | Không ảnh hưởng |
| `composition/server/client-ip.ts` | | Dự phòng `x-real-ip`/`x-forwarded-for` có thể bị client giả mạo khi host ngoài Vercel (đã ghi trong `03-15b-REVIEW.md`, LOW) | ℹ️ Info | Chỉ cần kiểm lại khi đổi hosting (Phase 8) |
| `.env.example`, `03-UAT-CHECKLIST.md` | | Secret dev `dev-bff-secret-change-me` | ℹ️ Info | Production phải đặt secret thật ở Vercel và BE |

Không có blocker hay warning.

## Human Verification Required

Không có. Các mục thủ công (nhiều tab, BE thật, cookie `HttpOnly`/`__Host-`, BE tắt/bật, cold start, responsive/bàn phím) đã được `03-UAT-CHECKLIST.md` phủ với 19/19 PASS, nên không đẩy sang human_needed.

## Gaps Summary

Không có gap. Hai hạng mục deferred (ngắt SignalR khi đăng xuất, BE revoke refresh token) là phạm vi đã chốt ngoài Phase 3 và không tính vào điểm. Các mục theo dõi cho phase sau: nối `registerLogoutHandler` ở Phase 7; FE gọi `/auth/logout` của BE sau khi merge nhánh BE; đặt `BFF_SHARED_SECRET` thật và `Cors__AllowedOrigins` ở Phase 8; kiểm lại nguồn IP khi đổi hosting.

---

_Verified: 2026-10-23T07:30:00Z_
_Verifier: Claude (gsd-verifier)_
