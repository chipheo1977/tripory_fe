import type { Itinerary } from './itinerary';

// Thao tác danh sách ảnh bìa (D-82..D-86): hàm thuần, không React. Ảnh mặc định của điểm đến không bao giờ vào danh sách.

export const COVER_IMAGE_LIMIT = 5;

export type CoverGallery = Readonly<{
  images: readonly string[];
  /** Vị trí ảnh đang hiển thị; `null` khi danh sách rỗng. */
  selectedIndex: number | null;
}>;

const make = (images: readonly string[], selectedIndex: number | null): CoverGallery =>
  Object.freeze({ images: Object.freeze([...images]), selectedIndex });

/** Danh sách và vị trí ảnh đang hiển thị của một lịch trình (cùng quy tắc `metadataOf`). */
export const galleryOf = (itinerary: Pick<Itinerary, 'coverImages' | 'coverImageUrl'>): CoverGallery => {
  if (itinerary.coverImages.length === 0) return make([], null);
  const index = itinerary.coverImages.indexOf(itinerary.coverImageUrl ?? '');
  return make(itinerary.coverImages, Math.max(index, 0));
};

export type CoverAddCheck = 'ok' | 'empty' | 'duplicate' | 'limit';

/** Thứ tự kiểm: rỗng, đủ 5, trùng (sau trim). */
export const canAddCoverImage = (gallery: CoverGallery, url: string): CoverAddCheck => {
  const trimmed = url.trim();
  if (trimmed === '') return 'empty';
  if (gallery.images.length >= COVER_IMAGE_LIMIT) return 'limit';
  if (gallery.images.includes(trimmed)) return 'duplicate';
  return 'ok';
};

/** Thêm vào cuối. Danh sách rỗng thì ảnh mới được chọn; ngược lại giữ ảnh đang chọn. Không hợp lệ trả chính `gallery`. */
export const addCoverImage = (gallery: CoverGallery, url: string): CoverGallery => {
  if (canAddCoverImage(gallery, url) !== 'ok') return gallery;
  const images = [...gallery.images, url.trim()];
  if (gallery.selectedIndex === null) return make(images, 0);
  return make(images, gallery.selectedIndex);
};

const selectedAfterRemove = (selected: number | null, removed: number, remaining: number): number | null => {
  if (remaining === 0) return null;
  if (selected === null || selected === removed) return 0;
  if (removed < selected) return selected - 1;
  return selected;
};

/** Xóa ảnh ở `index`. Xóa ảnh đang chọn thì chọn ảnh đầu còn lại; xóa hết thì không chọn gì. */
export const removeCoverImage = (gallery: CoverGallery, index: number): CoverGallery => {
  if (!Number.isInteger(index) || index < 0 || index >= gallery.images.length) return gallery;
  const images = gallery.images.filter((_, position) => position !== index);
  return make(images, selectedAfterRemove(gallery.selectedIndex, index, images.length));
};

export const selectCoverImage = (gallery: CoverGallery, index: number): CoverGallery => {
  if (!Number.isInteger(index) || index < 0 || index >= gallery.images.length) return gallery;
  if (index === gallery.selectedIndex) return gallery;
  return make(gallery.images, index);
};

export type CoverSlots = Readonly<{ filled: number; hasAddTile: boolean; emptyCount: number }>;

/** Ô lớp hai (D-82): `count` ô hành động, một ô thêm khi chưa đủ 5, phần còn lại là khung trống. */
export const coverSlots = (count: number): CoverSlots => {
  if (count >= COVER_IMAGE_LIMIT) return Object.freeze({ filled: count, hasAddTile: false, emptyCount: 0 });
  return Object.freeze({ filled: count, hasAddTile: true, emptyCount: COVER_IMAGE_LIMIT - count - 1 });
};

export type CoverFocusTarget = Readonly<{ kind: 'remove'; position: number }> | Readonly<{ kind: 'add' }>;

/** Focus sau khi xóa ảnh ở vị trí `removedPosition` (1-based), còn `remaining` ảnh (UI-SPEC §Xóa). */
export const focusTargetAfterRemove = (removedPosition: number, remaining: number): CoverFocusTarget => {
  if (remaining === 0) return { kind: 'add' };
  return { kind: 'remove', position: Math.min(removedPosition, remaining) };
};
