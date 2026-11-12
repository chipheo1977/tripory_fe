"use client";

// Viên thuốc chuyển Bài viết/Bản đồ (D-09, UI-SPEC §Viên thuốc chuyển chế độ): nhóm chọn một có tên truy cập "Chế độ xem".
// Bốn kiểu nền theo vị trí đặt (nơi gọi chọn): `inline` trong header, `floating`/`dock` nổi dưới `lg`, `bar` thanh trên.
// Icon ẩn dưới `sm` để viên thuốc đủ gọn ở 320px. Tự bàn giao focus khi bị gỡ và mount lại ở chỗ khác.
import { SegmentedControl, SegmentedControlItem } from "@tripory/ui-web";
import { BookOpen, Map as MapIcon } from "lucide-react";
import { useRef } from "react";
import { parsePublicView, type PublicView } from "./public-view";
import { usePillFocusHandoff } from "./use-pill-focus-handoff";

export type ViewModeToggleVariant = "inline" | "floating" | "bar" | "dock";

export type ViewModeToggleProps = Readonly<{
  view: PublicView;
  onViewChange(view: PublicView): void;
  variant: ViewModeToggleVariant;
}>;

const VARIANT_CLASS: Readonly<Record<ViewModeToggleVariant, string>> = {
  inline: "bg-surface-muted",
  floating: "pointer-events-auto bg-surface-elevated shadow-overlay",
  bar: "bg-surface-muted",
  dock: "pointer-events-auto bg-surface-elevated shadow-overlay",
};

const ICON_CLASS = "hidden sm:inline-flex";

export function ViewModeToggle({ view, onViewChange, variant }: ViewModeToggleProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  usePillFocusHandoff(rootRef);
  return (
    <span className="contents" ref={rootRef}>
      <SegmentedControl
        aria-label="Chế độ xem"
        className={VARIANT_CLASS[variant]}
        data-view-mode-toggle=""
        onValueChange={(next) => onViewChange(parsePublicView(next))}
        value={view}
      >
        <SegmentedControlItem icon={BookOpen} iconClassName={ICON_CLASS} value="article">
          Bài viết
        </SegmentedControlItem>
        <SegmentedControlItem icon={MapIcon} iconClassName={ICON_CLASS} value="map">
          Bản đồ
        </SegmentedControlItem>
      </SegmentedControl>
    </span>
  );
}
