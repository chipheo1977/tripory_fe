import { act, render, screen, waitFor } from '@testing-library/react';
import { createElement, type ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';
import { Sheet, SheetContent, SheetTitle, type SheetDefaultSnap } from './sheet';

type RootProps = ComponentProps<typeof import('@base-ui/react/drawer').Drawer.Root>;
const captured = vi.hoisted(() => ({ props: null as unknown }));

// Bọc Drawer.Root để lấy props Sheet truyền xuống và gọi `onSnapPointChange` như lúc vuốt thật (jsdom không vuốt được).
vi.mock('@base-ui/react/drawer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@base-ui/react/drawer')>();
  const Root = (props: RootProps) => {
    captured.props = props;
    return createElement(actual.Drawer.Root, props);
  };
  return { ...actual, Drawer: { ...actual.Drawer, Root } };
});

const rootProps = () => captured.props as RootProps;

function Example({ snap, onSnapChange, fixedSnap = false }: { snap?: SheetDefaultSnap; onSnapChange?: (snap: SheetDefaultSnap) => void; fixedSnap?: boolean }) {
  return (
    <Sheet fixedSnap={fixedSnap} modal={false} onSnapChange={onSnapChange} open snap={snap}>
      <SheetContent>
        <SheetTitle>Lịch trình</SheetTitle>
      </SheetContent>
    </Sheet>
  );
}

const popupClasses = async () => (await screen.findByRole('dialog')).className.split(/\s+/);

it('controlled: mức hiển thị theo prop snap và đổi khi cha đổi snap', async () => {
  const { rerender } = render(<Example snap="expanded" />);

  expect((await popupClasses()).includes('overflow-y-auto')).toBe(true);
  expect(rootProps().snapPoint).toBe(rootProps().snapPoints?.[2]);

  rerender(<Example snap="peek" />);
  await waitFor(async () => expect((await popupClasses()).includes('overflow-y-hidden')).toBe(true));
  expect(rootProps().snapPoint).toBe(rootProps().snapPoints?.[0]);

  rerender(<Example snap="medium" />);
  expect(rootProps().snapPoint).toBe(rootProps().snapPoints?.[1]);
});

it('kéo tới mức khác gọi onSnapChange bằng tên mức, còn controlled thì mức giữ nguyên cho tới khi cha đổi', async () => {
  const onSnapChange = vi.fn();
  render(<Example onSnapChange={onSnapChange} snap="peek" />);
  await screen.findByRole('dialog');

  const points = rootProps().snapPoints ?? [];
  act(() => {
    rootProps().onSnapPointChange?.(points[2] ?? null, {} as never);
  });

  expect(onSnapChange).toHaveBeenCalledTimes(1);
  expect(onSnapChange).toHaveBeenCalledWith('expanded');
  expect(rootProps().snapPoint).toBe(points[0]);
});

it('uncontrolled: vẫn tự đổi mức và báo tên mức', async () => {
  const onSnapChange = vi.fn();
  render(<Example onSnapChange={onSnapChange} />);
  await screen.findByRole('dialog');
  const points = rootProps().snapPoints ?? [];

  act(() => {
    rootProps().onSnapPointChange?.(points[0] ?? null, {} as never);
  });

  expect(onSnapChange).toHaveBeenCalledWith('peek');
  expect(rootProps().snapPoint).toBe(points[0]);
});

it('fixedSnap: bỏ qua snap và không gọi onSnapChange', async () => {
  const onSnapChange = vi.fn();
  render(<Example fixedSnap onSnapChange={onSnapChange} snap="peek" />);
  await screen.findByRole('dialog');
  const points = rootProps().snapPoints ?? [];

  act(() => {
    rootProps().onSnapPointChange?.(points[0] ?? null, {} as never);
  });

  expect(points).toHaveLength(1);
  expect(onSnapChange).not.toHaveBeenCalled();
});
