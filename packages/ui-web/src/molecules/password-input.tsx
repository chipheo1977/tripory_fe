'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Icon } from '../atoms/icon';
import { IconButton } from '../atoms/icon-button';
import { Input } from '../atoms/input';
import type { InputProps } from '../atoms/input';
import { cn } from '../lib/cn';

// Không Omit `ref`: React Hook Form `register` cần ref xuống thẳng <input> (React 19 nhận ref như prop thường).
export type PasswordInputProps = Omit<InputProps, 'type'>;

export function PasswordInput({ className, id, readOnly, size = 'lg', value, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  // T-03-04: value controlled về rỗng (vd. đăng nhập sai, form xóa mật khẩu) thì quay lại ẩn,
  // để lần nhập kế tiếp không lộ chữ chỉ vì lần trước người dùng đã bấm "Hiện".
  useEffect(() => {
    if (value === '') setVisible(false);
  }, [value]);

  return (
    <div className="relative w-full">
      <Input
        {...props}
        className={cn('pr-page-block', className)}
        id={inputId}
        readOnly={readOnly}
        size={size}
        type={visible ? 'text' : 'password'}
        value={value}
      />
      <span className="absolute right-inline-xs top-1/2 flex -translate-y-1/2 items-center">
        <IconButton
          aria-controls={inputId}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          disabled={readOnly}
          onClick={() => setVisible((current) => !current)}
          size="sm"
          type="button"
        >
          <Icon icon={visible ? EyeOff : Eye} size="sm" />
        </IconButton>
      </span>
    </div>
  );
}
