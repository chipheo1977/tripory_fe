// Route Handler `/api/auth/*` dưới dạng hàm thuần `(NextRequest, ServerDeps) => NextResponse`. Đây là nơi DUY
// NHẤT token BE được đổi lấy cookie httpOnly; body trả về trình duyệt chỉ có `viewer` hoặc cờ, KHÔNG BAO GIỜ
// có token, `expiresAt` hay mật khẩu. Không ghi log ở đây: body request có mật khẩu, header có Bearer.
import { SESSION_EXPIRED } from "@tripory/api-client";
import { REFRESH_IF_BELOW_SEC } from "@tripory/identity";
import {
  authResponseDto,
  parseAccessTokenClaims,
  tokenResponseDto,
  toViewer,
} from "@tripory/identity/http";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { ServerDeps } from "./env";
import { checkSameOrigin, errorEnvelope, successEnvelope } from "./request-guards";
import { clearSession, decodeJwtPayload, readRawTokens, writeSession } from "./session-store";
import { callBackend, type UpstreamResult } from "./upstream";

/** Header duy nhất đi tới BE cho request JSON. Cố ý không chuyển `cookie`, `authorization`, `origin` của client. */
const JSON_HEADERS = { accept: "application/json", "content-type": "application/json" } as const;

const crossOrigin = (deps: ServerDeps): NextResponse => errorEnvelope(403, "Bff.CrossOrigin", deps.nowMs());

const invalidBody = (deps: ServerDeps): NextResponse => errorEnvelope(400, "Bff.InvalidBody", deps.nowMs());

const invalidUpstream = (deps: ServerDeps): NextResponse =>
  errorEnvelope(502, "Bff.InvalidUpstream", deps.nowMs());

/** `true` khi BE trả 2xx. */
const isSuccessStatus = (status: number): boolean => status >= 200 && status < 300;

/**
 * Đọc body request thành object JSON thuần. `null` khi không phải JSON, không có body, hoặc là mảng, số,
 * chuỗi, `null`: mọi thứ khác object đều là body sai hình dạng.
 */
