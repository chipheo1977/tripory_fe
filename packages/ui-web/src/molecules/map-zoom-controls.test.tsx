import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { MapZoomControls } from './map-zoom-controls';

const setup = (props: Partial<Parameters<typeof MapZoomControls>[0]> = {}) => {
  const onZoomIn = vi.fn();
  const onZoomOut = vi.fn();
  render(<MapZoomControls canZoomIn canZoomOut onZoomIn={onZoomIn} onZoomOut={onZoomOut} {...props} />);
  return { onZoomIn, onZoomOut, user: userEvent.setup() };
};

it('có nhóm "Thu phóng bản đồ" với hai nút Phóng to, Thu nhỏ', () => {
  setup();

  const group = screen.getByRole('group', { name: 'Thu phóng bản đồ' });
  expect(group.querySelectorAll('button')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Phóng to' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Thu nhỏ' })).toBeTruthy();
});

it('nút 48px (size lg)', () => {
  setup();

  const classes = screen.getByRole('button', { name: 'Phóng to' }).className.split(/\s+/);
  expect(classes).toEqual(expect.arrayContaining(['h-control-sm', 'w-control-sm']));
  expect(classes).not.toContain('h-control-lg');
});

it('bấm gọi đúng handler', async () => {
  const { onZoomIn, onZoomOut, user } = setup();

  await user.click(screen.getByRole('button', { name: 'Phóng to' }));
  await user.click(screen.getByRole('button', { name: 'Thu nhỏ' }));

  expect(onZoomIn).toHaveBeenCalledTimes(1);
  expect(onZoomOut).toHaveBeenCalledTimes(1);
});

it('dùng được bằng Tab, Enter và Space', async () => {
  const { onZoomIn, onZoomOut, user } = setup();

  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Phóng to' }));
  await user.keyboard('{Enter}');
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Thu nhỏ' }));
  await user.keyboard(' ');

  expect(onZoomIn).toHaveBeenCalledTimes(1);
  expect(onZoomOut).toHaveBeenCalledTimes(1);
});

it('vô hiệu nút ở biên zoom', async () => {
  const { onZoomIn, onZoomOut, user } = setup({ canZoomIn: false, canZoomOut: false });

  const zoomIn = screen.getByRole('button', { name: 'Phóng to' });
  const zoomOut = screen.getByRole('button', { name: 'Thu nhỏ' });
  await user.click(zoomIn);
  await user.click(zoomOut);

  expect(zoomIn.hasAttribute('disabled') || zoomIn.getAttribute('aria-disabled') === 'true' || zoomIn.hasAttribute('data-disabled')).toBe(true);
  expect(onZoomIn).not.toHaveBeenCalled();
  expect(onZoomOut).not.toHaveBeenCalled();
});

it('visible=false không render gì', () => {
  const { container } = render(<MapZoomControls canZoomIn canZoomOut onZoomIn={() => undefined} onZoomOut={() => undefined} visible={false} />);

  expect(container.firstChild).toBeNull();
});

it('labels ghi đè nhãn mặc định và className được truyền tiếp', () => {
  setup({ className: 'extra', labels: { group: 'Zoom', zoomIn: 'In', zoomOut: 'Out' } });

  expect(screen.getByRole('group', { name: 'Zoom' }).className.split(/\s+/)).toContain('extra');
  expect(screen.getByRole('button', { name: 'In' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Out' })).toBeTruthy();
});
