---
phase: 03-identity-session-bff
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 62
files_reviewed_list:
  - apps/web/src/composition/session-cookies.ts
  - apps/web/src/composition/server/session-store.ts
  - apps/web/src/composition/server/upstream.ts
  - apps/web/src/composition/server/request-guards.ts
  - apps/web/src/composition/server/env.ts
  - apps/web/src/composition/server/client-ip.ts
  - apps/web/src/composition/server/bff.ts
  - apps/web/src/composition/server/auth-handlers.ts
  - apps/web/src/composition/server/dashboard-gate.ts
  - apps/web/src/composition/http.client.ts
  - apps/web/src/composition/session-events.client.ts
  - apps/web/src/composition/query-client.ts
  - apps/web/src/composition/identity.client.ts
  - apps/web/src/composition/viewer.server.ts
  - apps/web/src/proxy.ts
  - apps/web/src/app/api/auth/login/route.ts
  - apps/web/src/app/api/auth/register/route.ts
  - apps/web/src/app/api/auth/logout/route.ts
  - apps/web/src/app/api/auth/refresh/route.ts
  - apps/web/src/app/api/auth/change-password/route.ts
  - apps/web/src/app/api/bff/[...path]/route.ts
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/providers.tsx
  - apps/web/src/app/(dashboard)/layout.tsx
  - apps/web/src/app/(dashboard)/settings/password/page.tsx
  - apps/web/src/app/(public)/login/page.tsx
  - apps/web/src/app/(public)/register/page.tsx
  - apps/web/src/components/account-slot.tsx
  - apps/web/src/components/app-header.tsx
  - apps/web/src/components/app-shell.tsx
  - apps/web/src/components/user-menu.tsx
  - apps/web/src/modules/identity/ui/auth-fields.tsx
  - apps/web/src/modules/identity/ui/auth-form-card.tsx
  - apps/web/src/modules/identity/ui/change-password-form.tsx
  - apps/web/src/modules/identity/ui/dashboard-session-gate.tsx
  - apps/web/src/modules/identity/ui/form-error-mapping.ts
  - apps/web/src/modules/identity/ui/form-schemas.ts
  - apps/web/src/modules/identity/ui/guest-login-button.tsx
  - apps/web/src/modules/identity/ui/login-form.tsx
  - apps/web/src/modules/identity/ui/login-redirect.tsx
  - apps/web/src/modules/identity/ui/password-checklist.tsx
  - apps/web/src/modules/identity/ui/register-form.tsx
  - apps/web/src/modules/identity/ui/session-effects.tsx
  - apps/web/src/modules/identity/ui/session-keeper.tsx
  - apps/web/src/modules/identity/ui/session-recovery.tsx
  - apps/web/src/modules/identity/ui/submit-status.tsx
  - apps/web/src/modules/identity/ui/use-session-actions.ts
  - apps/web/src/lib/feedback/error-messages.ts
  - packages/identity/src/domain/safe-next-path.ts
  - packages/identity/src/domain/token-freshness.ts
  - packages/identity/src/infrastructure/access-token-claims.ts
  - packages/identity/src/infrastructure/dto.ts
  - packages/identity/src/infrastructure/mappers.ts
  - packages/identity/src/infrastructure/http-session-gateway.ts
  - packages/identity/src/react/index.ts
  - packages/api-client/src/fetch-http-client.ts
  - packages/api-client/src/with-session-refresh.ts
  - packages/ui-web/src/atoms/button.tsx
  - packages/ui-web/src/molecules/dropdown-menu.tsx
  - packages/ui-web/src/molecules/inline-alert.tsx
  - packages/ui-web/src/molecules/password-input.tsx
  - packages/config/test/boundaries.test.ts
  - packages/identity/eslint.config.mjs
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-20
**Depth:** standard
**Files Reviewed:** 62
**Status:** issues_found

## Summary

Đã review phần source thay đổi của Phase 3 (diff `c682789..HEAD`), tập trung vào ASVS L1 cho BFF và vòng đời phiên. Không có lỗi Critical. Các điểm cốt lõi đều đúng thiết kế và đã được xác minh bằng việc đọc code:

