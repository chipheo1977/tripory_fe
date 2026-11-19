import { makeApiError } from "@tripory/api-client";
import type { CommentPage, LikeState, SocialRepository } from "@tripory/social";
import { createSocialHooks } from "@tripory/social/react";
import { notify } from "@tripory/ui-web";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { fxItineraryId } from "@/test/domain-itinerary-fixtures";
import { fxCommentId, makeFxComment, makeFxCommentPage } from "@/test/domain-social-fixtures";

const ID = fxItineraryId();
const INITIAL: LikeState = { count: 12, liked: false };
const LIKE_FALLBACK = "Chưa cập nhật được lượt thích. Kiểm tra kết nối mạng rồi thử lại.";

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void; reject(error: unknown): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeRepo(overrides: Partial<SocialRepository> = {}) {
  return {
    getLike: vi.fn<SocialRepository["getLike"]>(async () => INITIAL),
    like: vi.fn<SocialRepository["like"]>(async () => ({ count: 13, liked: true })),
    unlike: vi.fn<SocialRepository["unlike"]>(async () => INITIAL),
    listComments: vi.fn<SocialRepository["listComments"]>(async () => makeFxCommentPage([])),
    addComment: vi.fn<SocialRepository["addComment"]>(async () => makeFxComment(99)),
    removeComment: vi.fn<SocialRepository["removeComment"]>(async () => "removed"),
    ...overrides,
  };
}

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const networkError = makeApiError({ kind: "network", status: null, code: null, message: null });
const httpError = (status: number, code: string) => makeApiError({ kind: "http", status, code, message: null });

beforeEach(() => {
  client = makeQueryClient();
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
});

describe("useLikeState: bấm và xác nhận", () => {
  it("ban đầu bằng initial, không syncing", () => {
    const hooks = createSocialHooks({ repository: makeRepo() });
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: false }), { wrapper });
    expect(result.current.state).toEqual(INITIAL);
    expect(result.current.syncing).toBe(false);
  });

  it("đổi ngay ±1 rồi lấy số của BE", async () => {
    const reply = deferred<LikeState>();
    const repo = makeRepo({ like: vi.fn(() => reply.promise) });
    const hooks = createSocialHooks({ repository: repo });
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: false }), { wrapper });
    act(() => result.current.toggle());
    expect(result.current.state).toEqual({ count: 13, liked: true });
    await waitFor(() => expect(repo.like).toHaveBeenCalledTimes(1));
    await act(async () => reply.resolve({ count: 15, liked: true }));
    await waitFor(() => expect(result.current.state).toEqual({ count: 15, liked: true }));
  });

  it("bấm liên tiếp gửi tuần tự, phản hồi cũ không đè, lệnh cuối thắng", async () => {
    const replies = [deferred<LikeState>(), deferred<LikeState>(), deferred<LikeState>()];
    const calls: string[] = [];
    let index = 0;
    const next = (name: string) => () => {
      calls.push(name);
      const reply = replies[index];
      index += 1;
      if (reply === undefined) throw new Error("quá nhiều lời gọi");
      return reply.promise;
    };
    const repo = makeRepo({ like: vi.fn(next("like")), unlike: vi.fn(next("unlike")) });
    const hooks = createSocialHooks({ repository: repo });
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: false }), { wrapper });

    act(() => result.current.toggle());
    expect(result.current.state).toEqual({ count: 13, liked: true });
    act(() => result.current.toggle());
    expect(result.current.state).toEqual({ count: 12, liked: false });
    act(() => result.current.toggle());
    expect(result.current.state).toEqual({ count: 13, liked: true });

    await waitFor(() => expect(calls).toEqual(["like"]));
    await act(async () => replies[0]?.resolve({ count: 13, liked: true }));
    expect(result.current.state).toEqual({ count: 13, liked: true });
    await waitFor(() => expect(calls).toEqual(["like", "unlike"]));
    await act(async () => replies[1]?.resolve({ count: 12, liked: false }));
    expect(result.current.state).toEqual({ count: 13, liked: true });
    await waitFor(() => expect(calls).toEqual(["like", "unlike", "like"]));
    await act(async () => replies[2]?.resolve({ count: 14, liked: true }));
    await waitFor(() => expect(result.current.state).toEqual({ count: 14, liked: true }));
  });

  it("lệnh cuối lỗi thì quay về giá trị BE xác nhận gần nhất và toast câu fallback", async () => {
    const error = vi.spyOn(notify, "error").mockImplementation(() => "");
    const repo = makeRepo({ like: vi.fn(async () => Promise.reject(httpError(500, "Server.Error"))) });
    const hooks = createSocialHooks({ repository: repo });
    const meta = { feedback: { fallbackMessage: LIKE_FALLBACK } };
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: false, meta }), {
      wrapper,
    });
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.state).toEqual(INITIAL));
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(LIKE_FALLBACK);
  });

  it("Social.DraftForbidden toast câu chưa xuất bản", async () => {
    const error = vi.spyOn(notify, "error").mockImplementation(() => "");
    const repo = makeRepo({ like: vi.fn(async () => Promise.reject(httpError(403, "Social.DraftForbidden"))) });
    const hooks = createSocialHooks({ repository: repo });
    const meta = { feedback: { fallbackMessage: LIKE_FALLBACK } };
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: false, meta }), {
      wrapper,
    });
    act(() => result.current.toggle());
    await waitFor(() => expect(error).toHaveBeenCalledWith("Lịch trình này chưa được xuất bản."));
    expect(result.current.state).toEqual(INITIAL);
  });

  it("lệnh 1 lỗi, lệnh 2 thành công thì xác nhận của BE thắng", async () => {
    vi.spyOn(notify, "error").mockImplementation(() => "");
    const first = deferred<LikeState>();
    const repo = makeRepo({
      like: vi.fn(() => first.promise),
      unlike: vi.fn(async () => ({ count: 12, liked: false })),
    });
    const hooks = createSocialHooks({ repository: repo });
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: false }), { wrapper });
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    await act(async () => first.reject(networkError));
    await waitFor(() => expect(repo.unlike).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.state).toEqual({ count: 12, liked: false }));
  });
});

