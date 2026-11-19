import type { UserId } from "@tripory/shared-kernel";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { fxItineraryId, fxOtherId, fxOwnerId } from "@/test/domain-itinerary-fixtures";
import { ConnectedLikeControl } from "./connected-like-control";
import { OverviewSocialRow } from "./overview-social-row";
import { SocialProvider, useSocialComments } from "./social-context";

const h = vi.hoisted(() => ({ like: vi.fn() }));

vi.mock("@/composition/social.client", async () => {
  const { createSocialHooks } = await import("@tripory/social/react");
  const unused = vi.fn();
  return {
    social: createSocialHooks({
      repository: {
        getLike: unused,
        like: (...args: unknown[]) => h.like(...args),
        unlike: unused,
        listComments: unused,
        addComment: unused,
        removeComment: unused,
      },
    }),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/itineraries/abc",
  useSearchParams: () => new URLSearchParams(""),
}));

function renderRow(children: ReactNode, options: { viewerId?: UserId | null; count?: number } = {}) {
  const { viewerId = fxOtherId(), count = 3 } = options;
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SocialProvider
        initialCommentCount={count}
        initialLike={{ count: 12, liked: false }}
        itineraryId={fxItineraryId()}
        ownerId={fxOwnerId()}
        syncLike={false}
        viewerId={viewerId}
      >
        {children}
      </SocialProvider>
    </QueryClientProvider>,
  );
}

function AddComment() {
  const { adjustCount } = useSocialComments();
  return (
    <button onClick={() => adjustCount(1)} type="button">
      Thêm
    </button>
  );
}

beforeEach(() => {
  h.like.mockReset().mockReturnValue(new Promise(() => undefined));
});

describe("OverviewSocialRow", () => {
  it("member: tim, số bình luận, Xem bình luận", () => {
    const { container } = renderRow(<OverviewSocialRow onViewComments={() => undefined} visible />);
    expect(screen.getByRole("button", { name: "Thích lịch trình" })).toBeTruthy();
    expect(screen.getByText("3 bình luận")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xem bình luận" }).getAttribute("type")).toBe("button");
    const root = container.querySelector("div.flex-wrap") as HTMLElement;
    expect(root.className).toContain("gap-inline-sm");
  });

  it.each([
    [0, "0 bình luận"],
    [1234, "1.234 bình luận"],
  ])("count %d hiện %s", (count, text) => {
    renderRow(<OverviewSocialRow onViewComments={() => undefined} visible />, { count });
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("Xem bình luận gọi onViewComments một lần", async () => {
    const onViewComments = vi.fn();
    renderRow(<OverviewSocialRow onViewComments={onViewComments} visible />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Xem bình luận" }));
    expect(onViewComments).toHaveBeenCalledTimes(1);
  });

  it("khách: tim là link đăng nhập, vẫn có Xem bình luận", () => {
    renderRow(<OverviewSocialRow onViewComments={() => undefined} visible />, { viewerId: null });
    expect(screen.getByRole("link", { name: "Đăng nhập để thích lịch trình" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xem bình luận" })).toBeTruthy();
  });

  it("bấm tim ở hàng đổi luôn nút tim ở hero (D-03)", async () => {
    renderRow(
      <>
        <ConnectedLikeControl visible />
        <OverviewSocialRow onViewComments={() => undefined} visible />
      </>,
    );
    const [hero, row] = screen.getAllByRole("button", { name: "Thích lịch trình" }) as HTMLElement[];
    await userEvent.setup().click(row as HTMLElement);
    expect(hero?.textContent).toContain("13");
    expect(hero?.getAttribute("aria-pressed")).toBe("true");
  });

  it("số bình luận đổi khi adjustCount", async () => {
    renderRow(
      <>
        <AddComment />
        <OverviewSocialRow onViewComments={() => undefined} visible />
      </>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Thêm" }));
    expect(screen.getByText("4 bình luận")).toBeTruthy();
  });

  it("visible false không render gì", () => {
    renderRow(<OverviewSocialRow onViewComments={() => undefined} visible={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
