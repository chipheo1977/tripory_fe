import { sheetPeekMinPx, sheetSnapPoints } from '@tripory/design-tokens';

export const resolveSnapPoints = (viewportHeight: number, insetTop = 0) => {
  const expandedPx = Math.min(sheetSnapPoints.expanded * viewportHeight, viewportHeight - insetTop);
  const peekPx = Math.min(Math.max(sheetPeekMinPx, sheetSnapPoints.peek * viewportHeight), expandedPx);
  const medium = sheetSnapPoints.medium * viewportHeight <= expandedPx ? sheetSnapPoints.medium : `${expandedPx}px`;

  return [`${peekPx}px`, medium, `${expandedPx}px`] as const;
};

/** Popup chỉ được cuộn nội dung ở mức cao nhất (sheet bottom); sheet cạnh luôn cuộn được. */
export const isTopSnap = (position: 'bottom' | 'left' | 'right', snapIndex: number, snapPointsLength: number) =>
  position !== 'bottom' || snapIndex >= snapPointsLength - 1;

/** Sheet bottom chỉ một mức: mức mở rộng (form có chân form dính đáy phải luôn thấy, D-66). */
export const resolveFixedSnapPoints = (viewportHeight: number, insetTop = 0) =>
  [resolveSnapPoints(viewportHeight, insetTop)[2]] as const;

/**
 * Chọn danh sách mức snap theo vị trí và chế độ. Hàm thuần dùng early return để `Sheet` không lồng `? :`.
 * Sheet cạnh (left/right) không có snap; sheet bottom `fixedSnap` chỉ một mức; còn lại ba mức.
 */
export const snapPointsFor = (
  position: 'bottom' | 'left' | 'right',
  fixedSnap: boolean,
  viewportHeight: number,
  insetTop = 0,
): readonly (number | string)[] => {
  if (position !== 'bottom') return [];
  if (fixedSnap) return resolveFixedSnapPoints(viewportHeight, insetTop);
  return resolveSnapPoints(viewportHeight, insetTop);
};
