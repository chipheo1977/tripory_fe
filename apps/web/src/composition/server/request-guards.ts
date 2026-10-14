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
 */
export function checkSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (origin !== null) return origin === request.nextUrl.origin;
  if (request.method === "GET" || request.method === "HEAD") return true;

  return request.headers.get("sec-fetch-site") === "same-origin";
}

const NO_STORE = "no-store";

function withNoStore(init: ResponseInit | undefined): ResponseInit {
  const headers = new Headers(init?.headers);

  headers.set("cache-control", NO_STORE);

  return { ...init, headers };
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
