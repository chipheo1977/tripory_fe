import { Skeleton } from "@tripory/ui-web";
import { PublicHeader } from "@/modules/itinerary/ui/public-header";
import { PublicItinerarySkeleton } from "@/modules/itinerary/ui/public-itinerary-skeleton";
import { PublicStatusFrame } from "@/modules/itinerary/ui/public-status-frame";

// Khung chờ của trang công khai: header với ô tài khoản là Skeleton tròn (chưa biết khách hay đã đăng nhập, nên không có nút
// "Đăng nhập" nháy lên), thân là skeleton hình bài viết.
export default function Loading() {
  return (
    <PublicStatusFrame header={<PublicHeader account={<Skeleton className="size-control-sm" variant="circle" />} />}>
      <PublicItinerarySkeleton />
    </PublicStatusFrame>
  );
}
