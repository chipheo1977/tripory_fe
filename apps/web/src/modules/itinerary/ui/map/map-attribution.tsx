// Ghi công nguồn bản đồ (D-114, đổi 2026-11-06): thu gọn thành nút "i" luôn thấy; bấm mới mở dòng ghi công kề nút. Tự dựng
// thay vì dùng AttributionControl của MapLibre để kiểm soát vị trí theo sheet, chữ tiếng Việt và test; nội dung ba link giữ
// nguyên để đúng điều khoản OSM (ODbL), OpenMapTiles (CC BY 4.0) và OpenFreeMap.
import { cn, Icon, IconButton } from "@tripory/ui-web";
import { Info } from "lucide-react";
import { useId, type CSSProperties, type ReactNode } from "react";
import { useAttributionDisclosure } from "./use-attribution-disclosure";

export type MapAttributionProps = Readonly<{
  visible?: boolean;
  className?: string;
  /** Vị trí động (ví dụ `bottom` theo phần bị sheet che); class tĩnh đi qua `className`. */
  style?: CSSProperties;
}>;

const LABEL = "Ghi công bản đồ";
const LINK_CLASS =
  "inline-flex min-h-touch items-center underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

function AttributionLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <a className={LINK_CLASS} href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}

function Separator() {
  return <span aria-hidden="true">·</span>;
}

type AttributionPanelProps = Readonly<{ visible: boolean; id: string }>;

function AttributionPanel({ visible, id }: AttributionPanelProps) {
  if (!visible) return null;
  return (
    <p
      className="pointer-events-auto flex min-h-control-sm min-w-0 flex-wrap items-center gap-x-inline-xs rounded-control border border-border bg-surface px-inline-sm text-label text-muted shadow-sm"
      id={id}
    >
      <span className="sr-only">Nguồn bản đồ: </span>
      <AttributionLink href="https://www.openstreetmap.org/copyright">© OpenStreetMap</AttributionLink>
      <Separator />
      <AttributionLink href="https://openfreemap.org">OpenFreeMap</AttributionLink>
      <Separator />
      <AttributionLink href="https://www.openmaptiles.org">OpenMapTiles</AttributionLink>
    </p>
  );
}

export function MapAttribution({ visible = true, className, style }: MapAttributionProps) {
  const panelId = useId();
  const { open, toggle, rootRef, buttonRef } = useAttributionDisclosure();
  if (!visible) return null;
  // Nút đứng trước trong DOM (Tab: nút rồi tới link) nhưng `flex-row-reverse` đặt nút ở mép phải, chữ mở ra bên trái.
  return (
    <div className={cn("pointer-events-none flex flex-row-reverse items-end gap-inline-xs", className)} ref={rootRef} style={style}>
      <IconButton
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={LABEL}
        className="pointer-events-auto shrink-0"
        onClick={toggle}
        ref={buttonRef}
        size="sm"
        title={LABEL}
        variant="secondary"
      >
        <Icon icon={Info} size="sm" />
      </IconButton>
      <AttributionPanel id={panelId} visible={open} />
    </div>
  );
}
