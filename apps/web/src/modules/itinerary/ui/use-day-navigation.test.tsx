import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeIntersectionObserver, type FakeIntersectionObserverHandle } from "@/test/fake-intersection-observer";
import { useDayNavigation, type DayNavigation } from "./use-day-navigation";

let io: FakeIntersectionObserverHandle;
let scrollIntoView: ReturnType<typeof vi.fn>;
const holder: { nav: DayNavigation | null } = { nav: null };
const api = (): DayNavigation => holder.nav as DayNavigation;
const originalMatchMedia = window.matchMedia;
const originalScrollIntoView = Element.prototype.scrollIntoView;

function Harness({ enabled = true, topOffset = 120, days = [1, 2, 3] }: Readonly<{ enabled?: boolean; topOffset?: number; days?: number[] }>) {
  const nav = useDayNavigation({ dayNumbers: days, topOffset, enabled });
  useEffect(() => {
    holder.nav = nav;
  });
  return (
    <div>
      {days.map((day) => (
        <section id={`ngay-${day}`} key={day}>
          <h2 tabIndex={-1}>Ngày {day}</h2>
        </section>
      ))}
      <output data-testid="active">{nav.activeDay}</output>
    </div>
  );
}

const active = () => Number(screen.getByTestId("active").textContent);
const observer = () => io.instances.at(-1)!;
const report = (day: number, isIntersecting: boolean) =>
  act(() => {
    const target = document.getElementById(`ngay-${day}`) as Element;
    observer().callback([{ isIntersecting, target } as unknown as IntersectionObserverEntry], observer() as unknown as IntersectionObserver);
  });

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => {
  io = installFakeIntersectionObserver();
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
  setReducedMotion(false);
});

afterEach(() => {
  io.restore();
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

describe("useDayNavigation: reading position", () => {
  it("observes every day section with a rootMargin that clears the sticky header and the bottom 60%", () => {
    render(<Harness topOffset={120} />);

    expect(io.instances).toHaveLength(1);
    expect(observer().options?.rootMargin).toBe("-120px 0px -60% 0px");
    expect([...observer().targets].map((el) => el.id)).toEqual(["ngay-1", "ngay-2", "ngay-3"]);
  });

  it("follows the smallest intersecting day and keeps the previous day when nothing intersects", () => {
    render(<Harness />);

    report(2, true);
    expect(active()).toBe(2);
    report(1, true);
    expect(active()).toBe(1);
    report(1, false);
    expect(active()).toBe(2);
    report(2, false);
    expect(active()).toBe(2);
  });

  it("does not create an observer while disabled", () => {
    render(<Harness enabled={false} />);

    expect(io.instances).toHaveLength(0);
    expect(active()).toBe(1);
  });

  it("disconnects on unmount", () => {
    const { unmount } = render(<Harness />);

    unmount();

    expect(observer().disconnected).toBe(true);
  });

  it("becomes the last day when the page is scrolled to the bottom", () => {
    render(<Harness />);
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 3000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 2200 });

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(active()).toBe(3);
  });
});

describe("useDayNavigation: goToDay", () => {
  it("scrolls smoothly to the day, highlights it at once and focuses its heading without touching the hash", () => {
    const hashBefore = window.location.hash;
    const lengthBefore = window.history.length;
    render(<Harness />);

    act(() => api().goToDay(3));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("ngay-3"));
    expect(active()).toBe(3);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Ngày 3" }));
    expect(window.location.hash).toBe(hashBefore);
    expect(window.history.length).toBe(lengthBefore);
  });

  it("jumps without animation when the user prefers reduced motion (read at click time)", () => {
    render(<Harness />);
    setReducedMotion(true);

    act(() => api().goToDay(2));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  });

  it("ignores observer updates while pinned, until scrollend", () => {
    render(<Harness />);
    act(() => api().goToDay(3));

    report(1, true);
    expect(active()).toBe(3);

    act(() => {
      window.dispatchEvent(new Event("scrollend"));
    });
    report(2, true);
    expect(active()).toBe(1);
  });

  it("releases the pin after 1000ms without scrollend", () => {
    vi.useFakeTimers();
    render(<Harness />);
    act(() => api().goToDay(3));

    report(1, true);
    expect(active()).toBe(3);
    act(() => vi.advanceTimersByTime(1000));
    report(2, true);

    expect(active()).toBe(1);
  });

  it("does nothing for a day that is not in the page", () => {
    render(<Harness />);

    act(() => api().goToDay(9));

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(active()).toBe(1);
  });

  it("does not throw when scrollIntoView is missing (jsdom)", () => {
    Element.prototype.scrollIntoView = undefined as unknown as typeof Element.prototype.scrollIntoView;
    render(<Harness />);

    expect(() => act(() => api().goToDay(2))).not.toThrow();
    expect(active()).toBe(2);
  });
});
