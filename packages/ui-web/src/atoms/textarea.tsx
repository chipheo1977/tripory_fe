'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { useRef } from 'react';
import { cn } from '../lib/cn';
import { canShowClear, clearControl, FieldClearButton, useControlHasValue } from './field-adornments';

const textareaVariants = cva(
  'w-full min-h-(--textarea-min-height) resize-y rounded-control border border-border bg-input px-inline-sm py-inline-sm text-body text-text placeholder:text-placeholder transition-colors duration-(--semantic-motion-duration-fast) ease-standard hover:not-disabled:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-disabled read-only:bg-surface-muted aria-invalid:border-danger',
  {
    variants: { size: { md: 'min-h-(--textarea-min-height)', lg: 'min-h-(--textarea-min-height)' } },
    defaultVariants: { size: 'md' },
  },
);

export type TextareaProps = ComponentProps<'textarea'> &
  VariantProps<typeof textareaVariants> & {
    allowClear?: boolean;
    clearLabel?: string;
    wrapperClassName?: string;
  };

type ClearableTextareaProps = Omit<TextareaProps, 'allowClear'>;

function ClearableTextarea({ className, clearLabel, size, wrapperClassName, ...props }: ClearableTextareaProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasValue = useControlHasValue(wrapperRef, String(props.value ?? props.defaultValue ?? '') !== '');
  const showClear = canShowClear(true, hasValue, props.disabled, props.readOnly);

  return (
    <div className={cn('relative w-full', wrapperClassName)} ref={wrapperRef}>
      <textarea {...props} className={cn(textareaVariants({ className, size }), 'pr-page-block')} />
      <FieldClearButton label={clearLabel} onClear={() => clearControl(wrapperRef.current)} placement="top" visible={showClear} />
    </div>
  );
}

export function Textarea({ allowClear = false, className, clearLabel, size, wrapperClassName, ...props }: TextareaProps) {
  if (!allowClear) return <textarea {...props} className={textareaVariants({ className, size })} />;
  return <ClearableTextarea {...props} className={className} clearLabel={clearLabel} size={size} wrapperClassName={wrapperClassName} />;
}

export { textareaVariants };
