'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { useRef } from 'react';
import { cn } from '../lib/cn';
import { canShowClear, clearControl, DatePickerIcon, FieldClearButton, openDatePicker, useControlHasValue } from './field-adornments';

const inputVariants = cva(
  'w-full rounded-control border border-border bg-input px-inline-sm text-body text-text placeholder:text-placeholder transition-colors duration-(--semantic-motion-duration-fast) ease-standard hover:not-disabled:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-disabled read-only:bg-surface-muted aria-invalid:border-danger',
  {
    variants: { size: { md: 'h-control-md', lg: 'h-control-lg' } },
    defaultVariants: { size: 'md' },
  },
);

export type InputProps = Omit<ComponentProps<typeof BaseInput>, 'size'> &
  VariantProps<typeof inputVariants> & {
    allowClear?: boolean;
    clearLabel?: string;
    wrapperClassName?: string;
  };

type AdornedInputProps = Omit<InputProps, 'allowClear'> & { clearable: boolean };

function AdornedInput({ className, clearable, clearLabel, size, wrapperClassName, ...props }: AdornedInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDate = props.type === 'date';
  const hasValue = useControlHasValue(wrapperRef, String(props.value ?? props.defaultValue ?? '') !== '', props.value !== undefined);
  const showClear = canShowClear(clearable, hasValue, props.disabled, props.readOnly);

  return (
    <div className={cn('relative w-full', wrapperClassName)} ref={wrapperRef}>
      <DatePickerIcon onPick={() => openDatePicker(wrapperRef.current)} visible={isDate} />
      <BaseInput
        {...props}
        className={cn(inputVariants({ className, size }), {
          'pl-section [&::-webkit-calendar-picker-indicator]:hidden': isDate,
          'pr-page-block': clearable,
        })}
      />
      <FieldClearButton label={clearLabel} onClear={() => clearControl(wrapperRef.current)} visible={showClear} />
    </div>
  );
}

export function Input({ allowClear, className, clearLabel, size, wrapperClassName, ...props }: InputProps) {
  const clearable = allowClear ?? props.type === 'date';
  const needsWrapper = clearable || props.type === 'date';
  if (!needsWrapper) return <BaseInput {...props} className={inputVariants({ className, size })} />;
  return <AdornedInput {...props} className={className} clearable={clearable} clearLabel={clearLabel} size={size} wrapperClassName={wrapperClassName} />;
}

export { inputVariants };
