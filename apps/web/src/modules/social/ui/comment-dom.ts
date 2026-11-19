// id DOM của khối bình luận. id bình luận là GUID đã chuẩn hóa chữ thường nên an toàn làm id DOM.
export const COMMENTS_SECTION_ID = "binh-luan";
export const COMMENTS_HEADING_ID = "binh-luan-tieu-de";
export const COMMENT_DOM_ID_PREFIX = "binh-luan-";
export const commentDomId = (id: string): string => COMMENT_DOM_ID_PREFIX + id;
// đích focus của nút "Xem thêm" và nút thử tải lại trang kế (plan 05.1-15).
export const COMMENT_LOAD_MORE_ID = "binh-luan-xem-them";
export const COMMENT_RETRY_NEXT_ID = "binh-luan-thu-lai-tiep";
