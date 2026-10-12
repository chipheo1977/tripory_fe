import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Badge } from './badge';

it.each(['neutral', 'primary', 'success', 'warning', 'danger'] as const)('render variant %s bằng text không giả interaction', (variant) => {
  render(<Badge variant={variant}>Đã lưu</Badge>);
  const badge = screen.getByText('Đã lưu');
  expect(badge.getAttribute('data-variant')).toBe(variant);
  expect(screen.queryByRole('button')).toBeNull();
});
