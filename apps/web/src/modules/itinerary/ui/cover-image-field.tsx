"use client";

// Lưới 5 ô ảnh bìa (D-82..D-86): lớp 1 là radiogroup chỉ chứa radio ảnh, lớp 2 là nút X, nút thêm và khung trống. Component
// chỉ ghép JSX; state và thao tác ở `use-cover-field.ts`, thao tác danh sách ở domain. Ảnh mặc định của điểm đến không
// bao giờ vào danh sách. Thứ tự Tab: radio đang chọn → các nút "Xóa ảnh bìa N" → "Thêm ảnh bìa" → khung Link ảnh.
import type { CoverGallery } from "@tripory/itinerary";
import { useId, useRef } from "react";
import { CoverChoiceGroup } from "./cover-choice-group";
import { CoverTileActions } from "./cover-tile-actions";
import { CoverUrlPanel } from "./cover-url-panel";
import { useCoverField } from "./use-cover-field";

export type CoverImageFieldProps = Readonly<{
  images: readonly string[];
  selectedIndex: number | null;
  onChange(next: CoverGallery): void;
  /** Điểm đến có ảnh mặc định: chỉ ảnh hưởng dòng ghi chú khi danh sách rỗng. */
  hasDefaultCover: boolean;
  error?: string;
  disabled?: boolean;
}>;

function CoverFieldError({ id, message }: Readonly<{ id: string; message: string | undefined }>) {
  if (message === undefined) return null;
  return (
    <p className="text-label text-danger" id={id} role="alert">
      {message}
    </p>
  );
}

export function CoverImageField({ images, selectedIndex, onChange, hasDefaultCover, error, disabled }: CoverImageFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const field = useCoverField({ rootRef, images, selectedIndex, onChange, hasDefaultCover, disabled });
  const labelId = useId();
  const descId = useId();
  const errorId = useId();
  const panelId = useId();
  const describedBy = error === undefined ? descId : `${descId} ${errorId}`;

  return (
    <div className="flex flex-col gap-stack-sm" ref={rootRef}>
      <p className="text-label font-semibold text-text" id={labelId}>
        Ảnh bìa
      </p>
      <p className="text-label text-muted" id={descId}>
        Tối đa 5 ảnh. Chọn một ảnh để hiển thị.
      </p>
      <div className="grid">
        <CoverChoiceGroup
          describedBy={describedBy}
          images={images}
          invalid={error !== undefined}
          labelId={labelId}
          onSelect={field.select}
          selectedIndex={selectedIndex}
          visible={images.length > 0}
        />
        <CoverTileActions
          adding={field.adding}
          count={images.length}
          onAdd={field.toggleAdding}
          onOpenFromEmpty={field.openFromEmpty}
          onRemove={field.remove}
          panelId={panelId}
        />
      </div>
      <CoverFieldError id={errorId} message={error} />
      <p aria-live="polite" className="text-label text-muted">
        {field.note}
      </p>
      <p aria-live="polite" className="sr-only">
        {field.announce}
      </p>
      <CoverUrlPanel existing={images} onAdd={field.add} onCancel={field.cancel} panelId={panelId} visible={field.adding} />
    </div>
  );
}
