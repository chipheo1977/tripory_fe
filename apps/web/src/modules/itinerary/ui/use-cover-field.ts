"use client";

// Trạng thái và thao tác của `CoverImageField`: tách khỏi component để component chỉ ghép JSX (coding-rules S).
// Thao tác danh sách là hàm thuần của domain; hook này thêm thông báo cho trình đọc màn hình và quản lý focus.
import {
  addCoverImage,
  focusTargetAfterRemove,
  removeCoverImage,
  selectCoverImage,
  type CoverFocusTarget,
  type CoverGallery,
} from "@tripory/itinerary";
import { useEffect, useRef, useState, type RefObject } from "react";

type FocusTarget = Readonly<{ kind: "radio"; index: number }> | Readonly<{ kind: "panel" }> | CoverFocusTarget;
type FocusRequest = Readonly<{ id: number; target: FocusTarget }>;

export type UseCoverFieldArgs = Readonly<{
  rootRef: RefObject<HTMLDivElement | null>; // do component tạo; hook chỉ đọc `.current` trong effect
  images: readonly string[];
  selectedIndex: number | null;
  onChange(next: CoverGallery): void;
  hasDefaultCover: boolean;
  disabled?: boolean;
}>;

export type CoverField = Readonly<{
  adding: boolean;
  announce: string;
  note: string;
  toggleAdding(): void;
  openFromEmpty(): void;
  select(index: number): void;
  remove(index: number): void;
  add(url: string): void;
  cancel(): void;
}>;

/** Ghi chú dưới lưới (D-86): chỉ là chữ, ảnh mặc định không bao giờ vào danh sách. */
export function fieldNote(count: number, hasDefaultCover: boolean): string {
  if (count >= 5) return "Đã đủ 5 ảnh. Xóa một ảnh để thêm ảnh khác.";
  if (count > 0) return "";
  if (hasDefaultCover) return "Chưa có ảnh bìa. Lịch trình đang dùng ảnh mặc định.";
  return "Chưa có ảnh bìa.";
}

function focusElement(root: HTMLElement | null, target: FocusTarget): void {
  if (root === null) return;
  if (target.kind === "radio") root.querySelectorAll<HTMLElement>('[role="radio"]')[target.index]?.focus();
  else if (target.kind === "remove") root.querySelector<HTMLElement>(`[data-cover-remove="${target.position}"]`)?.focus();
  else if (target.kind === "add") root.querySelector<HTMLElement>("[data-cover-add]")?.focus();
  else root.querySelector<HTMLElement>("[data-cover-url-panel] input")?.focus();
}

export function useCoverField({ rootRef, images, selectedIndex, onChange, hasDefaultCover, disabled = false }: UseCoverFieldArgs): CoverField {
  const requestCounter = useRef(0);
  const [adding, setAdding] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const gallery: CoverGallery = { images, selectedIndex };

  const requestFocus = (target: FocusTarget): void => {
    requestCounter.current += 1;
    setFocusRequest({ id: requestCounter.current, target });
  };

  useEffect(() => {
    if (focusRequest !== null) focusElement(rootRef.current, focusRequest.target);
  }, [focusRequest, rootRef]);

  const select = (index: number): void => {
    if (disabled) return;
    onChange(selectCoverImage(gallery, index));
  };
  const remove = (index: number): void => {
    if (disabled) return;
    const next = removeCoverImage(gallery, index);
    const position = index + 1;
    onChange(next);
    setAnnounce(`Đã xóa ảnh bìa ${position}`);
    requestFocus(focusTargetAfterRemove(position, next.images.length));
  };

  const add = (url: string): void => {
    if (disabled) return;
    const next = addCoverImage(gallery, url);
    onChange(next);
    setAdding(false);
    setAnnounce(`Đã thêm ảnh bìa ${next.images.length}`);
    requestFocus({ kind: "radio", index: next.images.length - 1 });
  };

  const cancel = (): void => {
    setAdding(false);
    requestFocus({ kind: "add" });
  };
  const toggleAdding = (): void => {
    if (disabled) return;
    setAdding(!adding);
  };

  const openFromEmpty = (): void => {
    if (disabled) return;
    setAdding(true);
    requestFocus({ kind: "panel" });
  };

  return {
    adding,
    announce,
    note: fieldNote(images.length, hasDefaultCover),
    toggleAdding,
    openFromEmpty,
    select,
    remove,
    add,
    cancel,
  };
}
