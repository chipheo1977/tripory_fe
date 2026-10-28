"use client";

// Phụ đề ngày sửa tại chỗ (D-29). Xem: một nút toàn chiều ngang; bấm thành ô nhập. Enter/blur lưu (trim, rỗng thành
// null, không đổi thì không gửi), Esc hủy. Lưu optimistic ở hook; lỗi thì cache trả giá trị cũ, toast do MutationCache
// lo, còn chỉ báo "Lỗi – Thử lại" qua store (D-30). Nội dung do người dùng gõ chỉ hiển thị qua React nên được escape.
import type { DayView } from "@tripory/itinerary";
import type { ItineraryId } from "@tripory/shared-kernel";
import { FormField, FormFieldError, Icon, Input } from "@tripory/ui-web";
import { Pencil } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import { validateSubtitle } from "./form-schemas";
import { useSaveStatusStore } from "./save-status";

export type DaySubtitleProps = Readonly<{ itineraryId: ItineraryId; day: DayView }>;

export function DaySubtitle({ itineraryId, day }: DaySubtitleProps) {
  const store = useSaveStatusStore();
  const mutation = itineraryHooks.useSetDaySubtitle(itineraryId, {
    onSuccess: () => store.markSaved(),
    onError: (_error, variables) => store.markFailed(() => mutation.mutate(variables)),
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const viewRef = useRef<HTMLButtonElement | null>(null);
  // Mỗi lần sửa chỉ kết thúc một lần: Enter rồi blur (hoặc Esc rồi blur do input bị gỡ) không được gửi/hủy hai lần.
  const finishedRef = useRef(true);
  const restoreFocusRef = useRef(false);

  const current = day.subtitle;

  useEffect(() => {
    if (editing) {
      const input = inputRef.current;
      if (input === null) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      viewRef.current?.focus();
    }
  }, [editing]);

  const startEditing = (): void => {
    finishedRef.current = false;
    setDraft(current ?? "");
    setError(null);
    setEditing(true);
  };

  const commit = (restoreFocus: boolean): void => {
    if (finishedRef.current) return;
    const message = validateSubtitle(draft);
    if (message !== null) {
      setError(message);
      return;
    }
    finishedRef.current = true;
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : trimmed;
    restoreFocusRef.current = restoreFocus;
    setEditing(false);
    if (next !== current) mutation.mutate({ dayNumber: day.dayNumber, subtitle: next });
  };

  const cancel = (): void => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    restoreFocusRef.current = true;
    setError(null);
    setEditing(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  };

  if (editing) {
    const invalid = error !== null;
    return (
      <FormField invalid={invalid}>
        <Input
          aria-invalid={invalid || undefined}
          aria-label={`Phụ đề Ngày ${day.dayNumber}`}
          autoComplete="off"
          onBlur={() => commit(false)}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error !== null) setError(null);
          }}
          onKeyDown={onKeyDown}
          ref={inputRef}
          size="md"
          value={draft}
        />
        <FormFieldError match={invalid}>{error}</FormFieldError>
      </FormField>
    );
  }

  const hasSubtitle = current !== null && current !== "";
  return (
    <button
      aria-label={
        hasSubtitle ? `Sửa phụ đề Ngày ${day.dayNumber}: ${current}` : `Thêm phụ đề cho Ngày ${day.dayNumber}`
      }
      className="flex min-h-touch w-full items-center gap-inline-sm rounded-control text-left outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      onClick={startEditing}
      ref={viewRef}
      type="button"
    >
      <Icon className="text-subtle" icon={Pencil} size="sm" />
      <span className={hasSubtitle ? "min-w-0 break-words text-body text-text" : "text-body text-subtle"}>
        {hasSubtitle ? current : "Thêm phụ đề cho ngày này"}
      </span>
    </button>
  );
}
