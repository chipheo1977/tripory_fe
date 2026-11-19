import { makeApiError } from "@tripory/api-client";
import type { CommentPage } from "@tripory/social";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { fxItineraryId, fxOtherId, fxOwnerId } from "@/test/domain-itinerary-fixtures";
import { fxCommentId, makeFxComment, makeFxCommentPage } from "@/test/domain-social-fixtures";
import { SocialProvider } from "./social-context";
import { useCommentSection } from "./use-comment-section";

const h = vi.hoisted(() => ({ listComments: vi.fn(), addComment: vi.fn(), removeComment: vi.fn() }));

vi.mock("@/composition/social.client", async () => {
  const { createSocialHooks } = await import("@tripory/social/react");
  const unused = vi.fn();
  return {
    social: createSocialHooks({
      repository: {
        getLike: unused,
        like: unused,
        unlike: unused,
        listComments: (...args: unknown[]) => h.listComments(...args),
        addComment: (...args: unknown[]) => h.addComment(...args),
        removeComment: (...args: unknown[]) => h.removeComment(...args),
      },
    }),
  };
});

const http = (status: number, code: string | null) => makeApiError({ kind: "http", status, code, message: null });
const networkError = makeApiError({ kind: "network", status: null, code: null, message: null });

function setup(viewerId = fxOtherId(), initialCommentCount = 3) {
  const client = makeQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SocialProvider
        initialCommentCount={initialCommentCount}
        initialLike={{ count: 0, liked: false }}
        itineraryId={fxItineraryId()}
        ownerId={fxOwnerId()}
        syncLike={false}
        viewerId={viewerId}
      >
        {children}
      </SocialProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useCommentSection(), { wrapper });
}

let notifyError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  h.listComments.mockReset().mockResolvedValue(makeFxCommentPage([makeFxComment(1), makeFxComment(2), makeFxComment(3)]));
  h.addComment.mockReset().mockResolvedValue(makeFxComment(9));
  h.removeComment.mockReset().mockResolvedValue("removed");
  notifyError = vi.spyOn(notify, "error").mockImplementation(() => "");
});
afterEach(() => {
  vi.restoreAllMocks();
});

const flags = (view: ReturnType<typeof useCommentSection>["view"]) => ({
  showSkeleton: view.showSkeleton,
  showLoadError: view.showLoadError,
  showEmpty: view.showEmpty,
  showList: view.showList,
  showLoadMore: view.showLoadMore,
  showLoadMoreError: view.showLoadMoreError,
});
const NONE = {
  showSkeleton: false,
  showLoadError: false,
  showEmpty: false,
  showList: false,
  showLoadMore: false,
  showLoadMoreError: false,
};

describe("useCommentSection: view", () => {
  it("loading chỉ có skeleton, rồi có danh sách", async () => {
    const { result } = setup();
    expect(flags(result.current.view)).toEqual({ ...NONE, showSkeleton: true });
    expect(result.current.view.heading).toBe("Bình luận (3)");
    expect(result.current.view.now).toBeNull();
    await waitFor(() => expect(flags(result.current.view)).toEqual({ ...NONE, showList: true }));
    expect(result.current.list.entries).toHaveLength(3);
    expect(typeof result.current.view.now).toBe("number");
  });

  it("lỗi trang đầu chỉ có showLoadError", async () => {
    h.listComments.mockRejectedValue(networkError);
    const { result } = setup();
    await waitFor(() => expect(flags(result.current.view)).toEqual({ ...NONE, showLoadError: true }));
  });

  it("rỗng chỉ có showEmpty", async () => {
    h.listComments.mockResolvedValue(makeFxCommentPage([]));
    const { result } = setup();
    await waitFor(() => expect(flags(result.current.view)).toEqual({ ...NONE, showEmpty: true }));
  });

  it("còn trang thì showLoadMore; lỗi trang kế thì showLoadMoreError", async () => {
    const ten = Array.from({ length: 10 }, (_, index) => makeFxComment(index + 1));
    h.listComments.mockImplementation(async (_id: unknown, { pageIndex }: { pageIndex: number }) => {
      if (pageIndex === 1) return makeFxCommentPage(ten, { totalCount: 11, hasNextPage: true });
      throw networkError;
    });
    const { result } = setup();
    await waitFor(() => expect(flags(result.current.view)).toEqual({ ...NONE, showList: true, showLoadMore: true }));
    act(() => result.current.list.loadMore());
    await waitFor(() => expect(flags(result.current.view)).toEqual({ ...NONE, showList: true, showLoadMoreError: true }));
  });

  it("khách có mode guest", () => {
    const { result } = setup(null as never);
    expect(result.current.view.mode).toBe("guest");
  });
});

