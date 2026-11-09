"use client";

// Ô "Tìm địa điểm" của form điểm đến (MAP-01, D-146, D-150, D-153): combobox ARIA 1.2 với danh sách nằm ngay dưới ô.
// ↓/↑ đổi lựa chọn (quay vòng), Enter chọn và không bao giờ gửi form, Esc bỏ lựa chọn → xóa chữ → (ô trống) đóng form.
// Esc chưa tới bước đóng form thì vùng bọc mang `data-escape-scope` và dừng nổi bọt, như `destination-block.tsx`.
import type { Place } from "@tripory/itinerary";
import { SearchInput } from "@tripory/ui-web";
import { useId, useState, type KeyboardEvent, type Ref } from "react";
import { NO_ACTIVE_INDEX, nextActiveIndex } from "./combobox-navigation";
import { PlaceAttribution } from "./place-attribution";
import { PlaceListMessage } from "./place-list-message";
import { placeStatusText } from "./place-list-state";
import { placeOptionId, PlaceListbox } from "./place-option";
import { usePlaceResults } from "./use-place-results";

export const PLACE_SEARCH_LABEL = "Tìm địa điểm";
export const PLACE_SEARCH_PLACEHOLDER = "Tìm tên địa điểm, ví dụ Hồ Xuân Hương";

export type PlaceSearchFieldProps = Readonly<{
  visible?: boolean;
  destinationCode: string | null;
  /** Tên điểm đến của lịch trình cho "Gợi ý ở …"; `null` = không gợi ý, chỉ nhắc gõ để tìm. */
  destinationName: string | null;
  onPick(place: Place): void;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  /** Id của dòng lỗi "Vị trí" của form; có thì ô được đánh dấu lỗi và trỏ `aria-describedby` tới dòng đó. */
  errorId?: string | undefined;
}>;

type Active = Readonly<{ items: readonly Place[]; index: number }>;

const ARROW_KEYS: ReadonlySet<string> = new Set(["ArrowDown", "ArrowUp"]);

export function PlaceSearchField({ visible = true, ...props }: PlaceSearchFieldProps) {
  if (!visible) return null;
  return <SearchCombobox {...props} />;
}

function SearchCombobox({
  destinationCode,
  destinationName,
  onPick,
  inputRef,
  disabled = false,
  errorId,
}: Omit<PlaceSearchFieldProps, "visible">) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Active | null>(null);
  const listId = useId();
  const labelId = useId();
  const optionPrefix = useId();
  const { state, loading, retry } = usePlaceResults(query, destinationCode, destinationName);
  const { items } = state;
  // Danh sách đổi (từ khóa mới, gợi ý tải xong) thì bỏ lựa chọn cũ.
  const activeIndex = active?.items === items ? active.index : NO_ACTIVE_INDEX;
  const expanded = state.status === "ready";
  const activeId = activeIndex === NO_ACTIVE_INDEX ? undefined : placeOptionId(optionPrefix, activeIndex);
  const escapeScoped = query !== "" || activeIndex !== NO_ACTIVE_INDEX;

  const pick = (place: Place) => {
    setActive(null);
    setQuery("");
    onPick(place);
  };

  const handleEscape = (event: KeyboardEvent<HTMLInputElement>) => {
    if (activeIndex !== NO_ACTIVE_INDEX) {
      // Bước 1: chỉ bỏ lựa chọn; `preventDefault` để SearchInput không xóa chữ cùng lúc.
      event.preventDefault();
      event.stopPropagation();
      setActive(null);
      return;
    }
    // Bước 2: SearchInput tự xóa chữ; không để Esc tới form.
    if (query !== "") event.stopPropagation();
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (ARROW_KEYS.has(event.key)) {
      event.preventDefault();
      setActive({ items, index: nextActiveIndex(event.key, activeIndex, items.length) });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = items[activeIndex];
      if (option !== undefined) pick(option);
      return;
    }
    if (event.key === "Escape") handleEscape(event);
  };

  return (
    <div className="flex flex-col gap-stack-sm">
      <div data-escape-scope={escapeScoped ? "" : undefined}>
        {/* Trong FormField, Base UI gắn `aria-labelledby` = nhãn "Vị trí" và nó thắng `aria-label`: đặt tên riêng. */}
        <span className="sr-only" id={labelId}>
          {PLACE_SEARCH_LABEL}
        </span>
        <SearchInput
          aria-activedescendant={activeId}
          aria-labelledby={labelId}
          aria-autocomplete="list"
          aria-controls={expanded ? listId : undefined}
          aria-describedby={errorId}
          aria-expanded={expanded}
          aria-invalid={errorId === undefined ? undefined : true}
          autoComplete="off"
          disabled={disabled}
          inputRef={inputRef}
          label={PLACE_SEARCH_LABEL}
          loading={loading}
          onKeyDown={handleKey}
          onValueChange={setQuery}
          placeholder={PLACE_SEARCH_PLACEHOLDER}
          role="combobox"
          size="lg"
          value={query}
        />
      </div>
      <PlaceListbox
        activeIndex={activeIndex}
        heading={state.heading}
        id={listId}
        items={items}
        onPick={pick}
        optionPrefix={optionPrefix}
        visible={expanded}
      />
      <PlaceListMessage message={state.message} onRetry={retry} status={state.status} visible={!expanded} />
      <PlaceAttribution visible={expanded} />
      <p className="sr-only" role="status">
        {placeStatusText(state)}
      </p>
    </div>
  );
}
