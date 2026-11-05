import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { describe, expect, it } from 'vitest';
import { Input } from './input';
import { Textarea } from './textarea';

// Mô phỏng người dùng thật: trình duyệt ghi `value` qua setter gốc của prototype (không qua bộ theo dõi của React)
// rồi phát sự kiện `input` nổi bọt. Với sự kiện do người dùng, trình duyệt chạy hàng đợi microtask giữa hai listener,
// nên cập nhật React do listener gốc của ô lên lịch (useSyncExternalStore) được áp dụng TRƯỚC khi listener gốc của
// React đọc sự kiện. `dispatchEvent` từ script không làm vậy, nên listener thêm sau `flushSync` thay cho điểm đó.
function typeNatively(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setValue = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  const wrapper = element.parentElement as HTMLElement;
  const microtaskCheckpoint = () => flushSync(() => undefined);
  wrapper.addEventListener('input', microtaskCheckpoint);
  try {
    act(() => {
      setValue?.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  } finally {
    wrapper.removeEventListener('input', microtaskCheckpoint);
  }
}

function ControlledInput() {
  const [value, setValue] = useState('');
  return <Input allowClear aria-label="Link" onValueChange={setValue} value={value} />;
}

function ControlledTextarea() {
  const [value, setValue] = useState('');
  return <Textarea allowClear aria-label="Ghi chú" onChange={(event) => setValue(event.target.value)} value={value} />;
}

describe('ô controlled có allowClear nhận chữ dán/gõ từ trình duyệt thật', () => {
  it('Input: giữ chữ vừa dán và hiện nút xóa', () => {
    render(<ControlledInput />);
    const input = screen.getByRole('textbox', { name: 'Link' }) as HTMLInputElement;
    typeNatively(input, 'https://img.example/a.jpg');
    expect(input.value).toBe('https://img.example/a.jpg');
    expect(screen.getByRole('button', { name: 'Xóa nội dung' })).toBeTruthy();
  });

  it('Textarea: giữ chữ vừa dán và hiện nút xóa', () => {
    render(<ControlledTextarea />);
    const area = screen.getByRole('textbox', { name: 'Ghi chú' }) as HTMLTextAreaElement;
    typeNatively(area, 'ghi chú dài');
    expect(area.value).toBe('ghi chú dài');
    expect(screen.getByRole('button', { name: 'Xóa nội dung' })).toBeTruthy();
  });
});
