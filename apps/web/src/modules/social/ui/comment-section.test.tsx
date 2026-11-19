import { makeApiError } from "@tripory/api-client";
import type { UserId } from "@tripory/shared-kernel";
import { parseUserId } from "@tripory/shared-kernel";
import type { Comment } from "@tripory/social";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { fxItineraryId, fxOtherId, fxOwnerId } from "@/test/domain-itinerary-fixtures";
import { makeFxComment, makeFxCommentPage } from "@/test/domain-social-fixtures";
import { CommentSection } from "./comment-section";
import { SocialProvider, useSocialComments } from "./social-context";

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

vi.mock("next/navigation", () => ({
  usePathname: () => "/itineraries/abc",
  useSearchParams: () => new URLSearchParams(""),
}));

const THIRD = parseUserId("11111111-1111-4111-8111-111111111111") as UserId;
const networkError = makeApiError({ kind: "network", status: null, code: null, message: null });
const http = (status: number, code: string) => makeApiError({ kind: "http", status, code, message: null });

function FocusTrigger() {
  const { requestFocus } = useSocialComments();
  return (
    <button data-testid="xem-binh-luan" onClick={requestFocus} type="button">
      Xem
    </button>
  );
}

function renderSection(options: { viewerId?: UserId | null; count?: number; wrapHidden?: boolean; children?: ReactNode } = {}) {
  const { viewerId = fxOtherId(), count = 3 } = options;
  const client = makeQueryClient();
  const user = userEvent.setup();
  const ui = (hidden: boolean) => (
    <QueryClientProvider client={client}>
      <SocialProvider
        initialCommentCount={count}
        initialLike={{ count: 0, liked: false }}
        itineraryId={fxItineraryId()}
        ownerId={fxOwnerId()}
        syncLike={false}
        viewerId={viewerId}
      >
        <FocusTrigger />
        <div hidden={hidden}>
          <CommentSection visible />
        </div>
      </SocialProvider>
    </QueryClientProvider>
  );
  const view = render(ui(options.wrapHidden ?? false));
  return { ...view, user, show: () => view.rerender(ui(false)) };
}

const commentsOf = (items: Comment[]) => makeFxCommentPage(items, { totalCount: items.length });
const three = () => [makeFxComment(1), makeFxComment(2), makeFxComment(3)];
const articleIds = () => screen.queryAllByRole("article").map((article) => article.id);

let notifyError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  h.listComments.mockReset().mockResolvedValue(commentsOf(three()));
  h.addComment.mockReset();
  h.removeComment.mockReset().mockResolvedValue("removed");
  notifyError = vi.spyOn(notify, "error").mockImplementation(() => "");
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("CommentSection: hiển thị", () => {
  it("visible false không render và không tải", () => {
    const client = makeQueryClient();
    const { container } = render(
      <QueryClientProvider client={client}>
        <SocialProvider
          initialCommentCount={0}
          initialLike={{ count: 0, liked: false }}
          itineraryId={fxItineraryId()}
          ownerId={fxOwnerId()}
          syncLike={false}
          viewerId={null}
        >
          <CommentSection visible={false} />
        </SocialProvider>
      </QueryClientProvider>,
    );
    expect(container.innerHTML).toBe("");
    expect(h.listComments).not.toHaveBeenCalled();
  });

  it("member có h2, ô nhập, không khung khách; đúng một h2", async () => {
    renderSection();
    expect(screen.getByRole("heading", { level: 2, name: "Bình luận (3)" })).toBeTruthy();
    expect(screen.getByLabelText("Viết bình luận")).toBeTruthy();
    expect(screen.queryByText("Đăng nhập để viết bình luận về lịch trình này.")).toBeNull();
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
  });

  it("khách có khung mời, không ô nhập, vẫn đọc được danh sách", async () => {
    renderSection({ viewerId: null });
    expect(screen.getByText("Đăng nhập để viết bình luận về lịch trình này.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Đăng nhập để bình luận" })).toBeTruthy();
    expect(screen.queryByLabelText("Viết bình luận")).toBeNull();
    await waitFor(() => expect(articleIds()).toHaveLength(3));
  });

  it("đang tải có skeleton và ô nhập vẫn hiện", () => {
    h.listComments.mockReturnValue(new Promise(() => undefined));
    renderSection();
    expect(screen.getByRole("status").textContent).toBe("Đang tải bình luận…");
    expect(screen.getByLabelText("Viết bình luận")).toBeTruthy();
  });

  it.each([
    [fxOtherId(), "Hãy là người đầu tiên chia sẻ cảm nhận về lịch trình này."],
    [null, "Đăng nhập để là người đầu tiên bình luận."],
  ])("rỗng theo mode (%s)", async (viewerId, body) => {
    h.listComments.mockResolvedValue(commentsOf([]));
    renderSection({ viewerId, count: 0 });
    await waitFor(() => expect(screen.getByText("Chưa có bình luận nào")).toBeTruthy());
    expect(screen.getByText(body)).toBeTruthy();
  });

  it("lỗi trang đầu: Thử lại tải lại và focus h2, ô nhập vẫn dùng được", async () => {
    h.listComments.mockRejectedValueOnce(networkError);
    const { user } = renderSection();
    const retry = await screen.findByRole("button", { name: "Tải lại bình luận" });
    expect(screen.getByText("Không tải được bình luận")).toBeTruthy();
    await user.type(screen.getByLabelText("Viết bình luận"), "x");
    await user.click(retry);
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
  });

  it("nội dung có script và b hiện nguyên chữ", async () => {
    h.listComments.mockResolvedValue(commentsOf([makeFxComment(1, { content: "<script>x</script><b>y</b>" })]));
    const { container } = renderSection();
    await waitFor(() => expect(screen.getByText("<script>x</script><b>y</b>")).toBeTruthy());
    expect(container.querySelector("article script, article b")).toBeNull();
  });
});

