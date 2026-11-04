// Ghép payload tự lưu "Thông tin chuyến đi" (D-87, D-89): hàm thuần, không React, không storage.
// Ô chữ đang sai không bao giờ được gửi; thay vào đó dùng giá trị đã lưu gần nhất. Ảnh bìa luôn lấy từ `gallery`.
import { parseCalendarDate, type CalendarDate, type MetadataInput } from "@tripory/itinerary";
import { METADATA_TEXT_FIELDS, metadataFieldsSchema, type MetadataFieldsValues } from "./form-schemas";

export type MetadataTextField = (typeof METADATA_TEXT_FIELDS)[number];

/** Ảnh bìa hiện tại của form: danh sách và vị trí ảnh đang hiển thị. */
export type GallerySnapshot = Readonly<{ images: readonly string[]; selectedIndex: number | null }>;
export type AutosaveSnapshot = Readonly<{ values: MetadataFieldsValues; gallery: GallerySnapshot }>;

const isTextField = (value: unknown): value is MetadataTextField =>
  typeof value === "string" && (METADATA_TEXT_FIELDS as readonly string[]).includes(value);

/** Các ô chữ đang sai theo `metadataFieldsSchema` (tiêu đề trống/quá 100, mô tả quá 1000, ngày không hợp lệ). */
export function invalidMetadataFields(values: MetadataFieldsValues): ReadonlySet<MetadataTextField> {
  const result = metadataFieldsSchema.safeParse(values);
  if (result.success) return new Set<MetadataTextField>();
  const fields = new Set<MetadataTextField>();
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (isTextField(field)) fields.add(field);
  }
  return fields;
}

const textOrNull = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return trimmed;
};

function startDateOf(raw: string, fallback: CalendarDate | null): CalendarDate | null {
  const text = textOrNull(raw);
  if (text === null) return null;
  return parseCalendarDate(text) ?? fallback;
}

function selectedIndexOf(gallery: GallerySnapshot): number | null {
  if (gallery.images.length === 0) return null;
  return gallery.selectedIndex;
}

/**
 * Payload `PUT` dựng LÚC GỬI. Ô sai lấy giá trị của `lastSaved`; ô hợp lệ lấy giá trị đã trim (rỗng thành `null`).
 * Không có điểm đến, sở thích hay `coverImageUrl` (D-54, D-77).
 */
export function buildAutosavePayload(
  args: Readonly<{ lastSaved: MetadataInput; snapshot: AutosaveSnapshot }>,
): MetadataInput {
  const { lastSaved, snapshot } = args;
  const { values, gallery } = snapshot;
  const invalid = invalidMetadataFields(values);
  const title = invalid.has("title") ? lastSaved.title : values.title.trim();
  const description = invalid.has("description") ? lastSaved.description : textOrNull(values.description);
  const startDate = invalid.has("startDate") ? lastSaved.startDate : startDateOf(values.startDate, lastSaved.startDate);
  return {
    title,
    description,
    startDate,
    coverImages: [...gallery.images],
    selectedCoverIndex: selectedIndexOf(gallery),
  };
}
