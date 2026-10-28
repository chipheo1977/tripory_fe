// Hook itinerary đã lắp (composition root phía browser). Factory gọi MỘT lần ở đây (PITFALLS: hook factory).
// Dữ liệu đi qua BFF (`bffHttp`, bọc refresh); link Maps rút gọn đi qua route của app (`appHttp`).
import { createHttpItineraryRepository, createHttpShortLinkResolver } from "@tripory/itinerary/http";
import { createItineraryHooks } from "@tripory/itinerary/react";
import type { ItineraryId } from "@tripory/shared-kernel";
import { appHttp, bffHttp, bffUnloadHttp } from "./http.client";

const repository = createHttpItineraryRepository(bffHttp, { unloadHttp: bffUnloadHttp });

export const itinerary = createItineraryHooks({ repository, shortLinks: createHttpShortLinkResolver(appHttp) });

/** Lệnh gửi lúc trang đóng/ẩn (D-32, D-50): fetch keepalive qua BFF, không refresh phiên. */
export const itineraryUnload = {
  deleteWaypoint: (id: ItineraryId, waypointId: string) =>
    repository.deleteWaypoint(id, waypointId, { keepalive: true }),
} as const;
