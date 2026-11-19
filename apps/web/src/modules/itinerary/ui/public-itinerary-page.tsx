// RSC của trang công khai `/itineraries/{id}`: gọi BE một lần (`getPublicItinerary`, cache theo request, dùng chung với
// `generateMetadata`) rồi ánh xạ kết quả sang UI. Bộ phân loại kết quả là tập đóng nên dùng `switch` có kiểm tra đầy đủ.
//
// - D-21: 403 tự render (không dùng `forbidden()`, còn experimental ở Next 16.4): khách hay người khác mở nháp chỉ thấy câu
//   "chưa được xuất bản", header chỉ logo. Vì stream sau điểm suspend, HTTP vẫn 200 kèm `noindex` (đã chấp nhận, RESEARCH Pitfall 2).
// - D-22: `recover` (403 khi phiên đã hết hạn) giao cho `SessionRecovery` (refresh rồi tải lại), không kết luận 403 ngay.
// - Cookie chỉ đọc khi cần (`PublicOkView`), không `use cache` (dữ liệu theo người xem, P5). Client chỉ nhận `Itinerary` công
//   khai, boolean `canEdit` tính ở đây và node tài khoản: không token.
// - 05.1 social: `getSessionKind` chỉ chạy khi có factory + đã xuất bản + có `engagement` + có viewer, để trang cũ và test
//   cũ không phát sinh lần đọc cookie thêm. Bearer chỉ gắn khi phiên tươi (05 D-22) nên `likedByMe` trong HTML có thể sai
//   khi phiên không tươi; khi đó `likeSyncNeeded` bảo client đọc lại qua BFF (D-27).
import { canEdit, type Itinerary } from "@tripory/itinerary";
import type { Viewer } from "@tripory/identity";
import type { ItineraryId } from "@tripory/shared-kernel";
import { Skeleton } from "@tripory/ui-web";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AccountSlot } from "@/components/account-slot";
import { getPublicItinerary, type PublicItineraryResult } from "@/composition/itinerary.server";
import { getSessionKind, getViewer } from "@/composition/viewer.server";
import { PublicForbidden } from "./public-forbidden";
import { PublicHeader } from "./public-header";
import { PublicItineraryView } from "./public-itinerary-view";
import { PublicRefreshError } from "./public-load-error";
import { NO_PUBLIC_SOCIAL, type PublicSocialFactory } from "./public-social";
import { PublicStatusFrame } from "./public-status-frame";

export type PublicItineraryPageProps = Readonly<{
  itineraryId: ItineraryId;
  /** `SessionRecovery` với skeleton, do route (thuộc `app/`) truyền xuống để module không import ngược `app/`. */
  recovery: ReactNode;
  /** Factory like và bình luận (05.1), do route truyền; không có thì trang như Phase 5. */
  social?: PublicSocialFactory;
}>;

/** Ô tài khoản đọc cookie nên PHẢI nằm trong `<Suspense>` (Cache Components). */
function accountSlot(): ReactNode {
  return (
    <Suspense fallback={<Skeleton className="size-control-sm" variant="circle" />}>
      <AccountSlot />
    </Suspense>
  );
}

/** chỉ đọc loại phiên khi cần: có người xem và khối social sẽ hiện. */
async function resolveLikeSync(viewer: Viewer | null, active: boolean): Promise<boolean> {
  if (viewer === null || !active) return false;
  return (await getSessionKind()) !== "fresh";
}

async function PublicOkView({
  itinerary,
  social,
}: Readonly<{ itinerary: Itinerary; social: PublicSocialFactory | undefined }>) {
  const viewer = await getViewer();
  const engagement = itinerary.engagement ?? null;
  const active = social !== undefined && itinerary.isPublic && engagement !== null;
  const likeSyncNeeded = await resolveLikeSync(viewer, active);
  const composed =
    social === undefined
      ? NO_PUBLIC_SOCIAL
      : social({
          itineraryId: itinerary.id,
          ownerId: itinerary.ownerId,
          viewerId: viewer?.id ?? null,
          isPublished: itinerary.isPublic,
          engagement,
          likeSyncNeeded,
        });
  // không có factory thì không thêm prop `social`, để props của view y như Phase 5.
  const socialProps = social === undefined ? {} : { social: composed.slots };
  return composed.wrap(
    <PublicItineraryView
      account={accountSlot()}
      canEdit={canEdit(itinerary, viewer?.id ?? null)}
      itinerary={itinerary}
      {...socialProps}
    />,
  );
}

function render(result: PublicItineraryResult, recovery: ReactNode, social: PublicSocialFactory | undefined): ReactNode {
  switch (result.kind) {
    case "ok":
      return <PublicOkView itinerary={result.itinerary} social={social} />;
    case "forbidden":
      return (
        <PublicStatusFrame header={<PublicHeader />}>
          <PublicForbidden />
        </PublicStatusFrame>
      );
    case "not-found":
      return notFound();
    case "recover":
      return recovery;
    case "error":
      return (
        <PublicStatusFrame header={<PublicHeader account={accountSlot()} />}>
          <PublicRefreshError />
        </PublicStatusFrame>
      );
  }
}

export async function PublicItineraryPage({ itineraryId, recovery, social }: PublicItineraryPageProps) {
  const result = await getPublicItinerary(itineraryId);
  return render(result, recovery, social);
}
