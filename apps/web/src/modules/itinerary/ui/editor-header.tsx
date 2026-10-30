"use client";

import type { Viewer } from "@tripory/identity";
import type { Itinerary } from "@tripory/itinerary";
import { ArrowLeft, Info, Trash2 } from "lucide-react";
import { Icon, IconButton, Skeleton } from "@tripory/ui-web";
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { UserMenu } from "@/components/user-menu";
import { PublishButton, PublishHintStrip } from "./publish-button";
import { SaveIndicator } from "./save-indicator";

/** Dải giải thích của nút Xuất bản bị chặn hiện bao lâu sau khi chạm (UI-SPEC §PublishButton). */
const HINT_DURATION_MS = 4000;

const BACK_LABEL = "Về Lịch trình của tôi";

const HEADER_CLASSES = "sticky top-0 z-sticky border-b border-border bg-surface pt-[env(safe-area-inset-top)]";
const ROW_CLASSES =
  "flex min-h-header items-center gap-inline-xs px-page-inline sm:gap-inline-sm sm:px-page-inline-md lg:px-page-inline-lg";

/** Vùng thao tác bên phải: không co (`shrink-0`) để tiêu đề là phần duy nhất nhường chỗ, nên không tràn ngang ở 320px. */
const ACTIONS_CLASSES = "flex shrink-0 items-center gap-inline-xs sm:gap-inline-sm";

function BackButton({ onBack }: Readonly<{ onBack(): void }>) {
  return (
    <IconButton aria-label={BACK_LABEL} onClick={onBack} variant="ghost">
      <Icon icon={ArrowLeft} size="sm" />
    </IconButton>
  );
}

function TripInfoButton({ onOpen, buttonRef }: Readonly<{ onOpen(): void; buttonRef?: Ref<HTMLButtonElement> }>) {
  return (
    <IconButton aria-label="Thông tin chuyến đi" className="shrink-0" onClick={onOpen} ref={buttonRef} variant="ghost">
      <Icon icon={Info} size="sm" />
    </IconButton>
  );
}

function DeleteButton({ onDelete }: Readonly<{ onDelete(): void }>) {
  return (
    <IconButton aria-label="Xóa lịch trình" className="shrink-0 text-danger" onClick={onDelete} variant="ghost">
      <Icon icon={Trash2} size="sm" />
    </IconButton>
  );
}

export type EditorHeaderProps = Readonly<{
  itinerary: Itinerary;
  /** Id waypoint đang chờ xóa (có thể hoàn tác): PublishButton coi như đã mất khi tính `canPublish`. */
  pendingIds: ReadonlySet<string>;
  onBack(): void;
  onOpenTripInfo(): void;
  onDeleteItinerary(): void;
  onRequestPublish(): void;
  tripInfoButtonRef?: Ref<HTMLButtonElement>;
}>;

export function EditorHeader({
  itinerary,
  pendingIds,
  onBack,
  onOpenTripInfo,
  onDeleteItinerary,
  onRequestPublish,
  tripInfoButtonRef,
}: EditorHeaderProps) {
  const hintId = useId();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleBlockedPress = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setPressed(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setPressed(false);
    }, HINT_DURATION_MS);
  };

  const hintVisible = focused || pressed;

  return (
    <header className={HEADER_CLASSES}>
      <div className={ROW_CLASSES}>
        <BackButton onBack={onBack} />
        <div className="flex min-w-0 flex-1 items-center gap-inline-xs">
          <div className="flex min-w-0 flex-col justify-center">
            <h1 className="truncate text-body font-semibold text-text">{itinerary.title}</h1>
          </div>
          <TripInfoButton buttonRef={tripInfoButtonRef} onOpen={onOpenTripInfo} />
        </div>
        <div className={ACTIONS_CLASSES}>
          <SaveIndicator itineraryId={itinerary.id} />
          <PublishButton
            hintId={hintId}
            itinerary={itinerary}
            onBlockedPress={handleBlockedPress}
            onHintFocusChange={setFocused}
            onRequestPublish={onRequestPublish}
            pendingIds={pendingIds}
          />
          <DeleteButton onDelete={onDeleteItinerary} />
        </div>
      </div>
      <PublishHintStrip hintId={hintId} visible={hintVisible} />
    </header>
  );
}

export type EditorHeaderMinimalProps = Readonly<{
  onBack(): void;
  /** Tiêu đề h1; không truyền thì hiện Skeleton (đang tải). */
  title?: ReactNode;
  viewer: Viewer;
}>;

/**
 * Header rút gọn cho trạng thái tải, lỗi và 403: chỉ back, tiêu đề và `UserMenu compact`. Không có thao tác sửa
 * và không có tiêu đề lịch trình khi người xem không phải chủ (T-04-56, T-04-57): caller quyết định `title`.
 */
export function EditorHeaderMinimal({ onBack, title, viewer }: EditorHeaderMinimalProps) {
  return (
    <header className={HEADER_CLASSES}>
      <div className={ROW_CLASSES}>
        <BackButton onBack={onBack} />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {title === undefined ? (
            <Skeleton className="w-40" variant="text" />
          ) : (
            <h1 className="truncate text-body font-semibold text-text">{title}</h1>
          )}
        </div>
        <UserMenu compact viewer={viewer} />
      </div>
    </header>
  );
}
