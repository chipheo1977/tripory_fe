// Lắp `PlacesDeps` cho ba route `/api/places/*`. Cache, limiter và cổng Nominatim là singleton của process (mỗi
// instance serverless có bản riêng, chấp nhận theo D-143). Env đọc LÚC GỌI qua `serverDeps()`, không lúc import,
// để `next build` không cần biến môi trường. Không import `server-only` (invariant: chỉ `viewer.server.ts`).
import { createPlaceSearchService } from "@tripory/itinerary";
import type { PlaceReverseProvider, PlaceSearchService } from "@tripory/itinerary";
import { createNominatimReverseProvider, createPhotonPlaceSearchProvider } from "@tripory/itinerary/http";
import { createMinIntervalGate, createWindowLimiter, type MinIntervalGate } from "@/lib/in-memory/rate-limit";
import { createTtlCache } from "@/lib/in-memory/ttl-cache";
import { destinationCatalog } from "../destination-catalog";
import { DEFAULT_NOMINATIM_BASE_URL, DEFAULT_PHOTON_BASE_URL, serverDeps, type ServerDeps } from "./env";
import type { PlacesDeps } from "./places-handlers";

/** Định danh ứng dụng theo chính sách OSMF (UA mặc định của thư viện bị chặn). */
export const PLACES_USER_AGENT = "Tripory/0.1 (+https://triporyv1.vercel.app)";
/** Nominatim: tối đa 1 request/giây cho cả ứng dụng; để dư 100 ms. */
export const NOMINATIM_MIN_INTERVAL_MS = 1_100;
export const PLACES_RATE_LIMIT = Object.freeze({ limit: 30, windowMs: 60_000 });
export const PLACES_CACHE_MAX_ENTRIES = 500;

/** Cổng đóng thì bỏ qua Nominatim (trả `null`), không xếp hàng; service giữ kết quả Photon. */
export function gatedReverse(
  provider: PlaceReverseProvider,
  gate: MinIntervalGate,
  nowMs: () => number,
): PlaceReverseProvider {
  return {
    reverse(coordinate, signal) {
      if (!gate.tryPass(nowMs())) return Promise.resolve(null);

      return provider.reverse(coordinate, signal);
    },
  };
}

function buildService(server: ServerDeps): PlaceSearchService {
  const { env, fetch, nowMs } = server;
  const provider = createPhotonPlaceSearchProvider({
    fetch,
    baseUrl: env.photonBaseUrl ?? DEFAULT_PHOTON_BASE_URL,
    userAgent: PLACES_USER_AGENT,
  });
  const nominatimBaseUrl = env.nominatimBaseUrl === undefined ? DEFAULT_NOMINATIM_BASE_URL : env.nominatimBaseUrl;
  const nominatim =
    nominatimBaseUrl === null
      ? null
      : createNominatimReverseProvider({ fetch, baseUrl: nominatimBaseUrl, userAgent: PLACES_USER_AGENT });
  const reverseFallback =
    nominatim === null ? null : gatedReverse(nominatim, createMinIntervalGate(NOMINATIM_MIN_INTERVAL_MS), nowMs);

  return createPlaceSearchService({ provider, reverseFallback });
}

type Singletons = Readonly<{ service: PlaceSearchService; cache: PlacesDeps["cache"]; limiter: PlacesDeps["limiter"] }>;

let singletons: Singletons | null = null;

/** Dựng một lần ở request đầu tiên rồi dùng lại; `server` đọc lại mỗi request như các route khác. */
export function placesDeps(): PlacesDeps {
  const server = serverDeps();

  singletons ??= {
    service: buildService(server),
    cache: createTtlCache<unknown>({ maxEntries: PLACES_CACHE_MAX_ENTRIES, nowMs: server.nowMs }),
    limiter: createWindowLimiter(PLACES_RATE_LIMIT),
  };

  return { server, ...singletons, destinations: destinationCatalog };
}
