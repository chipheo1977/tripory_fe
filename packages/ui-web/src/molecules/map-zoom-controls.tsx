import { Minus, Plus } from 'lucide-react';
import { Icon } from '../atoms/icon';
import { IconButton } from '../atoms/icon-button';
import { cn } from '../lib/cn';

export type MapZoomControlsProps = Readonly<{
  onZoomIn(): void;
  onZoomOut(): void;
  /** `false` ở mức phóng to tối đa: nút bị vô hiệu. */
  canZoomIn: boolean;
  canZoomOut: boolean;
  visible?: boolean;
  /** Vị trí do nơi dùng quyết định (ví dụ `absolute` ở góc bản đồ). */
  className?: string;
  labels?: Readonly<{ group?: string; zoomIn?: string; zoomOut?: string }>;
}>;

/**
 * Nhóm hai nút phóng to/thu nhỏ (D-128). Nút 32px (`size="sm"`, token `control-sm`), lớn hơn vùng chạm tối thiểu
 * `touch-min` (24px) nên không cần mở rộng vùng bấm. Dùng được bằng Tab, Enter, Space.
 */
export function MapZoomControls({ onZoomIn, onZoomOut, canZoomIn, canZoomOut, visible = true, className, labels }: MapZoomControlsProps) {
  if (!visible) return null;
  return (
    <div aria-label={labels?.group ?? 'Thu phóng bản đồ'} className={cn('flex flex-col gap-inline-xs', className)} role="group">
      <IconButton aria-label={labels?.zoomIn ?? 'Phóng to'} disabled={!canZoomIn} onClick={onZoomIn} size="sm" variant="secondary">
        <Icon icon={Plus} size="sm" />
      </IconButton>
      <IconButton aria-label={labels?.zoomOut ?? 'Thu nhỏ'} disabled={!canZoomOut} onClick={onZoomOut} size="sm" variant="secondary">
        <Icon icon={Minus} size="sm" />
      </IconButton>
    </div>
  );
}
