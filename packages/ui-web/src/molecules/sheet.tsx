'use client';

import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import type { ComponentProps, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { isTopSnap, resolveSnapPoints } from './sheet-snap';

export type SheetPosition = 'bottom' | 'left' | 'right';
type SheetSnapPoint = number | string;

export type SheetDefaultSnap = 'peek' | 'medium' | 'expanded';
const snapIndexes: Record<SheetDefaultSnap, number> = { peek: 0, medium: 1, expanded: 2 };

type SheetContextValue = {
  dismissible: boolean;
  modal: boolean;
  position: SheetPosition;
  atTopSnap: boolean;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = useContext(SheetContext);
  if (!context) throw new Error('Sheet parts must be rendered inside Sheet');
  return context;
}

type BaseRootProps = ComponentProps<typeof BaseDrawer.Root>;
export type SheetProps = Omit<
  BaseRootProps,
  'children' | 'defaultSnapPoint' | 'disablePointerDismissal' | 'modal' | 'onSnapPointChange' | 'snapPoint' | 'snapPoints' | 'swipeDirection'
> & {
  children?: ReactNode;
  dismissible?: boolean;
  disablePointerDismissal?: boolean;
  defaultSnap?: SheetDefaultSnap;
  insetTop?: number;
  modal?: boolean;
  position?: SheetPosition;
  onSnapPointChange?: (snapPoint: SheetSnapPoint | null) => void;
};

const swipeDirections = {
  bottom: 'down',
  left: 'left',
  right: 'right',
} as const;

export function Sheet({
  children,
  defaultSnap = 'medium',
  dismissible = true,
  disablePointerDismissal = false,
  insetTop = 0,
  modal = true,
  onOpenChange,
  onOpenChangeComplete,
  onSnapPointChange,
  position = 'bottom',
  ...props
}: SheetProps) {
  const [viewportHeight, setViewportHeight] = useState(640);
  const snapPoints = useMemo<readonly SheetSnapPoint[]>(
    () => position === 'bottom' ? resolveSnapPoints(viewportHeight, insetTop) : [],
    [insetTop, position, viewportHeight],
  );
  // Lưu mức theo chỉ số để mức đang mở vẫn đúng sau khi `resize` tính lại giá trị px.
  const [snapIndex, setSnapIndex] = useState(snapIndexes[defaultSnap]);
  const snapPoint: SheetSnapPoint | null = snapPoints[snapIndex] ?? null;
  const closingRef = useRef(false);

  useEffect(() => {
    if (position !== 'bottom') return undefined;
    const syncViewportHeight = () => setViewportHeight(window.innerHeight);
    syncViewportHeight();
    window.addEventListener('resize', syncViewportHeight);
    return () => window.removeEventListener('resize', syncViewportHeight);
  }, [position]);

  const setActiveSnapPoint = useCallback((nextSnapPoint: SheetSnapPoint) => {
    const nextIndex = snapPoints.indexOf(nextSnapPoint);
    if (nextIndex >= 0) setSnapIndex(nextIndex);
    onSnapPointChange?.(nextSnapPoint);
  }, [onSnapPointChange, snapPoints]);

  const atTopSnap = isTopSnap(position, snapIndex, snapPoints.length);
  const context = useMemo<SheetContextValue>(
    () => ({ dismissible, modal, position, atTopSnap }),
    [dismissible, modal, position, atTopSnap],
  );

  return (
    <SheetContext.Provider value={context}>
      <BaseDrawer.Root
        {...props}
        disablePointerDismissal={!modal || !dismissible || disablePointerDismissal}
        modal={modal}
        swipeDirection={swipeDirections[position]}
        snapPoints={position === 'bottom' ? [...snapPoints] : undefined}
        snapPoint={position === 'bottom' ? snapPoint : undefined}
        onSnapPointChange={(next) => {
          // Base UI báo thêm một lần về mức peek ngay sau khi đóng; bỏ qua để lần mở sau vào đúng `defaultSnap`.
          if (next !== null && !closingRef.current) setActiveSnapPoint(next);
        }}
        onOpenChange={(open, details) => {
          if (!open && !dismissible) {
            details.cancel();
            return;
          }
          closingRef.current = !open;
          if (!open && position === 'bottom') setSnapIndex(snapIndexes[defaultSnap]);
          onOpenChange?.(open, details);
        }}
        onOpenChangeComplete={(open) => {
          // Mở lại bằng prop `open` (không qua onOpenChange) vẫn phải nhận lại sự kiện snap.
          closingRef.current = false;
          onOpenChangeComplete?.(open);
        }}
      >
        {children}
      </BaseDrawer.Root>
    </SheetContext.Provider>
  );
}

export function SheetTrigger({ className, ...props }: ComponentProps<typeof BaseDrawer.Trigger>) {
  return (
    <BaseDrawer.Trigger
      {...props}
      className={cn(
        'inline-flex min-h-touch items-center justify-center rounded-control border border-border bg-surface px-stack-md text-label font-semibold text-text transition-colors duration-(--semantic-motion-duration-fast) hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        className,
      )}
    />
  );
}

export function SheetBackdrop({ className, ...props }: ComponentProps<typeof BaseDrawer.Backdrop>) {
  return (
    <BaseDrawer.Backdrop
      {...props}
      data-sheet-backdrop=""
      className={cn(
        'pointer-events-auto fixed inset-0 z-overlay min-h-dvh bg-overlay transition-opacity duration-(--semantic-motion-duration-slow) ease-standard data-starting-style:opacity-0 data-ending-style:opacity-0',
        className,
      )}
    />
  );
}

const viewportClasses: Record<SheetPosition, string> = {
  bottom: 'items-end justify-center',
  left: 'items-stretch justify-start',
  right: 'items-stretch justify-end',
};

const popupClasses: Record<SheetPosition, string> = {
  bottom: 'w-full max-h-[calc(100dvh-env(safe-area-inset-top))] rounded-t-overlay border-t [transform:translateY(calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]',
  left: 'h-full w-(--sheet-side-width) rounded-r-overlay border-r [transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(-100%)] data-ending-style:[transform:translateX(-100%)]',
  right: 'h-full w-(--sheet-side-width) rounded-l-overlay border-l [transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)]',
};

export function SheetContent({ children, className, ...props }: ComponentProps<typeof BaseDrawer.Popup>) {
  const { modal, position, atTopSnap } = useSheetContext();

  return (
    <BaseDrawer.Portal>
      {modal ? <SheetBackdrop /> : null}
      <BaseDrawer.Viewport className={cn('pointer-events-none fixed inset-0 z-modal flex', viewportClasses[position])}>
        <BaseDrawer.Popup
          {...props}
          data-sheet-position={position}
          data-swipe-direction={swipeDirections[position]}
          className={cn(
            'pointer-events-auto flex flex-col overscroll-contain border-border bg-surface-elevated p-stack-lg pb-[calc(var(--semantic-space-stack-lg)+env(safe-area-inset-bottom))] text-text shadow-overlay outline-hidden transition-transform duration-(--semantic-motion-duration-slow) ease-standard',
            atTopSnap ? 'overflow-y-auto' : 'overflow-y-hidden',
            popupClasses[position],
            className,
          )}
        >
          {position === 'bottom' ? <SheetHandle /> : null}
          <BaseDrawer.Content className="mx-auto flex w-full max-w-content-sm flex-col gap-stack-md">
            {children}
          </BaseDrawer.Content>
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  );
}

export function SheetHandle() {
  return (
    <div data-sheet-handle="" aria-hidden="true" className="flex min-h-touch shrink-0 touch-none items-center justify-center">
      <span className="h-(--semantic-space-inline-xs) w-(--semantic-space-page-block) rounded-pill bg-border-strong" />
    </div>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof BaseDrawer.Title>) {
  return <BaseDrawer.Title {...props} className={cn('text-heading font-semibold text-text', className)} />;
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof BaseDrawer.Description>) {
  return <BaseDrawer.Description {...props} className={cn('text-body text-muted', className)} />;
}

export function SheetClose({ className, ...props }: ComponentProps<typeof BaseDrawer.Close>) {
  return (
    <BaseDrawer.Close
      {...props}
      className={cn(
        'inline-flex min-h-touch items-center justify-center rounded-control border border-border bg-surface px-stack-md text-label font-semibold text-text transition-colors duration-(--semantic-motion-duration-fast) hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        className,
      )}
    />
  );
}

export const SheetPortal = BaseDrawer.Portal;
export const SheetViewport = BaseDrawer.Viewport;
