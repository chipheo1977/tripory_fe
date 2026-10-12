import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Spinner } from './spinner';

it('standalone có status và accessible label', () => {
  render(<Spinner label="Đang lưu" />);
  expect(screen.getByRole('status', { name: 'Đang lưu' })).toBeTruthy();
});

it('decorative ẩn khỏi accessibility tree', () => {
  const { container } = render(<Spinner decorative />);
  expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.queryByRole('status')).toBeNull();
});
