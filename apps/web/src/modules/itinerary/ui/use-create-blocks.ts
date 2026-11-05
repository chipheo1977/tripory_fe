"use client";

// Khối đang mở của form tạo (D-62..D-65, D-69, D-72): chỉ một khối mở, mở được khối bất kỳ. Mở khối rồi focus phải xảy ra
// sau khi panel đã render: `openAndFocus` chỉ mở khối bằng state và lưu yêu cầu focus; effect chạy `focus()` sau commit.
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { CreateBlockId } from "./create-itinerary-blocks";

export type CreateBlocks = Readonly<{
  openBlocks: readonly CreateBlockId[];
  /** = `onValueChange` của Accordion. */
  setOpenBlocks(next: readonly CreateBlockId[]): void;
  /** Ref callback cho `AccordionTrigger` của khối. */
  triggerRef(block: CreateBlockId): (element: HTMLButtonElement | null) => void;
  triggerElement(block: CreateBlockId): HTMLButtonElement | null;
  /** Mở khối rồi focus (dùng cho khối lỗi đầu tiên). */
  openAndFocus(block: CreateBlockId, focus: () => void): void;
  /** Chọn xong điểm đến: đóng Điểm đến, mở Tên, focus trigger Tên. */
  advanceFromDestination(): void;
  /** Về trạng thái ban đầu: chỉ khối Điểm đến mở (D-65). */
  reset(): void;
}>;

const INITIAL: readonly CreateBlockId[] = ["destination"];

export function useCreateBlocks(): CreateBlocks {
  const [openBlocks, setOpenBlocks] = useState<readonly CreateBlockId[]>(INITIAL);
  const [triggers] = useState(() => new Map<CreateBlockId, HTMLButtonElement>());
  const [callbacks] = useState(() => new Map<CreateBlockId, (element: HTMLButtonElement | null) => void>());

  const triggerRef = (block: CreateBlockId) => {
    const existing = callbacks.get(block);
    if (existing !== undefined) return existing;
    const callback = (element: HTMLButtonElement | null): void => {
      if (element === null) triggers.delete(block);
      else triggers.set(block, element);
    };
    callbacks.set(block, callback);
    return callback;
  };

  // Mỗi yêu cầu là một đối tượng mới nên effect chạy lại kể cả khi khối đã mở sẵn.
  const [focusRequest, setFocusRequest] = useState<Readonly<{ focus: () => void }> | null>(null);
  useEffect(() => {
    focusRequest?.focus();
  }, [focusRequest]);
  const openAndFocus = (block: CreateBlockId, focus: () => void): void => {
    setOpenBlocks([block]);
    setFocusRequest({ focus });
  };

  const advanceFromDestination = (): void => {
    flushSync(() => setOpenBlocks(["name"]));
    const trigger = triggers.get("name");
    trigger?.focus();
    trigger?.scrollIntoView?.({ block: "nearest" });
  };

  return {
    openBlocks,
    setOpenBlocks,
    triggerRef,
    triggerElement: (block) => triggers.get(block) ?? null,
    openAndFocus,
    advanceFromDestination,
    reset: () => setOpenBlocks(INITIAL),
  };
}
