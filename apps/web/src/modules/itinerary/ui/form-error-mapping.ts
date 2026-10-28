// Map lỗi BE của một lần submit form itinerary sang "gắn vào ô nào" hoặc "InlineAlert ở đầu form" (D-05, D-19).
//
// Zod phía client (`form-schemas.ts`) chặn trước hầu hết ca; đây là lưới an toàn cho lỗi lọt qua. Bảng mã -> ô
// là THEO TỪNG FORM, dùng `mapFormError` generic của `lib/feedback` (không import chéo `modules/identity`).
// Kết quả `null` = không hiện gì (`session_expired` đã được chuyển trang và toast, `aborted` là hủy request).
//
// ValidationProblemDetails của ASP.NET có thể trả key PascalCase (`Title`) hoặc camelCase (`title`) tùy cấu
// hình serializer, nên chuẩn hóa key về dạng tên ô trước khi tra. Message BE chỉ được hiện qua text node của
// React, không bao giờ qua HTML (T-04-29).
import { isApiError, makeApiError, type ApiError, type FieldErrors } from "@tripory/api-client";
import { mapFormError, FORM_ALERT as ALERT, type FormErrorMapping, type FormErrorTarget as Target } from "@/lib/feedback";
import { CREATE_ITINERARY_FIELDS, METADATA_FIELDS, WAYPOINT_FIELDS } from "./form-schemas";

export type { FormErrorMapping };
type CreateField = (typeof CREATE_ITINERARY_FIELDS)[number];
type MetadataField = (typeof METADATA_FIELDS)[number];
type WaypointField = (typeof WAYPOINT_FIELDS)[number];
/** Publish và xóa không có ô: mọi lỗi là alert. */
type NoField = never;

const lowerFirst = (key: string): string => key.charAt(0).toLowerCase() + key.slice(1);

/** Đổi key của `fieldErrors` về tên ô của form (hạ chữ đầu, rồi `alias` nếu có); key lạ giữ nguyên để rơi vào alert. */
function normalizeFieldKeys(error: unknown, alias: Readonly<Record<string, string>> = {}): unknown {
  if (!isApiError(error) || error.fieldErrors === undefined) return error;
  const next: Record<string, readonly string[]> = {};
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const lowered = lowerFirst(key);
    const field = Object.hasOwn(alias, lowered) ? (alias[lowered] as string) : lowered;
    next[field] = [...(next[field] ?? []), ...messages];
  }
  const fieldErrors: FieldErrors = next;
  const { kind, status, code, message } = error;
  return makeApiError({ kind, status, code, message, fieldErrors } satisfies Omit<ApiError, "type">);
}

const CREATE_TARGETS: ReadonlyMap<string, Target<CreateField>> = new Map<string, Target<CreateField>>([
  ["ItineraryTitle.Empty", "title"],
  ["ItineraryTitle.TooLong", "title"],
  ["Itinerary.NotFound", ALERT],
  ["Itinerary.Forbidden", ALERT],
]);

const METADATA_TARGETS: ReadonlyMap<string, Target<MetadataField>> = new Map<string, Target<MetadataField>>([
  ["ItineraryTitle.Empty", "title"],
  ["ItineraryTitle.TooLong", "title"],
  ["ItineraryDescription.TooLong", "description"],
  ["Itinerary.NotFound", ALERT],
  ["Itinerary.Forbidden", ALERT],
]);

const WAYPOINT_TARGETS: ReadonlyMap<string, Target<WaypointField>> = new Map<string, Target<WaypointField>>([
  ["WaypointName.Empty", "name"],
  ["WaypointName.TooLong", "name"],
  ["Coordinate.InvalidLatitude", "location"],
  ["Coordinate.InvalidLongitude", "location"],
  ["Itinerary.NotFound", ALERT],
  ["Itinerary.Forbidden", ALERT],
  ["Waypoint.NotFound", ALERT],
]);

// Publish/xóa: bảng rỗng, mã nào cũng thành alert (câu đã biên soạn trong ERROR_MESSAGES, hoặc câu chung).
const NO_TARGETS: ReadonlyMap<string, Target<NoField>> = new Map<string, Target<NoField>>([
  ["Itinerary.CannotPublishEmpty", ALERT],
  ["Itinerary.NotFound", ALERT],
  ["Itinerary.Forbidden", ALERT],
]);

// ASP.NET đặt tên theo property của DTO; ô vị trí gom cả vĩ độ và kinh độ.
const WAYPOINT_ALIASES = { latitude: "location", longitude: "location" } as const;

export const mapCreateItineraryError = (error: unknown): FormErrorMapping<CreateField> | null =>
  mapFormError(normalizeFieldKeys(error), CREATE_ITINERARY_FIELDS, CREATE_TARGETS);

export const mapMetadataError = (error: unknown): FormErrorMapping<MetadataField> | null =>
  mapFormError(normalizeFieldKeys(error), METADATA_FIELDS, METADATA_TARGETS);

export const mapWaypointError = (error: unknown): FormErrorMapping<WaypointField> | null =>
  mapFormError(normalizeFieldKeys(error, WAYPOINT_ALIASES), WAYPOINT_FIELDS, WAYPOINT_TARGETS);

export const mapPublishError = (error: unknown): FormErrorMapping<NoField> | null =>
  mapFormError(normalizeFieldKeys(error), [], NO_TARGETS);

export const mapDeleteItineraryError = (error: unknown): FormErrorMapping<NoField> | null =>
  mapFormError(normalizeFieldKeys(error), [], NO_TARGETS);
