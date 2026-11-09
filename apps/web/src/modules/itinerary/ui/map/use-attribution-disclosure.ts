"use client";

// Trạng thái mở/đóng của ghi công bản đồ thu gọn (D-114, đổi 2026-11-06): mặc định đóng, nút bật/tắt, Esc đóng, bấm ra ngoài đóng.
// Esc khi đang mở bị chặn lại không cho lan tiếp. Esc chỉ trả focus về nút khi focus đang nằm trong vùng ghi công, để không giật focus khỏi canvas bản đồ.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type AttributionDisclosure = Readonly<{
  open: boolean;
  toggle(): void;
  rootRef: RefObject<HTMLDivElement | null>;
  buttonRef: RefObject<HTMLButtonElement | null>;
}>;

export function useAttributionDisclosure(): AttributionDisclosure {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Esc là của lớp trên cùng: đang mở ghi công thì chỉ đóng nó, không để sheet lịch trình (Base UI đóng khi Esc ở
      // bất kỳ đâu) hay canvas bản đồ (bỏ chọn) nhận cùng phím đó.
      event.stopPropagation();
      const focusInside = rootRef.current?.contains(document.activeElement) === true;
      setOpen(false);
      if (focusInside) buttonRef.current?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target) === true) return;
      setOpen(false);
    };
    // Pha capture ở `window` để chạy trước mọi trình nghe khác của tài liệu.
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return { open, toggle, rootRef, buttonRef };
}
