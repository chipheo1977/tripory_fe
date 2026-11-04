import type { CalendarDate } from './calendar-date';
import type { Itinerary } from './itinerary';

/** Các trường người dùng sửa trong "Thông tin chuyến đi" + chỉ số ảnh đang hiển thị (D-99). */
export type ItineraryMetadata = Readonly<{
  title: string;
  description: string | null;
  startDate: CalendarDate | null;
  coverImages: readonly string[];
  /** Vị trí ảnh hiển thị trong `coverImages`; `null` khi danh sách rỗng. */
  selectedCoverIndex: number | null;
}>;

const selectedIndexOf = (itinerary: Itinerary): number | null => {
  if (itinerary.coverImages.length === 0) return null;
  // Ảnh hiển thị không thuộc danh sách thì coi như ảnh đầu: danh sách không rỗng luôn có ảnh được chọn.
  const index = itinerary.coverImages.indexOf(itinerary.coverImageUrl ?? '');
  return Math.max(index, 0);
};

const coverAt = (images: readonly string[], index: number | null): string | null => {
  if (index === null) return null;
  return images[index] ?? null;
};

export const metadataOf = (itinerary: Itinerary): ItineraryMetadata =>
  Object.freeze({
    title: itinerary.title,
    description: itinerary.description,
    startDate: itinerary.startDate,
    coverImages: itinerary.coverImages,
    selectedCoverIndex: selectedIndexOf(itinerary),
  });

/** Áp metadata lên lịch trình (optimistic). Không đụng điểm đến, sở thích, ngày, điểm, trạng thái xuất bản. */
export const withMetadata = (itinerary: Itinerary, input: ItineraryMetadata): Itinerary =>
  Object.freeze({
    ...itinerary,
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    coverImages: Object.freeze([...input.coverImages]),
    coverImageUrl: coverAt(input.coverImages, input.selectedCoverIndex),
  });

export const isSameMetadata = (a: ItineraryMetadata, b: ItineraryMetadata): boolean =>
  a.title === b.title &&
  a.description === b.description &&
  a.startDate === b.startDate &&
  a.selectedCoverIndex === b.selectedCoverIndex &&
  a.coverImages.length === b.coverImages.length &&
  a.coverImages.every((url, index) => url === b.coverImages[index]);
