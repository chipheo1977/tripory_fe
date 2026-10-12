import { Button } from '../atoms/button';
import { cn } from '../lib/cn';

export type ErrorStateProps = {
  className?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'page';
};

export function ErrorState({ className, onRetry, variant = 'inline' }: ErrorStateProps) {
  return (
    <section
      className={cn(
        'flex flex-col items-start gap-stack-md text-text',
        variant === 'inline' && 'border-l-2 border-danger pl-stack-md',
        variant === 'card' && 'rounded-container border border-danger bg-danger-subtle p-stack-lg',
        variant === 'page' && 'min-h-content-sm items-center justify-center rounded-container border border-border bg-surface px-page-inline py-page-block text-center md:px-page-inline-md md:py-page-block-wide',
        className,
      )}
    >
      <div className="flex max-w-content-sm flex-col gap-stack-sm">
        <h2 className="text-heading font-semibold text-text">Không thể tải nội dung</h2>
        <p className="text-body text-muted">Đã xảy ra sự cố. Vui lòng thử lại.</p>
      </div>
      {onRetry ? (
        <Button onClick={onRetry} variant="primary">
          Thử lại
        </Button>
      ) : null}
    </section>
  );
}
