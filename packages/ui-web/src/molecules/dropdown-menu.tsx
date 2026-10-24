'use client';

import { Menu } from '@base-ui/react/menu';
import { overlayOffsetPx } from '@tripory/design-tokens';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, Circle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Icon } from '../atoms/icon';
import { cn } from '../lib/cn';

const menuItemVariants = cva(
  'flex min-h-touch cursor-default items-center gap-control-gap rounded-control px-inline-sm text-body outline-hidden data-highlighted:bg-surface-muted data-disabled:text-disabled',
  {
    variants: {
      variant: {
        default: 'text-text',
        danger: 'text-danger data-highlighted:bg-danger-subtle',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export const DropdownMenu = Menu.Root;

export function DropdownMenuTrigger({ className, ...props }: Omit<ComponentProps<typeof Menu.Trigger>, 'className'> & { className?: string }) {
  return (
    <Menu.Trigger
      {...props}
      className={cn(
        'inline-flex min-h-touch items-center justify-center rounded-control border border-border bg-surface px-inline-sm text-label font-semibold text-text transition-colors duration-(--semantic-motion-duration-fast) ease-standard hover:not-data-disabled:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:text-disabled',
        className,
      )}
    />
  );
}

export type DropdownMenuContentProps = Omit<ComponentProps<typeof Menu.Popup>, 'className'> & {
  /** Căn popup theo trigger. UserMenu ở mép phải header dùng `end` để popup không tràn khỏi màn hình. */
  align?: 'start' | 'center' | 'end';
  className?: string;
};

export function DropdownMenuContent({ align = 'start', children, className, ...props }: DropdownMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} className="z-(--z-dropdown) outline-hidden" sideOffset={overlayOffsetPx}>
        <Menu.Popup
          {...props}
          className={cn(
            'min-w-(--anchor-width) origin-(--transform-origin) rounded-control border border-border bg-surface-elevated p-inline-xs text-text shadow-md outline-hidden transition-[transform,opacity] duration-(--semantic-motion-duration-normal) ease-standard data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
            className,
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export type DropdownMenuItemProps = Omit<ComponentProps<typeof Menu.Item>, 'className'> &
  VariantProps<typeof menuItemVariants> & { className?: string };

export function DropdownMenuItem({ className, variant, ...props }: DropdownMenuItemProps) {
  return <Menu.Item {...props} className={menuItemVariants({ className, variant })} data-variant={variant ?? 'default'} />;
}

export type DropdownMenuLinkItemProps = Omit<ComponentProps<typeof Menu.LinkItem>, 'className'> &
  VariantProps<typeof menuItemVariants> & { className?: string };

/**
 * Mục menu điều hướng, render `<a>`. Package không biết router của app: app truyền `render={<Link href="..." />}`
 * với Link của framework (package này không được import framework). Mặc định đóng menu khi chọn, khác `Menu.LinkItem`
 * gốc, vì UserMenu nằm trong layout nên điều hướng phía client không unmount nó; truyền `closeOnClick={false}` nếu cần giữ menu mở.
 */
export function DropdownMenuLinkItem({ className, closeOnClick = true, variant, ...props }: DropdownMenuLinkItemProps) {
  return <Menu.LinkItem {...props} className={menuItemVariants({ className, variant })} closeOnClick={closeOnClick} data-variant={variant ?? 'default'} />;
}

export function DropdownMenuCheckboxItem({ children, className, ...props }: Omit<ComponentProps<typeof Menu.CheckboxItem>, 'className'> & { children?: ReactNode; className?: string }) {
  return (
    <Menu.CheckboxItem {...props} className={cn(menuItemVariants(), 'grid grid-cols-[auto_1fr]', className)}>
      <Menu.CheckboxItemIndicator className="text-accent"><Icon icon={Check} size="sm" /></Menu.CheckboxItemIndicator>
      <span>{children}</span>
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuRadioGroup(props: ComponentProps<typeof Menu.RadioGroup>) {
  return <Menu.RadioGroup {...props} />;
}

export function DropdownMenuRadioItem({ children, className, ...props }: Omit<ComponentProps<typeof Menu.RadioItem>, 'className'> & { children?: ReactNode; className?: string }) {
  return (
    <Menu.RadioItem {...props} className={cn(menuItemVariants(), 'grid grid-cols-[auto_1fr]', className)}>
      <Menu.RadioItemIndicator className="text-accent"><Icon icon={Circle} size="sm" /></Menu.RadioItemIndicator>
      <span>{children}</span>
    </Menu.RadioItem>
  );
}

export function DropdownMenuGroup(props: ComponentProps<typeof Menu.Group>) {
  return <Menu.Group {...props} />;
}

export function DropdownMenuGroupLabel({ className, ...props }: Omit<ComponentProps<typeof Menu.GroupLabel>, 'className'> & { className?: string }) {
  return <Menu.GroupLabel {...props} className={cn('px-inline-sm py-inline-xs text-label font-semibold text-muted', className)} />;
}

export function DropdownMenuSeparator({ className, ...props }: Omit<ComponentProps<typeof Menu.Separator>, 'className'> & { className?: string }) {
  return <Menu.Separator {...props} className={cn('my-inline-xs h-px bg-border', className)} />;
}

export const DropdownMenuPortal = Menu.Portal;
export const DropdownMenuPositioner = Menu.Positioner;
export const DropdownMenuPopup = Menu.Popup;
export const DropdownMenuCheckboxItemIndicator = Menu.CheckboxItemIndicator;
export const DropdownMenuRadioItemIndicator = Menu.RadioItemIndicator;
