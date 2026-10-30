import { makeApiError } from "@tripory/api-client";
import { parseCalendarDate, type ItinerarySummary, type Page } from "@tripory/itinerary";
import { parseItineraryId } from "@tripory/shared-kernel";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { installFakeIntersectionObserver, type FakeIntersectionObserverHandle } from "@/test/fake-intersection-observer";
import { MyItinerariesSkeleton, MyItinerariesView } from "./my-itineraries-view";

const h = vi.hoisted(() => ({
  listMine: vi.fn(),
  remove: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  search: { value: "" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, replace: h.replace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(h.search.value),
}));

// `next/link` bỏ qua click khi không có AppRouterContext trong jsdom: dùng thẻ <a> (cùng cách với itinerary-card.test).
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

vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: createItineraryHooks({
      repository: {
        listMine: (query: unknown) => h.listMine(query),
        getById: unused,
        create: unused,
        updateMetadata: unused,
        publish: unused,
        remove: (id: string) => h.remove(id),
        addWaypoint: unused,
        updateWaypoint: unused,
        deleteWaypoint: unused,
        reorderWaypoints: unused,
        setDaySubtitle: unused,
      },
      shortLinks: { resolve: unused },
    }),
  };
});

const DATE = parseCalendarDate("2026-10-12");
if (DATE === null) throw new Error("ngày mẫu phải hợp lệ");

/** `n` -> GUID hợp lệ, duy nhất theo n. */
const item = (n: number, overrides: Partial<ItinerarySummary> = {}): ItinerarySummary => {
  const id = parseItineraryId(`3f2a6c1e-8b7d-4e21-9c55-${String(n).padStart(12, "0")}`);
  if (id === null) throw new Error("id mẫu phải hợp lệ");
  return { id, title: `Lịch trình ${n}`, coverImageUrl: null, startDate: DATE, isPublic: false, totalDistanceKm: 10, ...overrides };
};

const page = (items: ItinerarySummary[], pageIndex: number, hasNextPage: boolean): Page<ItinerarySummary> => ({
  items,
  pageIndex,
  hasNextPage,
});

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

let io: FakeIntersectionObserverHandle;

function setup() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <MyItinerariesView />
    </QueryClientProvider>,
  );
  return { user };
}

const titles = () => screen.queryAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
const queriedPages = () => h.listMine.mock.calls.map(([query]) => (query as { pageIndex: number }).pageIndex);
const intersect = async (isIntersecting: boolean) => {
  await act(async () => {
    io.trigger(isIntersecting);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  h.search.value = "";
  h.listMine.mockResolvedValue(page([item(1), item(2), item(3)], 1, false));
  h.remove.mockResolvedValue(undefined);
  io = installFakeIntersectionObserver();
});

afterEach(() => {
  io.restore();
  vi.restoreAllMocks();
});

it("renders the page heading, the create button and the three tabs", async () => {
  setup();
  expect(screen.getByRole("heading", { level: 1, name: "Lịch trình của tôi" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Tạo lịch trình" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Tất cả", selected: true })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Nháp" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Đã xuất bản" })).toBeTruthy();
  await screen.findByText("Lịch trình 1");
  expect(h.listMine).toHaveBeenCalledWith(expect.objectContaining({ status: "all", pageIndex: 1 }));
});

it("selects the draft tab from ?status=draft and queries that status", async () => {
  h.search.value = "status=draft";
  setup();
  expect(screen.getByRole("tab", { name: "Nháp", selected: true })).toBeTruthy();
  await screen.findByText("Lịch trình 1");
  expect(h.listMine).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
});

it("falls back to the All tab for an unknown status", async () => {
  h.search.value = "status=xyz";
  setup();
  expect(screen.getByRole("tab", { name: "Tất cả", selected: true })).toBeTruthy();
  await screen.findByText("Lịch trình 1");
  expect(h.listMine).toHaveBeenCalledWith(expect.objectContaining({ status: "all" }));
});

it("replaces the URL without scrolling when a tab is chosen", async () => {
  const { user } = setup();
  await screen.findByText("Lịch trình 1");
  await user.click(screen.getByRole("tab", { name: "Đã xuất bản" }));
  expect(h.replace).toHaveBeenCalledWith("?status=published", { scroll: false });
});

it("renders the cards as a grid of links to the editor", async () => {
  setup();
  await screen.findByText("Lịch trình 1");
  expect(titles()).toEqual(["Lịch trình 1", "Lịch trình 2", "Lịch trình 3"]);
  expect(screen.getByRole("link", { name: "Lịch trình 2" }).getAttribute("href")).toMatch(/^\/itineraries\/.+\/edit$/);
});

