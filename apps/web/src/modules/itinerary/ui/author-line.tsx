"use client";

// Khối tác giả dưới tiêu đề (D-02, UI-SPEC §AuthorLine). Bốn ca theo (có `author`, là chủ):
//   có & không phải chủ → avatar + tên · có & là chủ → thêm Badge "Lịch trình của bạn" ·
//   không & là chủ → chỉ Badge · không & không phải chủ → không render.
// Chỉ nhận tên và ảnh: không email, không id (T-05-28). Avatar mặc định chung của BE đã thành `null` ở ACL nên hiện chữ cái đầu.
import { Avatar, Badge } from "@tripory/ui-web";

export type AuthorLineProps = Readonly<{
  displayName: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
}>;

function AuthorIdentity({ displayName, avatarUrl }: Readonly<{ displayName: string | null; avatarUrl: string | null }>) {
  if (displayName === null) return null;
  return (
    <>
      <span aria-hidden="true">
        <Avatar name={displayName} size="sm" src={avatarUrl ?? undefined} />
      </span>
      <span className="text-label font-semibold text-text">{displayName}</span>
    </>
  );
}

function OwnerBadge({ visible }: Readonly<{ visible: boolean }>) {
  if (!visible) return null;
  return <Badge variant="neutral">Lịch trình của bạn</Badge>;
}

export function AuthorLine({ displayName, avatarUrl, isOwner }: AuthorLineProps) {
  if (displayName === null && !isOwner) return null;
  return (
    <div className="flex flex-wrap items-center gap-inline-sm">
      <AuthorIdentity avatarUrl={avatarUrl} displayName={displayName} />
      <OwnerBadge visible={isOwner} />
    </div>
  );
}
