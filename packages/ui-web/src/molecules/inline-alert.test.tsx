import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