describe("CommentSection: phân trang", () => {
  const all = Array.from({ length: 20 }, (_, index) => makeFxComment(index + 1));
  const paged = (failNext: { value: boolean }) =>
    vi.fn(async (_id: unknown, { pageIndex }: { pageIndex: number }) => {
      if (pageIndex > 1 && failNext.value) throw networkError;
      const items = all.slice((pageIndex - 1) * 10, pageIndex * 10);
      return makeFxCommentPage(items, { pageIndex, totalCount: 20, hasNextPage: pageIndex * 10 < 20 });
    });

  it("Xem thêm nối trang, focus comment đầu vừa nối, ẩn khi hết", async () => {
    h.listComments.mockImplementation(paged({ value: false }));
    const { user } = renderSection({ count: 20 });
    const more = await screen.findByRole("button", { name: "Xem thêm bình luận" });
    await user.click(more);
    await waitFor(() => expect(articleIds()).toHaveLength(20));
    expect(new Set(articleIds()).size).toBe(20);
    await waitFor(() => expect(document.activeElement?.id).toBe(`binh-luan-${all[10]?.id}`));
    expect(screen.queryByRole("button", { name: "Xem thêm bình luận" })).toBeNull();
  });

  it("lỗi trang kế giữ danh sách, focus Thử tải thêm, thử lại thành công", async () => {
    const failNext = { value: true };
    h.listComments.mockImplementation(paged(failNext));
    const { user } = renderSection({ count: 20 });
    await user.click(await screen.findByRole("button", { name: "Xem thêm bình luận" }));
    const retry = await screen.findByRole("button", { name: "Thử tải thêm bình luận" });
    expect(screen.getByText("Không tải thêm được bình luận.")).toBeTruthy();
    expect(articleIds()).toHaveLength(10);
    await waitFor(() => expect(document.activeElement).toBe(retry));
    failNext.value = false;
    await user.click(retry);
    await waitFor(() => expect(articleIds()).toHaveLength(20));
  });
});

