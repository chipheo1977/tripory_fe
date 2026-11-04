import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NumberStepper } from './number-stepper';
import type { NumberStepperProps } from './number-stepper';

const LABELS = { decrement: 'Giảm số ngày', increment: 'Tăng số ngày', suffix: 'ngày' } as const;

type HarnessProps = Partial<NumberStepperProps> & { initial?: number };

function Harness({ initial = 3, onValueChange, ...rest }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <NumberStepper
      labels={LABELS}
      max={30}
      min={1}
      {...rest}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      value={value}
    />
  );
}

const input = () => screen.getByRole('textbox') as HTMLInputElement;

describe('NumberStepper', () => {
  it('nút giảm/tăng đổi giá trị ±1', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole('button', { name: 'Tăng số ngày' }));
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    await user.click(screen.getByRole('button', { name: 'Giảm số ngày' }));
    await user.click(screen.getByRole('button', { name: 'Giảm số ngày' }));
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    expect(input().value).toBe('2');
  });

  it('nút bị vô hiệu ở biên', () => {
    const { rerender } = render(<NumberStepper labels={LABELS} max={30} min={1} onValueChange={() => undefined} value={1} />);
    expect(screen.getByRole('button', { name: 'Giảm số ngày' }).hasAttribute('data-disabled')).toBe(true);
    rerender(<NumberStepper labels={LABELS} max={30} min={1} onValueChange={() => undefined} value={30} />);
    expect(screen.getByRole('button', { name: 'Tăng số ngày' }).hasAttribute('data-disabled')).toBe(true);
  });

  it('gõ số ngoài khoảng thì kẹp về max', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.clear(input());
    await user.type(input(), '45');
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(30);
    expect(input().value).toBe('30');
  });

  it('để trống rồi rời ô thì hiện lại giá trị trước và không bao giờ đẩy null', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.clear(input());
    await user.tab();
    expect(input().value).toBe('3');
    expect(onValueChange).not.toHaveBeenCalledWith(null);
    expect(onValueChange.mock.calls.every(([next]) => typeof next === 'number')).toBe(true);
  });

  it('bàn phím: mũi tên ±1, Home/End về biên', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    input().focus();
    await user.keyboard('{ArrowUp}');
    expect(input().value).toBe('4');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input().value).toBe('2');
    await user.keyboard('{End}');
    expect(input().value).toBe('30');
    await user.keyboard('{Home}');
    expect(input().value).toBe('1');
  });

  it('Shift+mũi tên đổi theo bước lớn của Base UI', async () => {
    const user = userEvent.setup();
    render(<Harness initial={5} />);
    input().focus();
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(input().value).toBe('15');
  });

  it('ô số mang aria-roledescription tiếng Việt', () => {
    render(<Harness />);
    expect(input().getAttribute('aria-roledescription')).toBe('ô số');
  });

  it('roleDescription tùy biến được', () => {
    render(<Harness labels={{ ...LABELS, roleDescription: 'bộ đếm' }} />);
    expect(input().getAttribute('aria-roledescription')).toBe('bộ đếm');
  });

  it('invalid đặt aria-invalid', () => {
    render(<Harness invalid />);
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('inputRef trỏ tới ô nhập nhìn thấy', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Harness inputRef={ref} />);
    expect(ref.current).toBe(input());
  });

  it('liên kết nhãn bằng id và htmlFor', () => {
    render(
      <>
        <label htmlFor="so-ngay">Số ngày</label>
        <Harness id="so-ngay" />
      </>,
    );
    expect(screen.getByLabelText('Số ngày')).toBe(input());
  });
});
