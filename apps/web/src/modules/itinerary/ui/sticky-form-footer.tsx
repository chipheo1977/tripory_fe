"use client";

// Chân form dính đáy của form tạo (D-66, D-12): "Hủy" và "Tạo lịch trình" luôn một hàng ở mọi cỡ để chân form không cao
// thêm khi bàn phím ảo mở. PHẢI đặt ở cuối `<form>` (sticky chỉ dính trong khối cha). `-mx/-mb-stack-lg` bù padding
// `p-stack-lg` của Dialog/Sheet để chân form tràn ngang và sát mép dưới. Nút gửi dùng `loading`, không `disabled`,
// theo mẫu Phase 3; chặn gửi lần hai là việc của container.
import { Button } from "@tripory/ui-web";
import { SubmitStatus } from "@/components/submit-status";

export type StickyFormFooterProps = Readonly<{
  pending: boolean;
  onCancel(): void;
  submitLabel?: string;
}>;

export function StickyFormFooter({ pending, onCancel, submitLabel = "Tạo lịch trình" }: StickyFormFooterProps) {
  return (
    <div className="sticky bottom-0 z-sticky -mx-stack-lg -mb-stack-lg mt-stack-md border-t border-border bg-surface-elevated px-stack-lg pt-stack-md pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))]">
      <div className="flex gap-inline-sm sm:justify-end">
        <Button className="flex-1 sm:flex-none" disabled={pending} onClick={onCancel} type="button" variant="secondary">
          Hủy
        </Button>
        <Button className="flex-1 sm:flex-none" loading={pending} loadingLabel="Đang tạo…" type="submit">
          {submitLabel}
        </Button>
      </div>
      <SubmitStatus pending={pending} />
    </div>
  );
}
