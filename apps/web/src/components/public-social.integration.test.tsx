import type { LikeState } from "@tripory/social";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { PublicItineraryView } from "@/modules/itinerary/ui/public-itinerary-view";
import type { PublicSocialInput } from "@/modules/itinerary/ui/public-social";
import { resetPillFocusTracking } from "@/modules/itinerary/ui/use-pill-focus-handoff";
import { FX_ENGAGEMENT, fxItineraryId, fxOtherId, fxOwnerId, makeFxItinerary } from "@/test/domain-itinerary-fixtures";
import { makeFxComment, makeFxCommentPage } from "@/test/domain-social-fixtures";
import { installFakeIntersectionObserver, type FakeIntersectionObserverHandle } from "@/test/fake-intersection-observer";
import { installFakeResizeObserver, type FakeResizeObserverHandle } from "@/test/fake-resize-observer";
import { makePublicSocial } from "./public-social";

const h = vi.hoisted(() => ({
  query: "",
  getLike: vi.fn(),
  like: vi.fn(),
  unlike: vi.fn(),
  listComments: vi.fn(),
  addComment: vi.fn(),
  removeComment: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(h.query),
  usePathname: () => "/itineraries/3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f",
}));

vi.mock("@/modules/itinerary/ui/map/trip-map.lazy", () => ({
  LazyTripMap: function FakeTripMap(props: { onStatusChange(status: string): void }) {
    useEffect(() => {
      props.onStatusChange("loading");
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- chỉ báo một lần lúc mount, giống TripMap thật
    return <div data-testid="fake-trip-map" />;
  },
}));

vi.mock("@/composition/social.client", async () => {
  const { createSocialHooks } = await import("@tripory/social/react");
  return {
    social: createSocialHooks({
      repository: {
        getLike: (...args: unknown[]) => h.getLike(...args),
        like: (...args: unknown[]) => h.like(...args),
        unlike: (...args: unknown[]) => h.unlike(...args),
        listComments: (...args: unknown[]) => h.listComments(...args),
        addComment: (...args: unknown[]) => h.addComment(...args),
        removeComment: (...args: unknown[]) => h.removeComment(...args),
      },
    }),
  };
});

const originalMatchMedia = window.matchMedia;
const originalScrollIntoView = Element.prototype.scrollIntoView;
let io: FakeIntersectionObserverHandle;
let ro: FakeResizeObserverHandle;
let pushState: ReturnType<typeof vi.spyOn>;

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
  for (const fn of [h.getLike, h.like, h.unlike, h.listComments, h.addComment, h.removeComment]) fn.mockReset();
  h.getLike.mockResolvedValue({ count: 12, liked: false });
  h.like.mockResolvedValue({ count: 13, liked: true });
  h.listComments.mockResolvedValue(makeFxCommentPage([makeFxComment(1), makeFxComment(2)], { totalCount: 3 }));
  resetPillFocusTracking();
  io = installFakeIntersectionObserver();
  ro = installFakeResizeObserver();
  Element.prototype.scrollIntoView = vi.fn();
  pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => undefined);
  installMatchMedia(true);
});

afterEach(() => {
  io.restore();
  ro.restore();
  window.matchMedia = originalMatchMedia;
  Element.prototype.scrollIntoView = originalScrollIntoView;
  vi.restoreAllMocks();
});

const published = makeFxItinerary({ engagement: FX_ENGAGEMENT });

function renderPage(options: Partial<PublicSocialInput> & { itinerary?: typeof published } = {}) {
  const { itinerary = published, ...overrides } = options;
  const composed = makePublicSocial({
    itineraryId: fxItineraryId(),
    ownerId: fxOwnerId(),
    viewerId: fxOtherId(),
    isPublished: itinerary.isPublic,
    engagement: itinerary.engagement ?? null,
    likeSyncNeeded: false,
    ...overrides,
  });
  const client = makeQueryClient();
  const ui = (): ReactNode => (
    <QueryClientProvider client={client}>
      {composed.wrap(
        <PublicItineraryView
          account={<div data-testid="account" />}
          canEdit={false}
          itinerary={itinerary}
          social={composed.slots}
        />,
      )}
    </QueryClientProvider>
  );
  const view = render(ui());
  return { ...view, rerenderPage: () => view.rerender(ui()), user: userEvent.setup() };
}

