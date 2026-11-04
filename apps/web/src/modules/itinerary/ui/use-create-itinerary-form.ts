"use client";

// Form tạo lịch trình (D-56, D-69, D-93, D-96): React Hook Form + tên mặc định theo điểm đến + gửi MỘT request.
// Lỗi client hoặc lỗi BE theo field báo qua `onInvalid(block, errors)` để container mở khối lỗi đầu tiên và focus ô lỗi.
// Không toast khi thành công (D-11); lỗi không gắn field hiện ở `alert`.
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DAY_COUNT_DEFAULT,
  DEFAULT_TRIP_TITLE,
  initialTripTitle,
  normalizeInterests,
  onDestinationChanged,
  onTitleBlur,
  onTitleInput,
  parseCalendarDate,
  type CreateItineraryInput,
  type TripTitleState,
} from "@tripory/itinerary";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { destinationCatalog } from "@/composition/destination-catalog";
import { itinerary } from "@/composition/itinerary.client";
import { firstInvalidBlock, type BlockErrors, type CreateBlockId } from "./create-itinerary-blocks";
import { markEnteredFromList } from "./entry-flag";
import { mapCreateTripError } from "./form-error-mapping";
import { createTripSchema, type CreateTripValues } from "./form-schemas";

const DEFAULTS: CreateTripValues = {
  destinationCode: null,
  title: DEFAULT_TRIP_TITLE,
  startDate: "",
  dayCount: DAY_COUNT_DEFAULT,
  interests: [],
};

type PendingInvalid = { request: Readonly<{ block: CreateBlockId; errors: BlockErrors }> | null };

// Ghi vào đối tượng giữ yêu cầu ngoài render (mẫu `sync` của use-pending-delete.ts).
const writePending = (target: PendingInvalid, request: PendingInvalid["request"]): void => {
  Object.assign(target, { request });
};

const nameOf = (slug: string | null): string | null => destinationCatalog.findBySlug(slug)?.name ?? null;

/** Giá trị form (đã qua `createTripSchema`) thành input gửi BE. Ngày không hợp lệ thành `null` (BE vẫn là chốt chặn). */
export function toCreateTripInput(values: CreateTripValues): CreateItineraryInput {
  const rawStart = values.startDate.trim();
  const startDate = rawStart === "" ? null : parseCalendarDate(rawStart);
  return {
    title: values.title.trim(),
    destinationCode: values.destinationCode ?? "",
    dayCount: values.dayCount,
    startDate,
    interests: normalizeInterests(values.interests),
  };
}

export type CreateItineraryForm = Readonly<{
  form: UseFormReturn<CreateTripValues>;
  destinationName: string | null;
  /** Đặt `destinationCode` và cập nhật tên mặc định (D-93). */
  selectDestination(slug: string): void;
  title: Readonly<{ value: string; onChange(value: string): void; onBlur(): void }>;
  alert: string | null;
  locked: boolean;
  submit(event: FormEvent<HTMLFormElement>): void;
  reset(): void;
}>;

export function useCreateItineraryForm(
  args: Readonly<{ onCreated(): void; onInvalid(block: CreateBlockId, errors: BlockErrors): void }>,
): CreateItineraryForm {
  const { onCreated, onInvalid } = args;
  const router = useRouter();
  const form = useForm<CreateTripValues>({
    resolver: zodResolver(createTripSchema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: DEFAULTS,
  });
  const create = itinerary.useCreateItinerary({ meta: { feedback: { errorToast: false } } });
  const [alert, setAlert] = useState<string | null>(null);
  const [titleState, setTitleState] = useState<TripTitleState>(initialTripTitle);
  // Enter trong ô vẫn kích hoạt submit khi nút đang loading, nên chặn gọi lần hai bằng ref (D-12).
  const submittingRef = useRef(false);
  const destinationCode = useWatch({ control: form.control, name: "destinationCode" });
  const destinationName = nameOf(destinationCode);
  const locked = form.formState.isSubmitting;

  // Mở khối lỗi và focus ô lỗi phải đợi hết `isSubmitting`: trong lúc gửi các ô bị khóa (NumberField `disabled`) nên không
  // focus được. Handler ghi yêu cầu vào ref; effect chạy sau mỗi lần render và thực hiện khi form đã mở khóa.
  const [pendingInvalid] = useState<PendingInvalid>(() => ({ request: null }));
  useEffect(() => {
    const { request } = pendingInvalid;
    if (request === null || locked) return;
    writePending(pendingInvalid, null);
    onInvalid(request.block, request.errors);
  });
  const requestInvalid = (block: CreateBlockId, errors: BlockErrors): void => {
    writePending(pendingInvalid, { block, errors });
  };

  const applyTitle = (next: TripTitleState, validate: boolean): void => {
    setTitleState(next);
    form.setValue("title", next.title, { shouldValidate: validate });
  };

  const selectDestination = (slug: string): void => {
    form.setValue("destinationCode", slug, { shouldValidate: true, shouldDirty: true });
    applyTitle(onDestinationChanged(titleState, nameOf(slug)), false);
  };

  const title = {
    value: titleState.title,
    onChange: (value: string): void => applyTitle(onTitleInput(titleState, value, destinationName), true),
    onBlur: (): void => {
      const next = onTitleBlur(titleState, destinationName);
      if (next !== titleState) applyTitle(next, false);
      void form.trigger("title");
    },
  };

  const handle = form.handleSubmit(
    async (values) => {
      setAlert(null);
      let created;
      try {
        created = await create.mutateAsync(toCreateTripInput(values));
      } catch (error) {
        const mapped = mapCreateTripError(error);
        if (mapped === null) return;
        const fields = Object.entries(mapped.fieldErrors) as [keyof CreateTripValues, string][];
        for (const [name, message] of fields) form.setError(name, { message });
        const block = firstInvalidBlock(mapped.fieldErrors);
        if (block !== null) requestInvalid(block, mapped.fieldErrors);
        if (mapped.alert !== null) setAlert(mapped.alert);
        return;
      }
      markEnteredFromList();
      router.push(`/itineraries/${created.id}/edit`);
      onCreated();
    },
    (errors) => requestInvalid(firstInvalidBlock(errors) ?? "destination", errors),
  );

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }
    submittingRef.current = true;
    void handle(event).finally(() => {
      submittingRef.current = false;
    });
  };

  const reset = (): void => {
    form.reset(DEFAULTS);
    setTitleState(initialTripTitle());
    setAlert(null);
  };

  return { form, destinationName, selectDestination, title, alert, locked, submit, reset };
}
