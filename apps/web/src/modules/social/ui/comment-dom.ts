// id DOM của khối bình luận. id bình luận là GUID đã chuẩn hóa chữ thường nên an toàn làm id DOM.
export const COMMENTS_SECTION_ID = "binh-luan";
export const COMMENTS_HEADING_ID = "binh-luan-tieu-de";
export const COMMENT_DOM_ID_PREFIX = "binh-luan-";
export const commentDomId = (id: string): string => COMMENT_DOM_ID_PREFIX + id;
