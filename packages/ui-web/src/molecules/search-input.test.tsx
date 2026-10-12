import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SearchInput } from './search-input';

it('có searchbox được đặt tên và xóa bằng nút trong focus order', async () => {
  const user = userEvent.setup();
  const onValueChange = vi.fn();
  render(<SearchInput label="Tìm địa điểm" defaultValue="Huế" onValueChange={onValueChange} />);

  const input = screen.getByRole('searchbox', { name: 'Tìm địa điểm' });
  const clear = screen.getByRole('button', { name: 'Xóa tìm kiếm' });

  input.focus();
  await user.tab();
  expect(document.activeElement).toBe(clear);
  await user.keyboard('{Enter}');
  expect((input as HTMLInputElement).value).toBe('');
  expect(onValueChange).toHaveBeenLastCalledWith('');
  expect(document.activeElement).toBe(input);
});

it('xóa bằng Escape, giữ focus và công bố trạng thái loading', async () => {
  const user = userEvent.setup();
  render(<SearchInput label="Tìm lịch trình" defaultValue="Đà Nẵng" loading />);

  const input = screen.getByRole('searchbox', { name: 'Tìm lịch trình' });
  input.focus();
  await user.keyboard('{Escape}');

  expect((input as HTMLInputElement).value).toBe('');
  expect(document.activeElement).toBe(input);
  expect(screen.getByRole('status', { name: 'Đang tìm kiếm' })).toBeTruthy();
});

it('không hiện nút xóa khi clear bị tắt hoặc giá trị rỗng', () => {
  const { rerender } = render(<SearchInput label="Tìm kiếm" defaultValue="Tripory" clearable={false} />);
  expect(screen.queryByRole('button', { name: 'Xóa tìm kiếm' })).toBeNull();

  rerender(<SearchInput label="Tìm kiếm" />);
  expect(screen.queryByRole('button', { name: 'Xóa tìm kiếm' })).toBeNull();
});
