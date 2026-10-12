import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

const skeletonVariants = cva('animate-pulse bg-surface-muted', {
  variants: {
    variant: {
      text: 'h-inline-sm w-full rounded-subtle',
      circle: 'size-control-md rounded-pill',
      block: 'h-control-lg w-full rounded-container',
    },
  },
  defaultVariants: { variant: 'block' },
});

export type SkeletonProps = ComponentProps<'div'> & VariantProps<typeof skeletonVariants>;

export function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return <div {...props} aria-hidden="true" className={skeletonVariants({ className, variant })} data-variant={variant ?? 'block'} />;
}

export { skeletonVariants };
