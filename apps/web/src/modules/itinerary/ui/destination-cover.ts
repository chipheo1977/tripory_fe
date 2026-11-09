import type { GeoBounds } from "@tripory/itinerary";
import { destinationCatalog } from "@/composition/destination-catalog"; // Không import từ itinerary.client: test component mock module đó.

/** Ảnh mặc định của điểm đến (D-79, D-86): chỉ để hiển thị dự phòng, không ghi vào danh sách ảnh bìa. */
export const defaultCoverFor = (destinationCode: string | null): string | null =>
  destinationCatalog.findBySlug(destinationCode)?.defaultCoverImageUrl ?? null;

/** Khung nhìn xấp xỉ của tỉnh/thành, để canh bản đồ khi chưa có điểm nào (D-121). `null` khi chưa có điểm đến hoặc mã lạ. */
export const destinationBoundsFor = (destinationCode: string | null): GeoBounds | null =>
  destinationCatalog.findBySlug(destinationCode)?.view.bounds ?? null;

/** Tên tỉnh/thành để ghi "Gợi ý ở …" (D-146). `null` khi chưa có điểm đến hoặc mã lạ: khi đó không gọi gợi ý. */
export const destinationNameFor = (destinationCode: string | null): string | null =>
  destinationCatalog.findBySlug(destinationCode)?.name ?? null;