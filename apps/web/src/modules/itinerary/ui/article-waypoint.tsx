// Một điểm trong mục ngày của chế độ Bài viết (D-03, UI-SPEC §ArticleWaypoint). Tên, địa chỉ, ghi chú là text node của React
// (ghi chú giữ xuống dòng bằng CSS `white-space: pre-line`); không HTML thô (T-05-24). Link ngoài có `rel="noopener noreferrer"`.
import { cn, Icon, mapToneClass } from "@tripory/ui-web";
import { ExternalLink } from "lucide-react";
import { googleMapsUrl, mapsLinkLabel } from "./public-format";

export type ArticleWaypointProps = Readonly<{
  /** Số thứ tự trong ngày, tính từ 1. */
  position: number;
  dayNumber: number;
  name: string;
  address: string | null;
  notes: string | null;
  latitude: number;
  longitude: number;
}>;

function WaypointAddress({ text }: Readonly<{ text: string | null }>) {
  if (text === null) return null;
  return <p className="break-words text-label font-regular text-muted">{text}</p>;
}

function WaypointNotes({ text }: Readonly<{ text: string | null }>) {
  if (text === null) return null;
  return <p className="mt-inline-sm break-words whitespace-pre-line text-body text-text">{text}</p>;
}

export function ArticleWaypoint({ position, dayNumber, name, address, notes, latitude, longitude }: ArticleWaypointProps) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-stack-md">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-(--map-pin-size) shrink-0 items-center justify-center rounded-pill text-label font-semibold tabular-nums text-text-inverse",
          mapToneClass(dayNumber),
        )}
      >
        {position}
      </span>
      <div className="flex min-w-0 flex-col gap-inline-xs">
        <h3 className="break-words text-body font-semibold text-text">{name}</h3>
        <WaypointAddress text={address} />
        <WaypointNotes text={notes} />
        <a
          aria-label={mapsLinkLabel(name)}
          className="inline-flex min-h-touch items-center gap-inline-xs self-start text-label font-semibold text-text underline underline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          href={googleMapsUrl(latitude, longitude)}
          rel="noopener noreferrer"
          target="_blank"
        >
          Mở trong Google Maps
          <Icon icon={ExternalLink} size="sm" />
        </a>
      </div>
    </li>
  );
}
