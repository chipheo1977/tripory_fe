// Khung dùng chung của /login, /register, /settings/password (D-06): Card căn giữa ngang, rộng tối đa
// `max-w-form`, `h1` Display, rồi slot alert, slot form, slot footer theo đúng thứ tự dọc của UI-SPEC §Layout.
// Chỉ là khung: không có logic nghiệp vụ, form (react-hook-form + mutation) do plan 03-12 truyền vào.
import { Card } from "@tripory/ui-web";
import type { ReactNode } from "react";

export type AuthFormCardProps = Readonly<{
  title: string;
  /** Id của `h1`, để `<form aria-labelledby={titleId}>` trỏ vào. */
  titleId: string;
  /** Thường là `<InlineAlert>`; render ngay dưới tiêu đề, cách form 16px. */
  alert?: ReactNode;
  children: ReactNode;
  /** Link chuyển trang hoặc nút "Hủy"; cách phần trên 24px. */
  footer?: ReactNode;
}>;

export function AuthFormCard({ title, titleId, alert, children, footer }: AuthFormCardProps) {
  return (
    <Card className="mx-auto flex w-full max-w-form flex-col gap-stack-lg" padding="lg">
      <h1 className="text-display font-semibold text-text" id={titleId}>
        {title}
      </h1>
      <div className="flex flex-col gap-stack-md">
        {alert}
        {children}
      </div>
      {footer}
    </Card>
  );
}
