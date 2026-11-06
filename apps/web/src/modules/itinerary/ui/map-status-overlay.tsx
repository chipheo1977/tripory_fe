"use client";

// Chip thông tin ở góc trên trái bản đồ khi lịch trình chưa có điểm nào (D-121). Không tương tác; bề rộng tối đa chừa chỗ
// cột nút zoom bên phải và ba khoảng đệm.
import { Icon } from "@tripory/ui-web";
import { MapPin } from "lucide-react";

export type MapStatusOverlayProps = Readonly<{ visible: boolean }>;

const MAX_WIDTH = "calc(100% - var(--semantic-size-control-lg) - 3 * var(--semantic-space-stack-md))";

export function MapStatusOverlay({ visible }: MapStatusOverlayProps) {
  if (!visible) return null;
  return (
    <p
      className="pointer-events-none absolute left-stack-md top-stack-md flex items-center gap-inline-xs rounded-pill bg-surface-elevated px-stack-md py-inline-sm text-label text-text shadow-md"
      style={{ maxWidth: MAX_WIDTH }}
    >
      <Icon className="text-muted" icon={MapPin} size="sm" />
      Thêm điểm đến để thấy trên bản đồ
    </p>
  );
}
