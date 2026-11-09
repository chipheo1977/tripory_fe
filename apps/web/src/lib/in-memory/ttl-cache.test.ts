// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createTtlCache } from "./ttl-cache";

const clock = (start = 0) => {
  let now = start;

  return { nowMs: () => now, advance: (ms: number) => (now += ms) };
};

describe("createTtlCache", () => {
  it("trả giá trị trong hạn, undefined khi chưa có", () => {
    const time = clock();
    const cache = createTtlCache<string>({ maxEntries: 3, nowMs: time.nowMs });

    cache.set("a", "A", 1_000);

    expect(cache.get("a")).toBe("A");
    expect(cache.get("b")).toBeUndefined();
  });

  it("hết hạn đúng mốc ttl", () => {
    const time = clock();
    const cache = createTtlCache<string>({ maxEntries: 3, nowMs: time.nowMs });

    cache.set("a", "A", 1_000);
    time.advance(999);
    expect(cache.get("a")).toBe("A");
    time.advance(1);
    expect(cache.get("a")).toBeUndefined();
  });

  it("đầy thì bỏ mục ít dùng gần đây nhất", () => {
    const time = clock();
    const cache = createTtlCache<number>({ maxEntries: 2, nowMs: time.nowMs });

    cache.set("a", 1, 10_000);
    cache.set("b", 2, 10_000);
    cache.get("a");
    cache.set("c", 3, 10_000);

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("set lại cùng khóa thì ghi đè giá trị và hạn", () => {
    const time = clock();
    const cache = createTtlCache<number>({ maxEntries: 2, nowMs: time.nowMs });

    cache.set("a", 1, 100);
    time.advance(50);
    cache.set("a", 2, 100);
    time.advance(80);

    expect(cache.get("a")).toBe(2);
  });
});