- Cookie `__Host-`: ghi với `Secure`, `Path=/`, không `Domain`, `SameSite=Lax`. Xóa bằng cách ghi lại đủ thuộc tính với `Max-Age=0` (không dùng `delete` của Next), đúng T-03-16.
- Token chỉ rời server qua `Set-Cookie`. Body trả về trình duyệt chỉ có `viewer` hoặc cờ. `toViewer` chép đúng 5 trường. Không có `console.*` trong `composition/**` và `app/api/**`. `viewer.server.ts` có `server-only`. Không có biến `NEXT_PUBLIC_*` chứa secret.
- BFF chống open-proxy tốt: kiểm dạng mã hóa trên chuỗi thô, kiểm từng segment, allowlist gốc (`users|itineraries|chat`), khóa origin + `/api/v1/` trong `callBackend`, `redirect: "manual"`. Header đi chỉ gồm `accept`, `content-type` và `authorization` do server gắn.
- Origin/CSRF được kiểm ở đầu mọi handler ghi. `?next=` luôn qua `toSafeNextPath` trước khi vào router hoặc `redirect`.
- Refresh có đúng một đường (`refreshSession` + `Lock` + route idempotent theo đồng hồ server). Phân biệt đúng 400/401/403 (xóa cookie) với 5xx/429/timeout (giữ cookie, trả 503), nên không đăng xuất oan.
- D-35: `x-bff-secret`/`x-forwarded-for` từ client bị loại, IP phải qua `isIP`, chỉ login/register/refresh mang secret.
- ESLint boundaries: chỉ thêm case self-test, không nới allowlist.
- Bộ test cho code rủi ro (cookie, refresh, BFF traversal, upstream, client-ip, session-store) đủ sâu và kiểm đúng thuộc tính bảo mật.

Có 4 Warning (hardening và một ca refresh hiếm) và 7 Info. Chi tiết bên dưới.

## Warnings

### WR-01: BFF và `/api/auth/*` chuyển tiếp `content-type` và body của BE nguyên văn, không `nosniff`, không lọc body 5xx

**File:** `apps/web/src/composition/server/bff.ts:157-166`, `apps/web/src/composition/server/auth-handlers.ts:83-99`
**Issue:** Response của BE (kể cả 5xx) được trả về cùng origin với app, giữ nguyên `content-type` và body. Có hai rủi ro:
1. Nếu BE (hoặc một lớp phía trước như Render/Cloudflare) trả `text/html`, `image/svg+xml` hoặc trang lỗi có phản chiếu đường dẫn, trình duyệt sẽ render nó trong origin của app. Phase 7 sẽ phục vụ file người dùng tải lên (ảnh, voice) nên bề mặt này sẽ lớn dần. Không có `X-Content-Type-Options: nosniff`, cũng không có allowlist content-type.
2. Body 5xx của BE (ProblemDetails, stack trace khi BE chạy ở môi trường Development hoặc cấu hình sai) đi thẳng về trình duyệt. Đó là rò rỉ thông tin (ASVS 7.4 / 14.3).

Ghi chú: BFF đã bỏ `set-cookie`, `location` và header lộ công nghệ, nên phần còn lại là hardening, không phải lỗ hổng khai thác được hiện tại.

**Fix:** Chỉ cho `application/json` và `application/problem+json` đi qua. Thêm `nosniff`. Với 5xx thì tạo envelope FE thay vì chuyển body BE.
```ts
const JSON_CT = /^application\/(json|problem\+json)(\s*;|$)/i;

const responseHeaders = new Headers({
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
});

if (upstream.status >= 500) return errorEnvelope(upstream.status === 504 ? 504 : 502, "Bff.UpstreamError", nowMs);

if (upstream.contentType !== null && !JSON_CT.test(upstream.contentType)) {
  return errorEnvelope(502, "Bff.InvalidUpstream", nowMs);
}
responseHeaders.set("content-type", upstream.contentType ?? "application/json");
```
Áp dụng tương tự trong `forwardUpstream` của `auth-handlers.ts`. Khi Phase 7 cần chuyển nhị phân, thêm allowlist riêng cho route đó cùng `Content-Disposition`/CSP `sandbox`.

### WR-02: `rotateSession` giữ cookie cũ khi BE đã xoay refresh token nhưng FE không ghi được cookie mới

