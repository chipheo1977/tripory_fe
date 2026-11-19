// Hook social đã lắp (composition root phía browser). Factory gọi MỘT lần ở đây (PITFALLS: hook factory).
// Dữ liệu like và bình luận đi qua BFF (`bffHttp`, bọc refresh phiên): client không có token, không gọi BE trực tiếp.
import { createHttpSocialRepository } from "@tripory/social/http";
import { createSocialHooks } from "@tripory/social/react";
import { bffHttp } from "./http.client";

const repository = createHttpSocialRepository(bffHttp);
export const social = createSocialHooks({ repository });
