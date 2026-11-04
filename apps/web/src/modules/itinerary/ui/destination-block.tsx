"use client";

// Khối Điểm đến của form tạo (D-59, D-60, D-61): ô tìm không dấu theo tên và alias, nhóm "Phổ biến" + "Tất cả" khi chưa
// tìm, nhóm "Kết quả tìm kiếm" hoặc empty state khi đang tìm. Nhận danh mục qua prop (không đọc catalog, luật D).
// Esc trong ô tìm khi có chữ chỉ xóa chữ: vùng bọc mang `data-escape-scope` và dừng nổi bọt để modal không đóng.
import {
  normalizeSearchText,
  popularDestinations,
  searchDestinations,
  type Destination,
  type DestinationMatch,
} from "@tripory/itinerary";
import { EmptyState, Icon, RadioGroup, SearchInput } from "@tripory/ui-web";
import { SearchX } from "lucide-react";
import { useId, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { flushSync } from "react-dom";
import { BlockError } from "./block-error";
import { DestinationOption } from "./destination-option";

export type DestinationBlockHandle = Readonly<{
  focusFirstOption(): void;
  /** Ô tìm (input nhìn thấy) để container đặt `initialFocus` của modal trên desktop. `null` khi chưa mount. */
  getSearchElement(): HTMLInputElement | null;
  /** Focus ô tìm, không xóa từ khóa. */
  focusSearch(): void;
}>;

export type DestinationBlockProps = Readonly<{
  destinations: readonly Destination[];
  /** Slug đang chọn. */
  value: string | null;
  /** Đổi lựa chọn (kể cả bằng mũi tên), KHÔNG chuyển khối. */
  onValueChange(slug: string): void;
  /** Bấm, Space hoặc Enter: chọn và chuyển khối. */
  onCommit(slug: string): void;
  error?: string;
  disabled: boolean;
  handleRef?: Ref<DestinationBlockHandle>;
}>;

type GroupItem = Readonly<{ destination: Destination; alias: string | null }>;

type GroupConfig = Readonly<{
  value: string | null;
  onValueChange(slug: string): void;
  onCommit(slug: string): void;
  errorId: string;
  hasError: boolean;
  disabled: boolean;
}>;

function DestinationGroup({
  visible,
  label,
  items,
  group,
}: Readonly<{ visible: boolean; label: string; items: readonly GroupItem[]; group: GroupConfig }>) {
  const labelId = useId();
  if (!visible) return null;
  return (
    <div>
      <p className="px-inline-sm pb-inline-xs pt-stack-sm text-label font-semibold text-muted" id={labelId}>
        {label}
      </p>
      <RadioGroup
        aria-describedby={group.hasError ? group.errorId : undefined}
        aria-invalid={group.hasError ? true : undefined}
        aria-labelledby={labelId}
        disabled={group.disabled}
        onValueChange={(next) => {
          if (typeof next === "string") group.onValueChange(next);
        }}
        value={group.value}
      >
        {items.map(({ destination, alias }) => (
          <DestinationOption
            alias={alias}
            key={destination.slug}
            name={destination.name}
            onCommit={group.onCommit}
            slug={destination.slug}
          />
        ))}
      </RadioGroup>
    </div>
  );
}

function SearchEmpty({ visible, query }: Readonly<{ visible: boolean; query: string }>) {
  if (!visible) return null;
  return (
    <EmptyState
      body="Thử tên tỉnh, thành phố mới hoặc tên cũ, ví dụ Đà Lạt."
      heading={`Không tìm thấy "${query}"`}
      icon={<Icon icon={SearchX} size="lg" />}
      variant="compact"
    />
  );
}

function searchStatus(searching: boolean, count: number): string {
  if (!searching) return "";
  if (count === 0) return "Không có kết quả";
  return `${count} kết quả`;
}

const searchInputOf = (root: HTMLElement | null): HTMLInputElement | null =>
  root?.querySelector<HTMLInputElement>("input") ?? null;

const plainItems = (list: readonly Destination[]): readonly GroupItem[] =>
  list.map((destination) => ({ destination, alias: null }));

const matchItems = (matches: readonly DestinationMatch[]): readonly GroupItem[] =>
  matches.map((match) => ({ destination: match.destination, alias: match.matchedAlias }));

export function DestinationBlock({
  destinations,
  value,
  onValueChange,
  onCommit,
  error,
  disabled,
  handleRef,
}: DestinationBlockProps) {
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const errorId = useId();
  const matches = searchDestinations(destinations, query);
  const searching = normalizeSearchText(query) !== "";
  const group: GroupConfig = { value, onValueChange, onCommit, errorId, hasError: error !== undefined, disabled };

  useImperativeHandle(
    handleRef,
    () => ({
      focusFirstOption() {
        flushSync(() => setQuery(""));
        rootRef.current?.querySelector<HTMLElement>("[data-destination-option]")?.focus();
      },
      getSearchElement: () => searchInputOf(rootRef.current),
      focusSearch() {
        searchInputOf(rootRef.current)?.focus();
      },
    }),
    [],
  );

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const first = matches[0];
      if (first !== undefined) onCommit(first.destination.slug);
      return;
    }
    if (event.key === "Escape" && query !== "") event.stopPropagation();
  };

  return (
    <div className="flex flex-col gap-stack-sm" ref={rootRef}>
      <div data-escape-scope={searching ? "" : undefined}>
        <SearchInput
          disabled={disabled}
          label="Tìm điểm đến"
          onKeyDown={handleSearchKey}
          onValueChange={setQuery}
          placeholder="Tìm tỉnh, thành phố, ví dụ Đà Lạt"
          size="lg"
          value={query}
        />
      </div>
      <BlockError id={errorId} message={error} />
      <DestinationGroup group={group} items={plainItems(popularDestinations(destinations))} label="Phổ biến" visible={!searching} />
      <DestinationGroup group={group} items={plainItems(destinations)} label="Tất cả" visible={!searching} />
      <DestinationGroup
        group={group}
        items={matchItems(matches)}
        label="Kết quả tìm kiếm"
        visible={searching && matches.length > 0}
      />
      <SearchEmpty query={query.trim()} visible={searching && matches.length === 0} />
      <p className="sr-only" role="status">
        {searchStatus(searching, matches.length)}
      </p>
    </div>
  );
}
