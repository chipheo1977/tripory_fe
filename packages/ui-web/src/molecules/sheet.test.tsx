import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from './sheet';

type Position = 'bottom' | 'left' | 'right';

function ExampleSheet({ modal = true, position = 'bottom', onSnapPointChange }: {
  modal?: boolean;
  position?: Position;
  onSnapPointChange?: (snapPoint: number | string | null) => void;
}) {
  return (
    <>
      <button type="button">Nội dung nền</button>
      <Sheet modal={modal} position={position} onSnapPointChange={onSnapPointChange}>
        <SheetTrigger>Mở bảng {position}</SheetTrigger>
        <SheetContent>
          <SheetTitle>Lịch trình</SheetTitle>
          <SheetDescription>Các điểm đến trong ngày.</SheetDescription>
          <button type="button">Hành động đầu</button>
          <SheetClose>Đóng tùy chỉnh</SheetClose>
        </SheetContent>
      </Sheet>
    </>
  );
}

it.each([
  ['bottom', 'down'],
  ['left', 'left'],
  ['right', 'right'],
] as const)('render Sheet %s với hướng vuốt %s', async (position, swipeDirection) => {
  const user = userEvent.setup();
  render(<ExampleSheet position={position} />);
  await user.click(screen.getByRole('button', { name: `Mở bảng ${position}` }));

  const sheet = await screen.findByRole('dialog', { name: 'Lịch trình' });
  expect(sheet.getAttribute('data-sheet-position')).toBe(position);
  expect(sheet.getAttribute('data-swipe-direction')).toBe(swipeDirection);
  expect(sheet.className).toContain(position === 'bottom' ? 'w-full' : '--sheet-side-width');
});

it.each(['bottom', 'left', 'right'] as const)('%s modal trap focus, Esc đóng và trả focus', async (position) => {
  const user = userEvent.setup();
  render(<ExampleSheet position={position} />);
  const trigger = screen.getByRole('button', { name: `Mở bảng ${position}` });
  trigger.focus();
  await user.keyboard('{Enter}');

  const sheet = await screen.findByRole('dialog', { name: 'Lịch trình' });
  for (let index = 0; index < 7; index += 1) await user.tab();
  await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));

  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

it('modal có scrim và nút đóng built-in', async () => {
  const user = userEvent.setup();
  render(<ExampleSheet />);
  await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
  expect(document.querySelector('[data-sheet-backdrop]')).toBeTruthy();

  await user.click(await screen.findByRole('button', { name: 'Đóng bảng' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('non-modal không có scrim, nền thao tác được và outside press không đóng', async () => {
  const user = userEvent.setup();
  const backgroundAction = vi.fn();
  render(
    <div onClick={backgroundAction}>
      <ExampleSheet modal={false} />
    </div>,
  );
  await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
  expect(await screen.findByRole('dialog')).toBeTruthy();
  expect(document.querySelector('[data-sheet-backdrop]')).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Nội dung nền' }));
  expect(backgroundAction).toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeTruthy();
});

it('bottom mở ở medium và controls bước qua ba snap point', async () => {
  const user = userEvent.setup();
  const onSnapPointChange = vi.fn();
  render(<ExampleSheet onSnapPointChange={onSnapPointChange} />);
  await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));

  const handle = document.querySelector('[data-sheet-handle]');
  expect(handle?.className).toContain('min-h-touch');
  const collapse = await screen.findByRole('button', { name: 'Thu gọn bảng' });
  const expand = screen.getByRole('button', { name: 'Mở rộng bảng' });
  expect(collapse.hasAttribute('disabled')).toBe(false);
  expect(expand.hasAttribute('disabled')).toBe(false);

  await user.click(expand);
  expect(onSnapPointChange).toHaveBeenLastCalledWith(0.92);
  expect(expand.hasAttribute('disabled')).toBe(true);
  await user.click(collapse);
  await user.click(collapse);
  expect(onSnapPointChange.mock.calls.at(-1)?.[0]).toMatch(/px$/u);
  expect(collapse.hasAttribute('disabled')).toBe(true);
});

it('side Sheet không render snap controls', async () => {
  const user = userEvent.setup();
  render(<ExampleSheet position="right" />);
  await user.click(screen.getByRole('button', { name: 'Mở bảng right' }));
  expect(await screen.findByRole('dialog')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Mở rộng bảng' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Thu gọn bảng' })).toBeNull();
});

it('nút close tùy chỉnh đóng Sheet', async () => {
  render(<ExampleSheet />);
  fireEvent.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Đóng tùy chỉnh' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
