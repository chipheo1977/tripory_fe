import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Separator } from './separator';

it('decorative mặc định bị ẩn', () => {
  const { container } = render(<Separator />);
  expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.queryByRole('separator')).toBeNull();
});

it('semantic công bố role và orientation', () => {
  render(<Separator semantic orientation="vertical" />);
  expect(screen.getByRole('separator').getAttribute('aria-orientation')).toBe('vertical');
});
