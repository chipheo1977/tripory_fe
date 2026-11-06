"use client";

// "Thông tin chuyến đi" tự lưu (ITIN-03; D-87..D-91, D-100): không nút Lưu/Hủy, không chân form. Ô chữ lưu sau 800 ms ngừng gõ
// hoặc khi blur; ngày khởi hành và thao tác ảnh lưu ngay. Trong form chỉ hiện lỗi khi lưu (field gắn vào ô, lỗi ảnh dưới lưới,
// lỗi chung là toast kèm "Thử lại" do `useMetadataAutosave` bật, xem `autosave-failure-toast.ts`); đóng form khi còn lỗi thì thêm
// lỗi nền ở header (bộ điều khiển lo). Đóng bằng X, Esc hoặc vuốt xuống. Chỉ có 4 trường: không điểm đến và sở thích (D-77).
import type { Itinerary } from "@tripory/itinerary";
import { Input, Textarea } from "@tripory/ui-web";
import { useId, useRef } from "react";
import { CoverImageField } from "./cover-image-field";
import { defaultCoverFor } from "./destination-cover";
import { FormFieldRow } from "./form-field-row";
import { ResponsiveFormSurface } from "./responsive-form-surface";
import type { MetadataAutosaveHandle } from "./use-metadata-autosave";
import { useTripInfoForm } from "./use-trip-info-form";

export type TripInfoDialogProps = Readonly<{
  itinerary: Itinerary;
  autosave: MetadataAutosaveHandle;
  open: boolean;
  onOpenChange(open: boolean): void;
}>;

export function TripInfoDialog({ itinerary, autosave, open, onOpenChange }: TripInfoDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const titleRef = useRef<HTMLElement | null>(null);
  const info = useTripInfoForm({ itinerary, autosave, open });
  const { form } = info;
  const { errors } = form.formState;

  const handleOpenChange = (next: boolean): void => {
    if (!next) autosave.closeForm();
    onOpenChange(next);
  };

  const saveText = { onChange: () => autosave.schedule(), onBlur: () => autosave.flush() };
  const { ref: registerTitleRef, ...titleField } = form.register("title", saveText);
  const descriptionField = form.register("description", saveText);
  const startDateField = form.register("startDate", { onChange: info.onStartDateChange, onBlur: info.onStartDateBlur });

  return (
    <ResponsiveFormSurface
      closeButton
      initialFocus={() => titleRef.current}
      locked={false}
      onOpenChange={handleOpenChange}
      open={open}
      title="Thông tin chuyến đi"
      titleId={titleId}
    >
      <form
        aria-labelledby={titleId}
        className="flex flex-col gap-stack-sm"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <FormFieldRow error={errors.title?.message} label="Tiêu đề" required>
          <Input
            {...titleField}
            autoComplete="off"
            ref={(element) => {
              registerTitleRef(element);
              titleRef.current = element;
            }}
            size="lg"
          />
        </FormFieldRow>

        <FormFieldRow controlId={descriptionId} error={errors.description?.message} label="Mô tả">
          <Textarea
            {...descriptionField}
            aria-invalid={errors.description === undefined ? undefined : true}
            id={descriptionId}
          />
        </FormFieldRow>

        <FormFieldRow error={errors.startDate?.message} label="Ngày khởi hành">
          <Input {...startDateField} clearLabel="Xóa Ngày khởi hành" size="lg" type="date" />
        </FormFieldRow>

        <CoverImageField
          error={info.coverError}
          hasDefaultCover={defaultCoverFor(itinerary.destinationCode) !== null}
          images={info.gallery.images}
          onChange={info.onCoverChange}
          selectedIndex={info.gallery.selectedIndex}
        />
      </form>
    </ResponsiveFormSurface>
  );
}
