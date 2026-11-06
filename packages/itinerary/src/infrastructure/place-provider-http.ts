// Phần dùng chung của adapter Photon và Nominatim: GET JSON có timeout, chỉ gửi `accept` và `user-agent`
// (không cookie, không Authorization của người dùng). Mọi lỗi (mạng, timeout, status khác 2xx, JSON hỏng) đều thành
// một lỗi chung để BFF trả 502 mà không lộ chi tiết nhà cung cấp.

export const PLACE_PROVIDER_FAILED = 'place-provider-failed';

export type PlaceProviderConfig = Readonly<{
  fetch: typeof fetch;
  /** Origin của nhà cung cấp, lấy từ env server (D-142); không có dấu gạch cuối. */
  baseUrl: string;
  /** Định danh ứng dụng theo chính sách sử dụng của OSMF (UA mặc định của thư viện bị chặn). */
  userAgent: string;
  timeoutMs?: number;
}>;

export const DEFAULT_PROVIDER_TIMEOUT_MS = 5_000;

/** Kết quả tra ngược có `osm_key` này là đường, ranh giới, khu vực... không phải địa điểm nên không có tên (D-149). */
export const NON_POI_OSM_KEYS: ReadonlySet<string> = new Set([
  'highway',
  'place',
  'boundary',
  'landuse',
  'building',
  'railway',
  'waterway',
]);

export const trimBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

// Giữ dấu phẩy nguyên dạng trong `bbox`/`include` như ví dụ của Photon; phần còn lại mã hóa như thường.
const encodeQueryValue = (value: string): string => encodeURIComponent(value).replaceAll('%2C', ',');

export const queryStringOf = (params: ReadonlyArray<readonly [string, string | number]>): string =>
  params.map(([key, value]) => `${key}=${encodeQueryValue(String(value))}`).join('&');

export async function fetchProviderJson(
  config: PlaceProviderConfig,
  url: string,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  // AbortController + setTimeout thay AbortSignal.timeout để fake timers điều khiển được trong test.
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, config.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS);

  if (signal?.aborted === true) abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const response = await config.fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': config.userAgent },
    });

    if (!response.ok) throw new Error(PLACE_PROVIDER_FAILED);
    return await response.json();
  } catch {
    throw new Error(PLACE_PROVIDER_FAILED);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
