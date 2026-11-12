"use client";

// Bố cục client của trang công khai (UI-SPEC §Khung trang công khai): khối dính (header một hàng + dải bản nháp), chế độ Bài viết,
// chế độ Bản đồ, viên thuốc chuyển chế độ, hộp chia sẻ. Bài viết luôn được dựng và chỉ `hidden` khi ở Bản đồ (giữ vị trí
// cuộn); Bản đồ CHỈ mount khi ở chế độ Bản đồ (MapLibre và Sheet portal không nằm lại trên bài viết).
// Viên thuốc luôn đúng MỘT bản trong DOM: từ `lg` ở giữa header; dưới `lg` nổi ở đáy (Bài viết), hoặc nằm trong sheet / dải
// đáy cạnh chip "Lịch trình" (Bản đồ, do `PublicMapMode` lo). Nút Chia sẻ chỉ có khi đã xuất bản (D-17); nút Sửa chỉ cho chủ (D-23).
import type { Itinerary } from "@tripory/itinerary";
import { cn } from "@tripory/ui-web";
import { useState, type ReactNode } from "react";
import { SkipLink } from "@/components/skip-link";
import { DraftStrip } from "./draft-strip";
import { EditLink } from "./edit-link";
import { useHeaderHeight } from "./editor-layout";
import { PublicArticle } from "./public-article";
import { PublicHeader } from "./public-header";
import { PublicMapMode } from "./public-map-mode";
import type { PublicView } from "./public-view";
import { ShareButton } from "./share-button";
import { ShareDialog } from "./share-dialog";
import { usePillFocusRequest } from "./use-pill-focus-handoff";
import { useMediaQuery } from "./use-media-query";
import { ViewModeToggle } from "./view-mode-toggle";

/** Trùng breakpoint `lg` của Tailwind (1024px). */
const LG_QUERY = "(min-width: 1024px)";

const ROOT_BY_VIEW = { article: "", map: "lg:h-dvh lg:overflow-hidden" } as const;
const SKIP_TARGET = { article: "#article-content", map: "#map-content" } as const;

export type PublicViewLayoutProps = Readonly<{
  itinerary: Itinerary;
  /** `viewer.id === ownerId`, tính ở server. */
  canEdit: boolean;
  account: ReactNode;
  view: PublicView;
  onViewChange(view: PublicView): void;
}>;

function HeaderToggle({ visible, view, onViewChange }: Readonly<{ visible: boolean; view: PublicView; onViewChange(view: PublicView): void }>) {
  if (!visible) return null;
  return <ViewModeToggle onViewChange={onViewChange} variant="inline" view={view} />;
}

function MapSlot({ visible, children }: Readonly<{ visible: boolean; children: ReactNode }>) {
  if (!visible) return null;
  return <>{children}</>;
}

function FloatingPill({ visible, view, onViewChange }: Readonly<{ visible: boolean; view: PublicView; onViewChange(view: PublicView): void }>) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-sticky flex justify-center pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))]">
      <ViewModeToggle onViewChange={onViewChange} variant="floating" view={view} />
    </div>
  );
}

export function PublicViewLayout({ itinerary, canEdit, account, view, onViewChange }: PublicViewLayoutProps) {
  const wide = useMediaQuery(LG_QUERY);
  const { ref: headerRef, height: headerHeight } = useHeaderHeight();
  const [shareOpen, setShareOpen] = useState(false);
  const pill = usePillFocusRequest(view);
  const published = itinerary.isPublic;

  const leaveMap = () => {
    pill.request();
    onViewChange("article");
  };

  return (
    <div className={cn("min-h-dvh bg-background pb-[env(safe-area-inset-bottom)] text-text", ROOT_BY_VIEW[view])}>
      <SkipLink href={SKIP_TARGET[view]} />
      <div className="sticky top-0 z-sticky" ref={headerRef}>
        <PublicHeader
          account={account}
          actions={
            <>
              <EditLink collapse itineraryId={itinerary.id} visible={canEdit && published} />
              <ShareButton onClick={() => setShareOpen(true)} visible={published} />
            </>
          }
          toggle={<HeaderToggle onViewChange={onViewChange} view={view} visible={wide} />}
        />
        <DraftStrip itineraryId={itinerary.id} visible={canEdit && !published} />
      </div>
      <div hidden={view !== "article"}>
        <PublicArticle enabled={view === "article"} isOwner={canEdit} itinerary={itinerary} stickyTop={headerHeight} />
      </div>
      <MapSlot visible={view === "map"}>
        <PublicMapMode
          headerHeight={headerHeight}
          isOwner={canEdit}
          itinerary={itinerary}
          onViewArticle={leaveMap}
          onViewChange={onViewChange}
          view={view}
        />
      </MapSlot>
      <FloatingPill onViewChange={onViewChange} view={view} visible={view === "article" && !wide} />
      <ShareDialog itineraryId={itinerary.id} onOpenChange={setShareOpen} open={shareOpen} showPublicLink={false} title={itinerary.title} />
    </div>
  );
}
