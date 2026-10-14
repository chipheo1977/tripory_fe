// Helper test dùng chung cho route handler, BFF và proxy. Cố ý KHÔNG import `vitest` để dùng được
// ở cả môi trường node lẫn jsdom.
import { NextRequest } from "next/server";

/** Origin mặc định của app trong test; trùng với URL mà route handler thấy. */
export const TEST_ORIGIN = "https://app.test";

export type MakeRequestOptions = Readonly<{
  method?: string;
  /**
   * Dùng làm gốc của URL và đặt header `origin` (giống trình duyệt gửi request same-origin).
   * Bỏ qua thì URL gốc là `TEST_ORIGIN` và KHÔNG có header `origin`.
   */
  origin?: string;
  cookies?: Readonly<Record<string, string>>;
  /** Header truyền vào ghi đè header sinh từ `origin`, `cookies`, `body`. */
  headers?: Readonly<Record<string, string>>;
  /**
   * Object/mảng → JSON kèm `content-type: application/json`. Chuỗi → giữ nguyên (dùng để test body
   * hỏng; thêm `headers: { "content-type": "application/json" }` nếu cần route coi nó là JSON).
   */
  body?: unknown;
}>;

export function makeRequest(path: string, options: MakeRequestOptions = {}): NextRequest {
  const headers = new Headers();

  if (options.origin !== undefined) headers.set("origin", options.origin);

  if (options.cookies !== undefined && Object.keys(options.cookies).length > 0) {
    headers.set(
      "cookie",
      Object.entries(options.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    );
  }

  let body: string | undefined;
  if (typeof options.body === "string") {
    body = options.body;
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers.set("content-type", "application/json");
  }

  for (const [name, value] of Object.entries(options.headers ?? {})) headers.set(name, value);

  return new NextRequest(new URL(path, options.origin ?? TEST_ORIGIN), {
    method: options.method ?? "GET",
    headers,
    ...(body === undefined ? {} : { body }),
  });
}

export type ParsedSetCookie = Readonly<{
  value: string;
  /** Tên thuộc tính viết thường; thuộc tính không có giá trị (HttpOnly, Secure) là `true`. */
  attrs: Readonly<Record<string, string | true>>;
}>;

/**
 * Parse mọi `Set-Cookie` của response thành map theo tên cookie. Giá trị cookie giữ nguyên (không
 * decode). Giá trị `SameSite` được hạ chữ thường vì RFC 6265bis không phân biệt hoa thường.
 * Hai `Set-Cookie` cùng tên: cái sau ghi đè cái trước.
 */
export function setCookiesOf(response: Response): Record<string, ParsedSetCookie> {
  const parsed: Record<string, ParsedSetCookie> = {};

  for (const line of response.headers.getSetCookie()) {
    const [pair = "", ...rest] = line.split(";");
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;

    const attrs: Record<string, string | true> = {};
    for (const part of rest) {
      const attribute = part.trim();
      if (attribute === "") continue;
      const equals = attribute.indexOf("=");
      if (equals === -1) {
        attrs[attribute.toLowerCase()] = true;
        continue;
      }
      const key = attribute.slice(0, equals).trim().toLowerCase();
      const value = attribute.slice(equals + 1).trim();
      attrs[key] = key === "samesite" ? value.toLowerCase() : value;
    }

    parsed[pair.slice(0, separator).trim()] = { value: pair.slice(separator + 1).trim(), attrs };
  }

  return parsed;
}
