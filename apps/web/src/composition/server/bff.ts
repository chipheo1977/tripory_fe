// BFF `/api/bff/[...path]`: lớp duy nhất đứng giữa trình duyệt và BE cho REST (AUTH-08). Hàm thuần, không
// `server-only` để test được bằng vitest. Không log gì ở đây: header có Bearer, body có dữ liệu người dùng.
import { NextResponse, type NextRequest } from "next/server";
import type { ServerDeps } from "./env";
import { checkSameOrigin, errorEnvelope } from "./request-guards";
import { readSession } from "./session-store";
import { callBackend } from "./upstream";

/**
 * Allowlist gốc đường dẫn. Đây là điều kiện để BFF không thành open proxy: client chỉ chạm được các nhóm
 * endpoint này của BE. `auth/*` cố ý KHÔNG có ở đây: token chỉ đi qua `/api/auth/*` (route riêng ghi cookie),
 * nên `auth/login` qua BFF rơi vào 404.
 */
export const BFF_ALLOWED_ROOTS: ReadonlySet<string> = new Set(["users", "itineraries", "chat"]);

/** BE chỉ dùng 4 verb này. */
export const BFF_ALLOWED_METHODS: ReadonlySet<string> = new Set(["GET", "POST", "PUT", "DELETE"]);

export type BffTarget = Readonly<{ ok: true; path: string }> | Readonly<{ ok: false; status: 400 | 404 }>;

// Dạng mã hóa của `/`, `\` và `.`. Next giải mã segment trước khi đưa vào handler nên `%2e%2e` đến tay ta
// đã thành `..`, nhưng `%2F` có thể thành segment chứa `/`. Kiểm trên chuỗi THÔ để không lệ thuộc vào cách
// giải mã của Next hay của BE phía sau.
const ENCODED_TRAVERSAL = /%2f|%5c|%2e/i;
const UNSAFE_SEGMENT_CHARS = /[/\\\u0000-\u001f]/;

/**
 * Chuyển segment của catch-all thành path upstream `/api/v1/...`.
 *
 * Thứ tự: dạng mã hóa trên chuỗi thô, rồi từng segment (rỗng, `.`, `..`, `/`, `\`, ký tự điều khiển), cuối
 * cùng mới xét gốc allowlist. Nhờ vậy traversal luôn nhận 400 kể cả khi gốc là `users`, còn gốc ngoài
 * allowlist với segment sạch nhận 404. Segment được `encodeURIComponent` lại, upstream không bao giờ nhận
 * ký tự điều khiển path.
 */
export function resolveBffTarget(segments: readonly string[], rawPathname: string): BffTarget {
  if (ENCODED_TRAVERSAL.test(rawPathname)) return { ok: false, status: 400 };

  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === ".." || UNSAFE_SEGMENT_CHARS.test(segment)) {
      return { ok: false, status: 400 };
    }
  }

  const root = segments[0];

  if (root === undefined || !BFF_ALLOWED_ROOTS.has(root)) return { ok: false, status: 404 };

  return { ok: true, path: `/api/v1/${segments.map(encodeURIComponent).join("/")}` };
}

/**
 * Trần body 4 MB. Phase 3 chỉ chuyển JSON; Phase 7 (voice, ảnh) sẽ mở rộng nếu cần phục vụ nhị phân lớn hơn.
 * Chặn ở đây để một request khổng lồ không bị đọc hết vào bộ nhớ rồi mới từ chối.
 */
export const BFF_MAX_BODY_BYTES = 4 * 1024 * 1024;

// Trạng thái HTTP không được có body: `new Response(body, { status })` ném lỗi nếu vi phạm.
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

/**
 * Đọc body với trần `BFF_MAX_BODY_BYTES`. Kiểm `content-length` trước (từ chối rẻ, chưa đọc gì), rồi kiểm lại
 * độ dài thực vì header có thể vắng (chunked) hoặc nói dối. `undefined` = không có body để gửi.
 */
