import type { EditorTab } from "@tripory/itinerary";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeResizeObserver, type FakeResizeObserverHandle } from "@/test/fake-resize-observer";
import { PublicDayTabs, type PublicDayTabsProps } from "./public-day-tabs";

let ro: FakeResizeObserverHandle;
let scrollIntoView: ReturnType<typeof vi.fn>;
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  ro = installFakeResizeObserver();
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
});

afterEach(() => {
  ro.restore();
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const setup = (overrides: Partial<PublicDayTabsProps> = {}) => {
  const onSelectTab = vi.fn();
  const view = render(<PublicDayTabs dayNumbers={[1, 2, 3]} onSelectTab={onSelectTab} selectedTab="overview" {...overrides} />);
  return { ...view, onSelectTab };
};

function Controlled({ initial = "overview" as EditorTab }: Readonly<{ initial?: EditorTab }>) {
  const [tab, setTab] = useState<EditorTab>(initial);
  return <PublicDayTabs dayNumbers={[1, 2, 3]} onSelectTab={setTab} selectedTab={tab} />;
}

describe("PublicDayTabs", () => {
  it("lists Tổng quan then every day, with Tổng quan selected", () => {
    setup();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual(["Tổng quan", "Ngày 1", "Ngày 2", "Ngày 3"]);
    expect(screen.getByRole("tablist", { name: "Các ngày" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Tổng quan" }).getAttribute("aria-selected")).toBe("true");
    for (const tab of tabs) expect(tab.className).toContain("min-h-touch");
  });

  it("is read-only: no add-day control and no kilometre line", () => {
    const { container } = setup();

    expect(screen.queryByText("Thêm ngày")).toBeNull();
    expect(screen.queryByRole("button", { name: /thêm/i })).toBeNull();
    expect(container.textContent).not.toMatch(/km/);
  });

  it("reports the picked tab", async () => {
    const user = userEvent.setup();
    const { onSelectTab } = setup();

    await user.click(screen.getByRole("tab", { name: "Ngày 2" }));
    expect(onSelectTab).toHaveBeenCalledWith(2);
  });

  it("reports Tổng quan when it is picked from a day tab", async () => {
    const user = userEvent.setup();
    const { onSelectTab } = setup({ selectedTab: 2 });

    await user.click(screen.getByRole("tab", { name: "Tổng quan" }));

    expect(onSelectTab).toHaveBeenCalledWith("overview");
  });

  it("moves focus with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    screen.getByRole("tab", { name: "Tổng quan" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Ngày 1" }));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Ngày 3" }));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Tổng quan" }));
  });

  it("still draws a tab for sparse days", () => {
    setup({ dayNumbers: [1, 2, 3, 4] });

    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });

  it("applies a focus request once per seq", () => {
    const { rerender } = setup({ focusRequest: { tab: 3, seq: 1 } });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Ngày 3" }));

    screen.getByRole("tab", { name: "Ngày 1" }).focus();
    rerender(<PublicDayTabs dayNumbers={[1, 2, 3]} focusRequest={{ tab: 3, seq: 1 }} onSelectTab={vi.fn()} selectedTab="overview" />);

    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Ngày 1" }));
  });

  it("scrolls the selected tab into view when it changes", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    scrollIntoView.mockClear();

    await user.click(screen.getByRole("tab", { name: "Ngày 3" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ inline: "nearest", block: "nearest", behavior: "smooth" });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(screen.getByRole("tab", { name: "Ngày 3" }));
  });

  it("does not throw when scrollIntoView does not exist", () => {
    Element.prototype.scrollIntoView = undefined as unknown as typeof Element.prototype.scrollIntoView;

    expect(() => setup()).not.toThrow();
  });
});
