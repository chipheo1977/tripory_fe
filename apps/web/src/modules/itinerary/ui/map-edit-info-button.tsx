"use client";

// Nút bánh răng "Sửa thông tin" trên bản đồ, đứng đầu cột điều khiển góc phải trên (ngay trên nút zoom "+"). Cùng cỡ và kiểu
// với nút zoom (`IconButton secondary sm`, 32px, trên `touch-min` 24px). Chỉ hành vi mở "Thông tin chuyến đi" do nơi dùng truyền vào.
import { Icon, IconButton } from "@tripory/ui-web";
import { Settings } from "lucide-react";

export type MapEditInfoButtonProps = Readonly<{
  visible: boolean;
  onClick(): void;
}>;

const LABEL = "Sửa thông tin";

export function MapEditInfoButton({ visible, onClick }: MapEditInfoButtonProps) {
  if (!visible) return null;
  return (
    <IconButton aria-label={LABEL} onClick={onClick} size="sm" title={LABEL} variant="secondary">
      <Icon icon={Settings} size="sm" />
    </IconButton>
  );
}
