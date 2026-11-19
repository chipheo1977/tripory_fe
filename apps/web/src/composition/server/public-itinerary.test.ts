// @vitest-environment node
import { parseItineraryId } from "@tripory/shared-kernel";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/test/be-auth-fixtures";
import {
  AUTHOR_JSON,
  ENGAGEMENT_JSON,
  ITINERARY_ID,
  itineraryDetailJson,
  itineraryEnvelope,
  OWNER_ID,
} from "@/test/be-itinerary-fixtures";
import type { ServerDeps } from "./env";
import { loadPublicItinerary } from "./public-itinerary";
import type { SessionState } from "./session-store";
import { UPSTREAM_TIMEOUT_MS } from "./upstream";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const NOW_SEC = 1_790_000_000;
const ID = parseItineraryId(ITINERARY_ID);
if (ID === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const fetchReturning = (response: Response) =>
  vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => response);

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

const depsWith = (fetch: (...args: FetchArgs) => Promise<Response>): ServerDeps => ({
  env: { apiOrigin: "http://be.test" },
  fetch,
  nowMs: () => NOW_SEC * 1000,
  secure: true,
});

// Claims chỉ để dựng trạng thái phiên giả; loader không đọc claims.
const CLAIMS = { userId: OWNER_ID, email: "a@b.c", fullName: "A", handle: "a", exp: NOW_SEC + 600 } as unknown as Extract<
  SessionState,
  { state: "fresh" }
>["claims"];
const ACCESS = "tok-fresh-123.abc.def";
const NONE: SessionState = { state: "none" };
const INVALID: SessionState = { state: "invalid" };
const STALE: SessionState = { state: "stale", claims: CLAIMS };
const FRESH: SessionState = { state: "fresh", claims: CLAIMS, accessToken: ACCESS };

const okBody = (overrides = {}) => itineraryEnvelope(itineraryDetailJson({ isPublic: true, ...overrides }));
const headersOf = (fetch: ReturnType<typeof fetchReturning>) =>
  (fetch.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;

afterEach(() => {
  vi.useRealTimers();
});

describe("loadPublicItinerary: 200", () => {
  it("returns ok for a guest without sending authorization", async () => {
    const fetch = fetchReturning(jsonResponse(okBody()));
    const result = await loadPublicItinerary(depsWith(fetch), ID, NONE);

    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.itinerary.id).toBe(ITINERARY_ID);
      expect(result.itinerary.isPublic).toBe(true);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`http://be.test/api/v1/itineraries/${ITINERARY_ID}`);
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(Object.keys(headersOf(fetch)).map((name) => name.toLowerCase())).not.toContain("authorization");
  });

  it("sends the Bearer token only for a fresh session", async () => {
    const fetch = fetchReturning(jsonResponse(okBody()));
    const result = await loadPublicItinerary(depsWith(fetch), ID, FRESH);

    expect(result.kind).toBe("ok");
    expect(headersOf(fetch).authorization).toBe(`Bearer ${ACCESS}`);
  });

  it.each([
    ["stale", STALE],
    ["invalid", INVALID],
  ] as const)("does not send authorization for a %s session", async (_name, session) => {
    const fetch = fetchReturning(jsonResponse(okBody()));
    const result = await loadPublicItinerary(depsWith(fetch), ID, session);

    expect(result.kind).toBe("ok");
    expect(Object.keys(headersOf(fetch)).map((name) => name.toLowerCase())).not.toContain("authorization");
  });

  it("carries the author when the BE embeds it", async () => {
    const fetch = fetchReturning(jsonResponse(okBody({ author: AUTHOR_JSON })));
    const result = await loadPublicItinerary(depsWith(fetch), ID, NONE);

    expect(result.kind === "ok" && result.itinerary.author?.displayName).toBe("Trần Thị Lan");
  });

  it("returns ok without author when the BE has not shipped it yet", async () => {
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse(okBody()))), ID, NONE);

    expect(result.kind === "ok" && result.itinerary.author).toBeUndefined();
  });

  it("carries the engagement counts when the BE returns them (05.1)", async () => {
    const fetch = fetchReturning(jsonResponse(okBody({ ...ENGAGEMENT_JSON })));
    const result = await loadPublicItinerary(depsWith(fetch), ID, NONE);
    expect(result.kind).toBe("ok");
    expect(result.kind === "ok" && result.itinerary.engagement).toEqual({ likeCount: 12, commentCount: 3, likedByMe: false });
  });
  it("returns ok without engagement when the BE has not shipped the counts", async () => {
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse(okBody()))), ID, NONE);
    expect(result.kind).toBe("ok");
    expect(result.kind === "ok" && result.itinerary.engagement).toBeUndefined();
  });
  it("never puts the access token in the result", async () => {
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse(okBody()))), ID, FRESH);

    expect(JSON.stringify(result)).not.toContain(ACCESS);
  });
});

