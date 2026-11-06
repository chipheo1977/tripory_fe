// Chế độ của khối "Vị trí" khi form mở (D-150): ô trống (thêm mới, không bản nháp) thì tìm địa điểm; đã có vị trí
// (form sửa hoặc bản nháp khôi phục) thì nhập tọa độ thủ công, để người dùng thấy ngay giá trị đang có.

export type LocationMode = "search" | "manual";

export const initialLocationMode = (location: string): LocationMode => (location.trim() === "" ? "search" : "manual");

export type ManualRestoreInput = Readonly<{
  next: LocationMode;
  /** Chuỗi hiện tại của ô Vị trí. */
  raw: string;
  hasPicked: boolean;
  /** Tọa độ đã lưu của điểm đang sửa; chuỗi rỗng ở form thêm. */
  saved: string;
}>;

/**
 * Form sửa: quay về "Nhập tọa độ thủ công" khi ô Vị trí trống (vd sau "Đổi địa điểm") và chưa chọn địa điểm nào thì
 * trả lại tọa độ đã lưu. `null` = không đụng ô (không bao giờ ghi đè giá trị người dùng đã nhập).
 */
export function manualRestoreOf({ next, raw, hasPicked, saved }: ManualRestoreInput): string | null {
  if (next !== "manual") return null;
  if (hasPicked) return null;
  if (raw.trim() !== "") return null;
  if (saved.trim() === "") return null;

  return saved;
}
