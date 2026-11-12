'use client';

import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Icon } from '../atoms/icon';
import { cn } from '../lib/cn';

type NameProps =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; 'aria-label'?: never };

export type SegmentedControlProps = NameProps & {
  value: string;
  onValueChange(value: string): void;
  className?: string;
  children: ReactNode;
} & Pick<ComponentProps<typeof ToggleGroup>, 'disabled'>;

/**
 * Nhóm chọn đúng một, không bao giờ rỗng. Bấm lại đoạn đang chọn không làm gì.
 * Nền do nơi gọi truyền qua `className` (nổi hoặc trên header).
 */
export function SegmentedControl({ value, onValueChange, className, children, ...rest }: SegmentedControlProps) {
  function handleChange(next: string[]) {
    const chosen = next[0];
    if (chosen === undefined || chosen === value) return;
    onValueChange(chosen);
  }

  return (
    <ToggleGroup
      {...rest}
      className={cn('inline-flex items-center rounded-pill border border-border p-inline-xs', className)}
      multiple={false}
      onValueChange={handleChange}
      value={[value]}
    >
      {children}
    </ToggleGroup>
  );
}

export type SegmentedControlItemProps = Omit<ComponentProps<typeof Toggle>, 'className' | 'children' | 'value'> & {
  value: string;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
  children: ReactNode;
};

function ItemIcon({ icon, className }: { icon?: LucideIcon; className?: string }) {
  if (icon === undefined) return null;
  return <Icon className={className} icon={icon} size="sm" />;
}

export function SegmentedControlItem({
  icon,
  iconClassName,
  className,
  children,
  ...props
}: SegmentedControlItemProps) {
  return (
    <Toggle
      {...props}
      className={cn(
        'inline-flex min-h-touch items-center gap-inline-xs rounded-pill px-inline-sm text-label font-regular text-muted outline-hidden transition-colors duration-(--semantic-motion-duration-fast) hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:px-stack-md data-pressed:bg-surface-inverse data-pressed:font-semibold data-pressed:text-text-inverse data-pressed:hover:text-text-inverse',
        className,
      )}
    >
      <ItemIcon className={iconClassName} icon={icon} />
      {children}
    </Toggle>
  );
}