it("shows 6 skeleton cards and a status while the first page loads", () => {
  h.listMine.mockReturnValue(new Promise(() => undefined));
  setup();
  expect(screen.getByRole("status").textContent).toBe("Đang tải lịch trình…");
  expect(document.querySelectorAll('[data-slot="itinerary-card-skeleton"]')).toHaveLength(6);
});

it("shows an error state with a retry that refetches when the first page fails", async () => {
  h.listMine.mockRejectedValueOnce(makeApiError({ kind: "http", status: 500, code: null, message: null }));
  const { user } = setup();
  expect(await screen.findByText("Không thể tải nội dung")).toBeTruthy();
  h.listMine.mockResolvedValue(page([item(1)], 1, false));
  await user.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(await screen.findByText("Lịch trình 1")).toBeTruthy();
  expect(h.listMine).toHaveBeenCalledTimes(2);
});

it.each([
  ["", "Chưa có lịch trình nào", "Tạo lịch trình đầu tiên để lên kế hoạch cho chuyến đi của bạn.", true],
  ["status=draft", "Chưa có bản nháp nào", "Lịch trình chưa xuất bản sẽ nằm ở đây.", false],
  [
    "status=published",
    "Chưa xuất bản lịch trình nào",
    "Lịch trình đã xuất bản sẽ nằm ở đây. Ai có link đều xem được.",
    false,
  ],
])("shows the empty state for ?%s", async (search, heading, body, hasCta) => {
  h.search.value = search;
  h.listMine.mockResolvedValue(page([], 1, false));
  setup();
  expect(await screen.findByRole("heading", { level: 2, name: heading })).toBeTruthy();
  expect(screen.getByText(body)).toBeTruthy();
  // Header luôn có một nút "Tạo lịch trình"; CTA của EmptyState là nút thứ hai, chỉ có ở tab Tất cả.
  expect(screen.getAllByRole("button", { name: "Tạo lịch trình" })).toHaveLength(hasCta ? 2 : 1);
});

it("leaves no empty action box in the empty state on the draft tab", async () => {
  h.search.value = "status=draft";
  h.listMine.mockResolvedValue(page([], 1, false));
  setup();
  const heading = await screen.findByRole("heading", { level: 2, name: "Chưa có bản nháp nào" });
  const section = heading.closest("section") as HTMLElement;
  expect(within(section).queryByRole("button")).toBeNull();
  const wrapper = section.lastElementChild as HTMLElement;
  if (wrapper !== heading.parentElement) {
    expect(wrapper.childNodes.length).toBe(0);
    expect(wrapper.className).toContain("empty:hidden");
  }
});

it("opens the create dialog from the header button", async () => {
  const { user } = setup();
  await screen.findByText("Lịch trình 1");
  await user.click(screen.getByRole("button", { name: "Tạo lịch trình" }));
  expect(await screen.findByRole("dialog", { name: "Lịch trình mới" })).toBeTruthy();
});

it("opens the create dialog from the empty state CTA", async () => {
  h.listMine.mockResolvedValue(page([], 1, false));
  const { user } = setup();
  await screen.findByRole("heading", { level: 2, name: "Chưa có lịch trình nào" });
  const buttons = screen.getAllByRole("button", { name: "Tạo lịch trình" });
  await user.click(buttons[1] as HTMLElement);
  expect(await screen.findByRole("dialog", { name: "Lịch trình mới" })).toBeTruthy();
});

it("requests the next page when the sentinel enters the viewport", async () => {
  h.listMine.mockResolvedValueOnce(page([item(1), item(2)], 1, true));
  h.listMine.mockResolvedValueOnce(page([item(3)], 2, false));
  setup();
  await screen.findByText("Lịch trình 2");
  await intersect(true);
  expect(await screen.findByText("Lịch trình 3")).toBeTruthy();
  expect(queriedPages()).toEqual([1, 2]);
});

it("shows 3 skeleton cards and a status while the next page loads", async () => {
  const next = deferred<Page<ItinerarySummary>>();
  h.listMine.mockResolvedValueOnce(page([item(1)], 1, true));
  h.listMine.mockReturnValueOnce(next.promise);
  setup();
  await screen.findByText("Lịch trình 1");
  await intersect(true);
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Đang tải thêm lịch trình…"));
  expect(document.querySelectorAll('[data-slot="itinerary-card-skeleton"]')).toHaveLength(3);
  await act(async () => {
    next.resolve(page([item(2)], 2, false));
  });
  await screen.findByText("Lịch trình 2");
  expect(screen.queryByRole("status")).toBeNull();
});

