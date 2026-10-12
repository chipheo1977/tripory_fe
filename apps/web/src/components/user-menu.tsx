import { Avatar } from "@tripory/ui-web";

export function UserMenu() {
  return (
    <div className="flex min-h-touch items-center gap-control-gap" aria-label="Khu vực tài khoản">
      <Avatar alt="Tài khoản" name="Tài khoản" size="sm" />
      <span className="text-label font-semibold text-text">Tài khoản</span>
    </div>
  );
}
