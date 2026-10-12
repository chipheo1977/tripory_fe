import { render, screen } from '@testing-library/react';
import { MapPin } from 'lucide-react';
import { expect, it } from 'vitest';
import { Icon } from './icon';

it('decorative mặc định bị ẩn', () => {
  const { container } = render(<Icon icon={MapPin} />);
  expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.queryByRole('img')).toBeNull();
});

it('semantic icon có tên do parent cung cấp', () => {
  render(<Icon icon={MapPin} label="Địa điểm" size="lg" />);
  const icon = screen.getByRole('img', { name: 'Địa điểm' });
  expect(icon.classList.contains('size-(--spinner-size-lg)')).toBe(true);
});
