import { cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type EmptyStateProps = {
  action?: ReactNode;
  body?: ReactNode;
  className?: string;
  heading?: ReactNode;
  icon?: ReactNode;
  variant?: 'compact' | 'page';
};

export function EmptyState({
  action,
  body = 'Nội dung sẽ xuất hiện tại đây khi sẵn sàng.',
  className,
  heading = 'Chưa có nội dung',
  icon,
  variant = 'compact',
}: EmptyStateProps) {
  const decorativeIcon = isValidElement(icon)
    ? cloneElement(icon as ReactElement<{ 'aria-hidden'?: boolean; focusable?: boolean }>, { 'aria-hidden': true, focusable: false })
    : icon;

  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center rounded-container border border-border bg-surface text-center',
        variant === 'compact' ? 'gap-stack-sm p-stack-lg' : 'gap-stack-md px-page-inline py-page-block md:px-page-inline-md md:py-page-block-wide',
        className,
      )}
    >
      {icon ? <span aria-hidden className="text-accent">{decorativeIcon}</span> : null}
      <div className="flex max-w-content-sm flex-col gap-stack-sm">
        <h2 className="text-heading font-semibold text-text">{heading}</h2>
        <p className="text-body text-muted">{body}</p>
      </div>
      {action ? <div className="flex items-center justify-center gap-control-gap">{action}</div> : null}
    </section>
  );
}
