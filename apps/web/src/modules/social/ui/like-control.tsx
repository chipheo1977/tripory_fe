"use client";
// nút tim của lịch trình (D-04..D-08, UI-SPEC §Nút tim). chỉ trình bày: số và trạng thái do nơi gọi truyền.
// - người đã đăng nhập: `button` có `aria-pressed`, tên "Thích lịch trình"/"Bỏ thích lịch trình" (D-06).
// - khách: link tới trang đăng nhập (D-08), không tự like sau khi quay lại.
// - số like đọc qua `aria-describedby` ("{n} lượt thích"); số trên nút `aria-hidden` để không đọc hai lần.
// - đã thích không chỉ bằng màu: tim tô đầy + `aria-pressed` + đổi tên. nút cao 40px theo token (U-01).
// - đang đồng bộ (D-27) thì khóa và `aria-busy`, không spinner; bấm liên tục không khóa (ý định cuối thắng, D-07).
import { Button, buttonVariants, Icon } from "@tripory/ui-web";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { SOCIAL_COPY } from "./social-copy";
import { formatCount, likeDescription } from "./social-format";

export type LikeControlProps = Readonly<{
  visible: boolean;
  mode: "member" | "guest";
  count: number;
  liked: boolean;
  syncing: boolean;
  loginHref: string;
  onToggle(): void;
}>;

type VariantProps = Omit<LikeControlProps, "visible" | "mode"> & Readonly<{ descriptionId: string }>;

const heartClass = (liked: boolean): string => (liked ? "fill-current text-primary" : "text-text");

// `buttonVariants` là cva, không gộp class: lớp nền `secondary` thắng nếu không có hậu tố `!`.
const LIKED_BUTTON_CLASS =
  "border-primary-border! bg-primary-subtle! hover:not-data-disabled:border-primary! hover:not-data-disabled:bg-primary-subtle!";
const likedButtonClass = (liked: boolean): string => (liked ? LIKED_BUTTON_CLASS : "");

function LikeBody({ count, liked, descriptionId }: Readonly<{ count: number; liked: boolean; descriptionId: string }>) {
  return (
    <>
      <Icon className={heartClass(liked)} icon={Heart} size="sm" />
      <span aria-hidden="true" className="tabular-nums">
        {formatCount(count)}
      </span>
      <span className="sr-only" id={descriptionId}>
        {likeDescription(count)}
      </span>
    </>
  );
}

function MemberLike({ count, liked, syncing, onToggle, descriptionId }: VariantProps) {
  const label = liked ? SOCIAL_COPY.unlikeLabel : SOCIAL_COPY.likeLabel;
  return (
    <Button
      aria-busy={syncing || undefined}
      aria-describedby={descriptionId}
      aria-label={label}
      aria-pressed={liked}
      className={likedButtonClass(liked)}
      disabled={syncing}
      onClick={onToggle}
      size="md"
      type="button"
      variant="secondary"
    >
      <LikeBody count={count} descriptionId={descriptionId} liked={liked} />
    </Button>
  );
}

function GuestLike({ count, loginHref, descriptionId }: VariantProps) {
  return (
    <Link
      aria-describedby={descriptionId}
      aria-label={SOCIAL_COPY.guestLikeLabel}
      className={buttonVariants({ size: "md", variant: "secondary" })}
      href={loginHref}
    >
      <LikeBody count={count} descriptionId={descriptionId} liked={false} />
    </Link>
  );
}

const BY_MODE = { member: MemberLike, guest: GuestLike } as const;

export function LikeControl({ visible, mode, ...rest }: LikeControlProps) {
  const descriptionId = useId();
  if (!visible) return null;
  const Variant = BY_MODE[mode];
  return <Variant {...rest} descriptionId={descriptionId} />;
}
