import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import * as publicUi from '../index';
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog';

function ExampleDialog({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Dialog>
      <DialogTrigger>Mở hộp thoại</DialogTrigger>
      <DialogContent size={size} initialFocus="#dialog-secondary">
        <DialogTitle>Chỉnh sửa lịch trình</DialogTitle>
        <DialogDescription>Thay đổi thông tin cơ bản.</DialogDescription>
        <button type="button">Hành động đầu</button>
        <button id="dialog-secondary" type="button">Hành động được focus</button>
        <DialogClose>Đóng</DialogClose>
      </DialogContent>
    </Dialog>
  );
}

it.each([
  ['sm', '--dialog-width-sm'],
  ['md', '--dialog-width-md'],
  ['lg', '--dialog-width-lg'],
] as const)('render size %s bằng token chiều rộng', async (size, token) => {
  const user = userEvent.setup();
  render(<ExampleDialog size={size} />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  expect((await screen.findByRole('dialog')).className).toContain(token);
});

it('đặt initial focus, trap Tab và Shift+Tab trong dialog', async () => {
  const user = userEvent.setup();
  render(<ExampleDialog />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  const dialog = await screen.findByRole('dialog', { name: 'Chỉnh sửa lịch trình' });
  const initial = screen.getByRole('button', { name: 'Hành động được focus' });
  await waitFor(() => expect(document.activeElement).toBe(initial));

  for (let index = 0; index < 5; index += 1) await user.tab();
  expect(dialog.contains(document.activeElement)).toBe(true);
  for (let index = 0; index < 5; index += 1) await user.tab({ shift: true });
  expect(dialog.contains(document.activeElement)).toBe(true);
});

it('Esc đóng và trả focus về trigger', async () => {
  const user = userEvent.setup();
  render(<ExampleDialog />);
  const trigger = screen.getByRole('button', { name: 'Mở hộp thoại' });
  trigger.focus();
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('dialog')).toBeTruthy();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

it('nút đóng và scrim đều đóng dialog', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<ExampleDialog />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  await user.click(await screen.findByRole('button', { name: 'Đóng' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  rerender(<ExampleDialog />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  await user.click(document.querySelector('[data-dialog-backdrop]') as HTMLElement);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('khóa body scroll khi mở', async () => {
  const user = userEvent.setup();
  render(<ExampleDialog />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  await screen.findByRole('dialog');
  expect(document.body.style.overflow).toBe('hidden');
});

it('công khai compound parts bằng named exports', () => {
  const names = ['Dialog', 'DialogTrigger', 'DialogContent', 'DialogBackdrop', 'DialogTitle', 'DialogDescription', 'DialogClose'];
  expect(names.every((name) => name in publicUi)).toBe(true);
  expect(DialogBackdrop).toBeTruthy();
});
