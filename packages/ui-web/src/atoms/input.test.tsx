import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from './input';
import { Label } from './label';

it('liên kết label, error và nhận nhập liệu từ bàn phím', async () => {
  render(<><Label htmlFor="email">Email</Label><Input id="email" aria-invalid aria-describedby="email-error" /><p id="email-error">Email không hợp lệ</p></>);
  const input = screen.getByRole('textbox', { name: 'Email' });
  await userEvent.setup().type(input, 'a@b.com');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.getAttribute('aria-describedby')).toBe('email-error');
  expect((input as HTMLInputElement).value).toBe('a@b.com');
});

it('hỗ trợ disabled và read-only', () => {
  render(<><Label htmlFor="name">Tên</Label><Input id="name" disabled /><Label htmlFor="code">Mã</Label><Input id="code" readOnly /></>);
  expect((screen.getByRole('textbox', { name: 'Tên' }) as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByRole('textbox', { name: 'Mã' }) as HTMLInputElement).readOnly).toBe(true);
});

describe('allowClear', () => {
  const clearButton = (name = 'Xóa nội dung') => screen.queryByRole('button', { name });

  it('mặc định false: không có nút X và DOM vẫn là một <input> trần', () => {
    const { container } = render(<Input aria-label="Tên" defaultValue="Huế" />);
    expect(clearButton()).toBeNull();
    expect(container.firstElementChild?.tagName).toBe('INPUT');
  });

  it('allowClear chỉ hiện nút khi có giá trị, và ẩn khi disabled hoặc readOnly', () => {
    const { rerender } = render(<Input allowClear aria-label="Tên" />);
    expect(clearButton()).toBeNull();
    rerender(<Input allowClear aria-label="Tên" defaultValue="Huế" key="a" />);
    expect(clearButton()).not.toBeNull();
    rerender(<Input allowClear aria-label="Tên" defaultValue="Huế" disabled key="b" />);
    expect(clearButton()).toBeNull();
    rerender(<Input allowClear aria-label="Tên" defaultValue="Huế" key="c" readOnly />);
    expect(clearButton()).toBeNull();
  });

  it('theo dõi giá trị khi gõ và khi xóa hết bằng bàn phím', async () => {
    const user = userEvent.setup();
    render(<Input allowClear aria-label="Tên" />);
    const input = screen.getByRole('textbox', { name: 'Tên' });
    expect(clearButton()).toBeNull();
    await user.type(input, 'ab');
    expect(clearButton()).not.toBeNull();
    await user.clear(input);
    expect(clearButton()).toBeNull();
  });

  it('bấm X xóa giá trị uncontrolled, trả focus về ô và bắn onChange với giá trị rỗng', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    render(<Input allowClear aria-label="Tên" defaultValue="Huế" onChange={onChange} onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox', { name: 'Tên' }) as HTMLInputElement;
    await user.click(clearButton() as HTMLElement);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0]?.[0] as { target: HTMLInputElement }).target.value).toBe('');
    expect(onValueChange.mock.calls[0]?.[0]).toBe('');
    expect(clearButton()).toBeNull();
  });

  it('bấm X cập nhật ô controlled qua value/onChange', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState('Đà Nẵng');
      return <Input allowClear aria-label="Tên" onChange={(event) => setValue(event.target.value)} value={value} />;
    }
    render(<Harness />);
    await user.click(clearButton() as HTMLElement);
    expect((screen.getByRole('textbox', { name: 'Tên' }) as HTMLInputElement).value).toBe('');
    expect(clearButton()).toBeNull();
  });

  it('nút X hiện lại khi value controlled đổi từ ngoài', () => {
    const { rerender } = render(<Input allowClear aria-label="Tên" onChange={() => undefined} value="" />);
    expect(clearButton()).toBeNull();
    rerender(<Input allowClear aria-label="Tên" onChange={() => undefined} value="Huế" />);
    expect(clearButton()).not.toBeNull();
  });

  it('ref vẫn trỏ tới <input> (React Hook Form register) và cập nhật ref.value ngoài React vẫn đồng bộ nút X khi focus', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLInputElement>();
    render(<Input allowClear aria-label="Tên" ref={ref} />);
    expect(ref.current?.tagName).toBe('INPUT');
    (ref.current as HTMLInputElement).value = 'Huế';
    await user.click(ref.current as HTMLInputElement);
    expect(clearButton()).not.toBeNull();
  });

  it('nhãn mặc định "Xóa nội dung", clearLabel tùy chỉnh theo từng ô', () => {
    const { rerender } = render(<Input allowClear aria-label="Tên" defaultValue="a" />);
    expect(clearButton('Xóa nội dung')).not.toBeNull();
    rerender(<Input allowClear aria-label="Tên" clearLabel="Xóa Ảnh bìa" defaultValue="a" key="x" />);
    expect(clearButton('Xóa Ảnh bìa')).not.toBeNull();
    expect(clearButton('Xóa nội dung')).toBeNull();
  });

  it('nút có type="button" nên không submit form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Input allowClear aria-label="Tên" defaultValue="a" />
      </form>,
    );
    const button = clearButton() as HTMLElement;
    expect(button.getAttribute('type')).toBe('button');
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('vùng chạm 44px, ô có chỗ trống bên phải, className vào <input> còn wrapperClassName vào vùng bao', () => {
    const { container } = render(<Input allowClear aria-label="Tên" className="tuy-chinh" defaultValue="a" wrapperClassName="min-w-0 flex-1" />);
    const wrapper = container.firstElementChild as HTMLElement;
    const input = screen.getByRole('textbox', { name: 'Tên' });
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.className).toContain('flex-1');
    expect(wrapper.className).toContain('relative');
    expect(input.className).toContain('tuy-chinh');
    expect(input.className).toContain('pr-page-block');
    expect(input.className).not.toContain('flex-1');
    const button = clearButton() as HTMLElement;
    expect(button.className).toContain('min-h-touch');
    expect(button.className).toContain('min-w-touch');
    expect(button.className).toContain('right-inline-xs');
  });
});