describe("CommentSection: gửi", () => {
  it("thành công chèn lên đầu, tiêu đề +1, ô trống và có focus, không toast", async () => {
    const created = makeFxComment(0, { content: "Đẹp quá!" });
    h.addComment.mockResolvedValue(created);
    const { user } = renderSection();
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    const textarea = screen.getByLabelText("Viết bình luận") as HTMLTextAreaElement;
    await user.type(textarea, "Đẹp quá!");
    await user.click(screen.getByRole("button", { name: "Gửi bình luận" }));
    await waitFor(() => expect(articleIds()[0]).toBe(`binh-luan-${created.id}`));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Bình luận (4)");
    expect(textarea.value).toBe("");
    expect(document.activeElement).toBe(textarea);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("BE trả ContentTooLong thì hiện dưới ô, giữ chữ, không toast", async () => {
    h.addComment.mockRejectedValue(http(400, "Comment.ContentTooLong"));
    const { user } = renderSection();
    const textarea = screen.getByLabelText("Viết bình luận") as HTMLTextAreaElement;
    await user.type(textarea, "x");
    await user.click(screen.getByRole("button", { name: "Gửi bình luận" }));
    await waitFor(() => expect(screen.getByText("Bình luận tối đa 500 ký tự.")).toBeTruthy());
    expect(textarea.value).toBe("x");
    expect(notifyError).not.toHaveBeenCalled();
  });
});

describe("CommentSection: xóa", () => {
  it("tác giả chỉ có nút xóa ở bình luận của mình", async () => {
    h.listComments.mockResolvedValue(
      commentsOf([makeFxComment(1), makeFxComment(2, { author: { id: THIRD, displayName: "Bình", avatarUrl: null } })]),
    );
    renderSection();
    await waitFor(() => expect(articleIds()).toHaveLength(2));
    expect(screen.getAllByRole("button", { name: /^Xóa bình luận của/ })).toHaveLength(1);
  });

  it("chủ có nút ở mọi bình luận; khách và người thứ ba không có", async () => {
    const owner = renderSection({ viewerId: fxOwnerId() });
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    expect(screen.getAllByRole("button", { name: /^Xóa bình luận của/ })).toHaveLength(3);
    owner.unmount();
    const guest = renderSection({ viewerId: null });
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    expect(screen.queryAllByRole("button", { name: /^Xóa bình luận của/ })).toHaveLength(0);
    guest.unmount();
    renderSection({ viewerId: THIRD });
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    expect(screen.queryAllByRole("button", { name: /^Xóa bình luận của/ })).toHaveLength(0);
  });

  it("Giữ bình luận đóng hộp và focus về nút thùng rác", async () => {
    const { user } = renderSection({ viewerId: fxOwnerId() });
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    const trash = screen.getAllByRole("button", { name: /^Xóa bình luận của/ })[1] as HTMLElement;
    await user.click(trash);
    const dialog = await screen.findByRole("dialog", { name: "Xóa bình luận?" });
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Giữ bình luận" })));
    await user.click(within(dialog).getByRole("button", { name: "Giữ bình luận" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trash));
  });

  it.each(["removed", "already-removed"] as const)("%s: gỡ bình luận, tiêu đề −1, đọc thông báo, focus bình luận kế", async (outcome) => {
    h.removeComment.mockResolvedValue(outcome);
    const { user, container } = renderSection({ viewerId: fxOwnerId() });
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    const second = articleIds()[1] as string;
    const third = articleIds()[2] as string;
    await user.click(screen.getAllByRole("button", { name: /^Xóa bình luận của/ })[1] as HTMLElement);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Xóa bình luận" }));
    await waitFor(() => expect(articleIds()).not.toContain(second));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Bình luận (2)");
    expect(container.querySelector('section#binh-luan > p[aria-live="polite"]')?.textContent).toBe("Đã xóa bình luận");
    await waitFor(() => expect(document.activeElement?.id).toBe(third));
  });

  it("403: toast và bình luận còn", async () => {
    h.removeComment.mockRejectedValue(http(403, "Comment.DeleteForbidden"));
    const { user } = renderSection({ viewerId: fxOwnerId() });
    await waitFor(() => expect(articleIds()).toHaveLength(3));
    await user.click(screen.getAllByRole("button", { name: /^Xóa bình luận của/ })[0] as HTMLElement);
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Xóa bình luận" }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("Bạn không có quyền xóa bình luận này."));
    expect(articleIds()).toHaveLength(3);
  });
});

describe("CommentSection: Xem bình luận từ Tổng quan", () => {
  it("focusToken tăng khi khối đang ẩn, hết ẩn thì h2 nhận focus", async () => {
    const { show } = renderSection({ wrapHidden: true });
    act(() => screen.getByTestId("xem-binh-luan").click());
    show();
    await waitFor(() => expect(document.activeElement?.id).toBe("binh-luan-tieu-de"));
  });
});
