// @vitest-environment node
import type { PlaceReverseProvider } from "@tripory/itinerary";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gatedReverse, placesDeps, PLACES_USER_AGENT } from "./places-runtime";
import { createMinIntervalGate } from "@/lib/in-memory/rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
});

const COORDINATE = { latitude: 11.9404, longitude: 108.4583 };

describe("gatedReverse", () => {
  it("cổng mở thì gọi provider; cổng đóng thì trả null, không gọi, không xếp hàng", async () => {
    const reverse = vi.fn<PlaceReverseProvider["reverse"]>(async () => null);
    let now = 0;
    const gated = gatedReverse({ reverse }, createMinIntervalGate(1_100), () => now);

    await gated.reverse(COORDINATE);
    now = 1_000;
    expect(await gated.reverse(COORDINATE)).toBeNull();
    now = 1_100;
    await gated.reverse(COORDINATE);

    expect(reverse).toHaveBeenCalledTimes(2);
  });
});

describe("placesDeps", () => {
  it("dựng service, cache, limiter một lần; server đọc lại mỗi lần gọi", () => {
    vi.stubEnv("API_ORIGIN", "https://be.test");

    const first = placesDeps();
    const second = placesDeps();

    expect(second.service).toBe(first.service);
    expect(second.cache).toBe(first.cache);
    expect(second.limiter).toBe(first.limiter);
    expect(second.server).not.toBe(first.server);
    expect(first.destinations.findBySlug("vn-lam-dong")?.name).toBe("Lâm Đồng");
  });

  it("User-Agent định danh ứng dụng", () => {
    expect(PLACES_USER_AGENT).toBe("Tripory/0.1 (+https://triporyv1.vercel.app)");
  });
});
