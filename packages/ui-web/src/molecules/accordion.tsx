'use client';

import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { ChevronDown, CircleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Icon } from '../atoms/icon';
import { cn } from '../lib/cn';

type ClassNameString<T> = Omit<T, 'className'> & { className?: string };

export function Accordion<Value = string>({
  className,
  ...props
}: ClassNameString<ComponentProps<typeof BaseAccordion.Root<Value>>>) {
  return (
    <BaseAccordion.Root<Value>
      {...props}
      className={cn('divide-y divide-border overflow-hidden rounded-container border border-border bg-surface', className)}
    />
  );
}

export function AccordionItem(props: ComponentProps<typeof BaseAccordion.Item>) {
  return <BaseAccordion.Item {...props} />;
}

export type AccordionTriggerProps = ClassNameString<Omit<ComponentProps<typeof BaseAccordion.Trigger>, 'children' | 'title'>> & {
  title: ReactNode;
  summary?: ReactNode;
  invalid?: boolean;
};

export function AccordionTrigger({ className, title, summary, invalid = false, ...props }: AccordionTriggerProps) {
  const invalidAttribute = invalid ? '' : undefined;
  return (
    <BaseAccordion.Header className="m-0">
      <BaseAccordion.Trigger
        {...props}
        className={cn(
          'group flex min-h-touch w-full items-center gap-inline-sm px-stack-md py-stack-sm text-left outline-hidden transition-colors duration-(--semantic-motion-duration-fast) hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:cursor-not-allowed data-disabled:text-disabled',
          className,
        )}
        data-invalid={invalidAttribute}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-semibold text-text group-data-invalid:text-danger">{title}</span>
          <span className="line-clamp-1 text-label text-muted group-data-panel-open:hidden group-data-invalid:text-danger">
            {summary}
          </span>
        </span>
        <Icon className="hidden text-danger group-data-invalid:inline-flex" icon={CircleAlert} size="sm" />
        <Icon
          className="text-muted transition-transform duration-(--semantic-motion-duration-normal) ease-standard group-data-panel-open:rotate-180"
          icon={ChevronDown}
          size="sm"
        />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

export function AccordionPanel({
  className,
  children,
  ...props
}: ClassNameString<ComponentProps<typeof BaseAccordion.Panel>>) {
  return (
    <BaseAccordion.Panel
      {...props}
      className={cn(
        'h-(--accordion-panel-height) overflow-hidden transition-[height] duration-(--semantic-motion-duration-normal) ease-standard data-ending-style:h-0 data-starting-style:h-0',
        className,
      )}
    >
      <div className="px-stack-md pb-stack-md pt-inline-xs">{children}</div>
    </BaseAccordion.Panel>
  );
}
