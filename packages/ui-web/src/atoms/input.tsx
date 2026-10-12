'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

const inputVariants = cva(
  'w-full rounded-control border border-border bg-input px-inline-sm text-body text-text placeholder:text-placeholder transition-colors duration-(--semantic-motion-duration-fast) ease-standard hover:not-disabled:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-disabled read-only:bg-surface-muted aria-invalid:border-danger',
  {
    variants: { size: { md: 'h-control-md', lg: 'h-control-lg' } },
    defaultVariants: { size: 'md' },
  },
);

export type InputProps = ComponentProps<typeof BaseInput> & VariantProps<typeof inputVariants>;

export function Input({ className, size, ...props }: InputProps) {
  return <BaseInput {...props} className={inputVariants({ className, size })} />;
}

export { inputVariants };
