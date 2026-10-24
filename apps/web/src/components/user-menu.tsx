"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, Map, MessageCircle, User } from "lucide-react";
import { viewerDisplayName, type Viewer } from "@tripory/identity";
import {
  Avatar,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from "@tripory/ui-web";
import { identity } from "@/composition/identity.client";
import { useSessionActions } from "@/modules/identity/ui/use-session-actions";

export type UserMenuProps = Readonly<{ viewer: Viewer }>;

/**
 * Menu tài khoản của header khi có phiên (AUTH-07, D-12..D-16, D-21).
 *
 * D-15 là ngoại lệ có chủ đích do người dùng chọn: "Hồ sơ" và "Tin nhắn" hiện là mục disabled (aria-disabled, không
 * href) kèm Badge "Sắp có". Phase 6 bật "Hồ sơ", Phase 7 bật "Tin nhắn" bằng cách đổi sang `DropdownMenuLinkItem`.
 */
export function UserMenu({ viewer }: UserMenuProps) {
  const pathname = usePathname();
  const { signOut } = useSessionActions();
  // Lỗi query chỉ làm avatar rơi về chữ cái đầu: không toast, không ErrorState.
  const profile = identity.useMyProfile(true);
  const avatarSrc = profile.data?.avatarUrl ?? viewer.avatarUrl ?? undefined;
  const displayName = viewerDisplayName(viewer);
  const current = (href: string) => (pathname === href ? "page" : undefined);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menu tài khoản: ${displayName}`}
        className="min-h-touch min-w-touch gap-control-gap border-transparent bg-transparent"
      >
        <Avatar name={displayName} size="sm" src={avatarSrc} />
        <span className="hidden max-w-(--user-menu-name-max-width) truncate text-label font-semibold text-text sm:inline">
          {displayName}
        </span>
        <Icon className="hidden sm:block" icon={ChevronDown} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel className="flex max-w-(--user-menu-name-max-width) flex-col">
            <span className="truncate font-semibold text-text">{displayName}</span>
            <span className="truncate font-normal text-muted">{viewer.email}</span>
          </DropdownMenuGroupLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem render={<Link aria-current={current("/itineraries/mine")} href="/itineraries/mine" />}>
          <Icon icon={Map} size="sm" />
          Lịch trình của tôi
        </DropdownMenuLinkItem>
        <DropdownMenuItem disabled>
          <Icon icon={User} size="sm" />
          Hồ sơ
          <Badge className="ml-auto" variant="neutral">Sắp có</Badge>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Icon icon={MessageCircle} size="sm" />
          Tin nhắn
          <Badge className="ml-auto" variant="neutral">Sắp có</Badge>
        </DropdownMenuItem>
        <DropdownMenuLinkItem render={<Link aria-current={current("/settings/password")} href="/settings/password" />}>
          <Icon icon={KeyRound} size="sm" />
          Đổi mật khẩu
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <Icon icon={LogOut} size="sm" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
