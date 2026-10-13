// Branded id dùng chung cho nhiều bounded context. Chỉ đưa vào kernel id nào có ≥ 2 context
// cùng dùng một nghĩa (tài liệu kiến trúc mục 9); id chỉ một context dùng thì để trong context đó.
declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Id người dùng: itinerary (`canEdit`), chat (người gửi, thành viên), profile, identity. */
export type UserId = Brand<string, 'UserId'>;

/** Id lịch trình: itinerary và chat (thẻ lịch trình trong tin nhắn). */
export type ItineraryId = Brand<string, 'ItineraryId'>;

// Không kiểm version nibble: BE sinh bằng `Guid.NewGuid()` nhưng id cũ hay seed có thể không phải v4,
// FE chỉ cần biết chuỗi có đúng dạng GUID để không gửi rác lên BE.
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isGuid = (value: string): boolean => GUID.test(value);

// BE ghi GUID chữ thường, còn URL người dùng gõ hay dán có thể tới chữ hoa. Chuẩn hóa về chữ thường
// để phép so sánh kiểu `itinerary.userId === viewerId` không sai chỉ vì khác hoa thường.
// Trả `null` thay vì ném lỗi: chuỗi sai là chuyện bình thường ở route param, nơi gọi tự quyết 404 hay bỏ qua.
const parseGuid = <B extends string>(value: string): Brand<string, B> | null => {
  const trimmed = value.trim();

  return isGuid(trimmed) ? (trimmed.toLowerCase() as Brand<string, B>) : null;
};

export const parseUserId = (value: string): UserId | null => parseGuid<'UserId'>(value);

export const parseItineraryId = (value: string): ItineraryId | null => parseGuid<'ItineraryId'>(value);
