'use client';

import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import type { ComponentProps, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import { resolveSnapPoints, stepSnapPoint } from './sheet-snap';

export type SheetPosition = 'bottom' | 'left' | 'right';
type SheetSnapPoint = number | string;

type SheetContextValue = {
  modal: boolean;
  position: SheetPosition;
  snapPoint: SheetSnapPoint | null;
  snapPoints: readonly SheetSnapPoint[];
  setSnapPoint: (snapPoint: SheetSnapPoint) => void;
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
  modal?: boolean;
  position?: SheetPosition;
  onSnapPointChange?: (snapPoint: SheetSnapPoint | null) => void;
};

const swipeDirections = {
  bottom: 'down',
  left: 'left',
  right: 'right',
} as const;

export function Sheet({ children, modal = true, onOpenChange, onSnapPointChange, position = 'bottom', ...props }: SheetProps) {
  const [viewportHeight, setViewportHeight] = useState(640);
  const snapPoints = useMemo(() => position === 'bottom' ? resolveSnapPoints(viewportHeight) : [], [position, viewportHeight]);
  const [snapPoint, setSnapPoint] = useState<SheetSnapPoint | null>(0.6);

  useEffect(() => {
    if (position === 'bottom') setViewportHeight(window.innerHeight);
  }, [position]);

  const setActiveSnapPoint = useCallback((nextSnapPoint: SheetSnapPoint) => {
    setSnapPoint(nextSnapPoint);
    onSnapPointChange?.(nextSnapPoint);
  }, [onSnapPointChange]);

  const context = useMemo<SheetContextValue>(
    () => ({ modal, position, snapPoint, snapPoints, setSnapPoint: setActiveSnapPoint }),
    [modal, position, setActiveSnapPoint, snapPoint, snapPoints],
  );

  return (
    <SheetContext.Provider value={context}>
      <BaseDrawer.Root
        {...props}
        disablePointerDismissal={!modal}
        modal={modal}
        swipeDirection={swipeDirections[position]}
        snapPoints={position === 'bottom' ? [...snapPoints] : undefined}
        snapPoint={position === 'bottom' ? snapPoint : undefined}
        onSnapPointChange={(next) => {
          if (next !== null) setActiveSnapPoint(next);
        }}
        onOpenChange={(open, details) => {
          if (!open && position === 'bottom') setSnapPoint(snapPoints[1] ?? null);
          onOpenChange?.(open, details);
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
        'pointer-events-auto fixed inset-0 z-(--z-overlay) min-h-dvh bg-overlay transition-opacity duration-(--semantic-motion-duration-slow) ease-standard data-starting-style:opacity-0 data-ending-style:opacity-0',
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
  const { modal, position } = useSheetContext();

  return (
    <BaseDrawer.Portal>
      {modal ? <SheetBackdrop /> : null}
      <BaseDrawer.Viewport className={cn('pointer-events-none fixed inset-0 z-(--z-modal) flex', viewportClasses[position])}>
        <BaseDrawer.Popup
          {...props}
          data-sheet-position={position}
          data-swipe-direction={swipeDirections[position]}
          className={cn(
            'pointer-events-auto flex flex-col overflow-y-auto overscroll-contain border-border bg-surface-elevated p-stack-lg pb-[calc(var(--semantic-space-stack-lg)+env(safe-area-inset-bottom))] text-text shadow-overlay outline-hidden transition-transform duration-(--semantic-motion-duration-slow) ease-standard',
            popupClasses[position],
            className,
          )}
        >
          {position === 'bottom' ? <SheetHandle /> : null}
          <SheetControls />
          <BaseDrawer.Content className="mx-auto flex w-full max-w-(--size-content-sm) flex-col gap-stack-md">
            {children}
          </BaseDrawer.Content>
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  );
}

export function SheetHandle() {
  return (
    <div data-sheet-handle="" aria-hidden="true" className="flex min-h-touch shrink-0 items-center justify-center">
      <span className="h-(--semantic-space-inline-xs) w-(--semantic-space-page-block) rounded-pill bg-border-strong" />
    </div>
  );
}

function SnapButton({ children, direction }: { children: ReactNode; direction: 'expand' | 'collapse' }) {
  const { snapPoint, snapPoints, setSnapPoint } = useSheetContext();
  const boundary = direction === 'expand' ? snapPoints.at(-1) : snapPoints[0];
  const disabled = snapPoint === boundary;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (snapPoint !== null) setSnapPoint(stepSnapPoint(snapPoints, snapPoint, direction));
      }}
      className="inline-flex min-h-touch items-center justify-center rounded-control px-stack-sm text-label font-semibold text-text transition-colors duration-(--semantic-motion-duration-fast) hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:text-disabled"
    >
      {children}
    </button>
  );
}

export function SheetControls() {
  const { position } = useSheetContext();

  return (
    <div className="flex shrink-0 items-center justify-end gap-control-gap">
      {position === 'bottom' ? (
        <>
          <SnapButton direction="collapse">Thu gọn bảng</SnapButton>
          <SnapButton direction="expand">Mở rộng bảng</SnapButton>
        </>
      ) : null}
      <BaseDrawer.Close className="inline-flex min-h-touch items-center justify-center rounded-control px-stack-sm text-label font-semibold text-text transition-colors duration-(--semantic-motion-duration-fast) hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
        Đóng bảng
      </BaseDrawer.Close>
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
