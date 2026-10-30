import type { ComponentProps } from 'react';

export type LabelProps = ComponentProps<'label'> & {
  optional?: boolean;
  required?: boolean;
};

/** Dấu * chỉ để nhìn; chữ "bắt buộc" ẩn khỏi mắt nhưng trình đọc màn hình vẫn đọc. */
function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-danger">*</span>
      <span className="sr-only">(bắt buộc)</span>
    </>
  );
}

export function Label({ children, className, optional = false, required = false, ...props }: LabelProps) {
  return (
    <label {...props} className={`inline-flex min-h-touch items-center gap-inline-xs text-label font-semibold text-text ${className ?? ''}`.trim()}>
      <span>{children}</span>
      {required ? <RequiredMark /> : null}
      {optional && !required ? <span className="font-regular text-muted">(không bắt buộc)</span> : null}
    </label>
  );
}
