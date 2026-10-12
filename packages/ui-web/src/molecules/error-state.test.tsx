import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import * as publicUi from '../index';
import { ErrorState } from './error-state';

it.each(['inline', 'card', 'page'] as const)('render variant %s với copy cố định và không có action khi thiếu callback', (variant) => {
  render(<ErrorState variant={variant} />);
  expect(screen.getByRole('heading', { name: 'Không thể tải nội dung' })).toBeTruthy();
  expect(screen.getByText('Đã xảy ra sự cố. Vui lòng thử lại.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
});

it('click Thử lại gọi onRetry đúng một lần', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  render(<ErrorState onRetry={onRetry} />);
  await user.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it('Enter trên Thử lại gọi onRetry đúng một lần', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  render(<ErrorState onRetry={onRetry} />);
  const retry = screen.getByRole('button', { name: 'Thử lại' });
  retry.focus();
  await user.keyboard('{Enter}');
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it('API và source không nhận hoặc render chi tiết lỗi kỹ thuật', () => {
  const source = readFileSync('src/molecules/error-state.tsx', 'utf8');
  expect(source).not.toContain('error.message');
  expect(source).not.toMatch(/\bdigest\b/);
  expect(source).not.toContain('.stack');
  expect(source).not.toMatch(/\berror\s*:/i);
});

it('công khai ErrorState qua package entry', () => {
  expect('ErrorState' in publicUi).toBe(true);
});