**File:** `apps/web/src/composition/server/auth-handlers.ts:269-281` (và 253-262)
**Issue:** Nhánh này chỉ chạy khi BE đã trả 2xx cho `refresh-token`, tức refresh token cũ đã bị xoay (một lần dùng). Nếu body hỏng, claim không đọc được hoặc `expiresAt` không parse được, code trả 502 và GIỮ cookie cũ. Comment ghi "không biết refresh token cũ đã bị BE xoay hay chưa", nhưng với 2xx thì BE chắc chắn đã xoay. Lần refresh kế tiếp gửi lại token cũ, BE coi là reuse và trả `Token.Compromised`, thu hồi mọi phiên của người dùng. Hậu quả: người dùng bị đăng xuất khỏi tất cả thiết bị với thông báo "Phiên không còn an toàn". Xác suất thấp (BE phải trả body sai hình dạng với status 2xx) nhưng hậu quả nặng hơn so với đăng xuất sạch.
**Fix:** Khi BE đã trả 2xx mà FE không dựng được phiên mới, coi phiên là chết: xóa cookie và trả 401 `session.expired`, hoặc ít nhất trả 502 kèm `clearSession`.
```ts
const written = writeSession(response, parsed.data, nowMs, deps.secure);
if (written.ok) return response;
return sessionEnded(deps); // refresh token cũ đã bị BE xoay, giữ lại chỉ dẫn tới Token.Compromised
```
Áp dụng cho cả nhánh `catch` khi parse `tokenEnvelope` thất bại.

### WR-03: `API_ORIGIN` và `BFF_SHARED_SECRET` không bị ép dùng HTTPS ở production

**File:** `apps/web/src/composition/server/env.ts:31-36, 60`
**Issue:** Schema chấp nhận `http:` ở mọi môi trường. Nếu `API_ORIGIN` ở production bị đặt nhầm là `http://...`, BFF gửi `Authorization: Bearer`, mật khẩu (login/register/change-password), refresh token và `X-Bff-Secret` qua kênh không mã hóa. `upstream.ts` đã cẩn thận để secret ít lộ nhất có thể, nhưng không có chốt chặn cấu hình (ASVS 9.1.1).
**Fix:** Ném lỗi trong `parseServerEnv` khi `process.env.NODE_ENV === "production"` và protocol không phải `https:`, trừ khi có cờ tường minh (ví dụ `ALLOW_INSECURE_API_ORIGIN=1` cho staging nội bộ).
```ts
const origin = new URL(parsed.data.API_ORIGIN);
if (isSecureCookieEnv() && origin.protocol !== "https:") {
  throw new Error("API_ORIGIN phải là https ở production");
}
```

### WR-04: Kiểm Origin so với `request.nextUrl.origin` có thể chặn toàn bộ request ghi khi hosting đổi (Host nội bộ)

**File:** `apps/web/src/composition/server/request-guards.ts:17`
**Issue:** `checkSameOrigin` so `Origin` với `request.nextUrl.origin`. Trên Vercel đây là origin công khai nên đúng. Nếu sau này self-host sau reverse proxy không chuyển `Host`/`X-Forwarded-Host`, `nextUrl.origin` có thể là địa chỉ nội bộ và mọi POST/PUT/DELETE (login, refresh, BFF) trả 403 `Bff.CrossOrigin`. Đây là chế độ lỗi "fail closed" nên an toàn, nhưng khó chẩn đoán, và `client-ip.ts` đã ghi nhận ràng buộc "chỉ chạy trên nền tảng ghi đè header". Nên ghi ràng buộc tương tự cho Origin và cho phép cấu hình.
**Fix:** Thêm biến env tùy chọn `APP_ORIGIN` (server-only). Nếu có thì so với giá trị đó, nếu không thì rơi về `nextUrl.origin`. Ghi chú ràng buộc hosting vào comment của hàm.

## Info

### IN-01: `readBoundedBody` đọc cả body vào bộ nhớ trước khi kiểm trần khi không có `content-length`

**File:** `apps/web/src/composition/server/bff.ts:62-72`
**Issue:** Request chunked không có `content-length` vẫn được `await request.arrayBuffer()` hết rồi mới so với 4 MB. Comment nói "chặn ở đây để request khổng lồ không bị đọc hết vào bộ nhớ", điều đó chỉ đúng khi header có mặt. Nền tảng hosting thường tự giới hạn body nên mức độ thấp.
**Fix:** Đọc `request.body` bằng reader, cộng dồn độ dài và hủy stream khi vượt `BFF_MAX_BODY_BYTES`.

### IN-02: `upstream.body` đọc bằng `response.text()` làm hỏng dữ liệu nhị phân

**File:** `apps/web/src/composition/server/upstream.ts:112-120`
**Issue:** Phase 3 chỉ có JSON nên chưa lỗi. Phase 7 (ảnh, voice) sẽ cần `arrayBuffer()`. Nên đánh dấu rõ giới hạn này để tránh bẫy khi mở rộng.
**Fix:** Thêm TODO có số phase vào docstring của `callBackend`, hoặc trả `body: ArrayBuffer` và để caller decode.

### IN-03: 429 qua BFF không chuyển `Retry-After`

