'use client';

import { Search, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Icon } from '../atoms/icon';
import { IconButton } from '../atoms/icon-button';
import { Input } from '../atoms/input';
import type { InputProps } from '../atoms/input';
import { Spinner } from '../atoms/spinner';
import { cn } from '../lib/cn';

type SearchInputBaseProps = Omit<InputProps, 'allowClear' | 'aria-label' | 'clearLabel' | 'defaultValue' | 'onValueChange' | 'ref' | 'size' | 'type' | 'value' | 'wrapperClassName'>;

export type SearchInputProps = SearchInputBaseProps & {
  clearable?: boolean;
  defaultValue?: string;
  /** Ref tới ô nhập thật, gộp với ref nội bộ (vd. để form focus ô khi có lỗi). */
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  loading?: boolean;
  onValueChange?: (value: string) => void;
  size?: 'md' | 'lg';
  value?: string;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref !== null && ref !== undefined) ref.current = value;
}

export function SearchInput({
  className,
  clearable = true,
  defaultValue = '',
  inputRef: externalRef,
  label,
  loading = false,
  onKeyDown,
  onValueChange,
  size = 'md',
  value,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      inputRef.current = element;
      assignRef(externalRef, element);
    },
    [externalRef],
  );
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;

  const setValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const clear = () => {
    setValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: Parameters<NonNullable<InputProps['onKeyDown']>>[0]) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && event.key === 'Escape' && currentValue) {
      event.preventDefault();
      clear();
    }
  };

  return (
    <div className="relative w-full">
      <Icon className="pointer-events-none absolute left-inline-sm top-1/2 -translate-y-1/2 text-subtle" icon={Search} size="sm" />
      <Input
        {...props}
        ref={setInputRef}
        aria-label={label}
        className={cn('pl-section pr-page-block', className)}
        onKeyDown={handleKeyDown}
        onValueChange={setValue}
        size={size}
        type="search"
        value={currentValue}
      />
      <span className="absolute right-inline-xs top-1/2 flex -translate-y-1/2 items-center">
        {loading ? <Spinner decorative={false} label="Đang tìm kiếm" size="sm" /> : null}
        {clearable && currentValue ? (
          <IconButton aria-label="Xóa tìm kiếm" onClick={clear} size="sm" type="button">
            <Icon icon={X} size="sm" />
          </IconButton>
        ) : null}
      </span>
    </div>
  );
}
