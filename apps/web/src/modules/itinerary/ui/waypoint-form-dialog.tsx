"use client";

// Form thêm/sửa điểm đến dùng chung (ITIN-05, ITIN-06; D-18..D-23, D-36, D-48, D-49): Tên, Vị trí, Địa chỉ, Ghi chú.
// Thêm xong đóng form và gọi `onAdded` (không toast, D-22); lỗi BE gắn vào ô hoặc InlineAlert, form vẫn mở.
// "Xóa điểm đến" trong form sửa chỉ báo `onDeleteRequested` rồi đóng: luồng xóa có hoàn tác thuộc editor (04-18).
// Người dùng dán link POI thì Tên/Địa chỉ đang trống được tự điền (D-49), nhưng vẫn phải có tọa độ mới gửi được (D-48).
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCoordinate, type PlaceHint, type Waypoint } from "@tripory/itinerary";
import type { ItineraryId, Wgs84Coordinate } from "@tripory/shared-kernel";
import { Button, FormField, FormFieldLabel, InlineAlert, Input, Textarea } from "@tripory/ui-web";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { SubmitStatus } from "@/components/submit-status";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import { draftKey, draftStorage, type DraftKind } from "./draft-storage";
import { mapWaypointError } from "./form-error-mapping";
import { FormFieldRow } from "./form-field-row";
import { LOCATION_REQUIRED, waypointSchema, type WaypointValues } from "./form-schemas";
import { LocationField, useLocationState } from "./location-field";
import { ResponsiveFormSurface } from "./responsive-form-surface";
import { useSaveStatusStore } from "./save-status";
import { useFormDraft } from "./use-form-draft";

export type WaypointFormMode = Readonly<{ kind: "add"; dayNumber: number } | { kind: "edit"; waypoint: Waypoint }>;

export type WaypointFormDialogProps = Readonly<{
  itineraryId: ItineraryId;
  viewerId: string;
  /** `null` = đóng. */
  mode: WaypointFormMode | null;
  /** Bản nháp đọc từ `draftStorage` (D-36) cho đúng `mode` này. */
  restored?: WaypointValues | null;
  onClose(): void;
  onAdded(waypoint: Waypoint): void;
  onUpdated(waypointId: string): void;
  onDeleteRequested(waypoint: Waypoint): void;
  /** Báo form có thay đổi chưa lưu, để editor bật cảnh báo rời trang. */
  onDirtyChange?: (dirty: boolean) => void;
}>;

const NAME_FROM_LINK = "Đã lấy tên từ link, bạn có thể sửa.";
const RESTORED_MESSAGE = "Đã khôi phục nội dung chưa lưu";

const draftKindOf = (mode: WaypointFormMode): DraftKind =>
  mode.kind === "add" ? `add:${mode.dayNumber}` : `edit:${mode.waypoint.id}`;

const toValues = (mode: WaypointFormMode): WaypointValues =>
  mode.kind === "add"
    ? { name: "", location: "", address: "", notes: "" }
    : {
        name: mode.waypoint.name,
        location: formatCoordinate(mode.waypoint.coordinate),
        address: mode.waypoint.address ?? "",
        notes: mode.waypoint.notes ?? "",
      };

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

type FormProps = Readonly<Omit<WaypointFormDialogProps, "mode"> & { mode: WaypointFormMode; open: boolean }>;

