---
phase: 02-http-shared-kernel
fixed_at: 2026-10-12T00:00:00Z
review_path: .planning/phases/02-http-shared-kernel/02-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 2: Báo cáo sửa lỗi code review

**Nguồn review:** `.planning/phases/02-http-shared-kernel/02-REVIEW.md`
**Phạm vi:** Critical + Warning (`critical_warning`). Review có 0 Critical, 2 Warning, 4 Info.

**Tóm tắt:** 2/2 Warning đã sửa, 0 bỏ qua. Cả hai sửa trong `packages/api-client/src/with-session-refresh.ts`, không đổi quyết định nào của `02-CONTEXT.md` (single-flight + epoch, chỉ `'expired'` mới đăng xuất, refresh lỗi tạm thời thì lỗi gốc lan ra, phát lại đúng một lần). `boundaries.mjs` không đổi.

Kiểm tra sau khi sửa (gốc repo, PowerShell): `pnpm lint`, `pnpm typecheck`, `pnpm test` đều 7/7 task thành công. `with-session-refresh.test.ts`: 19/19 pass (trước đó 16).

## Đã sửa

### WR-02: 401 đến muộn sau lô `'expired'` gây refresh lần hai và gọi `onSessionExpired` lần hai

**File:** `packages/api-client/src/with-session-refresh.ts`, `packages/api-client/src/with-session-refresh.test.ts`
**Commit:** 389633c
**Trạng thái:** fixed: requires human verification (lỗi logic trạng thái)
**Đã làm:**
- Thêm `expiredAt` (epoch đã xác nhận hết phiên) và `notifyExpired()` gọi `deps.onSessionExpired()` tối đa một lần cho mỗi epoch. Nhánh `'expired'` của `refreshOnce` dùng `notifyExpired()`.
- Request 401 có `epoch === sentAt` và `expiredAt === sentAt` đi tắt ra `session.expired`, không gọi `refresh` lần nữa.
- Test mới: request `/c` gửi cùng epoch, nhận 401 sau khi lô `/a`, `/b` đã `'expired'` → `refresh` 1 lần, `onSessionExpired` 1 lần, cả 3 nhận `session.expired`.

**Lệch so với gợi ý của review:** review cho rằng trạng thái hết phiên tự hết hiệu lực khi refresh `'refreshed'` tăng `epoch`. Nhưng sau khi `expiredAt === epoch`, request 401 sẽ không bao giờ refresh nữa, nên epoch không bao giờ tăng: sau khi đăng nhập lại (`/api/auth/login` đi với `sessionRefresh: false`, không chạm epoch), lần access token hết hạn kế tiếp sẽ bị đi tắt ra `session.expired` thay vì refresh. Để tránh lỗi này, request `sessionRefresh: false` thành công khi `expiredAt === epoch` sẽ tăng `epoch` và xóa `expiredAt` (coi là phiên mới). Có test riêng: hết phiên → login thành công → 401 kế tiếp refresh bình thường, `onSessionExpired` vẫn 1 lần. Phase 3 cần biết: login/register phải đi qua client đã bọc (với `sessionRefresh: false`) thì trạng thái này mới được reset.

### WR-01: `session.expired` từ nhánh phát lại không gọi `onSessionExpired`

**File:** `packages/api-client/src/with-session-refresh.ts`, `packages/api-client/src/with-session-refresh.test.ts`
**Commit:** 67c3f8e
**Trạng thái:** fixed: requires human verification (lỗi logic trạng thái)
**Đã làm:**
- Nhánh phát lại vẫn 401 gọi `notifyExpired()` trước khi ném `sessionExpiredError()`. Vì vậy `session.expired` luôn đi cùng `onSessionExpired` (D-14), và chính sách nuốt toast `session_expired` của `decideMutationError` vẫn đúng. `mutation-feedback.ts` không đổi.
- Sửa test `phát lại vẫn 401`: giờ kỳ vọng `onSessionExpired` gọi 1 lần (trước là 0).
- Test mới: 3 request phát lại cùng vẫn 401 → `onSessionExpired` 1 lần; request 401 sau đó cùng epoch đi tắt ra `session.expired`, không refresh lại.

## Ngoài phạm vi (Info, không sửa)

- IN-01 (401 cũ phát lại ngay khi lượt refresh mới đang chạy), IN-02 (chính sách `session_expired` giữa `resolveFormError` và `decideMutationError`), IN-03 (`fieldErrors` chỉ freeze lớp ngoài), IN-04 (`buildUrl` không encode path). Để lại cho lần chạy với `fix_scope: all` hoặc Phase 3/4.

---

_Fixer: gsd-code-fixer · Iteration: 1_
