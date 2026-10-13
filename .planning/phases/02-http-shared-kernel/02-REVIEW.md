---
phase: 02-http-shared-kernel
reviewed: 2026-10-12T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - packages/api-client/package.json
  - packages/api-client/src/api-error.ts
  - packages/api-client/src/http-client.ts
  - packages/api-client/src/response-shapes.ts
  - packages/api-client/src/to-api-error.ts
  - packages/api-client/src/fetch-http-client.ts
  - packages/api-client/src/with-session-refresh.ts
  - packages/api-client/src/with-session-refresh.test.ts
  - packages/api-client/src/fetch-http-client.test.ts
  - packages/api-client/src/http.ts
  - packages/api-client/src/index.ts
  - packages/shared-kernel/package.json
  - packages/shared-kernel/src/ids.ts
  - packages/shared-kernel/src/geo.ts
  - packages/shared-kernel/src/index.ts
  - packages/config/test/boundaries.test.ts
  - apps/web/package.json
  - apps/web/src/lib/feedback/error-messages.ts
  - apps/web/src/lib/feedback/select-error-message.ts
  - apps/web/src/lib/feedback/resolve-form-error.ts
  - apps/web/src/lib/feedback/mutation-feedback.ts
  - apps/web/src/lib/feedback/index.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-10-12
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phạm vi: `git diff 4c1175f..HEAD -- packages apps` (31 file, đã đọc toàn bộ source và test của `with-session-refresh`; các test khác đọc lướt theo tên case). Bằng chứng kiểm tra lấy từ `02-0{1..4}-SUMMARY.md`: `pnpm lint`, `pnpm typecheck`, `pnpm test` ở gốc repo đều 7/7 task thành công sau mỗi plan. Reviewer không chạy lại suite nào.

Đối chiếu quyết định đã chốt trong `02-CONTEXT.md`:

| Quyết định | Kết quả |
|---|---|
| D-13 single-flight + epoch, `Lock` tiêm vào | Đạt (`inFlight ??=`, `epoch` trong closure, test N=5 và test 401 đến muộn) |
| D-14/D-14a chỉ `'expired'` → `session.expired` + `onSessionExpired` một lần cho lô | Đạt trong lô chính; có lỗ ở WR-01, WR-02 |
| D-14a refresh lỗi tạm thời → lỗi gốc lan ra, không đăng xuất, lần sau refresh lại | Đạt (`.finally` reset `inFlight`; test network và 503) |
| Phát lại đúng một lần, vẫn 401 → `session.expired` | Đạt |
| D-11 timeout 30s bằng `AbortController`, bao cả đọc body | Đạt (`response.text()` nằm trong try, `clearTimeout` ở `finally`, có test body treo) |
| D-12 không tự retry | Đạt (test 503 và network gọi `fetch` đúng 1 lần) |
| `ApiError` plain object, type guard viết tay, không lưu raw body/header/token | Đạt (`makeApiError` chỉ chép 5 field đã biết, `Object.freeze`) |
| D-16 tra bảng bằng `Map` | Đạt (`ReadonlyMap`, test key prototype) |
| D-03/D-04 copy tiếng Việt → message BE → "Đã có lỗi xảy ra, vui lòng thử lại" | Đạt |
| D-05a ô form hiện "Giá trị không hợp lệ.", toast câu chung, `api-client` giữ chuỗi gốc | Đạt |
| Ranh giới ESLint | Đạt: `boundaries.mjs` không đổi, thêm 12 case self-test; `./http` chỉ cho composition; `api-client` không chạm `navigator`/`window`/`localStorage`/`zod` |

Không có lỗi Critical. Hai Warning cùng nằm ở nhánh hết phiên của `withSessionRefresh`: có đường trả `session.expired` mà không gọi `onSessionExpired`, và có đường gọi `onSessionExpired` (và refresh) lần hai cho cùng một lần hết phiên. Kết hợp với `decideMutationError` bỏ qua toast cho `session_expired`, WR-01 có thể khiến người dùng không thấy gì cả.

## Warnings

### WR-01: `session.expired` từ nhánh phát lại không gọi `onSessionExpired`, và toast cũng bị tắt

**File:** `packages/api-client/src/with-session-refresh.ts:84-89`, `apps/web/src/lib/feedback/mutation-feedback.ts:21-22`
**Issue:** Khi request phát lại vẫn 401, code ném `sessionExpiredError()` nhưng không gọi `deps.onSessionExpired()` (test `phát lại vẫn 401` còn khẳng định gọi 0 lần). Trong khi đó `decideMutationError` trả `null` cho mọi lỗi `kind === 'session_expired'` với lý do "do `onSessionExpired` của Phase 3 xử lý". Hệ quả: refresh báo `'refreshed'` nhưng phiên thực tế vẫn hỏng (cookie không được set, BE thu hồi ngay...) thì mutation thất bại, không toast, không chuyển trang đăng nhập. Người dùng bấm mà không có phản hồi nào. Cặp "`session.expired` đi cùng `onSessionExpired`" của D-14 bị tách ra ở nhánh này. Cùng tình trạng với request có `epoch !== sentAt` rồi phát lại vẫn 401.
**Fix:** Gọi callback ở nhánh phát lại, có chống gọi lặp (xem WR-02), rồi sửa test cho khớp:
```ts
} catch (replayError) {
  if (isApiError(replayError) && replayError.status === 401) {
    notifyExpired(); // gọi deps.onSessionExpired() tối đa một lần cho mỗi epoch
    throw sessionExpiredError();
  }
  throw replayError;
}
```
Nếu cố ý không gọi callback ở đây thì `decideMutationError` không được nuốt toast `session_expired`; khi đó ghi rõ cách đọc vào `02-CONTEXT.md`.

