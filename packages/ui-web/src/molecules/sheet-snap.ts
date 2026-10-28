import { sheetPeekMinPx, sheetSnapPoints } from '@tripory/design-tokens';

export type SheetSnapDirection = 'expand' | 'collapse';

/**
 * Ba mức snap của Sheet. `insetTop` (px) là vùng phía trên không được che (header): mức expanded
 * không vượt `viewportHeight - insetTop`. Base UI nhận cả tỉ lệ lẫn chuỗi px; peek luôn là px,
 * expanded luôn là px, medium giữ tỉ lệ trừ khi vượt expanded thì kẹp bằng expanded.
 */
export const resolveSnapPoints = (viewportHeight: number, insetTop = 0) => {
  const expandedPx = Math.min(sheetSnapPoints.expanded * viewportHeight, viewportHeight - insetTop);
  const peekPx = Math.min(Math.max(sheetPeekMinPx, sheetSnapPoints.peek * viewportHeight), expandedPx);
  const medium = sheetSnapPoints.medium * viewportHeight <= expandedPx ? sheetSnapPoints.medium : `${expandedPx}px`;

  return [`${peekPx}px`, medium, `${expandedPx}px`] as const;
};

export function stepSnapPoint<T>(points: readonly T[], current: T, direction: SheetSnapDirection): T {
  const currentIndex = Math.max(0, points.indexOf(current));
  const nextIndex = direction === 'expand'
    ? Math.min(points.length - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);

  return points[nextIndex] ?? current;
}
