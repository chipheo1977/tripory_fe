import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { parseItineraryId } from "@tripory/shared-kernel";
import { getViewer } from "@/composition/viewer.server";
import { ItineraryEditor } from "@/modules/itinerary/ui/itinerary-editor";

export const metadata: Metadata = { title: "Sửa lịch trình" };

// D-46: server chỉ kiểm GUID và lấy viewer. Dữ liệu lịch trình tải ở client qua BFF để Bearer hết hạn được refresh
// trước khi kết luận 403 (Pitfall 11, T-04-59); không gọi BE từ RSC. Đọc `params` và cookie ở đây hợp lệ với Cache
// Components vì `(editor)/layout` đã bọc children trong `<Suspense>` (dynamic-routes.md, "Without generateStaticParams").
export default async function EditItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itineraryId = parseItineraryId(id);
  // Chặn trước khi tải JS của editor và trước khi đụng cookie (T-04-60).
  if (itineraryId === null) notFound();

  const viewer = await getViewer();
  // Gate của layout đã chuyển khách về /login; đây là lưới thứ hai và để thu hẹp kiểu (UserMenu cần Viewer đầy đủ).
  if (viewer === null) redirect(`/login?next=${encodeURIComponent(`/itineraries/${itineraryId}/edit`)}`);

  // key theo viewer: Activity giữ state, đổi tài khoản không được thấy state cũ (Pitfall 4, T-04-61).
  return <ItineraryEditor itineraryId={itineraryId} key={viewer.id} viewer={viewer} />;
}
