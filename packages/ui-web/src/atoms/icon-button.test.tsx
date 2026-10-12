import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { IconButton } from './icon-button';

it.each(['{Enter}', ' '])('có tên và kích hoạt bằng %s', async (key) => {
  const onClick = vi.fn();
  render(<IconButton aria-label="Xóa" onClick={onClick}>×</IconButton>);
  const button = screen.getByRole('button', { name: 'Xóa' });
  button.focus();
  await userEvent.setup().keyboard(key);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(button.className).toContain('min-h-touch');
  expect(button.className).toContain('min-w-touch');
});

it('không kích hoạt khi disabled', async () => {
  const onClick = vi.fn();
  render(<IconButton aria-label="Xóa" disabled onClick={onClick}>×</IconButton>);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Xóa' }));
  expect(onClick).not.toHaveBeenCalled();
});