describe('type="date"', () => {
  const clearButton = (name = 'Xóa nội dung') => screen.queryByRole('button', { name });
  const original = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'showPicker');

  afterEach(() => {
    if (original === undefined) {
      Reflect.deleteProperty(HTMLInputElement.prototype, 'showPicker');
      return;
    }
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', original);
  });

  it('allowClear mặc định true: hiện X khi có ngày, ẩn khi rỗng', () => {
    const { rerender } = render(<Input aria-label="Ngày" type="date" />);
    expect(clearButton()).toBeNull();
    rerender(<Input aria-label="Ngày" defaultValue="2026-10-12" key="a" type="date" />);
    expect(clearButton()).not.toBeNull();
  });

  it('allowClear={false} tắt nút X nhưng vẫn giữ biểu tượng lịch bên trái', () => {
    const { container } = render(<Input allowClear={false} aria-label="Ngày" defaultValue="2026-10-12" type="date" />);
    expect(clearButton()).toBeNull();
    expect(container.querySelector('.lucide-calendar-days')).not.toBeNull();
  });

  it('có biểu tượng lịch bên trái, chừa padding trái/phải và ẩn nút lịch gốc của trình duyệt', () => {
    const { container } = render(<Input aria-label="Ngày" type="date" />);
    const input = screen.getByLabelText('Ngày');
    const icon = container.querySelector('.lucide-calendar-days') as Element;
    expect(icon).not.toBeNull();
    expect((icon.parentElement as HTMLElement).className).toContain('left-0');
    expect(input.className).toContain('pl-section');
    expect(input.className).toContain('pr-page-block');
    expect(input.className).toContain('[&::-webkit-calendar-picker-indicator]:hidden');
  });

  it('input không phải date không có biểu tượng lịch và không ẩn nút lịch gốc', () => {
    const { container } = render(<Input allowClear aria-label="Tên" defaultValue="a" />);
    expect(container.querySelector('.lucide-calendar-days')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Tên' }).className).not.toContain('calendar-picker-indicator');
  });

  it('bấm biểu tượng lịch focus ô và gọi showPicker()', async () => {
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', { configurable: true, value: showPicker });
    const { container } = render(<Input aria-label="Ngày" type="date" />);
    await userEvent.setup().click((container.querySelector('.lucide-calendar-days') as Element).parentElement as HTMLElement);
    expect(showPicker).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByLabelText('Ngày'));
  });

  it('không ném lỗi khi trình duyệt không có hoặc từ chối showPicker()', async () => {
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      value: () => {
        throw new Error('NotAllowedError');
      },
    });
    const { container } = render(<Input aria-label="Ngày" type="date" />);
    await userEvent.setup().click((container.querySelector('.lucide-calendar-days') as Element).parentElement as HTMLElement);
    expect(document.activeElement).toBe(screen.getByLabelText('Ngày'));
  });

  it('ô disabled hoặc readOnly không mở bộ chọn ngày', async () => {
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', { configurable: true, value: showPicker });
    const { container } = render(<Input aria-label="Ngày" readOnly type="date" />);
    await userEvent.setup().click((container.querySelector('.lucide-calendar-days') as Element).parentElement as HTMLElement);
    expect(showPicker).not.toHaveBeenCalled();
  });

  it('bấm X xóa ngày, focus ô và bắn onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input aria-label="Ngày" clearLabel="Xóa Ngày khởi hành" defaultValue="2026-10-12" onChange={onChange} type="date" />);
    await user.click(clearButton('Xóa Ngày khởi hành') as HTMLElement);
    const input = screen.getByLabelText('Ngày') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('giữ size md/lg và trạng thái invalid', () => {
    render(<Input aria-invalid aria-label="Ngày" size="lg" type="date" />);
    const input = screen.getByLabelText('Ngày');
    expect(input.className).toContain('h-control-lg');
    expect(input.className).toContain('aria-invalid:border-danger');
  });
});