**File:** `apps/web/src/composition/server/bff.ts:157-166`
**Issue:** `callBackend` đã bóc `retryAfter` hợp lệ và `forwardUpstream` của `/api/auth/*` chuyển nó (D-35), nhưng `forwardToBackend` bỏ qua. Các endpoint nghiệp vụ sau này nếu bị rate limit sẽ không cho client biết phải chờ bao lâu.
**Fix:** `if (upstream.status === 429 && upstream.retryAfter !== undefined) responseHeaders.set("retry-after", upstream.retryAfter);`

### IN-04: `export const inter` trong `app/layout.tsx` và dòng đầu `fetch-http-client.ts` có khoảng trắng thừa

**File:** `packages/api-client/src/fetch-http-client.ts:1`
**Issue:** Dòng 1 bắt đầu bằng một dấu cách (`" import { isApiError, ..."`) do diff Phase 3 thêm vào. Vô hại nhưng là nhiễu format, Prettier sẽ sửa. (`export const inter` ở layout có từ trước Phase 3 nên không tính.)
**Fix:** Xóa dấu cách đầu dòng, chạy `pnpm format` hoặc lint.

### IN-05: `UserMenu` có thể gọi lại `users/me` ngay sau `queryClient.clear()` của đăng xuất và gây toast "hết phiên" sai (chưa xác minh được)

**File:** `apps/web/src/modules/identity/ui/use-session-actions.ts:38-41`, `apps/web/src/components/user-menu.tsx:35`
**Issue:** `logout.onSuccess` gọi `queryClient.clear()` rồi `router.replace("/")`. Trong khoảng ngắn trước khi RSC đổi `UserMenu` thành `GuestLoginButton`, `useMyProfile(true)` vẫn được mount. Nếu nó render lại và tạo query mới, BFF nhận request không cookie, BE trả 401, `withSessionRefresh` gọi refresh, route trả 401 `session.expired`, `onSessionExpired` bắn toast "Phiên đăng nhập đã hết hạn" ngay sau khi người dùng chủ động đăng xuất. UAT đã duyệt nên có khả năng điều này không xảy ra trong thực tế (không có refetch), tôi chỉ đọc code chứ chưa tái hiện được. Ghi lại như một rủi ro cần một test hồi quy.
**Fix:** Phát `sessionEvents` ở trạng thái "đang đăng xuất" để `emitExpired` bị bỏ qua, hoặc gọi `queryClient.cancelQueries()` trước `clear()` và đặt `enabled` của `useMyProfile` theo cờ `isSigningOut`.

### IN-06: `PasswordInput` vừa đổi `aria-label` vừa đặt `aria-pressed`

**File:** `packages/ui-web/src/molecules/password-input.tsx:39-40`
**Issue:** Với nút bật/tắt, nên chọn một trong hai: nhãn cố định kèm `aria-pressed`, hoặc nhãn đổi theo trạng thái mà không có `aria-pressed`. Dùng cả hai khiến trình đọc màn hình đọc kiểu "Ẩn mật khẩu, nút bật tắt, đã nhấn", gây mâu thuẫn. Ngoài ra nút bị `disabled` khi `readOnly` (đang gửi) nên mất focus nếu người dùng đang đứng trên nút đó (UI-SPEC 03).
**Fix:** Giữ nhãn cố định `"Hiện mật khẩu"` cùng `aria-pressed={visible}`, hoặc bỏ `aria-pressed`. Với `readOnly`, dùng `aria-disabled` thay cho `disabled`.

### IN-07: Gate `SessionRecovery` có thể kẹt ở skeleton nếu `router.refresh()` không làm cookie "tươi" lên

**File:** `apps/web/src/modules/identity/ui/session-recovery.tsx:28-40`
**Issue:** `started` ref chặn gọi lại, và với `outcome === "refreshed"` chỉ gọi `router.refresh()` một lần. Nếu server vẫn thấy `stale` sau đó (lệch đồng hồ giữa các instance, hoặc route trả `refreshed: false` do token còn >150s trong khi gate coi ≤30s, không xảy ra với ngưỡng hiện tại nhưng phụ thuộc hai hằng số), trang giữ skeleton vô hạn và không có `ErrorState`. Ngưỡng hiện đúng (`STALE_AT_SEC=30 < REFRESH_IF_BELOW_SEC=150`), nhưng không có test khóa quan hệ này.
**Fix:** Thêm test bất biến `STALE_AT_SEC < REFRESH_IF_BELOW_SEC` và `PROACTIVE_LEAD_SEC < REFRESH_IF_BELOW_SEC`; cân nhắc chuyển sang `failed` sau một lần `router.refresh()` mà gate vẫn render lại `SessionRecovery`.

---

_Reviewed: 2026-05-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
