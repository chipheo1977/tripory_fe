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
  disablePointerDismissal?: boolean;
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

it('modal có scrim nhận pointer và đóng được bằng Esc', async () => {
  const user = userEvent.setup();
  render(<ExampleSheet />);
  await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
  const backdrop = document.querySelector('[data-sheet-backdrop]');
  expect(backdrop?.className).toContain('pointer-events-auto');

  await screen.findByRole('dialog');
  await user.keyboard('{Escape}');
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

it.each(['bottom', 'left', 'right'] as const)('%s Sheet không render nút thu gọn, mở rộng hay đóng bảng', async (position) => {
  const user = userEvent.setup();
  render(<ExampleSheet position={position} />);
  await user.click(screen.getByRole('button', { name: `Mở bảng ${position}` }));
  expect(await screen.findByRole('dialog')).toBeTruthy();

  if (position === 'bottom') {
    const handle = document.querySelector('[data-sheet-handle]');
    expect(handle?.className).toContain('min-h-touch');
  }
  for (const name of ['Thu gọn bảng', 'Mở rộng bảng', 'Đóng bảng']) {
    expect(screen.queryByRole('button', { name })).toBeNull();
  }
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

  it('dismissible mặc định true: Esc đóng Sheet', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ExampleSheet onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onOpenChange.mock.calls.some(([next]) => next === false)).toBe(true);
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

  it('disablePointerDismissal: bấm scrim không đóng, Esc vẫn đóng', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    // onOpenChange nhận thêm tham số details nên `toHaveBeenCalledWith(false)` không khớp; tự lọc theo đối số đầu.
    const closed = () => onOpenChange.mock.calls.some(([next]) => next === false);
    render(<ExampleSheet disablePointerDismissal open onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');

    const backdrop = document.querySelector('[data-sheet-backdrop]') as HTMLElement;
    await user.click(backdrop);
    expect(closed()).toBe(false);

    await user.keyboard('{Escape}');
    expect(closed()).toBe(true);
  });

  it('không có disablePointerDismissal: bấm scrim đóng Sheet modal', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ExampleSheet open onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');

    await user.click(document.querySelector('[data-sheet-backdrop]') as HTMLElement);
    expect(onOpenChange.mock.calls.some(([next]) => next === false)).toBe(true);
  });

  it('resize window tính lại snap points và gỡ listener khi unmount', async () => {
    setViewportHeight(1000);
    const user = userEvent.setup();
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ExampleSheet />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
    await screen.findByRole('dialog');

    act(() => {
      setViewportHeight(500);
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByRole('dialog')).toBeTruthy();

    unmount();
    expect(removeListener.mock.calls.some(([type]) => type === 'resize')).toBe(true);
    removeListener.mockRestore();
  });
});

describe('fillSnap', () => {
  function Filled({ fillSnap }: { fillSnap: boolean }) {
    return (
      <Sheet modal={false} open>
        <SheetContent fillSnap={fillSnap}>
          <SheetTitle>Lịch trình</SheetTitle>
        </SheetContent>
      </Sheet>
    );
  }

  it('fillSnap đặt chiều cao popup bằng mức expanded (px), mặc định thì không', async () => {
    const { unmount } = render(<Filled fillSnap />);
    const sheet = await screen.findByRole('dialog');
    const expanded = Math.min(0.92 * window.innerHeight, window.innerHeight);
    expect(sheet.style.height).toBe(`${expanded}px`);
    unmount();

    render(<Filled fillSnap={false} />);
    expect((await screen.findByRole('dialog')).style.height).toBe('');
  });
});

describe('V�ng cu?n c?a Sheet theo m?c snap', () => {
  it.each([
    ['expanded', true],
    ['medium', false],
    ['peek', false],
  ] as const)('bottom defaultSnap=%s: cu?n n?i dung = %s', async (defaultSnap, scrolls) => {
    render(<ExampleSheet defaultSnap={defaultSnap} open />);
    const sheet = await screen.findByRole('dialog');
    const classes = sheet.className.split(/\s+/);
    expect(classes.includes('overflow-y-auto')).toBe(scrolls);
    expect(classes.includes('overflow-y-hidden')).toBe(!scrolls);
  });

  it.each(['left', 'right'] as const)('%s lu�n overflow-y-auto v� kh�ng c� tay c?m', async (position) => {
    render(<ExampleSheet position={position} defaultSnap="peek" open />);
    const sheet = await screen.findByRole('dialog');
    const classes = sheet.className.split(/\s+/);
    expect(classes.includes('overflow-y-auto')).toBe(true);
    expect(classes.includes('overflow-y-hidden')).toBe(false);
    expect(document.querySelector('[data-sheet-handle]')).toBeNull();
  });

  it('tay c?m bottom aria-hidden v� touch-none', async () => {
    render(<ExampleSheet open />);
    await screen.findByRole('dialog');
    const handle = document.querySelector('[data-sheet-handle]');
    expect(handle?.getAttribute('aria-hidden')).toBe('true');
    expect(handle?.className.split(/\s+/)).toContain('touch-none');
  });
});
