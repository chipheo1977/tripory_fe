"use client";

// Chế độ Bài viết của trang công khai (PUB-01, D-01..D-06): hero, dải chip ngày dính, các mục ngày. Container nhận
// `itinerary` đầy đủ vì tổng hợp hero và ngày; các con nhận props hẹp. Ngày thưa vẫn vẽ đủ Ngày 1..max (`buildDayRange`);
// lịch trình không có ngày lẫn điểm hiện EmptyState thay cho dải chip và danh sách ngày.
// `main#article-content` có id riêng (chế độ Bản đồ dùng id khác) để hai chế độ không trùng id; đích skip link do trang quyết định.
import { buildDayRange, type DayView, type Itinerary } from "@tripory/itinerary";
import { EmptyState, Icon } from "@tripory/ui-web";
import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { ArticleDaySection } from "./article-day-section";
import { ArticleHero } from "./article-hero";
import { AuthorLine } from "./author-line";
import { DayChipStrip } from "./day-chip-strip";
import { defaultCoverFor } from "./destination-cover";
import { useHeaderHeight } from "./editor-layout";
import { articleMetaLine } from "./public-format";
import { useDayNavigation } from "./use-day-navigation";

export type PublicArticleProps = Readonly<{
  itinerary: Itinerary;
  isOwner: boolean;
  /** Chiều cao (px) của khối dính phía trên (header + dải bản nháp). */
  stickyTop: number;
  /** `false` khi chế độ Bài viết đang ẩn: không theo dõi cuộn. */
  enabled: boolean;
}>;

/** Khoảng thở dưới các khối dính khi cuộn tới một mục ngày. */
const SCROLL_GAP_PX = 16;

function ArticleBody({
  days,
  hasContent,
  scrollMargin,
}: Readonly<{ days: readonly DayView[]; hasContent: boolean; scrollMargin: number }>) {
  if (!hasContent) {
    return (
      <EmptyState
        body="Người tạo chưa thêm điểm đến vào lịch trình này. Hãy quay lại sau."
        heading="Lịch trình chưa có điểm đến nào"
        icon={<Icon icon={MapPin} size="lg" />}
        variant="compact"
      />
    );
  }
  return (
    <div className="flex flex-col gap-page-block">
      {days.map((day, index) => (
        <ArticleDaySection day={day} key={day.dayNumber} scrollMarginTop={scrollMargin} showDivider={index > 0} />
      ))}
    </div>
  );
}

export function PublicArticle({ itinerary, isOwner, stickyTop, enabled }: PublicArticleProps) {
  const days = useMemo(() => buildDayRange(itinerary), [itinerary]);
  const dayNumbers = useMemo(() => days.map((day) => day.dayNumber), [days]);
  const hasContent = itinerary.days.length > 0 || itinerary.waypoints.length > 0;
  const strip = useHeaderHeight();
  const scrollMargin = stickyTop + strip.height + SCROLL_GAP_PX;
  const navigation = useDayNavigation({
    dayNumbers,
    topOffset: stickyTop + strip.height,
    enabled: enabled && hasContent,
  });
  const metaLine = articleMetaLine({
    startDate: itinerary.startDate,
    dayCount: days.length,
    waypointCount: itinerary.waypoints.length,
    totalDistanceKm: itinerary.totalDistanceKm,
  });

  return (
    <>
      <DayChipStrip
        activeDay={navigation.activeDay}
        dayNumbers={dayNumbers}
        onSelect={navigation.goToDay}
        stickyTop={stickyTop}
        stripRef={strip.ref}
        visible={hasContent}
      />
      <main
        className="mx-auto flex w-full max-w-content-md min-w-0 flex-col gap-page-block px-page-inline pt-stack-lg pb-[calc(4rem+env(safe-area-inset-bottom))] outline-hidden sm:px-page-inline-md lg:px-page-inline-lg lg:pb-16"
        id="article-content"
        tabIndex={-1}
      >
        <ArticleHero
          author={
            <AuthorLine
              avatarUrl={itinerary.author?.avatarUrl ?? null}
              displayName={itinerary.author?.displayName ?? null}
              isOwner={isOwner}
            />
          }
          coverImageUrl={itinerary.coverImageUrl}
          description={itinerary.description}
          fallbackCoverUrl={defaultCoverFor(itinerary.destinationCode)}
          metaLine={metaLine}
          title={itinerary.title}
        />
        <ArticleBody days={days} hasContent={hasContent} scrollMargin={scrollMargin} />
      </main>
    </>
  );
}
