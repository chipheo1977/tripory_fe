# Review 03-16: D-36 FE gọi BE `POST /auth/logout` (best-effort)

Phạm vi: `fc4cdf1..5c84dab` (3 commit: feat `c535acb`, test `a09c492`, docs `5c84dab`). Verdict: **APPROVED**, không có blocker.

## Bằng chứng xác minh
Commit message của coder (`5c84dab`) ghi từ gốc repo: `pnpm lint` 8/8, `typecheck` 8/8, `test` 8/8 (web 916, identity 244, ui-web 180, api-client 95, config 104), `build` thành công, không có cảnh báo Uncached data. Không chạy lại, không có nghi ngờ cụ thể cần spot-check.

## Đối chiếu trọng tâm
- (a) Không bị BE chặn: `revokeRefreshTokenBestEffort` bọc toàn bộ trong `try/catch`, kể cả `readSession`, `readRawTokens` và ngoại lệ đồng bộ của `callBackend` (timeoutMs sai, URL lock). `callBackend` tự trả `timeout`/`network`, kết quả không được đọc. `handleLogout` luôn đi tiếp tới `successEnvelope` + `clearSession`. Test phủ 404/405/401/5xx/timeout/network/body sai/fetch ném đồng bộ.
- (b) Không rò token: không `console.*`, không log, response là `successEnvelope(null)` cố định, không chuyển body BE; thông điệp lỗi của `callBackend` không kèm token.
- (c) Bearer chỉ gửi tới `/api/v1/auth/logout` (hằng số cố định trong handler), URL lock origin + `/api/v1/` của `callBackend` giữ nguyên. Không truyền `clientIp` nên không có `X-Bff-Secret`/`X-Forwarded-For` (khớp hợp đồng BE: logout không dùng rate-limit policy).
- (d) Không refresh: chỉ gọi khi `readSession` là `fresh` (dùng `isFresh`/`STALE_AT_SEC` của identity), không gọi `handleRefresh`; test tĩnh trong `auth-invariants.test.ts` khóa việc đoạn logout không chứa `refresh-token|handleRefresh|api/auth/refresh`. Hợp đồng BE xác nhận bẫy `Token.Compromised`.
- (e) `timeoutMs` tùy chọn: validate hữu hạn và dương, chặn ở `Math.min(..., 28_000)`; mặc định không đổi cho caller khác (`upstream.test.ts` bổ sung). Timer được `clearTimeout` trong `finally`; đọc body nằm trong cửa sổ timeout.
- (f) Cookie: vẫn dùng `clearSession` (3 cookie, `maxAge: 0`, đủ attributes), test cũ credentials và test logout mới kiểm tra.
- (g) Origin check giữ nguyên ở đầu `handleLogout`, trả 403 `Bff.CrossOrigin` trước khi gọi BE (test cross-origin xác nhận không gọi BE, không Set-Cookie). Route `logout/route.ts` trả Promise từ handler, Next hỗ trợ.
- (h) Docs: D-36 thêm vào "Bổ sung sau research" của CONTEXT; dòng 3 của BE-DEPENDENCIES nói rõ cần BE merge/deploy mới thu hồi thật; UAT mục D bước 20 có cột kết quả TRỐNG, không đụng bước 1-19 và mục C, cảnh báo `Token.Compromised` rõ ràng. Không khẳng định kết quả chưa thu được.
- (i) Diff chỉ gồm 9 file của coder; không có `.env.local`, repo BE, `fetch-http-client.ts`; lịch sử là 3 commit nối tiếp, không amend.

## Findings
Không có HIGH hoặc MEDIUM. Không có LOW đáng ghi.
