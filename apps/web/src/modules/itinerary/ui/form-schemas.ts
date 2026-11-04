// Schema Zod của các form itinerary (D-29 Phase 3: validate đầy đủ phía client, BE vẫn là nguồn sự thật).
// Copy lỗi lấy nguyên từ UI-SPEC §Lỗi validate client (Zod): câu có dấu chấm cuối, không chấm than.
//
// Độ dài đếm trên giá trị THÔ (kể cả khoảng trắng đầu/cuối): BE kiểm độ dài trước khi trim (Pitfall 10),
// nên chuỗi 99 ký tự + 2 khoảng trắng phải bị chặn ở client thay vì chờ 400/5xx. Mỗi ô chỉ phát một lỗi.
import { parseCalendarDate, type CalendarDate, type MetadataInput } from "@tripory/itinerary";
import { z } from "zod";

export const TITLE_REQUIRED = "Vui lòng nhập tiêu đề.";
export const TITLE_TOO_LONG = "Tiêu đề tối đa 100 ký tự.";
export const DESCRIPTION_TOO_LONG = "Mô tả tối đa 1000 ký tự.";
export const START_DATE_INVALID = "Ngày khởi hành không hợp lệ.";
export const COVER_NOT_HTTPS = "Link ảnh phải bắt đầu bằng https://.";
export const COVER_TOO_LONG = "Link ảnh tối đa 500 ký tự.";
export const SUBTITLE_TOO_LONG = "Phụ đề tối đa 100 ký tự.";
export const WAYPOINT_NAME_REQUIRED = "Vui lòng nhập tên điểm đến.";
export const WAYPOINT_NAME_TOO_LONG = "Tên điểm đến tối đa 200 ký tự.";
export const LOCATION_REQUIRED = "Vui lòng dán tọa độ hoặc link Google Maps.";
export const ADDRESS_TOO_LONG = "Địa chỉ tối đa 500 ký tự.";
export const NOTES_TOO_LONG = "Ghi chú tối đa 2000 ký tự.";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;
const COVER_MAX = 500;
const SUBTITLE_MAX = 100;
const WAYPOINT_NAME_MAX = 200;
const ADDRESS_MAX = 500;
const NOTES_MAX = 2000;

/** Chỉ `https://` và không có khoảng trắng: chặn `javascript:`, `http:`, `data:` (T-04-30). */
export const isHttpsUrl = (value: string): boolean => /^https:\/\/[^\s]+$/i.test(value);

const requiredText = (required: string, tooLong: string, max: number) =>
  z.string().superRefine((value, ctx) => {
    if (value.trim().length === 0) ctx.addIssue({ code: "custom", message: required });
    else if (value.length > max) ctx.addIssue({ code: "custom", message: tooLong });
  });

const optionalText = (tooLong: string, max: number) =>
  z.string().superRefine((value, ctx) => {
    if (value.length > max) ctx.addIssue({ code: "custom", message: tooLong });
  });

const titleField = requiredText(TITLE_REQUIRED, TITLE_TOO_LONG, TITLE_MAX);

const startDateField = z.string().superRefine((value, ctx) => {
  if (value.trim() !== "" && parseCalendarDate(value.trim()) === null) {
    ctx.addIssue({ code: "custom", message: START_DATE_INVALID });
  }
});

const coverImageField = z.string().superRefine((value, ctx) => {
  const trimmed = value.trim();
  if (trimmed === "") return;
  if (!isHttpsUrl(trimmed)) ctx.addIssue({ code: "custom", message: COVER_NOT_HTTPS });
  else if (value.length > COVER_MAX) ctx.addIssue({ code: "custom", message: COVER_TOO_LONG });
});

// Ô vị trí chỉ kiểm "không rỗng": parse tọa độ/link và resolve link rút gọn là việc của LocationField
// (04-17), nó gắn lỗi bằng `setError` vì cần gọi mạng.
const locationField = z.string().superRefine((value, ctx) => {
  if (value.trim().length === 0) ctx.addIssue({ code: "custom", message: LOCATION_REQUIRED });
});

export const CREATE_ITINERARY_FIELDS = ["title"] as const;
export const METADATA_FIELDS = ["title", "description", "startDate", "coverImageUrl"] as const;
export const WAYPOINT_FIELDS = ["name", "location", "address", "notes"] as const;

export const createItinerarySchema = z.object({ title: titleField });

export const metadataSchema = z.object({
  title: titleField,
  description: optionalText(DESCRIPTION_TOO_LONG, DESCRIPTION_MAX),
  startDate: startDateField,
  coverImageUrl: coverImageField,
});

export const waypointSchema = z.object({
  name: requiredText(WAYPOINT_NAME_REQUIRED, WAYPOINT_NAME_TOO_LONG, WAYPOINT_NAME_MAX),
  location: locationField,
  address: optionalText(ADDRESS_TOO_LONG, ADDRESS_MAX),
  notes: optionalText(NOTES_TOO_LONG, NOTES_MAX),
});

export type CreateItineraryValues = z.infer<typeof createItinerarySchema>;
export type MetadataValues = z.infer<typeof metadataSchema>;
export type WaypointValues = z.infer<typeof waypointSchema>;

/** Phụ đề ngày không có form riêng (sửa tại chỗ): trả copy lỗi hoặc `null` khi hợp lệ. */
export const validateSubtitle = (raw: string): string | null => (raw.length > SUBTITLE_MAX ? SUBTITLE_TOO_LONG : null);

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/** Giá trị form (đã qua `metadataSchema`) thành input gửi BE: trim, rỗng thành `null`, ngày thành `CalendarDate`. */
export function toMetadataInput(values: MetadataValues): MetadataInput {
  const startDate = emptyToNull(values.startDate);
  const parsed: CalendarDate | null = startDate === null ? null : parseCalendarDate(startDate);
  const cover = emptyToNull(values.coverImageUrl);
  // Ánh xạ TẠM của ô URL ảnh bìa đơn thành danh sách một phần tử; plan 04-38 thay bằng lưới ảnh và xóa hàm này.
  return {
    title: values.title.trim(),
    description: emptyToNull(values.description),
    startDate: parsed,
    coverImages: cover === null ? [] : [cover],
    selectedCoverIndex: cover === null ? null : 0,
  };
}
