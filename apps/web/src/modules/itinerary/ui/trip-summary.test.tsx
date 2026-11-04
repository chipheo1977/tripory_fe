import { parseCalendarDate, type Itinerary } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { TripSummary } from "./trip-summary";

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
const START = parseCalendarDate("2026-10-12");
if (ID === null || OWNER === null || START === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const COVER = "https://images.example.com/a.jpg";

const full: Itinerary = {
  id: ID,
  ownerId: OWNER,
  title: "Đà Lạt 3 ngày",
  description: "Dòng một\nDòng hai",
  coverImageUrl: COVER,
  coverImages: [COVER],
  destinationCode: null,
  interests: [],
  startDate: START,
  isPublic: false,
  totalDistanceKm: 12.4,
  days: [],
  waypoints: [],
};

function setup(overrides: Partial<Itinerary> = {}, variant: "canvas" | "compact" = "canvas") {
  const onEdit = vi.fn();
  const view = render(<TripSummary itinerary={{ ...full, ...overrides }} onEdit={onEdit} variant={variant} />);
  return { onEdit, ...view };
}

it("labels the region with a screen-reader-only heading and shows title as a paragraph, not a heading", () => {
  setup();
  const region = screen.getByRole("region", { name: "Thông tin chuyến đi" });
  expect(within(region).getAllByRole("heading")).toHaveLength(1);
  const title = screen.getByText("Đà Lạt 3 ngày");
  expect(title.tagName).toBe("P");
  expect(title.className).toContain("text-display");
  expect(title.className).toContain("break-words");
});

it("shows badge, start date, BE total distance and a pre-line description", () => {
  const { container } = setup();
  expect(screen.getByText("Nháp")).toBeTruthy();
  expect(screen.getByText("Khởi hành 12/10/2026")).toBeTruthy();
  expect(screen.getByText("Tổng quãng đường: 12,4 km")).toBeTruthy();
  const description = screen.getByText(/Dòng một/);
  expect(description.className).toContain("whitespace-pre-line");
  expect(description.textContent).toBe("Dòng một\nDòng hai");
  expect(container.querySelector("img")?.getAttribute("src")).toBe(COVER);
});

it("shows the published badge", () => {
  setup({ isPublic: true });
  expect(screen.getByText("Đã xuất bản")).toBeTruthy();
  expect(screen.queryByText("Nháp")).toBeNull();
});

it("hides the distance row when the BE total is 0", () => {
  setup({ totalDistanceKm: 0 });
  expect(screen.queryByText(/Tổng quãng đường/)).toBeNull();
});

it("omits the start date and description when they are missing", () => {
  setup({ startDate: null, description: null });
  expect(screen.queryByText(/Khởi hành/)).toBeNull();
  expect(screen.queryByText(/Dòng một/)).toBeNull();
});

it("never renders description or title as HTML", () => {
  const { container } = setup({ title: "<b>đậm</b>", description: "<img src=x onerror=alert(1)>" });
  expect(container.querySelector("b")).toBeNull();
  expect(container.querySelectorAll("img").length).toBe(1);
  expect(screen.getByText("<b>đậm</b>")).toBeTruthy();
});

it("opens the editor from the Sửa thông tin button exactly once", async () => {
  const user = userEvent.setup();
  const { onEdit } = setup();
  await user.click(screen.getByRole("button", { name: "Sửa thông tin" }));
  expect(onEdit).toHaveBeenCalledTimes(1);
});

it("without a cover shows a placeholder with a Thêm ảnh bìa button that opens the editor once", async () => {
  const user = userEvent.setup();
  const { onEdit, container } = setup({ coverImageUrl: null });
  expect(container.querySelector("img")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
  expect(onEdit).toHaveBeenCalledTimes(1);
});

it("treats a non-https cover as no cover", () => {
  setup({ coverImageUrl: "http://images.example.com/a.jpg" });
  expect(screen.getByRole("button", { name: "Thêm ảnh bìa" })).toBeTruthy();
});

it("opens the editor when the plain summary area or the cover is clicked", async () => {
  const user = userEvent.setup();
  const { onEdit, container } = setup();
  await user.click(screen.getByText("Đà Lạt 3 ngày"));
  expect(onEdit).toHaveBeenCalledTimes(1);
  await user.click(container.querySelector("img") as HTMLImageElement);
  expect(onEdit).toHaveBeenCalledTimes(2);
});

it("keeps the clickable area out of the tab order and the accessibility tree", () => {
  const { container } = setup();
  expect(container.querySelector("[tabindex]:not(button)")).toBeNull();
  expect(container.querySelector("[role]:not(button)")).toBeNull();
  const buttons = screen.getAllByRole("button");
  expect(buttons.map((button) => button.textContent)).toEqual(["Sửa thông tin"]);
});

it("uses the compact typography and a 3-line description clamp", () => {
  setup({}, "compact");
  expect(screen.getByText("Đà Lạt 3 ngày").className).toContain("text-heading");
  expect(screen.getByText(/Dòng một/).className).toContain("line-clamp-3");
});

it("does not clamp the description in the canvas variant", () => {
  setup({}, "canvas");
  expect(screen.getByText(/Dòng một/).className).not.toContain("line-clamp");
});

it("uses the destination default image instead of the add-cover prompt when there is a destination", () => {
  const { container } = setup({ coverImageUrl: null, coverImages: [], destinationCode: "vn-da-nang" });
  expect(container.querySelector("img")?.getAttribute("src")).toBe(
    "https://triporyv1.vercel.app/destinations/vn-da-nang.jpg",
  );
  expect(screen.queryByRole("button", { name: "Thêm ảnh bìa" })).toBeNull();
});

it("still offers the add-cover prompt with neither a cover nor a destination", () => {
  setup({ coverImageUrl: null, coverImages: [], destinationCode: null });
  expect(screen.getByRole("button", { name: "Thêm ảnh bìa" })).toBeTruthy();
});

it("prefers the displayed cover over the destination default", () => {
  const { container } = setup({ destinationCode: "vn-da-nang" });
  expect(container.querySelector("img")?.getAttribute("src")).toBe(COVER);
});

it("does not show the destination name or interest labels (D-76)", () => {
  const { container } = setup({ destinationCode: "vn-da-nang", interests: ["nature"] });
  expect(container.textContent).not.toContain("Đà Nẵng");
  expect(container.textContent).not.toContain("Thiên nhiên");
});
