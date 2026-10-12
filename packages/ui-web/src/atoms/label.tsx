import type { ComponentProps } from 'react';

export type LabelProps = ComponentProps<'label'> & {
  optional?: boolean;
  required?: boolean;
};

export function Label({ children, className, optional = false, required = false, ...props }: LabelProps) {
  return (
    <label {...props} className={`inline-flex min-h-touch items-center gap-inline-xs text-label font-semibold text-text ${className ?? ''}`.trim()}>
      <span>{children}</span>
      {required ? <span className="text-danger">(bắt buộc)</span> : null}
      {optional && !required ? <span className="font-regular text-muted">(không bắt buộc)</span> : null}
    </label>
  );
}
