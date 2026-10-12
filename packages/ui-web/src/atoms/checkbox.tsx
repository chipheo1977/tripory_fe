'use client';

import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check, Minus } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

export type CheckboxProps = ComponentProps<typeof BaseCheckbox.Root> & { label: ReactNode };

export function Checkbox({ className, indeterminate = false, label, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex min-h-touch cursor-pointer items-center gap-control-gap text-body text-text has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:text-disabled">
      <BaseCheckbox.Root
        {...props}
        className={`inline-flex size-(--checkbox-size) shrink-0 items-center justify-center rounded-subtle border border-border bg-input text-primary-foreground transition-colors duration-(--semantic-motion-duration-fast) ease-standard data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:bg-surface-muted ${className ?? ''}`.trim()}
        indeterminate={indeterminate}
      >
        <BaseCheckbox.Indicator className="inline-flex items-center justify-center">
          {indeterminate ? <Minus aria-hidden /> : <Check aria-hidden />}
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      <span>{label}</span>
    </label>
  );
}
