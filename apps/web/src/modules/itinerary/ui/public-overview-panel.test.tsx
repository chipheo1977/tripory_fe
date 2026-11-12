import type { DaySummary } from "@tripory/itinerary";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthorLine } from "./author-line";
import { PublicOverviewPanel, type PublicOverviewPanelProps } from "./public-overview-panel";
import type { PublicOverviewData } from "./public-format";

const DATA: PublicOverviewData = {
  title: "Hội An 3 ngày",
  description: "Phố cổ và biển",
  startDateLabel: "Khởi hành 12/10/2026",
  coverImageUrl: null,
  fallbackCoverUrl: null,
  metaLine: "3 ngày · 5 điểm · 12,4 km",
};

const DAYS: readonly DaySummary[] = [
  { dayNumber: 1, subtitle: "Phố cổ", waypointCount: 3, distanceKm: 4.2 },
  { dayNumber: 2, subtitle: null, waypointCount: 0, distanceKm: null },
  { dayNumber: 3, subtitle: null, waypointCount: 2, distanceKm: 8.2 },
];

const setup = (overrides: Partial<PublicOverviewPanelProps> = {}) => {
  const onSelectDay = vi.fn();
  const onEmphasizeDay = vi.fn();
  const view = render(
    <PublicOverviewPanel
      author={<AuthorLine avatarUrl={null} displayName="Lan" isOwner={false} />}
      data={DATA}
      days={DAYS}
      onEmphasizeDay={onEmphasizeDay}
      onSelectDay={onSelectDay}
      rowEmphasis={() => "none"}
      variant="wide"
      {...overrides}
    />,
  );
  return { ...view, onSelectDay, onEmphasizeDay };
};

describe("PublicOverviewPanel", () => {
  it("shows the trip info with the title as a paragraph, not a heading", () => {
    setup();

    const region = screen.getByRole("region", { name: "Thông tin chuyến đi" });
    const title = within(region).getByText("Hội An 3 ngày");
    expect(title.tagName).toBe("P");
    expect(screen.queryByRole("heading", { name: "Hội An 3 ngày" })).toBeNull();
    expect(within(region).getByText("Khởi hành 12/10/2026")).toBeTruthy();
    expect(within(region).getByText("3 ngày · 5 điểm · 12,4 km")).toBeTruthy();
    expect(within(region).getByText("Phố cổ và biển")).toBeTruthy();
    expect(within(region).getByText("Lan")).toBeTruthy();
  });

  it("lists every day as a pressable row and reports the chosen day", async () => {
    const { onSelectDay } = setup();

    expect(screen.getByRole("heading", { level: 3, name: "Các ngày" })).toBeTruthy();
    const list = screen.getByRole("list", { name: "Tóm tắt các ngày" });
    expect(within(list).getAllByRole("button")).toHaveLength(3);
    await userEvent.setup().click(within(list).getByRole("button", { name: /^Xem Ngày 3/ }));

    expect(onSelectDay).toHaveBeenCalledWith(3);
  });

  it("has no editing affordance or status badge", () => {
    const { container } = setup();

    for (const text of ["Thêm điểm đến", "Thêm ảnh bìa", "Đã xuất bản", "Nháp", "Sửa"]) {
      expect(container.textContent).not.toContain(text);
    }
  });

  it("does nothing when the info background is pressed", async () => {
    const { onSelectDay, onEmphasizeDay } = setup();

    await userEvent.setup().click(screen.getByText("Hội An 3 ngày"));

    expect(onSelectDay).not.toHaveBeenCalled();
    expect(onEmphasizeDay).not.toHaveBeenCalled();
  });

  it("uses the thumbnail cover and clamps in the compact variant", () => {
    const { container } = setup({ variant: "compact", data: { ...DATA, coverImageUrl: "https://img.example/a.jpg" } });

    expect(container.querySelector(".w-\\(--overview-cover-thumb-width\\)")).not.toBeNull();
    expect(screen.getByText("Hội An 3 ngày").className).toContain("line-clamp-2");
    expect(screen.getByText("Phố cổ và biển").className).toContain("line-clamp-2");
  });

  it("clamps the description to four lines in the wide variant", () => {
    setup();

    expect(screen.getByText("Phố cổ và biển").className).toContain("line-clamp-4");
  });

  it("shows markup in the description as plain text", () => {
    const { container } = setup({ data: { ...DATA, description: "<b>x</b>" } });

    expect(container.textContent).toContain("<b>x</b>");
    expect(container.querySelector("b")).toBeNull();
  });

  it("does not stretch to the full height (the pill bar must stay reachable)", () => {
    const { container } = setup();

    expect((container.firstElementChild as HTMLElement).className).not.toContain("min-h-full");
  });
});
