import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FX_AUTHOR, FX_ITINERARY_ID, makeFxItinerary } from "@/test/domain-itinerary-fixtures";
import { installFakeIntersectionObserver, type FakeIntersectionObserverHandle } from "@/test/fake-intersection-observer";
import { installFakeResizeObserver, type FakeResizeObserverHandle } from "@/test/fake-resize-observer";
import type { MapStatus } from "./map/trip-map";
import { PublicItineraryView, type PublicItineraryViewProps } from "./public-itinerary-view";
import { resetPillFocusTracking } from "./use-pill-focus-handoff";

const h = vi.hoisted(() => ({ query: "", props: null as Record<string, unknown> | null }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(h.query),
  usePathname: () => `/itineraries/3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f`,
}));

vi.mock("./map/trip-map.lazy", () => ({
  LazyTripMap: function FakeTripMap(props: Record<string, unknown> & { onStatusChange(status: string): void }) {
    h.props = props;
    useEffect(() => {
      props.onStatusChange("loading");
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- chỉ báo một lần lúc mount, giống TripMap thật
    return <div data-testid="fake-trip-map" />;
  },
}));

const originalMatchMedia = window.matchMedia;
const originalScrollIntoView = Element.prototype.scrollIntoView;
let io: FakeIntersectionObserverHandle;
let ro: FakeResizeObserverHandle;
let pushState: ReturnType<typeof vi.spyOn>;
const PATH = `/itineraries/${FX_ITINERARY_ID}`;

function installMatchMedia(wide: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: wide && query.includes("min-width"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => {
  h.query = "";
  h.props = null;
  resetPillFocusTracking();
  io = installFakeIntersectionObserver();
  ro = installFakeResizeObserver();
  Element.prototype.scrollIntoView = vi.fn();
  pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => undefined);
});

afterEach(() => {
  io.restore();
  ro.restore();
  window.matchMedia = originalMatchMedia;
  Element.prototype.scrollIntoView = originalScrollIntoView;
  vi.restoreAllMocks();
});

const setup = (overrides: Partial<PublicItineraryViewProps> = {}, wide = true) => {
  installMatchMedia(wide);
  const props: PublicItineraryViewProps = {
    itinerary: makeFxItinerary(),
    canEdit: false,
    account: <div data-testid="account" />,
    ...overrides,
  };
  const view = render(<PublicItineraryView {...props} />);
  return { ...view, props, user: userEvent.setup() };
};

const pills = () => screen.queryAllByRole("group", { name: "Chế độ xem" });
// `ArticleHero` cũng là một `<header>` (trong `main`); header của trang là cái đầu tiên trong tài liệu.
const siteHeader = () => document.querySelector("header") as HTMLElement;
const reportMap = (status: MapStatus) => act(() => (h.props?.onStatusChange as (s: MapStatus) => void)(status));

describe("article mode", () => {
  it("renders the article, the account slot and the skip link; no map is mounted", () => {
    const { container } = setup();

    expect(container.querySelector("main#article-content")).not.toBeNull();
    expect(container.querySelector("main#map-content")).toBeNull();
    expect(screen.queryByTestId("fake-trip-map")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("account")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bỏ qua đến nội dung chính" }).getAttribute("href")).toBe("#article-content");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("has exactly one pill: in the header from lg", () => {
    setup();

    expect(pills()).toHaveLength(1);
    expect(siteHeader().contains(pills()[0] as HTMLElement)).toBe(true);
  });

  it("has exactly one pill: floating at the bottom below lg", () => {
    setup({}, false);

    expect(pills()).toHaveLength(1);
    const wrapper = (pills()[0] as HTMLElement).closest(".fixed") as HTMLElement;
    expect(wrapper.className).toContain("bottom-0");
    expect(wrapper.className).toContain("pointer-events-none");
    expect(siteHeader().contains(pills()[0] as HTMLElement)).toBe(false);
  });

  it("switches to the map with a single history entry", async () => {
    const { user } = setup();

    await user.click(within(pills()[0] as HTMLElement).getByRole("button", { name: "Bản đồ" }));

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(null, "", `${PATH}?view=map`);
  });
});

describe("map mode", () => {
  beforeEach(() => {
    h.query = "view=map";
  });

  it("mounts the map main, keeps the article hidden in the DOM and retargets the skip link", () => {
    const { container } = setup();

    expect(container.querySelector("main#map-content")).not.toBeNull();
    expect(screen.getByTestId("fake-trip-map")).toBeTruthy();
    const article = container.querySelector("main#article-content") as HTMLElement;
    expect(article.closest("[hidden]")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Bỏ qua đến nội dung chính" }).getAttribute("href")).toBe("#map-content");
    expect((container.firstElementChild as HTMLElement).className).toContain("lg:h-dvh");
    expect(pills()).toHaveLength(1);
  });

  it("puts the single pill inside the sheet below lg", async () => {
    setup({}, false);

    const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
    expect(pills()).toHaveLength(1);
    expect(sheet.contains(pills()[0] as HTMLElement)).toBe(true);
  });

  it("goes back to the article without a query", async () => {
    const { user } = setup();

    await user.click(within(pills()[0] as HTMLElement).getByRole("button", { name: "Bài viết" }));

    expect(pushState).toHaveBeenCalledWith(null, "", PATH);
  });

  it("'Xem dạng bài viết' returns to the article and focuses the selected segment of the pill", async () => {
    const view = setup();
    reportMap("error");

    await view.user.click(screen.getByRole("button", { name: "Xem dạng bài viết" }));
    expect(pushState).toHaveBeenCalledWith(null, "", PATH);

    h.query = "";
    view.rerender(<PublicItineraryView {...view.props} />);

    await waitFor(() => {
      const active = document.activeElement as HTMLElement;
      expect(active.closest("[data-view-mode-toggle]")).not.toBeNull();
      expect(active.getAttribute("aria-pressed")).toBe("true");
      expect(active.textContent).toBe("Bài viết");
    });
  });
});

describe("roles in the header", () => {
  it("a visitor of a published itinerary sees Chia sẻ but not Sửa nor the draft strip", () => {
    setup();

    expect(screen.getByRole("button", { name: "Chia sẻ lịch trình" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Sửa lịch trình" })).toBeNull();
    expect(screen.queryByText("Bản nháp – chỉ bạn thấy")).toBeNull();
  });

  it("the owner of a published itinerary sees both Sửa and Chia sẻ", () => {
    setup({ canEdit: true });

    expect(screen.getByRole("link", { name: "Sửa lịch trình" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Chia sẻ lịch trình" })).toBeTruthy();
    expect(screen.queryByText("Bản nháp – chỉ bạn thấy")).toBeNull();
  });

  it("the owner of a draft sees the draft strip with one Sửa link and no Chia sẻ", () => {
    setup({ canEdit: true, itinerary: makeFxItinerary({ isPublic: false }) });

    expect(screen.getByText("Bản nháp – chỉ bạn thấy")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Sửa lịch trình" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Chia sẻ lịch trình" })).toBeNull();
  });

  it("someone who is not the owner never gets Sửa nor Chia sẻ on a draft", () => {
    setup({ canEdit: false, itinerary: makeFxItinerary({ isPublic: false }) });

    expect(screen.queryByRole("link", { name: "Sửa lịch trình" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Chia sẻ lịch trình" })).toBeNull();
    expect(screen.queryByText("Bản nháp – chỉ bạn thấy")).toBeNull();
  });

  it("shows the author line with the owner badge for the owner", () => {
    setup({ canEdit: true, itinerary: makeFxItinerary({ author: FX_AUTHOR }) });

    expect(screen.getByText("Trần Thị Lan")).toBeTruthy();
    expect(screen.getByText("Lịch trình của bạn")).toBeTruthy();
  });
});

describe("share dialog", () => {
  it("opens from the Chia sẻ button with the public url, no view param and no 'Mở trang công khai' link", async () => {
    const { user } = setup();
    h.query = "view=map";

    await user.click(screen.getByRole("button", { name: "Chia sẻ lịch trình" }));

    const dialog = await screen.findByRole("dialog", { name: "Chia sẻ lịch trình" });
    const input = within(dialog).getByLabelText("Link lịch trình") as HTMLInputElement;
    expect(input.value).toBe(`${window.location.origin}${PATH}`);
    expect(input.value).not.toContain("?");
    expect(within(dialog).queryByRole("link", { name: /Mở trang công khai/ })).toBeNull();
  });
});

describe("safety", () => {
  it("never renders raw html from the itinerary", () => {
    const { container } = setup({ itinerary: makeFxItinerary({ title: "<img src=x onerror=alert(1)>" }) });

    expect(container.querySelector("img[onerror]")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("PublicItineraryView social slots (05.1)", () => {
  const social = {
    hero: <div data-testid="slot-hero" />,
    comments: <section data-testid="slot-comments" />,
    overview: <div data-testid="slot-overview" />,
  };

  it("không truyền social thì không có slot nào", () => {
    setup();
    expect(screen.queryByTestId("slot-hero")).toBeNull();
    expect(screen.queryByTestId("slot-comments")).toBeNull();
  });

  it("bài viết: hero trong hero, comments là con cuối main, không có overview", () => {
    const { container } = setup({ social });
    const main = container.querySelector("main#article-content");
    expect(main?.querySelector("header")?.contains(screen.getByTestId("slot-hero"))).toBe(true);
    expect(main?.lastElementChild).toBe(screen.getByTestId("slot-comments"));
    expect(screen.queryByTestId("slot-overview")).toBeNull();
  });

  it("chế độ Bản đồ: overview có ở tab Tổng quan", () => {
    h.query = "view=map";
    setup({ social });
    expect(screen.getByTestId("slot-overview")).toBeTruthy();
  });
});
