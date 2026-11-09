// Hook tìm địa điểm đã lắp (composition root phía browser, D-151). Mọi lời gọi đi qua route `/api/places/*` của app
// (`appHttp`), không bao giờ gọi thẳng Photon hay Nominatim từ trình duyệt (D-143).
import { createHttpPlaceLookup } from "@tripory/itinerary/http";
import { createPlaceHooks } from "@tripory/itinerary/react";
import { appHttp } from "./http.client";

export const places = createPlaceHooks(createHttpPlaceLookup(appHttp));
