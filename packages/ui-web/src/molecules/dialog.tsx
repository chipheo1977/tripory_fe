'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Icon } from '../atoms/icon';
import { cn } from '../lib/cn';

const dialogContentVariants = cva(
  'fixed left-1/2 top-1/2 z-modal flex max-h-[calc(100dvh-var(--semantic-space-section))] max-w-[calc(100vw-var(--semantic-space-section))] -translate-x-1/2 -translate-y-1/2 flex-col gap-stack-md overflow-y-auto rounded-overlay border border-border bg-surface-elevated p-stack-lg text-text shadow-overlay outline-hidden transition-[transform,opacity] duration-(--semantic-motion-duration-normal) ease-standard data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
  {
    variants: {
      size: {
        sm: 'w-(--dialog-width-sm)',
        md: 'w-(--dialog-width-md)',
        lg: 'w-(--dialog-width-lg)',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const Dialog = BaseDialog.Root;

export function DialogTrigger({ className, ...props }: ComponentProps<typeof BaseDialog.Trigger>) {
  return (
    <BaseDialog.Trigger
      {...props}
      className={cn(
        'inline-flex min-h-touch items-center justify-center rounded-control border border-border bg-surface px-stack-md text-label font-semibold text-text transition-colors duration-(--semantic-motion-duration-fast) hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        className,
      )}
    />
  );
}

export function DialogBackdrop({ className, ...props }: ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      {...props}
      data-dialog-backdrop=""
      className={cn(
        'fixed inset-0 z-overlay min-h-dvh bg-overlay transition-opacity duration-(--semantic-motion-duration-normal) ease-standard data-starting-style:opacity-0 data-ending-style:opacity-0',
        className,
      )}
    />
  );
}

type DialogContentProps = ComponentProps<typeof BaseDialog.Popup> &
  VariantProps<typeof dialogContentVariants> & {
    /** Hiện nút X "Đóng" ở góc phải trên; cùng đường đóng với Esc. Caller thêm `pr-touch` cho tiêu đề. */
    showCloseButton?: boolean;
    /** Vô hiệu nút X khi đang gọi dữ liệu. */
    closeDisabled?: boolean;
  };

function DialogCloseButton({ visible, disabled }: { visible: boolean; disabled: boolean }) {
  if (!visible) return null;
  return (
    <BaseDialog.Close
      aria-label="Đóng"
      className="absolute right-stack-md top-stack-md inline-flex min-h-touch min-w-touch items-center justify-center rounded-control text-text transition-colors duration-(--semantic-motion-duration-fast) hover:not-data-disabled:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:cursor-not-allowed data-disabled:text-disabled"
      data-base-ui-swipe-ignore=""
      disabled={disabled}
    >
      <Icon icon={X} size="sm" />
    </BaseDialog.Close>
  );
}

export function DialogContent({
  children,
  className,
  closeDisabled = false,
  showCloseButton = false,
  size,
  ...props
}: DialogContentProps) {
  return (
    <BaseDialog.Portal>
      <DialogBackdrop />
      <BaseDialog.Viewport className="fixed inset-0 z-modal">
        <BaseDialog.Popup {...props} className={dialogContentVariants({ className, size })}>
          <DialogCloseButton disabled={closeDisabled} visible={showCloseButton} />
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title {...props} className={cn('text-heading font-semibold text-text', className)} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof BaseDialog.Description>) {
  return <BaseDialog.Description {...props} className={cn('text-body text-muted', className)} />;
}

export function DialogClose({ className, ...props }: ComponentProps<typeof BaseDialog.Close>) {
  return (
    <BaseDialog.Close
      {...props}
      className={cn(
        'inline-flex min-h-touch items-center justify-center rounded-control border border-border bg-surface px-stack-md text-label font-semibold text-text transition-colors duration-(--semantic-motion-duration-fast) hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        className,
      )}
    />
  );
}

export const DialogPortal = BaseDialog.Portal;
export const DialogViewport = BaseDialog.Viewport;
export { dialogContentVariants };
