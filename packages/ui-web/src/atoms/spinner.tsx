import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

const spinnerVariants = cva('inline-block animate-spin rounded-pill border border-current border-t-transparent', {
  variants: {
    size: {
      sm: 'size-(--spinner-size-sm)',
      md: 'size-(--spinner-size-md)',
      lg: 'size-(--spinner-size-lg)',
    },
  },
  defaultVariants: { size: 'md' },
});

type SpinnerBaseProps = Omit<ComponentProps<'span'>, 'aria-label'> & VariantProps<typeof spinnerVariants>;
export type SpinnerProps = SpinnerBaseProps & ({ decorative: true; label?: never } | { decorative?: false; label: string });

export function Spinner({ className, decorative = false, label, size, ...props }: SpinnerProps) {
  return (
    <span
      {...props}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className={spinnerVariants({ className, size })}
      role={decorative ? undefined : 'status'}
    />
  );
}

export { spinnerVariants };
