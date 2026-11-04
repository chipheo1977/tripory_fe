export type DestinationKind = 'municipality' | 'province';

/** Một điểm đến của form tạo (đơn vị cấp tỉnh). `slug` bất biến, trùng mã BE (D-53). */
export type Destination = Readonly<{
  slug: string; // ví dụ 'vn-da-nang'
  name: string; // tên hiển thị ngắn, ví dụ 'Đà Nẵng', 'TP. Hồ Chí Minh'
  officialName: string; // ví dụ 'Thành phố Đà Nẵng'
  kind: DestinationKind;
  adminCode: string; // mã QĐ 19/2025/QĐ-TTg, chỉ để tham chiếu
  popularityRank: number | null; // 1-10 theo D-61, null nếu không xếp hạng
  aliases: readonly string[]; // tên tỉnh cũ và địa danh du lịch (có dấu)
  defaultCoverImageUrl: string | null; // URL https tuyệt đối của ảnh mặc định
}>;

/** Số mục nhóm "Phổ biến" (D-60, D-61). */
export const POPULAR_GROUP_SIZE = 8;