describe("useLikeState: đồng bộ D-27", () => {
  it("syncing tới khi getLike xong, toggle bị khóa, kết quả thành giá trị hiển thị", async () => {
    const reply = deferred<LikeState>();
    const repo = makeRepo({ getLike: vi.fn(() => reply.promise) });
    const hooks = createSocialHooks({ repository: repo });
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: true }), { wrapper });
    expect(result.current.syncing).toBe(true);
    act(() => result.current.toggle());
    expect(repo.like).not.toHaveBeenCalled();
    expect(result.current.state).toEqual(INITIAL);
    await act(async () => reply.resolve({ count: 20, liked: true }));
    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(result.current.state).toEqual({ count: 20, liked: true });
    expect(repo.getLike).toHaveBeenCalledTimes(1);
  });

  it("W-01: like xong, unmount rồi mount lại cùng phiên thì hiện giá trị BE xác nhận, không dùng cache cũ", async () => {
    const repo = makeRepo({ getLike: vi.fn(async () => INITIAL) });
    const hooks = createSocialHooks({ repository: repo });
    const first = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: true }), { wrapper });
    await waitFor(() => expect(first.result.current.syncing).toBe(false));
    act(() => first.result.current.toggle());
    await waitFor(() => expect(repo.like).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(client.getQueryData(["social", "like", ID])).toEqual({ count: 13, liked: true }));
    first.unmount();

    const second = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: true }), { wrapper });
    expect(second.result.current.state).toEqual({ count: 13, liked: true });
    expect(second.result.current.syncing).toBe(false);
    expect(repo.getLike).toHaveBeenCalledTimes(1);
  });

  it("W-01: cache like chưa có dữ liệu (sync false) thì không tạo cache mới", async () => {
    const repo = makeRepo();
    const hooks = createSocialHooks({ repository: repo });
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: false }), { wrapper });
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.state).toEqual({ count: 13, liked: true }));
    expect(client.getQueryData(["social", "like", ID])).toBeUndefined();
  });

  it("sync false thì không gọi getLike", async () => {
    const repo = makeRepo();
    const hooks = createSocialHooks({ repository: repo });
    renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: false }), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(repo.getLike).not.toHaveBeenCalled();
  });

  it("đồng bộ lỗi thì mở khóa với giá trị SSR, không toast", async () => {
    const error = vi.spyOn(notify, "error").mockImplementation(() => "");
    const repo = makeRepo({ getLike: vi.fn(async () => Promise.reject(networkError)) });
    const hooks = createSocialHooks({ repository: repo });
    const { result } = renderHook(() => hooks.useLikeState({ itineraryId: ID, initial: INITIAL, sync: true }), { wrapper });
    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(result.current.state).toEqual(INITIAL);
    expect(error).not.toHaveBeenCalled();
    expect(repo.getLike).toHaveBeenCalledTimes(1);
  });
});

