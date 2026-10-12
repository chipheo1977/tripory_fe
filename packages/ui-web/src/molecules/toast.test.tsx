import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
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

it('công khai Toast và notify qua package entry', () => {
  expect('Toast' in publicUi).toBe(true);
  expect('notify' in publicUi).toBe(true);
});
