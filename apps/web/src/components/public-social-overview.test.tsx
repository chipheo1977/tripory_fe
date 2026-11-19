import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { SocialProvider, useSocialComments } from "@/modules/social/ui/social-context";
import { fxItineraryId, fxOtherId, fxOwnerId } from "@/test/domain-itinerary-fixtures";
import { PublicSocialOverview } from "./public-social-overview";

const h = vi.hoisted(() => ({ setView: vi.fn() }));

vi.mock("@/modules/itinerary/ui/use-public-view", () => ({
  usePublicView: () => ({ view: "map", setView: h.setView }),
}));

vi.mock("@/composition/social.client", async () => {
  const { createSocialHooks } = await import("@tripory/social/react");
  const unused = vi.fn();
  return {
    social: createSocialHooks({
      repository: {
        getLike: unused,
        like: unused,
        unlike: unused,
        listComments: unused,
        addComment: unused,
        removeComment: unused,
      },
    }),
  };
});

function FocusTokenProbe() {
  return <span data-testid="token">{useSocialComments().focusToken}</span>;
}

function renderOverview() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SocialProvider
        initialCommentCount={3}
        initialLike={{ count: 12, liked: false }}
        itineraryId={fxItineraryId()}
        ownerId={fxOwnerId()}
        syncLike={false}
        viewerId={fxOtherId()}
      >
        <PublicSocialOverview />
        <FocusTokenProbe />
      </SocialProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  h.setView.mockReset();
});

describe("PublicSocialOverview", () => {
  it("có tim và số bình luận", () => {
    renderOverview();
    expect(screen.getByRole("button", { name: "Thích lịch trình" })).toBeTruthy();
    expect(screen.getByText("3 bình luận")).toBeTruthy();
  });

  it("Xem bình luận đổi về Bài viết và tăng focusToken", async () => {
    renderOverview();
    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: "Xem bình luận" });
    await user.click(button);
    expect(h.setView).toHaveBeenCalledTimes(1);
    expect(h.setView).toHaveBeenCalledWith("article");
    expect(screen.getByTestId("token").textContent).toBe("1");
    await user.click(button);
    expect(h.setView).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("token").textContent).toBe("2");
  });

  it("không tự chuyển focus sang phần tử khác", async () => {
    renderOverview();
    const button = screen.getByRole("button", { name: "Xem bình luận" });
    await userEvent.setup().click(button);
    expect(document.activeElement).toBe(button);
  });
});
