"use client";

// Nút "Chia sẻ" (D-12, D-15, UI-SPEC §Nút Chia sẻ). Dưới `md`: chỉ icon, `ghost`; từ `md`: `secondary` có chữ. MỘT cây duy nhất
// (chữ ẩn bằng `sr-only md:not-sr-only`, variant đổi theo breakpoint) nên không remount khi đổi cỡ màn hình, focus được giữ.
// Không dùng accent (U-08). `visible=false` (chủ xem bản nháp, D-17) thì không render; nơi gọi truyền `isPublic`.
import { Button } from "@tripory/ui-web";
import { Share2 } from "lucide-react";
import type { Ref } from "react";
import { useMediaQuery } from "./use-media-query";

/** Trùng breakpoint `md` của Tailwind (768px). */
const MD_QUERY = "(min-width: 768px)";

const PRESENTATION = { true: "wide", false: "narrow" } as const;
const VARIANT = { narrow: "ghost", wide: "secondary" } as const;

export type ShareButtonProps = Readonly<{
  visible: boolean;
  onClick(): void;
  buttonRef?: Ref<HTMLButtonElement>;
}>;

export function ShareButton({ visible, onClick, buttonRef }: ShareButtonProps) {
  const fromMd = useMediaQuery(MD_QUERY);
  if (!visible) return null;
  const presentation = PRESENTATION[String(fromMd) as "true" | "false"];
  return (
    <Button
      aria-label="Chia sẻ lịch trình"
      className="min-w-touch"
      icon={Share2}
      onClick={onClick}
      ref={buttonRef}
      size="sm"
      variant={VARIANT[presentation]}
    >
      <span className="sr-only md:not-sr-only">Chia sẻ</span>
    </Button>
  );
}
