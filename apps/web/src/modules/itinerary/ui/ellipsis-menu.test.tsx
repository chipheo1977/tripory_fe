// Tái hiện lỗi "click ⋯ không có hiện tượng gì" trong đúng bối cảnh ghép của từng nơi dùng.
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import type { Waypoint } from "@tripory/itinerary";
import { parseItineraryId } from "@tripory/shared-kernel";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installFakeResizeObserver, type FakeResizeObserverHandle } from "@/test/fake-resize-observer";
import { EditorLayout } from "./editor-layout";
import { ItineraryCard } from "./itinerary-card";
import { SortableWaypointItem } from "./sortable-waypoint-item";

vi.mock("next/link", () => ({
  default: ({ children, href, ref }: { children?: ReactNode; href: string; ref?: React.Ref<HTMLAnchorElement> }) => (
    <a href={href} ref={ref}>
      {children}
    </a>
  ),
}));

const originalMatchMedia = window.matchMedia;
let ro: FakeResizeObserverHandle;

beforeEach(() => {
  ro = installFakeResizeObserver();
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  ro.restore();
  window.matchMedia = originalMatchMedia;
});

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
if (ID === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const waypoint = (id: string, name: string): Waypoint => ({
  id,
  dayNumber: 1,
  orderIndex: 0,
  name,
  address: null,
  notes: null,
  coordinate: { latitude: 11.94, longitude: 108.44 },
});

function SortableRow() {
  return (
    <DndContext>
      <SortableContext items={["a", "b"]}>
        <ol>
          <SortableWaypointItem
            actions={{ onActivate: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn() }}
            appearance={{ highlighted: false, selected: false, reducedMotion: true, hintId: null }}
            position={1}
            showHandle
            waypoint={waypoint("a", "Hồ Xuân Hương")}
          />
        </ol>
      </SortableContext>
    </DndContext>
  );
}

it("sortable item: click ⋯ mở menu", async () => {
  const user = userEvent.setup();
  render(<SortableRow />);
  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Hồ Xuân Hương"' }));
  expect(await screen.findByRole("menuitem", { name: "Sửa" })).toBeTruthy();
});

it("sortable item trong timeline sheet: click ⋯ mở menu", async () => {
  const user = userEvent.setup();
  render(<EditorLayout header={<div>header</div>} map={() => null} timeline={<SortableRow />} />);
  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Hồ Xuân Hương"' }));
  expect(await screen.findByRole("menuitem", { name: "Sửa" })).toBeTruthy();
});

it("sortable item trong timeline sheet: menu nằm trên popup của sheet (z-index)", async () => {
  const user = userEvent.setup();
  render(<EditorLayout header={<div>header</div>} map={() => null} timeline={<SortableRow />} />);
  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Hồ Xuân Hương"' }));
  await screen.findByRole("menu");
  const positioner = document.querySelector("[data-align]") as HTMLElement;
  // Sheet nằm ở `z-modal`; thứ tự số của hai tầng được khóa trong design-tokens (dropdown > modal).
  expect(positioner.className).toContain("z-dropdown");
  const viewport = document.querySelector("[data-sheet-position]")?.parentElement as HTMLElement;
  expect(viewport.className).toContain("z-modal");
});

it("itinerary card: click ⋯ mở menu", async () => {
  const user = userEvent.setup();
  render(
    <ItineraryCard
      onDelete={vi.fn()}
      summary={{ id: ID, title: "Sài Gòn", coverImageUrl: null, destinationCode: null, startDate: null, isPublic: false, totalDistanceKm: 0 }}
    />,
  );
  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Sài Gòn"' }));
  expect(await screen.findByRole("menuitem", { name: "Xóa" })).toBeTruthy();
});

it("itinerary card: nút ⋯ không bị lớp phủ của link tiêu đề (after:inset-0) đè lên", () => {
  render(
    <ItineraryCard
      onDelete={vi.fn()}
      summary={{ id: ID, title: "Sài Gòn", coverImageUrl: null, destinationCode: null, startDate: null, isPublic: false, totalDistanceKm: 0 }}
    />,
  );
  const trigger = screen.getByRole("button", { name: 'Thao tác cho "Sài Gòn"' });
  // z-base = 0 trùng tầng với ::after (z-index auto) đứng sau trong DOM nên bị đè; phải có tầng dương.
  expect(trigger.className).not.toContain("z-base");
  expect(trigger.className).toMatch(/\bz-sticky\b/);
  // `isolate` giữ tầng đó trong thẻ, không đè lên header sticky của trang.
  expect(trigger.closest("article")?.className).toMatch(/\bisolate\b/);
});
