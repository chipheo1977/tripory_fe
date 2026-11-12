// Chế độ xem của trang công khai, lưu trên URL (D-07, D-08): `?view=map` là Bản đồ; thiếu hoặc giá trị lạ là Bài viết.
// Hàm thuần, không đọc `window`.
export type PublicView = "article" | "map";

export const PUBLIC_VIEW_PARAM = "view";

/** Chỉ đúng chữ `map` là Bản đồ; mọi giá trị khác (kể cả `MAP`, `map `) là Bài viết (T-05-42). */
export function parsePublicView(raw: string | null | undefined): PublicView {
  if (raw === "map") return "map";
  return "article";
}

/** Chuỗi query mới (không có dấu `?`) sau khi đặt chế độ; giữ nguyên các tham số khác. */
export function viewSearch(currentSearch: string, view: PublicView): string {
  const params = new URLSearchParams(currentSearch);
  if (view === "map") params.set(PUBLIC_VIEW_PARAM, "map");
  else params.delete(PUBLIC_VIEW_PARAM);
  return params.toString();
}
