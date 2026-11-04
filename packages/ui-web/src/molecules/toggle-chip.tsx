'use client';

import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Check } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Icon } from '../atoms/icon';
import { cn } from '../lib/cn';

type GroupBaseProps = Omit<ComponentProps<typeof ToggleGroup>, 'aria-label' | 'aria-labelledby' | 'className'> & {
  className?: string;
};

export type ToggleChipGroupProps = GroupBaseProps &
  (
    | { 'aria-label': string; 'aria-labelledby'?: never }
    | { 'aria-labelledby': string; 'aria-label'?: never }
  );

/** Nhóm chip chọn nhiều (D-71). Mặc định `multiple`, khác Base UI. */
export function ToggleChipGroup({ className, multiple = true, ...props }: ToggleChipGroupProps) {
  return <ToggleGroup {...props} className={cn('flex flex-wrap gap-inline-sm', className)} multiple={multiple} />;
}

export type ToggleChipProps = Omit<ComponentProps<typeof Toggle>, 'className'> & { className?: string };

export function ToggleChip({ className, children, ...props }: ToggleChipProps) {
  return (
    <Toggle
      {...props}
      className={cn(
        'group inline-flex min-h-touch items-center gap-inline-xs rounded-pill border border-border bg-surface px-stack-md text-label font-semibold text-text outline-hidden transition-colors duration-(--semantic-motion-duration-fast) hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-pressed:border-primary-border data-pressed:bg-primary-subtle data-disabled:cursor-not-allowed data-disabled:text-disabled',
        className,
      )}
    >
      <Icon className="hidden text-primary group-data-pressed:inline-flex" icon={Check} size="sm" />
      {children}
    </Toggle>
  );
}
