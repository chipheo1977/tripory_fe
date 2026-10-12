import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import * as publicUi from '../index';
import { EmptyState } from './empty-state';

it.each(['compact', 'page'] as const)('render variant %s với copy mặc định và icon decorative', (variant) => {
  render(<EmptyState variant={variant} icon={<svg data-testid="icon" />} />);
  expect(screen.getByRole('heading', { name: 'Chưa có nội dung' })).toBeTruthy();
  expect(screen.getByText('Nội dung sẽ xuất hiện tại đây khi sẵn sàng.')).toBeTruthy();
  expect(screen.getByTestId('icon').getAttribute('aria-hidden')).toBe('true');
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByRole('link')).toBeNull();
});

it('render heading/body tùy chỉnh và action thật khi được truyền', () => {
  render(
    <EmptyState
      action={<a href="/">Về trang chủ</a>}
      body="Hãy đổi bộ lọc để xem kết quả khác."
      heading="Không có kết quả"
    />,
  );
  expect(screen.getByRole('heading', { name: 'Không có kết quả' })).toBeTruthy();
  expect(screen.getByText('Hãy đổi bộ lọc để xem kết quả khác.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Về trang chủ' }).getAttribute('href')).toBe('/');
});

it('công khai EmptyState qua package entry', () => {
  expect('EmptyState' in publicUi).toBe(true);
});
