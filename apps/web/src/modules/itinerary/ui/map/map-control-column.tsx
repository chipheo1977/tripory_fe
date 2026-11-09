import type { ReactNode } from "react";

export type MapControlColumnProps = Readonly<{
  visible: boolean;
  children: ReactNode;
}>;

/**
 * Cột điều khiển ở góc phải trên bản đồ, cách mép 16px (`stack-md`), các nút cách nhau 4px (`inline-xs`). Nơi dùng đặt
 * nút bổ sung phía trên nhóm zoom qua `children`; cột không biết nút đó làm gì.
 */
export function MapControlColumn({ visible, children }: MapControlColumnProps) {
  if (!visible) return null;
  return <div className="absolute right-stack-md top-stack-md flex flex-col gap-inline-xs">{children}</div>;
}
