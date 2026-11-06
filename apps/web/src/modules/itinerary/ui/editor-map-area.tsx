"use client";

// Vùng bản đồ của editor (container, D-118..D-121): điều khiển trạng thái tải/sẵn sàng/lỗi quanh `TripMap` và dự phòng
// `TripSummary` khi bản đồ lỗi. Lỗi là khi thư viện/WebGL/style lỗi trước `load` hoặc quá 15 giây chưa `load`; editor vẫn đủ
// chức năng (D-120). Ẩn/hiện từng phần bằng prop `visible`, không rẽ nhánh JSX.
import type { DayRouteModel } from "@tripory/itinerary";
import { Button, InlineAlert, Skeleton } from "@tripory/ui-web";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import type { MapFrame } from "./editor-map-viewport";
import { MAP_LOAD_TIMEOUT_MS, type MapCameraCommand } from "./map/map-camera";
import type { MapStatus, TripMapPin } from "./map/trip-map";
import { LazyTripMap } from "./map/trip-map.lazy";
import { MapStatusOverlay } from "./map-status-overlay";

export type EditorMapAreaProps = Readonly<{
  frame: MapFrame;
  map: Readonly<{ pins: readonly TripMapPin[]; routes: readonly DayRouteModel[]; camera: MapCameraCommand | null }>;
  /** Lịch trình chưa có điểm hiển thị nào: hiện chip hướng dẫn (D-121). */
  empty: boolean;
  handlers: Readonly<{ onPinSelect(waypointId: string): void; onBackgroundClick(): void }>;
  /** `TripSummary` đúng biến thể theo `frame.wide`, do nơi gọi dựng; chỉ hiện khi bản đồ lỗi. */
  fallback: ReactNode;
  onStatusChange(status: MapStatus): void;
}>;

type CanvasSlotProps = Readonly<{
  visible: boolean;
  attempt: number;
  map: EditorMapAreaProps["map"];
  frame: MapFrame;
  handlers: EditorMapAreaProps["handlers"];
  onStatusChange(status: MapStatus): void;
}>;

function MapCanvasSlot({ visible, attempt, map, frame, handlers, onStatusChange }: CanvasSlotProps) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0">
      <LazyTripMap
        camera={map.camera}
        key={attempt}
        onBackgroundClick={handlers.onBackgroundClick}
        onPinSelect={handlers.onPinSelect}
        onStatusChange={onStatusChange}
        pins={map.pins}
        routes={map.routes}
        viewport={frame.viewport}
      />
    </div>
  );
}

function MapLoadingSkeleton({ visible }: Readonly<{ visible: boolean }>) {
  if (!visible) return null;
  return (
    <>
      <Skeleton className="absolute inset-0 h-auto" variant="block" />
      <p className="sr-only" role="status">
        Đang tải bản đồ…
      </p>
    </>
  );
}

type ErrorFallbackProps = Readonly<{
  visible: boolean;
  wide: boolean;
  onRetry(): void;
  retryRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}>;

// Desktop: canvas cuộn như bản trước. Mobile: nền cuộn được, chừa chỗ bằng mức peek của sheet.
const ERROR_LAYOUT = { wide: "p-section", narrow: "pb-(--sheet-snap-peek)" } as const;
const ALERT_LAYOUT = { wide: "mx-auto max-w-content-md", narrow: "p-stack-md" } as const;

function MapErrorFallback({ visible, wide, onRetry, retryRef, children }: ErrorFallbackProps) {
  if (!visible) return null;
  const layout = wide ? "wide" : "narrow";
  return (
    <div className={`h-full overflow-y-auto ${ERROR_LAYOUT[layout]}`}>
      <div className={ALERT_LAYOUT[layout]}>
        <InlineAlert
          action={
            <Button aria-label="Thử tải lại bản đồ" onClick={onRetry} ref={retryRef} size="sm" variant="secondary">
              Thử lại
            </Button>
          }
          variant="info"
        >
          <span className="block font-semibold">Không tải được bản đồ</span>
          <span className="block">Bạn vẫn sửa lịch trình như bình thường.</span>
        </InlineAlert>
      </div>
      <div className="mt-stack-lg">{children}</div>
    </div>
  );
}

export function EditorMapArea({ frame, map, empty, handlers, fallback, onStatusChange }: EditorMapAreaProps) {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const retried = useRef(false);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  const notifyRef = useRef(onStatusChange);
  useEffect(() => {
    notifyRef.current = onStatusChange;
  });
  const handleStatus = useCallback((next: MapStatus) => {
    setStatus(next);
    notifyRef.current(next);
  }, []);

  // Quá 15 giây chưa `load` thì coi như lỗi; mỗi lần tạo lại bản đồ đặt lại đồng hồ.
  useEffect(() => {
    if (status !== "loading") return undefined;
    const timer = setTimeout(() => handleStatus("error"), MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [attempt, handleStatus, status]);

  // Sau "Thử lại" mà lỗi lần nữa: nút vừa được vẽ lại, đưa focus vào nút.
  useEffect(() => {
    if (status === "error" && retried.current) retryRef.current?.focus();
  }, [status]);

  const retry = () => {
    retried.current = true;
    setAttempt((value) => value + 1);
    handleStatus("loading");
    // Nút "Thử lại" biến mất, nên focus về `section` để không rơi về `body`.
    sectionRef.current?.focus();
  };

  return (
    <section aria-labelledby={headingId} className="relative h-full w-full outline-hidden" ref={sectionRef} tabIndex={-1}>
      <h2 className="sr-only" id={headingId}>
        Bản đồ lịch trình
      </h2>
      <MapCanvasSlot
        attempt={attempt}
        frame={frame}
        handlers={handlers}
        map={map}
        onStatusChange={handleStatus}
        visible={status !== "error"}
      />
      <MapLoadingSkeleton visible={status === "loading"} />
      <MapStatusOverlay visible={status === "ready" && empty} />
      <MapErrorFallback onRetry={retry} retryRef={retryRef} visible={status === "error"} wide={frame.wide}>
        {fallback}
      </MapErrorFallback>
    </section>
  );
}
