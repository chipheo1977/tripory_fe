// Chế độ của khối "Vị trí" khi form mở (D-150): ô trống (thêm mới, không bản nháp) thì tìm địa điểm; đã có vị trí
// (form sửa hoặc bản nháp khôi phục) thì nhập tọa độ thủ công, để người dùng thấy ngay giá trị đang có.

export type LocationMode = "search" | "manual";

export const initialLocationMode = (location: string): LocationMode => (location.trim() === "" ? "search" : "manual");
