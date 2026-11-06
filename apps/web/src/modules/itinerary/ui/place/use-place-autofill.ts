"use client";

// Tự điền Tên/Địa chỉ của form điểm đến (D-49, D-149). Ba nguồn:
// - địa điểm đã chọn: Vị trí = tọa độ 6 chữ số, Địa chỉ ghi đè khi có, Tên chỉ khi trống hoặc vẫn là giá trị tự điền;
// - địa chỉ tra ngược từ tọa độ nhập tay: như trên, trừ Vị trí giữ nguyên chữ người dùng;
// - link Google Maps (D-49, không đổi): chỉ điền ô đang trống.
// Ghi chú không bao giờ bị đụng. Người dùng gõ vào Tên thì Tên không còn là giá trị tự điền.
import { coordinateInputOf, planPlaceAutofill, type Place, type PlaceHint } from "@tripory/itinerary";
import { useCallback, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { WaypointValues } from "../form-schemas";

export type NameSource = "link" | "place";

export type PlaceAutofill = Readonly<{
  /** Tên hiện tại được điền từ đâu, để hiện dòng mô tả dưới ô Tên; `null` = người dùng tự gõ hoặc chưa điền. */
  nameSource: NameSource | null;
  applyPicked(place: Place): void;
  applyReverse(place: Place): void;
  applyLinkHint(hint: PlaceHint): void;
  /** Người dùng gõ vào Tên, hoặc form mở lại: quên giá trị tự điền. */
  forget(): void;
}>;

type FormAccess = Pick<UseFormReturn<WaypointValues>, "getValues" | "setValue">;

const WRITE = { shouldDirty: true, shouldValidate: true } as const;

export function usePlaceAutofill({ getValues, setValue }: FormAccess): PlaceAutofill {
  const [nameSource, setNameSource] = useState<NameSource | null>(null);
  const lastAutoName = useRef<string | null>(null);

  const fillName = useCallback(
    (name: string, source: NameSource) => {
      setValue("name", name, WRITE);
      lastAutoName.current = name;
      setNameSource(source);
    },
    [setValue],
  );

  const applyPlace = useCallback(
    (place: Place) => {
      const { name, address } = getValues();
      const plan = planPlaceAutofill({ name, address }, lastAutoName.current, place);
      if (plan.name !== undefined) fillName(plan.name, "place");
      if (plan.address !== undefined) setValue("address", plan.address, WRITE);
    },
    [fillName, getValues, setValue],
  );

  const applyPicked = useCallback(
    (place: Place) => {
      setValue("location", coordinateInputOf(place.coordinate), WRITE);
      applyPlace(place);
    },
    [applyPlace, setValue],
  );

  const applyLinkHint = useCallback(
    (hint: PlaceHint) => {
      const current = getValues();
      if (hint.name !== null && current.name.trim() === "") fillName(hint.name, "link");
      if (hint.address !== null && current.address.trim() === "") setValue("address", hint.address, WRITE);
    },
    [fillName, getValues, setValue],
  );

  const forget = useCallback(() => {
    lastAutoName.current = null;
    setNameSource(null);
  }, []);

  return { nameSource, applyPicked, applyReverse: applyPlace, applyLinkHint, forget };
}
