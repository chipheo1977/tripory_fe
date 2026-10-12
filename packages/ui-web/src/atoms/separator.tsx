import { Separator as BaseSeparator } from '@base-ui/react/separator';
import type { ComponentProps } from 'react';

type Orientation = 'horizontal' | 'vertical';
export type SeparatorProps = Omit<ComponentProps<'div'>, 'children'> & {
  orientation?: Orientation;
  semantic?: boolean;
};

const classes: Record<Orientation, string> = {
  horizontal: 'h-px w-full bg-border',
  vertical: 'h-full w-px bg-border',
};

export function Separator({ className, orientation = 'horizontal', semantic = false, ...props }: SeparatorProps) {
  const mergedClassName = `${classes[orientation]} ${className ?? ''}`.trim();
  if (semantic) {
    return <BaseSeparator {...props} className={mergedClassName} orientation={orientation} />;
  }
  return <div {...props} aria-hidden="true" className={mergedClassName} data-orientation={orientation} />;
}
