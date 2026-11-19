import { makeApiError } from "@tripory/api-client";
import type { LikeState } from "@tripory/social";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { fxItineraryId, fxOtherId, fxOwnerId } from "@/test/domain-itinerary-fixtures";
import { ConnectedLikeControl } from "./connected-like-control";
import { SocialProvider, type SocialProviderProps } from "./social-context";

const h = vi.hoisted(() => ({ getLike: vi.fn(), like: vi.fn(), unlike: vi.fn() }));

vi.mock("@/composition/social.client", async () => {
  const { createSocialHooks } = await import("@tripory/social/react");
  const unused = vi.fn();
  return {
    social: createSocialHooks({
      repository: {
        getLike: (...args: unknown[]) => h.getLike(...args),
        like: (...args: unknown[]) => h.like(...args),
        unlike: (...args: unknown[]) => h.unlike(...args),
        listComments: unused,
        addComment: unused,
        removeComment: unused,
      },
    }),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/itineraries/abc",
  useSearchParams: () => new URLSearchParams("view=map"),
}));

const INITIAL: LikeState = { count: 12, liked: false };
const networkError = makeApiError({ kind: "network", status: null, code: null, message: null });

function renderWith(children: ReactNode, overrides: Partial<SocialProviderProps> = {}) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <SocialProvider
        initialCommentCount={0}
        initialLike={INITIAL}
        itineraryId={fxItineraryId()}
        ownerId={fxOwnerId()}
        syncLike={false}
        viewerId={fxOtherId()}
        {...overrides}
      >
        {children}
      </SocialProvider>
    </QueryClientProvider>,
  );
}

let notifyError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  h.getLike.mockReset().mockResolvedValue(INITIAL);
  h.like.mockReset().mockResolvedValue({ count: 13, liked: true });
  h.unlike.mockReset().mockResolvedValue(INITIAL);
  notifyError = vi.spyOn(notify, "error").mockImplementation(() => "");
});
afterEach(() => {
  vi.restoreAllMocks();
});

const heart = () => screen.getAllByRole("button")[0] as HTMLElement;

describe("ConnectedLikeControl member", () => {
  it("bấm đổi ngay rồi lấy số của BE", async () => {
    h.like.mockResolvedValue({ count: 15, liked: true });
    renderWith(<ConnectedLikeControl visible />);
    await userEvent.setup().click(heart());
    await waitFor(() => expect(heart().textContent).toContain("15"));
    expect(heart().getAttribute("aria-pressed")).toBe("true");
    expect(h.like).toHaveBeenCalledTimes(1);
  });

  it("đổi ngay trước khi BE trả lời", async () => {
    h.like.mockReturnValue(new Promise(() => undefined));
    renderWith(<ConnectedLikeControl visible />);
    await userEvent.setup().click(heart());
    expect(heart().textContent).toContain("13");
    expect(heart().getAttribute("aria-pressed")).toBe("true");
  });

  it("lỗi mạng thì quay về số cũ và toast câu fallback", async () => {
    h.like.mockRejectedValue(networkError);
    renderWith(<ConnectedLikeControl visible />);
    await userEvent.setup().click(heart());
    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifyError).toHaveBeenCalledWith("Chưa cập nhật được lượt thích. Kiểm tra kết nối mạng rồi thử lại.");
    await waitFor(() => expect(heart().textContent).toContain("12"));
    expect(heart().getAttribute("aria-pressed")).toBe("false");
  });

  it("Social.DraftForbidden toast câu chưa xuất bản", async () => {
    h.like.mockRejectedValue(makeApiError({ kind: "http", status: 403, code: "Social.DraftForbidden", message: null }));
    renderWith(<ConnectedLikeControl visible />);
    await userEvent.setup().click(heart());
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("Lịch trình này chưa được xuất bản."));
  });

  it("bấm 3 lần: gửi like, unlike, like theo thứ tự, nút không bị khóa", async () => {
    const order: string[] = [];
    h.like.mockImplementation(async () => {
      order.push("like");
      return { count: 13, liked: true };
    });
    h.unlike.mockImplementation(async () => {
      order.push("unlike");
      return INITIAL;
    });
    renderWith(<ConnectedLikeControl visible />);
    const user = userEvent.setup();
    await user.click(heart());
    expect(heart().hasAttribute("disabled")).toBe(false);
    await user.click(heart());
    await user.click(heart());
    expect(heart().getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(order).toEqual(["like", "unlike", "like"]));
    await waitFor(() => expect(heart().textContent).toContain("13"));
  });

  it("hai bản (hero và Tổng quan) cùng trạng thái", async () => {
    renderWith(
      <>
        <ConnectedLikeControl visible />
        <ConnectedLikeControl visible />
      </>,
    );
    const [hero, overview] = screen.getAllByRole("button") as HTMLElement[];
    await userEvent.setup().click(hero as HTMLElement);
    expect(overview?.textContent).toContain("13");
    expect(overview?.getAttribute("aria-pressed")).toBe("true");
  });

  it("syncLike: khóa và aria-busy tới khi getLike xong", async () => {
    let resolve!: (value: LikeState) => void;
    h.getLike.mockReturnValue(new Promise<LikeState>((res) => (resolve = res)));
    renderWith(<ConnectedLikeControl visible />, { syncLike: true });
    expect(heart().hasAttribute("disabled") || heart().hasAttribute("data-disabled")).toBe(true);
    expect(heart().getAttribute("aria-busy")).toBe("true");
    await act(async () => resolve({ count: 20, liked: true }));
    await waitFor(() => expect(heart().getAttribute("aria-busy")).toBeNull());
    expect(heart().textContent).toContain("20");
  });

  it("syncLike lỗi thì bật lại với số SSR, không toast", async () => {
    h.getLike.mockRejectedValue(networkError);
    renderWith(<ConnectedLikeControl visible />, { syncLike: true });
    await waitFor(() => expect(heart().getAttribute("aria-busy")).toBeNull());
    expect(heart().textContent).toContain("12");
    expect(notifyError).not.toHaveBeenCalled();
  });
});

describe("ConnectedLikeControl guest", () => {
  it("link giữ ?view, bấm không gọi repository", async () => {
    renderWith(<ConnectedLikeControl visible />, { viewerId: null });
    const link = screen.getByRole("link", { name: "Đăng nhập để thích lịch trình" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent("/itineraries/abc?view=map")}`);
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.setup().click(link);
    expect(h.like).not.toHaveBeenCalled();
    expect(h.unlike).not.toHaveBeenCalled();
  });
});

describe("ConnectedLikeControl visible", () => {
  it("false không render", () => {
    renderWith(<ConnectedLikeControl visible={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
