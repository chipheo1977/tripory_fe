"use client";

import { canPublish, type Itinerary } from "@tripory/itinerary";
import { Button, cn, Icon, Tooltip, TooltipContent, TooltipTrigger } from "@tripory/ui-web";
import { Globe } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { useMediaQuery } from "./use-media-query";

export const PUBLISH_BLOCKED_HINT = "Thêm ít nhất 1 điểm đến để xuất bản";

/** Trùng breakpoint `lg` của Tailwind (1024px). */
const LG_QUERY = "(min-width: 1024px)";

/** Trùng breakpoint `md` của Tailwind (768px). */
const MD_QUERY = "(min-width: 768px)";

/** `min-w-touch`: dưới `md` nút chỉ còn icon nên cần vùng chạm 44px theo cả chiều ngang. */
const BASE_CLASSES = "min-w-touch";

/**
 * Dưới `md`: variant `ghost`, không khung/nền, trạng thái chỉ hiện qua màu icon. Lớp màu dùng tiền tố variant
 * (`not-aria-disabled:`, `aria-disabled:`) để thắng `text-text` của ghost mà không phụ thuộc thứ tự CSS thường.
 */
const NARROW_ALLOWED_CLASSES = cn(BASE_CLASSES, "not-aria-disabled:text-primary");
const NARROW_BLOCKED_CLASSES = cn(
  BASE_CLASSES,
  "aria-disabled:cursor-not-allowed aria-disabled:text-disabled aria-disabled:hover:not-data-disabled:bg-transparent",
);

/** Từ `md`: nút `primary` có chữ; bị chặn thì trông như disabled. */
const WIDE_ALLOWED_CLASSES = BASE_CLASSES;
const WIDE_BLOCKED_CLASSES = cn(
  BASE_CLASSES,
  "aria-disabled:cursor-not-allowed aria-disabled:border-border aria-disabled:bg-surface-muted aria-disabled:text-disabled aria-disabled:hover:not-data-disabled:bg-surface-muted",
);

type Presentation = "narrow" | "wide";

const PRESENTATION_BY_FROM_MD = { true: "wide", false: "narrow" } as const;

const VARIANT_BY_PRESENTATION = { narrow: "ghost", wide: "primary" } as const;

const CLASSES_BY_PRESENTATION = {
  narrow: { allowed: NARROW_ALLOWED_CLASSES, blocked: NARROW_BLOCKED_CLASSES },
  wide: { allowed: WIDE_ALLOWED_CLASSES, blocked: WIDE_BLOCKED_CLASSES },
} as const;

/** Thuộc tính của nút theo `canPublish`: chặn thì `aria-disabled` + trỏ tới lời giải thích. */
function stateAttributes(allowed: boolean, hintId: string, presentation: Presentation) {
  const classes = CLASSES_BY_PRESENTATION[presentation];
  if (allowed) return { className: classes.allowed };
  return { "aria-describedby": hintId, "aria-disabled": true as const, className: classes.blocked };
}

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
  const fromMd = useMediaQuery(MD_QUERY);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (itinerary.isPublic) return null;

  const presentation = PRESENTATION_BY_FROM_MD[String(fromMd) as "true" | "false"];

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
          {...stateAttributes(allowed, hintId, presentation)}
          onBlur={() => onHintFocusChange?.(false)}
          onClick={handleClick}
          onFocus={() => onHintFocusChange?.(true)}
          size="sm"
          variant={VARIANT_BY_PRESENTATION[presentation]}
        >
          <Icon className="md:hidden" icon={Globe} size="sm" />
          <span className="sr-only md:not-sr-only">Xuất bản</span>
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
