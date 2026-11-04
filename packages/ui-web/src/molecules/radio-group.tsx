'use client';

import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

type ClassNameString<T> = Omit<T, 'className'> & { className?: string };

/** Nhóm radio không áp hình dạng; caller tự dựng giao diện qua `Radio` + `data-checked`. */
export function RadioGroup({ className, ...props }: ClassNameString<ComponentProps<typeof BaseRadioGroup>>) {
  return <BaseRadioGroup {...props} className={className} />;
}

export function Radio({ className, ...props }: ClassNameString<ComponentProps<typeof BaseRadio.Root>>) {
  return (
    <BaseRadio.Root
      {...props}
      className={cn(
        'cursor-pointer outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:cursor-not-allowed',
        className,
      )}
    />
  );
}
