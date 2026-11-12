// Link "Mở trong Google Maps" dùng chung cho chế độ Bài viết và chế độ Bản đồ (D-03). Mở tab mới với
// `rel="noopener noreferrer"` (T-05-25, T-05-49); tên điểm nằm trong `aria-label` để trình đọc màn hình phân biệt các link.
import { Icon } from "@tripory/ui-web";
import { ExternalLink } from "lucide-react";
import { googleMapsUrl, mapsLinkLabel } from "./public-format";

export type MapsLinkProps = Readonly<{
  name: string;
  latitude: number;
  longitude: number;
}>;

export function MapsLink({ name, latitude, longitude }: MapsLinkProps) {
  return (
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
  );
}
