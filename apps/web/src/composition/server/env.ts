// Cấu hình chỉ server cần. KHÔNG dùng tiền tố công khai của Next: `API_ORIGIN` không được lọt vào bundle
// trình duyệt (trình duyệt luôn nói chuyện với BFF cùng origin, không biết địa chỉ BE).
import { z } from "zod";
import { isSecureCookieEnv } from "../session-cookies";

export type ServerEnv = Readonly<{
  /** Chỉ origin của BE, không path, không dấu gạch cuối. Mọi lời gọi upstream bị khóa vào đây. */
  apiOrigin: string;
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

/** Ném Error nhắc rõ `API_ORIGIN` khi thiếu hoặc sai, để lỗi cấu hình lộ ngay ở lần gọi đầu tiên. */
export function parseServerEnv(raw: Readonly<Record<string, string | undefined>>): ServerEnv {
  const parsed = envSchema.safeParse({ API_ORIGIN: raw.API_ORIGIN });

  if (!parsed.success) {
    throw new Error(
      "API_ORIGIN thiếu hoặc không hợp lệ: cần URL http(s) của BE, ví dụ http://localhost:5000",
    );
  }

  return { apiOrigin: new URL(parsed.data.API_ORIGIN).origin };
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
