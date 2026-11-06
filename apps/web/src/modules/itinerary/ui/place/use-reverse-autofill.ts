"use client";

// Tra địa chỉ cho tọa độ nhập tay (chế độ thủ công, D-149): chỉ với tọa độ trần mới hợp lệ, không phải link Google Maps
// (link giữ luật D-49) và không phải giá trị đã có khi mở form hoặc vừa chọn từ danh sách (`settled`). Mỗi tọa độ chỉ
// được áp một lần; kết quả đến muộn của tọa độ cũ không ghi đè. Chỉ tra khi ô đã đứng yên `REVERSE_DEBOUNCE_MS`.
import { coordinateInputOf, parseLocationInput, type Place } from "@tripory/itinerary";
import type { Wgs84Coordinate } from "@tripory/shared-kernel";
import { useEffect, useRef } from "react";
import { places } from "@/composition/places.client";
import { useDebouncedValue } from "./use-debounced-value";

export type ReverseStatus = "idle" | "loading" | "filled" | "none" | "failed";

export const REVERSE_STATUS_TEXT: Readonly<Record<ReverseStatus, string>> = Object.freeze({
  idle: "",
  loading: "Đang tìm địa chỉ cho tọa độ này…",
  filled: "Đã điền địa chỉ từ OpenStreetMap, bạn có thể sửa.",
  none: "Không tìm thấy địa chỉ cho tọa độ này. Bạn có thể tự nhập.",
  failed: "Chưa lấy được địa chỉ lúc này. Bạn có thể tự nhập.",
});

export type ReverseAutofillInput = Readonly<{
  enabled: boolean;
  /** Chuỗi thô của ô Vị trí. */
  raw: string;
  /** Giá trị không cần tra (lúc mở form, hoặc tọa độ của địa điểm vừa chọn). */
  settled: string;
  onPlace(place: Place): void;
}>;

/** Tọa độ cần tra ngược, hoặc `null` khi không tra. */
export function reverseTargetOf(raw: string, settled: string): Wgs84Coordinate | null {
  if (raw.trim() === settled.trim()) return null;
  const parsed = parseLocationInput(raw);
  if (parsed.kind !== "coordinate") return null;
  if (parsed.source !== "coordinates") return null;
  return parsed.coordinate;
}

type ReverseQuery = Readonly<{ data: Place | null | undefined; error: unknown }>;

export function reverseStatusOf(target: Wgs84Coordinate | null, query: ReverseQuery): ReverseStatus {
  if (target === null) return "idle";
  if (query.error !== null && query.error !== undefined) return "failed";
  if (query.data === undefined) return "loading";
  if (query.data === null || query.data.address === null) return "none";
  return "filled";
}

/** Chỉ tra khi ô Vị trí đứng yên chừng này: gõ từng ký tự không bắn một request cho mỗi tọa độ dở dang. */
export const REVERSE_DEBOUNCE_MS = 400;

export function useReverseAutofill({ enabled, raw, settled, onPlace }: ReverseAutofillInput): ReverseStatus {
  const stableRaw = useDebouncedValue(raw, REVERSE_DEBOUNCE_MS);
  // Đang gõ (chưa đứng yên) thì không tra và không áp kết quả đến muộn của tọa độ trước đó.
  const active = enabled && raw === stableRaw;
  const target = active ? reverseTargetOf(raw, settled) : null;
  const query = places.useReversePlace(target);
  const key = target === null ? null : coordinateInputOf(target);
  const applied = useRef<string | null>(null);
  const latest = useRef(onPlace);
  useEffect(() => {
    latest.current = onPlace;
  });

  const { data } = query;
  useEffect(() => {
    if (key === null || data === undefined) return;
    if (applied.current === key) return;
    applied.current = key;
    if (data !== null) latest.current(data);
  }, [key, data]);

  return reverseStatusOf(target, query);
}
