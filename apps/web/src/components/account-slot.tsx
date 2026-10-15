import { getViewer } from "@/composition/viewer.server";
import { GuestLoginButton } from "@/modules/identity/ui/guest-login-button";
import { UserMenu } from "./user-menu";

/**
 * Ô tài khoản của header. Server Component đọc phiên từ cookie (không gọi BE) nên PHẢI nằm trong `<Suspense>`:
 * với Cache Components, đọc `cookies()` ngoài Suspense làm hỏng prerender. Chỉ truyền `viewer` (object thuần,
 * không có token) sang Client Component (T-03-65).
 */
export async function AccountSlot() {
  const viewer = await getViewer();

  return viewer ? <UserMenu viewer={viewer} /> : <GuestLoginButton />;
}