describe("trang công khai có social", () => {
  it("(a) member, Bài viết: tim trong hero, khối bình luận là con cuối main và tải được", async () => {
    const { container } = renderPage();
    const main = container.querySelector("main#article-content") as HTMLElement;
    const heart = within(main.querySelector("header") as HTMLElement).getByRole("button", { name: "Thích lịch trình" });
    expect(heart.textContent).toContain("12");
    const section = main.querySelector("section#binh-luan");
    expect(main.lastElementChild).toBe(section);
    expect(section?.previousElementSibling?.querySelector("#ngay-1")).not.toBeNull();
    await waitFor(() => expect(within(section as HTMLElement).getAllByRole("article")).toHaveLength(2));
    expect(within(section as HTMLElement).getByLabelText("Viết bình luận")).toBeTruthy();
  });

  it("(b) khách: tim là link, khối bình luận có khung mời thay ô nhập", () => {
    renderPage({ viewerId: null });
    expect(screen.getByRole("link", { name: "Đăng nhập để thích lịch trình" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Đăng nhập để bình luận" })).toBeTruthy();
    expect(screen.queryByLabelText("Viết bình luận")).toBeNull();
  });

  it("(c) Bản đồ: tab Tổng quan có hàng social, tab Ngày không có", async () => {
    h.query = "view=map";
    const { user } = renderPage();
    expect(screen.getByText("3 bình luận")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xem bình luận" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thích lịch trình" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Ngày 1" }));
    expect(screen.queryByRole("button", { name: "Xem bình luận" })).toBeNull();
  });

  it("(d) like ở Tổng quan rồi về Bài viết: hero hiện ngay, không gọi lại BE", async () => {
    h.query = "view=map";
    const { user, rerenderPage, container } = renderPage();
    await user.click(screen.getByRole("button", { name: "Thích lịch trình" }));
    await waitFor(() => expect(h.like).toHaveBeenCalledTimes(1));
    h.query = "";
    rerenderPage();
    const hero = container.querySelector("main#article-content header") as HTMLElement;
    const heart = within(hero).getByRole("button", { name: "Bỏ thích lịch trình" });
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    expect(heart.textContent).toContain("13");
    expect(h.like).toHaveBeenCalledTimes(1);
    expect(h.getLike).not.toHaveBeenCalled();
  });

  it("(e) Xem bình luận đổi về Bài viết một lần", async () => {
    h.query = "view=map";
    const { user } = renderPage();
    await user.click(screen.getByRole("button", { name: "Xem bình luận" }));
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(String(pushState.mock.calls[0]?.[2])).not.toContain("view=map");
  });

  it("(f) bản nháp: không có tim, không có khối bình luận, không gọi BE", async () => {
    const draft = makeFxItinerary({ isPublic: false, engagement: FX_ENGAGEMENT });
    const { container } = renderPage({ itinerary: draft, viewerId: fxOwnerId() });
    expect(screen.queryByRole("button", { name: "Thích lịch trình" })).toBeNull();
    expect(container.querySelector("section#binh-luan")).toBeNull();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    for (const fn of [h.getLike, h.like, h.unlike, h.listComments, h.addComment, h.removeComment]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("(g) likeSyncNeeded: tim khóa tới khi getLike xong", async () => {
    let resolve!: (value: LikeState) => void;
    h.getLike.mockReturnValue(new Promise<LikeState>((res) => (resolve = res)));
    const { container } = renderPage({ likeSyncNeeded: true });
    const hero = container.querySelector("main#article-content header") as HTMLElement;
    const heart = within(hero).getByRole("button", { name: "Thích lịch trình" });
    expect(heart.hasAttribute("disabled") || heart.hasAttribute("data-disabled")).toBe(true);
    await act(async () => resolve({ count: 20, liked: true }));
    await waitFor(() => expect(within(hero).getByRole("button", { name: "Bỏ thích lịch trình" }).textContent).toContain("20"));
  });
});
