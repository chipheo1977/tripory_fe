"use client";
// nút tim nối `SocialProvider`: hero và tab Tổng quan cùng một nguồn trạng thái (D-03).
// nhánh khách bọc phần dùng `useSearchParams` trong `<Suspense>` riêng (RESEARCH R9; docs Next `use-search-params.md`):
// hero còn nằm trong fallback của Suspense ngoài nên fallback ở đây là chính nút với `next` chỉ gồm pathname.
// khách đăng nhập xong quay lại đúng trang, không tự like (D-08).
import { Suspense } from "react";
import { LikeControl } from "./like-control";
import { useSocialLike } from "./social-context";
import { useLoginHref, usePathLoginHref } from "./use-login-href";

export type ConnectedLikeControlProps = Readonly<{ visible: boolean }>;

const noop = (): void => undefined;

function MemberConnectedLike({ visible }: ConnectedLikeControlProps) {
  const like = useSocialLike();
  return (
    <LikeControl
      count={like.state.count}
      liked={like.state.liked}
      loginHref=""
      mode="member"
      onToggle={like.toggle}
      syncing={like.syncing}
      visible={visible}
    />
  );
}

function GuestLike({ visible, count, loginHref }: Readonly<{ visible: boolean; count: number; loginHref: string }>) {
  return (
    <LikeControl
      count={count}
      liked={false}
      loginHref={loginHref}
      mode="guest"
      onToggle={noop}
      syncing={false}
      visible={visible}
    />
  );
}

function SearchAwareGuestLike({ visible, count }: Readonly<{ visible: boolean; count: number }>) {
  return <GuestLike count={count} loginHref={useLoginHref()} visible={visible} />;
}

function GuestConnectedLike({ visible }: ConnectedLikeControlProps) {
  const { state } = useSocialLike();
  const pathHref = usePathLoginHref();
  return (
    <Suspense fallback={<GuestLike count={state.count} loginHref={pathHref} visible={visible} />}>
      <SearchAwareGuestLike count={state.count} visible={visible} />
    </Suspense>
  );
}

const BY_MODE = { member: MemberConnectedLike, guest: GuestConnectedLike } as const;

export function ConnectedLikeControl({ visible }: ConnectedLikeControlProps) {
  const { mode } = useSocialLike();
  const Variant = BY_MODE[mode];
  return <Variant visible={visible} />;
}
