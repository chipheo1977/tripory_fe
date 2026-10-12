import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import * as publicUi from '../index';
import { Card } from './card';

it('render Card tĩnh không có button semantics', () => {
  render(<Card data-testid="card">Nội dung</Card>);
  const card = screen.getByTestId('card');
  expect(card.tagName).toBe('DIV');
  expect(screen.queryByRole('button')).toBeNull();
  expect(card.className).toContain('p-stack-md');
});

it.each([
  ['sm', 'p-inline-sm'],
  ['md', 'p-stack-md'],
  ['lg', 'p-stack-lg'],
] as const)('dùng padding %s từ semantic token', (padding, className) => {
  render(<Card data-testid="card" padding={padding}>Nội dung</Card>);
  expect(screen.getByTestId('card').className).toContain(className);
});

it('Card interactive là button thật và kích hoạt bằng Enter', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(<Card variant="interactive" onClick={onClick}>Mở lịch trình</Card>);
  const card = screen.getByRole('button', { name: 'Mở lịch trình' });
  card.focus();
  await user.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('Card selected công bố aria-pressed và có chỉ dấu không chỉ dựa màu', () => {
  render(<Card variant="selected" onClick={() => {}}>Đã chọn</Card>);
  const card = screen.getByRole('button', { name: 'Đã chọn' });
  expect(card.getAttribute('aria-pressed')).toBe('true');
  expect(card.querySelector('[aria-hidden="true"]')).toBeTruthy();
});

it('công khai Card qua package entry', () => {
  expect('Card' in publicUi).toBe(true);
});
