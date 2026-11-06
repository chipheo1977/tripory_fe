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
   * Các origin của chính web app mà người vận hành khai báo, dùng cho kiểm Origin chống CSRF
   * (`checkSameOrigin`). VẮNG KEY khi chưa đặt (mặc định, đúng trên Vercel): khi đó so với
   * `request.nextUrl.origin`. Có giá trị thì CHỈ các origin này được phép. Cần khi self-host sau proxy ghi lại
   * Host, hoặc dev truy cập qua nhiều địa chỉ (localhost và IP LAN). Không phải bí mật nhưng chỉ server đọc.
   */
  appOrigins?: ReadonlyArray<string>;
  /**
   * Origin Photon cho tìm địa điểm (D-142), từ `PHOTON_BASE_URL`. VẮNG KEY khi chưa đặt: `places-runtime.ts` dùng
   * `DEFAULT_PHOTON_BASE_URL`. Đổi được nhà cung cấp mà không cần sửa code.
   */
  photonBaseUrl?: string;
  /**
   * Origin Nominatim (chỉ tra ngược dự phòng), từ `NOMINATIM_BASE_URL`. VẮNG KEY khi chưa đặt: dùng
   * `DEFAULT_NOMINATIM_BASE_URL`; `null` khi đặt `off` (tắt hẳn, theo yêu cầu của OSMF nếu có).
   */
  nominatimBaseUrl?: string | null;
}>;

export const DEFAULT_PHOTON_BASE_URL = "https://photon.komoot.io";
export const DEFAULT_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

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

  const appOrigins = parseAppOrigins(raw.APP_ORIGIN, raw.NODE_ENV === "production");
  const photonBaseUrl = parseProviderOrigin(raw.PHOTON_BASE_URL, "PHOTON_BASE_URL");
  const nominatimBaseUrl = parseNominatimOrigin(raw.NOMINATIM_BASE_URL);

  return {
    apiOrigin: apiUrl.origin,
    ...(secret.data === undefined || secret.data === "" ? {} : { bffSharedSecret: secret.data }),
    ...(appOrigins === undefined ? {} : { appOrigins }),
    ...(photonBaseUrl === undefined ? {} : { photonBaseUrl }),
    ...(nominatimBaseUrl === undefined ? {} : { nominatimBaseUrl }),
  };
}

/**
 * Origin nhà cung cấp địa điểm: đúng một origin, https (http chỉ với loopback, để chạy instance tự host ở máy).
 * Rỗng hoặc vắng = chưa đặt. Thông điệp lỗi không kèm giá trị.
 */
function parseProviderOrigin(value: string | undefined, name: string): string | undefined {
  const text = value?.trim() ?? "";

  if (text === "") return undefined;

  const invalid = new Error(
    `${name} không hợp lệ: cần đúng một origin https, không kèm path (http chỉ với localhost, 127.0.0.1, [::1])`,
  );

  if (!URL.canParse(text)) throw invalid;

  const url = new URL(text);
  const allowedProtocol = url.protocol === "https:" || (url.protocol === "http:" && isLoopbackOrigin(url));

  if (!allowedProtocol || !hasOnlyOrigin(url)) throw invalid;

  return url.origin;
}

/** `off` (không phân biệt hoa thường) tắt Nominatim: `null`. */
function parseNominatimOrigin(value: string | undefined): string | null | undefined {
  if (value?.trim().toLowerCase() === "off") return null;

  return parseProviderOrigin(value, "NOMINATIM_BASE_URL");
}

const isHttpProtocol = (url: URL): boolean => url.protocol === "http:" || url.protocol === "https:";

const hasOnlyOrigin = (url: URL): boolean => {
  const noExtras = url.search === "" && url.hash === "";
  const noCredentials = url.username === "" && url.password === "";

  return url.pathname === "/" && noExtras && noCredentials;
};

/** Một mục của `APP_ORIGIN`: đúng một origin http(s), production https hoặc loopback. Lỗi không kèm giá trị. */
function parseOneAppOrigin(entry: string, production: boolean): string {
  const invalid = new Error(
    "APP_ORIGIN không hợp lệ: mỗi mục cần đúng một origin http(s) của web app, không kèm path, ví dụ https://app.example.com",
  );

  if (!URL.canParse(entry)) throw invalid;

  const url = new URL(entry);

  if (!isHttpProtocol(url) || !hasOnlyOrigin(url)) throw invalid;

  if (production && url.protocol !== "https:" && !isLoopbackOrigin(url)) {
    throw new Error("APP_ORIGIN phải dùng https ở production (chỉ cho phép http với localhost, 127.0.0.1, [::1])");
  }

  return url.origin;
}

/**
 * `APP_ORIGIN` tùy chọn: một hoặc nhiều origin phân tách bằng dấu phẩy (cắt khoảng trắng, bỏ mục rỗng, bỏ
 * trùng). Rỗng hoặc vắng = chưa đặt. Mỗi mục phải là ĐÚNG một origin http(s) (không path, query, hash, userinfo)
 * vì được so bằng `===` với header `Origin`; production áp luật https-hoặc-loopback riêng cho từng mục. Thông
 * điệp lỗi không kèm giá trị.
 */
function parseAppOrigins(value: string | undefined, production: boolean): ReadonlyArray<string> | undefined {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

  if (entries.length === 0) return undefined;

  return [...new Set(entries.map((entry) => parseOneAppOrigin(entry, production)))];
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