const tenComments = () => Array.from({ length: 10 }, (_, index) => makeFxComment(index + 1));

function renderFeed(repo: ReturnType<typeof makeRepo>) {
  const hooks = createSocialHooks({ repository: repo });
  return renderHook(
    () => ({
      feed: hooks.useCommentFeed(ID),
      add: hooks.useAddComment(ID),
      remove: hooks.useRemoveComment(ID),
    }),
    { wrapper },
  );
}

describe("useCommentFeed", () => {
  it("loading rồi ready với trang 1", async () => {
    const repo = makeRepo({
      listComments: vi.fn(async () => makeFxCommentPage(tenComments(), { totalCount: 12, hasNextPage: true })),
    });
    const { result } = renderFeed(repo);
    expect(result.current.feed.status).toBe("loading");
    expect(result.current.feed.comments).toEqual([]);
    expect(result.current.feed.loadedAt).toBeNull();
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    expect(result.current.feed.comments.map((c) => c.id)).toEqual(tenComments().map((c) => c.id));
    expect(typeof result.current.feed.loadedAt).toBe("number");
    expect(result.current.feed.hasNextPage).toBe(true);
    expect(repo.listComments).toHaveBeenCalledWith(ID, { pageIndex: 1, pageSize: 10 }, expect.any(AbortSignal));
  });

  it("đã tải 10 thì trang kế là 2", async () => {
    const listComments = vi.fn<SocialRepository["listComments"]>(async (_id, { pageIndex }) =>
      pageIndex === 1
        ? makeFxCommentPage(tenComments(), { totalCount: 12, hasNextPage: true })
        : makeFxCommentPage([makeFxComment(11), makeFxComment(12)], { pageIndex: 2, totalCount: 12 }),
    );
    const { result } = renderFeed(makeRepo({ listComments }));
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    act(() => result.current.feed.fetchNext());
    await waitFor(() => expect(result.current.feed.comments).toHaveLength(12));
    expect(listComments).toHaveBeenLastCalledWith(ID, { pageIndex: 2, pageSize: 10 }, expect.any(AbortSignal));
    expect(result.current.feed.hasNextPage).toBe(false);
  });

  it("sau khi xóa còn 9 thì xin lại trang 1, trộn bỏ trùng", async () => {
    const all = Array.from({ length: 12 }, (_, index) => makeFxComment(index + 1));
    let removed = false;
    const listComments = vi.fn<SocialRepository["listComments"]>(async (_id, { pageIndex }) => {
      const remaining = removed ? all.filter((c) => c.id !== all[0]?.id) : all;
      const items = remaining.slice((pageIndex - 1) * 10, pageIndex * 10);
      return makeFxCommentPage(items, { pageIndex, totalCount: remaining.length, hasNextPage: pageIndex * 10 < remaining.length });
    });
    const { result } = renderFeed(makeRepo({ listComments }));
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    removed = true;
    await act(async () => {
      await result.current.remove.remove(fxCommentId(1));
    });
    await waitFor(() => expect(result.current.feed.comments).toHaveLength(9));
    act(() => result.current.feed.fetchNext());
    // BE còn #2..#12; trang 1 mới là #2..#11, phần tử bị dịch (#11) được lấy lại, không lặp.
    await waitFor(() => expect(result.current.feed.comments).toHaveLength(10));
    expect(listComments).toHaveBeenLastCalledWith(ID, { pageIndex: 1, pageSize: 10 }, expect.any(AbortSignal));
    const ids = result.current.feed.comments.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(all.slice(1, 11).map((c) => c.id));
    act(() => result.current.feed.fetchNext());
    await waitFor(() => expect(result.current.feed.comments).toHaveLength(11));
    expect(listComments).toHaveBeenLastCalledWith(ID, { pageIndex: 2, pageSize: 10 }, expect.any(AbortSignal));
  });

  it("sau khi chèn 1 (11 phần tử) thì xin trang 2 và bỏ trùng ở rìa", async () => {
    const all = Array.from({ length: 13 }, (_, index) => makeFxComment(index + 1));
    const fresh = makeFxComment(0, { content: "Mới" });
    let added = false;
    const listComments = vi.fn<SocialRepository["listComments"]>(async (_id, { pageIndex }) => {
      const source = added ? [fresh, ...all] : all;
      const items = source.slice((pageIndex - 1) * 10, pageIndex * 10);
      return makeFxCommentPage(items, { pageIndex, totalCount: source.length, hasNextPage: pageIndex * 10 < source.length });
    });
    const repo = makeRepo({ listComments, addComment: vi.fn(async () => fresh) });
    const { result } = renderFeed(repo);
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    added = true;
    await act(async () => {
      await result.current.add.submit("Mới");
    });
    await waitFor(() => expect(result.current.feed.comments).toHaveLength(11));
    act(() => result.current.feed.fetchNext());
    await waitFor(() => expect(result.current.feed.comments).toHaveLength(14));
    expect(listComments).toHaveBeenLastCalledWith(ID, { pageIndex: 2, pageSize: 10 }, expect.any(AbortSignal));
    const ids = result.current.feed.comments.map((c) => c.id);
    expect(new Set(ids).size).toBe(14);
  });

  it("trang đầu lỗi thì error, retry thành công thì ready", async () => {
    let fail = true;
    const listComments = vi.fn<SocialRepository["listComments"]>(async () => {
      if (fail) throw networkError;
      return makeFxCommentPage([makeFxComment(1)]);
    });
    const { result } = renderFeed(makeRepo({ listComments }));
    await waitFor(() => expect(result.current.feed.status).toBe("error"));
    fail = false;
    act(() => result.current.feed.retry());
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    expect(result.current.feed.comments).toHaveLength(1);
  });

  it("trang kế lỗi thì giữ danh sách, nextFailed, thử lại thành công thì hết", async () => {
    let failNext = true;
    const listComments = vi.fn<SocialRepository["listComments"]>(async (_id, { pageIndex }) => {
      if (pageIndex === 1) return makeFxCommentPage(tenComments(), { totalCount: 11, hasNextPage: true });
      if (failNext) throw networkError;
      return makeFxCommentPage([makeFxComment(11)], { pageIndex: 2, totalCount: 11 });
    });
    const { result } = renderFeed(makeRepo({ listComments }));
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    act(() => result.current.feed.fetchNext());
    await waitFor(() => expect(result.current.feed.nextFailed).toBe(true));
    expect(result.current.feed.status).toBe("ready");
    expect(result.current.feed.comments).toHaveLength(10);
    expect(result.current.feed.hasNextPage).toBe(true);
    failNext = false;
    act(() => result.current.feed.fetchNext());
    await waitFor(() => expect(result.current.feed.comments).toHaveLength(11));
    expect(result.current.feed.nextFailed).toBe(false);
  });

  it("không refetch khi cửa sổ lấy lại focus", async () => {
    const repo = makeRepo();
    const { result } = renderFeed(repo);
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(repo.listComments).toHaveBeenCalledTimes(1);
  });
});

