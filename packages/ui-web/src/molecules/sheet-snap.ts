import { sheetPeekMinPx, sheetSnapPoints } from '@tripory/design-tokens';

export type SheetSnapDirection = 'expand' | 'collapse';

export const resolveSnapPoints = (viewportHeight: number) =>
  [
    `${Math.max(sheetPeekMinPx, sheetSnapPoints.peek * viewportHeight)}px`,
    sheetSnapPoints.medium,
    sheetSnapPoints.expanded,
  ] as const;

export function stepSnapPoint<T>(points: readonly T[], current: T, direction: SheetSnapDirection): T {
  const currentIndex = Math.max(0, points.indexOf(current));
  const nextIndex = direction === 'expand'
    ? Math.min(points.length - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);

  return points[nextIndex] ?? current;
}
