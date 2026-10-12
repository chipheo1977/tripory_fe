'use client';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cva } from 'class-variance-authority';
import { createContext, useContext } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

type TabsVariant = 'line' | 'contained';
const TabsVariantContext = createContext<TabsVariant>('line');

const listVariants = cva('relative flex items-center', {
  variants: {
    variant: {
      line: 'gap-inline-sm border-b border-border',
      contained: 'gap-inline-xs rounded-control border border-border bg-surface-muted p-inline-xs',
    },
  },
});

const triggerVariants = cva(
  'relative inline-flex min-h-touch items-center justify-center whitespace-nowrap px-inline-sm text-label font-semibold text-muted outline-hidden transition-colors duration-(--semantic-motion-duration-fast) ease-standard hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-active:text-text',
  {
    variants: {
      variant: {
        line: 'border-b-2 border-transparent data-active:border-primary',
        contained: 'rounded-control border border-transparent data-active:border-primary-border data-active:bg-surface data-active:shadow-sm',
      },
    },
  },
);

export type TabsProps = Omit<ComponentProps<typeof BaseTabs.Root>, 'className'> & {
  className?: string;
  variant?: TabsVariant;
};

export function Tabs({ className, variant = 'line', ...props }: TabsProps) {
  return (
    <TabsVariantContext value={variant}>
      <BaseTabs.Root {...props} className={cn('w-full', className)} />
    </TabsVariantContext>
  );
}

export function TabsList({ className, ...props }: Omit<ComponentProps<typeof BaseTabs.List>, 'className'> & { className?: string }) {
  const variant = useContext(TabsVariantContext);
  return <BaseTabs.List {...props} activateOnFocus className={listVariants({ className, variant })} data-variant={variant} />;
}

export function TabsTrigger({ className, ...props }: Omit<ComponentProps<typeof BaseTabs.Tab>, 'className'> & { className?: string }) {
  const variant = useContext(TabsVariantContext);
  return <BaseTabs.Tab {...props} className={triggerVariants({ className, variant })} />;
}

export function TabsIndicator({ className, ...props }: Omit<ComponentProps<typeof BaseTabs.Indicator>, 'className'> & { className?: string }) {
  const variant = useContext(TabsVariantContext);
  return (
    <BaseTabs.Indicator
      {...props}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute transition-[translate,width] duration-(--semantic-motion-duration-normal) ease-standard',
        variant === 'line'
          ? 'bottom-0 left-0 h-px w-(--active-tab-width) translate-x-(--active-tab-left) bg-primary'
          : 'inset-y-0 left-0 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-control border border-primary-border',
        className,
      )}
      data-tabs-indicator=""
    />
  );
}

export function TabsPanel({ className, ...props }: Omit<ComponentProps<typeof BaseTabs.Panel>, 'className'> & { className?: string }) {
  return (
    <BaseTabs.Panel
      {...props}
      className={cn('py-stack-md text-body text-text outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [[hidden]]:hidden', className)}
    />
  );
}
