"use client";

// Thanh viên thuốc chuyển chế độ dính đáy sheet (dưới `lg`, UI-SPEC §Viên thuốc chuyển chế độ). Dùng đúng cơ chế thanh dính
// của "Thêm điểm đến" (`TimelineAddBar`: `sticky bottom-0` trong vùng cuộn có `bottom = hiddenBottom`), nên luôn sát đáy màn
// hình ở cả ba mức của sheet và không bị sheet che. Từ `lg` viên thuốc nằm trên header nên thanh này không render.
import { TimelineAddBar } from "./timeline-add-bar";
import type { PublicView } from "./public-view";
import { ViewModeToggle } from "./view-mode-toggle";

export type PublicPillBarProps = Readonly<{
  visible: boolean;
  view: PublicView;
  onViewChange(view: PublicView): void;
}>;

export function PublicPillBar({ visible, view, onViewChange }: PublicPillBarProps) {
  if (!visible) return null;
  return (
    <TimelineAddBar>
      <div className="flex justify-center">
        <ViewModeToggle onViewChange={onViewChange} variant="bar" view={view} />
      </div>
    </TimelineAddBar>
  );
}
