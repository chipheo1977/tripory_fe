'use client';

import { Field } from '@base-ui/react/field';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type FormFieldProps = Omit<Field.Root.Props, 'className'> & { className?: string };
export type FormFieldLabelProps = Omit<Field.Label.Props, 'className'> & {
  className?: string;
  required?: boolean;
};
export type FormFieldDescriptionProps = Omit<Field.Description.Props, 'className'> & { className?: string };
export type FormFieldErrorProps = Omit<Field.Error.Props, 'className' | 'children'> & {
  children: ReactNode;
  className?: string;
};

export function FormField({ className, ...props }: FormFieldProps) {
  return <Field.Root {...props} className={cn('flex w-full flex-col items-start gap-stack-sm', className)} />;
}

/** Dấu * chỉ để nhìn; chữ "bắt buộc" ẩn khỏi mắt nhưng trình đọc màn hình vẫn đọc. */
function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-danger">*</span>
      <span className="sr-only">(bắt buộc)</span>
    </>
  );
}

export function FormFieldLabel({ children, className, required = false, ...props }: FormFieldLabelProps) {
  return (
    <Field.Label {...props} className={cn('inline-flex min-h-touch items-center gap-inline-xs text-label font-semibold text-text', className)}>
      <span>{children}</span>
      {required ? <RequiredMark /> : null}
    </Field.Label>
  );
}

export function FormFieldDescription({ className, ...props }: FormFieldDescriptionProps) {
  return <Field.Description {...props} className={cn('text-label text-muted', className)} />;
}

export function FormFieldError({ className, ...props }: FormFieldErrorProps) {
  return <Field.Error {...props} aria-live="polite" className={cn('text-label text-danger', className)} role="status" />;
}