async function readJsonObject(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();

    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Chỉ lấy đúng các field chuỗi được đặt tên cứng. Không chuyển tiếp nguyên body của client lên BE: field lạ
 * (`role`, `isAdmin`, `confirmPassword`...) có thể chạm tới thuộc tính mà BE bind ngầm (mass-assignment,
 * T-03-32), và `confirmPassword` của form không có lý do rời server FE. Giá trị không phải chuỗi, hoặc thiếu
 * field, làm cả body bị từ chối. Chuỗi rỗng vẫn được qua để BE trả lỗi validate cho người dùng (D-19).
 * Không `trim`: khoảng trắng đầu/cuối là một phần của mật khẩu.
 */
function pickStrings(
  source: Record<string, unknown> | null,
  keys: readonly string[],
): Record<string, string> | null {
  if (source === null) return null;

  const picked: Record<string, string> = {};

  for (const key of keys) {
    const value = source[key];

    if (typeof value !== "string") return null;

    picked[key] = value;
  }

  return picked;
}

/**
 * Biến kết quả upstream KHÔNG thành công thành response cho client:
 * - timeout → 504, lỗi mạng → 502 (envelope do FE sinh).
 * - 4xx/5xx → chuyển nguyên `status` + `body` + `content-type` để `createFetchHttpClient` bóc `errorCode` và
 *   form gắn lỗi vào đúng ô (D-19). Mọi header khác của BE bị bỏ, đặc biệt `set-cookie`: BE không được phép
 *   đặt cookie lên origin của FE (T-03-33). `cache-control: no-store` do FE đặt.
 * - status còn lại (3xx do `redirect: "manual"`, 1xx) không phải câu trả lời hợp lệ của API → 502.
 */
function forwardUpstream(result: UpstreamResult, nowMs: number): NextResponse {
  if (result.kind === "timeout") return errorEnvelope(504, "Bff.UpstreamTimeout", nowMs);
  if (result.kind === "network") return errorEnvelope(502, "Bff.UpstreamUnavailable", nowMs);
  if (result.status < 400 || result.status > 599) return errorEnvelope(502, "Bff.InvalidUpstream", nowMs);

  const headers = new Headers({ "cache-control": "no-store" });

  if (result.contentType !== null) headers.set("content-type", result.contentType);

  return new NextResponse(result.body, { status: result.status, headers });
}

/** Envelope thành công của BE cho login/register: `{ status: "success", data: AuthResponse }`. */
const authEnvelope = z.object({ status: z.literal("success"), data: authResponseDto });

/**
 * Đổi body 2xx của BE thành response `{ viewer }` kèm 3 cookie phiên. Mọi bất thường (JSON hỏng, sai hình
 * dạng, id không phải GUID, access token không có claim, `expiresAt` không parse được) là lỗi upstream:
 * 502 và KHÔNG có cookie nào (`writeSession` không ghi gì khi trả `ok: false`).
 */
function issueSession(body: string, deps: ServerDeps): NextResponse {
  const nowMs = deps.nowMs();
  let parsed: z.infer<typeof authEnvelope>;

  try {
    parsed = authEnvelope.parse(JSON.parse(body));
  } catch {
    return invalidUpstream(deps);
  }

  const { user, ...tokens } = parsed.data;
  let response: NextResponse;

  try {
    // Chỉ `viewer` đi tiếp: `toViewer` chép đúng 5 trường, token không có đường nào lọt vào body.
    response = successEnvelope({ viewer: toViewer(user) }, nowMs);
  } catch {
    return invalidUpstream(deps);
  }

  return writeSession(response, tokens, nowMs, deps.secure).ok ? response : invalidUpstream(deps);
}

type CredentialsSpec = Readonly<{ path: "login" | "register"; fields: readonly string[] }>;

/**
 * Phần chung của login và register: Origin → body → BE → cookie. Register dùng thẳng token mà
 * `POST /auth/register` đã trả (BE trả `AuthResponse` có token), KHÔNG gọi login lần hai (D-02): gọi hai lần
 * là thêm một vòng BE (cold start tới 30 giây) và thêm một cửa sổ để lần hai thất bại sau khi tài khoản đã tạo.
 */
async function credentialsHandler(
  request: NextRequest,
  deps: ServerDeps,
  spec: CredentialsSpec,
): Promise<NextResponse> {
  // Origin là bước đầu của mọi handler: không có nó, site lạ đăng nhập nạn nhân vào tài khoản của kẻ tấn công.
  if (!checkSameOrigin(request)) return crossOrigin(deps);

  const picked = pickStrings(await readJsonObject(request), spec.fields);

  if (picked === null) return invalidBody(deps);

  const result = await callBackend(deps, `/api/v1/auth/${spec.path}`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(picked),
  });

  if (result.kind !== "response" || !isSuccessStatus(result.status)) {
    return forwardUpstream(result, deps.nowMs());
  }

  return issueSession(result.body, deps);
}

/** `POST /api/auth/login`: AUTH-02. */
export function handleLogin(request: NextRequest, deps: ServerDeps): Promise<NextResponse> {
  return credentialsHandler(request, deps, { path: "login", fields: ["email", "password"] });
}

/** `POST /api/auth/register`: AUTH-01. */
export function handleRegister(request: NextRequest, deps: ServerDeps): Promise<NextResponse> {
  return credentialsHandler(request, deps, {
    path: "register",
    fields: ["email", "password", "fullName"],
  });
}

/**
 * `POST /api/auth/logout`: AUTH-04. BE không có endpoint đăng xuất, nên chỉ xóa cookie. Vẫn kiểm Origin:
 * không có nó, một site lạ đăng xuất người dùng bằng một form ẩn (CSRF logout).
 */
export function handleLogout(request: NextRequest, deps: ServerDeps): NextResponse {
  if (!checkSameOrigin(request)) return crossOrigin(deps);

  const response = successEnvelope(null, deps.nowMs());

  clearSession(response, deps.secure);

  return response;
}

/**
 * 401 `session.expired` kèm lệnh xóa cả 3 cookie: dùng khi phiên KHÔNG còn hồi phục được (thiếu cookie, claim
 * hỏng, BE xác nhận refresh token chết). Không dùng cho lỗi tạm thời.
 */
function sessionEnded(deps: ServerDeps): NextResponse {
  const response = errorEnvelope(401, SESSION_EXPIRED, deps.nowMs());

  clearSession(response, deps.secure);

  return response;
}

