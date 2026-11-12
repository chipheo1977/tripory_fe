// Mờ dần ở mép còn nội dung bị cắt của một hàng cuộn ngang (gợi ý có thể vuốt/kéo); không nhận chuột.
// Dùng chung cho thanh tab của editor (`DayTabs`) và dải chip ngày của trang công khai (`DayChipStrip`).
const FADE_CLASS = { start: "left-0 bg-linear-to-r", end: "right-0 bg-linear-to-l" } as const;

export function EdgeFade({ visible, side }: Readonly<{ visible: boolean; side: keyof typeof FADE_CLASS }>) {
  if (!visible) return null;
  return <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 w-stack-lg from-surface to-transparent ${FADE_CLASS[side]}`} />;
}
