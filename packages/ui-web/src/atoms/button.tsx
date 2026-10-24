'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import { Spinner } from './spinner';

const buttonVariants = cva(
  'relative inline-flex min-h-touch items-center justify-center gap-control-gap whitespace-nowrap rounded-control border text-label font-semibold transition-colors duration-(--semantic-motion-duration-fast) ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:cursor-not-allowed data-disabled:border-border data-disabled:bg-surface-muted data-disabled:text-disabled',
  {
    variants: {
      variant: {
        primary: 'border-primary bg-primary text-primary-foreground hover:not-data-disabled:bg-primary-hover',
        secondary: 'border-border bg-surface text-text hover:not-data-disabled:border-border-strong hover:not-data-disabled:bg-surface-muted',
        ghost: 'border-transparent bg-transparent text-text hover:not-data-disabled:bg-surface-muted',
        danger: 'border-danger bg-danger text-primary-foreground hover:not-data-disabled:bg-danger-hover',
      },
      size: {
        sm: 'h-control-sm px-inline-sm',
        md: 'h-control-md px-stack-md',
        lg: 'h-control-lg px-stack-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type BaseButtonProps = ComponentProps<typeof BaseButton>;
export type ButtonProps = BaseButtonProps &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    /** Nhãn thấy được khi `loading` (D-30). Không truyền thì giữ cách cũ: children ẩn, spinner phủ lên. */
    loadingLabel?: ReactNode;
  };

export function Button({ children, className, disabled, loading = false, loadingLabel, size, variant, ...props }: ButtonProps) {
  // Có loadingLabel thì thay hẳn children bằng spinner + nhãn để người dùng đọc được tiến trình; nút không đổi bề rộng đột ngột vì chỉ khác nội dung.
  const showLoadingLabel = loading && loadingLabel != null;

  return (
    <BaseButton
      {...props}
      aria-busy={loading || undefined}
      className={buttonVariants({ className, size, variant })}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
    >
      {showLoadingLabel ? (
        <>
          <Spinner decorative size="sm" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <span className={loading ? 'invisible' : undefined}>{children}</span>
          {loading ? <span aria-hidden className="absolute size-(--spinner-size-sm) animate-spin rounded-pill border border-current border-t-transparent" /> : null}
        </>
      )}
    </BaseButton>
  );
}

export { buttonVariants };
