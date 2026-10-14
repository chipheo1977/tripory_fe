import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLinkItem,
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

// Menu kiểu UserMenu (D-14, D-15): link nội bộ, mục "sắp có" disabled, căn phải.
function UserMenuExample({ align, onNavigate = () => undefined }: { align?: 'start' | 'center' | 'end'; onNavigate?: (href: string) => void }) {
  const handleClick = (href: string) => (event: { preventDefault: () => void }) => {
    // jsdom không cài đặt điều hướng; app thật truyền next/link qua `render`.
    event.preventDefault();
    onNavigate(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Tài khoản</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLinkItem onClick={handleClick('/itineraries/mine')} render={<a href="/itineraries/mine" />}>
          Lịch trình của tôi
        </DropdownMenuLinkItem>
        <DropdownMenuItem disabled>Hồ sơ</DropdownMenuItem>
        <DropdownMenuItem disabled>Tin nhắn</DropdownMenuItem>
        <DropdownMenuLinkItem onClick={handleClick('/settings/password')} render={<a href="/settings/password" />}>
          Đổi mật khẩu
        </DropdownMenuLinkItem>
        <DropdownMenuItem>Đăng xuất</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenuLinkItem', () => {
  it('render <a href> có role menuitem khi truyền render={<a href />}', async () => {
    const user = userEvent.setup();
    render(<UserMenuExample />);
    screen.getByRole('button', { name: 'Tài khoản' }).focus();
    await user.keyboard('{Enter}');

    const link = await screen.findByRole('menuitem', { name: 'Lịch trình của tôi' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/itineraries/mine');
  });

  it('nhận href trực tiếp khi không cần render', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Mở</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLinkItem href="/x" onClick={(event) => event.preventDefault()}>
            Tới X
          </DropdownMenuLinkItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    screen.getByRole('button', { name: 'Mở' }).focus();
    await user.keyboard('{Enter}');

    expect((await screen.findByRole('menuitem', { name: 'Tới X' })).getAttribute('href')).toBe('/x');
  });

  it('Enter trên mục link kích hoạt đúng một lần', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<UserMenuExample onNavigate={onNavigate} />);
    screen.getByRole('button', { name: 'Tài khoản' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    // Mở bằng bàn phím thì Base UI đã focus mục đầu tiên.
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Lịch trình của tôi' }));
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('/itineraries/mine');
  });

  it('chọn link thì đóng menu (UserMenu nằm trong layout, điều hướng client không unmount nó)', async () => {
    const user = userEvent.setup();
    render(<UserMenuExample />);
    screen.getByRole('button', { name: 'Tài khoản' }).focus();
    await user.keyboard('{Enter}');

    await user.click(await screen.findByRole('menuitem', { name: 'Đổi mật khẩu' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closeOnClick={false} giữ menu mở', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Mở</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLinkItem closeOnClick={false} href="/x" onClick={(event) => event.preventDefault()}>
            Tới X
          </DropdownMenuLinkItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    screen.getByRole('button', { name: 'Mở' }).focus();
    await user.keyboard('{Enter}');

    await user.click(await screen.findByRole('menuitem', { name: 'Tới X' }));
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('dùng chung class mục menu và variant danger như DropdownMenuItem', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Mở</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Mục thường</DropdownMenuItem>
          <DropdownMenuLinkItem href="/x" onClick={(event) => event.preventDefault()} variant="danger">
            Link nguy hiểm
          </DropdownMenuLinkItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    screen.getByRole('button', { name: 'Mở' }).focus();
    await user.keyboard('{Enter}');

    const plain = await screen.findByRole('menuitem', { name: 'Mục thường' });
    const danger = screen.getByRole('menuitem', { name: 'Link nguy hiểm' });
    expect(danger.getAttribute('data-variant')).toBe('danger');
    expect(plain.getAttribute('data-variant')).toBe('default');
    for (const token of ['min-h-touch', 'rounded-control', 'px-inline-sm']) {
      expect(danger.className).toContain(token);
    }
  });
});

describe('DropdownMenuContent align', () => {
  const positionerOf = () => document.querySelector('[data-align]') as HTMLElement;

  it('mặc định căn start', async () => {
    const user = userEvent.setup();
    render(<UserMenuExample />);
    screen.getByRole('button', { name: 'Tài khoản' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    expect(positionerOf().getAttribute('data-align')).toBe('start');
  });

  it('align="end" được chuyển xuống positioner', async () => {
    const user = userEvent.setup();
    render(<UserMenuExample align="end" />);
    screen.getByRole('button', { name: 'Tài khoản' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    expect(positionerOf().getAttribute('data-align')).toBe('end');
  });
});

describe('DropdownMenuItem disabled (D-15)', () => {
  it('có aria-disabled và data-disabled, nhưng vẫn là menuitem', async () => {
    const user = userEvent.setup();
    render(<UserMenuExample />);
    screen.getByRole('button', { name: 'Tài khoản' }).focus();
    await user.keyboard('{Enter}');

    const disabled = await screen.findByRole('menuitem', { name: 'Hồ sơ' });
    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    expect(disabled.hasAttribute('data-disabled')).toBe(true);
    expect(disabled.hasAttribute('href')).toBe(false);
  });

  // Kết quả xác minh Base UI 1.8.0 (D-15): `Menu.Item` tự gọi useButton với `focusableWhenDisabled: true`
  // (menu/item/useMenuItem.mjs), nên mũi tên tới được mục disabled mà không cần prop thêm, cả ArrowDown lẫn ArrowUp.
  // Chỉ có một khác biệt: khi mở menu bằng phím, focus ban đầu bỏ qua mục disabled đứng đầu và rơi vào mục enabled đầu tiên.
  // UserMenu bắt đầu bằng link "Lịch trình của tôi" (enabled) nên không bị ảnh hưởng.
  it('phím mũi tên tới được mục disabled để trình đọc màn hình đọc "Hồ sơ"', async () => {
    const user = userEvent.setup();
    render(<UserMenuExample />);
    screen.getByRole('button', { name: 'Tài khoản' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    // Mở bằng bàn phím thì Base UI đã focus mục đầu tiên (link), mũi tên đi tiếp qua hai mục disabled.
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Lịch trình của tôi' }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Hồ sơ' }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Tin nhắn' }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Đổi mật khẩu' }));
  });

  it('ArrowUp từ mục phía dưới cũng dừng ở mục disabled', async () => {
    const user = userEvent.setup();
    render(<UserMenuExample />);
    screen.getByRole('button', { name: 'Tài khoản' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Đăng xuất' }));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Đổi mật khẩu' }));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Tin nhắn' }));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Hồ sơ' }));
  });

  it('chọn mục disabled bằng Enter hoặc click không kích hoạt và không đóng menu', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Mở</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Khác</DropdownMenuItem>
          <DropdownMenuItem disabled onClick={onClick}>
            Hồ sơ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    screen.getByRole('button', { name: 'Mở' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Hồ sơ' }));
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('menuitem', { name: 'Hồ sơ' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
  });
});
