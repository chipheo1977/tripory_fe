import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';

it('toggle bằng Space và click label', async () => {
  const onCheckedChange = vi.fn();
  render(<Checkbox label="Nhận thông báo" onCheckedChange={onCheckedChange} />);
  const checkbox = screen.getByRole('checkbox', { name: 'Nhận thông báo' });
  checkbox.focus();
  await userEvent.setup().keyboard(' ');
  expect(checkbox.getAttribute('aria-checked')).toBe('true');
  await userEvent.setup().click(screen.getByText('Nhận thông báo'));
  expect(checkbox.getAttribute('aria-checked')).toBe('false');
  expect(onCheckedChange).toHaveBeenCalledTimes(2);
});

it('công bố mixed và không toggle khi disabled', async () => {
  render(<Checkbox label="Chọn tất cả" indeterminate disabled />);
  const checkbox = screen.getByRole('checkbox', { name: 'Chọn tất cả' });
  expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
  await userEvent.setup().click(checkbox);
  expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
});
