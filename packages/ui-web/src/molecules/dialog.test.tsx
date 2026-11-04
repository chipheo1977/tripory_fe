import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
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
      <DialogContent size={size} initialFocus={() => document.querySelector('#dialog-secondary') as HTMLElement}>
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

  const close = screen.getByRole('button', { name: 'Đóng' });
  await user.tab();
  expect(document.activeElement).toBe(close);
  await user.tab();
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  await user.tab({ shift: true });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
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

it('dùng modal backdrop phủ viewport để Base UI quản lý scroll lock', async () => {
  const user = userEvent.setup();
  render(<ExampleDialog />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  await screen.findByRole('dialog');
  const backdrop = document.querySelector('[data-dialog-backdrop]');
  expect(backdrop?.className).toContain('fixed');
  expect(backdrop?.className).toContain('min-h-dvh');
});

it('công khai compound parts bằng named exports', () => {
  const names = ['Dialog', 'DialogTrigger', 'DialogContent', 'DialogBackdrop', 'DialogTitle', 'DialogDescription', 'DialogClose'];
  expect(names.every((name) => name in publicUi)).toBe(true);
  expect(DialogBackdrop).toBeTruthy();
});

type CloseButtonDialogProps = {
  showCloseButton?: boolean;
  closeDisabled?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function CloseButtonDialog({ showCloseButton, closeDisabled, onOpenChange }: CloseButtonDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      onOpenChange={(next) => {
        onOpenChange?.(next);
        setOpen(next);
      }}
      open={open}
    >
      <DialogTrigger>Mở hộp thoại</DialogTrigger>
      <DialogContent closeDisabled={closeDisabled} showCloseButton={showCloseButton}>
        <DialogTitle>Thông tin chuyến đi</DialogTitle>
        <button type="button">Nội dung</button>
      </DialogContent>
    </Dialog>
  );
}

it('mặc định không có nút X Đóng', async () => {
  const user = userEvent.setup();
  render(<CloseButtonDialog />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  await screen.findByRole('dialog');
  expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
});

it('showCloseButton hiện nút X, bấm gọi onOpenChange(false) và trả focus về trigger', async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  render(<CloseButtonDialog onOpenChange={onOpenChange} showCloseButton />);
  const trigger = screen.getByRole('button', { name: 'Mở hộp thoại' });
  await user.click(trigger);
  await user.click(await screen.findByRole('button', { name: 'Đóng' }));
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

it('Esc vẫn đóng khi có nút X', async () => {
  const user = userEvent.setup();
  render(<CloseButtonDialog showCloseButton />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  await screen.findByRole('dialog');
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('closeDisabled vô hiệu nút X và bấm không đóng', async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  render(<CloseButtonDialog closeDisabled onOpenChange={onOpenChange} showCloseButton />);
  await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
  const close = await screen.findByRole('button', { name: 'Đóng' });
  expect(close.hasAttribute('data-disabled')).toBe(true);
  onOpenChange.mockClear();
  await user.click(close);
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeTruthy();
});
