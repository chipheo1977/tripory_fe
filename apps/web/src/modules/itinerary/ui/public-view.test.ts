import { describe, expect, it } from "vitest";
import { parsePublicView, viewSearch } from "./public-view";

describe("parsePublicView", () => {
  it("accepts exactly map", () => {
    expect(parsePublicView("map")).toBe("map");
  });

  it.each([null, undefined, "", "article", "MAP", "map ", "x", "map&view=article"])(
    "falls back to article for %j",
    (raw) => {
      expect(parsePublicView(raw)).toBe("article");
    },
  );
});

describe("viewSearch", () => {
  it("removes the param for article", () => {
    expect(viewSearch("a=1&view=map", "article")).toBe("a=1");
    expect(viewSearch("view=map", "article")).toBe("");
  });

  it("adds the param for map and keeps other params", () => {
    expect(viewSearch("", "map")).toBe("view=map");
    expect(viewSearch("a=1", "map")).toBe("a=1&view=map");
  });

  it("does not duplicate an existing map param", () => {
    expect(viewSearch("view=map&b=2", "map")).toBe("view=map&b=2");
  });
});