it("stays silent when the next page fails and retries when the sentinel re-enters (D-02)", async () => {
  h.listMine.mockResolvedValueOnce(page([item(1)], 1, true));
  h.listMine.mockRejectedValueOnce(makeApiError({ kind: "http", status: 500, code: null, message: null }));
  setup();
  await screen.findByText("Lịch trình 1");
  await intersect(true);
  await waitFor(() => expect(queriedPages()).toEqual([1, 2]));
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  // Không nút, không alert, không status; trang 1 vẫn còn.
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByText("Không thể tải nội dung")).toBeNull();
  expect(screen.queryByRole("button", { name: /Thử lại|Tải thêm/ })).toBeNull();
  expect(screen.getByText("Lịch trình 1")).toBeTruthy();
  // Vẫn ở trong viewport: không tự thử lại vòng lặp.
  await act(async () => {
    await Promise.resolve();
  });
  expect(queriedPages()).toEqual([1, 2]);
  // Ra khỏi rồi vào lại viewport thì thử lại.
  h.listMine.mockResolvedValueOnce(page([item(2)], 2, false));
  await intersect(false);
  await intersect(true);
  expect(await screen.findByText("Lịch trình 2")).toBeTruthy();
  expect(queriedPages()).toEqual([1, 2, 2]);
});

it("does not request anything when there is no next page", async () => {
  setup();
  await screen.findByText("Lịch trình 1");
  await intersect(true);
  expect(queriedPages()).toEqual([1]);
});

it("never renders a load-more button", async () => {
  h.listMine.mockResolvedValue(page([item(1)], 1, true));
  setup();
  await screen.findByText("Lịch trình 1");
  expect(screen.queryByRole("button", { name: /tải thêm/i })).toBeNull();
});

it("renders an item that appears on two pages only once", async () => {
  h.listMine.mockResolvedValueOnce(page([item(1), item(2)], 1, true));
  h.listMine.mockResolvedValueOnce(page([item(2), item(3)], 2, false));
  setup();
  await screen.findByText("Lịch trình 2");
  await intersect(true);
  await screen.findByText("Lịch trình 3");
  expect(titles()).toEqual(["Lịch trình 1", "Lịch trình 2", "Lịch trình 3"]);
});

async function deleteCard(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(screen.getByRole("button", { name: `Thao tác cho "${title}"` }));
  await user.click(await screen.findByRole("menuitem", { name: "Xóa" }));
  const dialog = await screen.findByRole("dialog", { name: `Xóa lịch trình "${title}"?` });
  await user.click(within(dialog).getByRole("button", { name: "Xóa" }));
}

it("removes a deleted card and moves focus to the next card's title link", async () => {
  const { user } = setup();
  await screen.findByText("Lịch trình 2");
  await deleteCard(user, "Lịch trình 2");
  await waitFor(() => expect(screen.queryByText("Lịch trình 2")).toBeNull());
  expect(h.remove).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("link", { name: "Lịch trình 3" })));
});

it("moves focus to the previous card when the last card is deleted", async () => {
  const { user } = setup();
  await screen.findByText("Lịch trình 3");
  await deleteCard(user, "Lịch trình 3");
  await waitFor(() => expect(screen.queryByText("Lịch trình 3")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("link", { name: "Lịch trình 2" })));
});

it("moves focus to the empty state CTA when the only card is deleted on the All tab", async () => {
  h.listMine.mockResolvedValue(page([item(1)], 1, false));
  const { user } = setup();
  await screen.findByText("Lịch trình 1");
  await deleteCard(user, "Lịch trình 1");
  const heading = await screen.findByRole("heading", { level: 2, name: "Chưa có lịch trình nào" });
  const cta = within(heading.closest("section") as HTMLElement).getByRole("button", { name: "Tạo lịch trình" });
  await waitFor(() => expect(document.activeElement).toBe(cta));
});

it("moves focus to the header create button when the only card is deleted on another tab", async () => {
  h.search.value = "status=draft";
  h.listMine.mockResolvedValue(page([item(1)], 1, false));
  const { user } = setup();
  await screen.findByText("Lịch trình 1");
  await deleteCard(user, "Lịch trình 1");
  await screen.findByRole("heading", { level: 2, name: "Chưa có bản nháp nào" });
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Tạo lịch trình" })),
  );
});

it("exports a page-level skeleton with a status", () => {
  render(<MyItinerariesSkeleton />);
  expect(screen.getByRole("status").textContent).toBe("Đang tải lịch trình…");
});