/** 503: lỗi tạm thời của lần refresh, cookie hiện có KHÔNG bị đụng tới. */
const refreshUnavailable = (deps: ServerDeps): NextResponse =>
  errorEnvelope(503, "Bff.RefreshUnavailable", deps.nowMs());

/** Envelope thành công của BE cho refresh-token: `{ status: "success", data: TokenResponse }`. */
const tokenEnvelope = z.object({ status: z.literal("success"), data: tokenResponseDto });

/**
 * BE trả những status này cho refresh token đã chết, bị thu hồi, hết hạn hoặc sai hình dạng
 * (`Token.Compromised`, `Token.Expired`, `Token.InvalidRefreshToken`, FluentValidation `NotEmptyValidator` đều
 * là 400). Chỉ các status này mới xác nhận hết phiên.
 */
const isSessionEndedStatus = (status: number): boolean => status === 400 || status === 401 || status === 403;

/**
 * `POST /api/auth/refresh`: AUTH-03. Thứ tự kiểm cố định (03-RESEARCH Pattern 3):
 *
 * 1. Origin.
 * 2. Thiếu cookie access/refresh, hoặc claim của access không đọc được → xóa cookie, 401.
 * 3. Token còn > `REFRESH_IF_BELOW_SEC` giây → 200 `{ refreshed: false }`, KHÔNG gọi BE.
 * 4. Gọi BE `refresh-token`.
 *
 * Vì sao route phải idempotent: BE xoay refresh token và có reuse detection, hai lần gửi cùng một refresh
 * token làm BE trả `Token.Compromised` và thu hồi mọi phiên (Pitfall 1). Phía client mọi đường refresh đã đi
 * qua MỘT `Lock` (Web Locks), nên tab B chỉ chạy SAU khi tab A nhận Set-Cookie; route thấy token đã tươi và
 * no-op. Hai lần gọi chồng (StrictMode chạy effect hai lần, refresh chủ động trùng phản ứng với 401) vì thế
 * đều vô hại. Quyết định dựa trên đồng hồ SERVER (`deps.nowMs`), không tin giờ của máy khách.
 *
 * Vì sao phân biệt 4xx với 5xx (D-14a, T-03-30): chỉ 400/401/403 là BE xác nhận phiên chết → xóa cookie. Mọi
 * thứ còn lại (5xx, timeout, lỗi mạng, 404, 429, 3xx) có thể chỉ là BE cold start hoặc sự cố mạng: giữ cookie
 * và trả 503 để client thử lại, không đăng xuất oan người dùng đang có phiên hợp lệ.
 */
export async function handleRefresh(request: NextRequest, deps: ServerDeps): Promise<NextResponse> {
  if (!checkSameOrigin(request)) return crossOrigin(deps);

  const tokens = readRawTokens((name) => request.cookies.get(name)?.value, deps.secure);
  const claims = tokens === null ? null : parseAccessTokenClaims(decodeJwtPayload(tokens.accessToken));

  if (tokens === null || claims === null) return sessionEnded(deps);

  if (claims.exp - Math.floor(deps.nowMs() / 1000) > REFRESH_IF_BELOW_SEC) {
    return successEnvelope({ refreshed: false }, deps.nowMs());
  }

  // Token lấy từ cookie, KHÔNG từ body client: client không có (và không cần) quyền chọn token để xoay.
  const result = await callBackend(deps, "/api/v1/auth/refresh-token", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
  });

  if (result.kind !== "response") return refreshUnavailable(deps);

  if (isSessionEndedStatus(result.status)) return sessionEnded(deps);

  if (!isSuccessStatus(result.status)) return refreshUnavailable(deps);

  return rotateSession(result.body, deps);
}

/**
 * Ghi cookie từ `TokenResponse` mới. Body BE hỏng thì 502 và giữ nguyên cookie cũ: không biết refresh token
 * cũ đã bị BE xoay hay chưa, nhưng xóa phiên khi chưa chắc là đăng xuất oan.
 */
function rotateSession(body: string, deps: ServerDeps): NextResponse {
  const nowMs = deps.nowMs();
  let parsed: z.infer<typeof tokenEnvelope>;

  try {
    parsed = tokenEnvelope.parse(JSON.parse(body));
  } catch {
    return invalidUpstream(deps);
  }

  const response = successEnvelope({ refreshed: true }, nowMs);

  return writeSession(response, parsed.data, nowMs, deps.secure).ok ? response : invalidUpstream(deps);
}
