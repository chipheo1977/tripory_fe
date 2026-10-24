// Cấu hình chỉ server cần. KHÔNG dùng tiền tố công khai của Next: `API_ORIGIN` không được lọt vào bundle
// trình duyệt (trình duyệt luôn nói chuyện với BFF cùng origin, không biết địa chỉ BE).
import { z } from "zod";
import { isSecureCookieEnv } from "../session-cookies";

export type ServerEnv = Readonly<{
  /** Chỉ origin của BE, không path, không dấu gạch cuối. Mọi lời gọi upstream bị khóa vào đây. */
  apiOrigin: string;
  /**
   * Bí mật dùng chung với BE (header `X-Bff-Secret`) để BE tin `X-Forwarded-For` khi giới hạn tốc độ theo IP
   * người dùng thật (D-35). VẮNG KEY khi chưa cấu hình (biến thiếu hoặc rỗng): khi đó BFF không gửi header nào
   * và BE rơi về IP socket. Chỉ server đọc; KHÔNG BAO GIỜ log, đưa vào response hay thông điệp lỗi.
   */
  bffSharedSecret?: string;
  /**
   * Origin công khai của chính web app, dùng cho kiểm Origin chống CSRF (`checkSameOrigin`). VẮNG KEY khi chưa
   * đặt (mặc định, đúng trên Vercel): khi đó so với `request.nextUrl.origin`. Chỉ cần khi self-host sau proxy
   * ghi lại Host. Không phải bí mật nhưng chỉ server đọc.
   */
  appOrigin?: string;
}>;

export type ServerDeps = Readonly<{
  env: ServerEnv;
  fetch: typeof fetch;
  nowMs: () => number;
  secure: boolean;
}>;

// `refine` của Zod 4 vẫn chạy khi `z.url()` đã báo lỗi, nên phải tự chặn `new URL` ném với chuỗi sai.
const envSchema = z.object({
  API_ORIGIN: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;

    const { protocol } = new URL(value);

    return protocol === "http:" || protocol === "https:";
  }),
});

// Schema riêng và KHÔNG chép giá trị vào thông điệp lỗi: bí mật không được lọt vào log hay stack trace.
// Chuỗi rỗng coi như chưa đặt (`.env` hay Vercel hay để lại biến rỗng). Cấm ký tự điều khiển vì giá trị này
// đi thẳng vào header HTTP.
const bffSecretSchema = z
  .string()
  .regex(/^[^\u0000-\u001f\u007f]*$/)
  .optional();

// `URL.hostname` giữ nguyên ngoặc vuông với IPv6.
const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Host loopback: máy cục bộ, không đi qua mạng nên http không làm lộ gì. */
const isLoopbackOrigin = (url: URL): boolean => LOOPBACK_HOSTNAMES.has(url.hostname);

/** Ném Error nhắc rõ `API_ORIGIN` khi thiếu hoặc sai, để lỗi cấu hình lộ ngay ở lần gọi đầu tiên. */
export function parseServerEnv(raw: Readonly<Record<string, string | undefined>>): ServerEnv {
  const parsed = envSchema.safeParse({ API_ORIGIN: raw.API_ORIGIN });

  if (!parsed.success) {
    throw new Error(
      "API_ORIGIN thiếu hoặc không hợp lệ: cần URL http(s) của BE, ví dụ http://localhost:5000",
    );
  }

  // Production gửi Bearer, mật khẩu, refresh token và X-Bff-Secret tới API_ORIGIN: http trên mạng thật làm lộ
  // tất cả. Chỉ cho http khi BE ở loopback để `next build`/`next start` chạy được với BE local; `next dev`
  // (NODE_ENV khác production) không bị ràng buộc. Không có biến nào để tắt kiểm này.
  const apiUrl = new URL(parsed.data.API_ORIGIN);

  if (raw.NODE_ENV === "production" && apiUrl.protocol !== "https:" && !isLoopbackOrigin(apiUrl)) {
    throw new Error("API_ORIGIN phải dùng https ở production (chỉ cho phép http với localhost, 127.0.0.1, [::1])");
  }

  const secret = bffSecretSchema.safeParse(raw.BFF_SHARED_SECRET);

  if (!secret.success) {
    throw new Error("BFF_SHARED_SECRET không hợp lệ: không được chứa ký tự điều khiển");
  }

  const appOrigin = parseAppOrigin(raw.APP_ORIGIN, raw.NODE_ENV === "production");

  return {
    apiOrigin: apiUrl.origin,
    ...(secret.data === undefined || secret.data === "" ? {} : { bffSharedSecret: secret.data }),
    ...(appOrigin === undefined ? {} : { appOrigin }),
  };
}

/**
 * `APP_ORIGIN` tùy chọn: rỗng hoặc vắng = chưa đặt. Có giá trị thì phải là ĐÚNG một origin http(s) (không path,
 * query, hash, userinfo) vì nó được so bằng `===` với header `Origin`. Production cùng luật https-hoặc-loopback
 * như `API_ORIGIN`. Thông điệp lỗi không kèm giá trị.
 */
function parseAppOrigin(value: string | undefined, production: boolean): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;

  const invalid = new Error(
    "APP_ORIGIN không hợp lệ: cần đúng một origin http(s) của web app, không kèm path, ví dụ https://app.example.com",
  );

  if (!URL.canParse(value)) throw invalid;

  const url = new URL(value.trim());
  const originOnly = url.pathname === "/" && url.search === "" && url.hash === "" && url.username === "" && url.password === "";

  if ((url.protocol !== "http:" && url.protocol !== "https:") || !originOnly) throw invalid;

  if (production && url.protocol !== "https:" && !isLoopbackOrigin(url)) {
    throw new Error("APP_ORIGIN phải dùng https ở production (chỉ cho phép http với localhost, 127.0.0.1, [::1])");
  }

  return url.origin;
}

/**
 * Đọc `process.env` LÚC GỌI, không lúc import: `next build` import route handler để thu thập cấu hình, nếu
 * đọc ở top-level thì build vỡ khi máy build chưa có biến.
 */
export function serverDeps(): ServerDeps {
  return {
    env: parseServerEnv(process.env),
    // Gọi fetch như hàm trần: `deps.fetch(...)` gán vào object sẽ ném "Illegal invocation" nếu mất this.
    fetch: globalThis.fetch.bind(globalThis),
    nowMs: () => Date.now(),
    secure: isSecureCookieEnv(),
  };
}
