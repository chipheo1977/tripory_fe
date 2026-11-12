import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FX_AUTHOR, makeFxItinerary, makeFxWaypoint } from "@/test/domain-itinerary-fixtures";
import { installFakeIntersectionObserver, type FakeIntersectionObserverHandle } from "@/test/fake-intersection-observer";
import { installFakeResizeObserver, type FakeResizeObserverHandle } from "@/test/fake-resize-observer";
import { PublicArticle, type PublicArticleProps } from "./public-article";

let io: FakeIntersectionObserverHandle;
let ro: FakeResizeObserverHandle;
let scrollIntoView: ReturnType<typeof vi.fn>;
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  io = installFakeIntersectionObserver();
  ro = installFakeResizeObserver();
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
});

afterEach(() => {
  io.restore();
  ro.restore();
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const setup = (overrides: Partial<PublicArticleProps> = {}, itinerary = makeFxItinerary()) =>
  render(<PublicArticle enabled isOwner={false} itinerary={itinerary} stickyTop={64} {...overrides} />);

describe("PublicArticle content", () => {
  it("renders the hero, a chip per day and a section per day, including the sparse day", () => {
    const { container } = setup();

    const main = container.querySelector("main#article-content");
    expect(main).not.toBeNull();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Sài Gòn 3 ngày");
    expect([...container.querySelectorAll("section")].map((section) => section.id)).toEqual(["ngay-1", "ngay-2", "ngay-3"]);
    expect(within(screen.getByRole("navigation")).getAllByRole("link")).toHaveLength(3);
    expect(within(container.querySelector("#ngay-2") as HTMLElement).getByText("Chưa có điểm")).toBeTruthy();
  });

  it("shows the meta line from the itinerary", () => {
    setup();

    expect(screen.getByText("Khởi hành 12/10/2026 · 3 ngày · 3 điểm · 12,4 km")).toBeTruthy();
  });

  it("shows the author, and the owner badge only for the owner", () => {
    const withAuthor = makeFxItinerary({ author: FX_AUTHOR });
    const { unmount } = setup({ isOwner: false }, withAuthor);
    expect(screen.getByText("Trần Thị Lan")).toBeTruthy();
    expect(screen.queryByText("Lịch trình của bạn")).toBeNull();
    unmount();

    setup({ isOwner: true }, withAuthor);
    expect(screen.getByText("Lịch trình của bạn")).toBeTruthy();
  });

  it("shows no author line without an author for a visitor", () => {
    setup();

    expect(screen.queryByText("Trần Thị Lan")).toBeNull();
    expect(screen.queryByText("Lịch trình của bạn")).toBeNull();
  });

  it("shows markup in a note as plain text", () => {
    const itinerary = makeFxItinerary({
      waypoints: [makeFxWaypoint("w", 1, 0, { notes: "<i>x</i>" })],
      days: [{ dayNumber: 1, subtitle: null, distanceKm: null }],
    });
    const { container } = setup({}, itinerary);

    expect(container.textContent).toContain("<i>x</i>");
    expect(container.querySelector("i")).toBeNull();
  });

  it("replaces the chips and the day list with an empty state when nothing was added", () => {
    const { container } = setup({}, makeFxItinerary({ days: [], waypoints: [], totalDistanceKm: 0 }));

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(container.querySelectorAll("section#ngay-1")).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Lịch trình chưa có điểm đến nào" })).toBeTruthy();
    expect(screen.getByText("Người tạo chưa thêm điểm đến vào lịch trình này. Hãy quay lại sau.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
});

describe("PublicArticle navigation", () => {
  it("creates the reading observer only while enabled", () => {
    const first = setup({ enabled: false });
    expect(io.instances).toHaveLength(0);
    first.unmount();

    setup({ enabled: true });
    expect(io.instances).toHaveLength(1);
  });

  it("jumps to a day on chip click and focuses its heading", async () => {
    const user = userEvent.setup();
    const { container } = setup();

    await user.click(screen.getByRole("link", { name: "Ngày 2" }));

    expect(scrollIntoView.mock.contexts).toContain(container.querySelector("#ngay-2"));
    expect(document.activeElement).toBe(within(container.querySelector("#ngay-2") as HTMLElement).getByRole("heading", { level: 2 }));
    expect(screen.getByRole("link", { name: "Ngày 2" }).getAttribute("aria-current")).toBe("true");
  });

  it("adds the measured chip strip height to the scroll margin of each day", () => {
    const { container } = setup({ stickyTop: 64 });

    act(() => ro.resize(screen.getByRole("navigation"), 44));

    expect((container.querySelector("#ngay-1") as HTMLElement).style.scrollMarginTop).toBe("124px");
  });

  it("never uses raw html injection", () => {
    const { container } = setup();

    expect(container.innerHTML).not.toContain("dangerouslySetInnerHTML");
  });
});
