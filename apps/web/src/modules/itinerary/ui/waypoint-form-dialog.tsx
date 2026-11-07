"use client";

// Form thêm/sửa điểm đến dùng chung (ITIN-05, ITIN-06; D-18..D-23, D-36, D-48, D-49): Tên, Vị trí, Địa chỉ, Ghi chú.
// Thêm xong đóng form và gọi `onAdded` (không toast, D-22); lỗi BE gắn vào ô hoặc InlineAlert, form vẫn mở.
// "Xóa điểm đến" trong form sửa chỉ báo `onDeleteRequested` rồi đóng: luồng xóa có hoàn tác thuộc editor (04-18).
// Người dùng dán link POI thì Tên/Địa chỉ đang trống được tự điền (D-49), nhưng vẫn phải có tọa độ mới gửi được (D-48).
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCoordinate, type Waypoint } from "@tripory/itinerary";
import type { ItineraryId, Wgs84Coordinate } from "@tripory/shared-kernel";
import { Button, InlineAlert, Input, Textarea } from "@tripory/ui-web";
import { Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { SubmitStatus } from "@/components/submit-status";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import { draftKey, draftStorage, type DraftKind } from "./draft-storage";
import { mapWaypointError } from "./form-error-mapping";
import { FormFieldRow } from "./form-field-row";
import { LOCATION_REQUIRED, waypointSchema, type WaypointValues } from "./form-schemas";
import { useLocationState } from "./location-field";
import { usePlaceAutofill, type NameSource } from "./place/use-place-autofill";
import { ResponsiveFormSurface } from "./responsive-form-surface";
import { useSaveStatusStore } from "./save-status";
import { useFormDraft } from "./use-form-draft";
import { WaypointDayField, type WaypointDayChoice } from "./waypoint-day-field";
import { WaypointLocationBlock } from "./waypoint-location-block";

export type { WaypointDayChoice };

// `dayChoices` có nghĩa là mở từ tab Tổng quan: form có ô chọn ngày, mặc định là `dayNumber` (D-138).
export type WaypointFormMode = Readonly<
  { kind: "add"; dayNumber: number; dayChoices?: readonly WaypointDayChoice[] } | { kind: "edit"; waypoint: Waypoint }
>;

export type WaypointFormDialogProps = Readonly<{
  itineraryId: ItineraryId;
  viewerId: string;
  /** `null` = đóng. */
  mode: WaypointFormMode | null;
  /** Bản nháp đọc từ `draftStorage` (D-36) cho đúng `mode` này. */
  restored?: WaypointValues | null;
  onClose(): void;
  onAdded(waypoint: Waypoint): void;
  /** `coordinate` là tọa độ đã gửi, để bản đồ di chuyển tới điểm vừa sửa (D-127). */
  onUpdated(waypointId: string, coordinate: Wgs84Coordinate): void;
  onDeleteRequested(waypoint: Waypoint): void;
  /** Báo form có thay đổi chưa lưu, để editor bật cảnh báo rời trang. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Điểm đến của lịch trình: gợi ý địa điểm và ưu tiên kết quả tìm gần đó (D-146). `null` = không gợi ý. */
  destinationCode?: string | null;
}>;

const NAME_DESCRIPTIONS: Readonly<Record<NameSource, string>> = {
  link: "Đã lấy tên từ link, bạn có thể sửa.",
  place: "Đã lấy tên từ địa điểm đã chọn, bạn có thể sửa.",
};
const RESTORED_MESSAGE = "Đã khôi phục nội dung chưa lưu";

const draftKindOf = (mode: WaypointFormMode, dayNumber: number): DraftKind =>
  mode.kind === "add" ? `add:${dayNumber}` : `edit:${mode.waypoint.id}`;

const defaultDayOf = (mode: WaypointFormMode): number => (mode.kind === "add" ? mode.dayNumber : 1);

type PickedDay = Readonly<{ mode: WaypointFormMode; day: number }>;

const chosenDayOf = (picked: PickedDay | null, mode: WaypointFormMode): number => {
  if (picked === null || picked.mode !== mode) return defaultDayOf(mode);
  return picked.day;
};

const formTitle = (mode: WaypointFormMode): string => {
  if (mode.kind === "edit") return "Sửa điểm đến";
  if (mode.dayChoices !== undefined) return "Thêm điểm đến";
  return `Thêm điểm đến vào Ngày ${mode.dayNumber}`;
};

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
  destinationCode = null,
}: FormProps) {
  const titleId = useId();
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
  // Ngày đang chọn gắn với đúng `mode` đã mở: mở lại bằng `mode` mới thì quay về ngày mặc định.
  const [picked, setPicked] = useState<PickedDay | null>(null);
  const autofill = usePlaceAutofill(form);
  const submittingRef = useRef(false);
  const nameRef = useRef<HTMLElement | null>(null);

  const { control, reset } = form;
  const { errors, isSubmitting, isDirty } = form.formState;
  const locked = isSubmitting;
  const chosenDay = chosenDayOf(picked, mode);
  const dayChoices = mode.kind === "add" ? mode.dayChoices : undefined;
  const pickDay = dayChoices !== undefined;
  // `kind` quyết định khi nào reset form (theo mode đã mở); `key` theo ngày đang chọn để bản nháp mở lại đúng tab ngày.
  const kind = draftKindOf(mode, defaultDayOf(mode));
  const key = draftKey({ viewerId, itineraryId, kind: draftKindOf(mode, chosenDay) });
  const openedKey = draftKey({ viewerId, itineraryId, kind });
  const removeDrafts = () => {
    draftStorage.remove(key);
    draftStorage.remove(openedKey);
  };
  const initialLocation = toValues(mode).location;
  // Giá trị Vị trí lúc mở (bản nháp nếu có): khối Vị trí chọn chế độ mặc định và không tra ngược giá trị này.
  const openedLocation = (restored ?? toValues(mode)).location;
  // Form sửa quay về thủ công với ô trống thì trả lại đúng giá trị lúc mở (bản nháp nếu có), không phải bản đã lưu;
  // giá trị này cũng là `settled` của khối Vị trí nên không bị tra ngược (D-149). Form thêm không có giá trị để trả.
  const restorableLocation = mode.kind === "edit" ? openedLocation : "";

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
  const location = useWatch({ control, name: "location" }) ?? "";
  const { state: locationState, flush } = useLocationState(location, autofill.applyLinkHint);

  const finish = () => {
    setAlert(null);
    autofill.forget();
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
        const waypoint = await add.mutateAsync({ dayNumber: chosenDay, ...fields });
        removeDrafts();
        finish();
        onAdded(waypoint);
      } else {
        await update.mutateAsync({ waypointId: mode.waypoint.id, ...fields });
        removeDrafts();
        finish();
        onUpdated(mode.waypoint.id, coordinate);
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
    removeDrafts();
    finish();
  };

  const requestDelete = () => {
    if (mode.kind !== "edit" || locked) return;
    const { waypoint } = mode;
    removeDrafts();
    finish();
    onDeleteRequested(waypoint);
  };

  const { ref: registerNameRef, onChange: nameOnChange, ...nameField } = form.register("name");
  const addressField = form.register("address");
  const notesField = form.register("notes");

  const adding = mode.kind === "add";
  const nameDescription = autofill.nameSource === null ? undefined : NAME_DESCRIPTIONS[autofill.nameSource];

  return (
    <ResponsiveFormSurface
      initialFocus={() => nameRef.current}
      locked={locked}
      onOpenChange={handleOpenChange}
      open={open}
      title={formTitle(mode)}
      titleId={titleId}
    >
      <InlineAlert variant="info">{restored === null ? null : RESTORED_MESSAGE}</InlineAlert>
      <InlineAlert>{alert}</InlineAlert>
      <FormProvider {...form}>
      <form aria-labelledby={titleId} className="flex flex-col gap-stack-sm" noValidate onSubmit={onSubmit}>
        <WaypointDayField
          choices={dayChoices ?? []}
          disabled={locked}
          onChange={(day) => setPicked({ mode, day })}
          value={chosenDay}
          visible={pickDay}
        />
        <FormFieldRow description={nameDescription} error={errors.name?.message} label="Tên" required>
          <Input
            {...nameField}
            autoComplete="off"
            onChange={(event) => {
              autofill.forget();
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

        <WaypointLocationBlock
          autofill={autofill}
          destinationCode={destinationCode}
          formKey={kind}
          location={{ state: locationState, flush }}
          open={open}
          openedLocation={openedLocation}
          savedLocation={restorableLocation}
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
      </FormProvider>
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
