// Hook identity đã lắp (composition root phía browser). Gateway đăng nhập/đăng ký/đăng xuất/đổi mật khẩu đi
// qua `authHttp` (base /api/auth), hồ sơ đi qua `bffHttp` (base /api/bff); cả hai đã bọc refresh phiên nên
// 401 được refresh một lần rồi phát lại (login/register/logout tự tắt nhánh này bằng `sessionRefresh: false`).
import { createIdentityHooks } from "@tripory/identity/react";
import { createHttpProfileReader, createHttpSessionGateway } from "@tripory/identity/http";
import { authHttp, bffHttp } from "./http.client";

export const identity = createIdentityHooks({
  gateway: createHttpSessionGateway(authHttp),
  profile: createHttpProfileReader(bffHttp),
});
