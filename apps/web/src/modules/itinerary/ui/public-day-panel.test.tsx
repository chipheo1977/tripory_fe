import type { DayView } from "@tripory/itinerary";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeFxWaypoint } from "@/test/domain-itinerary-fixtures";
import { PublicDayPanel, type PublicDayPanelProps } from "./public-day-panel";

const WAYPOINTS = [
  makeFxWaypoint("a", 2, 0, { name: "Chùa Cầu", address: "Nguyễn Thị Minh Khai" }),
  makeFxWaypoint("b", 2, 1, { name: "Hội quán", notes: "<b>x</b>\ndòng hai" }),
  makeFxWaypoint("c", 2, 2, { name: "Chợ đêm" }),
];

const day = (overrides: Partial<DayView> = {}): DayView => ({
  dayNumber: 2,
  subtitle: "Phố cổ",
  distanceKm: 12.4,
  waypoints: WAYPOINTS,
  ...overrides,
});

const setup = (overrides: Partial<PublicDayPanelProps> = {}, value: DayView = day()) => {
  const onSelect = vi.fn();
  const view = render(<PublicDayPanel day={value} mapReady onSelect={onSelect} selectedId={null} {...overrides} />);
  return { ...view, onSelect };
};

describe("PublicDayPanel", () => {
  it("shows the subtitle, the meta line and a list of pressable waypoints", () => {
    setup();

    expect(screen.getByText("Phố cổ")).toBeTruthy();
    expect(screen.getByText("3 điểm · 12,4 km")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Điểm đến Ngày 2" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getAllByRole("button")).toHaveLength(3);
  });

  it("is read-only: no sorting, delete, edit or add controls", () => {
    const { container } = setup();

    expect(container.querySelector("[aria-roledescription]")).toBeNull();
    expect(screen.queryByRole("button", { name: /xóa|sửa|kéo|thêm/i })).toBeNull();
    expect(container.textContent).not.toContain("Thêm điểm đến");
  });

  it("omits the subtitle line without a subtitle and hides zero km", () => {
    setup({}, day({ subtitle: null, distanceKm: 0 }));

    expect(screen.queryByText("Phố cổ")).toBeNull();
    expect(screen.getByText("3 điểm")).toBeTruthy();
  });

  it("reports the pressed waypoint once", async () => {
    const { onSelect } = setup();

    await userEvent.setup().click(screen.getByRole("button", { name: /Hội quán/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(WAYPOINTS[1]);
  });

  it("marks the selected waypoint and reveals its details right after the button", () => {
    setup({ selectedId: "b" });

    const selected = screen.getByRole("button", { name: /Hội quán/ });
    expect(selected.getAttribute("aria-current")).toBe("true");
    expect(selected.className).toContain("ring-2 ring-inset ring-text");
    const item = selected.closest("li") as HTMLElement;
    const notes = within(item).getByText(/dòng hai/);
    expect(notes.className).toContain("whitespace-pre-line");
    expect(notes.textContent).toContain("<b>x</b>");
    expect(item.querySelector("b")).toBeNull();
    expect(within(item).getByRole("link", { name: "Mở Hội quán trong Google Maps (mở tab mới)" })).toBeTruthy();
    expect(selected.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const other of ["Chùa Cầu", "Chợ đêm"]) {
      const row = screen.getByRole("button", { name: new RegExp(other) });
      expect(row.getAttribute("aria-current")).toBeNull();
      expect((row.closest("li") as HTMLElement).querySelector("a")).toBeNull();
    }
  });

  it("shows only the link for a selected waypoint without notes", () => {
    setup({ selectedId: "c" });

    const item = screen.getByRole("button", { name: /Chợ đêm/ }).closest("li") as HTMLElement;
    expect(item.querySelectorAll("p")).toHaveLength(0);
    expect(within(item).getByRole("link")).toBeTruthy();
  });

  it("describes the buttons with the map hint only when the map is ready", async () => {
    const { onSelect, unmount } = setup({ mapReady: true });
    const ready = screen.getAllByRole("button")[0] as HTMLElement;
    const hintId = ready.getAttribute("aria-describedby");
    expect(hintId).not.toBeNull();
    expect(document.getElementById(hintId as string)?.textContent).toBe("Nhấn để xem trên bản đồ");
    unmount();

    const second = setup({ mapReady: false });
    const notReady = screen.getAllByRole("button")[0] as HTMLElement;
    expect(notReady.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByText("Nhấn để xem trên bản đồ")).toBeNull();
    await userEvent.setup().click(notReady);
    expect(second.onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("numbers the waypoints from 1 in the day colour, hidden from screen readers", () => {
    const { container } = setup();

    const badges = container.querySelectorAll("button > span[aria-hidden=true]");
    expect([...badges].map((badge) => badge.textContent)).toEqual(["1", "2", "3"]);
    expect(badges[0]?.className).toContain("bg-map-day-2");
  });

  it("explains an empty day without a list or a call to action", () => {
    const { container } = setup({}, day({ waypoints: [], distanceKm: null }));

    expect(screen.getByRole("heading", { name: "Chưa có điểm đến nào trong Ngày 2" })).toBeTruthy();
    expect(screen.getByText("Người tạo chưa thêm điểm đến cho ngày này.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    expect(container.querySelector("button, a")).toBeNull();
  });
});