describe("useCommentSection: gửi", () => {
  it.each([
    ["   ", "Vui lòng nhập nội dung bình luận."],
    ["a".repeat(501), "Bình luận tối đa 500 ký tự."],
  ])("luật FE %j trả field-error", async (raw, message) => {
    const { result } = setup();
    await expect(result.current.composer.submit(raw)).resolves.toEqual({ kind: "field-error", message });
    expect(h.addComment).not.toHaveBeenCalled();
  });

  it("thành công thì sent và tiêu đề +1", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.view.showList).toBe(true));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.composer.submit("Đẹp quá!");
    });
    expect(outcome).toEqual({ kind: "sent" });
    expect(result.current.view.heading).toBe("Bình luận (4)");
    expect(notifyError).not.toHaveBeenCalled();
  });

  it.each([
    ["Comment.ContentTooLong", "Bình luận tối đa 500 ký tự."],
    ["Comment.ContentRequired", "Vui lòng nhập nội dung bình luận."],
  ])("BE trả %s thì field-error, không toast", async (code, message) => {
    h.addComment.mockRejectedValue(http(400, code));
    const { result } = setup();
    await expect(result.current.composer.submit("x")).resolves.toEqual({ kind: "field-error", message });
    expect(notifyError).not.toHaveBeenCalled();
  });

  it.each([
    ["429", http(429, "RateLimit.TooManyRequests"), "Bạn thao tác quá nhanh. Vui lòng thử lại sau."],
    ["mạng", networkError, "Chưa gửi được bình luận. Nội dung vẫn còn, hãy thử gửi lại."],
    ["nháp", http(403, "Social.DraftForbidden"), "Lịch trình này chưa được xuất bản."],
  ])("lỗi %s thì failed và toast đúng câu", async (_name, error, message) => {
    h.addComment.mockRejectedValue(error);
    const { result } = setup();
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.composer.submit("x");
    });
    expect(outcome).toEqual({ kind: "failed" });
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledWith(message);
    expect(result.current.view.heading).toBe("Bình luận (3)");
  });
});

describe("useCommentSection: xóa", () => {
  it("mở và đóng hộp", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.view.showList).toBe(true));
    act(() => result.current.list.requestDelete(fxCommentId(2)));
    expect(result.current.dialog.open).toBe(true);
    act(() => result.current.dialog.onOpenChange(false));
    expect(result.current.dialog.open).toBe(false);
  });

  it.each(["removed", "already-removed"] as const)("%s: đóng hộp, giảm số, thông báo, gỡ khỏi danh sách", async (outcome) => {
    h.removeComment.mockResolvedValue(outcome);
    const { result } = setup();
    await waitFor(() => expect(result.current.view.showList).toBe(true));
    act(() => result.current.list.requestDelete(fxCommentId(2)));
    act(() => result.current.dialog.confirm());
    await waitFor(() => expect(result.current.dialog.open).toBe(false));
    expect(result.current.view.heading).toBe("Bình luận (2)");
    expect(result.current.view.announcement).toBe("Đã xóa bình luận");
    await waitFor(() => expect(result.current.list.entries.map((entry) => entry.id)).toEqual([fxCommentId(1), fxCommentId(3)]));
  });

  it.each([
    ["403", http(403, "Comment.DeleteForbidden"), "Bạn không có quyền xóa bình luận này."],
    ["mạng", networkError, "Chưa xóa được bình luận. Kiểm tra kết nối mạng rồi thử lại."],
  ])("lỗi %s: đóng hộp, toast, giữ danh sách và số", async (_name, error, message) => {
    h.removeComment.mockRejectedValue(error);
    const { result } = setup();
    await waitFor(() => expect(result.current.view.showList).toBe(true));
    act(() => result.current.list.requestDelete(fxCommentId(2)));
    act(() => result.current.dialog.confirm());
    await waitFor(() => expect(result.current.dialog.open).toBe(false));
    expect(notifyError).toHaveBeenCalledWith(message);
    expect(result.current.list.entries).toHaveLength(3);
    expect(result.current.view.heading).toBe("Bình luận (3)");
  });

  it("đang xóa: pending, không gửi lần hai, không đóng được", async () => {
    let resolve!: (value: "removed") => void;
    h.removeComment.mockReturnValue(new Promise((res) => (resolve = res)));
    const { result } = setup();
    await waitFor(() => expect(result.current.view.showList).toBe(true));
    act(() => result.current.list.requestDelete(fxCommentId(2)));
    act(() => result.current.dialog.confirm());
    await waitFor(() => expect(result.current.dialog.pending).toBe(true));
    act(() => result.current.dialog.confirm());
    act(() => result.current.dialog.onOpenChange(false));
    expect(result.current.dialog.open).toBe(true);
    expect(h.removeComment).toHaveBeenCalledTimes(1);
    await act(async () => resolve("removed"));
    await waitFor(() => expect(result.current.dialog.open).toBe(false));
  });
});

describe("useCommentSection: quyền", () => {
  it("chủ xóa được mọi bình luận, người khác chỉ của mình", async () => {
    const owner = setup(fxOwnerId());
    await waitFor(() => expect(owner.result.current.view.showList).toBe(true));
    expect(owner.result.current.list.entries.every((entry) => entry.canDelete)).toBe(true);
    const author = setup(fxOtherId());
    await waitFor(() => expect(author.result.current.view.showList).toBe(true));
    expect(author.result.current.list.entries.every((entry) => entry.canDelete)).toBe(true);
  });

  it("khách không xóa được", async () => {
    const { result } = setup(null as never);
    await waitFor(() => expect(result.current.view.showList).toBe(true));
    expect(result.current.list.entries.some((entry) => entry.canDelete)).toBe(false);
  });
});

describe("useCommentSection: tải lại trang đầu", () => {
  it("retryFirstPage gọi lại listComments", async () => {
    h.listComments.mockRejectedValueOnce(networkError);
    const { result } = setup();
    await waitFor(() => expect(result.current.view.showLoadError).toBe(true));
    act(() => result.current.list.retryFirstPage());
    await waitFor(() => expect(result.current.view.showList).toBe(true));
    const pages = h.listComments.mock.calls.map((call) => (call[1] as Pick<CommentPage, "pageIndex">).pageIndex);
    expect(pages).toEqual([1, 1]);
  });
});
