import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from './sheet';

type Position = 'bottom' | 'left' | 'right';

function ExampleSheet({ modal = true, position = 'bottom', onSnapPointChange, ...sheetProps }: {
  modal?: boolean;
  position?: Position;
  onSnapPointChange?: (snapPoint: number | string | null) => void;
  dismissible?: boolean;
  defaultSnap?: 'peek' | 'medium' | 'expanded';
  insetTop?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <>
      <button type="button">Nội dung nền</button>
      <Sheet modal={modal} position={position} onSnapPointChange={onSnapPointChange} {...sheetProps}>
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

it('modal có scrim nhận pointer và nút đóng built-in', async () => {
  const user = userEvent.setup();
  render(<ExampleSheet />);
  await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
  const backdrop = document.querySelector('[data-sheet-backdrop]');
  expect(backdrop?.className).toContain('pointer-events-auto');

  await user.click(await screen.findByRole('button', { name: 'Đóng bảng' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('non-modal để pointer xuyên viewport, popup vẫn thao tác được và không có scrim', async () => {
  const user = userEvent.setup();
  render(<ExampleSheet modal={false} />);
  await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
  const sheet = await screen.findByRole('dialog');
  expect(document.querySelector('[data-sheet-backdrop]')).toBeNull();
  expect(sheet.parentElement?.className).toContain('pointer-events-none');
  expect(sheet.className).toContain('pointer-events-auto');

  await user.click(screen.getByRole('button', { name: 'Hành động đầu' }));
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
  expect(onSnapPointChange).toHaveBeenLastCalledWith(`${0.92 * window.innerHeight}px`);
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

describe('Sheet mở rộng cho editor', () => {
  const originalInnerHeight = window.innerHeight;

  function setViewportHeight(height: number) {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  }

  afterEach(() => {
    setViewportHeight(originalInnerHeight);
  });

  it('dismissible mặc định true: vẫn có nút "Đóng bảng"', async () => {
    const user = userEvent.setup();
    render(<ExampleSheet />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));

    expect(await screen.findByRole('button', { name: 'Đóng bảng' })).toBeTruthy();
  });

  it('dismissible={false} bỏ nút "Đóng bảng" nhưng giữ các nút snap', async () => {
    const user = userEvent.setup();
    render(<ExampleSheet dismissible={false} modal={false} />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));

    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: 'Đóng bảng' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Thu gọn bảng' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mở rộng bảng' })).toBeTruthy();
  });

  it.each([true, false] as const)('dismissible={false} modal={%s}: Esc không đóng Sheet', async (modal) => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ExampleSheet dismissible={false} modal={modal} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
    await screen.findByRole('dialog');
    onOpenChange.mockClear();

    await user.keyboard('{Escape}');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('dismissible={false} với open controlled: caller không nhận open=false khi nhấn Esc', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ExampleSheet dismissible={false} modal={false} open onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it.each([
    ['peek', 'Thu gọn bảng'],
    ['expanded', 'Mở rộng bảng'],
  ] as const)('defaultSnap=%s mở ở mức đó (nút "%s" bị khóa)', async (defaultSnap, boundaryButton) => {
    const user = userEvent.setup();
    render(<ExampleSheet defaultSnap={defaultSnap} />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));

    const boundary = await screen.findByRole('button', { name: boundaryButton });
    expect(boundary.hasAttribute('disabled')).toBe(true);
    const other = screen.getByRole('button', { name: boundaryButton === 'Thu gọn bảng' ? 'Mở rộng bảng' : 'Thu gọn bảng' });
    expect(other.hasAttribute('disabled')).toBe(false);
  });

  it('đóng rồi mở lại thì trở về mức defaultSnap', async () => {
    const user = userEvent.setup();
    render(<ExampleSheet defaultSnap="expanded" />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
    await user.click(await screen.findByRole('button', { name: 'Thu gọn bảng' }));
    expect(screen.getByRole('button', { name: 'Mở rộng bảng' }).hasAttribute('disabled')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Đóng bảng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));

    expect((await screen.findByRole('button', { name: 'Mở rộng bảng' })).hasAttribute('disabled')).toBe(true);
  });

  it('insetTop kẹp mức expanded ở vh − insetTop', async () => {
    setViewportHeight(568);
    const user = userEvent.setup();
    const onSnapPointChange = vi.fn();
    render(<ExampleSheet insetTop={108} onSnapPointChange={onSnapPointChange} />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));

    await user.click(await screen.findByRole('button', { name: 'Mở rộng bảng' }));

    expect(onSnapPointChange).toHaveBeenLastCalledWith('460px');
  });

  it('resize window tính lại snap points và gỡ listener khi unmount', async () => {
    setViewportHeight(1000);
    const user = userEvent.setup();
    const onSnapPointChange = vi.fn();
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ExampleSheet onSnapPointChange={onSnapPointChange} />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
    await user.click(await screen.findByRole('button', { name: 'Mở rộng bảng' }));
    expect(onSnapPointChange).toHaveBeenLastCalledWith('920px');

    act(() => {
      setViewportHeight(500);
      window.dispatchEvent(new Event('resize'));
    });
    await user.click(screen.getByRole('button', { name: 'Thu gọn bảng' }));
    await user.click(screen.getByRole('button', { name: 'Mở rộng bảng' }));
    expect(onSnapPointChange).toHaveBeenLastCalledWith('460px');

    unmount();
    expect(removeListener.mock.calls.some(([type]) => type === 'resize')).toBe(true);
    removeListener.mockRestore();
  });
});
