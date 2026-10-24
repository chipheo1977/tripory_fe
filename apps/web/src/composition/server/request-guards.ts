import { NextResponse, type NextRequest } from "next/server";

/**
 * Chống CSRF và login-CSRF cho Route Handler (AUTH-08). Next chỉ tự kiểm Origin cho Server Action, còn Route
 * Handler phải tự làm (docs `data-security.md`).
 *
 * - Có `Origin`: phải đúng bằng origin của app. `Origin: null` và mọi origin khác bị từ chối.
 * - Không có `Origin`: GET/HEAD được qua (trình duyệt không gửi Origin cho GET cùng origin). Request ghi
 *   phải có `Sec-Fetch-Site: same-origin`.
 *
 * Request ghi không phải từ trình duyệt (curl, script) thiếu cả hai header sẽ bị từ chối. Đó là chủ đích:
 * BFF chỉ phục vụ chính web app này. `SameSite=Lax` của cookie là lớp bảo vệ thứ hai, không thay được lớp này.
 *
 * Ràng buộc hosting (cùng tinh thần `client-ip.ts`): mặc định so với `request.nextUrl.origin`, đúng khi nền
 * tảng (Vercel) đặt Host/origin công khai. Self-host sau reverse proxy không chuyển `Host`/`X-Forwarded-Host`
 * thì `nextUrl.origin` là địa chỉ nội bộ và MỌI request ghi bị 403 `Bff.CrossOrigin` (fail closed, khó chẩn
 * đoán). Khi đó đặt `APP_ORIGIN` (origin công khai của app) và truyền vào `appOrigin`; trên Vercel để trống.
 */
export function checkSameOrigin(request: NextRequest, appOrigin?: string): boolean {
  const origin = request.headers.get("origin");

  if (origin !== null) return origin === (appOrigin ?? request.nextUrl.origin);
  if (request.method === "GET" || request.method === "HEAD") return true;

  return request.headers.get("sec-fetch-site") === "same-origin";
}

const NO_STORE = "no-store";

function withNoStore(init: ResponseInit | undefined): ResponseInit {
  const headers = new Headers(init?.headers);

  headers.set("cache-control", NO_STORE);
  headers.set("x-content-type-options", "nosniff");

  return { ...init, headers };
}

/**
 * Upstream 5xx: KHÔNG chuyển body của BE (ProblemDetails, stack trace khi BE cấu hình sai có thể lộ thông tin).
 * Trả envelope do FE sinh, cùng quy ước với timeout/lỗi mạng: 504 giữ nguyên, mọi 5xx khác thành 502.
 */
export function upstreamServerError(upstreamStatus: number, nowMs: number): NextResponse {
  return errorEnvelope(upstreamStatus === 504 ? 504 : 502, "Bff.UpstreamError", nowMs);
}

/**
 * Envelope lỗi cùng dạng của BE để `createFetchHttpClient` bóc như mọi API khác. `message: null` để UI rơi
 * về câu chung D-04 thay vì hiện chữ kỹ thuật.
 */
export function errorEnvelope(status: number, errorCode: string, nowMs: number): NextResponse {
  return NextResponse.json(
    {
      status: "error",
      data: null,
      message: null,
      errorCode,
      timestamp: new Date(nowMs).toISOString(),
    },
    withNoStore({ status }),
  );
}

/** Envelope thành công. `data` KHÔNG BAO GIỜ được chứa token; caller chịu trách nhiệm, test của route kiểm. */
export function successEnvelope(data: unknown, nowMs: number, init?: ResponseInit): NextResponse {
  return NextResponse.json(
    {
      status: "success",
      data,
      message: null,
      errorCode: null,
      timestamp: new Date(nowMs).toISOString(),
    },
    withNoStore(init),
  );
}
