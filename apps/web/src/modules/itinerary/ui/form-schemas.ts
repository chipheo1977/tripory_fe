// Schema Zod của các form itinerary (D-29 Phase 3: validate đầy đủ phía client, BE vẫn là nguồn sự thật).
// Copy lỗi lấy nguyên từ UI-SPEC §Lỗi validate client (Zod): câu có dấu chấm cuối, không chấm than.
//
// Độ dài đếm trên giá trị THÔ (kể cả khoảng trắng đầu/cuối): BE kiểm độ dài trước khi trim (Pitfall 10),
// nên chuỗi 99 ký tự + 2 khoảng trắng phải bị chặn ở client thay vì chờ 400/5xx. Mỗi ô chỉ phát một lỗi.
import { COVER_URL_MAX_LENGTH, isHttpsUrl, isValidDayCount, parseCalendarDate } from "@tripory/itinerary";
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
export const LOCATION_REQUIRED = "Vui lòng chọn địa điểm hoặc nhập tọa độ.";
export const ADDRESS_TOO_LONG = "Địa chỉ tối đa 500 ký tự.";
export const NOTES_TOO_LONG = "Ghi chú tối đa 2000 ký tự.";
export const DESTINATION_REQUIRED = "Vui lòng chọn điểm đến.";
export const TRIP_NAME_REQUIRED = "Vui lòng nhập tên chuyến đi.";
export const TRIP_NAME_TOO_LONG = "Tên chuyến đi tối đa 100 ký tự.";
export const DAY_COUNT_INVALID = "Số ngày từ 1 đến 30.";
export const COVER_DUPLICATE = "Ảnh này đã có trong danh sách.";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;
const SUBTITLE_MAX = 100;
const WAYPOINT_NAME_MAX = 200;
const ADDRESS_MAX = 500;
const NOTES_MAX = 2000;

/** Luật link https dùng chung nằm ở domain (khớp BE); giữ tên cũ cho chỗ gọi hiện có (T-04-30). */
export { isHttpsUrl };

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

// Ô vị trí chỉ kiểm "không rỗng": parse tọa độ/link và resolve link rút gọn là việc của LocationField
// (04-17), nó gắn lỗi bằng `setError` vì cần gọi mạng.
const locationField = z.string().superRefine((value, ctx) => {
  if (value.trim().length === 0) ctx.addIssue({ code: "custom", message: LOCATION_REQUIRED });
});

export const METADATA_FIELDS = ["title", "description", "startDate", "coverImages"] as const;
export const WAYPOINT_FIELDS = ["name", "location", "address", "notes"] as const;

export const CREATE_TRIP_FIELDS = ["destinationCode", "title", "startDate", "dayCount", "interests"] as const;

/** Form tạo lịch trình 4 khối (D-69). Mỗi ô một lỗi; BE vẫn là nguồn sự thật. */
export const createTripSchema = z.object({
  destinationCode: z.string().nullable().superRefine((value, ctx) => {
    if (value === null || value.trim() === "") ctx.addIssue({ code: "custom", message: DESTINATION_REQUIRED });
  }),
  title: requiredText(TRIP_NAME_REQUIRED, TRIP_NAME_TOO_LONG, TITLE_MAX),
  startDate: startDateField,
  dayCount: z.number({ error: DAY_COUNT_INVALID }).superRefine((value, ctx) => {
    if (!isValidDayCount(value)) ctx.addIssue({ code: "custom", message: DAY_COUNT_INVALID });
  }),
  interests: z.array(z.string()),
});

export const METADATA_TEXT_FIELDS = ["title", "description", "startDate"] as const;

/** Metadata chữ của "Thông tin chuyến đi": không còn ô ảnh (ảnh bìa đi qua lưới ảnh). */
export const metadataFieldsSchema = z.object({
  title: titleField,
  description: optionalText(DESCRIPTION_TOO_LONG, DESCRIPTION_MAX),
  startDate: startDateField,
});

export const waypointSchema = z.object({
  name: requiredText(WAYPOINT_NAME_REQUIRED, WAYPOINT_NAME_TOO_LONG, WAYPOINT_NAME_MAX),
  location: locationField,
  address: optionalText(ADDRESS_TOO_LONG, ADDRESS_MAX),
  notes: optionalText(NOTES_TOO_LONG, NOTES_MAX),
});

export type WaypointValues = z.infer<typeof waypointSchema>;
export type CreateTripValues = z.infer<typeof createTripSchema>;
export type MetadataFieldsValues = z.infer<typeof metadataFieldsSchema>;

/** Kiểm một link ảnh bìa trước khi thêm vào danh sách (https, ≤ 500 ký tự, không trùng): copy lỗi hoặc `null`. */
export function validateCoverUrl(raw: string, existing: readonly string[]): string | null {
  const trimmed = raw.trim();
  if (trimmed === "" || !isHttpsUrl(trimmed)) return COVER_NOT_HTTPS;
  if (trimmed.length > COVER_URL_MAX_LENGTH) return COVER_TOO_LONG;
  if (existing.includes(trimmed)) return COVER_DUPLICATE;
  return null;
}

/** Phụ đề ngày không có form riêng (sửa tại chỗ): trả copy lỗi hoặc `null` khi hợp lệ. */
export const validateSubtitle = (raw: string): string | null => (raw.length > SUBTITLE_MAX ? SUBTITLE_TOO_LONG : null);