function WaypointForm({
  itineraryId,
  viewerId,
  mode,
  open,
  restored = null,
  onClose,
  onAdded,
  onUpdated,
  onDeleteRequested,
  onDirtyChange,
}: FormProps) {
  const titleId = useId();
  const locationId = useId();
  const locationStatusId = useId();
  const notesId = useId();
  const store = useSaveStatusStore();
  const form = useForm<WaypointValues>({
    resolver: zodResolver(waypointSchema),
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: toValues(mode),
  });
  const add = itineraryHooks.useAddWaypoint(itineraryId, {
    meta: { feedback: { errorToast: false } },
    onSuccess: () => store.markSaved(),
  });
  const update = itineraryHooks.useUpdateWaypoint(itineraryId, {
    meta: { feedback: { errorToast: false } },
    onSuccess: () => store.markSaved(),
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [nameFromLink, setNameFromLink] = useState(false);
  const submittingRef = useRef(false);
  const nameRef = useRef<HTMLElement | null>(null);

  const { control, getValues, reset, setValue } = form;
  const { errors, isSubmitting, isDirty, isSubmitted, touchedFields } = form.formState;
  const locked = isSubmitting;
  const kind = draftKindOf(mode);
  const key = draftKey({ viewerId, itineraryId, kind });
  const initialLocation = toValues(mode).location;

  // Mở form là bắt đầu form mới từ điểm đến hiện tại (hoặc bản nháp); đọc qua ref để dữ liệu refetch không ghi đè.
  const latest = useRef({ mode, restored });
  useEffect(() => {
    latest.current = { mode, restored };
  });
  useEffect(() => {
    if (!open) return;
    const { mode: current, restored: draft } = latest.current;
    reset(toValues(current));
    if (draft !== null) reset(draft, { keepDefaultValues: true });
  }, [open, kind, reset]);

  useFormDraft({ key, getValues: form.getValues, enabled: open });

  const dirtyRef = useRef(onDirtyChange);
  useEffect(() => {
    dirtyRef.current = onDirtyChange;
  });
  useEffect(() => {
    dirtyRef.current?.(open && isDirty);
  }, [open, isDirty]);
  useEffect(
    () => () => {
      dirtyRef.current?.(false);
    },
    [],
  );

  // Link POI: chỉ điền ô đang trống, không bao giờ ghi đè nội dung người dùng đã nhập (D-49).
  const onPlace = useCallback(
    (place: PlaceHint) => {
      const current = getValues();
      if (place.name !== null && current.name.trim() === "") {
        setValue("name", place.name, { shouldDirty: true, shouldValidate: true });
        setNameFromLink(true);
      }
      if (place.address !== null && current.address.trim() === "") {
        setValue("address", place.address, { shouldDirty: true, shouldValidate: true });
      }
    },
    [getValues, setValue],
  );
  const location = useWatch({ control, name: "location" }) ?? "";
  const { state: locationState, flush } = useLocationState(location, onPlace);

  const finish = () => {
    setAlert(null);
    setNameFromLink(false);
    onClose();
  };

  const handle = form.handleSubmit(async (values) => {
    setAlert(null);
    const resolved = await flush();
    if (resolved.status !== "ok") {
      form.setError(
        "location",
        { message: resolved.status === "error" ? resolved.message : LOCATION_REQUIRED },
        { shouldFocus: true },
      );
      return;
    }
    // Ô vị trí hiển thị 4 chữ số thập phân: không đụng vào ô thì giữ nguyên tọa độ đầy đủ đã lưu.
    const coordinate: Wgs84Coordinate =
      mode.kind === "edit" && values.location.trim() === initialLocation ? mode.waypoint.coordinate : resolved.coordinate;
    const fields = {
      name: values.name.trim(),
      address: emptyToNull(values.address),
      notes: emptyToNull(values.notes),
      coordinate,
    };
    try {
      if (mode.kind === "add") {
        const waypoint = await add.mutateAsync({ dayNumber: mode.dayNumber, ...fields });
        draftStorage.remove(key);
        finish();
        onAdded(waypoint);
      } else {
        await update.mutateAsync({ waypointId: mode.waypoint.id, ...fields });
        draftStorage.remove(key);
        finish();
        onUpdated(mode.waypoint.id);
      }
    } catch (error) {
      const mapped = mapWaypointError(error);
      if (!mapped) return;
      const fieldEntries = Object.entries(mapped.fieldErrors) as [keyof WaypointValues, string][];
      fieldEntries.forEach(([name, message], index) => {
        form.setError(name, { message }, { shouldFocus: index === 0 });
      });
      if (mapped.alert !== null) {
        setAlert(mapped.alert);
        if (fieldEntries.length === 0) form.setFocus("name");
      }
    }
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Enter trong ô vẫn kích hoạt submit khi nút đang loading, nên chặn gọi lần hai bằng ref.
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }
    submittingRef.current = true;
    void handle(event).finally(() => {
      submittingRef.current = false;
    });
  };

  // Mọi đường đóng không lưu (Hủy, Esc, nút đóng Sheet) bỏ bản nháp (D-36).
  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (locked) return;
    draftStorage.remove(key);
    finish();
  };

  const requestDelete = () => {
    if (mode.kind !== "edit" || locked) return;
    const { waypoint } = mode;
    draftStorage.remove(key);
    finish();
    onDeleteRequested(waypoint);
  };

  const { ref: registerNameRef, onChange: nameOnChange, ...nameField } = form.register("name");
  const addressField = form.register("address");
  const notesField = form.register("notes");

  const locationFormError = errors.location?.message;
  const showLocationError = touchedFields.location === true || isSubmitted;
  const locationInvalid = locationFormError !== undefined || (showLocationError && locationState.status === "error");
  const adding = mode.kind === "add";

  return (
    <ResponsiveFormSurface
      initialFocus={() => nameRef.current}
      locked={locked}
      onOpenChange={handleOpenChange}
      open={open}
      title={mode.kind === "add" ? `Thêm điểm đến vào Ngày ${mode.dayNumber}` : "Sửa điểm đến"}
      titleId={titleId}
    >
      <InlineAlert variant="info">{restored === null ? null : RESTORED_MESSAGE}</InlineAlert>
      <InlineAlert>{alert}</InlineAlert>
      <form aria-labelledby={titleId} className="flex flex-col gap-stack-md" noValidate onSubmit={onSubmit}>
        <FormFieldRow
          description={nameFromLink ? NAME_FROM_LINK : undefined}
          error={errors.name?.message}
          label="Tên"
          required
        >
          <Input
            {...nameField}
            autoComplete="off"
            onChange={(event) => {
              setNameFromLink(false);
              return nameOnChange(event);
            }}
            readOnly={locked}
            ref={(element) => {
              registerNameRef(element);
              nameRef.current = element;
            }}
            size="lg"
          />
        </FormFieldRow>

        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <FormField invalid={locationInvalid}>
              <FormFieldLabel required>Vị trí</FormFieldLabel>
              <LocationField
                describedById={locationStatusId}
                error={locationFormError}
                id={locationId}
                inputRef={field.ref}
                onBlur={() => {
                  field.onBlur();
                  // Blur là lúc người dùng đã dán xong: không chờ hết debounce mới đọc link rút gọn.
                  void flush();
                }}
                onChange={field.onChange}
                showError={showLocationError}
                state={locationState}
                value={field.value}
              />
            </FormField>
          )}
        />

        <FormFieldRow error={errors.address?.message} label="Địa chỉ">
          <Input {...addressField} autoComplete="off" readOnly={locked} size="lg" />
        </FormFieldRow>

        <FormFieldRow controlId={notesId} error={errors.notes?.message} label="Ghi chú">
          <Textarea
            {...notesField}
            aria-invalid={errors.notes === undefined ? undefined : true}
            id={notesId}
            readOnly={locked}
          />
        </FormFieldRow>

        <div className="flex flex-col max-md:sticky max-md:bottom-0 max-md:bg-surface">
          <div className="flex flex-col gap-inline-sm md:flex-row-reverse md:items-center">
            <Button loading={locked} loadingLabel={adding ? "Đang thêm…" : "Đang lưu…"} type="submit">
              {adding ? "Thêm điểm đến" : "Lưu"}
            </Button>
            <Button disabled={locked} onClick={() => handleOpenChange(false)} type="button" variant="secondary">
              Hủy
            </Button>
            <Button
              className="mt-stack-md text-danger md:mt-0 md:mr-auto"
              disabled={locked}
              icon={Trash2}
              onClick={requestDelete}
              type="button"
              variant="ghost"
              visible={!adding}
            >
              Xóa điểm đến
            </Button>
          </div>
          <SubmitStatus pending={locked} />
        </div>
      </form>
    </ResponsiveFormSurface>
  );
}

export function WaypointFormDialog({ mode, ...props }: WaypointFormDialogProps) {
  // Giữ `mode` cuối để nội dung không đổi trong lúc hiệu ứng đóng chạy (mẫu "điều chỉnh state theo prop" của React).
  const [retained, setRetained] = useState<WaypointFormMode | null>(mode);
  if (mode !== null && mode !== retained) setRetained(mode);
  const active = mode ?? retained;
  if (active === null) return null;
  return <WaypointForm {...props} mode={active} open={mode !== null} />;
}
