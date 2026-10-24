import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../atoms/icon';
import { cn } from '../lib/cn';

export type InlineAlertProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * Khối lỗi nằm ngay trong form (D-05). Không có nút đóng; không render gì khi không có nội dung,
 * để caller luôn đặt component này vào cây mà không cần `&&`.
 * Nội dung (copy nghiệp vụ) luôn do caller truyền vào, package không biết thông điệp nào.
 */
export function InlineAlert({ children, className }: InlineAlertProps) {
  if (children == null || children === '' || children === false) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-control-gap rounded-control border border-danger bg-danger-subtle p-stack-md text-body text-danger',
        className,
      )}
      role="alert"
    >
      <Icon className="text-danger" icon={CircleAlert} size="md" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
