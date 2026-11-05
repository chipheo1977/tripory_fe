import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCreateBlocks } from "./use-create-blocks";

describe("useCreateBlocks.openAndFocus", () => {
  it("chỉ focus sau khi khối đã được mở trong state đã commit", () => {
    let rendered: readonly string[] = [];
    const { result } = renderHook(() => {
      const blocks = useCreateBlocks();
      rendered = blocks.openBlocks;
      return blocks;
    });
    const seen: string[][] = [];
    const focus = vi.fn(() => {
      seen.push([...rendered]);
    });

    act(() => result.current.openAndFocus("interests", focus));

    expect(focus).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([["interests"]]);
  });

  it("khối đã mở sẵn vẫn focus mỗi lần được yêu cầu", () => {
    const { result } = renderHook(() => useCreateBlocks());
    const focus = vi.fn();

    act(() => result.current.openAndFocus("destination", focus));
    act(() => result.current.openAndFocus("destination", focus));

    expect(focus).toHaveBeenCalledTimes(2);
  });

  it("không focus trong lúc gọi, chỉ sau commit", () => {
    const { result } = renderHook(() => useCreateBlocks());
    const focus = vi.fn();
    let calledDuringCall = true;

    act(() => {
      result.current.openAndFocus("name", focus);
      calledDuringCall = focus.mock.calls.length > 0;
    });

    expect(calledDuringCall).toBe(false);
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
