"use client";

// Thẻ "Đã chọn" thay ô tìm sau khi chọn địa điểm (D-150): tên · địa chỉ · tọa độ 4 chữ số, nút "Đổi địa điểm" mở lại ô tìm.
import { coordinateInputOf, formatCoordinate, type Place } from "@tripory/itinerary";
import { Button, Icon } from "@tripory/ui-web";
import { CircleCheck } from "lucide-react";
import type { Ref } from "react";
import type { LocationState } from "../location-field";

export const CHANGE_PLACE_LABEL = "Đổi địa điểm";

/** Nội dung thẻ: địa điểm vừa chọn nếu ô Vị trí vẫn là tọa độ của nó, không thì chỉ tọa độ đang có; `null` khi chưa có. */
export function pickedSummaryText(picked: Place | null, state: LocationState): string | null {
  if (state.status !== "ok") return null;
  const coordinate = formatCoordinate(state.coordinate);
  if (picked === null) return coordinate;
  if (coordinateInputOf(picked.coordinate) !== coordinateInputOf(state.coordinate)) return coordinate;
  return [picked.name, picked.address, coordinate].filter((part) => part !== null).join(" · ");
}

export type PickedPlaceSummaryProps = Readonly<{
  visible: boolean;
  text: string | null;
  onChange(): void;
  disabled: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}>;

export function PickedPlaceSummary({ visible, text, onChange, disabled, buttonRef }: PickedPlaceSummaryProps) {
  if (!visible) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-inline-sm rounded-control border border-border px-inline-sm py-inline-xs">
      <p className="flex min-w-0 flex-1 items-start gap-inline-xs text-label text-text">
        <Icon className="mt-px shrink-0 text-success" icon={CircleCheck} size="sm" />
        <span className="min-w-0 break-words">
          <span className="font-semibold">Đã chọn</span> · {text}
        </span>
      </p>
      <Button disabled={disabled} onClick={onChange} ref={buttonRef} size="sm" type="button" variant="secondary">
        {CHANGE_PLACE_LABEL}
      </Button>
    </div>
  );
}
