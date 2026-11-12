import type { DayView } from "@tripory/itinerary";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeFxWaypoint } from "@/test/domain-itinerary-fixtures";
import { ArticleDaySection } from "./article-day-section";

const day = (overrides: Partial<DayView> = {}): DayView => ({
  dayNumber: 2,
  subtitle: "Phố cổ",
  distanceKm: 12.4,
  waypoints: [
    makeFxWaypoint("a", 2, 0, { name: "Chùa Cầu", address: "Nguyễn Thị Minh Khai" }),
    makeFxWaypoint("b", 2, 1, { name: "Hội quán", notes: "<b>x</b>\ndòng hai" }),
    makeFxWaypoint("c", 2, 2, { name: "Chợ đêm" }),
  ],
  ...overrides,
});

const setup = (value: DayView = day(), showDivider = false) =>
  render(<ArticleDaySection day={value} showDivider={showDivider} />);

describe("ArticleDaySection", () => {
  it("is a labelled section anchored by day number with title and meta", () => {
    const { container } = setup();

    const section = container.querySelector("section#ngay-2");
    expect(section).not.toBeNull();
    const heading = screen.getByRole("heading", { level: 2, name: "Ngày 2 · Phố cổ" });
    expect(section?.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(screen.getByText("3 điểm · 12,4 km")).toBeTruthy();
  });

  it("lists the waypoints in the given order under an aria-labelled ol", () => {
    setup();

    const list = screen.getByRole("list", { name: "Điểm đến Ngày 2" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByRole("heading", { level: 3, name: "Chùa Cầu" })).toBeTruthy();
    expect(within(items[2]!).getByRole("heading", { level: 3, name: "Chợ đêm" })).toBeTruthy();
  });

  it("falls back to the bare day title and hides the km when there is none", () => {
    setup(day({ dayNumber: 3, subtitle: null, distanceKm: 0, waypoints: day().waypoints.slice(0, 2) }));

    expect(screen.getByRole("heading", { level: 2, name: "Ngày 3" })).toBeTruthy();
    expect(screen.getByText("2 điểm")).toBeTruthy();
  });

  it("shows Chưa có điểm for an empty day, with no list and no meta", () => {
    setup(day({ waypoints: [], distanceKm: null }));

    expect(screen.getByRole("heading", { level: 2, name: "Ngày 2 · Phố cổ" })).toBeTruthy();
    expect(screen.getByText("Chưa có điểm")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText(/điểm ·/)).toBeNull();
  });

  it("adds the divider only when asked", () => {
    const first = setup(day(), false);
    expect(first.container.querySelector("section")?.className).not.toContain("border-t");
    first.unmount();
    const next = setup(day(), true);
    expect(next.container.querySelector("section")?.className).toContain("border-t");
  });

  it("applies the scroll margin and makes the heading programmatically focusable", () => {
    const { container } = render(<ArticleDaySection day={day()} scrollMarginTop={96} showDivider={false} />);

    expect((container.querySelector("section") as HTMLElement).style.scrollMarginTop).toBe("96px");
    expect(screen.getByRole("heading", { level: 2 }).getAttribute("tabindex")).toBe("-1");
  });
});

describe("ArticleWaypoint inside a day", () => {
  it("numbers waypoints from 1 with the day colour and hides the number from screen readers", () => {
    const { container } = setup();

    const badges = container.querySelectorAll("li > span[aria-hidden=true]");
    expect([...badges].map((badge) => badge.textContent)).toEqual(["1", "2", "3"]);
    expect(badges[0]?.className).toContain("bg-map-day-2");
  });

  it("wraps the day colour after nine days", () => {
    const { container } = setup(day({ dayNumber: 9, waypoints: day().waypoints.slice(0, 1) }));

    expect(container.querySelector("li > span")?.className).toContain("bg-map-day-1");
  });

  it("shows the address only when present", () => {
    setup();

    expect(screen.getByText("Nguyễn Thị Minh Khai")).toBeTruthy();
  });

  it("renders notes as plain text with pre-line whitespace", () => {
    const { container } = setup();

    const notes = screen.getByText(/dòng hai/);
    expect(notes.className).toContain("whitespace-pre-line");
    expect(notes.textContent).toContain("<b>x</b>");
    expect(container.querySelector("b")).toBeNull();
  });

  it("opens Google Maps in a new tab safely, with the waypoint in the accessible name", () => {
    setup();

    const link = screen.getByRole("link", { name: "Mở Chùa Cầu trong Google Maps (mở tab mới)" });
    expect(link.textContent).toBe("Mở trong Google Maps");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("href")).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
  });

  it("lets a very long name wrap", () => {
    setup(day({ waypoints: [makeFxWaypoint("x", 2, 0, { name: "A".repeat(200) })] }));

    expect(screen.getByRole("heading", { level: 3 }).className).toContain("break-words");
  });
});
