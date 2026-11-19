import type { LikeState } from "@tripory/social";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { fxItineraryId, fxOtherId, fxOwnerId } from "@/test/domain-itinerary-fixtures";
import { SocialProvider, useSocialComments, useSocialLike, type SocialProviderProps } from "./social-context";

const h = vi.hoisted(() => ({
  getLike: vi.fn(),
  like: vi.fn(),
  unlike: vi.fn(),
}));

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

const INITIAL: LikeState = { count: 12, liked: false };

function makeWrapper(overrides: Partial<SocialProviderProps> = {}) {
  const client = makeQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SocialProvider
          initialCommentCount={2}
          initialLike={INITIAL}
          itineraryId={fxItineraryId()}
          ownerId={fxOwnerId()}
          syncLike={false}
          viewerId={fxOtherId()}
          {...overrides}
        >
          {children}
        </SocialProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  h.getLike.mockReset().mockResolvedValue(INITIAL);
  h.like.mockReset().mockResolvedValue({ count: 13, liked: true });
  h.unlike.mockReset().mockResolvedValue(INITIAL);
});

describe("ngoài provider", () => {
  it.each([
    ["useSocialLike", useSocialLike],
    ["useSocialComments", useSocialComments],
  ] as const)("%s ném lỗi", (_name, hook) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => hook())).toThrow("SocialProvider");
  });
});

describe("mode", () => {
  it("viewer null là guest ở cả hai context", () => {
    const { result } = renderHook(() => ({ like: useSocialLike(), comments: useSocialComments() }), {
      wrapper: makeWrapper({ viewerId: null }),
    });
    expect(result.current.like.mode).toBe("guest");
    expect(result.current.comments.mode).toBe("guest");
  });

  it("có viewer là member", () => {
    const { result } = renderHook(() => useSocialComments(), { wrapper: makeWrapper() });
    expect(result.current.mode).toBe("member");
  });
});

describe("useSocialLike", () => {
  it("ban đầu bằng initialLike, toggle đổi ngay và gọi like một lần", async () => {
    const { result } = renderHook(() => useSocialLike(), { wrapper: makeWrapper() });
    expect(result.current.state).toEqual(INITIAL);
    act(() => result.current.toggle());
    expect(result.current.state).toEqual({ count: 13, liked: true });
    await waitFor(() => expect(h.like).toHaveBeenCalledTimes(1));
  });

  it("syncLike: syncing tới khi getLike xong, toggle bị khóa", async () => {
    let resolve!: (value: LikeState) => void;
    h.getLike.mockReturnValue(new Promise<LikeState>((res) => (resolve = res)));
    const { result } = renderHook(() => useSocialLike(), { wrapper: makeWrapper({ syncLike: true }) });
    expect(result.current.syncing).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.state).toEqual(INITIAL);
    await act(async () => resolve({ count: 20, liked: true }));
    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(result.current.state).toEqual({ count: 20, liked: true });
  });

  it("hai consumer cùng thấy trạng thái sau một lần toggle (D-03)", () => {
    let toggle: () => void = () => undefined;
    function Hero() {
      const value = useSocialLike();
      toggle = value.toggle;
      return <span data-testid="hero">{value.state.count}</span>;
    }
    function Overview() {
      return <span data-testid="overview">{useSocialLike().state.count}</span>;
    }
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Hero />
        <Overview />
      </Wrapper>,
    );
    act(() => toggle());
    expect(screen.getByTestId("hero").textContent).toBe("13");
    expect(screen.getByTestId("overview").textContent).toBe("13");
  });
});

describe("useSocialComments", () => {
  it("count, adjustCount không âm và requestFocus tăng token", () => {
    const { result } = renderHook(() => useSocialComments(), { wrapper: makeWrapper() });
    expect(result.current.count).toBe(2);
    act(() => result.current.adjustCount(1));
    expect(result.current.count).toBe(3);
    act(() => result.current.adjustCount(-1));
    expect(result.current.count).toBe(2);
    act(() => result.current.adjustCount(-5));
    expect(result.current.count).toBe(0);
    expect(result.current.focusToken).toBe(0);
    act(() => result.current.requestFocus());
    act(() => result.current.requestFocus());
    expect(result.current.focusToken).toBe(2);
  });

  it("đổi số like không làm consumer của bình luận render lại", () => {
    const renders = vi.fn();
    let toggle: () => void = () => undefined;
    function LikeConsumer() {
      toggle = useSocialLike().toggle;
      return null;
    }
    function CommentsConsumer() {
      useSocialComments();
      renders();
      return null;
    }
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <LikeConsumer />
        <CommentsConsumer />
      </Wrapper>,
    );
    const before = renders.mock.calls.length;
    act(() => toggle());
    expect(renders.mock.calls.length).toBe(before);
  });
});
