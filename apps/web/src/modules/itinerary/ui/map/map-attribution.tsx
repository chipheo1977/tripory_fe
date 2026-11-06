// Ghi công nguồn bản đồ (D-114). Thay AttributionControl mặc định (tự thu gọn thành nút "i" dưới 640px)
// để ba link luôn nhìn thấy khi bản đồ sẵn sàng, đúng điều khoản OSM (ODbL) và OpenFreeMap.
import { cn } from "@tripory/ui-web";
import type { CSSProperties, ReactNode } from "react";

export type MapAttributionProps = Readonly<{
  visible?: boolean;
  className?: string;
  /** Vị trí động (ví dụ `bottom` theo phần bị sheet che); class tĩnh đi qua `className`. */
  style?: CSSProperties;
}>;

const LINK_CLASS =
  "underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

function AttributionLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <a className={LINK_CLASS} href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}

export function MapAttribution({ visible = true, className, style }: MapAttributionProps) {
  if (!visible) return null;
  return (
    <p className={cn("max-w-full rounded-subtle bg-surface/80 px-inline-xs text-label text-muted", className)} style={style}>
      <span className="sr-only">Nguồn bản đồ: </span>
      <AttributionLink href="https://www.openstreetmap.org/copyright">© OpenStreetMap</AttributionLink>
      {" · "}
      <AttributionLink href="https://openfreemap.org">OpenFreeMap</AttributionLink>
      {" · "}
      <AttributionLink href="https://www.openmaptiles.org">OpenMapTiles</AttributionLink>
    </p>
  );
}
