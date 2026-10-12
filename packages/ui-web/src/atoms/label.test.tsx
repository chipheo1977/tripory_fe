import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Label } from './label';

it('focus control liên kết và công bố bắt buộc bằng chữ', async () => {
  render(<><Label htmlFor="city" required>Thành phố</Label><input id="city" /></>);
  await userEvent.setup().click(screen.getByText('Thành phố'));
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /Thành phố/ }));
  expect(screen.getByText('(bắt buộc)').getAttribute('aria-hidden')).toBeNull();
});

it('hiển thị chỉ báo không bắt buộc', () => {
  render(<Label htmlFor="note" optional>Ghi chú</Label>);
  expect(screen.getByText('(không bắt buộc)')).toBeTruthy();
});
