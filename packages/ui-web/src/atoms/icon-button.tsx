'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

const iconButtonVariants = cva(
  'inline-flex min-h-touch min-w-touch items-center justify-center rounded-control border transition-colors duration-(--semantic-motion-duration-fast) ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:cursor-not-allowed data-disabled:border-border data-disabled:bg-surface-muted data-disabled:text-disabled',
  {
    variants: {
      variant: {
        ghost: 'border-transparent bg-transparent text-text hover:not-data-disabled:bg-surface-muted',
        secondary: 'border-border bg-surface text-text hover:not-data-disabled:border-border-strong hover:not-data-disabled:bg-surface-muted',
        danger: 'border-danger bg-danger text-primary-foreground hover:not-data-disabled:bg-danger-hover',
      },
      size: { sm: 'h-control-sm w-control-sm', md: 'h-control-md w-control-md', lg: 'h-control-lg w-control-lg' },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

type BaseIconButtonProps = Omit<ComponentProps<typeof BaseButton>, 'aria-label'>;
export type IconButtonProps = BaseIconButtonProps & VariantProps<typeof iconButtonVariants> & { 'aria-label': string };

export function IconButton({ className, size, variant, ...props }: IconButtonProps) {
  return <BaseButton {...props} className={iconButtonVariants({ className, size, variant })} />;
}

export { iconButtonVariants };
