'use client';

import { Toaster, toast as sonnerToast } from 'sonner';
import type { ExternalToast, ToasterProps } from 'sonner';
import type { ReactNode } from 'react';

export const toastDurations = { default: 5_000, extended: 8_000 } as const;

type ToastVariant = 'success' | 'error' | 'info' | 'warning';
type NotifyOptions = Omit<ExternalToast, 'duration'>;

function ToastAnnouncement({ children, variant }: { children: ReactNode; variant: ToastVariant }) {
  const urgent = variant === 'error';
  return (
    <span aria-live={urgent ? 'assertive' : 'polite'} role={urgent ? 'alert' : 'status'}>
      {children}
    </span>
  );
}

function showToast(variant: ToastVariant, title: ReactNode, options: NotifyOptions = {}) {
  const duration = variant === 'error' || options.action ? toastDurations.extended : toastDurations.default;
  return sonnerToast[variant](<ToastAnnouncement variant={variant}>{title}</ToastAnnouncement>, { ...options, duration });
}

export const notify = {
  success: (title: ReactNode, options?: NotifyOptions) => showToast('success', title, options),
  error: (title: ReactNode, options?: NotifyOptions) => showToast('error', title, options),
  info: (title: ReactNode, options?: NotifyOptions) => showToast('info', title, options),
  warning: (title: ReactNode, options?: NotifyOptions) => showToast('warning', title, options),
  dismiss: sonnerToast.dismiss,
} as const;

export function Toast(props: Omit<ToasterProps, 'theme' | 'visibleToasts' | 'duration'>) {
  return (
    <div data-toast-adapter="" data-theme="light" data-visible-toasts="3">
      <Toaster
        {...props}
        closeButton
        duration={toastDurations.default}
        theme="light"
        visibleToasts={3}
        toastOptions={{
          ...props.toastOptions,
          unstyled: true,
          closeButtonAriaLabel: 'Đóng thông báo',
          classNames: {
            toast: 'flex items-center gap-control-gap rounded-container border border-border bg-surface-elevated p-stack-md text-body text-text shadow-md',
            content: 'flex min-w-0 flex-1 flex-col gap-inline-xs',
            title: 'font-semibold text-text',
            description: 'text-muted',
            actionButton: 'min-h-touch rounded-control bg-primary px-inline-sm text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
            closeButton: 'min-h-touch min-w-touch border-border bg-surface text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
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
