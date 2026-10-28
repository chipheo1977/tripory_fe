// Hàm thuần, không `server-only` để test được; chỉ theo redirect, không tải/trả nội dung trang (D-20).
// Không rate limit (D-51, rủi ro chấp nhận).
//
// Chống SSRF (T-04-24): chỉ `https:`, host nguồn nằm trong allowlist, kiểm host MỖI bước trước khi theo,
// dừng ngay khi tới host Google Maps (không fetch đích), `redirect: "manual"`, tối đa 3 bước, 5 giây tổng.
// Không log URL: link người dùng dán có thể chứa vị trí riêng.

export type ResolveResult = Readonly<{ ok: true; url: string }> | Readonly<{ ok: false }>;

const FAILED: ResolveResult = { ok: false };

/** Host của link rút gọn; `goo.gl` chỉ nhận path `/maps/…`. */
const SOURCE_HOSTS: ReadonlySet<string> = new Set(["maps.app.goo.gl", "goo.gl"]);

const GOOGLE_HOST = /^(?:www\.|maps\.)?google\.(?:com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/;

const MAX_HOPS = 3;
const TOTAL_TIMEOUT_MS = 5_000;
const MAX_INPUT = 2_048;

const isSourceUrl = (url: URL): boolean =>
  url.protocol === "https:" &&
  SOURCE_HOSTS.has(url.hostname) &&
  (url.hostname !== "goo.gl" || url.pathname.startsWith("/maps/"));

const isGoogleMapsDestination = (url: URL): boolean =>
  url.protocol === "https:" &&
  GOOGLE_HOST.test(url.hostname) &&
  (url.hostname.startsWith("maps.") || url.pathname.startsWith("/maps"));

/** Đích trong tham số `continue` của trang consent (luồng EU), chỉ nhận khi là Google Maps. */
function consentContinue(consent: URL): ResolveResult {
  const target = consent.searchParams.get("continue");

  if (target === null || !URL.canParse(target)) return FAILED;

  const url = new URL(target);

  return isGoogleMapsDestination(url) ? { ok: true, url: url.toString() } : FAILED;
}

/**
 * Theo tối đa 3 redirect từ link rút gọn Google Maps và trả URL Google Maps đích. Mọi lỗi (mạng, timeout,
 * status lạ, host lạ) đều thành `{ ok: false }`, không ném.
 */
export async function resolveShortMapsLink(
  deps: Readonly<{ fetch: typeof fetch }>,
  raw: string,
): Promise<ResolveResult> {
  if (raw.length > MAX_INPUT || !URL.canParse(raw)) return FAILED;

  let current = new URL(raw);

  if (!isSourceUrl(current)) return FAILED;

  // AbortController + setTimeout thay AbortSignal.timeout để fake timers điều khiển được trong test.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);

  try {
    for (let hop = 0; hop < MAX_HOPS; hop += 1) {
      const response = await deps.fetch(current.toString(), {
        method: "HEAD",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: { accept: "text/html" },
      });

      // Không đọc nội dung trang.
      void response.body?.cancel().catch(() => undefined);

      const location = response.headers.get("location");

      if (response.status < 300 || response.status > 399 || location === null) return FAILED;
      if (!URL.canParse(location, current)) return FAILED;

      const next = new URL(location, current);

      if (isGoogleMapsDestination(next)) return { ok: true, url: next.toString() };
      if (next.protocol === "https:" && next.hostname === "consent.google.com") return consentContinue(next);
      if (!isSourceUrl(next)) return FAILED;

      current = next;
    }

    return FAILED;
  } catch {
    return FAILED;
  } finally {
    clearTimeout(timer);
  }
}
