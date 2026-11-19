"use client";
// khung mời đăng nhập thay cho ô nhập khi là khách (D-14, UI-SPEC §Khách). đăng nhập xong quay lại đúng trang,
// kể cả `?view`; không tự gửi gì vì khách chưa gõ được chữ. `useSearchParams` cần `<Suspense>` riêng
// (docs Next `use-search-params.md`), fallback dùng đường dẫn chỉ theo pathname.
import { buttonVariants, Icon } from "@tripory/ui-web";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { SOCIAL_COPY } from "./social-copy";
import { useLoginHref, usePathLoginHref } from "./use-login-href";

export type CommentGuestPromptProps = Readonly<{ visible: boolean }>;

function GuestLoginLink({ href }: Readonly<{ href: string }>) {
  return (
    <Link className={buttonVariants({ size: "md", variant: "secondary" })} href={href}>
      <Icon icon={LogIn} size="sm" />
      {SOCIAL_COPY.guestLogin}
    </Link>
  );
}

function SearchAwareLoginLink() {
  return <GuestLoginLink href={useLoginHref()} />;
}

function PromptFrame({ visible, pathHref }: Readonly<{ visible: boolean; pathHref: string }>) {
  if (!visible) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-inline-sm rounded-container border border-border bg-surface px-stack-md py-stack-md">
      <p className="text-body text-muted">{SOCIAL_COPY.guestPrompt}</p>
      <Suspense fallback={<GuestLoginLink href={pathHref} />}>
        <SearchAwareLoginLink />
      </Suspense>
    </div>
  );
}

export function CommentGuestPrompt({ visible }: CommentGuestPromptProps) {
  const pathHref = usePathLoginHref();
  return <PromptFrame pathHref={pathHref} visible={visible} />;
}
