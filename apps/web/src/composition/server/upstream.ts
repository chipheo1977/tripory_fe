import type { ServerDeps } from "./env";

/**
 * Nhỏ hơn timeout 30 giây của client (Phase 2 D-11) để client luôn nhận được phản hồi có cấu trúc (504) trước
 * khi tự timeout. Copy cold start D-31 ("tới 30 giây") vẫn đúng.
 */
export const UPSTREAM_TIMEOUT_MS = 28_000;

export type UpstreamResult =
  | Readonly<{ kind: "response"; status: number; body: string; contentType: string | null }>
  | Readonly<{ kind: "timeout" }>
  | Readonly<{ kind: "network" }>;

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
  init: Readonly<{ method: string; headers?: Readonly<Record<string, string>>; body?: BodyInit | null }>,
): Promise<UpstreamResult> {
  const url = new URL(pathWithQuery, deps.env.apiOrigin);

  // Thông điệp cố ý không kèm đường dẫn: nó có thể chứa dữ liệu do client gửi.
  if (url.origin !== deps.env.apiOrigin || !url.pathname.startsWith("/api/v1/")) {
    throw new Error("Upstream URL không hợp lệ");
  }

  // Gọi như hàm trần: `deps.fetch(...)` làm `this` thành object deps và ném "Illegal invocation".
  const doFetch = deps.fetch;

  // Timeout tự cài (cùng cơ chế `createFetchHttpClient`): cờ `timedOut` phân biệt timeout với lỗi mạng.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, UPSTREAM_TIMEOUT_MS);

  try {
    const response = await doFetch(url.href, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    // Đọc body vẫn nằm trong cửa sổ timeout: BE có thể gửi header rồi treo body.
    const body = await response.text();

    return {
      kind: "response",
      status: response.status,
      body,
      contentType: response.headers.get("content-type"),
    };
  } catch {
    return timedOut ? { kind: "timeout" } : { kind: "network" };
  } finally {
    clearTimeout(timer);
  }
}
