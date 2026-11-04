import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineAlert } from './inline-alert';

describe('InlineAlert', () => {
  it('có role="alert" và hiện nội dung', () => {
    render(<InlineAlert>Email hoặc mật khẩu không đúng.</InlineAlert>);

    expect(screen.getByRole('alert').textContent).toBe('Email hoặc mật khẩu không đúng.');
  });

  it('icon là decorative: aria-hidden và không có role img', () => {
    render(<InlineAlert>Lỗi</InlineAlert>);
    const alert = screen.getByRole('alert');
    const icon = alert.querySelector('svg');

    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it.each([
    { name: 'null', children: null },
    { name: 'undefined', children: undefined },
    { name: 'chuỗi rỗng', children: '' },
    { name: 'false', children: false },
  ])('không render khi children là $name', ({ children }) => {
    const { container } = render(<InlineAlert>{children}</InlineAlert>);

    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mặc định là danger: role="alert" và class danger', () => {
    render(<InlineAlert>Lỗi</InlineAlert>);
    const alert = screen.getByRole('alert');

    expect(alert.className).toContain('border-danger');
    expect(alert.className).toContain('bg-danger-subtle');
    expect(alert.className).toContain('text-danger');
    expect(alert.querySelector('svg')?.getAttribute('class')).toContain('text-danger');
  });

  it('variant="info": role="status", class trung tính và icon text-muted', () => {
    render(<InlineAlert variant="info">Đã khôi phục nội dung chưa lưu</InlineAlert>);
    const status = screen.getByRole('status');

    expect(screen.queryByRole('alert')).toBeNull();
    expect(status.textContent).toBe('Đã khôi phục nội dung chưa lưu');
    expect(status.className).toContain('border-border');
    expect(status.className).toContain('bg-surface-muted');
    expect(status.className).toContain('text-text');
    expect(status.className).not.toContain('danger');
    const icon = status.querySelector('svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('class')).toContain('text-muted');
    expect(icon?.getAttribute('class')).not.toContain('text-danger');
  });

  it.each([
    { name: 'null', children: null },
    { name: 'chuỗi rỗng', children: '' },
    { name: 'false', children: false },
  ])('variant="info" không render khi children là $name', ({ children }) => {
    const { container } = render(<InlineAlert variant="info">{children}</InlineAlert>);

    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('nối thêm className của caller', () => {
    render(<InlineAlert className="mb-stack-md">Lỗi</InlineAlert>);

    expect(screen.getByRole('alert').className).toContain('mb-stack-md');
  });

  it('nhận nội dung phần tử React', () => {
    render(
      <InlineAlert>
        <strong>Chú ý:</strong> hết hạn
      </InlineAlert>,
    );

    expect(screen.getByRole('alert').textContent).toContain('Chú ý: hết hạn');
  });
});

describe('InlineAlert action', () => {
  it('hiện action trong alert và bấm được', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<InlineAlert action={<button onClick={onRetry} type="button">Thử lại</button>}>Không lưu được.</InlineAlert>);
    const alert = screen.getByRole('alert');
    const button = screen.getByRole('button', { name: 'Thử lại' });
    expect(alert.contains(button)).toBe(true);
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('không có action thì chỉ có icon và nội dung', () => {
    render(<InlineAlert>Lỗi</InlineAlert>);
    const alert = screen.getByRole('alert');
    expect(alert.children).toHaveLength(2);
    expect(alert.children[0]?.tagName.toLowerCase()).toBe('svg');
    expect(alert.children[1]?.tagName.toLowerCase()).toBe('span');
  });

  it('variant info kèm action vẫn là role status', () => {
    render(
      <InlineAlert action={<button type="button">Xem</button>} variant="info">
        Đã khôi phục
      </InlineAlert>,
    );
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mặc định kèm action vẫn là role alert', () => {
    render(<InlineAlert action={<button type="button">Thử lại</button>}>Lỗi</InlineAlert>);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('không render khi children rỗng dù có action', () => {
    const { container } = render(<InlineAlert action={<button type="button">Thử lại</button>}>{null}</InlineAlert>);
    expect(container.innerHTML).toBe('');
  });
});
