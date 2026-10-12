import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Skeleton } from './skeleton';

it.each(['text', 'circle', 'block'] as const)('render %s như phần tử trang trí', (variant) => {
  const { container } = render(<Skeleton variant={variant} />);
  const skeleton = container.firstElementChild;
  expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
  expect(skeleton?.getAttribute('data-variant')).toBe(variant);
});
