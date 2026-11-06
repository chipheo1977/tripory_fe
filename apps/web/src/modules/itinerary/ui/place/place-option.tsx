"use client";

// Danh sách kết quả của ô tìm địa điểm (D-150): `listbox` nằm ngay dưới ô (không phải popup nổi, form là bottom sheet
// trên mobile). Focus luôn ở ô tìm; lựa chọn đang active đi qua `aria-activedescendant`. Tên địa điểm chỉ render
// dạng text node của React, không bao giờ chèn HTML thô.
import { formatCoordinate, PLACE_CATEGORY_LABELS, type Place } from "@tripory/itinerary";
import { cn } from "@tripory/ui-web";
import { useId } from "react";

export const placeOptionId = (prefix: string, index: number): string => `${prefix}-${index}`;

/** Dòng chính: tên, không có tên thì địa chỉ, không có nữa thì tọa độ. Dòng phụ: nhãn danh mục + địa chỉ (nếu chưa dùng). */
export function placeOptionText(place: Place): Readonly<{ title: string; detail: string }> {
  const title = place.name ?? place.address ?? formatCoordinate(place.coordinate);
  const address = place.name === null ? null : place.address;
  const detail = [PLACE_CATEGORY_LABELS[place.category], address].filter((part) => part !== null).join(" · ");
  return { title, detail };
}

type PlaceOptionProps = Readonly<{ place: Place; id: string; active: boolean; onPick(place: Place): void }>;

function PlaceOption({ place, id, active, onPick }: PlaceOptionProps) {
  const { title, detail } = placeOptionText(place);
  return (
    // Bàn phím đi qua combobox (↓/↑/Enter ở ô tìm), nên option không nhận focus và không cần keydown riêng.
    <li
      aria-selected={active}
      className={cn(
        "flex min-h-touch cursor-pointer flex-col justify-center rounded-control px-inline-sm py-inline-xs hover:bg-surface-muted",
        active ? "bg-surface-muted outline-2 outline-focus-ring" : undefined,
      )}
      id={id}
      onClick={() => onPick(place)}
      // Giữ focus ở ô tìm khi bấm chuột: không blur trước khi click được xử lý.
      onMouseDown={(event) => event.preventDefault()}
      role="option"
    >
      <span className="text-body font-medium text-text">{title}</span>
      <span className="text-label text-muted">{detail}</span>
    </li>
  );
}

export type PlaceListboxProps = Readonly<{
  visible: boolean;
  id: string;
  heading: string | null;
  items: readonly Place[];
  activeIndex: number;
  optionPrefix: string;
  onPick(place: Place): void;
}>;

export function PlaceListbox({ visible, id, heading, items, activeIndex, optionPrefix, onPick }: PlaceListboxProps) {
  const headingId = useId();
  if (!visible) return null;
  return (
    <div className="flex flex-col gap-inline-xs">
      <p className="px-inline-sm text-label font-semibold text-muted" id={headingId}>
        {heading}
      </p>
      <ul aria-labelledby={headingId} className="flex flex-col" id={id} role="listbox">
        {items.map((place, index) => (
          <PlaceOption
            active={index === activeIndex}
            id={placeOptionId(optionPrefix, index)}
            key={place.id}
            onPick={onPick}
            place={place}
          />
        ))}
      </ul>
    </div>
  );
}
