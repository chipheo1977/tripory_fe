import { parseCalendarDate, type ItinerarySummary } from "@tripory/itinerary";
import { parseItineraryId } from "@tripory/shared-kernel";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { clearEnteredFromList, enteredFromList } from "./entry-flag";
import { ItineraryCard } from "./itinerary-card";

// `next/link` bỏ qua click khi không có AppRouterContext trong jsdom (xem 04-13): dùng thẻ <a> giữ hợp đồng cần kiểm.
vi.mock("next/link", () => ({
  default: ({
    children,
    onNavigate,
    ref,
    ...props
  }: {
    children?: ReactNode;
    onNavigate?: (event: { preventDefault(): void }) => void;
    ref?: React.Ref<HTMLAnchorElement>;
    href: string;
  }) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.({ preventDefault: () => undefined });
      }}
      ref={ref}
    >
      {children}
    </a>
  ),
}));

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const DATE = parseCalendarDate("2026-10-12");
if (ID === null || DATE === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const summary = (overrides: Partial<ItinerarySummary> = {}): ItinerarySummary => ({
  id: ID,
  title: "Sài Gòn 3 ngày",
  coverImageUrl: null,
  destinationCode: null,
  startDate: DATE,
  isPublic: false,
  totalDistanceKm: 12.4,
  ...overrides,
});

beforeEach(() => {
  clearEnteredFromList();
});

it("links the title to the editor and shows the draft badge", () => {
  render(<ItineraryCard onDelete={vi.fn()} summary={summary()} />);
  const link = screen.getByRole("link", { name: "Sài Gòn 3 ngày" });
  expect(link.getAttribute("href")).toBe(`/itineraries/${ID}/edit`);
  expect(screen.getByText("Nháp")).toBeTruthy();
});

it("shows the published badge", () => {
  render(<ItineraryCard onDelete={vi.fn()} summary={summary({ isPublic: true })} />);
  expect(screen.getByText("Đã xuất bản")).toBeTruthy();
  expect(screen.queryByText("Nháp")).toBeNull();
});

it("renders the meta row with start date and distance", () => {
  render(<ItineraryCard onDelete={vi.fn()} summary={summary()} />);
  expect(screen.getByText("Khởi hành 12/10/2026 · 12,4 km")).toBeTruthy();
});

it("hides the distance when it is 0", () => {
  render(<ItineraryCard onDelete={vi.fn()} summary={summary({ totalDistanceKm: 0 })} />);
  expect(screen.getByText("Khởi hành 12/10/2026")).toBeTruthy();
});

it("hides the start date when missing", () => {
  render(<ItineraryCard onDelete={vi.fn()} summary={summary({ startDate: null })} />);
  expect(screen.getByText("12,4 km")).toBeTruthy();
});

it("omits the meta row when both parts are missing", () => {
  const { container } = render(
    <ItineraryCard onDelete={vi.fn()} summary={summary({ startDate: null, totalDistanceKm: 0 })} />,
  );
  expect(container.textContent).not.toContain("Khởi hành");
  expect(container.textContent).not.toContain("km");
});

it("never shows day or waypoint counters", () => {
  const { container } = render(<ItineraryCard onDelete={vi.fn()} summary={summary({ title: "Đà Lạt cuối tuần" })} />);
  expect(container.textContent).not.toMatch(/\d+\s*(ngày|điểm)/i);
});

it("renders no img for a card without cover", () => {
  const { container } = render(<ItineraryCard onDelete={vi.fn()} summary={summary()} />);
  expect(container.querySelector("img")).toBeNull();
});

it("renders the cover image when present", () => {
  const { container } = render(
    <ItineraryCard onDelete={vi.fn()} summary={summary({ coverImageUrl: "https://images.example.com/a.jpg" })} />,
  );
  expect(container.querySelector("img")?.getAttribute("src")).toBe("https://images.example.com/a.jpg");
});

it("marks that the editor was entered from the list when the title link is used", async () => {
  const user = userEvent.setup();
  render(<ItineraryCard onDelete={vi.fn()} summary={summary()} />);
  expect(enteredFromList()).toBe(false);
  await user.click(screen.getByRole("link", { name: "Sài Gòn 3 ngày" }));
  expect(enteredFromList()).toBe(true);
});

it("opens the menu with Mở and Xóa, named after the title", async () => {
  const user = userEvent.setup();
  render(<ItineraryCard onDelete={vi.fn()} summary={summary()} />);
  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Sài Gòn 3 ngày"' }));
  const open = await screen.findByRole("menuitem", { name: "Mở" });
  expect(open.getAttribute("href")).toBe(`/itineraries/${ID}/edit`);
  expect(screen.getByRole("menuitem", { name: "Xóa" })).toBeTruthy();
});

it("calls onDelete with the summary when Xóa is chosen", async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn();
  const value = summary();
  render(<ItineraryCard onDelete={onDelete} summary={value} />);
  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Sài Gòn 3 ngày"' }));
  await user.click(await screen.findByRole("menuitem", { name: "Xóa" }));
  await waitFor(() => expect(onDelete).toHaveBeenCalledWith(value));
});

it("forwards the title link ref", () => {
  const ref = { current: null as HTMLAnchorElement | null };
  render(<ItineraryCard onDelete={vi.fn()} summary={summary()} titleLinkRef={ref} />);
  expect(ref.current).toBe(screen.getByRole("link", { name: "Sài Gòn 3 ngày" }));
});
