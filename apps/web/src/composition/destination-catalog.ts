import { createStaticDestinationCatalog } from "@tripory/itinerary/http";

/**
 * Gốc URL ảnh mặc định theo điểm đến (D-79, D-106). PHẢI khớp `DestinationCatalog:CoverImageBaseUrl` của BE
 * (`04-BE-CONTRACT.md` C11): BE ghi `{gốc}/{slug}.jpg` thành ảnh bìa 1 lúc tạo. File ảnh có thể chưa tồn tại (404),
 * UI rơi về nền dự phòng. Là hằng, không dùng biến NEXT_PUBLIC_* (auth-invariants chặn).
 */
const DESTINATION_IMAGE_BASE_URL = "https://triporyv1.vercel.app/destinations";

export const destinationCatalog = createStaticDestinationCatalog({
  imageBaseUrl: DESTINATION_IMAGE_BASE_URL,
});
