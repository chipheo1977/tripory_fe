'use client';

import { Switch as BaseSwitch } from '@base-ui/react/switch';
import type { ComponentProps, ReactNode } from 'react';

export type SwitchProps = ComponentProps<typeof BaseSwitch.Root> & { label: ReactNode };

export function Switch({ className, label, ...props }: SwitchProps) {
  return (
    <label className="inline-flex min-h-touch cursor-pointer items-center gap-control-gap text-body text-text has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:text-disabled">
      <BaseSwitch.Root
        {...props}
        className={`inline-flex h-(--switch-height) w-(--switch-width) shrink-0 items-center rounded-pill border border-border bg-surface-muted transition-colors duration-(--semantic-motion-duration-fast) ease-standard data-checked:border-primary data-checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:bg-surface-muted ${className ?? ''}`.trim()}
      >
        <BaseSwitch.Thumb className="size-(--switch-thumb-size) translate-x-inline-xs rounded-pill bg-surface transition-transform duration-(--semantic-motion-duration-fast) ease-standard data-checked:translate-x-(--switch-thumb-offset)" />
      </BaseSwitch.Root>
      <span>{label}</span>
    </label>
  );
}
