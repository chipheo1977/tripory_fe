import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePublicView } from "./use-public-view";

const h = vi.hoisted(() => ({ query: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(h.query),
  usePathname: () => "/itineraries/abc",
  useRouter: () => {
    throw new Error("không dùng router");
  },
}));

let pushState: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  h.query = "";
  pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePublicView", () => {
  it("reads article by default and map from ?view=map", () => {
    expect(renderHook(() => usePublicView()).result.current.view).toBe("article");
    h.query = "view=map";
    expect(renderHook(() => usePublicView()).result.current.view).toBe("map");
    h.query = "view=lạ";
    expect(renderHook(() => usePublicView()).result.current.view).toBe("article");
  });

  it("pushes exactly one history entry with view=map when switching to the map", () => {
    const { result } = renderHook(() => usePublicView());

    act(() => result.current.setView("map"));

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(null, "", "/itineraries/abc?view=map");
  });

  it("drops the param when switching back to the article", () => {
    h.query = "view=map";
    const { result } = renderHook(() => usePublicView());

    act(() => result.current.setView("article"));

    expect(pushState).toHaveBeenCalledWith(null, "", "/itineraries/abc");
  });

  it("keeps other query params", () => {
    h.query = "ref=zalo";
    const { result } = renderHook(() => usePublicView());

    act(() => result.current.setView("map"));

    expect(pushState).toHaveBeenCalledWith(null, "", "/itineraries/abc?ref=zalo&view=map");
  });

  it("does nothing when the view does not change", () => {
    const { result } = renderHook(() => usePublicView());

    act(() => result.current.setView("article"));

    expect(pushState).not.toHaveBeenCalled();
  });

  it("follows the url when it changes (back button)", () => {
    h.query = "view=map";
    const { result, rerender } = renderHook(() => usePublicView());
    expect(result.current.view).toBe("map");

    h.query = "";
    rerender();

    expect(result.current.view).toBe("article");
  });
});
