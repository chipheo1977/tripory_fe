'use client';

import { Select as BaseSelect } from '@base-ui/react/select';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Icon } from '../atoms/icon';
import { Spinner } from '../atoms/spinner';
import { cn } from '../lib/cn';

const selectTriggerVariants = cva(
  'flex w-full items-center justify-between gap-control-gap rounded-control border border-border bg-input px-inline-sm text-body text-text transition-colors duration-(--semantic-motion-duration-fast) ease-standard hover:not-data-disabled:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:cursor-not-allowed data-disabled:bg-surface-muted data-disabled:text-disabled aria-invalid:border-danger',
  {
    variants: { size: { sm: 'h-control-sm', md: 'h-control-md', lg: 'h-control-lg' } },
    defaultVariants: { size: 'md' },
  },
);

export type SelectProps<Value> = Omit<BaseSelect.Root.Props<Value, false>, 'multiple'>;
export type SelectTriggerProps = Omit<ComponentProps<typeof BaseSelect.Trigger>, 'className'> &
  VariantProps<typeof selectTriggerVariants> & { className?: string; loading?: boolean };

export function Select<Value>(props: SelectProps<Value>) {
  return <BaseSelect.Root {...props} />;
}

export function SelectLabel({ className, ...props }: Omit<ComponentProps<typeof BaseSelect.Label>, 'className'> & { className?: string }) {
  return <BaseSelect.Label {...props} className={cn('inline-flex min-h-touch items-center text-label font-semibold text-text', className)} />;
}

export function SelectTrigger({ children, className, loading = false, size, ...props }: SelectTriggerProps) {
  return (
    <BaseSelect.Trigger {...props} aria-busy={loading || undefined} className={selectTriggerVariants({ className, size })}>
      <span className="min-w-0 truncate">{children}</span>
      <BaseSelect.Icon className="flex shrink-0 items-center gap-inline-xs text-subtle">
        {loading ? <Spinner decorative size="sm" /> : null}
        <Icon icon={ChevronDown} size="sm" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export function SelectValue(props: ComponentProps<typeof BaseSelect.Value>) {
  return <BaseSelect.Value {...props} />;
}

export function SelectContent({ children, className, ...props }: Omit<ComponentProps<typeof BaseSelect.Popup>, 'className'> & { className?: string }) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner alignItemWithTrigger={false} className="z-(--z-dropdown) outline-hidden" sideOffset={8}>
        <BaseSelect.Popup
          {...props}
          className={cn(
            'min-w-(--anchor-width) origin-(--transform-origin) rounded-control border border-border bg-surface-elevated py-inline-xs text-text shadow-md outline-hidden transition-[transform,opacity] duration-(--semantic-motion-duration-normal) ease-standard data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
            className,
          )}
        >
          <BaseSelect.List>{children}</BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export function SelectPopup(props: ComponentProps<typeof BaseSelect.Popup>) {
  return <BaseSelect.Popup {...props} />;
}

export function SelectList(props: ComponentProps<typeof BaseSelect.List>) {
  return <BaseSelect.List {...props} />;
}

export function SelectItem({ children, className, ...props }: Omit<BaseSelect.Item.Props, 'className'> & { children?: ReactNode; className?: string }) {
  return (
    <BaseSelect.Item
      {...props}
      className={cn(
        'grid min-h-touch cursor-default grid-cols-[auto_1fr] items-center gap-control-gap px-inline-sm text-body outline-hidden data-highlighted:bg-primary-subtle data-highlighted:text-text data-disabled:text-disabled',
        className,
      )}
    >
      <BaseSelect.ItemIndicator className="text-accent"><Icon icon={Check} size="sm" /></BaseSelect.ItemIndicator>
      {children}
    </BaseSelect.Item>
  );
}

export function SelectItemText(props: ComponentProps<typeof BaseSelect.ItemText>) {
  return <BaseSelect.ItemText {...props} />;
}

export function SelectGroup(props: ComponentProps<typeof BaseSelect.Group>) {
  return <BaseSelect.Group {...props} />;
}

export function SelectGroupLabel({ className, ...props }: Omit<ComponentProps<typeof BaseSelect.GroupLabel>, 'className'> & { className?: string }) {
  return <BaseSelect.GroupLabel {...props} className={cn('px-inline-sm py-inline-xs text-label font-semibold text-muted', className)} />;
}

export function SelectSeparator({ className, ...props }: Omit<ComponentProps<typeof BaseSelect.Separator>, 'className'> & { className?: string }) {
  return <BaseSelect.Separator {...props} className={cn('mx-inline-sm h-px bg-border', className)} />;
}

export const SelectPortal = BaseSelect.Portal;
export const SelectPositioner = BaseSelect.Positioner;
export const SelectItemIndicator = BaseSelect.ItemIndicator;
