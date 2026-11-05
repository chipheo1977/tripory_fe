'use client';

import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../atoms/icon';
import { cn } from '../lib/cn';
import { isTopSnap, snapPointsFor } from './sheet-snap';

export type SheetPosition = 'bottom' | 'left' | 'right';
type SheetSnapPoint = number | string;

export type SheetDefaultSnap = 'peek' | 'medium' | 'expanded';
const snapIndexes: Record<SheetDefaultSnap, number> = { peek: 0, medium: 1, expanded: 2 };

type SheetContextValue = {
  dismissible: boolean;
  modal: boolean;
  position: SheetPosition;
  atTopSnap: boolean;
  /** Chiều cao px của mức cao nhất (chỉ sheet bottom); popup `fillSnap` dùng làm chiều cao cố định. */
  topSnapHeight: string | null;
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
  /** Sheet bottom chỉ có một mức (mức mở rộng), chỉ số snap luôn 0 (D-66, D-67). Mặc định `false`. */
  fixedSnap?: boolean;
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
  fixedSnap = false,
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
    () => snapPointsFor(position, fixedSnap, viewportHeight, insetTop),
    [fixedSnap, insetTop, position, viewportHeight],
  );
  const initialIndex = fixedSnap ? 0 : snapIndexes[defaultSnap];
  // Lưu mức theo chỉ số để mức đang mở vẫn đúng sau khi `resize` tính lại giá trị px.
  const [snapIndex, setSnapIndex] = useState(initialIndex);
  const [prevFixedSnap, setPrevFixedSnap] = useState(fixedSnap);
  if (prevFixedSnap !== fixedSnap) {
    setPrevFixedSnap(fixedSnap);
    setSnapIndex(initialIndex);
  }
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
  const topSnap = snapPoints.at(-1);
  const topSnapHeight = topSnap === undefined ? null : typeof topSnap === 'number' ? `${topSnap * viewportHeight}px` : topSnap;
  const context = useMemo<SheetContextValue>(
    () => ({ dismissible, modal, position, atTopSnap, topSnapHeight }),
    [dismissible, modal, position, atTopSnap, topSnapHeight],
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
          if (!open && position === 'bottom') setSnapIndex(initialIndex);
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

export type SheetContentProps = ComponentProps<typeof BaseDrawer.Popup> & {
  /**
   * Bottom: popup luôn cao bằng mức expanded. Base UI giới hạn mỗi mức snap theo chiều cao popup và gộp các mức
   * trùng nhau, nên nội dung ngắn hơn mức vừa/mở rộng làm mất mức giữa. Dùng cho sheet có nội dung thấp (timeline).
   */
  fillSnap?: boolean;
  closeDisabled?: boolean;
};

/**
 * Base UI dịch popup xuống `chiều cao popup − chiều cao mức snap`. Popup cao hơn mức cao nhất (nội dung dài, trần mặc định
 * là 100dvh) thì phần đáy trôi ra ngoài màn hình và không cuộn tới được, nên trần chiều cao bằng đúng mức cao nhất.
 */
function popupHeightStyle(position: SheetPosition, topSnapHeight: string | null, fillSnap: boolean) {
  if (position !== 'bottom' || topSnapHeight === null) return undefined;
  if (fillSnap) return { height: topSnapHeight };
  return { maxHeight: topSnapHeight };
}

export function SheetContent({ children, className, closeDisabled = false, fillSnap = false, style, ...props }: SheetContentProps) {
  const { modal, position, atTopSnap, topSnapHeight } = useSheetContext();
  const fixedHeight = popupHeightStyle(position, topSnapHeight, fillSnap);

  return (
    <BaseDrawer.Portal>
      {modal ? <SheetBackdrop /> : null}
      <BaseDrawer.Viewport className={cn('pointer-events-none fixed inset-0 z-modal flex', viewportClasses[position])}>
        <BaseDrawer.Popup
          {...props}
          style={typeof style === 'function' ? (state) => ({ ...style(state), ...fixedHeight }) : { ...style, ...fixedHeight }}
          data-sheet-position={position}
          data-swipe-direction={swipeDirections[position]}
          className={cn(
            'pointer-events-auto flex flex-col overscroll-contain border-border bg-surface-elevated p-stack-lg pb-[calc(var(--semantic-space-stack-lg)+env(safe-area-inset-bottom))] text-text shadow-overlay outline-hidden transition-transform duration-(--semantic-motion-duration-slow) ease-standard',
            atTopSnap ? 'overflow-y-auto' : 'overflow-y-hidden',
            popupClasses[position],
            className,
          )}
        >
          <SheetCloseButton disabled={closeDisabled} />
          {position === 'bottom' ? <SheetHandle /> : null}
          <BaseDrawer.Content className="mx-auto flex w-full max-w-content-sm flex-col gap-stack-md">
            {children}
          </BaseDrawer.Content>
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  );
}

function SheetCloseButton({ disabled }: { disabled: boolean }) {
  const { dismissible, position } = useSheetContext();
  if (position !== 'bottom') return null;
  if (!dismissible) return null;
  return (
    <div data-sheet-close-row="" className="relative h-0 shrink-0">
      <BaseDrawer.Close
        aria-label="Đóng"
        data-base-ui-swipe-ignore=""
        data-sheet-close=""
        disabled={disabled}
        className="absolute right-0 top-0 inline-flex min-h-touch min-w-touch items-center justify-center rounded-control text-text transition-colors duration-(--semantic-motion-duration-fast) hover:not-data-disabled:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-disabled:cursor-not-allowed data-disabled:text-disabled"
      >
        <Icon icon={X} size="sm" />
      </BaseDrawer.Close>
    </div>
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