async function readBoundedBody(request: NextRequest): Promise<ArrayBuffer | undefined | "too-large"> {
  const declared = Number(request.headers.get("content-length"));

  if (Number.isFinite(declared) && declared > BFF_MAX_BODY_BYTES) return "too-large";

  const buffer = await request.arrayBuffer();

  if (buffer.byteLength > BFF_MAX_BODY_BYTES) return "too-large";

  return buffer.byteLength === 0 ? undefined : buffer;
}

/**
 * Chuyển tiếp một request REST của trình duyệt tới BE. Thứ tự kiểm (mỗi bước từ chối là chưa gọi BE):
 * method → allowlist/traversal → Origin → phiên → body → gọi BE.
 *
 * - Origin: CORS của BE mở hoàn toàn nên đây là lớp kiểm Origin duy nhất cho REST (T-03-37).
 * - Phiên `stale`/`invalid` → 401 `session.expired` mà KHÔNG gọi BE: endpoint `[AllowAnonymous]` của BE coi
 *   Bearer hết hạn là ẩn danh và trả 403 sai thay vì 401 (PITFALLS P4). Client thấy 401 sẽ refresh rồi gọi
 *   lại. Không có cookie → chuyển tiếp không Bearer để endpoint công khai vẫn chạy.
 * - Header đi chỉ gồm `accept`, `content-type` (giữ boundary multipart) và `authorization` do SERVER gắn từ
 *   cookie. Không chuyển `cookie`, `host`, `origin`, `x-forwarded-*` hay `authorization` của client (T-03-38,
 *   T-03-39).
 * - Response về client chỉ giữ `content-type` và `cache-control: no-store`; `set-cookie`, `location` và các
 *   header lộ công nghệ của BE bị bỏ (T-03-38, T-03-41).
 */
export async function forwardToBackend(
  request: NextRequest,
  segments: readonly string[],
  deps: ServerDeps,
): Promise<NextResponse> {
  const nowMs = deps.nowMs();

  if (!BFF_ALLOWED_METHODS.has(request.method)) return errorEnvelope(405, "Bff.MethodNotAllowed", nowMs);

  const target = resolveBffTarget(segments, new URL(request.url).pathname);

  if (!target.ok) {
    return target.status === 404
      ? errorEnvelope(404, "Bff.NotFound", nowMs)
      : errorEnvelope(400, "Bff.BadPath", nowMs);
  }

  if (!checkSameOrigin(request)) return errorEnvelope(403, "Bff.CrossOrigin", nowMs);

  const session = readSession(
    (name) => request.cookies.get(name)?.value,
    Math.floor(nowMs / 1000),
    deps.secure,
  );

  if (session.state === "stale" || session.state === "invalid") {
    return errorEnvelope(401, "session.expired", nowMs);
  }

  const headers: Record<string, string> = {};
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");

  if (accept !== null) headers.accept = accept;
  if (contentType !== null) headers["content-type"] = contentType;
  if (session.state === "fresh") headers.authorization = `Bearer ${session.accessToken}`;

  let body: ArrayBuffer | undefined;

  if (request.method !== "GET") {
    const read = await readBoundedBody(request);

    if (read === "too-large") return errorEnvelope(413, "Bff.PayloadTooLarge", nowMs);

    body = read;
  }

  const upstream = await callBackend(deps, target.path + request.nextUrl.search, {
    method: request.method,
    headers,
    ...(body === undefined ? {} : { body }),
  });

  if (upstream.kind === "timeout") return errorEnvelope(504, "Bff.UpstreamTimeout", nowMs);
  if (upstream.kind === "network") return errorEnvelope(502, "Bff.UpstreamUnavailable", nowMs);

  const responseHeaders = new Headers({ "cache-control": "no-store" });

  if (upstream.contentType !== null) responseHeaders.set("content-type", upstream.contentType);

  return new NextResponse(NULL_BODY_STATUSES.has(upstream.status) ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
