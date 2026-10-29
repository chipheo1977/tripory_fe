"use client";

// Nút "Xuất bản" của header editor và dải giải thích dưới header (UI-SPEC §PublishButton; D-38, D-40).
//
// Chưa có điểm đến nào (không tính waypoint đang chờ xóa, `canPublish` của domain) thì nút dùng `aria-disabled`,
// KHÔNG dùng `disabled`: nút vẫn focus được và bấm vào vẫn giải thích được lý do. Lý do nằm ở phần tử `hintId`
// do `PublishHintStrip` giữ (luôn có trong DOM, ẩn bằng `hidden` nhưng vẫn là mô tả của nút qua `aria-describedby`):
//   - từ `lg`: cùng câu đó hiện thành tooltip khi hover/focus/bấm;
//   - dưới `lg`: chủ header cho `PublishHintStrip visible` khi nút đang focus (`onHintFocusChange`) hoặc trong
//     4 giây sau khi chạm (`onBlockedPress`).
// Đã xuất bản thì không render gì, và không có nút chia sẻ (D-40, thuộc Phase 5).
import { canPublish, type Itinerary } from "@tripory/itinerary";
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from "@tripory/ui-web";
import { useState, type MouseEvent } from "react";
import { useMediaQuery } from "./use-media-query";

export const PUBLISH_BLOCKED_HINT = "Thêm ít nhất 1 điểm đến để xuất bản";

/** Trùng breakpoint `lg` của Tailwind (1024px). */
const LG_QUERY = "(min-width: 1024px)";

const BLOCKED_CLASSES =
  "aria-disabled:cursor-not-allowed aria-disabled:border-border aria-disabled:bg-surface-muted aria-disabled:text-disabled aria-disabled:hover:not-data-disabled:bg-surface-muted";

export type PublishButtonProps = Readonly<{
  itinerary: Itinerary;
  /** Id waypoint đang chờ xóa (có thể hoàn tác): coi như đã mất khi tính `canPublish`. */
  pendingIds: ReadonlySet<string>;
  onRequestPublish(): void;
  /** Id của phần tử giải thích, do `PublishHintStrip` render. */
  hintId: string;
  /** Người dùng bấm/chạm lúc nút đang bị chặn: header dùng để hiện dải giải thích dưới `lg`. */
  onBlockedPress?(): void;
  /** Nút nhận hoặc mất focus: header dùng để hiện dải giải thích dưới `lg` trong lúc đang focus. */
  onHintFocusChange?(focused: boolean): void;
}>;

export function PublishButton({
  itinerary,
  pendingIds,
  onRequestPublish,
  hintId,
  onBlockedPress,
  onHintFocusChange,
}: PublishButtonProps) {
  const wide = useMediaQuery(LG_QUERY);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (itinerary.isPublic) return null;

  const allowed = canPublish(itinerary, pendingIds);
  const tooltipEnabled = wide && !allowed;

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (allowed) {
      onRequestPublish();
      return;
    }
    event.preventDefault();
    setTooltipOpen(true);
    onBlockedPress?.();
  };

  // Luôn giữ cùng một cây (Tooltip bọc nút, chỉ tắt khi không cần) để nút không bị dựng lại, mất focus, khi
  // `canPublish` đổi giữa lúc người dùng đang focus nó.
  return (
    <Tooltip
      disabled={!tooltipEnabled}
      onOpenChange={(next) => setTooltipOpen(next)}
      open={tooltipEnabled && tooltipOpen}
    >
      <TooltipTrigger closeOnClick={false} render={<span />}>
        <Button
          aria-describedby={allowed ? undefined : hintId}
          aria-disabled={allowed ? undefined : true}
          className={cn(!allowed && BLOCKED_CLASSES)}
          onBlur={() => onHintFocusChange?.(false)}
          onClick={handleClick}
          onFocus={() => onHintFocusChange?.(true)}
          size="sm"
          variant="primary"
        >
          Xuất bản
        </Button>
      </TooltipTrigger>
      <TooltipContent>{PUBLISH_BLOCKED_HINT}</TooltipContent>
    </Tooltip>
  );
}

export type PublishHintStripProps = Readonly<{
  hintId: string;
  visible: boolean;
}>;

/**
 * Dải giải thích dưới header (dưới `lg`). Luôn có trong DOM để `aria-describedby` của nút trỏ được vào;
 * `visible` false thì ẩn bằng `hidden`. Từ `lg` luôn ẩn (tooltip thay thế).
 */
export function PublishHintStrip({ hintId, visible }: PublishHintStripProps) {
  return (
    <p
      className="bg-surface-muted px-page-inline py-inline-sm text-label text-muted lg:hidden"
      hidden={!visible}
      id={hintId}
    >
      {PUBLISH_BLOCKED_HINT}
    </p>
  );
}
