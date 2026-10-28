// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveShortMapsLink } from "./maps-resolve";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const GOOGLE = "https://www.google.com/maps/search/29.996966,+68.748251?entry=tts";

const redirectTo = (location: string, status = 302): Response =>
  new Response(null, { status, headers: { location } });

/** Fake fetch trả lần lượt từng response; hết danh sách thì ném để lộ lần gọi thừa. */
const sequence = (...responses: Response[]) => {
  const queue = [...responses];

  return vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
    const next = queue.shift();

    if (next === undefined) throw new Error("fetch bị gọi quá số lần dự kiến");

    return next;
  });
};

/** Fetch không bao giờ trả lời, chỉ reject khi signal abort (giống fetch thật). */
const hangingFetch = () =>
  vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        const fail = () => reject(new DOMException("aborted", "AbortError"));

        if (signal?.aborted) fail();
        else signal?.addEventListener("abort", fail, { once: true });
      }),
  );

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveShortMapsLink: đường thành công", () => {
  it("maps.app.goo.gl → 302 tới Google: ok, fetch đúng 1 lần với HEAD + redirect manual + no-store", async () => {
    const fetch = sequence(redirectTo(GOOGLE));

    const result = await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc");

    expect(result).toEqual({ ok: true, url: GOOGLE });
    expect(fetch).toHaveBeenCalledTimes(1);

    const [input, init] = fetch.mock.calls[0] ?? [];

    expect(String(input)).toBe("https://maps.app.goo.gl/abc");
    expect(init).toMatchObject({ method: "HEAD", redirect: "manual", cache: "no-store" });
  });

  it("KHÔNG fetch URL đích của Google", async () => {
    const fetch = sequence(redirectTo(GOOGLE));

    await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc");

    expect(fetch.mock.calls.map(([input]) => String(input))).toEqual(["https://maps.app.goo.gl/abc"]);
  });

  it("goo.gl/maps/abc được fetch", async () => {
    const fetch = sequence(redirectTo(GOOGLE));

    const result = await resolveShortMapsLink({ fetch }, "https://goo.gl/maps/abc");

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("nhảy qua host nguồn rồi tới Google: ok sau 2 fetch", async () => {
    const fetch = sequence(redirectTo("https://maps.app.goo.gl/def"), redirectTo(GOOGLE));

    const result = await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc");

    expect(result).toEqual({ ok: true, url: GOOGLE });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("Location tương đối được giải theo URL hiện tại", async () => {
    const fetch = sequence(redirectTo("/def"), redirectTo(GOOGLE));

    const result = await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc");

    expect(result.ok).toBe(true);
    expect(String(fetch.mock.calls[1]?.[0])).toBe("https://maps.app.goo.gl/def");
  });

  it("consent.google.com?continue=<maps> → ok, url = continue", async () => {
    const target = "https://www.google.com/maps/place/X";
    const fetch = sequence(
      redirectTo(`https://consent.google.com/ml?continue=${encodeURIComponent(target)}`),
    );

    const result = await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc");

    expect(result).toEqual({ ok: true, url: target });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("body response được cancel ở mỗi bước", async () => {
    const cancel = vi.fn(async () => undefined);
    const withBody = (location: string) =>
      ({ status: 302, headers: new Headers({ location }), body: { cancel } }) as unknown as Response;
    const fetch = sequence(withBody("https://maps.app.goo.gl/def"), withBody(GOOGLE));

    await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc");

    expect(cancel).toHaveBeenCalledTimes(2);
  });
});

describe("resolveShortMapsLink: từ chối đầu vào (SSRF, T-04-24)", () => {
  it.each([
    ["http (không phải https)", "http://maps.app.goo.gl/abc"],
    ["host lạ", "https://evil.com/x"],
    ["goo.gl không có /maps/", "https://goo.gl/abc"],
    ["metadata nội bộ", "http://169.254.169.254/latest/meta-data"],
    ["host giống nguồn nhưng là subdomain của host lạ", "https://maps.app.goo.gl.evil.com/abc"],
    ["không phải URL", "không phải url"],
    ["chuỗi rỗng", ""],
  ])("%s → ok false, không fetch", async (_label, input) => {
    const fetch = sequence();

    const result = await resolveShortMapsLink({ fetch }, input);

    expect(result).toEqual({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("input 2049 ký tự → ok false, không fetch", async () => {
    const fetch = sequence();
    const long = `https://maps.app.goo.gl/${"a".repeat(2049 - "https://maps.app.goo.gl/".length)}`;

    expect(long).toHaveLength(2049);
    expect(await resolveShortMapsLink({ fetch }, long)).toEqual({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("resolveShortMapsLink: kiểm host ở mỗi bước", () => {
  it("redirect tới host lạ → ok false", async () => {
    const fetch = sequence(redirectTo("https://evil.com/"));

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("redirect tới http://www.google.com/maps → ok false", async () => {
    const fetch = sequence(redirectTo("http://www.google.com/maps/place/X"));

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
  });

  it("redirect tới google.com không phải /maps → ok false", async () => {
    const fetch = sequence(redirectTo("https://www.google.com/search?q=x"));

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
  });

  it("consent với continue là host lạ → ok false", async () => {
    const fetch = sequence(
      redirectTo(`https://consent.google.com/ml?continue=${encodeURIComponent("https://evil.com/maps")}`),
    );

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
  });

  it("consent không có continue → ok false", async () => {
    const fetch = sequence(redirectTo("https://consent.google.com/ml"));

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
  });

  it("chuỗi 4 bước toàn host nguồn → ok false sau đúng 3 fetch", async () => {
    const fetch = sequence(
      redirectTo("https://maps.app.goo.gl/1"),
      redirectTo("https://maps.app.goo.gl/2"),
      redirectTo("https://maps.app.goo.gl/3"),
      redirectTo(GOOGLE),
    );

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("resolveShortMapsLink: lỗi upstream", () => {
  it.each([404, 200])("status %i → ok false", async (status) => {
    const fetch = sequence(new Response(null, { status }));

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
  });

  it("302 thiếu Location → ok false", async () => {
    const fetch = sequence(new Response(null, { status: 302 }));

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
  });

  it("fetch ném lỗi mạng → ok false (không ném ra ngoài)", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    expect(await resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc")).toEqual({ ok: false });
  });

  it("fetch treo → abort sau 5 giây, ok false", async () => {
    vi.useFakeTimers();

    const fetch = hangingFetch();
    const pending = resolveShortMapsLink({ fetch }, "https://maps.app.goo.gl/abc");

    await vi.advanceTimersByTimeAsync(5_000);

    expect(await pending).toEqual({ ok: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
