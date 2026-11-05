'use client';

// Phần dùng chung cho Input và Textarea.
import { CalendarDays, X } from 'lucide-react';
import { useCallback, useSyncExternalStore, type RefObject } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';
import { IconButton } from './icon-button';

type Control = HTMLInputElement | HTMLTextAreaElement;

export const DEFAULT_CLEAR_LABEL = 'Xóa nội dung';

export function findControl(wrapper: HTMLElement | null): Control | null {
  if (wrapper === null) return null;
  return wrapper.querySelector<Control>('input, textarea');
}

/** Nút xóa chỉ hiện khi có nội dung và ô còn sửa được (form khóa bằng readOnly lúc đang gửi thì nút ẩn). */
export function canShowClear(enabled: boolean, hasValue: boolean, disabled: boolean | undefined, readOnly: boolean | undefined) {
  if (!enabled) return false;
  if (!hasValue) return false;
  if (disabled) return false;
  return !readOnly;
}

/** Ô có nội dung hay không, đọc từ DOM để theo kịp cả React Hook Form `register` (ghi `ref.value`, không qua state). */
export function useControlHasValue(wrapperRef: RefObject<HTMLElement | null>, initial: boolean, controlled = false) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const wrapper = wrapperRef.current;
      // Ô controlled: `initial` đã là giá trị prop hiện tại. Không nghe sự kiện DOM, vì listener gốc chạy trước listener
      // của React sẽ render lại ô khi `value` prop còn cũ, làm React ghi đè chữ vừa gõ/dán và nuốt `onChange`.
      if (controlled || wrapper === null) return () => undefined;
      // `focusin`: React Hook Form `reset()`/`setValue()` ghi `ref.value` không phát sự kiện; focus là lúc đọc lại cho chắc.
      const events = ['input', 'change', 'focusin'] as const;
      events.forEach((name) => wrapper.addEventListener(name, notify));
      return () => events.forEach((name) => wrapper.removeEventListener(name, notify));
    },
    [controlled, wrapperRef],
  );
  const getSnapshot = () => {
    if (controlled) return initial;
    const control = findControl(wrapperRef.current);
    if (control === null) return initial;
    return control.value !== '';
  };
  return useSyncExternalStore(subscribe, getSnapshot, () => initial);
}

export function clearControl(wrapper: HTMLElement | null) {
  const control = findControl(wrapper);
  if (control === null) return;
  const prototypes = { TEXTAREA: HTMLTextAreaElement.prototype, INPUT: HTMLInputElement.prototype };
  const prototype = prototypes[control.tagName as keyof typeof prototypes];
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(control, '');
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.focus();
}

const clearPlacement = { center: 'top-1/2 -translate-y-1/2', top: 'top-0' } as const;

export type FieldClearButtonProps = {
  label: string | undefined;
  onClear(): void;
  placement?: keyof typeof clearPlacement;
  visible: boolean;
};

export function FieldClearButton({ label, onClear, placement = 'center', visible }: FieldClearButtonProps) {
  if (!visible) return null;
  return (
    <IconButton
      aria-label={label ?? DEFAULT_CLEAR_LABEL}
      className={cn('absolute right-inline-xs', clearPlacement[placement])}
      onClick={onClear}
      size="sm"
      type="button"
    >
      <Icon icon={X} size="sm" />
    </IconButton>
  );
}

/** Mở bộ chọn ngày của trình duyệt. `showPicker()` có thể không có hoặc bị chặn (jsdom, Safari cũ): ô vẫn nhập tay được. */
export function openDatePicker(wrapper: HTMLElement | null) {
  const control = findControl(wrapper);
  if (!(control instanceof HTMLInputElement)) return;
  if (control.disabled) return;
  if (control.readOnly) return;
  control.focus();
  try {
    control.showPicker();
  } catch {
    // Không hỗ trợ hoặc bị trình duyệt từ chối: giữ nguyên focus ở ô.
  }
}

export function DatePickerIcon({ onPick, visible }: { onPick(): void; visible: boolean }) {
  if (!visible) return null;
  return (
    <span aria-hidden="true" className="absolute inset-y-0 left-0 flex w-section cursor-pointer items-center justify-center text-subtle" onClick={onPick}>
      <Icon icon={CalendarDays} size="sm" />
    </span>
  );
}