describe("useAddComment", () => {
  it.each([
    ["   ", "empty"],
    ["a".repeat(501), "too-long"],
  ] as const)("nội dung %j trả %s, không gọi addComment", async (raw, reason) => {
    const repo = makeRepo();
    const { result } = renderFeed(repo);
    await expect(result.current.add.submit(raw)).resolves.toEqual({ ok: false, reason });
    expect(repo.addComment).not.toHaveBeenCalled();
  });

  it("gửi bản trim, chèn lên đầu, totalCount +1, không gọi lại listComments", async () => {
    const created = makeFxComment(99, { content: "Đẹp quá!" });
    const repo = makeRepo({
      listComments: vi.fn(async () => makeFxCommentPage([makeFxComment(1)], { totalCount: 1 })),
      addComment: vi.fn(async () => created),
    });
    const { result } = renderFeed(repo);
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    const before = result.current.feed.loadedAt ?? 0;
    await new Promise((resolve) => setTimeout(resolve, 5));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.add.submit("  Đẹp quá!  ");
    });
    expect(repo.addComment).toHaveBeenCalledWith(ID, "Đẹp quá!");
    expect(outcome).toEqual({ ok: true, comment: created });
    await waitFor(() => expect(result.current.feed.comments[0]?.id).toBe(created.id));
    const pages = client.getQueryData<{ pages: CommentPage[] }>(["social", "comments", ID])?.pages ?? [];
    expect(pages.map((page) => page.totalCount)).toEqual([2]);
    expect(repo.listComments).toHaveBeenCalledTimes(1);
    expect(result.current.feed.loadedAt ?? 0).toBeGreaterThan(before);
  });

  it("cache chưa có dữ liệu thì invalidate thay vì ghi", async () => {
    const repo = makeRepo();
    const hooks = createSocialHooks({ repository: repo });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => hooks.useAddComment(ID), { wrapper });
    await act(async () => {
      await result.current.submit("Xin chào");
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["social", "comments", ID] });
    expect(client.getQueryData(["social", "comments", ID])).toBeUndefined();
  });

  it("BE từ chối thì reject đúng lỗi và cache không đổi", async () => {
    vi.spyOn(notify, "error").mockImplementation(() => "");
    const error = httpError(400, "Comment.ContentTooLong");
    const repo = makeRepo({
      listComments: vi.fn(async () => makeFxCommentPage([makeFxComment(1)])),
      addComment: vi.fn(async () => Promise.reject(error)),
    });
    const { result } = renderFeed(repo);
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    await act(async () => {
      await expect(result.current.add.submit("x")).rejects.toBe(error);
    });
    expect(result.current.feed.comments).toHaveLength(1);
  });
});

