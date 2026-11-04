import { CircleAlert, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../atoms/icon';
import { cn } from '../lib/cn';

export type InlineAlertProps = {
  children?: ReactNode;
  className?: string;
  /** `danger` (mặc định, `role="alert"`) cho lỗi; `info` (`role="status"`) cho thông tin không khẩn cấp. */
  variant?: 'danger' | 'info';
  /** Hành động đi kèm (ví dụ nút "Thử lại"). Mặc định không có, DOM giữ nguyên như trước. */
  action?: ReactNode;
};

function AlertAction({ children }: { children: ReactNode }) {
  if (children == null || children === false) return null;
  return <div className="w-full sm:ml-auto sm:w-auto sm:shrink-0">{children}</div>;
}

/**
 * Khối thông báo nằm ngay trong form (D-05). Không có nút đóng; không render gì khi không có nội dung,
 * để caller luôn đặt component này vào cây mà không cần `&&`.
 * Nội dung (copy nghiệp vụ) luôn do caller truyền vào, package không biết thông điệp nào.
 */
export function InlineAlert({ children, className, variant = 'danger', action }: InlineAlertProps) {
  if (children == null || children === '' || children === false) return null;

  const info = variant === 'info';

  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-control-gap rounded-control border p-stack-md text-body sm:flex-nowrap',
        info ? 'border-border bg-surface-muted text-text' : 'border-danger bg-danger-subtle text-danger',
        className,
      )}
      role={info ? 'status' : 'alert'}
    >
      <Icon className={info ? 'text-muted' : 'text-danger'} icon={info ? Info : CircleAlert} size="md" />
      <span className="min-w-0 flex-1">{children}</span>
      <AlertAction>{action}</AlertAction>
    </div>
  );
}
