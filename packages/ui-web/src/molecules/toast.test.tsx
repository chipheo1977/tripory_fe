import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast as sonnerToast } from 'sonner';
import * as publicUi from '../index';
import { Toast, notify, toastDurations } from './toast';

afterEach(() => {
  sonnerToast.dismiss();
});

it('cấu hình light theme, tối đa ba thông báo và duration đúng contract', () => {
  expect(toastDurations).toEqual({ default: 5_000, extended: 8_000 });
  const { container } = render(<Toast />);
  const region = container.querySelector('[data-toast-adapter]');
  expect(region?.getAttribute('data-theme')).toBe('light');
  expect(region?.getAttribute('data-visible-toasts')).toBe('3');
});

it.each([
  ['success', 'Đã lưu', 'status', 'polite'],
  ['info', 'Thông tin', 'status', 'polite'],
  ['warning', 'Cảnh báo', 'status', 'polite'],
  ['error', 'Không thể lưu', 'alert', 'assertive'],
] as const)('hiển thị severity %s trong live region phù hợp', async (variant, title, role, live) => {
  render(<Toast />);
  notify[variant](title, { description: 'Nội dung thông báo' });
  const item = await screen.findByRole(role);
  expect(item.getAttribute('aria-live')).toBe(live);
  expect(item.textContent).toContain(title);
  expect(screen.getByText('Nội dung thông báo')).toBeTruthy();
});

it('action và dismiss vận hành bằng bàn phím', async () => {
  const user = userEvent.setup();
  const onAction = vi.fn();
  render(<Toast />);
  notify.success('Đã lưu', { action: { label: 'Hoàn tác', onClick: onAction } });

  const action = await screen.findByRole('button', { name: 'Hoàn tác' });
  action.focus();
  await user.keyboard('{Enter}');
  expect(onAction).toHaveBeenCalledTimes(1);

  const dismiss = screen.getByRole('button', { name: 'Đóng thông báo' });
  dismiss.focus();
  await user.keyboard(' ');
  await waitFor(() => expect(screen.queryByText('Đã lưu')).toBeNull());
});

describe('notify.undoable', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('không tự đóng sau 10 giây và nằm trong vùng role="status"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Toast />);
    notify.undoable('Đã xóa "Chợ Bến Thành"', { actionLabel: 'Hoàn tác', onAction: vi.fn() });

    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('Đã xóa "Chợ Bến Thành"');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByText('Đã xóa "Chợ Bến Thành"')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hoàn tác' })).toBeTruthy();
  });

  it('bấm action bằng chuột gọi onAction một lần, đóng toast và không gọi onDismiss', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(<Toast />);
    notify.undoable('Đã xóa điểm', { actionLabel: 'Hoàn tác', onAction, onDismiss });

    await user.click(await screen.findByRole('button', { name: 'Hoàn tác' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Đã xóa điểm')).toBeNull());
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('Tab tới action rồi Enter gọi onAction một lần', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Toast />);
    notify.undoable('Đã xóa điểm', { actionLabel: 'Hoàn tác', onAction });

    const action = await screen.findByRole('button', { name: 'Hoàn tác' });
    for (let index = 0; index < 6 && document.activeElement !== action; index += 1) await user.tab();
    expect(document.activeElement).toBe(action);
    await user.keyboard('{Enter}');

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('dismiss(id) đóng toast và gọi onDismiss', async () => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(<Toast />);
    let id: ReturnType<typeof notify.undoable> | undefined;
    act(() => {
      id = notify.undoable('Đã xóa điểm', { actionLabel: 'Hoàn tác', onAction, onDismiss });
    });
    await screen.findByText('Đã xóa điểm');

    act(() => {
      notify.dismiss(id);
    });

    await waitFor(() => expect(screen.queryByText('Đã xóa điểm')).toBeNull());
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('nút đóng của toast gọi onDismiss', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Toast />);
    notify.undoable('Đã xóa điểm', { actionLabel: 'Hoàn tác', onAction: vi.fn(), onDismiss });

    await user.click(await screen.findByRole('button', { name: 'Đóng thông báo' }));

    await waitFor(() => expect(screen.queryByText('Đã xóa điểm')).toBeNull());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

it('công khai Toast và notify qua package entry', () => {
  expect('Toast' in publicUi).toBe(true);
  expect('notify' in publicUi).toBe(true);
});
