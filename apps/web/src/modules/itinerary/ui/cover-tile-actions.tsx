"use client";

// Lớp 2 của lưới ảnh bìa (D-82, D-84): nút X từng ảnh, nút "Thêm ảnh bìa" và các khung trống. Lớp này `pointer-events-none`
// (không chắn radio bên dưới); từng nút/khung tự bật `pointer-events-auto`. Khung trống bấm được bằng chuột/chạm để mở khung
// "Link ảnh", nhưng KHÔNG nhận Tab và không có role (`aria-hidden`): bàn phím và trình đọc màn hình đã có nút "Thêm ảnh bìa".
import { coverSlots } from "@tripory/itinerary";
import { Icon, IconButton } from "@tripory/ui-web";
import { ImagePlus, X } from "lucide-react";

export type CoverTileActionsProps = Readonly<{
  count: number;
  adding: boolean;
  panelId: string;
  onRemove(index: number): void;
  onAdd(): void;
  onOpenFromEmpty(): void;
}>;

function CoverAddTile({
  visible,
  adding,
  panelId,
  onAdd,
}: Readonly<{ visible: boolean; adding: boolean; panelId: string; onAdd(): void }>) {
  if (!visible) return null;
  return (
    <button
      aria-controls={panelId}
      aria-expanded={adding}
      aria-label="Thêm ảnh bìa"
      className="pointer-events-auto flex aspect-(--itinerary-cover-ratio) min-h-touch min-w-touch flex-col items-center justify-center gap-inline-xs rounded-container border border-dashed border-border-strong bg-surface-muted text-label font-semibold text-text hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      data-cover-add=""
      onClick={onAdd}
      type="button"
    >
      <Icon className="text-muted" icon={ImagePlus} size="md" />
      Thêm ảnh
    </button>
  );
}

function EmptyCoverSlot({ onOpen }: Readonly<{ onOpen(): void }>) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-auto aspect-(--itinerary-cover-ratio) cursor-pointer rounded-container border border-dashed border-border hover:bg-surface-muted"
      data-cover-empty=""
      onClick={onOpen}
    />
  );
}

export function CoverTileActions({ count, adding, panelId, onRemove, onAdd, onOpenFromEmpty }: CoverTileActionsProps) {
  const slots = coverSlots(count);
  return (
    <div className="pointer-events-none col-start-1 row-start-1 grid grid-cols-2 gap-inline-sm sm:grid-cols-3">
      {Array.from({ length: slots.filled }, (_, offset) => {
        const position = offset + 1;
        return (
          <div className="relative aspect-(--itinerary-cover-ratio)" key={position}>
            <IconButton
              aria-label={`Xóa ảnh bìa ${position}`}
              className="pointer-events-auto absolute right-inline-xs top-inline-xs rounded-pill"
              data-cover-remove={position}
              onClick={() => onRemove(offset)}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Icon icon={X} size="sm" />
            </IconButton>
          </div>
        );
      })}
      <CoverAddTile adding={adding} onAdd={onAdd} panelId={panelId} visible={slots.hasAddTile} />
      {Array.from({ length: slots.emptyCount }, (_, offset) => (
        <EmptyCoverSlot key={offset} onOpen={onOpenFromEmpty} />
      ))}
    </div>
  );
}
