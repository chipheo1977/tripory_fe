"use client";

// Thanh tab ngày + "Thêm ngày" (ITIN-04, D-27, D-28). Vẽ đủ Ngày 1..max (ngày thưa là ngày trống), mỗi tab hai dòng
// ("Ngày N" + km của BE). Nút thêm nằm SAU `TabsList` nên không thuộc roving focus của tab.
//
// Thêm ngày là thao tác nền (D-30): optimistic ở hook, lỗi thì gỡ tab, chọn lại ngày trước, trả focus về nút
// và báo "Lỗi – Thử lại" qua store (toast lỗi do MutationCache mặc định lo).
import { buildDayRange, nextDayNumber, type Itinerary } from "@tripory/itinerary";
import { Tabs, TabsList, TabsTrigger } from "@tripory/ui-web";
import { useEffect, useMemo, useRef } from "react";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import { AddButton } from "./add-button";
import { formatKm } from "./format";
import { useSaveStatusStore } from "./save-status";

export type DayTabsProps = Readonly<{
  itinerary: Itinerary;
  selectedDay: number;
  onSelectDay(day: number): void;
}>;

const prefersReducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function DayTabs({ itinerary, selectedDay, onSelectDay }: DayTabsProps) {
  const store = useSaveStatusStore();
  const days = useMemo(() => buildDayRange(itinerary), [itinerary]);
  const tabRefs = useRef(new Map<number, HTMLElement>());
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  // Ngày vừa thêm cần nhận focus khi tab của nó đã render (cache optimistic ghi sau `onMutate`, trễ một nhịp).
  const focusDayRef = useRef<number | null>(null);
  // Callback của mutation chụp closure lúc bấm; ref này cho nó biết ngày đang chọn tại lúc lỗi.
  const selectedRef = useRef(selectedDay);
  useEffect(() => {
    selectedRef.current = selectedDay;
  }, [selectedDay]);

  const addDay = itineraryHooks.useAddDay(itinerary.id, {
    onSuccess: () => store.markSaved(),
    onError: (_error, variables) => {
      focusDayRef.current = null;
      // Chỉ lùi về ngày trước khi người dùng vẫn đang ở tab vừa bị gỡ; đã chuyển sang ngày khác thì giữ nguyên.
      if (selectedRef.current === variables.dayNumber) onSelectDay(variables.dayNumber - 1);
      addButtonRef.current?.focus();
      store.markFailed(() => addDay.mutate(variables));
    },
  });

  const handleAdd = (): void => {
    const dayNumber = nextDayNumber(itinerary);
    focusDayRef.current = dayNumber;
    onSelectDay(dayNumber);
    addDay.mutate({ dayNumber });
  };

  const dayCount = days.length;
  useEffect(() => {
    const selected = tabRefs.current.get(selectedDay);
    if (selected === undefined) return;
    selected.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    if (focusDayRef.current === selectedDay) {
      focusDayRef.current = null;
      selected.focus();
    }
  }, [selectedDay, dayCount]);

  return (
    <Tabs onValueChange={(value) => onSelectDay(Number(value))} value={String(selectedDay)} variant="line">
      <div className="flex items-center overflow-x-auto">
        <TabsList aria-label="Các ngày" className="shrink-0">
          {days.map((day) => {
            const km = formatKm(day.distanceKm);
            return (
              <TabsTrigger
                aria-label={km === null ? `Ngày ${day.dayNumber}` : `Ngày ${day.dayNumber}, ${km}`}
                className="flex-col gap-inline-xs py-inline-sm"
                key={day.dayNumber}
                ref={(element) => {
                  if (element === null) tabRefs.current.delete(day.dayNumber);
                  else tabRefs.current.set(day.dayNumber, element);
                }}
                value={String(day.dayNumber)}
              >
                <span className="text-label font-semibold">Ngày {day.dayNumber}</span>
                {km === null ? null : <span className="text-label text-muted tabular-nums">{km}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <AddButton className="shrink-0" label="Thêm ngày" onClick={handleAdd} ref={addButtonRef} size="sm" variant="ghost" />
      </div>
    </Tabs>
  );
}
