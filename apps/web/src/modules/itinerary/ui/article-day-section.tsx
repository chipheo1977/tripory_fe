// Một mục ngày của chế độ Bài viết (D-04, D-05, UI-SPEC §ArticleDaySection). Vẽ cả ngày trống ("Chưa có điểm").
// `scrollMarginTop` do nơi ghép truyền (px, bằng chiều cao khối dính + dải chip + khoảng thở) để cuộn tới không bị che; không
// tạo biến CSS mới (guard token cấm biến mồ côi). `h2` nhận focus bằng `headingRef` khi người dùng bấm chip ngày (D-06).
import type { DayView } from "@tripory/itinerary";
import { useId, type Ref } from "react";
import { ArticleWaypoint } from "./article-waypoint";
import { dayAnchorId, daySectionMeta, daySectionTitle } from "./public-format";

export type ArticleDaySectionProps = Readonly<{
  day: DayView;
  /** Từ ngày thứ hai: vạch ngăn phía trên. */
  showDivider: boolean;
  scrollMarginTop?: number;
  headingRef?: Ref<HTMLHeadingElement>;
}>;

function DayMeta({ text }: Readonly<{ text: string | null }>) {
  if (text === null) return null;
  return <p className="text-label font-regular tabular-nums text-muted">{text}</p>;
}

function DayBody({ day }: Readonly<{ day: DayView }>) {
  if (day.waypoints.length === 0) {
    return <p className="mt-stack-lg text-body text-muted">Chưa có điểm</p>;
  }
  return (
    <ol aria-label={`Điểm đến Ngày ${day.dayNumber}`} className="mt-stack-lg flex flex-col gap-stack-lg">
      {day.waypoints.map((waypoint, index) => (
        <ArticleWaypoint
          address={waypoint.address}
          dayNumber={day.dayNumber}
          key={waypoint.id}
          latitude={waypoint.coordinate.latitude}
          longitude={waypoint.coordinate.longitude}
          name={waypoint.name}
          notes={waypoint.notes}
          position={index + 1}
        />
      ))}
    </ol>
  );
}

export function ArticleDaySection({ day, showDivider, scrollMarginTop = 0, headingRef }: ArticleDaySectionProps) {
  const headingId = useId();
  const divider = showDivider ? "border-t border-border pt-section" : "";
  return (
    <section
      aria-labelledby={headingId}
      className={divider}
      id={dayAnchorId(day.dayNumber)}
      style={{ scrollMarginTop }}
    >
      <h2
        className="break-words text-heading font-semibold text-text outline-hidden"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
      >
        {daySectionTitle(day)}
      </h2>
      <DayMeta text={daySectionMeta(day.waypoints.length, day.distanceKm)} />
      <DayBody day={day} />
    </section>
  );
}
