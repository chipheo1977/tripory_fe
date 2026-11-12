"use client";

// Link "Sửa" tới editor của chủ (D-23). `visible` do nơi gọi truyền từ `canEdit` của domain; BE vẫn chặn mọi lệnh ghi của
// người không phải chủ (T-04-58). `collapse`: dưới `md` chỉ còn icon, chữ "Sửa" chỉ cho trình đọc màn hình.
import { buttonVariants, cn, Icon } from "@tripory/ui-web";
import { SquarePen } from "lucide-react";
import Link from "next/link";
import { useMediaQuery } from "./use-media-query";

/** Trùng breakpoint `md` của Tailwind (768px). */
const MD_QUERY = "(min-width: 768px)";

export type EditLinkProps = Readonly<{
  itineraryId: string;
  visible: boolean;
  collapse: boolean;
}>;

const VARIANT = { compact: "ghost", full: "secondary" } as const;
const LABEL_CLASS = { compact: "sr-only", full: "" } as const;

export function EditLink({ itineraryId, visible, collapse }: EditLinkProps) {
  const fromMd = useMediaQuery(MD_QUERY);
  if (!visible) return null;
  const presentation = collapse && !fromMd ? "compact" : "full";
  return (
    <Link
      aria-label="Sửa lịch trình"
      className={cn(buttonVariants({ size: "sm", variant: VARIANT[presentation] }), "min-w-touch")}
      href={`/itineraries/${itineraryId}/edit`}
    >
      <Icon icon={SquarePen} size="sm" />
      <span className={LABEL_CLASS[presentation]}>Sửa</span>
    </Link>
  );
}
