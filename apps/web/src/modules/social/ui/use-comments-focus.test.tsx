import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCommentsFocus } from "./use-comments-focus";

let frames: FrameRequestCallback[] = [];
const runFrame = () => {
  const pending = frames;
  frames = [];
  for (const callback of pending) callback(0);
};
const originalMatchMedia = window.matchMedia;

let wrapper: HTMLDivElement;
let section: HTMLElement;
let heading: HTMLHeadingElement;
let scrollIntoView: ReturnType<typeof vi.fn>;

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frames = [];
  });
  wrapper = document.createElement("div");
  section = document.createElement("section");
  section.id = "binh-luan";
  heading = document.createElement("h2");
  heading.id = "binh-luan-tieu-de";
  heading.tabIndex = -1;
  section.append(heading);
  wrapper.append(section);
  document.body.append(wrapper);
  scrollIntoView = vi.fn();
  section.scrollIntoView = scrollIntoView as unknown as typeof section.scrollIntoView;
});

afterEach(() => {
  wrapper.remove();
  vi.unstubAllGlobals();
  window.matchMedia = originalMatchMedia;
});

const input = (token: number) => ({ token, sectionId: "binh-luan", headingId: "binh-luan-tieu-de" });

describe("useCommentsFocus", () => {
  it("token 0 không làm gì", () => {
    renderHook(() => useCommentsFocus(input(0)));
    runFrame();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("chờ tới khi hết hidden rồi cuộn smooth và focus h2", () => {
    wrapper.hidden = true;
    const { rerender } = renderHook(({ token }) => useCommentsFocus(input(token)), { initialProps: { token: 0 } });
    rerender({ token: 1 });
    runFrame();
    expect(scrollIntoView).not.toHaveBeenCalled();
    wrapper.hidden = false;
    runFrame();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
    expect(document.activeElement).toBe(heading);
  });

  it("reduced motion thì behavior auto", () => {
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce") })) as unknown as typeof window.matchMedia;
    const { rerender } = renderHook(({ token }) => useCommentsFocus(input(token)), { initialProps: { token: 0 } });
    rerender({ token: 1 });
    runFrame();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  });

  it("dừng sau 30 khung hình nếu vẫn ẩn", () => {
    wrapper.hidden = true;
    const { rerender } = renderHook(({ token }) => useCommentsFocus(input(token)), { initialProps: { token: 0 } });
    rerender({ token: 1 });
    for (let i = 0; i < 40; i += 1) runFrame();
    expect(frames).toHaveLength(0);
    wrapper.hidden = false;
    runFrame();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("cùng token render lại không cuộn lần hai", () => {
    const { rerender } = renderHook(({ token }) => useCommentsFocus(input(token)), { initialProps: { token: 0 } });
    rerender({ token: 1 });
    runFrame();
    rerender({ token: 1 });
    runFrame();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("unmount thì hủy khung hình chờ", () => {
    wrapper.hidden = true;
    const { rerender, unmount } = renderHook(({ token }) => useCommentsFocus(input(token)), { initialProps: { token: 0 } });
    rerender({ token: 1 });
    unmount();
    expect(frames).toHaveLength(0);
  });

  it("focusById focus phần tử có id, bỏ qua id không có", () => {
    const { result } = renderHook(() => useCommentsFocus(input(0)));
    act(() => result.current.focusById("binh-luan-tieu-de"));
    expect(document.activeElement).toBe(heading);
    expect(() => result.current.focusById("khong-co")).not.toThrow();
  });
});
