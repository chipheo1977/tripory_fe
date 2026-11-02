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

function ExampleSheet({ modal = true, position = 'bottom', onSnapPointChange, closeDisabled, ...sheetProps }: {
  closeDisabled?: boolean;
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
        <SheetContent closeDisabled={closeDisabled}>
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

describe('nút X đóng của Sheet bottom (modal và non-modal)', () => {
  const closes = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.some(([next]) => next === false);

  it('có nút "Đóng" với icon X, vùng chạm min-h-touch min-w-touch, không che tay cầm', async () => {
    render(<ExampleSheet open />);
    const sheet = await screen.findByRole('dialog', { name: 'Lịch trình' });
    const button = screen.getByRole('button', { name: 'Đóng' });

    expect(sheet.contains(button)).toBe(true);
    expect(button.querySelector('svg.lucide-x')).not.toBeNull();
    expect(button.className.split(/\s+/)).toEqual(expect.arrayContaining(['min-h-touch', 'min-w-touch', 'absolute', 'right-0', 'top-0']));
    expect(button.hasAttribute('data-base-ui-swipe-ignore')).toBe(true);
    expect((button as HTMLButtonElement).disabled).toBe(false);
    // Tay cầm ở giữa vẫn là phần tử riêng, không bị nút thay thế.
    expect(document.querySelector('[data-sheet-handle]')?.contains(button)).toBe(false);
  });

  it('nút X nằm trong luồng nội dung cuộn của popup: không fixed/sticky ở nút hay tổ tiên tới popup', async () => {
    render(<ExampleSheet defaultSnap="expanded" open />);
    const sheet = await screen.findByRole('dialog', { name: 'Lịch trình' });
    const button = screen.getByRole('button', { name: 'Đóng' });
    const row = button.parentElement as HTMLElement;

    // Popup là vùng cuộn ở mức expanded, hàng chứa X là con trực tiếp (cuộn cùng nội dung).
    expect(sheet.className.split(/\s+/)).toContain('overflow-y-auto');
    expect(row.parentElement).toBe(sheet);
    // Hàng neo `absolute` của nút, nằm trong luồng (relative), không ghim theo viewport hay popup.
    expect(row.className.split(/\s+/)).toEqual(expect.arrayContaining(['relative', 'h-0']));

    for (const node of [button, row, sheet]) {
      const classes = node.className.split(/\s+/);
      expect(classes).not.toContain('fixed');
      expect(classes).not.toContain('sticky');
    }
    // Tay cầm và nội dung cùng là con của popup nên cuộn chung với hàng X.
    expect(document.querySelector('[data-sheet-handle]')?.parentElement).toBe(sheet);
  });

  it.each(['peek', 'medium'] as const)('defaultSnap=%s: popup không cuộn và vẫn có nút X ở góc trên phải', async (defaultSnap) => {
    render(<ExampleSheet defaultSnap={defaultSnap} open />);
    const sheet = await screen.findByRole('dialog', { name: 'Lịch trình' });
    const button = screen.getByRole('button', { name: 'Đóng' });

    expect(sheet.className.split(/\s+/)).toContain('overflow-y-hidden');
    expect(sheet.contains(button)).toBe(true);
    expect(button.className.split(/\s+/)).toEqual(expect.arrayContaining(['right-0', 'top-0']));
  });

  it('bấm nút gọi onOpenChange(false), đóng Sheet, trả focus cho trigger và không đổi mức snap', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSnapPointChange = vi.fn();
    render(<ExampleSheet onOpenChange={onOpenChange} onSnapPointChange={onSnapPointChange} />);
    const trigger = screen.getByRole('button', { name: 'Mở bảng bottom' });
    trigger.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('dialog');
    onSnapPointChange.mockClear();

    await user.click(screen.getByRole('button', { name: 'Đóng' }));

    expect(closes(onOpenChange)).toBe(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(onSnapPointChange).not.toHaveBeenCalled();
  });

  it('closeDisabled: nút bị vô hiệu và bấm không đóng', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ExampleSheet closeDisabled open onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');
    const button = screen.getByRole('button', { name: 'Đóng' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await user.click(button);

    expect(closes(onOpenChange)).toBe(false);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('bottom non-modal (timeline) có nút X trong popup, nhận pointer', async () => {
    render(<ExampleSheet modal={false} open />);
    const sheet = await screen.findByRole('dialog');
    const button = screen.getByRole('button', { name: 'Đóng' });

    expect(sheet.contains(button)).toBe(true);
    expect(sheet.className).toContain('pointer-events-auto');
    expect(button.querySelector('svg.lucide-x')).not.toBeNull();
    expect(button.className.split(/\s+/)).toEqual(expect.arrayContaining(['min-h-touch', 'min-w-touch']));
    expect(button.hasAttribute('data-base-ui-swipe-ignore')).toBe(true);
  });

  it('bottom non-modal: bấm X gọi onOpenChange(false) và đóng Sheet', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ExampleSheet modal={false} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'Mở bảng bottom' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Đóng' }));

    expect(closes(onOpenChange)).toBe(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('bottom non-modal với closeDisabled: nút X bị vô hiệu', async () => {
    render(<ExampleSheet closeDisabled modal={false} open />);
    await screen.findByRole('dialog');
    expect((screen.getByRole('button', { name: 'Đóng' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([true, false] as const)('bottom dismissible={false} modal={%s}: không có nút X', async (modal) => {
    render(<ExampleSheet dismissible={false} modal={modal} open />);
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
  });

  it.each([
    ['left modal', 'left', true],
    ['right modal', 'right', true],
    ['left non-modal', 'left', false],
  ] as const)('%s không có nút X', async (_label, position, modal) => {
    render(<ExampleSheet modal={modal} open position={position} />);
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
    expect(document.querySelector('[data-sheet-close]')).toBeNull();
  });
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
