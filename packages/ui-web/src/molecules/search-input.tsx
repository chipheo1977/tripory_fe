'use client';

import { Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Icon } from '../atoms/icon';
import { IconButton } from '../atoms/icon-button';
import { Input } from '../atoms/input';
import type { InputProps } from '../atoms/input';
import { Spinner } from '../atoms/spinner';
import { cn } from '../lib/cn';

type SearchInputBaseProps = Omit<InputProps, 'aria-label' | 'defaultValue' | 'onValueChange' | 'ref' | 'size' | 'type' | 'value'>;

export type SearchInputProps = SearchInputBaseProps & {
  clearable?: boolean;
  defaultValue?: string;
  label: string;
  loading?: boolean;
  onValueChange?: (value: string) => void;
  size?: 'md' | 'lg';
  value?: string;
};

export function SearchInput({
  className,
  clearable = true,
  defaultValue = '',
  label,
  loading = false,
  onKeyDown,
  onValueChange,
  size = 'md',
  value,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
        ref={inputRef}
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
