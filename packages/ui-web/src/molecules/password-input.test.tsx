import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FormField, FormFieldLabel } from './form-field';
import { PasswordInput } from './password-input';

const getInput = (container: HTMLElement) => container.querySelector('input') as HTMLInputElement;

describe('PasswordInput', () => {
  it('mặc định ẩn mật khẩu: type=password, nút Hiện mật khẩu, aria-pressed=false', () => {
    const { container } = render(<PasswordInput aria-label="Mật khẩu" />);
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' });

    expect(getInput(container).type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('click nút đổi type, aria-label và aria-pressed; click lần nữa quay về ẩn', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordInput aria-label="Mật khẩu" />);

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    const hide = screen.getByRole('button', { name: 'Ẩn mật khẩu' });
    expect(getInput(container).type).toBe('text');
    expect(hide.getAttribute('aria-pressed')).toBe('true');

    await user.click(hide);
    expect(getInput(container).type).toBe('password');
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('kích hoạt bằng bàn phím (Enter và Space) trong focus order sau ô nhập', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordInput aria-label="Mật khẩu" />);

    getInput(container).focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    await user.keyboard('{Enter}');
    expect(getInput(container).type).toBe('text');
    await user.keyboard(' ');
    expect(getInput(container).type).toBe('password');
  });

  it('nút có type="button": nằm trong form, click không submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput aria-label="Mật khẩu" />
      </form>,
    );
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' });

    expect(toggle.getAttribute('type')).toBe('button');
    await user.click(toggle);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Enter trong ô nhập vẫn submit form (không bị nút toggle chặn)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const { container } = render(
      <form onSubmit={onSubmit}>
        <PasswordInput aria-label="Mật khẩu" />
        <button type="submit">Gửi</button>
      </form>,
    );

    getInput(container).focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('readOnly: ô nhập chỉ đọc và nút toggle disabled', () => {
    const { container } = render(<PasswordInput aria-label="Mật khẩu" readOnly />);
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' });

    expect(getInput(container).readOnly).toBe(true);
    expect(toggle.hasAttribute('disabled') || toggle.getAttribute('aria-disabled') === 'true' || toggle.hasAttribute('data-disabled')).toBe(true);
  });

  it('readOnly không cho toggle đổi type khi bị click', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordInput aria-label="Mật khẩu" readOnly />);

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(getInput(container).type).toBe('password');
  });

  it('value controlled về rỗng thì quay lại trạng thái ẩn (T-03-04)', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState('bí-mật');
      return (
        <>
          <PasswordInput aria-label="Mật khẩu" onValueChange={setValue} value={value} />
          <button onClick={() => setValue('')} type="button">
            Xóa
          </button>
        </>
      );
    }
    const { container } = render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(getInput(container).type).toBe('text');
    expect(getInput(container).value).toBe('bí-mật');

    await user.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(getInput(container).value).toBe('');
    expect(getInput(container).type).toBe('password');
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('không reset khi value còn nội dung', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<PasswordInput aria-label="Mật khẩu" onValueChange={() => undefined} value="abc" />);

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    rerender(<PasswordInput aria-label="Mật khẩu" onValueChange={() => undefined} value="abcd" />);
    expect(getInput(container).type).toBe('text');
  });

  it('chuyển ref xuống <input> (React Hook Form register)', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(<PasswordInput aria-label="Mật khẩu" ref={ref} />);

    expect(ref.current).toBe(getInput(container));
  });

  it('chuyển autoComplete, aria-invalid, aria-describedby và name vào <input>', () => {
    const { container } = render(
      <>
        <p id="hint">Gợi ý</p>
        <PasswordInput aria-describedby="hint" aria-invalid aria-label="Mật khẩu" autoComplete="new-password" name="password" />
      </>,
    );
    const input = getInput(container);

    expect(input.getAttribute('autocomplete')).toBe('new-password');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('hint');
    expect(input.name).toBe('password');
  });

  it('aria-controls của nút trỏ đúng id của <input> (id tự sinh)', () => {
    const { container } = render(<PasswordInput aria-label="Mật khẩu" />);
    const input = getInput(container);
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' });

    expect(input.id).not.toBe('');
    expect(toggle.getAttribute('aria-controls')).toBe(input.id);
  });

  it('dùng id do caller truyền cho cả <input> lẫn aria-controls', () => {
    const { container } = render(<PasswordInput aria-label="Mật khẩu" id="pw-login" />);

    expect(getInput(container).id).toBe('pw-login');
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' }).getAttribute('aria-controls')).toBe('pw-login');
  });

  it('đặt trong FormField vẫn nối nhãn với ô nhập và aria-controls khớp', () => {
    const { container } = render(
      <FormField name="password">
        <FormFieldLabel>Mật khẩu</FormFieldLabel>
        <PasswordInput />
      </FormField>,
    );
    const input = getInput(container);

    expect(screen.getByLabelText('Mật khẩu', { selector: 'input' })).toBe(input);
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' }).getAttribute('aria-controls')).toBe(input.id);
  });

  it('gõ giá trị uncontrolled hoạt động và toggle không làm mất giá trị', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordInput aria-label="Mật khẩu" />);

    await user.type(getInput(container), 'abc123');
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(getInput(container).value).toBe('abc123');
  });
});