### WR-02: 401 đến muộn sau lô `'expired'` gây refresh lần hai và gọi `onSessionExpired` lần hai

**File:** `packages/api-client/src/with-session-refresh.ts:47-60, 71-76`
**Issue:** Nhánh `'expired'` không đổi `epoch` và `.finally` đặt `inFlight = null`. Request gửi cùng epoch nhưng nhận 401 sau khi lô `'expired'` đã xong sẽ thấy `epoch === sentAt`, `inFlight === null`, nên gọi `deps.refresh()` lần nữa (bằng refresh token đã bị BE từ chối) và gọi `onSessionExpired` lần nữa. Không mất dữ liệu, nhưng trái với "gọi một lần" của D-14, và Phase 3 phải tự chống điều hướng/thông báo lặp. Test hiện chỉ phủ trường hợp mọi request cùng chờ một `inFlight`.
**Fix:** Ghi nhận trạng thái hết phiên theo epoch và đi tắt:
```ts
let expiredAt: number | null = null;
const notifyExpired = () => {
  if (expiredAt === epoch) return;
  expiredAt = epoch;
  deps.onSessionExpired();
};
// trong refreshOnce: if (outcome === 'refreshed') epoch += 1; else notifyExpired();
// trong send, trước khi refresh:
if (expiredAt === sentAt) throw sessionExpiredError();
```
Thêm test: 3 request cùng epoch, 2 cái 401 trước và nhận `'expired'`, cái thứ 3 trả 401 sau đó → `refresh` 1 lần, `onSessionExpired` 1 lần, cả 3 nhận `session.expired`. Khi đăng nhập lại thành công (refresh `'refreshed'` tăng `epoch`) trạng thái tự hết hiệu lực.

## Info

### IN-01: 401 cũ đến trong lúc một lượt refresh mới đang chạy thì phát lại ngay, không chờ

**File:** `packages/api-client/src/with-session-refresh.ts:71-82`
**Issue:** Nếu `epoch !== sentAt` nhưng `inFlight` khác `null` (lượt refresh kế tiếp đang chạy), request phát lại ngay với token có thể sắp bị xoay, dễ 401 lần nữa và rơi vào `session.expired`. Ca hiếm (cần hai lượt refresh sát nhau).
**Fix:** Trước khi phát lại, nếu `inFlight` khác `null` thì `await inFlight` (vẫn không khởi động refresh mới).

### IN-02: Chính sách `session_expired` không thống nhất giữa `resolveFormError` và `decideMutationError`

**File:** `apps/web/src/lib/feedback/resolve-form-error.ts:34`, `apps/web/src/lib/feedback/mutation-feedback.ts:22`
**Issue:** `decideMutationError` không toast lỗi `session_expired`, còn `resolveFormError` trả `toastMessage` là `SESSION_EXPIRED_MESSAGE` cho cùng lỗi đó. Form dùng `errorToast: false` và tự toast theo `resolveFormError` sẽ hiện toast hết phiên song song với điều hướng của `onSessionExpired`.
**Fix:** Chọn một chính sách và áp cho cả hai hàm (ví dụ `resolveFormError` trả `toastMessage: null` khi `kind === 'session_expired'`), kèm test.

### IN-03: `fieldErrors` chỉ freeze lớp ngoài

**File:** `packages/api-client/src/to-api-error.ts:32-41`
**Issue:** Mảng message bên trong `fieldErrors` vẫn mutable, trong khi type là `readonly string[]` và `ApiError` được `Object.freeze`. Không có bug hiện tại, chỉ là bất biến không trọn vẹn.
**Fix:** `Object.fromEntries([...merged].map(([k, v]) => [k, Object.freeze(v)]))`.

### IN-04: `buildUrl` không encode path

**File:** `packages/api-client/src/fetch-http-client.ts:22-31`
**Issue:** `request.path` được nối nguyên văn. Query đã qua `URLSearchParams`, nhưng route param chèn vào path (ví dụ slug, id chưa qua `parseItineraryId`) có thể chứa `/`, `?`, `#`, `..` và đổi đích request. Hiện chưa có caller nên chưa thành lỗi.
**Fix:** Ghi trong JSDoc của `HttpRequest.path` rằng caller phải `encodeURIComponent` từng segment động, hoặc thêm helper `path\`/api/v1/itineraries/${id}\`` encode tự động khi Phase 3/4 có caller đầu tiên.

---

_Reviewed: 2026-10-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
