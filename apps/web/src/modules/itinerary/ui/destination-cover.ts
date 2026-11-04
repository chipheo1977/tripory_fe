import { destinationCatalog } from "@/composition/destination-catalog"; // Không import từ itinerary.client: test component mock module đó.

/** Ảnh mặc định của điểm đến (D-79, D-86): chỉ để hiển thị dự phòng, không ghi vào danh sách ảnh bìa. */
export const defaultCoverFor = (destinationCode: string | null): string | null =>
  destinationCatalog.findBySlug(destinationCode)?.defaultCoverImageUrl ?? null;
