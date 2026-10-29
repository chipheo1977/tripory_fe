"use client";

// Header toàn màn của editor (UI-SPEC §EditorHeader; D-16, D-41). Không có AppHeader: back, tiêu đề, trạng thái lưu,
// Xuất bản, menu thao tác và menu tài khoản gọn nằm cùng một header sticky.
//
// Từ `sm` là một hàng. Dưới `sm` là hai hàng: hàng 1 (back, tiêu đề, ⋯, tài khoản), hàng 2 (SaveIndicator, Xuất bản).
// SaveIndicator và PublishButton chỉ render một bản, chọn vị trí bằng `useMediaQuery`: header chỉ dựng sau khi dữ
// liệu đã tải ở client nên không có lệch hydrate, và tránh trùng `aria-live`, trùng `hintId` do render hai bản.
import type { Viewer } from "@tripory/identity";
import type { Itinerary } from "@tripory/itinerary";
import { ArrowLeft, Info, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  IconButton,
  Skeleton,
} from "@tripory/ui-web";
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { UserMenu } from "@/components/user-menu";
import { PublishButton, PublishHintStrip } from "./publish-button";
import { SaveIndicator } from "./save-indicator";
import { useMediaQuery } from "./use-media-query";

/** Trùng breakpoint `sm` của Tailwind (640px). */
const SM_QUERY = "(min-width: 640px)";

/** Dải giải thích của nút Xuất bản bị chặn hiện bao lâu sau khi chạm (UI-SPEC §PublishButton). */
const HINT_DURATION_MS = 4000;

const BACK_LABEL = "Về Lịch trình của tôi";

const HEADER_CLASSES = "sticky top-0 z-sticky border-b border-border bg-surface pt-[env(safe-area-inset-top)]";
const ROW_CLASSES =
  "flex min-h-header items-center gap-inline-xs px-page-inline sm:gap-inline-sm sm:px-page-inline-md lg:px-page-inline-lg";

function BackButton({ onBack }: Readonly<{ onBack(): void }>) {
  return (
    <IconButton aria-label={BACK_LABEL} onClick={onBack} variant="ghost">
      <Icon icon={ArrowLeft} size="md" />
    </IconButton>
  );
}

export type EditorHeaderProps = Readonly<{
  itinerary: Itinerary;
  /** Id waypoint đang chờ xóa (có thể hoàn tác): PublishButton coi như đã mất khi tính `canPublish`. */
  pendingIds: ReadonlySet<string>;
  /** Người đang đăng nhập, cho `UserMenu compact`. */
  viewer: Viewer;
  onBack(): void;
  onOpenTripInfo(): void;
  onDeleteItinerary(): void;
  onRequestPublish(): void;
  /** Ref của nút ⋯ để trả focus sau khi xuất bản xong (nút Xuất bản đã biến mất). */
  menuTriggerRef?: Ref<HTMLButtonElement>;
}>;

export function EditorHeader({
  itinerary,
  pendingIds,
  viewer,
  onBack,
  onOpenTripInfo,
  onDeleteItinerary,
  onRequestPublish,
  menuTriggerRef,
}: EditorHeaderProps) {
  const sm = useMediaQuery(SM_QUERY);
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

  const saveIndicator = <SaveIndicator itineraryId={itinerary.id} />;
  const publishButton = (
    <PublishButton
      hintId={hintId}
      itinerary={itinerary}
      onBlockedPress={handleBlockedPress}
      onHintFocusChange={setFocused}
      onRequestPublish={onRequestPublish}
      pendingIds={pendingIds}
    />
  );

  return (
    <header className={HEADER_CLASSES}>
      <div className={ROW_CLASSES}>
        <BackButton onBack={onBack} />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h1 className="truncate text-body font-semibold text-text">{itinerary.title}</h1>
          {itinerary.isPublic ? (
            <p className="truncate text-label text-muted">Thay đổi hiển thị ngay với người xem</p>
          ) : null}
        </div>
        {sm ? (
          <>
            {saveIndicator}
            {publishButton}
          </>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Thao tác lịch trình"
            className="min-h-touch min-w-touch shrink-0 border-transparent bg-transparent p-0"
            ref={menuTriggerRef}
          >
            <Icon icon={MoreHorizontal} size="md" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenTripInfo}>
              <Icon icon={Info} size="sm" />
              Thông tin chuyến đi
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteItinerary} variant="danger">
              <Icon icon={Trash2} size="sm" />
              Xóa lịch trình
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <UserMenu compact viewer={viewer} />
      </div>
      {sm ? null : (
        <div className="flex min-h-touch items-center justify-between gap-inline-sm border-t border-border px-page-inline">
          {saveIndicator}
          {publishButton}
        </div>
      )}
      <PublishHintStrip hintId={hintId} visible={focused || pressed} />
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
