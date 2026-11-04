"use client";

// Một dòng điểm đến trong danh sách chọn (D-60, D-64). `onClick` của Radio chỉ chạy khi bấm hoặc Space, không chạy khi
// đổi bằng phím mũi tên; Enter bị Base UI chặn nên bắt ở `onKeyDown` (RESEARCH R3.2). Nhờ vậy `onCommit` (chọn và chuyển
// khối) chỉ xảy ra khi người dùng chủ động xác nhận, còn mũi tên chỉ đổi lựa chọn.
import { Icon, Radio } from "@tripory/ui-web";
import { Check } from "lucide-react";

export type DestinationOptionProps = Readonly<{
  slug: string;
  name: string;
  /** Alias đã khớp khi tìm; `null` nếu khớp theo tên hoặc không tìm. */
  alias: string | null;
  onCommit(slug: string): void;
}>;

function AliasLine({ alias, visible }: Readonly<{ alias: string | null; visible: boolean }>) {
  if (!visible || alias === null) return null;
  return <span className="text-label text-muted">gồm {alias}</span>;
}

function accessibleName(name: string, alias: string | null): string {
  if (alias === null) return name;
  return `${name}, gồm ${alias}`;
}

export function DestinationOption({ slug, name, alias, onCommit }: DestinationOptionProps) {
  return (
    <Radio
      aria-label={accessibleName(name, alias)}
      className="group flex min-h-touch w-full items-center gap-inline-sm rounded-control border border-transparent px-inline-sm py-inline-xs text-left hover:bg-surface-muted data-checked:border-primary-border data-checked:bg-primary-subtle"
      data-destination-option=""
      onClick={() => onCommit(slug)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit(slug);
      }}
      value={slug}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body group-data-checked:font-semibold">{name}</span>
        <AliasLine alias={alias} visible={alias !== null} />
      </span>
      <Icon className="invisible text-primary group-data-checked:visible" icon={Check} size="sm" />
    </Radio>
  );
}
