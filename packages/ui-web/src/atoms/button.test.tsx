import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Button } from './button';

it.each(['{Enter}', ' '])('kích hoạt bằng %s', async (key) => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Lưu</Button>);
  screen.getByRole('button', { name: 'Lưu' }).focus();
  await userEvent.setup().keyboard(key);
  expect(onClick).toHaveBeenCalledTimes(1);
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
