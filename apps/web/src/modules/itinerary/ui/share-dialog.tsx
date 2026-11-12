"use client";

// Hộp chia sẻ (D-13, D-14, D-16, UI-SPEC §Hộp chia sẻ): Dialog từ `md`, Sheet modal dưới `md` qua `ResponsiveFormSurface`.
// Bấm "Chia sẻ" luôn mở hộp này, không gọi thẳng Web Share. Không có nút Hủy/Đóng ở chân (có nút X), không toast trong hộp.
// Dùng ở trang công khai (không link "Mở trang công khai") và ở editor (`showPublicLink`, D-16).
import { buttonVariants, cn, Icon, Separator } from "@tripory/ui-web";
import { ExternalLink } from "lucide-react";
import { useId, useRef, type RefObject } from "react";
import { ResponsiveFormSurface } from "./responsive-form-surface";
import { ShareLinkField } from "./share-link-field";
import { ShareQrSection } from "./share-qr-section";
import { useShareUrl } from "./use-share-url";

export type ShareDialogProps = Readonly<{
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Sau khi hoạt ảnh đóng xong (nơi gọi trả focus về nút Chia sẻ). */
  onOpenChangeComplete?(open: boolean): void;
  itineraryId: string;
  title: string;
  /** Hộp mở từ editor có thêm link "Mở trang công khai" (D-16). */
  showPublicLink: boolean;
}>;

function PublicPageLink({ itineraryId, visible }: Readonly<{ itineraryId: string; visible: boolean }>) {
  if (!visible) return null;
  return (
    <a
      aria-label="Mở trang công khai (mở tab mới)"
      className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "self-start")}
      href={`/itineraries/${itineraryId}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon icon={ExternalLink} size="sm" />
      Mở trang công khai
    </a>
  );
}

type ShareBodyProps = Readonly<{
  url: string;
  title: string;
  itineraryId: string;
  showPublicLink: boolean;
  copyRef: RefObject<HTMLButtonElement | null>;
}>;

/** Chưa biết origin (render phía server): chưa dựng gì, URL tuyệt đối chỉ có sau hydrate. */
function ShareBody({ url, title, itineraryId, showPublicLink, copyRef }: ShareBodyProps) {
  if (url === "") return null;
  return (
    <div className="flex flex-col gap-stack-lg">
      <ShareLinkField copyButtonRef={copyRef} title={title} url={url} />
      <Separator />
      <ShareQrSection itineraryId={itineraryId} title={title} url={url} />
      <PublicPageLink itineraryId={itineraryId} visible={showPublicLink} />
    </div>
  );
}

export function ShareDialog({
  open,
  onOpenChange,
  onOpenChangeComplete,
  itineraryId,
  title,
  showPublicLink,
}: ShareDialogProps) {
  const titleId = useId();
  const copyRef = useRef<HTMLButtonElement | null>(null);
  const url = useShareUrl(itineraryId);

  return (
    <ResponsiveFormSurface
      closeButton
      description="Ai có link đều xem được lịch trình này."
      initialFocus={() => copyRef.current}
      locked={false}
      onOpenChange={(next) => onOpenChange(next)}
      onOpenChangeComplete={onOpenChangeComplete}
      open={open}
      title="Chia sẻ lịch trình"
      titleId={titleId}
    >
      <ShareBody copyRef={copyRef} itineraryId={itineraryId} showPublicLink={showPublicLink} title={title} url={url} />
    </ResponsiveFormSurface>
  );
}
