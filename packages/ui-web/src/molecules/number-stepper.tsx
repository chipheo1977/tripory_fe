'use client';

import { NumberField } from '@base-ui/react/number-field';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { Icon } from '../atoms/icon';

const STEP_BUTTON_CLASS =
  'inline-flex size-control-lg items-center justify-center rounded-control border border-border bg-surface text-text outline-hidden transition-colors duration-(--semantic-motion-duration-fast) hover:not-data-disabled:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:cursor-not-allowed data-disabled:text-disabled';

const INPUT_CLASS =
  'h-control-lg w-page-block rounded-control border border-border bg-input text-center text-body tabular-nums text-text outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-invalid:border-danger';

export type NumberStepperLabels = Readonly<{
  decrement?: string;
  increment?: string;
  suffix?: ReactNode;
  roleDescription?: string;
}>;

export type NumberStepperProps = {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  'aria-describedby'?: string;
  labels?: NumberStepperLabels;
};

/**
 * Bộ đếm số nguyên có nút −/+. Ô để trống rồi rời đi thì hiện lại giá trị trước;
 * `onValueChange` không bao giờ nhận `null`.
 */
export function NumberStepper({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  invalid = false,
  disabled,
  readOnly,
  id,
  inputRef,
  'aria-describedby': describedBy,
  labels,
}: NumberStepperProps) {
  const [draft, setDraft] = useState<number | null>(value);
  const [lastValid, setLastValid] = useState(value);
  if (value !== lastValid) {
    setLastValid(value);
    setDraft(value);
  }

  const handleChange = (next: number | null) => {
    setDraft(next);
    if (next === null) return;
    setLastValid(next);
    onValueChange(next);
  };

  const handleCommitted = (next: number | null) => {
    if (next === null) setDraft(lastValid);
  };

  return (
    <NumberField.Root
      allowOutOfRange={false}
      allowWheelScrub={false}
      className="inline-flex items-center gap-inline-sm"
      disabled={disabled}
      id={id}
      max={max}
      min={min}
      onValueChange={handleChange}
      onValueCommitted={handleCommitted}
      readOnly={readOnly}
      step={step}
      value={draft}
    >
      <NumberField.Group className="inline-flex items-center gap-inline-sm">
        <NumberField.Decrement aria-label={labels?.decrement ?? 'Giảm'} className={STEP_BUTTON_CLASS}>
          <Icon icon={Minus} size="sm" />
        </NumberField.Decrement>
        <NumberField.Input
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          aria-roledescription={labels?.roleDescription ?? 'ô số'}
          className={INPUT_CLASS}
          inputMode="numeric"
          ref={inputRef}
        />
        <NumberField.Increment aria-label={labels?.increment ?? 'Tăng'} className={STEP_BUTTON_CLASS}>
          <Icon icon={Plus} size="sm" />
        </NumberField.Increment>
      </NumberField.Group>
      <span aria-hidden="true" className="text-body text-muted">
        {labels?.suffix}
      </span>
    </NumberField.Root>
  );
}
