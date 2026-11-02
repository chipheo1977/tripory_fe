import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Label } from './label';
import { Textarea } from './textarea';

it('liên kết label, error và nhận nhập liệu', async () => {
  render(<><Label htmlFor="note">Ghi chú</Label><Textarea id="note" aria-invalid aria-describedby="note-error" /><p id="note-error">Cần thêm nội dung</p></>);
  const textarea = screen.getByRole('textbox', { name: 'Ghi chú' });
  await userEvent.setup().type(textarea, 'Nội dung');
  expect(textarea.getAttribute('aria-invalid')).toBe('true');
  expect(textarea.getAttribute('aria-describedby')).toBe('note-error');
  expect((textarea as HTMLTextAreaElement).value).toBe('Nội dung');
  expect(textarea.className).toContain('min-h-(--textarea-min-height)');
});

describe('allowClear', () => {
  const clearButton = (name = 'Xóa nội dung') => screen.queryByRole('button', { name });

  it('mặc định false: không có nút X và DOM vẫn là một <textarea> trần', () => {
    const { container } = render(<Textarea aria-label="Ghi chú" defaultValue="a" />);
    expect(clearButton()).toBeNull();
    expect(container.firstElementChild?.tagName).toBe('TEXTAREA');
  });

  it('chỉ hiện nút khi có giá trị, ẩn khi disabled hoặc readOnly', () => {
    const { rerender } = render(<Textarea allowClear aria-label="Ghi chú" />);
    expect(clearButton()).toBeNull();
    rerender(<Textarea allowClear aria-label="Ghi chú" defaultValue="a" key="a" />);
    expect(clearButton()).not.toBeNull();
    rerender(<Textarea allowClear aria-label="Ghi chú" defaultValue="a" disabled key="b" />);
    expect(clearButton()).toBeNull();
    rerender(<Textarea allowClear aria-label="Ghi chú" defaultValue="a" key="c" readOnly />);
    expect(clearButton()).toBeNull();
  });

  it('nút X căn góc trên bên phải, chừa padding phải và vùng chạm 44px', () => {
    render(<Textarea allowClear aria-label="Ghi chú" defaultValue="a" />);
    const button = clearButton() as HTMLElement;
    expect(button.className).toContain('top-0');
    expect(button.className).toContain('right-inline-xs');
    expect(button.className).not.toContain('top-1/2');
    expect(button.className).toContain('min-h-touch');
    expect(button.className).toContain('min-w-touch');
    expect(screen.getByRole('textbox', { name: 'Ghi chú' }).className).toContain('pr-page-block');
  });

  it('bấm X xóa giá trị uncontrolled, focus lại ô và bắn onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea allowClear aria-label="Ghi chú" defaultValue="Săn mây" onChange={onChange} />);
    await user.click(clearButton() as HTMLElement);
    const textarea = screen.getByRole('textbox', { name: 'Ghi chú' }) as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
    expect(document.activeElement).toBe(textarea);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0]?.[0] as { target: HTMLTextAreaElement }).target.value).toBe('');
    expect(clearButton()).toBeNull();
  });

  it('bấm X cập nhật ô controlled qua value/onChange', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState('Săn mây');
      return <Textarea allowClear aria-label="Ghi chú" onChange={(event) => setValue(event.target.value)} value={value} />;
    }
    render(<Harness />);
    await user.click(clearButton() as HTMLElement);
    expect((screen.getByRole('textbox', { name: 'Ghi chú' }) as HTMLTextAreaElement).value).toBe('');
  });

  it('theo dõi giá trị khi gõ', async () => {
    const user = userEvent.setup();
    render(<Textarea allowClear aria-label="Ghi chú" />);
    await user.type(screen.getByRole('textbox', { name: 'Ghi chú' }), 'ab');
    expect(clearButton()).not.toBeNull();
  });

  it('nhãn mặc định và clearLabel tùy chỉnh; ref trỏ tới <textarea>; wrapperClassName vào vùng bao', () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { container, rerender } = render(<Textarea allowClear aria-label="Ghi chú" defaultValue="a" ref={ref} wrapperClassName="mt-stack-sm" />);
    expect(clearButton('Xóa nội dung')).not.toBeNull();
    expect(ref.current?.tagName).toBe('TEXTAREA');
    expect((container.firstElementChild as HTMLElement).className).toContain('mt-stack-sm');
    rerender(<Textarea allowClear aria-label="Ghi chú" clearLabel="Xóa Mô tả" defaultValue="a" key="x" />);
    expect(clearButton('Xóa Mô tả')).not.toBeNull();
  });

  it('nút có type="button" nên không submit form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Textarea allowClear aria-label="Ghi chú" defaultValue="a" />
      </form>,
    );
    await user.click(clearButton() as HTMLElement);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
