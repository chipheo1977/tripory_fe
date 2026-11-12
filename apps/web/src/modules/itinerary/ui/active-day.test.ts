import { describe, expect, it } from "vitest";
import { nextActiveDay } from "./active-day";

const input = (overrides: Partial<Parameters<typeof nextActiveDay>[0]> = {}) => ({
  previous: 1,
  intersecting: new Set<number>(),
  atBottom: false,
  lastDay: 5,
  ...overrides,
});

describe("nextActiveDay", () => {
  it("is the last day when the page is scrolled to the bottom, whatever intersects", () => {
    expect(nextActiveDay(input({ atBottom: true, intersecting: new Set([1, 2]) }))).toBe(5);
  });

  it("is the smallest intersecting day", () => {
    expect(nextActiveDay(input({ intersecting: new Set([3, 2, 4]) }))).toBe(2);
  });

  it("keeps the previous day when nothing intersects", () => {
    expect(nextActiveDay(input({ previous: 3 }))).toBe(3);
  });

  it("follows a single intersecting day", () => {
    expect(nextActiveDay(input({ intersecting: new Set([4]) }))).toBe(4);
  });
});
