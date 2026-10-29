"use client";

// Ô "Vị trí" của form điểm đến (D-20, D-21, D-48, D-49): dán tọa độ hoặc link Google Maps, "Đã nhận: lat, lng" hiện ngay
// khi parse được. Link rút gọn (`maps.app.goo.gl`) được đổi sang URL đầy đủ qua route `/api/maps/resolve` của app
// (debounce 400ms, kết quả của chuỗi cũ bị bỏ), rồi parse lại bằng đúng `parseLocationInput` (một đường code).
// Chuỗi người dùng dán không bao giờ được render lại: chỉ hiện tọa độ đã chuẩn hóa (T-04-47), không hiện URL đích.
import {
  formatCoordinate,
  parseLocationInput,
  type LocationParse,
  type PlaceHint,
} from "@tripory/itinerary";
import type { Wgs84Coordinate } from "@tripory/shared-kernel";
import { cn, Icon, Input, Spinner } from "@tripory/ui-web";
import { CircleCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";

export const LOCATION_HINT = "Dán tọa độ (ví dụ 10.7769, 106.7009) hoặc link Google Maps.";
export const LOCATION_INVALID = "Không đọc được vị trí. Dán tọa độ dạng 10.7769, 106.7009 hoặc link Google Maps.";
export const LOCATION_OUT_OF_RANGE = "Tọa độ nằm ngoài phạm vi. Vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180.";
export const LOCATION_NO_COORDINATE =
  "Link này chỉ có tên địa điểm, không có tọa độ. Trong Google Maps, nhấn giữ vào địa điểm để lấy tọa độ rồi dán vào đây.";
export const LOCATION_RESOLVE_FAILED = "Không mở được link rút gọn này. Thử dán link đầy đủ hoặc tọa độ.";
export const LOCATION_RESOLVING = "Đang đọc link…";

const RESOLVE_DEBOUNCE_MS = 400;

export type LocationState =
  | { status: "idle" }
  | { status: "resolving" }
  | { status: "ok"; coordinate: Wgs84Coordinate }
  | { status: "error"; message: string };

const IDLE: LocationState = { status: "idle" };
const RESOLVING: LocationState = { status: "resolving" };
const resolveFailed: LocationState = { status: "error", message: LOCATION_RESOLVE_FAILED };

/** Kết quả parse không cần mạng thành trạng thái ô. Link rút gọn không đi qua đây. */
function stateOfParse(parse: LocationParse): LocationState {
  switch (parse.kind) {
    case "coordinate":
      return { status: "ok", coordinate: parse.coordinate };
    case "no-coordinate":
      return { status: "error", message: LOCATION_NO_COORDINATE };
    case "out-of-range":
      return { status: "error", message: LOCATION_OUT_OF_RANGE };
    case "invalid":
      return { status: "error", message: LOCATION_INVALID };
    case "empty":
      return IDLE;
    case "short-link":
      return RESOLVING;
  }
}

const placeOf = (parse: LocationParse): PlaceHint | null => {
  if (parse.kind !== "coordinate" && parse.kind !== "no-coordinate") return null;
  return parse.place.name === null && parse.place.address === null ? null : parse.place;
};

type Resolution = Readonly<{ url: string; state: LocationState }>;
type Job = { readonly url: string; timer: ReturnType<typeof setTimeout> | null; promise: Promise<LocationState> | null };

/**
 * Trạng thái của ô vị trí từ chuỗi thô. `onPlace` được gọi một lần cho mỗi chuỗi có tên/địa chỉ gợi ý (kể cả khi
 * link không có tọa độ, D-49). `flush()` ép resolve ngay (khi gửi form hoặc blur) và trả trạng thái cuối.
 */
export function useLocationState(
  raw: string,
  onPlace: (place: PlaceHint) => void,
): { state: LocationState; flush(): Promise<LocationState> } {
  const resolver = itineraryHooks.useResolveShortLink({ meta: { feedback: { errorToast: false } } });
  const parsed = useMemo(() => parseLocationInput(raw), [raw]);
  const [resolution, setResolution] = useState<Resolution | null>(null);

  const state: LocationState =
    parsed.kind === "short-link" ? (resolution?.url === parsed.url ? resolution.state : RESOLVING) : stateOfParse(parsed);

  // Mọi giá trị mới nhất đi qua ref để effect/flush không phải đăng ký lại mỗi lần render.
  const latest = useRef({ parsed, state, resolution, mutateAsync: resolver.mutateAsync, onPlace });
  useEffect(() => {
    latest.current = { parsed, state, resolution, mutateAsync: resolver.mutateAsync, onPlace };
  });
  const jobRef = useRef<Job | null>(null);

  // Chạy (hoặc dùng lại) lần resolve của một job; kết quả chỉ được áp khi job vẫn là job mới nhất.
  const run = useCallback((job: Job): Promise<LocationState> => {
    if (job.timer !== null) {
      clearTimeout(job.timer);
      job.timer = null;
    }
    if (job.promise !== null) return job.promise;
    job.promise = (async (): Promise<LocationState> => {
      let result: LocationState = resolveFailed;
      let place: PlaceHint | null = null;
      try {
        const target = parseLocationInput(await latest.current.mutateAsync({ url: job.url }));
        // Link đích vẫn là link rút gọn hoặc không phải Google Maps: coi như resolve thất bại.
        result = target.kind === "invalid" || target.kind === "empty" || target.kind === "short-link" ? resolveFailed : stateOfParse(target);
        place = placeOf(target);
      } catch {
        result = resolveFailed;
      }
      if (jobRef.current === job) {
        setResolution({ url: job.url, state: result });
        if (place !== null) latest.current.onPlace(place);
      }
      return result;
    })();
    return job.promise;
  }, []);

  const shortUrl = parsed.kind === "short-link" ? parsed.url : null;
  useEffect(() => {
    if (shortUrl === null) return undefined;
    const job: Job = { url: shortUrl, timer: null, promise: null };
    job.timer = setTimeout(() => void run(job), RESOLVE_DEBOUNCE_MS);
    jobRef.current = job;
    return () => {
      if (job.timer !== null) clearTimeout(job.timer);
      if (jobRef.current === job) jobRef.current = null;
    };
  }, [shortUrl, run]);

  // Gợi ý tên/địa chỉ của chuỗi không cần resolve: đúng một lần cho mỗi chuỗi.
  useEffect(() => {
    const place = placeOf(parsed);
    if (place !== null) latest.current.onPlace(place);
  }, [parsed]);

  const flush = useCallback(async (): Promise<LocationState> => {
    const current = latest.current;
    if (current.parsed.kind !== "short-link") return current.state;
    const job = jobRef.current;
    if (job !== null && job.url === current.parsed.url) return run(job);
    return current.resolution?.url === current.parsed.url ? current.resolution.state : current.state;
  }, [run]);

  return { state, flush };
}

export type LocationFieldProps = Readonly<{
  id: string;
  value: string;
  onChange(value: string): void;
  onBlur(): void;
  state: LocationState;
  /** Đã blur hoặc đã gửi: lúc này lỗi parse mới được hiện. */
  showError: boolean;
  /** Id của dòng trạng thái, để gắn `aria-describedby`. */
  describedById: string;
  /** Lỗi từ ngoài (Zod, BE, kiểm lúc gửi); ưu tiên hơn lỗi suy ra từ `state`. */
  error?: string | undefined;
  inputRef?: Ref<HTMLInputElement>;
}>;

export function LocationField({
  id,
  value,
  onChange,
  onBlur,
  state,
  showError,
  describedById,
  error,
  inputRef,
}: LocationFieldProps) {
  const stateError = showError && state.status === "error" ? state.message : undefined;
  const shownError = error ?? stateError;
  const hintId = `${describedById}-hint`;

  return (
    <>
      <Input
        aria-describedby={`${hintId} ${describedById}`}
        aria-invalid={shownError === undefined ? undefined : true}
        autoCapitalize="off"
        autoComplete="off"
        id={id}
        name="location"
        onBlur={onBlur}
        onChange={(event) => onChange(event.currentTarget.value)}
        ref={inputRef}
        size="lg"
        spellCheck={false}
        type="text"
        value={value}
      />
      <p className="text-label text-muted" id={hintId}>
        {LOCATION_HINT}
      </p>
      <p aria-live="polite" className={cn("flex items-center gap-inline-xs text-label", state.status === "ok" ? "text-text" : "text-muted")} id={describedById}>
        {state.status === "ok" ? (
          <>
            <Icon className="text-success" icon={CircleCheck} size="sm" />
            <span>Đã nhận: {formatCoordinate(state.coordinate)}</span>
          </>
        ) : state.status === "resolving" ? (
          <>
            <Spinner decorative size="sm" />
            <span>{LOCATION_RESOLVING}</span>
          </>
        ) : null}
      </p>
      {shownError === undefined ? null : (
        <p aria-live="polite" className="text-label text-danger" role="status">
          {shownError}
        </p>
      )}
    </>
  );
}
