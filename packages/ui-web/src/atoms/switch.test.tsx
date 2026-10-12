import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Switch } from './switch';

it('có role/state đúng và toggle bằng Space hoặc label', async () => {
  const onCheckedChange = vi.fn();
  render(<Switch label="Chế độ yên lặng" onCheckedChange={onCheckedChange} />);
  const control = screen.getByRole('switch', { name: 'Chế độ yên lặng' });
  expect(control.getAttribute('aria-checked')).toBe('false');
  control.focus();
  await userEvent.setup().keyboard(' ');
  expect(control.getAttribute('aria-checked')).toBe('true');
  await userEvent.setup().click(screen.getByText('Chế độ yên lặng'));
  expect(control.getAttribute('aria-checked')).toBe('false');
  expect(onCheckedChange).toHaveBeenCalledTimes(2);
});

it('không toggle khi disabled', async () => {
  render(<Switch label="Đồng bộ" disabled />);
  const control = screen.getByRole('switch', { name: 'Đồng bộ' });
  await userEvent.setup().click(control);
  expect(control.getAttribute('aria-checked')).toBe('false');
});
