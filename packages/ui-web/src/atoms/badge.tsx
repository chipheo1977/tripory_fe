import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

const badgeVariants = cva('inline-flex items-center gap-inline-xs rounded-subtle px-inline-sm py-inline-xs text-label font-semibold', {
  variants: {
    variant: {
      neutral: 'bg-surface-muted text-text',
      primary: 'bg-primary-subtle text-accent',
      success: 'bg-success-subtle text-success',
      warning: 'bg-warning-subtle text-warning',
      danger: 'bg-danger-subtle text-danger',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span {...props} className={badgeVariants({ className, variant })} data-variant={variant ?? 'neutral'} />;
}

export { badgeVariants };
