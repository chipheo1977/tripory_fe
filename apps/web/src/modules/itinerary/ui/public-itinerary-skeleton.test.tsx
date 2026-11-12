import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicItinerarySkeleton } from "./public-itinerary-skeleton";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PublicItinerarySkeleton", () => {
  it("announces the loading state to screen readers", () => {
    render(<PublicItinerarySkeleton />);

    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Đang tải lịch trình…");
    expect(status.className).toContain("sr-only");
  });

  it("has the article shape: a cover block, three chips and two day blocks, all hidden from assistive tech", () => {
    const { container } = render(<PublicItinerarySkeleton />);

    expect(container.querySelectorAll(".aspect-\\(--itinerary-cover-ratio\\)")).toHaveLength(1);
    expect(container.querySelectorAll(".h-11")).toHaveLength(3);
    expect(container.querySelectorAll(".h-16")).toHaveLength(4);
    const skeletons = container.querySelectorAll("[data-variant]");
    expect(skeletons.length).toBeGreaterThan(5);
    for (const skeleton of skeletons) expect(skeleton.getAttribute("aria-hidden")).toBe("true");
  });

  it("explains the cold start only after 5 seconds, in a polite live region", () => {
    const { container } = render(<PublicItinerarySkeleton />);
    const live = container.querySelector("[aria-live=polite]") as HTMLElement;
    expect(live.textContent).toBe("");

    act(() => vi.advanceTimersByTime(4999));
    expect(live.textContent).toBe("");
    act(() => vi.advanceTimersByTime(1));
    expect(live.textContent).toBe("Máy chủ đang khởi động, có thể mất tới 30 giây…");
  });
});
