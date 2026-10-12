import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

function ExampleMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Tùy chọn</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Chỉnh sửa</DropdownMenuGroupLabel>
          <DropdownMenuItem>Đổi tên</DropdownMenuItem>
          <DropdownMenuCheckboxItem defaultChecked>Hiện bản đồ</DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup defaultValue="recent">
          <DropdownMenuRadioItem value="recent">Gần đây</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name">Theo tên</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">Xóa lịch trình</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

it('mở bằng Enter, công bố normal/checkbox/radio/danger và điều hướng Arrow', async () => {
  const user = userEvent.setup();
  render(<ExampleMenu />);
  const trigger = screen.getByRole('button', { name: 'Tùy chọn' });

  trigger.focus();
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('menu')).toBeTruthy();
  expect(screen.getByRole('menuitem', { name: 'Đổi tên' })).toBeTruthy();
  expect(screen.getByRole('menuitemcheckbox', { name: 'Hiện bản đồ' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('menuitemradio', { name: 'Gần đây' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('menuitem', { name: 'Xóa lịch trình' }).getAttribute('data-variant')).toBe('danger');

  await user.keyboard('{ArrowDown}');
  expect((document.activeElement as HTMLElement).getAttribute('role')).toMatch(/^menuitem/);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it('mở bằng Space và trả focus khi Escape đóng', async () => {
  const user = userEvent.setup();
  render(<ExampleMenu />);
  const trigger = screen.getByRole('button', { name: 'Tùy chọn' });
  trigger.focus();
  await user.keyboard(' ');
  expect(await screen.findByRole('menu')).toBeTruthy();
  await user.keyboard('{Escape}');
  expect(document.activeElement).toBe(trigger);
});
