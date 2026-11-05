"use client";

// Form "Thông tin chuyến đi" tự lưu (D-87..D-91): React Hook Form cho 3 ô chữ + danh sách ảnh bìa, nối với bộ điều khiển tự lưu
// ở cấp editor. Không có bản nháp lưu ở trình duyệt (D-107). Mở form là bắt đầu từ dữ liệu hiện tại; dữ liệu refetch khi đang mở
// KHÔNG ghi đè ô đang gõ. Không có setState của React trong effect: đặt lại gallery dùng mẫu "điều chỉnh state trong lúc render".
import { zodResolver } from "@hookform/resolvers/zod";
import { galleryOf, metadataOf, type CoverGallery, type Itinerary } from "@tripory/itinerary";
import { useEffect, useState, type ChangeEvent, type FocusEvent } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { metadataFieldsSchema, type MetadataFieldsValues } from "./form-schemas";
import type { AutosaveFailure } from "./metadata-autosave";
import type { MetadataAutosaveHandle } from "./use-metadata-autosave";

type Latest = { gallery: CoverGallery; itinerary: Itinerary };

// Ghi giá trị mới nhất vào đối tượng dùng chung với bộ điều khiển (ngoài render, chỉ gọi từ effect/handler).
const sync = (target: Latest, patch: Partial<Latest>): void => {
  Object.assign(target, patch);
};

export const toValues = (source: Itinerary): MetadataFieldsValues => ({
  title: source.title,
  description: source.description ?? "",
  startDate: source.startDate ?? "",
});

/** Câu cảnh báo lỗi chung của tự lưu; `null` khi không có lỗi chung (lỗi field gắn vào ô). */
export function autosaveAlertText(failure: AutosaveFailure | null): string | null {
  if (failure === null || failure.alert === null) return null;
  return `Chưa lưu được thay đổi. ${failure.alert}`;
}

const TEXT_FIELDS = ["title", "description", "startDate"] as const;
const isTextField = (name: string): name is (typeof TEXT_FIELDS)[number] =>
  (TEXT_FIELDS as readonly string[]).includes(name);

export type TripInfoForm = Readonly<{
  form: UseFormReturn<MetadataFieldsValues>;
  gallery: CoverGallery;
  onCoverChange(next: CoverGallery): void;
  coverError: string | undefined;
  alert: string | null;
  retry(): void;
  /** Ô `type="date"` trả "" khi mới gõ dở: không gửi `startDate: null` trung gian. */
  onStartDateChange(event: ChangeEvent<HTMLInputElement>): void;
  onStartDateBlur(event: FocusEvent<HTMLInputElement>): void;
}>;

export function useTripInfoForm({
  itinerary,
  autosave,
  open,
}: Readonly<{ itinerary: Itinerary; autosave: MetadataAutosaveHandle; open: boolean }>): TripInfoForm {
  const form = useForm<MetadataFieldsValues>({
    resolver: zodResolver(metadataFieldsSchema),
    mode: "onTouched",
    shouldFocusError: true,
    defaultValues: toValues(itinerary),
  });
  const [gallery, setGallery] = useState<CoverGallery>(() => galleryOf(itinerary));
  const [latest] = useState<Latest>(() => ({ gallery, itinerary }));
  useEffect(() => {
    sync(latest, { gallery, itinerary });
  });

  // Mở form: lấy lại danh sách ảnh từ dữ liệu hiện tại (đúng thời điểm `open` chuyển false → true).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setGallery(galleryOf(itinerary));
  }

  // Lỗi danh sách ảnh: cache đã rollback nên `itinerary` là danh sách đã lưu, đưa lưới về đó.
  const { failure } = autosave.state;
  // So theo tham chiếu `failure` (mỗi lần lỗi là một đối tượng mới) để cùng một chuỗi lỗi lặp lại vẫn đặt lại lưới.
  const coverError = failure?.fieldErrors.coverImages;
  const [prevFailure, setPrevFailure] = useState(failure);
  if (failure !== prevFailure) {
    setPrevFailure(failure);
    if (coverError !== undefined) setGallery(galleryOf(itinerary));
  }

  const { reset, getValues, setError } = form;
  const { attach, detach, openForm, request, retry } = autosave;

  useEffect(() => {
    if (!open) return undefined;
    reset(toValues(latest.itinerary));
    openForm(metadataOf(latest.itinerary));
    attach(() => ({ values: getValues(), gallery: latest.gallery }));
    return () => detach();
  }, [open, reset, getValues, openForm, attach, detach, latest]);

  useEffect(() => {
    if (failure === null) return;
    for (const [name, message] of Object.entries(failure.fieldErrors)) {
      if (isTextField(name)) setError(name, { message });
    }
  }, [failure, setError]);

  const onCoverChange = (next: CoverGallery): void => {
    sync(latest, { gallery: next });
    setGallery(next);
    request();
  };

  const onStartDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const target = event.target;
    if (target.validity.badInput) return;
    if (target.value === "" && document.activeElement === target) return;
    request();
  };

  const onStartDateBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (event.target.value === "") request();
  };

  return {
    form,
    gallery,
    onCoverChange,
    coverError,
    alert: autosaveAlertText(failure),
    retry,
    onStartDateChange,
    onStartDateBlur,
  };
}
