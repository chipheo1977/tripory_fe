import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

it.each(['{Enter}', ' '])('kích hoạt bằng %s', async (key) => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Lưu</Button>);
  screen.getByRole('button', { name: 'Lưu' }).focus();
  await userEvent.setup().keyboard(key);
  expect(onClick).toHaveBeenCalledTimes(1);
});

describe('loadingLabel (D-30)', () => {
  it('hiện nhãn đang gửi cùng Spinner decorative, thay cho children', () => {
    render(
      <Button loading loadingLabel="Đang lưu…">
        Lưu
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Đang lưu…' });

    expect(button.textContent).toBe('Đang lưu…');
    expect(screen.queryByText('Lưu')).toBeNull();
    expect(button.getAttribute('aria-busy')).toBe('true');
    // Spinner decorative: không có role status và bị ẩn khỏi cây truy cập.
    expect(screen.queryByRole('status')).toBeNull();
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('click lần hai khi đang gửi không gọi handler', async () => {
    const onClick = vi.fn();
    render(
      <Button loading loadingLabel="Đang lưu…" onClick={onClick}>
        Lưu
      </Button>,
    );
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Đang lưu…' });

    await user.click(button);
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    // focusableWhenDisabled: vẫn nằm trong thứ tự Tab để người dùng bàn phím biết nút đang bận.
    expect(button.tabIndex).toBe(0);
  });

  it('không bấm Enter được khi đang gửi (chặn gửi lần hai bằng phím)', async () => {
    const onClick = vi.fn();
    render(
      <Button loading loadingLabel="Đang lưu…" onClick={onClick}>
        Lưu
      </Button>,
    );
    screen.getByRole('button', { name: 'Đang lưu…' }).focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hiện children bình thường khi không loading dù có loadingLabel', () => {
    render(<Button loadingLabel="Đang lưu…">Lưu</Button>);
    const button = screen.getByRole('button', { name: 'Lưu' });

    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(screen.queryByText('Đang lưu…')).toBeNull();
  });

  it('giữ hành vi cũ khi loading mà không có loadingLabel: children ẩn bằng invisible', () => {
    render(<Button loading>Lưu</Button>);
    const button = screen.getByRole('button');

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Lưu').className).toContain('invisible');
  });
});

it.each([
  { state: 'disabled', props: { disabled: true } },
  { state: 'loading', props: { loading: true } },
])('không kích hoạt khi $state', async ({ props }) => {
  const onClick = vi.fn();
  render(<Button {...props} onClick={onClick}>Lưu</Button>);
  const button = screen.getByRole('button', { name: 'Lưu' });
  await userEvent.setup().click(button);
  expect(onClick).not.toHaveBeenCalled();
  if ('loading' in props) {
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.tabIndex).toBe(0);
  }
});
