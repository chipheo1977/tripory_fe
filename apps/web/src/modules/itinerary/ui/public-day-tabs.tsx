"use client";

// Dải tab chỉ đọc của chế độ Bản đồ (D-10, D-131): "Tổng quan" rồi "● Ngày N" cho đủ Ngày 1..max (ngày thưa vẫn có tab). Một dòng
// (không dòng km), không "+ Thêm ngày", không hook ghi: khác `DayTabs` của editor. Mũi tên/Home/End theo Base UI. Tab đang chọn
// được cuộn vào khung (`scrollIntoView?.()` vì jsdom không có). `focusRequest` đưa focus vào một tab đúng một lần theo `seq` (D-135).
import { dayColorIndex, OVERVIEW_TAB, type EditorTab } from "@tripory/itinerary";
import { MapToneDot, Tabs, TabsList, TabsTrigger } from "@tripory/ui-web";
import { useEffect, useRef } from "react";
import { EdgeFade } from "./edge-fade";
import { prefersReducedMotion } from "./map/map-camera";
import { parseTabValue, tabValue } from "./overview-format";
import { useTabStrip } from "./use-tab-strip";

export type PublicDayTabsProps = Readonly<{
  dayNumbers: readonly number[];
  selectedTab: EditorTab;
  onSelectTab(tab: EditorTab): void;
  /** Đưa focus vào một tab (sau khi bấm dòng ngày ở Tổng quan). Mỗi `seq` chỉ áp một lần. */
  focusRequest?: Readonly<{ tab: EditorTab; seq: number }> | null;
}>;

function trackTab(tabs: Map<EditorTab, HTMLElement>, tab: EditorTab, element: HTMLElement | null): void {
  if (element === null) tabs.delete(tab);
  else tabs.set(tab, element);
}

export function PublicDayTabs({ dayNumbers, selectedTab, onSelectTab, focusRequest = null }: PublicDayTabsProps) {
  const tabRefs = useRef(new Map<EditorTab, HTMLElement>());
  const appliedFocusSeq = useRef<number | null>(null);
  const { stripProps, edges } = useTabStrip();
  const dayCount = dayNumbers.length;

  useEffect(() => {
    if (focusRequest === null || appliedFocusSeq.current === focusRequest.seq) return;
    const target = tabRefs.current.get(focusRequest.tab);
    if (target === undefined) return;
    appliedFocusSeq.current = focusRequest.seq;
    target.focus();
  }, [focusRequest, dayCount]);

  useEffect(() => {
    tabRefs.current.get(selectedTab)?.scrollIntoView?.({
      inline: "nearest",
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [selectedTab, dayCount]);

  return (
    <Tabs onValueChange={(value) => onSelectTab(parseTabValue(value))} value={tabValue(selectedTab)} variant="line">
      <div className="relative">
        {/* Cuộn ngang bằng vuốt (cảm ứng) hoặc kéo chuột, không thanh cuộn; `scroll-px` chừa lề khi cuộn tab vào khung. */}
        <div
          {...stripProps}
          className="flex scroll-px-stack-lg items-center overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsList aria-label="Các ngày" className="shrink-0">
            <TabsTrigger
              aria-label="Tổng quan"
              className="min-h-touch"
              ref={(element) => trackTab(tabRefs.current, OVERVIEW_TAB, element)}
              value={tabValue(OVERVIEW_TAB)}
            >
              <span className="text-label font-semibold">Tổng quan</span>
            </TabsTrigger>
            {dayNumbers.map((day) => (
              <TabsTrigger
                aria-label={`Ngày ${day}`}
                className="min-h-touch"
                key={day}
                ref={(element) => trackTab(tabRefs.current, day, element)}
                value={tabValue(day)}
              >
                <span className="flex items-center gap-inline-xs text-label font-semibold">
                  <MapToneDot tone={dayColorIndex(day)} />
                  Ngày {day}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <EdgeFade side="start" visible={edges.start} />
        <EdgeFade side="end" visible={edges.end} />
      </div>
    </Tabs>
  );
}
