'use client';

import { Toaster, toast as sonnerToast } from 'sonner';
import type { ExternalToast, ToasterProps } from 'sonner';
import type { ReactNode } from 'react';

export const toastDurations = { default: 5_000, extended: 8_000 } as const;

type ToastVariant = 'success' | 'error' | 'info' | 'warning';
/** `persistent`: không tự hết hạn (người dùng đóng hoặc app gọi `dismiss(id)`). Mặc định `false`. */
type NotifyOptions = Omit<ExternalToast, 'duration'> & { persistent?: boolean };

function ToastAnnouncement({ children, variant }: { children: ReactNode; variant: ToastVariant }) {
  const urgent = variant === 'error';
  return (
    <span aria-live={urgent ? 'assertive' : 'polite'} role={urgent ? 'alert' : 'status'}>
      {children}
    </span>
  );
}

function showToast(variant: ToastVariant, title: ReactNode, options: NotifyOptions = {}) {
  const { persistent = false, ...sonnerOptions } = options;
  const timed = variant === 'error' || options.action ? toastDurations.extended : toastDurations.default;
  const duration = persistent ? Infinity : timed;
  return sonnerToast[variant](<ToastAnnouncement variant={variant}>{title}</ToastAnnouncement>, { ...sonnerOptions, duration });
}

export const notify = {
  success: (title: ReactNode, options?: NotifyOptions) => showToast('success', title, options),
  error: (title: ReactNode, options?: NotifyOptions) => showToast('error', title, options),
  info: (title: ReactNode, options?: NotifyOptions) => showToast('info', title, options),
  warning: (title: ReactNode, options?: NotifyOptions) => showToast('warning', title, options),
  /** Toast có nút hoàn tác, KHÔNG tự hết hạn: app sở hữu đồng hồ và gọi `dismiss(id)` khi commit/hoàn tác. */
  undoable: (
    title: ReactNode,
    options: Readonly<{ actionLabel: string; onAction: () => void; onDismiss?: () => void }>,
  ) =>
    sonnerToast.info(<ToastAnnouncement variant="info">{title}</ToastAnnouncement>, {
      duration: Infinity,
      action: { label: options.actionLabel, onClick: () => options.onAction() },
      onDismiss: () => options.onDismiss?.(),
    }),
  dismiss: sonnerToast.dismiss,
} as const;

export function Toast(props: Omit<ToasterProps, 'theme' | 'visibleToasts' | 'duration'>) {
  return (
    <div data-toast-adapter="" data-theme="light" data-visible-toasts="3">
      <Toaster
        position="top-right"
        mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)', left: '1rem', right: '1rem' }}
        {...props}
        closeButton
        duration={toastDurations.default}
        theme="light"
        icons={{ ...props.icons, error: null }}
        visibleToasts={3}
        toastOptions={{
          ...props.toastOptions,
          unstyled: true,
          closeButtonAriaLabel: 'Đóng thông báo',
          classNames: {
            toast: 'group flex items-center gap-control-gap rounded-container border border-border bg-surface-elevated py-stack-md pl-stack-md pr-section text-body text-text shadow-md',
            content: 'flex min-w-0 flex-1 flex-col gap-inline-xs',
            title: 'font-semibold text-text group-data-[type=error]:text-danger',
            description: 'text-muted group-data-[type=error]:text-danger',
            actionButton: 'min-h-touch rounded-control border border-border bg-surface px-inline-sm text-text hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
            closeButton: 'absolute right-inline-xs top-inline-xs flex size-stack-lg items-center justify-center rounded-control bg-transparent text-current after:absolute after:left-1/2 after:top-1/2 after:size-touch after:-translate-x-1/2 after:-translate-y-1/2 after:content-[""] hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
            success: 'border-success bg-success-subtle text-success',
            error: 'border-danger bg-danger-subtle text-danger',
            info: 'border-border bg-surface text-text',
            warning: 'border-warning bg-warning-subtle text-warning',
            ...props.toastOptions?.classNames,
          },
        }}
      />
    </div>
  );
}