describe("useRemoveComment", () => {
  it.each(["removed", "already-removed"] as const)("%s gỡ khỏi cache và giảm totalCount", async (outcome) => {
    const repo = makeRepo({
      listComments: vi.fn(async () => makeFxCommentPage([makeFxComment(1), makeFxComment(2)], { totalCount: 2 })),
      removeComment: vi.fn(async () => outcome),
    });
    const { result } = renderFeed(repo);
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    await act(async () => {
      await expect(result.current.remove.remove(fxCommentId(1))).resolves.toBe(outcome);
    });
    expect(repo.removeComment).toHaveBeenCalledWith(ID, fxCommentId(1));
    await waitFor(() => expect(result.current.feed.comments.map((c) => c.id)).toEqual([fxCommentId(2)]));
    const pages = client.getQueryData<{ pages: CommentPage[] }>(["social", "comments", ID])?.pages ?? [];
    expect(pages[0]?.totalCount).toBe(1);
  });

  it("403 thì reject và cache giữ nguyên", async () => {
    vi.spyOn(notify, "error").mockImplementation(() => "");
    const error = httpError(403, "Comment.DeleteForbidden");
    const repo = makeRepo({
      listComments: vi.fn(async () => makeFxCommentPage([makeFxComment(1)])),
      removeComment: vi.fn(async () => Promise.reject(error)),
    });
    const { result } = renderFeed(repo);
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    await act(async () => {
      await expect(result.current.remove.remove(fxCommentId(1))).rejects.toBe(error);
    });
    expect(result.current.feed.comments).toHaveLength(1);
  });

  it("gửi và xóa cùng scope nên chạy tuần tự", async () => {
    const addReply = deferred<ReturnType<typeof makeFxComment>>();
    const order: string[] = [];
    const repo = makeRepo({
      listComments: vi.fn(async () => makeFxCommentPage([makeFxComment(1)])),
      addComment: vi.fn(() => {
        order.push("add");
        return addReply.promise;
      }),
      removeComment: vi.fn(async () => {
        order.push("remove");
        return "removed" as const;
      }),
    });
    const { result } = renderFeed(repo);
    await waitFor(() => expect(result.current.feed.status).toBe("ready"));
    let adding: Promise<unknown> = Promise.resolve();
    let removing: Promise<unknown> = Promise.resolve();
    act(() => {
      adding = result.current.add.submit("x");
      removing = result.current.remove.remove(fxCommentId(1));
    });
    await waitFor(() => expect(order).toEqual(["add"]));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(order).toEqual(["add"]);
    await act(async () => {
      addReply.resolve(makeFxComment(50));
      await adding;
      await removing;
    });
    expect(order).toEqual(["add", "remove"]);
  });
});
