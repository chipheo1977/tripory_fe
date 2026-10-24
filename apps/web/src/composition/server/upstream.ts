import { isIP } from "node:net";
import type { ServerDeps } from "./env";

/**
 * Nhỏ hơn timeout 30 giây của client (Phase 2 D-11) để client luôn nhận được phản hồi có cấu trúc (504) trước
 * khi tự timeout. Copy cold start D-31 ("tới 30 giây") vẫn đúng.
 */
export const UPSTREAM_TIMEOUT_MS = 28_000;

export type UpstreamResult =
  | Readonly<{
      kind: "response";
      status: number;
      body: string;
      contentType: string | null;
      /** Chỉ có key khi BE gửi `Retry-After` hợp lệ (số giây nguyên). Dùng để chuyển tiếp 429 (D-35). */
      retryAfter?: string;
    }>
  | Readonly<{ kind: "timeout" }>
  | Readonly<{ kind: "network" }>;

const JSON_CONTENT_TYPE = /^application\/(json|problem\+json)\s*(;|$)/i;

/**
 * Chỉ `application/json` và `application/problem+json` được đi qua BFF về cùng origin với app. Mọi loại khác
 * (`text/html`, `image/svg+xml`, trang lỗi của proxy phía trước BE...) sẽ được trình duyệt render trong origin
 * của app. Body rỗng (204, 401 trần) không có gì để render nên luôn được qua, kể cả thiếu content-type. Phase 7 cần chuyển nhị phân thì thêm
 * allowlist riêng cho route đó, kèm `Content-Disposition` hoặc CSP `sandbox`.
 */
export function isPassableUpstreamBody(contentType: string | null, body: string): boolean {
  if (body === "") return true;

  return contentType !== null && JSON_CONTENT_TYPE.test(contentType.trim());
}

/** Hai header BE dùng để tin IP do BFF khai báo (RateLimiting/ClientIpResolver.cs). So khớp không phân biệt hoa thường. */
const RATE_LIMIT_HEADER_NAMES = new Set(["x-bff-secret", "x-forwarded-for"]);

/**
 * Gắn `X-Bff-Secret` + `X-Forwarded-For` để BE đếm giới hạn tốc độ theo IP người dùng thật thay vì IP của
 * server FE (nếu không, cả site chung một bucket: 5 login/phút, 3 register/giờ).
 *
 * - Hai header này CHỈ có thể đến từ tham số `clientIp` (đã kiểm `isIP`) và env: mọi `x-bff-secret` /
 *   `x-forwarded-for` nằm sẵn trong `headers` do người gọi đưa vào đều bị loại, nên dữ liệu từ trình duyệt
 *   không có đường nào đặt được chúng.
 * - Chưa cấu hình secret → không gửi gì, BE dùng IP socket (hành vi hiện tại).
 * - Có secret nhưng KHÔNG suy ra được IP (dev local không proxy) → cũng không gửi gì. Đây là lựa chọn an toàn
 *   hơn gửi mỗi `X-Bff-Secret`: BE vẫn rơi về IP socket khi thiếu hoặc sai XFF, nên gửi secret lúc này không
 *   mang lại gì mà chỉ thêm một lần lộ secret trên đường truyền.
 * - Chỉ các lời gọi được truyền `clientIp` (login, register, refresh, là ba endpoint BE giới hạn tốc độ) mới
 *   mang secret. Change-password và proxy `/api/bff` không truyền, để secret ra khỏi server FE ít nhất có thể.
 */
function withRateLimitHeaders(
  headers: Readonly<Record<string, string>> | undefined,
  secret: string | undefined,
  clientIp: string | null | undefined,
): Record<string, string> | undefined {
  if (headers === undefined && (secret === undefined || !clientIp)) return undefined;

  const safe = Object.fromEntries(
    Object.entries(headers ?? {}).filter(([name]) => !RATE_LIMIT_HEADER_NAMES.has(name.toLowerCase())),
  );

  if (secret === undefined || !clientIp || isIP(clientIp) === 0) return safe;

  return { ...safe, "x-bff-secret": secret, "x-forwarded-for": clientIp };
}

/**
 * Cửa duy nhất để server gọi BE. Không ném `ApiError`: route cần status và body nguyên để chuyển tiếp cho
 * client (hoặc đọc `errorCode` để quyết định giữ hay xóa cookie).
 *
 * URL bị khóa: sau khi chuẩn hóa phải còn cùng origin với `API_ORIGIN` và pathname bắt đầu `/api/v1/`, nên
 * `//evil/…`, URL tuyệt đối, `..` hay `%2e%2e` không biến BFF thành open proxy (T-03-18). Sai là lỗi lập
 * trình, ném Error thay vì trả kết quả upstream.
 *
 * `redirect: "manual"`: 3xx của BE được chuyển như response chứ không bị theo, nên BE bị chiếm quyền cũng
 * không dẫn server đi tới host khác. Không log URL, header hay body: header có Bearer, body có mật khẩu.
 */
export async function callBackend(
  deps: ServerDeps,
  pathWithQuery: string,
  init: Readonly<{
    method: string;
    headers?: Readonly<Record<string, string>>;
    body?: BodyInit | null;
    /**
     * IP người dùng cuối, CHỈ truyền cho các lời gọi mà BE giới hạn tốc độ theo IP (login, register, refresh).
     * Xem `rateLimitHeaders`.
     */
    clientIp?: string | null;
    /**
     * Timeout riêng cho lời gọi best-effort (logout, D-36). Phải là số dương hữu hạn; bị chặn trên bởi
     * `UPSTREAM_TIMEOUT_MS`. Bỏ trống → dùng `UPSTREAM_TIMEOUT_MS`.
     */
    timeoutMs?: number;
  }>,
): Promise<UpstreamResult> {
  if (init.timeoutMs !== undefined && !(Number.isFinite(init.timeoutMs) && init.timeoutMs > 0)) {
    throw new Error("timeoutMs không hợp lệ");
  }

  const timeoutMs = Math.min(init.timeoutMs ?? UPSTREAM_TIMEOUT_MS, UPSTREAM_TIMEOUT_MS);
  const url = new URL(pathWithQuery, deps.env.apiOrigin);

  // Thông điệp cố ý không kèm đường dẫn: nó có thể chứa dữ liệu do client gửi.
  if (url.origin !== deps.env.apiOrigin || !url.pathname.startsWith("/api/v1/")) {
    throw new Error("Upstream URL không hợp lệ");
  }

  const headers = withRateLimitHeaders(init.headers, deps.env.bffSharedSecret, init.clientIp);

  // Gọi như hàm trần: `deps.fetch(...)` làm `this` thành object deps và ném "Illegal invocation".
  const doFetch = deps.fetch;

  // Timeout tự cài (cùng cơ chế `createFetchHttpClient`): cờ `timedOut` phân biệt timeout với lỗi mạng.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await doFetch(url.href, {
      method: init.method,
      headers,
      body: init.body,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    // Đọc body vẫn nằm trong cửa sổ timeout: BE có thể gửi header rồi treo body.
    const body = await response.text();
    const retryAfter = response.headers.get("retry-after")?.trim();

    return {
      kind: "response",
      status: response.status,
      body,
      contentType: response.headers.get("content-type"),
      // Chỉ nhận số giây nguyên ngắn: không chuyển tiếp chuỗi tùy ý của BE về trình duyệt.
      ...(retryAfter !== undefined && /^\d{1,7}$/.test(retryAfter) ? { retryAfter } : {}),
    };
  } catch {
    return timedOut ? { kind: "timeout" } : { kind: "network" };
  } finally {
    clearTimeout(timer);
  }
}
