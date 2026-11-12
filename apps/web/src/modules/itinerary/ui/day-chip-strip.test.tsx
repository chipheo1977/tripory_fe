import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DayChipStrip, type DayChipStripProps } from "./day-chip-strip";

const originalScrollIntoView = Element.prototype.scrollIntoView;
let scrollIntoView: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const base: DayChipStripProps = {
  visible: true,
  dayNumbers: [1, 2, 3],
  activeDay: 1,
  stickyTop: 64,
  onSelect: () => undefined,
};

const setup = (overrides: Partial<DayChipStripProps> = {}) => render(<DayChipStrip {...base} {...overrides} />);

describe("DayChipStrip", () => {
  it("is a named nav with one anchor per day, in order", () => {
    setup();

    const nav = screen.getByRole("navigation", { name: "Các ngày trong lịch trình" });
    const links = [...nav.querySelectorAll("a")];
    expect(links.map((link) => link.textContent)).toEqual(["Ngày 1", "Ngày 2", "Ngày 3"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["#ngay-1", "#ngay-2", "#ngay-3"]);
    expect(nav.querySelectorAll("[aria-hidden=true]").length).toBeGreaterThanOrEqual(3);
  });

  it("marks only the reading day with aria-current and the active styling", () => {
    setup({ activeDay: 2 });

    const active = screen.getByRole("link", { name: "Ngày 2" });
    expect(active.getAttribute("aria-current")).toBe("true");
    expect(active.className).toContain("font-semibold");
    expect(active.className).toContain("border-primary");
    expect(active.className).toContain("bg-primary-subtle");
    const idle = screen.getByRole("link", { name: "Ngày 1" });
    expect(idle.hasAttribute("aria-current")).toBe(false);
    expect(idle.className).toContain("font-regular");
  });

  it("selects a day on click without following the anchor", () => {
    const onSelect = vi.fn();
    setup({ onSelect });

    const proceeded = fireEvent.click(screen.getByRole("link", { name: "Ngày 3" }));

    expect(proceeded).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("selects a day with Enter on the focused chip", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    setup({ onSelect });

    screen.getByRole("link", { name: "Ngày 2" }).focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("gives each chip a touch target and sticks below the given offset", () => {
    setup({ stickyTop: 64 });

    for (const link of screen.getAllByRole("link")) expect(link.className).toContain("min-h-touch");
    const nav = screen.getByRole("navigation");
    expect(nav.style.top).toBe("64px");
    expect(nav.className).toContain("sticky");
  });

  it("renders nothing when not visible", () => {
    const { container } = setup({ visible: false });

    expect(container.firstChild).toBeNull();
  });

  it("scrolls the reading chip into view when the active day changes, but not on mount", () => {
    const { rerender } = setup({ activeDay: 1 });
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<DayChipStrip {...base} activeDay={3} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ inline: "nearest", block: "nearest", behavior: "smooth" });
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("link", { name: "Ngày 3" }));
  });

  it("forwards the strip ref to the nav", () => {
    const ref = { current: null as HTMLElement | null };
    setup({ stripRef: ref });

    expect(ref.current).toBe(screen.getByRole("navigation"));
  });
});