describe("loadPublicItinerary: 404 and 403", () => {
  it.each([
    ["none", NONE],
    ["invalid", INVALID],
    ["stale", STALE],
    ["fresh", FRESH],
  ] as const)("maps 404 to not-found for a %s session", async (_name, session) => {
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse({ status: "error" }, 404))), ID, session);

    expect(result.kind).toBe("not-found");
  });

  it.each([
    ["none", NONE],
    ["invalid", INVALID],
    ["fresh", FRESH],
  ] as const)("maps 403 to forbidden for a %s session", async (_name, session) => {
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse({ status: "error" }, 403))), ID, session);

    expect(result.kind).toBe("forbidden");
  });

  it("maps 403 to recover for a stale session (Bearer may only be expired)", async () => {
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse({ status: "error" }, 403))), ID, STALE);

    expect(result.kind).toBe("recover");
  });
});

describe("loadPublicItinerary: errors", () => {
  it("returns error for a 200 body of the wrong shape", async () => {
    const { title, ...broken } = itineraryDetailJson();
    void title;
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse(itineraryEnvelope(broken)))), ID, NONE);

    expect(result.kind).toBe("error");
  });

  it("returns error for a 200 body that is not JSON", async () => {
    const response = new Response("<html>oops</html>", { status: 200, headers: { "content-type": "text/html" } });
    const result = await loadPublicItinerary(depsWith(fetchReturning(response)), ID, NONE);

    expect(result.kind).toBe("error");
  });

  it("returns error for an unparsable JSON body", async () => {
    const response = new Response("{not json", { status: 200, headers: { "content-type": "application/json" } });
    const result = await loadPublicItinerary(depsWith(fetchReturning(response)), ID, NONE);

    expect(result.kind).toBe("error");
  });

  it("returns error when a waypoint coordinate is out of range", async () => {
    const base = itineraryDetailJson();
    const first = base.waypoints[0];
    if (first === undefined) throw new Error("fixture phải có điểm");
    const broken = { ...base, waypoints: [{ ...first, latitude: 123 }, ...base.waypoints.slice(1)] };
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse(itineraryEnvelope(broken)))), ID, NONE);

    expect(result.kind).toBe("error");
  });

  it.each([400, 401, 429, 500, 502])("returns error for HTTP %i", async (status) => {
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse({ status: "error" }, status))), ID, NONE);

    expect(result.kind).toBe("error");
  });

  it("returns error when the network fails", async () => {
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError("network down");
    });
    const result = await loadPublicItinerary(depsWith(fetch), ID, NONE);

    expect(result.kind).toBe("error");
  });

  it("returns error when the BE hangs past the upstream timeout", async () => {
    vi.useFakeTimers();
    const pending = loadPublicItinerary(depsWith(hangingFetch()), ID, NONE);
    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS + 1);

    await expect(pending).resolves.toEqual({ kind: "error" });
  });

  it("never leaks the Bearer in an error result", async () => {
    const result = await loadPublicItinerary(depsWith(fetchReturning(jsonResponse({ status: "error" }, 500))), ID, FRESH);

    expect(JSON.stringify(result)).not.toContain(ACCESS);
  });
});
