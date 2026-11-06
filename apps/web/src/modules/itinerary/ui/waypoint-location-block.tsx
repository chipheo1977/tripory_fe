"use client";

// Khối "Vị trí" của form điểm đến (MAP-01, D-149, D-150). Hai chế độ:
// - Tìm (mặc định khi mở form với ô trống): combobox tìm địa điểm ở Việt Nam, chọn xong hiện thẻ "Đã chọn".
// - Thủ công (mặc định khi mở form đã có vị trí): ô tọa độ/link Google Maps cũ (`LocationField`); tọa độ trần mới hợp lệ
//   thì tra địa chỉ từ OpenStreetMap qua BFF.
// `field.ref` của React Hook Form đi tới ô đang hiện, nên `setError(..., { shouldFocus })` luôn focus đúng chỗ.
import { coordinateInputOf, type Place } from "@tripory/itinerary";
import { Button, FormField, FormFieldLabel } from "@tripory/ui-web";
import { useId, useRef } from "react";
import { flushSync } from "react-dom";
import { Controller, useFormContext, useFormState, useWatch } from "react-hook-form";
import { BlockError } from "./block-error";
import { destinationNameFor } from "./destination-cover";
import type { WaypointValues } from "./form-schemas";
import { LocationField, type LocationState } from "./location-field";
import { manualRestoreOf, type LocationMode } from "./place/location-mode";
import { PickedPlaceSummary, pickedSummaryText } from "./place/picked-place-summary";
import { PlaceSearchField } from "./place/place-search-field";
import { useLocationSession } from "./place/use-location-session";
import type { PlaceAutofill } from "./place/use-place-autofill";
import { REVERSE_STATUS_TEXT, useReverseAutofill } from "./place/use-reverse-autofill";

export const MANUAL_MODE_LABEL = "Nhập tọa độ thủ công";
export const SEARCH_MODE_LABEL = "Tìm địa điểm";

export type WaypointLocationBlockProps = Readonly<{
  destinationCode: string | null;
  /** Form đang mở; mở lại thì chế độ quay về mặc định. */
  open: boolean;
  /** Khóa của form đang mở (thêm vào ngày nào, sửa điểm nào): đổi khóa cũng quay về mặc định. */
  formKey: string;
  /** Giá trị ô Vị trí lúc mở form (form sửa hoặc bản nháp): quyết định chế độ mặc định và không bị tra ngược. */
  openedLocation: string;
  /** Tọa độ đã lưu của điểm đang sửa (chuỗi rỗng ở form thêm): trả lại khi quay về thủ công với ô trống. */
  savedLocation?: string;
  location: Readonly<{ state: LocationState; flush(): Promise<LocationState> }>;
  autofill: Pick<PlaceAutofill, "applyPicked" | "applyReverse">;
}>;

const WRITE = { shouldDirty: true } as const;

function isLocationInvalid(formError: string | undefined, showError: boolean, state: LocationState): boolean {
  if (formError !== undefined) return true;
  return showError && state.status === "error";
}

const otherMode = (mode: LocationMode): LocationMode => (mode === "search" ? "manual" : "search");

export function WaypointLocationBlock({
  destinationCode,
  open,
  formKey,
  openedLocation,
  savedLocation = "",
  location,
  autofill,
}: WaypointLocationBlockProps) {
  const locationId = useId();
  const statusId = useId();
  const errorId = useId();
  const changeRef = useRef<HTMLButtonElement>(null);
  const { control, setFocus, setValue } = useFormContext<WaypointValues>();
  const { errors, touchedFields, isSubmitted, isSubmitting } = useFormState({ control });
  const raw = useWatch({ control, name: "location" }) ?? "";
  const { mode, picked, setMode, setPicked } = useLocationSession(open, formKey, openedLocation);
  const searching = mode === "search";
  const settled = picked === null ? openedLocation : coordinateInputOf(picked.coordinate);
  const reverse = useReverseAutofill({ enabled: !searching, raw, settled, onPlace: autofill.applyReverse });
  const summary = pickedSummaryText(picked, location.state);
  const formError = errors.location?.message;
  const showError = touchedFields.location === true || isSubmitted;
  const searchError = searching ? formError : undefined;

  const pick = (place: Place) => {
    flushSync(() => {
      setPicked(place);
      autofill.applyPicked(place);
    });
    changeRef.current?.focus();
  };

  const changePlace = () => {
    flushSync(() => {
      setPicked(null);
      setValue("location", "", WRITE);
    });
    setFocus("location");
  };

  const switchMode = () => {
    const next = otherMode(mode);
    const restore = manualRestoreOf({ next, raw, hasPicked: picked !== null, saved: savedLocation });
    flushSync(() => {
      setMode(next);
      if (restore !== null) setValue("location", restore, WRITE);
    });
    setFocus("location");
  };

  return (
    <Controller
      control={control}
      name="location"
      render={({ field }) => (
        <FormField invalid={isLocationInvalid(formError, showError, location.state)}>
          <FormFieldLabel required>Vị trí</FormFieldLabel>
          <PlaceSearchField
            destinationCode={destinationCode}
            destinationName={destinationNameFor(destinationCode)}
            disabled={isSubmitting}
            errorId={searchError === undefined ? undefined : errorId}
            inputRef={field.ref}
            onPick={pick}
            visible={searching && summary === null}
          />
          <PickedPlaceSummary
            buttonRef={changeRef}
            disabled={isSubmitting}
            onChange={changePlace}
            text={summary}
            visible={searching && summary !== null}
          />
          <LocationField
            describedById={statusId}
            error={formError}
            id={locationId}
            inputRef={field.ref}
            onBlur={() => {
              field.onBlur();
              // Blur là lúc người dùng đã dán xong: không chờ hết debounce mới đọc link rút gọn.
              void location.flush();
            }}
            onChange={field.onChange}
            showError={showError}
            state={location.state}
            value={field.value}
            visible={!searching}
          />
          <BlockError id={errorId} message={searchError} />
          <p aria-live="polite" className="text-label text-muted">
            {REVERSE_STATUS_TEXT[reverse]}
          </p>
          <Button className="self-start" disabled={isSubmitting} onClick={switchMode} size="sm" type="button" variant="ghost">
            {searching ? MANUAL_MODE_LABEL : SEARCH_MODE_LABEL}
          </Button>
        </FormField>
      )}
    />
  );
}
