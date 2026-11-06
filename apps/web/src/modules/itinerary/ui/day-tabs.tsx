"use client";

// Thanh tab "Tổng quan" + các ngày + "Thêm ngày" (ITIN-04, D-27, D-28, D-131). Vẽ đủ Ngày 1..max (ngày thưa là ngày trống),
// mỗi tab hai dòng ("Ngày N" + km của BE; Tổng quan hiện tổng km). Nút thêm nằm SAU `TabsList` nên không thuộc roving
// focus của tab.
//
// Thêm ngày là thao tác nền (D-30): optimistic ở hook, lỗi thì gỡ tab, chọn lại ngày trước, trả focus về nút
// và báo "Lỗi – Thử lại" qua store (toast lỗi do MutationCache mặc định lo).
import { buildDayRange, dayColorIndex, nextDayNumber, OVERVIEW_TAB, type EditorTab, type Itinerary } from "@tripory/itinerary";
import { MapToneDot, Tabs, TabsList, TabsTrigger } from "@tripory/ui-web";
import { useEffect, useMemo, useRef } from "react";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import { AddButton } from "./add-button";
import { formatKm } from "./format";
import { overviewTabAccessibleName, parseTabValue, tabValue } from "./overview-format";
import { useSaveStatusStore } from "./save-status";

export type DayTabsProps = Readonly<{
  itinerary: Itinerary;
  selectedTab: EditorTab;
  onSelectTab(tab: EditorTab): void;
  /** Đưa focus vào một tab (ví dụ sau khi bấm dòng ngày ở Tổng quan: D-135). Mỗi `seq` chỉ áp một lần. */
  focusRequest?: Readonly<{ tab: EditorTab; seq: number }> | null;
}>;

const prefersReducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function trackTab(tabs: Map<EditorTab, HTMLElement>, tab: EditorTab, element: HTMLElement | null): void {
  if (element === null) tabs.delete(tab);
  else tabs.set(tab, element);
}

function TabKmLine({ km }: Readonly<{ km: string | null }>) {
  if (km === null) return null;
  return <span className="text-label text-muted tabular-nums">{km}</span>;
}

export function DayTabs({ itinerary, selectedTab, onSelectTab, focusRequest = null }: DayTabsProps) {
  const store = useSaveStatusStore();
  const days = useMemo(() => buildDayRange(itinerary), [itinerary]);
  const tabRefs = useRef(new Map<EditorTab, HTMLElement>());
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  // Ngày vừa thêm cần nhận focus khi tab của nó đã render (cache optimistic ghi sau `onMutate`, trễ một nhịp).
  const focusDayRef = useRef<number | null>(null);
  // Callback của mutation chụp closure lúc bấm; ref này cho nó biết tab đang chọn tại lúc lỗi.
  const selectedRef = useRef(selectedTab);
  useEffect(() => {
    selectedRef.current = selectedTab;
  }, [selectedTab]);

  const addDay = itineraryHooks.useAddDay(itinerary.id, {
    onSuccess: () => store.markSaved(),
    onError: (_error, variables) => {
      focusDayRef.current = null;
      // Chỉ lùi về ngày trước khi người dùng vẫn đang ở tab vừa bị gỡ; đã chuyển sang tab khác thì giữ nguyên.
      if (selectedRef.current === variables.dayNumber) onSelectTab(variables.dayNumber - 1);
      addButtonRef.current?.focus();
      store.markFailed(() => addDay.mutate(variables));
    },
  });

  const handleAdd = (): void => {
    const dayNumber = nextDayNumber(itinerary);
    focusDayRef.current = dayNumber;
    onSelectTab(dayNumber);
    addDay.mutate({ dayNumber });
  };

  const dayCount = days.length;
  const appliedFocusSeq = useRef<number | null>(null);
  useEffect(() => {
    if (focusRequest === null || appliedFocusSeq.current === focusRequest.seq) return;
    const target = tabRefs.current.get(focusRequest.tab);
    if (target === undefined) return;
    appliedFocusSeq.current = focusRequest.seq;
    target.focus();
  }, [focusRequest, dayCount]);
  useEffect(() => {
    const selected = tabRefs.current.get(selectedTab);
    if (selected === undefined) return;
    selected.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    if (focusDayRef.current === selectedTab) {
      focusDayRef.current = null;
      selected.focus();
    }
  }, [selectedTab, dayCount]);

  return (
    <Tabs onValueChange={(value) => onSelectTab(parseTabValue(value))} value={tabValue(selectedTab)} variant="line">
      <div className="flex items-center overflow-x-auto">
        <TabsList aria-label="Các ngày" className="shrink-0">
          <TabsTrigger
            aria-label={overviewTabAccessibleName(itinerary.totalDistanceKm)}
            className="flex-col gap-inline-xs py-inline-sm"
            ref={(element) => trackTab(tabRefs.current, OVERVIEW_TAB, element)}
            value={tabValue(OVERVIEW_TAB)}
          >
            <span className="text-label font-semibold">Tổng quan</span>
            <TabKmLine km={formatKm(itinerary.totalDistanceKm)} />
          </TabsTrigger>
          {days.map((day) => {
            const km = formatKm(day.distanceKm);
            return (
              <TabsTrigger
                aria-label={km === null ? `Ngày ${day.dayNumber}` : `Ngày ${day.dayNumber}, ${km}`}
                className="flex-col gap-inline-xs py-inline-sm"
                key={day.dayNumber}
                ref={(element) => trackTab(tabRefs.current, day.dayNumber, element)}
                value={tabValue(day.dayNumber)}
              >
                <span className="flex items-center gap-inline-xs text-label font-semibold">
                  <MapToneDot tone={dayColorIndex(day.dayNumber)} />
                  Ngày {day.dayNumber}
                </span>
                <TabKmLine km={km} />
              </TabsTrigger>
            );
          })}
        </TabsList>
        <AddButton className="shrink-0" label="Thêm ngày" onClick={handleAdd} ref={addButtonRef} size="sm" variant="ghost" />
      </div>
    </Tabs>
  );
}
