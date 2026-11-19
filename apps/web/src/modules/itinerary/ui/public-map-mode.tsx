"use client";

// Chế độ Bản đồ chỉ đọc của trang công khai (PUB-02, D-10, D-11): dùng đúng bản đồ và bố cục của editor ("giống editor nhưng
// chỉ đọc"). Từ `lg` hai vùng (cột trái: tab + thân tab; bản đồ bên phải); dưới `lg` bản đồ nền cố định + bottom sheet không
// modal. Viên thuốc chuyển chế độ: từ `lg` nằm trên header (ngoài component này); dưới `lg` nằm trong thanh dính đáy sheet khi
// sheet mở, hoặc trong dải đáy cạnh chip "Lịch trình" khi sheet đóng (`reopenCompanion`), nên mỗi lúc đúng một bản.
// Không có thao tác ghi, không `TripSummary` dự phòng. Chỉ được mount khi ở chế độ Bản đồ (cha quyết định), nên Sheet (portal)
// không còn lại khi về bài viết.
import type { Itinerary } from "@tripory/itinerary";
import { Button } from "@tripory/ui-web";
import { useMemo, type ReactNode } from "react";
import { AuthorLine } from "./author-line";
import { NarrowBody, WideBody, type NarrowBodyProps } from "./editor-layout";
import { EditorMapArea } from "./editor-map-area";
import { EditorTimelineBody } from "./editor-timeline-body";
import type { MapFrame } from "./editor-map-viewport";
import { PublicDayPanel } from "./public-day-panel";
import { PublicDayTabs } from "./public-day-tabs";
import { publicOverviewData } from "./public-format";
import { PublicOverviewPanel } from "./public-overview-panel";
import { PublicPillBar } from "./public-pill-bar";
import type { PublicView } from "./public-view";
import { TimelinePanel } from "./timeline-panel";
import { useMediaQuery } from "./use-media-query";
import { usePublicMapState } from "./use-public-map-state";
import { ViewModeToggle } from "./view-mode-toggle";

/** Trùng breakpoint `lg` của Tailwind (1024px). */
const LG_QUERY = "(min-width: 1024px)";
const MAP_ERROR_HINT = "Bạn vẫn xem được lịch trình dạng bài viết.";
const EMPTY_MESSAGE = "Lịch trình chưa có điểm đến nào";

export type PublicMapModeProps = Readonly<{
  itinerary: Itinerary;
  isOwner: boolean;
  /** Chiều cao (px) của khối dính phía trên (header + dải bản nháp), đo bởi cha. */
  headerHeight: number;
  view: PublicView;
  onViewChange(view: PublicView): void;
  /** "Xem dạng bài viết" khi bản đồ lỗi; cha đổi `?view` và lo focus. */
  onViewArticle(): void;
  /** Slot social của tab Tổng quan (D-22); không có ở tab Ngày. */
  overviewSocial?: ReactNode;
}>;

export function PublicMapMode({
  itinerary,
  isOwner,
  headerHeight,
  view,
  onViewChange,
  onViewArticle,
  overviewSocial,
}: PublicMapModeProps) {
  const wide = useMediaQuery(LG_QUERY);
  const state = usePublicMapState({ itinerary, wide });
  const overviewData = useMemo(() => publicOverviewData(itinerary), [itinerary]);

  const author = (
    <AuthorLine
      avatarUrl={itinerary.author?.avatarUrl ?? null}
      displayName={itinerary.author?.displayName ?? null}
      isOwner={isOwner}
    />
  );

  const timeline = (
    <TimelinePanel
      scrollResetKey={String(state.tab)}
      tabs={
        <PublicDayTabs
          dayNumbers={state.dayNumbers}
          focusRequest={state.tabFocus}
          onSelectTab={state.changeTab}
          selectedTab={state.tab}
        />
      }
    >
      <EditorTimelineBody
        day={
          <PublicDayPanel
            day={state.dayView}
            mapReady={state.mapStatus === "ready"}
            onSelect={state.handleActivate}
            selectedId={state.selectedId}
          />
        }
        overview={
          <PublicOverviewPanel
            author={author}
            data={overviewData}
            days={state.days}
            onEmphasizeDay={state.emphasizeDay}
            onSelectDay={state.selectDayFromRow}
            rowEmphasis={state.rowEmphasis}
            social={overviewSocial}
            variant={wide ? "wide" : "compact"}
          />
        }
        tab={state.tab}
      />
      <PublicPillBar onViewChange={onViewChange} view={view} visible={!wide} />
    </TimelinePanel>
  );

  const map = (frame: MapFrame) => (
    <EditorMapArea
      empty={state.empty}
      emptyMessage={EMPTY_MESSAGE}
      errorActions={
        <Button onClick={onViewArticle} size="sm" variant="secondary">
          Xem dạng bài viết
        </Button>
      }
      errorHint={MAP_ERROR_HINT}
      frame={frame}
      handlers={{ onPinSelect: state.handlePinSelect, onBackgroundClick: state.clearSelection }}
      map={{ pins: state.pins, routes: state.routes, camera: state.camera }}
      onStatusChange={state.setMapStatus}
    />
  );

  return (
    <main className="outline-hidden" id="map-content" tabIndex={-1}>
      <h1 className="sr-only">{itinerary.title}</h1>
      <MapBody
        headerHeight={headerHeight}
        map={map}
        onViewChange={onViewChange}
        sheetRequest={state.sheetRequest}
        timeline={timeline}
        view={view}
        wide={wide}
      />
    </main>
  );
}

type MapBodyProps = Readonly<{
  wide: boolean;
  headerHeight: number;
  timeline: ReactNode;
  map(frame: MapFrame): ReactNode;
  sheetRequest: NarrowBodyProps["sheetSnapRequest"];
  view: PublicView;
  onViewChange(view: PublicView): void;
}>;

function MapBody({ wide, headerHeight, timeline, map, sheetRequest, view, onViewChange }: MapBodyProps) {
  if (wide) return <WideBody headerHeight={headerHeight} map={map} timeline={timeline} />;
  return (
    <NarrowBody
      headerHeight={headerHeight}
      map={map}
      reopenCompanion={<ViewModeToggle onViewChange={onViewChange} variant="dock" view={view} />}
      sheetSnapRequest={sheetRequest}
      timeline={timeline}
    />
  );
}
