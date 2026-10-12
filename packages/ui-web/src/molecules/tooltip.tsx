'use client';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { overlayOffsetPx } from '@tripory/design-tokens';
import { createContext, useContext, useId } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const tooltipDelay = 400;
const TooltipDescriptionContext = createContext<string | undefined>(undefined);

export function TooltipProvider({ delay = tooltipDelay, ...props }: ComponentProps<typeof BaseTooltip.Provider>) {
  return <BaseTooltip.Provider {...props} delay={delay} />;
}

export function Tooltip(props: ComponentProps<typeof BaseTooltip.Root>) {
  const descriptionId = useId();
  return (
    <TooltipDescriptionContext value={descriptionId}>
      <BaseTooltip.Root {...props} />
    </TooltipDescriptionContext>
  );
}

export function TooltipTrigger({ className, ...props }: Omit<ComponentProps<typeof BaseTooltip.Trigger>, 'className'> & { className?: string }) {
  const descriptionId = useContext(TooltipDescriptionContext);
  return (
    <BaseTooltip.Trigger
      {...props}
      aria-describedby={descriptionId}
      className={cn(
        'inline-flex min-h-touch min-w-touch items-center justify-center rounded-control outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        className,
      )}
    />
  );
}

type TooltipContentProps = Omit<ComponentProps<typeof BaseTooltip.Popup>, 'className'> & {
  className?: string;
  side?: ComponentProps<typeof BaseTooltip.Positioner>['side'];
  sideOffset?: number;
};

export function TooltipContent({ className, side = 'top', sideOffset = overlayOffsetPx, ...props }: TooltipContentProps) {
  const descriptionId = useContext(TooltipDescriptionContext);
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner className="z-(--z-dropdown)" side={side} sideOffset={sideOffset}>
        <BaseTooltip.Popup
          {...props}
          id={descriptionId}
          role="tooltip"
          className={cn(
            'origin-(--transform-origin) rounded-control border border-border bg-surface-inverse px-inline-sm py-inline-xs text-label text-inverse shadow-md transition-[transform,opacity] duration-(--semantic-motion-duration-normal) ease-standard data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
            className,
          )}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export const TooltipPortal = BaseTooltip.Portal;
export const TooltipPositioner = BaseTooltip.Positioner;
export const TooltipPopup = BaseTooltip.Popup;
export const TooltipArrow = BaseTooltip.Arrow;
