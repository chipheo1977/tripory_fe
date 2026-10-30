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
